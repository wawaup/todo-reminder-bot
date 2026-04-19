-- 设置 daily-reminder 定时任务：每天早上 8:00 执行
-- 使用 pg_cron 扩展

-- 确保扩展已启用（如果已经启用会自动跳过）
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- 授予权限
GRANT USAGE ON SCHEMA net TO anon, authenticated, service_role;

-- 删除旧的 daily-reminder 任务（如果存在）
SELECT cron.unschedule('daily-reminder-job');

-- 创建新任务：每天早上 8:00 执行（北京时间）
-- 注意：Supabase 使用 UTC 时间，北京时间 8:00 = UTC 0:00
SELECT cron.schedule(
  'daily-reminder-job',
  '0 0 * * *', -- 每天 UTC 0:00（北京时间 8:00）
  $$
    SELECT net.http_post(
      url := 'https://wbwjlqnuuojyusgpkqlb.supabase.co/functions/v1/daily-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indid2pscW51dW9qeXVzZ3BrcWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDEwNjAsImV4cCI6MjA5MjE3NzA2MH0.i7IXamEpY3HPNrW8ewhQI8Ip4DpHRDbvfJbkx9f24gw'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- 查看所有定时任务
SELECT jobid, schedule, command, nodename, nodeport, database, username, active
FROM cron.job
ORDER BY jobid;

-- 查看最近的执行历史
SELECT jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
