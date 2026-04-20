-- =====================================================
-- 更新 todos 表的 category 字段约束
-- =====================================================

-- 删除旧的约束
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_category_check;

-- 添加新的约束，支持新的分类值
ALTER TABLE todos ADD CONSTRAINT todos_category_check
    CHECK (category IN ('学习', '健康', '运动', '作息', '冥想', '日常'));
