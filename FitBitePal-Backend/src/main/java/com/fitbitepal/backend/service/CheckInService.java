package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.CheckInRequest;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.CheckInRecord;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.CheckInRecordRepository;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckInService {
    private final TransactionTemplate transactions;
    private final CheckInRecordRepository records;
    private final UserRepository users;
    private final AICalculationService metrics;
    private final UserService profiles;
    private final DynamicPlanGenerationService plans;

    public record Result(boolean checkedIn, String message, boolean alreadyCheckedIn, CheckInRecord record) {}

    public Result save(Long userId, CheckInRequest request) {
        LocalDate today = LocalDate.now();
        Result result = Objects.requireNonNull(transactions.execute(tx -> persist(userId, request, today)));
        // Generating tomorrow's plan is optional. Release the writer's transaction and lock first.
        if (result.checkedIn()) {
            try {
                plans.generatePlanForNextDay(userId, today);
            } catch (RuntimeException ex) {
                log.warn("Deferred training plan generation for user {}", userId, ex);
            }
        }
        return result;
    }

    private Result persist(Long userId, CheckInRequest request, LocalDate today) {
        User user = users.findForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        var existing = records.findByUserIdAndCheckInDate(userId, request.date());
        if (existing.isPresent()) {
            return new Result(false, "该日期已经打卡", true, existing.get());
        }
        CheckInRecord record = new CheckInRecord();
        record.setUserId(userId);
        record.setCheckInDate(request.date());
        record.setHeight(request.height());
        record.setWeight(request.weight());
        if (today.equals(request.date()) && (request.height() != null || request.weight() != null)) {
            if (request.height() != null) user.setHeight(request.height());
            if (request.weight() != null) user.setWeight(request.weight());
            if (user.getHeight() != null && user.getWeight() != null && user.getAge() != null
                    && user.getGender() != null && user.getActivityLevel() != null && user.getGoal() != null) {
                metrics.calculateHealthMetrics(user);
            }
            profiles.evictAllUserCaches(userId);
        }
        return new Result(true, "Check-in saved successfully", false, records.save(record));
    }

    public Map<String, Object> status(Long userId, LocalDate date) {
        return records.findByUserIdAndCheckInDate(userId, date)
                .map(record -> Map.<String, Object>of("checkedIn", true, "record", record))
                .orElseGet(() -> Map.of("checkedIn", false));
    }

    public List<LocalDate> history(Long userId, Integer days) {
        if (days == null || days <= 0) return records.datesDescending(userId);
        LocalDate end = LocalDate.now();
        return records.datesBetween(userId, end.minusDays(days - 1L), end);
    }
}
