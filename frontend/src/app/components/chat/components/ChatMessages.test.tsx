import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ChatMessages } from './ChatMessages';

afterEach(cleanup);

describe('ChatMessages response status', () => {
  it('keeps a polite status mounted and announces waiting without moving focus', () => {
    const { rerender } = render(<ChatMessages messages={[]} isLoading={false} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toBeEmptyDOMElement();
    const focused = document.activeElement;

    rerender(<ChatMessages messages={[{ type: 'user', text: 'A question' }]} isLoading />);
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent('Assistant is responding.');
    expect(document.activeElement).toBe(focused);
  });

  it('does not repeat response chunks in the live status and clears it when finished', () => {
    const { rerender } = render(<ChatMessages messages={[]} isLoading />);
    const status = screen.getByRole('status');
    const stream = (text: string) => [{ type: 'agent' as const, text, isStreaming: true }];

    rerender(<ChatMessages messages={stream('First chunk')} isLoading />);
    expect(status).toHaveTextContent(/^Assistant is responding\.$/);
    rerender(<ChatMessages messages={stream('First chunk and another')} isLoading />);
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent(/^Assistant is responding\.$/);

    rerender(<ChatMessages messages={[{ type: 'agent', text: 'Final answer' }]} isLoading={false} />);
    expect(status).toBeEmptyDOMElement();
    expect(screen.getByText('Final answer')).toBeInTheDocument();
  });
});
