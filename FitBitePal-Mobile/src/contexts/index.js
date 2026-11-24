import React from 'react';
import { AuthProvider } from './AuthContext';
import { AppStateProvider } from './AppStateContext';

/**
 * 组合所有Context Provider
 * 按依赖顺序嵌套
 */
export const AppProviders = ({ children }) => {
  return (
    <AppStateProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </AppStateProvider>
  );
};

// 导出所有Hook以便使用
export { useAuth } from './AuthContext';
export { useUserProfile } from './UserProfileContext';
export { useAppState } from './AppStateContext';
export { useData } from './DataContext';

