import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import apiClient from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatWithAI } from '../../services/aiService';
import { useAppState } from '../contexts/AppStateContext';
import { useAuth } from '../contexts/AuthContext';
import { createChatSession, createChatStore, chatKey } from '../storage/chatHistory';

export const chatStore = createChatStore(AsyncStorage);
const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { server, userId } = useAuth();
  const key = chatKey(server, userId);
  const session = useMemo(() => createChatSession(chatStore, key), [key]);
  useEffect(() => {
    const cleared = event => {
      if (event.storageArea === window.localStorage && event.newValue === null && (event.key === key || event.key === null)) {
        session.clearedElsewhere();
      }
    };
    if (Platform.OS === 'web') window.addEventListener('storage', cleared);
    return () => {
      if (Platform.OS === 'web') window.removeEventListener('storage', cleared);
      session.close();
    };
  }, [session, key]);
  return <ChatContext.Provider value={session}>{children}</ChatContext.Provider>;
}

export function useAccountChat() {
  const session = useContext(ChatContext);
  if (!session) throw new Error('Chat requires an authenticated account');
  return session;
}

export function useChat() {
  const session = useAccountChat();
  const { currentLanguage } = useAppState();
  const { userToken, server } = useAuth();
  const { messages, sending, status } = useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot);
  useEffect(() => {
    if (session.snapshot().status === 'loading') session.load();
  }, [session]);
  const greeting = {
    id: 'welcome', type: 'ai',
    text: currentLanguage === 'zh' ? '你好！我是你的AI健身和营养助手。今天有什么可以帮助你的吗？' :
      "Hello! I'm your AI fitness and nutrition companion. How can I help you today?",
    time: currentLanguage === 'zh' ? '刚刚' : 'Just now',
  };
  return {
    messages: [greeting, ...messages], status, sendingMessage: sending,
    sendMessage: (text, image) => session.send(text, image, async () => {
      if (apiClient.token !== userToken || apiClient.baseURL !== server) throw new Error('Chat session changed');
      const answer = await chatWithAI(text, image, currentLanguage);
      if (apiClient.token !== userToken || apiClient.baseURL !== server) throw new Error('Chat session changed');
      return answer;
    }),
    clearChat: session.clear, retryHistory: session.load,
  };
}
