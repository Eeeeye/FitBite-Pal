-- ==========================================
-- V5: 简化数据架构 - 统一数据源到User表
-- ==========================================
-- 目标：删除冗余表，User表作为唯一数据源
-- ==========================================

-- 1. 删除 user_profiles 表（完全冗余）
DROP TABLE IF EXISTS user_profiles;

-- 2. 删除 weight_records 表（功能与CheckInRecord重复）
DROP TABLE IF EXISTS weight_records;

-- 3. 简化 check_in_records 表
-- 删除冗余字段，只保留打卡日期作为历史记录
ALTER TABLE check_in_records 
  DROP COLUMN IF EXISTS height,
  DROP COLUMN IF EXISTS weight,
  DROP COLUMN IF EXISTS bmi,
  DROP COLUMN IF EXISTS body_fat_rate,
  DROP COLUMN IF EXISTS tdee,
  DROP COLUMN IF EXISTS target_calories,
  DROP COLUMN IF EXISTS goal,
  DROP COLUMN IF EXISTS activity_level,
  DROP COLUMN IF EXISTS training_duration;

-- 4. 确保 users 表包含所有必要字段（如果不存在则添加）
-- 注意：这些字段应该已经存在，这里只是确保完整性

-- 基本信息字段（应该已存在）
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE NOT NULL;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE NOT NULL;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 身体数据字段（应该已存在）
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS age INT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS height DOUBLE;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS weight DOUBLE;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS goal VARCHAR(50);
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_level VARCHAR(50);
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS training_duration INT;

-- 计算指标字段（应该已存在）
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS bmi DOUBLE;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS body_fat_rate DOUBLE;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS bmr INT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS tdee INT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS target_calories INT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS recommended_protein INT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS recommended_carbs INT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS recommended_fat INT;

-- 时间戳字段（应该已存在）
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ==========================================
-- 数据迁移完成说明
-- ==========================================
-- 重构后的数据架构：
--
-- User 表（唯一数据源）
--   - 基本信息：username, email, password, phone
--   - 最新身体数据：gender, age, height, weight
--   - 目标设置：goal, activityLevel, trainingDuration
--   - 自动计算：bmi, bodyFatRate, bmr, tdee, targetCalories等
--
-- CheckInRecord 表（简化为纯历史）
--   - 只记录：user_id, check_in_date, created_at
--   - 用途：记录用户哪些天打过卡
--
-- 其他表保持不变：
--   - training_plans（训练计划）
--   - diet_plans（饮食计划）
--   - completion_records（完成记录）
--   - calorie_records（卡路里记录）
--   - training_records（训练历史）
--   - diet_records（饮食历史）
-- ==========================================

