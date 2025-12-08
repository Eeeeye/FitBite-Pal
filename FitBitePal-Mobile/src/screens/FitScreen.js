import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useUserProfile, useData, useAppState } from '../contexts';
import { Card } from '../components/common';
import { t } from '../../services/i18n';
import { translateExerciseName } from '../utils/exerciseTranslations';

export const FitScreen = ({ navigation }) => {
  const { trainingPlan, loadTrainingPlan, loading } = useUserProfile();
  const { completedExercises, saveCompletion, selectedDate } = useData();
  const { fontSizeConfig, currentLanguage } = useAppState();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrainingPlan();
  }, []);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayKey = formatDate(selectedDate);
  const todayCompletions = completedExercises[todayKey] || {};

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTrainingPlan();
    setRefreshing(false);
  };

  const handleToggleCompletion = async (index) => {
    const isCompleted = todayCompletions[index];
    await saveCompletion('training', todayKey, index, !isCompleted);
  };

  const handleExercisePress = (exercise, index) => {
    // TODO: 导航到训练详情页或姿态识别页
    // navigation.navigate('TrainingDetail', { exercise, index });
  };

  // ✅ 已删除本地翻译函数，使用统一的 translateExerciseName 工具

  const completedCount = Object.values(todayCompletions).filter(Boolean).length;
  const totalCount = trainingPlan.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount * 100).toFixed(0) : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#d0fd3e"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: fontSizeConfig.title * 1.5 }]}>
            {t('training')}
          </Text>
          <Text style={[styles.date, { fontSize: fontSizeConfig.body }]}>
            {selectedDate.toLocaleDateString()}
          </Text>
        </View>

        {/* Progress Card */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { fontSize: fontSizeConfig.title }]}>
              {t('todayProgress')}
            </Text>
            <Text style={[styles.progressPercent, { fontSize: fontSizeConfig.title * 1.5 }]}>
              {completionRate}%
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
          </View>
          
          <Text style={[styles.progressText, { fontSize: fontSizeConfig.body }]}>
            {completedCount} / {totalCount} {t('exercisesCompleted')}
          </Text>
        </Card>

        {/* Training List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: fontSizeConfig.title }]}>
            {t('todayTraining')}
          </Text>

          {trainingPlan.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { fontSize: fontSizeConfig.body }]}>
                {t('noTrainingToday')}
              </Text>
              <TouchableOpacity style={styles.emptyButton}>
                <Text style={[styles.emptyButtonText, { fontSize: fontSizeConfig.button }]}>
                  {t('createPlan')}
                </Text>
              </TouchableOpacity>
            </Card>
          ) : (
            trainingPlan.map((exercise, index) => {
              const isCompleted = todayCompletions[index];
              
              return (
                <Card
                  key={index}
                  style={[styles.exerciseCard, isCompleted && styles.exerciseCardCompleted]}
                  onPress={() => handleExercisePress(exercise, index)}
                >
                  <View style={styles.exerciseContent}>
                    <View style={styles.exerciseLeft}>
                      <Image
                        source={require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png')}
                        style={styles.exerciseIcon}
                      />
                      <View style={styles.exerciseInfo}>
                        <Text
                          style={[
                            styles.exerciseName,
                            { fontSize: fontSizeConfig.subtitle },
                            isCompleted && styles.exerciseNameCompleted,
                          ]}
                        >
                          {translateExerciseName(exercise.name, currentLanguage)}
                        </Text>
                        <View style={styles.exerciseDetails}>
                          <Text style={[styles.exerciseDetail, { fontSize: fontSizeConfig.caption }]}>
                            ⏱️ {exercise.duration || exercise.sets + ' sets'}
                          </Text>
                          <Text style={[styles.exerciseDetail, { fontSize: fontSizeConfig.caption }]}>
                            🔥 {exercise.calories} {t('kcal')}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.checkButton,
                        isCompleted && styles.checkButtonCompleted,
                      ]}
                      onPress={() => handleToggleCompletion(index)}
                    >
                      {isCompleted && (
                        <Text style={styles.checkIcon}>✓</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: '#d0fd3e',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    color: '#999',
  },
  progressCard: {
    margin: 16,
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressPercent: {
    color: '#d0fd3e',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d0fd3e',
  },
  progressText: {
    color: '#999',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#d0fd3e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  exerciseCard: {
    marginBottom: 12,
    padding: 16,
  },
  exerciseCardCompleted: {
    opacity: 0.6,
    borderColor: '#d0fd3e',
  },
  exerciseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseIcon: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseDetail: {
    color: '#999',
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonCompleted: {
    backgroundColor: '#d0fd3e',
    borderColor: '#d0fd3e',
  },
  checkIcon: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

