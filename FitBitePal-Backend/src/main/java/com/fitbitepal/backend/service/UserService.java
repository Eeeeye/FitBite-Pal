package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.CheckInRecord;
import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.CheckInRecordRepository;
import com.fitbitepal.backend.repository.CompletionRecordRepository;
import com.fitbitepal.backend.repository.DietPlanRepository;
import com.fitbitepal.backend.repository.TrainingPlanRepository;
import com.fitbitepal.backend.repository.UserRepository;
import com.fitbitepal.backend.model.CompletionRecord;
import com.fitbitepal.backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    // 缓存名称常量
    private static final String CACHE_USER = "userCache";
    private static final String CACHE_TRAINING_PLAN = "trainingPlanCache";
    private static final String CACHE_DIET_PLAN = "dietPlanCache";
    
    private final UserRepository userRepository;
    private final TrainingPlanRepository trainingPlanRepository;
    private final DietPlanRepository dietPlanRepository;
    private final CheckInRecordRepository checkInRecordRepository;
    private final CompletionRecordRepository completionRecordRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AICalculationService aiCalculationService;
    private final PlanGenerationService planGenerationService;
    private final DynamicPlanGenerationService dynamicPlanService;
    private final DynamicDietPlanService dynamicDietPlanService;
    private final EmailService emailService;
    
    /**
     * 用户注册
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // 检查用户名是否已存在
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        
        // 检查邮箱是否已存在
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        
        // 创建新用户
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        
        user = userRepository.save(user);
        
        // 生成Token
        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        
        // 新注册用户默认角色为 USER
        return new AuthResponse(token, user.getId(), user.getUsername(), user.getEmail(), "USER");
    }
    
    /**
     * 用户登录
     */
    public AuthResponse login(LoginRequest request) {
        // 查找用户
        User user = userRepository.findByUsernameOrEmail(
                request.getUsernameOrEmail(), 
                request.getUsernameOrEmail()
        ).orElseThrow(() -> new IllegalArgumentException("Invalid username/email or password"));
        
        // 验证密码
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid username/email or password");
        }
        
        // 生成Token
        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        
        // 返回包含角色的响应
        String role = user.getRole() != null ? user.getRole() : "USER";
        return new AuthResponse(token, user.getId(), user.getUsername(), user.getEmail(), role);
    }
    
    /**
     * 保存用户画像并生成计划
     * 注意：这个方法用于首次设置或调整计划，会保存打卡记录并生成未来4天的计划
     */
    /**
     * 保存用户资料（重构版 - 统一数据源到User表）
     * 不再同步到UserProfile表，所有数据统一存储在User表中
     */
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = CACHE_USER, key = "#userId"),
        @CacheEvict(value = CACHE_TRAINING_PLAN, allEntries = true),
        @CacheEvict(value = CACHE_DIET_PLAN, allEntries = true)
    })
    public UserProfileResponse saveUserProfile(Long userId, UserProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        log.info("保存用户 {} 的个人资料到User表（唯一数据源）", userId);
        
        // ✅ 更新User表的基本信息
        user.setGender(request.getGender());
        user.setAge(request.getAge());
        user.setHeight(request.getHeight());
        user.setWeight(request.getWeight());
        user.setGoal(request.getGoal());
        user.setActivityLevel(request.getActivityLevel());
        user.setTrainingDuration(request.getTrainingDuration());
        
        // ✅ AI自动计算健康指标并更新User表
        aiCalculationService.calculateHealthMetrics(user);
        
        // ✅ 保存到User表（唯一数据源）
        user = userRepository.save(user);
        
        // ✅ 同步更新今天的打卡记录体重（保持 User 表和打卡表今天的数据一致）
        LocalDate today = LocalDate.now();
        List<CheckInRecord> todayCheckIns = checkInRecordRepository
            .findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, today, today);
        if (!todayCheckIns.isEmpty()) {
            CheckInRecord todayRecord = todayCheckIns.get(0);
            todayRecord.setWeight(request.getWeight());
            todayRecord.setHeight(request.getHeight());
            checkInRecordRepository.save(todayRecord);
            log.info("同步更新今天打卡记录的体重: userId={}, weight={}", userId, request.getWeight());
        }
        
        // 根据新数据生成训练和饮食计划
        
        // 检查是否是新用户（没有任何计划）
        List<TrainingPlan> existingPlans = trainingPlanRepository
                .findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, today);
        
        if (existingPlans.isEmpty()) {
            log.info("新用户 {}，生成初始4天计划", userId);
            dynamicPlanService.generateInitialPlans(userId);
        } else {
            log.info("老用户 {}，生成第3天计划", userId);
            dynamicPlanService.generatePlanForDay3(userId, today);
        }
        
        // 生成饮食计划
        planGenerationService.generateDietPlan(user);
        
        // 返回计算结果
        return new UserProfileResponse(
                user.getBmi(),
                user.getBodyFatRate(),
                user.getBmr(),
                user.getTdee(),
                user.getTargetCalories(),
                user.getRecommendedProtein(),
                user.getRecommendedCarbs(),
                user.getRecommendedFat()
        );
    }
    
    /**
     * 获取用户信息（带缓存）
     */
    @Cacheable(value = CACHE_USER, key = "#userId", unless = "#result == null")
    public User getUserById(Long userId) {
        log.debug("📥 从数据库加载用户: {}", userId);
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
    
    /**
     * 获取用户画像（重构版 - 已废弃）
     * UserProfile表已删除，请直接使用 getUserById() 获取User对象
     * @deprecated 使用 getUserById() 代替
     */
    @Deprecated
    public User getUserProfileAsUser(Long userId) {
        return getUserById(userId);
    }
    
    /**
     * 获取训练计划（旧方法，基于星期几）
     * @deprecated 使用 getTrainingPlanByDate 代替
     */
    @Deprecated
    public List<TrainingPlan> getTrainingPlan(Long userId) {
        return trainingPlanRepository.findByUserIdOrderByDayOfWeekAscOrderIndexAsc(userId);
    }
    
    /**
     * 根据日期获取训练计划（带缓存）
     * 会自动检查并补齐配置天数内缺失的计划
     */
    @Cacheable(value = CACHE_TRAINING_PLAN, key = "#userId + ':' + #date.toString()", unless = "#result == null || #result.isEmpty()")
    public List<TrainingPlan> getTrainingPlanByDate(Long userId, LocalDate date) {
        log.info("获取用户 {} 在 {} 的训练计划", userId, date);
        
        // 自动补齐配置天数内缺失的计划
        LocalDate today = LocalDate.now();
            dynamicPlanService.fillMissingPlans(userId);
        
        return trainingPlanRepository.findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, date);
    }
    
    /**
     * 获取饮食计划（带缓存，动态生成，按日期范围返回）
     */
    @Cacheable(value = CACHE_DIET_PLAN, key = "#userId", unless = "#result == null || #result.isEmpty()")
    public List<DietPlan> getDietPlan(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        
        // 使用动态饮食计划服务，获取今天和明天的计划
        return dynamicDietPlanService.getDietPlans(userId, today, tomorrow);
    }
    
    /**
     * 获取指定日期的饮食计划
     */
    public List<DietPlan> getDietPlanByDate(Long userId, LocalDate date) {
        // 确保该日期有计划
        dynamicDietPlanService.fillMissingDietPlans(userId);
        return dietPlanRepository.findByUserIdAndPlanDateOrderByMealTimeAsc(userId, date);
    }
    
    /**
     * 发送密码重置验证码
     */
    public void sendPasswordResetCode(String email) {
        // 检查邮箱是否存在
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Email not found"));
        
        // 发送验证码
        emailService.sendVerificationCode(email);
    }
    
    /**
     * 验证密码重置验证码
     */
    public boolean verifyResetCode(String email, String code) {
        return emailService.verifyCode(email, code);
    }
    
    /**
     * 重置密码
     * 注意：验证码已在前一步（/verify-code）验证过，这里不再重复验证
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        // 查找用户
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // 更新密码
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        User savedUser = userRepository.save(user);
        
        // ✅ 手动清除用户缓存（因为此方法签名无法使用 @CacheEvict）
        evictUserCache(savedUser.getId());
        
        log.info("密码重置成功: {}", request.getEmail());
    }
    
    /**
     * 更新用户基本信息
     */
    @Transactional
    @CacheEvict(value = CACHE_USER, key = "#user.id")  // ✅ 清除用户缓存
    public User updateUser(User user) {
        return userRepository.save(user);
    }
    
    /**
     * 手动清除用户缓存
     */
    @CacheEvict(value = CACHE_USER, key = "#userId")
    public void evictUserCache(Long userId) {
        log.debug("清除用户缓存: userId={}", userId);
    }
    
    /**
     * 清除所有用户相关缓存
     */
    @Caching(evict = {
        @CacheEvict(value = CACHE_USER, key = "#userId"),
        @CacheEvict(value = CACHE_TRAINING_PLAN, allEntries = true),
        @CacheEvict(value = CACHE_DIET_PLAN, key = "#userId")
    })
    public void evictAllUserCaches(Long userId) {
        log.debug("清除用户所有缓存: userId={}", userId);
    }
    
    /**
     * 保存打卡记录
     * 同时记录打卡时的体重和身高数据，用于历史数据统计和折线图展示
     */
    @Transactional
    public java.util.Map<String, Object> saveCheckIn(Long userId, java.util.Map<String, Object> checkInData) {
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        
        try {
            // 获取打卡日期
            String dateStr = checkInData.get("date").toString();
            LocalDate checkInDate = LocalDate.parse(dateStr);
            
            // 检查今天是否已打卡
            LocalDate today = LocalDate.now();
            if (checkInDate.equals(today)) {
                // 查找今天的打卡记录
                java.util.List<CheckInRecord> todayRecords = checkInRecordRepository
                    .findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, today, today);
                
                if (!todayRecords.isEmpty()) {
                    // 今天已经打卡过了
                    result.put("checkedIn", false);
                    result.put("message", "今天已经打卡过了！");
                    result.put("alreadyCheckedIn", true);
                    result.put("record", todayRecords.get(0));
                    return result;
                }
            }
            
            // ✅ 创建打卡记录，同时保存体重和身高历史数据
            CheckInRecord record = new CheckInRecord();
            record.setUserId(userId);
            record.setCheckInDate(checkInDate);
            
            // ✅ 保存打卡时的体重和身高（用于历史统计折线图）
            if (checkInData.containsKey("weight") && checkInData.get("weight") != null) {
                record.setWeight(Double.valueOf(checkInData.get("weight").toString()));
            }
            if (checkInData.containsKey("height") && checkInData.get("height") != null) {
                record.setHeight(Double.valueOf(checkInData.get("height").toString()));
            }
            
            checkInRecordRepository.save(record);
            
            // ✅ 触发计划生成（放在独立的try-catch中，避免影响打卡主流程）
            try {
            dynamicPlanService.generatePlanForDay3(userId, today);
                // ✅ 清除训练计划缓存，确保前端获取最新数据
                evictAllUserCaches(userId);
                log.info("✅ 用户 {} 打卡成功，计划生成完成，缓存已清除", userId);
            } catch (Exception planError) {
                log.error("⚠️ 计划生成失败，但打卡已保存: {}", planError.getMessage());
                // 计划生成失败不影响打卡成功
            }
            
            result.put("checkedIn", true);
            result.put("message", "Check-in saved successfully");
            result.put("record", record);
            
        } catch (Exception e) {
            log.error("❌ 打卡失败: userId={}, error={}", userId, e.getMessage(), e);
            // 抛出异常让事务回滚
            throw new RuntimeException("Failed to save check-in: " + e.getMessage(), e);
        }
        
        return result;
    }
    
    /**
     * 获取打卡状态
     */
    public java.util.Map<String, Object> getCheckInStatus(Long userId, LocalDate date) {
        java.util.Map<String, Object> status = new java.util.HashMap<>();
        
        try {
            java.util.List<CheckInRecord> records = checkInRecordRepository
                .findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, date, date);
            
            if (!records.isEmpty()) {
                status.put("checkedIn", true);
                status.put("record", records.get(0));
            } else {
                status.put("checkedIn", false);
            }
            
        } catch (Exception e) {
            status.put("checkedIn", false);
            status.put("message", "Failed to get check-in status: " + e.getMessage());
        }
        
        return status;
    }
    
    /**
     * 获取所有打卡历史记录
     * @param userId 用户ID
     * @param days 可选：最近多少天的记录，null则返回全部
     * @return 打卡日期列表（格式：YYYY-MM-DD）
     */
    public java.util.List<String> getCheckInHistory(Long userId, Integer days) {
        java.util.List<CheckInRecord> records;
        
        if (days != null && days > 0) {
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(days - 1);
            records = checkInRecordRepository.findByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, startDate, endDate);
        } else {
            records = checkInRecordRepository.findByUserIdOrderByCheckInDateDesc(userId);
        }
        
        return records.stream()
            .map(record -> record.getCheckInDate().toString())
            .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * 获取今天的完成状态
     * 检查今天是否有已完成的运动训练
     */
    public java.util.Map<String, Object> getTodayCompletionStatus(Long userId) {
        java.util.Map<String, Object> status = new java.util.HashMap<>();
        LocalDate today = LocalDate.now();
        
        try {
            // 先获取今天的训练计划，确定有效的 itemIndex 范围
            List<TrainingPlan> todayPlans = trainingPlanRepository
                .findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, today);
            int maxValidIndex = todayPlans.size() > 0 ? todayPlans.size() - 1 : 10;
            
            // 查找今天已完成的运动记录
            List<CompletionRecord> todayRecords = completionRecordRepository
                .findByUserIdAndRecordDateAndItemType(userId, today, "exercise");
            
            // ✅ 只统计 itemIndex 在有效范围内的已完成记录
            long completedCount = todayRecords.stream()
                .filter(record -> record.getCompleted() != null && record.getCompleted())
                .filter(record -> record.getItemIndex() != null && 
                                  record.getItemIndex() >= 0 && 
                                  record.getItemIndex() <= maxValidIndex)
                .count();
            
            status.put("hasCompletedExercises", completedCount > 0);
            status.put("completedCount", completedCount);
            status.put("totalCount", todayRecords.size());
            status.put("maxValidIndex", maxValidIndex);
            status.put("date", today.toString());
            
        } catch (Exception e) {
            log.error("获取今天完成状态失败: {}", e.getMessage());
            status.put("hasCompletedExercises", false);
            status.put("error", e.getMessage());
        }
        
        return status;
    }
    
    /**
     * 调整今天的训练计划
     * @param userId 用户ID
     * @param adjustData 调整参数（duration, goal, intensity等）
     * @return 结果
     */
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = CACHE_TRAINING_PLAN, allEntries = true),
        @CacheEvict(value = CACHE_USER, key = "#userId")  // ✅ 同时清除用户缓存
    })
    public java.util.Map<String, Object> adjustTodayPlan(Long userId, java.util.Map<String, Object> adjustData) {
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        LocalDate today = LocalDate.now();
        
        try {
            // 1. 先获取今天的训练计划，确定有效的 itemIndex 范围
            List<TrainingPlan> todayPlans = trainingPlanRepository
                .findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, today);
            int maxValidIndex = todayPlans.size() > 0 ? todayPlans.size() - 1 : 10;
            
            // 2. 检查今天是否有已完成的训练（只检查有效索引范围内的记录）
            List<CompletionRecord> todayRecords = completionRecordRepository
                .findByUserIdAndRecordDateAndItemType(userId, today, "exercise");
            
            // ✅ 只统计 itemIndex 在有效范围内的已完成记录
            long completedCount = todayRecords.stream()
                .filter(record -> record.getCompleted() != null && record.getCompleted())
                .filter(record -> record.getItemIndex() != null && 
                                  record.getItemIndex() >= 0 && 
                                  record.getItemIndex() <= maxValidIndex)
                .count();
            
            log.info("检查完成状态: userId={}, maxValidIndex={}, completedCount={}", userId, maxValidIndex, completedCount);
            
            if (completedCount > 0) {
                result.put("hasCompletedExercises", true);
                result.put("completedCount", completedCount);
                result.put("message", "今天有已完成的训练，请先取消所有已勾选的运动");
                return result;
            }
            
            // 2. 获取用户并更新训练参数
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            
            // 更新训练时长
            if (adjustData.containsKey("trainingDuration")) {
                user.setTrainingDuration(Integer.valueOf(adjustData.get("trainingDuration").toString()));
            }
            
            // 更新训练区域
            if (adjustData.containsKey("trainingArea")) {
                user.setTrainingArea(adjustData.get("trainingArea").toString());
            }
            
            // 更新训练强度
            if (adjustData.containsKey("intensity")) {
                user.setTrainingIntensity(adjustData.get("intensity").toString());
            }
            
            User savedUser = userRepository.saveAndFlush(user); // ✅ 使用 saveAndFlush 确保立即写入数据库
            
            log.info("用户 {} 设置已更新: duration={}, area={}, intensity={}", 
                userId, savedUser.getTrainingDuration(), savedUser.getTrainingArea(), savedUser.getTrainingIntensity());
            
            // 3. 删除今天的旧训练计划
            List<TrainingPlan> oldPlans = trainingPlanRepository
                .findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, today);
            if (!oldPlans.isEmpty()) {
                trainingPlanRepository.deleteAll(oldPlans);
                trainingPlanRepository.flush(); // ✅ 确保删除操作立即执行
                log.info("已删除用户 {} 今天 {} 的 {} 个旧计划", userId, today, oldPlans.size());
            }
            
            // 4. 删除今天的完成记录（如果有未完成的）
            if (!todayRecords.isEmpty()) {
                completionRecordRepository.deleteByUserIdAndRecordDate(userId, today);
                log.info("已删除用户 {} 今天的完成记录", userId);
            }
            
            // 5. 生成新的训练计划（传入已更新的用户对象）
            dynamicPlanService.generatePlanForUser(savedUser, today); // ✅ 直接传入用户对象，避免重新查询
            
            // 6. 获取新生成的计划
            List<TrainingPlan> newPlans = trainingPlanRepository
                .findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, today);
            
            result.put("success", true);
            result.put("hasCompletedExercises", false);
            result.put("message", "训练计划已重新生成");
            result.put("newPlanCount", newPlans.size());
            result.put("trainingDuration", user.getTrainingDuration());
            result.put("goal", user.getGoal());
            
            log.info("用户 {} 调整计划成功，新生成 {} 个训练项目", userId, newPlans.size());
            
        } catch (Exception e) {
            log.error("调整计划失败: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("message", "调整失败: " + e.getMessage());
        }
        
        return result;
    }
}
