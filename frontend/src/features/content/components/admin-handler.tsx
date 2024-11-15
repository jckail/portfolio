import React, { useState, useEffect } from 'react';
import { useAdminStore } from '../stores/admin-store';
import AdminLogin from './admin-login';
import TelemetryBanner from './telemetry-banner';

const AdminHandler: React.FC = () => {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const { isLoggedIn, logout, verifyToken } = useAdminStore();

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken && !isLoggedIn) {
      verifyToken(storedToken).catch(console.error);
    }
  }, []);

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setIsAdminLoginOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleAdminClick = async () => {
    if (isLoggedIn) {
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdminLoginOpen(false);
  };

  return (
    <>
      {isLoggedIn && <TelemetryBanner isAdminLoggedIn={isLoggedIn} />}
      <AdminLogin 
        isOpen={isAdminLoginOpen} 
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default AdminHandler;
