-- V6: 添加基础代谢率字段到卡路里记录表
-- 用于保存每日计算出的BMR值

ALTER TABLE calorie_records 
ADD COLUMN base_metabolism INT NULL COMMENT '基础代谢率(BMR)，从用户资料计算得出';

ALTER TABLE calorie_records 
ADD COLUMN exercise_calories INT NULL COMMENT '运动消耗卡路里';

