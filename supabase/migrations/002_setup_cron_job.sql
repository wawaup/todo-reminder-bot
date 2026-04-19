-- 1. 确保在正确的 Schema 下操作
SET statement_timeout = '30s';

-- 2. 启用扩展（关键修复：指定 SCHEMA）
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net; -- 这里指定了 WITH SCHEMA net

-- 3. 授予 public 角色 USAGE 权限（防止权限不足）
GRANT USAGE ON SCHEMA net TO anon, authenticated, service_role;

-- 4. 现在可以安全地使用 net.http_post
-- 删除旧任务
SELECT cron.unschedule('check-reminders-job');

-- 5. 创建新任务
SELECT cron.schedule(
  'check-reminders-job',
  '* * * * *', -- 每分钟一次
  $$
    SELECT net.http_post(
      url := 'https://wbwjlqnuuojyusgpkqlb.supabase.co/functions/v1/check-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indid2pscW51dW9qeXVzZ3BrcWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDEwNjAsImV4cCI6MjA5MjE3NzA2MH0.i7IXamEpY3HPNrW8ewhQI8Ip4DpHRDbvfJbkx9f24gw'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- 查看所有定时任务
-- SELECT * FROM cron.job;

-- 查看定时任务执行历史
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
