/**
 * 训练回放列表页面
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth, useAppState } from '../contexts';
import { getUserPoseSessions, deletePoseSession } from '../api/pose';

export const PoseHistoryScreen = ({ navigation }) => {
  const { userId } = useAuth();
  const { currentLanguage } = useAppState();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false); // ✨ 管理模式
  const [selectedSessions, setSelectedSessions] = useState([]); // ✨ 选中的会话

  useEffect(() => {
    loadSessions();
  }, [userId]);

  const loadSessions = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await getUserPoseSessions(userId);
      
      if (response.success && response.data) {

        setSessions(response.data);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('加载训练历史错误:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  // ✨ 切换管理模式
  const toggleManageMode = () => {
    setIsManageMode(!isManageMode);
    setSelectedSessions([]); // 清空选中
  };

  // ✨ 切换会话选中状态
  const toggleSessionSelection = (sessionId) => {
    if (selectedSessions.includes(sessionId)) {
      setSelectedSessions(selectedSessions.filter(id => id !== sessionId));
    } else {
      setSelectedSessions([...selectedSessions, sessionId]);
    }
  };

  // ✨ 删除选中的会话
  const handleDelete = () => {
    if (selectedSessions.length === 0) {
      Alert.alert(
        currentLanguage === 'zh' ? '提示' : 'Notice',
        currentLanguage === 'zh' ? '请选择要删除的记录' : 'Please select records to delete'
      );
      return;
    }

    Alert.alert(
      currentLanguage === 'zh' ? '确认删除' : 'Confirm Delete',
      currentLanguage === 'zh' 
        ? `确定要删除选中的 ${selectedSessions.length} 条训练记录吗？` 
        : `Are you sure you want to delete ${selectedSessions.length} selected training records?`,
      [
        {
          text: currentLanguage === 'zh' ? '取消' : 'Cancel',
          style: 'cancel',
        },
        {
          text: currentLanguage === 'zh' ? '删除' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // 删除所有选中的会话
              const deletePromises = selectedSessions.map(sessionId => 
                deletePoseSession(sessionId)
              );
              
              const results = await Promise.all(deletePromises);
              const successCount = results.filter(r => r.success).length;
              
              if (successCount > 0) {
                Alert.alert(
                  currentLanguage === 'zh' ? '成功' : 'Success',
                  currentLanguage === 'zh' 
                    ? `成功删除 ${successCount} 条记录` 
                    : `Successfully deleted ${successCount} records`
                );
                
                // 刷新列表
                await loadSessions();
                setSelectedSessions([]);
                setIsManageMode(false);
              } else {
                Alert.alert(
                  currentLanguage === 'zh' ? '错误' : 'Error',
                  currentLanguage === 'zh' ? '删除失败' : 'Delete failed'
                );
              }
            } catch (error) {
              if (__DEV__) {
                console.error('删除训练记录错误:', error);
              }
              Alert.alert(
                currentLanguage === 'zh' ? '错误' : 'Error',
                currentLanguage === 'zh' ? '删除失败' : 'Delete failed'
              );
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const yesterdayOnly = yesterday.toDateString();

    if (dateOnly === todayOnly) {
      return currentLanguage === 'zh' ? '今天' : 'Today';
    } else if (dateOnly === yesterdayOnly) {
      return currentLanguage === 'zh' ? '昨天' : 'Yesterday';
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const renderSessionItem = ({ item }) => {
    const isSelected = selectedSessions.includes(item.sessionId);
    
    return (
      <TouchableOpacity
        style={[
          styles.sessionCard,
          isManageMode && isSelected && styles.sessionCardSelected
        ]}
        onPress={() => {
          if (isManageMode) {
            toggleSessionSelection(item.sessionId);
          } else {
            navigation.navigate('PoseHistoryDetail', { session: item });
          }
        }}
        activeOpacity={0.7}
      >
        {/* ✨ 管理模式下显示选择框 */}
        {isManageMode && (
          <View style={styles.selectionCheckbox}>
            <View style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected
            ]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
        )}
        
        <View style={styles.sessionContent}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>{item.exerciseName || 'Training Session'}</Text>
            <Text style={styles.sessionDate}>{formatDate(item.createdAt || item.startTime)}</Text>
          </View>
          
          <View style={styles.sessionStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>
                {currentLanguage === 'zh' ? '时长' : 'Duration'}
              </Text>
              <Text style={styles.statValue}>{formatDuration(item.duration || item.durationSeconds || 0)}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>
                {currentLanguage === 'zh' ? 'AI反馈' : 'AI Logs'}
              </Text>
              <Text style={styles.statValue}>
                {(() => {
                  try {
                    const logs = item.logs ? (typeof item.logs === 'string' ? JSON.parse(item.logs) : item.logs) : [];
                    return logs.length || 0;
                  } catch {
                    return 0;
                  }
                })()}
              </Text>
            </View>
          </View>

          <View style={styles.sessionFooter}>
            <Text style={styles.sessionTime}>
              {new Date(item.createdAt || item.startTime).toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            {!isManageMode && (
              <Text style={styles.viewButton}>
                {currentLanguage === 'zh' ? '查看详情 →' : 'View Details →'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentLanguage === 'zh' ? '训练回放' : 'Training History'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a4ff3e" />
          <Text style={styles.loadingText}>
            {currentLanguage === 'zh' ? '加载中...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentLanguage === 'zh' ? '训练回放' : 'Training History'}
        </Text>
        {/* ✨ 管理按钮 */}
        <TouchableOpacity 
          onPress={toggleManageMode}
          style={styles.manageButton}
        >
          <Text style={styles.manageButtonText}>
            {isManageMode 
              ? (currentLanguage === 'zh' ? '取消' : 'Cancel') 
              : (currentLanguage === 'zh' ? '管理' : 'Manage')
            }
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* ✨ 管理模式下的删除按钮 */}
      {isManageMode && (
        <View style={styles.manageToolbar}>
          <Text style={styles.selectedCount}>
            {currentLanguage === 'zh' 
              ? `已选 ${selectedSessions.length} 项` 
              : `${selectedSessions.length} selected`
            }
          </Text>
          <TouchableOpacity 
            onPress={handleDelete}
            style={[
              styles.deleteButton,
              selectedSessions.length === 0 && styles.deleteButtonDisabled
            ]}
            disabled={selectedSessions.length === 0}
          >
            <Text style={styles.deleteButtonText}>
              {currentLanguage === 'zh' ? '删除' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📹</Text>
          <Text style={styles.emptyText}>
            {currentLanguage === 'zh' ? '暂无训练记录' : 'No training history'}
          </Text>
          <Text style={styles.emptySubText}>
            {currentLanguage === 'zh' 
              ? '完成一次AI姿态训练后即可查看回放' 
              : 'Complete an AI pose training session to view history'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.sessionId || item.id?.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#a4ff3e"
              colors={['#a4ff3e']}
            />
          }
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 20,
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  manageButtonText: {
    fontSize: 16,
    color: '#a4ff3e',
    fontWeight: '600',
  },
  manageToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedCount: {
    fontSize: 14,
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sessionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionCardSelected: {
    borderColor: '#a4ff3e',
    borderWidth: 2,
  },
  selectionCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#a4ff3e',
    borderColor: '#a4ff3e',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    color: '#a4ff3e',
    fontWeight: '600',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTime: {
    fontSize: 13,
    color: '#666',
  },
  viewButton: {
    fontSize: 14,
    color: '#a4ff3e',
    fontWeight: '600',
  },
});

