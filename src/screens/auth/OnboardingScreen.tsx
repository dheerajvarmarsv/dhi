// src/screens/auth/OnboardingScreen.tsx
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import BubblesScreen from '../../components/BubblesScreen';

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
  title: string;
  subtitle: string;
};

type Screen = FirstScreen | SecondScreen | ThirdScreen;

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

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
      title: "It's Dhi",
      subtitle: "Your personal AI companion",
    },
  ];

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
                <View style={styles.topImageContainer}>
                  <Image
                    source={screen.topImage}
                    style={styles.topImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.bottomImageContainer}>
                  <Image
                    source={screen.bottomImage}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            ) : screen.type === 'second' ? (
              // Second screen with centered text and feature bubbles
              <BubblesScreen headerImage={screen.headerImage} featureCards={screen.featureCards} />
            ) : screen.type === 'third' ? (
              // Third screen with Dhi image and sign in button
              <View style={styles.finalScreenContainer}>
                <View style={styles.imageContainer}>
                  <Image
                    source={screen.image}
                    style={styles.finalImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.title}>{screen.title}</Text>
                  <Text style={styles.subtitle}>{screen.subtitle}</Text>
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
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.buttonText}>Get Started</Text>
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
    width: width * 0.85,
    height: height * 0.38,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.02,
    borderRadius: 45, // Much more rounded corners for oval effect
    overflow: 'hidden', // Ensures the image respects the border radius
  },
  topImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45, // Match container radius for consistent oval shape
  },
  bottomImageContainer: {
    width: width,
    height: height * 0.45, // Increased height for the logo
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0, // Remove horizontal padding
    marginBottom: height * 0.02,
  },
  logoImage: {
    width: width, // Full width
    height: height * 0.35, // Significantly increased height
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
    marginBottom: height * 0.06,
  },
  title: {
    fontSize: Math.min(36, width * 0.09),
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: height * 0.02,
  },
  subtitle: {
    fontSize: Math.min(18, width * 0.045),
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
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
    paddingHorizontal: width * 0.05,
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