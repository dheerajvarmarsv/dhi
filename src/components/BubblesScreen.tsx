// src/components/BubblesScreen.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { COLORS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface FeatureCard {
  image: any;
  text: string;
  bgColor: string;
}

interface BubblesScreenProps {
  headerImage: any;
  featureCards: FeatureCard[];
}

const BubblesScreen: React.FC<BubblesScreenProps> = ({ headerImage, featureCards }) => {
  // Create animated values for each feature card
  const animatedValues = useRef(featureCards.map(() => ({
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    direction: {
      x: Math.random() > 0.5 ? 1 : -1,
      y: Math.random() > 0.5 ? 1 : -1
    }
  }))).current;
  
  // Set up the floating animation
  useEffect(() => {
    // Animation config
    const animationConfig = {
      duration: 3000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true
    };
    
    // Animate each bubble with a small random movement
    const animations = animatedValues.map((anim, index) => {
      // Random small movement (5-15px)
      const moveX = 10 * anim.direction.x * (0.5 + Math.random());
      const moveY = 10 * anim.direction.y * (0.5 + Math.random());
      
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(anim.translateX, {
            toValue: moveX,
            ...animationConfig,
          }),
          Animated.timing(anim.translateX, {
            toValue: 0,
            ...animationConfig,
          })
        ]),
        Animated.sequence([
          Animated.timing(anim.translateY, {
            toValue: moveY,
            ...animationConfig,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            ...animationConfig,
          })
        ])
      ]);
    });
    
    // Run all animations in parallel and loop
    const loopAnimations = Animated.loop(
      Animated.stagger(200, animations)
    );
    
    loopAnimations.start();
    
    return () => {
      loopAnimations.stop();
    };
  }, []);

  // Position bubbles in a balanced 2x2 grid at top and bottom
  const getBubblePosition = (index: number, total: number) => {
    const safeAreaWidth = width * 0.8; // Use 80% of width to keep bubbles from edge
    const centerX = width / 2;
    
    // Determine if top or bottom section
    const isTopSection = index < total / 2;
    
    // Determine position within the section (0-3)
    const sectionPosition = isTopSection ? index : (index - Math.floor(total / 2));
    
    // Determine if in first or second row of the section
    const isFirstRow = sectionPosition < 2;
    
    // Horizontal position calculation
    // For each row, we want one bubble on the left and one on the right
    const isLeftBubble = sectionPosition % 2 === 0;
    
    // Horizontal spread - distance from center
    const horizSpread = width * 0.25; // 25% of screen width from center
    const xPos = isLeftBubble ? centerX - horizSpread : centerX + horizSpread;
    
    // Vertical positions for the 4 possible configurations
    let yPos;
    
    if (isTopSection) {
      if (isFirstRow) {
        // Top section, first row (higher)
        yPos = height * 0.18;
      } else {
        // Top section, second row (lower)
        yPos = height * 0.28;
      }
    } else {
      if (isFirstRow) {
        // Bottom section, first row (higher)
        yPos = height * 0.58;
      } else {
        // Bottom section, second row (lower)
        yPos = height * 0.68;
      }
    }
    
    // Add small randomness for natural feeling
    const randomX = xPos + (Math.random() * 5 - 2.5);
    const randomY = yPos + (Math.random() * 5 - 2.5);
    
    return { x: randomX, y: randomY };
  };

  return (
    <View style={styles.bubblesContainer}>
      {/* Header image (text.png - "Always, Here for you") */}
      <View style={styles.headerImageContainer}>
        <Image
          source={headerImage}
          style={styles.headerImage}
          resizeMode="contain"
        />
      </View>
      
      {/* Animated Feature Bubbles */}
      {featureCards.map((card, index) => {
        const position = getBubblePosition(index, featureCards.length);
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.featureBubble,
              { 
                backgroundColor: card.bgColor,
                left: position.x - 70, // Half of bubble width
                top: position.y - 25,  // Half of bubble height
                transform: [
                  { translateX: animatedValues[index].translateX },
                  { translateY: animatedValues[index].translateY }
                ]
              }
            ]}
          >
            <Image 
              source={card.image}
              style={styles.bubbleImage}
              resizeMode="contain"
            />
            <Text style={styles.bubbleText}>{card.text}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bubblesContainer: {
    flex: 1,
    width: width,
    height: height,
    position: 'relative',
  },
  headerImageContainer: {
    position: 'absolute',
    width: width * 0.85, // Increased from 0.7 to make image larger
    height: height * 0.22, // Increased from 0.15 to make image larger
    top: height * 0.38, // Slightly adjusted to keep centered
    left: width * 0.075, // Adjusted to center the wider container (0.85/2 = 0.425, so (1-0.85)/2 = 0.075)
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5, // Ensure it's above the bubbles
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  featureBubble: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    width: 140, // Fixed width for consistent bubbles
    height: 50,
    // Enhanced shadows
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1,
  },
  bubbleImage: {
    width: 25,
    height: 25,
    marginRight: 8,
  },
  bubbleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1, // Allow text to shrink if needed
  },
});

export default BubblesScreen;