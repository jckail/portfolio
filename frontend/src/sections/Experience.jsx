import React, { forwardRef } from 'react'
import { getApiUrl } from '../helpers/utils'

const Experience = forwardRef(({ experience }, ref) => {
  const apiUrl = getApiUrl();

  const handleLinkClick = (e, url) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section id="experience" ref={ref}>
      <h2>Experience</h2>
      {experience.map((job, index) => (
        <div key={index} className="job">
          <img src={`${apiUrl}/images/work-img.jpg`} alt="Work" className="job-icon" />
          <div>
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
            <p>{job.date}</p>
            <ul>
              {job.responsibilities.map((resp, i) => (
                <li key={i}>{resp}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </section>
  )
})

export default Experience
