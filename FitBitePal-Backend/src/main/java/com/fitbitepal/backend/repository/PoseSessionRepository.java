package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.PoseSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PoseSession p where p.sessionId = :id")
    Optional<PoseSession> findForUpdate(@Param("id") String id);

    @Modifying
    @Query("delete from PoseSession p where p.state in :drafts and p.createdAt < :cutoff")
    int deleteExpiredDrafts(@Param("drafts") List<PoseSession.State> drafts, @Param("cutoff") LocalDateTime cutoff);
    
    /**
     * 根据用户ID查询所有训练会话
     * 按训练日期倒序排列
     * 
     * @param userId 用户ID
     * @return 会话列表
     */
    @Query("select p from PoseSession p where p.userId = :userId and (p.state is null or p.state = :saved) order by p.trainingDate desc")
    List<PoseSession> findHistory(@Param("userId") Long userId, @Param("saved") PoseSession.State saved);
    
    @Modifying
    @Query("delete from PoseSession r where r.userId = ?1")
    void deleteByUserId(Long userId);
}
