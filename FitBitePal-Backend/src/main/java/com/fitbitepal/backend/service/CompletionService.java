package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.BatchCompletionRequest;
import com.fitbitepal.backend.dto.CompletionItemRequest;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.CompletionRecord;
import com.fitbitepal.backend.repository.CompletionRecordRepository;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CompletionService {
    private final CompletionRecordRepository records;
    private final UserRepository users;
    private final MealCompletionService mealCompletions;

    @Transactional(readOnly = true)
    public List<CompletionRecord> list(Long userId, LocalDate date, String type) {
        var result = date == null ? records.findByUserIdAndItemTypeOrderByRecordDateDesc(userId, type)
                : records.findByUserIdAndRecordDateAndItemType(userId, date, type);
        if ("meal".equals(type) && !result.isEmpty()) {
            Map<Long, Integer> positions = new HashMap<>();
            records.mealFlags(userId, date).forEach(row -> positions.put(row.getRecordId(), row.getItemIndex()));
            // Negative positions are outside the visible index space on old clients.
            result.forEach(row -> {
                Integer position = positions.get(row.getId());
                row.setDisplayIndex(position == null ? -1 : position);
            });
            if (date != null) {
                return result.stream().filter(row -> row.getMealKey() == null || positions.get(row.getId()) != null).toList();
            }
        }
        return result;
    }

    @Transactional
    public CompletionRecord save(Long userId, LocalDate date, String type, CompletionItemRequest item) {
        lockUser(userId);
        if ("meal".equals(type)) return mealCompletions.saveOne(userId, date, item);
        CompletionRecord record = records.findByUserIdAndRecordDateAndItemTypeAndItemIndex(
                userId, date, type, item.getItemIndex()).orElseGet(CompletionRecord::new);
        return apply(record, userId, date, type, item);
    }

    @Transactional
    public void saveBatch(BatchCompletionRequest batch) {
        lockUser(batch.userId());
        if ("meal".equals(batch.itemType())) {
            mealCompletions.save(batch.userId(), batch.date(), batch.items());
            return;
        }
        Map<Integer, CompletionRecord> byIndex = new HashMap<>();
        records.findByUserIdAndRecordDateAndItemType(batch.userId(), batch.date(), batch.itemType())
                .forEach(record -> byIndex.put(record.getItemIndex(), record));
        for (CompletionItemRequest item : batch.items()) {
            CompletionRecord record = byIndex.computeIfAbsent(item.getItemIndex(), key -> new CompletionRecord());
            apply(record, batch.userId(), batch.date(), batch.itemType(), item);
        }
    }

    // Lock the parent because the first submission has no completion row to lock yet.
    private void lockUser(Long userId) {
        users.findForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private CompletionRecord apply(CompletionRecord record, Long userId, LocalDate date,
                                   String type, CompletionItemRequest item) {
        if (item.getMealKey() != null) throw new IllegalArgumentException("mealKey applies only to meal completions");
        record.setCompleted(item.getCompleted());
        record.setItemName(item.getItemName());
        record.setCalories(item.getCalories());
        if (record.getId() == null) {
            record.setUserId(userId);
            record.setRecordDate(date);
            record.setItemType(type);
            record.setItemIndex(item.getItemIndex());
            return records.save(record);
        }
        return record;
    }
}
