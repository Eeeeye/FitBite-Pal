/**
 * 姿态识别 API
 */

import apiClient from './client';

/**
 * 开始姿态识别会话
 * @param {Object} data - { userId, exerciseId, exerciseName }
 * @returns {Promise}
 */
export const startPoseSession = async (data) => {
  try {
    const response = await apiClient.post('/pose/session/start', data);
    return response;
  } catch (error) {
    console.error('Start pose session error:', error);
    return {
      success: false,
      message: error.message || '启动姿态识别会话失败'
    };
  }
};

/**
 * 提交姿态帧进行分析
 * @param {Object} data - { sessionId, imageBase64, frameNumber }
 * @returns {Promise}
 */
export const submitPoseFrame = async (data) => {
  try {
    const response = await apiClient.post('/pose/frame', data);
    return response;
  } catch (error) {
    console.error('Submit pose frame error:', error);
    return {
      success: false,
      message: error.message || '提交姿态帧失败'
    };
  }
};

/**
 * 结束姿态识别会话
 * @param {Object} data - { sessionId, completedReps, durationSeconds, status }
 * @returns {Promise}
 */
export const endPoseSession = async (data) => {
  try {
    const response = await apiClient.post('/pose/session/end', data);
    return response;
  } catch (error) {
    console.error('End pose session error:', error);
    return {
      success: false,
      message: error.message || '结束姿态识别会话失败'
    };
  }
};

/**
 * 获取会话历史
 * @param {string} sessionId
 * @returns {Promise}
 */
export const getPoseSessionHistory = async (sessionId) => {
  try {
    const response = await apiClient.get(`/pose/history/${sessionId}`);
    return response;
  } catch (error) {
    console.error('Get pose session history error:', error);
    return {
      success: false,
      message: error.message || '获取会话历史失败'
    };
  }
};

/**
 * 获取用户所有训练会话列表
 * @param {number} userId
 * @returns {Promise}
 */
export const getUserPoseSessions = async (userId) => {
  try {
    const response = await apiClient.get(`/pose/sessions/${userId}`);
    return response;
  } catch (error) {
    console.error('Get user pose sessions error:', error);
    return {
      success: false,
      message: error.message || '获取训练历史失败'
    };
  }
};

/**
 * 保存训练会话详细数据（包括日志）
 * @param {Object} data - { sessionId, userId, exerciseName, logs, duration, calories, reps, videoUri }
 * @returns {Promise}
 */
export const savePoseSessionData = async (data) => {
  try {

    const response = await apiClient.post('/pose/session/save', data);

    return response;
  } catch (error) {
    console.error('Save pose session data error:', error);
    console.error('错误详情:', {
      message: error.message,
      data: error.data,
      status: error.status,
      stack: error.stack,
    });
    
    return {
      success: false,
      message: error?.data?.message || error.message || '保存训练数据失败',
      error: error
    };
  }
};

/**
 * 删除训练会话
 * @param {string} sessionId
 * @returns {Promise}
 */
export const deletePoseSession = async (sessionId) => {
  try {
    const response = await apiClient.delete(`/pose/session/${sessionId}`);
    return response;
  } catch (error) {
    console.error('Delete pose session error:', error);
    return {
      success: false,
      message: error.message || '删除训练会话失败'
    };
  }
};

/**
 * 检查姿态识别服务健康状态
 * @returns {Promise}
 */
export const checkPoseHealth = async () => {
  try {
    const response = await apiClient.get('/pose/health');
    return response;
  } catch (error) {
    console.error('Check pose health error:', error);
    return {
      success: false,
      message: error.message || '姿态识别服务不可用'
    };
  }
};

