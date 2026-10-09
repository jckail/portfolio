import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AgentPage from './agent-page';

const getJson = vi.fn();
const chat = { messages: [], portfolioCards: [], pendingActions: [], isLoading: false, showSuggestions: false,
  message: 'Preserved draft', setMessage: vi.fn(), handleSuggestedPrompt: vi.fn(), handleSendMessage: vi.fn(),
  confirmAction: vi.fn(), cancelAction: vi.fn() };
const useChat = vi.fn((..._args: unknown[]) => chat);
vi.mock('../../shared/utils/api', async importOriginal => ({ ...await importOriginal<typeof import('../../shared/utils/api')>(), getJson: (...args: unknown[]) => getJson(...args) }));
vi.mock('../components/chat/hooks/useChat', () => ({ useChat: (...args: unknown[]) => useChat(...args) }));
const evidence = { profile: { name: 'Jordan Kail', title: 'Engineer', location: 'USA', github: '', linkedin: '' },
  experience: [], projects: [], skillGroups: [] };
const full = { token: 'full-token', expires_at: new Date(Date.now() + 3600000).toISOString() };
const trial = { ...full, token: 'trial-token', mode: 'trial', remaining_messages: 2 };
beforeEach(() => {
  sessionStorage.clear(); useChat.mockClear(); getJson.mockReset(); chat.isLoading = false; chat.showSuggestions = false;
  getJson.mockImplementation((path: string) => Promise.resolve(path === '/context.json' ? evidence : path === '/api/agent/trial' ? trial : full));
});
afterEach(cleanup);
function options() { return useChat.mock.calls.at(-1)![0] as { onAccessStatus: (n: number) => void; onAccessRequired: () => void }; }
async function introduce() {
  fireEvent.change(await screen.findByLabelText('Your email'), { target: { value: 'visitor@example.com' } });
  fireEvent.change(screen.getByLabelText('Company or organization'), { target: { value: 'Acme' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue the conversation/ }));
}
describe('shared assistant trial flow', () => {
  it('initializes anonymous access before connecting with its credential', async () => {
    render(<AgentPage />);
    expect(useChat).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    await screen.findByText(/2 introductory messages/);
    expect(useChat).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true, accessToken: 'trial-token' }));
    expect(screen.queryByLabelText('Your email')).toBeNull();
  });
  it('waits for the second reply to finish, then upgrades without resetting the draft', async () => {
    const view = render(<AgentPage />); await screen.findByText(/2 introductory messages/);
    chat.isLoading = true;
    act(() => options().onAccessStatus(0));
    expect(screen.queryByLabelText('Your email')).toBeNull();
    chat.isLoading = false; view.rerender(<AgentPage />);
    await introduce();
    await waitFor(() => expect(useChat).toHaveBeenLastCalledWith(expect.objectContaining({ accessToken: 'full-token' })));
    expect(screen.queryByLabelText('Your email')).toBeNull();
    expect(chat.setMessage).not.toHaveBeenCalledWith('');
  });
  it('keeps the introduction form and transcript on notification failure', async () => {
    render(<AgentPage />); await screen.findByText(/2 introductory messages/);
    act(() => options().onAccessRequired());
    getJson.mockRejectedValue(new Error('Notification failed'));
    await introduce();
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t make your introduction/);
    expect(screen.getByRole('button', { name: /Continue the conversation/ })).toBeEnabled();
  });
  it('restores an exhausted trial from the server without issuing another trial', async () => {
    sessionStorage.setItem('portfolio_agent_access', JSON.stringify(trial));
    getJson.mockImplementation((path: string) => Promise.resolve(path === '/context.json' ? evidence : { valid: true, ...trial, remaining_messages: 0 }));
    render(<AgentPage />); await screen.findByLabelText('Your email');
    expect(getJson.mock.calls.some(call => call[0] === '/api/agent/trial')).toBe(false);
  });
  it('keeps optional portfolio evidence accessible without replacing the conversation', async () => {
    render(<AgentPage />);
    await screen.findByText(/2 introductory messages/);
    const conversation = screen.getByRole('region', { name: "Conversation with Jordan's Agent" });
    const toggle = screen.getByRole('button', { name: 'View portfolio evidence' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chat with my Agent');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide portfolio evidence' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Hide portfolio evidence' }));
    expect(screen.getByRole('region', { name: "Conversation with Jordan's Agent" })).toBe(conversation);
    expect(screen.getByRole('textbox', { name: 'Message the AI assistant' })).toHaveValue('Preserved draft');
  });
  it('opens agent connection instructions in place and preserves the conversation draft', async () => {
    render(<AgentPage />);
    await screen.findByText(/2 introductory messages/);
    const conversation = screen.getByRole('region', { name: "Conversation with Jordan's Agent" });
    fireEvent.click(screen.getByRole('button', { name: 'Connect your agent' }));
    expect(await screen.findByRole('dialog', { name: 'Connect your agent' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Chat with my Agent/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('region', { name: "Conversation with Jordan's Agent" })).toBe(conversation);
    expect(screen.getByRole('textbox', { name: 'Message the AI assistant' })).toHaveValue('Preserved draft');
  });
  it('shows an invitation before chatting and removes it when an introduction is required', async () => {
    chat.showSuggestions = true;
    render(<AgentPage />);
    await screen.findByText(/2 introductory messages/);
    expect(screen.getByRole('heading', { name: 'What would you like to explore?' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Suggested questions' }).closest('.agent-conversation-start')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Recruiter brief' }));
    expect(chat.handleSuggestedPrompt).toHaveBeenCalledWith(expect.stringContaining('concise recruiter brief'));
    act(() => options().onAccessRequired());
    await screen.findByLabelText('Your email');
    expect(screen.queryByRole('heading', { name: 'What would you like to explore?' })).toBeNull();
    expect(screen.getByRole('region', { name: "Conversation with Jordan's Agent" })).toHaveClass('has-access-gate');
  });

});
