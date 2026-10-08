import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BrandShowcase from './BrandShowcase';
import { useThemeStore } from '../../stores/theme-store';

describe('brand showcase', () => {
  it('provides real theme controls and editable asset downloads', () => {
    render(<BrandShowcase />);
    fireEvent.click(screen.getByRole('button', { name: 'Light theme' }));
    expect(useThemeStore.getState().theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'Download monogram SVG' })).toHaveAttribute('download');
    expect(screen.getByRole('link', { name: 'social-project-dark.svg' })).toHaveAttribute('href', '/brand/social-project-dark.svg');
  });
  it('keeps form preview local and gives technical specimens text alternatives', () => {
    render(<BrandShowcase />);
    fireEvent.change(screen.getByLabelText('Your email'), { target: { value: 'preview@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Preview confirmation' }).closest('form')!);
    expect(screen.getByText('Preview complete. Nothing was sent.')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('table', { name: 'Illustrative chart data' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Illustrative flow: client to API to store' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading specimen' })).toBeInTheDocument();
  });
});
