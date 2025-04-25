import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Animated, Easing } from 'react-native';

interface AudioWaveformProps {
  isRecording: boolean;
  color: string;
}

// Simplified recording indicator with pulsing animation
export const AudioWaveform: React.FC<AudioWaveformProps> = ({ isRecording, color }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  useEffect(() => {
    if (isRecording) {
      // Create a pulsing animation
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animationRef.current.start();
    } else {
      // Stop the animation when not recording
      if (animationRef.current) {
        animationRef.current.stop();
      }
      pulseAnim.setValue(1);
    }
    
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [isRecording]);
  
  if (!isRecording) return null;
  
  return (
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
  );
};

const styles = StyleSheet.create({
  recordingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AudioWaveform; 