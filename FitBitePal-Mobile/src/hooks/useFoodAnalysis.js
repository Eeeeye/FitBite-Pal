import { useState } from 'react';
import { analyzeFoodWithAI } from '../../services/aiService';
import { selectImageSource } from '../../services/cameraService';
import { useUserProfile, useAppState } from '../contexts';
import { useAuth } from '../contexts/AuthContext';

export const useFoodAnalysis = () => {
  const { userProfile } = useUserProfile();
  const { currentLanguage } = useAppState();
  const { userId } = useAuth();
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const selectImage = async () => {
    try {
      const image = await selectImageSource();
      if (image && image.uri) {
        setSelectedImage(image.uri);
        setResult(null);
        return { success: true, uri: image.uri };
      }
      return { success: false, message: 'No image selected' };
    } catch (error) {
      console.error('Error selecting image:', error);
      return { success: false, message: error.message };
    }
  };

  const analyzeFood = async (imageUri = selectedImage) => {
    if (!imageUri) {
      return { success: false, message: 'No image to analyze' };
    }

    try {
      setAnalyzing(true);
      const analysis = await analyzeFoodWithAI(
        imageUri,
        userProfile,
        currentLanguage,
        userId
      );

      setResult(analysis);
      return { success: true, data: analysis };
    } catch (error) {
      console.error('Error analyzing food:', error);
      return { success: false, message: error.message };
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setResult(null);
    setAnalyzing(false);
  };

  return {
    // 状态
    selectedImage,
    analyzing,
    result,

    // 操作
    selectImage,
    analyzeFood,
    resetAnalysis,
    setSelectedImage,
  };
};

