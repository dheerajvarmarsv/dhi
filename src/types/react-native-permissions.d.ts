declare module 'react-native-permissions' {
  export const PERMISSIONS: {
    ANDROID: {
      RECORD_AUDIO: string;
    };
    IOS: {
      MICROPHONE: string;
      SPEECH_RECOGNITION: string;
    };
  };

  export const RESULTS: {
    UNAVAILABLE: 'unavailable';
    DENIED: 'denied';
    GRANTED: 'granted';
    BLOCKED: 'blocked';
    LIMITED: 'limited';
  };

  export function checkMultiple(permissions: string[]): Promise<Record<string, string>>;
  export function requestMultiple(permissions: string[]): Promise<Record<string, string>>;
  export function openSettings(): Promise<void>;
} 