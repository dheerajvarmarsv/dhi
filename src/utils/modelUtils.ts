import RNFS from 'react-native-fs';

// Fixed model details
export const MODEL_FILENAME = 'Dolphin3.0-Llama3.2-3B-Q4_K_M.gguf';
export const MODEL_REPO = 'bartowski/Dolphin3.0-Llama3.2-3B-GGUF';

export const isModelDownloaded = async (): Promise<boolean> => {
  try {
    const destPath = `${RNFS.DocumentDirectoryPath}/${MODEL_FILENAME}`;
    const fileExists = await RNFS.exists(destPath);
    
    if (fileExists) {
      const stats = await RNFS.stat(destPath);
      // Check if file size is reasonable (more than 100MB)
      if (stats.size > 100 * 1024 * 1024) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking model status:', error);
    return false;
  }
}; 