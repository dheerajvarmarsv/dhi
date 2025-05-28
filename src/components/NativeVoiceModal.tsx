import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, PermissionsAndroid } from 'react-native';
import Voice from '@react-native-community/voice';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Using MaterialCommunityIcons
import { COLORS, FONTS } from '../constants/theme'; // Assuming theme constants are here
import NativeAudioVisualizer from './NativeAudioVisualizer'; // Import the visualizer

interface NativeVoiceModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSpeechTranscribed: (text: string) => void;
  onVoiceRecordingStart: () => void; // New prop
  // onVolumeChanged is removed as visualizer is now internal
}

const { width, height } = Dimensions.get('window');

const NativeVoiceModal: React.FC<NativeVoiceModalProps> = ({
  isVisible,
  onClose,
  onSpeechTranscribed,
  onVoiceRecordingStart, // New prop
  // onVolumeChanged, // Removed
}) => {
  const [isListening, setIsListening] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('Press mic to start');
  const [transcribedText, setTranscribedText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [currentVolume, setCurrentVolume] = useState(0); // State for volume

  useEffect(() => {
    Voice.onSpeechStart = onSpeechStartHandler;
    Voice.onSpeechEnd = onSpeechEndHandler;
    Voice.onSpeechResults = onSpeechResultsHandler;
    Voice.onSpeechError = onSpeechErrorHandler;
    Voice.onSpeechVolumeChanged = onSpeechVolumeChangedHandler; // For visualizer

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechStartHandler = (e: any) => {
    console.log('onSpeechStart:', e);
    setCurrentStatus('Listening...');
    setIsListening(true);
    setErrorText('');
  };

  const onSpeechEndHandler = (e: any) => {
    console.log('onSpeechEnd:', e);
    setIsListening(false);
    setCurrentStatus('Processing...');
    // Consider calling onStopRecording or similar prop if ChatScreen needs to know
  };

  const onSpeechResultsHandler = (e: any) => {
    console.log('onSpeechResults:', e);
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      setTranscribedText(text);
      setCurrentStatus('Transcribed: ' + text.substring(0, 20) + '...');
      onSpeechTranscribed(text); // Pass text to parent
    }
    setIsListening(false); // Usually stop listening after first result for this kind of UI
  };

  const onSpeechErrorHandler = (e: any) => {
    console.log('onSpeechError:', e);
    setErrorText(e.error?.message || 'Unknown speech error');
    setCurrentStatus('Error. Try again.');
    setIsListening(false);
  };

  const onSpeechVolumeChangedHandler = (e: any) => {
    // console.log('onSpeechVolumeChanged:', e);
    if (e.value != null) { // Check for null or undefined
      setCurrentVolume(e.value);
    }
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const permission = Platform.OS === 'ios'
        ? PERMISSIONS.IOS.MICROPHONE
        : PERMISSIONS.ANDROID.RECORD_AUDIO;
      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const _startRecording = async () => {
    onVoiceRecordingStart(); // Call the new prop function
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      setErrorText('Microphone permission denied.');
      setCurrentStatus('Permission needed.');
      return;
    }
    setTranscribedText('');
    setErrorText('');
    try {
      await Voice.start('en-US'); // Or make language configurable
      // State updates will be handled by onSpeechStartHandler
    } catch (e) {
      console.error('Error starting voice recognition:', e);
      setErrorText('Could not start listener.');
      setCurrentStatus('Error. Try again.');
    }
  };

  const _stopRecording = async () => {
    try {
      await Voice.stop();
      // State updates handled by onSpeechEndHandler
    } catch (e) {
      console.error('Error stopping voice recognition:', e);
      setErrorText('Could not stop listener.');
    }
  };

  const _resetSession = async () => {
    try {
      await Voice.cancel(); // More graceful than destroy if just resetting current session
    } catch (e) {
      console.error('Error cancelling voice recognition:', e)
    }
    setIsListening(false);
    setTranscribedText('');
    setErrorText('');
    setCurrentStatus('Press mic to start');
  };


  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.visualizerContainer}>
            <NativeAudioVisualizer volume={currentVolume} />
          </View>

          <Text style={styles.statusText}>{errorText || currentStatus}</Text>

          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.controlButton, styles.resetButton]}
              onPress={_resetSession}
              disabled={isListening}
            >
              <Icon name="history" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            {!isListening ? (
              <TouchableOpacity
                style={[styles.controlButton, styles.recordButton]}
                onPress={_startRecording}
              >
                <Icon name="microphone" size={38} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlButton, styles.stopButton]}
                onPress={_stopRecording}
              >
                <Icon name="stop" size={38} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* A spacer to balance the layout, width adjusted to match resetButton */}
            <View style={{ width: 50 }} />
          </View>
          
          {/* Optional: Close button if not relying solely on backdrop press or escape key */}
          {/* <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end', // Aligns modal to the bottom
  },
  modalContainer: {
    width: '100%',
    height: height * 0.45, // Approximately 45% of screen height
    backgroundColor: '#2C2C2E', // Dark theme similar to reference
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Safe area padding for bottom
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 30,
  },
  visualizerContainer: {
    width: '90%',
    height: '40%', // Or desired height
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    // backgroundColor: 'rgba(255, 255, 255, 0.05)', // Optional background for the area
    // borderRadius: 10,
  },
  // placeholderText style is no longer needed
  statusText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: FONTS?.primary || 'System',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    minHeight: 20, // Ensure space for status text
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 30,
  },
  controlButton: {
    width: 70, // Main record/stop button size
    height: 70,
    borderRadius: 35, // Fully circular
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Default background
    justifyContent: 'center',
    alignItems: 'center',
    // borderWidth: 1, // Optional: remove border for flatter look or adjust
    // borderColor: 'rgba(255, 255, 255, 0.3)', // Optional
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordButton: {
    backgroundColor: COLORS.primary || '#4CD964', // Use theme color or fallback
    // borderColor: COLORS.primaryDark || '#3AA24B', // Optional darker border
  },
  stopButton: {
    backgroundColor: COLORS.error || '#FF3B30', // Use theme error color or fallback
    // borderColor: COLORS.errorDark || '#D32F2F', // Optional darker border
  },
  resetButton: {
    width: 50, // Smaller size for reset button
    height: 50,
    borderRadius: 25, // Fully circular
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // More subtle background
    // No separate border color, rely on shadow/elevation
  },
  // controlButtonIcon and controlButtonIconBig are no longer needed as Icon component handles size/color
  // Optional close button styling
  // closeButton: {
  //   position: 'absolute',
  //   top: 15,
  //   right: 15,
  //   padding: 10,
  // },
  // closeButtonText: {
  //   fontSize: 16,
  //   color: 'rgba(255, 255, 255, 0.7)',
  // },
});

export default NativeVoiceModal;
