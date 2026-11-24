import React, { createContext, useState, useContext, useCallback } from 'react';
import { 
  fetchUserProfile as fetchUserProfileApi,
  fetchTrainingPlan as fetchTrainingPlanApi,
  fetchDietPlan as fetchDietPlanApi,
  fetchDietRecords as fetchDietRecordsApi,
  deleteDietRecord,
  saveUserProfile as saveUserProfileApi,
  updateBasicInfo as updateBasicInfoApi,
} from '../api/user';
import { localDateKey, createScreenReads, applyScreenWrite } from '../utils/screenReads';
import { useAuth } from './AuthContext';

const UserProfileContext = createContext();

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

const emptyProfile = {
  username: '', email: '', phone: '',
  bmi: 0, bodyFatRate: 0, tdee: 0, targetCalories: 0,
  recommendedProtein: 0, recommendedCarbs: 0, recommendedFat: 0,
  height: 0, weight: 0, age: 0, gender: '', goal: '', activityLevel: '',
  trainingDuration: '', trainingIntensity: 'Intermediate', trainingArea: 'Full body',
};

const mapExercise = plan => ({
  ...plan,
  name: plan.exerciseName || plan.name,
  exerciseName: plan.exerciseName || plan.name,
  duration: plan.duration || '30 min',
  calories: plan.calories > 0 ? plan.calories : 150,
  image: plan.imageUrl ? { uri: plan.imageUrl } : null,
  sets: plan.sets || 0,
  reps: plan.reps || 0,
  description: plan.description || '',
});

export const UserProfileProvider = ({ children }) => {
  const { userId } = useAuth();
  const [reads] = useState(createScreenReads);
  const [userProfile, setUserProfile] = useState(emptyProfile);

  // 训练和饮食计划
  const [trainingByDate, setTrainingByDate] = useState({});
  const [dietPlan, setDietPlan] = useState([]);
  
  // 加载状态
  const [loading, setLoading] = useState(false);

  const loadUserProfile = useCallback(async (force = false) => {
    if (force) reads.invalidate('profile');
    try {
      await reads.run('profile', () => fetchUserProfileApi(userId), response => {
        if (!response.success || !response.data) return;
        const present = Object.fromEntries(Object.entries(response.data).filter(([, value]) => value != null));
        setUserProfile({ ...emptyProfile, ...present });
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, [reads, userId]);

  const loadTrainingPlan = useCallback(async (date = localDateKey(), force = false) => {
    const key = 'training:' + date;
    if (force) reads.invalidate(key);
    try {
      await reads.run(key, () => fetchTrainingPlanApi(userId, { date }), response => {
        if (!response.success || !Array.isArray(response.data)) return;
        const plan = response.data.map(mapExercise);
        setTrainingByDate(previous => ({ ...previous, [date]: plan }));
      });
    } catch (error) {
      console.error('Error loading training plan:', error);
    }
  }, [reads, userId]);

  const loadDietPlan = useCallback(async () => {
    const today = localDateKey();
    try {
      await reads.run('diet:' + today, () => Promise.all([
        fetchDietPlanApi(userId),
        fetchDietRecordsApi(userId, today, today),
      ]), ([planResponse, recordsResponse]) => {
        if (today !== localDateKey() || !planResponse.success || !recordsResponse.success) return;

        const plans = (planResponse.data || []).map(plan => ({
          ...plan, meal: plan.mealName || plan.mealType || plan.meal,
          time: plan.mealTime || plan.time, source: 'plan',
          foods: Array.isArray(plan.foods) ? plan.foods : (plan.foods ? [plan.foods] : []),
        }));
        const records = (recordsResponse.data || []).map(record => {
          const recorded = new Date(record.recordedAt);
          const time = recorded.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          return {
            ...record, id: 'record-' + record.id, name: record.foodName, meal: record.foodName,
            mealName: record.foodName, mealType: record.mealType || 'Custom', time, mealTime: time,
            foods: record.foodName, ingredients: record.notes || JSON.stringify([{ name: record.foodName, amount: '' }]),
            isCustom: true, planDate: localDateKey(recorded), source: 'record',
          };
        });
        setDietPlan([...plans, ...records]);
      });
    } catch (error) {
      console.error('Error loading diet plan:', error);
    }
  }, [reads, userId]);

  const updateDietPlan = (update, persisted) => {
    applyScreenWrite(reads, 'diet:' + localDateKey(), () => setDietPlan(update),
      persisted ? loadDietPlan : undefined);
  };

  const addDietItem = meal => {
    const persisted = meal.id != null;
    const id = persisted ? 'record-' + meal.id : 'local-' + Date.now();
    updateDietPlan(items => [...items.filter(item => item.id !== id), { ...meal, id }], persisted);
  };

  const removeDietItem = async meal => {
    const recordId = String(meal.id ?? '').replace(/^record-/, '');
    const persisted = meal.source === 'record' && /^\d+$/.test(recordId);
    if (persisted) {
      const response = await deleteDietRecord(recordId);
      if (!response.success) throw new Error(response.message || 'Could not delete meal');
    }
    updateDietPlan(items => items.filter(item => item !== meal &&
      !(meal.id != null && item.id === meal.id && item.source === meal.source)), persisted);
  };

  const saveProfile = async (profileData) => {
    if (!userId) return { success: false, message: 'User not logged in' };
    
    try {
      setLoading(true);
      
      // ✅ 确保数据类型正确，防止调用者忘记转换
      const sanitizedData = {
        ...profileData,
      };
      
      // 转换数字字段
      if (sanitizedData.age !== undefined) {
        sanitizedData.age = parseInt(sanitizedData.age);
      }
      if (sanitizedData.height !== undefined) {
        sanitizedData.height = parseFloat(sanitizedData.height);
      }
      if (sanitizedData.weight !== undefined) {
        sanitizedData.weight = parseFloat(sanitizedData.weight);
      }
      if (sanitizedData.trainingDuration !== undefined) {
        sanitizedData.trainingDuration = parseInt(sanitizedData.trainingDuration);
      }
      
      const response = await saveUserProfileApi(userId, sanitizedData);
      
      if (response.success) {
        setUserProfile(prev => ({
          ...prev,
          ...sanitizedData,
        }));
        
        // 重新加载计划
        await Promise.all([loadTrainingPlan(localDateKey(), true), loadUserProfile(true)]);
      }
      
      return response;
    } catch (error) {
      console.error('Error saving profile:', error);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateBasicInfo = async (basicInfo) => {
    if (!userId) return { success: false, message: 'User not logged in' };
    
    try {
      setLoading(true);
      const response = await updateBasicInfoApi(userId, basicInfo);
      
      if (response.success) {
        setUserProfile(prev => ({
          ...prev,
          ...basicInfo,
        }));
      }
      
      return response;
    } catch (error) {
      console.error('Error updating basic info:', error);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    userProfile,
    setUserProfile, // ✅ 导出用于前端本地状态更新
    trainingByDate,
    dietPlan,
    addDietItem,
    removeDietItem,
    loading,
    loadUserProfile,
    loadTrainingPlan,
    loadDietPlan,
    saveProfile,
    updateBasicInfo,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

