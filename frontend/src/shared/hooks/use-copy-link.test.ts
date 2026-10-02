import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

import { useCopyLink } from './use-copy-link';

describe('useCopyLink', () => {
  const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    document.body.replaceChildren();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (execCommandDescriptor) Object.defineProperty(document, 'execCommand', execCommandDescriptor);
    else Reflect.deleteProperty(document, 'execCommand');
  });

  it('does not report success when both clipboard methods fail', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
    const { result } = renderHook(() => useCopyLink());

    await act(async () => { await result.current.copy(); });

    expect(result.current.copied).toBe(false);
    expect(result.current.failed).toBe(true);
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('cleans up and restores focus when the fallback throws', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => {
      document.querySelector('textarea')?.focus();
      throw new Error('unsupported');
    }) });
    const { result } = renderHook(() => useCopyLink());

    await act(async () => { await result.current.copy(); });

    expect(document.querySelector('textarea')).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(result.current.failed).toBe(true);
    button.remove();
  });

  it('copies with the fallback and restores the initiating control focus', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    const fallback = vi.fn(() => {
      const textarea = document.querySelector('textarea');
      expect(textarea?.value).toBe('https://example.com/share');
      textarea?.focus();
      return true;
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: fallback });
    const { result } = renderHook(() => useCopyLink('https://example.com/share'));

    await act(async () => { await result.current.copy(); });

    expect(fallback).toHaveBeenCalledWith('copy');
    expect(result.current.copied).toBe(true);
    expect(result.current.failed).toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('clears success feedback timers when the control unmounts', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const { result, unmount } = renderHook(() => useCopyLink());
    await act(async () => { await result.current.copy(); });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not let an older pending failure overwrite a successful retry', async () => {
    let rejectFirst!: (reason: Error) => void;
    const pending = new Promise<void>((_, reject) => { rejectFirst = reject; });
    const writeText = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const fallback = vi.fn(() => false);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: fallback });
    const { result } = renderHook(() => useCopyLink());
    let firstAttempt!: Promise<void>;
    act(() => { firstAttempt = result.current.copy(); });
    await act(async () => { await result.current.copy(); });
    await act(async () => {
      rejectFirst(new Error('late denial'));
      await firstAttempt;
    });

    expect(result.current.copied).toBe(true);
    expect(result.current.failed).toBe(false);
    expect(fallback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('does not create a fallback after a pending control unmounts', async () => {
    let rejectCopy!: (reason: Error) => void;
    const pending = new Promise<void>((_, reject) => { rejectCopy = reject; });
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(() => pending) } });
    const fallback = vi.fn(() => false);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: fallback });
    const { result, unmount } = renderHook(() => useCopyLink());
    let copyAttempt!: Promise<void>;
    act(() => { copyAttempt = result.current.copy(); });
    unmount();
    await act(async () => {
      rejectCopy(new Error('late denial'));
      await copyAttempt;
    });

    expect(fallback).not.toHaveBeenCalled();
    expect(document.querySelector('textarea')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('copies the provided URL and flips the copied flag', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    });

    const { result } = renderHook(() => useCopyLink('https://example.com/?project=jobbr'));

    await act(async () => {
      await result.current.copy();
    });

    expect(writeText).toHaveBeenCalledWith('https://example.com/?project=jobbr');
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copied).toBe(false);
  });
});
