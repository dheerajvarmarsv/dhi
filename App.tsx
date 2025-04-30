import React, { useRef, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import MainNavigator from './src/navigation/MainNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

function App(): React.JSX.Element {
  const navigationRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const routeNameRef = useRef<string | undefined>();
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Check if AsyncStorage is working
  useEffect(() => {
    const checkStorage = async () => {
      try {
        // Test if AsyncStorage is working properly
        await AsyncStorage.setItem('_storage_test', 'test_value');
        const testResult = await AsyncStorage.getItem('_storage_test');
        
        if (testResult !== 'test_value') {
          throw new Error('AsyncStorage test failed');
        }
        
        setIsStorageReady(true);
      } catch (error) {
        console.error('AsyncStorage initialization error:', error);
        setStorageError('AsyncStorage initialization failed. Please restart the app.');
        
        // Try to recover by clearing storage
        try {
          await AsyncStorage.clear();
          // Try one more time
          await AsyncStorage.setItem('_recovery_test', 'recovery');
          if (await AsyncStorage.getItem('_recovery_test') === 'recovery') {
            setIsStorageReady(true);
            setStorageError(null);
          }
        } catch (recoveryError) {
          console.error('AsyncStorage recovery failed:', recoveryError);
        }
      }
    };
    
    checkStorage();
  }, []);

  // Handle app state changes and route changes
  useEffect(() => {
    if (!isStorageReady) return; // Skip if storage isn't ready
    
    const handleAppStateChange = async (nextAppState: any) => {
      // Check if app is coming from background to foreground
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        try {
          // Check if user has opened the app before
          const hasOpenedApp = await AsyncStorage.getItem('hasOpenedApp');
          
          // Get current route
          const currentRoute = routeNameRef.current;
          
          // If user has used the app before and not currently on chat screen, navigate to Chat
          if (hasOpenedApp === 'true' && currentRoute !== 'Chat' && navigationRef.current) {
            const lastModel = await AsyncStorage.getItem('lastModel') || 'llama3-8b-8192.Q5_K_M';
            const lastChatId = await AsyncStorage.getItem('lastChatId');
            
            if (lastChatId && lastModel) {
              // @ts-ignore - navigationRef.current.navigate exists
              navigationRef.current.navigate('Chat', {
                selectedModel: lastModel,
                chatId: lastChatId
              });
            }
          }
        } catch (error) {
          console.error('Error handling app state change:', error);
          // Don't attempt to navigate if AsyncStorage is failing
        }
      }
      appStateRef.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isStorageReady]);

  if (storageError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{storageError}</Text>
        <Text style={styles.errorHelp}>Please restart the app or try reinstalling.</Text>
      </View>
    );
  }

  if (!isStorageReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          // @ts-ignore - navigationRef.current.getCurrentRoute exists
          routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
        }}
        onStateChange={async () => {
          try {
            // Save the current route name
            // @ts-ignore - navigationRef.current.getCurrentRoute exists
            const previousRouteName = routeNameRef.current;
            // @ts-ignore - navigationRef.current.getCurrentRoute exists
            const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

            if (previousRouteName !== currentRouteName) {
              routeNameRef.current = currentRouteName;
              
              // Save that the user has opened the app
              await AsyncStorage.setItem('hasOpenedApp', 'true');
              
              // If navigating to Chat screen, save the model and chat ID
              // @ts-ignore - navigationRef.current.getCurrentRoute exists
              const currentParams = navigationRef.current?.getCurrentRoute()?.params;
              if (currentRouteName === 'Chat' && currentParams) {
                // @ts-ignore - currentParams is an object
                const { selectedModel, chatId } = currentParams;
                if (selectedModel) {
                  await AsyncStorage.setItem('lastModel', selectedModel);
                }
                if (chatId) {
                  await AsyncStorage.setItem('lastChatId', chatId);
                }
              }
            }
          } catch (error) {
            console.error('Error handling navigation state change:', error);
            // Continue without saving state if AsyncStorage fails
          }
        }}
      >
        <MainNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4F46E5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorHelp: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default App;