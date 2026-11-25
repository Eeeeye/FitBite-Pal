import React from 'react';
import { ChatProvider } from '../hooks/useChat';
import { PrivacyScreen } from '../screens/PrivacyScreen';
import { useAuth } from '../contexts/AuthContext';
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

function OnboardingPrivacy({ navigation }) {
  const { userId, server } = useAuth();
  return userId ? (
    <ChatProvider key={server + ':' + userId}>
      <PrivacyScreen navigation={navigation} onboarding />
    </ChatProvider>
  ) : null;
}

export const AuthNavigator = () => {
  const { userId } = useAuth();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#000' },
        animationEnabled: true,
      }}
    >
      {userId ? (
        <Stack.Group navigationKey={'onboarding-' + userId}>
          <Stack.Screen name="Gender" component={GenderScreen} />
          <Stack.Screen name="Age" component={AgeScreen} />
          <Stack.Screen name="Height" component={HeightScreen} />
          <Stack.Screen name="Weight" component={WeightScreen} />
          <Stack.Screen name="Goal" component={GoalScreen} />
          <Stack.Screen name="Activity" component={ActivityScreen} />
          <Stack.Screen name="Duration" component={DurationScreen} />
          <Stack.Screen name="OnboardingPrivacy" component={OnboardingPrivacy} />
        </Stack.Group>
      ) : (
        <Stack.Group navigationKey="signed-out">
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};
