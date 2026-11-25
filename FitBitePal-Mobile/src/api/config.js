/**
 * API 配置文件
 * FitBite Pal - React Native 版本
 */
import { getApiBaseUrlSync } from '../../services/serverConfig';

export const API_CONFIG = {
  baseURL: getApiBaseUrlSync(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * API 端点定义（基于 SRS.md 需求）
 */
export const API_ENDPOINTS = {
  // 认证模块
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_CODE: '/auth/verify-code',
  },

  // 用户模块
  USER: {
    GET_PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    GET_MEASUREMENTS: '/user/measurements',
    UPDATE_MEASUREMENTS: '/user/measurements',
    UPDATE_GOAL: '/user/goal',
    UPDATE_AVAILABLE_TIME: '/user/available-time',
  },

  // 训练计划模块
  TRAINING: {
    GET_PLAN: '/training/plan',
    GET_PLAN_BY_DATE: '/training/plan/:date',
    GET_WEEKLY_PLAN: '/training/plan/weekly',
    GET_DAILY_PLAN: '/training/plan/daily',
    GET_EXERCISES: '/training/exercises',
    GET_EXERCISE_DETAIL: '/training/exercises/:id',
    COMPLETE_EXERCISE: '/training/exercises/:id/complete',
    GET_CHECKIN_HISTORY: '/training/checkin-history',
    CHECK_IN: '/training/checkin',
    REPLACE_EXERCISE: '/training/exercises/:id/replace',
  },

  // 饮食管理模块
  DIET: {
    RECOGNIZE_FOOD: '/diet/recognize',
    GET_FOOD_LIST: '/diet/foods',
    LOG_MEAL: '/diet/meals',
    GET_MEALS: '/diet/meals',
    GET_MEALS_BY_DATE: '/diet/meals/:date',
    UPDATE_MEAL: '/diet/meals/:id',
    DELETE_MEAL: '/diet/meals/:id',
    GET_NUTRITION_SUMMARY: '/diet/nutrition-summary',
    SCAN_BARCODE: '/diet/scan',
  },

  // 姿态识别模块
  POSE: {
    START_SESSION: '/pose/session/start',
    END_SESSION: '/pose/session/end',
    UPLOAD_FRAME: '/pose/frame',
    GET_FEEDBACK: '/pose/feedback',
    GET_CORRECTION_HISTORY: '/pose/history',
  },

  // 报表统计模块
  REPORTS: {
    GET_WEIGHT_CHART: '/reports/weight',
    GET_TRAINING_CALENDAR: '/reports/training-calendar',
    GET_NUTRITION_CHART: '/reports/nutrition',
    GET_STATS_SUMMARY: '/reports/summary',
    GET_PROGRESS: '/reports/progress',
  },

  // 通知提醒模块
  NOTIFICATIONS: {
    GET_REMINDERS: '/notifications/reminders',
    CREATE_REMINDER: '/notifications/reminders',
    UPDATE_REMINDER: '/notifications/reminders/:id',
    DELETE_REMINDER: '/notifications/reminders/:id',
    GET_MESSAGES: '/notifications/messages',
    MARK_AS_READ: '/notifications/messages/:id/read',
  },
};

export default API_CONFIG;

