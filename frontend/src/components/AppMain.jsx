import React from 'react'
import AboutMe from '../sections/AboutMe'
import TechnicalSkills from '../sections/TechnicalSkills'
import Experience from '../sections/Experience'
import Projects from '../sections/Projects'
import MyResume from '../sections/MyResume'

const AppMain = ({ resumeData, error, sectionsRef }) => {
  return (
    <>
      {error && (
        <div>
          <p>Error: {error.message}</p>
          <p>Failed to fetch data from: {error.url}</p>
        </div>
      )}
      {!resumeData && !error && <div>Loading resume data...</div>}
      {resumeData && (
        <>
          <AboutMe aboutMe={resumeData.aboutMe} ref={el => sectionsRef.current['about-me'] = el} />
          <TechnicalSkills skills={resumeData.technicalSkills} ref={el => sectionsRef.current['technical-skills'] = el} />
          <Experience experience={resumeData.experience} ref={el => sectionsRef.current['experience'] = el} />
          <Projects projects={resumeData.projects} ref={el => sectionsRef.current['projects'] = el} />
          <MyResume ref={el => sectionsRef.current['my-resume'] = el} />
        </>
      )}
    </>
  )
}

export default AppMain
