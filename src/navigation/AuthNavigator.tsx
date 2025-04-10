import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from '../screens/auth/OnboardingScreen';
import FeaturesScreen from '../screens/auth/FeaturesScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import PhoneNumberScreen from '../screens/auth/PhoneNumberScreen';

export type AuthStackParamList = {
  Onboarding: undefined;
  Features: undefined;
  SignIn: undefined;
  PhoneNumber: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName="Onboarding"
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Features" component={FeaturesScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator; 