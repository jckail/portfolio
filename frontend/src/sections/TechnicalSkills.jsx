import React, { forwardRef } from 'react'
import { getApiUrl } from '../helpers/utils'

const TechnicalSkills = forwardRef(({ skills }, ref) => {
  const apiUrl = getApiUrl();

  return (
    <section id="technical-skills" ref={ref}>
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
})

export default TechnicalSkills
