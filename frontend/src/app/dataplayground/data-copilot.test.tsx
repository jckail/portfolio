import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, endpoints, getJson, postJson } from '../../shared/utils/api';
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

afterEach(() => vi.useRealTimers());

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

  it.each([false, true])(
    'excludes a tool-only empty reply from subsequent history (limited=%s)',
    async (limited) => {
      vi.mocked(postJson)
        .mockResolvedValueOnce({
          text: '',
          limited,
          proposals: [],
          events: [{ type: 'tool_result', tool: 'query_sql', result: { rows: [[48]] } }],
        })
        .mockResolvedValueOnce({
          text: 'Next investigation completed.',
          limited: false,
          events: [],
          proposals: [],
        });
      render(<DataCopilot catalog={catalog} />);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled()
      );
      fireEvent.click(screen.getByRole('button', { name: startersLabel }));
      await screen.findByText('query sql');
      fireEvent.change(screen.getByLabelText('Ask about this workspace'), {
        target: { value: 'Investigate the next question' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Investigate' }));
      await screen.findByText('Next investigation completed.');
      expect(vi.mocked(postJson).mock.calls[1][1]).toEqual({
        message: 'Investigate the next question',
        history: [{ role: 'user', text: startersLabel }],
      });
    }
  );

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
  it('retries only cleanup conflicts after Stop, without adding duplicate turns', async () => {
    vi.mocked(postJson).mockImplementationOnce(() => new Promise(() => {}));
    render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    vi.useFakeTimers();
    vi.mocked(postJson)
      .mockRejectedValueOnce(
        new ApiError(409, 'The previous investigation is still finishing. Retry shortly.')
      )
      .mockResolvedValueOnce({
        text: 'Follow-up completed.',
        proposals: [],
        events: [],
        limited: false,
      });
    fireEvent.change(screen.getByLabelText('Ask about this workspace'), {
      target: { value: 'A follow-up question' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Investigate' }));
    await act(async () => {});
    expect(postJson).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(postJson).toHaveBeenCalledTimes(3);
    expect(screen.getByText('Follow-up completed.')).toBeVisible();
    expect(screen.getAllByText('A follow-up question')).toHaveLength(1);
    expect(vi.mocked(postJson).mock.calls[2][1]).toEqual(vi.mocked(postJson).mock.calls[1][1]);
  });

  it.each([429, 503])('does not retry HTTP %s after Stop', async (status) => {
    vi.mocked(postJson).mockImplementationOnce(() => new Promise(() => {}));
    render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    vi.useFakeTimers();
    vi.mocked(postJson).mockRejectedValueOnce(new ApiError(status, 'Temporarily unavailable'));
    fireEvent.change(screen.getByLabelText('Ask about this workspace'), {
      target: { value: 'Follow up' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Investigate' }));
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(postJson).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('alert')).toHaveTextContent('Temporarily unavailable');
  });

  it('bounds cleanup retries to three additional attempts', async () => {
    vi.mocked(postJson).mockImplementationOnce(() => new Promise(() => {}));
    render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    vi.useFakeTimers();
    vi.mocked(postJson).mockRejectedValue(new ApiError(409, 'Still finishing'));
    fireEvent.change(screen.getByLabelText('Ask about this workspace'), {
      target: { value: 'Follow up' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Investigate' }));
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(postJson).toHaveBeenCalledTimes(5);
    expect(screen.getByRole('alert')).toHaveTextContent('Still finishing');
    expect(screen.queryByText('Investigating with lab tools…')).not.toBeInTheDocument();
  });

  it('cancels a cleanup retry delay when the workspace changes', async () => {
    vi.mocked(postJson).mockImplementationOnce(() => new Promise(() => {}));
    const { rerender } = render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    vi.useFakeTimers();
    vi.mocked(postJson).mockRejectedValueOnce(new ApiError(409, 'Still finishing'));
    fireEvent.change(screen.getByLabelText('Ask about this workspace'), {
      target: { value: 'Follow up' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Investigate' }));
    await act(async () => {});
    workspace('new-workspace');
    rerender(<DataCopilot catalog={catalog} />);
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(postJson).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it.each(['Stop', 'unmount'])('cancels a cleanup retry delay on %s', async (operation) => {
    vi.mocked(postJson).mockImplementationOnce(() => new Promise(() => {}));
    const { unmount } = render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    vi.useFakeTimers();
    vi.mocked(postJson).mockRejectedValueOnce(new ApiError(409, 'Still finishing'));
    fireEvent.change(screen.getByLabelText('Ask about this workspace'), {
      target: { value: 'Follow up' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Investigate' }));
    await act(async () => {});
    if (operation === 'Stop') fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    else unmount();
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(postJson).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not retry a workspace conflict without an explicit local Stop', async () => {
    vi.mocked(postJson).mockRejectedValueOnce(new ApiError(409, 'Still finishing'));
    render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    await screen.findByRole('alert');
    expect(postJson).toHaveBeenCalledTimes(1);
  });
});
const startersLabel = 'Inspect my workspace and explain how records move through it.';

describe('structured investigation evidence', () => {
  it.each(['rejected execution', 'unknown network outcome'])(
    'retires the single-use proposal after %s and directs fresh inspection',
    async (outcome) => {
      if (outcome === 'rejected execution') confirm.mockResolvedValueOnce(false);
      else confirm.mockRejectedValueOnce(new Error('Connection interrupted'));
      vi.mocked(postJson).mockResolvedValue({
        text: 'Inspect this proposed change.',
        limited: false,
        events: [],
        proposals: [
          {
            id: 'consumed-proposal',
            action: { action: 'produce', partitions: 4 },
            reason: 'Change partitions.',
            expires_in_seconds: 600,
          },
        ],
      });
      render(<DataCopilot catalog={catalog} />);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled()
      );
      fireEvent.click(screen.getByRole('button', { name: startersLabel }));
      fireEvent.click(await screen.findByRole('button', { name: 'Apply change' }));
      await screen.findByText(/Outcome not confirmed/);
      expect(screen.queryByRole('button', { name: 'Apply change' })).not.toBeInTheDocument();
      expect(screen.getByText(/Outcome not confirmed/)).toHaveTextContent(
        'Inspect the current workspace before requesting a new proposal'
      );
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled();
    }
  );
  it('ignores a late confirmation failure after a same-token reset', async () => {
    let rejectConfirmation!: (reason: Error) => void;
    confirm.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectConfirmation = reject;
        })
    );
    vi.mocked(postJson).mockResolvedValue({
      text: 'Review the consumer change.',
      limited: false,
      events: [],
      proposals: [
        {
          id: 'old-generation-proposal',
          action: { action: 'consumer_pause' },
          reason: 'Inspect lag.',
          expires_in_seconds: 600,
        },
      ],
    });
    vi.mocked(useRuntime).mockReturnValue({
      ...useRuntime(),
      state: { ...state, workspace_generation: 1 },
    });
    const { rerender } = render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    fireEvent.click(await screen.findByRole('button', { name: 'Apply change' }));
    vi.mocked(useRuntime).mockReturnValue({
      ...useRuntime(),
      state: { ...state, workspace_generation: 2 },
    });
    rerender(<DataCopilot catalog={catalog} />);
    await act(async () => rejectConfirmation(new Error('Old confirmation failed')));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Review the consumer change.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Investigate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled();
  });
  it('renders SQL samples with their actual query provenance and retains raw evidence', async () => {
    vi.mocked(postJson).mockResolvedValue({
      text: 'Eight bounded rows were returned.',
      limited: false,
      proposals: [],
      events: [
        {
          type: 'tool_result',
          tool: 'query_sql',
          result: {
            sql: 'SELECT event_id FROM events',
            columns: ['event_id'],
            rows: [['event-1']],
            row_count: 8,
            row_limit: 8,
            truncated: true,
            elapsed_ms: 2,
            sampled_row_count: 1,
            sample_truncated: true,
            workspace_generation: 1,
            data_revision: 5,
          },
        },
      ],
    });
    render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    await screen.findByText('Eight bounded rows were returned.');
    fireEvent.click(screen.getByText('query sql'));
    expect(screen.getByRole('region', { name: 'Copilot SQL evidence' })).toBeVisible();
    expect(screen.getByText(/1 rows shown from 8 returned/)).toBeVisible();
    expect(screen.getByText(/generation 1, data revision 5/)).toBeVisible();
    fireEvent.click(screen.getByText('Raw tool evidence'));
    expect(screen.getByText(/"sampled_row_count": 1/)).toBeVisible();
  });
  it('clears a conversation and ignores old investigation results after a same-token reset', async () => {
    let finish!: (reply: unknown) => void;
    vi.mocked(postJson).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    vi.mocked(useRuntime).mockReturnValue({
      ...useRuntime(),
      state: { ...state, workspace_generation: 1 },
    });
    const { rerender } = render(<DataCopilot catalog={catalog} />);
    await waitFor(() => expect(screen.getByRole('button', { name: startersLabel })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: startersLabel }));
    vi.mocked(useRuntime).mockReturnValue({
      ...useRuntime(),
      state: { ...state, workspace_generation: 2 },
    });
    rerender(<DataCopilot catalog={catalog} />);
    await act(async () =>
      finish({ text: 'Old workspace answer', events: [], proposals: [], limited: false })
    );
    expect(screen.queryByText('Old workspace answer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();
  });
});
