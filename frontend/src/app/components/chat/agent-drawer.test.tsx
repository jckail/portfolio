import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../agent/agent-conversation', () => ({
  AgentConversation: () => <div>conversation</div>,
}));

import AgentDrawer from './agent-drawer';
import { pushDialog, removeDialog } from '../../../shared/hooks/dialog-stack';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

function matchMedia(mobile: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: mobile && String(query).includes('max-width'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function renderDrawer(mobile: boolean) {
  matchMedia(mobile);
  return render(
    <ThemeProvider theme={createTheme()}>
      <button type="button">Contact</button>
      <AgentDrawer open onClose={() => {}} />
    </ThemeProvider>,
  );
}

describe('agent drawer page interaction', () => {
  it('yields mobile focus to a portfolio dialog and resumes after it closes', async () => {
    renderDrawer(true);
    await screen.findByRole('dialog', { name: 'Chat with my Agent' });
    const modal = document.createElement('div');
    const input = document.createElement('input');
    modal.append(input);
    document.body.append(modal);
    const id = Symbol('contact');
    act(() => pushDialog(id, modal));
    act(() => input.focus());
    expect(input).toHaveFocus();
    act(() => removeDialog(id));
    act(() => screen.getByRole('button', { name: 'Close Agent chat' }).focus());
    act(() => input.focus());
    expect(input).not.toHaveFocus();
    modal.remove();
  });
  it('leaves Contact clickable and focused while the desktop panel is open', async () => {
    renderDrawer(false);
    const dialog = await screen.findByRole('dialog', { name: 'Chat with my Agent' });
    const contact = screen.getByRole('button', { name: 'Contact' });
    const root = dialog.closest('.MuiModal-root');
    expect(root?.parentElement).not.toBe(document.body);
    expect(contact.closest('[aria-hidden="true"]')).toBeNull();
    contact.focus();
    expect(document.activeElement).toBe(contact);
    expect(root).toHaveStyle({ pointerEvents: 'none' });
  });

  it('keeps the phone panel modal so it covers the page', async () => {
    renderDrawer(true);
    const dialog = await screen.findByRole('dialog', { name: 'Chat with my Agent' });
    expect(dialog.closest('.MuiModal-root')?.parentElement).not.toBe(document.body);
    expect(dialog.closest('.MuiDialog-root')).toHaveClass('MuiModal-root');
  });
});
