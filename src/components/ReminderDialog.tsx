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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { extractReminderFromText, addReminder, playReminderSound, extractTimeFromText } from '../utils/reminderUtils';
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

interface ReminderDialogProps {
  visible: boolean;
  onClose: () => void;
  reminderText: string;
  chatId?: string;
  onReminderSet: (reminderTime: Date, reminderText: string) => void;
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
  const [repeating, setRepeating] = useState<'none' | 'daily' | 'weekly'>('none');
  
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
      
      // Create the reminder with priority and sound settings
      await addReminder(text.trim(), date.getTime(), chatId, priority, soundEnabled);
      
      // Notify the parent component
      onReminderSet(date, text.trim());
      
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
});

export default ReminderDialog;