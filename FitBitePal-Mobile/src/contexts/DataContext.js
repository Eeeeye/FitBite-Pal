import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchWeightRecords as fetchWeightRecordsApi,
  fetchCalorieRecords as fetchCalorieRecordsApi,
  fetchStatistics as fetchStatisticsApi,
  addWeightRecord as addWeightRecordApi,
  addCalorieRecord as addCalorieRecordApi,
  fetchCompletionRecords as fetchCompletionRecordsApi,
  saveCompletion as saveCompletionApi,
  saveCheckIn as saveCheckInApi,
  getCheckInStatus as getCheckInStatusApi,
  getCheckInHistory as getCheckInHistoryApi,
  fetchUserProfile as fetchUserProfileApi,
} from '../api/user';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { userId, isAuthenticated, isAdmin } = useAuth(); // ✨ 添加 isAdmin

  // 训练和餐次完成状态
  const [completedExercises, setCompletedExercises] = useState({});
  const [completedMeals, setCompletedMeals] = useState({});

  // 日期状态
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 打卡状态
  const [checkedInDates, setCheckedInDates] = useState({});

  // 统计数据
  const [weightRecords, setWeightRecords] = useState([]);
  const [calorieRecords, setCalorieRecords] = useState([]);
  const [statsData, setStatsData] = useState({
    currentWeight: 0,
    weightChange: 0,
    bodyFat: 0,
    bodyFatChange: 0,
    avgCalorieBurn: 0,
    nutritionScore: 0,
    nutritionScoreChange: 0,
    goalWeight: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // ✨ 辅助函数：格式化日期为 YYYY-MM-DD（与 App1.js 一致）
  const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 当用户登录后加载数据
  useEffect(() => {
    // ⚠️ 关键修复：管理员账号不加载用户数据
    if (isAuthenticated && userId && !isAdmin) {
      loadAllData();
    } else if (!isAuthenticated || !userId || isAdmin) {
      // ✅ 关键修复：用户退出登录、切换账户或管理员登录时，清空所有状态
      setCompletedExercises({});
      setCompletedMeals({});
      setCheckedInDates({});
      setWeightRecords([]);
      setCalorieRecords([]);
      setStatsData({
        currentWeight: 0,
        weightChange: 0,
        bodyFat: 0,
        bodyFatChange: 0,
        avgCalorieBurn: 0,
        nutritionScore: 0,
        nutritionScoreChange: 0,
        goalWeight: 0,
      });
      setCurrentDate(new Date());
      setSelectedDate(new Date());
    }
  }, [isAuthenticated, userId, isAdmin]); // ✨ 添加 isAdmin 依赖

  const loadAllData = async () => {
    await Promise.all([
      loadCompletionRecords(),
      loadCheckInStatus(),
      loadWeightRecords(),
      loadCalorieRecords(),
      loadStatistics(),
    ]);
  };

  const loadCompletionRecords = async () => {
    if (!userId) return;

    try {
      // ✨ 修正：加载所有历史完成记录（不限制日期）
      // 这样用户查看历史日期时也能看到勾选状态
      
      // 加载所有运动完成记录（不传日期参数）
      const exerciseResponse = await fetchCompletionRecordsApi(userId, null, 'exercise');
      const exercisesMap = {};
      
      if (exerciseResponse.success && Array.isArray(exerciseResponse.data)) {
        exerciseResponse.data.forEach(record => {
          // 使用 recordDate 字段（后端返回的日期字段）
          // 注意：后端返回的可能是数组格式 [2025, 11, 20] 或字符串 "2025-11-20"
          let dateKey = record.recordDate || record.date;
          
          // 如果是数组格式，转换为字符串
          if (Array.isArray(dateKey)) {
            dateKey = `${dateKey[0]}-${String(dateKey[1]).padStart(2, '0')}-${String(dateKey[2]).padStart(2, '0')}`;
          }
          
          if (dateKey) {
            if (!exercisesMap[dateKey]) exercisesMap[dateKey] = {};
            exercisesMap[dateKey][record.itemIndex] = record.completed;
          }
        });
      }
      
      // 加载所有饮食完成记录（不传日期参数）
      const mealResponse = await fetchCompletionRecordsApi(userId, null, 'meal');
      const mealsMap = {};
      
      if (mealResponse.success && Array.isArray(mealResponse.data)) {
        mealResponse.data.forEach(record => {
          let dateKey = record.recordDate || record.date;
          
          // 如果是数组格式，转换为字符串
          if (Array.isArray(dateKey)) {
            dateKey = `${dateKey[0]}-${String(dateKey[1]).padStart(2, '0')}-${String(dateKey[2]).padStart(2, '0')}`;
          }
          
          if (dateKey) {
            if (!mealsMap[dateKey]) mealsMap[dateKey] = {};
            mealsMap[dateKey][record.itemIndex] = record.completed;
          }
        });
      }

      setCompletedExercises(exercisesMap);
      setCompletedMeals(mealsMap);
    } catch (error) {
      console.error('❌ Error loading completion records:', error);
    }
  };

  const loadCheckInStatus = async () => {
    if (!userId) return;

    try {
      // ✅ 修改：从后端API获取所有历史打卡记录（不再依赖本地缓存）
      const response = await getCheckInHistoryApi(userId);
      
      if (response.success && Array.isArray(response.data)) {
        // 将日期数组转换为 { "2025-11-20": true, "2025-11-25": true } 格式
        const checkInMap = {};
        response.data.forEach(dateStr => {
          checkInMap[dateStr] = true;
        });
        
        setCheckedInDates(checkInMap);
        
        // 同时保存到 AsyncStorage 作为备份缓存
        await AsyncStorage.setItem(`checkInDates_${userId}`, JSON.stringify(checkInMap));
      } else {
        // 如果后端请求失败，尝试从本地缓存加载
        const storedCheckIns = await AsyncStorage.getItem(`checkInDates_${userId}`);
        if (storedCheckIns) {
          setCheckedInDates(JSON.parse(storedCheckIns));
        }
      }
    } catch (error) {
      console.error('Error loading check-in history:', error);
      // 失败时尝试从本地缓存加载
      try {
        const storedCheckIns = await AsyncStorage.getItem(`checkInDates_${userId}`);
        if (storedCheckIns) {
          setCheckedInDates(JSON.parse(storedCheckIns));
        }
      } catch (e) {
        console.error('Error loading from AsyncStorage:', e);
      }
    }
  };

  /**
   * 加载体重记录（重构版 - 从User表获取最新体重）
   * 后端已删除WeightRecord表，体重数据统一存储在User表中
   * fetchWeightRecordsApi 现在返回：[{ date: "2024-01-01", weight: 70.0 }, ...]
   * 注意：所有记录显示的都是User表中的当前体重（无历史追踪）
   */
  const loadWeightRecords = async (days = 7) => {
    if (!userId) return;

    try {
      const response = await fetchWeightRecordsApi(userId, days);
      if (response.success && Array.isArray(response.data)) {
        // ✅ 新的返回格式：[{ date: "2024-01-01", weight: 70.0 }, ...]
        setWeightRecords(response.data);
      }
    } catch (error) {
      console.error('Error loading weight records:', error);
    }
  };

  const loadCalorieRecords = async (days = 7) => {
    if (!userId) return;

    try {
      // ✨ 首先获取用户资料以获取真实的BMR
      let userBmr = 1500; // 默认值
      try {
        const profileResponse = await fetchUserProfileApi(userId);
        if (profileResponse.success && profileResponse.data && profileResponse.data.bmr) {
          userBmr = profileResponse.data.bmr;
        }
      } catch (profileError) {
        // 使用默认BMR
      }

      // ✨ 根据完成记录计算卡路里数据
      const result = [];
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        const dateKey = getDateKey(targetDate);
        
        // 从后端获取运动完成记录
        const exerciseResponse = await fetchCompletionRecordsApi(userId, dateKey, 'exercise');
        
        let exerciseCalories = 0;
        if (exerciseResponse.success && exerciseResponse.data) {
          const completedExercises = exerciseResponse.data.filter(record => record.completed);
          exerciseCalories = completedExercises.reduce((sum, record) => sum + (record.calories || 0), 0);
        }
        
        // 从后端获取饮食完成记录
        const mealResponse = await fetchCompletionRecordsApi(userId, dateKey, 'meal');
        
        let intake = 0;
        if (mealResponse.success && mealResponse.data) {
          const completedMeals = mealResponse.data.filter(record => record.completed);
          intake = completedMeals.reduce((sum, record) => sum + (record.calories || 0), 0);
        }
        
        result.push({
          date: dateKey,
          intake,
          baseMetabolism: userBmr,  // ✅ 使用用户真实的BMR
          exerciseCalories,
          expenditure: userBmr + exerciseCalories
        });
      }
      
      setCalorieRecords(result);

    } catch (error) {
      console.error('Error loading calorie records:', error);
    }
  };

  /**
   * 加载统计数据（重构版 - 从User表获取）
   * 后端统计接口已重构，体重等身体数据统一从User表获取
   */
  const loadStatistics = async (days = 7) => {
    if (!userId) return;

    try {
      setLoadingStats(true);
      const response = await fetchStatisticsApi(userId, days);
      if (response.success && response.data) {
        // ✅ 统计数据中的currentWeight等字段来自User表（唯一数据源）
        setStatsData(response.data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const saveCompletion = async (data) => {
    if (!userId) return { success: false };

    try {
      // ✨ 修正：直接传递完整的 data 对象到 API（与 App1.js 一致）
      const response = await saveCompletionApi(data);

      if (response.success) {
        // 更新本地状态（使用 itemType 字段）
        if (data.itemType === 'exercise') {
          setCompletedExercises(prev => ({
            ...prev,
            [data.date]: {
              ...prev[data.date],
              [data.itemIndex]: data.completed,
            },
          }));
        } else if (data.itemType === 'meal') {
          setCompletedMeals(prev => ({
            ...prev,
            [data.date]: {
              ...prev[data.date],
              [data.itemIndex]: data.completed,
            },
          }));
        }
      }

      return response;
    } catch (error) {
      console.error('Error saving completion:', error);
      return { success: false, message: error.message };
    }
  };

  const saveCheckIn = async (date) => {
    if (!userId) return { success: false, message: '用户未登录' };

    try {
      // 发送正确格式的数据
      const response = await saveCheckInApi(userId, { date });

      // 无论是否重复，只要后端表示这一天已打卡，就更新本地状态
      if (response.success || (response.data && response.message && response.message.includes('Duplicate'))) {
        const newCheckedInDates = {
          ...checkedInDates,
          [date]: true,
        };
        
        setCheckedInDates(newCheckedInDates);
        
        // ✅ 持久化保存到 AsyncStorage
        await AsyncStorage.setItem(`checkInDates_${userId}`, JSON.stringify(newCheckedInDates));
      }

      return response;
    } catch (error) {
      console.error('Error saving check-in:', error);
      return { success: false, message: error.message || '打卡失败' };
    }
  };

  const addWeightRecord = async (weight, date) => {
    if (!userId) return { success: false };

    try {
      const response = await addWeightRecordApi(userId, weight, date);

      if (response.success) {
        await loadWeightRecords();
        await loadStatistics();
      }

      return response;
    } catch (error) {
      console.error('Error adding weight record:', error);
      return { success: false, message: error.message };
    }
  };

  const addCalorieRecord = async (calories, date, source) => {
    if (!userId) return { success: false };

    try {
      const response = await addCalorieRecordApi(userId, calories, date, source);

      if (response.success) {
        await loadCalorieRecords();
        await loadStatistics();
      }

      return response;
    } catch (error) {
      console.error('Error adding calorie record:', error);
      return { success: false, message: error.message };
    }
  };

  // 标记训练项完成的便捷方法
  const markExerciseComplete = async (exerciseId, exerciseName, calories = 0) => {
    if (!userId) return { success: false };
    
    const today = getDateKey(new Date());
    
    // ✨ 修正：传递正确的数据对象格式（与App1.js一致）
    return await saveCompletion({
      userId,
      date: today,
      itemType: 'exercise',
      itemIndex: exerciseId || 0,
      completed: true,
      itemName: exerciseName || 'Exercise',
      calories: calories || 0,
    });
  };

  // 标记餐次完成的便捷方法
  const markMealComplete = async (mealId, mealName, calories = 0) => {
    if (!userId) return { success: false };
    
    const today = getDateKey(new Date());
    
    // ✨ 修正：传递正确的数据对象格式（与App1.js一致）
    return await saveCompletion({
      userId,
      date: today,
      itemType: 'meal',
      itemIndex: mealId || 0,
      completed: true,
      itemName: mealName || 'Meal',
      calories: calories || 0,
    });
  };

  const value = {
    // 工具函数
    getDateKey,  // ✨ 新增：导出日期格式化函数
    
    // 完成状态
    completedExercises,
    setCompletedExercises,
    completedMeals,
    setCompletedMeals,
    saveCompletion,
    markExerciseComplete,
    markMealComplete,

    // 日期
    currentDate,
    selectedDate,
    setSelectedDate,

    // 打卡
    checkedInDates,
    setCheckedInDates,  // ✨ 新增：导出打卡状态设置函数
    saveCheckIn,

    // 统计数据
    weightRecords,
    calorieRecords,
    statsData,
    loadingStats,
    addWeightRecord,
    addCalorieRecord,
    loadWeightRecords,
    loadCalorieRecords,
    loadStatistics,
    
    // 刷新所有数据
    refreshData: loadAllData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

