import React, { useState, useEffect } from 'react';
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
import { sendResetCode, verifyCode } from '../api/auth';
import { useAppState } from '../contexts/AppStateContext'; // ✨ 新增：国际化支持

export const ForgotPasswordScreen = ({ navigation }) => {
  const { currentLanguage } = useAppState(); // ✨ 获取当前语言
  const [resetEmail, setResetEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(''); // ✨ 验证码输入
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false); // ✨ 验证码验证中
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendVerificationCode = async () => {
    if (!resetEmail) {
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '请输入您的邮箱地址' : 'Please enter your email address'
      );
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '请输入有效的邮箱地址' : 'Please enter a valid email address'
      );
      return;
    }

    setLoading(true);
    try {
      const response = await sendResetCode({ email: resetEmail.trim() });
      
      if (response.success) {
        setCodeSent(true);
        setCountdown(60);
        Alert.alert(
          currentLanguage === 'zh' ? '成功' : 'Success',
          currentLanguage === 'zh' ? '验证码已发送到您的邮箱！' : 'Verification code sent to your email!'
        );
      } else {
        Alert.alert(
          currentLanguage === 'zh' ? '错误' : 'Error',
          response.message || (currentLanguage === 'zh' ? '发送验证码失败' : 'Failed to send verification code')
        );
      }
    } catch (error) {
      if (__DEV__) {
        console.log('发送验证码失败:', error.message);
      }
      
      // 提取详细错误信息
      let errorMessage = currentLanguage === 'zh' ? '网络错误，请重试' : 'Network error. Please try again.';
      
      if (error.data && error.data.data) {
        // 验证错误：显示具体字段错误
        const errors = error.data.data;
        if (errors.email) {
          errorMessage = currentLanguage === 'zh' 
            ? `邮箱错误: ${errors.email}` 
            : `Email error: ${errors.email}`;
        } else {
          errorMessage = Object.values(errors).join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  // ✨ 验证验证码并进入下一步
  const handleVerifyAndNext = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '请输入完整的6位验证码' : 'Please enter the complete 6-digit code'
      );
      return;
    }

    setVerifying(true);
    try {
      const response = await verifyCode({
        email: resetEmail.trim(),
        code: verificationCode
      });

      if (response.success) {
        // 验证成功，进入重置密码页面
        navigation.navigate('ResetPassword', {
          email: resetEmail.trim(),
          code: verificationCode
        });
      } else {
        Alert.alert(
          currentLanguage === 'zh' ? '错误' : 'Error',
          response.message || (currentLanguage === 'zh' ? '验证码错误' : 'Invalid verification code')
        );
      }
    } catch (error) {
      console.error('Verify code error:', error);
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '验证码错误或已过期，请重新发送' : 'Verification code is invalid or expired. Please resend.'
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => {
          navigation.goBack();
        }} style={styles.backButton}>
          <Text style={styles.backText}>
            ← {currentLanguage === 'zh' ? '返回' : 'Back'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {currentLanguage === 'zh' ? '忘记密码' : 'FORGOT PASSWORD'}
        </Text>
        <Text style={styles.subtitle}>
          {currentLanguage === 'zh' 
            ? '输入您的邮箱地址以接收验证码' 
            : 'Enter your email address to receive a verification code'}
        </Text>
        
        <Text style={styles.label}>
          {currentLanguage === 'zh' ? '邮箱' : 'E-mail'}
        </Text>
        <TextInput 
          style={styles.input} 
          placeholder={currentLanguage === 'zh' ? '输入邮箱' : 'Enter email'}
          placeholderTextColor="#666" 
          value={resetEmail}
          onChangeText={setResetEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!codeSent}
        />

        <TouchableOpacity 
          style={[
            styles.button, 
            (loading || countdown > 0) && { opacity: 0.6 }
          ]} 
          onPress={handleSendVerificationCode}
          disabled={loading || countdown > 0}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>
              {countdown > 0 
                ? (currentLanguage === 'zh' ? `${countdown}秒后重发` : `Resend in ${countdown}s`)
                : (currentLanguage === 'zh' ? '发送验证码' : 'Send Code')}
            </Text>
          )}
        </TouchableOpacity>

        {codeSent && (
          <>
            <Text style={[styles.label, { marginTop: 24 }]}>
              {currentLanguage === 'zh' ? '验证码' : 'Verification Code'}
            </Text>
            <TextInput 
              style={styles.input} 
              placeholder={currentLanguage === 'zh' ? '输入6位验证码' : 'Enter 6-digit code'}
              placeholderTextColor="#666" 
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity 
              style={[
                styles.button, 
                { backgroundColor: '#a4ff3e', marginTop: 16 },
                (verifying || !verificationCode || verificationCode.length < 6) && { opacity: 0.6 }
              ]}
              onPress={handleVerifyAndNext}
              disabled={verifying || !verificationCode || verificationCode.length < 6}
            >
              {verifying ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>
                  {currentLanguage === 'zh' ? '验证并下一步 →' : 'Verify & Next →'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 16 }}>
          <Text style={styles.linkText}>
            {currentLanguage === 'zh' ? '记得密码？' : 'Remember password? '}
            <Text style={styles.linkHighlight}>
              {currentLanguage === 'zh' ? '登录' : 'Sign in'}
            </Text>
          </Text>
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
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  linkText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  linkHighlight: {
    color: '#a4ff3e',
    fontWeight: 'bold',
  },
});
