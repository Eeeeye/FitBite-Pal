// 相机和相册服务
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

/**
 * 请求相机权限
 * @returns {Promise<boolean>} 是否授权成功
 */
export const requestCameraPermission = async () => {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '权限被拒绝',
        '需要相机权限才能使用此功能。请在设置中授予权限。',
        [{ text: '确定' }]
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

/**
 * 检查相机权限状态
 * @returns {Promise<boolean>} 是否已授权
 */
export const checkCameraPermission = async () => {
  try {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
};

/**
 * 请求相册权限
 * @returns {Promise<boolean>} 是否授权成功
 */
export const requestMediaLibraryPermission = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '权限被拒绝',
        '需要相册权限才能选择照片。请在设置中授予权限。',
        [{ text: '确定' }]
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting media library permission:', error);
    return false;
  }
};

/**
 * 拍照
 * @param {Object} cameraRef - 相机组件引用
 * @returns {Promise<Object|null>} 照片对象或null
 */
export const takePicture = async (cameraRef) => {
  try {
    if (!cameraRef || !cameraRef.current) {
      console.error('Camera ref is not available');
      return null;
    }

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
      exif: false,
    });

    return photo;
  } catch (error) {
    console.error('Error taking picture:', error);
    Alert.alert('错误', '拍照失败，请重试');
    return null;
  }
};

/**
 * 从相册选择照片
 * @param {Object} options - 选择选项
 * @returns {Promise<Object|null>} 照片对象或null
 */
export const pickImage = async (options = {}) => {
  try {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: options.allowsEditing !== false,
      aspect: options.aspect || [4, 3],
      quality: options.quality || 0.8,
      base64: options.base64 || false,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('错误', '选择照片失败，请重试');
    return null;
  }
};

/**
 * 选择照片或拍照（弹出选择对话框）
 * @returns {Promise<Object|null>} 照片对象或null
 */
export const selectImageSource = () => {
  return new Promise((resolve) => {
    Alert.alert(
      '选择图片来源',
      '请选择照片来源',
      [
        {
          text: '取消',
          style: 'cancel',
          onPress: () => resolve(null),
        },
        {
          text: '拍照',
          onPress: async () => {
            const hasPermission = await requestCameraPermission();
            if (!hasPermission) {
              resolve(null);
              return;
            }

            try {
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });

              if (result.canceled) {
                resolve(null);
              } else {
                resolve(result.assets[0]);
              }
            } catch (error) {
              console.error('Error launching camera:', error);
              Alert.alert('错误', '打开相机失败');
              resolve(null);
            }
          },
        },
        {
          text: '从相册选择',
          onPress: async () => {
            const image = await pickImage();
            resolve(image);
          },
        },
      ],
      { cancelable: true }
    );
  });
};
