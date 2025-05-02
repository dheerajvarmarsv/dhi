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
        return { 
          showUpcoming: true, 
          showCompleted: false, 
          showRecurring: false, 
          showTodoList: false 
        };
      case 'completed':
        return { 
          showUpcoming: false, 
          showCompleted: true, 
          showRecurring: true, 
          showTodoList: true 
        };
      case 'recurring':
        return { 
          showUpcoming: true, 
          showCompleted: true, 
          showRecurring: true, 
          showTodoList: false,
          onlyRecurring: true 
        };
      case 'todolist':
        return { 
          showUpcoming: true, 
          showCompleted: true, 
          showRecurring: false, 
          showTodoList: true,
          onlyTodoList: true 
        };
      case 'all':
      default:
        return { 
          showUpcoming: true, 
          showCompleted: true, 
          showRecurring: true, 
          showTodoList: true 
        };
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
          accessibilityLabel="Clear all reminders"
          accessibilityHint="Deletes all reminders regardless of their status"
        >
          <Text style={styles.deleteAllButtonText}>
            Clear All
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'all' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('all')}
            accessibilityLabel="All reminders filter"
            accessibilityRole="button"
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'upcoming' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('upcoming')}
            accessibilityLabel="Upcoming reminders filter"
            accessibilityRole="button"
          >
            <Text style={[styles.filterText, activeFilter === 'upcoming' && styles.activeFilterText]}>
              Upcoming
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'recurring' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('recurring')}
            accessibilityLabel="Recurring reminders filter"
            accessibilityRole="button"
          >
            <Text style={[styles.filterText, activeFilter === 'recurring' && styles.activeFilterText]}>
              🔄 Recurring
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'todolist' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('todolist')}
            accessibilityLabel="To-Do list reminders filter"
            accessibilityRole="button"
          >
            <Text style={[styles.filterText, activeFilter === 'todolist' && styles.activeFilterText]}>
              📋 To-Do Lists
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'completed' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('completed')}
            accessibilityLabel="Completed reminders filter"
            accessibilityRole="button"
          >
            <Text style={[styles.filterText, activeFilter === 'completed' && styles.activeFilterText]}>
              Completed
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
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
    paddingHorizontal: Math.min(16, width * 0.04),
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: COLORS.background,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  headerTitle: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
  },
  deleteAllButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  deleteAllButtonText: {
    fontSize: 14,
    color: '#FF5252',
    fontWeight: '600',
    fontFamily: FONTS.secondary,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: COLORS.background,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: Math.min(8, width * 0.02),
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    height: 32,
    minWidth: 70,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: Math.min(12, width * 0.03),
    color: COLORS.text,
    fontFamily: FONTS.secondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default RemindersScreen; 