import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import RNFS from 'react-native-fs';
import { downloadModel } from '../api/model';
import ProgressBar from '../components/ProgressBar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MODEL_FILENAME, MODEL_REPO } from '../utils/modelUtils';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Chat: { selectedModel: string };
  ModelSelection: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ModelSelection'>;
};

const ModelSelectionScreen = ({ navigation }: Props) => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isModelDownloaded, setIsModelDownloaded] = useState<boolean>(false);
  
  // Animation values
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const windAnim = useRef(new Animated.Value(0)).current;
  const windOpacity = useRef(new Animated.Value(0.7)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressColorAnim = useRef(new Animated.Value(0)).current;
  
  // Fun messages for different progress stages
  const downloadMessages = [
    { threshold: 0, message: "Initializing my neural pathways..." },
    { threshold: 20, message: "Loading my personality circuits..." },
    { threshold: 40, message: "Teaching me how to understand humans..." },
    { threshold: 60, message: "Downloading creativity modules..." },
    { threshold: 80, message: "Almost there! Polishing my knowledge base..." },
    { threshold: 100, message: "Brain fully loaded! Ready to assist you!" },
  ];
  
  // Get the appropriate message based on current progress
  const getCurrentMessage = useMemo(() => {
    for (let i = downloadMessages.length - 1; i >= 0; i--) {
      if (progress >= downloadMessages[i].threshold) {
        return downloadMessages[i].message;
      }
    }
    return downloadMessages[0].message;
  }, [progress]);
  
  // Check download status whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkDownloadStatus();
      return () => {};
    }, [])
  );
  
  useEffect(() => {
    startAnimation();
  }, []);
  
  useEffect(() => {
    if (isDownloading) {
      // Start pulsing animation for brain icon during download
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Animate progress color based on progress value
      Animated.timing(progressColorAnim, {
        toValue: progress / 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isDownloading, progress]);
  
  // Start floating and rotating animations
  const startAnimation = () => {
    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Slight rotation animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Wind animation (horizontal movement)
    Animated.loop(
      Animated.sequence([
        Animated.timing(windAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(windAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Wind opacity pulsing
    Animated.loop(
      Animated.sequence([
        Animated.timing(windOpacity, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(windOpacity, {
          toValue: 0.6,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkDownloadStatus = async () => {
    try {
      // Check if model exists directly without using the utility function
      const destPath = `${RNFS.DocumentDirectoryPath}/${MODEL_FILENAME}`;
      const fileExists = await RNFS.exists(destPath);
      
      if (fileExists) {
        const stats = await RNFS.stat(destPath);
        // Check if file size is reasonable (more than 100MB)
        if (stats.size > 100 * 1024 * 1024) {
          setIsModelDownloaded(true);
        } else {
          setIsModelDownloaded(false);
        }
      } else {
        setIsModelDownloaded(false);
      }
    } catch (error) {
      console.error('Error checking download status:', error);
      setIsModelDownloaded(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setProgress(0);

    try {
      const downloadUrl = `https://huggingface.co/${MODEL_REPO}/resolve/main/${MODEL_FILENAME}`;
      const destPath = `${RNFS.DocumentDirectoryPath}/${MODEL_FILENAME}`;
      
      // Check if already exists
      const fileExists = await RNFS.exists(destPath);
      if (fileExists) {
        // Navigate directly if already downloaded
        navigation.navigate('Chat', { selectedModel: MODEL_FILENAME });
        return;
      }

      // Start download
      await downloadModel(MODEL_FILENAME, downloadUrl, (progress) => setProgress(progress));
      
      Alert.alert(
        'Download Complete',
        'Ready to chat! Let\'s get started.',
        [{ text: 'Let\'s Go', onPress: () => navigation.navigate('Chat', { selectedModel: MODEL_FILENAME }) }]
      );
      
      setIsModelDownloaded(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Download Error', `Failed to download: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const startChat = () => {
    navigation.navigate('Chat', { selectedModel: MODEL_FILENAME });
  };
  
  // Calculate animation transforms
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15], // Move up and down by 15 pixels
  });
  
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-3deg', '3deg'], // Slight rotation for a "flying" effect
  });
  
  const windTranslateX = windAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8], // Subtle horizontal movement
  });
  
  // Interpolate progress color from orange to green
  const progressBarColor = progressColorAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#e14f29', '#e6a23c', '#67c23a'],
  });

  // Calculate the height of the main content area based on whether we're downloading
  // This ensures content doesn't get pushed up too much
  const contentContainerHeight = isDownloading 
    ? Math.max(height * 0.75, 500) 
    : Math.max(height * 0.85, 550);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { height: contentContainerHeight }]}>
        {/* Modern greeting header */}
        <View style={styles.greetingContainer}>
          <Text style={styles.smallGreetingText}>Don't Worry</Text>
          <Text style={styles.largeGreetingText}>DHI IS ALMOST READY</Text>
        </View>
        
        {/* Animated robot image with wind effect */}
        <View style={[styles.flyingContainer, isDownloading && styles.flyingContainerSmaller]}>
          {/* Left wind animation */}
          <Animated.View 
            style={[
              styles.windImageLeft,
              {
                transform: [{ translateX: windTranslateX }],
                opacity: windOpacity
              }
            ]}
          >
            <Image 
              source={require('../../assets/wind.png')} 
              style={styles.windImage}
              resizeMode="contain"
            />
          </Animated.View>
          
          {/* Flying robot */}
          <Animated.View 
            style={[
              styles.imageContainer,
              { 
                transform: [
                  { translateY },
                  { rotate }
                ] 
              }
            ]}
          >
            <Image 
              source={require('../../assets/modelselection.png')} 
              style={styles.image}
              resizeMode="contain"
            />
          </Animated.View>
          
          {/* Right wind animation */}
          <Animated.View 
            style={[
              styles.windImageRight,
              {
                transform: [{ translateX: Animated.multiply(windTranslateX, -1) }],
                opacity: windOpacity
              }
            ]}
          >
            <Image 
              source={require('../../assets/wind.png')} 
              style={[styles.windImage, { transform: [{ scaleX: -1 }] }]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
        
        <Text style={[styles.message, isDownloading && styles.messageSmaller]}>
          {isModelDownloaded ? "My brain is ready on your device." : "I need to download my brain to your device."}
        </Text>
        
        <Text style={[styles.details, isDownloading && styles.detailsSmaller]}>
          {isModelDownloaded 
            ? "Let's start a conversation using the AI power already on your device."
            : "Get my AI brainpower for seamless conversations, even offline."}
        </Text>
        
        {isDownloading ? (
          <View style={styles.downloadingContainer}>
            {/* Brain image */}
            <Animated.View 
              style={[
                styles.brainIconContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Image 
                source={require('../../assets/Dhibrain.png')} 
                style={styles.brainImage}
                resizeMode="contain"
              />
            </Animated.View>
            
            <View style={styles.downloadingTextContainer}>
              <Text style={styles.downloadingText}>
                {Math.floor(progress)}% Complete
              </Text>
              
              <Text style={styles.downloadingMessage}>
                {getCurrentMessage}
              </Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${progress}%`,
                    backgroundColor: progressBarColor
                  }
                ]} 
              />
            </View>
            
            <Text style={styles.downloadingSubtext}>Keep the app open while I load my knowledge!</Text>
          </View>
        ) : (
          isModelDownloaded ? (
            <TouchableOpacity style={styles.chatButton} onPress={startChat}>
              <View style={styles.downloadButtonContent}>
                <Text style={styles.buttonText}>Let's Chat</Text>
                <Text style={styles.downloadSize}>My brain is ready</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
              <View style={styles.downloadButtonContent}>
                <Text style={styles.buttonText}>Download</Text>
                <Text style={styles.downloadSize}>(1.3GB)</Text>
              </View>
            </TouchableOpacity>
          )
        )}
        
        {!isDownloading && !isModelDownloaded && (
          <Text style={styles.disclaimer}>
            Requires WiFi and storage space on your device
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: Math.max(20, width * 0.05),
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingContainer: {
    marginBottom: height * 0.03,
    paddingHorizontal: width * 0.06,
    paddingVertical: height * 0.02,
    borderRadius: 30,
    backgroundColor: 'rgba(225, 79, 41, 0.1)',
    alignItems: 'center',
    shadowColor: 'rgba(225, 79, 41, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: Math.min(340, width * 0.9),
  },
  smallGreetingText: {
    color: '#e14f29',
    fontSize: Math.min(16, width * 0.04),
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '500',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  largeGreetingText: {
    color: '#e14f29',
    fontSize: Math.min(26, width * 0.065),
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed',
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(225, 79, 41, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: 2,
    marginBottom: 2,
  },
  flyingContainer: {
    width: width * 0.9,
    height: Math.min(250, height * 0.3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height * 0.03,
    position: 'relative',
  },
  flyingContainerSmaller: {
    height: Math.min(200, height * 0.24),
    marginBottom: height * 0.02,
  },
  imageContainer: {
    width: Math.min(280, width * 0.6),
    height: Math.min(230, height * 0.28),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  windImageLeft: {
    position: 'absolute',
    left: 0,
    width: width * 0.25,
    height: height * 0.15,
    zIndex: 1,
  },
  windImageRight: {
    position: 'absolute',
    right: 0,
    width: width * 0.25,
    height: height * 0.15,
    zIndex: 1,
  },
  windImage: {
    width: '100%',
    height: '100%',
  },
  message: {
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    fontSize: Math.min(20, width * 0.05),
    textAlign: 'center',
    marginBottom: height * 0.015,
    lineHeight: Math.min(28, width * 0.07),
    color: '#333',
    letterSpacing: 0.3,
  },
  messageSmaller: {
    fontSize: Math.min(18, width * 0.045),
    marginBottom: height * 0.01,
  },
  details: {
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontSize: Math.min(16, width * 0.04),
    textAlign: 'center',
    marginBottom: height * 0.03,
    color: '#666',
    lineHeight: Math.min(22, width * 0.055),
    maxWidth: width * 0.8,
  },
  detailsSmaller: {
    fontSize: Math.min(14, width * 0.035),
    marginBottom: height * 0.02,
  },
  downloadButton: {
    backgroundColor: '#e14f29',
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.08,
    borderRadius: 50,
    width: Math.min(300, width * 0.7),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chatButton: {
    backgroundColor: '#2e8b57', // Sea green color for "Let's Chat" button
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.08,
    borderRadius: 50,
    width: Math.min(300, width * 0.7),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadButtonContent: {
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  downloadSize: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Math.min(14, width * 0.035),
    marginTop: 4,
  },
  downloadingContainer: {
    width: Math.min(350, width * 0.85),
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.02,
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  brainIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#e14f29',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  brainImage: {
    width: '90%',
    height: '90%',
  },
  downloadingTextContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  downloadingText: {
    fontSize: Math.min(20, width * 0.05),
    marginBottom: 4,
    color: '#333',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  downloadingMessage: {
    fontSize: Math.min(15, width * 0.038),
    color: '#e14f29',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  progressBarContainer: {
    width: '90%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#e14f29',
    borderRadius: 4,
  },
  downloadingSubtext: {
    fontSize: Math.min(13, width * 0.033),
    color: '#666',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  disclaimer: {
    fontSize: Math.min(14, width * 0.035),
    color: '#999',
    textAlign: 'center',
    marginTop: height * 0.02,
    maxWidth: width * 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  }
});

export default ModelSelectionScreen;