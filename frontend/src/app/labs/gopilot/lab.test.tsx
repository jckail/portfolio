import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import GoPilotLab from './lab';

const term = () => screen.getByRole('log');

describe('GoPilotLab', () => {
  it('renders one h1, the notice and the equivalent command', () => {
    render(<GoPilotLab />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('note').textContent).toMatch(/illustrative/i);
    expect(screen.getAllByText('./localtest/run.sh -u true -r true -n true -t true').length).toBeGreaterThan(0);
  });

  it('toggles flags into the command line and resets the replay', () => {
    render(<GoPilotLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(term().textContent).toContain('Uploading');
    fireEvent.click(screen.getByLabelText(/Run linter/));
    expect(screen.getAllByText('./localtest/run.sh -u true -r true -t true').length).toBeGreaterThan(0);
    expect(term().textContent).not.toContain('Uploading');
  });

  it('steps through the pipeline and shows the reply and diff', () => {
    render(<GoPilotLab />);
    expect(screen.getByText(/Step the replay through/)).toBeTruthy();
    const next = screen.getByRole('button', { name: 'Next step' });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(term().textContent).toContain('Running code...');
    fireEvent.click(screen.getByRole('button', { name: 'Run all steps' }));
    expect(term().textContent).toContain('thread_DEMO_test');
    expect(screen.getByText(/not model output/)).toBeTruthy();
    expect(screen.getByLabelText('Diff of the suggested fix').textContent).toContain('return 0');
    expect(screen.getByRole('button', { name: 'Replay finished' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset replay' }));
    expect(term().textContent).not.toContain('thread_DEMO');
  });

  it('skips disabled stages and shows no reply without any', () => {
    render(<GoPilotLab />);
    fireEvent.click(screen.getByRole('button', { name: 'All defaults' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run all steps' }));
    expect(term().textContent).toContain('Run: skipped, its flag is off');
    expect(screen.getByText(/Step the replay through/)).toBeTruthy();
  });

  it('switches the assembled request between stages and edits paths', () => {
    render(<GoPilotLab />);
    fireEvent.click(screen.getByRole('button', { name: /^Lint/ }));
    expect(screen.getAllByText(/stats\.go:3:1/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/Lint output path/), { target: { value: '/tmp/l.txt' } });
    expect(screen.getAllByText(/-l \/tmp\/l\.txt/).length).toBeGreaterThan(0);
  });

  it('switches reply tabs after the ask step', () => {
    render(<GoPilotLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Run all steps' }));
    const group = screen.getByRole('group', { name: 'Show the reply for stage' });
    fireEvent.click(group.querySelectorAll('button')[1]);
    expect(screen.getByText(/revive wants a doc comment/)).toBeTruthy();
  });
});
