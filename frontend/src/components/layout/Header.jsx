import React from 'react'
import PropTypes from 'prop-types'
import SandwichMenu from './SandwichMenu'
import HeaderNav from './HeaderNav'

/**
 * Header component that displays the user's name, title, navigation, and theme toggle.
 */
function Header({ resumeData, theme, toggleTheme, toggleSidebar, onResumeClick }) {
  const { name = 'Jordan Kail', title = 'Software Engineer' } = resumeData || {}

  return (
    <header className="floating-header">
      <div className="header-left">
        <SandwichMenu onClick={toggleSidebar} />
        <div className="name-title">
          <h1>{name}</h1>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="header-right">
        <HeaderNav resumeData={resumeData} theme={theme} onResumeClick={onResumeClick} />
        <button onClick={toggleTheme} className="theme-toggle">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  )
}

Header.propTypes = {
  resumeData: PropTypes.shape({
    name: PropTypes.string,
    title: PropTypes.string,
  }),
  theme: PropTypes.string.isRequired,
  toggleTheme: PropTypes.func.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  onResumeClick: PropTypes.func.isRequired,
}

export default Header
