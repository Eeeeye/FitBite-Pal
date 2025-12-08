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
import { t } from '../../services/i18n';
import { useAuth, useAppState } from '../contexts';

export const RegisterScreen = ({ navigation }) => {
  const { register, loading } = useAuth();
  const { currentLanguage } = useAppState();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '请填写所有字段' : 'Please fill all fields'
      );
      return;
    }

    const result = await register(username, email, password);
    
    if (result.success) {
      Alert.alert(
        currentLanguage === 'zh' ? '成功' : 'Success',
        currentLanguage === 'zh' ? '注册成功！' : 'Registration successful!',
        [
          {
            text: 'OK',
            onPress: () => {
              // ✨ 注册成功后导航到Gender页面开始新手引导（与App1.js一致）

              navigation.navigate('Gender');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        currentLanguage === 'zh' ? '注册失败' : 'Registration Failed',
        result.message || (currentLanguage === 'zh' ? '请检查您的信息' : 'Please check your information')
      );
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
          {currentLanguage === 'zh' ? '注册' : 'SIGN UP'}
        </Text>
        
        <Text style={styles.label}>
          {currentLanguage === 'zh' ? '用户名' : 'User name'}
        </Text>
        <TextInput 
          style={styles.input} 
          placeholder={currentLanguage === 'zh' ? '输入用户名' : 'Enter username'}
          placeholderTextColor="#666" 
          value={username}
          onChangeText={setUsername}
        />
        
        <Text style={styles.label}>
          {currentLanguage === 'zh' ? '邮箱' : 'E-mail'}
        </Text>
        <TextInput 
          style={styles.input} 
          placeholder={currentLanguage === 'zh' ? '输入邮箱' : 'Enter email'}
          placeholderTextColor="#666" 
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <Text style={styles.label}>
          {currentLanguage === 'zh' ? '密码' : 'Password'}
        </Text>
        <TextInput 
          style={styles.input} 
          placeholder={currentLanguage === 'zh' ? '输入密码' : 'Enter password'}
          placeholderTextColor="#666" 
          secureTextEntry={true}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.6 }]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>
              {currentLanguage === 'zh' ? '注册' : 'Sign up'}
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
    marginBottom: 40,
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
