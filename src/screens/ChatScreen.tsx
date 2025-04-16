// ChatScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { initLlama, releaseAllLlama } from 'llama.rn';
import RNFS from 'react-native-fs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
  Chat: { selectedModel: string };
  ModelSelection: undefined;
};

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  showThought?: boolean;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

const ChatScreen = ({ route, navigation }: Props) => {
  const { selectedModel } = route.params;
  
  // Enhanced system prompt based on model type – for Gemma, we use updated phrasing
  const getInitialSystemPrompt = () => {
    if (selectedModel.includes('Gemma-3')) {
      return "You are an advanced AI assistant leveraging Gemma optimization on mobile devices with Google's Edge integration. Provide clear, accurate, and concise responses while utilizing on-device optimizations. Show your reasoning step by step when solving math problems.";
    } else if (selectedModel.includes('DeepSeek')) {
      return "You are a helpful assistant with strong reasoning and analysis skills. You can help with math problems, tutoring, and explaining concepts step by step. When solving problems, use <think> tags to show your reasoning process.";
    } else {
      return "You are a helpful assistant. You excel at explaining concepts clearly and step by step. For math problems, show your reasoning and calculations in detail.";
    }
  };
  
  const INITIAL_CONVERSATION: Message[] = [
    {
      role: 'system',
      content: getInitialSystemPrompt(),
    },
  ];
  
  const [context, setContext] = useState<any>(null);
  const [conversation, setConversation] = useState<Message[]>(INITIAL_CONVERSATION);
  const [userInput, setUserInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [tokensPerSecond, setTokensPerSecond] = useState<number[]>([]);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [modelInfo, setModelInfo] = useState<string>('');
  
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);

  // Load the model when component mounts
  useEffect(() => {
    loadModel(selectedModel);
    extractModelInfo(selectedModel);
    
    return () => {
      if (context) {
        releaseAllLlama();
      }
    };
  }, [selectedModel]);

  const extractModelInfo = (modelName: string) => {
    try {
      let modelType = '';
      let quantLevel = '';
      
      // Extract quantization level
      if (modelName.includes('Q2_K')) {
        quantLevel = 'Q2_K (2-bit)';
      } else if (modelName.includes('Q3_K')) {
        quantLevel = modelName.includes('Q3_K_M') ? 'Q3_K_M (3-bit)' : 
                      modelName.includes('Q3_K_S') ? 'Q3_K_S (3-bit)' : 'Q3_K_L (3-bit)';
      } else if (modelName.includes('Q4_K')) {
        quantLevel = modelName.includes('Q4_K_M') ? 'Q4_K_M (4-bit)' : 'Q4_K_S (4-bit)';
      } else if (modelName.includes('Q5_K')) {
        quantLevel = modelName.includes('Q5_K_M') ? 'Q5_K_M (5-bit)' : 'Q5_K_S (5-bit)';
      } else if (modelName.includes('Q8_0')) {
        quantLevel = 'Q8_0 (8-bit)';
      } else {
        quantLevel = 'Unknown quantization';
      }
      
      // Extract model size/type
      if (modelName.includes('Gemma-3-1B')) {
        modelType = 'Gemma 3 1B';
      } else if (modelName.includes('Gemma-3-4B')) {
        modelType = 'Gemma 3 4B';
      } else if (modelName.includes('Llama-3.2-1B')) {
        modelType = 'Llama 3.2 1B';
      } else if (modelName.includes('Llama-3.2-3B')) {
        modelType = 'Llama 3.2 3B';
      } else if (modelName.includes('DeepSeek-R1')) {
        modelType = 'DeepSeek R1 Distill Qwen 1.5B';
      } else if (modelName.includes('Qwen2-0.5B')) {
        modelType = 'Qwen2 0.5B';
      } else if (modelName.includes('SmolLM2')) {
        modelType = 'SmolLM2 1.7B';
      }
      
      setModelInfo(`${modelType} (${quantLevel})`);
    } catch (error) {
      console.error('Error extracting model info:', error);
      setModelInfo(modelName);
    }
  };

  const loadModel = async (modelName: string) => {
    try {
      const destPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;
      const fileExists = await RNFS.exists(destPath);
      
      if (!fileExists) {
        Alert.alert('Error', 'Model file not found. Please download it first.');
        navigation.goBack();
        return;
      }
      
      // Release any existing context first
      if (context) {
        try {
          await releaseAllLlama();
          setContext(null);
        } catch (releaseError) {
          console.error('Error releasing previous model:', releaseError);
        }
      }

      // Check file size to make sure it's valid
      try {
        const fileInfo = await RNFS.stat(destPath);
        console.log(`Model file size: ${fileInfo.size} bytes`);
        
        if (fileInfo.size < 100000) {
          Alert.alert('Error', 'Model file appears to be incomplete or corrupted. Please try downloading again.');
          navigation.goBack();
          return;
        }
      } catch (statError) {
        console.error('Error checking file:', statError);
      }
      
      try {
        const { loadLlamaModelInfo } = require('llama.rn');
        const modelInfo = await loadLlamaModelInfo(`file://${destPath}`);
        console.log('Model info loaded successfully:', modelInfo);
      } catch (modelInfoError) {
        console.error('Error loading model info:', modelInfoError);
      }
      
      // Configure model parameters based on model type
      const llamaParams: Record<string, any> = {
        model: destPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 1,
        verbose: true,
      };
      
      // Apply model-specific optimizations
      if (modelName.includes('Gemma-')) {
        // Gemma-specific optimized settings per Google AI Edge Gemma integration docs:
        llamaParams.n_ctx = 2048;
        llamaParams.n_gpu_layers = 2;            // Use additional GPU layers if supported
        llamaParams.use_edge = true;             // Enable the Edge integration pathway
        llamaParams.f16_kv = false;              // Use full precision for key/value cache per Gemma guidelines
        llamaParams.num_threads = 4;             // Example thread count for better parallelization
      } else if (modelName.includes('Llama-3.2-3B')) {
        llamaParams.n_ctx = 2048; 
        llamaParams.n_gpu_layers = 0;
        llamaParams.f16_kv = true;
      } else if (modelName.includes('Gemma-3-1B')) {
        // (Additional Gemma-3-1B–specific settings can be applied here if needed)
        // They are already covered in the Gemma branch above.
      } else if (modelName.includes('DeepSeek')) {
        llamaParams.n_ctx = 4096;
        llamaParams.n_gpu_layers = 1;
      }
      
      console.log('Loading model with params:', JSON.stringify(llamaParams));
      
      try {
        const llamaContext = await initLlama(llamaParams);
        console.log('Model loaded successfully!');
        setContext(llamaContext);
        setConversation([
          {
            role: 'system',
            content: getInitialSystemPrompt(),
          }
        ]);
        return true;
      } catch (initError) {
        console.error('Error initializing model:', initError);
        console.log('Retrying with conservative settings...');
        const conservativeParams = {
          ...llamaParams,
          n_gpu_layers: 0,
          n_ctx: 1024,
          f16_kv: true,
          use_mmap: false,
          use_mlock: true,
        };
        console.log('Retrying with params:', JSON.stringify(conservativeParams));
        const llamaContext = await initLlama(conservativeParams);
        console.log('Model loaded successfully with conservative settings!');
        setContext(llamaContext);
        setConversation([
          {
            role: 'system',
            content: getInitialSystemPrompt(),
          }
        ]);
        return true;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Error Loading Model', 
        `${errorMessage}\n\nTry downloading a different quantization level (Q4_K_M is usually more reliable).`
      );
      navigation.goBack();
      return false;
    }
  };

  const handleScroll = (event: any) => {
    const currentPosition = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;

    scrollPositionRef.current = currentPosition;
    contentHeightRef.current = contentHeight;

    const distanceFromBottom = contentHeight - scrollViewHeight - currentPosition;
    setAutoScrollEnabled(distanceFromBottom < 100);
  };

  const toggleThought = (messageIndex: number) => {
    setConversation((prev) =>
      prev.map((msg, index) =>
        index === messageIndex ? { ...msg, showThought: !msg.showThought } : msg
      )
    );
  };

  const handleSendMessage = async () => {
    if (!context) {
      Alert.alert('Model Not Loaded', 'Please wait for the model to load.');
      return;
    }
    if (!userInput.trim()) {
      return;
    }

    const newConversation: Message[] = [
      ...conversation,
      { role: 'user', content: userInput },
    ];
    setConversation(newConversation);
    setUserInput('');
    setIsGenerating(true);
    setAutoScrollEnabled(true);

    try {
      const stopWords = [
        '</s>',
        '<|end|>',
        'user:',
        'assistant:',
        '<|im_end|>',
        '<|eot_id|>',
      ];
      
      if (selectedModel.includes('Gemma-3')) {
        stopWords.push('<start_of_turn>');
      }
      
      const chat = newConversation;
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', content: '', thought: undefined, showThought: false },
      ]);
      
      let currentAssistantMessage = '';
      let currentThought = '';
      let inThinkBlock = false;
      
      interface CompletionData {
        token: string;
      }

      interface CompletionResult {
        timings: { predicted_per_second: number };
      }

      const result: CompletionResult = await context.completion(
        {
          messages: chat,
          n_predict: 10000,
          stop: stopWords,
          temperature: selectedModel.includes('Gemma-3') ? 0.7 : 0.8,
          top_p: 0.95,
          top_k: selectedModel.includes('Llama-3.2') ? 40 : 50,
        },
        (data: CompletionData) => {
          const token = data.token;
          currentAssistantMessage += token;

          if (token.includes('<think>')) {
            inThinkBlock = true;
            currentThought = token.replace('<think>', '');
          } else if (token.includes('</think>')) {
            inThinkBlock = false;
            const finalThought = currentThought.replace('</think>', '').trim();
            setConversation((prev) => {
              const lastIndex = prev.length - 1;
              const updated = [...prev];
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: updated[lastIndex].content.replace(
                  `<think>${finalThought}</think>`,
                  ''
                ),
                thought: finalThought,
              };
              return updated;
            });
            currentThought = '';
          } else if (inThinkBlock) {
            currentThought += token;
          }

          const visibleContent = currentAssistantMessage
            .replace(/<think>.*?<\/think>/gs, '')
            .trim();

          setConversation((prev) => {
            const lastIndex = prev.length - 1;
            const updated = [...prev];
            updated[lastIndex].content = visibleContent;
            return updated;
          });

          if (autoScrollEnabled && scrollViewRef.current) {
            requestAnimationFrame(() => {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            });
          }
        }
      );

      setTokensPerSecond((prev) => [
        ...prev,
        parseFloat(result.timings.predicted_per_second.toFixed(2)),
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error During Inference', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const stopGeneration = async () => {
    try {
      await context.stopCompletion();
      setIsGenerating(false);
      setConversation((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.role === 'assistant') {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: lastMessage.content + '\n\n*Generation stopped by user*',
            },
          ];
        }
        return prev;
      });
    } catch (error) {
      console.error('Error stopping completion:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Math Tutor</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView
          style={styles.scrollView}
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.chatWrapper}>
            <Text style={styles.modelName}>{modelInfo}</Text>
            <View style={styles.chatContainer}>
              <Text style={styles.greetingText}>
                🧠 Ready to help with math and explanations. Ask your questions! 📝
              </Text>
              {conversation.slice(1).map((msg, index) => (
                <View key={index} style={styles.messageWrapper}>
                  <View
                    style={[
                      styles.messageBubble,
                      msg.role === 'user' ? styles.userBubble : styles.llamaBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        msg.role === 'user' && styles.userMessageText,
                      ]}
                    >
                      {msg.thought && (
                        <TouchableOpacity
                          onPress={() => toggleThought(index + 1)}
                          style={styles.toggleButton}
                        >
                          <Text style={styles.toggleText}>
                            {msg.showThought ? '▼ Hide Reasoning' : '▶ Show Reasoning'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {msg.showThought && msg.thought && (
                        <View style={styles.thoughtContainer}>
                          <Text style={styles.thoughtTitle}>
                            Model's Reasoning Process:
                          </Text>
                          <Text style={styles.thoughtText}>
                            {msg.thought}
                          </Text>
                        </View>
                      )}
                      <Markdown>{msg.content}</Markdown>
                    </Text>
                  </View>
                  {msg.role === 'assistant' && tokensPerSecond[Math.floor(index / 2)] && (
                    <Text style={styles.tokenInfo}>
                      {tokensPerSecond[Math.floor(index / 2)]} tokens/s
                    </Text>
                  )}
                </View>
              ))}
              
              {!context && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.loadingText}>Loading model...</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.bottomContainer}>
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ask a math question..."
                placeholderTextColor="#94A3B8"
                value={userInput}
                onChangeText={setUserInput}
                editable={!!context && !isGenerating}
              />
              {isGenerating ? (
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopGeneration}
                >
                  <Text style={styles.buttonText}>□ Stop</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendMessage}
                  disabled={!context || !userInput.trim()}
                >
                  <Text style={styles.buttonText}>Send</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B' },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: { fontSize: 20, color: '#334155' },
  placeholder: { width: 36 },
  scrollView: { flex: 1 },
  chatWrapper: { flex: 1, padding: 16 },
  modelName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 12,
    color: '#64748B',
  },
  messageWrapper: { marginBottom: 16 },
  messageBubble: { padding: 12, borderRadius: 12, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#3B82F6' },
  llamaBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: { fontSize: 16, color: '#334155' },
  userMessageText: { color: '#FFFFFF' },
  thoughtContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#94A3B8',
  },
  thoughtTitle: { color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  thoughtText: { color: '#475569', fontSize: 12, fontStyle: 'italic', lineHeight: 16 },
  toggleButton: { marginTop: 8, paddingVertical: 4 },
  toggleText: { color: '#3B82F6', fontSize: 12, fontWeight: '500' },
  tokenInfo: { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'right' },
  loadingContainer: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#64748B' },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  inputContainer: { padding: 16 },
  inputRow: { flexDirection: 'row', gap: 12 },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#334155',
    minHeight: 50,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});

export default ChatScreen;