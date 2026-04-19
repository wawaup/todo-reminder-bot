// Supabase Edge Function: bot-webhook
// 处理飞书机器人的回调消息

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  validateEnv,
  getFeishuAccessToken,
  getBeijingDayRange,
  formatBeijingTime,
  CATEGORY_INFO,
} from "../_shared/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Todo {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  category: string;
  is_completed: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received webhook:", JSON.stringify(body, null, 2));

    // 处理飞书 URL 验证
    if (body.challenge) {
      console.log("Handling Feishu URL verification challenge");
      return new Response(
        JSON.stringify({ challenge: body.challenge }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 验证环境变量
    validateEnv([
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "FEISHU_APP_ID",
      "FEISHU_APP_SECRET",
    ]);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const feishuAppId = Deno.env.get("FEISHU_APP_ID")!;
    const feishuAppSecret = Deno.env.get("FEISHU_APP_SECRET")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 解析飞书消息
    const event = body?.event;

    // 处理卡片按钮点击事件
    if (event?.action) {
      console.log("Handling card action event");
      console.log("Full event:", JSON.stringify(event, null, 2));

      const action = event.action;
      const openId = event.operator?.open_id;
      const chatId = event.context?.open_chat_id;
      const messageId = event.context?.open_message_id;

      let actionValue;
      try {
        // 飞书的 action.value 是双重转义的 JSON 字符串，需要解析两次
        let parsedOnce = JSON.parse(action.value);
        // 如果第一次解析后还是字符串，再解析一次
        if (typeof parsedOnce === 'string') {
          actionValue = JSON.parse(parsedOnce);
        } else {
          actionValue = parsedOnce;
        }
      } catch (e) {
        console.error("Failed to parse action value:", e);
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action value" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log("Action value:", actionValue);

      const todoId = actionValue.todo_id;
      const taskIndex = actionValue.index;
      const actionType = actionValue.action;

      console.log(`Extracted values - todoId: ${todoId}, taskIndex: ${taskIndex}, actionType: ${actionType}`);
      console.log(`openId: ${openId}, chatId: ${chatId}, messageId: ${messageId}`);

      try {
        // 获取飞书 access token
        console.log("Getting Feishu access token...");
        const tenantAccessToken = await getFeishuAccessToken(feishuAppId, feishuAppSecret);
        console.log("✅ Got Feishu access token successfully");

        if (actionType === "complete") {
        console.log(`Processing complete action for todo_id: ${todoId}, index: ${taskIndex}`);

        // 查询任务
        console.log("Querying todo from database...");
        const { data: todo, error: fetchError } = await supabase
          .from("todos")
          .select("*")
          .eq("id", todoId)
          .single();

        if (fetchError || !todo) {
          console.error("❌ Todo not found:", fetchError);
          return new Response(
            JSON.stringify({ success: false, error: "任务不存在" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
          );
        }

        console.log(`✅ Found todo: ${todo.title}`);

        // 更新任务状态
        console.log("Updating todo status to completed...");
        const { error: updateError } = await supabase
          .from("todos")
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", todoId);

        if (updateError) {
          console.error("❌ Failed to update todo:", updateError);
          throw updateError;
        }

        console.log(`✅ Task ${taskIndex} marked as completed in database`);

        // 记录交互
        console.log("Recording bot interaction...");
        const { error: interactionError } = await supabase.from("bot_interactions").insert({
          todo_id: todoId,
          action: "complete_button",
          content: `Button click: Index ${taskIndex}`,
        });

        if (interactionError) {
          console.error("⚠️ Failed to record interaction:", interactionError);
        } else {
          console.log("✅ Interaction recorded");
        }

        // 获取北京时间的今日起止时间
        console.log("Getting Beijing time range for today...");
        const { start, end } = getBeijingDayRange();
        console.log(`Time range: ${start.toISOString()} to ${end.toISOString()}`);

        // 查询今日剩余的未完成任务（最多 3 个）
        console.log("Querying remaining todos for today...");
        const { data: remainingTodos, error: remainingError } = await supabase
          .from("todos")
          .select("*")
          .gte("start_time", start.toISOString())
          .lt("start_time", end.toISOString())
          .eq("is_completed", false)
          .order("start_time", { ascending: true })
          .limit(3);

        if (remainingError) {
          console.error("⚠️ Failed to query remaining todos:", remainingError);
        }

        console.log(`Found ${remainingTodos?.length || 0} remaining todos for today`);

        // 构造恭喜完成卡片
        console.log("Building congratulations card...");
        const categoryInfo = CATEGORY_INFO[todo.category] || { emoji: "📝", label: "其他" };
        const startDate = new Date(todo.start_time);
        const endDate = new Date(todo.end_time);

        const confirmCard = {
          config: { wide_screen_mode: true },
          header: {
            title: { tag: "plain_text", content: "🎉 恭喜完成任务！" },
            template: "green",
          },
          elements: [
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `**${todo.title}**`,
              },
            },
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `${categoryInfo.emoji} ${categoryInfo.label} | ${formatBeijingTime(startDate)} - ${formatBeijingTime(endDate)}`,
              },
            },
            { tag: "hr" },
          ],
        };

        // 添加接下来的任务或下班提示
        if (!remainingTodos || remainingTodos.length === 0) {
          confirmCard.elements.push({
            tag: "div",
            text: {
              tag: "lark_md",
              content: "🌙 **今天顺利下班！快去休息吧。**",
            },
          });
          console.log("No remaining todos - showing off-work message");
        } else {
          confirmCard.elements.push({
            tag: "div",
            text: {
              tag: "lark_md",
              content: `📋 **接下来的任务（${remainingTodos.length} 个）**`,
            },
          });

          // 获取今日所有任务用于计算序号
          const { data: allTodayTodos } = await supabase
            .from("todos")
            .select("*")
            .gte("start_time", start.toISOString())
            .lt("start_time", end.toISOString())
            .order("start_time", { ascending: true });

          remainingTodos.forEach((nextTodo: Todo) => {
            const nextCategoryInfo = CATEGORY_INFO[nextTodo.category] || { emoji: "📝", label: "其他" };
            const nextStartDate = new Date(nextTodo.start_time);
            const nextEndDate = new Date(nextTodo.end_time);
            const nextIndex = (allTodayTodos || []).findIndex(t => t.id === nextTodo.id) + 1;

            confirmCard.elements.push({
              tag: "div",
              text: {
                tag: "lark_md",
                content: `**${nextIndex}. ⬜ ${formatBeijingTime(nextStartDate)}-${formatBeijingTime(nextEndDate)}** | ${nextCategoryInfo.emoji} ${nextTodo.title}`,
              },
            });
          });

          console.log(`Added ${remainingTodos.length} remaining todos to card`);
        }

        // 发送卡片到飞书
        console.log("Sending congratulations card to Feishu...");
        console.log(`Chat ID: ${chatId}`);
        console.log(`Card content: ${JSON.stringify(confirmCard, null, 2)}`);

        const sendResponse = await fetch("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tenantAccessToken}`,
          },
          body: JSON.stringify({
            receive_id: chatId,
            msg_type: "interactive",
            content: JSON.stringify(confirmCard),
          }),
        });

        console.log(`Feishu API response status: ${sendResponse.status}`);

        if (!sendResponse.ok) {
          const errorText = await sendResponse.text();
          console.error("❌ Failed to send card to Feishu:", errorText);
        } else {
          const responseData = await sendResponse.json();
          console.log("✅ Congratulations card sent successfully");
          console.log(`Response data: ${JSON.stringify(responseData, null, 2)}`);
        }

        return new Response(
          JSON.stringify({ success: true, message: "任务已完成" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        } else {
          console.log(`Unknown action type: ${actionType}`);
          return new Response(
            JSON.stringify({ success: false, error: "Unknown action type" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
      } catch (error) {
        console.error("❌ Error processing card action:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(
          JSON.stringify({ success: false, error: `处理失败: ${errorMessage}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    // 处理文本消息
    if (!event?.message) {
      return new Response(
        JSON.stringify({ success: true, message: "No message event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageContent = event.message.content;
    const messageId = event.message.message_id;
    const chatId = event.message.chat_id;
    const contentObj = JSON.parse(messageContent);
    const text = contentObj.text?.trim() || "";

    // 解析用户命令
    const completeMatch = text.match(/^完成\s*(\d+)(?:\s+(.+))?$/);
    const cancelMatch = text.match(/^取消\s*(\d+)$/);

    if (!completeMatch && !cancelMatch) {
      return new Response(
        JSON.stringify({ success: true, message: "Command not recognized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const index = parseInt(completeMatch?.[1] || cancelMatch?.[1]) - 1;
    const feeling = completeMatch?.[2] || null;
    const action = completeMatch ? "complete" : "cancel";

    // 获取北京时间的今日起止时间
    const { start, end } = getBeijingDayRange();

    // 查询今日任务列表（缓存，避免多次查询导致索引错误）
    const { data: todayTodos, error: todosError } = await supabase
      .from("todos")
      .select("*")
      .gte("start_time", start.toISOString())
      .lt("start_time", end.toISOString())
      .order("start_time", { ascending: true });

    if (todosError) throw todosError;

    // 检查索引是否有效
    if (index < 0 || index >= todayTodos.length) {
      return new Response(
        JSON.stringify({ success: false, message: "无效的任务编号" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const targetTodo = todayTodos[index];

    // 更新任务状态
    if (action === "complete") {
      const { error: updateError } = await supabase
        .from("todos")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          feeling: feeling,
        })
        .eq("id", targetTodo.id);

      if (updateError) throw updateError;

      // 记录交互
      await supabase.from("bot_interactions").insert({
        todo_id: targetTodo.id,
        message_id: messageId,
        action: "complete",
        content: feeling ? `Index: ${index + 1}, Feeling: ${feeling}` : `Index: ${index + 1}`,
      });
    } else {
      const { error: updateError } = await supabase
        .from("todos")
        .update({
          is_completed: false,
          completed_at: null,
          feeling: null,
        })
        .eq("id", targetTodo.id);

      if (updateError) throw updateError;

      // 记录交互
      await supabase.from("bot_interactions").insert({
        todo_id: targetTodo.id,
        message_id: messageId,
        action: "cancel",
        content: `Index: ${index + 1}`,
      });
    }

    // 获取飞书 access token
    const tenantAccessToken = await getFeishuAccessToken(feishuAppId, feishuAppSecret);

    // 发送确认消息卡片
    if (action === "complete") {
      const categoryInfo = CATEGORY_INFO[targetTodo.category] || { emoji: "📝", label: "其他" };
      const startDate = new Date(targetTodo.start_time);
      const endDate = new Date(targetTodo.end_time);

      const confirmCard = {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: "🎉 恭喜完成任务！" },
          template: "green",
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `**${targetTodo.title}**`,
            },
          },
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `${categoryInfo.emoji} ${categoryInfo.label} | ${formatBeijingTime(startDate)} - ${formatBeijingTime(endDate)}`,
            },
          },
          ...(feeling
            ? [
                { tag: "hr" },
                {
                  tag: "div",
                  text: {
                    tag: "lark_md",
                    content: `💭 **感受：** ${feeling}`,
                  },
                },
              ]
            : []),
        ],
      };

      await fetch("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAccessToken}`,
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: "interactive",
          content: JSON.stringify(confirmCard),
        }),
      });
    } else {
      // 取消完成状态，发送简单文本消息
      await fetch("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAccessToken}`,
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: "text",
          content: JSON.stringify({ text: `↩️ 已取消「${targetTodo.title}」的完成状态` }),
        }),
      });
    }

    // 查询接下来的未完成任务（只显示 3 个）
    const { data: upcomingTodos } = await supabase
      .from("todos")
      .select("*")
      .gte("start_time", start.toISOString())
      .lt("start_time", end.toISOString())
      .eq("is_completed", false)
      .order("start_time", { ascending: true })
      .limit(3);

    if (upcomingTodos && upcomingTodos.length > 0) {
      // 获取今日所有任务用于计算序号
      const { data: allTodayTodos } = await supabase
        .from("todos")
        .select("*")
        .gte("start_time", start.toISOString())
        .lt("start_time", end.toISOString())
        .order("start_time", { ascending: true });

      const cardContent = {
        msg_type: "interactive",
        card: {
          config: { wide_screen_mode: true },
          header: {
            title: { tag: "plain_text", content: "📋 接下来的任务" },
            template: "blue",
          },
          elements: [] as any[],
        },
      };

      upcomingTodos.forEach((todo: Todo) => {
        const categoryInfo = CATEGORY_INFO[todo.category] || { emoji: "📝", label: "其他" };
        const startDate = new Date(todo.start_time);
        const endDate = new Date(todo.end_time);

        // 计算在今日任务列表中的序号
        const taskIndex = (allTodayTodos || []).findIndex(t => t.id === todo.id) + 1;

        cardContent.card.elements.push({
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**${taskIndex}. ${formatBeijingTime(startDate)}-${formatBeijingTime(endDate)}** | ${categoryInfo.emoji} ${todo.title}`,
          },
        });
      });

      cardContent.card.elements.push(
        { tag: "hr" },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: "💡 **回复格式：**\n• `完成 1` - 标记第1项完成\n• `完成 1 感觉很棒` - 标记完成并记录感受\n• `取消 1` - 取消完成标记",
          },
        }
      );

      await fetch("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAccessToken}`,
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: "interactive",
          content: JSON.stringify(cardContent.card),
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Task ${action}d successfully` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
