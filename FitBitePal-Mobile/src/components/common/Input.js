import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useAppState } from '../../contexts';

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  style,
  inputStyle,
  ...props
}) => {
  const { fontSizeConfig } = useAppState();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { fontSize: fontSizeConfig.label }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          { fontSize: fontSizeConfig.body },
          error && styles.inputError,
          inputStyle,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#666"
        {...props}
      />
      {error && (
        <Text style={[styles.errorText, { fontSize: fontSizeConfig.caption }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    marginTop: 4,
  },
});

