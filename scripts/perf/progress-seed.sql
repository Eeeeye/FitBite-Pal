-- Run once after home-seed.sql in the dedicated comparison schema.
USE fitbite_perf;
CREATE TEMPORARY TABLE progress_users AS
  SELECT id, CAST(RIGHT(username, 3) AS UNSIGNED) AS member_number
  FROM users WHERE username REGEXP '^fbperf[0-9]{3}$';

UPDATE users u JOIN progress_users p ON p.id = u.id
SET u.weight = 66 + p.member_number / 5, u.bmr = 1500 + 10 * p.member_number,
    u.body_fat_rate = 18 + MOD(p.member_number, 5), u.target_calories = 2000 + 5 * p.member_number;

UPDATE check_in_records r JOIN progress_users p ON p.id = r.user_id
SET r.weight = CASE WHEN WEEKDAY(r.check_in_date) = 1 THEN NULL
                    ELSE 66 + p.member_number / 5 + DATEDIFF(CURRENT_DATE, r.check_in_date) / 10 END;

INSERT INTO calorie_records (user_id, record_date, calorie_intake, calorie_expenditure, created_at)
SELECT r.user_id, r.check_in_date, 1500 + MOD(DAYOFYEAR(r.check_in_date) + p.member_number, 5) * 100,
       1800 + p.member_number, NOW()
FROM check_in_records r JOIN progress_users p ON p.id = r.user_id
WHERE WEEKDAY(r.check_in_date) <> 2;

-- Historical clients could save a second snapshot on the same day. The highest ID wins.
INSERT INTO calorie_records (user_id, record_date, calorie_intake, calorie_expenditure, created_at)
SELECT id, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 2350, 2100 + member_number, NOW() FROM progress_users;

UPDATE completion_records r JOIN progress_users p ON p.id = r.user_id
SET r.completed = MOD(r.item_index + p.member_number + DAYOFYEAR(r.record_date), 3) <> 0,
    r.calories = r.calories + p.member_number;
