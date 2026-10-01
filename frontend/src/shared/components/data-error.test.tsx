import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { DataError } from './data-error';

afterEach(() => cleanup());

describe('DataError', () => {
  it('says what failed and offers a retry, without technical detail', () => {
    render(<DataError what="the projects section" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the projects section');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
