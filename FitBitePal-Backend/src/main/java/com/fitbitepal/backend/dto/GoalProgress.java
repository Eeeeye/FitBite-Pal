package com.fitbitepal.backend.dto;

import com.fitbitepal.backend.model.User;

public record GoalProgress(Metric weight, Metric bodyFat) {
    public record Metric(Double start, Double current, Double target, Double percent, boolean achieved) {}

    public static GoalProgress from(User user) {
        if (user == null) return new GoalProgress(metric(null, null, null), metric(null, null, null));
        return new GoalProgress(metric(user.getGoalWeightStart(), user.getWeight(), user.getGoalWeight()),
                metric(user.getGoalBodyFatStart(), user.getBodyFatRate(), user.getGoalBodyFatRate()));
    }

    private static Metric metric(Double start, Double current, Double target) {
        start = positive(start);
        current = positive(current);
        target = positive(target);
        if (target == null || current == null || start == null) return new Metric(start, current, target, null, false);
        if (current <= target) return new Metric(start, current, target, 100.0, true);
        // A target that was already met at the start has no positive reduction distance.
        double percent = start <= target ? 0 : 100 * Math.max(0, start - current) / (start - target);
        return new Metric(start, current, target, Math.min(99.9, Math.round(percent * 10.0) / 10.0), false);
    }

    private static Double positive(Double value) {
        return value != null && Double.isFinite(value) && value > 0 ? value : null;
    }
}
