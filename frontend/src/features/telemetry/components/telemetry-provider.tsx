import React, { useEffect } from 'react';
import { useTelemetryStore } from '../stores/telemetry-store';
import { useAdminStore } from '../../content/stores/admin-store';
import { TelemetryCollector } from '../utils/telemetry-collector';

interface TelemetryProviderProps {
  children: React.ReactNode;
}

export function TelemetryProvider({ children }: TelemetryProviderProps) {
  const { addLog, clearLogs } = useTelemetryStore();
  const isAdminLoggedIn = useAdminStore((state) => state.isLoggedIn);
  
  useEffect(() => {
    const collector = TelemetryCollector.getInstance();

    if (isAdminLoggedIn) {
      // Initialize telemetry collection
      const collectBasicInfo = () => {
        const userAgent = window.navigator.userAgent;
        const screenSize = `${window.innerWidth}x${window.innerHeight}`;
        const connection = (navigator as any).connection?.effectiveType || 'unknown';
        
        addLog(`User Agent: ${userAgent}`);
        addLog(`Screen Size: ${screenSize}`);
        addLog(`Connection: ${connection}`);
      };

      // Collect performance metrics
      const collectPerformanceMetrics = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.startTime;
          addLog(`Page Load Time: ${loadTime}ms`);
        }

        const paint = performance.getEntriesByType('paint');
        const firstPaint = paint.find(entry => entry.name === 'first-paint');
        if (firstPaint) {
          addLog(`First Paint: ${firstPaint.startTime}ms`);
        }
      };

      // Initialize telemetry
      collector.start();
      collectBasicInfo();
      collectPerformanceMetrics();

      // Monitor errors
      const handleError = (event: ErrorEvent) => {
        addLog(`Error: ${event.message}`);
      };

      window.addEventListener('error', handleError);

      // Cleanup function
      return () => {
        collector.stop();
        window.removeEventListener('error', handleError);
      };
    } else {
      // Stop collecting telemetry and clear existing logs when admin logs out
      collector.stop();
      clearLogs();
    }
  }, [addLog, clearLogs, isAdminLoggedIn]);

  return <>{children}</>;
}
