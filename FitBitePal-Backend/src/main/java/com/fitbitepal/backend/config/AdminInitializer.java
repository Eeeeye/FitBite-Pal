package com.fitbitepal.backend.config;

import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 管理员账户初始化器
 * 应用启动时自动创建管理员账户
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1) // 确保在其他初始化器之前执行
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // 管理员默认账户信息
    private static final String ADMIN_USERNAME = "admin";
    @Value("${FITBITE_ADMIN_PASSWORD:}")
    private String bootstrapPassword;
    @Value("${FITBITE_ADMIN_EMAIL:}")
    private String bootstrapEmail;

    @Override
    public void run(String... args) {
        if (!bootstrapPassword.isBlank()) {
            initializeAdminAccount();
        }
    }

    private void initializeAdminAccount() {
        // 检查管理员账户是否已存在
        if (userRepository.findByUsername(ADMIN_USERNAME).isPresent()) {
            log.info("✅ 管理员账户已存在");
            return;
        }

        if (bootstrapEmail.isBlank()) {
            throw new IllegalStateException("Set FITBITE_ADMIN_EMAIL to provision the administrator");
        }
        
        User admin = new User();
        admin.setUsername(ADMIN_USERNAME);
        admin.setEmail(bootstrapEmail);
        admin.setPassword(passwordEncoder.encode(bootstrapPassword));
        admin.setRole("ADMIN");
        admin.setGender("Male");
        admin.setAge(30);
        admin.setHeight(175.0);
        admin.setWeight(70.0);
        admin.setGoal("Keep fit");
        admin.setActivityLevel("Advanced");
        admin.setTrainingDuration(60);
        admin.setTrainingArea("Full body");
        admin.setTrainingIntensity("Advanced");
        admin.setBmr(1700);
        admin.setTdee(2500);
        admin.setTargetCalories(2000);
        
        userRepository.save(admin);
        
        log.info("✅ 管理员账户创建成功");
        log.info("   用户名: {}", ADMIN_USERNAME);
    }
}

