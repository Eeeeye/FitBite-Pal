-- Run with old application writers stopped. MySQL DDL commits independently, so
-- each step also accepts the schema left by a partially applied migration.
SET @completion_changes = CONCAT_WS(', ',
    IF(NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
        AND table_name = 'completion_records' AND column_name = 'meal_key'),
        'ADD COLUMN meal_key VARCHAR(40) NULL AFTER item_index', NULL),
    IF(EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
        AND table_name = 'completion_records' AND column_name = 'item_index' AND is_nullable = 'NO'),
        'MODIFY COLUMN item_index INT NULL', NULL),
    IF(NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE()
        AND table_name = 'completion_records' AND index_name = 'uk_completion_meal'),
        'ADD UNIQUE INDEX uk_completion_meal (user_id, record_date, item_type, meal_key)', NULL)
);
SET @ddl = IF(@completion_changes = '', 'DO 0', CONCAT('ALTER TABLE completion_records ', @completion_changes));
PREPARE fitbite_ddl FROM @ddl;
EXECUTE fitbite_ddl;
DEALLOCATE PREPARE fitbite_ddl;

SET @ddl = IF(EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'diet_plans' AND column_name = 'hidden'),
    'DO 0', 'ALTER TABLE diet_plans ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE AFTER plan_date');
PREPARE fitbite_ddl FROM @ddl;
EXECUTE fitbite_ddl;
DEALLOCATE PREPARE fitbite_ddl;

SET @ddl = IF(EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE()
    AND table_name = 'diet_records' AND index_name = 'idx_diet_record_user_time'),
    'DO 0', 'CREATE INDEX idx_diet_record_user_time ON diet_records (user_id, recorded_at, id)');
PREPARE fitbite_ddl FROM @ddl;
EXECUTE fitbite_ddl;
DEALLOCATE PREPARE fitbite_ddl;

-- Old clients saved food names, displayed meal times or manual-record meal types.
-- A display index alone cannot identify a source. Count ambiguity across both
-- source tables and both directions before assigning a key.
WITH meal_sources AS (
    SELECT user_id, plan_date AS source_date, created_at AS source_time, calories,
           CONCAT('plan:', id) AS meal_key, meal_name AS item_label, meal_time AS time_label,
           NULL AS alternate_label
    FROM diet_plans WHERE plan_date IS NOT NULL
    UNION ALL
    SELECT user_id, DATE(recorded_at), recorded_at, calories,
           CONCAT('record:', id), food_name, DATE_FORMAT(recorded_at, '%H:%i'), meal_type
    FROM diet_records
), candidates AS (
    SELECT c.id, s.meal_key,
           COUNT(*) OVER (PARTITION BY c.id) AS source_count,
           COUNT(*) OVER (PARTITION BY s.meal_key) AS completion_count
    FROM completion_records c
    JOIN meal_sources s ON s.user_id = c.user_id AND s.source_date = c.record_date
        AND s.calories = c.calories AND s.source_time <= c.created_at
    WHERE c.item_type = 'meal' AND c.meal_key IS NULL AND c.item_index IS NOT NULL
        AND TRIM(c.item_name) <> ''
        AND CAST(c.item_name AS BINARY) IN (
            CAST(s.item_label AS BINARY), CAST(s.time_label AS BINARY), CAST(s.alternate_label AS BINARY)
        )
)
UPDATE completion_records c
JOIN candidates m ON m.id = c.id AND m.source_count = 1 AND m.completion_count = 1
LEFT JOIN completion_records occupied ON occupied.user_id = c.user_id AND occupied.record_date = c.record_date
    AND occupied.item_type = c.item_type AND occupied.meal_key = m.meal_key
SET c.meal_key = m.meal_key, c.item_index = NULL
WHERE occupied.id IS NULL;
