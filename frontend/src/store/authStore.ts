/**
 * Auth Store - Zustand state management for authentication
 */

import { create } from 'zustand';
import apiService from '../services/api';
import type { User } from '../types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  needsVerification: boolean;
  unverifiedEmail: string | null;

  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; firstName: string; lastName: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  clearVerification: () => void;
  loadUser: () => Promise<void>;
  updateProfile: (data: { firstName?: string; lastName?: string; avatarUrl?: string; notificationPreferences?: any; aiSettings?: any }) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  clearError: () => void;
}

const getInitialToken = () => {
  if (typeof localStorage !== 'undefined') return localStorage.getItem('token');
  return null;
};

const formatErrorMessage = (err: any, fallback: string): string => {
  const data = err?.response?.data;
  if (!data) {
    if (typeof err?.message === 'string') return err.message;
    return fallback;
  }
  if (typeof data.error === 'string') return data.error;
  if (typeof data.message === 'string') return data.message;
  if (typeof data === 'string') return data;
  if (typeof data.error === 'object' && data.error !== null) {
    return data.error.message || JSON.stringify(data.error);
  }
  return fallback;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getInitialToken(),
  refreshToken:
    typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null,
  isAuthenticated: !!getInitialToken(),
  loading: false,
  error: null,
  needsVerification: false,
  unverifiedEmail: null,

  login: async (identifier, password) => {
    set({ loading: true, error: null });
    try {
      const resp = await apiService.login(identifier, password);
      const { user, accessToken, refreshToken } = resp.data.data;
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, token: accessToken, refreshToken, isAuthenticated: true, needsVerification: false, loading: false });
    } catch (err: any) {
      const apiError = err?.response?.data;
      if (apiError?.emailVerified === false) {
        set({ loading: false, needsVerification: true, unverifiedEmail: identifier.includes('@') ? identifier : null });
        set({ error: 'Email not verified. Please check your inbox or request a new verification link.' });
        throw err;
      }
      set({ loading: false, error: formatErrorMessage(err, 'Login failed. Please check backend connection.') });
      throw err;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const resp = await apiService.register(data);
      const { user } = resp.data.data;
      set({ user, needsVerification: true, unverifiedEmail: data.email, loading: false });
    } catch (err: any) {
      set({ loading: false, error: formatErrorMessage(err, 'Registration failed') });
      throw err;
    }
  },

  verifyEmail: async (token: string) => {
    set({ loading: true, error: null });
    try {
      await apiService.verifyEmail(token);
      set({ needsVerification: false, unverifiedEmail: null, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err?.response?.data?.error || 'Verification failed' });
      throw err;
    }
  },

  resendVerification: async (email: string) => {
    set({ loading: true, error: null });
    try {
      await apiService.resendVerification(email);
      set({ loading: false });
    } catch (err: any) {
      set({ loading: false, error: err?.response?.data?.error || 'Failed to resend verification email' });
      throw err;
    }
  },

  forgotPassword: async (email: string) => {
    set({ loading: true, error: null });
    try {
      await apiService.forgotPassword(email);
      set({ loading: false });
    } catch (err: any) {
      set({ loading: false, error: err?.response?.data?.error || 'Failed to send reset email' });
      throw err;
    }
  },

  resetPassword: async (token: string, password: string) => {
    set({ loading: true, error: null });
    try {
      await apiService.resetPassword(token, password);
      set({ loading: false });
    } catch (err: any) {
      set({ loading: false, error: err?.response?.data?.error || 'Failed to reset password' });
      throw err;
    }
  },

  clearVerification: () => set({ needsVerification: false, unverifiedEmail: null }),

  logout: async () => {
    const refreshToken = get().refreshToken;
    try {
      if (refreshToken) await apiService.logout(refreshToken);
    } catch {
      /* ignore */
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  loadUser: async () => {
    if (!get().token) return;
    try {
      const resp = await apiService.getProfile();
      set({ user: resp.data.data, isAuthenticated: true });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    }
  },

  updateProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      const resp = await apiService.updateProfile(data);
      const updatedUser = resp.data.data;
      set({ user: updatedUser, loading: false });
    } catch (err: any) {
      set({ loading: false, error: formatErrorMessage(err, 'Failed to update profile') });
      throw err;
    }
  },

  changePassword: async (data) => {
    set({ loading: true, error: null });
    try {
      await apiService.changePassword(data);
      set({ loading: false });
    } catch (err: any) {
      set({ loading: false, error: formatErrorMessage(err, 'Failed to change password') });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
