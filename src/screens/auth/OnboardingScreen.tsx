import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Animated
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import Button from '../../components/Button';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  // Pagination indicator state
  const [activeSlide, setActiveSlide] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    // Run animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
    
    // Auto navigate for demo purposes only - can be removed in production
    const timer = setTimeout(() => {
      navigation.navigate('Features');
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.topSection,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Phone image on orange background */}
          <Image 
            source={require('../../../assets/person-on-table.png')} 
            style={styles.phoneImage}
            resizeMode="contain"
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.logoContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.logoText}>I'm</Text>
          <Text style={styles.piText}>Pi</Text>
          
          {/* Pagination dots */}
          <View style={styles.pagination}>
            <View style={[styles.paginationDot, styles.activeDot]} />
            <View style={styles.paginationDot} />
            <View style={styles.paginationDot} />
          </View>
        </Animated.View>
        
        {/* Home indicator (bottom line) */}
        <View style={styles.homeIndicator} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  topSection: {
    width: '100%',
    height: height * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  phoneImage: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoContainer: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  logoText: {
    ...FONTS.h2,
    color: COLORS.black,
    marginBottom: -10,
  },
  piText: {
    ...FONTS.largeTitle,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: -20,
  },
  pagination: {
    flexDirection: 'row',
    marginTop: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray,
    marginRight: 6,
    opacity: 0.3,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    opacity: 1,
  },
  homeIndicator: {
    width: 135,
    height: 5,
    backgroundColor: '#000',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 8,
    opacity: 0.2,
  },
});

export default OnboardingScreen; 