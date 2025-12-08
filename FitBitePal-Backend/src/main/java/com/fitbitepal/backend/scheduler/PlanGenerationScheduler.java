package com.fitbitepal.backend.scheduler;

import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.DietRecordRepository;
import com.fitbitepal.backend.repository.UserRepository;
import com.fitbitepal.backend.service.DynamicDietPlanService;
import com.fitbitepal.backend.service.DynamicPlanGenerationService;
import com.fitbitepal.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 计划生成定时任务
 * 每天23:59自动为所有用户生成明天的训练计划和饮食计划
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PlanGenerationScheduler {
    
    private final DynamicPlanGenerationService dynamicPlanService;
    private final DynamicDietPlanService dynamicDietPlanService;
    private final UserRepository userRepository;
    private final DietRecordRepository dietRecordRepository;
    private final UserService userService;  // ✅ 添加 UserService 用于缓存清理
    
    /**
     * 每天23:59执行，为所有用户生成明天的训练计划和饮食计划
     * cron表达式: 秒 分 时 日 月 周
     * 0 59 23 * * ? = 每天23:59:00
     */
    @Scheduled(cron = "0 59 23 * * ?")
    @Transactional
    public void generateDailyPlans() {
        log.info("==================== 开始执行每日计划生成任务 ====================");
        
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        
        log.info("今天: {}, 将生成 {} 的训练和饮食计划", today, tomorrow);
        
        // 获取所有用户
        List<User> allUsers = userRepository.findAll();
        log.info("共有 {} 个用户需要处理", allUsers.size());
        
        int trainingSuccess = 0;
        int dietSuccess = 0;
        int skipCount = 0;
        int failCount = 0;
        
        for (User user : allUsers) {
            try {
                // 检查用户是否有基本信息
                if (user.getHeight() == null || user.getWeight() == null) {
                    log.debug("用户 {} 没有完整信息，跳过", user.getId());
                    skipCount++;
                    continue;
                }
                
                // 生成明天的训练计划
                dynamicPlanService.generatePlanForNextDay(user.getId(), today);
                trainingSuccess++;
                
                // 生成明天的饮食计划
                dynamicDietPlanService.generateDietPlanForDate(user.getId(), tomorrow);
                dietSuccess++;
                
                // ✅ 清除用户相关缓存，确保前端获取最新数据
                userService.evictAllUserCaches(user.getId());
                
            } catch (Exception e) {
                log.error("为用户 {} 生成计划失败: {}", user.getId(), e.getMessage(), e);
                failCount++;
            }
        }
        
        log.info("==================== 每日计划生成任务完成 ====================");
        log.info("总用户数: {}, 训练计划成功: {}, 饮食计划成功: {}, 跳过: {}, 失败: {}", 
                allUsers.size(), trainingSuccess, dietSuccess, skipCount, failCount);
    }
    
    /**
     * 每天00:05执行，清理历史手动添加的饮食记录
     * 只保留今天的记录，历史记录会被删除
     */
    @Scheduled(cron = "0 5 0 * * ?")
    @Transactional
    public void cleanupHistoricalDietRecords() {
        log.info("==================== 开始清理历史饮食记录 ====================");
        
        LocalDate today = LocalDate.now();
        // 删除今天之前的手动添加记录
        LocalDateTime cutoffTime = today.atStartOfDay();
        
        try {
            int deletedCount = dietRecordRepository.deleteByRecordedAtBefore(cutoffTime);
            log.info("成功清理 {} 条历史饮食记录", deletedCount);
        } catch (Exception e) {
            log.error("清理历史饮食记录失败: {}", e.getMessage(), e);
        }
        
        log.info("==================== 历史饮食记录清理完成 ====================");
    }
    
    /**
     * 测试用：每分钟执行一次（用于开发测试）
     * 生产环境请注释掉此方法
     */
    // @Scheduled(cron = "0 * * * * ?")
    public void generateDailyPlansTest() {
        log.info("[测试] 执行计划生成任务");
        generateDailyPlans();
    }
}

