import { create } from 'zustand';
import { AdminState, AdminCredentials } from '../../types/admin';
import { API_CONFIG } from '../../config/constants';

interface AdminStore extends AdminState {
  login: (credentials: AdminCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyToken: (token: string) => Promise<boolean>;
}

export const useAdminStore = create<AdminStore>((set) => ({
  isLoggedIn: false,
  token: null,
  isLoading: false,
  error: null,

  login: async (credentials: AdminCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin.login}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

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
        await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin.logout}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
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
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin.verify}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

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
