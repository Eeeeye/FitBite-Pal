import AsyncStorage from '@react-native-async-storage/async-storage';
import device from './sessionDevice';
import { createSessionStore } from './createSessionStore';

export const sessionStore = createSessionStore(AsyncStorage, device);
