import React from 'react';
import '../../../styles/components/doodle.css';

interface DoodleProps {
  isVisible: boolean;
  isPartyMode: boolean;
}

const Doodle: React.FC<DoodleProps> = ({ isVisible, isPartyMode }) => {
  const containerClass = isPartyMode ? 'visible party-mode' : isVisible ? 'visible' : '';
  
  return (
    <section 
      id="doodle" 
      className={`doodle-container ${containerClass}`}
      aria-hidden={!isVisible && !isPartyMode}
    >
      <div className={`doodle-section ${isVisible || isPartyMode ? 'visible' : ''}`}>
        <div className="section-title"></div>
        <div className="doodle-content" />
      </div>
    </section>
  );
};

export default Doodle;
