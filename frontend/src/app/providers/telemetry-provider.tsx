import React, { useEffect } from 'react';
import { useTelemetryStore } from '../../shared/stores/telemetry-store';
import { useAdminStore } from '../../shared/stores/admin-store';
import { TelemetryCollector } from '../../shared/utils/telemetry/telemetry-collector';
import { TelemetryLog } from '../../types/telemetry';

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
        
        const basicInfoLog: TelemetryLog = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `User Agent: ${userAgent}\nScreen Size: ${screenSize}\nConnection: ${connection}`
        };
        addLog(basicInfoLog);
      };

      // Collect performance metrics
      const collectPerformanceMetrics = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.startTime;
          const performanceLog: TelemetryLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type: 'performance',
            message: `Page Load Time: ${loadTime}ms`
          };
          addLog(performanceLog);
        }

        const paint = performance.getEntriesByType('paint');
        const firstPaint = paint.find(entry => entry.name === 'first-paint');
        if (firstPaint) {
          const paintLog: TelemetryLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type: 'performance',
            message: `First Paint: ${firstPaint.startTime}ms`
          };
          addLog(paintLog);
        }
      };

      // Initialize telemetry
      collector.start();
      collectBasicInfo();
      collectPerformanceMetrics();

      // Monitor errors
      const handleError = (event: ErrorEvent) => {
        const errorLog: TelemetryLog = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'error',
          message: `Error: ${event.message}`
        };
        addLog(errorLog);
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
