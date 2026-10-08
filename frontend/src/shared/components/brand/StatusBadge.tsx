import React from 'react';

import './brand-components.css';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'error';

/** Maturity is readable text, never a color-only signal or a promise of quality. */
export function StatusBadge({ children, tone = 'neutral' }: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  return <span className={`brand-status brand-status--${tone}`}>{children}</span>;
}
