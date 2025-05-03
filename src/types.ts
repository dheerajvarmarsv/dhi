export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  showThought?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  messages: Message[];
  timestamp: number;
  lastMessage: string;
  personaId: string;
}

export interface Reminder {
  id: string;
  text: string;
  timestamp: number;
  chatId?: string;
  createdAt: number;
  isCompleted: boolean;
  soundEnabled?: boolean;
  priority?: 'low' | 'medium' | 'high';
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: number;
    count?: number;
  };
  todoList?: {
    items: {
      id: string;
      text: string;
      isCompleted: boolean;
      createdAt: number;
    }[];
  };
} 