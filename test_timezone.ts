// 测试时区转换逻辑
// 运行: deno run test_timezone.ts

// 修复后的函数
function getBeijingDayRange(): { start: Date; end: Date } {
  const now = new Date();
  const beijingOffset = 8 * 60 * 60 * 1000;
  const beijingTime = new Date(now.getTime() + beijingOffset);

  const year = beijingTime.getUTCFullYear();
  const month = beijingTime.getUTCMonth();
  const date = beijingTime.getUTCDate();

  const startBeijing = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
  const startUTC = new Date(startBeijing.getTime() - beijingOffset);

  const endBeijing = new Date(Date.UTC(year, month, date + 1, 0, 0, 0, 0));
  const endUTC = new Date(endBeijing.getTime() - beijingOffset);

  return { start: startUTC, end: endUTC };
}

// 测试
console.log("=== 时区转换测试 ===\n");

const now = new Date();
console.log("当前 UTC 时间:", now.toISOString());
console.log("当前北京时间:", now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
console.log();

const { start, end } = getBeijingDayRange();
console.log("查询范围（UTC）:");
console.log("  start:", start.toISOString());
console.log("  end:  ", end.toISOString());
console.log();

console.log("查询范围（北京时间）:");
console.log("  start:", start.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
console.log("  end:  ", end.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
console.log();

// 模拟测试数据
console.log("=== 测试数据验证 ===\n");
const testTimes = [
  new Date(now.getTime() + 7 * 60 * 1000),  // NOW() + 7 minutes
  new Date(now.getTime() + 30 * 60 * 1000), // NOW() + 30 minutes
  new Date(now.getTime() + 60 * 60 * 1000), // NOW() + 1 hour
];

testTimes.forEach((testTime, idx) => {
  const inRange = testTime >= start && testTime < end;
  console.log(`测试 ${idx + 1}:`);
  console.log(`  时间 (UTC): ${testTime.toISOString()}`);
  console.log(`  时间 (北京): ${testTime.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`);
  console.log(`  在范围内: ${inRange ? "✅ 是" : "❌ 否"}`);
  console.log();
});
