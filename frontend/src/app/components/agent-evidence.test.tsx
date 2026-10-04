import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postJson } from '../../shared/utils/api';
import AgentEvidence from './agent-evidence';

vi.mock('../../shared/utils/api', () => ({ postJson: vi.fn() }));
const sample = { mode: 'public_evidence', answer: 'Public evidence', sources: [
  { id: 'projects:demo', title: 'Demo', url: 'https://www.jckail.com/?project=demo', snippets: ['Exact public passage'] },
] };

describe('AgentEvidence', () => {
  beforeEach(() => { vi.mocked(postJson).mockReset(); });
  it('retrieves grounded passages with usable links', async () => {
    vi.mocked(postJson).mockResolvedValue(sample);
    render(<AgentEvidence />);
    fireEvent.change(screen.getByLabelText('What would you like to explore?'), { target: { value: 'Python' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText('Exact public passage')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Demo' })).toHaveAttribute('href', sample.sources[0].url);
    expect(postJson).toHaveBeenCalledWith('/api/assistant/evidence', { query: 'Python' }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
  it('blocks duplicate dispatch and ignores a canceled result', async () => {
    let resolve: (value: typeof sample) => void = () => {};
    vi.mocked(postJson).mockImplementation(() => new Promise(r => { resolve = r; }));
    render(<AgentEvidence />);
    fireEvent.click(screen.getByRole('button', { name: 'agent systems' }));
    fireEvent.click(screen.getByRole('button', { name: 'agent systems' }));
    expect(postJson).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    resolve(sample);
    await waitFor(() => expect(screen.getByText(/Search canceled/)).toBeInTheDocument());
    expect(screen.queryByText('Exact public passage')).not.toBeInTheDocument();
  });
  it('shows quota errors and permits a later retry', async () => {
    vi.mocked(postJson).mockRejectedValueOnce(new Error('Quota exhausted')).mockResolvedValueOnce(sample);
    render(<AgentEvidence />);
    fireEvent.click(screen.getByRole('button', { name: 'agent systems' }));
    expect(await screen.findByText('Quota exhausted')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'data platforms' }));
    expect(await screen.findByText('Exact public passage')).toBeInTheDocument();
  });
  it('reports denied clipboard and demo access without an auth grant', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    render(<AgentEvidence />);
    fireEvent.click(screen.getByText('Connect your assistant'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Claude Code command' }));
    expect(await screen.findByText(/Clipboard unavailable/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Richer demos'));
    fireEvent.click(screen.getByRole('button', { name: 'Check demo access' }));
    expect(screen.getByText(/No sign-in, email or paid session/)).toBeInTheDocument();
    expect(postJson).not.toHaveBeenCalled();
  });
});
