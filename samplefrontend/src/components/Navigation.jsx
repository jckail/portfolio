import { useEffect } from 'react';

const Navigation = () => {
  const sections = ['home', 'about', 'services', 'portfolio', 'team', 'contact'];

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Handle initial hash in URL
    const hash = window.location.hash.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <nav className="navigation">
      {sections.map((section) => (
        <a
          key={section}
          href={`#${section}`}
          onClick={(e) => {
            e.preventDefault();
            scrollToSection(section);
          }}
        >
          {section.charAt(0).toUpperCase() + section.slice(1)}
        </a>
      ))}
    </nav>
  );
};

export default Navigation;
