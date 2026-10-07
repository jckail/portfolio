import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { SuggestedPrompts } from './SuggestedPrompts';

afterEach(cleanup);

describe('Recruiter suggested prompts', () => {
  it('offers distinct tasks and asks for a job description before assessing fit', () => {
    const onSelect = vi.fn();
    render(<SuggestedPrompts onSelect={onSelect} />);
    expect(screen.getAllByRole('button')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Compare a role' }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.stringContaining('Ask me to paste the job description')
    );
    expect(onSelect).toHaveBeenCalledWith(expect.stringContaining('identify gaps'));
  });

  it('keeps outreach a reviewable request rather than promising a booking', () => {
    const onSelect = vi.fn();
    render(<SuggestedPrompts onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draft an introduction' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.stringContaining('before anything is sent'));
    fireEvent.click(screen.getByRole('button', { name: 'Request a meeting' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.stringContaining('not a confirmed booking'));
    expect(onSelect).toHaveBeenLastCalledWith(expect.stringContaining('timezone'));
  });

  it('prevents suggested requests while a response is in progress', () => {
    const onSelect = vi.fn();
    render(<SuggestedPrompts onSelect={onSelect} disabled />);
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });
});
