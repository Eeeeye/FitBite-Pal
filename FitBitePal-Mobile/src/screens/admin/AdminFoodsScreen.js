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

const CATEGORY_OPTIONS = [
  { value: '', label: '全部分类' },
  { value: '主食', label: '🍚 主食' },
  { value: '蔬菜', label: '🥬 蔬菜' },
  { value: '水果', label: '🍎 水果' },
  { value: '肉类', label: '🥩 肉类' },
  { value: '海鲜', label: '🦐 海鲜' },
  { value: '蛋奶', label: '🥛 蛋奶' },
  { value: '饮品', label: '🍵 饮品' },
  { value: '其他', label: '🍽️ 其他' },
];

export const AdminFoodsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [foods, setFoods] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    category: '主食',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    keywords: '',
  });

  const loadFoods = useCallback(async () => {
    try {
      let url = `${API_BASE}/foods`;
      if (categoryFilter) {
        url += `?category=${encodeURIComponent(categoryFilter)}`;
      }

      const response = await apiClient.get(url);
      if (response.success && response.data) {
        setFoods(response.data.foods || []);
      }
    } catch (error) {
      console.error('加载食品库失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    loadFoods();
  }, [loadFoods]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFoods();
  }, [loadFoods]);

  const openAddModal = () => {
    setEditingFood(null);
    setFormData({
      name: '',
      nameEn: '',
      category: '主食',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      keywords: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (food) => {
    setEditingFood(food);
    setFormData({
      name: food.name || '',
      nameEn: food.nameEn || '',
      category: food.category || '主食',
      calories: String(food.calories || ''),
      protein: String(food.protein || ''),
      carbs: String(food.carbs || ''),
      fat: String(food.fat || ''),
      keywords: food.keywords || '',
    });
    setModalVisible(true);
  };

  const saveFood = async () => {
    if (!formData.name.trim()) {
      Alert.alert('错误', '请输入食品名称');
      return;
    }

    const foodData = {
      name: formData.name,
      nameEn: formData.nameEn,
      category: formData.category,
      calories: parseInt(formData.calories) || null,
      protein: parseFloat(formData.protein) || null,
      carbs: parseFloat(formData.carbs) || null,
      fat: parseFloat(formData.fat) || null,
      keywords: formData.keywords,
      enabled: true,
    };

    try {
      let response;
      if (editingFood) {
        response = await apiClient.put(`${API_BASE}/foods/${editingFood.id}`, foodData);
      } else {
        response = await apiClient.post(`${API_BASE}/foods`, foodData);
      }

      if (response.success) {
        Alert.alert('成功', editingFood ? '食品已更新' : '食品已添加');
        setModalVisible(false);
        loadFoods();
      } else {
        Alert.alert('错误', response.message || '保存失败');
      }
    } catch (error) {
      Alert.alert('错误', '保存失败: ' + error.message);
    }
  };

  const deleteFood = (food) => {
    Alert.alert(
      '确认删除',
      `确定要删除"${food.name}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.delete(`${API_BASE}/foods/${food.id}`);
              if (response.success) {
                Alert.alert('成功', '食品已删除');
                loadFoods();
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

  const getCategoryIcon = (category) => {
    const option = CATEGORY_OPTIONS.find(o => o.value === category);
    return option ? option.label.split(' ')[0] : '🍽️';
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
        <Text style={styles.headerTitle}>食品库管理</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ 添加</Text>
        </TouchableOpacity>
      </View>

      {/* 筛选器 */}
      <View style={styles.filters}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={categoryFilter}
            onValueChange={setCategoryFilter}
            style={styles.picker}
            dropdownIconColor="#FFFFFF"
          >
            {CATEGORY_OPTIONS.map(option => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
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
        {foods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无食品数据</Text>
          </View>
        ) : (
          foods.map((food) => (
            <View key={food.id} style={styles.foodCard}>
              <View style={styles.foodHeader}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodIcon}>{getCategoryIcon(food.category)}</Text>
                  <View>
                    <Text style={styles.foodName}>{food.name}</Text>
                    {food.nameEn && (
                      <Text style={styles.foodNameEn}>{food.nameEn}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.categoryTag}>{food.category}</Text>
              </View>
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionItem}>🔥 {food.calories} kcal</Text>
                <Text style={styles.nutritionItem}>🥩 {food.protein}g</Text>
                <Text style={styles.nutritionItem}>🍚 {food.carbs}g</Text>
                <Text style={styles.nutritionItem}>🧈 {food.fat}g</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(food)}
                >
                  <Text style={styles.editBtnText}>编辑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteFood(food)}
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
                {editingFood ? '编辑食品' : '添加食品'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>食品名称 (中文)</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="例：白米饭"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.label}>食品名称 (英文)</Text>
              <TextInput
                style={styles.input}
                value={formData.nameEn}
                onChangeText={(text) => setFormData({ ...formData, nameEn: text })}
                placeholder="例：White Rice"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.label}>分类</Text>
              <View style={styles.modalPickerContainer}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  style={styles.modalPicker}
                  dropdownIconColor="#FFFFFF"
                >
                  <Picker.Item label="🍚 主食" value="主食" />
                  <Picker.Item label="🥬 蔬菜" value="蔬菜" />
                  <Picker.Item label="🍎 水果" value="水果" />
                  <Picker.Item label="🥩 肉类" value="肉类" />
                  <Picker.Item label="🦐 海鲜" value="海鲜" />
                  <Picker.Item label="🥛 蛋奶" value="蛋奶" />
                  <Picker.Item label="🍵 饮品" value="饮品" />
                  <Picker.Item label="🍽️ 其他" value="其他" />
                </Picker>
              </View>

              <View style={styles.nutritionInputs}>
                <View style={styles.nutritionInputGroup}>
                  <Text style={styles.label}>热量 (kcal/100g)</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={formData.calories}
                    onChangeText={(text) => setFormData({ ...formData, calories: text })}
                    placeholder="116"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.nutritionInputGroup}>
                  <Text style={styles.label}>蛋白质 (g/100g)</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={formData.protein}
                    onChangeText={(text) => setFormData({ ...formData, protein: text })}
                    placeholder="2.6"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.nutritionInputs}>
                <View style={styles.nutritionInputGroup}>
                  <Text style={styles.label}>碳水 (g/100g)</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={formData.carbs}
                    onChangeText={(text) => setFormData({ ...formData, carbs: text })}
                    placeholder="25.6"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.nutritionInputGroup}>
                  <Text style={styles.label}>脂肪 (g/100g)</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={formData.fat}
                    onChangeText={(text) => setFormData({ ...formData, fat: text })}
                    placeholder="0.3"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.label}>识别关键词（逗号分隔）</Text>
              <TextInput
                style={styles.input}
                value={formData.keywords}
                onChangeText={(text) => setFormData({ ...formData, keywords: text })}
                placeholder="米饭,白饭,蒸饭"
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
              <TouchableOpacity style={styles.saveBtn} onPress={saveFood}>
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
  filters: {
    padding: 12,
  },
  pickerContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#FFFFFF',
    height: 50,
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
  foodCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  foodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foodIcon: {
    fontSize: 32,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  foodNameEn: {
    fontSize: 12,
    color: '#94A3B8',
  },
  categoryTag: {
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    overflow: 'hidden',
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutritionItem: {
    color: '#94A3B8',
    fontSize: 13,
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
  nutritionInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  nutritionInputGroup: {
    flex: 1,
  },
  smallInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
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

export default AdminFoodsScreen;

