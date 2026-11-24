import { useState, useRef, useEffect } from 'react';
import { startPoseSession, submitPoseFrame, endPoseSession } from '../api/pose';
import { useAuth } from '../contexts';
import { useAppState } from '../contexts/AppStateContext'; // ✨ 新增：获取语言设置

export const usePoseRecognition = (exercise) => {
  const { userId } = useAuth();
  const { currentLanguage } = useAppState(); // ✨ 获取当前语言
  const [sessionId, setSessionId] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [reps, setReps] = useState(0);
  const [duration, setDuration] = useState(0);
  const [calories, setCalories] = useState(0);
  const frameCount = useRef(0);
  const captureInFlight = useRef(false);
  const activeSession = useRef(null);
  const [feedbackLogs, setFeedbackLogs] = useState([]); // ✨ AI反馈日志数组
  const [isAnalyzing, setIsAnalyzing] = useState(false); // ✨ AI分析中状态
  
  // ✨ 使用 useRef 存储计时器，避免闭包问题
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedDurationRef = useRef(0);
  const cameraRef = useRef(null);
  const timerIdRef = useRef(0); // ✨ 用于追踪计时器ID

  // ✨ 组件卸载时清理计时器
  useEffect(() => {
    return () => {
      activeSession.current = null;
      if (timerRef.current) {

        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const startSession = async (exerciseName) => {
    if (!userId) {
      throw new Error('User not logged in');
    }

    try {
      const response = await startPoseSession({
        userId,
        exerciseName,
      });
      
      if (response.success && response.data) {
        activeSession.current = response.data.sessionId;
        setSessionId(response.data.sessionId);
        setIsActive(true);
        setScore(null);
        setAnalysisError(null);
        setReps(0);
        setDuration(0);
        setCalories(0);
        setFeedback(null);
        frameCount.current = 0; // ✨ 重置帧计数器
        setFeedbackLogs([]); // ✨ 清空反馈日志

      // ✨ 清除可能存在的旧计时器
      if (timerRef.current) {

        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // ✨ 开始计时 - 记录开始时间
      const now = Date.now();
      startTimeRef.current = now;
      pausedDurationRef.current = 0;
      
      // 启动新计时器 - 分配唯一ID
      timerIdRef.current += 1;
      const currentTimerId = timerIdRef.current;

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - now) / 1000);
        // ✨ 只在关键时刻打印日志（每10秒或AI分析时）
        if (elapsed % 10 === 0 || elapsed < 5) {

        }
        setDuration(elapsed);
      }, 1000);

        return { success: true, sessionId: response.data.sessionId };
      }

      return { success: false, message: response.message };
    } catch (error) {
      console.error('Error starting pose session:', error);
      return { success: false, message: error.message };
    }
  };

  const submitFrame = async (frameData, captureTimestamp, currentDuration, imageUri) => {
    if (!sessionId) return { success: false, message: 'No active session' };

    try {
      setIsAnalyzing(true); // ✨ 开始分析
      const response = await submitPoseFrame(frameData);

      if (activeSession.current !== frameData.sessionId) return response;
      if (response.success && response.data) {
        setAnalysisError(null);
        const feedbackToUse = {
          score: response.data.score,
          corrections: response.data.corrections || [],
          message: response.data.corrections?.[0]?.message || '',
          overallStatus: response.data.overallStatus,
          demo: response.data.demo === true,
        };
        setFeedback(feedbackToUse);
        
        // ✨ 添加到反馈日志 - 使用拍照时的时间戳和实际时长
        const logEntry = {
          id: Date.now(),
          timestamp: captureTimestamp, // ✨ 使用拍照时刻的时间戳
          captureTime: captureTimestamp, // 拍照时间
          analyzeTime: new Date().toLocaleTimeString('en-US', { hour12: false }), // AI分析完成时间
          feedback: feedbackToUse,
          score: response.data.score,
          reps: response.data.reps,
          duration: currentDuration || 0, // ✨ 使用传入的实际时长
          imageUri: imageUri || null, // ✨ 保存图片URI
        };
        setFeedbackLogs(prev => [...prev, logEntry]);

        // 更新得分和统计数据
        if (response.data.score !== undefined) {
          setScore(response.data.score);
        }
        if (response.data.reps !== undefined) {
          setReps(response.data.reps);
        }
        if (response.data.estimatedCalories !== undefined || response.data.calories !== undefined) {
          setCalories(response.data.estimatedCalories || response.data.calories || calories);
        }

      } else {
        setAnalysisError(response.message || (currentLanguage === 'zh' ? '姿态分析暂时不可用' : 'Pose analysis is unavailable'));
      }

      return response;
    } catch (error) {
      setAnalysisError(error.message);
      return { success: false, message: error.message };
    } finally {
      setIsAnalyzing(false); // ✨ 分析结束
    }
  };

  const endSession = async () => {
    if (!sessionId) return { success: false, message: 'No active session' };

    try {
      activeSession.current = null;
      // ✨ 清除计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;

      }

      const response = await endPoseSession({
        sessionId,
        completedReps: reps,
        durationSeconds: duration,
        status: 'completed',
      });

      setIsActive(false);
      if (!response.success) return response;

      // ✨ 返回会话数据供保存（包括sessionId和日志）
      return { 
        ...response, 
        sessionData: {
          sessionId,
          feedbackLogs,
          duration,
          calories,
          reps,
        }
      };
    } catch (error) {
      console.error('Error ending pose session:', error);
      return { success: false, message: error.message };
    }
  };

  const resetSession = () => {
    // ✨ 清除计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // 重置所有状态
    activeSession.current = null;
    setSessionId(null);
    setIsActive(false);
    setFeedback(null);
    setScore(null);
    setAnalysisError(null);
    setReps(0);
    setDuration(0);
    setCalories(0);
    frameCount.current = 0;
    setFeedbackLogs([]);
    
    // 重置 ref
    startTimeRef.current = null;
    pausedDurationRef.current = 0;

  };

  // ✨ 新增：暂停/继续训练
  const togglePause = () => {

    setIsActive(prev => {
      const newState = !prev;

      if (!newState) {
        // 暂停 - 停止计时器，记录当前时长
        if (timerRef.current) {

          clearInterval(timerRef.current);
          timerRef.current = null;
          
          // 保存当前已经过的时长
          setDuration(current => {
            pausedDurationRef.current = current;

            return current;
          });
        }
      } else {
        // 继续 - 重新启动计时器
        if (startTimeRef.current) {
          // ✨ 清除可能残留的计时器
          if (timerRef.current) {

            clearInterval(timerRef.current);
          }
          
          // 计算新的基准时间
          const now = Date.now();
          const baseTime = now - pausedDurationRef.current * 1000;
          
          // 创建新计时器 - 分配唯一ID
          timerIdRef.current += 1;
          const currentTimerId = timerIdRef.current;

          timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - baseTime) / 1000);
            // ✨ 只在关键时刻打印日志（每10秒或刚恢复时）
            if (elapsed % 10 === 0 || elapsed - pausedDurationRef.current < 5) {

            }
            setDuration(elapsed);
          }, 1000);

        }
      }
      
      return newState;
    });
  };

  // ✨ 新增：停止训练（别名为endSession）
  const stopSession = async () => {
    return await endSession();
  };

  // ✨ 新增：捕获摄像头帧并提交分析
  const captureFrame = async (cameraReference) => {
    if (!isActive || !sessionId || captureInFlight.current || !cameraReference?.current) return;
    captureInFlight.current = true;
    try {
      const camera = cameraReference.current;
      // ✨ 记录拍照那一瞬间的时间戳
      const captureTimestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

      // 静默拍照（降低质量加快上传，完全禁用声音和动画）
      const photo = await camera.takePictureAsync({
        quality: 0.3, // ✨ 降低质量到30%，加快上传速度
        base64: true,
        skipProcessing: true,
        imageType: 'jpg',
        exif: false, // ✨ 不包含EXIF信息
        // ✨ 完全禁用快门声音、闪光灯和动画
        mute: true,
        flash: 'off',
        enableShutterSound: false,
        animateShutter: false,
        playShutterSound: false,
        isImageMirror: false,
      });

      if (!photo?.base64 || activeSession.current !== sessionId) {
        return;
      }

      // ✨ 递增帧计数器（避免超出int范围）
      const currentFrameNumber = ++frameCount.current;
      
      // 调用submitFrame来处理（它会调用API并更新状态）- 传递拍照时间戳、当前时长和图片URI
      await submitFrame({
        sessionId,
        imageBase64: photo.base64,
        frameNumber: currentFrameNumber, // ✨ 使用小的递增整数
        exerciseName: exercise?.name || exercise?.exerciseName || 'Training', // ✨ 传递运动名称
        language: currentLanguage || 'en', // ✨ 传递当前语言设置
      }, captureTimestamp, duration, photo.uri); // ✨ 传递拍照时刻的时间戳、当前时长和图片URI

    } catch (error) {
      if (activeSession.current === sessionId) setAnalysisError(error.message);
    } finally {
      captureInFlight.current = false;
    }
  };

  return {
    // 状态
    sessionId,
    isActive,
    feedback,
    analysisError,
    score,
    reps,
    duration,
    calories,
    feedbackLogs, // ✨ 新增：反馈日志
    isAnalyzing, // ✨ 新增：AI分析中状态
    cameraRef,

    // 操作
    startSession,
    submitFrame,
    endSession,
    stopSession, // ✨ 新增
    togglePause, // ✨ 新增
    captureFrame, // ✨ 新增
    resetSession,
  };
};


