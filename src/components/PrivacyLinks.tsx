import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import PrivacyModal from './PrivacyModal';

const { width } = Dimensions.get('window');

type PrivacyLinksProps = {
  containerStyle?: any;
};

const PrivacyLinks = ({ containerStyle }: PrivacyLinksProps) => {
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
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
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.text}>
        By using this app, you agree to our{' '}
        <Text style={styles.link} onPress={handleOpenPrivacyPolicy}>
          Privacy Policy
        </Text>{' '}
        and{' '}
        <Text style={styles.link} onPress={handleOpenTerms}>
          Terms & Conditions
        </Text>
      </Text>

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
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: FONTS.primary,
  },
  link: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});

export default PrivacyLinks; 