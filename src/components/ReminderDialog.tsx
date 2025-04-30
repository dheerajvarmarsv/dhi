// src/components/ReminderDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  Keyboard,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
  Switch,
  Image,
  SafeAreaView,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { 
  extractReminderFromText, 
  addReminder, 
  playReminderSound, 
  extractTimeFromText,
  addRecurringReminder,
  addTodoListReminder,
  Reminder
} from '../utils/reminderUtils';
import moment from 'moment';

const { width, height } = Dimensions.get('window');

// Add enhanced time extraction function for better detection
const enhancedExtractTimeFromText = (text: string): Date => {
  // First try the existing extraction
  const extractionResult = extractReminderFromText(text);
  if (extractionResult && extractionResult.time) {
    return extractionResult.time;
  }
  
  // Next try the time extraction utility
  const { time } = extractTimeFromText(text);
  if (time) {
    return time;
  }
  
  // Fallback for simple cases: X min/minutes/mins
  const minutesMatch = text.match(/(\d+)\s*(min|mins|minutes)/i);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1], 10);
    return new Date(Date.now() + minutes * 60 * 1000);
  }
  
  // Fallback for simple cases: X hour/hours
  const hoursMatch = text.match(/(\d+)\s*(hour|hours|hr|hrs)/i);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  
  // Default to current time + 5 minutes if nothing detected
  return new Date(Date.now() + 5 * 60 * 1000);
};

interface TodoItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

interface ReminderDialogProps {
  visible: boolean;
  onClose: () => void;
  reminderText: string;
  chatId?: string;
  onReminderSet: (reminderTime: Date, reminderText: string, options?: {
    recurrence?: Reminder['recurrence'],
    todoItems?: TodoItem[]
  }) => void;
}

const ReminderDialog: React.FC<ReminderDialogProps> = ({
  visible,
  onClose,
  reminderText,
  chatId,
  onReminderSet,
}) => {
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date());
  const [animatedValue] = useState(new Animated.Value(0));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [repeating, setRepeating] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'custom'>('none');
  
  // New state variables for recurring reminders
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
  
  // To-do list related state
  const [isTodoList, setIsTodoList] = useState(false);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [newTodoItem, setNewTodoItem] = useState('');
  
  // Show advanced options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Preset time options
  const timeOptions = [
    { label: '5 min', value: moment().add(5, 'minutes').toDate() },
    { label: '15 min', value: moment().add(15, 'minutes').toDate() },
    { label: '30 min', value: moment().add(30, 'minutes').toDate() },
    { label: '1 hour', value: moment().add(1, 'hour').toDate() },
    { label: '3 hours', value: moment().add(3, 'hours').toDate() },
    { label: 'Tomorrow', value: moment().add(1, 'day').hour(9).minute(0).second(0).toDate() },
  ];

  // Process text to extract suggested reminder time
  useEffect(() => {
    if (visible && reminderText) {
      setText(reminderText);
      
      // Use the enhanced time extraction
      const extractedTime = enhancedExtractTimeFromText(reminderText);
      setDate(extractedTime);
      
      // For case-insensitive checks
      const textLower = reminderText.toLowerCase();
      
      // Check for priority keywords
      if (textLower.includes('urgent') || textLower.includes('important') || 
          textLower.includes('critical') || textLower.includes('asap')) {
        setPriority('high');
      } else if (textLower.includes('low priority') || textLower.includes('whenever') || 
                textLower.includes('not urgent')) {
        setPriority('low');
      }
    }
  }, [visible, reminderText]);
  
  // Animation effect
  useEffect(() => {
    if (visible) {
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, animatedValue]);
  
  const handleSetReminder = async () => {
    try {
      if (!text.trim()) {
        return;
      }
      
      // Create a recurrence object if applicable
      let recurrenceOptions: Reminder['recurrence'] | undefined = undefined;
      
      if (repeating !== 'none') {
        recurrenceOptions = {
          type: repeating
        };
        
        // Add specific options based on recurrence type
        if (repeating === 'daily' || repeating === 'custom') {
          recurrenceOptions.interval = recurrenceInterval;
        } else if (repeating === 'weekly' && selectedDaysOfWeek.length > 0) {
          recurrenceOptions.daysOfWeek = selectedDaysOfWeek;
          recurrenceOptions.interval = recurrenceInterval;
        } else if (repeating === 'monthly') {
          recurrenceOptions.dayOfMonth = dayOfMonth;
        }
      }
      
      // Process based on type of reminder
      if (isTodoList && todoItems.length > 0) {
        // Create a to-do list reminder
        const items = todoItems.map(item => item.text);
        await addTodoListReminder(
          text.trim(),
          date.getTime(),
          items,
          chatId,
          priority,
          soundEnabled
        );
        
        // Notify the parent component
        onReminderSet(date, text.trim(), {
          todoItems: todoItems
        });
      } else if (recurrenceOptions) {
        // Create a recurring reminder
        await addRecurringReminder(
          text.trim(),
          date.getTime(),
          recurrenceOptions,
          chatId,
          priority,
          soundEnabled
        );
        
        // Notify the parent component
        onReminderSet(date, text.trim(), {
          recurrence: recurrenceOptions
        });
      } else {
        // Create a regular reminder
        await addReminder(
          text.trim(),
          date.getTime(),
          chatId,
          priority,
          soundEnabled
        );
        
        // Notify the parent component
        onReminderSet(date, text.trim());
      }
      
      // Play a confirmation sound
      if (soundEnabled) {
        playReminderSound();
      }
      
      // Close the dialog
      onClose();
    } catch (error) {
      console.error('Error setting reminder:', error);
    }
  };
  
  const handleTimeOptionPress = (option: { value: Date }) => {
    setDate(option.value);
  };
  
  const handleCustomTime = () => {
    // Only show picker on Android directly
    // For iOS we show it inline
    if (Platform.OS === 'android') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(!showDatePicker);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // On Android, the picker will close automatically after selection
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setDate(selectedDate);
    }
  };
  
  // Format the selected date for display
  const formattedDate = (() => {
    const now = moment();
    const reminderDate = moment(date);
    
    if (reminderDate.isSame(now, 'day')) {
      return `Today at ${reminderDate.format('h:mm A')}`;
    } else if (reminderDate.isSame(now.clone().add(1, 'day'), 'day')) {
      return `Tomorrow at ${reminderDate.format('h:mm A')}`;
    } else {
      return reminderDate.format('MMM D, YYYY [at] h:mm A');
    }
  })();
  
  // Animation styles
  const animatedStyles = {
    opacity: animatedValue,
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [300, 0],
        }),
      },
    ],
  };

  // Get icon for priority
  const getPriorityIcon = () => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟠';
      case 'low':
        return '🟢';
      default:
        return '🟠';
    }
  };
  
  // Helper function to handle adding a new todo item
  const handleAddTodoItem = () => {
    if (!newTodoItem.trim()) return;
    
    const newItem: TodoItem = {
      id: `todo_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      text: newTodoItem.trim(),
      isCompleted: false
    };
    
    setTodoItems([...todoItems, newItem]);
    setNewTodoItem('');
  };
  
  // Helper function to remove a todo item
  const handleRemoveTodoItem = (id: string) => {
    setTodoItems(todoItems.filter(item => item.id !== id));
  };
  
  // Helper function to toggle todo item completion
  const handleToggleTodoItem = (id: string) => {
    setTodoItems(todoItems.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };
  
  // Helper for day of week selection
  const toggleDayOfWeek = (day: number) => {
    if (selectedDaysOfWeek.includes(day)) {
      setSelectedDaysOfWeek(selectedDaysOfWeek.filter(d => d !== day));
    } else {
      setSelectedDaysOfWeek([...selectedDaysOfWeek, day]);
    }
  };
  
  // Get the day name from index
  const getDayName = (day: number): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };
  
  // Get human-readable recurrence text
  const getRecurrenceText = (): string => {
    switch (repeating) {
      case 'daily':
        return recurrenceInterval === 1 
          ? 'Every day' 
          : `Every ${recurrenceInterval} days`;
      
      case 'weekly':
        if (selectedDaysOfWeek.length === 0) {
          return recurrenceInterval === 1 
            ? 'Weekly' 
            : `Every ${recurrenceInterval} weeks`;
        } else if (selectedDaysOfWeek.length === 7) {
          return 'Every day';
        } else {
          const dayNames = selectedDaysOfWeek
            .sort()
            .map(day => getDayName(day))
            .join(', ');
          return `Every ${dayNames}`;
        }
      
      case 'monthly':
        const day = dayOfMonth;
        const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
        return `Monthly on the ${day}${suffix}`;
      
      case 'custom':
        return `Every ${recurrenceInterval} days`;
        
      default:
        return 'No repetition';
    }
  };
  
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.backdrop}>
            <TouchableOpacity style={styles.backdropTouch} onPress={onClose} />
            
            <Animated.View style={[styles.dialogContainer, animatedStyles]}>
              <View style={styles.header}>
                <Image 
                  source={require('../../assets/reminder.png')} 
                  style={styles.headerIcon}
                  resizeMode="contain"
                />
                <Text style={styles.headerTitle}>Set Reminder</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.label}>What to remember?</Text>
                <TextInput
                  style={styles.textInput}
                  value={text}
                  onChangeText={setText}
                  placeholder="Enter reminder text"
                  multiline
                  numberOfLines={2}
                  placeholderTextColor="#999"
                />
                
                <Text style={styles.label}>When?</Text>
                <TouchableOpacity style={styles.dateSelector} onPress={handleCustomTime}>
                  <Text style={styles.dateText}>{formattedDate}</Text>
                </TouchableOpacity>
                
                {/* Date picker section */}
                {(showDatePicker || Platform.OS === 'ios') && (
                  <View>
                    <DateTimePicker
                      value={date}
                      mode="datetime"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                      style={Platform.OS === 'ios' ? styles.datePicker : undefined}
                    />
                  </View>
                )}
                
                <Text style={styles.quickSelectLabel}>Quick select:</Text>
                <View style={styles.timeOptionsContainer}>
                  {timeOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeOption,
                        moment(date).isSame(moment(option.value)) && styles.timeOptionSelected,
                      ]}
                      onPress={() => handleTimeOptionPress(option)}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          moment(date).isSame(moment(option.value)) && styles.timeOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>Settings</Text>
                  
                  <View style={styles.settingRow}>
                    <View style={styles.settingLabelContainer}>
                      <Text style={styles.settingLabel}>Priority:</Text>
                      <Text style={styles.settingDescription}>Set importance level</Text>
                    </View>
                    <View style={styles.prioritySelector}>
                      <TouchableOpacity 
                        style={[styles.priorityOption, priority === 'low' && styles.prioritySelected]} 
                        onPress={() => setPriority('low')}
                      >
                        <Text style={styles.priorityText}>Low</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.priorityOption, priority === 'medium' && styles.prioritySelected]} 
                        onPress={() => setPriority('medium')}
                      >
                        <Text style={styles.priorityText}>Medium</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.priorityOption, priority === 'high' && styles.prioritySelected]} 
                        onPress={() => setPriority('high')}
                      >
                        <Text style={styles.priorityText}>High</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.settingRow}>
                    <View style={styles.settingLabelContainer}>
                      <Text style={styles.settingLabel}>Sound:</Text>
                      <Text style={styles.settingDescription}>Play notification when reminder is due</Text>
                      
                      {/* Sound info message */}
                      {soundEnabled && (
                        <Text style={styles.infoText}>
                          You'll receive an audible notification when this reminder is due
                        </Text>
                      )}
                    </View>
                    <Switch
                      value={soundEnabled}
                      onValueChange={setSoundEnabled}
                      trackColor={{ false: '#767577', true: COLORS.primaryLight }}
                      thumbColor={soundEnabled ? COLORS.primary : '#f4f3f4'}
                      ios_backgroundColor="#767577"
                      disabled={false}
                    />
                  </View>

                  {/* Advanced options toggle */}
                  <TouchableOpacity 
                    style={styles.advancedOptionsToggle}
                    onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  >
                    <Text style={styles.advancedOptionsText}>
                      {showAdvancedOptions ? 'Hide advanced options' : 'Show advanced options'}
                    </Text>
                    <Text style={styles.advancedOptionsIcon}>
                      {showAdvancedOptions ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Advanced options section */}
                  {showAdvancedOptions && (
                    <View style={styles.advancedOptionsContainer}>
                      {/* Recurrence options */}
                      <View style={styles.recurrenceSection}>
                        <Text style={styles.sectionTitle}>Recurrence</Text>
                        
                        <View style={styles.recurrenceOptions}>
                          <TouchableOpacity
                            style={[styles.recurrenceOption, repeating === 'none' && styles.recurrenceOptionSelected]}
                            onPress={() => {
                              setRepeating('none');
                              setShowRecurrenceOptions(false);
                            }}
                          >
                            <Text style={styles.recurrenceText}>None</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[styles.recurrenceOption, repeating === 'daily' && styles.recurrenceOptionSelected]}
                            onPress={() => {
                              setRepeating('daily');
                              setShowRecurrenceOptions(true);
                            }}
                          >
                            <Text style={styles.recurrenceText}>Daily</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[styles.recurrenceOption, repeating === 'weekly' && styles.recurrenceOptionSelected]}
                            onPress={() => {
                              setRepeating('weekly');
                              setShowRecurrenceOptions(true);
                            }}
                          >
                            <Text style={styles.recurrenceText}>Weekly</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[styles.recurrenceOption, repeating === 'monthly' && styles.recurrenceOptionSelected]}
                            onPress={() => {
                              setRepeating('monthly');
                              setShowRecurrenceOptions(true);
                            }}
                          >
                            <Text style={styles.recurrenceText}>Monthly</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[styles.recurrenceOption, repeating === 'custom' && styles.recurrenceOptionSelected]}
                            onPress={() => {
                              setRepeating('custom');
                              setShowRecurrenceOptions(true);
                            }}
                          >
                            <Text style={styles.recurrenceText}>Custom</Text>
                          </TouchableOpacity>
                        </View>
                        
                        {/* Show details based on the selected recurrence type */}
                        {showRecurrenceOptions && (
                          <View style={styles.recurrenceDetailsContainer}>
                            {repeating === 'daily' && (
                              <View style={styles.intervalContainer}>
                                <Text style={styles.intervalLabel}>Repeat every</Text>
                                <TextInput
                                  style={styles.intervalInput}
                                  value={recurrenceInterval.toString()}
                                  onChangeText={(text) => {
                                    const value = parseInt(text);
                                    if (!isNaN(value) && value > 0) {
                                      setRecurrenceInterval(value);
                                    } else if (text === '') {
                                      setRecurrenceInterval(1);
                                    }
                                  }}
                                  keyboardType="number-pad"
                                  maxLength={2}
                                />
                                <Text style={styles.intervalLabel}>day(s)</Text>
                              </View>
                            )}
                            
                            {repeating === 'weekly' && (
                              <View>
                                <View style={styles.intervalContainer}>
                                  <Text style={styles.intervalLabel}>Repeat every</Text>
                                  <TextInput
                                    style={styles.intervalInput}
                                    value={recurrenceInterval.toString()}
                                    onChangeText={(text) => {
                                      const value = parseInt(text);
                                      if (!isNaN(value) && value > 0) {
                                        setRecurrenceInterval(value);
                                      } else if (text === '') {
                                        setRecurrenceInterval(1);
                                      }
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                  />
                                  <Text style={styles.intervalLabel}>week(s)</Text>
                                </View>
                                
                                <Text style={styles.daysLabel}>On these days:</Text>
                                <View style={styles.daysContainer}>
                                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                                    <TouchableOpacity
                                      key={day}
                                      style={[
                                        styles.dayOption,
                                        selectedDaysOfWeek.includes(day) && styles.dayOptionSelected,
                                      ]}
                                      onPress={() => toggleDayOfWeek(day)}
                                    >
                                      <Text
                                        style={[
                                          styles.dayText,
                                          selectedDaysOfWeek.includes(day) && styles.dayTextSelected,
                                        ]}
                                      >
                                        {getDayName(day)}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                            )}
                            
                            {repeating === 'monthly' && (
                              <View style={styles.intervalContainer}>
                                <Text style={styles.intervalLabel}>On day</Text>
                                <TextInput
                                  style={styles.intervalInput}
                                  value={dayOfMonth.toString()}
                                  onChangeText={(text) => {
                                    const value = parseInt(text);
                                    if (!isNaN(value) && value > 0 && value <= 31) {
                                      setDayOfMonth(value);
                                    } else if (text === '') {
                                      setDayOfMonth(1);
                                    }
                                  }}
                                  keyboardType="number-pad"
                                  maxLength={2}
                                />
                                <Text style={styles.intervalLabel}>of each month</Text>
                              </View>
                            )}
                            
                            {repeating === 'custom' && (
                              <View style={styles.intervalContainer}>
                                <Text style={styles.intervalLabel}>Every</Text>
                                <TextInput
                                  style={styles.intervalInput}
                                  value={recurrenceInterval.toString()}
                                  onChangeText={(text) => {
                                    const value = parseInt(text);
                                    if (!isNaN(value) && value > 0) {
                                      setRecurrenceInterval(value);
                                    } else if (text === '') {
                                      setRecurrenceInterval(1);
                                    }
                                  }}
                                  keyboardType="number-pad"
                                  maxLength={3}
                                />
                                <Text style={styles.intervalLabel}>days</Text>
                              </View>
                            )}
                            
                            <Text style={styles.recurrenceSummary}>
                              {getRecurrenceText()}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* To-do List Section */}
                      <View style={styles.todoSection}>
                        <View style={styles.todoHeaderRow}>
                          <Text style={styles.sectionTitle}>To-do List</Text>
                          <Switch
                            value={isTodoList}
                            onValueChange={setIsTodoList}
                            trackColor={{ false: '#767577', true: COLORS.primaryLight }}
                            thumbColor={isTodoList ? COLORS.primary : '#f4f3f4'}
                            ios_backgroundColor="#767577"
                          />
                        </View>
                        
                        {isTodoList && (
                          <View style={styles.todoListContainer}>
                            <Text style={styles.todoDescription}>
                              Add items to your to-do list
                            </Text>
                            
                            <View style={styles.todoInputContainer}>
                              <TextInput
                                style={styles.todoInput}
                                value={newTodoItem}
                                onChangeText={setNewTodoItem}
                                placeholder="Add an item..."
                                placeholderTextColor="#999"
                                returnKeyType="done"
                                onSubmitEditing={handleAddTodoItem}
                              />
                              <TouchableOpacity
                                style={styles.addTodoButton}
                                onPress={handleAddTodoItem}
                                disabled={!newTodoItem.trim()}
                              >
                                <Text style={styles.addTodoButtonText}>+</Text>
                              </TouchableOpacity>
                            </View>
                            
                            <View style={styles.todoList}>
                              {todoItems.length === 0 ? (
                                <Text style={styles.emptyTodoText}>
                                  No items yet. Add some items above.
                                </Text>
                              ) : (
                                <FlatList
                                  data={todoItems}
                                  keyExtractor={item => item.id}
                                  renderItem={({ item }) => (
                                    <View style={styles.todoItem}>
                                      <TouchableOpacity
                                        style={styles.todoCheckbox}
                                        onPress={() => handleToggleTodoItem(item.id)}
                                      >
                                        <View style={[
                                          styles.checkbox,
                                          item.isCompleted && styles.checkboxChecked
                                        ]}>
                                          {item.isCompleted && (
                                            <Text style={styles.checkmark}>✓</Text>
                                          )}
                                        </View>
                                      </TouchableOpacity>
                                      
                                      <Text style={[
                                        styles.todoItemText,
                                        item.isCompleted && styles.todoItemTextCompleted
                                      ]}>
                                        {item.text}
                                      </Text>
                                      
                                      <TouchableOpacity
                                        style={styles.removeTodoButton}
                                        onPress={() => handleRemoveTodoItem(item.id)}
                                      >
                                        <Text style={styles.removeTodoButtonText}>×</Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                  style={styles.todoListContent}
                                />
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
              
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.setButton, !text.trim() && styles.disabledButton]}
                  onPress={handleSetReminder}
                  disabled={!text.trim()}
                >
                  <Text style={styles.setButtonText}>
                    Set {getPriorityIcon()} Reminder
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeContainer: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogContainer: {
    width: width > 500 ? 450 : width * 0.92,
    maxHeight: height * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.primaryLight,
  },
  headerIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
    tintColor: COLORS.primary,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.text,
    lineHeight: 20,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#FAFAFA',
    marginBottom: 20,
    fontFamily: FONTS.primary,
    minHeight: 80,
  },
  dateSelector: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  datePicker: {
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    ...Platform.select({
      ios: {
        marginTop: -8,
      },
    }),
  },
  quickSelectLabel: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 8,
    fontFamily: FONTS.secondary,
  },
  timeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  timeOption: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
  },
  timeOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  timeOptionText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.secondary,
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
  },
  settingsSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    fontFamily: FONTS.primary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabelContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
    marginTop: 2,
  },
  prioritySelector: {
    flexDirection: 'row',
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  priorityOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  prioritySelected: {
    backgroundColor: COLORS.primary,
  },
  priorityText: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONTS.secondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    padding: 15,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: FONTS.primary,
  },
  setButton: {
    backgroundColor: COLORS.primary,
    flex: 1,
  },
  setButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: FONTS.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
    marginTop: 8,
  },
  advancedOptionsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  advancedOptionsText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  advancedOptionsIcon: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  advancedOptionsContainer: {
    padding: 16,
  },
  recurrenceSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    fontFamily: FONTS.primary,
  },
  recurrenceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  recurrenceOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  recurrenceOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  recurrenceText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  recurrenceDetailsContainer: {
    padding: 12,
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  intervalLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  intervalInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 8,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#FAFAFA',
    flex: 1,
  },
  daysLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
    marginBottom: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  dayOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  recurrenceSummary: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  todoSection: {
    marginBottom: 16,
  },
  todoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  todoListContainer: {
    padding: 12,
  },
  todoDescription: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
    marginBottom: 12,
  },
  todoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  todoInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 8,
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#FAFAFA',
  },
  addTodoButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  addTodoButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    fontFamily: FONTS.primary,
  },
  todoList: {
    marginBottom: 12,
  },
  emptyTodoText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
    textAlign: 'center',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  todoCheckbox: {
    padding: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 4,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  todoItemText: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  todoItemTextCompleted: {
    textDecorationLine: 'line-through',
  },
  removeTodoButton: {
    padding: 4,
  },
  removeTodoButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  todoListContent: {
    padding: 12,
  },
});

export default ReminderDialog;