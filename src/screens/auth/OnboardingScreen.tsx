// src/screens/auth/OnboardingScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import BubblesScreen from '../../components/BubblesScreen';
import { isModelDownloaded, MODEL_FILENAME } from '../../utils/modelUtils';

const { width, height } = Dimensions.get('window');

type FeatureCard = {
  image: any;
  text: string;
  bgColor: string;
};

type FirstScreen = {
  type: 'first';
  topImage: any;
  bottomImage: any;
};

type SecondScreen = {
  type: 'second';
  headerImage: any;
  featureCards: FeatureCard[];
};

type ThirdScreen = {
  type: 'third';
  image: any;
};

type Screen = FirstScreen | SecondScreen | ThirdScreen;

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  // New animation values for third screen
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Text animation for third screen - only change the word part
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const taglineWords = [
    "OFFLINE",
    "PRIVATE",
    "SECURE",
    "FOR YOU"
  ];
  
  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      })
    ]).start();
    
    // Start floating animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Pulse animation for third screen
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Subtle rotation for third screen image
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Glow effect animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();
    
    // Animate through taglines for third screen
    let textAnimationTimeout: NodeJS.Timeout;
    
    const animateText = () => {
      // Fade out faster
      Animated.timing(textFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change text and fade in faster
        setCurrentTextIndex((prevIndex) => (prevIndex + 1) % taglineWords.length);
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        // Schedule next animation - faster interval
        textAnimationTimeout = setTimeout(animateText, 800);
      });
    };
    
    // Start text animation loop with initial fade in
    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    textAnimationTimeout = setTimeout(animateText, 2000);
    
    return () => {
      clearTimeout(textAnimationTimeout);
    };
  }, []);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    setCurrentPage(page);
  };

  const screens: Screen[] = [
    {
      type: 'first',
      topImage: require('../../../assets/onboarding.png'),
      bottomImage: require('../../../assets/logo.png'),
    },
    {
      type: 'second',
      headerImage: require('../../../assets/text.png'),
      featureCards: [
        { 
          image: require('../../../assets/readwrite.png'), 
          text: 'Summarize content',
          bgColor: COLORS.featureCardBg1
        },
        { 
          image: require('../../../assets/reminder.png'), 
          text: 'Make a plan',
          bgColor: COLORS.featureCardBg2
        },
        { 
          image: require('../../../assets/analyse.png'), 
          text: 'Learn something new',
          bgColor: COLORS.featureCardBg3
        },
        { 
          image: require('../../../assets/write.png'), 
          text: 'Read a story',
          bgColor: COLORS.featureCardBg4
        },
        { 
          image: require('../../../assets/ideas.png'), 
          text: 'Generate ideas',
          bgColor: COLORS.featureCardBg3
        },
        { 
          image: require('../../../assets/understand.png'), 
          text: 'Help understand',
          bgColor: COLORS.featureCardBg5
        },
        { 
          image: require('../../../assets/calculate.png'), 
          text: 'Assist with math',
          bgColor: COLORS.featureCardBg2
        },
        { 
          image: require('../../../assets/justtalkorvent.png'), 
          text: 'Just talk or vent',
          bgColor: COLORS.featureCardBg1
        }
      ],
    },
    {
      type: 'third',
      image: require('../../../assets/startdhi.png'),
    },
  ];

  const handleGetStarted = async () => {
    setIsChecking(true);
    try {
      const modelExists = await isModelDownloaded();
      setIsChecking(false);
      
      if (modelExists) {
        // If model exists, go directly to Chat
        navigation.navigate('Chat', { selectedModel: MODEL_FILENAME });
      } else {
        // If model doesn't exist, go to download screen
        navigation.navigate('ModelSelection');
      }
    } catch (error) {
      setIsChecking(false);
      navigation.navigate('ModelSelection');
    }
  };
  
  // Calculate float transform
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8], // Subtle float effect
  });

  // Calculate rotation transform
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-3deg', '3deg'], // Subtle rotation
  });
  
  // Calculate glow effect for third screen
  const glowShadow = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 16],
  });
  
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.25],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {screens.map((screen, index) => (
          <View key={index} style={styles.screen}>
            {screen.type === 'first' ? (
              // First screen with robot image and logo
              <View style={styles.firstScreenContainer}>
                <Animated.View 
                  style={[
                    styles.topImageContainer,
                    {
                      opacity: fadeAnim,
                      transform: [
                        { scale: scaleAnim },
                      ]
                    }
                  ]}
                >
                  <Image
                    source={screen.topImage}
                    style={styles.topImage}
                    resizeMode="contain"
                  />
                </Animated.View>
                <Animated.View 
                  style={[
                    styles.bottomImageContainer,
                    {
                      transform: [
                        { translateY },
                      ]
                    }
                  ]}
                >
                  <Image
                    source={screen.bottomImage}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </Animated.View>
              </View>
            ) : screen.type === 'second' ? (
              // Second screen with centered text and feature bubbles
              <BubblesScreen headerImage={screen.headerImage} featureCards={screen.featureCards} />
            ) : screen.type === 'third' ? (
              // Updated third screen with animated text
              <View style={styles.finalScreenContainer}>
                {/* Glow effect container (JS-driven animations) */}
                <Animated.View 
                  style={[
                    styles.glowContainer,
                    {
                      shadowRadius: glowShadow,
                      shadowOpacity: glowOpacity,
                    }
                  ]}
                >
                  {/* Image container (native-driven animations only) */}
                  <Animated.View 
                    style={[
                      styles.finalImageContainer,
                      {
                        transform: [
                          { scale: pulseAnim },
                          { rotate }
                        ]
                      }
                    ]}
                  >
                    <Image
                      source={screen.image}
                      style={styles.finalImage}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </Animated.View>
                <View style={styles.textContainer}>
                  <View style={styles.taglineContainer}>
                    <Text style={styles.percentText}>100%</Text>
                    <View style={styles.changingTextContainer}>
                      <Animated.Text 
                        style={[
                          styles.changingText,
                          { opacity: textFadeAnim }
                        ]}
                      >
                        {taglineWords[currentTextIndex]}
                      </Animated.Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {screens.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                currentPage === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {currentPage === screens.length - 1 && (
          <TouchableOpacity
            style={styles.button}
            onPress={handleGetStarted}
            disabled={isChecking}
          >
            {isChecking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Get Started</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
  },
  scrollView: {
    flex: 1,
  },
  screen: {
    width,
    flex: 1,
  },
  // First screen specific styles
  firstScreenContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.02,
  },
  topImageContainer: {
    width: width * 0.88,
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.03,
    borderRadius: 45,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    backgroundColor: COLORS.primaryLight,
    transform: [{ perspective: 1000 }],
  },
  topImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  bottomImageContainer: {
    width: width,
    height: height * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.01,
    transform: [
      { translateY: -height * 0.03 }
    ],
  },
  logoImage: {
    width: width * 1.1,
    height: height * 0.45,
    resizeMode: 'contain',
  },
  // Other screen styles
  imageContainer: {
    width: width * 0.8,
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.04,
  },
  finalImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: height * 0.15,
    marginBottom: height * 0.06,
    marginTop: height * 0.02,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: Math.min(50, width * 0.1),
  },
  percentText: {
    fontSize: Math.min(32, width * 0.08),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-light',
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  changingTextContainer: {
    marginLeft: 5, // Space between 100% and the changing word
    minWidth: Math.min(160, width * 0.4), // Reserve space for the word
    height: '100%',
    justifyContent: 'center',
  },
  changingText: {
    fontSize: Math.min(32, width * 0.08),
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-light',
    fontWeight: '300',
    color: COLORS.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray,
    marginHorizontal: 4,
    opacity: 0.3,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    opacity: 1,
  },
  button: {
    backgroundColor: '#e14f29',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  finalScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.08,
    paddingTop: height * 0.05,
  },
  glowContainer: {
    width: width * 0.9,
    height: height * 0.44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.04,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.2,
    backgroundColor: 'transparent',
  },
  finalImageContainer: {
    width: width * 0.85,
    height: height * 0.42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.1,
    borderRadius: 12,
    marginTop: height * 0.02,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default OnboardingScreen;