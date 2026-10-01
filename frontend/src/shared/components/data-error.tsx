import React from 'react';

interface DataErrorProps {
  /** What failed to load, e.g. "the experience section". */
  what: string;
  className?: string;
}

/**
 * Shown when the portfolio content could not be loaded. Says what happened
 * and offers a retry instead of a bare technical message; the underlying error
 * is already logged where it was caught.
 */
export const DataError: React.FC<DataErrorProps> = ({ what, className = '' }) => (
  <div className={`data-error ${className}`.trim()} role="alert">
    <p>
      Could not load {what}. Check your connection and try again; the rest of the page may still
      work.
    </p>
    <button type="button" className="btn" onClick={() => window.location.reload()}>
      Try again
    </button>
  </div>
);

export default DataError;
