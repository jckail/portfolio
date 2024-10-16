import React from 'react'
import './App.css'

function App() {
  return (
    <div className="App">
      <header>
        <h1>Jordan Kail</h1>
        <nav>
          <a href="#github">GitHub</a>
          <a href="#linkedin">LinkedIn</a>
          <a href="#resume">Resume</a>
        </nav>
      </header>
      <main>
        <section id="technical-skills">
          <h2>Technical Skills</h2>
          {/* Add skills here */}
        </section>
        <section id="experience">
          <h2>Experience</h2>
          {/* Add experience items here */}
        </section>
        <section id="projects">
          <h2>Projects</h2>
          {/* Add projects here */}
        </section>
      </main>
    </div>
  )
}

export default App
