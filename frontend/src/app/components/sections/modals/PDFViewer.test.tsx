import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import PDFViewer from './PDFViewer';

afterEach(() => {
  cleanup();
});

describe('PDFViewer', () => {
  it('does not load the PDF on first paint', () => {
    render(<PDFViewer />);
    expect(screen.queryByTitle('Resume PDF Viewer')).toBeNull();
  });

  it('loads the PDF when Preview is pressed', () => {
    render(<PDFViewer />);
    fireEvent.click(screen.getByRole('button', { name: /preview resume/i }));
    const frame = screen.getByTitle('Resume PDF Viewer');
    expect(frame).toHaveAttribute('src', '/api/resume');
  });
});
