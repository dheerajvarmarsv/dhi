import RNFS from 'react-native-fs';
import { Message } from '../types';

const getStoragePath = (modelId: string) => {
  return `${RNFS.DocumentDirectoryPath}/chat_${modelId.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
};

export const saveChatHistory = async (
  modelId: string, 
  conversation: Message[],
  personaId: string
) => {
  try {
    const filePath = getStoragePath(modelId);
    const data = JSON.stringify({
      modelId,
      personaId,
      messages: conversation,
      timestamp: Date.now()
    });
    
    await RNFS.writeFile(filePath, data, 'utf8');
    return true;
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
    const filePath = getStoragePath(modelId);
    const exists = await RNFS.exists(filePath);
    
    if (!exists) {
      return null;
    }
    
    const data = await RNFS.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    return {
      messages: parsed.messages || [],
      personaId: parsed.personaId || 'general'
    };
  } catch (error) {
    console.error('Error loading chat history:', error);
    return null;
  }
};

export const clearChatHistory = async (modelId: string): Promise<boolean> => {
  try {
    const filePath = getStoragePath(modelId);
    const exists = await RNFS.exists(filePath);
    
    if (exists) {
      await RNFS.unlink(filePath);
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }
}; 