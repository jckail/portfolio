import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../agent/agent-conversation', () => ({
  AgentConversation: () => <div>conversation</div>,
}));

import AgentDrawer from './agent-drawer';

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
    expect(dialog.closest('.MuiModal-root')?.parentElement).toBe(document.body);
  });
});
