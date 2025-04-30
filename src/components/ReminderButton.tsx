import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface ReminderButtonProps {
  onPress: () => void;
  count: number;
}

const ReminderButton: React.FC<ReminderButtonProps> = ({ onPress, count }) => {
  const [scale] = useState(new Animated.Value(1));
  const [rotate] = useState(new Animated.Value(0));
  
  // If count changes, animate the button
  useEffect(() => {
    if (count > 0) {
      // Vibrate for haptic feedback
      Vibration.vibrate(50);
      
      // Animation sequence
      Animated.sequence([
        // Scale up
        Animated.timing(scale, {
          toValue: 1.25,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.elastic(1),
        }),
        // Rotate slightly
        Animated.timing(rotate, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.elastic(2),
        }),
        // Scale back
        Animated.timing(scale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.elastic(1),
        }),
        // Rotate back
        Animated.timing(rotate, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.elastic(1),
        }),
      ]).start();
    }
  }, [count, scale, rotate]);
  
  const animatedStyles = {
    transform: [
      { scale },
      {
        rotate: rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '20deg'],
        }),
      },
    ],
  };
  
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconContainer, animatedStyles, count > 0 && styles.activeIconContainer]}>
        <Image 
          source={require('../../assets/reminder.png')} 
          style={[styles.icon, count > 0 && styles.activeIcon]}
          resizeMode="contain"
        />
      </Animated.View>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: Math.min(44, width * 0.11),
    height: Math.min(44, width * 0.11),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Math.min(22, width * 0.055),
    position: 'relative',
  },
  iconContainer: {
    width: Math.min(40, width * 0.1),
    height: Math.min(40, width * 0.1),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Math.min(20, width * 0.05),
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  activeIconContainer: {
    backgroundColor: `${COLORS.primaryLight}80`, // with opacity
  },
  icon: {
    width: Math.min(24, width * 0.06),
    height: Math.min(24, width * 0.06),
    tintColor: COLORS.text,
  },
  activeIcon: {
    tintColor: COLORS.primary,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'white',
    ...SHADOWS.light,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: FONTS.secondary,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default ReminderButton; 