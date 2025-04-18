import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Platform
} from 'react-native';
import CustomPersonaForm from './CustomPersonaForm';

const { width } = Dimensions.get('window');

type CreatePersonaButtonProps = {
  onPersonaCreated: () => void;
};

const CreatePersonaButton = ({ onPersonaCreated }: CreatePersonaButtonProps) => {
  const [formVisible, setFormVisible] = useState(false);
  
  const handleOpenForm = () => {
    setFormVisible(true);
  };
  
  const handleCloseForm = () => {
    setFormVisible(false);
  };
  
  const handlePersonaCreated = () => {
    setFormVisible(false);
    if (onPersonaCreated) {
      onPersonaCreated();
    }
  };
  
  return (
    <>
      <Pressable
        style={({pressed}) => [
          styles.createPersonaButton,
          pressed && {opacity: 0.9, transform: [{scale: 0.98}]}
        ]}
        onPress={handleOpenForm}
        android_ripple={{color: 'rgba(225, 79, 41, 0.1)'}}
      >
        <View style={styles.createPersonaIcon}>
          <Text style={styles.createPersonaIconText}>+</Text>
        </View>
        <View style={styles.createPersonaInfo}>
          <Text style={styles.createPersonaTitle}>Create Custom Persona</Text>
          <Text style={styles.createPersonaDescription}>
            Build your own AI personality
          </Text>
        </View>
      </Pressable>
      
      <CustomPersonaForm
        visible={formVisible}
        onClose={handleCloseForm}
        onPersonaCreated={handlePersonaCreated}
      />
    </>
  );
};

const styles = StyleSheet.create({
  createPersonaButton: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: '#ffebeb',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 79, 41, 0.3)',
    shadowColor: '#e14f29',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  createPersonaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e14f29',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  createPersonaIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 26,
    includeFontPadding: false,
  },
  createPersonaInfo: {
    flex: 1,
  },
  createPersonaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e14f29',
    marginBottom: 4,
  },
  createPersonaDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default CreatePersonaButton; 