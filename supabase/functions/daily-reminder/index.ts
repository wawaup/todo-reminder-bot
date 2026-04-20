// Supabase Edge Function: daily-reminder
// 每日早上发送今日所有事项汇总

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

    // 获取北京时间的今日起止时间
    const { start, end } = getBeijingDayRange();

    // 查询今日所有任务
    const { data: todos, error } = await supabase
      .from("todos")
      .select("*")
      .gte("start_time", start.toISOString())
      .lt("start_time", end.toISOString())
      .order("start_time", { ascending: true });

    if (error) throw error;

    console.log(`Found ${todos?.length || 0} todos for today`);

    // 获取飞书 access token
    const tenantAccessToken = await getFeishuAccessToken(feishuAppId, feishuAppSecret);

    // 格式化日期（北京时间）
    const todayStr = new Date().toLocaleDateString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    // 构建消息卡片
    const cardContent = {
      msg_type: "interactive",
      card: {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: `🌅 ${todayStr} 日程提醒` },
          template: "orange",
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `📅 **今日共 ${todos?.length || 0} 个事项**`,
            },
          },
          { tag: "hr" },
        ],
      },
    };

    if (!todos || todos.length === 0) {
      cardContent.card.elements.push({
        tag: "div",
        text: {
          tag: "lark_md",
          content: "🎉 今天没有安排，好好休息吧！",
        },
      });
    } else {
      // 构建任务列表文本
      let taskListContent = "";
      todos.forEach((todo: Todo, idx: number) => {
        const categoryInfo = CATEGORY_INFO[todo.category] || { emoji: "📝", label: "其他" };
        const startDate = new Date(todo.start_time);
        const endDate = new Date(todo.end_time);
        const status = todo.is_completed ? "✅" : "⬜";
        const taskIndex = idx + 1;

        // 已完成的任务，时间和标题都加删除线
        const timeText = todo.is_completed
          ? `~~${formatBeijingTime(startDate)}-${formatBeijingTime(endDate)}~~`
          : `${formatBeijingTime(startDate)}-${formatBeijingTime(endDate)}`;
        const titleText = todo.is_completed ? `~~${todo.title}~~` : todo.title;

        taskListContent += `${taskIndex}. ${status} ${timeText} | ${categoryInfo.emoji} ${titleText}\n`;
      });

      cardContent.card.elements.push({
        tag: "div",
        text: {
          tag: "lark_md",
          content: taskListContent.trim(),
        },
      });

      // 添加分割线
      cardContent.card.elements.push({ tag: "hr" });

      cardContent.card.elements.push({
        tag: "div",
        text: {
          tag: "lark_md",
          content: "💡 **快捷操作：**\n• `完成 1` - 标记第1项完成\n• `完成 1 感觉很棒` - 标记完成并记录感受\n• `取消 1` - 取消完成标记",
        },
      });
    }

    // 添加调试日志
    console.log("Card content:", JSON.stringify(cardContent, null, 2));

    // 发送消息到飞书
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
      console.log("✅ Daily reminder sent successfully!");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Daily reminder sent successfully",
          todosCount: todos?.length || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw new Error(`Failed to send message: ${sendResult.msg}`);
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
