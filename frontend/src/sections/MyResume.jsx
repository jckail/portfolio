import React, { forwardRef } from 'react'
import ResumePDF from '../components/ResumePDF'

const MyResume = forwardRef(({ trackResumeButtonClick }, ref) => {
  return (
    <section id="my-resume" ref={ref}>
      <div className="content-wrapper">
        <h2>My Resume</h2>
        <p>Here's a downloadable version of my resume in PDF format:</p>
        <ResumePDF trackResumeButtonClick={trackResumeButtonClick} />
      </div>
    </section>
  )
})

export default MyResume
