package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AccountDeletionService {
    private final UserRepository users;
    private final TrainingPlanRepository trainingPlans;
    private final DietPlanRepository dietPlans;
    private final CompletionRecordRepository completions;
    private final CheckInRecordRepository checkIns;
    private final CalorieRecordRepository calories;
    private final TrainingRecordRepository trainingRecords;
    private final DietRecordRepository dietRecords;
    private final PoseSessionRepository poses;
    private final PasswordEncoder passwords;
    private final EmailService resetCodes;
    private final UserService profiles;

    @Transactional
    public void deleteOwn(Long principalId, String password) {
        User owner = lockUser(principalId);
        if (!passwords.matches(password, owner.getPassword())) {
            throw new AccessDeniedException("Password confirmation failed");
        }
        delete(owner);
    }

    @Transactional
    public void deleteByAdmin(Long userId) {
        delete(lockUser(userId));
    }

    private User lockUser(Long userId) {
        return users.findForUpdate(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private void delete(User user) {
        Long id = user.getId();
        resetCodes.revoke(user.getEmail());
        trainingPlans.deleteByUserId(id);
        dietPlans.deleteByUserId(id);
        completions.deleteByUserId(id);
        checkIns.deleteByUserId(id);
        calories.deleteByUserId(id);
        trainingRecords.deleteByUserId(id);
        dietRecords.deleteByUserId(id);
        poses.deleteByUserId(id);
        users.delete(user);
        profiles.evictAllUserCaches(id);
    }
}
