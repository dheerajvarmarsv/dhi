export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  showThought?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  personaId?: string;
}

export interface Reminder {
  id: string;
  text: string;
  timestamp: number;
  chatId?: string;
  createdAt: number;
  isCompleted: boolean;
} 