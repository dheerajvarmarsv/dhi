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
import RNFS from 'react-native-fs';
import { COLORS, FONTS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

type PersonaSelectorProps = {
  visible: boolean;
  onClose: () => void;
  selectedPersonaId: string;
  onSelectPersona: (personaId: string, resetHistory?: boolean) => void;
  hasConversationHistory: boolean;
};

const PersonaSelector = ({
  visible,
  onClose,
  selectedPersonaId,
  onSelectPersona,
  hasConversationHistory
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
  
  const handlePersonaSelect = (personaId: string) => {
    // If current persona is different and we have conversation history
    if (personaId !== selectedPersonaId && hasConversationHistory) {
      Alert.alert(
        'Change Persona',
        'Changing personas will affect how messages are interpreted. Would you like to keep the conversation history or start fresh?',
        [
          {
            text: 'Keep History',
            onPress: () => {
              onSelectPersona(personaId, false);
              onClose();
            }
          },
          {
            text: 'Start Fresh',
            style: 'destructive',
            onPress: () => {
              onSelectPersona(personaId, true);
              onClose();
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } else {
      // If no history or same persona, just change
      onSelectPersona(personaId, false);
      onClose();
    }
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
                  onSelectPersona('general', true);
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
  
  // Add a helper function to get the image source based on the icon path
  const getImageSource = (iconPath: string | undefined) => {
    if (!iconPath) return require('../../assets/understand.png');
    
    // Map icon paths to require statements
    const iconMap: {[key: string]: any} = {
      'understand.png': require('../../assets/understand.png'),
      'analyse.png': require('../../assets/analyse.png'),
      'write.png': require('../../assets/write.png'),
      'modelselection.png': require('../../assets/modelselection.png'),
      'justtalkorvent.png': require('../../assets/justtalkorvent.png'),
      'ideas.png': require('../../assets/ideas.png'),
      'custom2.png': require('../../assets/custom2.png'),
      'custom3.png': require('../../assets/custom3.png'),
      'custom5.png': require('../../assets/custom5.png'),
      'custom6.png': require('../../assets/custom6.png'),
      'custom7.png': require('../../assets/custom7.png'),
      'custom8.png': require('../../assets/custom8.png'),
      'custom9.png': require('../../assets/custom9.png'),
      'custom10.png': require('../../assets/custom10.png'),
      'custom11.png': require('../../assets/custom11.png'),
    };
    
    return iconMap[iconPath] || require('../../assets/understand.png');
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
                  <ActivityIndicator size="large" color={COLORS.primary} />
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
                        onPress={() => handlePersonaSelect(persona.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.personaIconContainer}>
                          {persona.iconPath ? (
                            <Image 
                              source={getImageSource(persona.iconPath)}
                              style={styles.personaIconImage}
                            />
                          ) : (
                            <Text style={styles.personaIcon}>?</Text>
                          )}
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
                              onPress={() => handlePersonaSelect(persona.id)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.personaIconContainer, styles.customPersonaIconContainer]}>
                                {persona.iconPath ? (
                                  <Image 
                                    source={getImageSource(persona.iconPath)}
                                    style={styles.personaIconImage}
                                  />
                                ) : (
                                  <Text style={styles.personaIcon}>?</Text>
                                )}
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.8,
    paddingTop: 8,
  },
  headerBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Math.min(16, width * 0.04),
    paddingVertical: Math.min(12, height * 0.015),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerTitle: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  closeButton: {
    position: 'absolute',
    right: Math.min(16, width * 0.04),
    width: Math.min(40, width * 0.1),
    height: Math.min(40, width * 0.1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: Math.min(28, width * 0.07),
    color: COLORS.text,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: Math.min(16, width * 0.04),
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  personaList: {
    flex: 1,
  },
  personaListContent: {
    paddingHorizontal: Math.min(16, width * 0.04),
    paddingBottom: Math.min(24, height * 0.03),
  },
  sectionTitle: {
    fontSize: Math.min(16, width * 0.04),
    fontWeight: '600',
    color: COLORS.text,
    marginTop: Math.min(16, height * 0.02),
    marginBottom: Math.min(12, height * 0.015),
    fontFamily: FONTS.primary,
  },
  customSectionTitle: {
    marginTop: Math.min(24, height * 0.03),
  },
  personaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Math.min(12, width * 0.03),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: Math.min(12, height * 0.015),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedPersona: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primaryLight}10`,
  },
  customPersonaItem: {
    flex: 1,
    marginRight: Math.min(8, width * 0.02),
  },
  customPersonaItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Math.min(12, height * 0.015),
  },
  personaIconContainer: {
    width: Math.min(48, width * 0.12),
    height: Math.min(48, width * 0.12),
    borderRadius: Math.min(24, width * 0.06),
    backgroundColor: `${COLORS.primaryLight}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Math.min(12, width * 0.03),
  },
  customPersonaIconContainer: {
    backgroundColor: `${COLORS.primaryLight}10`,
  },
  personaIconImage: {
    width: '60%',
    height: '60%',
    resizeMode: 'contain',
  },
  personaIcon: {
    fontSize: Math.min(24, width * 0.06),
    color: COLORS.primary,
    fontWeight: '600',
  },
  personaInfo: {
    flex: 1,
  },
  personaName: {
    fontSize: Math.min(16, width * 0.04),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    fontFamily: FONTS.primary,
  },
  personaDescription: {
    fontSize: Math.min(14, width * 0.035),
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
  },
  deleteButton: {
    width: Math.min(32, width * 0.08),
    height: Math.min(32, width * 0.08),
    borderRadius: Math.min(16, width * 0.04),
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  deleteButtonText: {
    fontSize: Math.min(20, width * 0.05),
    color: '#FFFFFF',
    fontWeight: '400',
  },
});

export default PersonaSelector; 