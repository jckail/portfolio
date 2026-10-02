import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';

import MainContent from './main-content';
import { executeChatAction } from '../../shared/utils/chat-actions';
import { useThemeStore } from '../../shared/stores/theme-store';

vi.mock('./header/header', () => ({ Header: () => null }));
vi.mock('./sections/about', () => ({ default: () => null }));
vi.mock('./sections/experience', () => ({ default: () => null }));
vi.mock('./sections/projects', () => ({ default: () => null }));
vi.mock('./sections/skills', () => ({ default: () => null }));
vi.mock('./sections/resume', () => ({ default: () => null }));
vi.mock('./admin/admin-handler', () => ({ default: () => null }));
vi.mock('./footer', () => ({ default: ({ onDoodleToggle }: { onDoodleToggle: () => void }) => <button onClick={onDoodleToggle}>Reveal doodle</button> }));
vi.mock('../../shared/hooks/use-scroll-spy', () => ({ useScrollSpy: () => {} }));
vi.mock('../providers/data-provider', () => ({ useData: () => ({ isLoading: false }) }));

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  useThemeStore.setState({ theme: 'dark' });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('home doodle visibility owner', () => {
  it('reveals the actual board after an assistant navigation action', async () => {
    const { container } = render(<MainContent />);
    await waitFor(() => expect(container.querySelector('#doodle')).toHaveAttribute('inert'));
    act(() => { executeChatAction({ action: 'navigate', target: 'doodle' }); });
    expect(await screen.findByLabelText('Drawing canvas')).toBeInTheDocument();
    expect(container.querySelector('#doodle')).not.toHaveAttribute('inert');
    expect(container.querySelector('#doodle')).toHaveAttribute('aria-hidden', 'false');
  });

  it('reveals and scrolls the footer board while respecting reduced motion', async () => {
    render(<MainContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal doodle' }));
    await screen.findByLabelText('Drawing canvas');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });
});
