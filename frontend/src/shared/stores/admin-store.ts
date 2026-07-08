import { create } from 'zustand';

import { AdminState, AdminCredentials } from '../../types/admin';
import { postJson, getJson, endpoints } from '../utils/api';

interface AdminStore extends AdminState {
  login: (credentials: AdminCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyToken: (token: string) => Promise<boolean>;
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export const useAdminStore = create<AdminStore>((set) => ({
  isLoggedIn: false,
  token: null,
  isLoading: false,
  error: null,

  login: async (credentials: AdminCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const data = await postJson<{ access_token?: string }>(
        endpoints.admin.login,
        credentials
      );

      const token = data.access_token;
      if (!token) {
        throw new Error('No access token received');
      }

      localStorage.setItem('adminToken', token);
      set({ isLoggedIn: true, token, error: null });
      return true;
    } catch (err) {
      console.error('Login error:', err);
      const error = err instanceof Error ? err.message : 'Login failed';
      set({ error, isLoggedIn: false, token: null });
      localStorage.removeItem('adminToken');
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const token = localStorage.getItem('adminToken');
    try {
      if (token) {
        await postJson(endpoints.admin.logout, undefined, {
          headers: bearer(token),
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('adminToken');
      set({ isLoggedIn: false, token: null, error: null });
    }
  },

  verifyToken: async (token: string) => {
    try {
      await getJson(endpoints.admin.verify, { headers: bearer(token) });
      set({ isLoggedIn: true, token });
      return true;
    } catch (err) {
      console.error('Token verification error:', err);
      set({ isLoggedIn: false, token: null });
      localStorage.removeItem('adminToken');
      return false;
    }
  },
}));
