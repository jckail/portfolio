import React from 'react'
import PropTypes from 'prop-types'
import { apiUrl } from '../utils/helpers'

function TechnicalSkills({ skills }) {
  return (
    <section id="technical-skills">
      <h2>Technical Skills</h2>
      <ul>
        {skills.map((skill, index) => (
          <li key={index}>
            <img src={`${apiUrl}/images/key-skill-icon-${(index % 3) + 1}.svg`} alt="Skill Icon" className="skill-icon" />
            {skill}
          </li>
        ))}
      </ul>
    </section>
  )
}

TechnicalSkills.propTypes = {
  skills: PropTypes.arrayOf(PropTypes.string).isRequired
}

export default TechnicalSkills
