import React from 'react';

import '../../styles/tldr.css';

interface TLDRProps {
  tldr: {
    greeting: string;
    description: string;
    aidetails:string;

  };
}

const TLDR: React.FC<TLDRProps> = ({ tldr,  }) => {
  if (!tldr) {
    return null;
  }

  return (
    <section id="tldr" className="section-container">
      
      <div className="section-content">
        <div className="tldr-section">
          <div className="tldr-content">
            <div className="tldr-text">
              <h3>{tldr.greeting}</h3>
              <p>{tldr.description}</p>
              <p>{tldr.aidetails}</p>
            </div>
            <div className="headshot-container">
              <img 
                src="/images/headshot/headshot.png" 
                alt="Profile headshot"
                className="headshot"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TLDR;
