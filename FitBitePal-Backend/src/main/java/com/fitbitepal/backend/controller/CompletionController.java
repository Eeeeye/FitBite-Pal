package com.fitbitepal.backend.controller;

import com.fitbitepal.backend.dto.ApiResponse;
import com.fitbitepal.backend.dto.BatchCompletionRequest;
import com.fitbitepal.backend.dto.SaveCompletionRequest;
import com.fitbitepal.backend.model.CompletionRecord;
import com.fitbitepal.backend.service.CompletionService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/completion")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CompletionController {
    private final CompletionService completions;

    @PreAuthorize("hasRole('ADMIN') or #request.userId == principal.id")
    @PostMapping("/save")
    public ApiResponse<CompletionRecord> saveCompletion(@Valid @RequestBody SaveCompletionRequest request) {
        CompletionRecord record = completions.save(request.getUserId(), request.getDate(), request.getItemType(), request);
        return ApiResponse.success("完成状态已保存", record);
    }

    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    @GetMapping("/records")
    public Map<String, Object> getCompletionRecords(
            @RequestParam Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String itemType) {
        List<CompletionRecord> records = completions.list(userId, date, itemType);
        return Map.of("success", true, "data", records);
    }

    @PreAuthorize("hasRole('ADMIN') or #request.userId == principal.id")
    @PostMapping("/batch-save")
    public Map<String, Object> batchSaveCompletion(@Valid @RequestBody BatchCompletionRequest request) {
        completions.saveBatch(request);
        return Map.of("success", true, "message", "批量保存成功");
    }
}
