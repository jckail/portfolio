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
  const { copied, copy } = useCopyLink(url);

  return (
    <button
      type="button"
      className={className}
      onClick={copy}
      aria-live="polite"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
};

export default CopyLinkButton;
