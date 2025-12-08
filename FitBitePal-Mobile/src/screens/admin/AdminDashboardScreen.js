import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts';
import apiClient from '../../api/client';

const API_BASE = '/admin'; // 注意：baseURL 已包含 /api

export const AdminDashboardScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    userCount: 0,
    foodCount: 0,
    mealSetCount: 0,
    configCount: 0,
    todayCheckIns: 0,
  });

  const loadDashboard = useCallback(async () => {
    try {
      const response = await apiClient.get(`${API_BASE}/dashboard`);
      if (response.success && response.data) {
        setStats({
          userCount: response.data.userCount || 0,
          foodCount: response.data.foodCount || 0,
          mealSetCount: response.data.mealSetCount || 0,
          configCount: response.data.configCount || 0,
          todayCheckIns: response.data.todayCheckIns || 0,
        });
      }
    } catch (error) {
      console.error('加载仪表盘失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出管理员账户吗？',
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: logout, style: 'destructive' },
      ]
    );
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
        {/* 顶部标题栏 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>管理后台</Text>
            <Text style={styles.headerSubtitle}>FitBitePal Admin</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>退出</Text>
          </TouchableOpacity>
        </View>

        {/* 统计卡片 */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#4F46E5' }]}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statNumber}>{stats.userCount}</Text>
            <Text style={styles.statLabel}>注册用户</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
            <Text style={styles.statIcon}>🍎</Text>
            <Text style={styles.statNumber}>{stats.foodCount}</Text>
            <Text style={styles.statLabel}>食品库</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.statIcon}>🍱</Text>
            <Text style={styles.statNumber}>{stats.mealSetCount}</Text>
            <Text style={styles.statLabel}>套餐数</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statNumber}>{stats.todayCheckIns}</Text>
            <Text style={styles.statLabel}>今日打卡</Text>
          </View>
        </View>

        {/* 功能入口 */}
        <Text style={styles.sectionTitle}>管理功能</Text>
        
        <View style={styles.menuGrid}>
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate('AdminMealSets')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.menuEmoji}>🍱</Text>
            </View>
            <Text style={styles.menuTitle}>套餐管理</Text>
            <Text style={styles.menuDesc}>管理饮食推荐套餐</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate('AdminFoods')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#D1FAE5' }]}>
              <Text style={styles.menuEmoji}>🥗</Text>
            </View>
            <Text style={styles.menuTitle}>食品库</Text>
            <Text style={styles.menuDesc}>管理食品营养数据</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate('AdminUsers')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#E0E7FF' }]}>
              <Text style={styles.menuEmoji}>👥</Text>
            </View>
            <Text style={styles.menuTitle}>用户管理</Text>
            <Text style={styles.menuDesc}>查看注册用户信息</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate('AdminConfigs')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.menuEmoji}>⚙️</Text>
            </View>
            <Text style={styles.menuTitle}>系统配置</Text>
            <Text style={styles.menuDesc}>AI模型参数配置</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  menuCard: {
    width: '48%',
    margin: '1%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuEmoji: {
    fontSize: 28,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default AdminDashboardScreen;

