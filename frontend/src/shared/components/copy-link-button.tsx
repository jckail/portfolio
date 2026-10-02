import React from 'react';

import { useCopyLink } from '../hooks/use-copy-link';

interface CopyLinkButtonProps {
  /** Optional absolute URL; defaults to the current page URL. */
  url?: string;
  label?: string;
  className?: string;
}

/** Small control that copies a shareable deep link to the clipboard. */
export const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({
  url,
  label = 'Copy link',
  className = 'copy-link-button',
}) => {
  const { copied, failed, copy } = useCopyLink(url);

  return (
    <button
      type="button"
      className={className}
      onClick={copy}
      aria-live="polite"
      title={failed ? 'Your browser could not copy this link. Try again or copy the page address.' : undefined}
    >
      {copied ? 'Copied!' : failed ? 'Copy failed. Retry' : label}
    </button>
  );
};

export default CopyLinkButton;
