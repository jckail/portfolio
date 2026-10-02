import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

import { CopyLinkButton } from './copy-link-button';

const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (execCommandDescriptor) Object.defineProperty(document, 'execCommand', execCommandDescriptor);
  else Reflect.deleteProperty(document, 'execCommand');
});

describe('CopyLinkButton', () => {
  it('announces failed copying and supports a successful retry', async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
    render(<CopyLinkButton url="https://example.com/share" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    const retry = await screen.findByRole('button', { name: 'Copy failed. Retry' });
    expect(retry).toHaveAttribute('aria-live', 'polite');
    expect(retry).toHaveAttribute('title', expect.stringContaining('copy the page address'));
    fireEvent.click(retry);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument());
    expect(writeText).toHaveBeenLastCalledWith('https://example.com/share');
    expect(screen.getByRole('button')).not.toHaveAttribute('title');
  });
});
