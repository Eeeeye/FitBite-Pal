import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useChat } from '../hooks';
import { selectImageSource } from '../../services/cameraService';
import { useAppState } from '../contexts';

export const ChatScreen = ({ navigation }) => {
  const { messages, sendMessage, sendingMessage, clearChat } = useChat();
  const { currentLanguage } = useAppState();
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const scrollViewRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() && !attachedImage) return;

    // ✨ 保存消息内容（在清空前）
    const messageText = inputText;
    const messageImage = attachedImage;
    
    // ✨ 立即清空输入框（在发送前，提升用户体验）
    setInputText('');
    setAttachedImage(null);
    
    // 发送消息
    await sendMessage(messageText, messageImage);
  };

  const handleAttachImage = async () => {
    try {
      const image = await selectImageSource();
      if (image) {
        // ✨ 修复：selectImageSource返回对象{uri: '...'}
        const imageUri = typeof image === 'string' ? image : image.uri;
        if (imageUri) {
          setAttachedImage(imageUri);

        }
      }
    } catch (error) {
      console.error('Failed to attach image:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.aiChatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.aiChatTitle}>
          {currentLanguage === 'zh' ? 'AI 伴侣' : 'AI Companion'}
        </Text>
        {/* ✨ 清空聊天记录按钮 */}
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              currentLanguage === 'zh' ? '清空聊天' : 'Clear Chat',
              currentLanguage === 'zh' 
                ? '确定要清空所有聊天记录吗？' 
                : 'Are you sure you want to clear all chat history?',
              [
                { text: currentLanguage === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
                {
                  text: currentLanguage === 'zh' ? '清空' : 'Clear',
                  style: 'destructive',
                  onPress: () => clearChat()
                }
              ]
            );
          }}
        >
          <Text style={styles.clearButton}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.aiChatMessages}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          message.type === 'ai' ? (
            <View key={message.id} style={styles.aiMessageContainer}>
              <Image
                source={require('../../assets/images/e026f42738076aa451f39345cc3c931c.png')}
                style={styles.aiAvatar}
                resizeMode="contain"
              />
              <View style={styles.aiMessageBubble}>
                <Text style={styles.aiMessageText}>{message.text}</Text>
                <Text style={styles.aiMessageTime}>{message.time}</Text>
              </View>
            </View>
          ) : (
            <View key={message.id} style={styles.userMessageContainer}>
              <View style={styles.userMessageBubble}>
                {message.image && (
                  <Image
                    source={{ uri: message.image }}
                    style={styles.chatMessageImage}
                    resizeMode="cover"
                  />
                )}
                {message.text ? (
                  <Text style={styles.userMessageText}>{message.text}</Text>
                ) : null}
                <Text style={styles.userMessageTime}>{message.time}</Text>
              </View>
            </View>
          )
        ))}

        {sendingMessage && (
          <View style={styles.aiMessageContainer}>
            <Image
              source={require('../../assets/images/e026f42738076aa451f39345cc3c931c.png')}
              style={styles.aiAvatar}
              resizeMode="contain"
            />
            <View style={styles.aiMessageBubble}>
              <ActivityIndicator size="small" color="#92E3A9" />
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Input Area */}
      <View style={styles.aiChatInputContainer}>
        {/* Camera Button */}
        <TouchableOpacity 
          style={styles.chatCameraButton}
          onPress={handleAttachImage}
        >
          <Image
            source={require('../../assets/images/7adb54d24d8901a49fe2b9560c2b5fda.png')}
            style={styles.chatCameraIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Input Field */}
        <View style={styles.chatInputWrapper}>
          {attachedImage && (
            <View style={styles.chatImagePreview}>
              <Image
                source={{ uri: attachedImage }}
                style={styles.chatImagePreviewImg}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.chatImageRemove}
                onPress={() => setAttachedImage(null)}
              >
                <Text style={styles.chatImageRemoveText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.aiChatInput}
            placeholder="Type your message..."
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity 
          style={[styles.aiSendButton, (!inputText.trim() && !attachedImage) && styles.aiSendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() && !attachedImage}
        >
          <Image
            source={require('../../assets/images/f9c2b6e3431fd609930d93a7eb32c77b.png')}
            style={styles.aiSendIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  aiChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backArrow: {
    fontSize: 28,
    color: '#a4ff3e',
    fontWeight: 'bold',
  },
  aiChatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    fontSize: 24,
    width: 40,
    textAlign: 'center',
  },
  aiChatMessages: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  aiMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  aiMessageBubble: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 16,
    maxWidth: '75%',
  },
  aiMessageText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  aiMessageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  userMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  userMessageBubble: {
    backgroundColor: '#a4ff3e',
    borderRadius: 16,
    borderTopRightRadius: 4,
    padding: 16,
    maxWidth: '75%',
  },
  userMessageText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  userMessageTime: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 8,
    textAlign: 'right',
  },
  chatMessageImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  aiChatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  chatCameraButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chatCameraIcon: {
    width: 28,
    height: 28,
  },
  chatInputWrapper: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chatImagePreview: {
    position: 'relative',
    marginBottom: 8,
  },
  chatImagePreviewImg: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  chatImageRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatImageRemoveText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  aiChatInput: {
    fontSize: 15,
    color: '#fff',
    maxHeight: 100,
    paddingVertical: 0,
  },
  aiSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#a4ff3e',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  aiSendButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  aiSendIcon: {
    width: 24,
    height: 24,
  },
});
