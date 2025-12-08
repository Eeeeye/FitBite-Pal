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
  Image,
} from 'react-native';
import { t } from '../../services/i18n';
import { useAuth } from '../contexts';

export const LoginScreen = ({ navigation }) => {
  const { login, loading } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert(t('error'), t('pleaseEnterUsernameAndPassword'));
      return;
    }

    const result = await login(identifier, password);
    
    if (result.success) {
      // ✨ 关键新增：检查是否需要Onboarding（与App1.js完全一致）
      if (result.needsOnboarding) {

        navigation.replace('Gender');
      } else {

        Alert.alert('欢迎回来', '登录成功！');
        // 导航由路由守卫自动处理
      }
    } else {
      Alert.alert(t('loginFailed'), result.message || t('pleaseCheckCredentials'));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 返回按钮 */}
        <TouchableOpacity style={styles.backButtonTop} onPress={() => navigation.goBack()}>
          <Image
            source={require('../../assets/images/80de32adf4cf23133ae3ea2ff5e6b98e.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <Text style={styles.title}>{t('signIn').toUpperCase()}</Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputLabelRow}>
            <Image
              source={require('../../assets/images/61aa4446f745a33b654c60753e53649a.png')}
              style={styles.inputIcon}
              resizeMode="contain"
            />
            <Text style={styles.label}>{t('usernameOrEmail')}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={t('enterUsernameOrEmail')}
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputLabelRow}>
            <Image
              source={require('../../assets/images/adfe28aa68e1ea1fec877bc898f57f37.png')}
              style={styles.inputIcon}
              resizeMode="contain"
            />
            <Text style={styles.label}>{t('password')}</Text>
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder={t('enterPassword')}
              placeholderTextColor="#666"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Image
                source={require('../../assets/images/a64831d94973f30eb92c83170f029bc1.png')}
                style={styles.eyeIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.forgotPassword}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>{t('signIn')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>
            {t('noAccount')} <Text style={styles.linkHighlight}>{t('signUp')}</Text>
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
  backButtonTop: {
    marginBottom: 30,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 24,
    height: 24,
  },
  eyeIcon: {
    width: 24,
    height: 24,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#a4ff3e',
  },
  button: {
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
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
