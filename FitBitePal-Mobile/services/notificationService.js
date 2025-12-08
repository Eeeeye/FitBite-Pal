// 通知服务
// ⚠️ 警告说明：expo-notifications 在 Expo Go 中会显示关于"远程推送"不支持的警告
// 这不影响本应用功能，因为我们只使用"本地计划通知"（仍然支持）
import * as Notifications from 'expo-notifications';
import { Platform, Alert, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 通知存储键
const NOTIFICATION_SETTINGS_KEY = '@FitBitePal:notificationSettings';

// 隐藏已知的 Expo Go 警告（不影响功能）
if (__DEV__) {
  LogBox.ignoreLogs([
    'expo-notifications: Android Push notifications',
    'expo-notifications functionality is not fully supported',
  ]);
}

// 设置通知处理器（本地通知处理器仍然可用）
try {
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
} catch (error) {
  if (__DEV__) {
    console.warn('无法设置通知处理器:', error.message);
  }
}

/**
 * 请求通知权限
 * @returns {Promise<boolean>} 是否授权成功
 */
export const requestNotificationPermission = async () => {
  try {
    // ✅ 本地通知（Local Notifications）在Expo Go中仍然支持
    // 只有远程推送（Remote Push）不支持，但我们只使用本地计划通知
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        '权限被拒绝',
        '需要通知权限才能发送训练和用餐提醒。请在设置中授予权限。',
        [{ text: '确定' }]
      );
      return false;
    }

    // 在Android上配置通知渠道
    if (Platform.OS === 'android') {
      try {
      await Notifications.setNotificationChannelAsync('default', {
          name: 'FitBitePal 提醒',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#d0fd3e',
          sound: true,
      });
      } catch (channelError) {
        if (__DEV__) {
          console.warn('无法创建通知渠道:', channelError.message);
        }
      }
    }

    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('请求通知权限失败:', error);
    }
    return false;
  }
};

/**
 * 获取通知设置
 * @returns {Promise<Object>} 通知设置对象
 */
export const getNotificationSettings = async () => {
  try {
    const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return settings ? JSON.parse(settings) : {
      trainingReminder: false,
      mealReminder: false,
      trainingTime: '08:00',
      breakfastTime: '08:00',
      lunchTime: '12:30',
      dinnerTime: '18:30',
    };
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return {
      trainingReminder: false,
      mealReminder: false,
      trainingTime: '08:00',
      breakfastTime: '08:00',
      lunchTime: '12:30',
      dinnerTime: '18:30',
    };
  }
};

/**
 * 保存通知设置
 * @param {Object} settings - 通知设置对象
 */
export const saveNotificationSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
};

/**
 * 加载通知设置
 * @returns {Promise<Object|null>} 通知设置对象或 null
 */
export const loadNotificationSettings = async () => {
  try {
    const settingsString = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (settingsString) {
      return JSON.parse(settingsString);
    }
    return null;
  } catch (error) {
    console.error('Error loading notification settings:', error);
    return null;
  }
};

/**
 * 取消所有计划的通知
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
};

/**
 * 计划训练提醒通知（本地通知，Expo Go支持）
 * @param {string} time - 时间字符串 (HH:MM)
 */
export const scheduleTrainingReminder = async (time) => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      if (__DEV__) {
        console.log('没有通知权限，跳过训练提醒设置');
      }
      return false;
    }

    // 解析时间
    const [hour, minute] = time.split(':').map(Number);
    
    if (isNaN(hour) || isNaN(minute)) {
      if (__DEV__) {
        console.warn('无效的时间格式:', time);
      }
      return false;
    }

    // 取消之前的训练提醒
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of notifications) {
      if (notif.content.data?.type === 'training') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    // ✅ 计划新的本地提醒（每天重复）
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '训练提醒 🏋️',
        body: '该开始今天的训练了！坚持就是胜利！',
        sound: true,
        data: { type: 'training' },
      },
      trigger: {
        hour,
        minute,
        repeats: true, // 每天重复
      },
    });

    if (__DEV__) {
      console.log(`✅ 训练提醒已设置: ${time}, ID: ${notificationId}`);
    }
    
    return true;

  } catch (error) {
    if (__DEV__) {
      console.error('设置训练提醒失败:', error);
    }
    return false;
  }
};

/**
 * 计划用餐提醒通知（本地通知，Expo Go支持）
 * @param {Object} mealTimes - 用餐时间对象 {breakfastTime, lunchTime, dinnerTime}
 */
export const scheduleMealReminders = async (mealTimes) => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      if (__DEV__) {
        console.log('没有通知权限，跳过用餐提醒设置');
      }
      return false;
    }

    // 取消之前的用餐提醒
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of notifications) {
      if (notif.content.data?.type === 'meal') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    let scheduledCount = 0;

    // ✅ 早餐提醒
    if (mealTimes.breakfastTime) {
      const [hour, minute] = mealTimes.breakfastTime.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '早餐提醒 🍳',
          body: '美好的一天从营养早餐开始！',
          sound: true,
          data: { type: 'meal', meal: 'breakfast' },
        },
        trigger: {
          hour,
          minute,
            repeats: true, // 每天重复
        },
      });
        scheduledCount++;
      }
    }

    // ✅ 午餐提醒
    if (mealTimes.lunchTime) {
      const [hour, minute] = mealTimes.lunchTime.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '午餐提醒 🍱',
          body: '该吃午餐了，记得摄入足够的蛋白质！',
          sound: true,
          data: { type: 'meal', meal: 'lunch' },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });
        scheduledCount++;
      }
    }

    // ✅ 晚餐提醒
    if (mealTimes.dinnerTime) {
      const [hour, minute] = mealTimes.dinnerTime.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '晚餐提醒 🍽️',
          body: '晚餐时间到了，注意控制热量摄入！',
          sound: true,
          data: { type: 'meal', meal: 'dinner' },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });
        scheduledCount++;
      }
    }

    if (__DEV__) {
      console.log(`✅ 已设置 ${scheduledCount} 个用餐提醒`);
    }
    
    return true;

  } catch (error) {
    if (__DEV__) {
      console.error('设置用餐提醒失败:', error);
    }
    return false;
  }
};

/**
 * 发送即时通知（本地通知，Expo Go支持）
 * @param {string} title - 标题
 * @param {string} body - 内容
 * @param {Object} data - 额外数据
 * @returns {Promise<string|null>} 通知ID或null
 */
export const sendNotification = async (title, body, data = {}) => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      if (__DEV__) {
        console.log('没有通知权限，跳过发送通知');
      }
      return null;
    }

    // ✅ 发送本地即时通知
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
      },
      trigger: null, // 立即发送
    });
    
    if (__DEV__) {
      console.log(`✅ 即时通知已发送: "${title}", ID: ${notificationId}`);
    }
    
    return notificationId;

  } catch (error) {
    if (__DEV__) {
      console.error('发送即时通知失败:', error);
    }
    return null;
  }
};

