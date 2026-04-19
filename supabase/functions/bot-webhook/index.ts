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

    const responseMessage = action === "complete"
      ? `✅ 已标记「${targetTodo.title}」完成！${feeling ? `\n💭 感受：${feeling}` : ""}`
      : `↩️ 已取消「${targetTodo.title}」的完成状态`;

    // 获取飞书 access token
    const tenantAccessToken = await getFeishuAccessToken(feishuAppId, feishuAppSecret);

    // 发送确认消息
    await fetch("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenantAccessToken}`,
      },
      body: JSON.stringify({
        receive_id: chatId,
        msg_type: "text",
        content: JSON.stringify({ text: responseMessage }),
      }),
    });

    // 查询更新后的任务列表
    const { data: incompleteTodos } = await supabase
      .from("todos")
      .select("*")
      .gte("start_time", start.toISOString())
      .lt("start_time", end.toISOString())
      .eq("is_completed", false)
      .order("start_time", { ascending: true });

    const { data: completedTodos } = await supabase
      .from("todos")
      .select("*")
      .gte("start_time", start.toISOString())
      .lt("start_time", end.toISOString())
      .eq("is_completed", true)
      .order("completed_at", { ascending: false })
      .limit(3);

    // 合并并按时间排序
    const displayTodos = [...(incompleteTodos || []), ...(completedTodos || [])].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    if (displayTodos.length > 0) {
      const cardContent = {
        msg_type: "interactive",
        card: {
          config: { wide_screen_mode: true },
          header: {
            title: { tag: "plain_text", content: "📋 今日事项更新" },
            template: "blue",
          },
          elements: [
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `📅 **剩余 ${incompleteTodos?.length || 0} 个未完成事项**`,
              },
            },
            { tag: "hr" },
          ],
        },
      };

      displayTodos.forEach((todo: Todo) => {
        const categoryInfo = CATEGORY_INFO[todo.category] || { emoji: "📝", label: "其他" };
        const startDate = new Date(todo.start_time);
        const endDate = new Date(todo.end_time);
        const status = todo.is_completed ? "✅" : "⬜";

        cardContent.card.elements.push({
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**${status} ${formatBeijingTime(startDate)}-${formatBeijingTime(endDate)}** | ${categoryInfo.emoji} ${todo.title}`,
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
      JSON.stringify({ success: true, message: responseMessage }),
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
