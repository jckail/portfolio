import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import WorkbenchShell, { viewForHash } from './workbench-shell';

function StatefulView() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((value) => value + 1)}>Retained selection {count}</button>;
}
const views = {
  overview: <p>Overview content</p>,
  operations: <p>Operations content</p>,
  sql: <p>SQL content</p>,
  lifecycle: <StatefulView />,
  architecture: <h3 id="lab-models">Model content</h3>,
  exploration: <h3 id="lab-graph">Graph content</h3>,
};
function navigate(hash: string) {
  act(() => {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}
beforeEach(() => window.history.replaceState(null, '', '/dataplayground'));
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/dataplayground');
});

describe('workbench navigation', () => {
  it('shows one view at a time while retaining interactive state across navigation', () => {
    render(<WorkbenchShell views={views} />);
    expect(screen.getByRole('region', { name: 'Overview' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Lifecycle' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Lifecycle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retained selection 0' }));
    fireEvent.click(screen.getByRole('link', { name: 'SQL console' }));
    expect(screen.queryByRole('button', { name: 'Retained selection 1' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Lifecycle' }));
    expect(screen.getByRole('button', { name: 'Retained selection 1' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Lifecycle' })).toHaveAttribute('aria-current', 'page');
  });
  it('opens legacy deep links and responds to history navigation', () => {
    window.history.replaceState(null, '', '#lab-graph');
    render(<WorkbenchShell views={views} />);
    expect(screen.getByRole('region', { name: 'Explore' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('aria-current', 'page');
    navigate('#lab-models');
    expect(screen.getByRole('region', { name: 'Architecture' })).toBeVisible();
    act(() => {
      window.history.replaceState(null, '', '#workbench-operations');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('region', { name: 'Operations' })).toBeVisible();
    expect(viewForHash('#lab-lineage')).toBe('lifecycle');
    expect(viewForHash('#unrecognized')).toBeUndefined();
  });
  it('omits unavailable catalog views and falls back safely from their old links', () => {
    window.history.replaceState(null, '', '#lab-models');
    render(
      <WorkbenchShell views={{ ...views, architecture: undefined, exploration: undefined }} />
    );
    expect(screen.queryByRole('link', { name: 'Architecture' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Explore' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Overview' })).toBeVisible();
  });
  it('exposes a collapsible copilot with disclosure state', () => {
    render(<WorkbenchShell views={views} copilot={<p>Copilot content</p>} />);
    const toggle = screen.getByRole('button', { name: /copilot$/ });
    if (toggle.getAttribute('aria-expanded') === 'true') fireEvent.click(toggle);
    expect(screen.queryByRole('complementary', { name: 'Data copilot' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show copilot' }));
    expect(screen.getByRole('complementary', { name: 'Data copilot' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hide copilot' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});
