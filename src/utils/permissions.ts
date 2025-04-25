import { PermissionsAndroid, Platform } from 'react-native';
import {
  checkMultiple,
  requestMultiple,
  PERMISSIONS,
  RESULTS
} from 'react-native-permissions';

export const ensureVoicePermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      // Request microphone permission for Android
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'EdgeLLM needs access to your microphone for voice recording.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else if (Platform.OS === 'ios') {
      // Request speech recognition and microphone permissions for iOS
      const permissions = [PERMISSIONS.IOS.SPEECH_RECOGNITION, PERMISSIONS.IOS.MICROPHONE];
      const statuses = await checkMultiple(permissions);
      
      // Check if any permissions are denied
      const denied = permissions.filter(p => statuses[p] !== RESULTS.GRANTED);
      
      if (denied.length > 0) {
        const results = await requestMultiple(denied);
        return denied.every(p => results[p] === RESULTS.GRANTED);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking/requesting permissions:', error);
    return false;
  }
}; 