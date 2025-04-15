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

const { width, height } = Dimensions.get('window');

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

  const screens = [
    {
      image: require('../../../assets/logo.png'),
      title: "It's Dhi",
      subtitle: "",
    },
    {
      image: require('../../../assets/onboarding.png'),
      title: "I'm Pi",
      subtitle: "Your personal AI companion",
    },
    {
      image: require('../../../assets/onboarding.png'),
      title: "Together, we can",
      subtitle: "Keep a journal, make a plan, learn something new",
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
            <View style={styles.imageContainer}>
              <Image
                source={screen.image}
                style={[
                  styles.image,
                  index === 0 && styles.logoImage
                ]}
                resizeMode={index === 0 ? "contain" : "cover"}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{screen.title}</Text>
              {screen.subtitle && (
                <Text style={styles.subtitle}>{screen.subtitle}</Text>
              )}
            </View>
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
  imageContainer: {
    height: height * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: width,
    borderRadius: 16,
  },
  logoImage: {
    width: width * 0.8,
    height: width * 0.8,
  },
  textContainer: {
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
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
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default OnboardingScreen;