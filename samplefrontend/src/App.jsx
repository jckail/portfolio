import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './sections/Home';
import About from './sections/About';
import Services from './sections/Services';
import Portfolio from './sections/Portfolio';
import Team from './sections/Team';
import Contact from './sections/Contact';
import Skills from './sections/Skills';
import Experience from './sections/Experience';
import Education from './sections/Education';
import Projects from './sections/Projects';
import Awards from './sections/Awards';
import './App.css';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            // Use navigate to update URL without page reload
            navigate(`/#${sectionId}`, { replace: true });
          }
        });
      },
      {
        threshold: 0.5,
      }
    );

    document.querySelectorAll('.section').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, [navigate]);

  return (
    <div className="app">
      <Navigation />
      <Routes>
        <Route path="/" element={
          <main>
            <section id="home" className="section"><Home /></section>
            <section id="skills" className="section"><Skills /></section>
            <section id="experience" className="section"><Experience /></section>
            <section id="education" className="section"><Education /></section>
            <section id="about" className="section"><About /></section>
            <section id="projects" className="section"><Projects /></section>
            <section id="services" className="section"><Services /></section>
            <section id="awards" className="section"><Awards /></section>
            <section id="portfolio" className="section"><Portfolio /></section>
            <section id="team" className="section"><Team /></section>
            <section id="contact" className="section"><Contact /></section>
          </main>
        } />
      </Routes>
    </div>
  );
}

export default App;
