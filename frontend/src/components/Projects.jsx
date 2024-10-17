import React from 'react'
import PropTypes from 'prop-types'
import ProjectItem from './items/ProjectItem'

function Projects({ projects }) {
  return (
    <section id="projects">
      <h2>Projects</h2>
      {projects.map((project, index) => (
        <ProjectItem key={index} project={project} />
      ))}
    </section>
  )
}

Projects.propTypes = {
  projects: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      link: PropTypes.string
    })
  ).isRequired
}

export default Projects
