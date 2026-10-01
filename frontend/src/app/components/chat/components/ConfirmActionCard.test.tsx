import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { ConfirmActionCard } from './ConfirmActionCard';

import type { PendingAction } from '../../../../types/chat';

afterEach(cleanup);

function card(over: Partial<PendingAction> = {}): PendingAction {
  return {
    id: 'a1',
    tool: 'contact_jordan',
    args: { subject: 'Hi', message: 'Hello Jordan' },
    status: 'pending',
    expiresAt: Date.now() + 600000,
    ...over,
  };
}

describe('ConfirmActionCard', () => {
  it('is a labelled group and focuses the required email field', () => {
    render(<ConfirmActionCard action={card()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const group = screen.getByRole('group', { name: /send this message to jordan/i });
    expect(group).toBeInTheDocument();
    const email = screen.getByLabelText(/your email/i);
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('maxlength', '254');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(email).toBeRequired();
    expect(document.activeElement).toBe(email);
  });

  it('shows the editable message preview', () => {
    render(<ConfirmActionCard action={card()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Subject')).toHaveValue('Hi');
    expect(screen.getByLabelText('Message')).toHaveValue('Hello Jordan');
  });

  it('passes the typed email and edited args to onConfirm', () => {
    const onConfirm = vi.fn(() => null);
    render(<ConfirmActionCard action={card()} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Edited' } });
    fireEvent.change(screen.getByLabelText(/your email/i), { target: { value: 'me@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledWith('a1', 'me@example.com', { subject: 'Hi', message: 'Edited' });
  });

  it('shows validation errors returned by onConfirm', () => {
    const onConfirm = vi.fn(() => ({ email: 'Enter a valid email address.' }));
    render(<ConfirmActionCard action={card()} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText(/your email/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('Cancel calls onCancel and never onConfirm', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmActionCard action={card()} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledWith('a1');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Escape cancels the card and does not reach the chat dialog', () => {
    const onCancel = vi.fn();
    const outer = vi.fn();
    render(
      <div role="presentation" onKeyDown={outer}>
        <ConfirmActionCard action={card()} onConfirm={vi.fn()} onCancel={onCancel} />
      </div>
    );
    fireEvent.keyDown(screen.getByLabelText(/your email/i), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledWith('a1');
    expect(outer).not.toHaveBeenCalled();
  });

  it('disables the controls while submitting', () => {
    render(<ConfirmActionCard action={card({ status: 'submitting' })} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByLabelText(/your email/i)).toBeDisabled();
  });

  it('explains the phone request and shows the number as a tel link on success', () => {
    const { rerender } = render(
      <ConfirmActionCard action={card({ tool: 'request_phone', args: {} })} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText(/jordan will be notified of your email/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Message')).toBeNull();

    rerender(
      <ConfirmActionCard
        action={card({ tool: 'request_phone', args: {}, status: 'done', resultMessage: 'Here you go.', phone: '+1 (555) 010-0100' })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Here you go.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+1 (555) 010-0100' })).toHaveAttribute('href', 'tel:+15550100100');
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
  });

  it('renders topic and preferred times for a meeting request', () => {
    render(
      <ConfirmActionCard
        action={card({ tool: 'request_meeting', args: { topic: 'Agents', preferred_times: 'Tue pm' } })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Topic')).toHaveValue('Agents');
    expect(screen.getByLabelText('Preferred times')).toHaveValue('Tue pm');
  });

  it('shows a failure and an expired state', () => {
    const { rerender } = render(
      <ConfirmActionCard action={card({ status: 'failed', resultMessage: 'Could not send.' })} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText('Could not send.')).toBeInTheDocument();
    rerender(<ConfirmActionCard action={card({ status: 'expired' })} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
  });
});
