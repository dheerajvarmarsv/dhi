import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { promptTemplates, PromptTemplate } from '../utils/promptTemplates';

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
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Persona</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.personaList}>
            {promptTemplates.map((persona) => (
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
              >
                <View style={styles.personaIconContainer}>
                  <Text style={styles.personaIcon}>{persona.icon}</Text>
                </View>
                <View style={styles.personaInfo}>
                  <Text style={styles.personaName}>{persona.name}</Text>
                  <Text style={styles.personaDescription}>{persona.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
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
    height: '75%',
    paddingBottom: 20,
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
    fontWeight: 'bold',
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  personaList: {
    padding: 16,
  },
  personaItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
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
  personaIcon: {
    fontSize: 24,
  },
  personaInfo: {
    flex: 1,
  },
  personaName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  personaDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default PersonaSelector; 