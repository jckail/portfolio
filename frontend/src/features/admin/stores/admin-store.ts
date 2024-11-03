import { create } from 'zustand';

interface AdminState {
  isLoggedIn: boolean;
  token: string | null;
  setLoggedIn: (status: boolean, token?: string) => void;
  logout: () => void;
  login: (token: string) => Promise<boolean>;
}

export const useAdminStore = create<AdminState>((set) => ({
  isLoggedIn: false,
  token: null,
  setLoggedIn: (status: boolean, token?: string) => set({ 
    isLoggedIn: status,
    token: token || null
  }),
  logout: () => set({ isLoggedIn: false, token: null }),
  login: async (token: string) => {
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        set({ isLoggedIn: true, token });
        return true;
      } else {
        set({ isLoggedIn: false, token: null });
        return false;
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      set({ isLoggedIn: false, token: null });
      return false;
    }
  }
}));
