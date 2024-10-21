import React, { forwardRef } from 'react';
import { getApiUrl } from '../helpers/utils';

const Experience = forwardRef(({ experience }, ref) => {
  const apiUrl = getApiUrl();

  const handleLinkClick = (e, url) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section id="experience" ref={ref}>
      <div className="content-wrapper">
        <h2>Experience</h2>
        {experience.map((job, index) => (
          <div key={index} className="job-item">
            <div className="job-header">
              <img
                src={`${apiUrl}/api/images/work-img.jpg`}
                alt="Work"
                className="job-icon"
              />
              <div className="job-title">
                <h3>
                  <a
                    href={job.link}
                    onClick={(e) => handleLinkClick(e, job.link)}
                    rel="noopener noreferrer"
                  >
                    {job.company}
                  </a>
                </h3>
                <h4>{job.title}</h4>
                <p className="job-date">{job.date}</p>
              </div>
            </div>
            <ul className="job-responsibilities">
              {job.responsibilities.map((resp, i) => (
                <li key={i}>{resp}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
});

Experience.displayName = 'Experience';

export default Experience;
