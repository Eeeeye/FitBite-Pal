import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useAppState } from '../contexts/AppStateContext';
import { useData } from '../contexts/DataContext';
import { adjustTodayPlan, fetchCompletionRecords } from '../api/user';

export const AdjustPlanScreen = ({ navigation }) => {
  const { userId } = useAuth();
  const { userProfile, loadUserProfile, loadTrainingPlan } = useUserProfile();
  const { completedExercises } = useData();
  const { currentLanguage } = useAppState();
  
  // 本地状态
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState('Intermediate');
  const [trainingArea, setTrainingArea] = useState('Full body');
  const [loading, setLoading] = useState(false);
  const [hasCompletedExercises, setHasCompletedExercises] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // 每次进入页面时，从 userProfile 初始化选项并检查完成状态
  useFocusEffect(
    useCallback(() => {
      // 从 userProfile 初始化当前选项
      if (userProfile.trainingDuration) {
        setDuration(userProfile.trainingDuration.toString());
      }
      if (userProfile.trainingIntensity) {
        setIntensity(userProfile.trainingIntensity);
      }
      if (userProfile.trainingArea) {
        setTrainingArea(userProfile.trainingArea);
      }
      // 检查完成状态
      checkTodayCompletionStatus();
    }, [userId, userProfile.trainingDuration, userProfile.trainingIntensity, userProfile.trainingArea])
  );

  // 获取今天的日期 key
  const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  // 检查今天是否有已完成的训练
  const checkTodayCompletionStatus = async () => {
    if (!userId) {
      setCheckingStatus(false);
      return;
    }
    
    setCheckingStatus(true);
    try {
      const todayKey = getTodayKey();
      
      // 检查前端状态
      const todayCompleted = completedExercises[todayKey] || {};
      const hasLocal = Object.values(todayCompleted).some(v => v === true);
      
      // 检查后端状态
      let hasBackend = false;
      try {
        const response = await fetchCompletionRecords(userId, todayKey, 'exercise');
        if (response?.success && response?.data) {
          hasBackend = response.data.some(r => r.completed === true && r.itemIndex < 20);
        }
      } catch (e) {
        // 忽略后端错误
      }
      
      setHasCompletedExercises(hasLocal || hasBackend);
    } catch (error) {
      setHasCompletedExercises(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  // 保存调整
  const handleSave = async () => {
    // 再次检查是否有已完成的训练
    const todayKey = getTodayKey();
    const todayCompleted = completedExercises[todayKey] || {};
    if (Object.values(todayCompleted).some(v => v === true)) {
      Alert.alert(
        currentLanguage === 'zh' ? '无法调整' : 'Cannot Adjust',
        currentLanguage === 'zh' 
          ? '今天有已完成的训练，请先取消所有已勾选的运动' 
          : 'Please uncheck all completed exercises first.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      // 1. 调用后端 API 保存设置并生成新计划
      const adjustData = {
        trainingDuration: parseInt(duration),
        trainingArea: trainingArea,
        intensity: intensity,
      };

      const response = await adjustTodayPlan(userId, adjustData);
      
      // 检查是否成功
      const isSuccess = response.success || (response.data && response.data.success);
      
      if (!isSuccess) {
        if (response.data?.hasCompletedExercises) {
          setHasCompletedExercises(true);
          Alert.alert(
            currentLanguage === 'zh' ? '无法调整' : 'Cannot Adjust',
            currentLanguage === 'zh' ? '今天有已完成的训练' : 'You have completed exercises today.',
            [{ text: 'OK' }]
          );
          return;
        }
        throw new Error(response.message || 'Failed');
      }

      // 2. 等待后端完成计划生成
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. 显示成功提示并返回（HomeScreen 的 useFocusEffect 会自动刷新数据）
      Alert.alert(
        currentLanguage === 'zh' ? '调整成功' : 'Success',
        currentLanguage === 'zh' ? '训练计划已更新' : 'Training plan updated',
        [{
          text: 'OK',
          onPress: () => navigation.goBack()
        }]
      );
    } catch (error) {
      Alert.alert(
        currentLanguage === 'zh' ? '调整失败' : 'Failed',
        error.message || (currentLanguage === 'zh' ? '请稍后重试' : 'Please try again')
      );
    } finally {
      setLoading(false);
    }
  };

  // 加载中
  if (checkingStatus) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#a4ff3e" />
        <Text style={styles.loadingText}>
          {currentLanguage === 'zh' ? '检查训练状态...' : 'Checking...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 返回按钮 */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← {currentLanguage === 'zh' ? '返回' : 'Back'}</Text>
        </TouchableOpacity>

        {/* 标题 */}
        <Text style={styles.title}>
          {currentLanguage === 'zh' ? '调整训练计划' : 'Adjust Training Plan'}
        </Text>
        
        {/* 警告 */}
        {hasCompletedExercises && (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              {currentLanguage === 'zh' 
                ? '今天有已完成的训练，请先取消所有已勾选的运动。' 
                : 'Please uncheck all completed exercises first.'}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={checkTodayCompletionStatus}>
              <Text style={styles.refreshButtonText}>
                {currentLanguage === 'zh' ? '🔄 刷新' : '🔄 Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* 训练时长 */}
        <Text style={styles.label}>{currentLanguage === 'zh' ? '训练时长' : 'Duration'}</Text>
        <View style={styles.pickerContainer}>
          {['10', '20', '30', '40', '50'].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[styles.pickerOption, duration === mins && styles.pickerOptionSelected]}
              onPress={() => setDuration(mins)}
            >
              <Text style={[styles.pickerOptionText, duration === mins && styles.pickerOptionTextSelected]}>
                {mins}{currentLanguage === 'zh' ? '分钟' : 'min'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* 训练强度 */}
        <Text style={styles.label}>{currentLanguage === 'zh' ? '训练强度' : 'Intensity'}</Text>
        <View style={styles.pickerContainer}>
          {[
            { en: 'Rookie', zh: '新手' },
            { en: 'Beginner', zh: '初学者' },
            { en: 'Intermediate', zh: '中级' },
            { en: 'Advanced', zh: '高级' }
          ].map((level) => (
            <TouchableOpacity
              key={level.en}
              style={[styles.pickerOption, intensity === level.en && styles.pickerOptionSelected]}
              onPress={() => setIntensity(level.en)}
            >
              <Text style={[styles.pickerOptionText, intensity === level.en && styles.pickerOptionTextSelected]}>
                {currentLanguage === 'zh' ? level.zh : level.en}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* 训练区域 */}
        <Text style={styles.label}>{currentLanguage === 'zh' ? '训练区域' : 'Training Area'}</Text>
        <View style={styles.pickerContainer}>
          {[
            { en: 'Full body', zh: '全身' },
            { en: 'Upper body', zh: '上肢' },
            { en: 'Lower body', zh: '下肢' },
            { en: 'Core', zh: '核心' }
          ].map((area) => (
            <TouchableOpacity
              key={area.en}
              style={[styles.pickerOption, trainingArea === area.en && styles.pickerOptionSelected]}
              onPress={() => setTrainingArea(area.en)}
            >
              <Text style={[styles.pickerOptionText, trainingArea === area.en && styles.pickerOptionTextSelected]}>
                {currentLanguage === 'zh' ? area.zh : area.en}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 保存按钮 */}
        <TouchableOpacity 
          style={[styles.button, hasCompletedExercises && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading || hasCompletedExercises}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={[styles.buttonText, hasCompletedExercises && styles.buttonTextDisabled]}>
              {currentLanguage === 'zh' ? '保存调整' : 'Save Changes'}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 18,
    color: '#a4ff3e',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  warningCard: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffc107',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  warningText: {
    color: '#ffc107',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  refreshButtonText: {
    color: '#ffc107',
    fontWeight: 'bold',
    fontSize: 14,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    marginTop: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pickerOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(164, 255, 62, 0.1)',
    borderColor: '#a4ff3e',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '600',
  },
  pickerOptionTextSelected: {
    color: '#a4ff3e',
  },
  button: {
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 40,
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  buttonTextDisabled: {
    color: '#999',
  },
});
