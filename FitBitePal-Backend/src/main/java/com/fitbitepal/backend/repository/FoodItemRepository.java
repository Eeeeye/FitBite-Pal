package com.fitbitepal.backend.repository;

import com.fitbitepal.backend.model.FoodItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {
    
    // 按分类查找
    List<FoodItem> findByCategoryAndEnabledTrue(String category);
    
    // 按名称模糊查询
    List<FoodItem> findByNameContainingAndEnabledTrue(String name);
    
    // 按关键词搜索
    @Query("SELECT f FROM FoodItem f WHERE f.enabled = true AND " +
           "(f.name LIKE %:keyword% OR f.nameEn LIKE %:keyword% OR f.keywords LIKE %:keyword%)")
    List<FoodItem> searchByKeyword(String keyword);
    
    // 分页查询所有食品
    Page<FoodItem> findByEnabledTrue(Pageable pageable);
    
    // 获取所有分类
    @Query("SELECT DISTINCT f.category FROM FoodItem f WHERE f.category IS NOT NULL")
    List<String> findAllCategories();
    
    // 统计各分类食品数量
    @Query("SELECT f.category, COUNT(f) FROM FoodItem f WHERE f.enabled = true GROUP BY f.category")
    List<Object[]> countByCategory();
    
    // 统计启用的食品数量
    long countByEnabledTrue();
}

