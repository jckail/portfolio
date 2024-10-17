import React from 'react'
import TechnicalSkills from './TechnicalSkills'
import Experience from './Experience'
import Projects from './Projects'
import MyResume from './MyResume'

function MainContent({ resumeData, error, sectionsRef }) {
  return (
    <main>
      {error && <div>Error: {error}</div>}
      {!resumeData && <div>Loading resume data...</div>}
      {resumeData && (
        <>
          <TechnicalSkills 
            skills={resumeData.technicalSkills} 
            ref={el => sectionsRef.current['technical-skills'] = el}
          />
          <Experience 
            experience={resumeData.experience} 
            ref={el => sectionsRef.current['experience'] = el}
          />
          <Projects 
            projects={resumeData.projects} 
            ref={el => sectionsRef.current['projects'] = el}
          />
          <MyResume ref={el => sectionsRef.current['my-resume'] = el} />
        </>
      )}
    </main>
  )
}

export default MainContent
