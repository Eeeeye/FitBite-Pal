package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;
import org.springframework.data.domain.Pageable;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    @Query("select max(u.id) from User u")
    Long lastId();

    @Query("select u.id from User u where u.id > :after and u.id <= :last order by u.id")
    List<Long> nextIds(@Param("after") long after, @Param("last") long last, Pageable limit);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findForUpdate(@Param("id") Long id);

    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByUsernameOrEmail(String username, String email);
    
    Boolean existsByUsername(String username);
    
    Boolean existsByEmail(String email);

    org.springframework.data.domain.Page<User> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(
            String username, String email, org.springframework.data.domain.Pageable page);

    @Query("""
            select new com.fitbitepal.backend.dto.DailyCount(cast(u.createdAt as LocalDate), count(u.id))
            from User u where u.createdAt >= ?1 and u.createdAt < ?2 group by cast(u.createdAt as LocalDate)
            """)
    java.util.List<com.fitbitepal.backend.dto.DailyCount> registrationsByDate(
            java.time.LocalDateTime start, java.time.LocalDateTime end);
}
