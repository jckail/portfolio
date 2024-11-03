import React, { useState } from 'react';
import { useAdminStore } from '../stores/admin-store';
import { AdminLogin } from './admin-login';

export function useAdminHandler() {
  const [showLogin, setShowLogin] = useState(false);
  const { isLoggedIn, logout } = useAdminStore();

  const handleAdminClick = () => {
    if (isLoggedIn) {
      logout();
    } else {
      setShowLogin(true);
    }
  };

  const handleCloseLogin = () => {
    setShowLogin(false);
  };

  const AdminLoginComponent = showLogin ? (
    <AdminLogin onClose={handleCloseLogin} />
  ) : null;

  return {
    isAdminLoggedIn: isLoggedIn,
    handleAdminClick,
    AdminLoginComponent,
  };
}
