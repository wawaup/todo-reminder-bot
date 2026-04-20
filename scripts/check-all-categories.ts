#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

await load({ export: true, envPath: ".env" });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// 查询所有分类及其数量
const { data, error } = await supabase
  .from("todos")
  .select("category");

if (error) {
  console.error("Error:", error);
} else {
  const categories = new Map<string, number>();
  data.forEach(t => {
    categories.set(t.category, (categories.get(t.category) || 0) + 1);
  });

  console.log("All categories in database:");
  categories.forEach((count, cat) => {
    console.log(`  ${cat}: ${count}`);
  });
  console.log(`\nTotal: ${data.length} records`);
}
