#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * 批量添加重复日程脚本
 *
 * 使用方法：
 * 1. 准备单日日程模板 JSON 文件（参考 daily-template.json）
 *    - 在 JSON 文件中指定日期范围（start_date 和 end_date）
 *    - 定义每天要重复的日程模板（时间和持续时间）
 * 2. 运行脚本：
 *    deno run --allow-net --allow-read --allow-env scripts/batch-add-recurring-todos.ts daily-template.json
 *
 * JSON 文件格式：
 * {
 *   "start_date": "2026-04-21",
 *   "end_date": "2026-04-30",
 *   "todos": [
 *     {
 *       "title": "任务标题",
 *       "description": "任务描述（可选）",
 *       "time": "07:00",
 *       "duration": 30,
 *       "category": "日常"
 *     }
 *   ]
 * }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

interface TodoTemplate {
  title: string;
  description?: string;
  time: string; // 格式：HH:MM
  duration: number; // 持续时间（分钟）
  category: string;
}

interface TemplateFile {
  start_date: string;
  end_date: string;
  todos: TodoTemplate[];
}

// 验证分类
const VALID_CATEGORIES = ["学习", "健康", "运动", "作息", "冥想", "日常"];

// 验证时间格式 HH:MM
function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
}

// 验证日期格式 YYYY-MM-DD
function validateDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

// 验证单个模板任务
function validateTemplate(todo: TodoTemplate, index: number): string[] {
  const errors: string[] = [];

  if (!todo.title || todo.title.trim() === "") {
    errors.push(`任务 ${index + 1}: 标题不能为空`);
  }

  if (!todo.time || !validateTimeFormat(todo.time)) {
    errors.push(`任务 ${index + 1}: 时间格式无效（应为 HH:MM）`);
  }

  if (!todo.duration || todo.duration <= 0) {
    errors.push(`任务 ${index + 1}: 持续时间必须大于 0`);
  }

  if (!todo.category || !VALID_CATEGORIES.includes(todo.category)) {
    errors.push(`任务 ${index + 1}: 分类必须是以下之一：${VALID_CATEGORIES.join(", ")}`);
  }

  return errors;
}

// 生成日期范围内的所有日期
function generateDateRange(startDate: string, endDate: string): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// 将模板转换为具体日期的 TODO
function templateToTodo(template: TodoTemplate, date: Date) {
  const [hours, minutes] = template.time.split(":").map(Number);

  const startTime = new Date(date);
  startTime.setHours(hours, minutes, 0, 0);

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + template.duration);

  return {
    title: template.title,
    description: template.description || null,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    category: template.category,
    is_completed: false,
    reminder_sent: false,
  };
}

async function main() {
  // 加载 .env 文件
  console.log("🔧 加载环境变量...");
  try {
    await load({ export: true, envPath: ".env" });
    console.log("✅ 环境变量加载成功");
  } catch (error) {
    console.log("⚠️  未找到 .env 文件，将使用系统环境变量");
  }

  // 获取命令行参数
  const args = Deno.args;
  if (args.length === 0) {
    console.error("\n❌ 错误：请提供 JSON 文件路径");
    console.log("\n使用方法：");
    console.log("  deno run --allow-net --allow-read --allow-env scripts/batch-add-recurring-todos.ts <模板文件>");
    console.log("\n示例：");
    console.log("  deno run --allow-net --allow-read --allow-env scripts/batch-add-recurring-todos.ts daily-template.json");
    Deno.exit(1);
  }

  const filePath = args[0];

  // 读取模板文件
  console.log(`\n📖 正在读取模板文件：${filePath}`);
  let templateData: TemplateFile;
  try {
    const fileContent = await Deno.readTextFile(filePath);
    templateData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ 读取文件失败：${error.message}`);
    Deno.exit(1);
  }

  // 验证数据结构
  if (!templateData.start_date || !templateData.end_date) {
    console.error("❌ 错误：JSON 文件必须包含 'start_date' 和 'end_date' 字段");
    Deno.exit(1);
  }

  if (!templateData.todos || !Array.isArray(templateData.todos)) {
    console.error("❌ 错误：JSON 文件必须包含 'todos' 数组");
    Deno.exit(1);
  }

  if (templateData.todos.length === 0) {
    console.error("❌ 错误：todos 数组不能为空");
    Deno.exit(1);
  }

  // 验证日期格式
  if (!validateDateFormat(templateData.start_date)) {
    console.error(`❌ 错误：开始日期格式无效（应为 YYYY-MM-DD）`);
    Deno.exit(1);
  }

  if (!validateDateFormat(templateData.end_date)) {
    console.error(`❌ 错误：结束日期格式无效（应为 YYYY-MM-DD）`);
    Deno.exit(1);
  }

  if (new Date(templateData.start_date) > new Date(templateData.end_date)) {
    console.error(`❌ 错误：开始日期不能晚于结束日期`);
    Deno.exit(1);
  }

  console.log(`✅ 找到 ${templateData.todos.length} 个模板任务`);

  // 验证所有模板
  console.log("\n🔍 验证模板数据...");
  const allErrors: string[] = [];
  templateData.todos.forEach((todo, index) => {
    const errors = validateTemplate(todo, index);
    allErrors.push(...errors);
  });

  if (allErrors.length > 0) {
    console.error("\n❌ 数据验证失败：");
    allErrors.forEach((error) => console.error(`  - ${error}`));
    Deno.exit(1);
  }

  console.log("✅ 所有模板数据验证通过");

  // 生成日期范围
  const dates = generateDateRange(templateData.start_date, templateData.end_date);
  console.log(`\n📅 日期范围：${templateData.start_date} 至 ${templateData.end_date}（共 ${dates.length} 天）`);

  // 获取环境变量
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("\n❌ 错误：缺少环境变量");
    console.log("请设置以下环境变量：");
    console.log("  export SUPABASE_URL='your-supabase-url'");
    console.log("  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'");
    Deno.exit(1);
  }

  // 连接 Supabase
  console.log("\n🔗 连接到 Supabase...");
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 生成所有待插入的任务
  console.log("\n🔄 生成任务...");
  const todosToInsert = [];
  for (const date of dates) {
    for (const template of templateData.todos) {
      todosToInsert.push(templateToTodo(template, date));
    }
  }

  console.log(`✅ 共生成 ${todosToInsert.length} 个任务（${dates.length} 天 × ${templateData.todos.length} 个模板）`);

  // 批量插入
  console.log("\n📝 正在批量插入任务...");
  const { data, error } = await supabase
    .from("todos")
    .insert(todosToInsert)
    .select();

  if (error) {
    console.error(`❌ 插入失败：${error.message}`);
    Deno.exit(1);
  }

  // 输出结果摘要
  console.log(`\n✅ 成功添加 ${data.length} 个任务！`);
  console.log("\n📊 任务统计：");

  const byDate = new Map<string, number>();
  data.forEach((todo) => {
    const date = new Date(todo.start_time).toLocaleDateString("zh-CN");
    byDate.set(date, (byDate.get(date) || 0) + 1);
  });

  byDate.forEach((count, date) => {
    console.log(`  ${date}: ${count} 个任务`);
  });

  console.log("\n🎉 批量添加完成！");
}

// 运行主函数
if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ 发生错误：", error);
    Deno.exit(1);
  });
}
