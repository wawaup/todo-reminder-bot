#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * 批量添加 TODO 任务脚本
 *
 * 使用方法：
 * 1. 复制 .env.example 为 .env 并填写配置
 * 2. 复制 todos-template.json 并修改为你的任务列表
 * 3. 运行脚本：
 *    deno run --allow-net --allow-read --allow-env scripts/batch-add-todos.ts your-todos.json
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

interface TodoInput {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  category: string;
}

interface TodosFile {
  todos: TodoInput[];
}

// 验证分类
const VALID_CATEGORIES = ["学习", "健康", "运动", "作息", "冥想", "日常"];

// 验证时间格式
function validateDateTime(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// 验证单个任务
function validateTodo(todo: TodoInput, index: number): string[] {
  const errors: string[] = [];

  if (!todo.title || todo.title.trim() === "") {
    errors.push(`任务 ${index + 1}: 标题不能为空`);
  }

  if (!todo.start_time || !validateDateTime(todo.start_time)) {
    errors.push(`任务 ${index + 1}: 开始时间格式无效`);
  }

  if (!todo.end_time || !validateDateTime(todo.end_time)) {
    errors.push(`任务 ${index + 1}: 结束时间格式无效`);
  }

  if (todo.start_time && todo.end_time) {
    const start = new Date(todo.start_time);
    const end = new Date(todo.end_time);
    if (start >= end) {
      errors.push(`任务 ${index + 1}: 结束时间必须晚于开始时间`);
    }
  }

  if (!todo.category || !VALID_CATEGORIES.includes(todo.category)) {
    errors.push(`任务 ${index + 1}: 分类必须是以下之一：${VALID_CATEGORIES.join(", ")}`);
  }

  return errors;
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
    console.log("  deno run --allow-net --allow-read --allow-env scripts/batch-add-todos.ts your-todos.json");
    console.log("\n示例：");
    console.log("  deno run --allow-net --allow-read --allow-env scripts/batch-add-todos.ts todos-template.json");
    Deno.exit(1);
  }

  const filePath = args[0];

  // 读取 JSON 文件
  console.log(`📖 正在读取文件：${filePath}`);
  let todosData: TodosFile;
  try {
    const fileContent = await Deno.readTextFile(filePath);
    todosData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ 读取文件失败：${error.message}`);
    Deno.exit(1);
  }

  // 验证数据结构
  if (!todosData.todos || !Array.isArray(todosData.todos)) {
    console.error("❌ 错误：JSON 文件必须包含 'todos' 数组");
    Deno.exit(1);
  }

  if (todosData.todos.length === 0) {
    console.error("❌ 错误：todos 数组不能为空");
    Deno.exit(1);
  }

  console.log(`✅ 找到 ${todosData.todos.length} 个任务`);

  // 验证所有任务
  console.log("\n🔍 验证任务数据...");
  const allErrors: string[] = [];
  todosData.todos.forEach((todo, index) => {
    const errors = validateTodo(todo, index);
    allErrors.push(...errors);
  });

  if (allErrors.length > 0) {
    console.error("\n❌ 数据验证失败：");
    allErrors.forEach((error) => console.error(`  - ${error}`));
    Deno.exit(1);
  }

  console.log("✅ 所有任务数据验证通过");

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

  // 准备插入数据
  const todosToInsert = todosData.todos.map((todo) => ({
    title: todo.title,
    description: todo.description || null,
    start_time: todo.start_time,
    end_time: todo.end_time,
    category: todo.category,
    is_completed: false,
    reminder_sent: false,
  }));

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

  // 输出结果
  console.log(`\n✅ 成功添加 ${data.length} 个任务！\n`);
  data.forEach((todo, index) => {
    const start = new Date(todo.start_time);
    const end = new Date(todo.end_time);
    console.log(`${index + 1}. ${todo.title}`);
    console.log(`   分类：${todo.category}`);
    console.log(`   时间：${start.toLocaleString("zh-CN")} - ${end.toLocaleString("zh-CN")}`);
    if (todo.description) {
      console.log(`   描述：${todo.description}`);
    }
    console.log();
  });

  console.log("🎉 批量添加完成！");
}

// 运行主函数
if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ 发生错误：", error);
    Deno.exit(1);
  });
}
