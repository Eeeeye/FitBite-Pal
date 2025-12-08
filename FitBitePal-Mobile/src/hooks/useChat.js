import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatWithAI } from '../../services/aiService';
import { selectImageSource } from '../../services/cameraService';
import { useAppState } from '../contexts/AppStateContext';

const CHAT_HISTORY_KEY = '@FitBitePal:chatHistory';

export const useChat = () => {
  const { currentLanguage } = useAppState();
  
  // ✨ 根据语言初始化消息（与App1.js完全一致）
  const getInitialMessage = (lang) => ({
    id: 1,
    type: 'ai',
    text: lang === 'zh' ? 
      "你好！我是你的AI健身和营养助手。今天有什么可以帮助你的吗？" : 
      "Hello! I'm your AI fitness and nutrition companion. How can I help you today?",
    time: lang === 'zh' ? '刚刚' : 'Just now'
  });

  const [messages, setMessages] = useState([getInitialMessage(currentLanguage)]);
  const [isLoaded, setIsLoaded] = useState(false);

  // ✨ 加载历史聊天记录
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (savedHistory) {
          const parsedHistory = JSON.parse(savedHistory);
          if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {

            setMessages(parsedHistory);
          }
        }
      } catch (error) {
        console.error('加载聊天历史失败:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadChatHistory();
  }, []);

  // ✨ 保存聊天记录到AsyncStorage
  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      const saveChatHistory = async () => {
        try {
          await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));

        } catch (error) {
          console.error('保存聊天历史失败:', error);
        }
      };
      saveChatHistory();
    }
  }, [messages, isLoaded]);

  // 当语言改变时更新初始消息（仅当只有初始消息时）
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 1) {
      setMessages([getInitialMessage(currentLanguage)]);
    }
  }, [currentLanguage]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [sending, setSending] = useState(false);

  const sendMessage = async (messageText = input, messageImage = image) => {
    if (!messageText && !messageImage) {
      return { success: false, message: 'Please enter a message or select an image' };
    }

    try {
      setSending(true);

      // 添加用户消息
      const userMessage = {
        id: Date.now(),
        type: 'user',
        text: messageText || '(Sent an image)',
        image: messageImage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, userMessage]);

      // 清空输入
      setInput('');
      setImage(null);

      // 获取AI响应
      const aiResponse = await chatWithAI(messageText, messageImage);

      // 添加AI响应
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: aiResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMessage]);

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, message: error.message };
    } finally {
      setSending(false);
    }
  };

  const selectChatImage = async () => {
    try {
      const selectedImage = await selectImageSource();
      if (selectedImage && selectedImage.uri) {
        setImage(selectedImage.uri);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Error selecting chat image:', error);
      return { success: false, message: error.message };
    }
  };

  const clearImage = () => {
    setImage(null);
  };

  const clearChat = async () => {
    const initialMsg = [getInitialMessage(currentLanguage)];
    setMessages(initialMsg);
    setInput('');
    setImage(null);
    
    // ✨ 清除AsyncStorage中的历史记录
    try {
      await AsyncStorage.removeItem(CHAT_HISTORY_KEY);

    } catch (error) {
      console.error('清除聊天历史失败:', error);
    }
  };

  return {
    // 状态
    messages,
    input,
    image,
    sendingMessage: sending,  // ✨ 修改返回名称与ChatScreen一致

    // 操作
    setInput,
    sendMessage,
    selectChatImage,
    clearImage,
    clearChat,
  };
};

