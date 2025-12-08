import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, useData, useAppState, useUserProfile } from '../contexts';

export const ProgressScreen = ({ navigation }) => {
  const { userId } = useAuth();
  const { 
    weightRecords,
    calorieRecords,
    statsData,
    loadingStats,
    loadWeightRecords,
    loadCalorieRecords,
    loadStatistics,
    completedMeals,
  } = useData();
  const { userProfile } = useUserProfile();
  const { currentLanguage } = useAppState();

  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [selectedWeightPoint, setSelectedWeightPoint] = useState(null);
  
  // ✅ 目标编辑相关状态
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalWeightTarget, setGoalWeightTarget] = useState('70');  // 目标体重
  const [goalBodyFatTarget, setGoalBodyFatTarget] = useState('18'); // 目标体脂率
  const [tempWeightTarget, setTempWeightTarget] = useState('70');
  const [tempBodyFatTarget, setTempBodyFatTarget] = useState('18');

  useEffect(() => {
    if (userId) {
      loadWeightRecords(7);
      loadCalorieRecords(7);
      loadStatistics(7);
      loadGoals(); // 加载保存的目标
    }
  }, [userId]);

  // ✅ 从AsyncStorage加载目标
  const loadGoals = async () => {
    try {
      const savedWeightGoal = await AsyncStorage.getItem(`weightGoal_${userId}`);
      const savedBodyFatGoal = await AsyncStorage.getItem(`bodyFatGoal_${userId}`);
      
      if (savedWeightGoal) {
        setGoalWeightTarget(savedWeightGoal);
        setTempWeightTarget(savedWeightGoal);
      }
      if (savedBodyFatGoal) {
        setGoalBodyFatTarget(savedBodyFatGoal);
        setTempBodyFatTarget(savedBodyFatGoal);
      }
    } catch (error) {
      console.error('加载目标失败:', error);
    }
  };

  // ✅ 保存目标到AsyncStorage
  const saveGoals = async () => {
    try {
      await AsyncStorage.setItem(`weightGoal_${userId}`, tempWeightTarget);
      await AsyncStorage.setItem(`bodyFatGoal_${userId}`, tempBodyFatTarget);
      
      setGoalWeightTarget(tempWeightTarget);
      setGoalBodyFatTarget(tempBodyFatTarget);
      setShowGoalModal(false);
      
      Alert.alert(
        currentLanguage === 'zh' ? '保存成功' : 'Saved',
        currentLanguage === 'zh' ? '目标已更新' : 'Goals updated'
      );
    } catch (error) {
      console.error('保存目标失败:', error);
    }
  };

  // ✅ 计算减重进度百分比
  const calculateWeightProgress = () => {
    const currentWeight = statsData.currentWeight || userProfile?.weight || 0;
    const targetWeight = parseFloat(goalWeightTarget) || 70;
    
    if (currentWeight <= 0) return 0;
    
    // 如果当前体重已达到或低于目标，返回100%
    if (currentWeight <= targetWeight) return 100;
    
    // 假设起始体重比目标重20kg作为基准（可以根据实际调整）
    const startWeight = targetWeight + 20;
    const progress = ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100;
    
    return Math.min(100, Math.max(0, progress));
  };

  // ✅ 计算体脂率进度百分比
  const calculateBodyFatProgress = () => {
    const currentBodyFat = statsData.bodyFat || userProfile?.bodyFatRate || 0;
    const targetBodyFat = parseFloat(goalBodyFatTarget) || 18;
    
    if (currentBodyFat <= 0) return 0;
    
    // 如果当前体脂率已达到或低于目标，返回100%
    if (currentBodyFat <= targetBodyFat) return 100;
    
    // 假设起始体脂率比目标高10%作为基准
    const startBodyFat = targetBodyFat + 10;
    const progress = ((startBodyFat - currentBodyFat) / (startBodyFat - targetBodyFat)) * 100;
    
    return Math.min(100, Math.max(0, progress));
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
  const isWeightGoalAchieved = () => {
    const currentWeight = statsData.currentWeight || userProfile?.weight || 0;
    const targetWeight = parseFloat(goalWeightTarget) || 70;
    return currentWeight > 0 && currentWeight <= targetWeight;
  };

  const isBodyFatGoalAchieved = () => {
    const currentBodyFat = statsData.bodyFat || userProfile?.bodyFatRate || 0;
    const targetBodyFat = parseFloat(goalBodyFatTarget) || 18;
    return currentBodyFat > 0 && currentBodyFat <= targetBodyFat;
  };

  const isNutritionGoalAchieved = () => {
    return calculateNutritionProgress() >= 100;
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

        {/* Data Analysis Header */}
        <View style={styles.statsHeader}>
          <Text style={styles.cardTitle}>
            {currentLanguage === 'zh' ? '数据分析' : 'Data analysis'}
          </Text>
          <Text style={styles.statsDate}>
            {currentLanguage === 'zh' ? '更新于: 2025-10-28' : 'Updated on: 2025-10-28'}
          </Text>
        </View>
        <View style={styles.divider} />

        {/* Stats Grid */}
        {loadingStats ? (
          <View style={styles.statsLoadingContainer}>
            <ActivityIndicator size="large" color="#d0fd3e" />
            <Text style={styles.loadingText}>加载统计数据...</Text>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {/* Current Weight */}
            <View style={styles.statCard}>
              <Image
                source={require('../../assets/images/95e92b3293e9684336455b34fb862e98.png')}
                style={styles.statIcon}
                resizeMode="contain"
              />
              <Text style={styles.statValue}>
                {statsData.currentWeight?.toFixed(1) || '--'}kg
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
                {statsData.bodyFat?.toFixed(1) || '--'}%
              </Text>
              <Text style={styles.statLabel}>
                {currentLanguage === 'zh' ? '体脂率' : 'Body fat rate'}
              </Text>
              <View style={styles.statChange}>
                <Image
                  source={statsData.bodyFatChange < 0
                    ? require('../../assets/images/273221eef94acfe2a22b329527cf2c18.png')
                    : require('../../assets/images/82a1b37f45b5014ef813b00f07e36679.png')
                  }
                  style={styles.changeIcon}
                  resizeMode="contain"
                />
                <Text style={styles.changeText}>
                  {Math.abs(statsData.bodyFatChange || 0).toFixed(1)}% ({currentLanguage === 'zh' ? '7天' : '7 days'})
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
                {statsData.avgCalorieBurn || '--'}kcal
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
                {statsData.nutritionScore || '--'}%
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
        )}

        {/* Weight Trend Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>
              {currentLanguage === 'zh' ? '体重趋势' : 'Weight Trend'}
            </Text>
            <Text style={styles.goalText}>
              {currentLanguage === 'zh' ? '目标: 70kg' : 'Goal: 70kg'}
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
              onPress={() => {
                setTempWeightTarget(goalWeightTarget);
                setTempBodyFatTarget(goalBodyFatTarget);
                setShowGoalModal(true);
              }}
            >
              <Image
                source={require('../../assets/images/a4073118235180a9ab71a76225f32491.png')}
                style={styles.editGoalIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          
          {/* 减重目标 */}
          <View style={styles.progressItem}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>
                {currentLanguage === 'zh' ? '减重目标' : 'Weight Loss Target'}
              </Text>
              {isWeightGoalAchieved() && (
                <Text style={styles.achievedBadge}>✓</Text>
              )}
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${calculateWeightProgress()}%` }]} />
            </View>
            <Text style={styles.progressValue}>
              {(statsData.currentWeight || userProfile?.weight) 
                ? `${(statsData.currentWeight || userProfile?.weight).toFixed(1)} kg → ${goalWeightTarget} kg` 
                : `-- kg → ${goalWeightTarget} kg`}
            </Text>
          </View>

          {/* 体脂率目标 */}
          <View style={styles.progressItem}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>
                {currentLanguage === 'zh' ? '体脂率目标' : 'Body Fat Rate Target'}
              </Text>
              {isBodyFatGoalAchieved() && (
                <Text style={styles.achievedBadge}>✓</Text>
              )}
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${calculateBodyFatProgress()}%` }]} />
            </View>
            <Text style={styles.progressValue}>
              {(statsData.bodyFat || userProfile?.bodyFatRate)
                ? `${(statsData.bodyFat || userProfile?.bodyFatRate).toFixed(1)} % → ${goalBodyFatTarget} %`
                : `-- % → ${goalBodyFatTarget} %`}
            </Text>
          </View>

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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ✅ 目标编辑弹窗 */}
      <Modal
        visible={showGoalModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.goalModalContainer}>
            <Text style={styles.goalModalTitle}>
              {currentLanguage === 'zh' ? '设定目标' : 'Set Goals'}
            </Text>
            
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
                placeholder="70"
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
                placeholder="18"
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

            {/* 按钮区域 */}
            <View style={styles.goalModalButtons}>
              <TouchableOpacity 
                style={styles.goalCancelButton}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={styles.goalCancelButtonText}>
                  {currentLanguage === 'zh' ? '取消' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.goalSaveButton}
                onPress={saveGoals}
              >
                <Text style={styles.goalSaveButtonText}>
                  {currentLanguage === 'zh' ? '保存' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
