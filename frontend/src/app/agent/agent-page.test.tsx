import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AgentPage from './agent-page';

const getJson = vi.fn();
const useChat = vi.fn((..._args: unknown[]) => ({
  messages: [], portfolioCards: [], pendingActions: [], isLoading: false, showSuggestions: false,
  message: '', setMessage: vi.fn(), handleSuggestedPrompt: vi.fn(), handleSendMessage: vi.fn(),
  confirmAction: vi.fn(), cancelAction: vi.fn(),
}));
vi.mock('../../shared/utils/api', () => ({ getJson: (...args: unknown[]) => getJson(...args) }));
vi.mock('../components/chat/hooks/useChat', () => ({ useChat: (...args: unknown[]) => useChat(...args) }));
const evidence = { profile: { name: 'Jordan Kail', title: 'Engineer', location: 'USA', github: '', linkedin: '' },
  experience: [], projects: [], skillGroups: [] };
const receipt = { token: 'test-token', expires_at: new Date(Date.now() + 3600000).toISOString() };
beforeEach(() => {
  sessionStorage.clear(); useChat.mockClear(); getJson.mockReset();
  getJson.mockImplementation((path: string) => path === '/context.json' ? Promise.resolve(evidence) : Promise.resolve(receipt));
});
afterEach(cleanup);

function introduce() {
  fireEvent.change(screen.getByLabelText('Your email'), { target: { value: 'visitor@example.com' } });
  fireEvent.change(screen.getByLabelText('Company or organization'), { target: { value: 'Acme' } });
  fireEvent.click(screen.getByRole('button', { name: /Start the conversation/ }));
}
describe('assistant route gate', () => {
  it('does not initialize chat until the introduction is accepted', async () => {
    render(<AgentPage />);
    expect(screen.getByRole('heading', { name: /Explore what we could build/ })).toBeInTheDocument();
    expect(useChat).not.toHaveBeenCalled();
    introduce();
    await screen.findByRole('region', { name: /Conversation with Jordan/ });
    expect(useChat).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'test-token', fullPage: true }));
    expect(screen.queryByLabelText('Your email')).toBeNull();
  });
  it('keeps the gate on a notification failure and allows retry', async () => {
    getJson.mockImplementation((path: string) => path === '/context.json' ? Promise.resolve(evidence) : Promise.reject(new Error('Failed')));
    render(<AgentPage />); introduce();
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t unlock/);
    expect(useChat).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Start the conversation/ })).toBeEnabled();
  });
  it('rejects expired restored access before mounting chat', async () => {
    sessionStorage.setItem('portfolio_agent_access', JSON.stringify(receipt));
    getJson.mockImplementation((path: string) => path === '/context.json' ? Promise.resolve(evidence) : Promise.reject(new Error('Expired')));
    render(<AgentPage />);
    await waitFor(() => expect(screen.getByLabelText('Your email')).toBeInTheDocument());
    expect(useChat).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('portfolio_agent_access')).toBeNull();
  });
  it('requires both a valid email and company before sending', () => {
    render(<AgentPage />);
    fireEvent.click(screen.getByRole('button', { name: /Start the conversation/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Enter your email/);
    expect(getJson).toHaveBeenCalledTimes(1);
  });
});
