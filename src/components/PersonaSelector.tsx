import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { promptTemplates, PromptTemplate, getAllPersonas } from '../utils/promptTemplates';
import { deleteCustomPersona } from '../utils/customPersonaStorage';
import CreatePersonaButton from './CreatePersonaButton';

const { height } = Dimensions.get('window');

type PersonaSelectorProps = {
  visible: boolean;
  onClose: () => void;
  selectedPersonaId: string;
  onSelectPersona: (personaId: string) => void;
};

const PersonaSelector = ({
  visible,
  onClose,
  selectedPersonaId,
  onSelectPersona
}: PersonaSelectorProps) => {
  const [personas, setPersonas] = useState<PromptTemplate[]>(promptTemplates);
  const [loading, setLoading] = useState(false);
  
  // Load all personas when the selector becomes visible
  useEffect(() => {
    if (visible) {
      loadPersonas();
    }
  }, [visible]);
  
  const loadPersonas = async () => {
    setLoading(true);
    try {
      const allPersonas = await getAllPersonas();
      setPersonas(allPersonas);
    } catch (error) {
      console.error('Error loading personas:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePersonaCreated = () => {
    // Reload personas after creating a new one
    loadPersonas();
  };
  
  const handleDeletePersona = (personaId: string, personaName: string) => {
    // Confirm deletion
    Alert.alert(
      'Delete Custom Persona',
      `Are you sure you want to delete "${personaName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await deleteCustomPersona(personaId);
              if (success) {
                // If the deleted persona was selected, switch to default
                if (selectedPersonaId === personaId) {
                  onSelectPersona('general');
                }
                
                // Reload personas
                await loadPersonas();
              } else {
                Alert.alert('Error', 'Failed to delete persona. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting persona:', error);
              Alert.alert('Error', 'Failed to delete persona. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.headerBar} />
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Persona</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              
              <CreatePersonaButton onPersonaCreated={handlePersonaCreated} />
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#e14f29" />
                  <Text style={styles.loadingText}>Loading personas...</Text>
                </View>
              ) : (
                <ScrollView 
                  style={styles.personaList}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.personaListContent}
                >
                  <Text style={styles.sectionTitle}>Built-in Personas</Text>
                  {/* Built-in personas */}
                  {personas
                    .filter(persona => !persona.isCustom)
                    .map((persona) => (
                      <TouchableOpacity
                        key={persona.id}
                        style={[
                          styles.personaItem,
                          selectedPersonaId === persona.id && styles.selectedPersona
                        ]}
                        onPress={() => {
                          onSelectPersona(persona.id);
                          onClose();
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.personaIconContainer}>
                          <Text style={styles.personaIcon}>{persona.icon}</Text>
                        </View>
                        <View style={styles.personaInfo}>
                          <Text style={styles.personaName}>{persona.name}</Text>
                          <Text style={styles.personaDescription}>{persona.description}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  }
                  
                  {/* Custom personas section */}
                  {personas.some(persona => persona.isCustom) && (
                    <>
                      <Text style={[styles.sectionTitle, styles.customSectionTitle]}>
                        Your Custom Personas
                      </Text>
                      
                      {personas
                        .filter(persona => persona.isCustom)
                        .map((persona) => (
                          <View key={persona.id} style={styles.customPersonaItemContainer}>
                            <TouchableOpacity
                              style={[
                                styles.personaItem,
                                styles.customPersonaItem,
                                selectedPersonaId === persona.id && styles.selectedPersona
                              ]}
                              onPress={() => {
                                onSelectPersona(persona.id);
                                onClose();
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.personaIconContainer, styles.customPersonaIconContainer]}>
                                <Text style={styles.personaIcon}>{persona.icon}</Text>
                              </View>
                              <View style={styles.personaInfo}>
                                <Text style={styles.personaName}>{persona.name}</Text>
                                <Text style={styles.personaDescription}>{persona.description}</Text>
                              </View>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleDeletePersona(persona.id, persona.name)}
                              activeOpacity={0.7}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Text style={styles.deleteButtonText}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ))
                      }
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
  },
  closeButtonText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#666',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  personaList: {
    maxHeight: height * 0.7,
  },
  personaListContent: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  customSectionTitle: {
    marginTop: 20,
  },
  personaItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
  },
  customPersonaItemContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  customPersonaItem: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.2)',
  },
  selectedPersona: {
    backgroundColor: '#e8f4ff',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  personaIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customPersonaIconContainer: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  personaIcon: {
    fontSize: 24,
  },
  personaInfo: {
    flex: 1,
  },
  personaName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  personaDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  deleteButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 2,
    padding: 0,
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 20,
    includeFontPadding: false,
    marginTop: -1,
  },
});

export default PersonaSelector; 