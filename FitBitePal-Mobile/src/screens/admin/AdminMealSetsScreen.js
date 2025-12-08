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

const GOAL_OPTIONS = [
  { value: '', label: '全部目标' },
  { value: 'Lose weight', label: '🥗 减脂' },
  { value: 'Build muscle', label: '💪 增肌' },
  { value: 'Keep fit', label: '🍱 健康' },
];

const MEAL_OPTIONS = [
  { value: '', label: '全部餐次' },
  { value: 'Breakfast', label: '🌅 早餐' },
  { value: 'Lunch', label: '☀️ 午餐' },
  { value: 'Dinner', label: '🌙 晚餐' },
];

export const AdminMealSetsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mealSets, setMealSets] = useState([]);
  const [goalFilter, setGoalFilter] = useState('');
  const [mealFilter, setMealFilter] = useState('');
  
  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMealSet, setEditingMealSet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    goalType: 'Lose weight',
    mealType: 'Breakfast',
    ingredients: '',
    ingredientsEn: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  const loadMealSets = useCallback(async () => {
    try {
      let url = `${API_BASE}/meal-sets`;
      const params = [];
      if (goalFilter) params.push(`goalType=${encodeURIComponent(goalFilter)}`);
      if (mealFilter) params.push(`mealType=${encodeURIComponent(mealFilter)}`);
      if (params.length > 0) url += '?' + params.join('&');

      const response = await apiClient.get(url);
      if (response.success && response.data) {
        setMealSets(response.data.mealSets || []);
      }
    } catch (error) {
      console.error('加载套餐失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [goalFilter, mealFilter]);

  useEffect(() => {
    loadMealSets();
  }, [loadMealSets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMealSets();
  }, [loadMealSets]);

  const openAddModal = () => {
    setEditingMealSet(null);
    setFormData({
      name: '',
      nameEn: '',
      goalType: 'Lose weight',
      mealType: 'Breakfast',
      ingredients: '',
      ingredientsEn: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (mealSet) => {
    setEditingMealSet(mealSet);
    setFormData({
      name: mealSet.name || '',
      nameEn: mealSet.nameEn || '',
      goalType: mealSet.goalType || 'Lose weight',
      mealType: mealSet.mealType || 'Breakfast',
      ingredients: mealSet.ingredients || '',
      ingredientsEn: mealSet.ingredientsEn || '',
      calories: String(mealSet.calories || ''),
      protein: String(mealSet.protein || ''),
      carbs: String(mealSet.carbs || ''),
      fat: String(mealSet.fat || ''),
    });
    setModalVisible(true);
  };

  const saveMealSet = async () => {
    if (!formData.name.trim()) {
      Alert.alert('错误', '请输入套餐名称（中文）');
      return;
    }
    if (!formData.nameEn.trim()) {
      Alert.alert('错误', '请输入套餐名称（英文）');
      return;
    }

    const mealSetData = {
      name: formData.name,
      nameEn: formData.nameEn,
      goalType: formData.goalType,
      mealType: formData.mealType,
      ingredients: formData.ingredients,
      ingredientsEn: formData.ingredientsEn,
      calories: parseInt(formData.calories) || 0,
      protein: parseInt(formData.protein) || 0,
      carbs: parseInt(formData.carbs) || 0,
      fat: parseInt(formData.fat) || 0,
      enabled: true,
    };

    try {
      let response;
      if (editingMealSet) {
        response = await apiClient.put(`${API_BASE}/meal-sets/${editingMealSet.id}`, mealSetData);
      } else {
        response = await apiClient.post(`${API_BASE}/meal-sets`, mealSetData);
      }

      if (response.success) {
        Alert.alert('成功', editingMealSet ? '套餐已更新' : '套餐已添加');
        setModalVisible(false);
        loadMealSets();
      } else {
        Alert.alert('错误', response.message || '保存失败');
      }
    } catch (error) {
      Alert.alert('错误', '保存失败: ' + error.message);
    }
  };

  const deleteMealSet = (mealSet) => {
    Alert.alert(
      '确认删除',
      `确定要删除套餐"${mealSet.name}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.delete(`${API_BASE}/meal-sets/${mealSet.id}`);
              if (response.success) {
                Alert.alert('成功', '套餐已删除');
                loadMealSets();
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

  const getGoalLabel = (goal) => {
    const option = GOAL_OPTIONS.find(o => o.value === goal);
    return option ? option.label : goal;
  };

  const getMealLabel = (meal) => {
    const option = MEAL_OPTIONS.find(o => o.value === meal);
    return option ? option.label : meal;
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
        <Text style={styles.headerTitle}>套餐管理</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ 添加</Text>
        </TouchableOpacity>
      </View>

      {/* 筛选器 */}
      <View style={styles.filters}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={goalFilter}
            onValueChange={setGoalFilter}
            style={styles.picker}
            dropdownIconColor="#FFFFFF"
          >
            {GOAL_OPTIONS.map(option => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={mealFilter}
            onValueChange={setMealFilter}
            style={styles.picker}
            dropdownIconColor="#FFFFFF"
          >
            {MEAL_OPTIONS.map(option => (
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
        {mealSets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无套餐数据</Text>
          </View>
        ) : (
          mealSets.map((mealSet) => (
            <View key={mealSet.id} style={styles.mealSetCard}>
              <View style={styles.mealSetHeader}>
                <Text style={styles.mealSetName}>{mealSet.name}</Text>
                <View style={styles.tags}>
                  <Text style={[styles.tag, styles.goalTag]}>{getGoalLabel(mealSet.goalType)}</Text>
                  <Text style={[styles.tag, styles.mealTag]}>{getMealLabel(mealSet.mealType)}</Text>
                </View>
              </View>
              <View style={styles.nutritionRow}>
                <Text style={styles.nutritionItem}>🔥 {mealSet.calories} kcal</Text>
                <Text style={styles.nutritionItem}>🥩 {mealSet.protein}g</Text>
                <Text style={styles.nutritionItem}>🍚 {mealSet.carbs}g</Text>
                <Text style={styles.nutritionItem}>🧈 {mealSet.fat}g</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(mealSet)}
                >
                  <Text style={styles.editBtnText}>编辑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteMealSet(mealSet)}
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
                {editingMealSet ? '编辑套餐' : '添加套餐'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>套餐名称（中文）*</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="例：燕麦粥配蓝莓"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.label}>套餐名称（英文）*</Text>
              <TextInput
                style={styles.input}
                value={formData.nameEn}
                onChangeText={(text) => setFormData({ ...formData, nameEn: text })}
                placeholder="e.g. Oatmeal with Blueberries"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.label}>适用目标</Text>
              <View style={styles.modalPickerContainer}>
                <Picker
                  selectedValue={formData.goalType}
                  onValueChange={(value) => setFormData({ ...formData, goalType: value })}
                  style={styles.modalPicker}
                  dropdownIconColor="#FFFFFF"
                >
                  <Picker.Item label="🥗 减脂" value="Lose weight" />
                  <Picker.Item label="💪 增肌" value="Build muscle" />
                  <Picker.Item label="🍱 健康" value="Keep fit" />
                </Picker>
              </View>

              <Text style={styles.label}>餐次</Text>
              <View style={styles.modalPickerContainer}>
                <Picker
                  selectedValue={formData.mealType}
                  onValueChange={(value) => setFormData({ ...formData, mealType: value })}
                  style={styles.modalPicker}
                  dropdownIconColor="#FFFFFF"
                >
                  <Picker.Item label="🌅 早餐" value="Breakfast" />
                  <Picker.Item label="☀️ 午餐" value="Lunch" />
                  <Picker.Item label="🌙 晚餐" value="Dinner" />
                </Picker>
              </View>

              <Text style={styles.label}>食材配方 - 中文 (JSON格式)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.ingredients}
                onChangeText={(text) => setFormData({ ...formData, ingredients: text })}
                placeholder='[{"name":"燕麦","amount":"50g"}]'
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>食材配方 - 英文 (JSON格式)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.ingredientsEn}
                onChangeText={(text) => setFormData({ ...formData, ingredientsEn: text })}
                placeholder='[{"name":"Oatmeal","amount":"50g"}]'
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
              />

              <View style={styles.nutritionInputs}>
                <View style={styles.nutritionInputGroup}>
                  <Text style={styles.label}>热量 (kcal)</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={formData.calories}
                    onChangeText={(text) => setFormData({ ...formData, calories: text })}
                    placeholder="280"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.nutritionInputGroup}>
                  <Text style={styles.label}>蛋白质 (g)</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={formData.protein}
                    onChangeText={(text) => setFormData({ ...formData, protein: text })}
                    placeholder="12"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.nutritionInputs}>
                <View style={styles.nutritionInputGroup}>
                  <Text style={styles.label}>碳水 (g)</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={formData.carbs}
                    onChangeText={(text) => setFormData({ ...formData, carbs: text })}
                    placeholder="45"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.nutritionInputGroup}>
                  <Text style={styles.label}>脂肪 (g)</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={formData.fat}
                    onChangeText={(text) => setFormData({ ...formData, fat: text })}
                    placeholder="6"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveMealSet}>
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
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  pickerContainer: {
    flex: 1,
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
  mealSetCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  mealSetHeader: {
    marginBottom: 12,
  },
  mealSetName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    overflow: 'hidden',
  },
  goalTag: {
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
  },
  mealTag: {
    backgroundColor: '#F59E0B',
    color: '#FFFFFF',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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

export default AdminMealSetsScreen;

