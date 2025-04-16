import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import axios from 'axios';
import RNFS from 'react-native-fs';
import { downloadModel } from '../api/model';
import ProgressBar from '../components/ProgressBar';
import { COLORS } from '../constants/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Chat: { selectedModel: string };
  ModelSelection: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ModelSelection'>;
};

const ModelSelectionScreen = ({ navigation }: Props) => {
  const [selectedModelFormat, setSelectedModelFormat] = useState<string>('');
  const [selectedGGUF, setSelectedGGUF] = useState<string | null>(null);
  const [availableGGUFs, setAvailableGGUFs] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);

  // Updated model formats to include Gemma 3 and Llama 3.2 3B
  const modelFormats = [
    { label: 'Llama-3.2-1B-Instruct' },
    { label: 'Llama-3.2-3B-Instruct' },  // Added Llama 3.2 3B
    { label: 'Gemma-3-1B-Instruct' },    // Added Gemma 3 1B
    { label: 'Gemma-3-4B-Instruct' },    // Added Gemma 3 4B
    { label: 'Qwen2-0.5B-Instruct' },
    { label: 'DeepSeek-R1-Distill-Qwen-1.5B' },
    { label: 'SmolLM2-1.7B-Instruct' },
  ];

  const HF_TO_GGUF = {
    'Llama-3.2-1B-Instruct': 'medmekk/Llama-3.2-1B-Instruct.GGUF',
    'Llama-3.2-3B-Instruct': 'lmstudio-community/Llama-3.2-3B-Instruct-GGUF', // Updated to a more reliable repository
    'Gemma-3-1B-Instruct': 'litert-community/Gemma3-1B-IT',                     // More reliable Gemma 3 1B repository
    'Gemma-3-4B-Instruct': 'unsloth/gemma-3-4b-it-GGUF',                     // Fixed Gemma 3 4B repository
    'DeepSeek-R1-Distill-Qwen-1.5B': 'medmekk/DeepSeek-R1-Distill-Qwen-1.5B.GGUF',
    'Qwen2-0.5B-Instruct': 'medmekk/Qwen2.5-0.5B-Instruct.GGUF',
    'SmolLM2-1.7B-Instruct': 'medmekk/SmolLM2-1.7B-Instruct.GGUF',
  };

  useEffect(() => {
    checkDownloadedModels();
  }, []);

  const checkDownloadedModels = async () => {
    try {
      const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
      const ggufFiles = files
        .filter((file) => file.name.endsWith('.gguf'))
        .map((file) => file.name);
      setDownloadedModels(ggufFiles);
    } catch (error) {
      console.error('Error checking downloaded models:', error);
    }
  };

  const fetchAvailableGGUFs = async (modelFormat: string) => {
    setIsFetching(true);
    try {
      const response = await axios.get(
        `https://huggingface.co/api/models/${
          HF_TO_GGUF[modelFormat as keyof typeof HF_TO_GGUF]
        }`
      );
      
      const files = response.data.siblings.filter((file: any) =>
        file.rfilename.endsWith('.gguf')
      );
      setAvailableGGUFs(files.map((file: any) => file.rfilename));
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to fetch .gguf files from Hugging Face API.'
      );
    } finally {
      setIsFetching(false);
    }
  };

  const handleFormatSelection = (format: string) => {
    setSelectedModelFormat(format);
    setAvailableGGUFs([]); // Clear any previous list
    fetchAvailableGGUFs(format); // Fetch .gguf files for selected format
  };

  const handleGGUFSelection = (file: string) => {
    setSelectedGGUF(file);
    Alert.alert(
      'Confirm Download',
      `Do you want to download ${file} ?`,
      [
        {
          text: 'No',
          onPress: () => setSelectedGGUF(null),
          style: 'cancel',
        },
        { text: 'Yes', onPress: () => handleDownloadAndNavigate(file) },
      ],
      { cancelable: false }
    );
  };

  const handleDownloadAndNavigate = async (file: string) => {
    await handleDownloadModel(file);
    navigation.navigate('Chat', { selectedModel: file });
  };

  const handleDownloadModel = async (file: string) => {
    const downloadUrl = `https://huggingface.co/${
      HF_TO_GGUF[selectedModelFormat as keyof typeof HF_TO_GGUF]
    }/resolve/main/${file}`;
    setIsDownloading(true);
    setProgress(0);

    const destPath = `${RNFS.DocumentDirectoryPath}/${file}`;
    const fileExists = await RNFS.exists(destPath);
    
    if (fileExists) {
      Alert.alert(
        'Info',
        `File ${file} already exists, we will load it directly.`
      );
      setIsDownloading(false);
      navigation.navigate('Chat', { selectedModel: file });
      return;
    }

    try {
      const filePath = await downloadModel(file, downloadUrl, (progress) =>
        setProgress(progress)
      );
      await checkDownloadedModels();
      Alert.alert('Success', `Model downloaded successfully!`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Download failed: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Llama Chat</Text>
        
        {!isDownloading && (
          <View style={styles.card}>
            <Text style={styles.subtitle}>Choose a model format</Text>
            {modelFormats.map((format) => (
              <TouchableOpacity
                key={format.label}
                style={[
                  styles.button,
                  selectedModelFormat === format.label &&
                    styles.selectedButton,
                ]}
                onPress={() => handleFormatSelection(format.label)}
              >
                <Text style={styles.buttonText}>{format.label}</Text>
              </TouchableOpacity>
            ))}
            
            {selectedModelFormat && (
              <View>
                <Text style={styles.subtitle}>Select a .gguf file</Text>
                {isFetching && (
                  <ActivityIndicator size="small" color="#2563EB" />
                )}
                {availableGGUFs.map((file, index) => {
                  const isDownloaded = downloadedModels.includes(file);
                  return (
                    <View key={index} style={styles.modelContainer}>
                      <TouchableOpacity
                        style={[
                          styles.modelButton,
                          selectedGGUF === file && styles.selectedButton,
                          isDownloaded && styles.downloadedModelButton,
                        ]}
                        onPress={() =>
                          isDownloaded
                            ? navigation.navigate('Chat', { selectedModel: file })
                            : handleGGUFSelection(file)
                        }
                      >
                        <View style={styles.modelButtonContent}>
                          <View style={styles.modelStatusContainer}>
                            {isDownloaded ? (
                              <View style={styles.downloadedIndicator}>
                                <Text style={styles.downloadedIcon}>▼</Text>
                              </View>
                            ) : (
                              <View style={styles.notDownloadedIndicator}>
                                <Text style={styles.notDownloadedIcon}>
                                  ▽
                                </Text>
                              </View>
                            )}
                            <Text
                              style={[
                                styles.buttonTextGGUF,
                                selectedGGUF === file &&
                                  styles.selectedButtonText,
                                isDownloaded && styles.downloadedText,
                              ]}
                            >
                              {file}
                            </Text>
                          </View>
                          {isDownloaded && (
                            <View style={styles.loadModelIndicator}>
                              <Text style={styles.loadModelText}>
                                TAP TO LOAD →
                              </Text>
                            </View>
                          )}
                          {!isDownloaded && (
                            <View style={styles.downloadIndicator}>
                              <Text style={styles.downloadText}>
                                DOWNLOAD →
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
        
        {isDownloading && (
          <View style={styles.card}>
            <Text style={styles.subtitle}>Downloading: </Text>
            <Text style={styles.subtitle2}>{selectedGGUF}</Text>
            <ProgressBar progress={progress} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginVertical: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    shadowColor: '#475569',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
    marginTop: 16,
  },
  subtitle2: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    color: '#93C5FD',
  },
  button: {
    backgroundColor: '#93C5FD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: '#93C5FD',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedButton: {
    backgroundColor: '#2563EB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modelContainer: {
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modelButton: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadedModelButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  modelButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  downloadedIndicator: {
    backgroundColor: '#DBEAFE',
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  notDownloadedIndicator: {
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  downloadedIcon: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  notDownloadedIcon: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  downloadedText: {
    color: '#1E40AF',
  },
  loadModelIndicator: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  loadModelText: {
    color: '#3B82F6',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  downloadIndicator: {
    backgroundColor: '#DCF9E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  downloadText: {
    color: '#16A34A',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonTextGGUF: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ModelSelectionScreen;