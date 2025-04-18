import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  primary: '#e14f29', // Orange primary color
  primaryLight: '#f5f0e6', // Soft beige background
  secondary: '#1e3e1f', // Dark green
  gray: '#8B8B8B',
  lightGray: '#D3D3D3',
  white: '#FFFFFF',
  black: '#000000',
  border: '#E2E8F0',
  error: '#FF3B30',
  success: '#4CD964',
  transparent: 'transparent',
  
  // App-specific colors
  background: '#f5f0e6', // Soft beige background like in the image
  userBubble: '#f0e6d9', // Light beige/cream color for user bubbles
  assistantBubble: '#FFFFFF', // White for assistant messages
  text: '#1e3e1f', // Dark green text
  lightText: '#5a6955', // Lighter green-gray text
  
  // Feature card backgrounds
  featureCardBg1: '#FFE8D1',
  featureCardBg2: '#D1F0FF',
  featureCardBg3: '#FFD1E6',
  featureCardBg4: '#D1FFE8',
  featureCardBg5: '#E6D1FF',
};

export const SIZES = {
  // Global sizes
  base: 8,
  font: 14,
  medium: 16,
  large: 18,
  xlarge: 24,
  xxlarge: 32,
  
  // App-specific sizes
  radius: 12,
  padding: 24,

  // Font sizes
  h1: 30,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  body: 14,
  small: 12,
};

export const FONTS = {
  // Font families
  primary: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
  secondary: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
  fallback: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
  
  // Font styles
  largeTitle: { 
    fontFamily: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
    fontSize: SIZES.xxlarge,
    lineHeight: 55,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  h1: { 
    fontFamily: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
    fontSize: SIZES.h1, 
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  h2: { 
    fontFamily: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
    fontSize: SIZES.h2, 
    lineHeight: 30, 
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  h3: { 
    fontFamily: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
    fontSize: SIZES.h3, 
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  h4: { 
    fontFamily: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
    fontSize: SIZES.h4, 
    lineHeight: 22, 
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  h5: { 
    fontFamily: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
    fontSize: SIZES.h5, 
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
    fontSize: SIZES.body,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  small: {
    fontFamily: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
    fontSize: SIZES.small,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
    fontSize: SIZES.body,
    lineHeight: 22, 
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  italic: {
    fontFamily: Platform.OS === 'ios' ? 'Noto Sans' : 'Noto Sans',
    fontStyle: 'italic',
  },
};

export const SHADOWS = {
  light: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  dark: {
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 5,
  },
}; 