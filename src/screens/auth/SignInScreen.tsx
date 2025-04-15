import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface SignInScreenProps {
  navigation: any;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
  const handleSignIn = (provider: string) => {
    // In a real app, you would implement actual authentication here
    console.log(`Signing in with ${provider}`);
    navigation.navigate('PhoneNumber');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <View style={styles.backButtonCircle}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>
          Create an account or sign in to save and see your conversation history.
        </Text>

        {/* Social Login Buttons */}
        <View style={styles.socialButtons}>
          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: '#4285F4' }]}
            onPress={() => handleSignIn('Google')}
          >
            <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: '#1877F2' }]}
            onPress={() => handleSignIn('Facebook')}
          >
            <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>Continue with Facebook</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: '#000000' }]}
            onPress={() => handleSignIn('Apple')}
          >
            <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>Continue with Apple</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity 
            style={styles.phoneButton}
            onPress={() => navigation.navigate('PhoneNumber')}
          >
            <Text style={styles.phoneButtonText}>Use phone number</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  backButton: {
    marginBottom: 32,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.black,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: COLORS.primary,
    marginBottom: 40,
    textAlign: 'center',
  },
  socialButtons: {
    width: '100%',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  phoneButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.lightGray,
  },
  dividerText: {
    marginHorizontal: 16,
    color: COLORS.gray,
    fontSize: 16,
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