import apiClient from './client';

const AUTH_BASE = '/auth';

export const login = (payload) =>
  apiClient.post(`${AUTH_BASE}/login`, payload);

export const register = (payload) =>
  apiClient.post(`${AUTH_BASE}/register`, payload);

export const sendResetCode = (payload) =>
  apiClient.post(`${AUTH_BASE}/send-reset-code`, payload);

export const verifyCode = (payload) =>
  apiClient.post(`${AUTH_BASE}/verify-code`, payload);

export const resetPassword = (payload) =>
  apiClient.post(`${AUTH_BASE}/reset-password`, payload);


