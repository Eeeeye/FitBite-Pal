import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useAppState } from '../contexts';
import { useAuth } from '../contexts/AuthContext';
import { OnboardingProgress } from '../components/OnboardingProgress';

export const GenderScreen = ({ navigation }) => {
  const { currentLanguage } = useAppState();
  const { userId } = useAuth(); // 🔍 获取当前userId用于调试
  const [selectedGender, setSelectedGender] = useState('');

  // userId 变化监听（已移除日志）

  const handleNext = () => {
    if (selectedGender) {
      navigation.navigate('Age', { gender: selectedGender });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {currentLanguage === 'zh' ? '选择性别' : 'Choose your gender'}
          </Text>
          <Text style={styles.subtitle}>
            {currentLanguage === 'zh' ? '告诉我们你的性别以定制训练' : 'Let us know your gender to customize training'}
          </Text>
        </View>

        <View style={styles.genderContainer}>
          <TouchableOpacity 
            style={[styles.genderOption, selectedGender === 'male' && styles.genderOptionSelected]}
            onPress={() => setSelectedGender('male')}
          >
            <Image
              source={selectedGender === 'male'
                ? require('../../assets/images/bdbea0e5387a787fadf4f2de2003c286.png')
                : require('../../assets/images/0bccf4b9476ad9186dd1d8a112f69f00.png')
              }
              style={styles.genderImage}
              resizeMode="contain"
            />
            <Text style={[styles.genderText, selectedGender === 'male' && styles.genderTextSelected]}>
              {currentLanguage === 'zh' ? '男' : 'Male'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.genderOption, selectedGender === 'female' && styles.genderOptionSelected]}
            onPress={() => setSelectedGender('female')}
          >
            <Image
              source={selectedGender === 'female'
                ? require('../../assets/images/6a4f2b1f312288fe877fd29b70eae526.png')
                : require('../../assets/images/da799e84d0511fa76660cc881be2296e.png')
              }
              style={styles.genderImage}
              resizeMode="contain"
            />
            <Text style={[styles.genderText, selectedGender === 'female' && styles.genderTextSelected]}>
              {currentLanguage === 'zh' ? '女' : 'Female'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.screenBottomButtons}>
          <TouchableOpacity style={styles.screenBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.screenNextButton, !selectedGender && styles.buttonDisabled]} 
            onPress={handleNext}
            disabled={!selectedGender}
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
        <OnboardingProgress currentStep={1} totalSteps={7} />
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
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  genderContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  genderOption: {
    backgroundColor: '#2a2a2a',
    borderRadius: 80,
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#444',
    marginVertical: 15,
  },
  genderOptionSelected: {
    borderColor: '#a4ff3e',
    backgroundColor: '#a4ff3e',
  },
  genderImage: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  genderTextSelected: {
    color: '#000',
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
