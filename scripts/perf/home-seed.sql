-- Run once in an empty, disposable schema after registering fbperf000 with the API.
USE fitbite_perf;
CREATE TEMPORARY TABLE bench_numbers (n INT PRIMARY KEY);
INSERT INTO bench_numbers WITH RECURSIVE numbers AS
  (SELECT 0 n UNION ALL SELECT n + 1 FROM numbers WHERE n < 89)
  SELECT n FROM numbers;

INSERT INTO users (username, email, password, role, created_at)
SELECT CONCAT('fbperf', LPAD(n, 3, '0')), CONCAT('fbperf', LPAD(n, 3, '0'), '@example.test'),
       template.password, 'USER', NOW()
FROM bench_numbers JOIN users template ON template.username = 'fbperf000' WHERE n BETWEEN 1 AND 31;
UPDATE users SET age = 30, height = 175, weight = 70, bmr = 1700, gender = 'Male',
  activity_level = 'Beginner', goal = 'Keep fit', training_duration = 30, target_calories = 2100
WHERE username REGEXP '^fbperf[0-9]{3}$';
CREATE TEMPORARY TABLE bench_users AS SELECT id FROM users WHERE username REGEXP '^fbperf[0-9]{3}$';

INSERT INTO completion_records (user_id, record_date, calories, completed, item_index, created_at, updated_at, item_type)
SELECT u.id, DATE_SUB(CURRENT_DATE, INTERVAL days.n DAY),
  CASE WHEN t.kind = 'meal' THEN 400 + i.idx * 100 ELSE 40 + i.idx * 20 END, i.idx < 2, i.idx, NOW(), NOW(), t.kind
FROM bench_users u CROSS JOIN bench_numbers days
CROSS JOIN (SELECT 0 idx UNION ALL SELECT 1 UNION ALL SELECT 2) i
CROSS JOIN (SELECT 'meal' kind UNION ALL SELECT 'exercise') t;

INSERT INTO training_plans(user_id,plan_date,order_index,exercise_name,calories,created_at)
SELECT u.id, DATE_ADD(CURRENT_DATE, INTERVAL (1 - day.n) DAY), i.idx + 1, CONCAT('Exercise ', i.idx), 40, NOW()
FROM bench_users u CROSS JOIN bench_numbers day CROSS JOIN (SELECT 0 idx UNION ALL SELECT 1 UNION ALL SELECT 2) i
WHERE day.n <= 16;
INSERT INTO diet_plans(user_id,plan_date,meal_time,meal_type,meal_name,calories,created_at)
SELECT u.id, DATE_ADD(CURRENT_DATE, INTERVAL day.n DAY), '08:00', 'Breakfast', 'Morning meal', 400, NOW()
FROM bench_users u CROSS JOIN bench_numbers day WHERE day.n <= 1;
INSERT INTO check_in_records(user_id,check_in_date,height,weight,created_at)
SELECT u.id, DATE_SUB(CURRENT_DATE, INTERVAL day.n DAY), 175, 70, NOW()
FROM bench_users u CROSS JOIN bench_numbers day WHERE day.n > 0;
