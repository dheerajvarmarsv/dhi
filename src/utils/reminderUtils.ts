// src/utils/reminderUtils.ts
import { Platform, PermissionsAndroid, Vibration } from 'react-native';
import PushNotification, { Importance } from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import moment from 'moment';
import RNFS from 'react-native-fs';
import { v4 as uuidv4 } from 'uuid';
import Sound from 'react-native-sound';

// Required to enable sound playback
Sound.setCategory('Playback');

// Define the reminder structure
export interface Reminder {
  id: string;
  text: string;
  timestamp: number; // Unix timestamp
  chatId?: string;   // Optional reference to a chat
  createdAt: number; // When the reminder was created
  isCompleted: boolean;
  soundEnabled: boolean; // Whether sound is enabled for this reminder
  priority: 'low' | 'medium' | 'high'; // Priority level
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom'; // Type of recurrence
    interval?: number; // Interval (every X days/weeks/months)
    daysOfWeek?: number[]; // For weekly: days of week (0-6, Sunday-Saturday)
    dayOfMonth?: number; // For monthly: day of month (1-31)
    endDate?: number; // Optional end date for recurrence
    count?: number; // Optional number of occurrences
  };
  todoList?: {
    items: {
      id: string;
      text: string;
      isCompleted: boolean;
      createdAt: number;
    }[];
  };
}

// Path to store reminders
const REMINDERS_PATH = `${RNFS.DocumentDirectoryPath}/reminders.json`;

// Sound instance
let reminderSound: Sound | null = null;

// Initialize and load the reminder sound
export const initializeSound = () => {
  try {
    // Configure sound
    Sound.setCategory('Playback');
    
    // Use a dummy sound in case we can't load the real one
    const dummySound = new Sound('', '', (error) => {
      // This is just to avoid errors if no sound can be loaded
      if (error) {
        console.log('Using silent sound fallback');
      }
    });
    
    // Assign the dummy sound first
    reminderSound = dummySound;
    
    // Try to play system sound when needed instead of loading a custom sound
    console.log('Sound system initialized');
  } catch (e) {
    console.error('Error initializing sound:', e);
  }
};

// Play reminder sound
export const playReminderSound = () => {
  // Enable playback in silent mode
  Sound.setCategory('Playback');
  
  // Load the sound file
  const sound = new Sound('notification.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.error('Failed to load the sound', error);
      return;
    }
    
    // Play the sound
    sound.play((success) => {
      if (!success) {
        console.error('Playback failed due to audio decoding errors');
      }
      // Release when played
      sound.release();
    });
  });
};

// Schedule a local notification for a reminder
export const scheduleLocalNotification = (reminder: Reminder) => {
  try {
    if (!reminder.soundEnabled) {
      return;
    }
    
    if (Platform.OS === 'ios') {
      // For iOS
      PushNotificationIOS.addNotificationRequest({
        id: reminder.id,
        title: 'Reminder',
        body: reminder.text,
        fireDate: new Date(reminder.timestamp),
        sound: 'notification.mp3',
        repeats: false,
        userInfo: { id: reminder.id }
      });
    } else {
      // Schedule local notification for reminder
      PushNotification.localNotificationSchedule({
        id: reminder.id,
        channelId: 'reminders-channel',
        title: 'Reminder',
        message: reminder.text,
        date: new Date(reminder.timestamp),
        allowWhileIdle: true,
        playSound: reminder.soundEnabled,
        soundName: 'notification.mp3',
        vibrate: true,
        priority: reminder.priority === 'high' ? 'high' : 'default',
        importance: reminder.priority === 'high' ? 'high' : 'default',
        visibility: 'public',
        userInfo: { id: reminder.id }
      });
    }
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

// Initialize push notifications
export const initializeReminders = () => {
  // Initialize sound
  initializeSound();

  // Configure push notifications with better defaults
  PushNotification.configure({
    // Called when a notification is received
    onNotification: function(notification: any) {
      console.log('NOTIFICATION:', notification);
      
      // Get priority and type from userInfo
      const priority = notification.userInfo?.priority || 'medium';
      const isRecurring = notification.userInfo?.isRecurring === 'true';
      const soundEnabled = notification.userInfo?.soundEnabled === 'true';
      
      // Play sound and vibrate on notification
      try {
        // Vibrate regardless of sound setting
        Vibration.vibrate(priority === 'high' ? 500 : 300);
        
        // Only play sound if enabled for this reminder
        if (soundEnabled) {
          playPrioritySoundEffect(priority as 'low' | 'medium' | 'high', isRecurring);
        }
        
        if (Platform.OS === 'ios') {
          PushNotificationIOS.presentLocalNotification({
            alertTitle: notification.title || 'Reminder',
            alertBody: notification.message || '',
            soundName: 'notification.mp3',
          });
        }
      } catch (error) {
        console.log('Notification feedback error:', error);
      }

      // Required on iOS only
      if (Platform.OS === 'ios') {
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      }
      
      // Update badge count after handling notification
      updateBadgeCount();
    },

    // IOS only permissions
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },

    // Should the initial notification be popped automatically
    popInitialNotification: true,
    requestPermissions: true,
  });

  // Configure the notification channels for Android with different settings per type
  if (Platform.OS === 'android') {
    // Regular reminders channel
    PushNotification.createChannel(
      {
        channelId: 'reminders-channel',
        channelName: 'Reminders',
        channelDescription: 'Regular reminders for DHI app',
        playSound: true,
        soundName: 'notification.mp3',
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created: boolean) => console.log(`Reminder channel created: ${created}`)
    );

    // High-priority channel with more attention-grabbing settings
    PushNotification.createChannel(
      {
        channelId: 'important-reminders-channel',
        channelName: 'Important Reminders',
        channelDescription: 'High-priority reminders for DHI app',
        playSound: true,
        soundName: 'notification.mp3',
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created: boolean) => console.log(`Important reminder channel created: ${created}`)
    );
    
    // Todo list channel
    PushNotification.createChannel(
      {
        channelId: 'todo-reminders-channel',
        channelName: 'Task Lists',
        channelDescription: 'To-do list tasks for DHI app',
        playSound: true,
        soundName: 'notification.mp3',
        importance: Importance.DEFAULT,
        vibrate: true,
      },
      (created: boolean) => console.log(`Todo list channel created: ${created}`)
    );
    
    // Recurring reminders channel
    PushNotification.createChannel(
      {
        channelId: 'recurring-reminders-channel',
        channelName: 'Recurring Reminders',
        channelDescription: 'Recurring reminders for DHI app',
        playSound: true,
        soundName: 'notification.mp3',
        importance: Importance.DEFAULT,
        vibrate: true,
      },
      (created: boolean) => console.log(`Recurring reminders channel created: ${created}`)
    );
  }

  // Load and schedule existing reminders
  loadReminders().then((reminders) => {
    reminders.forEach((reminder) => {
      if (!reminder.isCompleted && reminder.timestamp > Date.now()) {
        scheduleLocalNotification(reminder);
      }
    });
    console.log(`Loaded ${reminders.length} reminders from storage`);
    
    // Update badge count on initialization
    updateBadgeCount();
  });
};

// Request notification permissions (for iOS and Android 13+)
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // For iOS, permissions are handled by PushNotification.configure
  } catch (err) {
    console.warn('Error requesting notification permissions:', err);
    return false;
  }
};

// Save reminders to filesystem
export const saveReminders = async (reminders: Reminder[]): Promise<void> => {
  try {
    await RNFS.writeFile(
      REMINDERS_PATH,
      JSON.stringify(reminders),
      'utf8'
    );
  } catch (error) {
    console.error('Error saving reminders:', error);
  }
};

// Load reminders from filesystem
export const loadReminders = async (): Promise<Reminder[]> => {
  try {
    const exists = await RNFS.exists(REMINDERS_PATH);
    if (!exists) {
      await RNFS.writeFile(
        REMINDERS_PATH,
        JSON.stringify([]),
        'utf8'
      );
      return [];
    }

    const data = await RNFS.readFile(REMINDERS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading reminders:', error);
    return [];
  }
};

// Add a new reminder
export const addReminder = async (
  text: string,
  timestamp: number,
  chatId?: string,
  priority: 'low' | 'medium' | 'high' = 'medium',
  soundEnabled: boolean = true
): Promise<Reminder> => {
  const reminders = await loadReminders();
  
  // Generate a unique ID
  const id = `reminder_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  const newReminder: Reminder = {
    id,
    text,
    timestamp,
    chatId,
    createdAt: Date.now(),
    isCompleted: false,
    soundEnabled,
    priority,
  };
  
  // Add the reminder to the list
  reminders.push(newReminder);
  
  // Save the updated list
  await saveReminders(reminders);
  
  // Schedule the notification
  scheduleLocalNotification(newReminder);
  
  return newReminder;
};

// Cancel a scheduled notification
export const cancelNotification = (reminderId: string) => {
  PushNotification.cancelLocalNotification(reminderId);
};

// Mark a reminder as completed
export const completeReminder = async (reminderId: string): Promise<void> => {
  const reminders = await loadReminders();
  const updatedReminders = reminders.map((reminder) => {
    if (reminder.id === reminderId) {
      return { ...reminder, isCompleted: true };
    }
    return reminder;
  });

  await saveReminders(updatedReminders);
  cancelNotification(reminderId);
  
  // Update badge count after completing a reminder
  await updateBadgeCount();
};

// Update a todo item's completion status
export const updateTodoItem = async (reminderId: string, todoItemId: string): Promise<void> => {
  const reminders = await loadReminders();
  const updatedReminders = reminders.map((reminder) => {
    if (reminder.id === reminderId && reminder.todoList) {
      // Update the specific todo item
      const updatedItems = reminder.todoList.items.map(item => {
        if (item.id === todoItemId) {
          return { ...item, isCompleted: !item.isCompleted };
        }
        return item;
      });
      
      // Create updated reminder with new todo items
      return {
        ...reminder,
        todoList: {
          ...reminder.todoList,
          items: updatedItems
        }
      };
    }
    return reminder;
  });

  await saveReminders(updatedReminders);
};

// Delete a reminder
export const deleteReminder = async (reminderId: string): Promise<void> => {
  const reminders = await loadReminders();
  const updatedReminders = reminders.filter(
    (reminder) => reminder.id !== reminderId
  );

  await saveReminders(updatedReminders);
  cancelNotification(reminderId);
  
  // Update badge count after deleting a reminder
  await updateBadgeCount();
};

// Delete all reminders
export const deleteAllReminders = async (): Promise<void> => {
  const reminders = await loadReminders();
  
  // Cancel all notifications for these reminders
  for (const reminder of reminders) {
    cancelNotification(reminder.id);
  }
  
  // Save an empty array to clear all reminders
  await saveReminders([]);
  
  // Reset badge count to zero after deleting all reminders
  if (Platform.OS === 'ios') {
    PushNotificationIOS.setApplicationIconBadgeNumber(0);
  } else {
    // For Android
    PushNotification.setApplicationIconBadgeNumber(0);
  }
};

// Get all active reminders
export const getActiveReminders = async (): Promise<Reminder[]> => {
  const reminders = await loadReminders();
  return reminders.filter(
    (reminder) => !reminder.isCompleted && reminder.timestamp > Date.now()
  );
};

// Get reminders for a specific chat
export const getChatReminders = async (chatId: string): Promise<Reminder[]> => {
  const reminders = await loadReminders();
  return reminders.filter((reminder) => reminder.chatId === chatId);
};

// Extract time from user input
export const extractTimeFromText = (text: string): { time: Date | null; extractedText: string; timeDescription: string } => {
  // Try to identify common time patterns
  const timePatterns = [
    // Relative times with units (minutes, hours)
    {
      regex: /\b(?:in|after)?\s*(\d+)\s*(?:minute|minutes|min|mins|m)\b/i,
      handler: (matches: RegExpMatchArray) => {
        const amount = parseInt(matches[1]);
        const now = new Date();
        return new Date(now.getTime() + amount * 60000);
      },
      replacement: (original: string) => {
        return original.replace(/\b(\d+)\s*(minute|minutes|min|mins|m)\b/i, '$1 minutes');
      }
    },
    // Hour-based relative times
    {
      regex: /\b(?:in|after)?\s*(\d+)\s*(?:hour|hours|hr|hrs|h)\b/i,
      handler: (matches: RegExpMatchArray) => {
        const amount = parseInt(matches[1]);
        const now = new Date();
        return new Date(now.getTime() + amount * 3600000);
      },
      replacement: (original: string) => {
        return original.replace(/\b(\d+)\s*(hour|hours|hr|hrs|h)\b/i, '$1 hours');
      }
    },
    // Day-based relative times
    {
      regex: /\b(?:in|after)?\s*(\d+)\s*(?:day|days|d)\b/i,
      handler: (matches: RegExpMatchArray) => {
        const amount = parseInt(matches[1]);
        const now = new Date();
        const result = new Date(now);
        result.setDate(result.getDate() + amount);
        return result;
      },
      replacement: (original: string) => {
        return original.replace(/\b(\d+)\s*(day|days|d)\b/i, '$1 days');
      }
    },
    // Tomorrow at a specific time
    {
      regex: /\btomorrow\s*(?:at)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
      handler: (matches: RegExpMatchArray) => {
        let hours = parseInt(matches[1]);
        const minutes = matches[2] ? parseInt(matches[2]) : 0;
        const ampm = matches[3]?.toLowerCase();
        
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
      },
      replacement: (original: string) => original
    },
    // Absolute times with AM/PM
    {
      regex: /\b(?:at)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
      handler: (matches: RegExpMatchArray) => {
        let hours = parseInt(matches[1]);
        const minutes = matches[2] ? parseInt(matches[2]) : 0;
        const ampm = matches[3].toLowerCase();
        
        // Handle AM/PM conversion
        if (ampm === 'pm' && hours < 12) {
          hours += 12;
        } else if (ampm === 'am' && hours === 12) {
          hours = 0;
        }
        
        const result = new Date();
        result.setHours(hours, minutes, 0, 0);
        
        // If the time has already passed today, schedule for tomorrow
        if (result <= new Date()) {
          result.setDate(result.getDate() + 1);
        }
        
        return result;
      },
      replacement: (original: string) => original
    },
    // Named days of the week
    {
      regex: /\b(?:on)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s*at\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i,
      handler: (matches: RegExpMatchArray) => {
        const dayName = matches[1].toLowerCase();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = new Date();
        const targetDayIndex = days.indexOf(dayName);
        
        if (targetDayIndex < 0) return null;
        
        const todayIndex = today.getDay();
        let daysToAdd = targetDayIndex - todayIndex;
        if (daysToAdd <= 0) {
          daysToAdd += 7; // Next week
        }
        
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + daysToAdd);
        
        // If a specific time is mentioned
        if (matches[2]) {
          let hours = parseInt(matches[2]);
          const minutes = matches[3] ? parseInt(matches[3]) : 0;
          const ampm = matches[4]?.toLowerCase();
          
          // Handle AM/PM conversion
          if (ampm === 'pm' && hours < 12) {
            hours += 12;
          } else if (ampm === 'am' && hours === 12) {
            hours = 0;
          }
          
          targetDate.setHours(hours, minutes, 0, 0);
        } else {
          // Default to 9 AM if no time specified
          targetDate.setHours(9, 0, 0, 0);
        }
        
        return targetDate;
      },
      replacement: (original: string) => original
    },
    // Natural language time specifications - morning, afternoon, evening
    {
      regex: /\b(?:this)?\s*(morning|afternoon|evening|tonight)\b/i,
      handler: (matches: RegExpMatchArray) => {
        const timeOfDay = matches[1].toLowerCase();
        const now = new Date();
        const result = new Date();
        
        // Set appropriate times based on time of day
        if (timeOfDay === 'morning') {
          result.setHours(9, 0, 0, 0);
        } else if (timeOfDay === 'afternoon') {
          result.setHours(14, 0, 0, 0);
        } else if (timeOfDay === 'evening') {
          result.setHours(18, 0, 0, 0);
        } else if (timeOfDay === 'tonight') {
          result.setHours(20, 0, 0, 0);
        }
        
        // If the time has already passed today, schedule for tomorrow
        if (result <= now) {
          result.setDate(result.getDate() + 1);
        }
        
        return result;
      },
      replacement: (original: string) => original
    },
    // Just a number followed by min/mins, even without "in"
    {
      regex: /\b(\d+)\s*(?:minute|minutes|min|mins|m)\b/i,
      handler: (matches: RegExpMatchArray) => {
        const amount = parseInt(matches[1]);
        const now = new Date();
        return new Date(now.getTime() + amount * 60000);
      },
      replacement: (original: string) => {
        return original.replace(/\b(\d+)\s*(minute|minutes|min|mins|m)\b/i, '$1 minutes');
      }
    },
    // Just a number followed by hour/hours, even without "in" 
    {
      regex: /\b(\d+)\s*(?:hour|hours|hr|hrs|h)\b/i,
      handler: (matches: RegExpMatchArray) => {
        const amount = parseInt(matches[1]);
        const now = new Date();
        return new Date(now.getTime() + amount * 3600000);
      },
      replacement: (original: string) => {
        return original.replace(/\b(\d+)\s*(hour|hours|hr|hrs|h)\b/i, '$1 hours');
      }
    },
    // "a few minutes" or "couple of minutes" type expressions
    {
      regex: /\b(?:in)?\s*(?:a\s+)?(?:few|couple\s+(?:of)?)\s*(?:minute|minutes|min|mins)\b/i,
      handler: () => {
        // Default to 3 minutes for "a few" or "couple of" minutes
        const now = new Date();
        return new Date(now.getTime() + 3 * 60000);
      },
      replacement: (original: string) => {
        return original.replace(/\b(?:a\s+)?(?:few|couple\s+(?:of)?)\s*(minute|minutes|min|mins)\b/i, '3 minutes');
      }
    },
    // "a few hours" or "couple of hours" type expressions
    {
      regex: /\b(?:in)?\s*(?:a\s+)?(?:few|couple\s+(?:of)?)\s*(?:hour|hours|hr|hrs)\b/i,
      handler: () => {
        // Default to 2 hours for "a few" or "couple of" hours
        const now = new Date();
        return new Date(now.getTime() + 2 * 3600000);
      },
      replacement: (original: string) => {
        return original.replace(/\b(?:a\s+)?(?:few|couple\s+(?:of)?)\s*(hour|hours|hr|hrs)\b/i, '2 hours');
      }
    }
  ];

  let extractedTime: Date | null = null;
  let remainingText = text;
  let timeDescription = "";

  for (const pattern of timePatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      extractedTime = pattern.handler(match);
      
      // Format the time expression consistently for display
      timeDescription = pattern.replacement(match[0]);
      
      // Remove the time information from the text
      remainingText = text.replace(pattern.regex, '').trim();
      break;
    }
  }

  // Return both the extracted time and the remaining text
  return {
    time: extractedTime,
    extractedText: remainingText,
    timeDescription: timeDescription // Add timeDescription to the return object
  };
};

// Extract reminder content from user message
export const extractReminderFromText = (
  text: string
): { message: string; time: Date | null } | null => {
  // Regex patterns for reminder requests
  const reminderPatterns = [
    /remind(?:er)?\s+(?:me|us)?\s+(?:to|about|that)?\s+(.+?)(?:\s+at\s+|\s+on\s+|\s+in\s+|\s+tomorrow)/i,
    /don't\s+let\s+me\s+forget\s+(?:to|about|that)?\s+(.+?)(?:\s+at\s+|\s+on\s+|\s+in\s+|\s+tomorrow)/i,
    /can\s+you\s+remind\s+(?:me|us)?\s+(?:to|about|that)?\s+(.+?)(?:\s+at\s+|\s+on\s+|\s+in\s+|\s+tomorrow)/i,
    /set\s+(?:a|an)?\s+reminder\s+(?:to|about|for|that)?\s+(.+?)(?:\s+at\s+|\s+on\s+|\s+in\s+|\s+tomorrow)/i,
    /remember\s+to\s+tell\s+me\s+(?:to|about|that)?\s+(.+?)(?:\s+at\s+|\s+on\s+|\s+in\s+|\s+tomorrow)/i
  ];

  // Check if text contains a reminder request
  let reminderContent = '';
  for (const pattern of reminderPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      reminderContent = match[1].trim();
      break;
    }
  }

  // If no reminder content found through patterns, check for common reminder phrases
  if (!reminderContent) {
    if (/remind|reminder|don't\s+forget|remember|notify/i.test(text)) {
      // Extract time information first
      const { time, extractedText } = extractTimeFromText(text);
      
      // If we found a time and there's remaining text, it might be a reminder
      if (time) {
        // Find content by removing common reminder prefixes
        let content = extractedText
          .replace(/(?:please )?remind (?:me|us) (?:to|about|that)?/i, '')
          .replace(/(?:please )?don't let (?:me|us) forget (?:to|about|that)?/i, '')
          .replace(/(?:can you )?remind (?:me|us) (?:to|about|that)?/i, '')
          .replace(/(?:please )?set a reminder (?:to|about|for|that)?/i, '')
          .replace(/(?:please )?remember to tell (?:me|us) (?:to|about|that)?/i, '')
          .trim();
          
        if (content) {
          return { message: content, time };
        }
      }
      
      return null;
    }
    
    return null;
  }

  // Extract time information
  const { time, extractedText } = extractTimeFromText(text);
  
  // If we couldn't find a specific time, default to 1 hour from now
  const reminderTime = time || new Date(Date.now() + 3600000);
  
  return {
    message: reminderContent || extractedText.trim(),
    time: reminderTime
  };
};

// Initialize reminder system on app startup
export const setupReminderSystem = () => {
  initializeReminders();
  requestNotificationPermissions();
  
  // Schedule and process any recurring reminders
  handleCompletedReminders();
  
  // Set up a periodic check for completed reminders
  setInterval(() => {
    handleCompletedReminders();
  }, 60000 * 10); // Check every 10 minutes
};

// Format reminder time in a human-readable way
export const formatReminderTime = (timestamp: number): string => {
  const reminderTime = moment(timestamp);
  const now = moment();

  if (reminderTime.isSame(now, 'day')) {
    return `Today at ${reminderTime.format('h:mm A')}`;
  } else if (reminderTime.isSame(now.clone().add(1, 'day'), 'day')) {
    return `Tomorrow at ${reminderTime.format('h:mm A')}`;
  } else if (reminderTime.isSame(now, 'year')) {
    return reminderTime.format('MMM D [at] h:mm A');
  } else {
    return reminderTime.format('MMM D, YYYY [at] h:mm A');
  }
};

// Format the time remaining as a friendly string
export const getTimeRemaining = (timestamp: number): string => {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff <= 0) {
    return 'now';
  }
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return days === 1 ? '1 day' : `${days} days`;
  }
  
  if (hours > 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
};

// Get a descriptive message for overdue reminders
export const getOverdueText = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp; // How long ago it was due
  
  if (diff < 0) return "Upcoming";
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return days === 1 ? 'Overdue by 1 day' : `Overdue by ${days} days`;
  }
  
  if (hours > 0) {
    return hours === 1 ? 'Overdue by 1 hour' : `Overdue by ${hours} hours`;
  }
  
  if (minutes > 0) {
    return minutes === 1 ? 'Overdue by 1 minute' : `Overdue by ${minutes} minutes`;
  }
  
  return 'Just overdue';
};

// Create a recurring reminder
export const addRecurringReminder = async (
  text: string,
  timestamp: number,
  recurrence: Reminder['recurrence'],
  chatId?: string,
  priority: 'low' | 'medium' | 'high' = 'medium',
  soundEnabled: boolean = true
): Promise<Reminder> => {
  const reminders = await loadReminders();
  
  // Generate a unique ID
  const id = `recurring_reminder_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  const newReminder: Reminder = {
    id,
    text,
    timestamp,
    chatId,
    createdAt: Date.now(),
    isCompleted: false,
    soundEnabled,
    priority,
    recurrence,
  };
  
  // Add the reminder to the list
  reminders.push(newReminder);
  
  // Save the updated list
  await saveReminders(reminders);
  
  // Schedule the notification
  scheduleLocalNotification(newReminder);
  
  return newReminder;
};

// Create a to-do list reminder
export const addTodoListReminder = async (
  text: string,
  timestamp: number,
  todoItems: string[],
  chatId?: string,
  priority: 'low' | 'medium' | 'high' = 'medium',
  soundEnabled: boolean = true
): Promise<Reminder> => {
  const reminders = await loadReminders();
  
  // Generate a unique ID
  const id = `todo_reminder_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  // Create todo items with unique IDs
  const items = todoItems.map(itemText => ({
    id: `todo_item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    text: itemText,
    isCompleted: false,
    createdAt: Date.now()
  }));
  
  const newReminder: Reminder = {
    id,
    text,
    timestamp,
    chatId,
    createdAt: Date.now(),
    isCompleted: false,
    soundEnabled,
    priority,
    todoList: {
      items
    }
  };
  
  // Add the reminder to the list
  reminders.push(newReminder);
  
  // Save the updated list
  await saveReminders(reminders);
  
  // Schedule the notification
  scheduleLocalNotification(newReminder);
  
  return newReminder;
};

// Schedule next occurrence of a recurring reminder
export const scheduleNextOccurrence = async (reminder: Reminder): Promise<Reminder | null> => {
  if (!reminder.recurrence) {
    return null;
  }
  
  let nextTimestamp: number | null = null;
  const currentDate = new Date(reminder.timestamp);
  
  switch (reminder.recurrence.type) {
    case 'daily':
      const intervalDays = reminder.recurrence.interval || 1;
      currentDate.setDate(currentDate.getDate() + intervalDays);
      nextTimestamp = currentDate.getTime();
      break;
      
    case 'weekly':
      if (reminder.recurrence.daysOfWeek && reminder.recurrence.daysOfWeek.length > 0) {
        // Find the next day of week that matches
        const today = new Date().getDay();
        const daysOfWeek = [...reminder.recurrence.daysOfWeek].sort();
        
        // Find the next day of week after today
        let nextDay = daysOfWeek.find(day => day > today);
        
        if (nextDay === undefined) {
          // If no day is greater than today, take the first day (next week)
          nextDay = daysOfWeek[0];
          const daysUntilNext = 7 - today + nextDay;
          currentDate.setDate(currentDate.getDate() + daysUntilNext);
        } else {
          const daysUntilNext = nextDay - today;
          currentDate.setDate(currentDate.getDate() + daysUntilNext);
        }
        
        nextTimestamp = currentDate.getTime();
      } else {
        // Default to same day next week
        const interval = reminder.recurrence.interval || 1;
        currentDate.setDate(currentDate.getDate() + (7 * interval));
        nextTimestamp = currentDate.getTime();
      }
      break;
      
    case 'monthly':
      if (reminder.recurrence.dayOfMonth) {
        // Set to the specified day of the next month
        currentDate.setMonth(currentDate.getMonth() + 1);
        
        // Make sure the day exists in the month (e.g., handle February 30)
        const maxDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(reminder.recurrence.dayOfMonth, maxDay);
        
        currentDate.setDate(targetDay);
        nextTimestamp = currentDate.getTime();
      } else {
        // Default to same day next month
        currentDate.setMonth(currentDate.getMonth() + 1);
        nextTimestamp = currentDate.getTime();
      }
      break;
      
    case 'custom':
      if (reminder.recurrence.interval) {
        // Custom interval in days
        currentDate.setDate(currentDate.getDate() + reminder.recurrence.interval);
        nextTimestamp = currentDate.getTime();
      }
      break;
  }
  
  if (nextTimestamp === null) {
    return null;
  }
  
  // Check if we've reached the end date or max count
  if (reminder.recurrence.endDate && nextTimestamp > reminder.recurrence.endDate) {
    return null;
  }
  
  // Create a new reminder for the next occurrence
  const nextReminder: Reminder = {
    ...reminder,
    id: `recurring_${reminder.id}_${Date.now()}`,
    timestamp: nextTimestamp,
    isCompleted: false,
    createdAt: Date.now()
  };
  
  // Save the new occurrence
  const reminders = await loadReminders();
  reminders.push(nextReminder);
  await saveReminders(reminders);
  
  // Schedule notification for the next occurrence
  scheduleLocalNotification(nextReminder);
  
  return nextReminder;
};

// Handle reminders that have occurred
export const handleCompletedReminders = async (): Promise<void> => {
  const reminders = await loadReminders();
  let hasChanges = false;
  
  for (const reminder of reminders) {
    // Check if this is a completed recurring reminder
    if (reminder.isCompleted && reminder.recurrence) {
      await scheduleNextOccurrence(reminder);
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    await saveReminders(reminders);
  }
};

// Get all todo list reminders
export const getTodoListReminders = async (): Promise<Reminder[]> => {
  const reminders = await loadReminders();
  return reminders.filter(reminder => reminder.todoList !== undefined);
};

// Update the badge count to reflect the actual number of active reminders
export const updateBadgeCount = async () => {
  try {
    const reminders = await loadReminders();
    const activeCount = reminders.filter(r => !r.isCompleted && r.timestamp >= Date.now()).length;
    
    // Set the app badge count to match active reminders
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(activeCount);
    } else {
      // For Android
      PushNotification.setApplicationIconBadgeNumber(activeCount);
    }
    
    return activeCount;
  } catch (error) {
    console.error('Error updating badge count:', error);
    return 0;
  }
};

// Update this function to use only notification.mp3
export const playPrioritySoundEffect = (priority: 'low' | 'medium' | 'high' = 'medium', isRecurring = false) => {
  // Enable playback in silent mode
  Sound.setCategory('Playback');
  
  // Use only notification.mp3 for all cases
  const soundFile = 'notification.mp3';
  
  // Load the sound file
  const sound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.error('Failed to load the sound', error);
      return;
    }
    
    // Adjust volume based on priority
    sound.setVolume(priority === 'high' ? 1.0 : 0.8);
    sound.play((success) => {
      if (!success) {
        console.error('Playback failed due to audio decoding errors');
      }
      // Release when played
      sound.release();
    });
  });
};