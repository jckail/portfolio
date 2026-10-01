import React, { Suspense, lazy, useState, useEffect } from 'react';

import { useAdminStore } from '../../../shared/stores/admin-store';
import TelemetryBanner from '../../../shared/components/telemetry/telemetry-banner';

// Loaded on demand: the login dialog (and its CSS) is only needed once someone
// opens it, so a normal visit does not pay for it on first load.
const AdminLogin = lazy(() => import('./admin-login'));

const AdminHandler: React.FC = () => {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const isLoggedIn = useAdminStore(state => state.isLoggedIn);
  const verifyToken = useAdminStore(state => state.verifyToken);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken && !isLoggedIn) {
      verifyToken(storedToken).catch(console.error);
    }
  }, [isLoggedIn, verifyToken]);

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

  const handleLoginSuccess = () => {
    setIsAdminLoginOpen(false);
  };

  return (
    <>
      {isLoggedIn && <TelemetryBanner isAdminLoggedIn={isLoggedIn} />}
      {isAdminLoginOpen && (
        <Suspense fallback={null}>
          <AdminLogin
            isOpen={isAdminLoginOpen}
            onClose={() => setIsAdminLoginOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        </Suspense>
      )}
    </>
  );
};

export default AdminHandler;
