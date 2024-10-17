import React, { forwardRef } from 'react'
import { getApiUrl } from '../helpers/utils'

const Experience = forwardRef(({ experience }, ref) => {
  const apiUrl = getApiUrl();

  return (
    <section id="experience" ref={ref}>
      <h2>Experience</h2>
      {experience.map((job, index) => (
        <div key={index} className="job">
          <img src={`${apiUrl}/images/work-img.jpg`} alt="Work" className="job-icon" />
          <div>
            <h3>{job.title} at {job.company}</h3>
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
