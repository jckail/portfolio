import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import Doodle from './doodle';

// jsdom has no canvas; the board only needs getContext to not throw
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Doodle', () => {
  it('keeps party activation at the current section until the board is explicitly opened', () => {
    window.history.replaceState({}, '', '/#projects');
    const navigate = vi.fn();
    Element.prototype.scrollIntoView = navigate;
    let frame: FrameRequestCallback | undefined;
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
    const { rerender } = render(<Doodle isVisible={false} isPartyMode={false} />);
    rerender(<Doodle isVisible={false} isPartyMode />);
    expect(requestFrame).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#projects');
    fireEvent(window, new CustomEvent('portfolio:open-doodle'));
    frame?.(0);
    expect(navigate).toHaveBeenCalledOnce();
    window.history.replaceState({}, '', '/');
  });

  it('preserves the drawing bitmap when its viewport resizes', () => {
    const drawImage = vi.fn();
    const context = { drawImage, setTransform: vi.fn() };
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
    render(<Doodle isVisible isPartyMode={false} />);
    drawImage.mockClear();
    width.mockReturnValue(700);
    fireEvent(window, new Event('resize'));
    // Copy the existing canvas before resetting its dimensions, then restore it.
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(drawImage.mock.calls[1].slice(-2)).toEqual([700, 300]);
  });

  it('defers navigation until the revealed layout and dialog cleanup have settled', () => {
    const navigate = vi.fn();
    Element.prototype.scrollIntoView = navigate;
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
    render(<Doodle isVisible isPartyMode={false} />);
    expect(navigate).not.toHaveBeenCalled();
    frame?.(0);
    expect(navigate).toHaveBeenCalledOnce();
    navigate.mockClear();
    fireEvent(window, new CustomEvent('portfolio:open-doodle'));
    expect(navigate).not.toHaveBeenCalled();
    frame?.(1);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('is inert while hidden so its Clear button is not focusable', () => {
    const { container, rerender } = render(<Doodle isVisible={false} isPartyMode={false} />);
    const section = container.querySelector('#doodle')!;
    expect(section).toHaveAttribute('inert');

    rerender(<Doodle isVisible isPartyMode={false} />);
    expect(section).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });
});
