import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { COLORS } from '../constants/theme'; // Assuming theme constants

interface NativeAudioVisualizerProps {
  volume: number; // Expected range, e.g., 0 to 10 (adjust based on onSpeechVolumeChanged output)
}

const MAX_VOLUME_LEVEL = Platform.OS === 'ios' ? -1 : 10; // Max typical value for normalization
const MIN_SCALE = 1.0;
const MAX_SCALE_INCREASE = 1.5; 

const NativeAudioVisualizer: React.FC<NativeAudioVisualizerProps> = ({ volume }) => {
  const scaleAnim1 = useRef(new Animated.Value(MIN_SCALE)).current;
  const scaleAnim2 = useRef(new Animated.Value(MIN_SCALE * 0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    let normalizedVolume = 0;
    if (Platform.OS === 'ios') {
      // iOS volume is typically negative, from around -120 (silence) to 0 (loud), sometimes slightly positive.
      // Let's normalize it: 0 for silence (-120), 1 for loud (e.g., -10 or higher).
      // We'll cap at a reasonable loud level like -5 for max effect.
      const minDb = -60; // Silence threshold
      const maxDb = -5;  // Loudness threshold for max scale
      normalizedVolume = Math.max(0, Math.min(1, (volume - minDb) / (maxDb - minDb)));
    } else {
      // Android volume is typically 0 (silence) to 10 (loud).
      normalizedVolume = Math.max(0, Math.min(1, volume / MAX_VOLUME_LEVEL));
    }
    
    const targetScale1 = MIN_SCALE + (normalizedVolume * MAX_SCALE_INCREASE);
    const targetScale2 = MIN_SCALE * 0.8 + (normalizedVolume * MAX_SCALE_INCREASE * 0.7);
    const targetOpacity = 0.5 + (normalizedVolume * 0.5);

    Animated.parallel([
      Animated.timing(scaleAnim1, { toValue: targetScale1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(scaleAnim2, { toValue: targetScale2, duration: 120, easing: Easing.linear, useNativeDriver: true }), 
      Animated.timing(opacityAnim, { toValue: targetOpacity, duration: 100, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [volume, scaleAnim1, scaleAnim2, opacityAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.visualizerCircle, styles.circle2, { transform: [{ scale: scaleAnim2 }], opacity: opacityAnim }]} />
      <Animated.View style={[styles.visualizerCircle, styles.circle1, { transform: [{ scale: scaleAnim1 }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualizerCircle: { // Base style for circles
    width: 80, // Default width, will be overridden by specific circle styles
    height: 80, // Default height
    borderRadius: 40, // Default radius
    position: 'absolute', // For layering
  },
  circle1: { // Inner circle
    backgroundColor: 'rgba(76, 217, 100, 0.7)', // Green
    width: 70, 
    height: 70,
    borderRadius: 35,
    shadowColor: '#4CD964',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10, // For Android shadow
  },
  circle2: { // Outer circle
    backgroundColor: 'rgba(76, 217, 100, 0.4)', // Lighter green, more transparent
    width: 100, 
    height: 100,
    borderRadius: 50,
    // No shadow for the outer, more transparent circle to create depth
  },
});

export default NativeAudioVisualizer;
