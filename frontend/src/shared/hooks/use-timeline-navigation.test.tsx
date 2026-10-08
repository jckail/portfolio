import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimelineNavigation } from './use-timeline-navigation';

const observers: Array<{ callback: IntersectionObserverCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; unobserve: ReturnType<typeof vi.fn> }> = [];
function Harness() {
  const { sentinel, visible, active, targets } = useTimelineNavigation();
  return <><span ref={sentinel} data-testid="sentinel" /><output>{JSON.stringify({ visible, active, targets })}</output></>;
}
function entry(target: Element, top: number, isIntersecting: boolean) {
  return { target, isIntersecting, boundingClientRect: { top } } as IntersectionObserverEntry;
}
function emit(index: number, entries: IntersectionObserverEntry[]) {
  act(() => observers[index].callback(entries, {} as IntersectionObserver));
}
beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn(); disconnect = vi.fn(); unobserve = vi.fn();
    constructor(public callback: IntersectionObserverCallback) { observers.push(this); }
  });
});
afterEach(() => { cleanup(); document.body.innerHTML = ''; vi.unstubAllGlobals(); });
describe('timeline reading observers', () => {
  it('appears only after the sentinel passes above the viewport and cleans up', () => {
    const { unmount } = render(<Harness />);
    const marker = screen.getByTestId('sentinel');
    emit(0, [entry(marker, 900, false)]);
    expect(screen.getByRole('status')).toHaveTextContent('"visible":false');
    emit(0, [entry(marker, -10, false)]);
    expect(screen.getByRole('status')).toHaveTextContent('"visible":true');
    emit(0, [entry(marker, 240, true)]);
    expect(screen.getByRole('status')).toHaveTextContent('"visible":false');
    unmount();
    expect(observers.every(observer => observer.disconnect.mock.calls.length === 1)).toBe(true);
  });
  it('discovers lazy career items, selects the reading band and removes stale items', async () => {
    render(<Harness />);
    const milestone = document.createElement('li');
    milestone.id = 'experience-meta-facebook'; milestone.dataset.timelineLabel = 'Meta · 2020 - 2022';
    act(() => document.body.append(milestone));
    await waitFor(() => expect(observers[1].observe).toHaveBeenCalledWith(milestone));
    vi.spyOn(milestone, 'getBoundingClientRect').mockReturnValue({ top: 180, bottom: 400 } as DOMRect);
    emit(1, [entry(milestone, 180, true)]);
    expect(screen.getByRole('status')).toHaveTextContent('"active":"experience-meta-facebook"');
    expect(screen.getByRole('status')).toHaveTextContent('Meta · 2020 - 2022');
    act(() => milestone.remove());
    await waitFor(() => expect(observers[1].unobserve).toHaveBeenCalledWith(milestone));
    expect(screen.getByRole('status')).toHaveTextContent('"targets":[]');
  });
  it('selects the largest current reading-band overlap rather than the previous company tail', async () => {
    render(<Harness />);
    const previous = document.createElement('li');
    previous.id = 'experience-sabbatical'; previous.dataset.timelineLabel = 'Sabbatical';
    const target = document.createElement('li');
    target.id = 'experience-meta-facebook'; target.dataset.timelineLabel = 'Meta';
    act(() => document.body.append(previous, target));
    await waitFor(() => expect(observers[1].observe).toHaveBeenCalledWith(target));
    const previousRect = vi.spyOn(previous, 'getBoundingClientRect');
    const targetRect = vi.spyOn(target, 'getBoundingClientRect');
    previousRect.mockReturnValue({ top: 140, bottom: 330 } as DOMRect);
    targetRect.mockReturnValue({ top: 350, bottom: 800 } as DOMRect);
    emit(1, [entry(previous, 140, true), entry(target, 350, true)]);
    expect(screen.getByRole('status')).toHaveTextContent('"active":"experience-sabbatical"');
    // Only the target crosses a threshold. The old company's stored entry
    // would still claim top=140, but its fresh geometry is now just a small tail.
    previousRect.mockReturnValue({ top: -300, bottom: 155 } as DOMRect);
    targetRect.mockReturnValue({ top: 175, bottom: 625 } as DOMRect);
    emit(1, [entry(target, 175, true)]);
    expect(screen.getByRole('status')).toHaveTextContent('"active":"experience-meta-facebook"');
  });

});
