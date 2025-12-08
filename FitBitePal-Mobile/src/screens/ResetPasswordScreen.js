import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { resetPassword } from '../api/auth';
import { useAppState } from '../contexts/AppStateContext'; // ✨ 国际化支持

export const ResetPasswordScreen = ({ navigation, route }) => {
  const { currentLanguage } = useAppState(); // ✨ 获取当前语言
  const { email, code } = route.params || {};
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '请填写所有字段' : 'Please fill in all fields'
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '密码至少需要6个字符' : 'Password must be at least 6 characters'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '两次密码输入不一致' : 'Passwords do not match'
      );
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword({
        email: email,
        code: code,
        newPassword: newPassword,
      });

      if (response.success) {
        Alert.alert(
          currentLanguage === 'zh' ? '成功' : 'Success',
          currentLanguage === 'zh' 
            ? '密码重置成功！您现在可以使用新密码登录了。' 
            : 'Password reset successfully! You can now login with your new password.',
          [{ 
            text: currentLanguage === 'zh' ? '确定' : 'OK', 
            onPress: () => navigation.navigate('Login') 
          }]
        );
      } else {
        Alert.alert(
          currentLanguage === 'zh' ? '错误' : 'Error',
          response.message || (currentLanguage === 'zh' ? '重置密码失败' : 'Failed to reset password')
        );
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '网络错误，请重试' : 'Network error. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>
            ← {currentLanguage === 'zh' ? '返回' : 'Back'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {currentLanguage === 'zh' ? '重置密码' : 'RESET PASSWORD'}
        </Text>
        <Text style={styles.subtitle}>
          {currentLanguage === 'zh' 
            ? '请输入您的新密码' 
            : 'Please enter your new password'}
        </Text>

        <Text style={styles.label}>
          {currentLanguage === 'zh' ? '新密码' : 'New Password'}
        </Text>
        <TextInput 
          style={styles.input} 
          placeholder={currentLanguage === 'zh' ? '输入新密码（至少6个字符）' : 'Enter new password (min 6 characters)'} 
          placeholderTextColor="#666" 
          secureTextEntry={true}
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Text style={styles.label}>
          {currentLanguage === 'zh' ? '确认密码' : 'Confirm Password'}
        </Text>
        <TextInput 
          style={styles.input} 
          placeholder={currentLanguage === 'zh' ? '再次输入新密码' : 'Re-enter new password'} 
          placeholderTextColor="#666" 
          secureTextEntry={true}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.6 }]} 
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>
              {currentLanguage === 'zh' ? '重置密码' : 'Reset Password'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 30,
  },
  backText: {
    fontSize: 18,
    color: '#a4ff3e',
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
