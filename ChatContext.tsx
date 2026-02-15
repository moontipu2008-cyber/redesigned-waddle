import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  imageBase64?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatContextValue {
  conversations: Conversation[];
  isLoading: boolean;
  createConversation: (title?: string) => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  getConversation: (id: string) => Conversation | undefined;
  addMessage: (conversationId: string, message: Message) => Promise<void>;
  updateLastMessage: (conversationId: string, content: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  persistNow: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

let msgCounter = 0;
export function generateMessageId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const conversationsRef = useRef<Conversation[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKeyRef = useRef<string | null>(null);

  const storageKey = user ? `nexus_chats_${user.id}` : null;
  storageKeyRef.current = storageKey;

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (storageKey) {
      loadConversations(storageKey);
    } else {
      setConversations([]);
      setIsLoading(false);
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [storageKey]);

  async function loadConversations(key: string) {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setConversations(parsed);
        conversationsRef.current = parsed;
      } else {
        setConversations([]);
        conversationsRef.current = [];
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const key = storageKeyRef.current;
      if (!key) return;
      try {
        await AsyncStorage.setItem(key, JSON.stringify(conversationsRef.current));
      } catch (e) {
        console.error('Failed to save conversations:', e);
      }
    }, 500);
  }, []);

  const persistNow = useCallback(async () => {
    const key = storageKeyRef.current;
    if (!key) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(conversationsRef.current));
    } catch (e) {
      console.error('Failed to save conversations:', e);
    }
  }, []);

  const createConversation = useCallback(async (title?: string): Promise<string> => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newConv: Conversation = {
      id,
      title: title || 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations(prev => {
      const updated = [newConv, ...prev];
      conversationsRef.current = updated;
      return updated;
    });
    scheduleSave();
    return id;
  }, [scheduleSave]);

  const deleteConversation = useCallback(async (id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      conversationsRef.current = updated;
      return updated;
    });
    scheduleSave();
  }, [scheduleSave]);

  const getConversation = useCallback((id: string): Conversation | undefined => {
    return conversationsRef.current.find(c => c.id === id);
  }, []);

  const addMessage = useCallback(async (conversationId: string, message: Message) => {
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id === conversationId) {
          return {
            ...c,
            messages: [...c.messages, message],
            updatedAt: Date.now(),
          };
        }
        return c;
      });
      conversationsRef.current = updated;
      return updated;
    });
    scheduleSave();
  }, [scheduleSave]);

  const updateLastMessage = useCallback((conversationId: string, content: string) => {
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id === conversationId && c.messages.length > 0) {
          const msgs = [...c.messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
          return { ...c, messages: msgs, updatedAt: Date.now() };
        }
        return c;
      });
      conversationsRef.current = updated;
      return updated;
    });
  }, []);

  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id === conversationId) {
          return { ...c, title };
        }
        return c;
      });
      conversationsRef.current = updated;
      return updated;
    });
    scheduleSave();
  }, [scheduleSave]);

  const value = useMemo(() => ({
    conversations,
    isLoading,
    createConversation,
    deleteConversation,
    getConversation,
    addMessage,
    updateLastMessage,
    updateConversationTitle,
    persistNow,
  }), [conversations, isLoading, createConversation, deleteConversation, getConversation, addMessage, updateLastMessage, updateConversationTitle, persistNow]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
