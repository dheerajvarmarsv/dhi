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
import { COLORS, FONTS } from '../constants/theme';
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

// Add SHADOWS constant if not already defined in theme
const SHADOWS = {
  tiny: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  small: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 3,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 6,
  },
};

// Replace the existing enhancedExtractTimeFromText function with this improved version
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
  
  // Check for specific time patterns with better handling
  const now = new Date();
  
  // Fallback for minutes
  const minutesMatch = text.match(/(\d+)\s*(min|mins|minutes)/i);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1], 10);
    return new Date(Date.now() + minutes * 60 * 1000);
  }
  
  // Fallback for hours
  const hoursMatch = text.match(/(\d+)\s*(hour|hours|hr|hrs)/i);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  
  // Fallback for days
  const daysMatch = text.match(/(\d+)\s*(day|days)/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const result = new Date(now);
    result.setDate(result.getDate() + days);
    return result;
  }
  
  // Check for "tomorrow" pattern
  if (text.match(/\btomorrow\b/i)) {
    // Check if there's a specific time mentioned with tomorrow
    const tomorrowTimeMatch = text.match(/tomorrow\s+(?:at)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    
    if (tomorrowTimeMatch) {
      let hours = parseInt(tomorrowTimeMatch[1], 10);
      const minutes = tomorrowTimeMatch[2] ? parseInt(tomorrowTimeMatch[2], 10) : 0;
      const ampm = tomorrowTimeMatch[3]?.toLowerCase();
      
      // Handle AM/PM conversion
      if (ampm === 'pm' && hours < 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(hours, minutes, 0, 0);
      
      return tomorrow;
    } else {
      // Default to 9 AM tomorrow if no specific time mentioned
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
  }
  
  // Check for "tonight" pattern
  if (text.match(/\btonight\b/i)) {
    const tonight = new Date();
    tonight.setHours(20, 0, 0, 0);
    return tonight;
  }
  
  // Check for "this afternoon" pattern
  if (text.match(/\bthis afternoon\b/i)) {
    const afternoon = new Date();
    afternoon.setHours(14, 0, 0, 0);
    return afternoon;
  }
  
  // Check for "this evening" pattern
  if (text.match(/\bthis evening\b/i)) {
    const evening = new Date();
    evening.setHours(18, 0, 0, 0);
    return evening;
  }
  
  // Check for "this morning" pattern
  if (text.match(/\bthis morning\b/i)) {
    const morning = new Date();
    if (morning.getHours() >= 12) {
      // If it's already past noon, schedule for tomorrow morning
      morning.setDate(morning.getDate() + 1);
    }
    morning.setHours(9, 0, 0, 0);
    return morning;
  }
  
  // Check for day of week
  const dayOfWeekMatch = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (dayOfWeekMatch) {
    const dayName = dayOfWeekMatch[1].toLowerCase();
    const daysMap: {[key: string]: number} = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const targetDay = daysMap[dayName];
    const today = now.getDay();
    let daysToAdd = targetDay - today;
    
    // If the target day is today or already passed this week, schedule for next week
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    const result = new Date(now);
    result.setDate(result.getDate() + daysToAdd);
    
    // Default to 9 AM on the target day
    result.setHours(9, 0, 0, 0);
    return result;
  }
  
  // Check for specific time today (e.g., "at 3pm")
  const timeMatch = text.match(/\bat\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3].toLowerCase();
    
    // Handle AM/PM conversion
    if (ampm === 'pm' && hours < 12) {
      hours += 12;
    } else if (ampm === 'am' && hours === 12) {
      hours = 0;
    }
    
    const result = new Date();
    result.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (result <= now) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  }
  
  // Default to 5 minutes from now if nothing else matches
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
              
              <ScrollView 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.sectionContainer}>
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
                </View>
                
                <View style={styles.sectionContainer}>
                  <Text style={styles.label}>When?</Text>
                  <View style={styles.datePickerOuterContainer}>
                    {Platform.OS === 'ios' ? (
                      <DateTimePicker
                        value={date}
                        mode="datetime"
                        display="spinner"
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                        style={styles.iosDatePicker}
                      />
                    ) : (
                      <TouchableOpacity 
                        style={styles.dateSelector} 
                        onPress={handleCustomTime}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dateSelectorContent}>
                          <View style={styles.calendarIconContainer}>
                            <Text style={styles.calendarIcon}>📆</Text>
                          </View>
                          <Text style={styles.dateText}>{formattedDate}</Text>
                        </View>
                        <Text style={styles.editDateText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Show DateTimePicker for Android when button is pressed */}
                    {Platform.OS === 'android' && showDatePicker && (
                      <DateTimePicker
                        value={date}
                        mode="datetime"
                        display="default"
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>
                </View>
                
                <View style={styles.sectionContainer}>
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
                        activeOpacity={0.7}
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
                        style={[
                          styles.priorityOption, 
                          priority === 'low' && styles.priorityLow,
                          { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }
                        ]} 
                        onPress={() => setPriority('low')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.priorityText, priority === 'low' && styles.priorityTextSelected]}>Low</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.priorityOption, priority === 'medium' && styles.priorityMedium]} 
                        onPress={() => setPriority('medium')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.priorityText, priority === 'medium' && styles.priorityTextSelected]}>Medium</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.priorityOption, 
                          priority === 'high' && styles.priorityHigh,
                          { borderTopRightRadius: 8, borderBottomRightRadius: 8 }
                        ]} 
                        onPress={() => setPriority('high')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.priorityText, priority === 'high' && styles.priorityTextSelected]}>High</Text>
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

                  {/* Advanced options toggle with better styling */}
                  <TouchableOpacity 
                    style={styles.advancedOptionsToggle}
                    onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.advancedOptionsText}>
                      {showAdvancedOptions ? 'Hide advanced options' : 'Show advanced options'}
                    </Text>
                    <View style={styles.advancedIconContainer}>
                      <Text style={styles.advancedOptionsIcon}>
                        {showAdvancedOptions ? '▲' : '▼'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Advanced options section with improved layout */}
                  {showAdvancedOptions && (
                    <Animated.View style={styles.advancedOptionsContainer}>
                      {/* Recurrence options */}
                      <View style={styles.recurrenceSection}>
                        <Text style={styles.sectionTitle}>🔄 Recurrence</Text>
                        
                        <View style={styles.recurrenceOptions}>
                          {['none', 'daily', 'weekly', 'monthly', 'custom'].map((type) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.recurrenceOption, 
                                repeating === type && styles.recurrenceOptionSelected
                              ]}
                              onPress={() => {
                                setRepeating(type as any);
                                setShowRecurrenceOptions(type !== 'none');
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.recurrenceText, 
                                repeating === type && styles.recurrenceTextSelected
                              ]}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
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
                                      activeOpacity={0.7}
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
                            
                            <View style={styles.recurrenceSummaryContainer}>
                              <Text style={styles.recurrenceSummaryLabel}>Summary:</Text>
                              <Text style={styles.recurrenceSummary}>
                                {getRecurrenceText()}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                      
                      {/* To-do List Section with improved UI */}
                      <View style={styles.todoSection}>
                        <View style={styles.todoHeaderRow}>
                          <Text style={styles.sectionTitle}>📋 To-do List</Text>
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
                                style={[
                                  styles.addTodoButton,
                                  !newTodoItem.trim() && styles.addTodoButtonDisabled
                                ]}
                                onPress={handleAddTodoItem}
                                disabled={!newTodoItem.trim()}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.addTodoButtonText}>+</Text>
                              </TouchableOpacity>
                            </View>
                            
                            <View style={[styles.todoList, todoItems.length > 0 && styles.todoListWithItems]}>
                              {todoItems.length === 0 ? (
                                <Text style={styles.emptyTodoText}>
                                  No items yet. Add some items above.
                                </Text>
                              ) : (
                                <FlatList
                                  data={todoItems}
                                  keyExtractor={item => item.id}
                                  renderItem={({ item }) => (
                                    <Animated.View style={[styles.todoItem, { opacity: 1 }]}>
                                      <TouchableOpacity
                                        style={styles.todoCheckbox}
                                        onPress={() => handleToggleTodoItem(item.id)}
                                        activeOpacity={0.7}
                                      >
                                        <View style={[
                                          styles.checkboxContainer,
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
                                        activeOpacity={0.7}
                                      >
                                        <Text style={styles.removeTodoButtonText}>×</Text>
                                      </TouchableOpacity>
                                    </Animated.View>
                                  )}
                                  style={styles.todoListContent}
                                  scrollEnabled={todoItems.length > 3}
                                  showsVerticalScrollIndicator={false}
                                  contentContainerStyle={styles.todoListContentContainer}
                                />
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    </Animated.View>
                  )}
                </View>
              </ScrollView>
              
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.button, 
                    styles.setButton, 
                    !text.trim() && styles.disabledButton
                  ]}
                  onPress={handleSetReminder}
                  disabled={!text.trim()}
                  activeOpacity={0.7}
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
    maxHeight: height * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primaryLight,
  },
  headerIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
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
    fontSize: 22,
    color: COLORS.text,
    lineHeight: 22,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
    fontFamily: FONTS.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  datePickerOuterContainer: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  iosDatePicker: {
    height: 180,
    width: '100%',
  },
  dateSelector: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  calendarIcon: {
    fontSize: 18,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  editDateText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.primary,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  quickSelectLabel: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 10,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    margin: 4,
    ...SHADOWS.tiny,
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
    fontWeight: '500',
  },
  settingsSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.tiny,
  },
  settingsSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    fontFamily: FONTS.primary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingLabelContainer: {
    flex: 1,
    paddingRight: 12,
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
    marginTop: 4,
  },
  prioritySelector: {
    flexDirection: 'row',
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    overflow: 'hidden',
    ...SHADOWS.tiny,
  },
  priorityOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  priorityLow: {
    backgroundColor: '#4CAF50',
  },
  priorityMedium: {
    backgroundColor: '#FF9800',
  },
  priorityHigh: {
    backgroundColor: '#F44336',
  },
  priorityText: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONTS.secondary,
  },
  priorityTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  infoText: {
    fontSize: 12,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  advancedOptionsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  advancedOptionsText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  advancedIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advancedOptionsIcon: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  advancedOptionsContainer: {
    padding: 16,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    marginTop: 8,
  },
  recurrenceSection: {
    marginBottom: 24,
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
    paddingVertical: 8,
    paddingHorizontal: 14,
    margin: 4,
    backgroundColor: '#eeeeee',
    borderRadius: 6,
    ...SHADOWS.tiny,
  },
  recurrenceOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  recurrenceText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  recurrenceTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  recurrenceDetailsContainer: {
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    ...SHADOWS.tiny,
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    minWidth: 50,
    textAlign: 'center',
  },
  daysLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
    marginBottom: 10,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    margin: 4,
    backgroundColor: '#eeeeee',
    borderRadius: 6,
  },
  dayOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  recurrenceSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  recurrenceSummaryLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.primary,
    fontWeight: '500',
  },
  recurrenceSummary: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.primary,
    fontWeight: '500',
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
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    ...SHADOWS.tiny,
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
    marginBottom: 16,
  },
  todoInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
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
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.tiny,
  },
  addTodoButtonDisabled: {
    backgroundColor: '#DDDDDD',
  },
  addTodoButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: '500',
    fontFamily: FONTS.primary,
  },
  todoList: {
    marginBottom: 12,
  },
  todoListWithItems: {
    borderWidth: 1,
    borderColor: '#eeeeee',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    maxHeight: height * 0.2,
  },
  emptyTodoText: {
    fontSize: 14,
    color: COLORS.lightText,
    fontFamily: FONTS.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 16,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  todoCheckbox: {
    padding: 6,
  },
  checkboxContainer: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 16,
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
    color: COLORS.lightText,
  },
  removeTodoButton: {
    padding: 6,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeTodoButtonText: {
    fontSize: 18,
    color: '#F44336',
    fontWeight: 'bold',
  },
  todoListContent: {
    padding: 0,
  },
  todoListContentContainer: {
    paddingBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    padding: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.tiny,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    marginRight: 10,
    paddingHorizontal: 20,
    minWidth: 100,
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
    ...SHADOWS.small,
  },
  setButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: FONTS.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default ReminderDialog;