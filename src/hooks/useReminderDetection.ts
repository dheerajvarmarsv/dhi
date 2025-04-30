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
  const [wasProcessed, setWasProcessed] = useState(false);
  
  // Clear the reminder intent detection
  const clearReminderIntent = () => {
    setHasReminderIntent(false);
    setReminderMessage('');
    setExtractedTime(null);
    setSuggestedPriority('medium');
    setWasProcessed(false); // Reset the processed flag
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
    
    // Time reference patterns
    const timePatterns = [
      /\bin \d+ min(?:ute)?s?\b/i,     // "in X minutes"
      /\bin \d+ hour(?:s)?\b/i,        // "in X hours"
      /\bin \d+ day(?:s)?\b/i,         // "in X days"
      /\bin a (?:min(?:ute)?|hour)\b/i, // "in a minute/hour"
      /\bat \d+(?::\d+)?\s*(?:am|pm)\b/i, // "at 3pm" or "at 3:30pm"
      /\btoday at\b/i,                // "today at X"
      /\btomorrow\b/i,                // "tomorrow" 
      /\blater\b/i,                   // "later today/tonight"
    ];
    
    // Action/intent context patterns that suggest this is actually a reminder
    const actionIntentPatterns = [
      /\b(?:to|that I should|that I need to)\b/i, // Purpose of reminder
      /\b(?:call|text|email|check|do|make|get|buy|pick up|meet|send|take|go to)\b/i, // Common actions
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
        (input.includes("remind") || input.includes("reminder") || input.includes("alert"))) {
      return true;
    }
    
    // Default to false for anything else - be conservative to avoid false positives
    return false;
  }
  
  useEffect(() => {
    // Skip empty messages
    if (!userInput.trim()) {
      clearReminderIntent();
      return;
    }
    
    // Reset processed flag for new input to ensure we can process it again
    setWasProcessed(false);
    
    // Apply spelling correction for common reminder-related misspellings
    const correctedInput = correctSpellingMistakes(userInput);
    
    // Check for genuine reminder intent using the more accurate function
    let hasIntent = hasRealReminderIntent(correctedInput);
    
    // Skip false positives that contain reminder-related words but aren't actual requests
    if (hasIntent) {
      // Make a final check to avoid false positives in conversational context
      // If the text is clearly asking about something rather than requesting a reminder
      const askingAboutReminders = /\b(?:what|how|why|when|tell me about)\s+(?:is|are|do|does|can|could)\s+(?:reminders?|alerts?)\b/i.test(correctedInput);
      
      if (askingAboutReminders) {
        hasIntent = false;
      }
    }
    
    // Set the state
    setHasReminderIntent(hasIntent);
    
    if (hasIntent) {
      // Get suggested priority based on keywords
      const priorityLevel = (() => {
        // High priority keywords
        if (correctedInput.match(/\b(urgent|asap|important|critical|emergency|immediately|right away|crucial|hurry|rush|priority|high priority|high|very important|super important|extremely important|urgent|must|imperative|vital|essential|necessary|needed|quick|fast)\b/i)) {
          return 'high';
        } 
        // Low priority keywords
        else if (correctedInput.match(/\b(low priority|whenever|not urgent|when you get a chance|no rush|sometime|some time|eventually|when possible|lazy|chill|relax|not important|secondary|tertiary|minor|trivial|if you have time|if you can|casual|no hurry|low)\b/i)) {
          return 'low';
        }
        return 'medium';
      })();
      
      setSuggestedPriority(priorityLevel);
      
      // Use the reminder extraction utility to get the time and message
      const extractionResult = extractReminderFromText(correctedInput);
      
      if (extractionResult) {
        setReminderMessage(extractionResult.message);
        setExtractedTime(extractionResult.time);
      } else {
        setReminderMessage(correctedInput.trim());
        
        // If no time from the extractor, try to extract it manually
        const timeResult = extractTimeFromText(correctedInput);
        setExtractedTime(timeResult.time);
      }
    } else {
      // Not a reminder intent
      setReminderMessage('');
      setExtractedTime(null);
    }
    
  }, [userInput]);
  
  return { 
    hasReminderIntent, 
    reminderMessage, 
    extractedTime,
    suggestedPriority,
    clearReminderIntent 
  };
};

/**
 * Check if a string contains another string in a fuzzy way, allowing for minor typos
 */
function fuzzyContains(str: string, searchTerm: string): boolean {
  // Convert both to lowercase for case-insensitive matching
  str = str.toLowerCase();
  searchTerm = searchTerm.toLowerCase();
  
  // Exact match check first (faster)
  if (str.includes(searchTerm)) {
    return true;
  }
  
  // Allow for simple typos by checking if a substring with up to 1 character different exists
  const searchTermLength = searchTerm.length;
  
  // Don't do fuzzy matching for very short strings (to avoid false positives)
  if (searchTermLength <= 2) {
    return str.includes(searchTerm);
  }
  
  // For longer strings, split the input and check each word
  const words = str.split(/\s+/);
  
  for (const word of words) {
    // Skip very short words
    if (word.length < searchTermLength - 1) continue;
    
    // Check for similarity with the search term
    if (levenshteinDistance(word, searchTerm) <= Math.min(2, Math.floor(searchTermLength / 3))) {
      return true;
    }
    
    // Also check for substring matches (for longer words)
    if (word.length > searchTermLength + 2) {
      for (let i = 0; i <= word.length - searchTermLength; i++) {
        const substring = word.substr(i, searchTermLength);
        if (levenshteinDistance(substring, searchTerm) <= 1) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Calculate Levenshtein distance between two strings
 * This measures how many single-character edits are needed to change one string into another
 */
function levenshteinDistance(a: string, b: string): number {
  // Early return for empty strings or exact matches
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  // Create a matrix of size (a.length+1) x (b.length+1)
  const matrix: number[][] = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));
  
  // Initialize the first row and column
  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[a.length][b.length];
}

/**
 * Correct common spelling mistakes in reminder-related text
 */
function correctSpellingMistakes(input: string): string {
  const corrections: {[key: string]: string} = {
    // Common reminder word misspellings
    'remid': 'remind',
    'remined': 'remind',
    'remaider': 'reminder',
    'remender': 'reminder',
    'remaind': 'remind',
    'remainder': 'reminder',
    'remin': 'remind',
    'remindr': 'reminder',
    'reminme': 'remind me',
    'remine': 'remind',
    'reminde': 'remind',
    'reminf': 'remind',
    'rememberme': 'remember me',
    'remembrme': 'remember me',
    'forgt': 'forget',
    'forgit': 'forget',
    'forg': 'forget',
    'alerm': 'alarm',
    'alarme': 'alarm',
    'alram': 'alarm',
    'alrm': 'alarm',
    'remembr': 'remember',
    'rember': 'remember',
    'scheduel': 'schedule',
    'schedul': 'schedule',
    'shedule': 'schedule',
    'schdule': 'schedule',
    'schdul': 'schedule',
    'scedule': 'schedule',
    'sheduled': 'scheduled',
    'tomorow': 'tomorrow',
    'tommorow': 'tomorrow',
    'tomorro': 'tomorrow',
    'tomorrw': 'tomorrow',
    'tommorrow': 'tomorrow',
    'tmrw': 'tomorrow',
    'tmr': 'tomorrow',
    'tonite': 'tonight',
    'tonigt': 'tonight',
    'tonght': 'tonight',
    'tnght': 'tonight',
    'minuts': 'minutes',
    'minit': 'minute',
    'minits': 'minutes',
    'mints': 'minutes',
    'minut': 'minute',
    'oclock': "o'clock",
    'wrokout': 'workout',
    'wrk': 'work',
    'wrkout': 'workout',
    'excersise': 'exercise',
    'exercize': 'exercise',
    'exercse': 'exercise',
    'excercise': 'exercise',
  };
  
  // Prepare input for processing
  let corrected = input;
  const words = input.toLowerCase().split(/\s+/);
  
  // Apply corrections
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check if this word needs correction
    if (corrections[word]) {
      // Create a regex that matches the word with proper word boundaries
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      corrected = corrected.replace(regex, corrections[word]);
    }
  }
  
  return corrected;
}