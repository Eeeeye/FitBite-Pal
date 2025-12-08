import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppState } from '../../contexts';

export const Button = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary', // primary, secondary, outline
  style,
  textStyle,
  ...props
}) => {
  const { fontSizeConfig } = useAppState();

  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'text':
        return styles.textButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'text':
        return styles.textText;
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#000' : '#d0fd3e'}
        />
      ) : (
        <Text
          style={[
            styles.text,
            getTextStyle(),
            { fontSize: fontSizeConfig.button },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#d0fd3e',
  },
  secondaryButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#d0fd3e',
  },
  textButton: {
    backgroundColor: 'transparent',
    padding: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: 'bold',
  },
  primaryText: {
    color: '#000',
  },
  secondaryText: {
    color: '#fff',
  },
  outlineText: {
    color: '#d0fd3e',
  },
  textText: {
    color: '#999',
  },
});

