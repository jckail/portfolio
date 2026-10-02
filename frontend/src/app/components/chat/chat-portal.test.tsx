import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

const panelImported = vi.fn();

vi.mock('./chat-panel', () => {
  panelImported();
  return { default: () => <div data-testid="chat-panel" /> };
});

const getJson = vi.fn();
vi.mock('../../../shared/utils/api', () => ({
  getJson: (...args: unknown[]) => getJson(...args),
  endpoints: { chatStatus: '/api/chat/status' },
}));
vi.mock('../../../shared/utils/analytics', () => ({ trackChatOpen: vi.fn(() => Promise.resolve()) }));
// Idle prefetch is exercised separately; keep it from firing here.
const runWhenIdle = vi.fn((_cb: () => void, _opts?: unknown) => () => {});
vi.mock('../../utils/run-when-idle', () => ({ runWhenIdle: (...a: [() => void, unknown]) => runWhenIdle(...a) }));

import ChatPortal from './chat-portal';
import { isChatAvailable, setChatAvailable } from '../../../shared/utils/chat-availability';

function mockViewport(small: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: small,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  runWhenIdle.mockClear();
  mockViewport(false);
  window.history.replaceState({}, '', '/');
  getJson.mockResolvedValue({ available: true });
  setChatAvailable(true);
});

afterEach(() => {
  cleanup();
});

describe('ChatPortal launcher', () => {
  it('renders only the lightweight button on first paint', async () => {
    render(<ChatPortal />);
    expect(screen.getByRole('button', { name: 'Chat with AI' })).toBeInTheDocument();
    await act(async () => {});
    expect(screen.queryByTestId('chat-panel')).toBeNull();
  });

  it('loads the panel already open when the button is clicked', async () => {
    render(<ChatPortal />);
    fireEvent.click(screen.getByRole('button', { name: 'Chat with AI' }));
    expect(new URLSearchParams(window.location.search).get('ai_chat')).toBe('open');
    expect(await screen.findByTestId('chat-panel')).toBeInTheDocument();
  });

  it('loads the panel for an ?ai_chat=open deep link', async () => {
    window.history.replaceState({}, '', '/?ai_chat=open');
    render(<ChatPortal />);
    expect(await screen.findByTestId('chat-panel')).toBeInTheDocument();
  });

  it('loads the panel when a shortcut sets ?ai_chat=open and fires popstate', async () => {
    render(<ChatPortal />);
    act(() => {
      window.history.pushState({}, '', '/?ai_chat=open');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await screen.findByTestId('chat-panel')).toBeInTheDocument();
  });

  it('ignores unrelated navigation', async () => {
    render(<ChatPortal />);
    act(() => {
      window.history.pushState({}, '', '/#skills');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await act(async () => {});
    expect(screen.queryByTestId('chat-panel')).toBeNull();
  });

  it('hides the assistant when the backend reports it unavailable', async () => {
    getJson.mockResolvedValue({ available: false });
    render(<ChatPortal />);
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Chat with AI' })).toBeNull();
  });

  it('tells the other chat entry points and drops a dead deep link when unavailable', async () => {
    // The hero link, palette command and `?` shortcut stayed visible and
    // opened nothing once the launcher was hidden.
    getJson.mockResolvedValue({ available: false });
    window.history.replaceState({}, '', '/?ai_chat=open&theme=light');
    render(<ChatPortal />);
    await act(async () => {});
    expect(isChatAvailable()).toBe(false);
    const params = new URLSearchParams(window.location.search);
    expect(params.get('ai_chat')).toBeNull();
    expect(params.get('theme')).toBe('light');
  });
});

describe('ChatPortal idle prefetch', () => {
  it('schedules the idle prefetch on a desktop viewport', async () => {
    render(<ChatPortal />);
    await act(async () => {});
    expect(runWhenIdle).toHaveBeenCalledTimes(1);
  });

  it('skips the idle prefetch on a small viewport but still opens on click', async () => {
    mockViewport(true);
    render(<ChatPortal />);
    await act(async () => {});
    expect(runWhenIdle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Chat with AI' }));
    expect(await screen.findByTestId('chat-panel')).toBeInTheDocument();
  });
});
