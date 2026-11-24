-- Also support installations where Hibernate's development profile already created these indexes.
SET @diet_index_sql = IF(EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'diet_plans'
      AND index_name = 'idx_diet_user_date_time'
), 'DO 0', 'CREATE INDEX idx_diet_user_date_time ON diet_plans (user_id, plan_date, meal_time)');
PREPARE fitbite_index FROM @diet_index_sql;
EXECUTE fitbite_index;
DEALLOCATE PREPARE fitbite_index;

-- id breaks ties on dates with legacy duplicate calorie records.
SET @calorie_index_sql = IF(EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'calorie_records'
      AND index_name = 'idx_calorie_user_date'
), 'DO 0', 'CREATE INDEX idx_calorie_user_date ON calorie_records (user_id, record_date, id)');
PREPARE fitbite_index FROM @calorie_index_sql;
EXECUTE fitbite_index;
DEALLOCATE PREPARE fitbite_index;
