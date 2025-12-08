import React, { useEffect, useRef } from 'react';
import { BackHandler, Alert, Platform } from 'react-native'; // ✨ 添加 Platform
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { AdminNavigator } from './AdminNavigator';
import { useAuth } from '../contexts';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  const { isAuthenticated, isCheckingAuth, needsOnboarding, isAdmin } = useAuth();
  const navigationRef = useRef(null);

  // ✨ BackHandler处理Android返回键（iOS不需要，因为没有硬件返回键）
  // 注意：iOS使用手势滑动返回，由react-navigation自动处理
  useEffect(() => {
    // iOS跳过BackHandler（iOS没有硬件返回键）
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const navigation = navigationRef.current;
      if (!navigation) return false;

      const currentRoute = navigation.getCurrentRoute();
      if (!currentRoute) return false;

      const routeName = currentRoute.name;

      // 从AI对话页面返回到之前的页面（与App1.js完全一致）
      if (routeName === 'Chat') {
        // 返回到主页面或饮食页面（根据导航历史）
        navigation.goBack();
        return true; // 阻止默认返回行为
      }

      // 其他页面允许默认返回行为
      return false;
    });

    return () => backHandler.remove();
  }, []);

  if (isCheckingAuth) {
    return null; // 或显示加载界面
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#000' },
        }}
      >
        {!isAuthenticated || needsOnboarding ? (
          // 未登录或需要完成新手引导：显示认证/引导流程（与App1.js一致）
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : isAdmin ? (
          // ✨ 管理员账户：显示管理后台
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : (
          // 已登录且完成引导：主应用
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

