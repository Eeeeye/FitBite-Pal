package com.fitbitepal.backend.service;

import com.fitbitepal.backend.scheduler.DailyUserBatch;
import com.fitbitepal.backend.model.CalorieRecord;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DailyCalorieScheduler {
    private final DailyUserBatch batch;
    private final CalorieSnapshotService snapshots;

    @Scheduled(cron = "0 59 23 * * ?")
    public void saveDailyCalorieRecords() {
        LocalDate date = LocalDate.now();
        batch.run("daily calories", userId -> snapshots.createIfAbsent(userId, date));
    }

    public CalorieRecord saveUserDailyCalories(Long userId) {
        return snapshots.recalculate(userId, LocalDate.now());
    }
}
