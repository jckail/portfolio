import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { NotFound, isKnownPath } from './not-found';

afterEach(() => cleanup());

describe('isKnownPath', () => {
  it.each(['/', '/admin'])('serves %s', path => expect(isKnownPath(path)).toBe(true));
  it.each(['/nope', '/admin/', '/api/x', '/index.html'])('rejects %s', path =>
    expect(isKnownPath(path)).toBe(false)
  );
});

describe('NotFound', () => {
  it('names the problem, links home and sets the title', () => {
    document.title = 'Jordan Kail';
    const { unmount } = render(<NotFound pathname="/missing" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText('/missing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the portfolio' })).toHaveAttribute('href', '/');
    expect(document.title).toBe('Page not found | Jordan Kail');
    unmount();
    expect(document.title).toBe('Jordan Kail');
  });

  it('truncates a very long path', () => {
    render(<NotFound pathname={`/${'a'.repeat(300)}`} />);
    expect(screen.getByText(/…$/)).toBeInTheDocument();
  });
});
