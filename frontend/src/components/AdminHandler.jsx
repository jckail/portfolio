import React, { useState, useEffect } from 'react';
import AdminLogin from './AdminLogin';
import { API_CONFIG } from '../configs';

const AdminHandler = () => {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const verifyToken = async (token) => {
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

      const data = await response.json();
      return true;
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('adminToken');
      return false;
    }
  };

  useEffect(() => {
    const checkExistingToken = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        const isValid = await verifyToken(token);
        setIsAdminLoggedIn(isValid);
      }
    };
    checkExistingToken();
  }, []);

  const handleAdminClick = async () => {
    if (isAdminLoggedIn) {
      try {
        const token = localStorage.getItem('adminToken');
        await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.admin.logout}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
      localStorage.removeItem('adminToken');
      setIsAdminLoggedIn(false);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setIsAdminLoginOpen(false);
  };

  return {
    isAdminLoginOpen,
    isAdminLoggedIn,
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
