import React, { forwardRef } from 'react'

const TechnicalSkills = forwardRef(({ skills }, ref) => {
  if (!skills || Object.keys(skills).length === 0) {
    return (
      <section id="technical-skills" ref={ref}>
        <h2>Technical Skills</h2>
        <p>No technical skills available.</p>
      </section>
    )
  }

  return (
    <section id="technical-skills" ref={ref}>
      <h2>Technical Skills</h2>
      {Object.entries(skills).map(([category, skillList]) => (
        <div key={category} className="skill-category">
          <h3>{category}</h3>
          <p>{skillList.join(', ')}</p>
        </div>
      ))}
    </section>
  )
})

export default TechnicalSkills
