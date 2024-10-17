import React from 'react'
import PropTypes from 'prop-types'
import { apiUrl } from '../../utils/helpers'

function ProjectItem({ project }) {
  return (
    <div className="project">
      <img src={`${apiUrl}/images/project-img.jpg`} alt="Project" className="project-icon" />
      <div>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        {project.link && <a href={project.link} target="_blank" rel="noopener noreferrer">View Project</a>}
      </div>
    </div>
  )
}

ProjectItem.propTypes = {
  project: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    link: PropTypes.string
  }).isRequired
}

export default ProjectItem
