import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useData } from '../contexts/DataContext';
import { useAppState } from '../contexts/AppStateContext';

export const ExerciseDetailScreen = ({ navigation, route }) => {
  const { exercise } = route.params || {};
  const { markExerciseComplete } = useData();
  const { currentLanguage } = useAppState();

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Exercise not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleStartPose = () => {
    navigation.navigate('PoseRecognition', { exercise });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.homeScrollView}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHeader}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle}>{exercise.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 训练图片/动图 */}
        <View style={styles.exerciseImageContainer}>
          <Image
            source={
              exercise.image
                ? (typeof exercise.image === 'string' ? { uri: exercise.image } : exercise.image)
                : require('../../assets/images/7b595f3920b06bb4493cb25f9b6c7433.png')
            }
            style={styles.exerciseImage}
            resizeMode="cover"
          />
          <View style={styles.exerciseOverlay}>
            <Text style={styles.exerciseDuration}>{exercise.duration}</Text>
            <Text style={styles.exerciseCalories}>{exercise.calories} kcal</Text>
          </View>
        </View>

        {/* 训练信息 */}
        <View style={styles.exerciseInfoCard}>
          <Text style={styles.cardTitle}>
            {currentLanguage === 'zh' ? '训练信息' : 'Training Info'}
          </Text>
          <View style={styles.divider} />
          <View style={styles.exerciseStatsRow}>
            <View style={styles.exerciseStatItem}>
              <Text style={styles.exerciseStatLabel}>
                {currentLanguage === 'zh' ? '组数' : 'Sets'}
              </Text>
              <Text style={styles.exerciseStatValue}>{exercise.sets || 3}</Text>
            </View>
            <View style={styles.exerciseStatItem}>
              <Text style={styles.exerciseStatLabel}>
                {currentLanguage === 'zh' ? '次数' : 'Reps'}
              </Text>
              <Text style={styles.exerciseStatValue}>{exercise.reps || 12}</Text>
            </View>
            <View style={styles.exerciseStatItem}>
              <Text style={styles.exerciseStatLabel}>
                {currentLanguage === 'zh' ? '时长' : 'Duration'}
              </Text>
              <Text style={styles.exerciseStatValue}>{exercise.duration}</Text>
            </View>
          </View>
        </View>

        {/* 动作列表 */}
        <View style={styles.exerciseInfoCard}>
          <Text style={styles.cardTitle}>
            {currentLanguage === 'zh' ? '动作步骤' : 'Action Steps'}
          </Text>
          <View style={styles.divider} />
          <View style={styles.actionStepsList}>
            <View style={styles.actionStep}>
              <View style={styles.actionStepNumber}>
                <Text style={styles.actionStepNumberText}>1</Text>
              </View>
              <Text style={styles.actionStepText}>
                {currentLanguage === 'zh' ? '双脚与肩同宽站立，收紧核心' : 'Stand with feet shoulder-width apart, core engaged'}
              </Text>
            </View>
            <View style={styles.actionStep}>
              <View style={styles.actionStepNumber}>
                <Text style={styles.actionStepNumberText}>2</Text>
              </View>
              <Text style={styles.actionStepText}>
                {currentLanguage === 'zh' ? '屈膝下蹲，保持背部挺直' : 'Lower your body by bending knees, keep back straight'}
              </Text>
            </View>
            <View style={styles.actionStep}>
              <View style={styles.actionStepNumber}>
                <Text style={styles.actionStepNumberText}>3</Text>
              </View>
              <Text style={styles.actionStepText}>
                {currentLanguage === 'zh' ? '用脚跟发力回到起始位置' : 'Push through heels to return to starting position'}
              </Text>
            </View>
            <View style={styles.actionStep}>
              <View style={styles.actionStepNumber}>
                <Text style={styles.actionStepNumberText}>4</Text>
              </View>
              <Text style={styles.actionStepText}>
                {currentLanguage === 'zh' ? '向上时呼气，向下时吸气' : 'Exhale on the way up, inhale on the way down'}
              </Text>
            </View>
          </View>
        </View>

        {/* 训练说明 */}
        <View style={styles.exerciseInfoCard}>
          <Text style={styles.cardTitle}>
            {currentLanguage === 'zh' ? '运动说明' : 'Exercise Description'}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.exerciseDescription}>
            {exercise.description || (currentLanguage === 'zh' ? 
              '这个练习针对你的核心肌肉，有助于提高整体力量和稳定性。\n\n在整个动作过程中注重正确的姿势和呼吸。保持背部挺直，收紧核心。' : 
              'This exercise targets your core muscles and helps improve overall strength and stability.\n\nFocus on proper form and breathing throughout the movement. Keep your back straight and engage your core.')}
          </Text>
        </View>

        {/* 开始训练按钮 */}
        <TouchableOpacity 
          style={styles.startTrainingButton}
          onPress={handleStartPose}
        >
          <Text style={styles.startTrainingButtonText}>
            {currentLanguage === 'zh' ? '开始AI教练训练' : 'Start Training with AI Coach'}
          </Text>
          <Text style={styles.startTrainingSubtext}>
            {currentLanguage === 'zh' ? '实时姿态纠正' : 'Real-time pose correction'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  homeScrollView: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: '#a4ff3e',
    fontWeight: 'bold',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  exerciseImageContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
    marginBottom: 20,
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  exerciseOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseDuration: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  exerciseCalories: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  exerciseInfoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a4ff3e',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#444',
    marginBottom: 16,
  },
  exerciseStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  exerciseStatItem: {
    alignItems: 'center',
  },
  exerciseStatLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  exerciseStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionStepsList: {
    gap: 16,
  },
  actionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#a4ff3e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  actionStepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  actionStepText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    lineHeight: 24,
  },
  exerciseDescription: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 24,
  },
  startTrainingButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  startTrainingButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  startTrainingSubtext: {
    fontSize: 14,
    color: '#000',
    opacity: 0.7,
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#a4ff3e',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
});
