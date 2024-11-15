import React from 'react';

interface ContactProps {
  contact: {
    email: string;
    phone: string;
    website: string;
    location: string;
    github: string;
    linkedin: string;
  };
}

const Contact: React.FC<ContactProps> = ({ contact }) => {
  return (
    <div className="contact-section">
      <h2>Contact</h2>
      <div className="contact-content">
        <div className="contact-item">
          <h3>Email</h3>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </div>
        <div className="contact-item">
          <h3>Phone</h3>
          <a href={`tel:${contact.phone}`}>{contact.phone}</a>
        </div>
        <div className="contact-item">
          <h3>Website</h3>
          <a href={contact.website} target="_blank" rel="noopener noreferrer">
            {contact.website.replace('https://', '')}
          </a>
        </div>
        <div className="contact-item">
          <h3>Location</h3>
          <span>{contact.location}</span>
        </div>
        <div className="contact-item">
          <h3>LinkedIn</h3>
          <a href={contact.linkedin} target="_blank" rel="noopener noreferrer">
            {contact.linkedin.replace('https://www.', '')}
          </a>
        </div>
        <div className="contact-item">
          <h3>GitHub</h3>
          <a href={contact.github} target="_blank" rel="noopener noreferrer">
            {contact.github.replace('https://', '')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Contact);
