package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.User;
import org.springframework.stereotype.Service;

/**
 * AI计算服务 - 根据用户数据计算健康指标
 */
@Service
public class AICalculationService {
    
    /**
     * 计算用户健康指标
     */
    public void calculateHealthMetrics(User user) {
        // 1. 计算BMI
        double bmi = calculateBMI(user.getWeight(), user.getHeight());
        user.setBmi(Math.round(bmi * 10.0) / 10.0);
        
        // 2. 估算体脂率
        double bodyFatRate = calculateBodyFatRate(bmi, user.getAge(), user.getGender());
        user.setBodyFatRate(Math.round(bodyFatRate * 10.0) / 10.0);
        
        // 3. 计算基础代谢率(BMR)
        int bmr = calculateBMR(user.getWeight(), user.getHeight(), user.getAge(), user.getGender());
        user.setBmr(bmr);
        
        // 4. 计算总消耗(TDEE)
        int tdee = calculateTDEE(bmr, user.getActivityLevel());
        user.setTdee(tdee);
        
        // 5. 根据目标调整热量
        int targetCalories = calculateTargetCalories(tdee, user.getGoal());
        user.setTargetCalories(targetCalories);
        
        // 6. 计算三大营养素
        MacroNutrients macros = calculateMacroNutrients(
                user.getWeight(), targetCalories, user.getGoal());
        user.setRecommendedProtein(macros.protein);
        user.setRecommendedCarbs(macros.carbs);
        user.setRecommendedFat(macros.fat);
    }
    
    /**
     * 计算BMI
     * BMI = 体重(kg) / 身高(m)²
     */
    private double calculateBMI(double weightKg, double heightCm) {
        double heightM = heightCm / 100.0;
        return weightKg / (heightM * heightM);
    }
    
    /**
     * 估算体脂率
     * 简化公式: 1.20 × BMI + 0.23 × 年龄 - 性别系数
     */
    private double calculateBodyFatRate(double bmi, int age, String gender) {
        double bodyFatRate;
        if ("Male".equalsIgnoreCase(gender)) {
            bodyFatRate = 1.20 * bmi + 0.23 * age - 16.2;
        } else {
            bodyFatRate = 1.20 * bmi + 0.23 * age - 5.4;
        }
        // 限制在5-50%范围
        return Math.max(5.0, Math.min(50.0, bodyFatRate));
    }
    
    /**
     * 计算基础代谢率(BMR) - 使用Mifflin-St Jeor公式
     * 男性: BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 + 5
     * 女性: BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 - 161
     */
    private int calculateBMR(double weightKg, double heightCm, int age, String gender) {
        double bmr;
        if ("Male".equalsIgnoreCase(gender)) {
            bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
        } else {
            bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
        }
        return (int) Math.round(bmr);
    }
    
    /**
     * 计算总消耗(TDEE) - BMR × 活动系数
     */
    private int calculateTDEE(int bmr, String activityLevel) {
        double activityFactor;
        switch (activityLevel) {
            case "Beginner":
                activityFactor = 1.2;  // 久坐
                break;
            case "Intermediate":
                activityFactor = 1.55; // 中等活动
                break;
            case "Advanced":
                activityFactor = 1.725; // 高活动
                break;
            default:
                activityFactor = 1.55;
        }
        return (int) Math.round(bmr * activityFactor);
    }
    
    /**
     * 根据目标调整热量
     */
    private int calculateTargetCalories(int tdee, String goal) {
        switch (goal) {
            case "Lose weight":
                return tdee - 500; // 减脂: 每日赤字500卡
            case "Gain more flexible":
                return tdee + 300; // 增肌: 每日盈余300卡
            case "Get fitter":
            default:
                return tdee; // 保持
        }
    }
    
    /**
     * 计算三大营养素推荐
     */
    private MacroNutrients calculateMacroNutrients(double weightKg, int targetCalories, String goal) {
        MacroNutrients macros = new MacroNutrients();
        
        // 蛋白质: 减脂2.2g/kg, 其他1.8g/kg
        double proteinPerKg = "Lose weight".equals(goal) ? 2.2 : 1.8;
        macros.protein = (int) Math.round(weightKg * proteinPerKg);
        
        // 蛋白质热量 (1g = 4卡)
        int proteinCalories = macros.protein * 4;
        
        // 脂肪占25%
        int fatCalories = (int) (targetCalories * 0.25);
        macros.fat = fatCalories / 9; // 1g脂肪 = 9卡
        
        // 剩余热量分配给碳水
        int carbsCalories = targetCalories - proteinCalories - fatCalories;
        macros.carbs = carbsCalories / 4; // 1g碳水 = 4卡
        
        return macros;
    }
    
    /**
     * 内部类 - 三大营养素
     */
    private static class MacroNutrients {
        int protein;
        int carbs;
        int fat;
    }
}

