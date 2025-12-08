import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAppState } from '../contexts';
import { OnboardingProgress } from '../components/OnboardingProgress';

export const ActivityScreen = ({ navigation, route }) => {
  const { currentLanguage } = useAppState();
  const { gender, age, weight, height, goal } = route.params || {};
  
  const activitiesEn = ['Rookie', 'Beginner', 'Intermediate', 'Advance', 'True Beast'];
  const activitiesZh = ['新手', '初学者', '中级', '高级', '专家'];
  const activities = currentLanguage === 'zh' ? activitiesZh : activitiesEn;
  
  const [selectedActivity, setSelectedActivity] = useState(activities[2]); // Default: Intermediate
  const scrollViewRef = useRef(null);

  useEffect(() => {
    // 初始化时滚动到默认活动水平
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 120, // 滚动到第三项
        animated: false,
      });
    }, 100);
  }, []);

  const handleScroll = (event) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / 60);
    if (index >= 0 && index < activities.length) {
      setSelectedActivity(activities[index]);
    }
  };

  const handleNext = () => {
    if (selectedActivity) {
      navigation.navigate('Duration', { gender, age, weight, height, goal, activity: selectedActivity });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.ageContent}>
        <Text style={styles.title}>
          {currentLanguage === 'zh' ? '你的日常活动水平？' : 'Your regular physical activity level?'}
        </Text>
        <Text style={styles.subtitle}>
          {currentLanguage === 'zh' ? '这有助于我们创建你的个性化计划' : 'This helps us create your personalized plan'}
        </Text>

        {/* 活动水平滚动选择器 */}
        <View style={styles.agePickerContainer}>
          <View style={styles.agePickerHighlight} />
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={60}
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.agePickerContent}
          >
            <View style={{ height: 120 }} />
            {activities.map((a) => (
              <View key={a} style={styles.ageItem}>
                <Text
                  style={[
                    styles.optionText,
                    selectedActivity === a && styles.optionTextSelected,
                  ]}
                >
                  {a}
                </Text>
              </View>
            ))}
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.screenBottomButtons}>
          <TouchableOpacity style={styles.screenBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.screenNextButton, !selectedActivity && styles.buttonDisabled]} 
            onPress={handleNext}
            disabled={!selectedActivity}
          >
            <Text style={styles.nextButtonText}>
              {currentLanguage === 'zh' ? '下一步' : 'Next'}
            </Text>
            <Image
              source={require('../../assets/images/f9c2b6e3431fd609930d93a7eb32c77b.png')}
              style={styles.nextArrowIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        <OnboardingProgress currentStep={6} totalSteps={7} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  ageContent: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 60,
    textAlign: 'left',
  },
  agePickerContainer: {
    height: 300,
    position: 'relative',
    justifyContent: 'center',
  },
  agePickerHighlight: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 60,
    marginTop: -30,
    backgroundColor: 'rgba(164, 255, 62, 0.1)',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#a4ff3e',
    zIndex: 1,
    pointerEvents: 'none',
  },
  agePickerContent: {
    paddingHorizontal: 20,
  },
  ageItem: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  optionTextSelected: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  screenBottomButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  screenBackButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: '#a4ff3e',
    fontWeight: 'bold',
  },
  screenNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a4ff3e',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginLeft: 16,
  },
  buttonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
  },
  nextArrowIcon: {
    width: 20,
    height: 20,
  },
});
