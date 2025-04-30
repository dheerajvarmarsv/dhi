import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS } from '../constants/theme';
import { Reminder, loadReminders, deleteReminder, completeReminder, formatReminderTime, getTimeRemaining } from '../utils/reminderUtils';

const { width } = Dimensions.get('window');

interface ReminderListProps {
  onReminderCountChange?: (count: number) => void;
  showUpcoming?: boolean;
  showCompleted?: boolean;
  showRecurring?: boolean;
  showTodoList?: boolean;
}

const ReminderList: React.FC<ReminderListProps> = ({ 
  onReminderCountChange,
  showUpcoming = true,
  showCompleted = true, 
  showRecurring = true,
  showTodoList = true
}) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  
  useEffect(() => {
    loadReminderData();
    
    // Refresh every minute to update time remaining
    const interval = setInterval(() => {
      loadReminderData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [showUpcoming, showCompleted, showRecurring, showTodoList]);
  
  const loadReminderData = async () => {
    try {
      const allReminders = await loadReminders();
      
      // Filter reminders based on props
      const filteredReminders = allReminders.filter(reminder => {
        const isUpcoming = !reminder.isCompleted && reminder.timestamp >= Date.now();
        const isCompleted = reminder.isCompleted;
        const isRecurring = !!reminder.recurrence;
        const isTodoList = !!reminder.todoList;
        
        // Apply filters
        if (isUpcoming && !showUpcoming) return false;
        if (isCompleted && !showCompleted) return false;
        
        // Special case: if we're showing only recurring items
        if (showRecurring && !showTodoList && !isRecurring) return false;
        
        // Special case: if we're showing only todo lists
        if (showTodoList && !showRecurring && !isTodoList) return false;
        
        return true;
      });
      
      // Sort reminders by timestamp, active ones first
      const sortedReminders = filteredReminders.sort((a, b) => {
        // Active reminders first
        if (!a.isCompleted && b.isCompleted) return -1;
        if (a.isCompleted && !b.isCompleted) return 1;
        
        // Recurring reminders after regular ones if filtering for recurring
        if (showRecurring && !showUpcoming) {
          if (a.recurrence && !b.recurrence) return -1;
          if (!a.recurrence && b.recurrence) return 1;
        }
        
        // Todo list reminders first if filtering for todo lists
        if (showTodoList && !showUpcoming) {
          if (a.todoList && !b.todoList) return -1;
          if (!a.todoList && b.todoList) return 1;
        }
        
        // Then by timestamp
        return a.timestamp - b.timestamp;
      });
      
      setReminders(sortedReminders);
      
      // Notify parent of active reminder count if callback provided
      if (onReminderCountChange) {
        const activeCount = allReminders.filter(
          r => !r.isCompleted && r.timestamp > Date.now()
        ).length;
        onReminderCountChange(activeCount);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadReminderData();
  };
  
  const handleCompleteReminder = async (id: string) => {
    try {
      await completeReminder(id);
      
      // Update the UI
      setReminders(prev => 
        prev.map(reminder => 
          reminder.id === id ? { ...reminder, isCompleted: true } : reminder
        )
      );
      
      // Update count
      if (onReminderCountChange) {
        const activeCount = reminders.filter(
          r => !r.isCompleted && r.timestamp > Date.now() && r.id !== id
        ).length;
        onReminderCountChange(activeCount);
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };
  
  const handleDeleteReminder = async (id: string) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReminder(id);
              
              // Update the UI
              setReminders(prev => prev.filter(reminder => reminder.id !== id));
              
              // Update count
              if (onReminderCountChange) {
                const activeCount = reminders.filter(
                  r => !r.isCompleted && r.timestamp > Date.now() && r.id !== id
                ).length;
                onReminderCountChange(activeCount);
              }
            } catch (error) {
              console.error('Error deleting reminder:', error);
            }
          },
        },
      ]
    );
  };
  
  const handleNavigateToChat = (chatId?: string) => {
    if (chatId) {
      // @ts-ignore - Ignore the type error for now
      navigation.navigate('Chat', { chatId });
    }
  };
  
  const renderReminderItem = ({ item }: { item: Reminder }) => {
    const isPast = item.timestamp < Date.now();
    const isActive = !item.isCompleted && !isPast;
    const isRecurring = !!item.recurrence;
    const isTodoList = !!item.todoList;
    
    return (
      <Animated.View style={[
        styles.reminderItem,
        item.isCompleted && styles.completedItem,
        isPast && !item.isCompleted && styles.pastItem,
        isRecurring && styles.recurringItem,
        isTodoList && styles.todoListItem,
      ]}>
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            {isRecurring && (
              <Text style={styles.recurringBadge}>🔄 Recurring</Text>
            )}
            {isTodoList && (
              <Text style={styles.todoBadge}>📋 To-Do List</Text>
            )}
            {item.priority === 'high' && (
              <Text style={styles.priorityBadge}>❗ High Priority</Text>
            )}
          </View>
          
          <Text style={[
            styles.reminderText,
            item.isCompleted && styles.completedText,
            isPast && !item.isCompleted && styles.pastText,
          ]}>
            {item.text}
          </Text>
          
          {/* Display todo list items if present */}
          {isTodoList && item.todoList && item.todoList.items && (
            <View style={styles.todoItemsContainer}>
              {item.todoList.items.slice(0, 3).map((todoItem, index) => (
                <View key={todoItem.id || index} style={styles.todoItem}>
                  <View style={[
                    styles.todoCheckbox,
                    todoItem.isCompleted && styles.todoCheckboxChecked
                  ]}>
                    {todoItem.isCompleted && <Text style={styles.todoCheckmark}>✓</Text>}
                  </View>
                  <Text style={[
                    styles.todoItemText,
                    todoItem.isCompleted && styles.todoItemTextCompleted
                  ]}>
                    {todoItem.text}
                  </Text>
                </View>
              ))}
              {item.todoList.items.length > 3 && (
                <Text style={styles.todoItemsMore}>
                  +{item.todoList.items.length - 3} more items
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.reminderMetadata}>
            <Text style={[
              styles.reminderTime,
              item.isCompleted && styles.completedText,
              isPast && !item.isCompleted && styles.pastText,
            ]}>
              {formatReminderTime(item.timestamp)}
            </Text>
            
            {/* Show recurrence information */}
            {isRecurring && item.recurrence && (
              <Text style={styles.recurrenceInfo}>
                {item.recurrence.type === 'daily' && (
                  item.recurrence.interval && item.recurrence.interval > 1 
                    ? `Every ${item.recurrence.interval} days` 
                    : 'Daily'
                )}
                {item.recurrence.type === 'weekly' && (
                  'Weekly'
                )}
                {item.recurrence.type === 'monthly' && (
                  item.recurrence.dayOfMonth 
                    ? `Monthly (Day ${item.recurrence.dayOfMonth})` 
                    : 'Monthly'
                )}
                {item.recurrence.type === 'custom' && (
                  item.recurrence.interval 
                    ? `Every ${item.recurrence.interval} days` 
                    : 'Custom'
                )}
              </Text>
            )}
            
            {isActive && (
              <Text style={styles.timeRemaining}>
                In {getTimeRemaining(item.timestamp)}
              </Text>
            )}
            
            {isPast && !item.isCompleted && (
              <Text style={styles.pastLabel}>
                Missed
              </Text>
            )}
            
            {item.isCompleted && (
              <Text style={styles.completedLabel}>
                Completed
              </Text>
            )}
          </View>
          
          {item.chatId && (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => handleNavigateToChat(item.chatId)}
            >
              <Text style={styles.chatButtonText}>View Chat</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.reminderActions}>
          {!item.isCompleted && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleCompleteReminder(item.id)}
            >
              <Text style={styles.completeButtonText}>✓</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteReminder(item.id)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading reminders...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {reminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No reminders yet</Text>
          <Text style={styles.emptySubtext}>
            Your reminders will appear here when you create them.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          renderItem={renderReminderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: Math.min(16, width * 0.04),
    paddingBottom: 20,
  },
  reminderItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  completedItem: {
    backgroundColor: '#F5F5F5',
    opacity: 0.8,
  },
  pastItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B', // Reddish color for missed reminders
  },
  reminderContent: {
    flex: 1,
  },
  reminderText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.primary,
    marginBottom: 8,
  },
  completedText: {
    color: '#888888',
    textDecorationLine: 'line-through',
  },
  pastText: {
    color: '#888888',
  },
  reminderMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  reminderTime: {
    fontSize: 14,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
  },
  timeRemaining: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.secondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  pastLabel: {
    fontSize: 12,
    color: '#FF6B6B',
    fontFamily: FONTS.secondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  completedLabel: {
    fontSize: 12,
    color: '#4BB543',
    fontFamily: FONTS.secondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  chatButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  chatButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.secondary,
    fontWeight: '500',
  },
  reminderActions: {
    justifyContent: 'center',
    marginLeft: 10,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  completeButton: {
    backgroundColor: '#4BB543',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.lightText,
    fontFamily: FONTS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
    textAlign: 'center',
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recurringBadge: {
    backgroundColor: '#FFD700',
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  todoBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  priorityBadge: {
    backgroundColor: '#FF0000',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  todoItemsContainer: {
    marginBottom: 8,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  todoCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  todoCheckboxChecked: {
    backgroundColor: '#4CAF50',
  },
  todoCheckmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  todoItemText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  todoItemTextCompleted: {
    color: '#888888',
    textDecorationLine: 'line-through',
  },
  todoItemsMore: {
    fontSize: 14,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
  },
  recurrenceInfo: {
    fontSize: 12,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
    marginLeft: 8,
  },
  recurringItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  todoListItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
});

export default ReminderList; 