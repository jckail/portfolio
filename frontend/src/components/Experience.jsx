import React from 'react'
import PropTypes from 'prop-types'
import JobExperience from './items/JobExperience'

function Experience({ experience }) {
  return (
    <section id="experience">
      <h2>Experience</h2>
      {experience.map((job, index) => (
        <JobExperience key={index} job={job} />
      ))}
    </section>
  )
}

Experience.propTypes = {
  experience: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      company: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      responsibilities: PropTypes.arrayOf(PropTypes.string).isRequired
    })
  ).isRequired
}

export default Experience
