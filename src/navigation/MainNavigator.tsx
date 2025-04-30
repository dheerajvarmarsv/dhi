import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth Screens
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import PhoneNumberScreen from '../screens/auth/PhoneNumberScreen';

// Main Content
import ModelSelectionScreen from '../screens/ModelSelectionScreen';
import ChatScreen from '../screens/ChatScreen';
import RemindersScreen from '../screens/RemindersScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  SignIn: undefined;
  PhoneNumber: undefined;
  ModelSelection: undefined;
  Chat: { selectedModel: string; chatId?: string };
  Reminders: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const MainNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Auth Flow */}
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
      
      {/* Main Flow */}
      <Stack.Screen name="ModelSelection" component={ModelSelectionScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
    </Stack.Navigator>
  );
};

export default MainNavigator;