import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth, useUserProfile, useData, useAppState } from '../contexts';
import { t } from '../../services/i18n';
import { translateExerciseName } from '../utils/exerciseTranslations';

export const HomeScreen = ({ navigation }) => {
  const { userId } = useAuth();
  const { userProfile, trainingPlan, loadTrainingPlan, loadUserProfile } = useUserProfile();
  const { 
    selectedDate, 
    setSelectedDate,
    checkedInDates,
    completedExercises,
    setCompletedExercises,
    saveCompletion,
    loadCalorieRecords,
    getDateKey,
  } = useData();
  const { currentLanguage } = useAppState();
  
  // 直接从 userProfile 读取并显示的三个训练参数
  const displayDuration = userProfile.trainingDuration || 30;
  const displayIntensity = userProfile.trainingIntensity || 'Intermediate';
  const displayArea = userProfile.trainingArea || 'Full body';
  
  // 计算今日训练计划的卡路里总和
  const todayTotalCalories = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const todayPlans = trainingPlan.filter(item => {
      if (!item.planDate) return false;
      return item.planDate === todayStr;
    });
    
    const total = todayPlans.reduce((sum, item) => {
      return sum + (item.calories || 0);
    }, 0);
    
    return total > 0 ? total : 380;
  }, [trainingPlan]);

  // 首次进入时加载数据
  useEffect(() => {
    if (userId && trainingPlan.length === 0) {
      loadUserProfile();
      loadTrainingPlan(true);
    }
  }, [userId]);
  
  // ✅ 关键修改：每次页面获得焦点时，重新加载用户数据和训练计划
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadUserProfile();      // 刷新用户数据（包括训练参数）
        loadTrainingPlan(true); // 刷新训练计划（运动卡片）
      }
    }, [userId])
  );

  const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const isDateCheckedIn = (date) => {
    const dateKey = getDateKey(date);
    return checkedInDates[dateKey] || false;
  };

  const isTodayCheckedIn = () => {
    return isDateCheckedIn(new Date());
  };

  const isSelectedDateToday = () => {
    return isSameDay(selectedDate, new Date());
  };

  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = -15; i <= 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayNames = currentLanguage === 'zh' 
        ? ['日', '一', '二', '三', '四', '五', '六']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      dates.push({
        date: date,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        isToday: isSameDay(date, today),
        isSelected: isSameDay(date, selectedDate),
        isCheckedIn: isDateCheckedIn(date),
      });
    }
    
    return dates;
  };

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
  };

  // ✅ 使用统一的翻译工具（不再维护本地翻译表）

  const saveCompletionStatus = async (date, itemType, itemIndex, completed, itemName, calories) => {
    if (!userId) return;

    const dateKey = getDateKey(date);
    // ✨ 修正：使用 itemType 字段而不是 type（与 App1.js 一致）
    const data = {
      userId,
      date: dateKey,
      itemType,  // 修正：直接使用 itemType，不转换为 type
      itemIndex,
      completed,
      itemName,
      calories: calories || 0,
    };

    try {
      await saveCompletion(data);
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving completion:', error);
      }
    }
  };

  const loadCaloriesFromBackend = async (days = 7) => {
    try {
      await loadCalorieRecords(days);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading calories:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.homeScrollView}>
        {/* Header */}
        <View style={styles.homeHeader}>
          <View style={styles.homeHeaderLeft}>
            <Image
              source={require('../../assets/images/8563293d9e83002bd129e85427b055bd.png')}
              style={styles.homeLogo}
              resizeMode="contain"
            />
            <Text style={styles.homeLogoText}>FitBite Pal</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('SetTab')}>
            <Image
              source={require('../../assets/images/2402eb851a5c141f436d017000457023.png')}
              style={styles.homeProfileIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Today's Plan Card */}
        <View style={styles.todayPlanCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('todayPlan')}</Text>
            <TouchableOpacity 
              style={styles.adjustButton}
              onPress={() => navigation.navigate('AdjustPlan')}
            >
              <Image
                source={require('../../assets/images/a4073118235180a9ab71a76225f32491.png')}
                style={styles.adjustIcon}
                resizeMode="contain"
              />
              <Text style={styles.adjustText}>
                {currentLanguage === 'zh' ? '调整' : 'Adjust'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>{t('duration')}</Text>
            <Text style={styles.planValue}>{displayDuration} {t('minutes')}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>
              {currentLanguage === 'zh' ? '强度' : 'Intensity'}
            </Text>
            <Text style={styles.planValue}>
              {currentLanguage === 'zh' ? (
                displayIntensity === 'Rookie' ? '新手' :
                displayIntensity === 'Beginner' ? '初学者' :
                displayIntensity === 'Intermediate' ? '中级' :
                displayIntensity === 'Advanced' ? '高级' : '中级'
              ) : displayIntensity}
            </Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>{t('trainingArea')}</Text>
            <Text style={styles.planValue}>
              {currentLanguage === 'zh' 
                ? (displayArea === 'Upper body' ? '上肢' :
                   displayArea === 'Lower body' ? '下肢' :
                   displayArea === 'Core' ? '核心' : '全身')
                : displayArea}
            </Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>
              {currentLanguage === 'zh' ? '目标' : 'Objective'}
            </Text>
            <Text style={styles.planValue}>{todayTotalCalories} kcal</Text>
          </View>
        </View>

        {/* AI Fitness Companion */}
        <TouchableOpacity style={styles.aiButton} onPress={() => navigation.navigate('Chat')}>
          <Image
            source={require('../../assets/images/e026f42738076aa451f39345cc3c931c.png')}
            style={styles.aiIcon}
            resizeMode="contain"
          />
          <Text style={styles.aiText}>{t('aiFitnessCompanion')}</Text>
        </TouchableOpacity>

        {/* 每日打卡按钮 */}
        <TouchableOpacity 
          style={[
            styles.checkInButton,
            isTodayCheckedIn() && styles.checkInButtonChecked
          ]}
          onPress={() => {
            if (isTodayCheckedIn()) {
              Alert.alert(t('success'), currentLanguage === 'zh' ? '今天已经打卡过了！' : 'Already checked in today!');
            } else {
              navigation.navigate('CheckIn');
            }
          }}
        >
          <View style={styles.checkInContent}>
            <Text style={styles.checkInIcon}>📋</Text>
            <Text style={styles.checkInText}>
              {isTodayCheckedIn() ? (currentLanguage === 'zh' ? '✅ 今日已打卡' : '✅ Checked In') : (currentLanguage === 'zh' ? '每日打卡' : 'Daily Check-in')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Daily Training Section */}
        <View style={styles.dailyTrainingCard}>
          <Text style={styles.cardTitle}>{t('dailyTraining')}</Text>
          <View style={styles.divider} />

          {/* Date Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekSelector}>
            {getWeekDates().map((dayData, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayItem,
                  dayData.isSelected && styles.dayItemActive,
                  dayData.isCheckedIn && styles.dayItemCheckedIn
                ]}
                onPress={() => handleDateSelect(dayData.date)}
              >
                <Text style={[
                  styles.dayText,
                  dayData.isSelected && styles.dayTextActive
                ]}>
                  {dayData.dayName}
                </Text>
                <Text style={[
                  styles.dayNumber,
                  dayData.isSelected && styles.dayNumberActive
                ]}>
                  {dayData.dayNumber}
                </Text>
                {dayData.isToday && (
                  <View style={styles.todayDot} />
                )}
                {dayData.isCheckedIn && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Training List */}
          <View style={styles.trainingList}>
            {trainingPlan.length > 0 ? trainingPlan
              // ✨ 关键：根据选择的日期过滤训练计划
              .filter(item => {
                if (!item.planDate) return true; // 兼容旧数据
                const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                return item.planDate === selectedDateStr;
              })
              .map((item, index) => {
              const dateKey = getDateKey(selectedDate);
              // ✅ 使用 orderIndex-1（因为后端orderIndex从1开始，完成记录从0开始）或 index
              const itemIndex = item.orderIndex !== undefined ? (item.orderIndex - 1) : index;
              const isCompleted = completedExercises[dateKey]?.[itemIndex] || false;
              const canModify = isSelectedDateToday();
              
              // 调试日志（仅开发模式且首次渲染）
              // if (__DEV__ && index === 0) console.log(`🏋️ 训练计划已加载，日期: ${dateKey}`);
              
              return (
                <TouchableOpacity 
                  key={index} 
                  style={styles.trainingItem}
                  onPress={() => {
                    navigation.navigate('ExerciseDetail', { exercise: item });
                  }}
                >
                  <View style={styles.trainingItemLeft}>
                    <Image
                      source={item.image || require('../../assets/images/3893d8167b8f1b68e45c38830ebaa53f.png')}
                      style={styles.trainingItemIcon}
                      resizeMode="contain"
                    />
                    <View style={styles.trainingItemInfo}>
                      <Text style={[
                        styles.trainingItemName,
                        isCompleted && canModify && styles.trainingItemNameCompleted
                      ]}>
                        {translateExerciseName(item.name || item.exerciseName, currentLanguage)}
                      </Text>
                      <Text style={[
                        styles.trainingItemDuration,
                        isCompleted && canModify && styles.trainingItemNameCompleted
                      ]}>
                        {item.duration}
                      </Text>
                    </View>
                  </View>
                  
                  {canModify ? (
                    <TouchableOpacity 
                      style={styles.playButton}
                      onPress={async (e) => {
                        e.stopPropagation();
                        
                        // ✅ 使用 orderIndex-1（后端从1开始，完成记录从0开始）或 index
                        const itemIdx = item.orderIndex !== undefined ? (item.orderIndex - 1) : index;
                        const newCompletedState = !(completedExercises[dateKey]?.[itemIdx]);
                        
                        setCompletedExercises(prev => ({
                          ...prev,
                          [dateKey]: {
                            ...(prev[dateKey] || {}),
                            [itemIdx]: newCompletedState
                          }
                        }));
                        
                        const calories = (item.calories && item.calories > 0) ? item.calories : 150;
                        
                        await saveCompletionStatus(
                          selectedDate, 
                          'exercise', 
                          itemIdx,  // ✅ 使用 orderIndex
                          newCompletedState,
                          item.name || item.exerciseName,
                          calories
                        );
                        
                        setTimeout(async () => {
                          await loadCaloriesFromBackend(7);
                        }, 100);
                      }}
                    >
                      <Image
                        source={isCompleted
                          ? require('../../assets/images/55108108874579b2dfc4072eccccbf78.png')
                          : require('../../assets/images/ad48f50b439c948ed6c0be2219c472f7.png')
                        }
                        style={styles.playIcon}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ) : (
                    // ✅ 历史日期：显示完成状态但不可点击
                    <View style={styles.playButton}>
                      <Image
                        source={isCompleted
                          ? require('../../assets/images/55108108874579b2dfc4072eccccbf78.png')
                          : require('../../assets/images/ad48f50b439c948ed6c0be2219c472f7.png')
                        }
                        style={[styles.playIcon, styles.playIconDisabled]}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }) : (
              <Text style={styles.emptyText}>No training plan yet. Complete onboarding to get started!</Text>
            )}
          </View>
        </View>

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
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  homeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeLogo: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  homeLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  homeProfileIcon: {
    width: 32,
    height: 32,
  },
  todayPlanCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flexShrink: 1,
  },
  adjustButton: {
    backgroundColor: '#444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  adjustText: {
    fontSize: 12,
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 12,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  planLabel: {
    fontSize: 14,
    color: '#999',
  },
  planValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  aiButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  aiText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  checkInButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  checkInButtonChecked: {
    backgroundColor: '#444',
  },
  checkInContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkInIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  checkInText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  dailyTrainingCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  weekSelector: {
    marginVertical: 16,
  },
  dayItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#333',
    minWidth: 60,
    position: 'relative',
  },
  dayItemActive: {
    backgroundColor: '#a4ff3e',
  },
  dayItemCheckedIn: {
    borderWidth: 2,
    borderColor: '#a4ff3e',
  },
  dayText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  dayTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  dayNumber: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  dayNumberActive: {
    color: '#000',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a4ff3e',
  },
  checkMark: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 16,
    color: '#a4ff3e',
    fontWeight: 'bold',
  },
  trainingList: {
    marginTop: 8,
  },
  trainingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  trainingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trainingItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  trainingItemInfo: {
    flex: 1,
  },
  trainingItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  trainingItemNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  trainingItemDuration: {
    fontSize: 14,
    color: '#999',
  },
  playButton: {
    padding: 8,
  },
  playIcon: {
    width: 32,
    height: 32,
  },
  playIconDisabled: {
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
