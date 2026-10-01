import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import PhoneReveal, { PHONE_ERROR_MESSAGE, PHONE_SESSION_KEY } from './PhoneReveal';

const fetchMock = vi.fn();

beforeEach(() => {
  window.sessionStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const submit = (email: string) => {
  fireEvent.change(screen.getByLabelText('Your email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Show phone number' }));
};

describe('PhoneReveal', () => {
  it('shows no number until the visitor asks, and says Jordan will see the email', () => {
    render(<PhoneReveal />);
    expect(screen.getByText(/Phone: available on request/)).toBeInTheDocument();
    expect(screen.getByText(/Jordan gets an email with your address/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    const input = screen.getByLabelText('Your email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('maxlength', '254');
    expect(input.id).not.toBe('');
    expect(input.getAttribute('name')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the email and shows the number as a tel: link', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { phone: '555-0100' }));
    render(<PhoneReveal />);
    submit(' visitor@example.com ');

    const link = await screen.findByRole('link', { name: '555-0100' });
    expect(link).toHaveAttribute('href', 'tel:5550100');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/contact/phone');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'visitor@example.com' });
    expect(window.sessionStorage.getItem(PHONE_SESSION_KEY)).toBe('555-0100');
  });

  it('keeps the number shown for the rest of the session without asking again', () => {
    window.sessionStorage.setItem(PHONE_SESSION_KEY, '555-0100');
    render(<PhoneReveal />);
    expect(screen.getByRole('link', { name: '555-0100' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Your email')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([422, 429, 502, 503])('shows the generic message and no number on %i', async status => {
    fetchMock.mockResolvedValueOnce(jsonResponse(status, { detail: 'server detail' }));
    render(<PhoneReveal />);
    submit('visitor@example.com');

    expect(await screen.findByRole('alert')).toHaveTextContent(PHONE_ERROR_MESSAGE);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(PHONE_SESSION_KEY)).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Show phone number' })).not.toBeDisabled()
    );
  });

  it('shows the generic message on a network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<PhoneReveal />);
    submit('visitor@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent(PHONE_ERROR_MESSAGE);
  });

  it('still shows the number when sessionStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { phone: '555-0100' }));
    render(<PhoneReveal />);
    submit('visitor@example.com');
    expect(await screen.findByRole('link', { name: '555-0100' })).toBeInTheDocument();
  });
});
