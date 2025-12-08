import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useAppState } from '../contexts/AppStateContext';
import { saveCheckIn as saveCheckInApi, saveUserProfile as saveUserProfileApi, fetchUserProfile as fetchUserProfileApi } from '../api/user';

export const CheckInScreen = ({ navigation }) => {
  const { userId } = useAuth();
  const { checkedInDates, setCheckedInDates, getDateKey, loadStatistics, loadWeightRecords } = useData();
  const { userProfile, setUserProfile, loadUserProfile } = useUserProfile();
  const { currentLanguage } = useAppState();
  const [loading, setLoading] = useState(false);

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [weightUnit, setWeightUnit] = useState('kg');

  useEffect(() => {
    if (userProfile) {
      setHeight(userProfile.height?.toString() || '');
      setWeight(userProfile.weight?.toString() || '');
    }
  }, [userProfile]);

  const handleCheckIn = async () => {
    if (!height || !weight) {
      Alert.alert(
        currentLanguage === 'zh' ? '提示' : 'Notice',
        currentLanguage === 'zh' ? '请输入身高和体重' : 'Please enter height and weight'
      );
      return;
    }

    setLoading(true);
    try {
      const todayKey = getDateKey(new Date());

      // ✅ 打卡时同时保存体重和身高到打卡记录（用于历史统计折线图）
      const checkInResponse = await saveCheckInApi(userId, {
        date: todayKey,
        weight: parseFloat(weight),   // 保存到打卡记录，用于历史数据
        height: parseFloat(height),   // 保存到打卡记录，用于历史数据
      });

      if (checkInResponse.success && checkInResponse.data && checkInResponse.data.checkedIn) {
        // 打卡成功，更新本地状态
        setCheckedInDates(prev => ({
          ...prev,
          [todayKey]: true
        }));
        
        // ✅ 关键：打卡成功后，同步更新 User 表的身高体重（统一数据源）
        try {
          // ⚠️ 重要：直接从 API 获取最新的完整用户资料，而不是依赖状态
          const profileResponse = await fetchUserProfileApi(userId);
          
          if (!profileResponse.success || !profileResponse.data) {
            if (__DEV__) {
              console.warn('无法获取用户资料，跳过更新 User 表');
            }
            return;
          }
          
          const currentProfile = profileResponse.data;
          
          // 🔍 调试：打印返回的用户资料
          if (__DEV__) {
            console.log('📋 获取到的用户资料:', JSON.stringify(currentProfile, null, 2));
          }
          
          // ⚠️ 验证必需字段
          if (!currentProfile.gender || !currentProfile.age || !currentProfile.goal || !currentProfile.activityLevel) {
            if (__DEV__) {
              console.error('❌ 用户资料缺少必需字段，无法更新');
              console.log('gender:', currentProfile.gender);
              console.log('age:', currentProfile.age);
              console.log('goal:', currentProfile.goal);
              console.log('activityLevel:', currentProfile.activityLevel);
            }
            // 即使无法更新 User 表，也不影响打卡
            return;
          }
          
          // 只更新身高体重，保留其他所有字段
          const updatedProfileData = {
            gender: currentProfile.gender,
            age: parseInt(currentProfile.age),
            height: parseFloat(height), // ✅ 更新为打卡的身高
            weight: parseFloat(weight), // ✅ 更新为打卡的体重
            goal: currentProfile.goal,
            activityLevel: currentProfile.activityLevel,
            trainingDuration: parseInt(currentProfile.trainingDuration) || 30,
          };
          
          if (__DEV__) {
            console.log('📤 准备更新的数据:', JSON.stringify(updatedProfileData, null, 2));
          }
          
          // 调用后端 API 更新 User 表
          await saveUserProfileApi(userId, updatedProfileData);
          
          // ✅ 重新加载用户资料，确保所有页面显示一致
          await loadUserProfile();
          
          // ✅ 重新加载统计数据和体重记录（ProgressScreen 显示）
          if (loadStatistics) {
            await loadStatistics(7);
          }
          if (loadWeightRecords) {
            await loadWeightRecords(7);
          }
        } catch (profileUpdateError) {
          // 即使更新 User 表失败，打卡记录也已保存
          if (__DEV__) {
            console.error('更新用户资料失败:', profileUpdateError);
          }
        }

        Alert.alert(
          currentLanguage === 'zh' ? '成功' : 'Success',
          currentLanguage === 'zh' ? '打卡成功！' : 'Check-in successful!',
          [
            {
              text: currentLanguage === 'zh' ? '确定' : 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else if (checkInResponse.data && checkInResponse.data.alreadyCheckedIn) {
        // 今天已经打卡过了
        Alert.alert(
          currentLanguage === 'zh' ? '提示' : 'Notice',
          checkInResponse.data.message || (currentLanguage === 'zh' ? '今天已经打卡过了！' : 'Already checked in today!'),
          [
            {
              text: currentLanguage === 'zh' ? '确定' : 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        // 打卡失败
        Alert.alert(
          currentLanguage === 'zh' ? '错误' : 'Error',
          checkInResponse.message || (currentLanguage === 'zh' ? '打卡失败' : 'Check-in failed')
        );
      }
    } catch (error) {
      console.error('打卡异常:', error);
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '打卡失败，请稍后重试' : 'Check-in failed, please try again'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentLanguage === 'zh' ? '每日打卡' : 'Daily Check-in'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 当前健康数据卡片 */}
        <View style={styles.checkInCard}>
          <Text style={styles.checkInCardTitle}>
            📊 {currentLanguage === 'zh' ? '当前健康数据' : 'Current Health Data'}
          </Text>
          <View style={styles.checkInDataGrid}>
            <View style={styles.checkInDataItem}>
              <Text style={styles.checkInDataLabel}>
                {currentLanguage === 'zh' ? '身高' : 'Height'}
              </Text>
              <Text style={styles.checkInDataValue}>{height || '--'} {heightUnit}</Text>
            </View>
            <View style={styles.checkInDataItem}>
              <Text style={styles.checkInDataLabel}>
                {currentLanguage === 'zh' ? '体重' : 'Weight'}
              </Text>
              <Text style={styles.checkInDataValue}>{weight || '--'} {weightUnit}</Text>
            </View>
            <View style={styles.checkInDataItem}>
              <Text style={styles.checkInDataLabel}>BMI</Text>
              <Text style={styles.checkInDataValue}>{userProfile?.bmi?.toFixed(1) || '--'}</Text>
            </View>
            <View style={styles.checkInDataItem}>
              <Text style={styles.checkInDataLabel}>
                {currentLanguage === 'zh' ? '体脂率' : 'Body Fat'}
              </Text>
              <Text style={styles.checkInDataValue}>{userProfile?.bodyFatRate?.toFixed(1) || '--'}%</Text>
            </View>
          </View>
        </View>

        {/* 更新数据表单 */}
        <View style={styles.checkInFormCard}>
          <Text style={styles.checkInCardTitle}>
            🔄 {currentLanguage === 'zh' ? '更新数据' : 'Update Data'}
          </Text>
          
          {/* 身高输入 */}
          <View style={styles.checkInInputGroup}>
            <Text style={styles.checkInInputLabel}>
              {currentLanguage === 'zh' ? '身高' : 'Height'}
            </Text>
            <View style={styles.checkInInputRow}>
              <TextInput
                style={styles.checkInInput}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                placeholder={currentLanguage === 'zh' ? '请输入身高' : 'Enter height'}
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                style={styles.checkInUnitButton}
                onPress={() => setHeightUnit(heightUnit === 'cm' ? 'inch' : 'cm')}
              >
                <Text style={styles.checkInUnitText}>{heightUnit}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 体重输入 */}
          <View style={styles.checkInInputGroup}>
            <Text style={styles.checkInInputLabel}>
              {currentLanguage === 'zh' ? '体重' : 'Weight'}
            </Text>
            <View style={styles.checkInInputRow}>
              <TextInput
                style={styles.checkInInput}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder={currentLanguage === 'zh' ? '请输入体重' : 'Enter weight'}
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                style={styles.checkInUnitButton}
                onPress={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}
              >
                <Text style={styles.checkInUnitText}>{weightUnit}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 保存按钮 */}
          <TouchableOpacity
            style={styles.checkInSaveButton}
            onPress={handleCheckIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.checkInSaveButtonText}>
                ✅ {currentLanguage === 'zh' ? '确认打卡' : 'Confirm Check-in'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    color: '#a4ff3e',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  checkInCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  checkInCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a4ff3e',
    marginBottom: 16,
  },
  checkInDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  checkInDataItem: {
    width: '45%',
  },
  checkInDataLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  checkInDataValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  checkInFormCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  checkInInputGroup: {
    marginBottom: 20,
  },
  checkInInputLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  checkInInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkInInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  checkInUnitButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInUnitText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  checkInSaveButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  checkInSaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
