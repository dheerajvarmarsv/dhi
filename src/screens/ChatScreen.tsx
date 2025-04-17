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
import { saveChatHistory, loadChatHistory, clearChatHistory } from '../utils/chatStorage';
import { formatPrompt, promptTemplates } from '../utils/promptTemplates';
import PersonaSelector from '../components/PersonaSelector';
import { Message } from '../types';

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
            } else if (inEmpathyChain) {
              currentThought += token;
            }
          } else {
            // Original think block format
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
          }

          // Remove any empathy_chain markers from visible content
          const visibleContent = currentAssistantMessage
            .replace(/<think>.*?<\/think>/gs, '')
            .replace(/<empathy_chain>.*?<\/empathy_chain>/gs, '')
            .replace(/<assistant_response>/g, '')
            .replace(/<\/assistant_response>/g, '')
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
      'Delete AI Brain',
      'Are you sure you want to delete the AI model from your device? You will need to download it again to use the app offline.',
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
                Alert.alert('Success', 'AI model deleted successfully');
                // Navigate back to model selection
                navigation.replace('ModelSelection');
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              Alert.alert('Error', `Failed to delete model: ${errorMessage}`);
            }
          }
        }
      ]
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
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearChat}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteModelButton}
              onPress={handleDeleteModel}
            >
              <Text style={styles.deleteModelText}>Delete Brain</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView
          style={styles.scrollView}
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.chatWrapper}>
            <Text style={styles.modelName}>{selectedModel}</Text>
            <View style={styles.chatContainer}>
              <Text style={styles.greetingText}>
                🦙 Welcome! The Llama is ready to chat. Ask away! 🎉
              </Text>
              {conversation.slice(1).map((msg, index) => (
                <View key={index} style={styles.messageWrapper}>
                  <View
                    style={[
                      styles.messageBubble,
                      msg.role === 'user'
                        ? styles.userBubble
                        : styles.llamaBubble,
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
          />
          {isGenerating ? (
            <TouchableOpacity
              style={[styles.sendButton, styles.stopButton]}
              onPress={stopGeneration}
            >
              <Text style={styles.sendButtonText}>Stop</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={!userInput.trim() || !context}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  personaButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  personaButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#e14f29',
    fontWeight: '600',
  },
  deleteModelButton: {
    marginLeft: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
  },
  deleteModelText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  chatWrapper: {
    flex: 1,
    padding: 16,
  },
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
  messageWrapper: {
    marginBottom: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
  },
  llamaBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 16,
    color: '#334155',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  thoughtContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#94A3B8',
  },
  thoughtTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  thoughtText: {
    color: '#475569',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  toggleButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  toggleText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  tokenInfo: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'right',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748B',
  },
  inputContainer: {
    padding: 16,
  },
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ChatScreen;