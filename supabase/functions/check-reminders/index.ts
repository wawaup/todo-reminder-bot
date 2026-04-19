// Supabase Edge Function: check-reminders
// 检查并发送即将到来的事件提醒

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  validateEnv,
  getFeishuAccessToken,
  getBeijingDayRange,
  formatBeijingTime,
  CATEGORY_INFO,
  REMINDER_WINDOW_START_MIN,
  REMINDER_WINDOW_END_MIN,
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
  reminder_sent: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    validateEnv([
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "FEISHU_APP_ID",
      "FEISHU_APP_SECRET",
      "FEISHU_CHAT_ID",
    ]);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const feishuAppId = Deno.env.get("FEISHU_APP_ID")!;
    const feishuAppSecret = Deno.env.get("FEISHU_APP_SECRET")!;
    const feishuChatId = Deno.env.get("FEISHU_CHAT_ID")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 计算提醒时间窗口（5-10分钟后）
    const now = new Date();
    const windowStart = new Date(now.getTime() + REMINDER_WINDOW_START_MIN * 60 * 1000);
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_END_MIN * 60 * 1000);

    // 查询未提醒、未完成、即将开始的任务（5-10分钟内）
    const { data: todos, error } = await supabase
      .from("todos")
      .select("*")
      .eq("reminder_sent", false)
      .eq("is_completed", false)
      .gte("start_time", windowStart.toISOString())
      .lte("start_time", windowEnd.toISOString())
      .order("start_time", { ascending: true });

    if (error) throw error;

    if (!todos || todos.length === 0) {
      console.log("No reminders to send");
      return new Response(
        JSON.stringify({ success: true, message: "No reminders to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${todos.length} todos to remind`);

    // 获取飞书 access token
    const tenantAccessToken = await getFeishuAccessToken(feishuAppId, feishuAppSecret);

    // 发送每个提醒
    for (const todo of todos as Todo[]) {
      const categoryInfo = CATEGORY_INFO[todo.category] || { emoji: "📝", label: "其他" };
      const startDate = new Date(todo.start_time);
      const endDate = new Date(todo.end_time);

      const cardContent = {
        msg_type: "interactive",
        card: {
          config: { wide_screen_mode: true },
          header: {
            title: { tag: "plain_text", content: `⏰ 即将开始：${todo.title}` },
            template: "red",
          },
          elements: [
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `${categoryInfo.emoji} **${categoryInfo.label}** | ${formatBeijingTime(startDate)} - ${formatBeijingTime(endDate)}`,
              },
            },
            ...(todo.description
              ? [
                  { tag: "hr" },
                  {
                    tag: "div",
                    text: { tag: "lark_md", content: todo.description },
                  },
                ]
              : []),
          ],
        },
      };

      const sendResponse = await fetch(
        "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tenantAccessToken}`,
          },
          body: JSON.stringify({
            receive_id: feishuChatId,
            msg_type: "interactive",
            content: JSON.stringify(cardContent.card),
          }),
        }
      );

      const sendResult = await sendResponse.json();

      if (sendResult.code === 0) {
        // 标记为已提醒
        await supabase
          .from("todos")
          .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
          .eq("id", todo.id);

        console.log(`✅ Reminder sent for: ${todo.title}`);
      } else {
        console.error(`Failed to send reminder for ${todo.title}: ${sendResult.msg}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${todos.length} reminders`,
        count: todos.length,
      }),
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
