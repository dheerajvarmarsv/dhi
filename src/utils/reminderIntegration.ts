// src/utils/reminderIntegration.ts
import { extractReminderFromText, addReminder } from './reminderUtils';
import type { Message } from '../types';
import moment from 'moment';

// Detect reminder intent in AI response
export const detectReminderConfirmation = (message: Message): boolean => {
  if (message.role !== 'assistant') return false;
  
  const content = message.content.toLowerCase();
  
  // Look for confirmation patterns
  const confirmationPatterns = [
    /i('ll| will) remind you/i,
    /i('ve| have) set a reminder/i,
    /reminder set/i,
    /i('ll| will) notify you/i,
    /i('ll| will) alert you/i,
  ];
  
  return confirmationPatterns.some(pattern => pattern.test(content));
};

// Extract reminder information from assistant response
export const extractAssistantReminderInfo = (message: Message): { 
  hasReminder: boolean; 
  content: string; 
  time: Date | null;
} => {
  if (message.role !== 'assistant') {
    return { hasReminder: false, content: '', time: null };
  }
  
  const content = message.content;
  
  // Try to find sentences with reminder confirmations
  const sentences = content.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    if (/remind|reminder|alert|notify/i.test(sentence)) {
      const extractedInfo = extractReminderFromText(sentence);
      
      if (extractedInfo && extractedInfo.message && extractedInfo.time) {
        return {
          hasReminder: true,
          content: extractedInfo.message,
          time: extractedInfo.time,
        };
      }
    }
  }
  
  return { hasReminder: false, content: '', time: null };
};

// Generate message to confirm reminder was created
export const generateReminderConfirmation = (reminderText: string, reminderTime: Date): string => {
  const timeFormatted = reminderTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  const dateFormatted = reminderTime.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    year: reminderTime.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
  
  return `I've set a reminder for "${reminderText}" on ${dateFormatted} at ${timeFormatted}.`;
};

/**
 * Pattern matchers for various ways a reminder might be expressed in an AI response
 */
const REMINDER_PATTERNS = [
  // Direct confirmation of setting a reminder
  /I('ve| have) set a reminder (?:for you )?(?:to|about|for) (.+?) (?:on|at|for) (.+?)[\.!]/i,
  /I('ve| have) scheduled a reminder (?:for you )?(?:to|about|for) (.+?) (?:on|at|for) (.+?)[\.!]/i,
  /I('ve| have) created a reminder (?:for you )?(?:to|about|for) (.+?) (?:on|at|for) (.+?)[\.!]/i,
  
  // Question form confirming a reminder
  /would you like me to set a reminder (?:for you )?(?:to|about|for) (.+?) (?:on|at|for) (.+?)\?/i,
  /should I set a reminder (?:for you )?(?:to|about|for) (.+?) (?:on|at|for) (.+?)\?/i,
  /shall I remind you (?:to|about|for) (.+?) (?:on|at|for) (.+?)\?/i,
  
  // Confirmation of understanding but not yet set
  /I'll remind you (?:to|about|for) (.+?) (?:on|at|for) (.+?)[\.!]/i,
  /I can remind you (?:to|about|for) (.+?) (?:on|at|for) (.+?)[\.!]/i,
];

/**
 * Process an assistant message to check if it mentions setting a reminder.
 * If it does, extract the reminder details and create the reminder.
 */
export const processAssistantMessageForReminder = async (
  message: Message,
  chatId?: string
): Promise<{ reminderCreated: boolean; confirmationMessage: string | null }> => {
  if (!message.content) {
    return { reminderCreated: false, confirmationMessage: null };
  }
  
  // Check each pattern for a match
  for (const pattern of REMINDER_PATTERNS) {
    const match = message.content.match(pattern);
    if (match) {
      // Extract reminder content and time
      const reminderContent = match[2].trim();
      const timeText = match[3].trim();
      
      // Try to parse the time
      const parsedTime = parseTimeExpression(timeText);
      
      // If we could parse a valid time, create the reminder
      if (parsedTime && parsedTime.isValid() && parsedTime.isAfter(moment())) {
        const reminder = await addReminder(
          reminderContent,
          parsedTime.valueOf(),
          chatId
        );
        
        // Format the confirmation message
        const timeString = parsedTime.format('MMMM D, YYYY [at] h:mm A');
        const confirmationMessage = `✓ Reminder set: "${reminderContent}" for ${timeString}`;
        
        return { reminderCreated: true, confirmationMessage };
      }
    }
  }
  
  return { reminderCreated: false, confirmationMessage: null };
};

/**
 * Try to parse a time expression into a moment object
 */
const parseTimeExpression = (timeText: string): moment.Moment | null => {
  const now = moment();
  const trimmedText = timeText.toLowerCase().trim();
  
  // Direct date and time formats
  const directDateTime = moment(trimmedText, [
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD h:mm A',
    'MM/DD/YYYY HH:mm',
    'MM/DD/YYYY h:mm A',
    'MMMM D, YYYY [at] h:mm A',
    'MMMM D [at] h:mm A',
    'h:mm A',
    'HH:mm'
  ], true);
  
  if (directDateTime.isValid()) {
    // If it's just a time without a date, set it to today
    if (trimmedText.match(/^\d{1,2}:\d{2}(?: [AP]M)?$/i)) {
      directDateTime.year(now.year());
      directDateTime.month(now.month());
      directDateTime.date(now.date());
      
      // If the time has already passed today, set it for tomorrow
      if (directDateTime.isBefore(now)) {
        directDateTime.add(1, 'day');
      }
    }
    return directDateTime;
  }
  
  // Relative time expressions
  if (trimmedText.includes('tomorrow')) {
    const result = now.clone().add(1, 'day');
    
    // Check for specific time mention
    const timeMatch = trimmedText.match(/at (\d{1,2})(?::(\d{2}))? ?([ap]m)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      // Handle 12-hour format
      if (ampm === 'pm' && hour < 12) {
        hour += 12;
      } else if (ampm === 'am' && hour === 12) {
        hour = 0;
      }
      
      result.hour(hour);
      result.minute(minutes);
      result.second(0);
      result.millisecond(0);
    } else {
      // Default to 9 AM if no time specified
      result.hour(9);
      result.minute(0);
      result.second(0);
      result.millisecond(0);
    }
    
    return result;
  }
  
  // "today at X" or "tonight at X"
  if (trimmedText.includes('today') || trimmedText.includes('tonight')) {
    const result = now.clone();
    
    // Check for specific time mention
    const timeMatch = trimmedText.match(/at (\d{1,2})(?::(\d{2}))? ?([ap]m)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      // Handle 12-hour format
      if (ampm === 'pm' && hour < 12) {
        hour += 12;
      } else if (ampm === 'am' && hour === 12) {
        hour = 0;
      }
      
      // If "tonight" and no am/pm specified, assume PM
      if (trimmedText.includes('tonight') && !timeMatch[3]) {
        if (hour < 12) hour += 12;
      }
      
      result.hour(hour);
      result.minute(minutes);
      result.second(0);
      result.millisecond(0);
      
      // If the time has already passed today, set it for tomorrow
      if (result.isBefore(now)) {
        result.add(1, 'day');
      }
    } else if (trimmedText.includes('tonight')) {
      // Default "tonight" to 8 PM
      result.hour(20);
      result.minute(0);
      result.second(0);
      result.millisecond(0);
    } else {
      // Default "today" to noon if it's before noon, or 6 PM if after
      if (now.hour() < 12) {
        result.hour(12);
      } else {
        result.hour(18);
      }
      result.minute(0);
      result.second(0);
      result.millisecond(0);
    }
    
    return result;
  }
  
  // Day of week
  const dayOfWeekMatch = trimmedText.match(/on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (dayOfWeekMatch) {
    const dayOfWeek = dayOfWeekMatch[1].toLowerCase();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayOfWeek);
    
    const result = now.clone();
    let daysToAdd = (targetDay - result.day() + 7) % 7;
    
    // If it's the same day and we've already passed mid-day, go to next week
    if (daysToAdd === 0 && now.hour() >= 12) {
      daysToAdd = 7;
    }
    
    result.add(daysToAdd, 'days');
    
    // Check for specific time mention
    const timeMatch = trimmedText.match(/at (\d{1,2})(?::(\d{2}))? ?([ap]m)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3]?.toLowerCase();
      
      // Handle 12-hour format
      if (ampm === 'pm' && hour < 12) {
        hour += 12;
      } else if (ampm === 'am' && hour === 12) {
        hour = 0;
      }
      
      result.hour(hour);
      result.minute(minutes);
    } else {
      // Default to 9 AM if no time specified
      result.hour(9);
      result.minute(0);
    }
    
    result.second(0);
    result.millisecond(0);
    
    return result;
  }
  
  // "Next week", "next month"
  if (trimmedText.includes('next week')) {
    return now.clone().add(7, 'days').hour(9).minute(0).second(0).millisecond(0);
  }
  if (trimmedText.includes('next month')) {
    return now.clone().add(1, 'month').date(1).hour(9).minute(0).second(0).millisecond(0);
  }
  
  // "In X minutes/hours/days"
  const inTimeMatch = trimmedText.match(/in (\d+) (minute|minutes|min|mins|hour|hours|day|days)/i);
  if (inTimeMatch) {
    const amount = parseInt(inTimeMatch[1], 10);
    const unit = inTimeMatch[2].toLowerCase();
    
    let momentUnit: moment.unitOfTime.DurationConstructor = 'minutes';
    if (unit.startsWith('hour')) {
      momentUnit = 'hours';
    } else if (unit.startsWith('day')) {
      momentUnit = 'days';
    }
    
    return now.clone().add(amount, momentUnit);
  }
  
  // "At X AM/PM"
  const atTimeMatch = trimmedText.match(/at (\d{1,2})(?::(\d{2}))? ?([ap]m)?/i);
  if (atTimeMatch) {
    let hour = parseInt(atTimeMatch[1], 10);
    const minutes = atTimeMatch[2] ? parseInt(atTimeMatch[2], 10) : 0;
    const ampm = atTimeMatch[3]?.toLowerCase();
    
    // Handle 12-hour format
    if (ampm === 'pm' && hour < 12) {
      hour += 12;
    } else if (ampm === 'am' && hour === 12) {
      hour = 0;
    }
    
    const result = now.clone().hour(hour).minute(minutes).second(0).millisecond(0);
    
    // If the time has already passed today, set it for tomorrow
    if (result.isBefore(now)) {
      result.add(1, 'day');
    }
    
    return result;
  }
  
  // Could not parse the time expression
  return null;
};