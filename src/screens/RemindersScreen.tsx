import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ReminderList from '../components/ReminderList';
import { deleteAllReminders } from '../utils/reminderUtils';
import { COLORS, FONTS } from '../constants/theme';

const RemindersScreen: React.FC = () => {
  const [remindersCount, setRemindersCount] = useState(0);
  const navigation = useNavigation();
  
  const handleBackPress = () => {
    navigation.goBack();
  };
  
  const handleDeleteAllReminders = () => {
    if (remindersCount === 0) {
      Alert.alert('No Reminders', 'There are no reminders to delete.');
      return;
    }
    
    Alert.alert(
      'Delete All Reminders',
      'Are you sure you want to delete all reminders? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllReminders();
              // The ReminderList component will automatically refresh
            } catch (error) {
              console.error('Error deleting all reminders:', error);
              Alert.alert('Error', 'Failed to delete reminders. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Reminders</Text>
        
        <TouchableOpacity 
          style={styles.deleteAllButton} 
          onPress={handleDeleteAllReminders}
          disabled={remindersCount === 0}
        >
          <Text style={[
            styles.deleteAllButtonText,
            remindersCount === 0 && styles.disabledText
          ]}>
            Clear All
          </Text>
        </TouchableOpacity>
      </View>
      
      <ReminderList 
        onReminderCountChange={setRemindersCount}
      />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
  },
  deleteAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteAllButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    fontFamily: FONTS.secondary,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default RemindersScreen; 