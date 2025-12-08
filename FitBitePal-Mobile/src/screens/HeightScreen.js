import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAppState } from '../contexts';
import { OnboardingProgress } from '../components/OnboardingProgress';

export const HeightScreen = ({ navigation, route }) => {
  const { currentLanguage } = useAppState();
  const { gender, age, weight } = route.params || {};
  
  const [height, setHeight] = useState('170');
  const scrollViewRef = useRef(null);
  
  const heights = Array.from({ length: 91 }, (_, i) => i + 140); // 140-230cm

  useEffect(() => {
    // 初始化时滚动到默认身高
    const index = heights.indexOf(170);
    if (index !== -1 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: index * 60,
          animated: false,
        });
      }, 100);
    }
  }, []);

  const handleScroll = (event) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / 60);
    if (index >= 0 && index < heights.length) {
      setHeight(heights[index].toString());
    }
  };

  const handleNext = () => {
    if (height) {
      navigation.navigate('Goal', { gender, age, weight, height });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.ageContent}>
        <Text style={styles.title}>
          {currentLanguage === 'zh' ? '你的身高是多少？' : "What's your height?"}
        </Text>
        <Text style={styles.subtitle}>
          {currentLanguage === 'zh' ? '这有助于我们创建你的个性化计划' : 'This helps us create your personalized plan'}
        </Text>

        {/* 身高滚动选择器 */}
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
            {heights.map((h) => (
              <View key={h} style={styles.ageItem}>
                <Text
                  style={[
                    styles.ageText,
                    height === h.toString() && styles.ageTextSelected,
                  ]}
                >
                  {h}
                </Text>
              </View>
            ))}
            <View style={{ height: 120 }} />
          </ScrollView>
          <Text style={styles.pickerUnit}>cm</Text>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.screenBottomButtons}>
          <TouchableOpacity style={styles.screenBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.screenNextButton, !height && styles.buttonDisabled]} 
            onPress={handleNext}
            disabled={!height}
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
        <OnboardingProgress currentStep={4} totalSteps={7} />
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
  ageText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#666',
  },
  ageTextSelected: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  pickerUnit: {
    position: 'absolute',
    right: 60,
    top: '50%',
    marginTop: -20,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#a4ff3e',
    zIndex: 2,
    pointerEvents: 'none',
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
