import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { useAppState } from '../contexts';
import { useAuth } from '../contexts/AuthContext';
import { saveUserProfile as saveUserProfileApi } from '../api/user';
import { OnboardingProgress } from '../components/OnboardingProgress';

export const DurationScreen = ({ navigation, route }) => {
  const { currentLanguage } = useAppState();
  const { userId, completeOnboarding } = useAuth(); // ✨ 获取completeOnboarding函数
  const { gender, age, weight, height, goal, activity } = route.params || {};
  
  const durationsEn = ['10mins', '20mins', '30mins', '40mins', '50mins'];
  const durationsZh = ['10分钟', '20分钟', '30分钟', '40分钟', '50分钟'];
  const durations = currentLanguage === 'zh' ? durationsZh : durationsEn;
  
  const [selectedDuration, setSelectedDuration] = useState(durations[2]); // Default: 30mins
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

  // userId 变化监听（已移除日志）

  useEffect(() => {
    // 初始化时滚动到默认时长
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 120, // 滚动到第三项
        animated: false,
      });
    }, 100);
  }, []);

  const handleScroll = (event) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / 60);
    if (index >= 0 && index < durations.length) {
      setSelectedDuration(durations[index]);
    }
  };

  const handleComplete = async () => {
    if (!selectedDuration) return;

    // 检查 userId 是否存在
    if (!userId) {
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '用户未登录，请重新登录' : 'User not logged in, please login again'
      );
      return;
    }

    setLoading(true);
    try {
      // 提取数字
      const durationValue = parseInt(selectedDuration.match(/\d+/)[0]);
      
      // 保存用户画像到后端
      const profileData = {
        gender,
        age: parseInt(age),
        height: parseFloat(height),
        weight: parseFloat(weight),
        goal,
        activityLevel: activity,
        trainingDuration: durationValue,
        // 注意：trainingIntensity 字段后端不支持，已移除
      };
      
      console.log('Saving profile for userId:', userId, 'data:', profileData);
      
      // 保存用户画像到后端
      const response = await saveUserProfileApi(userId, profileData);
      console.log('Profile save response:', response);
      
      // ✨ 关键：标记Onboarding完成并保存登录状态
      await completeOnboarding();
      
      Alert.alert(
        currentLanguage === 'zh' ? '成功' : 'Success',
        currentLanguage === 'zh' ? '个人资料已保存！' : 'Profile saved successfully!',
        [
          {
            text: currentLanguage === 'zh' ? '开始' : 'Start',
            onPress: () => {
              // AppNavigator会自动切换到Main，因为needsOnboarding已经是false
              // 不需要手动导航
            },
          },
        ]
      );
    } catch (error) {
        console.error('Save profile error:', error);
      console.error('Error details:', error.message, error.data);
      
      // 显示更详细的错误信息
      const errorMessage = error.data?.message || error.message || '未知错误';
      Alert.alert(
        currentLanguage === 'zh' ? '保存失败' : 'Save Failed',
        currentLanguage === 'zh' 
          ? `保存用户资料失败: ${errorMessage}` 
          : `Failed to save profile: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.ageContent}>
        <Text style={styles.title}>
          {currentLanguage === 'zh' ? '你每天的运动时长是多少？' : "What's your daily exercise duration?"}
        </Text>
        <Text style={styles.subtitle}>
          {currentLanguage === 'zh' ? '这有助于我们创建你的个性化计划' : 'This helps us create your personalized plan'}
        </Text>

        {/* 时长滚动选择器 */}
        <View style={styles.agePickerContainer}>
          <View style={styles.agePickerHighlight} />
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={60}
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.agePickerContent}
          >
            <View style={{ height: 120 }} />
            {durations.map((d) => (
              <View key={d} style={styles.ageItem}>
                <Text
                  style={[
                    styles.optionText,
                    selectedDuration === d && styles.optionTextSelected,
                  ]}
                >
                  {d}
                </Text>
              </View>
            ))}
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.screenBottomButtons}>
          <TouchableOpacity style={styles.screenBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.screenNextButton, !selectedDuration && styles.buttonDisabled]} 
            onPress={handleComplete}
            disabled={!selectedDuration || loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentLanguage === 'zh' ? '开始' : 'Start'}
                </Text>
                <Image
                  source={require('../../assets/images/f9c2b6e3431fd609930d93a7eb32c77b.png')}
                  style={styles.nextArrowIcon}
                  resizeMode="contain"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
        <OnboardingProgress currentStep={7} totalSteps={7} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  ageContent: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 60,
    textAlign: 'left',
  },
  agePickerContainer: {
    height: 300,
    position: 'relative',
    justifyContent: 'center',
  },
  agePickerHighlight: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 60,
    marginTop: -30,
    backgroundColor: 'rgba(164, 255, 62, 0.1)',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#a4ff3e',
    zIndex: 1,
    pointerEvents: 'none',
  },
  agePickerContent: {
    paddingHorizontal: 20,
  },
  ageItem: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  optionTextSelected: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  screenBottomButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  screenBackButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: '#a4ff3e',
    fontWeight: 'bold',
  },
  screenNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a4ff3e',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginLeft: 16,
  },
  buttonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
  },
  nextArrowIcon: {
    width: 20,
    height: 20,
  },
});
