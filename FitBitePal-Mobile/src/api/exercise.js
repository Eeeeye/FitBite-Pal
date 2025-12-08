/**
 * 运动库 API
 * 获取运动信息、动图、视频等资源
 */
import apiClient from './client';

/**
 * 获取所有运动
 * @param {Object} filters - 筛选条件
 * @param {string} filters.category - 分类
 * @param {string} filters.bodyPart - 锻炼部位
 * @param {string} filters.difficulty - 难度
 * @param {string} filters.equipment - 器械
 * @param {string} filters.keyword - 关键词搜索
 */
export const getExercises = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.bodyPart) params.append('bodyPart', filters.bodyPart);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.equipment) params.append('equipment', filters.equipment);
    if (filters.keyword) params.append('keyword', filters.keyword);
    
    const queryString = params.toString();
    const url = queryString ? `/exercises?${queryString}` : '/exercises';
    
    const response = await apiClient.get(url);
    return {
      success: response.data?.success,
      data: response.data?.data,
    };
  } catch (error) {
    console.error('获取运动列表失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取运动详情
 * @param {number} id - 运动 ID
 */
export const getExerciseById = async (id) => {
  try {
    const response = await apiClient.get(`/exercises/${id}`);
    return {
      success: response.data?.success,
      data: response.data?.data,
    };
  } catch (error) {
    console.error('获取运动详情失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 根据运动名称获取详情
 * @param {string} name - 运动名称（英文）
 */
export const getExerciseByName = async (name) => {
  try {
    const response = await apiClient.get(`/exercises/by-name?name=${encodeURIComponent(name)}`);
    return {
      success: response.data?.success,
      data: response.data?.data,
    };
  } catch (error) {
    console.error('获取运动详情失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取运动动图 URL
 * @param {number} id - 运动 ID
 */
export const getExerciseGif = async (id) => {
  try {
    const response = await apiClient.get(`/exercises/${id}/gif`);
    return {
      success: response.data?.success,
      data: response.data?.data,
    };
  } catch (error) {
    console.error('获取运动动图失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 批量获取运动动图
 * @param {string[]} names - 运动名称数组
 * @returns {Promise<Object>} - { exerciseName: gifUrl }
 */
export const getBatchExerciseGifs = async (names) => {
  try {
    const response = await apiClient.post('/exercises/batch-gifs', { names });
    return {
      success: response.data?.success,
      data: response.data?.data,
    };
  } catch (error) {
    console.error('批量获取运动动图失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取所有运动分类
 */
export const getExerciseCategories = async () => {
  try {
    const response = await apiClient.get('/exercises/categories');
    return {
      success: response.data?.success,
      data: response.data?.data,
    };
  } catch (error) {
    console.error('获取运动分类失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取所有锻炼部位
 */
export const getExerciseBodyParts = async () => {
  try {
    const response = await apiClient.get('/exercises/body-parts');
    return {
      success: response.data?.success,
      data: response.data?.data,
    };
  } catch (error) {
    console.error('获取锻炼部位失败:', error);
    return { success: false, error: error.message };
  }
};

// ========== 本地 GIF 映射（离线备用） ==========

/**
 * 本地运动 GIF 映射
 * 当网络不可用时使用本地资源
 */
export const LOCAL_EXERCISE_GIFS = {
  // 有氧运动
  'Jumping Jacks': require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png'),
  'High Knees': require('../../assets/images/3893d8167b8f1b68e45c38830ebaa53f.png'),
  'Burpees': require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png'),
  'Mountain Climbers': require('../../assets/images/3893d8167b8f1b68e45c38830ebaa53f.png'),
  
  // 力量训练
  'Push-ups': require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png'),
  'Squats': require('../../assets/images/3893d8167b8f1b68e45c38830ebaa53f.png'),
  'Lunges': require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png'),
  'Pull-ups': require('../../assets/images/3893d8167b8f1b68e45c38830ebaa53f.png'),
  'Dumbbell Rows': require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png'),
  'Shoulder Press': require('../../assets/images/3893d8167b8f1b68e45c38830ebaa53f.png'),
  'Glute Bridges': require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png'),
  
  // 核心训练
  'Plank': require('../../assets/images/3893d8167b8f1b68e45c38830ebaa53f.png'),
  'Crunches': require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png'),
  'Russian Twists': require('../../assets/images/3893d8167b8f1b68e45c38830ebaa53f.png'),
  'Leg Raises': require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png'),
  'Bicycle Crunches': require('../../assets/images/3893d8167b8f1b68e45c38830ebaa53f.png'),
  
  // 拉伸
  'Cat-Cow Stretch': require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png'),
  'Superman Hold': require('../../assets/images/3893d8167b8f1b68e45c38830ebaa53f.png'),
  'Bird Dog': require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png'),
};

/**
 * 获取运动图片（优先网络，降级本地）
 * @param {string} exerciseName - 运动名称
 * @param {string} gifUrl - 网络 GIF URL（可选）
 */
export const getExerciseImage = (exerciseName, gifUrl = null) => {
  // 如果有网络 URL，返回 uri 对象
  if (gifUrl) {
    return { uri: gifUrl };
  }
  
  // 否则返回本地资源
  return LOCAL_EXERCISE_GIFS[exerciseName] || 
         require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png');
};

