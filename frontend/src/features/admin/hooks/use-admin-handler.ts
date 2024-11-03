import { useState, useEffect } from 'react';
import { useAdminStore } from '../stores/admin-store';

export const useAdminHandler = () => {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const { isLoggedIn, logout, verifyToken } = useAdminStore();

  useEffect(() => {
    const checkExistingToken = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        await verifyToken(token);
      }
    };
    checkExistingToken();
  }, [verifyToken]);

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
    handleLoginSuccess,
    closeLoginModal: () => setIsAdminLoginOpen(false),
  };
};

export default useAdminHandler;
