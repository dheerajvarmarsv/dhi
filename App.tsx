import React, { useRef, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import MainNavigator from './src/navigation/MainNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupReminderSystem } from './src/utils/reminderUtils';
import { loadChatSession, getChatsIndex, getChatsByModel } from './src/utils/chatStorage';
import RNFS from 'react-native-fs';

function App(): React.JSX.Element {
  const navigationRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const routeNameRef = useRef<string | undefined>();
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isRestoringState, setIsRestoringState] = useState(true);

  // Initialize app systems and validate storage
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('Initializing app storage and systems...');
        
        // Ensure the app's document directory exists
        const documentDir = RNFS.DocumentDirectoryPath;
        const exists = await RNFS.exists(documentDir);
        if (!exists) {
          await RNFS.mkdir(documentDir);
        }
        
        // Test AsyncStorage
        await AsyncStorage.setItem('_storage_test', 'test_value');
        const testResult = await AsyncStorage.getItem('_storage_test');
        
        if (testResult !== 'test_value') {
          throw new Error('AsyncStorage test failed');
        }
        
        // Initialize reminders system with cleanup function
        const reminderCleanup = setupReminderSystem();
        cleanupRef.current = reminderCleanup;
        
        console.log('App initialized successfully');
        setIsStorageReady(true);
        
        // Now restore the app state (performed separately from storage initialization)
        await restoreAppState();
        setIsRestoringState(false);
      } catch (error) {
        console.error('App initialization error:', error);
        setStorageError('Storage initialization failed. Please restart the app.');
        
        // Try to recover
        try {
          // For Android, we can try to clear AsyncStorage
          if (Platform.OS === 'android') {
            await AsyncStorage.clear();
            await AsyncStorage.setItem('_recovery_test', 'recovery');
            if (await AsyncStorage.getItem('_recovery_test') === 'recovery') {
              // Try initializing again after clearing
              const reminderCleanup = setupReminderSystem();
              cleanupRef.current = reminderCleanup;
              setIsStorageReady(true);
              setStorageError(null);
              
              // Try to restore app state
              await restoreAppState();
              setIsRestoringState(false);
            }
          }
        } catch (recoveryError) {
          console.error('Storage recovery failed:', recoveryError);
          setIsRestoringState(false);
        }
      }
    };
    
    initApp();
    
    // Cleanup function
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);
  
  // Function to restore app state on launch
  const restoreAppState = async () => {
    try {
      console.log('Restoring app state on launch...');
      
      // Get the last used model
      const lastModel = await AsyncStorage.getItem('lastModel');
      if (!lastModel) {
        console.log('No last model found, cannot restore previous session');
        return;
      }
      
      // Check for lastChatId
      const lastChatId = await AsyncStorage.getItem('lastChatId');
      
      // Handle two scenarios - we have lastChatId or we don't
      if (lastChatId) {
        // Verify the chat exists
        const chatExists = await loadChatSession(lastChatId);
        
        if (chatExists) {
          console.log(`Chat exists with ID ${lastChatId}, will navigate on app ready`);
          // We'll navigate after app is ready
        } else {
          console.log(`Chat with ID ${lastChatId} not found, looking for alternatives`);
          
          // Try to find any chat for this model
          const chats = await getChatsByModel(lastModel);
          if (chats && chats.length > 0) {
            // Save the first available chat id
            await AsyncStorage.setItem('lastChatId', chats[0].id);
            console.log(`Found alternative chat with ID ${chats[0].id}`);
          } else {
            // No chats found, we'll need to create one when navigating
            await AsyncStorage.removeItem('lastChatId');
            console.log('No chats found for this model');
          }
        }
      } else {
        // No lastChatId, try to find any chat for this model
        const chats = await getChatsByModel(lastModel);
        if (chats && chats.length > 0) {
          // Save the first available chat id
          await AsyncStorage.setItem('lastChatId', chats[0].id);
          console.log(`Found chat with ID ${chats[0].id}`);
        }
      }
      
      // Mark that user has opened app before
      await AsyncStorage.setItem('hasOpenedApp', 'true');
      
    } catch (error) {
      console.error('Error restoring app state:', error);
    }
  };

  // Navigate to the last chat when navigation is ready
  const navigateToLastChat = async () => {
    if (!navigationRef.current || !isStorageReady || isRestoringState) return;
    
    try {
      const hasOpenedApp = await AsyncStorage.getItem('hasOpenedApp');
      if (hasOpenedApp !== 'true') return;
      
      const lastModel = await AsyncStorage.getItem('lastModel');
      const lastChatId = await AsyncStorage.getItem('lastChatId');
      
      if (lastModel) {
        // Ensure we're not already on the Chat screen
        // @ts-ignore
        const currentRoute = navigationRef.current?.getCurrentRoute()?.name;
        
        if (currentRoute !== 'Chat') {
          console.log(`Navigating to Chat screen with model ${lastModel} and chatId ${lastChatId || 'new'}`);
          // @ts-ignore
          navigationRef.current.navigate('Chat', {
            selectedModel: lastModel,
            chatId: lastChatId
          });
          return true;
        }
      }
    } catch (error) {
      console.error('Error navigating to last chat:', error);
    }
    
    return false;
  };

  // Handle app state changes
  useEffect(() => {
    if (!isStorageReady) return; // Skip if storage isn't ready
    
    const handleAppStateChange = async (nextAppState: any) => {
      // App is coming from background/inactive to foreground
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App resumed to foreground, restoring state...');
        
        try {
          // Re-run the state restoration to ensure we have the latest data
          await restoreAppState();
          
          // Try to navigate to the last chat if needed
          await navigateToLastChat();
        } catch (error) {
          console.error('Error handling app state change:', error);
        }
      } 
      // App is going to background - ensure data is saved
      else if (
        appStateRef.current === 'active' && 
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        console.log('App going to background, persisting state...');
        // Force a storage sync by getting the current values and saving them again
        try {
          const lastModel = await AsyncStorage.getItem('lastModel');
          const lastChatId = await AsyncStorage.getItem('lastChatId');
          
          if (lastModel) await AsyncStorage.setItem('lastModel', lastModel);
          if (lastChatId) await AsyncStorage.setItem('lastChatId', lastChatId);
          
          // Ensure hasOpenedApp is set
          await AsyncStorage.setItem('hasOpenedApp', 'true');
        } catch (error) {
          console.error('Error persisting state:', error);
        }
      }
      
      appStateRef.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isStorageReady, isRestoringState]);

  if (storageError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{storageError}</Text>
        <Text style={styles.errorHelp}>Please restart the app or try reinstalling.</Text>
      </View>
    );
  }

  if (!isStorageReady || isRestoringState) {
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
          // When navigation is ready, get current route and try to navigate to last chat
          // @ts-ignore
          routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
          navigateToLastChat();
        }}
        onStateChange={async () => {
          try {
            // Save the current route name
            // @ts-ignore
            const previousRouteName = routeNameRef.current;
            // @ts-ignore
            const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

            if (previousRouteName !== currentRouteName) {
              routeNameRef.current = currentRouteName;
              
              // Save that the user has opened the app
              await AsyncStorage.setItem('hasOpenedApp', 'true');
              
              // If navigating to Chat screen, save the model and chat ID
              // @ts-ignore
              const currentParams = navigationRef.current?.getCurrentRoute()?.params;
              if (currentRouteName === 'Chat' && currentParams) {
                // @ts-ignore - currentParams is an object
                const { selectedModel, chatId } = currentParams;
                
                // Only save if both parameters are valid
                if (selectedModel) {
                  await AsyncStorage.setItem('lastModel', selectedModel);
                  console.log('Saved model to AsyncStorage:', selectedModel);
                  
                  if (chatId) {
                    await AsyncStorage.setItem('lastChatId', chatId);
                    console.log('Saved chatId to AsyncStorage:', chatId);
                  }
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