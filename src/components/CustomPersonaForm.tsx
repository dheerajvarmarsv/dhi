import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard
} from 'react-native';
import { createCustomPersona } from '../utils/customPersonaStorage';

const { width, height } = Dimensions.get('window');

type CustomPersonaFormProps = {
  visible: boolean;
  onClose: () => void;
  onPersonaCreated: () => void;
};

const CustomPersonaForm = ({
  visible,
  onClose,
  onPersonaCreated
}: CustomPersonaFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [primaryRole, setPrimaryRole] = useState('');
  const [interactionGoal, setInteractionGoal] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Animation when modal becomes visible
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
    
    // Keyboard listeners
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    
    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [visible]);
  
  const handleCreatePersona = async () => {
    // Validate inputs
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for your persona.');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description for your persona.');
      return;
    }
    
    if (!primaryRole.trim()) {
      Alert.alert('Error', 'Please define the primary role for your persona.');
      return;
    }
    
    if (!interactionGoal.trim()) {
      Alert.alert('Error', 'Please define the interaction goal for your persona.');
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Create the custom persona
      const newPersona = await createCustomPersona(
        name.trim(),
        description.trim(),
        primaryRole.trim(),
        interactionGoal.trim()
      );
      
      if (newPersona) {
        setIsCreating(false);
        // Reset form
        setName('');
        setDescription('');
        setPrimaryRole('');
        setInteractionGoal('');
        
        // Close the form and notify parent component
        onClose();
        onPersonaCreated();
        
        // Show success message
        Alert.alert('Success', `"${name}" persona created successfully!`);
      } else {
        setIsCreating(false);
        Alert.alert('Error', 'Failed to create custom persona. Please try again.');
      }
    } catch (error) {
      setIsCreating(false);
      Alert.alert('Error', 'Failed to create custom persona. Please try again.');
    }
  };
  
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0]
  });
  
  return (
    <Modal
      visible={visible}
      animationType="none" // We'll handle our own animation
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}/>
        </TouchableWithoutFeedback>
        
        <Animated.View 
          style={[
            styles.formContainer,
            {
              transform: [{ translateY }],
              maxHeight: keyboardVisible ? height * 0.8 : height * 0.9
            }
          ]}
        >
          <View style={styles.headerBar} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Custom Persona</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.infoText}>
              Create your own custom AI personality that responds exactly how you want.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="My Custom Assistant"
                maxLength={30}
                autoCapitalize="words"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description of your assistant"
                maxLength={60}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Primary Role</Text>
              <Text style={styles.inputHelper}>
                Define specific AI assistant role (e.g., "Football Coach", "Creative Writing Partner")
              </Text>
              <TextInput
                style={styles.input}
                value={primaryRole}
                onChangeText={setPrimaryRole}
                placeholder="Football Coach, Python Mentor, etc."
                maxLength={50}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Interaction Goal</Text>
              <Text style={styles.inputHelper}>
                Define measurable outcome (e.g., "Develop winning strategies", "Debug code with explanations")
              </Text>
              <TextInput
                style={styles.input}
                value={interactionGoal}
                onChangeText={setInteractionGoal}
                placeholder="Develop winning strategies, explain complex topics, etc."
                maxLength={50}
              />
            </View>
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreatePersona}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.createButtonText}>Create Persona</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    margin: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  formContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    position: 'relative',
  },
  headerBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
    lineHeight: 30,
    includeFontPadding: false,
  },
  scrollContainer: {
    maxHeight: height * 0.7,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputHelper: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 46,
  },
  createButton: {
    backgroundColor: '#e14f29',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#e14f29',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 56,
    justifyContent: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CustomPersonaForm; 