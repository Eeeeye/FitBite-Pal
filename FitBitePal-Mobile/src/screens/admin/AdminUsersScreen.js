import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../api/client';

const API_BASE = '/admin'; // 注意：baseURL 已包含 /api

export const AdminUsersScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      let url = `${API_BASE}/users`;
      if (searchQuery) {
        url += `?search=${encodeURIComponent(searchQuery)}`;
      }

      const response = await apiClient.get(url);
      if (response.success && response.data) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('加载用户失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  const getGoalLabel = (goal) => {
    const goals = {
      'Lose weight': '🥗 减脂',
      'Build muscle': '💪 增肌',
      'Keep fit': '🍱 健康',
    };
    return goals[goal] || goal || '-';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>用户管理</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索用户..."
          placeholderTextColor="#64748B"
          onSubmitEditing={loadUsers}
        />
      </View>

      {/* 列表 */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
          />
        }
      >
        {users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无用户数据</Text>
          </View>
        ) : (
          users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user.username || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.username}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={[
                  styles.roleTag,
                  user.role === 'ADMIN' && styles.adminTag
                ]}>
                  <Text style={styles.roleText}>
                    {user.role === 'ADMIN' ? '管理员' : '用户'}
                  </Text>
                </View>
              </View>
              <View style={styles.userDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>目标</Text>
                  <Text style={styles.detailValue}>{getGoalLabel(user.goal)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>体重</Text>
                  <Text style={styles.detailValue}>{user.weight ? `${user.weight} kg` : '-'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>身高</Text>
                  <Text style={styles.detailValue}>{user.height ? `${user.height} cm` : '-'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>注册时间</Text>
                  <Text style={styles.detailValue}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    color: '#4F46E5',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 12,
  },
  searchInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
  },
  userCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminTag: {
    backgroundColor: '#DC2626',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  userDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});

export default AdminUsersScreen;

