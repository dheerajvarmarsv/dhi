import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import PhoneNumberScreen from '../screens/auth/PhoneNumberScreen';
import ModelSelectionScreen from '../screens/ModelSelectionScreen';
import DownloadScreen from '../screens/DownloadScreen';
import MainScreen from '../screens/MainScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  SignIn: undefined;
  PhoneNumber: undefined;
  ModelSelection: undefined;
  Download: { selectedModel: string };
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f4511e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SignIn" 
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PhoneNumber" 
        component={PhoneNumberScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ModelSelection" 
        component={ModelSelectionScreen}
        options={{ title: 'Select Model' }}
      />
      <Stack.Screen 
        name="Download" 
        component={DownloadScreen}
        options={{ title: 'Download Model' }}
      />
      <Stack.Screen 
        name="Main" 
        component={MainScreen}
        options={{ title: 'Chat' }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator; 