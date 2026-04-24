import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  AdminDashboardScreen,
  AdminMealSetsScreen,
  AdminFoodsScreen,
  AdminUsersScreen,
  AdminConfigsScreen,
  AdminUserStatsEditorScreen,
} from '../screens/admin';

const Stack = createStackNavigator();

export const AdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0F172A' },
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminMealSets" component={AdminMealSetsScreen} />
      <Stack.Screen name="AdminFoods" component={AdminFoodsScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminUserStatsEditor" component={AdminUserStatsEditorScreen} />
      <Stack.Screen name="AdminConfigs" component={AdminConfigsScreen} />
    </Stack.Navigator>
  );
};

