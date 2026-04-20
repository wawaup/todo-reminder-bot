#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * 清空 todos 表中的所有数据
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

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
    console.log("请设置以下环境变量：");
    console.log("  export SUPABASE_URL='your-supabase-url'");
    console.log("  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'");
    Deno.exit(1);
  }

  console.log("\n🔗 连接到 Supabase...");
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 先查询当前数据量
  const { count, error: countError } = await supabase
    .from("todos")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error(`❌ 查询失败：${countError.message}`);
    Deno.exit(1);
  }

  console.log(`\n📊 当前数据库中有 ${count} 条记录`);

  if (count === 0) {
    console.log("✅ 数据库已经是空的，无需清空");
    Deno.exit(0);
  }

  // 确认删除
  console.log("\n⚠️  警告：即将删除所有数据！");
  console.log("按 Ctrl+C 取消，或等待 3 秒后自动执行...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 删除所有数据
  console.log("\n🗑️  正在删除所有数据...");
  const { error: deleteError } = await supabase
    .from("todos")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // 删除所有记录

  if (deleteError) {
    console.error(`❌ 删除失败：${deleteError.message}`);
    Deno.exit(1);
  }

  console.log(`\n✅ 成功删除 ${count} 条记录！`);
  console.log("🎉 数据库已清空！");
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ 发生错误：", error);
    Deno.exit(1);
  });
}
