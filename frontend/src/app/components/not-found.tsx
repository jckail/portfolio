import React, { useEffect } from 'react';

import '../../styles/components/not-found.css';

/** Paths the server answers with 200 (see SPA_ROUTES in backend/app/spa.py). */
const KNOWN_PATHS = new Set(['/', '/index.html', '/admin']);

export const isKnownPath = (pathname: string): boolean => KNOWN_PATHS.has(pathname);

/**
 * Shown for any other path. The server already answers these with HTTP 404;
 * this is the page the visitor sees instead of a silent copy of the home page.
 */
export const NotFound: React.FC<{ pathname: string }> = ({ pathname }) => {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Page not found | Jordan Kail';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <main id="main-content" tabIndex={-1} className="not-found">
      <div className="not-found-card">
        <p className="not-found-code" aria-hidden="true">
          404
        </p>
        <h1>Page not found</h1>
        <p className="not-found-text">
          There is nothing at <code>{pathname.length > 80 ? `${pathname.slice(0, 80)}…` : pathname}</code>.
          The portfolio lives on the home page.
        </p>
        <div className="not-found-actions">
          <a className="btn btn-primary" href="/">
            Back to the portfolio
          </a>
          <a className="btn" href="/#experience">
            Experience
          </a>
          <a className="btn" href="/#projects">
            Projects
          </a>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
