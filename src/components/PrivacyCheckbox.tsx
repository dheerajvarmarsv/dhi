import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import PrivacyModal from './PrivacyModal';

const { width } = Dimensions.get('window');

type PrivacyCheckboxProps = {
  checked: boolean;
  onCheck: (checked: boolean) => void;
};

const PrivacyCheckbox = ({ checked, onCheck }: PrivacyCheckboxProps) => {
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'privacy' | 'terms'>('privacy');

  const handleOpenPrivacyPolicy = () => {
    setModalType('privacy');
    setPrivacyModalVisible(true);
  };

  const handleOpenTerms = () => {
    setModalType('terms');
    setPrivacyModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.checkboxContainer} 
        onPress={() => onCheck(!checked)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <View style={styles.checkmark} />}
        </View>
        
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>
            I agree to the{' '}
            <Text style={styles.link} onPress={handleOpenPrivacyPolicy}>
              Privacy Policy
            </Text>{' '}
            and{' '}
            <Text style={styles.link} onPress={handleOpenTerms}>
              Terms & Conditions
            </Text>
            <Text style={styles.requiredAsterisk}> *</Text>
          </Text>
        </View>
      </TouchableOpacity>

      <PrivacyModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
        type={modalType}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    width: 10,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'white',
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  labelContainer: {
    flex: 1,
  },
  labelText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  link: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  requiredAsterisk: {
    color: 'red',
    fontWeight: 'bold',
  }
});

export default PrivacyCheckbox; 