import React from 'react';
import { useAppLogic } from '../components/AppLogicProvider';

const SectionHistory = () => {
  const { currentSection, sectionHistory } = useAppLogic();

  return (
    <div className="telemetry-section">
      <h3>Section Navigation History</h3>
      <div className="telemetry-content">
        <div className="telemetry-row">
          <strong>Current Section:</strong> {currentSection.id}
          <em style={{ marginLeft: '5px', fontSize: '12px' }}>
            (set by {currentSection.source})
          </em>
        </div>
        <div className="telemetry-row">
          <strong>History:</strong>
          <div style={{ marginLeft: '10px' }}>
            {sectionHistory.map((item, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                {index > 0 ? '↑ ' : ''}
                {item.id}
                <em style={{ marginLeft: '5px', fontSize: '12px' }}>
                  ({item.source})
                </em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionHistory;
