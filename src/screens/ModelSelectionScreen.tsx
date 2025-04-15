import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ModelSelection'>;

const QUANTIZATION_FORMATS = {
  standard: [
    "Q2_K", "Q3_K_S", "Q3_K_M", "Q3_K_L", "Q4_0", 
    "Q4_K_S", "Q4_K_M", "Q5_0", "Q5_K_S", "Q5_K_M",
    "Q6_K", "Q8_0"
  ],
  imatrix: [
    "IQ3_M", "IQ3_XXS", "Q4_K_M", "Q4_K_S", 
    "IQ4_NL", "IQ4_XS", "Q5_K_M", "Q5_K_S"
  ]
};

const ModelSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

  const models = [
    'Llama-3.2-1B-Instruct',
    'Qwen2-0.5B-Instruct',
    'DeepSeek-R1-Distill-Qwen-1.5B',
    'SmolLM2-1.7B-Instruct'
  ];

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    setSelectedFormat(null);
  };

  const handleFormatSelect = (format: string) => {
    setSelectedFormat(format);
  };

  const handleDownload = () => {
    if (!selectedModel || !selectedFormat) {
      Alert.alert('Selection Required', 'Please select both a model and a format');
      return;
    }
    
    navigation.navigate('Download', {
      selectedModel,
      quantFormat: selectedFormat
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Llama Chat</Text>
        
        <View style={styles.modelSection}>
          <Text style={styles.sectionTitle}>Choose a model</Text>
          
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modelsContainer}
          >
            {models.map((model, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.modelButton,
                  selectedModel === model && styles.selectedButton
                ]}
                onPress={() => handleModelSelect(model)}
              >
                <Text style={[
                  styles.modelButtonText,
                  selectedModel === model && styles.selectedText
                ]}>{model}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedModel && (
          <View style={styles.formatSection}>
            <Text style={styles.sectionTitle}>Select quantization format</Text>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formatsContainer}
            >
              <View style={styles.formatGroup}>
                <Text style={styles.formatGroupTitle}>Standard Formats</Text>
                {QUANTIZATION_FORMATS.standard.map((format, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.formatButton,
                      selectedFormat === format && styles.selectedButton
                    ]}
                    onPress={() => handleFormatSelect(format)}
                  >
                    <Text style={[
                      styles.formatButtonText,
                      selectedFormat === format && styles.selectedText
                    ]}>{format}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formatGroup}>
                <Text style={styles.formatGroupTitle}>IMatrix Formats</Text>
                {QUANTIZATION_FORMATS.imatrix.map((format, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.formatButton,
                      selectedFormat === format && styles.selectedButton
                    ]}
                    onPress={() => handleFormatSelect(format)}
                  >
                    <Text style={[
                      styles.formatButtonText,
                      selectedFormat === format && styles.selectedText
                    ]}>{format}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.downloadButton,
            (!selectedModel || !selectedFormat) && styles.disabledButton
          ]}
          onPress={handleDownload}
          disabled={!selectedModel || !selectedFormat}
        >
          <Text style={styles.downloadButtonText}>Download & Quantize</Text>
        </TouchableOpacity>
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
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1B2559',
    marginBottom: 40,
    marginTop: 20,
  },
  modelSection: {
    flex: 1,
  },
  formatSection: {
    flex: 1,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1B2559',
    marginBottom: 20,
  },
  modelsContainer: {
    paddingVertical: 10,
  },
  formatGroup: {
    marginBottom: 20,
  },
  formatGroupTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1B2559',
    marginBottom: 10,
  },
  formatsContainer: {
    paddingVertical: 10,
  },
  modelButton: {
    backgroundColor: '#E7EDFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  formatButton: {
    backgroundColor: '#E7EDFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#2563EB',
  },
  modelButtonText: {
    fontSize: 18,
    color: '#1B2559',
    fontWeight: '500',
  },
  formatButtonText: {
    fontSize: 16,
    color: '#1B2559',
    fontWeight: '500',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  downloadButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    opacity: 0.5,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ModelSelectionScreen; 