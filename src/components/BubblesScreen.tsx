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

  // Initial positions for the bubbles (arranged in a circle around the center)
  const getBubblePosition = (index, total) => {
    const safeAreaWidth = width * 0.8; // Use 80% of width to keep bubbles from edge
    const safeAreaHeight = height * 0.7; // Use 70% of height
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate positions in a circle around the center
    // Use different radii for different bubbles for a more natural look
    const radius = Math.min(safeAreaWidth, safeAreaHeight) * 0.42;
    const angle = (index / total) * 2 * Math.PI + Math.random() * 0.2;
    
    // Add some randomness to positions while keeping them in a rough circle
    const randomOffset = radius * 0.15;
    const x = centerX + (radius + (Math.random() * randomOffset - randomOffset/2)) * Math.cos(angle);
    const y = centerY + (radius + (Math.random() * randomOffset - randomOffset/2)) * Math.sin(angle);
    
    return { x, y };
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
    width: width * 0.7, // Slightly reduced to avoid overlap
    height: height * 0.15,
    top: height * 0.42, // Center vertically
    left: width * 0.15, // Center horizontally
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