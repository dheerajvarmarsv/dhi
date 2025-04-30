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
import { Reminder, loadReminders, deleteReminder, completeReminder, formatReminderTime, getTimeRemaining, getOverdueText, updateTodoItem } from '../utils/reminderUtils';

const { width } = Dimensions.get('window');

interface ReminderListProps {
  onReminderCountChange?: (count: number) => void;
  showUpcoming?: boolean;
  showCompleted?: boolean;
  showRecurring?: boolean;
  showTodoList?: boolean;
  onlyRecurring?: boolean;
  onlyTodoList?: boolean;
}

const ReminderList: React.FC<ReminderListProps> = ({ 
  onReminderCountChange,
  showUpcoming = true,
  showCompleted = true, 
  showRecurring = true,
  showTodoList = true,
  onlyRecurring = false,
  onlyTodoList = false
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
  }, [showUpcoming, showCompleted, showRecurring, showTodoList, onlyRecurring, onlyTodoList]);
  
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
        if (isRecurring && !showRecurring) return false;
        if (isTodoList && !showTodoList) return false;
        
        // Special filter for only recurring reminders
        if (onlyRecurring && !isRecurring) return false;
        
        // Special filter for only todo list reminders
        if (onlyTodoList && !isTodoList) return false;
        
        return true;
      });
      
      // Sort reminders by timestamp, active ones first
      const sortedReminders = filteredReminders.sort((a, b) => {
        // Active reminders first
        if (!a.isCompleted && b.isCompleted) return -1;
        if (a.isCompleted && !b.isCompleted) return 1;
        
        // Then by timestamp (newer first for completed, older first for active)
        if (a.isCompleted && b.isCompleted) {
          return b.timestamp - a.timestamp; // Newer completed reminders first
        } else {
          return a.timestamp - b.timestamp; // Older active reminders first (urgent)
        }
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
  
  const handleToggleTodoItem = async (reminderId: string, todoItemId: string) => {
    try {
      await updateTodoItem(reminderId, todoItemId);
      
      // Update the UI
      setReminders(prev => 
        prev.map(reminder => {
          if (reminder.id === reminderId && reminder.todoList) {
            return {
              ...reminder,
              todoList: {
                ...reminder.todoList,
                items: reminder.todoList.items.map(item => 
                  item.id === todoItemId ? { ...item, isCompleted: !item.isCompleted } : item
                )
              }
            };
          }
          return reminder;
        })
      );
    } catch (error) {
      console.error('Error updating todo item:', error);
    }
  };
  
  const renderReminderItem = ({ item }: { item: Reminder }) => {
    const isPast = item.timestamp < Date.now();
    const isActive = !item.isCompleted && !isPast;
    const isRecurring = !!item.recurrence;
    const isTodoList = !!item.todoList;
    
    // Determine the type icon
    let typeIcon = '🔔'; // Default standard reminder
    if (isRecurring) {
      typeIcon = '🔄'; // Recurring reminder
    } else if (isTodoList) {
      typeIcon = '📋'; // To-do list
    }
    
    // Determine the priority indicator
    let priorityIndicator = 'ℹ️'; // Default low priority
    if (item.priority === 'high') {
      priorityIndicator = '❗'; // High priority
    } else if (item.priority === 'medium') {
      priorityIndicator = '⚠️'; // Medium priority
    }
    
    // Determine the left border color based on priority and status
    let borderColor = '#4CAF50'; // Default green for normal reminders
    if (item.isCompleted) {
      borderColor = '#B0B0B0'; // Gray for completed
    } else if (item.priority === 'high') {
      borderColor = '#FF5252'; // Red for high priority
    } else if (item.priority === 'medium') {
      borderColor = '#FFA726'; // Orange for medium priority
    } else if (item.priority === 'low') {
      borderColor = '#4CAF50'; // Green for low priority
    }
    
    // For past but uncompleted reminders, always show red
    if (isPast && !item.isCompleted) {
      borderColor = '#FF5252';
    }
    
    // Calculate todo list progress if applicable
    let todoProgress = '';
    if (isTodoList && item.todoList) {
      const totalItems = item.todoList.items.length;
      const completedItems = item.todoList.items.filter(i => i.isCompleted).length;
      todoProgress = `${completedItems}/${totalItems} completed`;
    }
    
    return (
      <Animated.View style={[
        styles.reminderItem,
        item.isCompleted && styles.completedItem,
        isPast && !item.isCompleted && styles.pastItem,
        { borderLeftWidth: 4, borderLeftColor: borderColor }
      ]}>
        <View style={styles.reminderContent}>
          {/* First row: Type icon + priority indicator + reminder text */}
          <View style={styles.reminderHeader}>
            <View style={styles.typeAndPriorityContainer}>
              <Text style={styles.typeIcon}>{typeIcon}</Text>
              <Text style={styles.priorityIndicator}>{priorityIndicator}</Text>
              
              {/* Show reminder type badge */}
              {isRecurring && (
                <Text style={styles.typeBadge}>Recurring</Text>
              )}
              {isTodoList && (
                <Text style={styles.typeBadge}>To-Do List</Text>
              )}
              {!isRecurring && !isTodoList && (
                <Text style={styles.typeBadge}>Reminder</Text>
              )}
              
              {/* Always show priority level */}
              <Text style={[
                styles.priorityBadge,
                item.priority === 'high' && styles.highPriorityBadge,
                item.priority === 'medium' && styles.mediumPriorityBadge,
                item.priority === 'low' && styles.lowPriorityBadge
              ]}>
                {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
              </Text>
            </View>
          </View>
          
          {/* Reminder text */}
          <Text style={[
            styles.reminderText,
            item.isCompleted && styles.completedText,
            isPast && !item.isCompleted && styles.pastText,
          ]}>
            {item.text}
          </Text>
          
          {/* Second row: Detailed content based on reminder type */}
          {/* For to-do lists, include the first few items with checkboxes */}
          {isTodoList && item.todoList && item.todoList.items && (
            <View style={styles.todoItemsContainer}>
              {item.todoList.items.slice(0, 3).map((todoItem, index) => (
                <View key={todoItem.id || index} style={styles.todoItem}>
                  <TouchableOpacity
                    onPress={() => handleToggleTodoItem(item.id, todoItem.id)}
                    style={styles.todoCheckboxTouchable}
                  >
                    <View style={[
                      styles.todoCheckbox,
                      todoItem.isCompleted && styles.todoCheckboxChecked
                    ]}>
                      {todoItem.isCompleted && <Text style={styles.todoCheckmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                  <Text style={[
                    styles.todoItemText,
                    todoItem.isCompleted && styles.todoItemTextCompleted
                  ]}>
                    {todoItem.text}
                  </Text>
                </View>
              ))}
              
              {/* Show progress and expandable indicator if needed */}
              <View style={styles.todoProgressContainer}>
                {item.todoList.items.length > 3 && (
                  <Text style={styles.todoItemsMore}>
                    +{item.todoList.items.length - 3} more items
                  </Text>
                )}
                <Text style={styles.todoProgress}>{todoProgress}</Text>
              </View>
            </View>
          )}
          
          {/* For recurring reminders, show recurrence pattern */}
          {isRecurring && item.recurrence && (
            <View style={styles.recurrenceContainer}>
              <Text style={styles.recurrencePattern}>
                {item.recurrence.type === 'daily' && (
                  item.recurrence.interval && item.recurrence.interval > 1 
                    ? `Every ${item.recurrence.interval} days` 
                    : 'Daily'
                )}
                {item.recurrence.type === 'weekly' && (
                  item.recurrence.daysOfWeek && item.recurrence.daysOfWeek.length > 0
                    ? (() => {
                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        return `Weekly on ${item.recurrence.daysOfWeek.map(d => days[d]).join(', ')}`;
                      })()
                    : 'Weekly'
                )}
                {item.recurrence.type === 'monthly' && (
                  item.recurrence.dayOfMonth 
                    ? `Monthly on day ${item.recurrence.dayOfMonth}` 
                    : 'Monthly'
                )}
                {item.recurrence.type === 'custom' && (
                  item.recurrence.interval 
                    ? `Every ${item.recurrence.interval} days` 
                    : 'Custom'
                )}
              </Text>
            </View>
          )}
          
          {/* Third row: Time and status information */}
          <View style={styles.reminderMetadata}>
            <Text style={[
              styles.reminderTime,
              item.isCompleted && styles.completedText,
              isPast && !item.isCompleted && styles.pastText,
            ]}>
              {formatReminderTime(item.timestamp)}
            </Text>
            
            {/* Status badges */}
            {isActive && (
              <View style={[styles.statusBadge, styles.activeBadge]}>
                <Text style={styles.statusBadgeText}>
                  Due in {getTimeRemaining(item.timestamp)}
                </Text>
              </View>
            )}
            
            {isPast && !item.isCompleted && (
              <View style={[styles.statusBadge, styles.overdueBadge]}>
                <Text style={styles.statusBadgeText}>
                  {getOverdueText(item.timestamp)}
                </Text>
              </View>
            )}
            
            {item.isCompleted && (
              <View style={[styles.statusBadge, styles.completedBadge]}>
                <Text style={styles.statusBadgeText}>
                  Completed
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Action buttons */}
        <View style={styles.reminderActions}>
          {!item.isCompleted && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleCompleteReminder(item.id)}
              accessible={true}
              accessibilityLabel={`Complete reminder: ${item.text}`}
              accessibilityRole="button"
              accessibilityHint="Double tap to mark this reminder as completed"
            >
              <Text style={styles.completeButtonText}>✓</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteReminder(item.id)}
            accessible={true}
            accessibilityLabel={`Delete reminder: ${item.text}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to delete this reminder"
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
    paddingTop: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderLeftWidth: 4,
  },
  completedItem: {
    backgroundColor: '#F9F9F9',
    opacity: 0.85,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  pastItem: {
    backgroundColor: '#FFF8F8',
  },
  recurringItem: {
    // No special styling needed - will use the border for this
  },
  todoListItem: {
    // No special styling needed - will use the border for this
  },
  reminderContent: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  recurringBadge: {
    fontSize: 12,
    color: '#505050',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  todoBadge: {
    fontSize: 12,
    color: '#505050',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  priorityBadge: {
    fontSize: 12,
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    overflow: 'hidden',
    fontWeight: '500',
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
    color: '#555555',
  },
  reminderMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  reminderTime: {
    fontSize: 14,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
  },
  recurrenceInfo: {
    fontSize: 12,
    color: '#505050',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
    overflow: 'hidden',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
    overflow: 'hidden',
  },
  activeBadge: {
    backgroundColor: '#E3F2FD',
  },
  overdueBadge: {
    backgroundColor: '#FFEBEE',
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#303030',
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
    color: '#FF5252',
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
  reminderActions: {
    justifyContent: 'center',
    marginLeft: 10,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
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
    backgroundColor: '#FF5252',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  todoItemsContainer: {
    marginVertical: 8,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: Math.min(12, width * 0.03),
    width: '100%',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  todoCheckboxTouchable: {
    padding: 4,
  },
  todoCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#B0B0B0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  todoCheckboxChecked: {
    backgroundColor: '#4BB543',
    borderColor: '#4BB543',
  },
  todoCheckmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  todoItemText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  todoItemTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#888888',
  },
  todoItemsMore: {
    fontSize: 12,
    color: COLORS.lightText,
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
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
    padding: Math.min(24, width * 0.06),
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
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
  typeAndPriorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  priorityIndicator: {
    fontSize: 16,
    marginRight: 6,
  },
  typeBadge: {
    fontSize: 12,
    color: '#505050',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  highPriorityBadge: {
    backgroundColor: '#FF5252',
  },
  mediumPriorityBadge: {
    backgroundColor: '#FFA726',
  },
  lowPriorityBadge: {
    backgroundColor: '#4CAF50',
  },
  todoProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  todoProgress: {
    fontSize: 12,
    color: '#606060',
    fontWeight: '500',
  },
  recurrenceContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
    marginVertical: 6,
  },
  recurrencePattern: {
    fontSize: 14,
    color: '#505050',
    fontWeight: '500',
  },
});

export default ReminderList; 