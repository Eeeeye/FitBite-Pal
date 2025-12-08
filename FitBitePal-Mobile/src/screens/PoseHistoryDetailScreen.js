/**
 * 训练回放详情页面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useAppState } from '../contexts';

const { width } = Dimensions.get('window');

export const PoseHistoryDetailScreen = ({ navigation, route }) => {
  const { session } = route.params || {};
  const { currentLanguage } = useAppState();

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentLanguage === 'zh' ? '训练详情' : 'Training Details'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {currentLanguage === 'zh' ? '会话数据不存在' : 'Session data not found'}
          </Text>
        </View>
      </View>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // 解析日志数据
  const logs = session.logs ? (typeof session.logs === 'string' ? JSON.parse(session.logs) : session.logs) : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentLanguage === 'zh' ? '训练详情' : 'Training Details'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 训练信息卡片 */}
        <View style={styles.infoCard}>
          <Text style={styles.exerciseName}>{session.exerciseName || 'Training Session'}</Text>
          <Text style={styles.sessionDate}>{formatDate(session.createdAt || session.startTime)}</Text>
          <Text style={styles.sessionTime}>{formatTime(session.createdAt || session.startTime)}</Text>
        </View>

        {/* ✨ 视频播放器已移除，图片现在显示在每条日志中 */}

        {/* 统计数据 */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statValue}>{formatDuration(session.duration || session.durationSeconds || 0)}</Text>
            <Text style={styles.statLabel}>
              {currentLanguage === 'zh' ? '训练时长' : 'Duration'}
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statValue}>
              {logs.length > 0 
                ? Math.round(logs.reduce((sum, log) => sum + (log.score || 0), 0) / logs.length)
                : 0}
            </Text>
            <Text style={styles.statLabel}>
              {currentLanguage === 'zh' ? '平均得分' : 'Avg Score'}
            </Text>
          </View>
        </View>

        {/* AI反馈日志 */}
        <View style={styles.logsSection}>
          <Text style={styles.sectionTitle}>
            📊 {currentLanguage === 'zh' ? 'AI反馈日志' : 'AI Feedback Log'}
          </Text>
          
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <View key={log.id || index} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <View style={styles.logTimeContainer}>
                    <Text style={styles.logTimestamp}>
                      📸 {log.timestamp || log.captureTime}
                    </Text>
                    {log.duration !== undefined && (
                      <Text style={styles.logDuration}>
                        ⏱️ {formatDuration(log.duration)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.logStats}>
                    <Text style={styles.logStat}>
                      {currentLanguage === 'zh' ? '得分' : 'Score'}: {log.score || 0}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.logContent}>
                  {log.feedback && log.feedback.corrections && log.feedback.corrections.length > 0 ? (
                    log.feedback.corrections.map((correction, idx) => (
                      <Text key={idx} style={styles.logMessage}>
                        • {correction.message}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.logMessage}>
                      {log.score >= 90 
                        ? '✅ 姿态标准，保持！' 
                        : log.score >= 75 
                        ? '🟡 姿态良好，继续努力' 
                        : '🔴 姿态需要调整'}
                    </Text>
                  )}
                </View>
                
                {/* ✨ 显示对应的训练照片 */}
                {log.imageUri && (
                  <View style={styles.logImageContainer}>
                    <Image 
                      source={{ uri: log.imageUri }} 
                      style={styles.logImage}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyLogs}>
              <Text style={styles.emptyLogsText}>
                {currentLanguage === 'zh' ? '暂无AI反馈日志' : 'No AI feedback logs'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    margin: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  videoContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  video: {
    width: '100%',
    height: width * 0.6, // 16:9 aspect ratio approximately
    borderRadius: 8,
    backgroundColor: '#000',
  },
  noVideoContainer: {
    width: '100%',
    height: width * 0.6,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noVideoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noVideoText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
    textAlign: 'center',
  },
  noVideoSubText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sessionDate: {
    fontSize: 16,
    color: '#a4ff3e',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a4ff3e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  logsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  logItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#a4ff3e',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logTimeContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  logDuration: {
    fontSize: 11,
    color: '#a4ff3e',
    fontWeight: '700',
  },
  logStats: {
    flexDirection: 'row',
    gap: 12,
  },
  logStat: {
    fontSize: 11,
    color: '#a4ff3e',
    fontWeight: '600',
  },
  logContent: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  logMessage: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 4,
  },
  logImageContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  logImage: {
    width: '100%',
    height: width * 0.6, // 16:9 类似的宽高比
    backgroundColor: '#000',
  },
  emptyLogs: {
    padding: 40,
    alignItems: 'center',
  },
  emptyLogsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

