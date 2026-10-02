import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { endpoints, getJson, postJson } from '../../shared/utils/api';
import { DataCopilot } from './data-copilot';
import { useRuntime } from './use-runtime';

import type { Catalog } from './types';
import type { RuntimeState } from './runtime-types';

vi.mock('../../shared/utils/api', async (original) => ({
  ...(await original<typeof import('../../shared/utils/api')>()),
  getJson: vi.fn(),
  postJson: vi.fn(),
}));
vi.mock('./use-runtime', () => ({ useRuntime: vi.fn() }));
const catalog = { engine_version: '1.0.0' } as Catalog;
const state = { scenario_id: 'baseline', streaming: { backlog: 4 } } as RuntimeState;
const confirm = vi.fn();
function workspace(token: string | null = 'workspace-capability') {
  vi.mocked(useRuntime).mockReturnValue({
    session: token ? { token, state, expires_in_seconds: 1200 } : null,
    state: token ? state : null,
    confirm,
    loading: false,
    error: '',
    create: vi.fn(),
    action: vi.fn(),
    query: vi.fn(),
    refresh: vi.fn(),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  confirm.mockResolvedValue(true);
  workspace();
  vi.mocked(getJson).mockResolvedValue({ available: true });
});

describe('Data Copilot', () => {
  it('requires a workspace and explains model availability without inventing a reply', async () => {
    workspace(null);
    vi.mocked(getJson).mockResolvedValue({ available: false });
    render(<DataCopilot catalog={catalog} />);
    expect(screen.getByText(/Create an isolated workspace/)).toBeVisible();
    await screen.findByText(/model connection is unavailable/);
    expect(screen.getByRole('button', { name: 'Investigate' })).toBeDisabled();
    expect(postJson).not.toHaveBeenCalled();
  });

  it('runs an investigation with bounded history and displays actual SQL evidence', async () => {
    vi.mocked(postJson).mockResolvedValue({
      text: '**Four** records remain queued.',
      limited: false,
      proposals: [],
      events: [
        { type: 'tool_result', tool: 'query_sql', result: { columns: ['backlog'], rows: [[4]] } },
      ],
    });
    render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Ask about this workspace'), {
      target: { value: 'Count queued events' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Investigate' }));
    await screen.findByText('Four');
    expect(postJson).toHaveBeenCalledWith(
      endpoints.dataPlaygroundCopilotChat,
      { message: 'Count queued events', history: [] },
      expect.objectContaining({ headers: { Authorization: 'Bearer workspace-capability' } })
    );
    fireEvent.click(screen.getByText('query sql'));
    expect(screen.getByText(/"backlog"/)).toBeVisible();
  });

  it('requires Apply before mutation and dismisses another proposal without an API call', async () => {
    const proposal = {
      id: 'single-use-proposal',
      action: { action: 'consumer_pause' },
      reason: 'Observe lag.',
      expires_in_seconds: 600,
    };
    vi.mocked(postJson).mockResolvedValueOnce({
      text: 'Review this change.',
      limited: false,
      events: [],
      proposals: [proposal, { ...proposal, id: 'dismiss-me' }],
    });
    render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    await screen.findByText('Review this change.');
    expect(postJson).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[1]);
    expect(postJson).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Apply change' }));
    await screen.findByText('Applied to this workspace.');
    expect(confirm).toHaveBeenCalledWith('single-use-proposal');
  });

  it('discards an old reply when the workspace changes', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(postJson).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const { rerender } = render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    workspace('different-workspace');
    rerender(<DataCopilot catalog={catalog} />);
    await act(async () =>
      resolve({ text: 'Old workspace reply', proposals: [], events: [], limited: false })
    );
    expect(screen.queryByText('Old workspace reply')).not.toBeInTheDocument();
  });

  it('exposes recoverable errors and allows stopping a pending investigation', async () => {
    vi.mocked(postJson).mockRejectedValueOnce(new Error('Temporarily unavailable'));
    render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Temporarily unavailable');
    vi.mocked(postJson).mockImplementation(() => new Promise(() => {}));
    fireEvent.change(screen.getByLabelText('Ask about this workspace'), {
      target: { value: 'Try again' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Investigate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.queryByText('Investigating with lab tools…')).not.toBeInTheDocument();
  });

  it('does not let a stopped request clear the busy state of a newer investigation', async () => {
    const pending: ((value: unknown) => void)[] = [];
    vi.mocked(postJson).mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    fireEvent.change(screen.getByLabelText('Ask about this workspace'), {
      target: { value: 'A newer question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Investigate' }));
    await act(async () =>
      pending[0]({ text: 'Stopped response', events: [], proposals: [], limited: false })
    );
    expect(screen.queryByText('Stopped response')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Investigate' })).toBeDisabled();
    expect(screen.getByText('Investigating with lab tools…')).toBeVisible();
    await act(async () =>
      pending[1]({ text: 'Current response', events: [], proposals: [], limited: false })
    );
    expect(screen.getByText('Current response')).toBeVisible();
  });
});
const startersLabel = 'Inspect my workspace and explain how records move through it.';
