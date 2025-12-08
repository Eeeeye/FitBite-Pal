import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  fetchUserProfile as fetchUserProfileApi,
  fetchTrainingPlan as fetchTrainingPlanApi,
  fetchDietPlan as fetchDietPlanApi,
  fetchDietRecords as fetchDietRecordsApi,
  saveUserProfile as saveUserProfileApi,
  updateBasicInfo as updateBasicInfoApi,
} from '../api/user';
import { useAuth } from './AuthContext';

const UserProfileContext = createContext();

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

export const UserProfileProvider = ({ children }) => {
  const { userId, isAuthenticated, isAdmin } = useAuth(); // ✨ 添加 isAdmin
  
  // 用户资料
  const [userProfile, setUserProfile] = useState({
    // 基本信息
    username: '',
    email: '',
    phone: '',
    // 健康数据
    bmi: 0,
    bodyFatRate: 0,
    tdee: 0,
    targetCalories: 0,
    recommendedProtein: 0,
    recommendedCarbs: 0,
    recommendedFat: 0,
    height: 0,
    weight: 0,
    age: 0,
    gender: '',
    goal: '',
    activityLevel: '',
    trainingDuration: '',
    trainingIntensity: 'Intermediate', // ✅ 前端本地管理，默认值
  });

  // 训练和饮食计划
  const [trainingPlan, setTrainingPlan] = useState([]);
  const [dietPlan, setDietPlan] = useState([]);
  
  // 加载状态
  const [loading, setLoading] = useState(false);

  // 当用户登录后加载用户资料
  useEffect(() => {
    // ⚠️ 关键修复：管理员账号不加载用户数据
    if (isAuthenticated && userId && !isAdmin) {
      // 加载用户画像
      loadUserProfile();
      
      // ✨ 自动刷新训练计划（确保获取最新的4天数据）
      const autoRefresh = async () => {
        await refreshTrainingPlan();
      };
      
      // 延迟1秒后刷新，让用户画像先加载完成
      const timer = setTimeout(autoRefresh, 1000);
      
      // 加载饮食计划
      loadDietPlan();
      
      return () => clearTimeout(timer);
    } else if (!isAuthenticated || !userId || isAdmin) {
      // ✅ 关键修复：用户退出登录、切换账户或管理员登录时，清空所有状态
      setUserProfile({
        // 基本信息
        username: '',
        email: '',
        phone: '',
        // 健康数据
        bmi: 0,
        bodyFatRate: 0,
        tdee: 0,
        targetCalories: 0,
        recommendedProtein: 0,
        recommendedCarbs: 0,
        recommendedFat: 0,
        height: 0,
        weight: 0,
        age: 0,
        gender: '',
        goal: '',
        activityLevel: '',
        trainingDuration: '',
        trainingIntensity: 'Intermediate',
      });
      setTrainingPlan([]);
      setDietPlan([]);
    }
  }, [isAuthenticated, userId, isAdmin]); // ✨ 添加 isAdmin 依赖

  /**
   * 加载用户资料（重构版 - 统一从User表获取）
   * 后端已删除UserProfile表，fetchUserProfileApi现在返回完整的User对象
   * User表是唯一数据源，包含所有用户信息和身体数据
   */
  const loadUserProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await fetchUserProfileApi(userId);
      
      if (response.success && response.data) {
        // 过滤掉 null 值避免覆盖有效数据
        const filteredData = Object.fromEntries(
          Object.entries(response.data).filter(([_, value]) => value != null)
        );
        
        // ✅ 直接替换整个 userProfile，确保 React 检测到状态变化
        setUserProfile({
          // 保持默认值
          username: '',
          email: '',
          phone: '',
          bmi: 0,
          bodyFatRate: 0,
          tdee: 0,
          targetCalories: 0,
          recommendedProtein: 0,
          recommendedCarbs: 0,
          recommendedFat: 0,
          height: 0,
          weight: 0,
          age: 0,
          gender: '',
          goal: '',
          activityLevel: '',
          trainingDuration: '',
          trainingIntensity: 'Intermediate',
          trainingArea: 'Full body',
          // 用后端数据覆盖
          ...filteredData,
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✨ 关键新增：自动检查并生成训练计划
  const checkAndGenerateTrainingPlan = async (userInfo) => {
    if (!userId) return [];
    
    try {
      // ✨ 优化：获取过去15天+今天+明天的训练计划（共17天）
      const today = new Date();
      const dates = [];
      // 过去15天
      for (let i = 15; i >= 1; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
      }
      // 今天+明天
      for (let i = 0; i <= 1; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
      }
      
      // 并行请求4天的数据
      const allResponses = await Promise.all(
        dates.map(date => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          return fetchTrainingPlanApi(userId, { date: dateStr });
        })
      );
      
      // 合并所有天的数据
      const allPlans = allResponses.flatMap(response => 
        (response.success && response.data) ? response.data : []
      );
      
      let trainingResponse = { success: true, data: allPlans };
      
      if (trainingResponse.success && trainingResponse.data) {
        // 如果训练计划少于10个，自动生成
        if (trainingResponse.data.length < 10) {
          // 检查用户信息是否完整
          if (userInfo && userInfo.height && userInfo.weight && userInfo.goal) {
            // 关键修复：强制重新生成
            const currentAge = parseInt(userInfo.age) || 25;
            
            await saveUserProfileApi(userId, {
              gender: userInfo.gender || 'Male',
              age: currentAge, // ✅ 已转换为整数
              height: parseFloat(userInfo.height), // ✅ 转换为浮点数
              weight: parseFloat(userInfo.weight), // ✅ 转换为浮点数
              goal: userInfo.goal,
              activityLevel: userInfo.activityLevel || 'Moderate',
              trainingDuration: parseInt(userInfo.trainingDuration) || 30, // ✅ 转换为整数
              // trainingIntensity 已移除，后端不支持
            });
            
            // 等待一下让后端完成生成
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 重新加载训练计划（不带日期参数，与App1.js一致）
            trainingResponse = await fetchTrainingPlanApi(userId);
          }
        }
        
        // 映射训练计划数据（与App1.js完全一致）
        const mappedTrainingPlan = trainingResponse.data.map(plan => {
          const calories = (plan.calories && plan.calories > 0) ? plan.calories : 150;
          return {
            id: plan.id,
            name: plan.exerciseName || plan.name,
            exerciseName: plan.exerciseName || plan.name,
            duration: plan.duration || '30 min',
            calories: calories,
            image: plan.imageUrl || null,
            sets: plan.sets || 0,
            reps: plan.reps || 0,
            description: plan.description || '',
            dayOfWeek: plan.dayOfWeek,
            planDate: plan.planDate, // ✨ 关键：保留planDate字段用于日期过滤
          };
        });
        
        return mappedTrainingPlan;
      }
      
      return [];
    } catch (error) {
      console.error('检查/生成训练计划失败:', error);
      return [];
    }
  };

  const loadTrainingPlan = async (forceReload = false) => {
    if (!userId) return;
    
    try {
      // 如果forceReload=true，直接从后端获取最新数据
      if (forceReload) {
        setTrainingPlan([]);
        
        // 只请求今天的数据
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const response = await fetchTrainingPlanApi(userId, { date: todayStr });
        
        if (response.success && response.data && response.data.length > 0) {
          const mappedPlan = response.data.map(plan => ({
            id: plan.id,
            name: plan.exerciseName || plan.name,
            exerciseName: plan.exerciseName || plan.name,
            duration: plan.duration || '30 min',
            calories: (plan.calories && plan.calories > 0) ? plan.calories : 150,
            image: plan.imageUrl || null,
            sets: plan.sets || 0,
            reps: plan.reps || 0,
            description: plan.description || '',
            dayOfWeek: plan.dayOfWeek,
            planDate: plan.planDate,
            orderIndex: plan.orderIndex,
          }));
          
          setTrainingPlan(mappedPlan);
        } else {
          // 如果今天没有计划，获取所有日期的计划
        const dates = [];
          for (let i = 15; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          dates.push(date);
        }
          dates.push(new Date(today.setDate(today.getDate() + 1)));
        
        const allResponses = await Promise.all(
          dates.map(date => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return fetchTrainingPlanApi(userId, { date: dateStr });
          })
        );
        
          const allPlans = allResponses.flatMap(resp => 
            (resp.success && resp.data) ? resp.data : []
        );
        
        const mappedPlan = allPlans.map(plan => ({
          id: plan.id,
          name: plan.exerciseName || plan.name,
          exerciseName: plan.exerciseName || plan.name,
          duration: plan.duration || '30 min',
          calories: (plan.calories && plan.calories > 0) ? plan.calories : 150,
          image: plan.imageUrl || null,
          sets: plan.sets || 0,
          reps: plan.reps || 0,
          description: plan.description || '',
          dayOfWeek: plan.dayOfWeek,
          planDate: plan.planDate,
            orderIndex: plan.orderIndex,
        }));
        
        setTrainingPlan(mappedPlan);
        }
        return;
      }
      
      // 使用自动检查并生成的函数
      const plan = await checkAndGenerateTrainingPlan(userProfile);
      setTrainingPlan(plan);
    } catch (error) {
      console.error('Error loading training plan:', error);
    }
  };

  // ✨ 新增：清除并重新生成训练计划
  const refreshTrainingPlan = async () => {
    if (!userId) return;
    
    try {
      // 1. 清空前端缓存
      setTrainingPlan([]);
      
      // 2. 强制后端重新生成（通过更新用户资料触发）
      if (userProfile && userProfile.height && userProfile.weight && userProfile.goal) {
        const profileData = {
          gender: userProfile.gender || 'Male',
          age: parseInt(userProfile.age) || 25, // ✅ 转换为整数
          height: parseFloat(userProfile.height), // ✅ 转换为浮点数
          weight: parseFloat(userProfile.weight), // ✅ 转换为浮点数
          goal: userProfile.goal,
          activityLevel: userProfile.activityLevel || 'Moderate',
          trainingDuration: parseInt(userProfile.trainingDuration) || 30, // ✅ 转换为整数
          // trainingIntensity 已移除，后端不支持
        };
        
        await saveUserProfileApi(userId, profileData);
        
        // 等待后端生成
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // 3. 重新加载（请求过去15天+今天+明天的数据）
      const today = new Date();
      const dates = [];
      // 过去15天
      for (let i = 15; i >= 1; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
      }
      // 今天+明天
      for (let i = 0; i <= 1; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date);
      }
      
      // 并行请求4天的数据
      const allResponses = await Promise.all(
        dates.map(date => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          return fetchTrainingPlanApi(userId, { date: dateStr });
        })
      );
      
      // 合并所有天的数据
      const allPlans = allResponses.flatMap(response => 
        (response.success && response.data) ? response.data : []
      );
      
      const freshPlan = { success: true, data: allPlans };
      
      if (freshPlan.success && freshPlan.data) {
        
        // 映射数据
        const mappedPlan = freshPlan.data.map(plan => ({
          id: plan.id,
          name: plan.exerciseName || plan.name,
          exerciseName: plan.exerciseName || plan.name,
          duration: plan.duration || '30 min',
          calories: (plan.calories && plan.calories > 0) ? plan.calories : 150,
          image: plan.imageUrl || null,
          sets: plan.sets || 0,
          reps: plan.reps || 0,
          description: plan.description || '',
          dayOfWeek: plan.dayOfWeek,
          planDate: plan.planDate, // ✨ 关键：保留planDate字段用于日期过滤
          orderIndex: plan.orderIndex, // ✅ 添加 orderIndex 用于完成状态匹配
        }));
        
        setTrainingPlan(mappedPlan);
      }
      
      return { success: true };
    } catch (error) {
      console.error('刷新训练计划失败:', error);
      return { success: false, message: error.message };
    }
  };

  const loadDietPlan = async (forceReload = false) => {
    if (!userId) return;
    
    try {
      // ✨ 如果forceReload=true，先清空计划强制重新生成
      if (forceReload) {
        setDietPlan([]);
      }
      
      // ✅ 同时加载系统生成的饮食计划和用户添加的饮食记录
      const [planResponse, recordsResponse] = await Promise.all([
        fetchDietPlanApi(userId),
        fetchDietRecordsApi(userId), // 获取用户自己添加的食物记录
      ]);
      
      let allDietData = [];
      
      // 处理系统生成的饮食计划
      if (planResponse.success && Array.isArray(planResponse.data) && planResponse.data.length > 0) {
        const mappedDietPlan = planResponse.data.map(plan => ({
          id: plan.id,
          meal: plan.mealName || plan.mealType || plan.meal, // 优先使用 mealName（菜名）
          mealName: plan.mealName || '', // ✅ 新增：菜名字段
          mealType: plan.mealType || plan.meal,
          time: plan.mealTime || plan.time,
          mealTime: plan.mealTime || plan.time,
          foods: Array.isArray(plan.foods) ? plan.foods : (plan.foods ? [plan.foods] : []),
          ingredients: plan.ingredients || null,
          calories: plan.calories || 0,
          protein: plan.protein || 0,
          carbs: plan.carbs || 0,
          fat: plan.fat || 0,
          isCustom: plan.isCustom || false,
          planDate: plan.planDate,
          source: 'plan', // 标记来源
        }));
        allDietData = [...allDietData, ...mappedDietPlan];
      }
      
      // ✅ 处理用户添加的饮食记录（只保留今天的）
      if (recordsResponse.success && Array.isArray(recordsResponse.data) && recordsResponse.data.length > 0) {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const mappedDietRecords = recordsResponse.data
          .filter(record => {
            // 只保留今天的记录
            const recordDate = new Date(record.recordedAt);
            const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
            return recordDateStr === todayStr;
          })
          .map(record => {
            const recordDate = new Date(record.recordedAt);
            const planDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
            
            return {
          id: `record-${record.id}`, // 添加前缀避免ID冲突
              name: record.foodName, // ✅ 关键：添加 name 字段用于显示
          meal: record.foodName,
              mealName: record.foodName, // ✅ 添加 mealName 字段
              foodName: record.foodName, // ✅ 添加 foodName 字段
              mealType: record.mealType || 'Custom',
              time: recordDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
              mealTime: recordDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
              foods: record.foodName,
              ingredients: record.notes || JSON.stringify([{ name: record.foodName, amount: '' }]),
          calories: record.calories || 0,
          protein: record.protein || 0,
          carbs: record.carbs || 0,
          fat: record.fat || 0,
          isCustom: true,
          recordedAt: record.recordedAt,
              planDate: planDateStr, // ✅ 添加 planDate 用于统一过滤
          source: 'record', // 标记来源
            };
          });
        allDietData = [...allDietData, ...mappedDietRecords];
      }
      
      // ✅ 如果有数据，设置到状态中
      if (allDietData.length > 0) {
        setDietPlan(allDietData);
      } else {
        // ✨ 如果没有任何饮食数据，尝试自动生成系统计划
        const userInfoResponse = await fetchUserProfileApi(userId);
        if (userInfoResponse.success && userInfoResponse.data) {
          const userInfo = userInfoResponse.data;
          
          if (userInfo.weight && userInfo.height && userInfo.age && userInfo.gender && userInfo.goal) {
            // 触发保存用户资料API，这会自动生成饮食计划
            await saveUserProfileApi(userId, {
              weight: parseFloat(userInfo.weight),
              height: parseFloat(userInfo.height),
              age: parseInt(userInfo.age),
              gender: userInfo.gender,
              goal: userInfo.goal,
              activityLevel: userInfo.activityLevel || 'moderate',
              trainingDuration: parseInt(userInfo.trainingDuration) || 30
            });
            
            // 等待后端生成
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 重新加载
            const newDietResponse = await fetchDietPlanApi(userId);
            if (newDietResponse.success && newDietResponse.data) {
              const mappedDietPlan = newDietResponse.data.map(plan => ({
                id: plan.id,
                meal: plan.mealType || plan.meal,
                mealType: plan.mealType || plan.meal,
                time: plan.mealTime || plan.time,
                mealTime: plan.mealTime || plan.time,
                foods: Array.isArray(plan.foods) ? plan.foods : (plan.foods ? [plan.foods] : []),
                ingredients: plan.ingredients || null,
                calories: plan.calories || 0,
                protein: plan.protein || 0,
                carbs: plan.carbs || 0,
                fat: plan.fat || 0,
                isCustom: plan.isCustom || false,
                source: 'plan',
              }));
              setDietPlan(mappedDietPlan);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading diet plan:', error);
    }
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
        await loadTrainingPlan();
        await loadDietPlan();
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

  const refreshPlans = async () => {
    await Promise.all([
      loadTrainingPlan(),
      loadDietPlan(),
    ]);
  };

  const value = {
    userProfile,
    setUserProfile, // ✅ 导出用于前端本地状态更新
    trainingPlan,
    dietPlan,
    setDietPlan, // ✨ 新增：导出setDietPlan以便添加自定义食物
    loading,
    loadUserProfile,
    loadTrainingPlan,
    loadDietPlan,
    saveProfile,
    updateBasicInfo,
    refreshPlans,
    refreshTrainingPlan, // ✨ 新增：强制刷新训练计划
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

