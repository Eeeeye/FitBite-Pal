import { Alert, Platform } from 'react-native';

export function confirmLocalAction(title, message, cancel, confirm, action) {
  if (Platform.OS === 'web') {
    if (window.confirm(title + '\n' + message)) action();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: confirm, style: 'destructive', onPress: action },
  ]);
}
