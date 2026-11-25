import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppState } from '../contexts/AppStateContext';
import { chatStore, useAccountChat } from '../hooks/useChat';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import { deleteSignedInAccount } from '../storage/accountDeletion';

export function PrivacyScreen({ navigation, onboarding = false }) {
  const { currentLanguage } = useAppState();
  const zh = currentLanguage === 'zh';
  const chat = useAccountChat();
  const { userToken, userId, server, logout } = useAuth();
  const [password, setPassword] = useState('');
  const deleting = React.useRef(false);
  const [legacy, setLegacy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    chatStore.hasLegacy().then(found => { if (active) setLegacy(found); }).catch(() => {});
    return () => { active = false; };
  }, [chat]);

  async function erase() {
    if (busy || !confirm) return;
    const target = confirm;
    setBusy(true);
    try {
      if (target === 'legacy') {
        await chatStore.clearLegacy();
        setLegacy(false);
      } else {
        await chat.clear();
      }
      setNotice(zh ? '已清除所选聊天记录。' : 'Selected chat history cleared.');
      setConfirm(null);
    } catch {
      setNotice(zh ? '清除失败，请重试。' : 'Could not clear history. Please try again.');
    } finally { setBusy(false); }
  }

  async function deleteAccount() {
    if (deleting.current || !password || apiClient.token !== userToken || apiClient.baseURL !== server) return;
    deleting.current = true;
    setBusy(true);
    setNotice('');
    try {
      const result = await deleteSignedInAccount({
        password, request: value => apiClient.delete('/users/me', { data: { password: value } }),
        removeChat: chat.clear, storage: AsyncStorage, userId,
        signOutIfCurrent: () => apiClient.token === userToken && apiClient.baseURL === server ? logout(true) : Promise.resolve(),
        notifyOtherTabs: () => {
          if (Platform.OS === 'web' && typeof BroadcastChannel === 'function') {
            const channel = new BroadcastChannel('fitbite.account-deleted.v1');
            channel.postMessage({ server, userId });
            channel.close();
          }
        },
      });
      const done = result.localDataCleared
        ? (zh ? '账号已注销，本机的账号数据已清除。' : 'Account deleted. Your account data on this device has been cleared.')
        : (zh ? '账号已注销。部分本机存储清除失败，共用设备请检查本机存储。' : 'Account deleted. Some local data could not be cleared. Check device storage on a shared device.');
      if (Platform.OS === 'web') window.alert(done);
      else Alert.alert(zh ? '账号注销' : 'Account deletion', done);
    } catch (error) {
      setNotice(error.status === 403
        ? (zh ? '当前密码不正确。' : 'The current password is incorrect.')
        : (zh ? '未收到注销确认，请检查连接后重试。' : 'Deletion was not confirmed. Check your connection and retry.'));
    } finally {
      deleting.current = false;
      setPassword('');
      setBusy(false);
    }
  }

  const button = (label, onPress, disabled = false) => (
    <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={onPress} disabled={busy || disabled}>
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
  function choose(target) {
    setPassword('');
    setNotice('');
    setConfirm(target);
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {button(onboarding ? (zh ? '‹ 返回' : '‹ Back') : (zh ? '‹ 返回设置' : '‹ Back to settings'), () => navigation.goBack())}
      <Text style={styles.title}>{zh ? '安全与隐私' : 'Security & Privacy'}</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>{zh ? '账号与本机数据' : 'Your account on this device'}</Text>
        <Text style={styles.body}>{Platform.OS === 'web'
          ? (zh ? '普通账号的登录凭证保存在此浏览器的标签页会话中。共用设备请在用完后退出登录。'
            : 'Your member sign-in is stored in the browser tab session. Sign out when you finish on a shared device.')
          : (zh ? '普通账号的登录凭证保存在设备系统的安全存储中。退出登录会移除已保存的凭证。'
            : 'Your member sign-in is kept in the device’s secure storage. Signing out removes the saved credential.')}</Text>
        <Text style={styles.body}>{zh
          ? '本机还会保存语言、提醒和显示偏好，以及按账号缓存的打卡日期。个人资料、饮食和训练记录保存在 FitBite 服务器。'
          : 'This device also stores language, reminder and display preferences, and caches account-specific check-in dates. Your profile, food and workout records are stored on the FitBite server.'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>{zh ? '本账号的 AI 聊天' : 'AI chat for this account'}</Text>
        <Text style={styles.body}>{zh
          ? '发送的文字和所选图片会提交到 FitBite 服务器。启用 AI 时，服务器会将这些内容交给配置的模型服务处理。本机保留聊天内容和图片引用，退出后可在同一账号中查看。清除会删除本机对话历史。'
          : 'Text and selected images are sent to the FitBite server. When AI is enabled, the server forwards them to its configured model provider. Chat messages and image references stay on this device for this account after sign-out. Clearing history removes this local conversation.'}</Text>
        {button(zh ? '清除我的本机聊天' : 'Clear my chat on this device', () => choose('account'))}
      </View>
      {legacy && (
        <View style={styles.card}>
          <Text style={styles.heading}>{zh ? '旧版本的本机记录' : 'History from an older version'}</Text>
          <Text style={styles.body}>{zh
            ? '此设备上有未标记账号的旧版聊天记录，可能由设备的其他使用者创建。该记录已隔离，任何账号都无法在聊天页查看。'
            : 'This device contains older chat history with no recorded owner. It may belong to another person who used this device. It is isolated from all account conversations.'}</Text>
          {button(zh ? '清除无归属旧记录' : 'Remove unassigned history', () => choose('legacy'))}
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.heading}>{zh ? '注销账号' : 'Delete account'}</Text>
        <Text style={styles.body}>{zh
          ? '永久删除服务器上的账号、个人资料、饮食与训练计划和记录、打卡、热量及姿态会话，并清除本机此账号的聊天和缓存。如需清除其他设备的本机聊天，请先在那些设备上清除。'
          : 'Permanently delete your account, profile, meal and workout plans and records, check-ins, calorie records and pose sessions. This also clears your chat and account caches on this device. To clear local chats on other devices, erase them there first.'}</Text>
        {confirm !== 'delete' && button(zh ? '注销我的账号' : 'Delete my account', () => choose('delete'))}
        {confirm === 'delete' && <>
          <Text style={styles.body}>{zh ? '此操作无法撤销。输入当前密码后确认。' : 'This action is permanent. Enter your current password to confirm.'}</Text>
          <TextInput style={styles.password} value={password} onChangeText={setPassword} secureTextEntry
            autoCapitalize="none" autoCorrect={false} autoComplete="current-password"
            accessibilityLabel={zh ? '当前密码' : 'Current password'} placeholderTextColor="#9b9b9b"
            editable={!busy} placeholder={zh ? '当前密码' : 'Current password'} />
          {button(zh ? '确认永久注销' : 'Confirm permanent deletion', deleteAccount, !password)}
          {button(zh ? '取消' : 'Cancel', () => choose(null))}
        </>}
      </View>
      {confirm && confirm !== 'delete' && (
        <View style={styles.card}>
          <Text style={styles.body}>{confirm === 'legacy'
            ? (zh ? '永久清除此设备上的旧版无归属聊天？' : 'Permanently remove unassigned history from this device?')
            : (zh ? '永久清除此账号在本机保存的聊天？' : 'Permanently clear this account’s chat on this device?')}</Text>
          {button(zh ? '确认清除' : 'Confirm removal', erase)}
          {button(zh ? '取消' : 'Cancel', () => setConfirm(null))}
        </View>
      )}
      {!!notice && <Text style={styles.body} accessibilityLiveRegion="polite">{notice}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { paddingHorizontal: 20, paddingTop: 46, paddingBottom: 48 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginVertical: 12 },
  card: { backgroundColor: '#222', padding: 16, borderRadius: 12, marginBottom: 12 },
  password: { backgroundColor: '#333', color: '#fff', borderRadius: 6, padding: 12, marginTop: 12 },
  heading: { color: '#fff', fontSize: 17, fontWeight: '600' },
  body: { color: '#d1d1d1', fontSize: 14, lineHeight: 21, marginTop: 8 },
  action: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  actionText: { color: '#d0fd3e', fontWeight: '600' },
});
