/**
 * 食物名称翻译工具
 * 支持中英文双向翻译
 */

// 食物/菜名翻译表（英文 -> 中文）
export const FOOD_NAME_EN_TO_ZH = {
  // 餐次
  'Breakfast': '早餐',
  'Lunch': '午餐',
  'Dinner': '晚餐',
  'Snack': '零食',
  'Custom': '自定义',
  'Meal': '餐食',
  
  // 西式餐食
  'Oatmeal Bowl': '燕麦碗',
  'Grilled Chicken Breast Salad': '烤鸡胸沙拉',
  'Salmon with Vegetables': '三文鱼配蔬菜',
  'Quinoa Bowl': '藜麦碗',
  'Turkey Wrap': '火鸡卷',
  'Greek Yogurt Parfait': '希腊酸奶帕菲',
  'Oatmeal with Berries': '浆果燕麦粥',
  'Oatmeal with Fruits': '燕麦粥配水果',
  'Egg White Omelet': '蛋白煎蛋卷',
  'Protein Smoothie': '蛋白质奶昔',
  'Tuna Salad': '金枪鱼沙拉',
  'Chicken Stir Fry': '鸡肉炒菜',
  'Beef and Broccoli': '西兰花牛肉',
  'Beef with Broccoli': '牛肉炒西兰花',
  'Veggie Burger': '蔬菜汉堡',
  'Shrimp Pasta': '虾仁意面',
  'Tofu Scramble': '炒豆腐',
  'Fish Tacos': '鱼肉塔可',
  'Chicken Caesar Salad': '凯撒鸡肉沙拉',
  'Brown Rice Bowl': '糙米碗',
  'Sweet Potato Bowl': '红薯碗',
  'Grilled Fish': '烤鱼',
  'Lean Beef': '瘦牛肉',
  'Egg Breakfast': '鸡蛋早餐',
  'Protein Pancakes': '蛋白质煎饼',
  'Avocado Toast': '牛油果吐司',
  'Chicken Breast Salad': '鸡胸肉沙拉',
  'Vegetable Sandwich': '蔬菜三明治',
  'Fruit Salad': '水果沙拉',
  'Yogurt Oatmeal Cup': '酸奶燕麦杯',
  'Whole Wheat Bread with Milk': '全麦面包配牛奶',
  
  // 中式餐食 - 英文名
  'Millet Porridge with Salted Duck Egg': '小米粥配咸鸭蛋',
  'Steamed Fish with Brown Rice': '清蒸鱼配糙米饭',
  'Stir-fried Vegetables with Tofu': '清炒时蔬配豆腐',
  'Tomato Scrambled Eggs': '番茄炒蛋',
  'Shredded Pork with Green Pepper': '青椒肉丝',
  'Kung Pao Chicken': '宫保鸡丁',
  'Mapo Tofu': '麻婆豆腐',
  'Braised Pork Belly': '红烧肉',
  'Sweet and Sour Ribs': '糖醋排骨',
  'Garlic Broccoli': '蒜蓉西兰花',
  'Stir-fried Bok Choy': '清炒小白菜',
  'Steamed Egg Custard': '蒸蛋羹',
  'Seaweed Egg Drop Soup': '紫菜蛋花汤',
  'Corn and Pork Rib Soup': '玉米排骨汤',
  'Plain Porridge with Side Dishes': '白粥配小菜',
  'Egg-filled Pancake': '鸡蛋灌饼',
  'Soy Milk with Fried Dough': '豆浆油条',
  'Shrimp with Scrambled Eggs': '虾仁炒蛋',
};

// 食材翻译表（英文 -> 中文）
export const INGREDIENT_EN_TO_ZH = {
  // 主食
  'Oatmeal': '燕麦',
  'Millet': '小米',
  'Brown Rice': '糙米饭',
  'Brown rice': '糙米',
  'White Rice': '白米饭',
  'White rice': '白米',
  'Rice': '米饭',
  'Noodles': '面条',
  'Bread': '面包',
  'Whole Wheat Bread': '全麦面包',
  'Whole wheat bread': '全麦面包',
  'Pasta': '意面',
  'Quinoa': '藜麦',
  
  // 蛋类
  'Salted Duck Egg': '咸鸭蛋',
  'Duck Egg': '鸭蛋',
  'Egg': '鸡蛋',
  'Eggs': '鸡蛋',
  'Egg White': '蛋白',
  'Egg white': '蛋白',
  
  // 鱼/海鲜
  'Sea Bass': '鲈鱼',
  'Salmon': '三文鱼',
  'Salmon fillet': '三文鱼片',
  'Shrimp': '虾',
  'Fish': '鱼肉',
  'Tuna': '金枪鱼',
  
  // 肉类
  'Chicken Breast': '鸡胸肉',
  'Chicken breast': '鸡胸肉',
  'Chicken': '鸡肉',
  'Chicken Thigh': '鸡腿肉',
  'Chicken thigh': '鸡腿肉',
  'Pork': '猪肉',
  'Beef': '牛肉',
  'Lean Beef': '瘦牛肉',
  'Lean beef': '瘦牛肉',
  'Ground Beef': '牛肉末',
  'Ground beef': '牛肉末',
  'Turkey': '火鸡肉',
  'Duck': '鸭肉',
  
  // 豆制品
  'Tofu': '豆腐',
  'Soy Milk': '豆浆',
  
  // 蔬菜
  'Broccoli': '西兰花',
  'Cucumber': '黄瓜',
  'Cucumber Salad': '凉拌黄瓜',
  'Green Vegetables': '青菜',
  'Wood Ear Mushroom': '木耳',
  'Spinach': '菠菜',
  'Carrot': '胡萝卜',
  'Carrots': '胡萝卜',
  'Tomato': '西红柿',
  'Tomatoes': '西红柿',
  'Onion': '洋葱',
  'Mushroom': '蘑菇',
  'Mushrooms': '蘑菇',
  'Cauliflower': '花椰菜',
  'Eggplant': '茄子',
  'Celery': '芹菜',
  'Lettuce': '生菜',
  'Cabbage': '卷心菜',
  'Bell Pepper': '甜椒',
  'Bell pepper': '甜椒',
  'Bell peppers': '甜椒',
  'Green Pepper': '青椒',
  'Sweet Potato': '红薯',
  'Sweet potato': '红薯',
  'Asparagus': '芦笋',
  'Peas': '豌豆',
  'Corn': '玉米',
  'Seasonal Vegetables': '时蔬',
  'Vegetables': '蔬菜',
  'Mixed Vegetables': '混合蔬菜',
  'Mixed vegetables': '混合蔬菜',
  'Kale': '羽衣甘蓝',
  'Zucchini': '西葫芦',
  'Green beans': '四季豆',
  
  // 水果
  'Banana': '香蕉',
  'Apple': '苹果',
  'Orange': '橙子',
  'Strawberry': '草莓',
  'Strawberries': '草莓',
  'Blueberry': '蓝莓',
  'Blueberries': '蓝莓',
  'Mango': '芒果',
  'Pineapple': '菠萝',
  'Grape': '葡萄',
  'Grapes': '葡萄',
  'Watermelon': '西瓜',
  'Avocado': '牛油果',
  'Berries': '浆果',
  'Fruits': '水果',
  'Raspberries': '覆盆子',
  
  // 乳制品
  'Yogurt': '酸奶',
  'Greek Yogurt': '希腊酸奶',
  'Greek yogurt': '希腊酸奶',
  'Milk': '牛奶',
  'Skim Milk': '脱脂牛奶',
  'Skim milk': '脱脂牛奶',
  'Cheese': '奶酪',
  'Almond Milk': '杏仁奶',
  'Almond milk': '杏仁奶',
  
  // 坚果
  'Almonds': '杏仁',
  'Walnuts': '核桃',
  'Peanut Butter': '花生酱',
  'Peanut butter': '花生酱',
  'Chia seeds': '奇亚籽',
  
  // 调味/其他
  'Olive Oil': '橄榄油',
  'Olive oil': '橄榄油',
  'Honey': '蜂蜜',
  'Lemon Juice': '柠檬汁',
  'Lemon juice': '柠檬汁',
  'Fried Dough Stick': '油条',
  'Protein powder': '蛋白粉',
  'Whey protein': '乳清蛋白',
};

// 生成反向翻译表（中文 -> 英文）
const generateReverseMap = (map) => {
  const reversed = {};
  for (const [en, zh] of Object.entries(map)) {
    reversed[zh] = en;
  }
  return reversed;
};

export const FOOD_NAME_ZH_TO_EN = generateReverseMap(FOOD_NAME_EN_TO_ZH);
export const INGREDIENT_ZH_TO_EN = generateReverseMap(INGREDIENT_EN_TO_ZH);

/**
 * 检测文本是否包含中文字符
 * @param {string} text
 * @returns {boolean}
 */
const containsChinese = (text) => {
  if (!text) return false;
  return /[\u4e00-\u9fa5]/.test(text);
};

/**
 * 翻译食物/菜名
 * 根据目标语言自动检测输入语言并翻译
 * @param {string} name - 食物名称
 * @param {string} targetLanguage - 目标语言 ('zh' 或 'en')
 * @returns {string} 翻译后的名称
 */
export const translateFoodName = (name, targetLanguage = 'zh') => {
  if (!name) return name;
  
  const isChinese = containsChinese(name);
  
  if (targetLanguage === 'zh') {
    // 目标是中文
    if (isChinese) {
      // 已经是中文，直接返回
      return name;
    }
    // 英文翻译成中文
    return FOOD_NAME_EN_TO_ZH[name] || name;
  } else {
    // 目标是英文
    if (!isChinese) {
      // 已经是英文，直接返回
      return name;
    }
    // 中文翻译成英文
    return FOOD_NAME_ZH_TO_EN[name] || name;
  }
};

/**
 * 翻译食材名称
 * 根据目标语言自动检测输入语言并翻译
 * @param {string} name - 食材名称
 * @param {string} targetLanguage - 目标语言 ('zh' 或 'en')
 * @returns {string} 翻译后的名称
 */
export const translateIngredient = (name, targetLanguage = 'zh') => {
  if (!name) return name;
  
  const isChinese = containsChinese(name);
  
  if (targetLanguage === 'zh') {
    // 目标是中文
    if (isChinese) {
      return name;
    }
    return INGREDIENT_EN_TO_ZH[name] || name;
  } else {
    // 目标是英文
    if (!isChinese) {
      return name;
    }
    return INGREDIENT_ZH_TO_EN[name] || name;
  }
};

/**
 * 翻译餐次类型
 * @param {string} mealType - 餐次（如 'Breakfast' 或 '早餐'）
 * @param {string} targetLanguage - 目标语言
 * @returns {string}
 */
export const translateMealType = (mealType, targetLanguage = 'zh') => {
  return translateFoodName(mealType, targetLanguage);
};

export default {
  translateFoodName,
  translateIngredient,
  translateMealType,
  FOOD_NAME_EN_TO_ZH,
  FOOD_NAME_ZH_TO_EN,
  INGREDIENT_EN_TO_ZH,
  INGREDIENT_ZH_TO_EN,
};

