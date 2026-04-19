// 共享工具函数

// 常量定义
export const REMINDER_WINDOW_START_MIN = 0;
export const REMINDER_WINDOW_END_MIN = 10;

export const CATEGORY_INFO: Record<string, { emoji: string; label: string }> = {
  life: { emoji: "🏠", label: "生活" },
  daily: { emoji: "☀️", label: "日常" },
  work: { emoji: "💼", label: "工作" },
  study: { emoji: "📚", label: "学习" },
};

// 环境变量验证
export function validateEnv(keys: string[]): void {
  const missing = keys.filter(key => !Deno.env.get(key));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

// 获取北京时间的今日起止时间（UTC 时间戳）
export function getBeijingDayRange(): { start: Date; end: Date } {
  // 获取当前 UTC 时间
  const now = new Date();

  // 转换为北京时间的毫秒数（UTC+8）
  const beijingOffset = 8 * 60 * 60 * 1000;
  const beijingTime = new Date(now.getTime() + beijingOffset);

  // 获取北京时间的日期部分（年月日）
  const year = beijingTime.getUTCFullYear();
  const month = beijingTime.getUTCMonth();
  const date = beijingTime.getUTCDate();

  // 构造北京时间今日 00:00:00 对应的 UTC 时间
  const startBeijing = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
  const startUTC = new Date(startBeijing.getTime() - beijingOffset);

  // 构造北京时间次日 00:00:00 对应的 UTC 时间
  const endBeijing = new Date(Date.UTC(year, month, date + 1, 0, 0, 0, 0));
  const endUTC = new Date(endBeijing.getTime() - beijingOffset);

  return { start: startUTC, end: endUTC };
}

// 获取飞书 access token
export async function getFeishuAccessToken(
  appId: string,
  appSecret: string
): Promise<string> {
  const response = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get Feishu token: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.tenant_access_token) {
    throw new Error(`Failed to get Feishu token: ${data.msg || "Unknown error"}`);
  }

  return data.tenant_access_token;
}

// 格式化时间为北京时间字符串
export function formatBeijingTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
  });
}
