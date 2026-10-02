import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Copy the current page URL (or a provided URL) to the clipboard.
 * Returns truthful success/failure feedback and preserves fallback focus.
 */
export function useCopyLink(url?: string) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number>();
  const mounted = useRef(false);
  const attempt = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    const currentAttempt = ++attempt.current;
    const target = url ?? window.location.href;
    window.clearTimeout(timer.current);
    setStatus('idle');
    let success = false;
    try {
      await navigator.clipboard.writeText(target);
      success = true;
    } catch {
      if (!mounted.current || currentAttempt !== attempt.current) return;
      // Fallback for older browsers / denied permission
      const previousFocus = document.activeElement;
      const textarea = document.createElement('textarea');
      try {
        textarea.value = target;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        success = document.execCommand('copy');
      } catch {
        // Some browsers reject the legacy clipboard command as well.
      } finally {
        const restoreFocus = document.activeElement === textarea;
        textarea.remove();
        if (restoreFocus && previousFocus instanceof HTMLElement) previousFocus.focus();
      }
    }
    if (!mounted.current || currentAttempt !== attempt.current) return;
    setStatus(success ? 'copied' : 'failed');
    if (success) timer.current = window.setTimeout(() => setStatus('idle'), 2000);
  }, [url]);

  return { copied: status === 'copied', failed: status === 'failed', copy };
}
