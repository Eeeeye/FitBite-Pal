-- 给 diet_plans 表添加 plan_date 和 meal_name 字段
ALTER TABLE diet_plans
ADD COLUMN plan_date DATE DEFAULT NULL,
ADD COLUMN meal_name VARCHAR(100) DEFAULT NULL;

-- 更新已有数据，将 plan_date 设置为今天
UPDATE diet_plans SET plan_date = CURDATE() WHERE plan_date IS NULL;

