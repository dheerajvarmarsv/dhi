// src/hooks/useReminderDetection.ts
import { useState, useEffect } from 'react';
import { extractReminderFromText, extractTimeFromText } from '../utils/reminderUtils';

interface ReminderDetectionResult {
  hasReminderIntent: boolean;
  reminderMessage: string;
  extractedTime: Date | null;
  suggestedPriority: 'low' | 'medium' | 'high';
  clearReminderIntent: () => void;
}

/**
 * A hook that detects reminder intent in user messages.
 * @param userInput The current user input text
 * @returns Object with detection results and functions
 */
export const useReminderDetection = (userInput: string): ReminderDetectionResult => {
  const [hasReminderIntent, setHasReminderIntent] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [extractedTime, setExtractedTime] = useState<Date | null>(null);
  const [suggestedPriority, setSuggestedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [prevUserInput, setPrevUserInput] = useState('');
  
  // Clear the reminder intent detection
  const clearReminderIntent = () => {
    setHasReminderIntent(false);
    setReminderMessage('');
    setExtractedTime(null);
    setSuggestedPriority('medium');
  };
  
  /**
   * More accurate function to determine if text has a real reminder intent
   * This will reduce false positives from sentences that mention time periods
   * but aren't actually requesting a reminder
   */
  function hasRealReminderIntent(text: string): boolean {
    const input = text.toLowerCase();
    
    // 1. Direct reminder requests - these are very explicit
    const directReminderPatterns = [
      /\bremind me\b/i,
      /\bset (?:a|an) reminder\b/i,
      /\bcreate (?:a|an) reminder\b/i,
      /\bset (?:a|an) alarm\b/i,
      /\breminder for\b/i,
      /\bremind me (?:about|to|that)\b/i,
      /\bcan you remind\b/i,
      /\bplease remind\b/i,
      /\bdon't let me forget\b/i,
      /\blet me know when\b/i,
      /\bnotify me\b/i,
      /\balert me\b/i,
      /\bremind (?:me|us)\b/i,              // More general "remind me" pattern
      /\bhelp me remember\b/i,              // "Help me remember to..."
      /\bwake me\b/i,                       // Wake me at/in/when...
      /\bping me\b/i,                       // Ping me at/in/when...
      /\btell me (?:when|to|about)\b/i,     // "Tell me when/to/about..."
      /\bneed to remember\b/i,              // "I need to remember to..."
      /\bwant to remember\b/i,              // "I want to remember to..."
      /\bhave to remember\b/i,              // "I have to remember to..."
      /\bmake sure I\b.*?\b(?:don't forget|remember)\b/i, // "Make sure I don't forget"
      /\bremember\b.*?\bat\b/i,             // "Remember to X at Y time"
      /\bremember\b.*?\bin\b/i,             // "Remember to X in Y time"
      /\breminder\b.*?\bin\b/i,             // "Reminder to X in Y time"
      /\bremind\s+(?:me|us)?\s+(?:in|at)\s+\d+/i, // "Remind in X" or "Remind at X"
      // Add standalone "reminder" detection
      /\breminder\b/i,                      // Just the word "reminder" by itself
      /\breminders?\b/i,                    // Both singular and plural forms
      /\bnew reminder\b/i,                  // Common phrase "new reminder"
      /\badd (?:a|an|this) reminder\b/i,    // "Add a reminder"
      /\breminder about\b/i,                // "Reminder about X"
      /\badd this to (?:my|the) reminders\b/i, // "Add this to my reminders"
      // Additional reminder patterns
      /\bto do list\b/i,                    // "Create a to do list" or "Add to my to do list"
      /\bcreate (?:a|an) to do list\b/i,
      /\badd to (?:my|our) to do list\b/i,
      /\bcreate (?:a|an) checklist\b/i,
      /\badd to (?:my|our) checklist\b/i,
      /\btask list\b/i,
      /\btasks for\b/i,
      /\bappointment\b/i,                   // "Set an appointment" or "I have an appointment"
      /\bschedule (?:a|an)\b/i,             // "Schedule a meeting"
      /\bmeeting with\b/i,
      /\breserve (?:a|an)\b/i,
      /\bbook (?:a|an)\b/i,
      /\btodo\b/i,                          // Catch "todo" even without spaces
      /\btodolist\b/i,                      // Catch "todolist" without spaces
      /\btodo list\b/i,                     // And with spaces
      /\bto-do\b/i,                         // With hyphen
      /\bto-do list\b/i,
      /\btask reminder\b/i,
      /\bcalendar\b.*?\bevent\b/i,          // "Add calendar event"
      /\broadd (?:a|an) event to\b/i,       // "Add an event to calendar"
      /\bput.*\bon my calendar\b/i,         // "Put X on my calendar"
      /\bschedule\b.*?\bfor\b/i,            // "Schedule X for Friday"
      /\b(?:set|create|make|add) (?:a|an) note\b/i, // "Create a note to..."
      /\bmark (?:a|the) date\b/i,           // "Mark the date for..."
      /\balarm\b.*?\bfor\b/i,               // "Set an alarm for..."
    ];
    
    // If any direct pattern matches, this is almost certainly a reminder request
    if (directReminderPatterns.some(pattern => pattern.test(input))) {
      return true;
    }
    
    // 2. Check for false positives - common phrases that mention time but aren't reminders
    const falsePositivePatterns = [
      /\bi(?:'m| am) sad\b/i,        // "I'm sad that..."
      /\bi was reminded\b/i,         // Past tense discussions of reminders
      /\bstory about\b/i,            // Talking about a reminder in a story
      /\breminded me of\b/i,         // Reminded as in "it made me think of"
      /\breminder about\b/i,         // Talking about a reminder concept
      /\btell me about reminders\b/i, // Asking about the reminder feature
      /\bhow do reminders\b/i,       // Questions about reminders
      /\bwhat is a reminder\b/i,      // Definitions
      /\bcame late\b/i,             // Discussions of lateness
      /\bi was late\b/i,             // Past lateness
      /\bi am late\b/i,              // Current lateness statement
      /\bi(?:'m| am) lat\b/i,       // Typo for "I am late"
      /\bhelp me\b.*\bremind\b/i,   // "Help me remind" vs "remind me"
    ];
    
    // If any false positive pattern matches, this is likely NOT a reminder request
    if (falsePositivePatterns.some(pattern => pattern.test(input))) {
      return false;
    }
    
    // 3. For ambiguous cases, check if the intent structure matches a reminder
    // This requires BOTH a time reference AND an action/reminder context
    
    // Time reference patterns - expanded for more natural language
    const timePatterns = [
      /\bin \d+ min(?:ute)?s?\b/i,     // "in X minutes"
      /\bin \d+ hour(?:s)?\b/i,        // "in X hours"
      /\bin \d+ day(?:s)?\b/i,         // "in X days"
      /\bin a (?:min(?:ute)?|hour)\b/i, // "in a minute/hour"
      /\bat \d+(?::\d+)?\s*(?:am|pm)\b/i, // "at 3pm" or "at 3:30pm"
      /\btoday at\b/i,                // "today at X"
      /\btomorrow\b/i,                // "tomorrow" 
      /\blater\b/i,                   // "later today/tonight"
      /\b\d+\s*min(?:ute)?s?\b/i,     // Just "X minutes" without "in"
      /\b\d+\s*hour(?:s)?\b/i,        // Just "X hours" without "in"
      /\bthis (?:evening|afternoon|morning)\b/i, // Time periods
      /\btonight\b/i,                 // Tonight
      /\bnext week\b/i,               // Next week
      /\bon (?:mon|tues|wednes|thurs|fri|satur|sun)day\b/i, // On specific day
      /\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\b/i, // Just day name
      /\bin the (?:morning|afternoon|evening)\b/i, // General time of day
    ];
    
    // Action/intent context patterns that suggest this is actually a reminder
    const actionIntentPatterns = [
      /\b(?:to|that I should|that I need to)\b/i, // Purpose of reminder
      /\b(?:call|text|email|check|do|make|get|buy|pick up|meet|send|take|go to|attend|join|finish|complete|pay|submit|work on)\b/i, // Common actions
      /\b(?:appointment|meeting|call|deadline|due date|assignment|task|chore|errand|medication|pills|order|reservation|booking|flight|train|bus|event|party|birthday|anniversary|payment|bill|subscription|workout|exercise|class)\b/i, // Common reminder topics
    ];
    
    const hasTimeReference = timePatterns.some(pattern => pattern.test(input));
    const hasActionOrIntent = actionIntentPatterns.some(pattern => pattern.test(input));
    
    // For ambiguous cases, require BOTH time reference AND action/intent
    // This prevents false positives for simple time mentions
    if (hasTimeReference && hasActionOrIntent) {
      return true;
    }
    
    // Direct mentions of minutes that look like reminder requests
    // e.g. "5 mins" or "remind in 5 mins"
    if (/\b\d+\s*mins?\b/i.test(input) && 
        (input.includes("remind") || input.includes("reminder") || input.includes("alert") || 
         input.includes("notification") || input.includes("notify"))) {
      return true;
    }
    
    // Improved detection for "X minutes" style requests without explicit reminder words
    if (/\b\d+\s*mins?\b/i.test(input) && input.length < 30) {
      // Short inputs with just time specifications are likely reminder requests
      // e.g. "15 minutes" or "5 mins"
      return true;
    }
    
    // Check for just time patterns at the beginning of short messages
    // E.g. "Tomorrow at 3pm dentist appointment"
    if (input.length < 50) {
      for (const pattern of timePatterns) {
        if (pattern.test(input.substring(0, Math.min(20, input.length)))) {
          // Time reference at the beginning of message, likely a reminder
          return true;
        }
      }
    }
    
    // Default to false for anything else - be conservative to avoid false positives
    return false;
  }
  
  useEffect(() => {
    // Skip if input hasn't changed
    if (userInput === prevUserInput) {
      return;
    }
    
    // Update previous input
    setPrevUserInput(userInput);
    
    // Skip empty inputs
    if (!userInput.trim()) {
      clearReminderIntent();
      return;
    }
    
    // Detect reminder intent
    const hasIntent = hasRealReminderIntent(userInput);
    
    if (hasIntent) {
      // Always use the original user input for the reminder message
      setReminderMessage(userInput);
      setHasReminderIntent(true);
      
      // Extract time if possible
      try {
        const { time } = extractTimeFromText(userInput);
        if (time) {
          setExtractedTime(time);
        } else {
          // Default to 30 minutes from now if no time specified
          setExtractedTime(new Date(Date.now() + 30 * 60 * 1000));
        }
        
        // Detect priority based on keywords
        const lowercaseInput = userInput.toLowerCase();
        if (lowercaseInput.includes('urgent') || lowercaseInput.includes('important') || 
            lowercaseInput.includes('asap') || lowercaseInput.includes('critical')) {
          setSuggestedPriority('high');
        } else if (lowercaseInput.includes('low priority') || lowercaseInput.includes('whenever') ||
                  lowercaseInput.includes('not urgent')) {
          setSuggestedPriority('low');
        } else {
          setSuggestedPriority('medium');
        }
      } catch (error) {
        console.error('Error extracting time from reminder:', error);
      }
    } else {
      clearReminderIntent();
    }
  }, [userInput]); // Only depend on userInput
  
  return { 
    hasReminderIntent,
    reminderMessage,
    extractedTime,
    suggestedPriority,
    clearReminderIntent
  };
};

// Helper functions
function fuzzyContains(str: string, searchTerm: string): boolean {
  // Simple implementation of fuzzy matching
  const searchTermChars = searchTerm.toLowerCase().split('');
  let currentPosition = 0;
  const strLower = str.toLowerCase();
  
  for (const char of searchTermChars) {
    const position = strLower.indexOf(char, currentPosition);
    if (position === -1) {
      return false;
    }
    currentPosition = position + 1;
  }
  
  return true;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  
  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i-1) === a.charAt(j-1)) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1, // substitution
          matrix[i][j-1] + 1,   // insertion
          matrix[i-1][j] + 1    // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function correctSpellingMistakes(input: string): string {
  // List of common reminder-related words and their misspellings
  const corrections: {[key: string]: string[]} = {
    'reminder': ['remainder', 'remaider', 'remider', 'remminder', 'remindir', 'remindr'],
    'remind': ['remaind', 'remamd', 'remid', 'remmind', 'remend'],
    'tomorrow': ['tommorow', 'tomorow', 'tommorrow', 'tomorrrow', 'tmrw', 'tomrw'],
    'today': ['tday', 'todey', 'toady', 'todaye'],
    'tonight': ['tonite', 'tonigt', 'tonihgt', 'tonit'],
    'minutes': ['mins', 'minuts', 'munutes', 'minnutes', 'minuets'],
    'minute': ['min', 'minut', 'minit', 'minet'],
    'hours': ['hrs', 'houres', 'hors', 'hourss'],
    'hour': ['hr', 'houre', 'hor'],
    'meeting': ['meetin', 'meating', 'meetng', 'meting'],
    'appointment': ['apointment', 'appointmnt', 'appt', 'appointment', 'apmnt'],
    'schedule': ['schedual', 'scedule', 'shedule', 'schdule', 'sched'],
    'call': ['cal', 'coll', 'caul'],
    'calendar': ['calander', 'calender', 'calandar', 'callendar'],
    'alarm': ['alarme', 'alerm', 'alrm', 'alarrm'],
    'alert': ['allert', 'alirt', 'alart', 'alrt']
  };
  
  let correctedInput = input;
  
  // Split the input into words
  const words = input.split(/\s+/);
  
  // Check each word against our dictionary of corrections
  const correctedWords = words.map(word => {
    // Keep original capitalization and punctuation
    const lowercase = word.toLowerCase();
    const punctuation = lowercase.match(/[^\w\s]$/);
    const strippedWord = lowercase.replace(/[^\w\s]/g, '');
    
    // Check if this word is a misspelling we know
    for (const [correctWord, misspellings] of Object.entries(corrections)) {
      if (misspellings.includes(strippedWord)) {
        // Return the corrected word with original punctuation
        return correctWord + (punctuation ? punctuation[0] : '');
      }
      
      // Check for close matches using edit distance
      if (strippedWord.length > 3 && levenshteinDistance(strippedWord, correctWord) <= 2) {
        return correctWord + (punctuation ? punctuation[0] : '');
      }
    }
    
    // No correction needed
    return word;
  });
  
  return correctedWords.join(' ');
}