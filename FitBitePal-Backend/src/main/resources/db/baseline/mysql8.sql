-- FitBite backend, MySQL 8.0.16+ (current application schema through V9).
-- Apply once to the selected empty database. Existing installations use versioned migrations.

CREATE TABLE `calorie_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `record_date` date NOT NULL,
  `base_metabolism` int DEFAULT NULL,
  `calorie_expenditure` int NOT NULL,
  `calorie_intake` int NOT NULL,
  `exercise_calories` int DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_calorie_user_date` (`user_id`,`record_date`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `check_in_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `check_in_date` date NOT NULL,
  `height` double DEFAULT NULL,
  `weight` double DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKcjt8m76ghv6qcphu7b31kpqjv` (`user_id`,`check_in_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `completion_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `record_date` date NOT NULL,
  `calories` int DEFAULT NULL,
  `completed` bit(1) NOT NULL,
  `item_index` int NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `item_type` varchar(20) NOT NULL,
  `item_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKbollmg0ivcgw4bqxltst0keje` (`user_id`,`record_date`,`item_type`,`item_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `diet_plans` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `plan_date` date DEFAULT NULL,
  `calories` int DEFAULT NULL,
  `carbs` int DEFAULT NULL,
  `fat` int DEFAULT NULL,
  `protein` int DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `meal_time` varchar(10) NOT NULL,
  `meal_type` varchar(50) NOT NULL,
  `meal_name` varchar(100) DEFAULT NULL,
  `foods` varchar(1000) DEFAULT NULL,
  `ingredients` varchar(2000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_diet_user_date_time` (`user_id`,`plan_date`,`meal_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `diet_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `calories` int DEFAULT NULL,
  `carbs` int DEFAULT NULL,
  `fat` int DEFAULT NULL,
  `protein` int DEFAULT NULL,
  `recorded_at` datetime(6) NOT NULL,
  `meal_type` varchar(50) DEFAULT NULL,
  `food_name` varchar(100) NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `exercises` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `calories_per_minute` int DEFAULT NULL,
  `default_duration` int DEFAULT NULL,
  `default_reps` int DEFAULT NULL,
  `default_sets` int DEFAULT NULL,
  `enabled` bit(1) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `body_part` varchar(50) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `difficulty` varchar(50) DEFAULT NULL,
  `equipment` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `name_zh` varchar(100) DEFAULT NULL,
  `gif_url` varchar(500) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `description` text,
  `description_zh` text,
  `instructions` text,
  `instructions_zh` text,
  `pose_key_points` text,
  `pose_thresholds` text,
  `tips` text,
  `tips_zh` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `food_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `calories` int DEFAULT NULL,
  `carbs` double DEFAULT NULL,
  `enabled` bit(1) DEFAULT NULL,
  `fat` double DEFAULT NULL,
  `fiber` double DEFAULT NULL,
  `protein` double DEFAULT NULL,
  `serving_weight` double DEFAULT NULL,
  `sodium` double DEFAULT NULL,
  `sugar` double DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `serving_size` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `keywords` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `meal_sets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `calories` int DEFAULT NULL,
  `carbs` int DEFAULT NULL,
  `enabled` bit(1) DEFAULT NULL,
  `fat` int DEFAULT NULL,
  `protein` int DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `goal_type` varchar(50) DEFAULT NULL,
  `meal_type` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `ingredients` varchar(2000) DEFAULT NULL,
  `ingredients_en` varchar(2000) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `pose_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `calories` int DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `reps` int DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `exercise_id` bigint DEFAULT NULL,
  `training_date` datetime(6) NOT NULL,
  `session_state` varchar(16) DEFAULT NULL,
  `session_id` varchar(36) NOT NULL,
  `exercise_name` varchar(100) NOT NULL,
  `logs` text,
  `video_uri` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_9mah88qaqst7ly892swl99ic5` (`session_id`),
  KEY `idx_pose_draft_age` (`session_state`,`created_at`),
  CONSTRAINT `pose_sessions_chk_1` CHECK ((`session_state` in ('ACTIVE','COMPLETED','ABORTED','SAVED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `system_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `updated_at` datetime(6) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `config_type` varchar(50) DEFAULT NULL,
  `config_key` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `config_value` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_pk5mof051xp5r3e75s2e23s8s` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `training_plans` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `plan_date` date DEFAULT NULL,
  `calories` int DEFAULT NULL,
  `day_of_week` int DEFAULT NULL,
  `order_index` int DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `source_check_in_id` bigint DEFAULT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `exercise_name` varchar(100) NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_plan_date` (`user_id`,`plan_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `training_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `calories_burned` int DEFAULT NULL,
  `completed_at` datetime(6) NOT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `exercise_name` varchar(100) NOT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `age` int DEFAULT NULL,
  `bmi` double DEFAULT NULL,
  `bmr` int DEFAULT NULL,
  `body_fat_rate` double DEFAULT NULL,
  `goal_body_fat_rate` double DEFAULT NULL,
  `goal_weight` double DEFAULT NULL,
  `height` double DEFAULT NULL,
  `recommended_carbs` int DEFAULT NULL,
  `recommended_fat` int DEFAULT NULL,
  `recommended_protein` int DEFAULT NULL,
  `target_calories` int DEFAULT NULL,
  `tdee` int DEFAULT NULL,
  `training_duration` int DEFAULT NULL,
  `weight` double DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` varchar(20) DEFAULT NULL,
  `activity_level` varchar(50) DEFAULT NULL,
  `goal` varchar(50) DEFAULT NULL,
  `training_area` varchar(50) DEFAULT NULL,
  `training_intensity` varchar(50) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_r43af9ap4edm43mmtq01oddj6` (`username`),
  UNIQUE KEY `UK_6dotkott2kjsp8vw4d0m25fb7` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
