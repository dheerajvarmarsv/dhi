export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  showThought?: boolean;
  timestamp?: number;
};

export type ChatSession = {
  id: string;
  modelId: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messages: Message[];
}; 