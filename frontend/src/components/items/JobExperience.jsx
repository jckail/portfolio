import React from 'react'
import PropTypes from 'prop-types'
import { apiUrl } from '../../utils/helpers'

function JobExperience({ job }) {
  return (
    <div className="job">
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
  )
}

JobExperience.propTypes = {
  job: PropTypes.shape({
    title: PropTypes.string.isRequired,
    company: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    responsibilities: PropTypes.arrayOf(PropTypes.string).isRequired
  }).isRequired
}

export default JobExperience
