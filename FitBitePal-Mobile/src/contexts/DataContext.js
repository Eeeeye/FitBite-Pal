import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchWeightRecords as fetchWeightRecordsApi,
  fetchLiveCalorieRecords,
  fetchStatistics as fetchStatisticsApi,
  addWeightRecord as addWeightRecordApi,
  addCalorieRecord as addCalorieRecordApi,
  fetchCompletionRecords as fetchCompletionRecordsApi,
  saveCompletion as saveCompletionApi,
  saveCheckIn as saveCheckInApi,
  getCheckInHistory as getCheckInHistoryApi,
} from '../api/user';
import { createScreenReads, applyScreenWrite, localDateKey as getDateKey } from '../utils/screenReads';
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
  const { userId } = useAuth();
  const [reads] = useState(createScreenReads);
  const [pendingWrites] = useState(() => new Map());

  // 训练和餐次完成状态
  const [completedExercises, setCompletedExercises] = useState({});
  const [completedMeals, setCompletedMeals] = useState({});

  // 日期状态
  const [currentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 打卡状态
  const [checkedInDates, setCheckedInDates] = useState(null);
  useEffect(() => {
    if (checkedInDates !== null) {
      AsyncStorage.setItem('checkInDates_' + userId, JSON.stringify(checkedInDates))
        .catch(error => console.warn('Check-in cache:', error));
    }
  }, [userId, checkedInDates]);

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

  const loadCompletionRecords = useCallback(async (date, type) => {
    const setRecords = type === 'exercise' ? setCompletedExercises : setCompletedMeals;
    try {
      await reads.run(type + ':' + date, () => fetchCompletionRecordsApi(userId, date, type), response => {
        if (!response.success || !Array.isArray(response.data)) return;
        const checked = Object.fromEntries(response.data.map(item => [item.itemIndex, item.completed]));
        for (const { data } of pendingWrites.values()) {
          if (data.date === date && data.itemType === type) checked[data.itemIndex] = data.completed;
        }
        setRecords(previous => ({ ...previous, [date]: checked }));
      });
    } catch (error) {
      console.error('Error loading completion records:', error);
    }
  }, [reads, pendingWrites, userId]);

  const loadCheckInStatus = useCallback(async () => {
    const storageKey = 'checkInDates_' + userId;
    try {
      await reads.run('check-ins', async () => {
        try {
          const response = await getCheckInHistoryApi(userId, 16);
          if (!response.success || !Array.isArray(response.data)) throw new Error('Check-in history unavailable');
          return { dates: Object.fromEntries(response.data.map(day => [day, true])) };
        } catch (error) {
          const saved = await AsyncStorage.getItem(storageKey);
          if (!saved) throw error;
          return { dates: JSON.parse(saved), cached: true };
        }
      }, ({ dates, cached }) => setCheckedInDates(previous => cached ? { ...dates, ...previous } : dates));
    } catch (error) {
      console.warn('Error reading check-in history:', error);
    }
  }, [reads, userId]);

  const loadWeightRecords = useCallback(async (days = 7) => {
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
  }, [userId]);

  const loadCalorieRecords = useCallback(async (days = 7) => {
    const end = getDateKey();
    try {
      await reads.run('calories:' + end + ':' + days,
        () => fetchLiveCalorieRecords(userId, days, end),
        response => {
          if (response.success && Array.isArray(response.data)) setCalorieRecords(response.data);
        });
    } catch (error) {
      console.error('Error loading calorie records:', error);
    }
  }, [reads, userId]);

  const loadStatistics = useCallback(async (days = 7) => {
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
  }, [userId]);

  const saveCompletion = async (data) => {
    const day = data.itemType + ':' + data.date;
    const id = day + ':' + data.itemIndex;
    const setRecords = data.itemType === 'exercise' ? setCompletedExercises : setCompletedMeals;
    const previous = pendingWrites.get(id);
    const values = data.itemType === 'exercise' ? completedExercises : completedMeals;
    const confirmed = previous?.confirmed || { value: Boolean(values[data.date]?.[data.itemIndex]) };
    const post = async () => {
      const response = await saveCompletionApi(data);
      if (response.success) confirmed.value = data.completed;
      return response;
    };
    const promise = previous ? previous.promise.then(post, post) : post();
    pendingWrites.set(id, { data, promise, confirmed });
    reads.invalidate(day);
    setRecords(rows => ({ ...rows, [data.date]: { ...rows[data.date], [data.itemIndex]: data.completed } }));
    try {
      const response = await promise;
      if (!response.success) throw new Error(response.message || 'Could not save completion');
      return response;
    } catch (error) {
      if (pendingWrites.get(id)?.promise === promise) {
        pendingWrites.delete(id);
        reads.invalidate(day);
        setRecords(rows => ({ ...rows, [data.date]: { ...rows[data.date], [data.itemIndex]: confirmed.value } }));
        await loadCompletionRecords(data.date, data.itemType);
      }
      return { success: false, message: error.message };
    } finally {
      if (pendingWrites.get(id)?.promise === promise) {
        pendingWrites.delete(id);
        reads.invalidate(day);
      }
    }
  };

  const saveCheckIn = async (date, measurements = {}) => {
    if (!userId) return { success: false, message: '用户未登录' };
    try {
      const response = await saveCheckInApi(userId, { ...measurements, date });
      if (response.data?.checkedIn || response.data?.alreadyCheckedIn) {
        applyScreenWrite(reads, 'check-ins',
          () => setCheckedInDates(previous => ({ ...previous, [date]: true })), loadCheckInStatus);
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
    loadCompletionRecords,
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
    checkedInDates: checkedInDates ?? {},
    loadCheckInStatus,
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
    
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

