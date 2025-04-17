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
  Dimensions,
  Animated,
  Pressable,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { initLlama, releaseAllLlama } from 'llama.rn';
import RNFS from 'react-native-fs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { saveChatHistory, loadChatHistory, clearChatHistory } from '../utils/chatStorage';
import { formatPrompt, promptTemplates } from '../utils/promptTemplates';
import PersonaSelector from '../components/PersonaSelector';
import { Message } from '../types';

// Get device dimensions for responsive design
const { width, height } = Dimensions.get('window');

// App theme colors - consistent with onboarding
const COLORS = {
  primary: '#e14f29', // Orange primary color from Get Started button
  background: '#f5f0e6', // Soft beige background like in the image
  userBubble: '#f0e6d9', // Light beige/cream color for user bubbles
  assistantBubble: '#FFFFFF', // White for assistant messages
  text: '#1e3e1f', // Dark green text like Pi app
  lightText: '#5a6955', // Lighter green-gray text
  border: '#E2E8F0', // Border color
}

// Update font family and increase font sizes
const FONTS = {
  primary: 'Noto Sans',
  secondary: 'Noto Sans',
  fallback: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
};

type RootStackParamList = {
  Chat: { selectedModel: string };
  ModelSelection: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

const ChatScreen = ({ route, navigation }: Props) => {
  const { selectedModel } = route.params;
  const INITIAL_CONVERSATION: Message[] = [
    {
      role: 'system',
      content: 'This is a conversation between user and assistant, a friendly chatbot.',
    },
  ];
  
  const [context, setContext] = useState<any>(null);
  const [conversation, setConversation] = useState<Message[]>(INITIAL_CONVERSATION);
  const [userInput, setUserInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [tokensPerSecond, setTokensPerSecond] = useState<number[]>([]);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('general');
  const [personaSelectorVisible, setPersonaSelectorVisible] = useState<boolean>(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);

  // Load the model and chat history when component mounts
  useEffect(() => {
    loadModel(selectedModel);
    loadChat();
    
    // Cleanup on unmount
    return () => {
      if (context) {
        releaseAllLlama();
      }
    };
  }, [selectedModel]);
  
  const loadChat = async () => {
    const history = await loadChatHistory(selectedModel);
    if (history && history.messages.length > 0) {
      setConversation(history.messages);
      setSelectedPersonaId(history.personaId || 'general');
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
      
      const llamaContext = await initLlama({
        model: destPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 1,
      });
      
      setContext(llamaContext);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error Loading Model', errorMessage);
      navigation.goBack();
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

    const newUserMessage: Message = { role: 'user', content: userInput };
    const updatedConversation = [...conversation, newUserMessage];
    setConversation(updatedConversation);
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
      const endOfSentenceTokens = [
        '<|end▁of▁sentence|>',
        '<|end_of_text|>',
        '<｜end of sentence｜>',
      ];
      
      // Format with the selected persona's prompt template
      const formattedMessages = formatPrompt([...updatedConversation], selectedPersonaId);

      // Append a placeholder for the assistant's response
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          thought: undefined,
          showThought: false,
        },
      ]);
      
      let currentAssistantMessage = '';
      let currentThought = '';
      let inThinkBlock = false;
      let inEmpathyChain = false;
      
      interface CompletionData {
        token: string;
      }

      interface CompletionResult {
        timings: {
          predicted_per_second: number;
        };
      }

      const result: CompletionResult = await context.completion(
        {
          messages: formattedMessages,
          n_predict: 10000,
          stop: stopWords,
        },
        (data: CompletionData) => {
          const token = data.token;
          currentAssistantMessage += token;
          
          // Handle Dhi Compass specific format with empathy_chain
          if (selectedPersonaId === 'compass') {
            if (token.includes('<empathy_chain>')) {
              inEmpathyChain = true;
              currentThought = token.replace('<empathy_chain>', '');
              return; // Skip adding this to visible content
            } else if (token.includes('</empathy_chain>')) {
              inEmpathyChain = false;
              const finalThought = currentThought.replace('</empathy_chain>', '').trim();
              
              setConversation((prev) => {
                const lastIndex = prev.length - 1;
                const updated = [...prev];
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  thought: finalThought,
                };
                return updated;
              });
              
              currentThought = '';
              return; // Skip adding this to visible content
            } else if (inEmpathyChain) {
              currentThought += token;
              return; // Skip adding this to visible content
            } else if (token.includes('<assistant_response>')) {
              // Skip the tag but continue processing content inside
              return;
            } else if (token.includes('</assistant_response>')) {
              // Skip the closing tag
              return;
            }
          } else {
            // Original think block format
            if (token.includes('<think>')) {
              inThinkBlock = true;
              currentThought = token.replace('<think>', '');
              return; // Skip adding this to visible content
            } else if (token.includes('</think>')) {
              inThinkBlock = false;
              const finalThought = currentThought.replace('</think>', '').trim();

              setConversation((prev) => {
                const lastIndex = prev.length - 1;
                const updated = [...prev];
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  thought: finalThought,
                };
                return updated;
              });

              currentThought = '';
              return; // Skip adding this to visible content
            } else if (inThinkBlock) {
              currentThought += token;
              return; // Skip adding this to visible content
            }
          }

          // Only update visible content with tokens that aren't part of thought process
          if (!inEmpathyChain && !inThinkBlock) {
            setConversation((prev) => {
              const lastIndex = prev.length - 1;
              const updated = [...prev];
              
              // Build visible content from scratch instead of filtering the whole message
              if (!updated[lastIndex].content) {
                updated[lastIndex].content = token;
              } else {
                updated[lastIndex].content += token;
              }

              // Post-process the visible content to remove any reasoning sections that weren't properly tagged
              if (selectedPersonaId === 'compass' && updated[lastIndex].content.length > 30) {
                const cleanedContent = cleanupEmotionSections(updated[lastIndex].content);
                updated[lastIndex].content = cleanedContent;
              }
              
              return updated;
            });
          }

          if (autoScrollEnabled && scrollViewRef.current) {
            requestAnimationFrame(() => {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            });
          }
        }
      );

      // Save chat history after completion
      await saveChatHistory(
        selectedModel, 
        conversation, 
        selectedPersonaId
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

  // Add a helper function to clean up the content
  const cleanupEmotionSections = (content: string): string => {
    // Store the original content to compare later
    const originalContent = content;
    
    // Remove "Emotion: X" sections and anything between them and a double newline
    content = content.replace(/Emotion:[\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '');
    
    // Remove "Underlying Factors & Distortions:" sections
    content = content.replace(/Underlying Factors (?:&|and) Distortions:[\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '');
    
    // Remove "Chosen Approach:" sections
    content = content.replace(/Chosen Approach:[\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '');
    
    // Remove "Therapeutic Framing & Reasoning:" sections
    content = content.replace(/Therapeutic Framing (?:&|and) Reasoning:[\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '');
    
    // Remove "Strategy:" sections
    content = content.replace(/Strategy:[\s\S]*?(?=\n\n|\n[A-Z]|$)/g, '');
    
    // Remove lines with patterns like "- All-or-nothing thinking" (distortion descriptions)
    content = content.replace(/- [A-Za-z\-]+(?:thinking|distortion|bias).*?\n/g, '');
    
    // Clean up excessive newlines
    content = content.replace(/\n{3,}/g, '\n\n');
    
    // If we've removed too much content, just return the original to avoid issues
    if (content.trim().length < 20 && originalContent.length > 100) {
      return originalContent;
    }
    
    return content.trim();
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

  const clearChat = async () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear this conversation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearChatHistory(selectedModel);
            setConversation(INITIAL_CONVERSATION);
          },
        },
      ]
    );
  };
  
  const handlePersonaChange = async (personaId: string) => {
    setSelectedPersonaId(personaId);
    
    // Update system message
    const selectedTemplate = promptTemplates.find(p => p.id === personaId);
    if (selectedTemplate) {
      // If we have messages, update the system message
      if (conversation.length > 0 && conversation[0].role === 'system') {
        const updatedConversation = [...conversation];
        updatedConversation[0] = {
          ...updatedConversation[0],
          content: selectedTemplate.systemPrompt
        };
        setConversation(updatedConversation);
        
        // Save the updated conversation
        await saveChatHistory(selectedModel, updatedConversation, personaId);
      }
    }
  };

  const selectedPersona = promptTemplates.find(p => p.id === selectedPersonaId) || promptTemplates[0];

  const handleDeleteModel = () => {
    Alert.alert(
      'Delete DHI',
      'Are you sure? You will need to download the DHI again to use.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const destPath = `${RNFS.DocumentDirectoryPath}/${selectedModel}`;
              if (await RNFS.exists(destPath)) {
                await RNFS.unlink(destPath);
                Alert.alert('Success', 'AI deleted successfully');
                // Navigate back to model selection
                navigation.replace('ModelSelection');
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              Alert.alert('Error', `Failed to delete: ${errorMessage}`);
            }
          }
        }
      ]
    );
  };

  // Update the ButtonWithAnimation component to support icons
  const ButtonWithAnimation = ({ 
    onPress, 
    style, 
    textStyle, 
    children, 
    isStop = false,
    isIcon = false
  }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(animatedValue, {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    };

    const animatedStyle = {
      transform: [
        {
          scale: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.95],
          }),
        },
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 3],
          }),
        },
      ],
      shadowOpacity: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0.1],
      }),
    };

    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[
          styles.buttonBase,
          isStop ? styles.stopButton : styles.sendButton, 
          style, 
          animatedStyle
        ]}>
          {isIcon ? (
            children
          ) : (
            <Text style={[styles.sendButtonText, textStyle]}>{children}</Text>
          )}
        </Animated.View>
      </Pressable>
    );
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
          <TouchableOpacity 
            style={styles.personaButton}
            onPress={() => setPersonaSelectorVisible(true)}
          >
            <Text style={styles.personaButtonText}>
              {selectedPersona.icon} {selectedPersona.name}
            </Text>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <ButtonWithAnimation
              onPress={clearChat}
              style={styles.clearChatButton}
              isIcon={true}
            >
              <View style={styles.iconContainer}>
                <View style={styles.chatIconOutline}>
                  <View style={styles.chatIconInner}>
                    <View style={styles.chatIconLine} />
                  </View>
                </View>
              </View>
            </ButtonWithAnimation>
            <ButtonWithAnimation
              onPress={handleDeleteModel}
              style={styles.deleteButton}
              isIcon={true}
            >
              <View style={styles.iconContainer}>
                <View style={styles.xLine1} />
                <View style={styles.xLine2} />
              </View>
            </ButtonWithAnimation>
          </View>
        </View>
        
        <ScrollView
          style={styles.scrollView}
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.chatWrapper}>
            <View style={styles.chatContainer}>
              <Text style={styles.greetingText}>
                🦙 Welcome! The Llama is ready to chat. Ask away! 🎉
              </Text>
              {conversation.slice(1).map((msg, index) => (
                <View key={index} style={styles.messageWrapper}>
                  {msg.role === 'user' ? (
                    <View
                      style={[
                        styles.messageBubble,
                        styles.userBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          styles.userMessageText,
                        ]}
                      >
                        <Markdown>{msg.content}</Markdown>
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.assistantMessageContainer}>
                      <Text style={styles.assistantMessageText}>
                        <Markdown>{msg.content}</Markdown>
                      </Text>
                      {msg.thought && (
                        <TouchableOpacity
                          onPress={() => toggleThought(index + 1)}
                          style={styles.toggleButton}
                        >
                          <Text style={styles.toggleText}>
                            {msg.showThought
                              ? '▼ Hide Thought'
                              : '▶ Show Thought'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {msg.showThought && msg.thought && (
                        <View style={styles.thoughtContainer}>
                          <Text style={styles.thoughtTitle}>
                            Model's Reasoning:
                          </Text>
                          <Text style={styles.thoughtText}>
                            {msg.thought}
                          </Text>
                        </View>
                      )}
                      {tokensPerSecond[Math.floor(index / 2)] && (
                        <Text style={styles.tokenInfo}>
                          {tokensPerSecond[Math.floor(index / 2)]} tokens/s
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
              
              {!context && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading model...</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={userInput}
            onChangeText={setUserInput}
            multiline
            returnKeyType="default"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isGenerating}
            placeholderTextColor="#999"
          />
          {isGenerating ? (
            <ButtonWithAnimation
              onPress={stopGeneration}
              isStop={true}
            >
              Stop
            </ButtonWithAnimation>
          ) : (
            <ButtonWithAnimation
              onPress={handleSendMessage}
              style={!userInput.trim() || !context ? styles.sendButtonDisabled : {}}
            >
              Send
            </ButtonWithAnimation>
          )}
        </View>
      </KeyboardAvoidingView>
      
      <PersonaSelector
        visible={personaSelectorVisible}
        onClose={() => setPersonaSelectorVisible(false)}
        selectedPersonaId={selectedPersonaId}
        onSelectPersona={handlePersonaChange}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 62, 31, 0.1)',
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  personaButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(225, 79, 41, 0.1)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  personaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearChatButton: {
    backgroundColor: '#F5A623', // Yellow color
    width: 44,
    height: 44,
    shadowOpacity: 0.25,
    borderBottomWidth: 3,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
    borderRightColor: 'rgba(0, 0, 0, 0.2)',
  },
  deleteButton: {
    backgroundColor: '#FF3B30', // Red color
    width: 44,
    height: 44,
    shadowOpacity: 0.25,
    borderBottomWidth: 3,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
    borderRightColor: 'rgba(0, 0, 0, 0.2)',
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatIconOutline: {
    width: 18,
    height: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chatIconInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatIconLine: {
    width: 8,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  xLine1: {
    width: 16,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  xLine2: {
    width: 16,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  chatWrapper: {
    flex: 1,
    padding: 16,
  },
  chatContainer: {
    flex: 1,
    padding: 16,
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 20,
    color: COLORS.lightText,
    fontFamily: FONTS.primary,
  },
  messageWrapper: {
    marginBottom: 24,
  },
  messageBubble: {
    padding: Math.max(10, width * 0.025),
    borderRadius: 18,
    maxWidth: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.userBubble,
  },
  messageText: {
    fontSize: Math.min(17, width * 0.045),
    color: COLORS.text,
    lineHeight: Math.min(25, width * 0.06),
    fontFamily: FONTS.primary,
  },
  userMessageText: {
    color: COLORS.text,
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    marginBottom: 8,
  },
  assistantMessageText: {
    fontSize: Math.min(18, width * 0.046),
    color: COLORS.text,
    lineHeight: Math.min(27, width * 0.065),
    marginBottom: 8,
    fontFamily: FONTS.primary,
  },
  thoughtContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(225, 79, 41, 0.05)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  thoughtTitle: {
    color: COLORS.lightText,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: FONTS.secondary,
  },
  thoughtText: {
    color: COLORS.lightText,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    fontFamily: FONTS.secondary,
  },
  toggleButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  toggleText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: FONTS.secondary,
  },
  tokenInfo: {
    fontSize: 11,
    color: COLORS.lightText,
    marginTop: 4,
    textAlign: 'right',
    opacity: 0.7,
    fontFamily: FONTS.secondary,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.lightText,
    fontFamily: FONTS.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 62, 31, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(30, 62, 31, 0.1)',
    borderRadius: 30,
    padding: Math.max(12, width * 0.03),
    paddingHorizontal: Math.max(16, width * 0.04),
    fontSize: Math.min(17, width * 0.042),
    color: COLORS.text,
    marginRight: 10,
    fontFamily: FONTS.primary,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 54,
    height: 54,
    shadowOpacity: 0.25,
    borderBottomWidth: 3,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
    borderRightColor: 'rgba(0, 0, 0, 0.2)',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    width: 54,
    height: 54,
    shadowOpacity: 0.3,
    shadowColor: '#FF3B30',
    borderBottomWidth: 3,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
    borderRightColor: 'rgba(0, 0, 0, 0.2)',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.primary,
    shadowOpacity: 0.4,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: FONTS.primary,
  },
  buttonBase: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
    elevation: 4,
  },
});

export default ChatScreen;