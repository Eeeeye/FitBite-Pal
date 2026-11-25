import { Platform } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { login as loginApi, register as registerApi } from '../api/auth';
import { fetchUserProfile } from '../api/user';
import apiClient from '../api/client';
import { initServerConfig } from '../../services/serverConfig';
import { sessionStore } from '../storage/sessionStore';

const AuthContext = createContext();
const superseded = { success: false, message: '登录状态已更改' };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

function incomplete(profile) {
  return !['gender', 'age', 'weight', 'height', 'goal', 'activityLevel', 'trainingDuration']
    .every(field => profile[field]);
}

export const AuthProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const generation = useRef(0);

  const logout = useCallback(async (expired = false) => {
    const ticket = ++generation.current;
    const previousToken = apiClient.token;
    apiClient.token = null;
    if (expired) setAccount(null);
    setLoading(false);
    setIsCheckingAuth(false);
    try {
      await sessionStore.clear();
    } catch (error) {
      if (!expired && ticket === generation.current) apiClient.token = previousToken;
      throw error;
    }
    if (ticket === generation.current) setAccount(null);
  }, []);

  useEffect(() => {
    const ticket = ++generation.current;
    apiClient.onUnauthorized = () => { logout(true).catch(() => console.warn('Could not remove saved session')); };
    async function restore() {
      try {
        await initServerConfig();
        const saved = await sessionStore.restore(apiClient.baseURL);
        if (!saved || generation.current !== ticket) return;
        apiClient.token = saved.token;
        let onboarding = false;
        try {
          const response = await fetchUserProfile(saved.userId);
          if (generation.current !== ticket) return;
          if (response.data?.role === 'ADMIN') { await logout(true); return; }
          if (response.success && response.data) onboarding = incomplete(response.data);
        } catch (error) {
          if (generation.current !== ticket) return;
          if ([401, 403, 404].includes(error.status)) { await logout(true); return; }
        }
        if (generation.current === ticket) setAccount({ ...saved, role: 'USER', onboarding });
      } catch {
        // Leave the account signed out if its credential cannot be restored.
      } finally {
        if (generation.current === ticket) setIsCheckingAuth(false);
      }
    }
    restore();
    return () => {
      generation.current++;
      apiClient.onUnauthorized = null;
    };
  }, [logout]);

  useEffect(() => {
    if (!account || Platform.OS !== 'web' || typeof BroadcastChannel !== 'function') return;
    const channel = new BroadcastChannel('fitbite.account-deleted.v1');
    channel.onmessage = ({ data }) => {
      if (data?.server === account.server && data?.userId === account.userId && apiClient.token === account.token) {
        logout(true).catch(() => console.warn('Could not remove saved session'));
      }
    };
    return () => channel.close();
  }, [account, logout]);

  async function authenticate(request, registering) {
    const ticket = ++generation.current;
    const server = apiClient.baseURL;
    setLoading(true);
    try {
      const response = await request();
      if (generation.current !== ticket || server !== apiClient.baseURL) return superseded;
      if (!response.success || !response.data) return { success: false, message: response.message };
      const { userId, token, role = 'USER' } = response.data;
      const isAdmin = role === 'ADMIN';
      await sessionStore.clear();
      if (generation.current !== ticket) return superseded;
      apiClient.token = token;
      let onboarding = registering;
      if (!registering && !isAdmin) {
        try {
          const profile = await fetchUserProfile(userId);
          if (profile.success && profile.data) onboarding = incomplete(profile.data);
        } catch (error) {
          if ([401, 403, 404].includes(error.status)) throw error;
        }
      }
      if (generation.current !== ticket) return superseded;
      if (!isAdmin && !onboarding) await sessionStore.save(server, userId, token);
      if (generation.current !== ticket) return superseded;
      setAccount({ server, userId, token, role, onboarding });
      return { success: true, data: response.data, userId, isAdmin, needsOnboarding: onboarding };
    } catch (error) {
      if (generation.current === ticket) apiClient.token = null;
      return { success: false, message: error?.data?.message || error.message || '登录失败' };
    } finally {
      if (generation.current === ticket) setLoading(false);
    }
  }

  const login = (usernameOrEmail, password) => authenticate(() => loginApi({ usernameOrEmail, password }), false);
  const register = (username, email, password) => authenticate(() => registerApi({ username, email, password }), true);
  const completeOnboarding = async () => {
    if (!account) return;
    const ticket = generation.current;
    await sessionStore.save(account.server, account.userId, account.token);
    if (generation.current === ticket) setAccount({ ...account, onboarding: false });
  };

  const value = {
    userId: account?.userId, userToken: account?.token, userRole: account?.role || 'USER',
    server: account?.server, loading, isCheckingAuth, isAuthenticated: !!account,
    isAdmin: account?.role === 'ADMIN', needsOnboarding: !!account?.onboarding,
    completeOnboarding, login, register, logout,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
