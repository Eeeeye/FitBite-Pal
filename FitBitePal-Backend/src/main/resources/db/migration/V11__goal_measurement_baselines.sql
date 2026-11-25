-- Run with application writers drained. Can resume after a partially applied MySQL DDL.
SET @ddl = IF(EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'goal_weight_start'),
    'DO 0', 'ALTER TABLE users ADD COLUMN goal_weight_start DOUBLE NULL');
PREPARE goal_ddl FROM @ddl;
EXECUTE goal_ddl;
DEALLOCATE PREPARE goal_ddl;

SET @ddl = IF(EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'goal_body_fat_start'),
    'DO 0', 'ALTER TABLE users ADD COLUMN goal_body_fat_start DOUBLE NULL');
PREPARE goal_ddl FROM @ddl;
EXECUTE goal_ddl;
DEALLOCATE PREPARE goal_ddl;

SET @ddl = IF(EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'check_in_records' AND column_name = 'body_fat_rate'),
    'DO 0', 'ALTER TABLE check_in_records ADD COLUMN body_fat_rate DOUBLE NULL');
PREPARE goal_ddl FROM @ddl;
EXECUTE goal_ddl;
DEALLOCATE PREPARE goal_ddl;

-- Use the current observed measurement once for legacy explicit targets.
UPDATE users SET goal_weight_start = weight
WHERE goal_weight > 0 AND weight > 0 AND goal_weight_start IS NULL;
UPDATE users SET goal_body_fat_start = body_fat_rate
WHERE goal_body_fat_rate > 0 AND body_fat_rate > 0 AND goal_body_fat_start IS NULL;
-- A historical check-in without a recorded estimate stays NULL.
