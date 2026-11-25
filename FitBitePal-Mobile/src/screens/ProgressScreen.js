import { useFocusEffect } from '@react-navigation/native';
import React, { useState, useEffect, useCallback, useReducer } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, useData, useAppState, useUserProfile } from '../contexts';
import { progressLoadState } from '../utils/screenReads';
import { buildGoalPatch } from '../utils/measurementGoals';
import { updateMeasurementGoals } from '../api/user';

export const ProgressScreen = ({ navigation }) => {
  const { userId } = useAuth();
  const { loadProgress, completedMeals, getDateKey } = useData();
  const [{ status, snapshot, updatedAt }, dispatch] = useReducer(progressLoadState, {
    status: 'loading', snapshot: null, updatedAt: null,
  });
  const [attempt, setAttempt] = useState(0);
  const { weightRecords = [], calorieRecords = [], statistics: statsData = {} } = snapshot || {};
  const { userProfile } = useUserProfile();
  const { currentLanguage } = useAppState();

  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [selectedWeightPoint, setSelectedWeightPoint] = useState(null);
  
  // ✅ 目标编辑相关状态
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempWeightTarget, setTempWeightTarget] = useState('');
  const [tempBodyFatTarget, setTempBodyFatTarget] = useState('');
  const [legacyGoals, setLegacyGoals] = useState({});
  const [originalGoals, setOriginalGoals] = useState({});
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalError, setGoalError] = useState('');
  const goals = statsData.goals || {};
  const goalWeightTarget = goals.weight?.target;
  const isZh = currentLanguage === 'zh';

  const todayKey = getDateKey();
  useFocusEffect(useCallback(() => {
    let focused = true;
    dispatch({ status: 'loading' });
    loadProgress(7, todayKey)
      .then(data => {
        if (focused) dispatch({ status: 'ready', snapshot: data, updatedAt: new Date() });
      })
      .catch(() => { if (focused) dispatch({ status: 'error' }); });
    return () => { focused = false; };
  }, [loadProgress, todayKey, attempt]));

  useEffect(() => {
    let current = true;
    setLegacyGoals({});
    if (userId != null) {
      AsyncStorage.multiGet([`weightGoal_${userId}`, `bodyFatGoal_${userId}`])
        .then(([[, weight], [, bodyFat]]) => {
          if (current) setLegacyGoals({ weight, bodyFat });
        }).catch(() => {});
    }
    return () => { current = false; };
  }, [userId]);

  const openGoals = () => {
    const original = { weight: goals.weight?.target ?? null, bodyFat: goals.bodyFat?.target ?? null };
    setOriginalGoals(original);
    setTempWeightTarget(String(original.weight ?? legacyGoals.weight ?? ''));
    setTempBodyFatTarget(String(original.bodyFat ?? legacyGoals.bodyFat ?? ''));
    setGoalError('');
    setShowGoalModal(true);
  };

  const saveGoals = async () => {
    let patch;
    try {
      patch = buildGoalPatch(originalGoals, tempWeightTarget, tempBodyFatTarget);
    } catch (error) {
      setGoalError(error.message === 'weight'
        ? (isZh ? '请输入 30 至 300 公斤的目标体重，或留空。' : 'Enter a target weight of 30–300 kg, or leave it blank.')
        : (isZh ? '请输入大于 0 且不超过 100 的体脂率，或留空。' : 'Enter a body fat percentage above 0 and at most 100, or leave it blank.'));
      return;
    }
    setSavingGoals(true);
    setGoalError('');
    try {
      if (Object.keys(patch).length > 0) {
        const response = await updateMeasurementGoals(userId, patch);
        if (!response.success || !response.data) throw new Error('Goal update failed');
        dispatch({ status: 'ready', updatedAt: new Date(), snapshot: {
          ...snapshot, statistics: { ...statsData, goals: response.data },
        } });
        setAttempt(previous => previous + 1);
      }
      setLegacyGoals({});
      AsyncStorage.multiRemove([`weightGoal_${userId}`, `bodyFatGoal_${userId}`]).catch(() => {});
      setShowGoalModal(false);
    } catch {
      setGoalError(isZh ? '保存失败，请重试。' : 'Could not save your goals. Please retry.');
    } finally {
      setSavingGoals(false);
    }
  };

  // ✅ 计算营养目标进度（基于今日完成的餐次）
  const calculateNutritionProgress = () => {
    // 获取今天的日期key
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 统计今日完成的餐次
    const todayMeals = completedMeals[dateKey] || {};
    const completedCount = Object.values(todayMeals).filter(v => v === true).length;
    
    // 假设每天3餐，计算完成百分比
    const totalMeals = 3;
    const progress = (completedCount / totalMeals) * 100;
    
    return Math.min(100, Math.max(0, progress));
  };

  // ✅ 检查目标是否达成
  const isNutritionGoalAchieved = () => {
    return calculateNutritionProgress() >= 100;
  };

  const displayCurrentWeight = statsData.currentWeight;
  const displayBodyFat = statsData.bodyFat;
  const displayAvgCalorieBurn = statsData.avgCalorieBurn || userProfile?.bmr || 0;
  const displayNutritionScore = statsData.nutritionScore || Math.round(calculateNutritionProgress());
  const hasRecordedProgress =
    weightRecords.length > 0 ||
    calorieRecords.some((record) => (record.intake || record.exerciseCalories || record.expenditure || 0) > 0) ||
    Object.keys(completedMeals).length > 0;
  const updatedDateLabel = updatedAt?.toLocaleDateString(
    currentLanguage === 'zh' ? 'zh-CN' : 'en-US',
    { year: 'numeric', month: '2-digit', day: '2-digit' }
  );

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

        {/* Data Analysis Header */}
        <View style={styles.statsHeader}>
          <Text style={styles.cardTitle}>
            {currentLanguage === 'zh' ? '数据分析' : 'Data analysis'}
          </Text>
          {updatedDateLabel && (
            <Text style={styles.statsDate}>
              {currentLanguage === 'zh' ? `更新于: ${updatedDateLabel}` : `Updated on: ${updatedDateLabel}`}
            </Text>
          )}
        </View>
        <View style={styles.divider} />

        {status === 'error' && (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle} accessibilityRole="alert">
              {currentLanguage === 'zh' ? '进度数据加载失败' : 'Could not load progress'}
            </Text>
            {snapshot && (
              <Text style={styles.emptyStateText}>
                {currentLanguage === 'zh' ? '当前显示上次加载的数据。' : 'Showing your last loaded data.'}
              </Text>
            )}
            <TouchableOpacity style={styles.retryButton} accessibilityRole="button"
              onPress={() => setAttempt(previous => previous + 1)}>
              <Text style={styles.retryText}>{currentLanguage === 'zh' ? '重试' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        )}
        {status === 'loading' && !snapshot && (
          <View style={styles.statsLoadingContainer}>
            <ActivityIndicator size="large" color="#d0fd3e" />
            <Text style={styles.loadingText}>
              {currentLanguage === 'zh' ? '正在加载进度数据…' : 'Loading progress…'}
            </Text>
          </View>
        )}
        {snapshot && <>
        {!hasRecordedProgress && (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>
              {currentLanguage === 'zh' ? '你的数据面板已准备好' : 'Your dashboard is ready'}
            </Text>
            <Text style={styles.emptyStateText}>
              {currentLanguage === 'zh'
                ? '完成一次打卡、记录一餐饮食或完成一次训练后，这里的趋势和统计会逐步丰富起来。'
                : 'After your first check-in, meal log, or workout completion, this dashboard will start filling with trends and stats.'}
            </Text>
          </View>
        )}

        {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {/* Current Weight */}
            <View style={styles.statCard}>
              <Image
                source={require('../../assets/images/95e92b3293e9684336455b34fb862e98.png')}
                style={styles.statIcon}
                resizeMode="contain"
              />
              <Text style={styles.statValue}>
                {displayCurrentWeight ? `${displayCurrentWeight.toFixed(1)}kg` : '--'}
              </Text>
              <Text style={styles.statLabel}>
                {currentLanguage === 'zh' ? '当前体重' : 'Current weight'}
              </Text>
              <View style={styles.statChange}>
                <Image
                  source={statsData.weightChange < 0
                    ? require('../../assets/images/273221eef94acfe2a22b329527cf2c18.png')
                    : require('../../assets/images/82a1b37f45b5014ef813b00f07e36679.png')
                  }
                  style={styles.changeIcon}
                  resizeMode="contain"
                />
                <Text style={styles.changeText}>
                  {Math.abs(statsData.weightChange || 0).toFixed(1)}kg ({currentLanguage === 'zh' ? '7天' : '7 days'})
                </Text>
              </View>
            </View>

            {/* Body Fat Rate */}
            <View style={styles.statCard}>
              <Image
                source={require('../../assets/images/da331a2d43d0048d6c91b35ad1ffa036.png')}
                style={styles.statIcon}
                resizeMode="contain"
              />
              <Text style={styles.statValue}>
                {displayBodyFat ? `${displayBodyFat.toFixed(1)}%` : '--'}
              </Text>
              <Text style={styles.statLabel}>
                {isZh ? '体脂率（估算）' : 'Body fat (estimated)'}
              </Text>
              <View style={styles.statChange}>
                <Text style={styles.changeText}>
                  {statsData.bodyFatChange == null
                    ? (isZh ? '暂无历史体脂对比' : 'No prior estimate')
                    : `${statsData.bodyFatChange > 0 ? '+' : ''}${statsData.bodyFatChange.toFixed(1)} ${isZh ? '个百分点' : 'pp'} · ${statsData.bodyFatChangeSince}`}
                </Text>
              </View>
            </View>

            {/* Daily Consumption */}
            <View style={styles.statCard}>
              <Image
                source={require('../../assets/images/386d1a99bdf1e11501d9b3d54fd79590.png')}
                style={styles.statIcon}
                resizeMode="contain"
              />
              <Text style={styles.statValue}>
                {displayAvgCalorieBurn ? `${displayAvgCalorieBurn}kcal` : '--'}
              </Text>
              <Text style={styles.statLabel}>
                {currentLanguage === 'zh' ? '日均消耗' : 'Daily mean\nconsumption'}
              </Text>
              <View style={styles.statChange}>
                <Image
                  source={require('../../assets/images/82a1b37f45b5014ef813b00f07e36679.png')}
                  style={styles.changeIcon}
                  resizeMode="contain"
                />
                <Text style={styles.changeText}>
                  {currentLanguage === 'zh' ? '7天平均' : 'Avg 7 days'}
                </Text>
              </View>
            </View>

            {/* Nutrition Score */}
            <View style={styles.statCard}>
              <Image
                source={require('../../assets/images/d636ce1b1fee48c2f07b06556ff5dd56.png')}
                style={styles.statIcon}
                resizeMode="contain"
              />
              <Text style={styles.statValue}>
                {`${displayNutritionScore}%`}
              </Text>
              <Text style={styles.statLabel}>
                {currentLanguage === 'zh' ? '营养完成度' : 'Completion\nnutrition score'}
              </Text>
              <View style={styles.statChange}>
                <Image
                  source={statsData.nutritionScoreChange >= 0
                    ? require('../../assets/images/82a1b37f45b5014ef813b00f07e36679.png')
                    : require('../../assets/images/273221eef94acfe2a22b329527cf2c18.png')
                  }
                  style={styles.changeIcon}
                  resizeMode="contain"
                />
                <Text style={styles.changeText}>
                  {Math.abs(statsData.nutritionScoreChange || 0)}% ({currentLanguage === 'zh' ? '7天' : '7 days'})
                </Text>
              </View>
            </View>
          </View>


        {/* Weight Trend Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>
              {currentLanguage === 'zh' ? '体重趋势' : 'Weight Trend'}
            </Text>
            <Text style={styles.goalText}>
              {goalWeightTarget != null ? (isZh ? `目标 ${goalWeightTarget} kg` : `Goal ${goalWeightTarget} kg`) : ''}
            </Text>
          </View>
          <View style={styles.weightTrendUnderline} />
          
          {/* Weight Chart */}
          <View style={styles.weightChartContainer}>
            {/* Y-axis labels */}
            <View style={styles.weightYAxisLabels}>
              <Text style={styles.yAxisLabel}>180 kg</Text>
              <Text style={styles.yAxisLabel}>150 kg</Text>
              <Text style={styles.yAxisLabel}>120 kg</Text>
              <Text style={styles.yAxisLabel}>90 kg</Text>
              <Text style={styles.yAxisLabel}>60 kg</Text>
              <Text style={styles.yAxisLabel}>30 kg</Text>
            </View>

            {/* Chart area */}
            <View 
              style={styles.weightChartArea}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                setChartSize({ width, height });
              }}
            >
              <View style={styles.weightLineBackground} />
              
              {chartSize.width > 0 && weightRecords.length > 0 && (() => {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const last4Days = [];
                for (let i = 3; i >= 0; i--) {
                  const date = new Date(today);
                  date.setDate(today.getDate() - i);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  last4Days.push(`${year}-${month}-${day}`);
                }
                
                const maxWeight = 180;
                const minWeight = 30;
                const range = maxWeight - minWeight;
                
                const points = weightRecords
                  .filter(record => {
                    const recordDate = record.date.split('T')[0];
                    return last4Days.includes(recordDate);
                  })
                  .map(record => {
                    const recordDate = record.date.split('T')[0];
                    const dayIndex = last4Days.indexOf(recordDate);
                    const x = (dayIndex / 3) * 80 + 10;
                    const y = ((maxWeight - record.weight) / range) * 80 + 10;
                    return { x, y, weight: record.weight, date: record.date, dayIndex };
                  });
                
                return (
                  <>
                    {points.map((point, index) => {
                      if (index === points.length - 1) return null;
                      const nextPoint = points[index + 1];
                      
                      const x1Px = (point.x / 100) * chartSize.width;
                      const y1Px = (point.y / 100) * chartSize.height;
                      const x2Px = (nextPoint.x / 100) * chartSize.width;
                      const y2Px = (nextPoint.y / 100) * chartSize.height;
                      
                      const dx = x2Px - x1Px;
                      const dy = y2Px - y1Px;
                      const length = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                      
                      return (
                        <View
                          key={`line-${index}`}
                          style={{
                            position: 'absolute',
                            left: x1Px,
                            top: y1Px,
                            width: length,
                            height: 2,
                            backgroundColor: '#a4ff3e',
                            transformOrigin: 'left center',
                            transform: [{ rotate: `${angle}deg` }],
                          }}
                        />
                      );
                    })}
                    
                    {points.map((point, index) => (
                      <TouchableOpacity
                        key={`point-${index}`}
                        style={{
                          position: 'absolute',
                          left: (point.x / 100) * chartSize.width,
                          top: (point.y / 100) * chartSize.height,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginLeft: -12,
                          marginTop: -12,
                          zIndex: 2,
                        }}
                        onPress={() => {
                          if (selectedWeightPoint === index) {
                            setSelectedWeightPoint(null);
                          } else {
                            setSelectedWeightPoint(index);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.weightPointInner} />
                      </TouchableOpacity>
                    ))}
                    
                    {selectedWeightPoint !== null && points[selectedWeightPoint] && (
                      <View style={[styles.weightTooltip, {
                        left: Math.min(Math.max((points[selectedWeightPoint].x / 100) * chartSize.width - 50, 5), chartSize.width - 110),
                        top: Math.max((points[selectedWeightPoint].y / 100) * chartSize.height - 60, 5),
                      }]}>
                        <TouchableOpacity 
                          style={styles.tooltipCloseButton}
                          onPress={() => setSelectedWeightPoint(null)}
                        >
                          <Text style={styles.tooltipCloseText}>✕</Text>
                        </TouchableOpacity>
                        <Text style={styles.tooltipMonth}>
                          {new Date(points[selectedWeightPoint].date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                        </Text>
                        <View style={styles.tooltipContent}>
                          <View style={styles.tooltipDot} />
                          <Text style={styles.tooltipLabel}>体重</Text>
                          <Text style={styles.tooltipValue}>
                            {points[selectedWeightPoint].weight.toFixed(1)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </View>

          {/* X-axis labels */}
          <View style={styles.weightXAxisLabels}>
            {(() => {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const labels = [];
              for (let i = 3; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const month = date.getMonth() + 1;
                const day = date.getDate();
                const label = `${month}/${day}`;
                labels.push(<Text key={i} style={styles.xAxisLabel}>{label}</Text>);
              }
              return labels;
            })()}
          </View>
        </View>

        {/* Calorie Chart */}
        <View style={styles.chartCard}>
          <View style={styles.calorieChartTitleRow}>
            <View style={styles.calorieTitleLeft}>
              <Text style={styles.cardTitle}>
                {currentLanguage === 'zh' ? '卡路里摄入与消耗' : 'Calorie Intake & Expenditure'}
              </Text>
            </View>
            <Text style={styles.weeklyAvgText}>
              {currentLanguage === 'zh' ? '每日概况' : 'Daily Overview'}
            </Text>
          </View>
          <View style={styles.calorieUnderline} />
          
          {/* Chart Area */}
          <View style={styles.calorieChartContainer}>
            {/* Y-axis labels */}
            <View style={styles.calorieYAxisLabels}>
              <Text style={styles.yAxisLabel}>4,000 kcal</Text>
              <Text style={styles.yAxisLabel}>3,000 kcal</Text>
              <Text style={styles.yAxisLabel}>2,000 kcal</Text>
              <Text style={styles.yAxisLabel}>1,000 kcal</Text>
              <Text style={styles.yAxisLabel}>0 kcal</Text>
            </View>

            {/* Chart bars */}
            <View style={styles.calorieBarsContainer}>
              {(() => {
                const displayData = calorieRecords.length > 0
                  ? calorieRecords.slice(-4).map(record => ({
                      day: new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' }),
                      intake: record.intake || 0,
                      expenditure: record.expenditure || 0,
                      baseMetabolism: record.baseMetabolism || 0,
                      exerciseCalories: record.exerciseCalories || 0,
                    }))
                  : [
                      { day: 'Thu', intake: 0, expenditure: 0, baseMetabolism: 0, exerciseCalories: 0 },
                      { day: 'Fri', intake: 0, expenditure: 0, baseMetabolism: 0, exerciseCalories: 0 },
                      { day: 'Sat', intake: 0, expenditure: 0, baseMetabolism: 0, exerciseCalories: 0 },
                      { day: 'Sun', intake: 0, expenditure: 0, baseMetabolism: 0, exerciseCalories: 0 },
                    ];
                
                return displayData.map((item, index) => {
                  const baseHeight = Math.max(5, (item.baseMetabolism / 4000) * 140);
                  const exerciseHeight = Math.max(0, (item.exerciseCalories / 4000) * 140);
                  const totalExpenditureHeight = baseHeight + exerciseHeight;
                  
                  return (
                    <View key={index} style={styles.calorieBarGroup}>
                      <View style={styles.calorieBarPair}>
                        <View style={[styles.calorieBar, styles.intakeBar, { 
                          height: Math.max(5, (item.intake / 4000) * 140) 
                        }]} />
                        
                        <View style={[styles.calorieBar, { 
                          height: totalExpenditureHeight,
                          backgroundColor: 'transparent',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                        }]}>
                          {exerciseHeight > 0 && (
                            <View style={{
                              height: exerciseHeight,
                              backgroundColor: '#3990ed',
                              borderTopLeftRadius: 6,
                              borderTopRightRadius: 6,
                            }} />
                          )}
                          <View style={{
                            height: baseHeight,
                            backgroundColor: '#2c5aa0',
                            borderTopLeftRadius: exerciseHeight === 0 ? 6 : 0,
                            borderTopRightRadius: exerciseHeight === 0 ? 6 : 0,
                            borderBottomLeftRadius: 6,
                            borderBottomRightRadius: 6,
                          }} />
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
            </View>
          </View>

          {/* X-axis labels */}
          <View style={styles.calorieXAxisLabels}>
            {(() => {
              const displayData = calorieRecords.length > 0
                ? calorieRecords.slice(-4).map(record => 
                    new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })
                  )
                : ['Thu', 'Fri', 'Sat', 'Sun'];
              
              return displayData.map((day, index) => (
                <Text key={index} style={styles.xAxisLabel}>{day}</Text>
              ));
            })()}
          </View>

          {/* Legend */}
          <View style={styles.calorieLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#5c9e57' }]} />
              <Text style={styles.legendText}>
                {currentLanguage === 'zh' ? '摄入' : 'Intake'}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2c5aa0' }]} />
              <Text style={styles.legendText}>
                {currentLanguage === 'zh' ? '基础代谢' : 'Base Metabolism'}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#3990ed' }]} />
              <Text style={styles.legendText}>
                {currentLanguage === 'zh' ? '运动消耗' : 'Exercise'}
              </Text>
            </View>
          </View>

          {/* Summary Cards */}
          <View style={styles.calorieSummary}>
            <View style={styles.calorieSummaryCard}>
              <Text style={styles.summaryValue}>
                {(() => {
                  const todayData = calorieRecords.length > 0 ? calorieRecords[calorieRecords.length - 1] : null;
                  return todayData ? (todayData.intake || 0) : 0;
                })()}
              </Text>
              <Text style={styles.summaryLabel}>
                {currentLanguage === 'zh' ? '摄入(千卡)' : 'Intake(kcal)'}
              </Text>
            </View>
            <View style={styles.calorieSummaryCard}>
              <Text style={styles.summaryValue}>
                {(() => {
                  const todayData = calorieRecords.length > 0 ? calorieRecords[calorieRecords.length - 1] : null;
                  const difference = todayData ? ((todayData.intake || 0) - (todayData.expenditure || 0)) : 0;
                  return difference;
                })()}
              </Text>
              <Text style={styles.summaryLabel}>
                {currentLanguage === 'zh' ? '差值' : 'Difference'}
              </Text>
            </View>
            <View style={styles.calorieSummaryCard}>
              <Text style={styles.summaryValue}>
                {(() => {
                  const todayData = calorieRecords.length > 0 ? calorieRecords[calorieRecords.length - 1] : null;
                  return todayData ? (todayData.baseMetabolism || 0) : 0;
                })()}
              </Text>
              <Text style={styles.summaryLabel}>
                {currentLanguage === 'zh' ? '基础代谢' : 'Base Metabolism'}
              </Text>
            </View>
            <View style={styles.calorieSummaryCard}>
              <Text style={styles.summaryValue}>
                {(() => {
                  const todayData = calorieRecords.length > 0 ? calorieRecords[calorieRecords.length - 1] : null;
                  return todayData ? (todayData.exerciseCalories || 0) : 0;
                })()}
              </Text>
              <Text style={styles.summaryLabel}>
                {currentLanguage === 'zh' ? '运动消耗' : 'Exercise'}
              </Text>
            </View>
          </View>
        </View>

        {/* Target Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardHeader}>
            <Text style={styles.cardTitle}>
              {currentLanguage === 'zh' ? '目标进度' : 'Target Progress'}
            </Text>
            <TouchableOpacity 
              style={styles.editGoalButton}
              onPress={openGoals}
              accessibilityLabel={isZh ? '编辑目标' : 'Edit goals'}
              disabled={status === 'loading'}
            >
              <Image
                source={require('../../assets/images/a4073118235180a9ab71a76225f32491.png')}
                style={styles.editGoalIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          
          <MeasurementGoal label={isZh ? '减重目标' : 'Weight loss target'} metric={goals.weight} unit="kg" isZh={isZh} />
          <MeasurementGoal label={isZh ? '体脂率目标（估算）' : 'Body fat target (estimated)'} metric={goals.bodyFat} unit="%" isZh={isZh} />

          {/* 营养目标 */}
          <View style={styles.progressItem}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>
                {currentLanguage === 'zh' ? '营养目标' : 'Nutrition Target'}
              </Text>
              {isNutritionGoalAchieved() && (
                <Text style={styles.achievedBadge}>✓</Text>
              )}
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${calculateNutritionProgress()}%` }]} />
            </View>
            <Text style={styles.progressValue}>
              {currentLanguage === 'zh' 
                ? `今日餐次完成度 ${calculateNutritionProgress().toFixed(0)}%`
                : `Daily meals ${calculateNutritionProgress().toFixed(0)}%`}
            </Text>
          </View>
        </View>

        </>}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ✅ 目标编辑弹窗 */}
      <Modal
        visible={showGoalModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { if (!savingGoals) setShowGoalModal(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.goalModalContainer}>
            <Text style={styles.goalModalTitle}>
              {currentLanguage === 'zh' ? '设定目标' : 'Set Goals'}
            </Text>
            
            {((originalGoals.weight == null && legacyGoals.weight) || (originalGoals.bodyFat == null && legacyGoals.bodyFat)) ? (
              <Text style={styles.goalHelp}>{isZh ? '已填入本机旧目标，保存后可在其他设备查看。' : 'Your previous on-device targets are filled in. Save to sync them across devices.'}</Text>
            ) : null}
            {/* 减重目标输入 */}
            <View style={styles.goalInputGroup}>
              <Text style={styles.goalInputLabel}>
                {currentLanguage === 'zh' ? '目标体重 (kg)' : 'Target Weight (kg)'}
              </Text>
              <TextInput
                style={styles.goalInput}
                value={tempWeightTarget}
                onChangeText={setTempWeightTarget}
                keyboardType="decimal-pad"
                placeholder={isZh ? '留空可清除' : 'Leave blank to clear'}
                placeholderTextColor="#666"
              />
            </View>

            {/* 体脂率目标输入 */}
            <View style={styles.goalInputGroup}>
              <Text style={styles.goalInputLabel}>
                {currentLanguage === 'zh' ? '目标体脂率 (%)' : 'Target Body Fat (%)'}
              </Text>
              <TextInput
                style={styles.goalInput}
                value={tempBodyFatTarget}
                onChangeText={setTempBodyFatTarget}
                keyboardType="decimal-pad"
                placeholder={isZh ? '留空可清除' : 'Leave blank to clear'}
                placeholderTextColor="#666"
              />
            </View>

            {/* 营养目标说明 */}
            <View style={styles.nutritionGoalInfo}>
              <Text style={styles.nutritionGoalInfoText}>
                {currentLanguage === 'zh' 
                  ? '💡 营养目标根据每日完成的餐次自动计算'
                  : '💡 Nutrition goal is calculated based on daily meals completed'}
              </Text>
            </View>

            {goalError ? <Text accessibilityRole="alert" style={styles.goalError}>{goalError}</Text> : null}
            {/* 按钮区域 */}
            <View style={styles.goalModalButtons}>
              <TouchableOpacity 
                style={styles.goalCancelButton}
                disabled={savingGoals}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={styles.goalCancelButtonText}>
                  {currentLanguage === 'zh' ? '取消' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.goalSaveButton}
                disabled={savingGoals}
                onPress={saveGoals}
              >
                <Text style={styles.goalSaveButtonText}>
                  {savingGoals ? (isZh ? '保存中…' : 'Saving…') : (isZh ? '保存' : 'Save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

function MeasurementGoal({ label, metric, unit, isZh }) {
  const target = metric?.target;
  const progress = metric?.percent;
  return (
    <View style={styles.progressItem}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        {metric?.achieved && <Text style={styles.achievedBadge}>✓ {isZh ? '已达成' : 'Achieved'}</Text>}
      </View>
      {progress != null && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      )}
      <Text style={styles.progressValue}>
        {target == null ? (isZh ? '尚未设定目标' : 'No target set')
          : progress == null ? (isZh ? `目标 ${target} ${unit} · 等待测量` : `Target ${target} ${unit} · awaiting measurement`)
          : (isZh
            ? `起点 ${metric.start} · 当前 ${metric.current} · 目标 ${target} ${unit}（${progress}%）`
            : `Start ${metric.start} · Current ${metric.current} · Target ${target} ${unit} (${progress}%)`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  goalError: { color: '#ff8282', marginBottom: 10 },
  goalHelp: { color: '#bbb', marginBottom: 12 },
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
  statsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#444',
    marginHorizontal: 20,
  },
  emptyStateCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#b8b8b8',
    fontSize: 13,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginTop: 4,
  },
  retryText: { color: '#d0fd3e', fontWeight: '700' },
  statsLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    margin: '1%',
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#a4ff3e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  changeText: {
    fontSize: 10,
    color: '#999',
  },
  chartCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalText: {
    fontSize: 12,
    color: '#a4ff3e',
  },
  weightTrendUnderline: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 12,
  },
  weightChartContainer: {
    flexDirection: 'row',
    height: 280,
    marginBottom: 12,
  },
  weightYAxisLabels: {
    justifyContent: 'space-between',
    paddingRight: 10,
    paddingVertical: 5,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
  },
  weightChartArea: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(78, 93, 49, 0.2)',
  },
  weightLineBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
  },
  weightPointInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#a4ff3e',
    borderWidth: 3,
    borderColor: '#2a2a2a',
  },
  weightTooltip: {
    position: 'absolute',
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 12,
    minWidth: 100,
    zIndex: 10,
  },
  tooltipCloseButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  tooltipCloseText: {
    color: '#999',
    fontSize: 14,
  },
  tooltipMonth: {
    fontSize: 10,
    color: '#999',
    marginBottom: 8,
  },
  tooltipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a4ff3e',
    marginRight: 8,
  },
  tooltipLabel: {
    fontSize: 12,
    color: '#fff',
    marginRight: 4,
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  weightXAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingLeft: 60,
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#999',
  },
  calorieChartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calorieTitleLeft: {
    flex: 1,
  },
  weeklyAvgText: {
    fontSize: 12,
    color: '#a4ff3e',
  },
  calorieUnderline: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 12,
  },
  calorieChartContainer: {
    flexDirection: 'row',
    marginVertical: 16,
  },
  calorieYAxisLabels: {
    width: 70,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  calorieBarsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
  },
  calorieBarGroup: {
    alignItems: 'center',
    flex: 1,
  },
  calorieBarPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  calorieBar: {
    width: 16,
    borderRadius: 6,
  },
  intakeBar: {
    backgroundColor: '#5c9e57',
  },
  calorieXAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 70,
    marginTop: 8,
  },
  calorieLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    color: '#999',
  },
  calorieSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  calorieSummaryCard: {
    width: '48%',
    backgroundColor: 'rgba(164, 255, 62, 0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a4ff3e',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#999',
  },
  progressCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editGoalButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(164, 255, 62, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editGoalIcon: {
    width: 18,
    height: 18,
    tintColor: '#a4ff3e',
  },
  progressItem: {
    marginVertical: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#fff',
  },
  achievedBadge: {
    fontSize: 14,
    color: '#a4ff3e',
    fontWeight: 'bold',
    marginLeft: 8,
    backgroundColor: 'rgba(164, 255, 62, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#a4ff3e',
    borderRadius: 4,
  },
  progressValue: {
    fontSize: 12,
    color: '#999',
  },
  // ✅ 目标编辑弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalModalContainer: {
    width: '85%',
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#444',
  },
  goalModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  goalInputGroup: {
    marginBottom: 20,
  },
  goalInputLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  goalInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
  },
  nutritionGoalInfo: {
    backgroundColor: 'rgba(164, 255, 62, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  nutritionGoalInfoText: {
    fontSize: 13,
    color: '#a4ff3e',
    textAlign: 'center',
  },
  goalModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalCancelButton: {
    flex: 1,
    backgroundColor: '#444',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  goalCancelButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  goalSaveButton: {
    flex: 1,
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  goalSaveButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
});
