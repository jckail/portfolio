import { HashLink } from 'react-router-hash-link';

export default function Navigation() {
  return (
    <nav className="navigation">
      <HashLink smooth to="/#home">Home</HashLink>
      <HashLink smooth to="/#skills">Skills</HashLink>
      <HashLink smooth to="/#experience">Experience</HashLink>
      <HashLink smooth to="/#education">Education</HashLink>
      <HashLink smooth to="/#about">About</HashLink>
      <HashLink smooth to="/#projects">Projects</HashLink>
      <HashLink smooth to="/#services">Services</HashLink>
      <HashLink smooth to="/#awards">Awards</HashLink>
      <HashLink smooth to="/#portfolio">Portfolio</HashLink>
      <HashLink smooth to="/#team">Team</HashLink>
      <HashLink smooth to="/#contact">Contact</HashLink>
    </nav>
  );
}
