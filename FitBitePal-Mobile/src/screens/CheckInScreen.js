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
import { saveCheckIn as saveCheckInApi } from '../api/user';

import { checkInMeasurements, switchHeightUnit, switchWeightUnit } from '../utils/measurements';

export const CheckInScreen = ({ navigation }) => {
  const { userId } = useAuth();
  const { setCheckedInDates, getDateKey, loadStatistics, loadWeightRecords } = useData();
  const { userProfile, loadUserProfile } = useUserProfile();
  const { currentLanguage } = useAppState();
  const [loading, setLoading] = useState(false);

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [weightUnit, setWeightUnit] = useState('kg');

  useEffect(() => {
    if (userProfile) {
      setHeightUnit('cm');
      setWeightUnit('kg');
      setHeight(userProfile.height?.toString() || '');
      setWeight(userProfile.weight?.toString() || '');
    }
  }, [userProfile]);

  const handleCheckIn = async () => {
    const measurements = checkInMeasurements(height, heightUnit, weight, weightUnit);
    if (!measurements) {
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
        ...measurements,
      });

      if (checkInResponse.success && checkInResponse.data && checkInResponse.data.checkedIn) {
        // 打卡成功，更新本地状态
        setCheckedInDates(prev => ({
          ...prev,
          [todayKey]: true
        }));
        
        await Promise.allSettled([
          loadUserProfile(), loadStatistics?.(7), loadWeightRecords?.(7),
        ]);

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
                onPress={() => {
                  setHeight(switchHeightUnit(height, heightUnit));
                  setHeightUnit(heightUnit === 'cm' ? 'inch' : 'cm');
                }}
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
                onPress={() => {
                  setWeight(switchWeightUnit(weight, weightUnit));
                  setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg');
                }}
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
