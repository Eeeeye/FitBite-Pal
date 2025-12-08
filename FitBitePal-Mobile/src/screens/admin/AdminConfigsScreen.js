import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../../api/client';

const API_BASE = '/admin'; // 注意：baseURL 已包含 /api

export const AdminConfigsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [configs, setConfigs] = useState([]);
  
  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    configKey: '',
    configValue: '',
    configType: 'STRING',
    category: 'AI模型',
    description: '',
  });

  const loadConfigs = useCallback(async () => {
    try {
      const response = await apiClient.get(`${API_BASE}/configs`);
      if (response.success && response.data) {
        setConfigs(response.data.configs || []);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConfigs();
  }, [loadConfigs]);

  const initDefaults = async () => {
    Alert.alert(
      '初始化配置',
      '确定要初始化默认配置吗？这将添加一些常用的AI模型配置项。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              const response = await apiClient.post(`${API_BASE}/configs/init-defaults`);
              if (response.success) {
                Alert.alert('成功', '默认配置已初始化');
                loadConfigs();
              } else {
                Alert.alert('错误', response.message || '初始化失败');
              }
            } catch (error) {
              Alert.alert('错误', '初始化失败: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const openAddModal = () => {
    setEditingConfig(null);
    setFormData({
      configKey: '',
      configValue: '',
      configType: 'STRING',
      category: 'AI模型',
      description: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (config) => {
    setEditingConfig(config);
    setFormData({
      configKey: config.configKey || '',
      configValue: config.configValue || '',
      configType: config.configType || 'STRING',
      category: config.category || 'AI模型',
      description: config.description || '',
    });
    setModalVisible(true);
  };

  const saveConfig = async () => {
    if (!formData.configKey.trim()) {
      Alert.alert('错误', '请输入配置键');
      return;
    }

    const configData = {
      configKey: formData.configKey,
      configValue: formData.configValue,
      configType: formData.configType,
      category: formData.category,
      description: formData.description,
    };

    try {
      let response;
      if (editingConfig) {
        response = await apiClient.put(`${API_BASE}/configs/${editingConfig.id}`, configData);
      } else {
        response = await apiClient.post(`${API_BASE}/configs`, configData);
      }

      if (response.success) {
        Alert.alert('成功', editingConfig ? '配置已更新' : '配置已添加');
        setModalVisible(false);
        loadConfigs();
      } else {
        Alert.alert('错误', response.message || '保存失败');
      }
    } catch (error) {
      Alert.alert('错误', '保存失败: ' + error.message);
    }
  };

  const deleteConfig = (config) => {
    Alert.alert(
      '确认删除',
      `确定要删除配置"${config.configKey}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.delete(`${API_BASE}/configs/${config.id}`);
              if (response.success) {
                Alert.alert('成功', '配置已删除');
                loadConfigs();
              } else {
                Alert.alert('错误', response.message || '删除失败');
              }
            } catch (error) {
              Alert.alert('错误', '删除失败: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const getCategoryColor = (category) => {
    const colors = {
      'AI模型': '#10B981',
      '业务规则': '#F59E0B',
      '系统': '#EF4444',
    };
    return colors[category] || '#4F46E5';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>系统配置</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ 添加</Text>
        </TouchableOpacity>
      </View>

      {/* 操作栏 */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.initBtn} onPress={initDefaults}>
          <Text style={styles.initBtnText}>🔧 初始化默认配置</Text>
        </TouchableOpacity>
      </View>

      {/* 列表 */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
          />
        }
      >
        {configs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无配置数据</Text>
            <Text style={styles.emptyHint}>点击"初始化默认配置"添加基础配置</Text>
          </View>
        ) : (
          configs.map((config) => (
            <View key={config.id} style={styles.configCard}>
              <View style={styles.configHeader}>
                <Text style={styles.configKey}>{config.configKey}</Text>
                <View style={[
                  styles.categoryTag,
                  { backgroundColor: getCategoryColor(config.category) }
                ]}>
                  <Text style={styles.categoryText}>{config.category}</Text>
                </View>
              </View>
              <Text style={styles.configValue}>{config.configValue}</Text>
              <Text style={styles.configDesc}>{config.description || '暂无描述'}</Text>
              <View style={styles.configMeta}>
                <Text style={styles.metaText}>类型: {config.configType}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(config)}
                >
                  <Text style={styles.editBtnText}>编辑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteConfig(config)}
                >
                  <Text style={styles.deleteBtnText}>删除</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 添加/编辑模态框 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingConfig ? '编辑配置' : '添加配置'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>配置键</Text>
              <TextInput
                style={styles.input}
                value={formData.configKey}
                onChangeText={(text) => setFormData({ ...formData, configKey: text })}
                placeholder="例：pose.confidence.threshold"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.label}>配置值</Text>
              <TextInput
                style={styles.input}
                value={formData.configValue}
                onChangeText={(text) => setFormData({ ...formData, configValue: text })}
                placeholder="例：0.7"
                placeholderTextColor="#64748B"
              />

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>类型</Text>
                  <View style={styles.modalPickerContainer}>
                    <Picker
                      selectedValue={formData.configType}
                      onValueChange={(value) => setFormData({ ...formData, configType: value })}
                      style={styles.modalPicker}
                      dropdownIconColor="#FFFFFF"
                    >
                      <Picker.Item label="STRING" value="STRING" />
                      <Picker.Item label="INTEGER" value="INTEGER" />
                      <Picker.Item label="DOUBLE" value="DOUBLE" />
                      <Picker.Item label="BOOLEAN" value="BOOLEAN" />
                      <Picker.Item label="JSON" value="JSON" />
                    </Picker>
                  </View>
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>分类</Text>
                  <View style={styles.modalPickerContainer}>
                    <Picker
                      selectedValue={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      style={styles.modalPicker}
                      dropdownIconColor="#FFFFFF"
                    >
                      <Picker.Item label="AI模型" value="AI模型" />
                      <Picker.Item label="业务规则" value="业务规则" />
                      <Picker.Item label="系统" value="系统" />
                    </Picker>
                  </View>
                </View>
              </View>

              <Text style={styles.label}>描述</Text>
              <TextInput
                style={styles.input}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="配置说明"
                placeholderTextColor="#64748B"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveConfig}>
                <Text style={styles.saveBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    color: '#4F46E5',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  toolbar: {
    padding: 12,
  },
  initBtn: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  initBtnText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
  },
  emptyHint: {
    color: '#475569',
    fontSize: 14,
    marginTop: 8,
  },
  configCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  configKey: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F46E5',
    flex: 1,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  configValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  configDesc: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  configMeta: {
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  deleteBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeBtn: {
    fontSize: 20,
    color: '#94A3B8',
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  label: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  modalPickerContainer: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalPicker: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default AdminConfigsScreen;

