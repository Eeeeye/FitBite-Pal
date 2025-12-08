import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useAuth, useUserProfile, useAppState, useData } from '../contexts';
import { updateBasicInfo as updateBasicInfoApi, saveUserProfile as saveUserProfileApi } from '../api/user';
import { 
  requestNotificationPermission,
  scheduleTrainingReminder,
  scheduleMealReminders,
} from '../../services/notificationService';
import { saveLanguage } from '../../services/i18n';
import { saveNotificationSettings, loadNotificationSettings } from '../../services/notificationService';
import { saveAccessibilitySettings, getFontSizeConfig } from '../../services/accessibilityService';

export const ProfileScreen = ({ navigation }) => {
  const { userId, logout } = useAuth();
  const { userProfile, loadUserProfile, saveProfile } = useUserProfile();
  const { currentLanguage, setCurrentLanguage, fontSize, setFontSize, fontSizeConfig, setFontSizeConfig, screenReaderEnabled } = useAppState();
  const { loadStatistics, loadWeightRecords } = useData();

  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedGender, setSelectedGender] = useState('male');
  const [selectedAge, setSelectedAge] = useState('25');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState('health');
  const [activity, setActivity] = useState('moderate');
  const [duration, setDuration] = useState('30');

  const [notificationSettings, setNotificationSettings] = useState({
    trainingReminder: false,
    mealReminder: false,
    trainingTime: '08:00',
    breakfastTime: '08:00',
    lunchTime: '12:00',
    dinnerTime: '18:00',
  });

  useEffect(() => {
    if (userId) {
      loadUserProfile();
      loadSettings();
    }
  }, [userId]);

  useEffect(() => {
    if (userProfile) {
      // ✅ 基本信息
      setUsername(userProfile.username || '');
      setEmail(userProfile.email || '');
      setPhone(userProfile.phone || '');
      
      // 身体信息
      setHeight(userProfile.height?.toString() || '');
      setWeight(userProfile.weight?.toString() || '');
      setSelectedGender(userProfile.gender || 'male');
      setSelectedAge(userProfile.age?.toString() || '25');
      setGoal(userProfile.goal || 'health');
      setActivity(userProfile.activityLevel || 'moderate');
      setDuration(userProfile.trainingDuration?.toString() || '30');
    }
  }, [userProfile]);

  const loadSettings = async () => {
    const savedSettings = await loadNotificationSettings();
    if (savedSettings) {
      setNotificationSettings(savedSettings);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      currentLanguage === 'zh' ? '确认退出' : 'Confirm Logout',
      currentLanguage === 'zh' ? '确定要退出登录吗？' : 'Are you sure you want to sign out?',
      [
        { text: currentLanguage === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: currentLanguage === 'zh' ? '退出' : 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert(
              currentLanguage === 'zh' ? '已退出' : 'Signed Out',
              currentLanguage === 'zh' ? '您已成功退出登录' : 'You have been signed out successfully'
            );
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.homeScrollView}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={require('../../assets/images/dc224f418694d44b1bd38b5c1c55690e.png')}
            style={styles.profileAvatar}
            resizeMode="contain"
          />
          <Text style={styles.profileName}>{username || 'User'}</Text>
          <Text style={styles.profileEmail}>{email || 'No email'}</Text>
        </View>

        {/* Personal Information Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>
            {currentLanguage === 'zh' ? '个人信息' : 'Personal Information'}
          </Text>
          <View style={styles.divider} />

          {/* Username */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/1c41aa1c33e32d48a5949516f49ea0b4.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '用户名' : 'Username'}
              </Text>
            </View>
            <TextInput
              style={styles.settingInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor="#666"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/9194030625d6cf47d3d636cfd941ae07.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '电话号码' : 'Phone Number'}
              </Text>
            </View>
            <TextInput
              style={styles.settingInput}
              value={phone}
              onChangeText={setPhone}
              placeholder={currentLanguage === 'zh' ? '输入电话' : 'Enter phone'}
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />
          </View>

          {/* Email */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/5b154137b570997d727f0b4fd78e29c0.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '邮箱' : 'Email'}
              </Text>
            </View>
            <Text style={styles.settingValue}>
              {email || (currentLanguage === 'zh' ? '未设置' : 'Not set')}
            </Text>
          </View>

          {/* Gender */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => {
              Alert.alert(
                'Select Gender',
                '',
                [
                  { text: 'Male', onPress: () => setSelectedGender('male') },
                  { text: 'Female', onPress: () => setSelectedGender('female') },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/5b154137b570997d727f0b4fd78e29c0.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '性别' : 'Gender'}
              </Text>
            </View>
            <Text style={styles.settingValue}>
              {selectedGender === 'male' ? 
                (currentLanguage === 'zh' ? '男' : 'male') : 
                selectedGender === 'female' ? 
                  (currentLanguage === 'zh' ? '女' : 'female') : 
                  (currentLanguage === 'zh' ? '未设置' : 'Not set')
              }
            </Text>
          </TouchableOpacity>

          {/* Age */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/ca22c5c2dcfca40c205712e96c80d4fa.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '年龄' : 'Age'}
              </Text>
            </View>
            <TextInput
              style={styles.settingInput}
              value={selectedAge}
              onChangeText={setSelectedAge}
              placeholder="Enter age"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>

          {/* Weight */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/c742f5e367168e615b62feec79c08091.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '体重 (kg)' : 'Weight (kg)'}
              </Text>
            </View>
            <TextInput
              style={styles.settingInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="Enter weight"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Height */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/e6f04d91dc7bc1d586aa74f2a1cbba74.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '身高 (cm)' : 'Height (cm)'}
              </Text>
            </View>
            <TextInput
              style={styles.settingInput}
              value={height}
              onChangeText={setHeight}
              placeholder="Enter height"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Goal */}
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => {
              Alert.alert(
                'Select Goal',
                '',
                [
                  { text: 'Lose Weight', onPress: () => setGoal('lose') },
                  { text: 'Get Fitter', onPress: () => setGoal('health') },
                  { text: 'Gain Muscle', onPress: () => setGoal('muscle') },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/3e073b11ed5fad2b61e0d5d039e4abee.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '健身目标' : 'Fitness Goal'}
              </Text>
            </View>
            <Text style={styles.settingValue}>
              {goal === 'lose' ? 
                (currentLanguage === 'zh' ? '减重' : 'Lose Weight') : 
                goal === 'muscle' ? 
                  (currentLanguage === 'zh' ? '增肌' : 'Gain Muscle') : 
                  (currentLanguage === 'zh' ? '保持健康' : 'Get Fitter')
              }
            </Text>
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveSettingsButton}
            onPress={async () => {
              try {
                if (!userId) {
                  Alert.alert('Error', 'User not logged in');
                  return;
                }
                
                // ✅ 验证用户名不能为空
                if (!username || username.trim() === '') {
                  Alert.alert(
                    currentLanguage === 'zh' ? '错误' : 'Error',
                    currentLanguage === 'zh' ? '用户名不能为空' : 'Username cannot be empty'
                  );
                  return;
                }
                
                const basicInfoUpdates = {
                  username: username.trim(), // ✅ 去除首尾空格
                  phone: phone && phone.trim() !== '' ? phone.trim() : null, // ✅ 空字符串转为 null
                };
                await updateBasicInfoApi(userId, basicInfoUpdates);
                
                const profileData = {
                  gender: selectedGender,
                  age: parseInt(selectedAge),
                  height: parseFloat(height),
                  weight: parseFloat(weight),
                  goal: goal,
                  activityLevel: activity,
                  trainingDuration: parseInt(duration),
                  // trainingIntensity 已移除，后端不支持
                };
                await saveUserProfileApi(userId, profileData);
                
                // ✅ 重新加载用户数据，确保显示最新数据
                await loadUserProfile();
                
                // ✅ 刷新统计数据和体重记录（确保统计页面显示最新数据）
                if (loadStatistics) {
                  await loadStatistics(7);
                }
                if (loadWeightRecords) {
                  await loadWeightRecords(7);
                }
                
                Alert.alert('Success', 'All changes saved successfully!');
              } catch (error) {
                if (__DEV__) {
                  console.error('保存设置失败:', error);
                }
                Alert.alert('Error', 'Failed to save settings');
              }
            }}
          >
            <Text style={styles.saveSettingsButtonText}>
              💾 {currentLanguage === 'zh' ? '保存更改' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>🌐 Language / 语言</Text>
          <View style={styles.divider} />

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={async () => {
              const newLang = currentLanguage === 'en' ? 'zh' : 'en';
              await saveLanguage(newLang);
              setCurrentLanguage(newLang);
              
              Alert.alert(
                newLang === 'zh' ? '成功' : 'Success', 
                newLang === 'zh' ? '语言已切换' : 'Language switched'
              );
            }}
          >
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/8bbddb595c726f833c96087335aa0f5d.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>Language</Text>
            </View>
            <Text style={styles.settingValue}>{currentLanguage === 'en' ? 'English 英语' : '中文 Chinese'}</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>
            🔔 {currentLanguage === 'zh' ? '通知' : 'Notifications'}
          </Text>
          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/e8e05cd86c448ef508b8f5a5184d4d65.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '训练提醒' : 'Training Reminder'}
              </Text>
            </View>
            <Switch
              value={notificationSettings.trainingReminder}
              onValueChange={async (value) => {
                if (value) {
                  const hasPermission = await requestNotificationPermission();
                  if (!hasPermission) return;
                  await scheduleTrainingReminder(notificationSettings.trainingTime);
                }
                const newSettings = { ...notificationSettings, trainingReminder: value };
                setNotificationSettings(newSettings);
                await saveNotificationSettings(newSettings);
              }}
              trackColor={{ false: '#767577', true: '#d0fd3e' }}
              thumbColor={notificationSettings.trainingReminder ? '#000' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/e8e05cd86c448ef508b8f5a5184d4d65.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '用餐提醒' : 'Meal Reminder'}
              </Text>
            </View>
            <Switch
              value={notificationSettings.mealReminder}
              onValueChange={async (value) => {
                if (value) {
                  const hasPermission = await requestNotificationPermission();
                  if (!hasPermission) return;
                  await scheduleMealReminders(notificationSettings);
                }
                const newSettings = { ...notificationSettings, mealReminder: value };
                setNotificationSettings(newSettings);
                await saveNotificationSettings(newSettings);
              }}
              trackColor={{ false: '#767577', true: '#d0fd3e' }}
              thumbColor={notificationSettings.mealReminder ? '#000' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Accessibility Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>
            ♿ {currentLanguage === 'zh' ? '无障碍' : 'Accessibility'}
          </Text>
          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '字体大小' : 'Font Size'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.fontSizeButton, fontSize === 'small' && styles.fontSizeButtonActive]}
                onPress={async () => {
                  setFontSize('small');
                  setFontSizeConfig(getFontSizeConfig('small'));
                  await saveAccessibilitySettings({ fontSize: 'small', screenReaderEnabled });
                }}
              >
                <Text style={[styles.fontSizeButtonText, fontSize === 'small' && { color: '#000' }]}>A</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fontSizeButton, fontSize === 'medium' && styles.fontSizeButtonActive]}
                onPress={async () => {
                  setFontSize('medium');
                  setFontSizeConfig(getFontSizeConfig('medium'));
                  await saveAccessibilitySettings({ fontSize: 'medium', screenReaderEnabled });
                }}
              >
                <Text style={[styles.fontSizeButtonText, fontSize === 'medium' && { color: '#000', fontSize: 18 }]}>A</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fontSizeButton, fontSize === 'large' && styles.fontSizeButtonActive]}
                onPress={async () => {
                  setFontSize('large');
                  setFontSizeConfig(getFontSizeConfig('large'));
                  await saveAccessibilitySettings({ fontSize: 'large', screenReaderEnabled });
                }}
              >
                <Text style={[styles.fontSizeButtonText, fontSize === 'large' && { color: '#000', fontSize: 20 }]}>A</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '屏幕阅读器' : 'Screen Reader'}
              </Text>
            </View>
            <Text style={styles.settingValue}>
              {screenReaderEnabled ? 
                (currentLanguage === 'zh' ? '已启用' : 'Enabled') : 
                (currentLanguage === 'zh' ? '系统' : 'System')
              }
            </Text>
          </View>
        </View>

        {/* Other Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>
            ⚙️ {currentLanguage === 'zh' ? '其他' : 'Other'}
          </Text>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Image
                source={require('../../assets/images/69d94bedcdb939ee1750466c04ee43e7.png')}
                style={styles.settingIcon}
                resizeMode="contain"
              />
              <Text style={styles.settingLabel}>
                {currentLanguage === 'zh' ? '安全与隐私' : 'Security & Privacy'}
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Text style={styles.signOutText}>
            {currentLanguage === 'zh' ? '退出登录' : 'Sign out'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  homeScrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#999',
  },
  settingsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a4ff3e',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#444',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: '#fff',
  },
  settingValue: {
    fontSize: 14,
    color: '#999',
  },
  settingInput: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'right',
    minWidth: 100,
  },
  settingArrow: {
    fontSize: 20,
    color: '#999',
  },
  saveSettingsButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveSettingsButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  fontSizeButton: {
    backgroundColor: '#444',
    borderRadius: 8,
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  fontSizeButtonActive: {
    backgroundColor: '#a4ff3e',
  },
  fontSizeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  signOutButton: {
    backgroundColor: '#444',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
