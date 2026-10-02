import { useEffect, useState } from 'react';

import type { ReactNode } from 'react';

import { endpoints, getJson } from '../../shared/utils/api';

import '../../styles/base/theme.css';
import './lab-shell.css';

/** GET /api/labs/<slug> (backend/app/models/labs.py `Lab`). */
export interface LabInfo {
  slug: string;
  project_key: string;
  title: string;
  description: string;
  intro: string[];
  features: string[];
  repo: string;
  demo_notice: string;
  updated: string;
}

export const labEndpoint = (slug: string) => `${endpoints.labs}/${encodeURIComponent(slug)}`;

/** Shown if the notice cannot be fetched; true for every hosted lab by contract. */
export const FALLBACK_NOTICE = 'All data in this demo is synthetic and runs entirely in your browser.';

/** Fetch one lab's record; `null` while loading, `false` when the server has none. */
export function useLabInfo(slug: string): LabInfo | null | false {
  const [info, setInfo] = useState<LabInfo | null | false>(null);
  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    getJson<LabInfo>(labEndpoint(slug)).then(
      (data) => !cancelled && setInfo(data),
      () => !cancelled && setInfo(false)
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return info;
}

interface LabShellProps {
  slug: string;
  info: LabInfo | null | false;
  children: ReactNode;
}

/**
 * Chrome shared by every hosted lab: skip link, a way back to the portfolio,
 * and a footer carrying the synthetic-data notice and the source link. The lab
 * renders its own <h1> and <main> inside.
 */
export const LabShell = ({ slug, info, children }: LabShellProps) => {
  const notice = info ? info.demo_notice : FALLBACK_NOTICE;
  return (
    <div className="lab-shell" data-lab={slug}>
      <a className="lab-shell-skip" href="#lab-shell-content">
        Skip to demo
      </a>
      <nav className="lab-shell-nav" aria-label="Portfolio">
        <a className="lab-shell-back" href="/">
          <span aria-hidden="true">←</span> Back to portfolio
        </a>
      </nav>
      <div id="lab-shell-content" tabIndex={-1} className="lab-shell-content">
        {children}
      </div>
      <footer className="lab-shell-footer">
        <p className="lab-shell-notice" role="note">
          {notice}
        </p>
        {info && (
          <p>
            <a href={info.repo} rel="noopener noreferrer">
              Source code on GitHub
            </a>
          </p>
        )}
      </footer>
    </div>
  );
};
