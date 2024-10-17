import React, { forwardRef } from 'react'
import ResumePDF from '../components/ResumePDF'

const MyResume = forwardRef((props, ref) => {
  return (
    <section id="my-resume" ref={ref}>
      <h2>My Resume</h2>
      <ResumePDF />
    </section>
  )
})

export default MyResume
