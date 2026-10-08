import React, { useState } from 'react';

import { useThemeStore } from '../../stores/theme-store';
import { DataError } from '../data-error';
import { LoadingSpinner } from '../loading-spinner';
import { StatusBadge } from './StatusBadge';
import '../../../styles/base/app.css';
import '../../../styles/components/loading.css';
import './brand-components.css';

/** Public specimens reuse live tokens and shared primitives. No data is submitted. */
export default function BrandShowcase({ caseStudyExample }: { caseStudyExample?: React.ReactNode }) {
  const theme = useThemeStore(state => state.theme);
  const setTheme = useThemeStore(state => state.setTheme);
  const [preview, setPreview] = useState(false);
  return <main className="brand-showcase" id="main-content">
    <a href="/">Jordan Kail’s portfolio</a>
    <h1>Jordan Kail</h1>
    <p>Jordan Kail · Brand kit v2. Production AI agent platforms, clear technical stories, and visible evidence.</p>
    <div className="brand-example-row" aria-label="Preview theme">
      {(['light', 'dark'] as const).map(value => <button key={value} className="btn" type="button"
        aria-pressed={theme === value} onClick={() => setTheme(value)}>{value === 'light' ? 'Light theme' : 'Dark theme'}</button>)}
    </div>
    <nav className="brand-showcase-nav" aria-label="Brand kit sections">
      <a href="#identity">Identity</a><a href="#components">Components</a><a href="#technical">Technical visuals</a><a href="#downloads">Downloads</a>
    </nav>
    <section id="identity"><h2>Identity and rhythm</h2>
      <img src="/brand/jordan-kail-mark.svg" width="80" height="80" alt="Jordan Kail monogram" />
      <p>Quantico for display and short labels. Montserrat for reading. A 4px spacing base, 44px controls, 65-character reading measure, and electric indigo for actions.</p>
      <p>Product identities remain independent: JobDog, Kefi and OpenDataCenter share presentation foundations, not replacement logos.</p>
    </section>
    <section id="components"><h2>Components and states</h2>
      <p>These specimens use the portfolio’s live button styles, theme tokens, StatusBadge, LoadingSpinner and DataError. The example card and form demonstrate composition; they do not publish a project or send a message.</p>
      <div className="brand-example-row"><StatusBadge tone="success">Live</StatusBadge><StatusBadge>Prototype</StatusBadge><StatusBadge tone="warning">In Development</StatusBadge><StatusBadge>Employer Work</StatusBadge><StatusBadge>Archived</StatusBadge></div>
      <div className="brand-example-grid">
        <article className="brand-example-card"><h3>Evidence before adjectives</h3><StatusBadge>Illustrative card</StatusBadge><p>Describe the problem, contribution, architectural tradeoff and verified result. Link the evidence and disclose limitations.</p><a className="btn" href="/?project=portfolio#projects">Read an actual project</a></article>
        <form className="brand-example-card" onSubmit={event => { event.preventDefault(); setPreview(true); }}>
          <h3>Form interaction specimen</h3><label htmlFor="brand-email">Your email</label><input id="brand-email" name="email" type="email" required autoComplete="off" placeholder="you@example.com" aria-describedby="brand-form-note" />
          <p id="brand-form-note">Local preview only. No information is sent or stored.</p><button className="btn btn-primary" type="submit">Preview confirmation</button>
          {preview && <p role="status">Preview complete. Nothing was sent.</p>}
        </form>
        <div className="brand-example-card"><h3>Loading</h3><LoadingSpinner label="Loading specimen" /><p>Use a named status for meaningful progress. Decorative placeholders can opt out of announcements.</p></div>
        <div className="brand-example-card"><h3>Error specimen</h3><DataError what="this illustrative example" /></div>
      </div>
      <p><a href="/#experience">Try the actual company timeline</a> · <a href="/#projects">Explore project cards and case studies</a></p>
    </section>
    {caseStudyExample && <section aria-label="Case study component specimen"><h2>Case study component</h2><p>Illustrative content demonstrating the same renderer used by project details.</p>{caseStudyExample}</section>}
    <section id="technical"><h2>Technical visual language</h2>
      <h3>Code</h3><pre><code>{'GET /context.json\nAccept: application/json'}</code></pre>
      <h3>Architecture specimen</h3><p>Illustrative request flow: client sends a request through an API to a data store. This is a generic diagram, not a claim about a specific deployment.</p>
      <svg viewBox="0 0 620 130" role="img" aria-label="Illustrative flow: client to API to store">
        <path className="brand-diagram-edge" d="M170 65H230m-10-7 10 7-10 7M390 65H450m-10-7 10 7-10 7" fill="none" />
        {[['Client', 10], ['API', 230], ['Store', 450]].map(([label, x]) => <g key={label}><rect className="brand-diagram-node" x={x} y="30" width="160" height="70" rx="10" /><text className="brand-diagram-label" x={Number(x) + 80} y="72" textAnchor="middle">{label}</text></g>)}
      </svg>
      <h3>Chart specimen</h3><p>Illustrative values only. Labels and the table preserve meaning without color.</p>
      <svg viewBox="0 0 620 180" role="img" aria-label="Illustrative values: A 3, B 2, C 1. Full values in table below.">
        <path className="brand-chart-axis" d="M40 10V140H590" fill="none" />
        {[['A', 80, 90, 'a'], ['B', 250, 60, 'b'], ['C', 420, 30, 'c']].map(([label, x, height, tone]) => <g key={label}><rect className={`brand-chart-${tone}`} x={x} y={140 - Number(height)} width="100" height={height} /><text className="brand-diagram-label" x={Number(x) + 50} y="166" textAnchor="middle">{label}</text></g>)}
      </svg>
      <table><caption>Illustrative chart data</caption><thead><tr><th scope="col">Series</th><th scope="col">Value</th></tr></thead><tbody><tr><th scope="row">A</th><td>3</td></tr><tr><th scope="row">B</th><td>2</td></tr><tr><th scope="row">C</th><td>1</td></tr></tbody></table>
    </section>
    <section id="downloads"><h2>Editable assets</h2><p>SVG templates are 1200 × 630. Export to PNG before using them for social metadata; the existing portfolio OG image remains unchanged.</p>
      <p><a href="/brand/jordan-kail-mark.svg" download>Download monogram SVG</a> · <a href="/brand/jordan-kail-wordmark.svg" download>Download wordmark SVG</a></p>
      <ul>{[ 'social-personal-light.svg', 'social-personal-dark.svg', 'social-project-light.svg', 'social-project-dark.svg'].map(asset => <li key={asset}><a href={`/brand/${asset}`} download>{asset}</a></li>)}</ul>
      <p>Templates use live text. Install the licensed Quantico and Montserrat fonts for intended rendering, or retain the system fallback. Review every exported image before publication.</p>
    </section>
  </main>;
}
