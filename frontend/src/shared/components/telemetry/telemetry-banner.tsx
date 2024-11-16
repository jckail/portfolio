import React from 'react';
import { useTelemetryStore } from '../../stores/telemetry-store';
import { useAdminStore } from '../../stores/admin-store';
import { TelemetryLog } from '../../../types/telemetry';
import '../../../styles/components/telemetry/telemetry-banner.css';

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
        {logs.map((log: TelemetryLog) => (
          <div key={log.id} className="log-entry">
            <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className={`log-type log-type-${log.type}`}>{log.type}</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TelemetryBanner;
