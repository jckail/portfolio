import React, { forwardRef, useEffect } from 'react'

const AboutMe = forwardRef(({ aboutMe, about_me }, ref) => {
  const aboutMeContent = aboutMe || about_me;

  useEffect(() => {
    console.log('AboutMe component received:', aboutMeContent);
    console.log('AboutMe type:', typeof aboutMeContent);
    console.log('AboutMe length:', aboutMeContent ? aboutMeContent.length : 'N/A');
  }, [aboutMeContent]);

  if (!aboutMeContent) {
    return (
      <section id="about-me" ref={ref}>
        <h2>About Me</h2>
        <p>Loading about me information...</p>
      </section>
    )
  }

  const paragraphs = aboutMeContent.split('\n\n')

  return (
    <section id="about-me" ref={ref}>
      <h2>About Me</h2>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </section>
  )
})

export default AboutMe
