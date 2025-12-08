import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

export const Card = ({
  children,
  onPress,
  style,
  variant = 'default', // default, highlighted
  ...props
}) => {
  const Container = onPress ? TouchableOpacity : View;

  const getCardStyle = () => {
    switch (variant) {
      case 'highlighted':
        return styles.highlightedCard;
      default:
        return styles.defaultCard;
    }
  };

  return (
    <Container
      style={[styles.card, getCardStyle(), style]}
      onPress={onPress}
      {...props}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  defaultCard: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  highlightedCard: {
    backgroundColor: '#1a1a1a',
    borderColor: '#d0fd3e',
  },
});

