import { useEffect } from 'react';
import Navigation from './components/Navigation';
import Home from './sections/Home';
import About from './sections/About';
import Services from './sections/Services';
import Portfolio from './sections/Portfolio';
import Team from './sections/Team';
import Contact from './sections/Contact';
import './App.css';

function App() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            window.history.replaceState(null, '', `#${sectionId}`);
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
  }, []);

  return (
    <div className="app">
      <Navigation />
      <main>
        <Home />
        <About />
        <Services />
        <Portfolio />
        <Team />
        <Contact />
      </main>
    </div>
  );
}

export default App;
