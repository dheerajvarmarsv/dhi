import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View
} from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  primary?: boolean;
  secondary?: boolean;
  outline?: boolean;
  icon?: React.ReactNode;
}

const Button = ({
  label,
  onPress,
  containerStyle,
  labelStyle,
  disabled = false,
  loading = false,
  primary = true,
  secondary = false,
  outline = false,
  icon
}: ButtonProps) => {
  
  const buttonStyles = [
    styles.container,
    primary && !outline && styles.primaryButton,
    secondary && !outline && styles.secondaryButton,
    outline && styles.outlineButton,
    disabled && styles.disabledButton,
    containerStyle
  ];

  const textStyles = [
    styles.label,
    primary && !outline && styles.primaryLabel,
    secondary && !outline && styles.secondaryLabel,
    outline && styles.outlineLabel,
    disabled && styles.disabledLabel,
    labelStyle
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={outline ? COLORS.primary : COLORS.white} 
        />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={textStyles}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    ...SHADOWS.medium,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: SIZES.base,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
  },
  outlineButton: {
    backgroundColor: COLORS.transparent,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray,
    ...SHADOWS.light,
  },
  label: {
    fontSize: SIZES.h3,
    fontWeight: '600',
  },
  primaryLabel: {
    color: COLORS.white,
  },
  secondaryLabel: {
    color: COLORS.white,
  },
  outlineLabel: {
    color: COLORS.primary,
  },
  disabledLabel: {
    color: COLORS.gray,
  },
});

export default Button; 