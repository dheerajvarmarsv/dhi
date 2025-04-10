import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface PhoneNumberScreenProps {
  navigation: any;
}

const PhoneNumberScreen: React.FC<PhoneNumberScreenProps> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleContinue = () => {
    if (phoneNumber.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // Navigate to main app - in a real app, this would go to a verification code screen
      navigation.replace('Main');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with back button and progress bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar} />
          </View>
        </View>
        
        {/* Title and phone input form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>
            Please enter your phone number below:
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Country/Region</Text>
            <TouchableOpacity style={styles.countrySelector}>
              <Text style={styles.countryText}>United States (+1)</Text>
            </TouchableOpacity>
            
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone Number"
              placeholderTextColor={COLORS.gray}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>
          
          <TouchableOpacity 
            style={[
              styles.continueButton,
              (!phoneNumber || isLoading) && styles.disabledButton
            ]}
            onPress={handleContinue}
            disabled={!phoneNumber || isLoading}
            activeOpacity={0.9}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? 'Please wait...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  },
  header: {
    marginTop: 10,
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
  progressBarContainer: {
    height: 4,
    backgroundColor: COLORS.lightGray,
    borderRadius: 2,
    marginTop: 10,
  },
  progressBar: {
    height: '100%',
    width: '50%', // Half-way through the progress
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  formContainer: {
    marginTop: 30,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.black,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginBottom: 10,
  },
  countrySelector: {
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    justifyContent: 'center',
  },
  countryText: {
    ...FONTS.body3,
    color: COLORS.black,
  },
  phoneInput: {
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...FONTS.body3,
    color: COLORS.black,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray,
    opacity: 0.8,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PhoneNumberScreen; 