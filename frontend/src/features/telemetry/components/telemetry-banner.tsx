import React from 'react';
import { useTelemetryStore } from '../stores/telemetry-store';
import { useAdminStore } from '../../content/stores/admin-store';
import '../styles/telemetry-banner.css';

interface TelemetryBannerProps {
  isAdminLoggedIn: boolean;
}

const TelemetryBanner: React.FC<TelemetryBannerProps> = ({ isAdminLoggedIn }) => {
  const logs = useTelemetryStore((state) => state.logs);
  const logout = useAdminStore((state) => state.logout);

  if (!isAdminLoggedIn) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="telemetry-banner">
      <div className="telemetry-header">
        <h3>Admin Panel</h3>
        <button 
          onClick={handleLogout}
          className="logout-button"
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
      <div className="telemetry-logs">
        {logs.map((log: string, index: number) => (
          <div key={index} className="log-entry">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TelemetryBanner;
