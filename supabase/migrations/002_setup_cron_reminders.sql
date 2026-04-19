-- =====================================================
-- 设置 pg_cron 扩展用于准时提醒
-- =====================================================

-- 启用 pg_cron 扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 表: reminder_logs - 提醒发送日志
-- =====================================================
CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('daily_summary', 'event_reminder')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_todo_id ON reminder_logs(todo_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);

-- =====================================================
-- 函数: 检查并发送即将到来的事件提醒
-- =====================================================
CREATE OR REPLACE FUNCTION check_and_send_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    todo_record RECORD;
    supabase_url TEXT;
    function_url TEXT;
