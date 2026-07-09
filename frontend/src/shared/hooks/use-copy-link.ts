import { useState, useCallback } from 'react';

/**
 * Copy the current page URL (or a provided URL) to the clipboard.
 * Returns a short-lived "copied" flag for button feedback.
 */
export function useCopyLink(url?: string) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    const target = url ?? window.location.href;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / denied permission
      try {
        const textarea = document.createElement('textarea');
        textarea.value = target;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  }, [url]);

  return { copied, copy };
}
