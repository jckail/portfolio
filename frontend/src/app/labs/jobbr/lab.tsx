import { useMemo, useState } from 'react';

import './jobbr.css';
import { generatePostings, SAMPLE_RESUME } from './generator';
import { DEFAULT_WEIGHTS, readResume, scoreJob, type MatchResult, type Weights } from './matcher';
import { filledFields, parseJob, PARSED_FIELDS, type ParsedJob } from './parser';

type SortKey = 'score' | 'title' | 'company' | 'salary';
type Stage = 'scrape' | 'parse' | 'match';

const STAGES: { id: Stage; name: string }[] = [
  { id: 'scrape', name: 'Scrape' },
  { id: 'parse', name: 'Parse' },
  { id: 'match', name: 'Match' },
];

const WEIGHT_LABELS: Record<keyof Weights, string> = {
  required: 'Required skills',
  preferred: 'Nice-to-have skills',
  experience: 'Experience',
  location: 'Location',
};

interface Row {
  id: string;
  raw: string;
  job: ParsedJob;
  match: MatchResult | null;
}

const salaryText = (job: ParsedJob) =>
  job.salary ? `${job.salary.currency}${job.salary.min.toLocaleString('en-US')} to ${job.salary.currency}${job.salary.max.toLocaleString('en-US')} per ${job.salary.period}` : 'Not stated';

export default function JobbrLab() {
  const [seed, setSeed] = useState(7);
  const [resumeText, setResumeText] = useState('');
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [query, setQuery] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<SortKey>('score');
  const [stage, setStage] = useState<Stage>('scrape');
  const [selected, setSelected] = useState<string | null>(null);

  const parsed = useMemo(() => generatePostings(seed).map(p => ({ ...p, job: parseJob(p.raw) })), [seed]);
  const resume = useMemo(() => (resumeText.trim() ? readResume(resumeText) : null), [resumeText]);
  const rows: Row[] = useMemo(
    () => parsed.map(p => ({ ...p, match: resume ? scoreJob(p.job, resume, weights) : null })),
    [parsed, resume, weights]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(r => {
      if (remoteOnly && !r.job.remote) return false;
      if (resume && (r.match?.score ?? 0) < minScore) return false;
      if (!q) return true;
      return `${r.job.title} ${r.job.company_name} ${r.job.location.join(' ')} ${r.job.skills_required.join(' ')}`.toLowerCase().includes(q);
    });
    const text = (r: Row, k: 'title' | 'company_name') => r.job[k] ?? '';
    return [...list].sort((a, b) => {
      if (sort === 'score' && resume) return (b.match?.score ?? -1) - (a.match?.score ?? -1) || a.id.localeCompare(b.id);
      if (sort === 'company') return text(a, 'company_name').localeCompare(text(b, 'company_name'));
      if (sort === 'salary') return (b.job.salary?.max ?? -1) - (a.job.salary?.max ?? -1);
      return text(a, 'title').localeCompare(text(b, 'title')) || a.id.localeCompare(b.id);
    });
  }, [rows, query, remoteOnly, minScore, sort, resume]);

  const active = rows.find(r => r.id === selected) ?? null;
  const coverage = parsed.reduce((n, p) => n + filledFields(p.job), 0);
  const scored = rows.filter(r => r.match?.score != null).length;

  return (
    <main id="jobbr-main" className="jobbr-lab" tabIndex={-1}>
      <header className="jobbr-head">
        <h1>Jobbr: job parsing and resume matching</h1>
        <p>
          A browser-only walkthrough of Jobbr&apos;s documented flow: raw job postings become structured fields, then get
          matched against a resume. The real project uses LLMs for parsing; this demo replaces them with simple rules you can
          read and change.
        </p>
        <p className="jobbr-notice" role="note">
          <strong>Synthetic demo.</strong> Every posting is fictional and generated from a seed. Nothing is scraped, no model
          is called, and nothing you type leaves this page. Numbers are illustrative, not Jobbr metrics.
        </p>
      </header>

      <section aria-labelledby="jobbr-pipeline">
        <h2 id="jobbr-pipeline">Pipeline</h2>
        <div className="jobbr-row">
          <label>
            Seed
            <input type="number" min={1} max={99999} value={seed} onChange={e => setSeed(Math.max(1, Math.min(99999, Number(e.target.value) || 1)))} />
          </label>
          <span>The same seed always generates the same postings.</span>
        </div>
        <ol className="jobbr-stages" aria-label="Pipeline stages">
          {STAGES.map((s, i) => (
            <li key={s.id}>
              <button type="button" aria-pressed={stage === s.id} onClick={() => setStage(s.id)}>
                {i + 1}. {s.name}
              </button>
            </li>
          ))}
        </ol>
        <div className="jobbr-panel" aria-live="polite">
          {stage === 'scrape' && (
            <p>
              <strong>Scrape (simulated).</strong> {parsed.length} synthetic postings were generated as raw HTML-like text. A real
              scraper would fetch pages; here nothing touches the network.
            </p>
          )}
          {stage === 'parse' && (
            <p>
              <strong>Parse.</strong> Rules turned the raw text into structured fields. {coverage} of {parsed.length * PARSED_FIELDS.length}{' '}
              README-listed field values ({PARSED_FIELDS.join(', ')}) came out non-empty. A missing salary stays empty rather than guessed.
            </p>
          )}
          {stage === 'match' && (
            <p>
              <strong>Match.</strong>{' '}
              {resume ? `${scored} postings scored against your resume with the weights below.` : 'Add a resume below to score postings.'}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="jobbr-resume">
        <h2 id="jobbr-resume">Resume</h2>
        <p className="jobbr-privacy">Privacy: the resume text is processed in this browser tab only. It is not uploaded, stored or logged.</p>
        <label htmlFor="jobbr-resume-text">Paste resume text</label>
        <textarea id="jobbr-resume-text" rows={7} value={resumeText} onChange={e => setResumeText(e.target.value)} />
        <div className="jobbr-row">
          <button type="button" onClick={() => setResumeText(SAMPLE_RESUME)}>Use sample resume</button>
          <button type="button" onClick={() => setResumeText('')}>Clear resume</button>
        </div>
        {resume && (
          <p>
            Skills found: {resume.skills.length ? resume.skills.join(', ') : 'none'}. Years of experience stated: {resume.years ?? 'none'}.
          </p>
        )}
      </section>

      <section aria-labelledby="jobbr-weights">
        <h2 id="jobbr-weights">Scoring weights</h2>
        <p>Score = sum(weight x fit) / sum(weights), where each fit is between 0 and 1. Adjust the weights and the ranking updates.</p>
        <div className="jobbr-weights">
          {(Object.keys(WEIGHT_LABELS) as (keyof Weights)[]).map(k => (
            <div key={k} className="jobbr-field">
              <label htmlFor={`jobbr-w-${k}`}>{WEIGHT_LABELS[k]}: {weights[k]}</label>
              <input id={`jobbr-w-${k}`} type="range" min={0} max={100} value={weights[k]} onChange={e => setWeights({ ...weights, [k]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setWeights(DEFAULT_WEIGHTS)}>Reset weights</button>
      </section>

      <section aria-labelledby="jobbr-results">
        <h2 id="jobbr-results">Postings</h2>
        <div className="jobbr-filters">
          <label>
            Search
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          <label>
            Sort by
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)}>
              <option value="score">Best match</option>
              <option value="title">Title</option>
              <option value="company">Company</option>
              <option value="salary">Highest salary</option>
            </select>
          </label>
          <div className="jobbr-field">
            <label htmlFor="jobbr-min">Minimum score: {minScore}</label>
            <input id="jobbr-min" type="range" min={0} max={100} value={minScore} disabled={!resume} onChange={e => setMinScore(Number(e.target.value))} />
          </div>
          <label className="jobbr-check">
            <input type="checkbox" checked={remoteOnly} onChange={e => setRemoteOnly(e.target.checked)} />
            Remote only
          </label>
        </div>
        <p aria-live="polite" data-testid="jobbr-count">
          {visible.length} of {rows.length} postings shown.{!resume && ' Scores appear once you add a resume.'}
        </p>
        <ul className="jobbr-list">
          {visible.map(r => (
            <li key={r.id} className="jobbr-card">
              <h3>{r.job.title} at {r.job.company_name}</h3>
              <p>
                {r.job.location.join(', ')}{r.job.remote ? ' (remote)' : ''} | Salary: {salaryText(r.job)}
              </p>
              <p>Skills: {[...r.job.skills_required, ...r.job.skills_preferred].join(', ') || 'none found'}</p>
              {r.match && <p className="jobbr-score">Match score: {r.match.score === null ? 'n/a (all weights are zero)' : `${r.match.score} / 100`}</p>}
              <button type="button" aria-expanded={selected === r.id} onClick={() => setSelected(selected === r.id ? null : r.id)}>
                {selected === r.id ? 'Hide' : 'Show'} details for {r.job.title} at {r.job.company_name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {active && (
        <section aria-labelledby="jobbr-detail" className="jobbr-detail">
          <h2 id="jobbr-detail">Details: {active.job.title} at {active.job.company_name}</h2>
          <h3>Raw posting</h3>
          {/* Scrollable region: focusable so keyboard users can scroll it. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <pre tabIndex={0} aria-label="Raw posting text">{active.raw}</pre>
          <h3>Parsed fields</h3>
          <dl>
            <dt>company_name</dt><dd>{active.job.company_name ?? 'empty'}</dd>
            <dt>title</dt><dd>{active.job.title ?? 'empty'}</dd>
            <dt>description</dt><dd>{active.job.description ?? 'empty'}</dd>
            <dt>location</dt><dd>{active.job.location.join(', ') || 'empty'}{active.job.remote ? ' (remote)' : ''}</dd>
            <dt>requirements</dt><dd>{active.job.requirements.join('; ') || 'empty'}</dd>
            <dt>benefits</dt><dd>{active.job.benefits.join('; ') || 'empty'}</dd>
            <dt>salary</dt><dd>{salaryText(active.job)}</dd>
          </dl>
          <h3>Parser rules that fired</h3>
          <ul>{active.job.trace.map((t, i) => <li key={i}>{t}</li>)}</ul>
          <h3>Why this score</h3>
          {active.match ? (
            <>
              <table>
                <caption>Score breakdown (weight x fit)</caption>
                <thead><tr><th scope="col">Component</th><th scope="col">Fit</th><th scope="col">Weight</th><th scope="col">Detail</th></tr></thead>
                <tbody>
                  {active.match.parts.map(p => (
                    <tr key={p.key}>
                      <th scope="row">{p.label}</th>
                      <td>{Math.round(p.fit * 100)}%</td>
                      <td>{p.weight}</td>
                      <td>{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <svg role="img" aria-label={`Fit per component: ${active.match.parts.map(p => `${p.label} ${Math.round(p.fit * 100)}%`).join(', ')}`} viewBox="0 0 300 100" className="jobbr-bars">
                {active.match.parts.map((p, i) => (
                  <rect key={p.key} x="0" y={i * 25 + 4} width={Math.max(2, p.fit * 300)} height="16" rx="3" />
                ))}
              </svg>
              <p>Matched skills: {active.match.matched.join(', ') || 'none'}. Missing skills: {active.match.missing.join(', ') || 'none'}.</p>
              <p>Matched nice-to-have: {active.match.preferredMatched.join(', ') || 'none'}. Missing nice-to-have: {active.match.preferredMissing.join(', ') || 'none'}.</p>
            </>
          ) : (
            <p>Add a resume to see the score explanation.</p>
          )}
        </section>
      )}
    </main>
  );
}
