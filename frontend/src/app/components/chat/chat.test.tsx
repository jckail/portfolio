import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

vi.mock('./components/ChatMessages', () => ({ ChatMessages: () => null }));
vi.mock('./components/ChatInput', () => ({ ChatInput: () => null }));
vi.mock('../../../shared/utils/analytics', () => ({
  trackChatOpen: vi.fn(() => Promise.resolve()),
}));

import Chat from './chat';

import type { UseChatReturn } from './hooks/useChat';

const props = (open: boolean) =>
  ({
    open,
    setOpen: vi.fn(),
    message: '',
    setMessage: vi.fn(),
    messages: [],
    isLoading: false,
    handleSendMessage: vi.fn(),
    handleSuggestedPrompt: vi.fn(),
    showSuggestions: false,
    pendingActions: [],
    confirmAction: vi.fn(),
    cancelAction: vi.fn(),
  }) as unknown as UseChatReturn;

afterEach(() => cleanup());

describe('Chat launcher focus', () => {
  it('labels the dialog and explains AI, storage and visitor confirmation', () => {
    render(<Chat {...props(true)} />);
    expect(screen.getByRole('dialog', { name: "Jordan's AI portfolio assistant" })).toHaveAttribute(
      'aria-describedby',
      'portfolio-assistant-disclosure'
    );
    expect(screen.getByText(/AI answers can be mistaken/)).toHaveTextContent(
      'Chat messages are stored'
    );
    expect(screen.getByText(/enter your email in the confirmation card/)).toHaveTextContent(
      'Nothing is sent until you confirm'
    );
  });

  it('returns focus to the launcher after the dialog closes', async () => {
    const { rerender } = render(<Chat {...props(false)} />);
    rerender(<Chat {...props(true)} />);
    expect(screen.queryByRole('button', { name: 'Chat with AI' })).toBeNull();

    rerender(<Chat {...props(false)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Chat with AI' })).toHaveFocus());
  });

  it('does not steal focus on first render', () => {
    render(<Chat {...props(false)} />);
    expect(screen.getByRole('button', { name: 'Chat with AI' })).not.toHaveFocus();
  });
});
