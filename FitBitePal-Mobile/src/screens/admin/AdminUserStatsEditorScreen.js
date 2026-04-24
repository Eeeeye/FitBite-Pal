import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../api/client';

const API_BASE = '/admin';

const defaultCheckInForm = { id: null, checkInDate: '', weight: '', height: '' };
const defaultCompletionForm = {
  id: null,
  recordDate: '',
  itemType: 'exercise',
  itemIndex: '',
  itemName: '',
  calories: '',
  completed: true,
};
const defaultCaloriesForm = {
  id: null,
  recordDate: '',
  calorieIntake: '',
  calorieExpenditure: '',
  baseMetabolism: '',
  exerciseCalories: '',
};
const defaultMetricsForm = {
  weight: '',
  height: '',
  bodyFatRate: '',
  goalWeight: '',
  goalBodyFatRate: '',
  targetCalories: '',
};

const todayString = () => new Date().toISOString().slice(0, 10);

export const AdminUserStatsEditorScreen = ({ route, navigation }) => {
  const user = route.params?.user;
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsData, setStatsData] = useState({
    user: user || null,
    checkIns: [],
    exerciseCompletions: [],
    mealCompletions: [],
    calorieRecords: [],
  });
  const [checkInForm, setCheckInForm] = useState({ ...defaultCheckInForm, checkInDate: todayString() });
  const [completionForm, setCompletionForm] = useState({ ...defaultCompletionForm, recordDate: todayString() });
  const [caloriesForm, setCaloriesForm] = useState({ ...defaultCaloriesForm, recordDate: todayString() });
  const [metricsForm, setMetricsForm] = useState(defaultMetricsForm);
  const [submitting, setSubmitting] = useState(false);

  const screenTitle = useMemo(() => statsData.user?.username || user?.username || '用户数据修正', [statsData.user, user]);

  const loadStatsData = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await apiClient.get(`${API_BASE}/users/${userId}/stats-data`, {
        params: { days: 30 },
      });
      if (response.success && response.data) {
        setStatsData(response.data);
        setMetricsForm({
          weight: response.data.user?.weight == null ? '' : String(response.data.user.weight),
          height: response.data.user?.height == null ? '' : String(response.data.user.height),
          bodyFatRate: response.data.user?.bodyFatRate == null ? '' : String(response.data.user.bodyFatRate),
          goalWeight: response.data.user?.goalWeight == null ? '' : String(response.data.user.goalWeight),
          goalBodyFatRate: response.data.user?.goalBodyFatRate == null ? '' : String(response.data.user.goalBodyFatRate),
          targetCalories: response.data.user?.targetCalories == null ? '' : String(response.data.user.targetCalories),
        });
      }
    } catch (error) {
      Alert.alert('加载失败', error?.message || '无法获取用户统计数据');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStatsData();
  }, [loadStatsData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStatsData();
  }, [loadStatsData]);

  const submitCheckIn = async () => {
    if (!checkInForm.checkInDate) {
      Alert.alert('提示', '请输入打卡日期');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        checkInDate: checkInForm.checkInDate,
        weight: checkInForm.weight,
        height: checkInForm.height,
      };
      const url = checkInForm.id
        ? `${API_BASE}/users/${userId}/check-ins/${checkInForm.id}`
        : `${API_BASE}/users/${userId}/check-ins`;
      const method = checkInForm.id ? apiClient.put.bind(apiClient) : apiClient.post.bind(apiClient);
      const response = await method(url, payload);
      if (response.success) {
        setCheckInForm({ ...defaultCheckInForm, checkInDate: todayString() });
        await loadStatsData();
      }
    } catch (error) {
      Alert.alert('保存失败', error?.message || '无法保存打卡记录');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCompletion = async () => {
    if (!completionForm.recordDate || completionForm.itemIndex === '') {
      Alert.alert('提示', '请填写日期和项目索引');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        recordDate: completionForm.recordDate,
        itemType: completionForm.itemType,
        itemIndex: Number(completionForm.itemIndex),
        itemName: completionForm.itemName,
        calories: completionForm.calories === '' ? null : Number(completionForm.calories),
        completed: completionForm.completed,
      };
      const url = completionForm.id
        ? `${API_BASE}/users/${userId}/completions/${completionForm.id}`
        : `${API_BASE}/users/${userId}/completions`;
      const method = completionForm.id ? apiClient.put.bind(apiClient) : apiClient.post.bind(apiClient);
      const response = await method(url, payload);
      if (response.success) {
        setCompletionForm({ ...defaultCompletionForm, recordDate: todayString() });
        await loadStatsData();
      }
    } catch (error) {
      Alert.alert('保存失败', error?.message || '无法保存完成记录');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCalories = async () => {
    if (!caloriesForm.recordDate) {
      Alert.alert('提示', '请输入日期');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        recordDate: caloriesForm.recordDate,
        calorieIntake: caloriesForm.calorieIntake === '' ? 0 : Number(caloriesForm.calorieIntake),
        calorieExpenditure: caloriesForm.calorieExpenditure === '' ? 0 : Number(caloriesForm.calorieExpenditure),
        baseMetabolism: caloriesForm.baseMetabolism === '' ? null : Number(caloriesForm.baseMetabolism),
        exerciseCalories: caloriesForm.exerciseCalories === '' ? null : Number(caloriesForm.exerciseCalories),
      };
      const url = caloriesForm.id
        ? `${API_BASE}/users/${userId}/calories/${caloriesForm.id}`
        : `${API_BASE}/users/${userId}/calories`;
      const method = caloriesForm.id ? apiClient.put.bind(apiClient) : apiClient.post.bind(apiClient);
      const response = await method(url, payload);
      if (response.success) {
        setCaloriesForm({ ...defaultCaloriesForm, recordDate: todayString() });
        await loadStatsData();
      }
    } catch (error) {
      Alert.alert('保存失败', error?.message || '无法保存热量记录');
    } finally {
      setSubmitting(false);
    }
  };

  const submitMetrics = async () => {
    try {
      setSubmitting(true);
      const payload = {
        weight: metricsForm.weight === '' ? null : Number(metricsForm.weight),
        height: metricsForm.height === '' ? null : Number(metricsForm.height),
        bodyFatRate: metricsForm.bodyFatRate === '' ? null : Number(metricsForm.bodyFatRate),
        goalWeight: metricsForm.goalWeight === '' ? null : Number(metricsForm.goalWeight),
        goalBodyFatRate: metricsForm.goalBodyFatRate === '' ? null : Number(metricsForm.goalBodyFatRate),
        targetCalories: metricsForm.targetCalories === '' ? null : Number(metricsForm.targetCalories),
      };
      const response = await apiClient.put(`${API_BASE}/users/${userId}/metrics`, payload);
      if (response.success) {
        await loadStatsData();
      }
    } catch (error) {
      Alert.alert('保存失败', error?.message || '无法保存身体指标');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (label, deleteRequest) => {
    Alert.alert('删除确认', `确定删除这条${label}吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmitting(true);
            const response = await deleteRequest();
            if (response.success) {
              await loadStatsData();
            }
          } catch (error) {
            Alert.alert('删除失败', error?.message || '无法删除记录');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{screenTitle}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.refreshText}>刷新</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>邮箱：{statsData.user?.email || '-'}</Text>
          <Text style={styles.summaryText}>当前体重：{statsData.user?.weight ?? '-'} kg</Text>
          <Text style={styles.summaryText}>目标：{statsData.user?.goal || '-'}</Text>
        </View>

        <SectionTitle title="身体指标与目标" />
        <View style={styles.formCard}>
          <FormInput label="当前体重(kg)" value={metricsForm.weight} onChangeText={(value) => setMetricsForm((prev) => ({ ...prev, weight: value }))} keyboardType="numeric" />
          <FormInput label="当前身高(cm)" value={metricsForm.height} onChangeText={(value) => setMetricsForm((prev) => ({ ...prev, height: value }))} keyboardType="numeric" />
          <FormInput label="当前体脂率(%)" value={metricsForm.bodyFatRate} onChangeText={(value) => setMetricsForm((prev) => ({ ...prev, bodyFatRate: value }))} keyboardType="numeric" />
          <FormInput label="目标体重(kg)" value={metricsForm.goalWeight} onChangeText={(value) => setMetricsForm((prev) => ({ ...prev, goalWeight: value }))} keyboardType="numeric" />
          <FormInput label="目标体脂率(%)" value={metricsForm.goalBodyFatRate} onChangeText={(value) => setMetricsForm((prev) => ({ ...prev, goalBodyFatRate: value }))} keyboardType="numeric" />
          <FormInput label="目标热量(kcal)" value={metricsForm.targetCalories} onChangeText={(value) => setMetricsForm((prev) => ({ ...prev, targetCalories: value }))} keyboardType="numeric" />
          <PrimaryButton title="保存身体指标" onPress={submitMetrics} disabled={submitting} />
        </View>

        <SectionTitle title="打卡与体重" />
        <View style={styles.formCard}>
          <FormInput label="日期" value={checkInForm.checkInDate} onChangeText={(value) => setCheckInForm((prev) => ({ ...prev, checkInDate: value }))} />
          <FormInput label="体重(kg)" value={String(checkInForm.weight ?? '')} onChangeText={(value) => setCheckInForm((prev) => ({ ...prev, weight: value }))} keyboardType="numeric" />
          <FormInput label="身高(cm)" value={String(checkInForm.height ?? '')} onChangeText={(value) => setCheckInForm((prev) => ({ ...prev, height: value }))} keyboardType="numeric" />
          <View style={styles.formActions}>
            <PrimaryButton title={checkInForm.id ? '更新打卡' : '新增打卡'} onPress={submitCheckIn} disabled={submitting} />
            <SecondaryButton title="清空" onPress={() => setCheckInForm({ ...defaultCheckInForm, checkInDate: todayString() })} />
          </View>
        </View>
        {statsData.checkIns.map((record) => (
          <RecordCard
            key={`checkin-${record.id}`}
            title={record.checkInDate}
            subtitle={`体重 ${record.weight ?? '-'} kg / 身高 ${record.height ?? '-'} cm`}
            onEdit={() => setCheckInForm({
              id: record.id,
              checkInDate: record.checkInDate,
              weight: record.weight == null ? '' : String(record.weight),
              height: record.height == null ? '' : String(record.height),
            })}
            onDelete={() => confirmDelete('打卡记录', () => apiClient.delete(`${API_BASE}/users/${userId}/check-ins/${record.id}`))}
          />
        ))}

        <SectionTitle title="训练 / 饮食完成记录" />
        <View style={styles.formCard}>
          <FormInput label="日期" value={completionForm.recordDate} onChangeText={(value) => setCompletionForm((prev) => ({ ...prev, recordDate: value }))} />
          <FormInput label="类型 (exercise/meal)" value={completionForm.itemType} onChangeText={(value) => setCompletionForm((prev) => ({ ...prev, itemType: value.trim() || 'exercise' }))} />
          <FormInput label="项目索引" value={String(completionForm.itemIndex)} onChangeText={(value) => setCompletionForm((prev) => ({ ...prev, itemIndex: value }))} keyboardType="numeric" />
          <FormInput label="项目名称" value={completionForm.itemName} onChangeText={(value) => setCompletionForm((prev) => ({ ...prev, itemName: value }))} />
          <FormInput label="热量" value={String(completionForm.calories)} onChangeText={(value) => setCompletionForm((prev) => ({ ...prev, calories: value }))} keyboardType="numeric" />
          <ToggleRow
            label="已完成"
            value={completionForm.completed}
            onChange={(value) => setCompletionForm((prev) => ({ ...prev, completed: value }))}
          />
          <View style={styles.formActions}>
            <PrimaryButton title={completionForm.id ? '更新记录' : '新增记录'} onPress={submitCompletion} disabled={submitting} />
            <SecondaryButton title="清空" onPress={() => setCompletionForm({ ...defaultCompletionForm, recordDate: todayString() })} />
          </View>
        </View>
        {[...statsData.exerciseCompletions, ...statsData.mealCompletions].map((record) => (
          <RecordCard
            key={`completion-${record.id}`}
            title={`${record.recordDate} · ${record.itemType}`}
            subtitle={`索引 ${record.itemIndex} / ${record.itemName || '未命名'} / ${record.completed ? '已完成' : '未完成'} / ${record.calories ?? 0} kcal`}
            onEdit={() => setCompletionForm({
              id: record.id,
              recordDate: record.recordDate,
              itemType: record.itemType,
              itemIndex: String(record.itemIndex),
              itemName: record.itemName || '',
              calories: record.calories == null ? '' : String(record.calories),
              completed: !!record.completed,
            })}
            onDelete={() => confirmDelete('完成记录', () => apiClient.delete(`${API_BASE}/users/${userId}/completions/${record.id}`))}
          />
        ))}

        <SectionTitle title="卡路里记录" />
        <View style={styles.formCard}>
          <FormInput label="日期" value={caloriesForm.recordDate} onChangeText={(value) => setCaloriesForm((prev) => ({ ...prev, recordDate: value }))} />
          <FormInput label="摄入热量" value={String(caloriesForm.calorieIntake)} onChangeText={(value) => setCaloriesForm((prev) => ({ ...prev, calorieIntake: value }))} keyboardType="numeric" />
          <FormInput label="消耗热量" value={String(caloriesForm.calorieExpenditure)} onChangeText={(value) => setCaloriesForm((prev) => ({ ...prev, calorieExpenditure: value }))} keyboardType="numeric" />
          <FormInput label="基础代谢" value={String(caloriesForm.baseMetabolism)} onChangeText={(value) => setCaloriesForm((prev) => ({ ...prev, baseMetabolism: value }))} keyboardType="numeric" />
          <FormInput label="运动消耗" value={String(caloriesForm.exerciseCalories)} onChangeText={(value) => setCaloriesForm((prev) => ({ ...prev, exerciseCalories: value }))} keyboardType="numeric" />
          <View style={styles.formActions}>
            <PrimaryButton title={caloriesForm.id ? '更新热量' : '新增热量'} onPress={submitCalories} disabled={submitting} />
            <SecondaryButton title="清空" onPress={() => setCaloriesForm({ ...defaultCaloriesForm, recordDate: todayString() })} />
          </View>
        </View>
        {statsData.calorieRecords.map((record) => (
          <RecordCard
            key={`calories-${record.id}`}
            title={record.recordDate}
            subtitle={`摄入 ${record.calorieIntake ?? 0} / 消耗 ${record.calorieExpenditure ?? 0} / BMR ${record.baseMetabolism ?? '-'} / 运动 ${record.exerciseCalories ?? '-'}`}
            onEdit={() => setCaloriesForm({
              id: record.id,
              recordDate: record.recordDate,
              calorieIntake: String(record.calorieIntake ?? ''),
              calorieExpenditure: String(record.calorieExpenditure ?? ''),
              baseMetabolism: record.baseMetabolism == null ? '' : String(record.baseMetabolism),
              exerciseCalories: record.exerciseCalories == null ? '' : String(record.exerciseCalories),
            })}
            onDelete={() => confirmDelete('热量记录', () => apiClient.delete(`${API_BASE}/users/${userId}/calories/${record.id}`))}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const SectionTitle = ({ title }) => <Text style={styles.sectionTitle}>{title}</Text>;

const FormInput = ({ label, ...props }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      placeholderTextColor="#64748B"
      autoCapitalize="none"
      {...props}
    />
  </View>
);

const ToggleRow = ({ label, value, onChange }) => (
  <View style={styles.toggleRow}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.toggleButtons}>
      <TouchableOpacity
        style={[styles.toggleButton, value && styles.toggleButtonActive]}
        onPress={() => onChange(true)}
      >
        <Text style={[styles.toggleButtonText, value && styles.toggleButtonTextActive]}>是</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, !value && styles.toggleButtonActive]}
        onPress={() => onChange(false)}
      >
        <Text style={[styles.toggleButtonText, !value && styles.toggleButtonTextActive]}>否</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const PrimaryButton = ({ title, onPress, disabled }) => (
  <TouchableOpacity style={[styles.primaryButton, disabled && styles.buttonDisabled]} onPress={onPress} disabled={disabled}>
    <Text style={styles.primaryButtonText}>{title}</Text>
  </TouchableOpacity>
);

const SecondaryButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.secondaryButton} onPress={onPress}>
    <Text style={styles.secondaryButtonText}>{title}</Text>
  </TouchableOpacity>
);

const RecordCard = ({ title, subtitle, onEdit, onDelete }) => (
  <View style={styles.recordCard}>
    <View style={styles.recordContent}>
      <Text style={styles.recordTitle}>{title}</Text>
      <Text style={styles.recordSubtitle}>{subtitle}</Text>
    </View>
    <View style={styles.recordActions}>
      <TouchableOpacity onPress={onEdit}><Text style={styles.editText}>编辑</Text></TouchableOpacity>
      <TouchableOpacity onPress={onDelete}><Text style={styles.deleteText}>删除</Text></TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94A3B8', marginTop: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: { color: '#4F46E5', fontSize: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 12 },
  refreshText: { color: '#38BDF8', fontSize: 14 },
  scrollView: { flex: 1, padding: 12 },
  summaryCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 20 },
  summaryText: { color: '#E2E8F0', fontSize: 14, marginBottom: 6 },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  formCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { color: '#CBD5E1', fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
  },
  toggleRow: { marginBottom: 12 },
  toggleButtons: { flexDirection: 'row', gap: 8 },
  toggleButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  toggleButtonActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  toggleButtonText: { color: '#CBD5E1', fontWeight: '600' },
  toggleButtonTextActive: { color: '#FFFFFF' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryButton: { flex: 1, backgroundColor: '#4F46E5', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: { flex: 1, backgroundColor: '#334155', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#E2E8F0', fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  recordCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordContent: { flex: 1, paddingRight: 12 },
  recordTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  recordSubtitle: { color: '#94A3B8', fontSize: 13, lineHeight: 18 },
  recordActions: { gap: 12 },
  editText: { color: '#38BDF8', fontWeight: '700' },
  deleteText: { color: '#F87171', fontWeight: '700' },
});

export default AdminUserStatsEditorScreen;
