// 可达性服务
import { AccessibilityInfo, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 可达性设置存储键
const ACCESSIBILITY_SETTINGS_KEY = '@FitBitePal:accessibilitySettings';

/**
 * 字体大小选项
 */
export const FONT_SIZES = {
  small: {
    title: 20,
    subtitle: 14,
    body: 14,
    label: 12,
    button: 14,
    caption: 11,
  },
  medium: {
    title: 24,
    subtitle: 16,
    body: 16,
    label: 14,
    button: 16,
    caption: 12,
  },
  large: {
    title: 28,
    subtitle: 18,
    body: 18,
    label: 16,
    button: 18,
    caption: 14,
  },
};

/**
 * 获取可达性设置
 * @returns {Promise<Object>} 可达性设置对象
 */
export const getAccessibilitySettings = async () => {
  try {
    const settings = await AsyncStorage.getItem(ACCESSIBILITY_SETTINGS_KEY);
    return settings ? JSON.parse(settings) : {
      fontSize: 'medium',
      screenReaderEnabled: false,
      highContrast: false,
      reduceMotion: false,
    };
  } catch (error) {
    console.error('Error getting accessibility settings:', error);
    return {
      fontSize: 'medium',
      screenReaderEnabled: false,
      highContrast: false,
      reduceMotion: false,
    };
  }
};

/**
 * 保存可达性设置
 * @param {Object} settings - 可达性设置对象
 */
export const saveAccessibilitySettings = async (settings) => {
  try {
    await AsyncStorage.setItem(ACCESSIBILITY_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving accessibility settings:', error);
  }
};

/**
 * 获取当前字体大小配置
 * @param {string} size - 字体大小 ('small', 'medium', 'large')
 * @returns {Object} 字体大小配置对象
 */
export const getFontSizeConfig = (size = 'medium') => {
  return FONT_SIZES[size] || FONT_SIZES.medium;
};

/**
 * 检查屏幕阅读器是否启用
 * @returns {Promise<boolean>} 是否启用
 */
export const isScreenReaderEnabled = async () => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    console.error('Error checking screen reader:', error);
    return false;
  }
};

/**
 * 朗读文本（用于屏幕阅读器）
 * @param {string} text - 要朗读的文本
 */
export const announceForAccessibility = (text) => {
  if (text) {
    AccessibilityInfo.announceForAccessibility(text);
  }
};

/**
 * 设置焦点到特定元素（用于屏幕阅读器）
 * @param {number} reactTag - React元素标签
 */
export const setAccessibilityFocus = (reactTag) => {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
};

/**
 * 检查是否启用减少动画
 * @returns {Promise<boolean>} 是否启用
 */
export const isReduceMotionEnabled = async () => {
  try {
    // ✅ iOS 和 Android 都支持此API（React Native 0.64+）
      return await AccessibilityInfo.isReduceMotionEnabled();
  } catch (error) {
    console.error('Error checking reduce motion:', error);
    return false;
  }
};

/**
 * 获取无障碍文本（根据语言和上下文）
 * @param {string} key - 文本键
 * @param {Object} context - 上下文信息
 * @returns {string} 无障碍描述文本
 */
export const getAccessibilityLabel = (key, context = {}) => {
  const labels = {
    backButton: '返回按钮',
    nextButton: '下一步按钮',
    startButton: '开始按钮',
    exerciseCard: `训练项目：${context.name || ''}，时长：${context.duration || ''}，消耗：${context.calories || ''}卡路里`,
    mealCard: `餐食：${context.meal || ''}，时间：${context.time || ''}，热量：${context.calories || ''}卡路里`,
    bottomTab: `${context.name || ''}标签页`,
    settingSwitch: `${context.name || ''}开关，当前${context.value ? '开启' : '关闭'}`,
  };
  return labels[key] || '';
};

/**
 * 监听屏幕阅读器状态变化
 * @param {Function} callback - 回调函数
 * @returns {Function} 取消监听的函数
 */
export const addScreenReaderChangeListener = (callback) => {
  const subscription = AccessibilityInfo.addEventListener(
    'screenReaderChanged',
    callback
  );
  return () => subscription?.remove?.();
};

/**
 * 监听减少动画状态变化
 * @param {Function} callback - 回调函数
 * @returns {Function} 取消监听的函数
 */
export const addReduceMotionChangeListener = (callback) => {
  try {
    // ✅ iOS 和 Android 都支持此事件（React Native 0.64+）
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      callback
    );
    return () => subscription?.remove?.();
  } catch (error) {
    console.warn('reduceMotionChanged listener not supported:', error);
    return () => {};
  }
};

