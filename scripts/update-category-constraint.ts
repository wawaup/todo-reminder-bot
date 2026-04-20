#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * 更新数据库中的 category 约束
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

  // 执行 SQL 更新约束
  console.log("\n📝 更新 category 约束...");

  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_category_check'
  });

  if (dropError) {
    console.log("⚠️  删除旧约束时出错（可能不存在）:", dropError.message);
  } else {
    console.log("✅ 已删除旧约束");
  }

  const { error: addError } = await supabase.rpc('exec_sql', {
    sql: "ALTER TABLE todos ADD CONSTRAINT todos_category_check CHECK (category IN ('学习', '健康', '运动', '作息', '冥想', '日常'))"
  });

  if (addError) {
    console.error("❌ 添加新约束失败:", addError.message);
    Deno.exit(1);
  }

  console.log("✅ 成功添加新约束");
  console.log("\n🎉 数据库约束更新完成！");
  console.log("\n新的分类值：学习、健康、运动、作息、冥想、日常");
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ 发生错误：", error);
    Deno.exit(1);
  });
}
