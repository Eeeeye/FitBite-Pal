-- ============================================
-- 滚动式训练计划生成 - 数据库迁移脚本
-- 版本: V2
-- 日期: 2024-11-16
-- 描述: 添加打卡记录表，修改训练计划表支持按日期生成
-- ============================================

-- 1. 创建打卡记录表
CREATE TABLE IF NOT EXISTS check_in_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    check_in_date DATE NOT NULL COMMENT '打卡日期',
    height DOUBLE NOT NULL COMMENT '身高(cm)',
    weight DOUBLE NOT NULL COMMENT '体重(kg)',
    bmi DOUBLE COMMENT 'BMI指数',
    body_fat_rate DOUBLE COMMENT '体脂率',
    tdee INT COMMENT '每日总消耗(TDEE)',
    target_calories INT COMMENT '目标卡路里',
    goal VARCHAR(50) COMMENT '健身目标',
    activity_level VARCHAR(50) COMMENT '活动水平',
    training_duration INT COMMENT '训练时长(分钟)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_user_date (user_id, check_in_date) COMMENT '用户日期唯一索引',
    INDEX idx_user_id (user_id) COMMENT '用户ID索引',
    INDEX idx_check_in_date (check_in_date) COMMENT '打卡日期索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户打卡记录表';

-- 2. 修改训练计划表 - 添加日期相关字段
ALTER TABLE training_plans 
ADD COLUMN plan_date DATE COMMENT '计划日期' AFTER day_of_week,
ADD COLUMN source_check_in_id BIGINT COMMENT '数据源打卡记录ID' AFTER plan_date,
ADD INDEX idx_plan_date (plan_date) COMMENT '计划日期索引',
ADD INDEX idx_user_plan_date (user_id, plan_date) COMMENT '用户计划日期联合索引';

-- 3. 为现有数据填充 plan_date（如果有数据的话）
-- 注意：这里假设现有数据的 day_of_week 字段有值
-- 如果没有现有数据，这个更新语句不会有任何影响
UPDATE training_plans 
SET plan_date = CASE 
    WHEN day_of_week = 1 THEN DATE_ADD(CURDATE(), INTERVAL (1 - DAYOFWEEK(CURDATE()) + 7) % 7 DAY)
    WHEN day_of_week = 2 THEN DATE_ADD(CURDATE(), INTERVAL (2 - DAYOFWEEK(CURDATE()) + 7) % 7 DAY)
    WHEN day_of_week = 3 THEN DATE_ADD(CURDATE(), INTERVAL (3 - DAYOFWEEK(CURDATE()) + 7) % 7 DAY)
    WHEN day_of_week = 4 THEN DATE_ADD(CURDATE(), INTERVAL (4 - DAYOFWEEK(CURDATE()) + 7) % 7 DAY)
    WHEN day_of_week = 5 THEN DATE_ADD(CURDATE(), INTERVAL (5 - DAYOFWEEK(CURDATE()) + 7) % 7 DAY)
    WHEN day_of_week = 6 THEN DATE_ADD(CURDATE(), INTERVAL (6 - DAYOFWEEK(CURDATE()) + 7) % 7 DAY)
    WHEN day_of_week = 7 THEN DATE_ADD(CURDATE(), INTERVAL (7 - DAYOFWEEK(CURDATE()) + 7) % 7 DAY)
    ELSE CURDATE()
END
WHERE plan_date IS NULL AND day_of_week IS NOT NULL;

-- 4. 创建视图：用户最新打卡记录
CREATE OR REPLACE VIEW v_user_latest_checkin AS
SELECT 
    c1.user_id,
    c1.check_in_date,
    c1.height,
    c1.weight,
    c1.bmi,
    c1.body_fat_rate,
    c1.goal,
    c1.activity_level,
    c1.training_duration
FROM check_in_records c1
INNER JOIN (
    SELECT user_id, MAX(check_in_date) as max_date
    FROM check_in_records
    GROUP BY user_id
) c2 ON c1.user_id = c2.user_id AND c1.check_in_date = c2.max_date;

-- 5. 创建视图：用户计划覆盖情况
CREATE OR REPLACE VIEW v_user_plan_coverage AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    COUNT(DISTINCT tp.plan_date) as total_plan_days,
    SUM(CASE WHEN tp.plan_date = CURDATE() THEN 1 ELSE 0 END) as today_plan_count,
    SUM(CASE WHEN tp.plan_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) as tomorrow_plan_count,
    SUM(CASE WHEN tp.plan_date = DATE_ADD(CURDATE(), INTERVAL 2 DAY) THEN 1 ELSE 0 END) as day2_plan_count,
    SUM(CASE WHEN tp.plan_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 1 ELSE 0 END) as day3_plan_count,
    (SELECT MAX(check_in_date) FROM check_in_records WHERE user_id = u.id) as last_checkin_date
FROM users u
LEFT JOIN training_plans tp ON u.id = tp.user_id 
    AND tp.plan_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
GROUP BY u.id, u.username, u.email;

-- 6. 插入初始数据说明记录（可选）
INSERT INTO check_in_records (user_id, check_in_date, height, weight, bmi, body_fat_rate, goal, activity_level, training_duration)
SELECT 
    id as user_id,
    CURDATE() as check_in_date,
    height,
    weight,
    bmi,
    body_fat_rate,
    goal,
    activity_level,
    training_duration
FROM users
WHERE height IS NOT NULL 
  AND weight IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM check_in_records 
      WHERE user_id = users.id AND check_in_date = CURDATE()
  );

-- 7. 添加注释
ALTER TABLE check_in_records COMMENT = '用户每日打卡记录表，用于记录用户的身体数据变化';
ALTER TABLE training_plans COMMENT = '训练计划表，基于打卡数据滚动生成';

-- ============================================
-- 迁移完成
-- ============================================
-- 说明：
-- 1. check_in_records 表用于存储用户每日打卡数据
-- 2. training_plans 表新增 plan_date 字段，支持按日期查询
-- 3. 创建了两个视图用于监控和查询
-- 4. 为现有用户创建了今天的打卡记录（如果有完整数据）
-- ============================================

