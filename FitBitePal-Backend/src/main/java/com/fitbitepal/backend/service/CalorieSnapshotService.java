package com.fitbitepal.backend.service;

import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.CalorieRecord;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.CalorieRecordRepository;
import com.fitbitepal.backend.repository.CompletionRecordRepository;
import com.fitbitepal.backend.repository.UserRepository;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CalorieSnapshotService {
    private final UserRepository users;
    private final CalorieRecordRepository calories;
    private final CompletionRecordRepository completions;

    @Transactional
    public void createIfAbsent(Long userId, LocalDate date) {
        users.findForUpdate(userId).ifPresent(user -> {
            if (!calories.existsByUserIdAndRecordDate(userId, date)) {
                calculate(user, date, new CalorieRecord());
            }
        });
    }

    @Transactional
    public CalorieRecord recalculate(Long userId, LocalDate date) {
        User user = users.findForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        CalorieRecord record = calories.findFirstByUserIdAndRecordDateOrderByIdDesc(userId, date)
                .orElseGet(CalorieRecord::new);
        return calculate(user, date, record);
    }

    private CalorieRecord calculate(User user, LocalDate date, CalorieRecord record) {
        int exercise = 0;
        int intake = 0;
        for (var row : completions.totalsForDay(user.getId(), date)) {
            if ("exercise".equals(row.getItemType())) exercise = Math.toIntExact(row.getTotal());
            if ("meal".equals(row.getItemType())) intake = Math.toIntExact(row.getTotal());
        }
        int bmr = user.getBmr() == null ? 1500 : user.getBmr();
        record.setUserId(user.getId());
        record.setRecordDate(date);
        record.setBaseMetabolism(bmr);
        record.setCalorieIntake(intake);
        record.setExerciseCalories(exercise);
        record.setCalorieExpenditure(Math.addExact(bmr, exercise));
        return calories.save(record);
    }
}
