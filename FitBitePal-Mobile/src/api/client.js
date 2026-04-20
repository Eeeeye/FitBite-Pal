/**
 * API 客户端 - React Native 版本
 * 处理所有 HTTP 请求和 JWT Token 管理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './config';
import { getApiBaseUrlSync, initServerConfig } from '../../services/serverConfig';

class ApiClient {
  constructor(config = API_CONFIG) {
    this._baseURL = config.baseURL; // 默认 baseURL
    this.timeout = config.timeout;
    this.headers = config.headers;
    this.token = null;
    
    // 初始化时从 AsyncStorage 加载 token 和服务器配置
    this.loadToken();
    // 异步初始化服务器配置（不阻塞构造函数）
    initServerConfig().catch(() => {});
  }

  /**
   * 获取当前 baseURL（优先使用用户配置的地址）
   */
  get baseURL() {
    try {
      const customUrl = getApiBaseUrlSync();
      if (customUrl) {
        return customUrl;
      }
    } catch (e) {
      // 忽略错误，使用默认值
    }
    return this._baseURL;
  }

  /**
   * 从本地存储加载 Token
   */
  async loadToken() {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        this.token = token;
      }
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  /**
   * 设置认证令牌
   */
  async setToken(token) {
    this.token = token;
    if (token) {
      try {
        await AsyncStorage.setItem('access_token', token);
      } catch (error) {
        console.error('Failed to save token:', error);
      }
    } else {
      try {
        await AsyncStorage.removeItem('access_token');
      } catch (error) {
        console.error('Failed to remove token:', error);
      }
    }
  }

  /**
   * 保存用户ID到本地存储
   */
  async saveUserId(userId) {
    try {
      if (userId) {
        await AsyncStorage.setItem('user_id', userId.toString());
      } else {
        await AsyncStorage.removeItem('user_id');
      }
    } catch (error) {
      console.error('Failed to save userId:', error);
    }
  }

  /**
   * 从本地存储加载用户ID
   */
  async loadUserId() {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      return userId ? parseInt(userId) : null;
    } catch (error) {
      console.error('Failed to load userId:', error);
      return null;
    }
  }

  /**
   * 保存用户基本信息到本地存储
   */
  async saveUserInfo(userInfo) {
    try {
      await AsyncStorage.setItem('user_info', JSON.stringify(userInfo));
    } catch (error) {
      console.error('Failed to save user info:', error);
    }
  }

  /**
   * 从本地存储加载用户基本信息
   */
  async loadUserInfo() {
    try {
      const userInfo = await AsyncStorage.getItem('user_info');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      console.error('Failed to load user info:', error);
      return null;
    }
  }

  /**
   * 清除所有本地存储数据
   */
  async clearStorage() {
    try {
      await AsyncStorage.multiRemove(['access_token', 'user_id', 'user_info']);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * 构建完整 URL
   */
  buildURL(endpoint, params = {}) {
    let url = `${this.baseURL}${endpoint}`;

    // 替换路径参数
    Object.keys(params).forEach((key) => {
      if (endpoint.includes(`:${key}`)) {
        url = url.replace(`:${key}`, params[key]);
        delete params[key];
      }
    });

    // 添加查询参数
    const queryParams = Object.keys(params);
    if (queryParams.length > 0) {
      const queryString = queryParams
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * 构建请求头
   */
  buildHeaders(customHeaders = {}) {
    const headers = { ...this.headers, ...customHeaders };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * 通用请求方法
   */
  async request(method, endpoint, options = {}) {
    const { data, params = {}, headers = {}, timeout: requestTimeout, ...rest } = options;

    const url = this.buildURL(endpoint, params);
    const requestHeaders = this.buildHeaders(headers);

    try {
      const controller = new AbortController();
      const timeout = Number(requestTimeout ?? this.timeout);
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
        ...rest,
      });

      clearTimeout(timeoutId);

      // 处理响应
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      if (!response.ok) {
        // 如果是 401，清除 token
        if (response.status === 401) {
          await this.setToken(null);
          // 可以在这里触发导航到登录页
        }
        
        const error = new Error(result.message || `HTTP Error: ${response.status}`);
        error.status = response.status;
        error.data = result;
        throw error;
      }

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      // 只在开发模式下输出错误日志
      if (__DEV__) {
        console.error('API Error:', error);
      }
      throw error;
    }
  }

  /**
   * GET 请求
   */
  get(endpoint, options = {}) {
    return this.request('GET', endpoint, options);
  }

  /**
   * POST 请求
   */
  post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, { ...options, data });
  }

  /**
   * PUT 请求
   */
  put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, { ...options, data });
  }

  /**
   * PATCH 请求
   */
  patch(endpoint, data, options = {}) {
    return this.request('PATCH', endpoint, { ...options, data });
  }

  /**
   * DELETE 请求
   */
  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options);
  }

  /**
   * 上传文件（用于图片上传）
   */
  async uploadFile(endpoint, file, options = {}) {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || 'photo.jpg',
    });

    const headers = this.buildHeaders({
      'Content-Type': 'multipart/form-data',
      ...options.headers,
    });

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      return result;
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  }
}

// 创建全局实例
export const apiClient = new ApiClient();

export default apiClient;




