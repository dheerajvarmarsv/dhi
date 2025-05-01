import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Pressable,
  StatusBar,
  Image,
  AppState,
  Keyboard,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { initLlama, releaseAllLlama } from 'llama.rn';
import RNFS from 'react-native-fs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { 
  loadChatSession, 
  updateChatSession, 
  createChatSession,
  deleteChatSession,
  getChatsByModel
} from '../utils/chatStorage';
import { formatPrompt, promptTemplates, getAllPersonas, PromptTemplate } from '../utils/promptTemplates';
import PersonaSelector from '../components/PersonaSelector';
import ChatSidebar from '../components/ChatSidebar';
import { Message, ChatSession } from '../types';
import { COLORS, FONTS } from '../constants/theme';

// Nice‑looking typographic defaults for Markdown in the chat bubbles
const markdownStyles: any = {
  heading1: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8, color: '#333' },
  heading2: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 6, color: '#333' },
  heading3: { fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 4, color: '#333' },
  paragraph: { fontSize: 16, lineHeight: 22, marginBottom: 8, color: '#333' },
  list_item: { fontSize: 16, lineHeight: 22, marginBottom: 6, marginLeft: 8, color: '#333' },
  bullet_list: { marginBottom: 8, marginTop: 8 },
  ordered_list: { marginBottom: 8, marginTop: 8 },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  body: { lineHeight: 22 },
  // Ensure proper spacing for lists
  bullet_list_icon: { marginRight: 8, fontSize: 16, lineHeight: 22 },
  ordered_list_icon: { marginRight: 8, fontSize: 16, lineHeight: 22 },
};
import ReminderDialog from '../components/ReminderDialog';
import ReminderButton from '../components/ReminderButton';
import { useReminderDetection } from '../hooks/useReminderDetection';
import { getActiveReminders, setupReminderSystem, Reminder } from '../utils/reminderUtils';
import { processAssistantMessageForReminder } from '../utils/reminderIntegration';

// Get device dimensions for responsive design
const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Chat: { selectedModel: string; chatId?: string };
  ModelSelection: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

const ChatScreen = ({ route, navigation }: Props) => {
  const { selectedModel, chatId } = route.params;
  const INITIAL_CONVERSATION: Message[] = [
    {
      role: 'system',
      content: 'This is a conversation between user and assistant, a friendly chatbot.',
    },
  ];
  
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null);
  const [chatTitle, setChatTitle] = useState<string>('New Chat');
  const [context, setContext] = useState<any>(null);
  const [conversation, setConversation] = useState<Message[]>(INITIAL_CONVERSATION);
  const [userInput, setUserInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('general');
  const [personaSelectorVisible, setPersonaSelectorVisible] = useState<boolean>(false);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  const titleInputRef = useRef<TextInput>(null);

  const [inputHeight, setInputHeight] = useState(45);
  const [reminderDialogVisible, setReminderDialogVisible] = useState(false);
  const [activeReminderCount, setActiveReminderCount] = useState(0);
  const { hasReminderIntent, reminderMessage, clearReminderIntent } = useReminderDetection(userInput);

  // Add state for keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Add an appState ref to track app state changes
  const appStateRef = useRef(AppState.currentState);

  // Load the model and chat when component mounts
  useEffect(() => {
    loadModel(selectedModel);
    checkExistingChats();
    
    // Clean up duplicate "New Chat" sessions when component mounts
    cleanupDuplicateNewChats();
    
    return () => {
      if (context) {
        releaseAllLlama();
      }
    };
  }, [selectedModel]);
  
  // Initialize reminder system and check for active reminders
  useEffect(() => {
    // Initialize reminder system
    setupReminderSystem();
    
    // Check for active reminders periodically
    const checkReminders = async () => {
      try {
        const activeReminders = await getActiveReminders();
        setActiveReminderCount(activeReminders.length);
      } catch (error) {
        console.error('Error checking reminders:', error);
      }
    };
    
    checkReminders();
    const interval = setInterval(checkReminders, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  // Add keyboard event listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        // Store keyboard height for proper spacing
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    
    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);
  
  const cleanupDuplicateNewChats = async () => {
    try {
      const existingChats = await getChatsByModel(selectedModel);
      const newChats = existingChats.filter(chat => chat.title === 'New Chat');
      
      if (newChats.length > 1) {
        // Keep the most recent "New Chat" and delete others
        const [mostRecent, ...duplicates] = newChats;
        
        // Delete all duplicate "New Chat" sessions
        for (const chat of duplicates) {
          await deleteChatSession(chat.id);
        }
        
        // If current chat was one of the deleted ones, switch to the kept one
        if (currentChatId && duplicates.some(chat => chat.id === currentChatId)) {
          await loadSpecificChat(mostRecent.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up duplicate new chats:', error);
    }
  };

  const checkExistingChats = async () => {
    try {
      // First clean up any duplicate "New Chat" sessions
      await cleanupDuplicateNewChats();
      
      const existingChats = await getChatsByModel(selectedModel);
      
      // If there's a specific chatId to load
      if (chatId) {
        const chatExists = await loadChatSession(chatId);
        if (chatExists) {
          await loadSpecificChat(chatId);
          return;
        }
      }
      
      // Look for the single "New Chat"
      const newChat = existingChats.find(chat => chat.title === 'New Chat');
      
      if (newChat) {
        await loadSpecificChat(newChat.id);
        return;
      }
      
      // If no chats exist at all, create a new one
      if (existingChats.length === 0) {
        await createNewChat();
        return;
      }
      
      // Load most recent chat
      await loadSpecificChat(existingChats[0].id);
      
    } catch (error) {
      console.error('Error checking existing chats:', error);
      if (!currentChatId) {
        await createNewChat();
      }
    }
  };
  
  // Load a specific chat when the chatId changes in route params
  useEffect(() => {
    if (chatId && chatId !== currentChatId) {
      loadSpecificChat(chatId);
    }
  }, [chatId]);
  
  const loadSpecificChat = async (id: string) => {
    try {
      const chatSession = await loadChatSession(id);
      if (chatSession) {
        setConversation(chatSession.messages || INITIAL_CONVERSATION);
        setSelectedPersonaId(chatSession.personaId || 'general');
        setChatTitle(chatSession.title || 'New Chat');
        setCurrentChatId(id);
        
        // Update navigation params without triggering a navigation
        navigation.setParams({ chatId: id });
        
        // Scroll to the end after loading the chat
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 200);
      } else {
        // If chat doesn't exist, look for an existing "New Chat" first
        const existingChats = await getChatsByModel(selectedModel);
        const newChat = existingChats.find(chat => chat.title === 'New Chat');
        
        if (newChat) {
          await loadSpecificChat(newChat.id);
        } else {
          await createNewChat();
        }
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      // Only create a new chat if we have no current chat
      if (!currentChatId) {
        await createNewChat();
      }
    }
  };
  
  const createNewChat = async () => {
    try {
      // Create a new initial conversation with the selected persona's system prompt
      let initialConversation = [...INITIAL_CONVERSATION];
      
      try {
        // Get all personas including custom ones
        const allPersonas = await getAllPersonas();
        const selectedTemplate = allPersonas.find((p: PromptTemplate) => p.id === selectedPersonaId);
        
        if (selectedTemplate && initialConversation.length > 0 && initialConversation[0].role === 'system') {
          // Replace the system message with the selected persona's system prompt
          initialConversation[0] = {
            ...initialConversation[0],
            content: selectedTemplate.systemPrompt
          };
        } else if (!selectedTemplate) {
          // If persona not found, fall back to general
          console.warn(`Selected persona ${selectedPersonaId} not found, using default`);
          const defaultTemplate = promptTemplates.find(p => p.id === 'general') || promptTemplates[0];
          
          if (initialConversation.length > 0 && initialConversation[0].role === 'system') {
            initialConversation[0] = {
              ...initialConversation[0],
              content: defaultTemplate.systemPrompt
            };
          }
        }
      } catch (error) {
        console.error('Error getting persona for new chat:', error);
        // Continue with default system prompt
      }
      
      // Create the chat session with the prepared conversation
      const newChat = await createChatSession(
        selectedModel, 
        'New Chat', 
        initialConversation,
        selectedPersonaId // Pass the selected persona ID
      );
      
      if (newChat) {
        setCurrentChatId(newChat.id);
        setChatTitle(newChat.title);
        setConversation(initialConversation);
        
        // Update navigation params without triggering a navigation
        navigation.setParams({ chatId: newChat.id });
        
        return newChat;
      } else {
        throw new Error('Failed to create new chat');
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      // Set up fallback conversation with minimal system prompt
      const fallbackConversation: Message[] = [{
        role: 'system' as const,
        content: 'You are a helpful AI assistant. Respond to the user in a natural and helpful way.'
      }];
      setConversation(fallbackConversation);
    }
    return null;
  };
  
  const saveChat = async () => {
    if (!currentChatId) return;
    
    try {
      await updateChatSession(currentChatId, {
        messages: conversation,
        personaId: selectedPersonaId
      });
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  const loadModel = async (modelName: string) => {
    try {
      const destPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;
      const fileExists = await RNFS.exists(destPath);
      
      if (!fileExists) {
        Alert.alert('Error', 'Model file not found. Please download it first.');
        navigation.navigate('ModelSelection');
        return;
      }
      
      const llamaContext = await initLlama({
        model: destPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 1,
      });
      
      setContext(llamaContext);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error Loading Model', errorMessage);
      navigation.navigate('ModelSelection');
    }
  };

  // Add this useEffect to handle app state changes and scrolling
  useEffect(() => {
    // Function to scroll to the end of the chat
    const scrollToEnd = () => {
      if (scrollViewRef.current && conversation.length > 1) {
        // Use setTimeout to ensure the scrollview has rendered
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    };

    // Scroll to the end on initial render
    scrollToEnd();

    // Handle app state changes
    const handleAppStateChange = (nextAppState: any) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground - scroll to the end
        scrollToEnd();
      }
      appStateRef.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Clean up on unmount
    return () => {
      subscription.remove();
    };
  }, [conversation]);

  // Modify the handleScroll function to keep track of the scroll position
  const handleScroll = (event: any) => {
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    const scrollY = event.nativeEvent.contentOffset.y;
    
    scrollPositionRef.current = scrollY;
    contentHeightRef.current = contentHeight;
    
    // Determine if user is close to the bottom
    const isCloseToBottom = contentHeight - scrollY - layoutHeight < 100;
    if (isCloseToBottom !== autoScrollEnabled) {
      setAutoScrollEnabled(isCloseToBottom);
    }
  };

  const toggleThought = (messageIndex: number) => {
    setConversation((prev) =>
      prev.map((msg, index) =>
        index === messageIndex ? { ...msg, showThought: !msg.showThought } : msg
      )
    );
  };

  const handleSendMessage = async () => {
    // Store current input to preserve it after setting reminder
    const currentInput = userInput;
    
    // If message has reminder intent, show reminder dialog
    if (hasReminderIntent) {
      setReminderDialogVisible(true);
      return;
    }
    
    if (!context) {
      Alert.alert('Model Not Loaded', 'Please wait for the model to load.');
      return;
    }
    if (!currentInput.trim()) {
      return;
    }

    // Ensure we have a valid chat ID before sending a message
    if (!currentChatId) {
      await createNewChat();
      if (!currentChatId) {
        Alert.alert('Error', 'Could not create a chat. Please try again.');
        return;
      }
    }

    // Add user message to conversation
    const newUserMessage: Message = { role: 'user', content: currentInput.trim() };
    const updatedConversation = [...conversation, newUserMessage];
    setConversation(updatedConversation);
    setUserInput('');
    setIsGenerating(true);
    setAutoScrollEnabled(true);

    try {
      // If this is the first user message and the chat title is "New Chat",
      // automatically rename it using the first 20 characters
      if (chatTitle === 'New Chat' && conversation.length === 1) {
        const newTitle = currentInput.trim().slice(0, 20);
        setChatTitle(newTitle);
        if (currentChatId) {
          await updateChatSession(currentChatId, {
            title: newTitle
          });
        }
      }

      // Common stop words for all model formats
      const stopWords = [
        '</s>',
        '<|end|>',
        'user:',
        'assistant:',
        '<|im_end|>',
        '<|eot_id|>',
      ];
      
      // Format with the selected persona's prompt template to ensure proper context
      const formattedMessages = formatPrompt([...updatedConversation], selectedPersonaId);

      // Add instructions to maintain context from the conversation history
      if (updatedConversation.length > 3) {
        formattedMessages.push({
          role: 'system',
          content: 'Remember the context from our earlier messages in this conversation. Your response should be coherent with the ongoing discussion.'
        });
      }

      // Append a placeholder for the assistant's response
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          thought: undefined,
          showThought: false,
        },
      ]);
      
      let currentAssistantMessage = '';
      let currentThought = '';
      let inThinkBlock = false;
      let inEmpathyChain = false;
      
      interface CompletionData {
        token: string;
      }

      interface CompletionResult {
        timings: {
          predicted_per_second: number;
        };
      }

      try {
        const result: CompletionResult = await context.completion(
          {
            messages: formattedMessages,
            n_predict: 10000,
            stop: stopWords,
            // Add parameters to improve response quality and context retention
            temperature: 0.7,  // Balanced creativity
            top_p: 0.9,       // Focus on more likely tokens
            top_k: 40,        // Consider a varied but relevant set of tokens
          },
          (data: CompletionData) => {
            const token = data.token;
            currentAssistantMessage += token;
            
            // Handle Dhi Compass specific format with empathy_chain
            if (selectedPersonaId === 'compass') {
              if (token.includes('<empathy_chain>')) {
                inEmpathyChain = true;
                currentThought = token.replace('<empathy_chain>', '');
                return; // Skip adding this to visible content
              } else if (token.includes('</empathy_chain>')) {
                inEmpathyChain = false;
                const finalThought = currentThought.replace('</empathy_chain>', '').trim();
                
                setConversation((prev) => {
                  const lastIndex = prev.length - 1;
                  const updated = [...prev];
                  updated[lastIndex] = {
                    ...updated[lastIndex],
                    thought: finalThought,
                  };
                  return updated;
                });
                
                currentThought = '';
                return; // Skip adding this to visible content
              } else if (inEmpathyChain) {
                currentThought += token;
                return; // Skip adding this to visible content
              } else if (token.includes('<assistant_response>')) {
                // Skip the tag but continue processing content inside
                return;
              } else if (token.includes('</assistant_response>')) {
                // Skip the closing tag
                return;
              }
            } else {
              // Original think block format
              if (token.includes('<think>')) {
                inThinkBlock = true;
                currentThought = token.replace('<think>', '');
                return; // Skip adding this to visible content
              } else if (token.includes('</think>')) {
                inThinkBlock = false;
                const finalThought = currentThought.replace('</think>', '').trim();

                setConversation((prev) => {
                  const lastIndex = prev.length - 1;
                  const updated = [...prev];
                  updated[lastIndex] = {
                    ...updated[lastIndex],
                    thought: finalThought,
                  };
                  return updated;
                });

                currentThought = '';
                return; // Skip adding this to visible content
              } else if (inThinkBlock) {
                currentThought += token;
                return; // Skip adding this to visible content
              }
            }

            // Only update visible content with tokens that aren't part of thought process
            if (!inEmpathyChain && !inThinkBlock) {
              setConversation((prev) => {
                const lastIndex = prev.length - 1;
                const updated = [...prev];
                
                // Build visible content from scratch instead of filtering the whole message
                if (!updated[lastIndex].content) {
                  updated[lastIndex].content = token;
                } else {
                  updated[lastIndex].content += token;
                }

                // Only clean up when we have enough content to avoid removing too much
                if (updated[lastIndex].content.length > 30) {
                  // Apply minimal cleaning to preserve most content while removing obvious artifacts
                  updated[lastIndex].content = sanitizeAssistantResponse(updated[lastIndex].content);
                }
                
                return updated;
              });
            }

            if (autoScrollEnabled && scrollViewRef.current) {
              requestAnimationFrame(() => {
                scrollViewRef.current?.scrollToEnd({ animated: false });
              });
            }
          }
        );
      } catch (error) {
        console.error('Error during completion:', error);
        Alert.alert('Error', 'Failed to generate a response. Please try again.');
      }
      
      // Save chat after completion to maintain context between sessions
      await saveChat();
      
      // After message is complete, check if it contains a reminder confirmation
      try {
        const lastMessage = updatedConversation[updatedConversation.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          const { reminderCreated, confirmationMessage } = await processAssistantMessageForReminder(
            lastMessage, 
            currentChatId || undefined
          );
          
          // If a reminder was created automatically, update the active reminder count
          if (reminderCreated) {
            const activeReminders = await getActiveReminders();
            setActiveReminderCount(activeReminders.length);
            
            // Optionally add a system message confirming the reminder was set
            if (confirmationMessage) {
              setConversation((prev) => [
                ...prev,
                {
                  role: 'system',
                  content: confirmationMessage,
                },
              ]);
            }
          }
        }
      } catch (error) {
        console.error('Error processing message for reminders:', error);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error During Inference', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper: remove leading meta‑preface like “Here’s a gentle and empathetic approach:”
  const stripMetaPreface = (text: string): string => {
    // Matches:   **Here's a gentle and empathetic approach:**   or   Here's some suggestions:
    return text.replace(
      /^(?:\*\*)?\s*Here(?:’|'|’)s?\s+(?:a|an|some|another|one|this)\b[^:]{0,100}:\s*/i,
      ''
    );
  };

  // Add a helper function to clean up the content - more focused, less aggressive cleaning
// Enhanced cleanupEmotionSections function
const cleanupEmotionSections = (content: string): string => {
  // Store the original content to compare later
  const originalContent = content;
  
  // Only remove the most obvious reasoning markers and tags
  
  // Remove prompt tags
  content = content.replace(/<\/?empathy_chain>/g, '');
  content = content.replace(/<\/?assistant_response>/g, '');
  content = content.replace(/<\/?think>/g, '');
  
  // Remove obvious section headers for reasoning
  content = content.replace(/^Emotion:.*?\n/g, '');
  content = content.replace(/^Underlying Factors(?:.*?):\s*\n/g, '');
  content = content.replace(/^Chosen Approach(?:.*?):\s*\n/g, '');
  content = content.replace(/^Therapeutic Framing(?:.*?):\s*\n/g, '');
  content = content.replace(/^Strategy(?:.*?):\s*\n/g, '');
  
  // Improve list formatting
  content = content
    // For bullet lists: ensure a blank line before "- " when it follows text
    .replace(/([^\n])\n-\s/g, '$1\n\n- ')
    // For numbered lists: ensure blank line before "1. ", "2. ", etc. when it follows text
    .replace(/([^\n])\n(\d+\.)\s/g, '$1\n\n$2 ')
    // Fix jammed lists after headers - ensure a line break after headers
    .replace(/(#{1,3}\s.+)\n([\-\*]|\d+\.)/g, '$1\n\n$2')
    // Ensure proper spacing after ordered list number
    .replace(/(\d+\.)(\S)/g, '$1 $2')
    // Ensure proper spacing after bullet points
    .replace(/(\-)(\S)/g, '$1 $2')
    // Ensure a newline before headers
    .replace(/([^\n])(\n#{1,3}\s)/g, '$1\n\n$2');
  
  // Clean up excessive newlines but preserve paragraph structure
  content = content.replace(/\n{4,}/g, '\n\n\n');
  
  // If we've removed too much, revert to original with minimal cleaning
  if (content.trim().length < 20 && originalContent.length > 50) {
    // Just remove the tags but keep the content
    let simpleCleanup = originalContent;
    simpleCleanup = simpleCleanup.replace(/<\/?empathy_chain>/g, '');
    simpleCleanup = simpleCleanup.replace(/<\/?assistant_response>/g, '');
    simpleCleanup = simpleCleanup.replace(/<\/?think>/g, '');
    
    // Apply minimal formatting improvements
    simpleCleanup = simpleCleanup
      .replace(/([^\n])\n-\s/g, '$1\n\n- ')
      .replace(/([^\n])\n(\d+\.)\s/g, '$1\n\n$2 ')
      .replace(/\n{4,}/g, '\n\n\n');
      
    return simpleCleanup.trim();
  }
  
  return content.trim();
};

  // General purpose function with minimal cleaning to preserve most content
// Improved sanitizeAssistantResponse function
const sanitizeAssistantResponse = (content: string): string => {
  // If compass persona, use specialized cleaning
  if (selectedPersonaId === 'compass') {
    return cleanupEmotionSections(content);
  }

  // For all other personas - minimal cleaning
  let cleaned = content;

  // Remove only the most obvious tags
  cleaned = cleaned.replace(/<\/?think>/g, '');
  cleaned = cleaned.replace(/<\/?empathy_chain>/g, '');
  cleaned = cleaned.replace(/<\/?assistant_response>/g, '');

  // Only remove obvious prompt leakage
  if (cleaned.includes('# Interaction/Personality Configuration Blueprint') ||
      cleaned.includes('## Core Style Identity & Expertise Profile')) {
    cleaned = cleaned.replace(/# Interaction\/Personality Configuration Blueprint[\s\S]*?(?=\n\n\n|\n\n[^#\s]|$)/g, '');
  }

  if (cleaned.includes('# Natural Conversation Framework') ||
      cleaned.includes('## Core Approach')) {
    cleaned = cleaned.replace(/# Natural Conversation Framework[\s\S]*?(?=\n\n\n|\n\n[^#\s]|$)/g, '');
  }

  // Remove any obvious reasoning marks
  cleaned = cleaned.replace(/\(reason:.*?\)/g, '');

  // Strip "Here's a … approach:" style meta lines
  cleaned = stripMetaPreface(cleaned);

  // --- Improve list formatting -------------
  // Better list formatting - ensure proper spacing before list items
  cleaned = cleaned
    // For bullet lists: ensure a blank line before "- " when it follows text
    .replace(/([^\n])\n-\s/g, '$1\n\n- ')
    // For numbered lists: ensure blank line before "1. ", "2. ", etc. when it follows text
    .replace(/([^\n])\n(\d+\.)\s/g, '$1\n\n$2 ')
    // Fix jammed lists after headers - ensure a line break after headers
    .replace(/(#{1,3}\s.+)\n([\-\*]|\d+\.)/g, '$1\n\n$2')
    // Ensure proper spacing after ordered list number
    .replace(/(\d+\.)(\S)/g, '$1 $2')
    // Ensure proper spacing after bullet points
    .replace(/(\-)(\S)/g, '$1 $2')
    // Preserve multiple consecutive line breaks for paragraphs
    .replace(/\n{4,}/g, '\n\n\n')
    // Ensure a newline before headers
    .replace(/([^\n])(\n#{1,3}\s)/g, '$1\n\n$2');

  return cleaned.trim();
};

  const stopGeneration = async () => {
    try {
      await context.stopCompletion();
      setIsGenerating(false);

      setConversation((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.role === 'assistant') {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: lastMessage.content + '\n\n*Generation stopped by user*',
            },
          ];
        }
        return prev;
      });
    } catch (error) {
      console.error('Error stopping completion:', error);
    }
  };

  // Check if the current chat has any user messages
  const hasUserMessages = () => {
    if (conversation.length <= 1) return false; // Only system message
    
    // Check if there are any user messages
    return conversation.some(msg => msg.role === 'user');
  };

  // Check if chat is empty (only has system message)
  const isChatEmpty = () => {
    return conversation.length <= 1;
  };

  const handleNewChat = async () => {
    setSidebarVisible(false);
    
    try {
      // Clean up any duplicate "New Chat" sessions first
      await cleanupDuplicateNewChats();
      
      // Save current chat if needed
      if (currentChatId && !isChatEmpty()) {
        await saveChat();
      }
      
      const existingChats = await getChatsByModel(selectedModel);
      const existingNewChat = existingChats.find(chat => chat.title === 'New Chat');
      
      if (existingNewChat) {
        // If we're already on the "New Chat" and it's empty, just reset it
        if (currentChatId === existingNewChat.id && isChatEmpty()) {
          setConversation(INITIAL_CONVERSATION);
          return;
        }
        
        // Switch to the existing "New Chat"
        await loadSpecificChat(existingNewChat.id);
        return;
      }
      
      // Delete current chat if it's empty before creating new one
      if (currentChatId && isChatEmpty()) {
        await deleteChatSession(currentChatId);
      }
      
      // Create new chat only if no "New Chat" exists
      await createNewChat();
      
    } catch (error) {
      console.error('Error in handleNewChat:', error);
      if (!currentChatId) {
        await createNewChat();
      }
    }
  };

  const clearChat = async () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear this conversation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const cleared = [...INITIAL_CONVERSATION];
            setConversation(cleared);
            
            // Save the cleared chat
            if (currentChatId) {
              await updateChatSession(currentChatId, {
                messages: cleared
              });
            }
          },
        },
      ]
    );
  };
  
  const handlePersonaChange = async (personaId: string) => {
    setSelectedPersonaId(personaId);
    
    // Update system message
    // First, find the persona from both built-in and custom personas
    try {
      const allPersonas = await getAllPersonas();
      const selectedTemplate = allPersonas.find((p: PromptTemplate) => p.id === personaId) || promptTemplates[0];
      
      if (selectedTemplate) {
        // If we have messages, update the system message
        if (conversation.length > 0 && conversation[0].role === 'system') {
          const updatedConversation = [...conversation];
          updatedConversation[0] = {
            ...updatedConversation[0],
            content: selectedTemplate.systemPrompt
          };
          setConversation(updatedConversation);
          
          // Save the updated conversation
          if (currentChatId) {
            await updateChatSession(currentChatId, {
              messages: updatedConversation,
              personaId
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating persona:', error);
    }
  };

  const handleRenameChat = () => {
    if (!currentChatId) return;
    
    const promptRename = (newTitle?: string) => {
      if (newTitle && newTitle.trim()) {
        const trimmedTitle = newTitle.trim().slice(0, 20);
        
        // Prevent renaming to "New Chat"
        if (trimmedTitle.toLowerCase() === 'new chat') {
          Alert.alert(
            'Invalid Name',
            'Cannot rename a chat to "New Chat". Please choose a different name.'
          );
          return;
        }
        
        setChatTitle(trimmedTitle);
        if (currentChatId) {
          updateChatSession(currentChatId, {
            title: trimmedTitle
          });
        }
      }
    };
    
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Rename Chat',
        'Enter a new name (max 20 characters):',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: promptRename }
        ],
        'plain-text',
        chatTitle
      );
    } else {
      setIsEditingTitle(true);
    }
  };
  
  const handleTitleSubmit = async (newTitle: string) => {
    const trimmedTitle = newTitle.trim().slice(0, 20);
    
    // Prevent renaming to "New Chat"
    if (trimmedTitle.toLowerCase() === 'new chat') {
      Alert.alert(
        'Invalid Name',
        'Cannot rename a chat to "New Chat". Please choose a different name.'
      );
      return;
    }
    
    if (trimmedTitle) {
      setChatTitle(trimmedTitle);
      if (currentChatId) {
        await updateChatSession(currentChatId, {
          title: trimmedTitle
        });
      }
    }
    setIsEditingTitle(false);
  };
  
  const handleChatSelect = async (chatId: string) => {
    // Hide sidebar first for smoother transition
    setSidebarVisible(false);
    
    try {
      // Make sure the current chat is saved before switching
      if (currentChatId && !isChatEmpty()) {
        await saveChat();
      }
      
      // Navigate to the selected chat
      navigation.setParams({ chatId });
      await loadSpecificChat(chatId);
    } catch (error) {
      console.error('Error selecting chat:', error);
      Alert.alert('Error', 'Could not load selected chat.');
    }
  };
  
  const handleToggleSidebar = () => {
    // If opening the sidebar, ensure chat is visible
    if (!sidebarVisible) {
      ensureVisibleChat();
    }
    setSidebarVisible(prev => !prev);
  };
  
  const handleBackToModelSelection = () => {
    setSidebarVisible(false);
    navigation.navigate('ModelSelection');
  };

  const [selectedPersona, setSelectedPersona] = useState<PromptTemplate>(promptTemplates[0]);

  useEffect(() => {
    const loadSelectedPersona = async () => {
      try {
        const allPersonas = await getAllPersonas();
        const persona = allPersonas.find((p: PromptTemplate) => p.id === selectedPersonaId) || promptTemplates[0];
        setSelectedPersona(persona);
      } catch (error) {
        console.error('Error loading selected persona:', error);
        // Fallback to default persona
        const defaultPersona = promptTemplates.find(p => p.id === selectedPersonaId) || promptTemplates[0];
        setSelectedPersona(defaultPersona);
      }
    };
    
    loadSelectedPersona();
  }, [selectedPersonaId]);

  // Update the ButtonWithAnimation component to support icons
  const ButtonWithAnimation = ({ 
    onPress, 
    style, 
    textStyle, 
    children, 
    isStop = false,
    isIcon = false
  }: {
    onPress: () => void;
    style?: any;
    textStyle?: any;
    children: React.ReactNode;
    isStop?: boolean;
    isIcon?: boolean;
  }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(animatedValue, {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    };

    const animatedStyle = {
      transform: [
        {
          scale: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.95],
          }),
        },
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 3],
          }),
        },
      ],
      shadowOpacity: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0.1],
      }),
    };

    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[
          styles.buttonBase,
          isStop ? styles.stopButton : styles.sendButton, 
          style, 
          animatedStyle
        ]}>
          {isIcon ? (
            children
          ) : (
            <Text style={[styles.sendButtonText, textStyle]}>{children}</Text>
          )}
        </Animated.View>
      </Pressable>
    );
  };

  const handleContentSizeChange = (event: { nativeEvent: { contentSize: { height: number } } }) => {
    const height = Math.min(100, Math.max(45, event.nativeEvent.contentSize.height));
    setInputHeight(height);
  };

  // Ensure that there's always at least one visible chat
  const ensureVisibleChat = async () => {
    try {
      // Check if we have a current chat ID
      if (!currentChatId) {
        console.log('No current chat ID, creating new chat');
        await createNewChat();
        return;
      }
      
      // Check if the current chat exists in storage
      const chatExists = await loadChatSession(currentChatId);
      if (!chatExists) {
        console.log('Current chat not found in storage, creating new chat');
        await createNewChat();
      }
    } catch (error) {
      console.error('Error ensuring visible chat:', error);
      await createNewChat();
    }
  };

  // Helper function to get the image source based on the icon path
  const getImageSource = (iconPath: string | undefined) => {
    if (!iconPath) return require('../../assets/understand.png');
    
    // Map icon paths to require statements
    const iconMap: {[key: string]: any} = {
      'understand.png': require('../../assets/understand.png'),
      'analyse.png': require('../../assets/analyse.png'),
      'write.png': require('../../assets/write.png'),
      'modelselection.png': require('../../assets/modelselection.png'),
      'justtalkorvent.png': require('../../assets/justtalkorvent.png'),
      'ideas.png': require('../../assets/ideas.png'),
      'custom2.png': require('../../assets/custom2.png'),
      'custom3.png': require('../../assets/custom3.png'),
      'custom5.png': require('../../assets/custom5.png'),
      'custom6.png': require('../../assets/custom6.png'),
      'custom7.png': require('../../assets/custom7.png'),
      'custom8.png': require('../../assets/custom8.png'),
      'custom9.png': require('../../assets/custom9.png'),
      'custom10.png': require('../../assets/custom10.png'),
      'custom11.png': require('../../assets/custom11.png'),
    };
    
    return iconMap[iconPath] || require('../../assets/understand.png');
  };

  const handleNavigateToChat = (id: string) => {
    navigation.navigate('Chat', { selectedModel, chatId: id });
  };
  
  // Modify reminder dialog handling to not clear intent on close
  const handleReminderDialogClose = () => {
    setReminderDialogVisible(false);
    // Don't clear reminder intent here - this allows the same message
    // to trigger the dialog again if the user clicks send
  };

  // Update the reminder set function to include the user's message
  const handleReminderSet = async (
    reminderTime: Date, 
    reminderText: string,
    options?: {
      recurrence?: Reminder['recurrence'],
      todoItems?: { id: string; text: string; isCompleted: boolean }[]
    }
  ) => {
    // Clear the reminder intent now that we've processed it
    clearReminderIntent();
    
    // Reset user input
    setUserInput('');
    
    // Update the active reminder count
    const activeReminders = await getActiveReminders();
    setActiveReminderCount(activeReminders.length);
    
    // Add the user's original message to the conversation first
    const userMessage: Message = { 
      role: 'user', 
      content: reminderText,
    };
    
    // Create confirmation message
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
    
    let confirmationMessage = `I've set a reminder for "${reminderText}" on ${dateFormatted} at ${timeFormatted}.`;
    
    // Add recurring details if available
    if (options?.recurrence) {
      let recurrenceText = '';
      switch (options.recurrence.type) {
        case 'daily':
          recurrenceText = options.recurrence.interval && options.recurrence.interval > 1 
            ? `every ${options.recurrence.interval} days` 
            : 'daily';
          break;
        case 'weekly':
          if (options.recurrence.daysOfWeek && options.recurrence.daysOfWeek.length > 0) {
            const dayNames = options.recurrence.daysOfWeek
              .sort()
              .map((day: number) => {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return days[day];
              })
              .join(', ');
            recurrenceText = `weekly on ${dayNames}`;
          } else {
            recurrenceText = options.recurrence.interval && options.recurrence.interval > 1 
              ? `every ${options.recurrence.interval} weeks` 
              : 'weekly';
          }
          break;
        case 'monthly':
          if (options.recurrence.dayOfMonth) {
            recurrenceText = `monthly on day ${options.recurrence.dayOfMonth}`;
          } else {
            recurrenceText = 'monthly';
          }
          break;
        case 'custom':
          recurrenceText = options.recurrence.interval 
            ? `every ${options.recurrence.interval} days` 
            : 'on a custom schedule';
          break;
      }
      
      confirmationMessage += ` This reminder will repeat ${recurrenceText}.`;
    }
    
    // Add to-do list details if available
    if (options?.todoItems && options.todoItems.length > 0) {
      confirmationMessage += ` I've added ${options.todoItems.length} items to your to-do list:`;
      
      // List the first 3 items
      const itemsToShow = options.todoItems.slice(0, 3);
      itemsToShow.forEach(item => {
        confirmationMessage += `\n- ${item.text}`;
      });
      
      // If there are more items, add a note
      if (options.todoItems.length > 3) {
        confirmationMessage += `\n- ...and ${options.todoItems.length - 3} more`;
      }
    }
    
    // Add both user message and system confirmation
    setConversation((prev) => [
      ...prev,
      userMessage, // Add the user message first
      {
        role: 'system',
        content: confirmationMessage,
      },
    ]);
    
    // Save the updated conversation
    await saveChat();
  };
  
  const handleShowReminders = () => {
    navigation.navigate('Reminders' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
>
        {/* Chat Sidebar */}
        <ChatSidebar 
          isVisible={sidebarVisible}
          selectedModel={selectedModel}
          currentChatId={currentChatId}
          onClose={() => setSidebarVisible(false)}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          onBackToModelSelection={handleBackToModelSelection}
        />
        
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={handleToggleSidebar}
            >
              <View style={styles.menuButtonIcon}>
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <TouchableOpacity 
              style={styles.personaButton}
              onPress={() => setPersonaSelectorVisible(true)}
            >
              <View style={styles.personaIconContainer}>
                <Image 
                  source={getImageSource(selectedPersona.iconPath)}
                  style={styles.personaIcon}
                />
              </View>
              <Text style={styles.personaButtonText}>
                {selectedPersona.name}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            <ReminderButton
              onPress={handleShowReminders}
              count={activeReminderCount}
            />
            <View style={styles.headerButtonSpacer} />
            <ButtonWithAnimation
              onPress={clearChat}
              style={styles.clearChatButton}
              textStyle={{}}
              isIcon={true}
            >
              <View style={styles.iconContainer}>
                <View style={styles.chatIconOutline}>
                  <View style={styles.chatIconInner}>
                    <View style={styles.chatIconLine} />
                  </View>
                </View>
              </View>
            </ButtonWithAnimation>
          </View>
        </View>
        
        <ScrollView
  style={styles.scrollView}       
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.chatWrapper}>
            <View style={styles.chatContainer}>
              <View style={styles.welcomeContainer}>
                <Image 
                  source={getImageSource(selectedPersona.iconPath)}
                  style={styles.welcomeIcon}
                />
                <Text style={styles.greetingText}>
                  Welcome! {selectedPersona.name} is ready to help. Ask away! 🎉
                </Text>
              </View>
              {conversation.slice(1).map((msg, index) => (
                <View key={index} style={styles.messageWrapper}>
                  {msg.role === 'user' ? (
                    <View
                      style={[
                        styles.messageBubble,
                        styles.userBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          styles.userMessageText,
                        ]}
                      >
                        <Markdown style={markdownStyles}>{msg.content}</Markdown>
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.assistantMessageContainer}>
                      <View style={styles.assistantHeader}>
                        <Image 
                          source={getImageSource(selectedPersona.iconPath)}
                          style={styles.assistantIcon}
                        />
                      </View>
                      <Text style={styles.assistantMessageText}>
                        <Markdown style={markdownStyles}>{msg.content}</Markdown>
                      </Text>
                      {msg.thought && (
                        <TouchableOpacity
                          onPress={() => toggleThought(index + 1)}
                          style={styles.toggleButton}
                        >
                          <Text style={styles.toggleText}>
                            {msg.showThought
                              ? '▼ Hide Thought'
                              : '▶ Show Thought'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {msg.showThought && msg.thought && (
                        <View style={styles.thoughtContainer}>
                          <Text style={styles.thoughtTitle}>
                            Model's Reasoning:
                          </Text>
                          <Text style={styles.thoughtText}>
                            {msg.thought}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
              
              {!context && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading model...</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
        
        {/* New input container that stays above keyboard */}
        <View style={[
          styles.inputContainer,
          // Apply different styles based on keyboard visibility
          keyboardVisible && styles.inputContainerWithKeyboard,
          // Add bottom padding when keyboard is visible on iOS
          keyboardVisible && Platform.OS === 'ios' && { paddingBottom: keyboardHeight > 0 ? 10 : 10 }
        ]}>
          <TextInput
            style={[
              styles.input,
              {
                height: inputHeight,
                minHeight: 40,
                maxHeight: keyboardVisible ? 80 : 100
              }
            ]}
            placeholder="Type your message..."
            value={userInput}
            onChangeText={setUserInput}
            multiline
            scrollEnabled={true}
            onContentSizeChange={handleContentSizeChange}
            returnKeyType="default"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isGenerating}
            placeholderTextColor="#999"
            textAlignVertical="top"
            numberOfLines={3}
            keyboardType="default"
            autoFocus={false}
            blurOnSubmit={false}
            onFocus={() => setAutoScrollEnabled(true)}
          />
          
          {isGenerating ? (
            <ButtonWithAnimation
              onPress={stopGeneration}
              isStop={true}
              style={styles.stopButton}
              textStyle={{}}
            >
              Stop
            </ButtonWithAnimation>
          ) : (
            <ButtonWithAnimation
              onPress={handleSendMessage}
              style={[
                styles.sendButton,
                (!userInput.trim() || !context) && styles.sendButtonDisabled
              ]}
              textStyle={{}}
            >
              Send
            </ButtonWithAnimation>
          )}
        </View>
      </KeyboardAvoidingView>
      
      <PersonaSelector
        visible={personaSelectorVisible}
        onClose={() => setPersonaSelectorVisible(false)}
        selectedPersonaId={selectedPersonaId}
        onSelectPersona={handlePersonaChange}
      />
      
      {/* Reminder Dialog */}
      <ReminderDialog
        visible={reminderDialogVisible}
        onClose={handleReminderDialogClose}
        reminderText={reminderMessage}
        chatId={currentChatId || undefined}
        onReminderSet={handleReminderSet}
      />
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: Math.min(16, width * 0.04),
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    height: Platform.OS === 'ios' ? 50 : 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.2,
  },
  headerCenter: {
    flex: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 0.2,
  },
  menuButton: {
    width: Math.min(40, width * 0.1),
    height: Math.min(40, width * 0.1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonIcon: {
    width: Math.min(24, width * 0.06),
    height: Math.min(18, width * 0.045),
    justifyContent: 'space-between',
  },
  menuLine: {
    width: Math.min(24, width * 0.06),
    height: 2,
    backgroundColor: COLORS.text,
    borderRadius: 1,
  },
  personaButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(225, 79, 41, 0.05)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaButtonText: {
    fontSize: Math.min(14, width * 0.035),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  clearChatButton: {
    backgroundColor: '#F5A623',
    width: Math.min(36, width * 0.09),
    height: Math.min(36, width * 0.09),
    shadowOpacity: 0.25,
    borderBottomWidth: 2,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
    borderRightColor: 'rgba(0, 0, 0, 0.2)',
  },
  iconContainer: {
    width: Math.min(20, width * 0.05),
    height: Math.min(20, width * 0.05),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatIconOutline: {
    width: 18,
    height: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chatIconInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatIconLine: {
    width: 8,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  scrollView: {
    flex: 1,
    // Remove the fixed marginBottom - we'll manage this dynamically
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  chatWrapper: {
    flex: 1,
    padding: Math.min(12, width * 0.03),
  },
  chatContainer: {
    flex: 1,
    padding: Math.min(12, width * 0.03),
    marginBottom: 8,
  },
  greetingText: {
    fontSize: Math.min(15, width * 0.038),
    fontWeight: '500',
    textAlign: 'center',
    color: COLORS.lightText,
    fontFamily: FONTS.primary,
    lineHeight: Math.min(22, width * 0.055),
  },
  messageWrapper: {
    marginBottom: Math.min(16, width * 0.04),
  },
  messageBubble: {
    padding: Math.max(8, width * 0.02),
    borderRadius: 16,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.userBubble,
  },
  messageText: {
    fontSize: Math.min(15, width * 0.04),
    color: COLORS.text,
    lineHeight: Math.min(22, width * 0.055),
    fontFamily: FONTS.primary,
  },
  userMessageText: {
    color: COLORS.text,
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
    maxWidth: width > 500 ? '80%' : '90%',
    marginBottom: 8,
  },
  assistantMessageText: {
    fontSize: Math.min(16, width * 0.042),
    color: COLORS.text,
    lineHeight: Math.min(24, width * 0.06),
    marginBottom: 6,
    fontFamily: FONTS.primary,
  },
  thoughtContainer: {
    marginTop: 6,
    padding: 8,
    backgroundColor: 'rgba(225, 79, 41, 0.05)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  thoughtTitle: {
    color: COLORS.lightText,
    fontSize: Math.min(12, width * 0.03),
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: FONTS.secondary,
  },
  thoughtText: {
    color: COLORS.lightText,
    fontSize: Math.min(12, width * 0.03),
    fontStyle: 'italic',
    lineHeight: Math.min(16, width * 0.04),
    fontFamily: FONTS.secondary,
  },
  toggleButton: {
    marginTop: 6,
    paddingVertical: 3,
  },
  toggleText: {
    color: COLORS.primary,
    fontSize: Math.min(12, width * 0.03),
    fontWeight: '500',
    fontFamily: FONTS.secondary,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.lightText,
    fontFamily: FONTS.primary,
  },
  // Updated InputContainer styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Math.min(12, width * 0.03),
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingTop: 8,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    zIndex: 10, // Ensure it's above the scrollview
  },
  // Add style for when keyboard is visible
  inputContainerWithKeyboard: {
    backgroundColor: COLORS.background,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 8, // Less padding when keyboard is visible
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: 80,
    minHeight: 40,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 14,
    fontSize: Math.min(15, width * 0.038),
    color: COLORS.text,
    marginRight: 8,
    fontFamily: FONTS.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: Math.min(60, width * 0.15),
    height: Math.min(40, width * 0.1),
    shadowOpacity: 0.25,
    borderBottomWidth: 2,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
    borderRightColor: 'rgba(0, 0, 0, 0.2)',
    alignSelf: 'flex-end',
    marginBottom: 0,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    width: Math.min(60, width * 0.15),
    height: Math.min(40, width * 0.1),
    shadowOpacity: 0.3,
    shadowColor: '#FF3B30',
    borderBottomWidth: 2,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
    borderRightColor: 'rgba(0, 0, 0, 0.2)',
    alignSelf: 'flex-end',
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.primary,
    opacity: 0.7,
    shadowOpacity: 0.2,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: Math.min(15, width * 0.038),
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: FONTS.primary,
  },
  buttonBase: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
    elevation: 4,
  },
  personaIconContainer: {
    width: Math.min(20, width * 0.05),
    height: Math.min(20, width * 0.05),
    marginRight: 6,
    borderRadius: Math.min(10, width * 0.025),
    overflow: 'hidden',
  },
  personaIcon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  welcomeContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    paddingHorizontal: width * 0.05,
    width: '100%',
  },
  welcomeIcon: {
    width: Math.min(28, width * 0.07),
    height: Math.min(28, width * 0.07),
    marginBottom: 10,
    resizeMode: 'contain',
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  assistantIcon: {
    width: Math.min(20, width * 0.05),
    height: Math.min(20, width * 0.05),
    marginRight: 6,
    borderRadius: Math.min(10, width * 0.025),
    resizeMode: 'contain',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButtonSpacer: {
    width: Math.min(16, width * 0.04),
  },
});

export default ChatScreen;