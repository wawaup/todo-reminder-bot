-- =====================================================
-- 修复分类值：将中文分类转换为英文键名
-- =====================================================

-- 步骤 1: 删除旧的约束
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_category_check;

-- 步骤 2: 将中文分类值转换为英文键名
UPDATE todos SET category = 'study' WHERE category = '学习';
UPDATE todos SET category = 'health' WHERE category = '健康';
UPDATE todos SET category = 'exercise' WHERE category = '运动';
UPDATE todos SET category = 'sleep' WHERE category = '作息';
UPDATE todos SET category = 'meditation' WHERE category = '冥想';
UPDATE todos SET category = 'daily' WHERE category = '日常';

-- 步骤 3: 添加新的约束，只允许英文键名
ALTER TABLE todos ADD CONSTRAINT todos_category_check
    CHECK (category IN ('study', 'health', 'exercise', 'sleep', 'meditation', 'daily'));
