package com.fitbitepal.backend.service;

import com.fitbitepal.backend.repository.UserRepository;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DailyPlanService {
    private final UserRepository users;
    private final DynamicPlanGenerationService training;
    private final DynamicDietPlanService diet;

    @Transactional
    public void prepare(Long userId, LocalDate date) {
        users.findForUpdate(userId)
                .filter(user -> user.getHeight() != null && user.getWeight() != null)
                .ifPresent(user -> {
                    training.ensurePlan(user, date);
                    diet.ensurePlan(user, date);
                });
    }
}
