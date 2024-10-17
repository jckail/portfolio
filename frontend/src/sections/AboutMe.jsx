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
        <div className="content-wrapper">
          <h2>About Me</h2>
          <p>Loading about me information...</p>
        </div>
      </section>
    )
  }

  const paragraphs = aboutMeContent.split('\n\n')

  return (
    <section id="about-me" ref={ref}>
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
