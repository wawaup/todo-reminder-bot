// Supabase Edge Function: bot-webhook
// 处理飞书机器人的回调消息

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeishuMessage {
  header: {
    app_id: string;
    app_secret: string;
  };
  event: {
    type: string;
    message: {
      message_id: string;
      chat_id: string;
      sender: {
        sender_id: {
          open_id: string;
        };
        sender_type: string;
      };
      content: string;
      create_time: string;
    };
  };
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Received webhook:", JSON.stringify(body, null, 2));

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
    const contentObj = JSON.parse(messageContent);
    const text = contentObj.text?.trim() || "";

    // 解析用户命令
    // 格式: "完成 1" 或 "完成 1 感觉很棒"
    // 格式: "取消 1"
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

    // 获取今日的任务列表（按时间排序）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todayTodos, error: todosError } = await supabase
      .from("todos")
      .select("*")
      .gte("start_time", today.toISOString())
      .lt("start_time", tomorrow.toISOString())
      .order("start_time", { ascending: true });

    if (todosError) {
      throw todosError;
    }

    // 检查索引是否有效
    if (index < 0 || index >= todayTodos.length) {
      return new Response(
        JSON.stringify({ success: false, message: "无效的任务编号" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

      if (updateError) {
        throw updateError;
      }

      // 记录交互
      await supabase.from("bot_interactions").insert({
        todo_id: targetTodo.id,
        message_id: messageId,
        action: "complete",
        content: feeling ? `Index: ${index + 1}, Feeling: ${feeling}` : `Index: ${index + 1}`,
      });

    } else if (action === "cancel") {
      const { error: updateError } = await supabase
        .from("todos")
        .update({
          is_completed: false,
          completed_at: null,
          feeling: null,
        })
        .eq("id", targetTodo.id);

      if (updateError) {
        throw updateError;
      }

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

    // 发送确认消息到飞书群
    const feishuAppId = Deno.env.get("FEISHU_APP_ID");
    const feishuAppSecret = Deno.env.get("FEISHU_APP_SECRET");
    const chatId = event.message.chat_id;

    // 获取 tenant_access_token
    const tokenResponse = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: feishuAppId, app_secret: feishuAppSecret }),
      }
    );
    const tokenData = await tokenResponse.json();
    const tenantAccessToken = tokenData.tenant_access_token;

    // 发送消息
    await fetch("https://open.feishu.cn/open-apis/im/v1/messages", {
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

    return new Response(
      JSON.stringify({ success: true, message: responseMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
