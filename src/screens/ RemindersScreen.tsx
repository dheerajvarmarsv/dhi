// src/screens/RemindersScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import ReminderList from '../components/ReminderList';
import { getActiveReminders, Reminder, deleteReminder } from '../utils/reminderUtils';

const { width, height } = Dimensions.get('window');

interface RemindersScreenProps {
  navigation: any;
}

const RemindersScreen: React.FC<RemindersScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [])
  );

  const loadReminders = async () => {
    setLoading(true);
    try {
      const activeReminders = await getActiveReminders();
      setReminders(activeReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
      Alert.alert('Error', 'Failed to load reminders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = () => {
    if (reminders.length === 0) return;

    Alert.alert(
      'Delete All Reminders',
      'Are you sure you want to delete all reminders?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Delete each reminder
              for (const reminder of reminders) {
                await deleteReminder(reminder.id);
              }
              
              // Refresh the list
              setReminders([]);
              setRefreshTrigger(prev => prev + 1);
              
              Alert.alert('Success', 'All reminders have been deleted.');
            } catch (error) {
              console.error('Error deleting all reminders:', error);
              Alert.alert('Error', 'Failed to delete all reminders.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    loadReminders();
  };

  const handleReminderSelect = (reminder: Reminder) => {
    // If the reminder is associated with a chat, navigate to that chat
    if (reminder.chatId) {
      navigation.navigate('Chat', {
        selectedModel: 'Dolphin3.0-Llama3.2-1B-Q4_K_M.gguf',
        chatId: reminder.chatId,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reminders</Text>
        {reminders.length > 0 && (
          <TouchableOpacity 
            style={styles.deleteAllButton}
            onPress={handleDeleteAll}
          >
            <Text style={styles.deleteAllButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading reminders...</Text>
          </View>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require('../../assets/reminder.png')}
              style={styles.emptyIcon}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>No Reminders</Text>
            <Text style={styles.emptyDescription}>
              When you ask DHI to remind you about something, it will appear here.
            </Text>
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('Chat')}
            >
              <Text style={styles.createButtonText}>Create a Reminder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ReminderList
            refreshTrigger={refreshTrigger}
            onReminderSelected={handleReminderSelect}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.text,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  deleteAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 16,
  },
  deleteAllButtonText: {
    fontSize: Math.min(14, width * 0.035),
    color: '#FF3B30',
    fontWeight: '500',
    fontFamily: FONTS.primary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: Math.min(16, width * 0.04),
    color: COLORS.gray,
    fontFamily: FONTS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: width * 0.25,
    height: width * 0.25,
    marginBottom: 24,
    tintColor: COLORS.primary,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: Math.min(24, width * 0.06),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    fontFamily: FONTS.primary,
  },
  emptyDescription: {
    fontSize: Math.min(16, width * 0.04),
    textAlign: 'center',
    color: COLORS.gray,
    marginBottom: 32,
    lineHeight: Math.min(24, width * 0.06),
    fontFamily: FONTS.primary,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    ...SHADOWS.medium,
  },
  createButtonText: {
    color: 'white',
    fontSize: Math.min(16, width * 0.04),
    fontWeight: '600',
    fontFamily: FONTS.primary,
  },
});

export default RemindersScreen;