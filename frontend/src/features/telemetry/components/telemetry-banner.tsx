import React from 'react';
import { useTelemetryStore } from '../stores/telemetry-store';
import '../styles/telemetry-banner.css';

interface TelemetryBannerProps {
  isAdminLoggedIn: boolean;
}

const TelemetryBanner: React.FC<TelemetryBannerProps> = ({ isAdminLoggedIn }) => {
  const logs = useTelemetryStore((state) => state.logs);

  if (!isAdminLoggedIn) {
    return null;
  }

  return (
    <div className="telemetry-banner">
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
