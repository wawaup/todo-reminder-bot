# Todo 提醒系统部署指南

## ✅ 已完成的功能

1. **数据库迁移** - 添加了 `reminder_sent` 和 `reminder_sent_at` 字段用于追踪提醒状态
2. **check-reminders Edge Function** - 每分钟检查并发送即将到来的事件提醒（5-10分钟内）
3. **bot-webhook 改进** - 用户回复"完成 X"后，自动发送筛选后的事项列表：
   - 显示所有未完成事项
   - 显示最近 3 个已完成事项
4. **daily-reminder 改进** - 每天早上 7:00 直接发送飞书消息，展示今日所有事项

## 📋 部署步骤

### 1. 应用数据库迁移

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 在 todos 表添加提醒追踪字段
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_todos_reminder_sent
ON todos(reminder_sent) WHERE reminder_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_todos_upcoming_reminders
ON todos(start_time, reminder_sent, is_completed)
WHERE reminder_sent = FALSE AND is_completed = FALSE;
```

### 2. 部署 Edge Functions

```bash
cd backend

# 部署新的 check-reminders 函数
supabase functions deploy check-reminders

# 重新部署修改后的函数
supabase functions deploy bot-webhook
supabase functions deploy daily-reminder
```

### 3. 配置环境变量

在 Supabase Dashboard → Edge Functions → Settings 中添加：
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_CHAT_ID`

### 4. 配置外部 Cron 服务

使用 cron-job.org 创建两个定时任务：

**准时提醒（每分钟）：**
- URL: `https://[project-ref].supabase.co/functions/v1/check-reminders`
- Schedule: `* * * * *`
- Method: POST
- Header: `Authorization: Bearer [anon-key]`

**每日汇总（早上7点）：**
- URL: `https://[project-ref].supabase.co/functions/v1/daily-reminder`
- Schedule: `0 23 * * *`
- Method: POST
- Header: `Authorization: Bearer [anon-key]`

### 5. 测试

手动调用 Edge Functions 测试：

```bash
# 测试 check-reminders
curl -X POST https://[project-ref].supabase.co/functions/v1/check-reminders \
  -H "Authorization: Bearer [anon-key]"

# 测试 daily-reminder
curl -X POST https://[project-ref].supabase.co/functions/v1/daily-reminder \
  -H "Authorization: Bearer [anon-key]"
```

## 🎯 功能说明

### 准时提醒机制
- 每分钟检查数据库中 5-10 分钟内即将开始的事件
- 自动发送提醒到飞书群
- 发送后标记 `reminder_sent = true`，避免重复提醒

### 回复后筛选
- 用户回复"完成 1"后，机器人会：
  1. 标记该事项为已完成
  2. 发送确认消息
  3. 发送更新后的事项列表（只显示未完成 + 最近3个已完成）

### 每日汇总
- 每天早上 7:00（北京时间）发送今日所有事项
- 显示事项编号，方便用户回复标记完成

## 📝 注意事项

1. **时区处理**：所有时间计算都考虑了北京时间（UTC+8）
2. **避免重复提醒**：使用 `reminder_sent` 字段防止同一事件多次提醒
3. **准时性**：外部 Cron 服务比 GitHub Actions 更准时（延迟 < 1 分钟）
4. **飞书 Chat ID**：在群里 @机器人 发消息，从 bot-webhook 日志中获取

## 🔧 故障排查

如果提醒没有发送，检查：
1. Supabase Edge Functions 日志
2. 外部 Cron 服务的执行历史
3. 飞书机器人权限配置
4. 环境变量是否正确设置
