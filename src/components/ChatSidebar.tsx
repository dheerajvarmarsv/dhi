import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Alert,
  Platform,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { getChatsByModel, createChatSession, deleteChatSession, updateChatSession } from '../utils/chatStorage';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import RNFS from 'react-native-fs';

const { width, height } = Dimensions.get('window');

interface ChatItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
}

interface ChatSidebarProps {
  isVisible: boolean;
  selectedModel: string;
  currentChatId: string | null;
  onClose: () => void;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onBackToModelSelection: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isVisible,
  selectedModel,
  currentChatId,
  onClose,
  onChatSelect,
  onNewChat,
  onBackToModelSelection,
}) => {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [chatToRename, setChatToRename] = useState<{id: string, title: string} | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  
  // Animation for sidebar slide in/out
  const slideAnim = React.useRef(new Animated.Value(isVisible ? 0 : -width * 0.75)).current;
  
  // Add new animated value for button press
  const buttonScale = React.useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Animate the sidebar in or out when visibility changes
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -width * 0.75,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Load chats when sidebar becomes visible
    if (isVisible) {
      loadChats();
    }
  }, [isVisible]);
  
  const loadChats = async () => {
    try {
      setLoading(true);
      const modelChats = await getChatsByModel(selectedModel);
      setChats(modelChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadChats();
  };
  
  const handleRenameChat = (chatId: string, currentTitle: string) => {
    // For iOS, we can use Alert.prompt
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Rename Chat',
        'Enter a new name for this chat:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Save',
            onPress: async (newTitle?: string) => {
              if (newTitle && newTitle.trim()) {
                try {
                  await updateChatSession(chatId, {
                    title: newTitle.trim()
                  });
                  // Refresh the chat list
                  loadChats();
                } catch (error) {
                  console.error('Error renaming chat:', error);
                  Alert.alert('Error', 'Could not rename the chat.');
                }
              }
            }
          }
        ],
        'plain-text',
        currentTitle
      );
    } else {
      // For Android, we need a custom modal
      setChatToRename({ id: chatId, title: currentTitle });
      setNewChatTitle(currentTitle);
      setRenameModalVisible(true);
    }
  };
  
  const handleSaveRename = async () => {
    if (chatToRename && newChatTitle.trim()) {
      try {
        await updateChatSession(chatToRename.id, {
          title: newChatTitle.trim()
        });
        // Refresh the chat list
        loadChats();
        setRenameModalVisible(false);
      } catch (error) {
        console.error('Error renaming chat:', error);
        Alert.alert('Error', 'Could not rename the chat.');
      }
    }
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
              // First check if we have other chats, particularly empty ones
              const allChats = await getChatsByModel(selectedModel);
              // Filter out the chat we're about to delete
              const remainingChats = allChats.filter(chat => chat.id !== chatId);
              
              // Delete the requested chat
              await deleteChatSession(chatId);
              
              // If we're deleting the current chat
              if (chatId === currentChatId) {
                if (remainingChats.length > 0) {
                  // If there are remaining chats, just select the first one
                  // (which will be the most recent due to sorting)
                  onChatSelect(remainingChats[0].id);
                } else {
                  // Only create a new chat if no chats remain
                  onNewChat();
                }
              }
              
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
  
  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const handleDeleteModel = () => {
    Alert.alert(
      'Delete DHI',
      'Are you sure you want to delete DHI from your device? You will need to download it again to use the app.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const modelPath = `${RNFS.DocumentDirectoryPath}/${selectedModel}`;
              await RNFS.unlink(modelPath);
              onBackToModelSelection();
            } catch (error) {
              console.error('Error deleting model:', error);
              Alert.alert('Error', 'Could not delete the model. Please try again.');
            }
          }
        }
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
      });
    }
  };
  
  // Overlay for outside sidebar area - closes sidebar when tapped
  const handleOverlayPress = () => {
    onClose();
  };
  
  const getMessagePreview = (messages: any[]) => {
    // Skip system messages and look for the last user or assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'user' || message.role === 'assistant') {
        if (message.content && message.content.trim()) {
          // Truncate and clean up content for preview
          const content = message.content.trim()
            .replace(/\n/g, ' ')  // Replace newlines with spaces
            .replace(/\s+/g, ' '); // Replace multiple spaces with one
          
          return content.length > 35 ? content.substring(0, 35) + '...' : content;
        }
      }
    }
    
    // If no user or assistant messages found, return default text
    return 'Empty chat';
  };
  
  const ButtonWithAnimation = ({ 
    onPress, 
    style, 
    textStyle, 
    children, 
    icon = null
  }: {
    onPress: () => void;
    style?: any;
    textStyle?: any;
    children: React.ReactNode;
    icon?: any;
  }) => {
    const animatedValue = React.useRef(new Animated.Value(0)).current;

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
            outputRange: [0, 2],
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
        <Animated.View style={[styles.buttonBase, style, animatedStyle]}>
          {icon && (
            <Image 
              source={icon} 
              style={styles.buttonIcon}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.buttonText, textStyle]}>{children}</Text>
        </Animated.View>
      </Pressable>
    );
  };
  
  return (
    <View style={[styles.container, { display: isVisible ? 'flex' : 'none' }]}>
      {/* Semi-transparent overlay */}
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={handleOverlayPress}
      />
      
      {/* Sidebar content */}
      <Animated.View 
        style={[
          styles.sidebar,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBackToModelSelection}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.sidebarTitle}>Your Chats</Text>
        </View>
        
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={onNewChat}
        >
          <Text style={styles.newChatButtonText}>+ New Chat</Text>
        </TouchableOpacity>
        
        <View style={styles.chatListContainer}>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading chats...</Text>
            </View>
          ) : (
            <FlatList
              data={chats}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.chatItem,
                    currentChatId === item.id ? styles.selectedChatItem : {}
                  ]}
                  onPress={() => onChatSelect(item.id)}
                >
                  <View style={styles.chatMainContent}>
                    <View style={styles.chatInfo}>
                      <Text 
                        style={[
                          styles.chatTitle,
                          currentChatId === item.id ? styles.selectedChatTitle : {}
                        ]} 
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.chatPreview} numberOfLines={1}>
                        {item.lastMessage || 'New conversation'}
                      </Text>
                    </View>
                    <Text style={styles.chatDate}>
                      {formatDate(item.timestamp)}
                    </Text>
                  </View>
                  
                  <View style={styles.chatActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleRenameChat(item.id, item.title)}
                    >
                      <Text style={styles.actionButtonText}>Rename</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteChat(item.id)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Image 
                    source={require('../../assets/startdhi.png')} 
                    style={styles.emptyImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.emptyText}>No chats yet</Text>
                  <Text style={styles.emptySubText}>Start a new conversation</Text>
                </View>
              }
            />
          )}
        </View>
        
        <View style={styles.bottomActionsContainer}>
          <ButtonWithAnimation
            onPress={handleDeleteModel}
            style={styles.deleteModelButton}
            textStyle={styles.deleteModelButtonText}
            icon={require('../../assets/delete.png')}
          >
            Delete DHI
          </ButtonWithAnimation>
        </View>
      </Animated.View>
      
      {/* Rename Modal for Android */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Chat</Text>
            <TextInput
              style={styles.modalInput}
              value={newChatTitle}
              onChangeText={setNewChatTitle}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveRename}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 999,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.75,
    height: '100%',
    backgroundColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(225, 79, 41, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.primary,
  },
  newChatButton: {
    margin: 16,
    padding: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  newChatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONTS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.lightText,
    fontFamily: FONTS.primary,
  },
  chatListContainer: {
    flex: 1,
    marginBottom: 60, // Space for bottom actions
  },
  chatItem: {
    backgroundColor: 'rgba(225, 79, 41, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  selectedChatItem: {
    backgroundColor: 'rgba(225, 79, 41, 0.15)',
    borderLeftColor: COLORS.primary,
  },
  chatMainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chatInfo: {
    flex: 1,
    marginRight: 8,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    fontFamily: FONTS.primary,
  },
  selectedChatTitle: {
    color: COLORS.primary,
  },
  chatPreview: {
    fontSize: 14,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
  },
  chatDate: {
    fontSize: 12,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
    marginVertical: 4,
  },
  chatActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    height: 36,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: FONTS.secondary,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
    fontFamily: FONTS.secondary,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.05,
  },
  emptyImage: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 20,
    opacity: 0.9,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.lightText,
    marginBottom: 8,
    fontFamily: FONTS.primary,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.lightText,
    fontFamily: FONTS.secondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    fontFamily: FONTS.primary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: FONTS.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    color: COLORS.lightText,
    fontFamily: FONTS.primary,
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONTS.primary,
  },
  bottomActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  buttonBase: {
    flexDirection: 'row',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 40,
  },
  
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: FONTS.primary,
  },
  
  buttonIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },

  deleteModelButton: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
    borderBottomWidth: 2,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
    borderRightColor: 'rgba(0, 0, 0, 0.2)',
    width: '100%',
  },

  deleteModelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 82, // Adjusted for bottom actions
  },
});

export default ChatSidebar; 