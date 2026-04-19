# Todo 提醒系统测试指南

## 前置准备

### 1. 部署数据库迁移

```bash
cd /supabase
supabase db push
```

### 2. 部署 Edge Functions

```bash
# 部署所有函数
supabase functions deploy check-reminders
supabase functions deploy daily-reminder
supabase functions deploy bot-webhook

# 设置环境变量（在 Supabase Dashboard 中设置）
# Settings > Edge Functions > Environment Variables
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_CHAT_ID=your_chat_id
```

## 测试方法

### 方法 1: 通过 Supabase Dashboard 测试

#### 测试 check-reminders（定时提醒）

1. 在 Supabase Dashboard 中插入测试数据：

```sql
-- 插入一个 10 分钟后开始的任务
INSERT INTO todos (title, description, start_time, end_time, category, is_completed)
VALUES (
  '测试提醒',
  '这是一个测试任务',
  NOW() + INTERVAL '7 minutes',  -- 7 分钟后开始（在 5-10 分钟窗口内）
  NOW() + INTERVAL '8 minutes',
  'work',
  false
);
```

2. 在 Supabase Dashboard > Edge Functions > check-reminders 点击 "Invoke"
3. 检查飞书群是否收到提醒消息
4. 验证数据库：

```sql
SELECT id, title, reminder_sent, reminder_sent_at 
FROM todos 
WHERE title = '测试提醒';
-- reminder_sent 应该为 true
```

#### 测试 daily-reminder（每日汇总）

1. 插入今日的测试数据：

```sql
-- 插入今日的任务
INSERT INTO todos (title, start_time, end_time, category, is_completed)
VALUES 
  ('早会', CURRENT_DATE + TIME '09:00:00', CURRENT_DATE + TIME '09:30:00', 'work', false),
  ('午餐', CURRENT_DATE + TIME '12:00:00', CURRENT_DATE + TIME '13:00:00', 'life', false),
  ('健身', CURRENT_DATE + TIME '18:00:00', CURRENT_DATE + TIME '19:00:00', 'daily', false);
```

2. 在 Supabase Dashboard > Edge Functions > daily-reminder 点击 "Invoke"
3. 检查飞书群是否收到今日汇总消息

#### 测试 bot-webhook（飞书回复）

1. 确保已配置飞书机器人 webhook URL：

   - URL: `https://your-project.supabase.co/functions/v1/bot-webhook`
2. 在飞书群中回复：

   ```
   完成 1
   ```

   或

   ```
   完成 1 感觉很棒
   ```
3. 检查：

   - 飞书群收到确认消息
   - 飞书群收到更新后的事项列表（未完成 + 最近 3 个已完成）
4. 验证数据库：

```sql
SELECT id, title, is_completed, completed_at, feeling 
FROM todos 
WHERE is_completed = true 
ORDER BY completed_at DESC 
LIMIT 1;
```

### 方法 2: 通过 curl 测试

#### 测试 check-reminders

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/check-reminders' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

#### 测试 daily-reminder

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/daily-reminder' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

#### 测试 bot-webhook（模拟飞书回调）

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/bot-webhook' \
  -H 'Content-Type: application/json' \
  -d '{
    "event": {
      "message": {
        "message_id": "test_msg_123",
        "chat_id": "your_chat_id",
        "content": "{\"text\":\"完成 1\"}"
      }
    }
  }'
```

### 方法 3: 通过飞书群直接测试

#### 完整流程测试

1. **插入测试数据**（在 Supabase SQL Editor）：

```sql
-- 插入今日的任务
INSERT INTO todos (title, description, start_time, end_time, category, is_completed)
VALUES 
  ('测试任务1', '描述1', NOW() + INTERVAL '7 minutes', NOW() + INTERVAL '8 minutes', 'work', false),
  ('测试任务2', '描述2', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '3 hours', 'study', false),
  ('测试任务3', '描述3', NOW() + INTERVAL '4 hours', NOW() + INTERVAL '5 hours', 'life', false);
```

2. **测试每日汇总**：

   - 手动调用 daily-reminder 函数
   - 飞书群应收到包含 3 个任务的汇总卡片
3. **测试定时提醒**：

   - 等待 7 分钟，或手动调用 check-reminders
   - 飞书群应收到"测试任务1"的提醒
4. **测试标记完成**：

   - 在飞书群回复：`完成 1 很顺利`
   - 应收到确认消息
   - 应收到更新后的事项列表
5. **验证数据**：

```sql
-- 查看所有今日任务状态
SELECT 
  title, 
  is_completed, 
  reminder_sent, 
  feeling,
  TO_CHAR(start_time AT TIME ZONE 'Asia/Shanghai', 'HH24:MI') as start_time_beijing
FROM todos 
WHERE start_time >= CURRENT_DATE 
  AND start_time < CURRENT_DATE + INTERVAL '1 day'
ORDER BY start_time;
```

## 常见问题排查

### 1. 飞书没收到消息

- 检查环境变量是否正确设置
- 检查 Edge Function 日志：Supabase Dashboard > Edge Functions > Logs
- 验证飞书 App ID 和 Secret 是否有效

### 2. 时区不对

- 确保使用了修复后的代码（使用 `getBeijingDayRange()`）
- 检查数据库中的时间是否正确：

```sql
SELECT 
  title,
  start_time,
  start_time AT TIME ZONE 'Asia/Shanghai' as beijing_time
FROM todos;
```

### 3. 提醒没发送

- 检查 `reminder_sent` 字段是否已经为 true
- 检查任务的 `start_time` 是否在 5-10 分钟窗口内
- 查看 check-reminders 函数日志

### 4. 标记完成失败

- 检查飞书 webhook URL 是否正确配置
- 检查回复格式是否正确（`完成 1` 或 `完成 1 感觉很棒`）
- 查看 bot-webhook 函数日志

## 生产环境配置

### 设置外部 Cron 服务

使用 [cron-job.org](https://cron-job.org) 或类似服务：

1. 创建新的 Cron Job
2. URL: `https://your-project.supabase.co/functions/v1/check-reminders`
3. 频率: 每 1 分钟
4. HTTP Method: POST
5. Headers:
   - `Authorization: Bearer YOUR_ANON_KEY`
   - `Content-Type: application/json`

### 设置每日汇总

1. 创建新的 Cron Job
2. URL: `https://your-project.supabase.co/functions/v1/daily-reminder`
3. 频率: 每天 07:00 (北京时间，需要转换为 UTC: 23:00 前一天)
4. HTTP Method: POST
5. Headers:
   - `Authorization: Bearer YOUR_ANON_KEY`
   - `Content-Type: application/json`

## 性能监控

### 查看提醒发送统计

```sql
SELECT 
  DATE(reminder_sent_at AT TIME ZONE 'Asia/Shanghai') as date,
  COUNT(*) as reminders_sent
FROM todos 
WHERE reminder_sent = true
GROUP BY DATE(reminder_sent_at AT TIME ZONE 'Asia/Shanghai')
ORDER BY date DESC;
```

### 查看完成率

```sql
SELECT 
  DATE(start_time AT TIME ZONE 'Asia/Shanghai') as date,
  COUNT(*) as total_tasks,
  SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_tasks,
  ROUND(100.0 * SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) / COUNT(*), 2) as completion_rate
FROM todos 
GROUP BY DATE(start_time AT TIME ZONE 'Asia/Shanghai')
ORDER BY date DESC
LIMIT 7;
```
