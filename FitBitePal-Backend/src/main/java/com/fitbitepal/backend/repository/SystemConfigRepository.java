package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.SystemConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemConfigRepository extends JpaRepository<SystemConfig, Long> {
    
    // 按配置键查找
    Optional<SystemConfig> findByConfigKey(String configKey);
    
    // 按分类查找
    List<SystemConfig> findByCategory(String category);
    
    // 检查配置键是否存在
    boolean existsByConfigKey(String configKey);
}

