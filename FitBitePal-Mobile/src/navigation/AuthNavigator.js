import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  SplashScreen,
  LoginScreen,
  RegisterScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
  GenderScreen,
  AgeScreen,
  HeightScreen,
  WeightScreen,
  GoalScreen,
  ActivityScreen,
  DurationScreen,
} from '../screens';

const Stack = createStackNavigator();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#000' },
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      
      {/* Onboarding Flow */}
      <Stack.Screen name="Gender" component={GenderScreen} />
      <Stack.Screen name="Age" component={AgeScreen} />
      <Stack.Screen name="Height" component={HeightScreen} />
      <Stack.Screen name="Weight" component={WeightScreen} />
      <Stack.Screen name="Goal" component={GoalScreen} />
      <Stack.Screen name="Activity" component={ActivityScreen} />
      <Stack.Screen name="Duration" component={DurationScreen} />
    </Stack.Navigator>
  );
};
