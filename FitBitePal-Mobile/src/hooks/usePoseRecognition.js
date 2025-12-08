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
  const [score, setScore] = useState(0);
  const [reps, setReps] = useState(0);
  const [duration, setDuration] = useState(0);
  const [calories, setCalories] = useState(0);
  const [frameCount, setFrameCount] = useState(0); // ✨ 帧计数器（避免超出int范围）
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
        setSessionId(response.data.sessionId);
        setIsActive(true);
        setScore(0);
        setReps(0);
        setDuration(0);
        setCalories(0);
        setFeedback(null);
        setFrameCount(0); // ✨ 重置帧计数器
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

      if (response.success && response.data) {





        // ✨ response.data 本身就是 PoseFeedbackResponse，包含 corrections
        // 构建一个统一的 feedback 对象
        let feedbackToUse = {
          score: response.data.score,
          corrections: response.data.corrections || [],
          message: response.data.corrections?.[0]?.message || '',
          overallStatus: response.data.overallStatus
        };
        
        // ✨ 如果后端返回的 corrections 为空，生成基于分数的模拟反馈
        if (!feedbackToUse.corrections || feedbackToUse.corrections.length === 0) {
          const score = response.data.score || 0;
          const corrections = [];
          
          if (score >= 90) {
            corrections.push({ message: '✅ 动作标准，保持！' });
          } else if (score >= 75) {
            corrections.push({ message: '🟡 动作良好，注意姿态稳定性' });
          } else if (score >= 60) {
            corrections.push({ message: '🟠 姿态需要调整，注意动作规范' });
          } else {
            corrections.push({ message: '🔴 动作不规范，建议重新学习标准姿势' });
          }
          
          feedbackToUse.corrections = corrections;
          feedbackToUse.message = corrections[0].message;

        } else {

        }
        
        // 更新反馈数据
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
        console.error('AI分析失败 - 响应:', response);
      }

      return response;
    } catch (error) {
      console.error('Error submitting pose frame:', error);
      return { success: false, message: error.message };
    } finally {
      setIsAnalyzing(false); // ✨ 分析结束
    }
  };

  const endSession = async () => {
    if (!sessionId) return { success: false, message: 'No active session' };

    try {
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
    setSessionId(null);
    setIsActive(false);
    setFeedback(null);
    setScore(0);
    setReps(0);
    setDuration(0);
    setCalories(0);
    setFrameCount(0);
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
    if (!isActive || !sessionId) {

      return;
    }

    try {
      const camera = cameraReference?.current;
      if (!camera) {

        return;
      }

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

      if (!photo || !photo.base64) {
        return;
      }

      // ✨ 递增帧计数器（避免超出int范围）
      const currentFrameNumber = frameCount + 1;
      setFrameCount(currentFrameNumber);
      
      // ✨ 计算当前训练时长（秒）
      const currentDuration = startTimeRef.current 
        ? Math.floor((Date.now() - startTimeRef.current) / 1000) - pausedDurationRef.current
        : 0;

      // 调用submitFrame来处理（它会调用API并更新状态）- 传递拍照时间戳、当前时长和图片URI
      const response = await submitFrame({
        sessionId,
        imageBase64: photo.base64,
        frameNumber: currentFrameNumber, // ✨ 使用小的递增整数
        exerciseName: exercise?.name || exercise?.exerciseName || 'Training', // ✨ 传递运动名称
        language: currentLanguage || 'en', // ✨ 传递当前语言设置
      }, captureTimestamp, currentDuration, photo.uri); // ✨ 传递拍照时刻的时间戳、当前时长和图片URI

      if (response.success) {

      }
      
    } catch (error) {
      console.error('捕获帧失败:', error);
      // 不要让错误中断训练流程
    }
  };

  return {
    // 状态
    sessionId,
    isActive,
    feedback,
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


