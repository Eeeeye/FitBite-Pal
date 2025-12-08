import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as loginApi, register as registerApi } from '../api/auth';
import { fetchUserProfile as fetchUserProfileApi } from '../api/user';
import apiClient from '../api/client';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState('USER'); // 用户角色：USER 或 ADMIN
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false); // ✨ 新增：追踪是否需要完成新手引导

  // 检查保存的登录状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // 使用与原始App.js一致的存储key
      await apiClient.loadToken();
      const savedUserId = await apiClient.loadUserId();
      const savedUserInfo = await apiClient.loadUserInfo();

      if (apiClient.token && savedUserId) {
        // ⚠️ 关键修复：检查保存的用户角色
        // 如果是管理员账号，不自动恢复登录状态，需要重新登录
        if (savedUserInfo && savedUserInfo.role === 'ADMIN') {
          console.log('检测到管理员账号，需要重新登录');
          // 清除管理员的保存状态
          await apiClient.clearStorage();
          setIsCheckingAuth(false);
          return;
        }
        
        setUserId(savedUserId);
        setUserToken(apiClient.token);
        
        // ✨ 恢复用户角色（普通用户）
        if (savedUserInfo && savedUserInfo.role) {
          setUserRole(savedUserInfo.role);
        }
        
        // ✨ 关键：检查是否需要完成Onboarding
        try {
          const userInfoResponse = await fetchUserProfileApi(savedUserId);
          if (userInfoResponse.success && userInfoResponse.data) {
            const userInfo = userInfoResponse.data;
            
            // ⚠️ 检查所有必需字段是否完整（新手导航的7个步骤）
            const isProfileComplete = 
              userInfo.gender && 
              userInfo.age && 
              userInfo.weight && 
              userInfo.height && 
              userInfo.goal && 
              userInfo.activityLevel && 
              userInfo.trainingDuration;
            
            if (!isProfileComplete) {
              const missingFields = [];
              if (!userInfo.gender) missingFields.push('gender');
              if (!userInfo.age) missingFields.push('age');
              if (!userInfo.weight) missingFields.push('weight');
              if (!userInfo.height) missingFields.push('height');
              if (!userInfo.goal) missingFields.push('goal');
              if (!userInfo.activityLevel) missingFields.push('activityLevel');
              if (!userInfo.trainingDuration) missingFields.push('trainingDuration');
              
              setNeedsOnboarding(true);
            } else {
              setNeedsOnboarding(false);
            }
          }
        } catch (error) {
          setNeedsOnboarding(false);
        }

      }
    } catch (error) {
      // 静默处理错误
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const login = async (usernameOrEmail, password) => {
    try {
      setLoading(true);
      // 使用原始API参数名
      const response = await loginApi({ usernameOrEmail, password });
      
      if (response.success && response.data) {
        const { token, userId: loggedInUserId, username: loggedInUsername, email: loggedInEmail, role: loggedInRole } = response.data;
        const userRoleValue = loggedInRole || 'USER';
        
        // ⚠️ 关键修复：先临时设置token，这样后续的API调用才能通过身份验证
        apiClient.token = token;
        
        // ✨ 管理员账户不需要完成Onboarding，直接进入管理后台
        // ⚠️ 关键修复：管理员账号不保存到持久化存储，退出应用后需要重新登录
        if (userRoleValue === 'ADMIN') {
          // 只在内存中设置，不保存到 AsyncStorage
          // 这样退出应用后管理员需要重新登录
          
          setUserId(loggedInUserId);
          setUserToken(token);
          setUserRole(userRoleValue);
          setNeedsOnboarding(false);
          
          console.log('管理员登录成功，不保存登录状态');
          
          return { 
            success: true, 
            data: response.data,
            needsOnboarding: false,
            isAdmin: true
          };
        }
        
        // ⚠️ 先检查用户信息是否完整，再决定是否保存token到持久化存储
        let needsOnboardingFlag = false;
        try {
          const userInfoResponse = await fetchUserProfileApi(loggedInUserId);
          if (userInfoResponse.success && userInfoResponse.data) {
            const userInfo = userInfoResponse.data;
            
            // ⚠️ 检查所有必需字段是否完整（新手导航的7个步骤）
            const isProfileComplete = 
              userInfo.gender && 
              userInfo.age && 
              userInfo.weight && 
              userInfo.height && 
              userInfo.goal && 
              userInfo.activityLevel && 
              userInfo.trainingDuration;
            
            if (!isProfileComplete) {
              const missingFields = [];
              if (!userInfo.gender) missingFields.push('gender');
              if (!userInfo.age) missingFields.push('age');
              if (!userInfo.weight) missingFields.push('weight');
              if (!userInfo.height) missingFields.push('height');
              if (!userInfo.goal) missingFields.push('goal');
              if (!userInfo.activityLevel) missingFields.push('activityLevel');
              if (!userInfo.trainingDuration) missingFields.push('trainingDuration');
              
              needsOnboardingFlag = true;
              setNeedsOnboarding(true);
            } else {
              setNeedsOnboarding(false);
            }
          }
        } catch (error) {
          // 如果检查失败，默认不需要onboarding
          setNeedsOnboarding(false);
        }

        // ⚠️ 关键：只有用户信息完整时才保存token到持久化存储（AsyncStorage）
        if (!needsOnboardingFlag) {
          // 信息完整：保存到持久化存储，下次自动登录
          await apiClient.setToken(token);
          await apiClient.saveUserId(loggedInUserId);
          await apiClient.saveUserInfo({
            username: loggedInUsername,
            email: loggedInEmail,
            role: userRoleValue
          });
        } else {
          // 信息不完整：不保存到 AsyncStorage，退出应用后需要重新登录
        }
        
        // 更新内存状态
        setUserId(loggedInUserId);
        setUserToken(token);
        setUserRole(userRoleValue);

        return { 
          success: true, 
          data: response.data,
          needsOnboarding: needsOnboardingFlag,
          isAdmin: false
        };
      }
      
      return { success: false, message: response.message || '登录失败' };
    } catch (error) {
      const message = error?.data?.message || error?.message || '网络连接失败';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    try {
      setLoading(true);
      // 组合成对象传递给API（与App1.js一致）
      const response = await registerApi({ username, email, password });
      
      if (response.success && response.data) {
        const { userId: registeredUserId, token } = response.data;
        
        // ⚠️ 关键修改：注册成功后，只在内存中保存状态，不保存到持久化存储
        // 只有完成onboarding后才会保存token，这样退出应用后需要重新登录
        apiClient.token = token; // 临时设置token以便后续API调用
        
        // 更新内存状态
        setUserId(registeredUserId);
        setUserToken(token);
        
        // ✨ 关键：注册成功后需要完成新手引导
        setNeedsOnboarding(true);

        return { success: true, userId: registeredUserId, needsOnboarding: true };
      }
      
      return { success: false, message: response.message || '注册失败' };
    } catch (error) {
      const message = error?.data?.message || error?.message || '网络连接失败，请检查后端服务是否启动';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // ⚠️ 关键：清空所有状态
      setUserId(null);
      setUserToken(null);
      setUserRole('USER');
      setNeedsOnboarding(false);
      
      // ⚠️ 关键：清空 apiClient 的 token（内存中的）
      apiClient.token = null;
      
      // 清除 AsyncStorage 中的持久化数据
      await apiClient.clearStorage();

    } catch (error) {
      // 静默处理错误
    }
  };

  // ✨ 新增：完成Onboarding的函数
  const completeOnboarding = async () => {
    // ⚠️ 关键：完成onboarding后，才保存token到持久化存储
    if (userToken && userId) {
      await apiClient.setToken(userToken);
      await apiClient.saveUserId(userId);
    }
    
    setNeedsOnboarding(false);
  };

  const value = {
    userId,
    userToken,
    userRole,
    loading,
    isCheckingAuth,
    isAuthenticated: !!userId && !!userToken,
    isAdmin: userRole === 'ADMIN', // ✨ 管理员标识
    needsOnboarding, // ✨ 暴露needsOnboarding状态
    completeOnboarding, // ✨ 暴露完成Onboarding的方法
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

