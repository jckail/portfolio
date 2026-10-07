import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

const getJson = vi.fn();
vi.mock('../../../shared/utils/api', () => ({ getJson: (...args: unknown[]) => getJson(...args), endpoints: { chatStatus: '/api/chat/status' } }));
vi.mock('./agent-drawer', () => ({ default: ({ open, onClose }: { open: boolean; onClose: () => void }) => open
  ? <div role="dialog" aria-label="Chat with my Agent"><button onClick={onClose}>Close Agent chat</button></div> : null }));
import ChatPortal from './chat-portal';
import { openAgent } from '../../../shared/utils/agent-link';
import { isChatAvailable, setChatAvailable } from '../../../shared/utils/chat-availability';

beforeEach(() => { window.history.replaceState({}, '', '/'); getJson.mockResolvedValue({ available: true }); setChatAvailable(true); });
afterEach(cleanup);
describe('lazy right chat pane entry', () => {
  it('opens the pane from the launcher and closes it without navigating away', async () => {
    render(<ChatPortal />);
    fireEvent.click(screen.getByRole('button', { name: 'Chat with my Agent' }));
    await screen.findByRole('dialog', { name: 'Chat with my Agent' });
    expect(location.pathname).toBe('/');
    fireEvent.click(screen.getByRole('button', { name: 'Close Agent chat' }));
    expect(screen.getByRole('button', { name: 'Chat with my Agent' })).toBeInTheDocument();
  });
  it('opens from site invitations and legacy deep links', async () => {
    render(<ChatPortal />); act(() => openAgent());
    await screen.findByRole('dialog', { name: 'Chat with my Agent' });
    expect(location.search).toContain('ai_chat=open');
  });
  it('honors an initial legacy deep link', async () => {
    window.history.replaceState({}, '', '/?ai_chat=open'); render(<ChatPortal />);
    await screen.findByRole('dialog', { name: 'Chat with my Agent' });
  });
  it('hides the launcher when chat is unavailable', async () => {
    getJson.mockResolvedValue({ available: false }); render(<ChatPortal />); await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Chat with my Agent' })).toBeNull();
    expect(isChatAvailable()).toBe(false);
  });
});
