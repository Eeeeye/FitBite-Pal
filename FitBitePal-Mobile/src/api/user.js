import apiClient from './client';

export const saveUserProfile = (userId, payload) =>
  apiClient.post(`/users/${userId}/profile`, payload);

export const fetchUserProfile = (userId) =>
  apiClient.get(`/users/${userId}`);

export const fetchTrainingPlan = (userId, params = {}) =>
  apiClient.get(`/users/${userId}/training-plan`, { params });

export const fetchDietPlan = (userId) =>
  apiClient.get(`/users/${userId}/diet-plan`);

// 保存饮食记录到后端
export const saveDietRecord = (userId, dietData) =>
  apiClient.post(`/records/diet/${userId}`, dietData);

// 获取饮食记录（用户自己添加的食物）
export const fetchDietRecords = (userId, startDate, endDate) => {
  let url = `/records/diet/${userId}`;
  if (startDate && endDate) {
    url += `?startDate=${startDate}&endDate=${endDate}`;
  }
  return apiClient.get(url);
};

// 删除饮食记录
export const deleteDietRecord = (recordId) =>
  apiClient.delete(`/records/diet/${recordId}`);

// 统计数据相关API
export const fetchWeightRecords = (userId, days = 7) =>
  apiClient.get(`/data/weight`, { params: { userId, days } });

export const fetchCalorieRecords = (userId, days = 7) =>
  apiClient.get(`/data/calories`, { params: { userId, days } });

export const fetchStatistics = (userId, days = 7) =>
  apiClient.get(`/data/statistics`, { params: { userId, days } });

export const addWeightRecord = (userId, weight) =>
  apiClient.post(`/data/weight`, { userId, weight });

export const addCalorieRecord = (userId, calorieData) =>
  apiClient.post(`/data/calories`, { userId, ...calorieData });

// 更新用户基本信息（用户名、电话号码）
export const updateBasicInfo = (userId, updates) =>
  apiClient.put(`/users/${userId}/basic-info`, updates);

// 完成状态相关API
export const saveCompletion = (data) =>
  apiClient.post(`/completion/save`, data);

export const fetchCompletionRecords = (userId, date, itemType) => {
  const params = { userId };
  if (date) params.date = date;
  if (itemType) params.itemType = itemType;
  return apiClient.get(`/completion/records`, { params });
};

export const batchSaveCompletion = (data) =>
  apiClient.post(`/completion/batch-save`, data);

// 打卡相关API
export const saveCheckIn = (userId, checkInData) =>
  apiClient.post(`/users/${userId}/check-in`, checkInData);

export const getCheckInStatus = (userId, date) => {
  const params = {};
  if (date) params.date = date;
  return apiClient.get(`/users/${userId}/check-in/status`, { params });
};

// 获取所有打卡历史记录
export const getCheckInHistory = (userId, days = null) => {
  const params = {};
  if (days) params.days = days;
  return apiClient.get(`/users/${userId}/check-in/history`, { params });
};

// 获取今天的完成状态（检查是否有已完成的训练）
export const getTodayCompletionStatus = (userId) =>
  apiClient.get(`/users/${userId}/today-completion-status`);

// 调整今天的训练计划
export const adjustTodayPlan = (userId, adjustData) =>
  apiClient.post(`/users/${userId}/adjust-today-plan`, adjustData);
