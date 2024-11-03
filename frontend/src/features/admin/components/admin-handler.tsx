import React, { useState } from 'react';
import { useAdminStore } from '../stores/admin-store';
import AdminLogin from './admin-login';

export const AdminHandler = () => {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const { isLoggedIn, logout } = useAdminStore();

  const handleAdminClick = async () => {
    if (isLoggedIn) {
      await logout();
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdminLoginOpen(false);
  };

  return {
    isAdminLoginOpen,
    isLoggedIn,
    handleAdminClick,
    AdminLoginComponent: (
      <AdminLogin 
        isOpen={isAdminLoginOpen} 
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    )
  };
};

export default AdminHandler;
