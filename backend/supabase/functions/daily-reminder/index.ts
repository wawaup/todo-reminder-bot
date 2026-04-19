// Supabase Edge Function: daily-reminder
// 获取当日任务数据，用于 GitHub Actions 调用

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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

const CATEGORY_INFO: Record<string, { emoji: string; label: string }> = {
  life: { emoji: "🏠", label: "生活" },
  daily: { emoji: "☀️", label: "日常" },
  work: { emoji: "💼", label: "工作" },
  study: { emoji: "📚", label: "学习" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 获取今日的任务
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todos, error } = await supabase
      .from("todos")
      .select("*")
      .gte("start_time", today.toISOString())
      .lt("start_time", tomorrow.toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      throw error;
    }

    // 格式化任务数据
    const formattedTodos: Array<{
      index: number;
      id: string;
      title: string;
      description: string | null;
      timeRange: string;
      category: string;
      categoryEmoji: string;
      categoryLabel: string;
      isCompleted: boolean;
    }> = (todos || []).map((todo: Todo, idx: number) => {
      const startDate = new Date(todo.start_time);
      const endDate = new Date(todo.end_time);
      const startTimeStr = `${startDate.getHours().toString().padStart(2, "0")}:${startDate.getMinutes().toString().padStart(2, "0")}`;
      const endTimeStr = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;
      const categoryInfo = CATEGORY_INFO[todo.category] || { emoji: "📝", label: "其他" };

      return {
        index: idx + 1,
        id: todo.id,
        title: todo.title,
        description: todo.description,
        timeRange: `${startTimeStr}-${endTimeStr}`,
        category: todo.category,
        categoryEmoji: categoryInfo.emoji,
        categoryLabel: categoryInfo.label,
        isCompleted: todo.is_completed,
      };
    });

    const result = {
      date: today.toISOString().split("T")[0],
      totalCount: formattedTodos.length,
      todos: formattedTodos,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
