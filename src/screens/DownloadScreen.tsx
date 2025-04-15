import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  NativeModules,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../constants/theme';
import RNFS from 'react-native-fs';

type Props = NativeStackScreenProps<RootStackParamList, 'Download'>;

interface DownloadProgress {
  phase: 'preparing' | 'downloading' | 'converting' | 'quantizing' | 'complete';
  progress: number;
  message: string;
}

// Update the route params type to include quantFormat
type DownloadScreenParams = {
  selectedModel: string;
  quantFormat: string;
};

const { PythonBridge } = NativeModules;

const DownloadScreen: React.FC<NativeStackScreenProps<RootStackParamList, 'Download'>> = ({ route, navigation }) => {
  const { selectedModel, quantFormat } = route.params as DownloadScreenParams;
  const [downloadState, setDownloadState] = useState<DownloadProgress>({
    phase: 'preparing',
    progress: 0,
    message: 'Preparing to download...',
  });

  useEffect(() => {
    const processModel = async () => {
      try {
        // Create necessary directories
        const modelDir = `${RNFS.DocumentDirectoryPath}/models/${selectedModel}`;
        await RNFS.mkdir(modelDir);

        // Download and process the model
        setDownloadState({
          phase: 'downloading',
          progress: 0,
          message: 'Downloading model...',
        });

        try {
          await PythonBridge.downloadModel(selectedModel, modelDir);
          
          setDownloadState({
            phase: 'converting',
            progress: 33,
            message: 'Converting to FP16...',
          });

          await PythonBridge.convertToFP16(selectedModel, modelDir);

          setDownloadState({
            phase: 'quantizing',
            progress: 66,
            message: 'Quantizing model...',
          });

          await PythonBridge.quantizeModel(selectedModel, modelDir, quantFormat);

          setDownloadState({
            phase: 'complete',
            progress: 100,
            message: 'Model processing complete!',
          });

          Alert.alert(
            'Success',
            'Model has been successfully downloaded and processed.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } catch (error: any) {
          throw new Error(`Failed to process model: ${error.message}`);
        }
      } catch (error: any) {
        console.error('Error processing model:', error);
        Alert.alert(
          'Error',
          'Failed to process the model. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };

    processModel();
  }, [selectedModel, quantFormat, navigation]);

  const getProgressBarWidth = () => {
    switch (downloadState.phase) {
      case 'preparing': return '0%';
      case 'downloading': return '30%';
      case 'converting': return '60%';
      case 'quantizing': return '90%';
      case 'complete': return '100%';
      default: return '0%';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.white,
    },
    content: {
      flex: 1,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: COLORS.primary,
      marginBottom: 8,
    },
    modelName: {
      fontSize: 18,
      color: COLORS.gray,
      marginBottom: 40,
    },
    progressContainer: {
      alignItems: 'center',
      width: '100%',
      marginBottom: 20,
    },
    progressBar: {
      width: '100%',
      height: 8,
      backgroundColor: '#E2E8F0',
      borderRadius: 4,
      marginBottom: 20,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: COLORS.primary,
      borderRadius: 4,
    },
    progressText: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.primary,
      marginTop: 10,
    },
    progressPhase: {
      fontSize: 14,
      color: COLORS.gray,
      marginTop: 4,
    },
    description: {
      fontSize: 16,
      color: COLORS.gray,
      textAlign: 'center',
      marginTop: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Processing Model</Text>
        <Text style={styles.modelName}>{selectedModel}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: getProgressBarWidth() }
              ]} 
            />
          </View>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.progressText}>{downloadState.message}</Text>
          <Text style={styles.progressPhase}>Phase: {downloadState.phase}</Text>
        </View>
        
        <Text style={styles.description}>
          This process may take several minutes depending on your device performance
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default DownloadScreen; 