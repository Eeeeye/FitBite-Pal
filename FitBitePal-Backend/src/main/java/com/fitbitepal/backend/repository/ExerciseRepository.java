package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 运动库数据访问接口
 */
@Repository
public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
    
    /**
     * 根据运动名称查找
     */
    Optional<Exercise> findByName(String name);
    
    /**
     * 根据运动名称模糊查找
     */
    List<Exercise> findByNameContainingIgnoreCase(String keyword);
    
    /**
     * 根据分类查找
     */
    List<Exercise> findByCategory(String category);
    
    /**
     * 根据锻炼部位查找
     */
    List<Exercise> findByBodyPart(String bodyPart);
    
    /**
     * 根据难度查找
     */
    List<Exercise> findByDifficulty(String difficulty);
    
    /**
     * 根据器械类型查找
     */
    List<Exercise> findByEquipment(String equipment);
    
    /**
     * 查找所有启用的运动
     */
    List<Exercise> findByEnabledTrue();
    
    /**
     * 综合筛选
     */
    @Query("SELECT e FROM Exercise e WHERE " +
           "(:category IS NULL OR e.category = :category) AND " +
           "(:bodyPart IS NULL OR e.bodyPart = :bodyPart) AND " +
           "(:difficulty IS NULL OR e.difficulty = :difficulty) AND " +
           "(:equipment IS NULL OR e.equipment = :equipment) AND " +
           "e.enabled = true")
    List<Exercise> findByFilters(String category, String bodyPart, String difficulty, String equipment);
    
    /**
     * 获取所有分类
     */
    @Query("SELECT DISTINCT e.category FROM Exercise e WHERE e.enabled = true")
    List<String> findAllCategories();
    
    /**
     * 获取所有锻炼部位
     */
    @Query("SELECT DISTINCT e.bodyPart FROM Exercise e WHERE e.enabled = true")
    List<String> findAllBodyParts();
    
    /**
     * 获取所有难度等级
     */
    @Query("SELECT DISTINCT e.difficulty FROM Exercise e WHERE e.enabled = true")
    List<String> findAllDifficulties();
}

