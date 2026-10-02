import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ResumeProvider } from './resume-provider';
import MyResume from '../components/sections/resume';
import { getJson } from '../../shared/utils/api';
import { trackResumeDownload } from '../../shared/utils/analytics';

vi.mock('../../shared/utils/api', () => ({ getJson: vi.fn(), endpoints: { resumeFileName: '/filename', resumeDownload: '/download' } }));
vi.mock('../../shared/utils/analytics', () => ({ trackResumeDownload: vi.fn() }));
vi.mock('../components/sections/modals/PDFViewer', () => ({ default: () => null }));

beforeEach(() => {
  vi.mocked(getJson).mockResolvedValue({ resumeFileName: 'resume.pdf' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('resume download outcomes', () => {
  it('announces failed HTTP downloads and never records a successful download', async () => {
    render(<ResumeProvider><MyResume /></ResumeProvider>);
    await waitFor(() => expect(getJson).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Download Resume PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to download resume');
    expect(trackResumeDownload).not.toHaveBeenCalledWith('pdf', 'latest', 'download_button');
    expect(trackResumeDownload).toHaveBeenCalledWith('pdf', 'latest', 'download_button_error');
  });

  it('treats unavailable filename as a failure rather than a successful download', async () => {
    vi.mocked(getJson).mockRejectedValue(new Error('Unavailable'));
    render(<ResumeProvider><MyResume /></ResumeProvider>);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Download Resume PDF' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Resume filename not available'));
    expect(fetch).not.toHaveBeenCalled();
    expect(trackResumeDownload).not.toHaveBeenCalledWith('pdf', 'latest', 'download_button');
  });
});
