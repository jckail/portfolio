/**
 * Run `callback` once the browser is idle after the page has loaded.
 *
 * Used to defer decorative or speculative work (particles, chat prefetch) off
 * the critical path. Falls back to a timeout where requestIdleCallback is
 * missing (Safari). Returns a cancel function suitable for an effect cleanup.
 */
export function runWhenIdle(
  callback: () => void,
  { delayMs = 0, timeoutMs = 3000 }: { delayMs?: number; timeoutMs?: number } = {}
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idleHandle: number | undefined;

  const schedule = () => {
    if (cancelled) return;
    timer = setTimeout(() => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(
          () => {
            if (!cancelled) callback();
          },
          { timeout: timeoutMs }
        );
      } else {
        callback();
      }
    }, delayMs);
  };

  const onLoad = () => schedule();
  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', onLoad, { once: true });
  }

  return () => {
    cancelled = true;
    window.removeEventListener('load', onLoad);
    if (timer !== undefined) clearTimeout(timer);
    if (idleHandle !== undefined && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(idleHandle);
    }
  };
}
