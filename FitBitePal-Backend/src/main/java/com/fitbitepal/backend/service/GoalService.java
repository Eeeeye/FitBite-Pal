package com.fitbitepal.backend.service;

import com.fitbitepal.backend.config.RedisConfig;
import com.fitbitepal.backend.dto.GoalProgress;
import com.fitbitepal.backend.dto.GoalUpdateRequest;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GoalService {
    private final UserRepository users;

    @Transactional
    @CacheEvict(value = RedisConfig.CACHE_USER, key = "#userId")
    public GoalProgress update(Long userId, GoalUpdateRequest request) {
        if (!request.isWeightSpecified() && !request.isBodyFatSpecified()) {
            throw new IllegalArgumentException("Specify a weight or body-fat target");
        }
        var user = users.findForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (request.isWeightSpecified()) user.setGoalWeight(request.getWeight());
        if (request.isBodyFatSpecified()) user.setGoalBodyFatRate(request.getBodyFat());
        user.capturePendingGoalMeasurements();
        return GoalProgress.from(user);
    }
}
