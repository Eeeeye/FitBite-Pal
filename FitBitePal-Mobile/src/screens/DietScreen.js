import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth, useUserProfile, useData, useAppState } from '../contexts';
import { t } from '../../services/i18n';
import { deleteDietRecord, saveDietRecord } from '../api/user';
import { 
  translateFoodName as translateFoodNameUtil, 
  translateIngredient as translateIngredientUtil 
} from '../utils/foodTranslations';

export const DietScreen = ({ navigation }) => {
  const { userId } = useAuth();
  const { dietPlan, setDietPlan, loadDietPlan } = useUserProfile();
  const { 
    completedMeals,
    setCompletedMeals,
    saveCompletion,
    loadCalorieRecords,
  } = useData();
  const { currentLanguage } = useAppState();
  
  // ✅ 选择的日期（默认为今天）
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // ✅ 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false);
  
  // ✅ 手动添加食物状态
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [newFood, setNewFood] = useState({
    name: '',
    mealType: 'Lunch',
    ingredients: '',
    calories: '',
  });

  // ✨ 进入饮食页面时加载饮食计划（与App1.js一致）
  // 关键：只在dietPlan为空时加载一次，不随日期变化刷新
  // 后端会返回当天+未来3天的计划（共4天）
  useEffect(() => {
    if (userId && dietPlan.length === 0) {

      loadDietPlan();
    }
  }, [userId]);
  // 注意：不监听selectedDate，避免重复加载

  const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ✅ 使用统一翻译工具（支持中英文双向翻译）
  const translateFoodName = (name) => {
    return translateFoodNameUtil(name, currentLanguage);
  };

  const translateIngredient = (name) => {
    return translateIngredientUtil(name, currentLanguage);
  };

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

  // ✅ 手动添加食物
  const handleAddFood = async () => {
    if (!newFood.name.trim()) {
      Alert.alert(
        currentLanguage === 'zh' ? '提示' : 'Notice',
        currentLanguage === 'zh' ? '请输入食物名称' : 'Please enter food name'
      );
      return;
    }

    try {
      const today = getDateKey(new Date());
      const dietData = {
        foodName: newFood.name.trim(),  // ✅ 后端使用 foodName 字段
        mealType: newFood.mealType,
        calories: parseInt(newFood.calories) || 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        notes: newFood.ingredients.trim(),  // 食材放在 notes 字段
        imageUrl: null,
      };

      // 保存到后端
      const response = await saveDietRecord(userId, dietData);
      
      if (response.success) {
        // ✅ 添加到本地饮食计划列表（确保所有字段完整）
        const newMealId = response.data?.id || `local-${Date.now()}`;
        const newMeal = {
          id: newMealId,
          name: newFood.name.trim(), // ✅ 添加 name 字段
          meal: newFood.name.trim(), // ✅ 添加 meal 字段
          foods: newFood.name.trim(),
          foodName: newFood.name.trim(), // ✅ 添加 foodName 字段
          mealType: newFood.mealType,
          mealTime: newFood.mealType,
          ingredients: newFood.ingredients.trim(),
          calories: parseInt(newFood.calories) || 0,
          recordedAt: new Date().toISOString(), // ✅ 添加记录时间
          source: 'record', // ✅ 标记来源
          isCustom: true,
        };
        
        console.log('添加新食物:', newMeal); // 调试日志
        setDietPlan(prev => [...prev, newMeal]);
        
        // 重置表单并关闭弹窗
        setNewFood({
          name: '',
          mealType: 'Lunch',
          ingredients: '',
          calories: '',
        });
        setShowAddFoodModal(false);
        
        Alert.alert(
          currentLanguage === 'zh' ? '成功' : 'Success',
          currentLanguage === 'zh' ? '食物已添加' : 'Food added successfully'
        );
      }
    } catch (error) {
      console.error('添加食物失败:', error);
      Alert.alert(
        currentLanguage === 'zh' ? '添加失败' : 'Failed',
        error.message || (currentLanguage === 'zh' ? '请稍后重试' : 'Please try again')
      );
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

        {/* Today's Plan Header */}
        <View style={styles.todayPlanCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {currentLanguage === 'zh' ? '今日计划' : "Today's plan"}
            </Text>
            <TouchableOpacity 
              style={[styles.adjustButton, isEditMode && styles.adjustButtonActive]}
              onPress={() => setIsEditMode(!isEditMode)}
            >
              <Image
                source={require('../../assets/images/a4073118235180a9ab71a76225f32491.png')}
                style={styles.adjustIcon}
                resizeMode="contain"
              />
              <Text style={[styles.adjustText, isEditMode && styles.adjustTextActive]}>
                {isEditMode 
                  ? (currentLanguage === 'zh' ? '完成' : 'Done')
                  : (currentLanguage === 'zh' ? '编辑' : 'Edit')
                }
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
        </View>

        {/* Meal Cards */}
        <View style={styles.mealSection}>
          {dietPlan.length > 0 ? dietPlan
            // ✨ 关键：根据选择的日期过滤饮食计划
            .filter(item => {
              const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
              
              // 系统生成的饮食计划使用 planDate
              if (item.planDate) {
              return item.planDate === selectedDateStr;
              }
              
              // 用户添加的饮食记录使用 recordedAt
              if (item.recordedAt) {
                const recordDate = new Date(item.recordedAt);
                const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
                return recordDateStr === selectedDateStr;
              }
              
              // 兼容旧数据
              return true;
            })
            .map((mealItem, index) => {
            const dateKey = getDateKey(new Date());
            const isCompleted = completedMeals[dateKey]?.[index] || false;
            
            let ingredientsList = [];
            try {
              if (mealItem.ingredients) {
                if (typeof mealItem.ingredients === 'string') {
                  // 尝试解析为 JSON
                  const trimmed = mealItem.ingredients.trim();
                  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                    ingredientsList = JSON.parse(mealItem.ingredients);
                  } else {
                    // 如果不是 JSON 格式，将其作为单个食材
                    ingredientsList = [{ name: mealItem.ingredients, amount: '' }];
                  }
                } else if (Array.isArray(mealItem.ingredients)) {
                  ingredientsList = mealItem.ingredients;
                }
              }
            } catch (e) {
              // 解析失败时，将原始文本作为食材名称
              ingredientsList = [{ name: mealItem.ingredients || '', amount: '' }];
            }
            
            return (
              <View key={index} style={styles.newMealCard}>
                {/* 餐次标签 */}
                <View style={styles.newMealBadge}>
                  <Text style={styles.newMealBadgeText}>
                    {/* ✅ 优先显示用户选择的餐次，即使是自定义添加的食物 */}
                    {mealItem.mealType ? (
                      // 有餐次信息时，翻译并显示
                      currentLanguage === 'zh' ? (
                        mealItem.mealType === 'Breakfast' ? '早餐' :
                        mealItem.mealType === 'Lunch' ? '午餐' :
                        mealItem.mealType === 'Dinner' ? '晚餐' :
                        mealItem.mealType === 'Snack' ? '零食' :
                        mealItem.mealType
                      ) : mealItem.mealType
                    ) : (
                      // 没有餐次信息时，根据索引推断或显示自定义
                      mealItem.isCustom ? 
                        (currentLanguage === 'zh' ? '自定义' : 'Custom') :
                        translateFoodName(index === 0 ? 'Breakfast' : index === 1 ? 'Lunch' : 'Dinner')
                    )}
                  </Text>
                </View>
                
                {/* ✅ 编辑模式：显示删除按钮 */}
                {isEditMode && (
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => {
                      // ✅ 保存当前要删除的 item 的引用（闭包）
                      const itemToDelete = mealItem;
                      const itemId = itemToDelete.id;
                      
                      console.log('准备删除:', { id: itemId, item: itemToDelete }); // 调试
                      
                      Alert.alert(
                        currentLanguage === 'zh' ? '确认删除' : 'Confirm Delete',
                        currentLanguage === 'zh' ? '确定要删除这个食物吗？' : 'Are you sure you want to delete this meal?',
                        [
                          { text: currentLanguage === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
                          {
                            text: currentLanguage === 'zh' ? '删除' : 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                // ✅ 只要有 ID 就尝试删除后端记录
                                if (itemId) {
                                  let recordId = itemId.toString();
                                  if (recordId.startsWith('record-')) {
                                    recordId = recordId.replace('record-', '');
                                  }
                                  if (/^\d+$/.test(recordId)) {
                                    try {
                                      await deleteDietRecord(recordId);
                                      console.log('后端删除成功:', recordId);
                                    } catch (apiError) {
                                      console.log('后端删除失败:', apiError.message);
                                    }
                                  }
                                }
                                
                                // ✅ 修复：使用 ID 字符串比较删除
                                setDietPlan(prev => {
                                  const newList = prev.filter(item => {
                                    // 优先使用 ID 比较（转为字符串避免类型问题）
                                    if (itemId != null && item.id != null) {
                                      const match = String(item.id) === String(itemId);
                                      if (match) console.log('找到匹配项，删除:', item.id);
                                      return !match;
                                    }
                                    // 没有 ID 时，使用所有可能的字段匹配
                                    const isSame = (
                                      (item.foods === itemToDelete.foods || 
                                       item.name === itemToDelete.name ||
                                       item.meal === itemToDelete.meal ||
                                       item.foodName === itemToDelete.foodName) &&
                                      item.mealType === itemToDelete.mealType &&
                                      item.calories === itemToDelete.calories
                                    );
                                    return !isSame;
                                  });
                                  console.log('删除前数量:', prev.length, '删除后数量:', newList.length);
                                  return newList;
                                });
                                
                                Alert.alert(
                                  currentLanguage === 'zh' ? '成功' : 'Success',
                                  currentLanguage === 'zh' ? '已删除' : 'Deleted successfully'
                                );
                              } catch (error) {
                                console.error('删除失败:', error);
                                // 即使出错也从前端删除
                                setDietPlan(prev => prev.filter(item => 
                                  String(item.id) !== String(itemId)
                                ));
                                Alert.alert(
                                  currentLanguage === 'zh' ? '已删除' : 'Deleted',
                                  currentLanguage === 'zh' ? '已从列表中移除' : 'Removed from list'
                                );
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
                
                {/* 内容区域 */}
                <View style={styles.newMealContent}>
                  <Text style={styles.newMealTitle}>
                    {/* 用户添加的食物直接显示原名，系统推荐的食物翻译 */}
                    {(mealItem.isCustom || mealItem.source === 'record')
                      ? (mealItem.name || mealItem.foodName || mealItem.mealName || mealItem.meal || mealItem.foods || 
                         (currentLanguage === 'zh' ? '自定义食物' : 'Custom Food'))
                      : (currentLanguage === 'zh'
                          ? (mealItem.name || mealItem.mealName || translateFoodName(mealItem.nameEn || mealItem.meal || 'Meal'))
                          : (mealItem.nameEn || translateFoodName(mealItem.name || mealItem.mealName || mealItem.meal || 'Meal'))
                        )
                    }
                  </Text>
                  
                  {ingredientsList.length > 0 ? (
                    ingredientsList.map((ingredient, idx) => (
                      <Text key={idx} style={styles.newIngredientText}>
                        {/* ✅ 优先使用后端返回的双语字段 */}
                        {currentLanguage === 'zh'
                          ? (ingredient.name || translateIngredient(ingredient.nameEn || ingredient.name))
                          : (ingredient.nameEn || translateIngredient(ingredient.name))
                        } ({ingredient.amount})
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.newIngredientText}>
                      {currentLanguage === 'zh' ? '暂无食材信息' : 'No ingredients'}
                    </Text>
                  )}
                </View>
                
                {/* 底部操作栏 */}
                <View style={styles.newMealFooter}>
                  <Text style={styles.newMealCalories}>{mealItem.calories || 0}kcal</Text>
                  <TouchableOpacity 
                    style={styles.newMealCheckButton}
                    onPress={async () => {
                      const newCompletedState = !(completedMeals[dateKey]?.[index]);
                      
                      setCompletedMeals(prev => ({
                        ...prev,
                        [dateKey]: {
                          ...(prev[dateKey] || {}),
                          [index]: newCompletedState
                        }
                      }));
                      
                      const calories = (mealItem.calories && mealItem.calories > 0) ? mealItem.calories : 300;
                      await saveCompletionStatus(
                        new Date(),
                        'meal', 
                        index, 
                        newCompletedState,
                        mealItem.time || mealItem.mealTime || `餐次${index}`,
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
                      style={styles.newMealCheckIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }) : (
            <Text style={styles.emptyText}>No diet plan yet. Complete onboarding to get started!</Text>
          )}
          
          {/* ✅ 编辑模式：添加食物按钮 */}
          {isEditMode && (
            <TouchableOpacity
              style={styles.addFoodButton}
              onPress={() => setShowAddFoodModal(true)}
            >
              <Text style={styles.addFoodButtonIcon}>+</Text>
              <Text style={styles.addFoodButtonText}>
                {currentLanguage === 'zh' ? '添加食物' : 'Add Food'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* AI Diet Companion & Camera */}
        <View style={styles.dietActions}>
          <TouchableOpacity style={styles.aiDietButton} onPress={() => navigation.navigate('Chat')}>
            <Image
              source={require('../../assets/images/e026f42738076aa451f39345cc3c931c.png')}
              style={styles.aiIcon}
              resizeMode="contain"
            />
            <Text style={styles.aiDietText}>
              {currentLanguage === 'zh' ? 'AI饮食助手' : 'AI Diet Companion'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cameraButton}
            onPress={() => navigation.navigate('FoodRecognition')}
          >
            <Image
              source={require('../../assets/images/a18c4c98aa9fde934d8ce9ca5a81003a.png')}
              style={styles.cameraIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ✅ 手动添加食物弹窗 */}
      <Modal
        visible={showAddFoodModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddFoodModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentLanguage === 'zh' ? '添加食物' : 'Add Food'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddFoodModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 餐次选择 */}
            <Text style={styles.inputLabel}>
              {currentLanguage === 'zh' ? '餐次' : 'Meal Type'}
            </Text>
            <View style={styles.mealTypeContainer}>
              {[
                { en: 'Breakfast', zh: '早餐' },
                { en: 'Lunch', zh: '午餐' },
                { en: 'Dinner', zh: '晚餐' },
                { en: 'Snack', zh: '零食' },
              ].map((meal) => (
                <TouchableOpacity
                  key={meal.en}
                  style={[
                    styles.mealTypeOption,
                    newFood.mealType === meal.en && styles.mealTypeOptionSelected
                  ]}
                  onPress={() => setNewFood(prev => ({ ...prev, mealType: meal.en }))}
                >
                  <Text style={[
                    styles.mealTypeText,
                    newFood.mealType === meal.en && styles.mealTypeTextSelected
                  ]}>
                    {currentLanguage === 'zh' ? meal.zh : meal.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 食物名称 */}
            <Text style={styles.inputLabel}>
              {currentLanguage === 'zh' ? '食物名称' : 'Food Name'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={currentLanguage === 'zh' ? '例如：烤鸡胸沙拉' : 'e.g., Grilled Chicken Salad'}
              placeholderTextColor="#666"
              value={newFood.name}
              onChangeText={(text) => setNewFood(prev => ({ ...prev, name: text }))}
            />

            {/* 食材/配料 */}
            <Text style={styles.inputLabel}>
              {currentLanguage === 'zh' ? '食材/配料' : 'Ingredients'}
            </Text>
            <TextInput
              style={[styles.modalInput, styles.multilineInput]}
              placeholder={currentLanguage === 'zh' ? '例如：鸡胸肉 150g, 生菜 100g' : 'e.g., Chicken 150g, Lettuce 100g'}
              placeholderTextColor="#666"
              value={newFood.ingredients}
              onChangeText={(text) => setNewFood(prev => ({ ...prev, ingredients: text }))}
              multiline={true}
              numberOfLines={3}
            />

            {/* 卡路里 */}
            <Text style={styles.inputLabel}>
              {currentLanguage === 'zh' ? '卡路里 (可选)' : 'Calories (optional)'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={currentLanguage === 'zh' ? '例如：350' : 'e.g., 350'}
              placeholderTextColor="#666"
              value={newFood.calories}
              onChangeText={(text) => setNewFood(prev => ({ ...prev, calories: text.replace(/[^0-9]/g, '') }))}
              keyboardType="numeric"
            />

            {/* 保存按钮 */}
            <TouchableOpacity style={styles.saveButton} onPress={handleAddFood}>
              <Text style={styles.saveButtonText}>
                {currentLanguage === 'zh' ? '保存' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  adjustButtonActive: {
    backgroundColor: '#a4ff3e',
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
  adjustTextActive: {
    color: '#000',
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#ff4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  addFoodButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 20, // ✅ 增加底部间距
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFoodButtonIcon: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
    marginRight: 8,
  },
  addFoodButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 12,
  },
  mealSection: {
    paddingHorizontal: 20,
  },
  newMealCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#444',
    position: 'relative',
  },
  newMealBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#a4ff3e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  newMealBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  newMealContent: {
    marginTop: 32,
    marginBottom: 40,
  },
  newMealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  newIngredientText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  newMealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  newMealCalories: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  newMealCheckButton: {
    padding: 4,
  },
  newMealCheckIcon: {
    width: 28,
    height: 28,
  },
  dietActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  aiDietButton: {
    flex: 1,
    backgroundColor: '#a4ff3e',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  aiDietText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  cameraButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 16,
    padding: 16,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    width: 32,
    height: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  // ✅ 手动添加食物弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#999',
    padding: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#444',
  },
  mealTypeOptionSelected: {
    backgroundColor: 'rgba(164, 255, 62, 0.15)',
    borderColor: '#a4ff3e',
  },
  mealTypeText: {
    fontSize: 14,
    color: '#999',
  },
  mealTypeTextSelected: {
    color: '#a4ff3e',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
