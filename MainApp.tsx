import React, { useState, useRef, useEffect } from "react";
import 'react-native-gesture-handler';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';

import Markdown from "react-native-markdown-display";

import { initLlama, releaseAllLlama } from "llama.rn"; // Import llama.rn
import { downloadModel } from "./src/api/model"; // Download function
import ProgressBar from "./src/components/ProgressBar"; // Progress bar component
import RNFS from "react-native-fs"; // File system module
import axios from "axios";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  thought?: string; // Single thought block
  showThought?: boolean;
};

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1E293B",
    marginVertical: 24,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    margin: 16,
    shadowColor: "#475569",
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
    fontWeight: "600",
    color: "#334155",
    marginBottom: 16,
    marginTop: 16,
  },
  subtitle2: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
    color: "#93C5FD",
  },
  button: {
    backgroundColor: "#93C5FD", // Lighter blue
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: "#93C5FD", // Matching lighter shadow color
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15, // Slightly reduced opacity for subtle shadows
    shadowRadius: 4,
    elevation: 2,
  },
  selectedButton: {
    backgroundColor: "#2563EB",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  chatWrapper: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    backgroundColor: "#3B82F6",
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: "80%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#3B82F6",
  },
  llamaBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  messageText: {
    fontSize: 16,
    color: "#334155",
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  tokenInfo: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "right",
  },
  inputContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#334155",
    minHeight: 50,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    alignSelf: "stretch",
    justifyContent: "center",
  },

  stopButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  greetingText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginVertical: 12,
    color: "#64748B", // Soft gray that complements #2563EB
  },
  thoughtContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#94A3B8",
  },
  thoughtTitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  thoughtText: {
    color: "#475569",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 16,
  },
  toggleButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  toggleText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "500",
  },

  bottomContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
  modelContainer: {
    marginVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },

  modelButton: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  downloadedModelButton: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
    borderWidth: 1,
  },

  modelButtonContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modelStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  downloadedIndicator: {
    backgroundColor: "#DBEAFE",
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },

  notDownloadedIndicator: {
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },

  downloadedIcon: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "bold",
  },

  notDownloadedIcon: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "bold",
  },

  downloadedText: {
    color: "#1E40AF",
  },

  loadModelIndicator: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },

  loadModelText: {
    color: "#3B82F6",
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  downloadIndicator: {
    backgroundColor: "#DCF9E5", // Light green background
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },

  downloadText: {
    color: "#16A34A", // Green text
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  buttonTextGGUF: {
    color: "#1E40AF",
    fontSize: 14,
    fontWeight: "500",
  },

  selectedButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

export default App;