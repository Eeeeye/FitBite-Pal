import React, { createContext, useState, useContext, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { loadLanguage, saveLanguage as saveLanguageToStorage, getCurrentLanguage } from '../../services/i18n';
import { 
  getAccessibilitySettings, 
  saveAccessibilitySettings,
  getFontSizeConfig,
  isScreenReaderEnabled 
} from '../../services/accessibilityService';
import {
  getNotificationSettings,
  saveNotificationSettings as saveNotificationSettingsToStorage,
} from '../../services/notificationService';

const AppStateContext = createContext();

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

export const AppStateProvider = ({ children }) => {
  // 语言和可达性
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [fontSize, setFontSize] = useState('medium');
  const [fontSizeConfig, setFontSizeConfig] = useState(getFontSizeConfig('medium'));
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  // 通知设置
  const [notificationSettings, setNotificationSettings] = useState({
    trainingReminder: false,
    mealReminder: false,
    trainingTime: '08:00',
    breakfastTime: '08:00',
    lunchTime: '12:30',
    dinnerTime: '18:30',
  });

  // 初始化
  useEffect(() => {
    initializeAppState();
  }, []);

  const initializeAppState = async () => {
    // 加载语言设置
    const lang = await loadLanguage();
    setCurrentLanguage(lang);

    // 加载可达性设置
    const accessibilitySettings = await getAccessibilitySettings();
    setFontSize(accessibilitySettings.fontSize || 'medium');
    setFontSizeConfig(getFontSizeConfig(accessibilitySettings.fontSize || 'medium'));

    // 检查屏幕阅读器
    const srEnabled = await isScreenReaderEnabled();
    setScreenReaderEnabled(srEnabled);

    // 加载通知设置
    const notifSettings = await getNotificationSettings();
    setNotificationSettings(notifSettings);

    // 监听屏幕阅读器状态变化
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => setScreenReaderEnabled(enabled)
    );

    return () => subscription?.remove?.();
  };

  const changeLanguage = async (lang) => {
    setCurrentLanguage(lang);
    await saveLanguageToStorage(lang);
  };

  const changeFontSize = async (size) => {
    setFontSize(size);
    setFontSizeConfig(getFontSizeConfig(size));
    
    const accessibilitySettings = await getAccessibilitySettings();
    await saveAccessibilitySettings({
      ...accessibilitySettings,
      fontSize: size,
    });
  };

  const saveNotificationSettings = async (settings) => {
    setNotificationSettings(settings);
    await saveNotificationSettingsToStorage(settings);
  };

  const value = {
    // 语言和可达性
    currentLanguage,
    setCurrentLanguage,  // ✨ 新增：直接设置语言（与App1.js一致）
    fontSize,
    setFontSize,  // ✨ 新增：直接设置字体大小
    fontSizeConfig,
    setFontSizeConfig,  // ✨ 新增：直接设置字体配置
    screenReaderEnabled,
    changeLanguage,
    changeFontSize,
    
    // 通知
    notificationSettings,
    setNotificationSettings,  // ✨ 新增：直接设置通知设置
    saveNotificationSettings,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

