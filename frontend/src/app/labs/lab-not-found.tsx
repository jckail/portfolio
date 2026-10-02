import { useEffect } from 'react';

import NotFound from '../components/not-found';

import type { LabInfo } from './lab-shell';

import '../../styles/base/theme.css';
import './lab-shell.css';

/** A slug the server does not know: the site's regular 404 view. */
export const LabNotFound = ({ pathname }: { pathname: string }) => <NotFound pathname={pathname} />;

/** The data exists but this build has no interface for it yet. */
export const LabComingSoon = ({ lab }: { lab: LabInfo }) => {
  useEffect(() => {
    const previous = document.title;
    document.title = `${lab.title} | Jordan Kail`;
    return () => {
      document.title = previous;
    };
  }, [lab.title]);

  return (
    <main id="main-content" tabIndex={-1} className="lab-coming-soon">
      <h1>{lab.title}</h1>
      <p>This demo is not available in this build yet. Check back soon.</p>
      <p>{lab.description}</p>
      <p>
        <a href={lab.repo} rel="noopener noreferrer">
          Source code on GitHub
        </a>
        {' · '}
        <a href="/">Back to the portfolio</a>
      </p>
    </main>
  );
};
