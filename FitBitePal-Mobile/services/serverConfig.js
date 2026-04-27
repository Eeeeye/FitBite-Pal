/**
 * 服务器配置服务
 * 允许用户在应用内修改后端地址
 * 支持 IP+端口 模式和自定义 URL 模式（如 ngrok）
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_CONFIG_KEY = '@fitbitepal_server_config';

// 默认服务器地址（构建时的地址）
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const DEFAULT_SERVER_IP = '10.49.118.63';
const DEFAULT_SERVER_PORT = '8080';

const getDefaultServerConfig = () => {
  if (DEFAULT_API_URL) {
    try {
      const url = new URL(DEFAULT_API_URL);
      return {
        ip: url.hostname,
        port: url.port || (url.protocol === 'https:' ? '443' : '80'),
        customUrl: DEFAULT_API_URL,
        useCustomUrl: true,
      };
    } catch (error) {
      console.log('Invalid EXPO_PUBLIC_API_URL:', error);
    }
  }

  return {
    ip: DEFAULT_SERVER_IP,
    port: DEFAULT_SERVER_PORT,
    customUrl: '',
    useCustomUrl: false,
  };
};

// 缓存当前配置
let cachedConfig = null;

/**
 * 获取服务器配置
 */
export const getServerConfig = async () => {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const saved = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
    if (saved) {
      cachedConfig = JSON.parse(saved);
      return cachedConfig;
    }
  } catch (error) {
    console.log('Error loading server config:', error);
  }

  // 返回默认配置
  cachedConfig = getDefaultServerConfig();
  return cachedConfig;
};

/**
 * 保存服务器配置
 */
export const saveServerConfig = async (ip, port = '8080', customUrl = '', useCustomUrl = false) => {
  const config = { ip, port, customUrl, useCustomUrl };
  try {
    await AsyncStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(config));
    cachedConfig = config;
    return true;
  } catch (error) {
    console.log('Error saving server config:', error);
    return false;
  }
};

/**
 * 获取完整的 API 基础 URL
 */
export const getApiBaseUrl = async () => {
  const config = await getServerConfig();
  if (config.useCustomUrl && config.customUrl) {
    const url = config.customUrl.trim();
    // 确保 URL 以 /api 结尾
    if (url.endsWith('/api')) return url;
    if (url.endsWith('/')) return url + 'api';
    return url + '/api';
  }
  return `http://${config.ip}:${config.port}/api`;
};

/**
 * 同步获取 API 基础 URL（使用缓存）
 */
export const getApiBaseUrlSync = () => {
  if (cachedConfig) {
    if (cachedConfig.useCustomUrl && cachedConfig.customUrl) {
      const url = cachedConfig.customUrl.trim();
      if (url.endsWith('/api')) return url;
      if (url.endsWith('/')) return url + 'api';
      return url + '/api';
    }
    return `http://${cachedConfig.ip}:${cachedConfig.port}/api`;
  }
  const defaultConfig = getDefaultServerConfig();
  if (defaultConfig.useCustomUrl && defaultConfig.customUrl) {
    return defaultConfig.customUrl;
  }
  return `http://${defaultConfig.ip}:${defaultConfig.port}/api`;
};

/**
 * 测试服务器连接
 */
export const testServerConnection = async (ipOrUrl, port = '8080', isCustomUrl = false) => {
  let url;
  if (isCustomUrl) {
    // 自定义 URL 模式
    const baseUrl = ipOrUrl.trim();
    if (baseUrl.endsWith('/api')) {
      url = baseUrl + '/foods?page=0&size=1';
    } else if (baseUrl.endsWith('/')) {
      url = baseUrl + 'api/foods?page=0&size=1';
    } else {
      url = baseUrl + '/api/foods?page=0&size=1';
    }
  } else {
    // IP + 端口模式
    url = `http://${ipOrUrl}:${port}/api/foods?page=0&size=1`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    // 对于需要认证的接口，401 也表示连接成功
    if (response.ok || response.status === 401) {
      return { success: true, message: '连接成功！' };
    }
    return { success: false, message: `服务器返回错误: ${response.status}` };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, message: '连接超时，请检查地址和网络' };
    }
    return { success: false, message: `连接失败: ${error.message}` };
  }
};

/**
 * 重置为默认配置
 */
export const resetServerConfig = async () => {
  try {
    await AsyncStorage.removeItem(SERVER_CONFIG_KEY);
    cachedConfig = getDefaultServerConfig();
    return true;
  } catch (error) {
    console.log('Error resetting server config:', error);
    return false;
  }
};

/**
 * 初始化配置（应用启动时调用）
 * 如果需要强制使用新默认值，可以清除旧配置
 */
export const initServerConfig = async (forceReset = false) => {
  if (forceReset) {
    await resetServerConfig();
  }
  await getServerConfig();
};

