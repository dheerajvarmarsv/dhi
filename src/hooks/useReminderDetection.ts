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
  
  // Clear the reminder intent detection
  const clearReminderIntent = () => {
    setHasReminderIntent(false);
    setReminderMessage('');
    setExtractedTime(null);
    setSuggestedPriority('medium');
  };
  
  useEffect(() => {
    // Skip empty messages
    if (!userInput.trim()) {
      clearReminderIntent();
      return;
    }
    
    // Apply spelling correction for common reminder-related misspellings
    const correctedInput = correctSpellingMistakes(userInput);
    
    // Convert to lowercase for case-insensitive matching
    const input = correctedInput.toLowerCase();
    
    // Common reminder patterns with fuzzy matching for typos
    const reminderPatterns = [
      /re?m[ie]nd(?:er)? me (?:to|about)? (.+)/i,         // Handles: remind, remnd, remine me
      /re?m[ie]nd(?:er)? (?:me|us|my|about)? (.+)/i,      // Even more flexible reminder detection
      /set (?:a|an)? ?re?m[ie]nd(?:er)? (?:to|for|about)? (.+)/i,
      /don['']?t let me f[oa]rg[ea]t (?:to|about)? (.+)/i, // Handles: forget, forgt, fargat
      /can you re?m[ie]nd (?:me|us)? (?:about|to)? (.+)/i,
      /pl[ea]a?se re?m[ie]nd (?:me|us)? (?:to|about)? (.+)/i, // Handles: please, plase, plese
      /i need to re?m[ea]mb[ea]r (?:to|about)? (.+)/i,
      /i need to (.+) (at|on|by|tomorrow|later|in)/i,
      /don['']?t f[oa]rg[ea]t (?:to|about)? (.+)/i,
      /set (?:an|a)? ?al[ae]rm (?:for|to)? (.+)/i,   // Handles: alarm, alerm
      /ping me (?:about|to|when)? (.+)/i,
      /let me know when (.+)/i,
      /not[iy]fy me (?:about|to|when)? (.+)/i,  // Handles: notify, notfy
      /can you al[ae]rt me (?:about|to|when)? (.+)/i,
      /sch[ea]d[ua]le (.+) (?:for|at|on)/i,   // Handles: schedule, schedele
      /create (?:a|an)? ?re?m[iy]nd(?:er)? (?:for|about)? (.+)/i, // Handles: create a reminder for...
      /add (?:a|an)? ?re?m[iy]nd(?:er)? (?:for|about)? (.+)/i,    // Handles: add a reminder for...
    ];
    
    // Time-related patterns with fuzzy matching for typos
    const timePatterns = [
      /(?:at|@) ?(\d{1,2})(?::(\d{2}))? ?(?:am|pm|a\.m\.|p\.m\.)?/i, // Handles: at 3pm, @ 3pm, at 3:30pm
      /(?:in|after) ?(\d+) ?(?:min(?:ute)?s?|hour(?:s)?|day(?:s)?|sec(?:ond)?s?|hr(?:s)?)/i, // Handles: in 5 min, after 2 hours
      /(?:on|next) ?(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)/i,
      /t[oa]m[oa]rr?[oa]w/i, // Handles: tomorrow, tomorow, tommorow, etc.
      /next (?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)/i,
      /(\d{1,2})(?::(\d{2}))? ?(?:am|pm|a\.m\.|p\.m\.)/i, // Handles: 3pm, 3:30pm
      /(?:this|next) ?(?:we+k|mon(?:th)?)/i, // Handles: this week, next month
      /l[ae]t[ea]r (?:t[oa]day|t[oa]n[iy]ght)/i, // Handles: later today, later tonight
      /(?:mo?rn[iy]ng|aft[ea]rno+n|eve?n[iy]ng|t[oa]n[iy]ght)/i, // Handles: morning, afternoon, evening, tonight
      /(?:in|at) ?the ?(?:mo?rn[iy]ng|aft[ea]rno+n|eve?n[iy]ng)/i, // Handles: in the morning, at the evening
      /(\d+)[:.](\d+)/i, // HH:MM format
      /(\d+) ?(?:am|pm|a\.m\.|p\.m\.)/i, // Handles: 3 pm, 3pm
      /(?:in|after) ?(?:a|an|1) ?(?:min(?:ute)?|hour|day|sec(?:ond)?|hr)/i, // Handles: in a minute, after an hour
      /(?:few|couple of|couple|some) ?(?:min(?:ute)?s?|hour(?:s)?|day(?:s)?|sec(?:ond)?s?)/i, // Handles: few minutes, couple of hours
    ];
    
    // Action verbs that imply a reminder might be needed
    const actionVerbs = [
      'call', 'text', 'email', 'send', 'submit', 'pay', 'check', 'review', 
      'write', 'read', 'buy', 'get', 'pick', 'meet', 'attend', 'talk', 'speak',
      'finish', 'complete', 'start', 'begin', 'take', 'visit', 'see', 'watch',
      'make', 'prepare', 'cook', 'clean', 'workout', 'exercise', 'study', 'do',
      'water', 'feed', 'walk', 'bring', 'move', 'transfer', 'book', 'schedule',
      'order', 'cancel', 'run', 'go', 'drive', 'shop', 'contact', 'upload',
      'download', 'drink', 'eat', 'sleep', 'wake', 'wash', 'charge', 'fix',
      'reply', 'respond', 'follow up', 'follow', 'print', 'sign', 'update',
      'refill', 'renew', 'ask', 'tell', 'show', 'find'
    ];
    
    // Check for reminder intent
    let hasIntent = false;
    let extractedContent = '';
    
    // First check for obvious reminder patterns
    for (const pattern of reminderPatterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        hasIntent = true;
        extractedContent = match[1].trim();
        break;
      }
    }
    
    // If no obvious pattern, check for time references with potential reminder context
    if (!hasIntent) {
      // Look for reminder-related words with fuzzy matching
      const reminderWords = [
        'remind', 'reminder', 'remnd', 'remine', 'reminde',
        'forget', 'forgt', 'forgat', 'dont forget',
        'remember', 'remembr', 'rember',
        'notify', 'notif', 'notification',
        'alert', 'alrt', 'alarm', 'alrm',
        'schedule', 'schedl', 'schdule',
        'event', 'appointment', 'meeting', 'deadline',
        'note', 'memory'
      ];
      
      // Check for fuzzy matches of reminder words
      const hasReminderWord = reminderWords.some(word => 
        fuzzyContains(input, word)
      );
      
      // If it has a reminder word and a time pattern, it's likely a reminder
      if (hasReminderWord) {
        for (const pattern of timePatterns) {
          if (pattern.test(input)) {
            hasIntent = true;
            extractedContent = input; // Use full text as we don't have a specific extraction
            break;
          }
        }
      }
      
      // Special case: Even if no reminder word, if there's clear time reference and action verb
      // e.g. "Call mom at 5pm" - no reminder word but clearly needs a reminder
      if (!hasIntent) {
        const hasTimeReference = timePatterns.some(pattern => pattern.test(input));
        const hasActionVerb = actionVerbs.some(verb => 
          fuzzyContains(input, verb)
        );
        
        if (hasTimeReference && hasActionVerb) {
          hasIntent = true;
          extractedContent = input; // Use full text
        }
      }
    }
    
    // Use the reminder extraction utility to get the time and message
    const extractionResult = hasIntent 
      ? extractReminderFromText(correctedInput) 
      : null;
    
    // Get suggested priority based on keywords
    const priorityLevel = (() => {
      // High priority keywords
      if (input.match(/\b(urgent|asap|important|critical|emergency|immediately|right away|crucial|hurry|rush|priority|high priority|high|very important|super important|extremely important|urgent|must|imperative|vital|essential|necessary|needed|quick|fast)\b/i)) {
        return 'high';
      } 
      // Low priority keywords
      else if (input.match(/\b(low priority|whenever|not urgent|when you get a chance|no rush|sometime|some time|eventually|when possible|lazy|chill|relax|not important|secondary|tertiary|minor|trivial|if you have time|if you can|casual|no hurry|low)\b/i)) {
        return 'low';
      }
      return 'medium';
    })();
    
    // Set the state
    setHasReminderIntent(hasIntent);
    setSuggestedPriority(priorityLevel);
    
    if (hasIntent && extractionResult) {
      setReminderMessage(extractionResult.message);
      setExtractedTime(extractionResult.time);
    } else if (hasIntent) {
      setReminderMessage(extractedContent || correctedInput.trim());
      
      // If we have an intent but no time from the extractor, try to extract it manually
      const timeResult = extractTimeFromText(correctedInput);
      setExtractedTime(timeResult.time);
    } else {
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