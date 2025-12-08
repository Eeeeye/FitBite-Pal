// AI服务 - 文本和图像AI API集成
import { Alert } from 'react-native';

/**
 * AI API配置
 * ModelScope Qwen3-VL-8B-Instruct 图像识别模型
 */
const AI_API_CONFIG = {
  baseUrl: 'https://api-inference.modelscope.cn/v1/chat/completions',
  apiKey: 'ms-de60e4e6-886e-4c3f-bcbb-b5c2f30c2b16', // ModelScope Token
  model: 'Qwen/Qwen3-VL-8B-Instruct',
  timeout: 60000, // 60秒超时（图像分析可能较慢）
};

/**
 * 发送文本AI请求
 * @param {string} prompt - 提示文本
 * @param {Object} context - 上下文信息
 * @returns {Promise<string>} AI响应文本
 */
const sendTextAIRequest = async (prompt, context = {}) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_API_CONFIG.timeout);

    const response = await fetch(AI_API_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: AI_API_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('Text AI request error:', error);
    throw error;
  }
};

/**
 * 发送图像AI请求（支持图像识别）
 * @param {string} prompt - 提示文本
 * @param {string} imageUri - 图像URI（本地或网络）
 * @returns {Promise<string>} AI响应文本
 */
const sendImageAIRequest = async (prompt, imageUri) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_API_CONFIG.timeout);

    // 将本地图像转换为base64（如果是本地URI）
    let imageUrl = imageUri;
    if (imageUri.startsWith('file://')) {
      // 对于本地文件，我们需要使用base64编码
      // 注意：React Native中需要使用特定的方法来读取文件
      const base64 = await convertImageToBase64(imageUri);
      imageUrl = `data:image/jpeg;base64,${base64}`;
    }

    const response = await fetch(AI_API_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: AI_API_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('Image AI request error:', error);
    throw error;
  }
};

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
    
    const context = {
      exerciseName: exerciseInfo.name,
      duration: exerciseInfo.duration,
      userFeedback: userDescription,
    };

    const response = await sendTextAIRequest(prompt, context);
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
export const analyzeFoodWithAI = async (imageUri, userProfile = {}, language = 'zh') => {
  try {
    // 根据语言生成不同的prompt - 增加食材信息要求
    const prompt = language === 'zh' 
      ? `请分析这张食物照片，识别出食物的种类，并估算其营养成分。请严格按以下格式返回（数值请直接给出数字，不要加"约"字）：
食物名称：[食物名称]
热量：[数值]千卡
蛋白质：[数值]克
碳水化合物：[数值]克
脂肪：[数值]克
主要食材：[食材1(份量), 食材2(份量), 食材3(份量)]
建议：[根据用户目标"${userProfile.goal || '保持健康'}"且每日总热量目标为${userProfile.targetCalories || 2000}千卡，给出饮食建议]`
      : `Please analyze this food photo, identify the type of food, and estimate its nutritional content. Return in the following format (use exact numbers, no approximations):
Food name: [food name]
Calories: [value] kcal
Protein: [value] g
Carbohydrates: [value] g
Fat: [value] g
Main ingredients: [ingredient1(amount), ingredient2(amount), ingredient3(amount)]
Advice: [Based on user goal "${userProfile.goal || 'Keep fit'}" and target calories ${userProfile.targetCalories || 2000} kcal, provide dietary advice]`;

    const response = await sendImageAIRequest(prompt, imageUri);
    
    console.log('AI Response:', response); // 调试日志
    
    // 解析AI响应中的营养信息
    const nutritionInfo = parseFoodNutrition(response);
    
    // 提取食材信息
    const ingredients = extractIngredients(response);
    
    return {
      ...nutritionInfo,
      advice: response,
      foodName: extractFoodName(response),
      ingredients: ingredients,
    };
  } catch (error) {
    console.error('Food analysis error:', error);
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      foodName: language === 'zh' ? '未识别' : 'Unrecognized',
      ingredients: [],
      advice: language === 'zh' ? '无法连接到AI服务。请检查网络连接或稍后重试。' : 'Unable to connect to AI service. Please check your network connection and try again.',
    };
  }
};

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

    const response = await sendImageAIRequest(prompt, imageUri);
    
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

    const response = await sendTextAIRequest(prompt, context);
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

    const response = await sendTextAIRequest(prompt, context);
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
    let response;
    
    if (imageUri) {
      // 如果有图像，使用图像AI请求
      const prompt = message || '请描述这张图片，并提供相关的健身或饮食建议。';
      response = await sendImageAIRequest(prompt, imageUri);
    } else if (message) {
      // 如果只有文本，使用文本AI请求
      const prompt = `作为一个健身和营养AI助手，请回答：${message}`;
      response = await sendTextAIRequest(prompt);
    } else {
      return '请输入消息或选择图片。';
    }

    return response || '抱歉，我现在无法回答这个问题。';
  } catch (error) {
    console.error('Chat error:', error);
    return '无法连接到AI服务。请检查网络连接或稍后重试。';
  }
};

/**
 * 从AI响应中解析食物营养信息
 * @param {string} aiResponse - AI响应文本
 * @returns {Object} 营养信息对象
 */
const parseFoodNutrition = (aiResponse) => {
  const nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  try {
    // ✅ 支持多种格式：
    // - 热量：520 (无单位)
    // - 热量：520千卡
    // - 热量：约 520 千卡
    // - Calories: 520 kcal
    
    // 热量匹配 - 支持无单位格式
    const caloriesMatch = aiResponse.match(/(?:热量|Calories)[：:]\s*约?\s*(\d+(?:\.\d+)?)\s*(?:千卡|kcal|cal|大卡)?/i);
    
    // 蛋白质匹配 - 支持无单位格式
    const proteinMatch = aiResponse.match(/(?:蛋白质|Protein)[：:]\s*约?\s*(\d+(?:\.\d+)?)\s*(?:克|g)?/i);
    
    // 碳水匹配 - 支持无单位格式
    const carbsMatch = aiResponse.match(/(?:碳水[化合物]*|Carbohydrates?|Carbs)[：:]\s*约?\s*(\d+(?:\.\d+)?)\s*(?:克|g)?/i);
    
    // 脂肪匹配 - 支持无单位格式
    const fatMatch = aiResponse.match(/(?:脂肪|Fat)[：:]\s*约?\s*(\d+(?:\.\d+)?)\s*(?:克|g)?/i);

    if (caloriesMatch) nutrition.calories = Math.round(parseFloat(caloriesMatch[1]));
    if (proteinMatch) nutrition.protein = Math.round(parseFloat(proteinMatch[1]));
    if (carbsMatch) nutrition.carbs = Math.round(parseFloat(carbsMatch[1]));
    if (fatMatch) nutrition.fat = Math.round(parseFloat(fatMatch[1]));
    
    console.log('AI Response text:', aiResponse.substring(0, 500)); // 调试：显示AI响应前500字符
    console.log('Parsed nutrition:', nutrition); // 调试日志
  } catch (error) {
    console.error('Error parsing nutrition:', error);
  }

  return nutrition;
};

/**
 * 从AI响应中提取食材信息
 * @param {string} aiResponse - AI响应文本
 * @returns {Array} 食材列表
 */
const extractIngredients = (aiResponse) => {
  const ingredients = [];
  
  try {
    // 匹配"主要食材"或"Main ingredients"后面的内容
    const ingredientsMatch = aiResponse.match(/(?:主要食材|Main ingredients)[：:]\s*([^\n]+)/i);
    
    if (ingredientsMatch) {
      const ingredientStr = ingredientsMatch[1].trim();
      // 按逗号、顿号分割
      const items = ingredientStr.split(/[,，、]/);
      
      items.forEach(item => {
        const trimmed = item.trim();
        if (trimmed) {
          // 尝试提取名称和份量，如 "鸡胸肉(150g)" 或 "鸡胸肉 150g"
          const match = trimmed.match(/^([^(\d]+)[\s(]*(\d+\s*[gG克]?)?/);
          if (match) {
            ingredients.push({
              name: match[1].trim(),
              amount: match[2] ? match[2].trim() : '',
            });
          } else {
            ingredients.push({ name: trimmed, amount: '' });
          }
        }
      });
    }
    
    console.log('Extracted ingredients:', ingredients); // 调试日志
  } catch (error) {
    console.error('Error extracting ingredients:', error);
  }
  
  return ingredients;
};

/**
 * 从AI响应中提取食物名称
 * @param {string} aiResponse - AI响应文本
 * @returns {string} 食物名称
 */
const extractFoodName = (aiResponse) => {
  try {
    // 支持中英文格式
    const nameMatch = aiResponse.match(/(?:食物名称|Food name)[：:]\s*([^\n]+)/i);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    
    // 如果没有明确的食物名称标记，尝试从第一行提取
    const firstLine = aiResponse.split('\n')[0];
    if (firstLine.length < 50) {
      return firstLine.trim();
    }
  } catch (error) {
    console.error('Error extracting food name:', error);
  }
  
  return '识别的食物';
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
  if (config.baseUrl) AI_API_CONFIG.baseUrl = config.baseUrl;
  if (config.apiKey) AI_API_CONFIG.apiKey = config.apiKey;
  if (config.timeout) AI_API_CONFIG.timeout = config.timeout;
};

