import React from 'react';
import '../../../styles/components/doodle.css';

interface DoodleProps {
  isVisible: boolean;
}

const Doodle: React.FC<DoodleProps> = ({ isVisible }) => {
  return (
    <section 
      id="doodle" 
      className={`doodle-container ${isVisible ? 'visible' : ''}`}
      aria-hidden={!isVisible}
    >
      <div className={`doodle-section ${isVisible ? 'visible' : ''}`}>
        <div className="section-title"></div>
        <div className="doodle-content" />
      </div>
    </section>
  );
};

export default Doodle;
