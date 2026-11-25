package com.fitbitepal.backend.service;

import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.dto.GoalProgress;
import com.fitbitepal.backend.model.CalorieRecord;
import com.fitbitepal.backend.model.CheckInRecord;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.CalorieRecordRepository;
import com.fitbitepal.backend.repository.CheckInRecordRepository;
import com.fitbitepal.backend.repository.CompletionRecordRepository;
import com.fitbitepal.backend.repository.CompletionRecordRepository.DailyActivity;
import com.fitbitepal.backend.repository.CompletionRecordRepository.DailyCalories;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProgressReportService {
    private final UserRepository users;
    private final CalorieRecordRepository calories;
    private final CheckInRecordRepository checkIns;
    private final CompletionRecordRepository completions;

    public record WeightDay(LocalDate date, double weight) {}
    public record LiveCalorieDay(LocalDate date, long intake, long expenditure, int baseMetabolism,
                                 long exerciseCalories) {}
    public record Report(List<WeightDay> weightRecords, List<LiveCalorieDay> calorieRecords,
                         Map<String, Object> statistics, Map<Integer, Boolean> mealCompletions,
                         Map<String, Boolean> mealCompletionsByKey) {}

    public Report progress(Long userId, int days, LocalDate endDate, User actor) {
        LocalDate today = LocalDate.now();
        LocalDate clientEnd = endDate == null ? today : endDate;
        LocalDate clientStart = liveWindowStart(clientEnd, days);
        LocalDate serverStart = windowStart(today, days);
        User user = target(userId, actor);
        var history = checkIns.findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, serverStart, today);
        var snapshots = calories.latestByDay(userId, serverStart, today);
        var activity = completions.activityByDate(userId, serverStart, today, clientStart, clientEnd);
        var flags = new HashMap<Integer, Boolean>();
        var keyed = new HashMap<String, Boolean>();
        for (var row : completions.mealFlags(userId, clientEnd)) {
            if (row.getItemIndex() != null) flags.put(row.getItemIndex(), row.getCompleted());
            if (row.getMealKey() == null) keyed.put("legacy:" + row.getRecordId(), row.getCompleted());
            else if (row.getItemIndex() != null) keyed.put(row.getMealKey(), row.getCompleted());
        }
        return new Report(weights(user, history, today), liveDays(user, clientStart, days, activity),
                statistics(user, history, snapshots, activity, serverStart, today), flags, keyed);
    }

    public List<WeightDay> weightHistory(Long userId, int days) {
        LocalDate today = LocalDate.now();
        var history = checkIns.findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, windowStart(today, days), today);
        return weights(users.findById(userId).orElse(null), history, today);
    }

    public List<LiveCalorieDay> liveCalories(Long userId, int days, LocalDate endDate, User actor) {
        LocalDate end = endDate == null ? LocalDate.now() : endDate;
        LocalDate start = liveWindowStart(end, days);
        return liveDays(target(userId, actor), start, days, completions.totalsByDate(userId, start, end));
    }

    public Map<String, Object> statistics(Long userId, int days) {
        LocalDate end = LocalDate.now();
        LocalDate start = windowStart(end, days);
        var history = checkIns.findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, start, end);
        return statistics(users.findById(userId).orElse(null), history, calories.latestByDay(userId, start, end),
                completions.activityByDate(userId, start, end, start, end), start, end);
    }

    public List<CalorieRecord> snapshotHistory(Long userId, int days) {
        LocalDate end = LocalDate.now();
        return calories.latestByDay(userId, windowStart(end, days), end);
    }

    private User target(Long userId, User actor) {
        return userId.equals(actor.getId()) ? actor : users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private LocalDate liveWindowStart(LocalDate end, int days) {
        if (days > 366 || end.getYear() > 9999) throw new IllegalArgumentException("Invalid reporting window");
        return windowStart(end, days);
    }

    private LocalDate windowStart(LocalDate end, int days) {
        if (days < 1 || days > ChronoUnit.DAYS.between(LocalDate.of(1000, 1, 1), end) + 1) {
            throw new IllegalArgumentException("Invalid reporting window");
        }
        return end.minusDays(days - 1L);
    }

    private List<WeightDay> weights(User user, List<CheckInRecord> history, LocalDate today) {
        double current = currentWeight(user);
        var result = new ArrayList<WeightDay>(history.size() + 1);
        for (var checkIn : history) {
            LocalDate date = checkIn.getCheckInDate();
            double weight = date.equals(today) || checkIn.getWeight() == null ? current : checkIn.getWeight();
            result.add(new WeightDay(date, weight));
        }
        if (current > 0 && (result.isEmpty() || !result.get(result.size() - 1).date().equals(today))) {
            result.add(new WeightDay(today, current));
        }
        return result;
    }

    private double currentWeight(User user) {
        return user == null || user.getWeight() == null ? 0.0 : user.getWeight();
    }

    private List<LiveCalorieDay> liveDays(User user, LocalDate start, int days, List<? extends DailyCalories> totals) {
        int bmr = user.getBmr() == null || user.getBmr() == 0 ? 1500 : user.getBmr();
        var byDate = new HashMap<LocalDate, DailyCalories>();
        totals.forEach(row -> byDate.put(row.getDate(), row));
        var result = new ArrayList<LiveCalorieDay>(days);
        for (int i = 0; i < days; i++) {
            LocalDate date = start.plusDays(i);
            var row = byDate.get(date);
            long exercise = row == null ? 0 : row.getExercise();
            result.add(new LiveCalorieDay(date, row == null ? 0 : row.getIntake(), bmr + exercise, bmr, exercise));
        }
        return result;
    }

    private Map<String, Object> statistics(User user, List<CheckInRecord> history, List<CalorieRecord> snapshots,
                                            List<DailyActivity> activity, LocalDate start, LocalDate end) {
        double weight = currentWeight(user);
        double baseline = history.stream().map(CheckInRecord::getWeight).filter(Objects::nonNull)
                .findFirst().orElse(weight);
        double bodyFat = user == null || user.getBodyFatRate() == null ? 0.0 : user.getBodyFatRate();
        var priorBodyFat = history.stream().filter(row -> row.getCheckInDate().isBefore(end)
                && row.getBodyFatRate() != null && row.getBodyFatRate() > 0).findFirst();
        var meals = new HashMap<LocalDate, DailyActivity>();
        long totalMeals = 0;
        long completedMeals = 0;
        for (var row : activity) {
            if (row.getMealCount() > 0 && !row.getDate().isBefore(start) && !row.getDate().isAfter(end)) {
                meals.put(row.getDate(), row);
                totalMeals += row.getMealCount();
                completedMeals += row.getCompletedMeals();
            }
        }
        double averageIntake = snapshots.stream().mapToInt(r -> r.getCalorieIntake() == null ? 0 : r.getCalorieIntake())
                .average().orElse(0);
        int averageBurn = (int) snapshots.stream().mapToInt(CalorieRecord::getCalorieExpenditure).average().orElse(0);
        var goals = GoalProgress.from(user);
        var result = new HashMap<String, Object>(Map.of("currentWeight", weight, "weightChange", roundDouble(weight - baseline), "bodyFat", bodyFat,
                "avgCalorieBurn", averageBurn,
                "nutritionScore", (int) Math.round(nutritionScore(user, snapshots.isEmpty() ? null : averageIntake, completedMeals, totalMeals)),
                "nutritionScoreChange", nutritionChange(user, snapshots, meals, start, end),
                "goalWeight", goals.weight().target() == null ? 0.0 : goals.weight().target(),
                "goalBodyFat", goals.bodyFat().target() == null ? 0.0 : goals.bodyFat().target(), "goals", goals));
        priorBodyFat.filter(row -> bodyFat > 0).ifPresent(row -> {
            result.put("bodyFatChange", roundDouble(bodyFat - row.getBodyFatRate()));
            result.put("bodyFatChangeSince", row.getCheckInDate());
        });
        result.putIfAbsent("bodyFatChange", null);
        return result;
    }

    private double nutritionScore(User user, Double intake, long completed, long total) {
        double score = 0;
        int parts = 0;
        if (intake != null && user != null && user.getTargetCalories() != null && user.getTargetCalories() > 0) {
            double target = user.getTargetCalories();
            score += 100 - Math.min(1.0, Math.abs(intake - target) / target) * 100;
            parts++;
        }
        if (total > 0) {
            score += completed * 100.0 / total;
            parts++;
        }
        return parts == 0 ? 0 : score / parts;
    }

    private int nutritionChange(User user, List<CalorieRecord> snapshots, Map<LocalDate, DailyActivity> meals,
                                LocalDate start, LocalDate end) {
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        long firstDays = days / 2;
        if (firstDays == 0) return 0;
        var snapshotsByDate = new HashMap<LocalDate, CalorieRecord>();
        snapshots.forEach(row -> snapshotsByDate.put(row.getRecordDate(), row));
        var recorded = new HashSet<>(snapshotsByDate.keySet());
        recorded.addAll(meals.keySet());
        double first = 0, second = 0;
        LocalDate midpoint = start.plusDays(firstDays);
        for (LocalDate date : recorded) {
            var snapshot = snapshotsByDate.get(date);
            var meal = meals.get(date);
            Double intake = snapshot == null ? null : Objects.requireNonNullElse(snapshot.getCalorieIntake(), 0).doubleValue();
            double score = nutritionScore(user, intake, meal == null ? 0 : meal.getCompletedMeals(),
                    meal == null ? 0 : meal.getMealCount());
            if (date.isBefore(midpoint)) first += score;
            else second += score;
        }
        return (int) Math.round(second / (days - firstDays) - first / firstDays);
    }

    private double roundDouble(Double value) {
        if (value == null) {
            return 0.0;
        }
        return Math.round(value * 10.0) / 10.0;
    }
}
