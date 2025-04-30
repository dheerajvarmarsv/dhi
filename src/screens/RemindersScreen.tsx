import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ReminderList from '../components/ReminderList';
import { deleteAllReminders } from '../utils/reminderUtils';
import { COLORS, FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');

type FilterType = 'all' | 'upcoming' | 'completed' | 'recurring' | 'todolist';

const RemindersScreen: React.FC = () => {
  const [remindersCount, setRemindersCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
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
  
  const getFilterProps = (filter: FilterType) => {
    switch (filter) {
      case 'upcoming':
        return { showUpcoming: true, showCompleted: false, showRecurring: false, showTodoList: false };
      case 'completed':
        return { showUpcoming: false, showCompleted: true, showRecurring: false, showTodoList: false };
      case 'recurring':
        return { showUpcoming: true, showCompleted: false, showRecurring: true, showTodoList: false };
      case 'todolist':
        return { showUpcoming: true, showCompleted: true, showRecurring: false, showTodoList: true };
      case 'all':
      default:
        return { showUpcoming: true, showCompleted: true, showRecurring: true, showTodoList: true };
    }
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
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'all' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'upcoming' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('upcoming')}
          >
            <Text style={[styles.filterText, activeFilter === 'upcoming' && styles.activeFilterText]}>
              Upcoming
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'recurring' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('recurring')}
          >
            <Text style={[styles.filterText, activeFilter === 'recurring' && styles.activeFilterText]}>
              🔄 Recurring
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'todolist' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('todolist')}
          >
            <Text style={[styles.filterText, activeFilter === 'todolist' && styles.activeFilterText]}>
              📋 To-Do Lists
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'completed' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('completed')}
          >
            <Text style={[styles.filterText, activeFilter === 'completed' && styles.activeFilterText]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <ReminderList 
        onReminderCountChange={setRemindersCount}
        {...getFilterProps(activeFilter)}
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
  filterScrollView: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.secondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
  },
});

export default RemindersScreen; 