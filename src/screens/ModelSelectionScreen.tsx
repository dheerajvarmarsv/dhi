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
import { COLORS, FONTS } from '../constants/theme';
import PrivacyCheckbox from '../components/PrivacyCheckbox';
import PrivacyLinks from '../components/PrivacyLinks';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Chat: { selectedModel: string };
  ModelSelection: undefined;
  ChatList: { selectedModel: string };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ModelSelection'>;
};

const ModelSelectionScreen = ({ navigation }: Props) => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isModelDownloaded, setIsModelDownloaded] = useState<boolean>(false);
  const [privacyAgreed, setPrivacyAgreed] = useState<boolean>(false);
  
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
    if (!privacyAgreed) {
      Alert.alert(
        'Agreement Required',
        'Please agree to the Privacy Policy and Terms & Conditions to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check network connectivity first
    try {
      const downloadUrl = `https://huggingface.co/${MODEL_REPO}/resolve/main/${MODEL_FILENAME}`;
      
      // Set up timeout with AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        // Attempt a HEAD request to verify connectivity
        const connectionTest = await fetch(downloadUrl, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!connectionTest.ok) {
          throw new Error(`Server returned status ${connectionTest.status}: ${connectionTest.statusText}`);
        }
        
        console.log('Connection test passed, proceeding with download');
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Connection timed out. Server is not responding.');
        }
        throw error;
      }
    } catch (connectionError) {
      const errorMessage = connectionError instanceof Error ? connectionError.message : 'Network connection error';
      Alert.alert(
        'Connection Error',
        `${errorMessage}\n\nPlease check your internet connection and try again.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsDownloading(true);
    setProgress(0);

    try {
      const downloadUrl = `https://huggingface.co/${MODEL_REPO}/resolve/main/${MODEL_FILENAME}`;
      const destPath = `${RNFS.DocumentDirectoryPath}/${MODEL_FILENAME}`;
      
      // Check if already exists
      const fileExists = await RNFS.exists(destPath);
      if (fileExists) {
        try {
          // Verify file integrity
          const fileInfo = await RNFS.stat(destPath);
          if (fileInfo.size > 100 * 1024 * 1024) { // Should be at least 100MB
            // File exists and is reasonable size - proceed
            setIsModelDownloaded(true);
            navigation.navigate('Chat', { selectedModel: MODEL_FILENAME });
            return;
          } else {
            // File exists but is suspiciously small - delete and redownload
            console.log('Existing file too small, deleting and redownloading');
            await RNFS.unlink(destPath);
          }
        } catch (error) {
          console.error('Error checking existing file:', error);
          // Proceed with download
        }
      }

      // Create a progress handler with a timeout detection
      let lastProgressTimestamp = Date.now();
      const progressHandler = (progressValue: number) => {
        setProgress(progressValue);
        lastProgressTimestamp = Date.now();
      };
      
      // Start a watchdog timer to detect stalled downloads
      const watchdogTimer = setInterval(() => {
        const stallTime = Date.now() - lastProgressTimestamp;
        
        if (stallTime > 30000) { // 30 seconds with no progress
          console.warn(`Download appears stalled (${stallTime}ms since last progress)`);
          
          // Only show alert if download is actually in progress
          if (isDownloading) {
            // For iOS, give more detailed feedback
            if (Platform.OS === 'ios') {
              Alert.alert(
                'Download Status',
                'The download appears to be slow. This could be due to network conditions. Do you want to continue waiting?',
                [
                  { 
                    text: 'Cancel', 
                    style: 'destructive',
                    onPress: () => {
                      clearInterval(watchdogTimer);
                      setIsDownloading(false);
                    }
                  },
                  { 
                    text: 'Continue Waiting',
                    onPress: () => {
                      // Reset the timestamp to avoid repeated alerts
                      lastProgressTimestamp = Date.now();
                    }
                  }
                ]
              );
            }
          }
        }
      }, 30000); // Check every 30 seconds

      // Start download
      await downloadModel(MODEL_FILENAME, downloadUrl, progressHandler);
      
      // Download succeeded, clear the watchdog timer
      clearInterval(watchdogTimer);
      
      Alert.alert(
        'Download Complete',
        'Ready to chat! Let\'s get started.',
        [{ text: 'Let\'s Go', onPress: () => navigation.navigate('Chat', { selectedModel: MODEL_FILENAME }) }]
      );
      
      setIsModelDownloaded(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // For iOS users, provide more detailed error analysis
      if (Platform.OS === 'ios') {
        let errorDetails = 'Please try again or contact support if the issue persists.';
        let errorTitle = 'Download Error';
        
        // Check for common iOS-specific error patterns
        if (errorMessage.includes('No space left') || errorMessage.includes('storage')) {
          errorTitle = 'Storage Space Error';
          errorDetails = 'Your device does not have enough storage space. Please free up some space and try again.';
        } else if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('offline')) {
          errorTitle = 'Network Error';
          errorDetails = 'Please check your internet connection and try again. The model requires a stable WiFi connection.';
        } else if (errorMessage.includes('timeout')) {
          errorTitle = 'Download Timeout';
          errorDetails = 'The download timed out. This may be due to a slow internet connection. Please try again on a faster network.';
        }
        
        Alert.alert(
          errorTitle,
          `${errorMessage}\n\n${errorDetails}`,
          [{ text: 'OK' }]
        );
      } else {
        // Standard error for Android
        Alert.alert('Download Error', `Failed to download: ${errorMessage}`);
      }
      
      console.error('Download error details:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleModelSelection = () => {
    if (isModelDownloaded) {
      // Navigate directly to Chat
      navigation.navigate('Chat', { selectedModel: MODEL_FILENAME });
    } else {
      Alert.alert('Model Not Downloaded', 'Please download the model first.');
    }
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
          <>
            {!isModelDownloaded && (
              <PrivacyCheckbox 
                checked={privacyAgreed} 
                onCheck={setPrivacyAgreed} 
              />
            )}
            
            {isModelDownloaded ? (
              <>
                <TouchableOpacity style={styles.chatButton} onPress={handleModelSelection}>
                  <View style={styles.downloadButtonContent}>
                    <Text style={styles.buttonText}>Let's Chat</Text>
                    <Text style={styles.downloadSize}>I'm ready to assist you</Text>
                  </View>
                </TouchableOpacity>
                <PrivacyLinks containerStyle={styles.privacyLinks} />
              </>
            ) : (
              <TouchableOpacity
                style={[
                  styles.button, 
                  { opacity: isDownloading || !privacyAgreed ? 0.5 : 1 }
                ]}
                onPress={handleDownload}
                disabled={isDownloading || !privacyAgreed}
              >
                <Text style={styles.buttonText}>
                  {isDownloading ? 'Downloading...' : "I'm ready to assist you"}
                </Text>
              </TouchableOpacity>
            )}
          </>
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
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-medium',
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
  downloadButtonContent: {
    alignItems: 'center',
  },
  chatButton: {
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
  downloadSize: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Math.min(14, width * 0.035),
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
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
  },
  privacyLinks: {
    marginTop: 10,
  }
});

export default ModelSelectionScreen;