import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

const getJson = vi.fn();
const openAgent = vi.fn();
vi.mock('../../../shared/utils/api', () => ({
  getJson: (...args: unknown[]) => getJson(...args),
  endpoints: { chatStatus: '/api/chat/status' },
}));
vi.mock('../../../shared/utils/agent-link', () => ({ openAgent: () => openAgent() }));

import ChatPortal from './chat-portal';
import { isChatAvailable, setChatAvailable } from '../../../shared/utils/chat-availability';
import { useThemeStore } from '../../../shared/stores/theme-store';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  getJson.mockResolvedValue({ available: true });
  openAgent.mockClear();
  setChatAvailable(true);
  useThemeStore.setState({ theme: 'dark' });
});
afterEach(cleanup);

describe('dedicated assistant entry point', () => {
  it('links to the gated route and preserves the active theme', async () => {
    useThemeStore.setState({ theme: 'light' });
    render(<ChatPortal />);
    expect(screen.getByRole('link', { name: 'Chat with AI' })).toHaveAttribute('href', '/agent?theme=light');
    await act(async () => {});
  });
  it('hands a legacy chat deep link to the dedicated route', async () => {
    window.history.replaceState({}, '', '/?ai_chat=open');
    render(<ChatPortal />);
    await act(async () => {});
    expect(openAgent).toHaveBeenCalledOnce();
  });
  it('hands existing shortcut events to the dedicated route', async () => {
    render(<ChatPortal />);
    await act(async () => {});
    act(() => {
      window.history.pushState({}, '', '/?ai_chat=open');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(openAgent).toHaveBeenCalledOnce();
  });
  it('hides the launcher and updates availability if the backend is unavailable', async () => {
    getJson.mockResolvedValue({ available: false });
    render(<ChatPortal />);
    await act(async () => {});
    expect(screen.queryByRole('link', { name: 'Chat with AI' })).toBeNull();
    expect(isChatAvailable()).toBe(false);
  });
});
