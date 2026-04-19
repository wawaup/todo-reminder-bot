-- =====================================================
-- 小管家 Todo - 数据库初始化脚本
-- =====================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 表 1: todos - 日程任务表
-- =====================================================
CREATE TABLE IF NOT EXISTS todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('life', 'daily', 'work', 'study')),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    feeling TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为常见查询添加索引
CREATE INDEX IF NOT EXISTS idx_todos_start_time ON todos(start_time);
CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category);
CREATE INDEX IF NOT EXISTS idx_todos_is_completed ON todos(is_completed);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 表 2: bot_interactions - 机器人交互记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
    message_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('complete', 'feelings', 'cancel')),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_interactions_todo_id ON bot_interactions(todo_id);
CREATE INDEX IF NOT EXISTS idx_bot_interactions_message_id ON bot_interactions(message_id);

-- =====================================================
-- 启用 Row Level Security (RLS)
-- =====================================================
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_interactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS 策略
-- =====================================================

-- todos 表策略：允许所有操作（后续可扩展为用户隔离）
CREATE POLICY "Enable all operations on todos" ON todos
    FOR ALL USING (true) WITH CHECK (true);

-- bot_interactions 表策略：允许所有操作
CREATE POLICY "Enable all operations on bot_interactions" ON bot_interactions
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 视图: 获取今日待办事项（按时间排序）
-- =====================================================
CREATE OR REPLACE VIEW today_todos AS
SELECT
    id,
    title,
    description,
    start_time,
    end_time,
    category,
    is_completed,
    completed_at,
    feeling,
    created_at,
    updated_at,
    EXTRACT(HOUR FROM start_time) as start_hour,
    EXTRACT(MINUTE FROM start_time) as start_minute
FROM todos
WHERE DATE(start_time) = CURRENT_DATE
ORDER BY start_time ASC;

-- =====================================================
-- 视图: 获取本周待办事项（按日期分组）
-- =====================================================
CREATE OR REPLACE VIEW week_todos AS
SELECT
    id,
    title,
    description,
    start_time,
    end_time,
    category,
    is_completed,
    completed_at,
    feeling,
    created_at,
    updated_at,
    DATE(start_time) as date_only
FROM todos
WHERE start_time >= DATE_TRUNC('week', CURRENT_DATE)
  AND start_time < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
ORDER BY start_time ASC;

-- =====================================================
-- 视图: 获取本月待办事项统计
-- =====================================================
CREATE OR REPLACE VIEW month_todos_stats AS
SELECT
    DATE(start_time) as date_only,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_completed = true) as completed_count,
    COUNT(*) FILTER (WHERE is_completed = false) as pending_count,
    json_agg(
        json_build_object(
            'id', id,
            'title', title,
            'start_time', start_time,
            'end_time', end_time,
            'category', category,
            'is_completed', is_completed
        ) ORDER BY start_time
    ) as todos
FROM todos
WHERE DATE_TRUNC('month', start_time) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE(start_time)
ORDER BY date_only ASC;
