import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { initLlama, releaseAllLlama } from 'llama.rn';
import { downloadModel } from '../api/model';
import RNFS from 'react-native-fs';
import { COLORS, FONTS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MainScreen = () => {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi there! I'm Pi. I can help with lots of things, from answering questions to just chatting. What's on your mind today?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    checkAndLoadModel();
    return () => {
      releaseAllLlama();
    };
  }, []);

  const checkAndLoadModel = async () => {
    try {
      const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
      const ggufFiles = files.filter(file => file.name.endsWith('.gguf'));
      
      if (ggufFiles.length === 0) {
        Alert.alert(
          'No Model Found',
          'Please download a model first',
          [
            { text: 'OK', onPress: () => {} }
          ]
        );
        return;
      }

      // Use the first available model
      const modelPath = `${RNFS.DocumentDirectoryPath}/${ggufFiles[0].name}`;
      const ctx = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_batch: 512,
        n_threads: 6,
        n_gpu_layers: 0
      });
      setContext(ctx);
    } catch (error) {
      console.error('Error loading model:', error);
      Alert.alert('Error', 'Failed to load the chat model');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !context) return;
    
    const userMessage = message.trim();
    setMessage('');
    
    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    setIsLoading(true);
    try {
      // Prepare conversation history
      const history = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      history.push({ role: 'user', content: userMessage });

      // Generate response
      const response = await context.complete({
        prompt: userMessage,
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
        max_tokens: 1024,
        stop: ['</s>', 'user:', 'User:', 'assistant:', 'Assistant:']
      });

      // Add assistant response
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.trim() }]);
    } catch (error) {
      console.error('Error generating response:', error);
      Alert.alert('Error', 'Failed to generate response');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pi</Text>
        </View>
        
        {/* Chat Messages */}
        <ScrollView 
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          ref={scrollViewRef}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {chatMessages.map((msg, index) => (
            <View 
              key={index}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.piBubble
              ]}
            >
              <Text 
                style={[
                  styles.messageText,
                  msg.role === 'user' ? styles.userText : styles.piText
                ]}
              >
                {msg.content}
              </Text>
            </View>
          ))}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
        </ScrollView>
        
        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Message Pi..."
            placeholderTextColor={COLORS.gray}
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!message.trim() || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!message.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    height: 60,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: '700',
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
  },
  chatContent: {
    paddingVertical: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  piBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.lightGray,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.white,
  },
  piText: {
    color: COLORS.black,
  },
  loadingContainer: {
    padding: 10,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 45,
    fontSize: 16,
    color: COLORS.black,
  },
  sendButton: {
    position: 'absolute',
    right: 25,
    height: 35,
    width: 35,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  }
});

export default MainScreen; 