import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Lab from './lab';

describe('AiBillingLab', () => {
  it('renders one h1 and the synthetic notice', () => {
    render(<Lab />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('note').textContent).toMatch(/synthetic/i);
  });

  it('changes totals when a price is edited', () => {
    render(<Lab />);
    const kpis = () => document.querySelector('.ab-kpis')!.textContent;
    const before = kpis();
    fireEvent.change(screen.getByLabelText(/Large model output price/), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/Medium model output price/), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/Small model output price/), { target: { value: '0' } });
    expect(kpis()).not.toBe(before);
  });

  it('switches scenario', () => {
    render(<Lab />);
    fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'runaway' } });
    expect(screen.getByText(/loops/)).toBeTruthy();
  });

  it('advances the pipeline', () => {
    render(<Lab />);
    fireEvent.click(screen.getByText('Send a message event'));
    expect(screen.getByText(/1 waiting for the next batch/)).toBeTruthy();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByText(/Advance 5 s/));
    expect(screen.getByText(/1 visible/)).toBeTruthy();
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByText(/0 visible/)).toBeTruthy();
  });

  it('builds an invoice from selected threads', () => {
    render(<Lab />);
    expect(screen.getByText('No threads selected.')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    const table = screen.getByText('Invoice (synthetic)').parentElement!;
    expect(within(table).getByText('Subtotal')).toBeTruthy();
    expect((screen.getByText('Download CSV') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByText('No threads selected.')).toBeTruthy();
  });
});
