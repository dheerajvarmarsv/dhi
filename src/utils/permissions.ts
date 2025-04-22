import { Platform, Alert } from 'react-native';
import {
  checkMultiple,
  requestMultiple,
  PERMISSIONS,
  RESULTS,
  openSettings
} from 'react-native-permissions';

export async function ensureVoicePermissions() {
  const perms = Platform.select({
    ios: [PERMISSIONS.IOS.MICROPHONE, PERMISSIONS.IOS.SPEECH_RECOGNITION],
    android: [PERMISSIONS.ANDROID.RECORD_AUDIO]
  })!;

  // Check existing permissions
  const statuses = await checkMultiple(perms);

  // Filter permissions that haven't been granted yet
  const need = perms.filter(p => statuses[p] !== RESULTS.GRANTED);
  if (need.length) {
    const res = await requestMultiple(need);
    const denied = need.filter(p => res[p] !== RESULTS.GRANTED);

    // If any permissions are still denied, prompt to open settings
    if (denied.length) {
      Alert.alert(
        'Voice chat needs your mic',
        Platform.select({
          ios: 'Open Settings and enable microphone & speech recognition.',
          android: 'Open Settings and enable microphone access.'
        }),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openSettings }
        ]
      );
      return false;
    }
  }
  return true;
} 