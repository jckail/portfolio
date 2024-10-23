import React, { forwardRef } from 'react'

const AboutMe = forwardRef(({ aboutMe, about_me }, ref) => {
  const aboutMeContent = aboutMe || about_me;

  if (!aboutMeContent) {
    return null;
  }

  const paragraphs = aboutMeContent.split('\n\n')

  return (
    <section className="section" id="about-me" ref={ref}>
      <div className="content-wrapper">
        <h2>About Me</h2>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  )
})

export default AboutMe
