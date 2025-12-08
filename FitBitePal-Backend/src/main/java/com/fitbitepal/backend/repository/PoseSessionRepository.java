package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.PoseSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 姿态识别训练会话仓库
 * 
 * @author FitBitePal Team
 */
@Repository
public interface PoseSessionRepository extends JpaRepository<PoseSession, Long> {
    
    /**
     * 根据会话ID查询
     * 
     * @param sessionId 会话ID
     * @return 会话实体
     */
    Optional<PoseSession> findBySessionId(String sessionId);
    
    /**
     * 根据用户ID查询所有训练会话
     * 按训练日期倒序排列
     * 
     * @param userId 用户ID
     * @return 会话列表
     */
    @Query("SELECT p FROM PoseSession p WHERE p.userId = :userId ORDER BY p.trainingDate DESC")
    List<PoseSession> findByUserIdOrderByTrainingDateDesc(@Param("userId") Long userId);
    
    /**
     * 根据用户ID和运动名称查询
     * 
     * @param userId 用户ID
     * @param exerciseName 运动名称
     * @return 会话列表
     */
    List<PoseSession> findByUserIdAndExerciseNameOrderByTrainingDateDesc(Long userId, String exerciseName);
}

