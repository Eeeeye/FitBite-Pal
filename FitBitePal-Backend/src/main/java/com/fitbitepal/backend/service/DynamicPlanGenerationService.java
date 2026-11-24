package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.TrainingPlanRepository;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;
import com.fitbitepal.backend.config.RedisConfig;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DynamicPlanGenerationService {
    private final TrainingPlanRepository plans;
    private final UserRepository users;
    private final TrainingPlanFactory factory;

    @Cacheable(value = RedisConfig.CACHE_TRAINING_PLAN, key = "#userId + ':' + #date", unless = "#result.isEmpty()")
    @Transactional
    public List<TrainingPlan> generatePlanForDate(Long userId, LocalDate date) {
        return users.findForUpdate(userId).map(user -> ensurePlan(user, date)).orElseGet(List::of);
    }

    // The caller already holds the user's database row lock for the transaction.
    List<TrainingPlan> ensurePlan(User user, LocalDate date) {
        List<TrainingPlan> existing = plans.findByUserIdAndPlanDateOrderByOrderIndexAsc(user.getId(), date);
        if (!existing.isEmpty() || user.getHeight() == null || user.getWeight() == null) {
            return existing;
        }
        return plans.saveAll(factory.create(user, date));
    }

    @Transactional
    public void generatePlanForUser(User user, LocalDate date) {
        generatePlanForDate(user.getId(), date);
    }

    @Transactional
    public void generatePlanForNextDay(Long userId, LocalDate sourceDate) {
        generatePlanForDate(userId, sourceDate.plusDays(1));
    }

    @Deprecated
    @Transactional
    public void generatePlanForDay3(Long userId, LocalDate sourceDate) {
        generatePlanForNextDay(userId, sourceDate);
    }
}
