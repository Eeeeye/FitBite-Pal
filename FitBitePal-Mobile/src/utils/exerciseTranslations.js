/**
 * 运动名称翻译工具
 * 统一管理所有运动名称的中英文翻译
 */

export const EXERCISE_TRANSLATIONS = {
  // 基础有氧运动
  'Jumping Jacks': '开合跳',
  'High Knees': '高抬腿',
  'Jump Rope': '跳绳',
  'Jogging in Place': '原地慢跑',
  'Jogging': '慢跑',
  'Running': '跑步',
  'Running Intervals': '间歇跑',
  'Cycling': '骑行',
  'Side Shuffle': '侧滑步',
  'Arm Circles': '手臂绕环',
  'Butt Kicks': '后踢腿',
  'Skater Hops': '滑冰跳',
  'Cool Down Walk': '放松慢走',
  'Walking Lunges': '行走箭步蹲',
  
  // 力量训练 - 俯卧撑系列
  'Push-ups': '俯卧撑',
  'Push-up': '俯卧撑',
  'Diamond Push-ups': '钻石俯卧撑',
  'Pike Push-ups': '派克俯卧撑',
  'Incline Push-ups': '上斜俯卧撑',
  'Decline Push-ups': '下斜俯卧撑',
  'Explosive Push-ups': '爆发力俯卧撑',
  'Handstand Push-ups': '倒立撑',
  'Wide Push-ups': '宽距俯卧撑',
  'Wall Handstand Push-ups': '靠墙倒立撑',
  
  // 深蹲系列
  'Squats': '深蹲',
  'Squat': '深蹲',
  'Jump Squats': '跳跃深蹲',
  'Pistol Squats': '单腿深蹲',
  'Bulgarian Split Squats': '保加利亚分腿蹲',
  'Goblet Squats': '高脚杯深蹲',
  
  // 弓步系列
  'Lunges': '箭步蹲',
  'Lunge': '箭步蹲',
  'Jumping Lunges': '跳跃箭步蹲',
  'Side Lunges': '侧弓步',
  'Reverse Lunges': '反向箭步蹲',
  
  // 上肢力量
  'Dumbbell Rows': '哑铃划船',
  'Shoulder Press': '肩推',
  'Military Press': '军事推举',
  'Bicep Curls': '二头弯举',
  'Tricep Extensions': '三头臂屈伸',
  'Dumbbell Curls': '哑铃弯举',
  'Hammer Curls': '锤式弯举',
  'Dumbbell Press': '哑铃推举',
  'Arnold Press': '阿诺德推举',
  'Lateral Raises': '侧平举',
  'Front Raises': '前平举',
  'Bent Over Rows': '俯身划船',
  'Pull-ups': '引体向上',
  'Chin-ups': '反手引体向上',
  
  // 下肢力量
  'Wall Sit': '靠墙静蹲',
  'Calf Raises': '提踵',
  'Step-ups': '登台阶',
  'Glute Bridges': '臀桥',
  'Leg Press': '腿举',
  'Deadlifts': '硬拉',
  'Romanian Deadlifts': '罗马尼亚硬拉',
  
  // 核心训练
  'Plank': '平板支撑',
  'Side Plank': '侧平板支撑',
  'Plank Jacks': '平板开合跳',
  'Plank to Pike': '平板到派克式',
  'Crunches': '卷腹',
  'Bicycle Crunches': '空中蹬车',
  'Russian Twists': '俄罗斯转体',
  'Leg Raises': '抬腿',
  'Superman Hold': '超人式支撑',
  'Bird Dog': '鸟狗式',
  'V-ups': 'V字起坐',
  'Dragon Flag': '人体旗帜',
  'Sit-ups': '仰卧起坐',
  'Hollow Body Hold': '空心支撑',
  'Flutter Kicks': '颤动踢腿',
  'Toe Touches': '仰卧触脚尖',
  'Dead Bug': '死虫式',
  
  // 高强度训练
  'Burpees': '波比跳',
  'Burpee': '波比跳',
  'Burpee Tuck Jumps': '波比收腹跳',
  'Mountain Climbers': '登山者',
  'Mountain Climber': '登山者',
  
  // 拉伸放松
  'Stretching': '拉伸',
  'Cool Down Stretch': '放松拉伸',
  'Upper Body Stretch': '上肢拉伸',
  'Leg Stretching': '腿部拉伸',
  'Core Stretching': '核心拉伸',
  'Cat-Cow Stretch': '猫牛式拉伸',
  'Deep Breathing': '深呼吸',
  'Wrist Rolls': '腕部绕环',
  'Ankle Rolls': '踝部绕环',
};

/**
 * 翻译运动名称
 * @param {string} name - 英文运动名称
 * @param {string} language - 目标语言 ('zh' 或 'en')
 * @returns {string} 翻译后的名称
 */
export const translateExerciseName = (name, language = 'zh') => {
  if (language !== 'zh' || !name) return name;
  
  // 处理带⚡符号的高难度运动
  if (name.startsWith && name.startsWith('⚡ ')) {
    const baseName = name.substring(2).trim();
    const translatedBase = EXERCISE_TRANSLATIONS[baseName] || baseName;
    return '⚡ ' + translatedBase;
  }
  
  return EXERCISE_TRANSLATIONS[name] || name;
};

/**
 * 批量翻译运动名称
 * @param {Array} exercises - 运动对象数组
 * @param {string} language - 目标语言
 * @returns {Array} 翻译后的数组
 */
export const translateExercises = (exercises, language = 'zh') => {
  if (language !== 'zh' || !Array.isArray(exercises)) return exercises;
  
  return exercises.map(exercise => ({
    ...exercise,
    translatedName: translateExerciseName(exercise.name || exercise.exerciseName, language),
  }));
};

