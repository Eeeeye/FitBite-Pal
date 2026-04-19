// AI服务 - 统一通过后端调用 AI
import apiClient from '../src/api/client';

/**
 * 将图像转换为base64
 * @param {string} uri - 图像URI
 * @returns {Promise<string>} base64字符串
 */
const convertImageToBase64 = async (uri) => {
  try {
    // 使用fetch读取本地文件
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.replace(/^data:image\/\w+;base64,/, '');
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * 姿态分析AI
 * 分析用户的运动姿态并提供反馈
 * @param {Object} exerciseInfo - 运动信息
 * @param {string} userDescription - 用户描述（例如："感觉腰部不适"）
 * @returns {Promise<string>} AI分析结果
 */
export const analyzePoseWithAI = async (exerciseInfo, userDescription = '') => {
  try {
    const prompt = `我正在做${exerciseInfo.name}训练。${userDescription ? `我感觉：${userDescription}。` : ''}请分析我的姿态是否正确，并给出改进建议。`;
    const response = await requestAdvice('fitness', prompt, JSON.stringify({
      exerciseName: exerciseInfo.name,
      duration: exerciseInfo.duration,
      userFeedback: userDescription,
    }));
    return response || '姿势正确！保持当前动作，注意呼吸节奏。';
  } catch (error) {
    console.error('Pose analysis error:', error);
    return '无法连接到AI服务。请检查网络连接或稍后重试。';
  }
};

/**
 * 饮食分析AI（支持图像识别）
 * 分析食物照片并提供营养建议
 * @param {string} imageUri - 食物图片URI
 * @param {Object} userProfile - 用户资料
 * @param {string} language - 语言 ('zh' 或 'en')
 * @returns {Promise<Object>} 食物营养信息和建议
 */
export const analyzeFoodWithAI = async (imageUri, userProfile = {}, language = 'zh', userId = null) => {
  try {
    const backendResult = await recognizeFoodViaBackend(imageUri, userProfile, language, userId);
    if (backendResult) {
      return backendResult;
    }
  } catch (error) {
    console.error('Food analysis error:', error);
  }

  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    foodName: language === 'zh' ? '未识别' : 'Unrecognized',
    ingredients: [],
    advice: language === 'zh' ? '无法连接到AI服务。请检查网络连接或稍后重试。' : 'Unable to connect to AI service. Please check your network connection and try again.',
  };
};

const recognizeFoodViaBackend = async (imageUri, userProfile, language, userId) => {
  try {
    const payload = {
      userId: userId || userProfile?.id || null,
    };

    if (!isRemoteImageUri(imageUri)) {
      const base64 = await convertImageToBase64(imageUri);
      payload.imageBase64 = base64;
    } else {
      payload.imageUrl = imageUri;
    }

    const response = await apiClient.post('/ai/food/recognize', payload);
    if (!response?.success || !response.data) {
      return null;
    }

    return mapBackendFoodRecognition(response.data, userProfile, language);
  } catch (error) {
    console.error('Backend food recognition error:', error);
    return null;
  }
};

const mapBackendFoodRecognition = (data, userProfile, language) => {
  const foods = Array.isArray(data.foods) ? data.foods : [];
  const totalNutrition = data.totalNutrition || {};
  const primaryFood = foods[0] || {};
  const primaryNutrition = primaryFood.nutrition || {};

  const ingredients = foods.map((food) => ({
    name: food.name,
    amount: food.estimatedWeight ? `${Math.round(food.estimatedWeight)}g` : '',
  }));

  const calories = Math.round(totalNutrition.calories ?? primaryNutrition.calories ?? 0);
  const protein = Math.round(totalNutrition.protein ?? primaryNutrition.protein ?? 0);
  const carbs = Math.round(totalNutrition.carbs ?? primaryNutrition.carbs ?? 0);
  const fat = Math.round(totalNutrition.fat ?? primaryNutrition.fat ?? 0);

  return {
    calories,
    protein,
    carbs,
    fat,
    foodName: foods.map((food) => food.name).filter(Boolean).slice(0, 2).join(' + ')
      || primaryFood.name
      || (language === 'zh' ? '已识别食物' : 'Recognized Food'),
    ingredients,
    advice: buildBackendFoodAdvice({ calories, protein, carbs, fat }, userProfile, language),
  };
};

const buildBackendFoodAdvice = (nutrition, userProfile, language) => {
  const goal = userProfile?.goal || (language === 'zh' ? '保持健康' : 'keep fit');

  if (language === 'zh') {
    return `已完成识别。该餐约 ${nutrition.calories} kcal，蛋白质 ${nutrition.protein}g，碳水 ${nutrition.carbs}g，脂肪 ${nutrition.fat}g。请结合你的目标“${goal}”安排全天摄入。`;
  }

  return `Recognition completed. This meal is about ${nutrition.calories} kcal with ${nutrition.protein}g protein, ${nutrition.carbs}g carbs, and ${nutrition.fat}g fat. Adjust the rest of your day based on your goal "${goal}".`;
};

const isRemoteImageUri = (uri) => /^https?:\/\//i.test(uri) || uri.startsWith('data:image');

/**
 * 分析训练姿态图片
 * @param {string} imageUri - 姿态图片URI
 * @param {Object} exerciseInfo - 训练信息
 * @returns {Promise<Object>} 姿态分析结果
 */
export const analyzePoseImageWithAI = async (imageUri, exerciseInfo) => {
  try {
    const prompt = `这是一个正在做${exerciseInfo.name}训练的照片。请分析这个动作的姿势是否标准，并提供具体的改进建议。重点关注：
1. 身体姿势是否正确
2. 关节角度是否合适
3. 可能存在的错误
4. 如何改进

请用简洁专业的语言回答。`;
    const response = await requestChat(prompt, imageUri, 'zh');
    
    return {
      feedback: response,
      isCorrect: response.includes('正确') || response.includes('标准') || response.includes('good'),
      suggestions: extractSuggestions(response),
    };
  } catch (error) {
    console.error('Pose analysis error:', error);
    return {
      feedback: '无法分析姿态。请确保照片清晰，并重试。',
      isCorrect: null,
      suggestions: [],
    };
  }
};

/**
 * 训练计划咨询AI
 * 根据用户情况提供训练建议
 * @param {Object} userProfile - 用户资料
 * @param {string} question - 用户问题
 * @returns {Promise<string>} AI建议
 */
export const getTrainingAdviceFromAI = async (userProfile, question = '') => {
  try {
    const prompt = `我的资料：年龄${userProfile.age}岁，身高${userProfile.height}cm，体重${userProfile.weight}kg，目标是${userProfile.goal}。${question ? `我的问题是：${question}` : '请给我训练建议。'}`;
    const context = {
      age: userProfile.age,
      height: userProfile.height,
      weight: userProfile.weight,
      goal: userProfile.goal,
      bmi: userProfile.bmi,
      question,
    };

    const response = await requestAdvice('fitness', prompt, JSON.stringify(context));
    return response || '保持规律训练，循序渐进，注意休息和营养补充。';
  } catch (error) {
    console.error('Training advice error:', error);
    return '无法连接到AI服务。请检查网络连接或稍后重试。';
  }
};

/**
 * 饮食计划咨询AI
 * 根据用户情况提供饮食建议
 * @param {Object} userProfile - 用户资料
 * @param {string} question - 用户问题
 * @returns {Promise<string>} AI建议
 */
export const getDietAdviceFromAI = async (userProfile, question = '') => {
  try {
    const prompt = `我的目标每日热量是${userProfile.targetCalories}卡路里，目标是${userProfile.goal}。${question ? `我的问题是：${question}` : '请给我饮食建议。'}`;
    const context = {
      targetCalories: userProfile.targetCalories,
      goal: userProfile.goal,
      recommendedProtein: userProfile.recommendedProtein,
      recommendedCarbs: userProfile.recommendedCarbs,
      recommendedFat: userProfile.recommendedFat,
      question,
    };

    const response = await requestAdvice('nutrition', prompt, JSON.stringify(context));
    return response || '保持均衡饮食，摄入足够的蛋白质、碳水和健康脂肪。';
  } catch (error) {
    console.error('Diet advice error:', error);
    return '无法连接到AI服务。请检查网络连接或稍后重试。';
  }
};

/**
 * 通用AI对话
 * 用于与AI进行通用对话，支持文本和图像
 * @param {string} message - 用户消息
 * @param {string} imageUri - 可选的图像URI
 * @returns {Promise<string>} AI回复
 */
export const chatWithAI = async (message, imageUri = null) => {
  try {
    if (!imageUri && !message) {
      return '请输入消息或选择图片。';
    }

    const response = await requestChat(message, imageUri, 'zh');
    return response || '抱歉，我现在无法回答这个问题。';
  } catch (error) {
    console.error('Chat error:', error);
    return '无法连接到AI服务。请检查网络连接或稍后重试。';
  }
};

/**
 * 从AI响应中提取建议
 * @param {string} aiResponse - AI响应文本
 * @returns {Array<string>} 建议列表
 */
const extractSuggestions = (aiResponse) => {
  try {
    const suggestions = [];
    
    // 匹配编号的建议
    const numberedMatches = aiResponse.match(/\d+[\.、]\s*([^\n]+)/g);
    if (numberedMatches) {
      numberedMatches.forEach(match => {
        const suggestion = match.replace(/\d+[\.、]\s*/, '').trim();
        if (suggestion) suggestions.push(suggestion);
      });
    }
    
    // 如果没有编号建议，按行分割
    if (suggestions.length === 0) {
      const lines = aiResponse.split('\n').filter(line => line.trim().length > 10);
      return lines.slice(0, 5); // 最多返回5条建议
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error extracting suggestions:', error);
    return [];
  }
};

/**
 * 配置AI API
 * @param {Object} config - 配置对象
 */
export const configureAI = (config) => {
  console.log('AI configuration is handled by the backend service.', config);
};

const requestAdvice = async (questionType, question, context = '') => {
  const response = await apiClient.post('/ai/advice', {
    questionType,
    question,
    context,
  });

  if (!response?.success || !response?.data?.advice) {
    throw new Error(response?.message || 'Failed to get AI advice');
  }

  return response.data.advice;
};

const requestChat = async (message, imageUri = null, language = 'zh') => {
  const payload = {
    message,
    language,
  };

  if (imageUri) {
    if (isRemoteImageUri(imageUri)) {
      payload.imageUrl = imageUri;
    } else {
      const base64 = await convertImageToBase64(imageUri);
      payload.imageBase64 = base64;
    }
  }

  const response = await apiClient.post('/ai/chat', payload);
  if (!response?.success || !response?.data) {
    throw new Error(response?.message || 'Failed to get AI chat response');
  }

  return response.data;
};
