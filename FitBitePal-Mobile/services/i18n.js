// 国际化服务
import I18n from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n/translations';

// 设置翻译
I18n.translations = translations;

// 安全获取设备语言
const getDeviceLanguage = () => {
  try {
    const locale = Localization.locale || Localization.getLocales?.()?.[0]?.languageCode || 'en';
    return typeof locale === 'string' ? locale.split('-')[0] : 'en';
  } catch {
    return 'en';
  }
};

// 设置默认语言为设备语言
I18n.locale = getDeviceLanguage();

// 启用回退
I18n.fallbacks = true;
I18n.defaultLocale = 'en';

// 本地存储键
const LANGUAGE_KEY = '@FitBitePal:language';

// 获取保存的语言设置
export const loadLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      I18n.locale = savedLanguage;
      return savedLanguage;
    }
    // 如果没有保存的语言，根据设备语言选择
    const deviceLang = getDeviceLanguage();
    const supportedLang = ['zh', 'en'].includes(deviceLang) ? deviceLang : 'en';
    I18n.locale = supportedLang;
    return supportedLang;
  } catch (error) {
    console.error('Error loading language:', error);
    return 'en';
  }
};

// 保存语言设置
export const saveLanguage = async (language) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    I18n.locale = language;
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// 翻译函数
export const t = (key, options) => {
  return I18n.t(key, options);
};

// 获取当前语言
export const getCurrentLanguage = () => {
  return I18n.locale;
};

export default I18n;
