#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * 迁移数据库中的分类值
 * 从旧分类映射到新分类
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// 分类映射关系
const CATEGORY_MAPPING: Record<string, string> = {
  'life': '日常',
  'daily': '日常',
  'work': '学习',
  'study': '学习',
};

async function main() {
  // 加载环境变量
  console.log("🔧 加载环境变量...");
  try {
    await load({ export: true, envPath: ".env" });
    console.log("✅ 环境变量加载成功");
  } catch (error) {
    console.log("⚠️  未找到 .env 文件，将使用系统环境变量");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("\n❌ 错误：缺少环境变量");
    Deno.exit(1);
  }

  console.log("\n🔗 连接到 Supabase...");
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 查询现有数据的分类分布
  console.log("\n📊 查询现有数据的分类分布...");
  const { data: todos, error: queryError } = await supabase
    .from("todos")
    .select("id, category");

  if (queryError) {
    console.error(`❌ 查询失败：${queryError.message}`);
    Deno.exit(1);
  }

  // 统计分类分布
  const categoryStats = new Map<string, number>();
  todos?.forEach((todo: any) => {
    const count = categoryStats.get(todo.category) || 0;
    categoryStats.set(todo.category, count + 1);
  });

  console.log("\n当前数据库中的分类分布：");
  categoryStats.forEach((count, category) => {
    console.log(`  ${category}: ${count} 条记录`);
  });

  // 2. 更新每条记录的分类
  console.log("\n🔄 开始迁移分类值...");
  let updatedCount = 0;
  let skippedCount = 0;

  for (const todo of todos || []) {
    const oldCategory = todo.category;
    const newCategory = CATEGORY_MAPPING[oldCategory];

    if (!newCategory) {
      console.log(`⚠️  跳过未知分类：${oldCategory}`);
      skippedCount++;
      continue;
    }

    if (oldCategory === newCategory) {
      skippedCount++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("todos")
      .update({ category: newCategory })
      .eq("id", todo.id);

    if (updateError) {
      console.error(`❌ 更新失败 (ID: ${todo.id}): ${updateError.message}`);
    } else {
      updatedCount++;
      if (updatedCount % 10 === 0) {
        console.log(`  已更新 ${updatedCount} 条记录...`);
      }
    }
  }

  console.log(`\n✅ 迁移完成！`);
  console.log(`  更新：${updatedCount} 条`);
  console.log(`  跳过：${skippedCount} 条`);
  console.log("\n分类映射关系：");
  Object.entries(CATEGORY_MAPPING).forEach(([old, newVal]) => {
    console.log(`  ${old} → ${newVal}`);
  });
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ 发生错误：", error);
    Deno.exit(1);
  });
}
