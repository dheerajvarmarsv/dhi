import RNFS from 'react-native-fs';
import { Message, ChatSession } from '../types';

// Constants
const CHAT_DIRECTORY = `${RNFS.DocumentDirectoryPath}/chats`;
const CHAT_INDEX_PATH = `${CHAT_DIRECTORY}/chat_index.json`;

// Chat session interface that matches the actual implementation
interface StoredChatSession {
  id: string;
  modelId: string; // Using modelId instead of model
  title: string;
  lastMessage: string;
  timestamp: number;
  messages: Message[];
  personaId: string;
}

// Interface for the chat index
interface ChatIndex {
  chats: Array<Omit<StoredChatSession, 'messages'>>;
  lastUpdated: number;
}

// Initialize storage directory with robust error handling
const initStorage = async (): Promise<boolean> => {
  try {
    console.log('Initializing chat storage directories...');
    
    // Create the parent directory first if it doesn't exist
    const dirExists = await RNFS.exists(CHAT_DIRECTORY);
    if (!dirExists) {
      console.log('Creating chat directory...');
      await RNFS.mkdir(CHAT_DIRECTORY);
    }
    
    // Create the index file if it doesn't exist
    const indexExists = await RNFS.exists(CHAT_INDEX_PATH);
    if (!indexExists) {
      console.log('Creating chat index file...');
      await RNFS.writeFile(CHAT_INDEX_PATH, JSON.stringify({
        chats: [],
        lastUpdated: Date.now()
      }), 'utf8');
    } else {
      // Verify the index file is valid JSON
      try {
        const data = await RNFS.readFile(CHAT_INDEX_PATH, 'utf8');
        JSON.parse(data);
      } catch (parseError) {
        console.error('Chat index file corrupted, recreating...', parseError);
        
        // Try to recover by backing up and recreating
        const backupPath = `${CHAT_INDEX_PATH}.backup.${Date.now()}`;
        await RNFS.copyFile(CHAT_INDEX_PATH, backupPath);
        
        // Create a new valid index
        await RNFS.writeFile(CHAT_INDEX_PATH, JSON.stringify({
          chats: [],
          lastUpdated: Date.now()
        }), 'utf8');
      }
    }
    
    // Verify we can access chat directory and files
    const directoryItems = await RNFS.readDir(CHAT_DIRECTORY);
    console.log(`Chat directory contains ${directoryItems.length} items`);
    
    return true;
  } catch (error) {
    console.error('Error initializing chat storage:', error);
    
    // Additional recovery attempt
    try {
      console.log('Attempting to recover chat storage...');
      // Make sure the document directory exists
      const docDirExists = await RNFS.exists(RNFS.DocumentDirectoryPath);
      if (!docDirExists) {
        await RNFS.mkdir(RNFS.DocumentDirectoryPath);
      }
      
      // Recreate the chat directory
      await RNFS.mkdir(CHAT_DIRECTORY);
      
      // Create a new empty index
      await RNFS.writeFile(CHAT_INDEX_PATH, JSON.stringify({
        chats: [],
        lastUpdated: Date.now()
      }), 'utf8');
      
      console.log('Chat storage recovery successful');
      return true;
    } catch (recoveryError) {
      console.error('Chat storage recovery failed:', recoveryError);
      return false;
    }
  }
};

// Get path for a specific chat
const getChatPath = (chatId: string) => {
  return `${CHAT_DIRECTORY}/chat_${chatId}.json`;
};

// Generate a unique chat ID
const generateChatId = () => {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Create a new chat session
export const createChatSession = async (
  modelId: string,
  title: string = 'New Chat',
  initialMessages: Message[] = [],
  personaId: string = 'general'
): Promise<StoredChatSession | null> => {
  try {
    await initStorage();
    
    const chatId = generateChatId();
    const timestamp = Date.now();
    
    // Create new chat session
    const newChat: StoredChatSession = {
      id: chatId,
      modelId,
      title,
      lastMessage: initialMessages.length > 0 ? 
        initialMessages[initialMessages.length - 1].content.substring(0, 30) + '...' :
        'Start a new conversation',
      timestamp,
      messages: initialMessages,
      personaId,
    };
    
    // Save the chat
    await RNFS.writeFile(
      getChatPath(chatId),
      JSON.stringify(newChat),
      'utf8'
    );
    
    // Update index
    const indexData = await getChatsIndex();
    indexData.chats.push({
      id: chatId,
      modelId,
      title,
      lastMessage: newChat.lastMessage,
      timestamp,
      personaId,
    });
    indexData.lastUpdated = timestamp;
    
    await RNFS.writeFile(
      CHAT_INDEX_PATH,
      JSON.stringify(indexData),
      'utf8'
    );
    
    return newChat;
  } catch (error) {
    console.error('Error creating chat session:', error);
    return null;
  }
};

// Get chat index (list of all chats)
export const getChatsIndex = async (): Promise<ChatIndex> => {
  try {
    await initStorage();
    
    const data = await RNFS.readFile(CHAT_INDEX_PATH, 'utf8');
    try {
      return JSON.parse(data);
    } catch (parseError) {
      console.error('Error parsing chat index, recreating:', parseError);
      const emptyIndex = { chats: [], lastUpdated: Date.now() };
      await RNFS.writeFile(CHAT_INDEX_PATH, JSON.stringify(emptyIndex), 'utf8');
      return emptyIndex;
    }
  } catch (error) {
    console.error('Error getting chats index:', error);
    return { chats: [], lastUpdated: Date.now() };
  }
};

// Helper function to get a preview of the chat content
const getMessagePreview = (messages: Message[]): string => {
  if (!messages || messages.length <= 1) {
    return '';  // Return empty string for empty chats, UI will show fallback
  }
  
  // Skip system messages and look for the last user or assistant message
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'user' || message.role === 'assistant') {
      if (message.content && message.content.trim()) {
        // Get the first portion of meaningful text
        const content = message.content.trim()
          .replace(/\n/g, ' ')  // Replace newlines with spaces
          .replace(/\s+/g, ' ') // Replace multiple spaces with one
          .replace(/[*#_~`>]/g, ''); // Remove markdown characters
        
        // For user messages, prefix with "You: "
        const prefix = message.role === 'user' ? 'You: ' : '';
        const maxLength = message.role === 'user' ? 32 : 35;
        
        return prefix + (content.length > maxLength ? 
          content.substring(0, maxLength) + '...' : 
          content);
      }
    }
  }
  
  return '';  // No valid message found
};

// Get all chats for a specific model
export const getChatsByModel = async (modelId: string): Promise<any[]> => {
  try {
    await initStorage();
    
    // Get the index data
    const indexData = await getChatsIndex();
    const modelChats = indexData.chats
      .filter(chat => chat.modelId === modelId)
      .map(async (chatInfo) => {
        try {
          // Load the full chat to get messages for preview
          const fullChat = await loadChatSession(chatInfo.id);
          
          return {
            id: chatInfo.id,
            title: chatInfo.title,
            // Use the helper function for better previews if we have messages
            lastMessage: fullChat && fullChat.messages ? 
              getMessagePreview(fullChat.messages) : 
              chatInfo.lastMessage,
            timestamp: chatInfo.timestamp
          };
        } catch (error) {
          console.error(`Error loading chat ${chatInfo.id} for preview:`, error);
          // Return the chat info from the index without trying to load messages
          return {
            id: chatInfo.id,
            title: chatInfo.title,
            lastMessage: chatInfo.lastMessage,
            timestamp: chatInfo.timestamp
          };
        }
      });
    
    // Wait for all chat previews to be generated
    const results = await Promise.all(modelChats);
    
    // Sort by timestamp, newest first
    return results.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error getting chats by model:', error);
    return [];
  }
};

// Load a specific chat session with verification and repair capability
export const loadChatSession = async (chatId: string): Promise<StoredChatSession | null> => {
  try {
    await initStorage();
    
    const chatPath = getChatPath(chatId);
    const exists = await RNFS.exists(chatPath);
    
    if (!exists) {
      console.log(`Chat file not found: ${chatPath}`);
      return null;
    }
    
    // Read the file with error handling
    try {
      const data = await RNFS.readFile(chatPath, 'utf8');
      const chat = JSON.parse(data);
      
      // Verify the chat has required fields
      if (!chat.id || !chat.modelId || !Array.isArray(chat.messages)) {
        throw new Error('Chat data is missing required fields');
      }
      
      return chat;
    } catch (parseError) {
      console.error(`Error parsing chat file ${chatId}:`, parseError);
      
      // Try to recover the file from a backup if one exists
      try {
        const backupPath = `${getChatPath(chatId)}.backup`;
        const backupExists = await RNFS.exists(backupPath);
        
        if (backupExists) {
          console.log(`Attempting to recover chat ${chatId} from backup`);
          const backupData = await RNFS.readFile(backupPath, 'utf8');
          const recoveredChat = JSON.parse(backupData);
          
          // Save the recovered chat
          await RNFS.writeFile(chatPath, backupData, 'utf8');
          
          return recoveredChat;
        }
      } catch (backupError) {
        console.error(`Backup recovery failed for chat ${chatId}:`, backupError);
      }
      
      return null;
    }
  } catch (error) {
    console.error('Error loading chat session:', error);
    return null;
  }
};

// Update a chat session (save messages and update metadata)
export const updateChatSession = async (
  chatId: string,
  updates: {
    messages?: Message[];
    title?: string;
    personaId?: string;
  }
): Promise<boolean> => {
  try {
    const chatPath = getChatPath(chatId);
    const exists = await RNFS.exists(chatPath);
    
    if (!exists) {
      console.error(`Cannot update non-existent chat: ${chatId}`);
      return false;
    }
    
    // Backup the current chat before updating
    try {
      const backupPath = `${chatPath}.backup`;
      await RNFS.copyFile(chatPath, backupPath);
    } catch (backupError) {
      console.warn(`Failed to create backup for chat ${chatId}:`, backupError);
      // Continue with the update even if backup fails
    }
    
    // Get current chat data
    const data = await RNFS.readFile(chatPath, 'utf8');
    const chatData: StoredChatSession = JSON.parse(data);
    
    // Apply updates
    const updatedChat: StoredChatSession = {
      ...chatData,
      ...(updates.title && { title: updates.title }),
      ...(updates.personaId && { personaId: updates.personaId }),
      timestamp: Date.now()
    };
    
    // Update messages if provided
    if (updates.messages) {
      updatedChat.messages = updates.messages;
      
      // Update lastMessage preview using our helper
      updatedChat.lastMessage = getMessagePreview(updates.messages) || 'New conversation';
    }
    
    // Save updated chat
    await RNFS.writeFile(
      chatPath,
      JSON.stringify(updatedChat),
      'utf8'
    );
    
    // Update index
    const indexData = await getChatsIndex();
    const chatIndex = indexData.chats.findIndex(c => c.id === chatId);
    
    if (chatIndex !== -1) {
      indexData.chats[chatIndex] = {
        id: chatId,
        modelId: updatedChat.modelId,
        title: updatedChat.title,
        lastMessage: updatedChat.lastMessage,
        timestamp: updatedChat.timestamp,
        personaId: updatedChat.personaId,
      };
      
      indexData.lastUpdated = Date.now();
      
      await RNFS.writeFile(
        CHAT_INDEX_PATH,
        JSON.stringify(indexData),
        'utf8'
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error updating chat session:', error);
    
    // Try to recover by using the backup if available
    try {
      const chatPath = getChatPath(chatId);
      const backupPath = `${chatPath}.backup`;
      const backupExists = await RNFS.exists(backupPath);
      
      if (backupExists) {
        console.log(`Attempting to restore chat ${chatId} from backup after update failure`);
        await RNFS.copyFile(backupPath, chatPath);
      }
    } catch (recoveryError) {
      console.error(`Failed to recover chat ${chatId} after update error:`, recoveryError);
    }
    
    return false;
  }
};

// Delete a chat session
export const deleteChatSession = async (chatId: string): Promise<boolean> => {
  try {
    const chatPath = getChatPath(chatId);
    const exists = await RNFS.exists(chatPath);
    
    if (exists) {
      // Create a backup before deletion (in case of accidental deletion)
      try {
        const backupPath = `${chatPath}.deleted`;
        await RNFS.copyFile(chatPath, backupPath);
      } catch (backupError) {
        console.warn(`Failed to create backup before deletion for chat ${chatId}:`, backupError);
        // Continue with deletion even if backup fails
      }
      
      await RNFS.unlink(chatPath);
    }
    
    // Update index
    const indexData = await getChatsIndex();
    indexData.chats = indexData.chats.filter(c => c.id !== chatId);
    indexData.lastUpdated = Date.now();
    
    await RNFS.writeFile(
      CHAT_INDEX_PATH,
      JSON.stringify(indexData),
      'utf8'
    );
    
    return true;
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return false;
  }
};

// For backward compatibility with older code
export const saveChatHistory = async (
  modelId: string, 
  conversation: Message[],
  personaId: string
): Promise<boolean> => {
  try {
    // Check if there's an existing "default" chat for this model
    const modelChats = await getChatsByModel(modelId);
    if (modelChats.length > 0) {
      // Update the first chat
      await updateChatSession(modelChats[0].id, {
        messages: conversation,
        personaId
      });
      return true;
    } else {
      // Create a new chat
      const title = "Default Chat";
      await createChatSession(modelId, title, conversation, personaId);
      return true;
    }
  } catch (error) {
    console.error('Error saving chat history:', error);
    return false;
  }
};

export const loadChatHistory = async (modelId: string): Promise<{
  messages: Message[];
  personaId: string;
} | null> => {
  try {
    // Check if there are any chats for this model
    const modelChats = await getChatsByModel(modelId);
    if (modelChats.length > 0) {
      // Load the first chat
      const chatSession = await loadChatSession(modelChats[0].id);
      if (chatSession) {
        return {
          messages: chatSession.messages,
          personaId: chatSession.personaId || 'general'
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading chat history:', error);
    return null;
  }
};

export const clearChatHistory = async (modelId: string): Promise<boolean> => {
  try {
    // Delete all chats for this model
    const modelChats = await getChatsByModel(modelId);
    for (const chat of modelChats) {
      await deleteChatSession(chat.id);
    }
    return true;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }
}; 