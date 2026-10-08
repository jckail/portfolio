import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from './StatusBadge';
import { LoadingSpinner } from '../loading-spinner';

describe('accessible brand states', () => {
  it('communicates status with visible text independent of color', () => {
    render(<StatusBadge tone="warning">In Development</StatusBadge>);
    expect(screen.getByText('In Development')).toHaveClass('brand-status--warning');
  });
  it('names meaningful loading and excludes decorative loading from announcements', () => {
    const { rerender } = render(<LoadingSpinner label="Loading projects" />);
    expect(screen.getByRole('status', { name: 'Loading projects' })).toBeInTheDocument();
    rerender(<LoadingSpinner decorative />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
