-- 创建姿态识别训练会话表
-- V3__create_pose_sessions_table.sql

CREATE TABLE IF NOT EXISTS pose_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    session_id VARCHAR(36) NOT NULL UNIQUE COMMENT '会话ID（UUID）',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    exercise_name VARCHAR(100) NOT NULL COMMENT '运动名称',
    duration INT COMMENT '训练时长（秒）',
    calories INT COMMENT '消耗卡路里',
    reps INT COMMENT '完成组数',
    logs TEXT COMMENT 'AI反馈日志（JSON格式）',
    video_uri TEXT COMMENT '训练视频URI',
    training_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '训练日期',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_training_date (training_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='姿态识别训练会话表';

