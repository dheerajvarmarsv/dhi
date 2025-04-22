import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';

interface AudioWaveformProps {
  isRecording: boolean;
  amplitude: number;
  color: string;
}

const { width } = Dimensions.get('window');

// Simple temporary solution without waveform animation
export const AudioWaveform: React.FC<AudioWaveformProps> = ({ isRecording, color }) => {
  if (!isRecording) return null;
  
  return (
    <View style={styles.container}>
      <View style={[styles.recordingIndicator, { backgroundColor: color }]}>
        <Text style={styles.recordingText}>Recording...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  }
});

export default AudioWaveform; 