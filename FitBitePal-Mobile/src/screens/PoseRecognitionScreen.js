import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native'; // ✨ 新增
import * as FileSystem from 'expo-file-system';
import { usePoseRecognition } from '../hooks';
import { useData } from '../contexts/DataContext';
import { useAppState } from '../contexts/AppStateContext';
import { useAuth } from '../contexts/AuthContext';
import { translateExerciseName } from '../utils/exerciseTranslations';

export const PoseRecognitionScreen = ({ navigation, route }) => {
  const { exercise } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('front'); // ✨ 新增：摄像头方向状态
  const [hasStarted, setHasStarted] = useState(false); // ✨ 是否已经点击开始按钮
  const [isStopping, setIsStopping] = useState(false); // ✨ 是否正在停止（防止重复点击）
  const cameraRef = useRef(null);
  const scrollViewRef = useRef(null); // ✨ 反馈日志滚动视图引用
  const { currentLanguage } = useAppState();
  
  const {
    isActive,
    feedback,
    score,
    reps,
    duration,
    calories,
    feedbackLogs, // ✨ 新增：反馈日志
    isAnalyzing, // ✨ 新增：AI分析中状态
    startSession,
    stopSession,
    togglePause,
    captureFrame,
    resetSession, // ✨ 新增：重置会话
  } = usePoseRecognition(exercise);

  const { markExerciseComplete } = useData();
  const { userId } = useAuth();

  // ✨ 运动名称翻译函数
  // ✅ 已删除本地翻译函数，使用统一的 translateExerciseName 工具

  // ✨ 页面重新聚焦时重置状态（确保每次进入都是干净状态）
  useFocusEffect(
    useCallback(() => {

      // 只在训练未开始时重置
      if (!hasStarted) {

        resetSession();
        setHasStarted(false);
        setFacing('front');
        setIsStopping(false); // ✨ 重置停止标志
      }
      
      // 清理函数：在页面失去焦点时
      return () => {

      };
    }, []) // ✨ 移除所有依赖，只在页面mount/unmount时执行
  );

  // ✨ 移除自动启动逻辑，改为手动点击开始按钮

  // Auto-start capturing frames when active and started
  useEffect(() => {
    let captureInterval;
    if (hasStarted && isActive && cameraRef.current) {

      captureInterval = setInterval(async () => {
        if (cameraRef.current && isActive && hasStarted) {

          await captureFrame(cameraRef);
        }
      }, 10000); // ✨ 每10秒捕获一次
    } else if (!isActive && hasStarted) {

    }
    return () => {
      if (captureInterval) {
        clearInterval(captureInterval);

      }
    };
  }, [isActive, hasStarted]);

  // ✨ 视频录制功能已移除，改用图片保存方案

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ✨ 处理开始按钮点击
  const handleStart = async () => {

    if (exercise?.name || exercise?.exerciseName) {
      const exerciseName = exercise.name || exercise.exerciseName || 'Unknown Exercise';

      const result = await startSession(exerciseName);
      
      if (!result.success) {
        Alert.alert(
          currentLanguage === 'zh' ? '错误' : 'Error',
          currentLanguage === 'zh' 
            ? '启动训练会话失败，请检查网络连接' 
            : 'Failed to start training session, please check network connection'
        );
        return;
      }
      
      // ✨ 标记为已开始
      setHasStarted(true);

    }
  };

  const handleStop = async () => {

    // ✨ 防止重复点击
    if (isStopping) {

      return;
    }
    
    setIsStopping(true);
    
    // ✨ 如果还没开始，直接退出不保存
    if (!hasStarted) {

      setIsStopping(false);
      navigation.goBack();
      return;
    }
    
    try {
      const result = await stopSession();

      // ✨ 保存训练会话数据到后端（包括日志和视频）
      if (result && result.sessionData) {
        const sessionData = result.sessionData;









        try {
          const { savePoseSessionData } = require('../api/pose');
          const saveResult = await savePoseSessionData({
            sessionId: sessionData.sessionId,
            userId: userId,
            exerciseName: exercise?.name || exercise?.exerciseName || 'Training',
            logs: JSON.stringify(sessionData.feedbackLogs || []), // ✨ 日志中包含图片URI
            duration: sessionData.duration || 0,
            calories: sessionData.calories || 0,
            reps: sessionData.reps || 0,
            videoUri: '', // ✨ 不再使用视频
          });
          
          if (saveResult.success) {

          }
        } catch (saveError) {
          if (__DEV__) {
            console.error('保存训练数据异常:', saveError);
            console.error('错误详情:', saveError.message, saveError.stack);
          }
        }
      }
      
      // Mark exercise as complete
      if (exercise?.name || exercise?.exerciseName) {
        const exerciseName = exercise.name || exercise.exerciseName || 'Unknown Exercise';
        const exerciseIndex = exercise.id || 0;

        await markExerciseComplete(exerciseIndex, exerciseName, calories);
      }
      
      Alert.alert(
        currentLanguage === 'zh' ? '训练完成！' : 'Session Complete!',
        currentLanguage === 'zh' 
          ? '做得好！你完成了本次训练。' 
          : 'Great job! You completed this training session.',
        [
          { 
            text: currentLanguage === 'zh' ? '完成' : 'Done', 
            onPress: () => {
              // ✨ 重置所有状态，确保下次进入时是干净的

              resetSession();
              setHasStarted(false);
              setFacing('front');
              setIsStopping(false); // ✨ 重置停止标志
              
              // 跳转到回放列表
              navigation.navigate('PoseHistory');
            }
          },
        ]
      );
    } catch (error) {
      console.error('停止训练异常:', error);
      if (__DEV__) {
        console.error('错误详情:', error.message, error.stack);
      }
      
      // 重置停止标志，即使出错
      setIsStopping(false);
      
      // 即使出错也显示完成提示
      Alert.alert(
        currentLanguage === 'zh' ? '训练完成' : 'Training Complete',
        currentLanguage === 'zh' 
          ? '训练已结束，部分数据可能未保存' 
          : 'Training session ended, some data may not be saved',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // ✨ 重置所有状态

              resetSession();
              setVideoUri(null);
              setIsRecording(false);
              setHasStarted(false);
              setFacing('front');
              
              // 跳转到回放列表
              navigation.navigate('PoseHistory');
            }
          },
        ]
      );
    }
  };

  const handleTogglePause = async () => {

    // ✨ 只暂停计时器和AI分析，视频继续录制
    await togglePause();

  };

  // ✨ 新增：翻转摄像头
  const toggleCameraFacing = () => {
    setFacing(current => (current === 'front' ? 'back' : 'front'));

  };

  if (!permission) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#a4ff3e" />
        <Text style={styles.message}>
          {currentLanguage === 'zh' ? '正在请求相机权限...' : 'Requesting camera permission...'}
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={styles.message}>
          {currentLanguage === 'zh' ? '需要相机权限才能进行姿态识别' : 'Camera permission is required for pose recognition'}
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>
            {currentLanguage === 'zh' ? '授予相机权限' : 'Grant Permission'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 相机预览区域 - 仅前置摄像头用于姿势识别 */}
      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={false}
          animateShutter={false}
          mode="picture"
          mute={true}
          onMountError={(error) => {
            console.error('📷 Camera mount error:', error);
          }}
        />
        
        {/* 姿态得分覆盖层 - 使用绝对定位 */}
        {score > 0 && (
          <View style={styles.scoreOverlay}>
            <Text style={styles.scoreText}>{Math.floor(score)}</Text>
            <Text style={styles.scoreLabel}>
              {currentLanguage === 'zh' ? '分' : 'pts'}
            </Text>
          </View>
        )}
        
        {/* 状态指示器 - 使用绝对定位 */}
        <View style={styles.statusIndicator}>
          {isAnalyzing ? (
            <ActivityIndicator size="small" color="#a4ff3e" />
          ) : (
            <View style={[
              styles.statusDot, 
              { backgroundColor: isActive ? '#a4ff3e' : '#ff4444' }
            ]} />
          )}
          <Text style={styles.statusText}>
            {isAnalyzing ? 
              (currentLanguage === 'zh' ? 'AI分析中...' : 'AI Analyzing...') :
              isActive ? 
              (currentLanguage === 'zh' ? '训练中' : 'Training') : 
              (currentLanguage === 'zh' ? '已暂停' : 'Paused')
            }
          </Text>
        </View>

        {/* ✨ 新增：摄像头翻转按钮 */}
        <TouchableOpacity 
          style={styles.flipCameraButton}
          onPress={toggleCameraFacing}
          activeOpacity={0.7}
        >
          <Text style={styles.flipCameraIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* 控制面板 */}
      <View style={styles.poseControlPanel}>
        {/* 标题栏 + 查看回放按钮 */}
        <View style={styles.poseTitleRow}>
          <Text style={styles.poseTitle}>
            {translateExerciseName(exercise?.name || exercise?.exerciseName, currentLanguage) || (currentLanguage === 'zh' ? 'AI姿态训练' : 'AI Pose Training')}
          </Text>
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => navigation.navigate('PoseHistory')}
            activeOpacity={0.7}
          >
            <Text style={styles.historyButtonIcon}>📹</Text>
            <Text style={styles.historyButtonText}>
              {currentLanguage === 'zh' ? '回放' : 'History'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.poseStats}>
          <View style={styles.poseStatItem}>
            <Text style={styles.poseStatLabel}>
              {currentLanguage === 'zh' ? '训练时长' : 'Duration'}
            </Text>
            <Text style={styles.poseStatValue}>{formatDuration(duration)}</Text>
          </View>
          <View style={styles.poseStatItem}>
            <Text style={styles.poseStatLabel}>
              {currentLanguage === 'zh' ? '平均得分' : 'Avg Score'}
            </Text>
            <Text style={styles.poseStatValue}>{score}</Text>
          </View>
        </View>

        {/* AI反馈日志 - 数据流形式 */}
        <View style={styles.feedbackLogsContainer}>
          <Text style={styles.feedbackLogsTitle}>
            📊 {currentLanguage === 'zh' ? 'AI反馈日志' : 'AI Feedback Log'}
          </Text>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.feedbackLogsList}
            showsVerticalScrollIndicator={true}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {feedbackLogs.length > 0 ? (
              feedbackLogs.map((log) => (
                <View key={log.id} style={styles.feedbackLogItem}>
                  <View style={styles.feedbackLogHeader}>
                    <View style={styles.feedbackLogTimeContainer}>
                      <Text style={styles.feedbackLogTime}>
                        📸 {log.timestamp}
                      </Text>
                      {log.duration !== undefined && (
                        <Text style={styles.feedbackLogDuration}>
                          ⏱️ {Math.floor(log.duration / 60)}:{String(log.duration % 60).padStart(2, '0')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.feedbackLogStats}>
                      <Text style={styles.feedbackLogStat}>
                        {currentLanguage === 'zh' ? '得分' : 'Score'}: {log.score || 0}
                      </Text>
                    </View>
                  </View>
                  {log.feedback && log.feedback.corrections && log.feedback.corrections.length > 0 ? (
                    log.feedback.corrections.map((correction, index) => (
                      <Text key={index} style={styles.feedbackLogMessage}>
                        • {correction.message}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.feedbackLogMessage}>
                      {log.score >= 90 ? '✅ 姿态标准' : log.score >= 75 ? '🟡 姿态良好' : '🔴 需要调整'}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.feedbackLogEmpty}>
                {currentLanguage === 'zh' ? '等待AI反馈...' : 'Waiting for AI feedback...'}
              </Text>
            )}
          </ScrollView>
        </View>

        {/* 按钮组 */}
        <View style={styles.poseButtonGroup}>
          <TouchableOpacity 
            style={[
              styles.poseStopButton,
              isStopping && styles.poseStopButtonDisabled // ✨ 禁用状态样式
            ]}
            onPress={handleStop}
            activeOpacity={isStopping ? 1 : 0.7} // ✨ 禁用时不显示点击效果
            disabled={isStopping} // ✨ 禁用按钮
          >
            <Text style={styles.poseButtonText}>
              {isStopping 
                ? (currentLanguage === 'zh' ? '停止中...' : 'Stopping...') 
                : (currentLanguage === 'zh' ? '停止' : 'Stop')
              }
            </Text>
          </TouchableOpacity>
          
          {/* ✨ 根据 hasStarted 显示不同按钮 */}
          {!hasStarted ? (
            <TouchableOpacity 
              style={styles.poseStartButton}
              onPress={handleStart}
              activeOpacity={0.7}
            >
              <Text style={styles.poseButtonText}>
                {currentLanguage === 'zh' ? '开始' : 'Start'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.posePauseButton}
              onPress={handleTogglePause}
              activeOpacity={0.7}
            >
              <Text style={styles.poseButtonText}>
                {isActive ? 
                  (currentLanguage === 'zh' ? '暂停' : 'Pause') : 
                  (currentLanguage === 'zh' ? '继续' : 'Resume')
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  scoreOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 80,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
  statusIndicator: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  flipCameraButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 30,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#a4ff3e',
  },
  flipCameraIcon: {
    fontSize: 28,
  },
  poseControlPanel: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  poseTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  poseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a4ff3e',
    gap: 6,
  },
  historyButtonIcon: {
    fontSize: 18,
  },
  historyButtonText: {
    fontSize: 13,
    color: '#a4ff3e',
    fontWeight: '600',
  },
  poseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  poseStatItem: {
    alignItems: 'center',
  },
  poseStatLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  poseStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  poseFeedbackCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  poseFeedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a4ff3e',
    marginBottom: 12,
  },
  poseFeedbackText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 4,
  },
  // ✨ AI反馈日志样式
  feedbackLogsContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    maxHeight: 200,
  },
  feedbackLogsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a4ff3e',
    marginBottom: 12,
  },
  feedbackLogsList: {
    maxHeight: 140,
  },
  feedbackLogItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#a4ff3e',
  },
  feedbackLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  feedbackLogTimeContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  feedbackLogTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  feedbackLogDuration: {
    fontSize: 11,
    color: '#a4ff3e',
    fontWeight: '700',
  },
  feedbackLogStats: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackLogStat: {
    fontSize: 11,
    color: '#a4ff3e',
    fontWeight: '600',
  },
  feedbackLogMessage: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
    marginTop: 4,
  },
  feedbackLogEmpty: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  poseButtonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  poseStopButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  poseStopButtonDisabled: {
    backgroundColor: '#666', // ✨ 禁用状态：灰色
    opacity: 0.6,
  },
  poseStartButton: {
    flex: 1,
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  posePauseButton: {
    flex: 1,
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  poseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
