import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFoodAnalysis } from '../hooks';
import { selectImageSource } from '../../services/cameraService';
import { useAppState } from '../contexts/AppStateContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { saveDietRecord } from '../api/user';

export const FoodRecognitionScreen = ({ navigation }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState('Lunch'); // 默认午餐
  const { analyzing, result, analyzeFood } = useFoodAnalysis();
  const { currentLanguage } = useAppState();
  const { dietPlan, setDietPlan } = useUserProfile();
  const { userId } = useAuth();

  // 餐次选项
  const mealTypeOptions = [
    { value: 'Breakfast', labelZh: '早餐', labelEn: 'Breakfast' },
    { value: 'Lunch', labelZh: '午餐', labelEn: 'Lunch' },
    { value: 'Dinner', labelZh: '晚餐', labelEn: 'Dinner' },
    { value: 'Snack', labelZh: '零食', labelEn: 'Snack' },
  ];

  const handleSelectImage = async () => {
    try {
      const image = await selectImageSource();
      if (image && image.uri) {
        setSelectedImage(image.uri); // ✨ 存储URI字符串
        // Auto analyze
        await analyzeFood(image.uri); // ✨ 传递URI字符串（与App1.js一致）
      }
    } catch (error) {
      console.error('Failed to select image:', error);
      Alert.alert(
        currentLanguage === 'zh' ? '错误' : 'Error',
        currentLanguage === 'zh' ? '选择图片失败' : 'Failed to select image'
      );
    }
  };

  const handleRetake = () => {
    setSelectedImage(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.homeScrollView}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity
            onPress={() => {
              navigation.goBack();
              setSelectedImage(null);
            }}
            style={styles.backButtonHeader}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle}>
            {currentLanguage === 'zh' ? '食物识别' : 'Food Recognition'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 说明文字 */}
        {!selectedImage && !result && (
          <View style={styles.foodInstructionCard}>
            <Text style={styles.foodInstructionIcon}>📸</Text>
            <Text style={styles.foodInstructionTitle}>
              {currentLanguage === 'zh' ? 'AI食物识别' : 'AI Food Recognition'}
            </Text>
            <Text style={styles.foodInstructionText}>
              {currentLanguage === 'zh' ? '拍照或从相册选择以分析营养成分' : 'Take a photo or select from library to analyze nutrition'}
            </Text>
          </View>
        )}

        {/* 拍照按钮区域 - 未选择图片时显示 */}
        {!selectedImage && !result && (
          <View style={styles.foodCameraButtonContainer}>
            <TouchableOpacity
              style={styles.foodCameraButton}
              onPress={handleSelectImage}
            >
              <Text style={styles.foodCameraButtonIcon}>📷</Text>
              <Text style={styles.foodCameraButtonText}>
                {currentLanguage === 'zh' ? '拍照或从相册选择' : 'Take Photo or Choose from Library'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 已选择图片预览 */}
        {selectedImage && (
          <View style={styles.foodImagePreviewContainer}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.foodImagePreview}
              resizeMode="cover"
            />
            {!analyzing && !result && (
              <TouchableOpacity
                style={styles.foodRetakeButton}
                onPress={handleSelectImage}
              >
                <Text style={styles.foodRetakeButtonText}>
                  {currentLanguage === 'zh' ? '↻ 重新拍照' : '↻ Retake Photo'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 分析中提示 */}
        {analyzing && (
          <View style={styles.foodResultCard}>
            <ActivityIndicator size="large" color="#a4ff3e" />
            <Text style={{ color: '#fff', textAlign: 'center', marginTop: 16 }}>
              {currentLanguage === 'zh' ? 'AI正在分析食物...' : 'AI analyzing food...'}
            </Text>
          </View>
        )}

        {/* 识别结果 */}
        {result && !analyzing && (
          <View style={styles.foodResultCard}>
            <Text style={styles.cardTitle}>
              {currentLanguage === 'zh' ? '营养分析' : 'Nutrition Analysis'}
            </Text>
            <View style={styles.divider} />

            <View style={styles.foodItem}>
              <Text style={styles.foodItemName}>
                {result.foodName || result.name || (currentLanguage === 'zh' ? '已识别食物' : 'Analyzed Food')}
              </Text>
              <Text style={styles.foodItemCalories}>
                {result.calories || 0} kcal
              </Text>
            </View>

            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>
                  {currentLanguage === 'zh' ? '蛋白质' : 'Protein'}
                </Text>
                <Text style={styles.nutritionValue}>
                  {result.protein || 0}g
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>
                  {currentLanguage === 'zh' ? '碳水' : 'Carbs'}
                </Text>
                <Text style={styles.nutritionValue}>
                  {result.carbs || 0}g
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>
                  {currentLanguage === 'zh' ? '脂肪' : 'Fat'}
                </Text>
                <Text style={styles.nutritionValue}>
                  {result.fat || 0}g
                </Text>
              </View>
            </View>

            {/* ✅ 显示食材信息 */}
            {result.ingredients && result.ingredients.length > 0 && (
              <View style={styles.ingredientsContainer}>
                <Text style={styles.ingredientsTitle}>
                  {currentLanguage === 'zh' ? '主要食材：' : 'Main Ingredients:'}
                </Text>
                <View style={styles.ingredientsList}>
                  {result.ingredients.map((item, index) => (
                    <Text key={index} style={styles.ingredientItem}>
                      • {item.name} {item.amount ? `(${item.amount})` : ''}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {result.advice && (
              <View style={styles.adviceContainer}>
                <Text style={styles.adviceTitle}>
                  {currentLanguage === 'zh' ? 'AI建议：' : 'AI Advice:'}
                </Text>
                <Text style={styles.adviceText}>
                  {result.advice}
                </Text>
              </View>
            )}

            {/* ✅ 餐次选择 */}
            <View style={styles.mealTypeSection}>
              <Text style={styles.mealTypeLabel}>
                {currentLanguage === 'zh' ? '选择餐次：' : 'Select Meal Type:'}
              </Text>
              <View style={styles.mealTypeOptions}>
                {mealTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.mealTypeOption,
                      selectedMealType === option.value && styles.mealTypeOptionSelected,
                    ]}
                    onPress={() => setSelectedMealType(option.value)}
                  >
                    <Text
                      style={[
                        styles.mealTypeOptionText,
                        selectedMealType === option.value && styles.mealTypeOptionTextSelected,
                      ]}
                    >
                      {currentLanguage === 'zh' ? option.labelZh : option.labelEn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.addMealButton}
              onPress={async () => {
                try {
                  // ✅ 构建食材 JSON
                  const ingredientsJson = result.ingredients && result.ingredients.length > 0
                    ? JSON.stringify(result.ingredients)
                    : JSON.stringify([{ name: result.foodName || 'Food', amount: '' }]);

                  // ✅ 创建饮食记录数据（符合后端API格式）
                  const dietData = {
                    foodName: result.foodName || 'Custom Food',
                    mealType: selectedMealType, // ✅ 使用用户选择的餐次
                    calories: result.calories || 0,
                    protein: result.protein || 0,
                    carbs: result.carbs || 0,
                    fat: result.fat || 0,
                    imageUrl: selectedImage || null,
                    notes: result.advice || null,
                  };

                  console.log('保存饮食记录:', dietData); // 调试日志

                  // ✅ 保存到后端数据库
                  const response = await saveDietRecord(userId, dietData);
                  
                  console.log('后端响应:', response); // 调试日志
                  
                  if (response.success) {
                    // ✅ 同时更新前端状态（用于即时显示）
                    const newMeal = {
                      id: response.data?.id || Date.now(),
                      name: dietData.foodName, // ✅ 添加 name 字段
                      meal: dietData.foodName,
                      mealType: selectedMealType, // ✅ 使用用户选择的餐次
                      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                      mealTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                      recordedAt: new Date().toISOString(), // ✅ 添加记录时间
                      calories: dietData.calories,
                      protein: dietData.protein,
                      carbs: dietData.carbs,
                      fat: dietData.fat,
                      ingredients: ingredientsJson, // ✅ 使用 AI 识别的食材
                      foods: dietData.foodName,
                      source: 'record', // ✅ 标记为用户记录，方便删除
                      isCustom: false, // ✅ 不是自定义，是 AI 识别的
                    };
                    
                    setDietPlan(prev => [...prev, newMeal]);

                    Alert.alert(
                      currentLanguage === 'zh' ? '成功' : 'Success',
                      currentLanguage === 'zh' ? '已添加到今日饮食计划并保存！' : 'Meal added and saved to your plan!',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            navigation.navigate('MainTabs', { screen: 'DietTab' });
                            setSelectedImage(null);
                            setSelectedMealType('Lunch'); // 重置餐次选择
                          }
                        }
                      ]
                    );
                  } else {
                    throw new Error(response.message || 'Failed to save');
                  }
                } catch (error) {
                  console.error('保存饮食记录失败:', error);
                  Alert.alert(
                    currentLanguage === 'zh' ? '保存失败' : 'Save Failed',
                    currentLanguage === 'zh' ? '无法保存饮食记录，请稍后重试' : 'Failed to save meal record. Please try again.',
                    [{ text: 'OK' }]
                  );
                }
              }}
            >
              <Text style={styles.addMealButtonText}>
                {currentLanguage === 'zh' ? '添加到今日饮食' : 'Add to Today\'s Meals'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addMealButton, { backgroundColor: '#2a2a2a', marginTop: 12 }]}
              onPress={() => {
                setSelectedImage(null);
              }}
            >
              <Text style={[styles.addMealButtonText, { color: '#fff' }]}>
                {currentLanguage === 'zh' ? '重新分析' : 'Analyze Again'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: '#a4ff3e',
    fontWeight: 'bold',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  foodInstructionCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  foodInstructionIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  foodInstructionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  foodInstructionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  foodCameraButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  foodCameraButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodCameraButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  foodCameraButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  foodImagePreviewContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    position: 'relative',
  },
  foodImagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 16,
  },
  foodRetakeButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  foodRetakeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  foodResultCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a4ff3e',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#444',
    marginBottom: 16,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  foodItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  foodItemCalories: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  adviceContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(164, 255, 62, 0.1)',
    borderRadius: 8,
  },
  adviceTitle: {
    color: '#a4ff3e',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  adviceText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  addMealButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  addMealButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  // ✅ 食材样式
  ingredientsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  ingredientsTitle: {
    color: '#a4ff3e',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ingredientsList: {
    marginLeft: 8,
  },
  ingredientItem: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
  },
  // ✅ 餐次选择样式
  mealTypeSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  mealTypeLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  mealTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mealTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mealTypeOptionSelected: {
    backgroundColor: 'rgba(164, 255, 62, 0.1)',
    borderColor: '#a4ff3e',
  },
  mealTypeOptionText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  mealTypeOptionTextSelected: {
    color: '#a4ff3e',
  },
});
