package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.model.CompletionRecord;
import com.fitbitepal.backend.repository.CompletionRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 完成状态控制器 - 处理运动和饮食的打勾状态
 */
@RestController
@RequestMapping("/completion")
@CrossOrigin(origins = "*")
public class CompletionController {

    @Autowired
    private CompletionRecordRepository completionRecordRepository;

    /**
     * 保存或更新完成状态
     */
    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> saveCompletion(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            LocalDate recordDate = LocalDate.parse(request.get("date").toString());
            String itemType = request.get("itemType").toString(); // "exercise" 或 "meal"
            Integer itemIndex = Integer.valueOf(request.get("itemIndex").toString());
            Boolean completed = Boolean.valueOf(request.get("completed").toString());
            String itemName = request.get("itemName") != null ? request.get("itemName").toString() : "";
            Integer calories = request.get("calories") != null ? Integer.valueOf(request.get("calories").toString()) : 0;
            
            // 查找是否已存在记录
            CompletionRecord record = completionRecordRepository
                .findByUserIdAndRecordDateAndItemTypeAndItemIndex(userId, recordDate, itemType, itemIndex)
                .orElse(new CompletionRecord());
            
            // 更新记录
            record.setUserId(userId);
            record.setRecordDate(recordDate);
            record.setItemType(itemType);
            record.setItemIndex(itemIndex);
            record.setCompleted(completed);
            record.setItemName(itemName);
            record.setCalories(calories);
            
            completionRecordRepository.save(record);
            
            response.put("success", true);
            response.put("message", "完成状态已保存");
            response.put("data", record);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "保存失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 获取完成记录
     * 如果传了 date 参数，返回指定日期的记录
     * 如果没传 date 参数，返回用户所有历史记录
     */
    @GetMapping("/records")
    public ResponseEntity<Map<String, Object>> getCompletionRecords(
            @RequestParam Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String itemType) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<CompletionRecord> records;
            
            if (date != null) {
                // 获取指定日期的记录
                records = completionRecordRepository
                    .findByUserIdAndRecordDateAndItemType(userId, date, itemType);
            } else {
                // 获取用户所有历史记录
                records = completionRecordRepository
                    .findByUserIdAndItemTypeOrderByRecordDateDesc(userId, itemType);
            }
            
            response.put("success", true);
            response.put("data", records);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "获取记录失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 批量保存完成状态
     */
    @PostMapping("/batch-save")
    public ResponseEntity<Map<String, Object>> batchSaveCompletion(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            LocalDate recordDate = LocalDate.parse(request.get("date").toString());
            String itemType = request.get("itemType").toString();
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) request.get("items");
            
            for (Map<String, Object> item : items) {
                Integer itemIndex = Integer.valueOf(item.get("itemIndex").toString());
                Boolean completed = Boolean.valueOf(item.get("completed").toString());
                String itemName = item.get("itemName") != null ? item.get("itemName").toString() : "";
                Integer calories = item.get("calories") != null ? Integer.valueOf(item.get("calories").toString()) : 0;
                
                CompletionRecord record = completionRecordRepository
                    .findByUserIdAndRecordDateAndItemTypeAndItemIndex(userId, recordDate, itemType, itemIndex)
                    .orElse(new CompletionRecord());
                
                record.setUserId(userId);
                record.setRecordDate(recordDate);
                record.setItemType(itemType);
                record.setItemIndex(itemIndex);
                record.setCompleted(completed);
                record.setItemName(itemName);
                record.setCalories(calories);
                
                completionRecordRepository.save(record);
            }
            
            response.put("success", true);
            response.put("message", "批量保存成功");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "批量保存失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}

