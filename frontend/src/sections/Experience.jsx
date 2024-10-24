import React, { forwardRef } from 'react';

const Experience = forwardRef(({ experience }, ref) => {
  return (
    <section ref={ref} id="experience" className="section experience-section">
      <h2>Experience</h2>
      <div className="experience-container">
        {experience?.map((job, index) => (
          <div key={index} className="job-item">
            <div className="job-header">
              <img src={`/api/images/work-img.png`} alt="Work" className="job-icon" />
              <div className="job-title">
                <h3>{job.title}</h3>
                <h4>{job.company}</h4>
                <p className="job-duration">{job.duration}</p>
              </div>
            </div>
            <ul className="job-responsibilities">
              {job.responsibilities?.map((responsibility, respIndex) => (
                <li key={respIndex}>{responsibility}</li>
              ))}
            </ul>
            {job.technologies && (
              <div className="technologies">
                {job.technologies.map((tech, techIndex) => (
                  <span key={techIndex} className="technology-tag">
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
});

export default Experience;
