import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { t } from '../../services/i18n';
import { 
  getServerConfig, 
  saveServerConfig, 
  testServerConnection,
  initServerConfig,
} from '../../services/serverConfig';

export const SplashScreen = ({ navigation }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [serverIP, setServerIP] = useState('');
  const [serverPort, setServerPort] = useState('8080');
  const [customUrl, setCustomUrl] = useState('');
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // 加载已保存的配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    await initServerConfig();
    const config = await getServerConfig();
    setServerIP(config.ip || '');
    setServerPort(config.port || '8080');
    setCustomUrl(config.customUrl || '');
    setUseCustomUrl(config.useCustomUrl || false);
  };

  // 获取当前显示的 URL
  const getCurrentUrl = () => {
    if (useCustomUrl && customUrl.trim()) {
      const url = customUrl.trim();
      // 确保 URL 以 /api 结尾
      return url.endsWith('/api') ? url : (url.endsWith('/') ? url + 'api' : url + '/api');
    }
    return `http://${serverIP}:${serverPort}/api`;
  };

  // 测试连接
  const handleTestConnection = async () => {
    if (useCustomUrl) {
      if (!customUrl.trim()) {
        Alert.alert('提示', '请输入服务器 URL');
        return;
      }
    } else {
      if (!serverIP.trim()) {
        Alert.alert('提示', '请输入服务器 IP 地址');
        return;
      }
    }
    
    setTesting(true);
    setConnectionStatus(null);
    
    const result = await testServerConnection(
      useCustomUrl ? customUrl.trim() : serverIP.trim(), 
      serverPort.trim() || '8080',
      useCustomUrl
    );
    
    setTesting(false);
    setConnectionStatus(result);
    
    if (result.success) {
      Alert.alert('✅ 连接成功', '服务器连接正常！');
    } else {
      Alert.alert('❌ 连接失败', result.message);
    }
  };

  // 保存配置
  const handleSaveConfig = async () => {
    if (useCustomUrl) {
      if (!customUrl.trim()) {
        Alert.alert('提示', '请输入服务器 URL');
        return;
      }
    } else {
      if (!serverIP.trim()) {
        Alert.alert('提示', '请输入服务器 IP 地址');
        return;
      }
    }

    const success = await saveServerConfig(
      serverIP.trim(), 
      serverPort.trim() || '8080',
      customUrl.trim(),
      useCustomUrl
    );
    
    if (success) {
      Alert.alert('✅ 保存成功', '服务器地址已更新，请重启应用使配置生效', [
        { text: '好的', onPress: () => setShowSettings(false) }
      ]);
    } else {
      Alert.alert('保存失败', '请重试');
    }
  };

  return (
    <View style={styles.splashContainer}>
      {/* 右上角设置按钮 */}
      <SafeAreaView style={styles.settingsButtonContainer}>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Logo图标 */}
      <Image
        source={require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png')}
        style={styles.splashLogo}
        resizeMode="contain"
      />
      
      {/* App名称 */}
      <Image
        source={require('../../assets/images/3220fd611a7b9030150c84a771a9f27c.png')}
        style={styles.splashTitle}
        resizeMode="contain"
      />
      
      {/* 副标题 */}
      <Text style={styles.splashSubtitle}>{t('appSubtitle')}</Text>
      
      {/* Start Now按钮 */}
      <TouchableOpacity 
        style={styles.splashButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.splashButtonText}>{t('startNow')}</Text>
        <Text style={styles.splashButtonIcon}>›</Text>
      </TouchableOpacity>

      {/* 服务器配置弹窗 */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 标题栏 */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔧 服务器配置</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 模式切换 */}
            <View style={styles.modeToggle}>
              <TouchableOpacity 
                style={[styles.modeButton, !useCustomUrl && styles.modeButtonActive]}
                onPress={() => setUseCustomUrl(false)}
              >
                <Text style={[styles.modeButtonText, !useCustomUrl && styles.modeButtonTextActive]}>
                  IP + 端口
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeButton, useCustomUrl && styles.modeButtonActive]}
                onPress={() => setUseCustomUrl(true)}
              >
                <Text style={[styles.modeButtonText, useCustomUrl && styles.modeButtonTextActive]}>
                  自定义 URL
                </Text>
              </TouchableOpacity>
            </View>

            {!useCustomUrl ? (
              <>
                {/* 说明文字 */}
                <Text style={styles.helpText}>
                  请输入后端服务器的 IP 地址。{'\n'}
                  在电脑上运行 ipconfig (Windows) 或 ifconfig (Mac) 查看。
                </Text>

                {/* IP 输入 */}
                <Text style={styles.inputLabel}>服务器 IP 地址</Text>
                <TextInput
                  style={styles.input}
                  value={serverIP}
                  onChangeText={setServerIP}
                  placeholder="例如: 192.168.10.5"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                />

                {/* 端口输入 */}
                <Text style={styles.inputLabel}>端口号（默认 8080）</Text>
                <TextInput
                  style={styles.input}
                  value={serverPort}
                  onChangeText={setServerPort}
                  placeholder="8080"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </>
            ) : (
              <>
                {/* 说明文字 */}
                <Text style={styles.helpText}>
                  输入完整的服务器 URL，支持 http/https。{'\n'}
                  例如: https://xxx.ngrok-free.dev
                </Text>

                {/* URL 输入 */}
                <Text style={styles.inputLabel}>服务器 URL</Text>
                <TextInput
                  style={styles.input}
                  value={customUrl}
                  onChangeText={setCustomUrl}
                  placeholder="例如: https://xxx.ngrok-free.dev"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </>
            )}

            {/* 当前配置显示 */}
            <View style={styles.currentConfig}>
              <Text style={styles.currentConfigText}>
                当前地址: {getCurrentUrl()}
              </Text>
            </View>

            {/* 连接状态 */}
            {connectionStatus && (
              <View style={[
                styles.statusBox,
                connectionStatus.success ? styles.statusSuccess : styles.statusError
              ]}>
                <Text style={styles.statusText}>
                  {connectionStatus.success ? '✅ ' : '❌ '}{connectionStatus.message}
                </Text>
              </View>
            )}

            {/* 按钮区 */}
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.testButton]}
                onPress={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>测试连接</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveConfig}
              >
                <Text style={styles.actionButtonText}>保存配置</Text>
              </TouchableOpacity>
            </View>

            {/* 提示 */}
            <Text style={styles.tipText}>
              💡 提示：修改后需要重启应用才能生效
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  settingsButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 100,
  },
  settingsButton: {
    padding: 15,
    marginTop: 10,
    marginRight: 10,
  },
  settingsButtonText: {
    fontSize: 24,
  },
  splashLogo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  splashTitle: {
    width: 250,
    height: 70,
    marginBottom: 20,
  },
  splashSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 60,
    paddingHorizontal: 40,
  },
  splashButton: {
    backgroundColor: '#a4ff3e',
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    justifyContent: 'center',
  },
  splashButtonText: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
    marginRight: 8,
  },
  splashButtonIcon: {
    color: '#000',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // 弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
    padding: 5,
  },
  helpText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#a4ff3e',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4a4a4a',
  },
  currentConfig: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  currentConfigText: {
    fontSize: 13,
    color: '#a4ff3e',
    fontFamily: 'monospace',
  },
  statusBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  statusSuccess: {
    backgroundColor: 'rgba(164, 255, 62, 0.2)',
    borderColor: '#a4ff3e',
    borderWidth: 1,
  },
  statusError: {
    backgroundColor: 'rgba(255, 100, 100, 0.2)',
    borderColor: '#ff6464',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  testButton: {
    backgroundColor: '#4a4a4a',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#a4ff3e',
    marginLeft: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#a4ff3e',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#000',
  },
});
