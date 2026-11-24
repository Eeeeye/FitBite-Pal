package com.fitbitepal.backend.scheduler;

import com.fitbitepal.backend.service.DailyPlanService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PlanGenerationScheduler {
    private final DailyUserBatch batch;
    private final DailyPlanService plans;

    @Scheduled(cron = "0 59 23 * * ?")
    public void generateDailyPlans() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        batch.run("daily plans", userId -> plans.prepare(userId, tomorrow));
    }
}
