import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface SignInScreenProps {
  navigation: any;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
        </View>
        
        {/* Main Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../../assets/person-train.png')}
            style={styles.mainImage}
            resizeMode="cover"
          />
        </View>
        
        {/* Title and Description */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            Start <Text style={styles.italicText}>talking</Text> to Pi
          </Text>
          
          <Text style={styles.description}>
            When you create your account with Pi, you'll able to see and save your conversation history.
          </Text>
        </View>
        
        {/* Sign up and Skip buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.signupButton}
            onPress={() => navigation.navigate('PhoneNumber')}
            activeOpacity={0.9}
          >
            <Text style={styles.signupButtonText}>Sign up</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => navigation.navigate('Main')}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
        
        {/* Pagination dots */}
        <View style={styles.pagination}>
          <View style={styles.paginationDot} />
          <View style={styles.paginationDot} />
          <View style={[styles.paginationDot, styles.activeDot]} />
        </View>
      </View>
      
      {/* Home indicator */}
      <View style={styles.homeIndicator} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    fontSize: 24,
    color: COLORS.black,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  mainImage: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: 16,
    overflow: 'hidden',
  },
  textContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  title: {
    ...FONTS.h1,
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 15,
  },
  italicText: {
    fontStyle: 'italic',
  },
  description: {
    ...FONTS.body3,
    color: COLORS.gray,
    textAlign: 'center',
    marginHorizontal: 20,
    lineHeight: 24,
  },
  buttonContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  signupButton: {
    backgroundColor: COLORS.primary,
    width: width - 48,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  signupButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: COLORS.white,
    width: width - 48,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  skipButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '500',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray,
    marginHorizontal: 5,
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

export default SignInScreen; 