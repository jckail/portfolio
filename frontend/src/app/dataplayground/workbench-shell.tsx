import { useEffect, useState } from 'react';

import './workbench-shell.css';

import type { ReactNode } from 'react';

export type WorkbenchView =
  | 'overview'
  | 'operations'
  | 'sql'
  | 'lifecycle'
  | 'architecture'
  | 'exploration';
type WorkbenchViews = Record<'overview' | 'operations' | 'sql' | 'lifecycle', ReactNode> &
  Partial<Record<'architecture' | 'exploration', ReactNode>>;

const sections: { id: WorkbenchView; name: string; description: string }[] = [
  {
    id: 'overview',
    name: 'Overview',
    description: 'Follow data movement and inspect the current workspace.',
  },
  {
    id: 'operations',
    name: 'Operations',
    description: 'Produce events, consume batches, and inspect execution.',
  },
  { id: 'sql', name: 'SQL console', description: 'Query the workspace and inspect the results.' },
  {
    id: 'lifecycle',
    name: 'Lifecycle',
    description: 'Compare scenarios, inspect quality, and trace business metrics.',
  },
  {
    id: 'architecture',
    name: 'Architecture',
    description: 'Inspect workflow dependencies, data models, and engineering decisions.',
  },
  {
    id: 'exploration',
    name: 'Explore',
    description: 'Explore purchase relationships and product similarity.',
  },
];

const legacyAnchors: Record<string, WorkbenchView> = {
  'lab-pipeline': 'lifecycle',
  'lab-events': 'lifecycle',
  'lab-lineage': 'lifecycle',
  'lab-dags': 'architecture',
  'lab-models': 'architecture',
  'lab-decisions': 'architecture',
  'lab-exploration': 'exploration',
  'lab-graph': 'exploration',
  'lab-vectors': 'exploration',
};

export function viewForHash(hash: string): WorkbenchView | undefined {
  const target = hash.replace(/^#/, '');
  return (
    sections.find((section) => `workbench-${section.id}` === target)?.id || legacyAnchors[target]
  );
}

export default function WorkbenchShell({
  views,
  copilot,
}: {
  views: WorkbenchViews;
  copilot?: ReactNode;
}) {
  const available = sections.filter(
    (section) => views[section.id] !== undefined && views[section.id] !== null
  );
  const availableIds = available.map((item) => item.id).join(',');
  const resolveView = () => {
    const requested = viewForHash(window.location.hash);
    return available.some((section) => section.id === requested) ? requested! : 'overview';
  };
  const [active, setActive] = useState<WorkbenchView>(resolveView);
  const [copilotOpen, setCopilotOpen] = useState(window.innerWidth >= 1180);
  const section = sections.find((item) => item.id === active)!;

  useEffect(() => {
    const navigate = () => {
      const requested = viewForHash(window.location.hash);
      setActive(requested && availableIds.split(',').includes(requested) ? requested : 'overview');
    };
    window.addEventListener('hashchange', navigate);
    window.addEventListener('popstate', navigate);
    navigate();
    return () => {
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('popstate', navigate);
    };
  }, [availableIds]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(window.location.hash.slice(1));
      target?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active]);

  return (
    <div
      className={`lab-workbench-shell${copilotOpen && copilot ? ' lab-workbench-with-copilot' : ''}`}
    >
      <nav className="lab-workbench-nav" aria-label="Workbench sections">
        <p className="lab-workbench-nav-title">Workbench</p>
        <div className="lab-workbench-links">
          {available.map((item) => (
            <a
              key={item.id}
              id={`workbench-nav-${item.id}`}
              href={`#workbench-${item.id}`}
              aria-current={active === item.id ? 'page' : undefined}
              onClick={() => setActive(item.id)}
            >
              <span>{item.name}</span>
            </a>
          ))}
        </div>
        <p className="lab-workbench-nav-note">
          Synthetic data.
          <br />
          Reproducible execution.
        </p>
      </nav>
      <div className="lab-workbench-body">
        <div className="lab-workbench-view-heading">
          <div>
            <h2>{section.name}</h2>
            <p>{section.description}</p>
          </div>
          {copilot && (
            <button
              aria-expanded={copilotOpen}
              aria-controls="workbench-copilot"
              onClick={() => setCopilotOpen((value) => !value)}
            >
              {copilotOpen ? 'Hide copilot' : 'Show copilot'}
            </button>
          )}
        </div>
        {active === 'architecture' && (
          <nav className="lab-workbench-subnav" aria-label="Architecture sections">
            <a href="#lab-dags">Workflow execution</a>
            <a href="#lab-models">Data models</a>
            <a href="#lab-decisions">Engineering decisions</a>
          </nav>
        )}
        {active === 'exploration' && (
          <nav className="lab-workbench-subnav" aria-label="Explore sections">
            <a href="#lab-exploration">Product dataset</a>
            <a href="#lab-graph">Graph relationships</a>
            <a href="#lab-vectors">Vector similarity</a>
          </nav>
        )}
        {available.map((item) => (
          <section
            key={item.id}
            id={`workbench-${item.id}`}
            className="lab-workbench-panel"
            aria-labelledby={`workbench-nav-${item.id}`}
            hidden={active !== item.id}
          >
            {views[item.id]}
          </section>
        ))}
      </div>
      {copilot && (
        <aside
          id="workbench-copilot"
          className="lab-workbench-copilot"
          aria-label="Data copilot"
          hidden={!copilotOpen}
        >
          {copilot}
        </aside>
      )}
    </div>
  );
}
