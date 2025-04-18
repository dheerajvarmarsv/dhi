import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { getChatsByModel, createChatSession, deleteChatSession } from '../utils/chatStorage';
import { RootStackParamList } from '../navigation/MainNavigator';
import { COLORS, FONTS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ChatList'>;
  route: RouteProp<RootStackParamList, 'ChatList'>;
};

const ChatListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { selectedModel } = route.params;
  const [chats, setChats] = useState<Array<{
    id: string;
    title: string;
    lastMessage: string;
    timestamp: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateYAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadChats();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadChats = async () => {
    try {
      setLoading(true);
      const modelChats = await getChatsByModel(selectedModel);
      setChats(modelChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      Alert.alert('Error', 'Could not load chat history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const handleCreateNewChat = async () => {
    try {
      const newChat = await createChatSession(selectedModel);
      if (newChat) {
        navigation.navigate('Chat', {
          selectedModel,
          chatId: newChat.id,
        });
      } else {
        Alert.alert('Error', 'Could not create a new chat.');
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      Alert.alert('Error', 'Could not create a new chat.');
    }
  };

  const handleOpenChat = (chatId: string) => {
    navigation.navigate('Chat', {
      selectedModel,
      chatId,
    });
  };

  const handleDeleteChat = (chatId: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat?',
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
              await deleteChatSession(chatId);
              // Refresh the chat list
              loadChats();
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Could not delete the chat.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Chats</Text>
        <TouchableOpacity 
          style={styles.newChatButton}
          onPress={handleCreateNewChat}
        >
          <Text style={styles.newChatButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : chats.length === 0 ? (
        <Animated.View 
          style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }]
            }
          ]}
        >
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyDescription}>
            Tap the "+" button to start a new conversation.
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={handleCreateNewChat}
          >
            <Text style={styles.emptyButtonText}>Start New Chat</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <FlatList
          data={chats}
          renderItem={({ item, index }) => (
            <Animated.View 
              style={[
                styles.chatItem,
                {
                  opacity: fadeAnim,
                  transform: [{ 
                    translateY: translateYAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 10 * index]
                    })
                  }]
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.chatItemContent}
                onPress={() => handleOpenChat(item.id)}
              >
                <View style={styles.chatInfo}>
                  <Text style={styles.chatTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.chatPreview} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>
                <View style={styles.chatActions}>
                  <Text style={styles.chatDate}>
                    {formatDate(item.timestamp)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteChat(item.id)}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
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
    padding: 15,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.lightText,
    fontFamily: FONTS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyImage: {
    width: width * 0.5,
    height: width * 0.5,
    marginBottom: 30,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    fontFamily: FONTS.primary,
  },
  emptyDescription: {
    fontSize: 16,
    color: COLORS.lightText,
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: FONTS.primary,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.primary,
  },
  chatList: {
    padding: 15,
  },
  chatItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  chatItemContent: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  chatInfo: {
    flex: 1,
    marginRight: 16,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    fontFamily: FONTS.primary,
  },
  chatPreview: {
    fontSize: 14,
    color: COLORS.lightText,
    fontFamily: FONTS.primary,
  },
  chatActions: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  chatDate: {
    fontSize: 12,
    color: COLORS.lightText,
    marginBottom: 8,
    fontFamily: FONTS.secondary,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
});

export default ChatListScreen; 