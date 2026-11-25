import * as SecureStore from 'expo-secure-store';

const key = 'fitbite.session.v2';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export default {
  get: () => SecureStore.getItemAsync(key, options),
  set: value => SecureStore.setItemAsync(key, value, options),
  remove: () => SecureStore.deleteItemAsync(key, options),
};
