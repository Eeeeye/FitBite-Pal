package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.CompletionItemRequest;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.CompletionRecord;
import com.fitbitepal.backend.repository.CompletionRecordRepository;
import com.fitbitepal.backend.repository.DietPlanRepository;
import com.fitbitepal.backend.repository.DietRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
class MealCompletionService {
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm");
    private final CompletionRecordRepository completions;
    private final DietPlanRepository plans;
    private final DietRecordRepository diet;

    private record Meal(String key, String name, String time, String type, Integer calories) {
        boolean matchesLegacy(CompletionItemRequest item) {
            String label = item.getItemName();
            return label != null && !label.isBlank()
                    && (label.equals(time) || label.equals(name) || label.equals(type))
                    && (Objects.equals(item.getCalories(), calories)
                        || ((calories == null || calories == 0) && Objects.equals(item.getCalories(), 300)));
        }
    }

    CompletionRecord saveOne(Long userId, LocalDate date, CompletionItemRequest item) {
        String key = item.getMealKey();
        if (key == null) return save(userId, date, List.of(item)).get(0);
        int separator = key.indexOf(':');
        if (separator < 1) throw new IllegalArgumentException("Invalid meal key");
        String identifier = key.substring(separator + 1);
        long id = Long.parseLong(identifier);
        if (id <= 0 || !Long.toString(id).equals(identifier)) throw new IllegalArgumentException("Invalid meal key");
        Meal meal = (switch (key.substring(0, separator)) {
            case "plan" -> plans.findById(id)
                    .filter(row -> userId.equals(row.getUserId()) && date.equals(row.getPlanDate()) && !row.isHidden())
                    .map(row -> new Meal(key, row.getMealName(), row.getMealTime(), row.getMealType(), row.getCalories()));
            case "record" -> diet.findById(id)
                    .filter(row -> userId.equals(row.getUserId()) && date.equals(row.getRecordedAt().toLocalDate()))
                    .map(row -> new Meal(key, row.getFoodName(), CLOCK.format(row.getRecordedAt()), row.getMealType(), row.getCalories()));
            default -> throw new IllegalArgumentException("Invalid meal key");
        }).orElseThrow(() -> new ResourceNotFoundException("Meal no longer exists on this user's menu"));
        CompletionRecord row = completions.findByUserIdAndRecordDateAndItemTypeAndMealKey(userId, date, "meal", key)
                .orElseGet(CompletionRecord::new);
        return persist(userId, date, row, item, meal, item.getItemIndex());
    }

    // Called with the user row locked. A plan and a manual diet record can have the same numeric id.
    List<CompletionRecord> save(Long userId, LocalDate date, List<CompletionItemRequest> items) {
        List<Meal> menu = new ArrayList<>();
        plans.findByUserIdAndPlanDateOrderByMealTimeAsc(userId, date).stream()
                .filter(plan -> !plan.isHidden())
                .forEach(plan -> menu.add(new Meal("plan:" + plan.getId(), plan.getMealName(),
                        plan.getMealTime(), plan.getMealType(), plan.getCalories())));
        diet.findByUserIdAndRecordedAtBetween(userId, date.atStartOfDay(), date.atTime(java.time.LocalTime.MAX))
                .forEach(row -> menu.add(new Meal("record:" + row.getId(), row.getFoodName(),
                        CLOCK.format(row.getRecordedAt()), row.getMealType(), row.getCalories())));

        Map<String, CompletionRecord> keyed = new HashMap<>();
        Map<Integer, CompletionRecord> legacy = new HashMap<>();
        for (var record : completions.findByUserIdAndRecordDateAndItemType(userId, date, "meal")) {
            if (record.getMealKey() == null) legacy.put(record.getItemIndex(), record);
            else keyed.put(record.getMealKey(), record);
        }
        List<CompletionRecord> saved = new ArrayList<>(items.size());
        for (CompletionItemRequest item : items) {
            Meal meal = resolve(menu, item);
            CompletionRecord row = meal == null
                    ? legacy.computeIfAbsent(item.getItemIndex(), ignored -> new CompletionRecord())
                    : keyed.computeIfAbsent(meal.key(), ignored -> new CompletionRecord());
            saved.add(persist(userId, date, row, item, meal, meal == null ? null : menu.indexOf(meal)));
        }
        return saved;
    }

    private CompletionRecord persist(Long userId, LocalDate date, CompletionRecord row, CompletionItemRequest item,
                                     Meal meal, Integer displayIndex) {
        row.setUserId(userId);
        row.setRecordDate(date);
        row.setItemType("meal");
        row.setMealKey(meal == null ? null : meal.key());
        row.setItemIndex(meal == null ? item.getItemIndex() : null);
        row.setDisplayIndex(displayIndex);
        row.setCompleted(item.getCompleted());
        row.setItemName(meal == null ? item.getItemName() : meal.name());
        row.setCalories(meal == null ? item.getCalories() : meal.calories());
        return row.getId() == null ? completions.save(row) : row;
    }

    private Meal resolve(List<Meal> menu, CompletionItemRequest item) {
        if (item.getMealKey() != null) {
            return menu.stream().filter(meal -> meal.key().equals(item.getMealKey())).findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Meal no longer exists on this user's menu"));
        }
        if (item.getItemIndex() == null || item.getItemIndex() < 0) {
            throw new IllegalArgumentException("A valid meal key or item index is required");
        }
        if (menu.isEmpty()) return null; // Preserve historical index-only logs that predate a stored menu.
        int index = item.getItemIndex();
        if (index < menu.size() && menu.get(index).matchesLegacy(item)
                && menu.stream().filter(meal -> meal.matchesLegacy(item)).count() == 1) {
            return menu.get(index);
        }
        throw new IllegalArgumentException("The meal list changed or the meal is ambiguous. Refresh and select it again.");
    }
}
