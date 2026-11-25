package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.model.*;
import com.fitbitepal.backend.repository.*;
import com.fitbitepal.backend.service.UserService;
import com.fitbitepal.backend.service.CompletionService;
import com.fitbitepal.backend.service.AICalculationService;
import com.fitbitepal.backend.dto.CompletionItemRequest;
import com.fitbitepal.backend.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Transactional
public class AdminActivityController {
    private final UserRepository userRepository;
    private final CompletionRecordRepository completionRecordRepository;
    private final CheckInRecordRepository checkInRecordRepository;
    private final CalorieRecordRepository calorieRecordRepository;
    private final CompletionService completions;
    private final UserService userService;
    private final AICalculationService metrics;

    @PostMapping("/users/{userId}/check-ins")
    public ResponseEntity<ApiResponse<CheckInRecord>> saveUserCheckIn(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> request) {

        User user = requireUser(userId);
        LocalDate checkInDate = parseLocalDate(request.get("checkInDate"));

        CheckInRecord record = checkInRecordRepository.findByUserIdAndCheckInDate(userId, checkInDate)
                .orElseGet(CheckInRecord::new);

        record.setUserId(userId);
        record.setCheckInDate(checkInDate);
        updateMeasurements(record, parseDoubleNullable(request.get("weight")), parseDoubleNullable(request.get("height")));

        CheckInRecord saved = checkInRecordRepository.save(record);
        syncCurrentMeasurement(user, saved);
        userService.evictAllUserCaches(userId);

        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @PutMapping("/users/{userId}/check-ins/{recordId}")
    public ResponseEntity<ApiResponse<CheckInRecord>> updateUserCheckIn(
            @PathVariable Long userId,
            @PathVariable Long recordId,
            @RequestBody Map<String, Object> request) {

        User user = requireUser(userId);
        CheckInRecord record = checkInRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Check-in record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Check-in record does not belong to this user");
        }

        LocalDate checkInDate = request.containsKey("checkInDate")
                ? parseLocalDate(request.get("checkInDate"))
                : record.getCheckInDate();

        checkInRecordRepository.findByUserIdAndCheckInDate(userId, checkInDate)
                .filter(existing -> !Objects.equals(existing.getId(), recordId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Check-in already exists for this date");
                });

        if (!Objects.equals(checkInDate, record.getCheckInDate())) record.setBodyFatRate(null);
        record.setCheckInDate(checkInDate);
        updateMeasurements(record,
                request.containsKey("weight") ? parseDoubleNullable(request.get("weight")) : record.getWeight(),
                request.containsKey("height") ? parseDoubleNullable(request.get("height")) : record.getHeight());

        CheckInRecord saved = checkInRecordRepository.save(record);
        syncCurrentMeasurement(user, saved);
        userService.evictAllUserCaches(userId);

        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @DeleteMapping("/users/{userId}/check-ins/{recordId}")
    public ResponseEntity<ApiResponse<String>> deleteUserCheckIn(
            @PathVariable Long userId,
            @PathVariable Long recordId) {
        requireUser(userId);

        CheckInRecord record = checkInRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Check-in record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Check-in record does not belong to this user");
        }

        checkInRecordRepository.delete(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success("Check-in deleted successfully"));
    }

    @PostMapping("/users/{userId}/completions")
    public ResponseEntity<ApiResponse<CompletionRecord>> saveUserCompletion(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> request) {

        LocalDate date = parseLocalDate(request.get("recordDate"));
        String type = parseRequiredString(request.get("itemType"), "itemType");
        CompletionItemRequest item = new CompletionItemRequest();
        item.setMealKey(parseStringNullable(request.get("mealKey")));
        item.setItemIndex(parseIntegerNullable(request.get("itemIndex")));
        if (item.getItemIndex() == null && item.getMealKey() == null) {
            throw new IllegalArgumentException("Supply an itemIndex or mealKey");
        }
        item.setCompleted(parseBooleanRequired(request.get("completed"), "completed"));
        item.setItemName(parseStringNullable(request.get("itemName")));
        item.setCalories(parseIntegerNullable(request.get("calories")));

        CompletionRecord saved = completions.save(userId, date, type, item);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @PutMapping("/users/{userId}/completions/{recordId}")
    public ResponseEntity<ApiResponse<CompletionRecord>> updateUserCompletion(
            @PathVariable Long userId,
            @PathVariable Long recordId,
            @RequestBody Map<String, Object> request) {

        requireUser(userId);
        CompletionRecord record = completionRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Completion record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Completion record does not belong to this user");
        }

        LocalDate recordDate = request.containsKey("recordDate")
                ? parseLocalDate(request.get("recordDate"))
                : record.getRecordDate();
        String itemType = request.containsKey("itemType")
                ? parseRequiredString(request.get("itemType"), "itemType")
                : record.getItemType();
        if (record.getMealKey() != null) {
            if (!recordDate.equals(record.getRecordDate()) || !itemType.equals(record.getItemType())
                    || request.get("itemIndex") != null
                    || (request.containsKey("mealKey") && !record.getMealKey().equals(request.get("mealKey")))) {
                throw new IllegalArgumentException("A bound meal's date and identity cannot be changed");
            }
        } else {
            if (request.get("mealKey") != null) throw new IllegalArgumentException("Use completion/save to select a meal");
            Integer itemIndex = request.containsKey("itemIndex")
                    ? parseIntegerRequired(request.get("itemIndex"), "itemIndex") : record.getItemIndex();
            completionRecordRepository.findByUserIdAndRecordDateAndItemTypeAndItemIndex(userId, recordDate, itemType, itemIndex)
                    .filter(existing -> !Objects.equals(existing.getId(), recordId))
                    .ifPresent(existing -> { throw new IllegalArgumentException("Completion already exists for this slot"); });
            record.setRecordDate(recordDate);
            record.setItemType(itemType);
            record.setItemIndex(itemIndex);
        }
        if (request.containsKey("completed")) {
            record.setCompleted(parseBooleanRequired(request.get("completed"), "completed"));
        }
        if (request.containsKey("itemName")) {
            record.setItemName(parseStringNullable(request.get("itemName")));
        }
        if (request.containsKey("calories")) {
            record.setCalories(parseIntegerNullable(request.get("calories")));
        }

        CompletionRecord saved = completionRecordRepository.save(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @DeleteMapping("/users/{userId}/completions/{recordId}")
    public ResponseEntity<ApiResponse<String>> deleteUserCompletion(
            @PathVariable Long userId,
            @PathVariable Long recordId) {
        requireUser(userId);

        CompletionRecord record = completionRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Completion record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Completion record does not belong to this user");
        }

        completionRecordRepository.delete(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success("Completion record deleted successfully"));
    }

    @PostMapping("/users/{userId}/calories")
    public ResponseEntity<ApiResponse<CalorieRecord>> saveUserCalories(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> request) {

        requireUser(userId);
        LocalDate recordDate = parseLocalDate(request.get("recordDate"));

        CalorieRecord record = calorieRecordRepository.findByUserIdAndRecordDate(userId, recordDate)
                .orElseGet(CalorieRecord::new);

        record.setUserId(userId);
        record.setRecordDate(recordDate);
        record.setCalorieIntake(parseIntegerOrDefault(request.get("calorieIntake"), 0));
        record.setCalorieExpenditure(parseIntegerOrDefault(request.get("calorieExpenditure"), 0));
        record.setBaseMetabolism(parseIntegerNullable(request.get("baseMetabolism")));
        record.setExerciseCalories(parseIntegerNullable(request.get("exerciseCalories")));

        CalorieRecord saved = calorieRecordRepository.save(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @PutMapping("/users/{userId}/calories/{recordId}")
    public ResponseEntity<ApiResponse<CalorieRecord>> updateUserCalories(
            @PathVariable Long userId,
            @PathVariable Long recordId,
            @RequestBody Map<String, Object> request) {

        requireUser(userId);
        CalorieRecord record = calorieRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Calorie record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Calorie record does not belong to this user");
        }

        LocalDate recordDate = request.containsKey("recordDate")
                ? parseLocalDate(request.get("recordDate"))
                : record.getRecordDate();

        calorieRecordRepository.findByUserIdAndRecordDate(userId, recordDate)
                .filter(existing -> !Objects.equals(existing.getId(), recordId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Calorie record already exists for this date");
                });

        record.setRecordDate(recordDate);
        if (request.containsKey("calorieIntake")) {
            record.setCalorieIntake(parseIntegerOrDefault(request.get("calorieIntake"), 0));
        }
        if (request.containsKey("calorieExpenditure")) {
            record.setCalorieExpenditure(parseIntegerOrDefault(request.get("calorieExpenditure"), 0));
        }
        if (request.containsKey("baseMetabolism")) {
            record.setBaseMetabolism(parseIntegerNullable(request.get("baseMetabolism")));
        }
        if (request.containsKey("exerciseCalories")) {
            record.setExerciseCalories(parseIntegerNullable(request.get("exerciseCalories")));
        }

        CalorieRecord saved = calorieRecordRepository.save(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @DeleteMapping("/users/{userId}/calories/{recordId}")
    public ResponseEntity<ApiResponse<String>> deleteUserCalories(
            @PathVariable Long userId,
            @PathVariable Long recordId) {
        requireUser(userId);

        CalorieRecord record = calorieRecordRepository.findById(recordId)
                .orElseThrow(() -> new IllegalArgumentException("Calorie record not found"));

        if (!Objects.equals(record.getUserId(), userId)) {
            throw new IllegalArgumentException("Calorie record does not belong to this user");
        }

        calorieRecordRepository.delete(record);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success("Calorie record deleted successfully"));
    }

    @PutMapping("/users/{userId}/metrics")
    public ResponseEntity<ApiResponse<User>> updateUserMetrics(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> request) {

        User user = requireUser(userId);

        if (request.containsKey("weight")) {
            user.setWeight(parseDoubleNullable(request.get("weight")));
        }
        if (request.containsKey("height")) {
            user.setHeight(parseDoubleNullable(request.get("height")));
        }
        if (request.containsKey("bodyFatRate") || request.containsKey("weight") || request.containsKey("height")) {
            if (request.containsKey("bodyFatRate")) {
                user.setBodyFatRate(parseDoubleNullable(request.get("bodyFatRate")));
            } else {
                metrics.calculateIfComplete(user);
            }
            checkInRecordRepository.findByUserIdAndCheckInDate(userId, LocalDate.now())
                    .ifPresent(row -> row.setBodyFatRate(user.getBodyFatRate()));
        }
        if (request.containsKey("goalWeight")) {
            Double target = parseDoubleNullable(request.get("goalWeight"));
            if (target != null && (!Double.isFinite(target) || target < 30 || target > 300)) {
                throw new IllegalArgumentException("Weight target must be 30 to 300 kg");
            }
            user.setGoalWeight(target);
        }
        if (request.containsKey("goalBodyFatRate")) {
            Double target = parseDoubleNullable(request.get("goalBodyFatRate"));
            if (target != null && (!Double.isFinite(target) || target <= 0 || target > 100)) {
                throw new IllegalArgumentException("Body-fat target must be greater than 0 and at most 100");
            }
            user.setGoalBodyFatRate(target);
        }
        if (request.containsKey("targetCalories")) {
            user.setTargetCalories(parseIntegerNullable(request.get("targetCalories")));
        }

        User saved = userRepository.save(user);
        userService.evictAllUserCaches(userId);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    private User requireUser(Long userId) {
        return userRepository.findForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private LocalDate parseLocalDate(Object value) {
        if (value == null) {
            throw new IllegalArgumentException("Date is required");
        }
        return LocalDate.parse(value.toString());
    }

    private Double parseDoubleNullable(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        return Double.valueOf(value.toString());
    }

    private Integer parseIntegerNullable(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        return Integer.valueOf(value.toString());
    }

    private Integer parseIntegerRequired(Object value, String fieldName) {
        Integer parsed = parseIntegerNullable(value);
        if (parsed == null) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return parsed;
    }

    private Integer parseIntegerOrDefault(Object value, int defaultValue) {
        Integer parsed = parseIntegerNullable(value);
        return parsed == null ? defaultValue : parsed;
    }

    private Boolean parseBooleanRequired(Object value, String fieldName) {
        if (value == null || value.toString().isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        if ("true".equalsIgnoreCase(value.toString())) return true;
        if ("false".equalsIgnoreCase(value.toString())) return false;
        throw new IllegalArgumentException(fieldName + " must be a boolean");
    }

    private String parseRequiredString(Object value, String fieldName) {
        String parsed = parseStringNullable(value);
        if (parsed == null || parsed.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return parsed;
    }

    private String parseStringNullable(Object value) {
        return value == null ? null : value.toString().trim();
    }

    private void updateMeasurements(CheckInRecord record, Double weight, Double height) {
        if (!Objects.equals(weight, record.getWeight()) || !Objects.equals(height, record.getHeight())) {
            record.setBodyFatRate(null);
        }
        record.setWeight(weight);
        record.setHeight(height);
    }

    private void syncCurrentMeasurement(User user, CheckInRecord record) {
        if (LocalDate.now().equals(record.getCheckInDate())) {
            if (record.getWeight() != null) user.setWeight(record.getWeight());
            if (record.getHeight() != null) user.setHeight(record.getHeight());
            if ((record.getWeight() != null || record.getHeight() != null) && metrics.calculateIfComplete(user)) {
                record.setBodyFatRate(user.getBodyFatRate());
            }
        }
    }
}
