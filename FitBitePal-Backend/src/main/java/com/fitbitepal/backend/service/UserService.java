package com.fitbitepal.backend.service;

import com.fitbitepal.backend.dto.*;
import com.fitbitepal.backend.exception.ResourceNotFoundException;
import com.fitbitepal.backend.model.DietPlan;
import com.fitbitepal.backend.model.TrainingPlan;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.CheckInRecordRepository;
import com.fitbitepal.backend.repository.DietPlanRepository;
import com.fitbitepal.backend.repository.TrainingPlanRepository;
import com.fitbitepal.backend.repository.UserRepository;
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

import static com.fitbitepal.backend.config.RedisConfig.CACHE_DIET_PLAN;
import static com.fitbitepal.backend.config.RedisConfig.CACHE_TRAINING_PLAN;
import static com.fitbitepal.backend.config.RedisConfig.CACHE_USER;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final TrainingPlanRepository trainingPlanRepository;
    private final DietPlanRepository dietPlanRepository;
    private final CheckInRecordRepository checkInRecordRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AICalculationService aiCalculationService;
    private final LegacyDietTemplateService legacyDietTemplates;
    private final DynamicPlanGenerationService dynamicPlanService;
    private final DynamicDietPlanService dynamicDietPlanService;
    
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
    
    /** 保存资料，同时补齐今天和明天的计划。已经发布的每日计划保持稳定。 */
    @Transactional
    @CacheEvict(value = CACHE_USER, key = "#userId")
    public UserProfileResponse saveUserProfile(Long userId, UserProfileRequest request) {
        User user = userRepository.findForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

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
        checkInRecordRepository.findByUserIdAndCheckInDate(userId, today).ifPresent(record -> {
            record.setWeight(request.getWeight());
            record.setHeight(request.getHeight());
        });

        dynamicPlanService.ensurePlan(user, today);
        dynamicPlanService.ensurePlan(user, today.plusDays(1));
        // The legacy weekly API exposes undated templates alongside the dated plans.
        legacyDietTemplates.refresh(user);
        dynamicDietPlanService.ensurePlan(user, today);
        dynamicDietPlanService.ensurePlan(user, today.plusDays(1));

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
    
    public List<TrainingPlan> getTrainingPlanByDate(Long userId, LocalDate date) {
        if (inRollingWindow(date)) {
            return dynamicPlanService.generatePlanForDate(userId, date);
        }
        return trainingPlanRepository.findByUserIdAndPlanDateOrderByOrderIndexAsc(userId, date);
    }

    public List<DietPlan> getDietPlan(Long userId) {
        LocalDate today = LocalDate.now();
        List<DietPlan> result = new java.util.ArrayList<>(dynamicDietPlanService.generateDietPlanForDate(userId, today));
        result.addAll(dynamicDietPlanService.generateDietPlanForDate(userId, today.plusDays(1)));
        return result;
    }

    public List<DietPlan> getDietPlanByDate(Long userId, LocalDate date) {
        if (inRollingWindow(date)) {
            return dynamicDietPlanService.generateDietPlanForDate(userId, date);
        }
        return dietPlanRepository.findByUserIdAndPlanDateOrderByMealTimeAsc(userId, date);
    }

    private boolean inRollingWindow(LocalDate date) {
        LocalDate today = LocalDate.now();
        return date.equals(today) || date.equals(today.plusDays(1));
    }

    @Transactional
    @CacheEvict(value = CACHE_USER, key = "#userId")
    public User updateBasicInfo(Long userId, BasicInfoRequest request) {
        User user = userRepository.findForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (request.getUsername() != null) {
            user.setUsername(request.getUsername());
        }
        if (request.hasPhone()) {
            user.setPhone(request.getPhone());
        }
        return user;
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
        @CacheEvict(value = CACHE_TRAINING_PLAN, key = "#userId + ':' + T(java.time.LocalDate).now()"),
        @CacheEvict(value = CACHE_TRAINING_PLAN, key = "#userId + ':' + T(java.time.LocalDate).now().plusDays(1)"),
        @CacheEvict(value = CACHE_DIET_PLAN, key = "#userId + ':' + T(java.time.LocalDate).now()"),
        @CacheEvict(value = CACHE_DIET_PLAN, key = "#userId + ':' + T(java.time.LocalDate).now().plusDays(1)")
    })
    public void evictAllUserCaches(Long userId) {
        log.debug("清除用户所有缓存: userId={}", userId);
    }
}
