export const COLORS = {
  primary: '#1A3825', // Dark green for Pi - exact color from the images
  primaryLight: '#F4EAE2', // Light orange/beige background - from first screen
  secondary: '#F9A62B', // Orange accent
  gray: '#6E6E6E',
  lightGray: '#F4F4F4',
  white: '#FFFFFF',
  black: '#292929',
  border: '#E0E0E0',
  error: '#FF4D4D',
  success: '#4CAF50',
  transparent: 'transparent',
  featureCardBg1: '#E1D1FF', // Purple for journal card
  featureCardBg2: '#BFE6FF', // Blue for plan card
  featureCardBg3: '#FFDDB0', // Yellow for learn card
  featureCardBg4: '#D3F3CF', // Green for story card
  featureCardBg5: '#FFD6D6', // Pink for vent card
};

export const SIZES = {
  // Global sizes
  base: 8,
  font: 14,
  radius: 12,
  padding: 24,

  // Font sizes
  largeTitle: 100, // Pi logo size
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  body1: 24, 
  body2: 20,
  body3: 16,
  body4: 14,
  body5: 12,
};

export const FONTS = {
  largeTitle: { 
    fontFamily: 'System', 
    fontSize: SIZES.largeTitle, 
    lineHeight: 110,
    fontWeight: '700' as const,
    letterSpacing: -2,
  },
  h1: { 
    fontFamily: 'System', 
    fontSize: SIZES.h1, 
    lineHeight: 38, 
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h2: { 
    fontFamily: 'System', 
    fontSize: SIZES.h2, 
    lineHeight: 30, 
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  h3: { 
    fontFamily: 'System', 
    fontSize: SIZES.h3, 
    lineHeight: 24, 
    fontWeight: '600' as const 
  },
  h4: { 
    fontFamily: 'System', 
    fontSize: SIZES.h4, 
    lineHeight: 22, 
    fontWeight: '600' as const 
  },
  h5: { 
    fontFamily: 'System', 
    fontSize: SIZES.h5, 
    lineHeight: 22, 
    fontWeight: '600' as const 
  },
  body1: { 
    fontFamily: 'System', 
    fontSize: SIZES.body1, 
    lineHeight: 36, 
    fontWeight: '400' as const,
    letterSpacing: -0.2,
  },
  body2: { 
    fontFamily: 'System', 
    fontSize: SIZES.body2, 
    lineHeight: 30, 
    fontWeight: '400' as const,
    letterSpacing: -0.2,
  },
  body3: { 
    fontFamily: 'System', 
    fontSize: SIZES.body3, 
    lineHeight: 22, 
    fontWeight: '400' as const 
  },
  body4: { 
    fontFamily: 'System', 
    fontSize: SIZES.body4, 
    lineHeight: 22, 
    fontWeight: '400' as const 
  },
  body5: { 
    fontFamily: 'System', 
    fontSize: SIZES.body5, 
    lineHeight: 22, 
    fontWeight: '400' as const 
  },
  italic: {
    fontFamily: 'System',
    fontSize: SIZES.h1,
    lineHeight: 38,
    fontWeight: '500' as const,
    fontStyle: 'italic',
    letterSpacing: -0.5,
  }
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