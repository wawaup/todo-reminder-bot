-- =====================================================
-- 添加提醒追踪字段
-- =====================================================

-- 在 todos 表添加提醒追踪字段
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- 添加优化的复合索引
-- 将最常用的过滤条件放在前面，提高查询效率
CREATE INDEX IF NOT EXISTS idx_todos_upcoming_reminders
ON todos(reminder_sent, is_completed, start_time)
WHERE reminder_sent = FALSE AND is_completed = FALSE;

-- 添加注释
COMMENT ON COLUMN todos.reminder_sent IS '是否已发送提醒';
COMMENT ON COLUMN todos.reminder_sent_at IS '提醒发送时间';
