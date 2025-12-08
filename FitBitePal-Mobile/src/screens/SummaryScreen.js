import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Card } from '../components/common';

export const SummaryScreen = ({ navigation, route }) => {
  const { exercise, score, reps, calories, duration } = route.params || {};

  const getPerformanceLevel = (score) => {
    if (score >= 90) return { level: 'Excellent', emoji: '🏆', color: '#d0fd3e' };
    if (score >= 75) return { level: 'Great', emoji: '⭐', color: '#4CAF50' };
    if (score >= 60) return { level: 'Good', emoji: '👍', color: '#FFC107' };
    return { level: 'Keep Trying', emoji: '💪', color: '#FF9800' };
  };

  const performance = getPerformanceLevel(score || 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Workout Complete!</Text>
      </View>

      {/* Performance Score */}
      <Card style={styles.scoreCard}>
        <Text style={styles.performanceEmoji}>{performance.emoji}</Text>
        <Text style={styles.performanceLevel}>{performance.level}</Text>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreText, { color: performance.color }]}>
            {score || 0}
          </Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
      </Card>

      {/* Exercise Name */}
      <Card>
        <Text style={styles.exerciseName}>{exercise?.name || 'Exercise'}</Text>
      </Card>

      {/* Stats Grid */}
      <Card>
        <Text style={styles.sectionTitle}>Workout Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{duration || 0}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{reps || 0}</Text>
            <Text style={styles.statLabel}>Reps</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{calories || 0}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{score || 0}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>
      </Card>

      {/* Achievements */}
      <Card>
        <Text style={styles.sectionTitle}>Today's Achievements</Text>
        <View style={styles.achievement}>
          <Text style={styles.achievementEmoji}>🎯</Text>
          <Text style={styles.achievementText}>Workout Completed</Text>
        </View>
        {score >= 80 && (
          <View style={styles.achievement}>
            <Text style={styles.achievementEmoji}>⭐</Text>
            <Text style={styles.achievementText}>High Performance</Text>
          </View>
        )}
        {reps >= 10 && (
          <View style={styles.achievement}>
            <Text style={styles.achievementEmoji}>💪</Text>
            <Text style={styles.achievementText}>Rep Master</Text>
          </View>
        )}
      </Card>

      {/* Feedback */}
      <Card>
        <Text style={styles.sectionTitle}>AI Feedback</Text>
        <Text style={styles.feedbackText}>
          {score >= 90
            ? "Outstanding form! Your technique is excellent. Keep maintaining this level!"
            : score >= 75
            ? "Great job! Your form is solid. Small improvements will make you even better!"
            : score >= 60
            ? "Good effort! Focus on maintaining proper posture and controlled movements."
            : "Keep practicing! Remember to focus on form over speed. You're making progress!"}
        </Text>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Share Progress"
          onPress={() => {
            // TODO: Implement share functionality
            alert('Share feature coming soon!');
          }}
          variant="secondary"
        />
        <Button title="Back to Home" onPress={() => navigation.navigate('Home')} />
      </View>
    </ScrollView>
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
    padding: 20,
    paddingTop: 50,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d0fd3e',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  scoreCard: {
    alignItems: 'center',
    padding: 30,
  },
  performanceEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  performanceLevel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    borderColor: '#d0fd3e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#999',
    marginTop: 5,
  },
  exerciseName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0a0a0a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d0fd3e',
  },
  statLabel: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  achievementEmoji: {
    fontSize: 30,
    marginRight: 15,
  },
  achievementText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
  actions: {
    padding: 20,
    gap: 12,
    marginBottom: 40,
  },
});

