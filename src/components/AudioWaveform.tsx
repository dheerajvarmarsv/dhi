import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, Animated, Easing } from 'react-native';

interface AudioWaveformProps {
  isRecording: boolean;
  amplitude: number;
  color: string;
}

const { width } = Dimensions.get('window');

// Simple temporary solution with a pulsing animation
export const AudioWaveform: React.FC<AudioWaveformProps> = ({ isRecording, color }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (isRecording) {
      // Create a pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop the animation when not recording
      pulseAnim.stopAnimation();
    }
    
    return () => {
      pulseAnim.stopAnimation();
    };
  }, [isRecording]);
  
  if (!isRecording) return null;
  
  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.recordingIndicator, 
          { 
            backgroundColor: color,
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <Text style={styles.recordingText}>Recording...</Text>
      </Animated.View>
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