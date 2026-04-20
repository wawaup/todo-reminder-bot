-- =====================================================
-- 迁移分类值：从旧分类到新分类
-- =====================================================

-- 步骤 1: 删除旧的约束（这样才能更新数据）
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_category_check;

-- 步骤 2: 更新现有数据的分类值
-- life -> 日常
UPDATE todos SET category = '日常' WHERE category = 'life';

-- daily -> 日常
UPDATE todos SET category = '日常' WHERE category = 'daily';

-- work -> 学习
UPDATE todos SET category = '学习' WHERE category = 'work';

-- study -> 学习
UPDATE todos SET category = '学习' WHERE category = 'study';

-- 步骤 3: 添加新的约束
ALTER TABLE todos ADD CONSTRAINT todos_category_check
    CHECK (category IN ('学习', '健康', '运动', '作息', '冥想', '日常'));
