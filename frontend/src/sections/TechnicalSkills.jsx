import React, { forwardRef } from 'react'

const TechnicalSkills = forwardRef(({ skills }, ref) => {
  if (!skills || Object.keys(skills).length === 0) {
    return (
      <section id="technical-skills" ref={ref}>
        <div className="content-wrapper">
          <h2>Technical Skills</h2>
          <p>No technical skills available.</p>
        </div>
      </section>
    )
  }

  return (
    <section id="technical-skills" ref={ref}>
      <div className="content-wrapper">
        <h2>Technical Skills</h2>
        <div className="skills-grid">
          {Object.entries(skills).map(([category, skillList]) => (
            <div key={category} className="skill-category">
              <h3>{category}</h3>
              <ul className="skill-list">
                {skillList.map((skill, index) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

export default TechnicalSkills
