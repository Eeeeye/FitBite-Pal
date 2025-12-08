import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { useAppState } from '../contexts';
import { OnboardingProgress } from '../components/OnboardingProgress';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = 10;
const PADDING = SCREEN_WIDTH / 2;

export const WeightScreen = ({ navigation, route }) => {
  const { currentLanguage } = useAppState();
  const { gender, age } = route.params || {};
  
  const [weight, setWeight] = useState('90');
  
  const weights = Array.from({ length: 151 }, (_, i) => i + 30); // 30-180kg
  const currentWeight = weight ? parseInt(weight) : 90;

  const handleNext = () => {
    if (weight) {
      // ✅ 传递显示值（currentWeight - 3），而不是原始值
      const actualWeight = currentWeight - 3;
      navigation.navigate('Height', { gender, age, weight: actualWeight.toString() });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {currentLanguage === 'zh' ? '你的体重是多少？' : "What's your weight?"}
        </Text>
        <Text style={styles.subtitle}>
          {currentLanguage === 'zh' ? '你可以稍后随时更改' : 'You can always change this later'}
        </Text>

        {/* 当前体重显示 - 加3使其与刻度对齐 */}
        <View style={styles.weightDisplay}>
          <Text style={styles.weightValue}>{currentWeight - 3}</Text>
          <Text style={styles.weightUnit}>kg</Text>
        </View>

        {/* 横向刻度选择器 */}
        <View style={styles.weightRulerContainer}>
          <View style={styles.weightRulerIndicator} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weightRulerContent}
            onScroll={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / ITEM_WIDTH);
              const newWeight = Math.max(30, Math.min(186, 30 + index));
              setWeight(newWeight.toString());
            }}
            scrollEventThrottle={16}
          >
            <View style={{ width: PADDING }} />
            {weights.map((w) => (
              <View key={w} style={styles.rulerMarkItem}>
                {w % 10 === 0 ? (
                  <View style={styles.rulerMarkContainer}>
                    <View style={styles.rulerLineMajor} />
                    <Text style={styles.rulerText}>{w}</Text>
                  </View>
                ) : w % 5 === 0 ? (
                  <View style={styles.rulerLineMedium} />
                ) : (
                  <View style={styles.rulerLine} />
                )}
              </View>
            ))}
            <View style={{ width: PADDING }} />
          </ScrollView>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.screenBottomButtons}>
          <TouchableOpacity style={styles.screenBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.screenNextButton, !weight && styles.buttonDisabled]} 
            onPress={handleNext}
            disabled={!weight}
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
        <OnboardingProgress currentStep={3} totalSteps={7} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
    justifyContent: 'center',
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
  weightDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 40,
  },
  weightValue: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#a4ff3e',
  },
  weightUnit: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#a4ff3e',
    marginLeft: 8,
  },
  weightRulerContainer: {
    height: 100,
    position: 'relative',
  },
  weightRulerIndicator: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 20,
    width: 3,
    backgroundColor: '#a4ff3e',
    zIndex: 2,
    pointerEvents: 'none',
  },
  weightRulerContent: {
    alignItems: 'flex-end',
  },
  rulerMarkItem: {
    width: ITEM_WIDTH,
    height: 80,
    justifyContent: 'flex-end',
  },
  rulerMarkContainer: {
    alignItems: 'center',
  },
  rulerLineMajor: {
    width: 2,
    height: 40,
    backgroundColor: '#a4ff3e',
  },
  rulerLineMedium: {
    width: 2,
    height: 25,
    backgroundColor: '#666',
  },
  rulerLine: {
    width: 1,
    height: 15,
    backgroundColor: '#444',
  },
  rulerText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
