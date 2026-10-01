import { useEffect } from 'react';

// Reference-counted so stacked dialogs (e.g. a skill opened from inside an
// experience modal) keep the page locked until the last one closes, and so
// the styles we overwrite are restored exactly once.
let lockCount = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

export function isScrollLocked(): boolean {
  return lockCount > 0;
}

export function lockScroll(): void {
  lockCount += 1;
  if (lockCount > 1) return;

  const html = document.documentElement;
  const body = document.body;
  // Measure before hiding overflow; once hidden the scrollbar is gone.
  const scrollbarWidth = window.innerWidth - html.clientWidth;
  saved = { overflow: html.style.overflow, paddingRight: body.style.paddingRight };
  // Lock on <html>: body overflow only propagates to the viewport when html
  // itself is `visible`, which is not guaranteed.
  html.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    // Keep the layout from shifting sideways when the scrollbar disappears
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

export function unlockScroll(): void {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0 || !saved) return;

  document.documentElement.style.overflow = saved.overflow;
  document.body.style.paddingRight = saved.paddingRight;
  saved = null;
}

/** Lock page scroll while `active`. Safe to use from several dialogs at once. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockScroll();
    return unlockScroll;
  }, [active]);
}
