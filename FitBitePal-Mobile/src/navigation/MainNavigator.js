import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, StyleSheet } from 'react-native';
import { useAppState } from '../contexts';
import {
  HomeScreen,
  FitScreen,
  DietScreen,
  ProgressScreen,
  ProfileScreen,
  ExerciseDetailScreen,
  PoseRecognitionScreen,
  PoseHistoryScreen,
  PoseHistoryDetailScreen,
  FoodRecognitionScreen,
  ChatScreen,
  CheckInScreen,
  SummaryScreen,
  AdjustPlanScreen,
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// 底部Tab导航 - 使用原始App.js的4个Tab
const MainTabs = () => {
  const { currentLanguage } = useAppState();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#a4ff3e',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="FitTab"
        component={HomeScreen}
        options={{
          tabBarLabel: currentLanguage === 'zh' ? '健身' : 'Fit',
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused
                ? require('../../assets/images/8ac74f27dd9cf924db7b0d595d8d2dc4.png')
                : require('../../assets/images/193bcbc46d920f3857c033864c382f72.png')
              }
              style={styles.tabIcon}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tab.Screen
        name="DietTab"
        component={DietScreen}
        options={{
          tabBarLabel: currentLanguage === 'zh' ? '饮食' : 'Diet',
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused
                ? require('../../assets/images/37720d5051114de190c0f0b68891566d.png')
                : require('../../assets/images/9100649f6f4387ab15fbf5fcaad6521f.png')
              }
              style={styles.tabIcon}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tab.Screen
        name="StatsTab"
        component={ProgressScreen}
        options={{
          tabBarLabel: currentLanguage === 'zh' ? '统计' : 'Stats',
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused
                ? require('../../assets/images/2e91ade4414f83f2ff572f69c6c7b620.png')
                : require('../../assets/images/7b131c0ecbd2f53f99676b1a9f60c76e.png')
              }
              style={styles.tabIcon}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tab.Screen
        name="SetTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: currentLanguage === 'zh' ? '设置' : 'Set',
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused
                ? require('../../assets/images/f5597711c44895911a261bb2aa6a7474.png')
                : require('../../assets/images/5b154137b570997d727f0b4fd78e29c0.png')
              }
              style={styles.tabIcon}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// 主导航 - 包含Tabs和其他页面
export const MainNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#000' },
        animationEnabled: true,
      }}
    >
      {/* Main Tabs */}
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* Feature Pages */}
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="PoseRecognition" component={PoseRecognitionScreen} />
      <Stack.Screen name="PoseHistory" component={PoseHistoryScreen} />
      <Stack.Screen name="PoseHistoryDetail" component={PoseHistoryDetailScreen} />
      <Stack.Screen name="FoodRecognition" component={FoodRecognitionScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} />
      <Stack.Screen name="Summary" component={SummaryScreen} />
      <Stack.Screen name="AdjustPlan" component={AdjustPlanScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#2a2a2a',
    borderTopColor: '#444',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingBottom: 20,
    paddingTop: 12,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
});
