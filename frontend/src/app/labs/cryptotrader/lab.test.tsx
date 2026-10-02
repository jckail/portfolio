import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import CryptoTraderLab from './lab';

afterEach(cleanup);

const statValue = (name: string) => {
  const dt = screen.getByText(name, { selector: 'dt' });
  return dt.parentElement?.querySelector('dd')?.textContent ?? '';
};

describe('CryptoTraderLab', () => {
  it('renders one h1, the disclaimer and three labelled charts', () => {
    render(<CryptoTraderLab />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('note').textContent).toMatch(/fake data/i);
    expect(screen.getByRole('note').textContent).toMatch(/not financial advice/i);
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('shows both pipelines as ordered lists', () => {
    render(<CryptoTraderLab />);
    const repo = screen.getByRole('region', { name: 'Original data pipeline' });
    expect(within(repo).getAllByRole('listitem')).toHaveLength(5);
    expect(within(screen.getByRole('region', { name: 'Demo pipeline' })).getAllByRole('listitem')).toHaveLength(4);
  });

  it('is deterministic for a seed and responds to a seed change', () => {
    render(<CryptoTraderLab />);
    const before = statValue('Strategy return');
    const seed = screen.getByLabelText('Random seed');
    fireEvent.change(seed, { target: { value: '4242' } });
    const after = statValue('Strategy return');
    fireEvent.change(seed, { target: { value: '2018' } });
    expect(statValue('Strategy return')).toBe(before);
    expect(after).not.toBe('');
  });

  it('switching to momentum disables the slow window and relabels the lookback', () => {
    render(<CryptoTraderLab />);
    fireEvent.change(screen.getByLabelText('Rule'), { target: { value: 'momentum' } });
    expect(screen.getByLabelText(/Lookback/)).toBeTruthy();
    expect((screen.getByLabelText(/Slow window/) as HTMLInputElement).disabled).toBe(true);
  });

  it('keeps the slow window above the fast window', () => {
    render(<CryptoTraderLab />);
    fireEvent.change(screen.getByLabelText(/Fast window/), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/Slow window/), { target: { value: '10' } });
    expect(screen.getByLabelText(/Slow window/).parentElement?.textContent).toContain('51 days');
  });

  it('lists trades in an accessible table and resets controls', () => {
    render(<CryptoTraderLab />);
    expect(screen.getByRole('table', { name: /Trades from the synthetic backtest/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Cost per trade/), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByLabelText(/Cost per trade/).parentElement?.textContent).toContain('10 bps');
  });

  it('rerolls the seed and ignores invalid seed input', () => {
    render(<CryptoTraderLab />);
    const seed = screen.getByLabelText('Random seed') as HTMLInputElement;
    fireEvent.change(seed, { target: { value: '-5' } });
    expect(seed.value).toBe('2018');
    fireEvent.click(screen.getByRole('button', { name: 'New random seed' }));
    expect(seed.value).not.toBe('');
  });

  it('says so when a rule makes no trades', () => {
    render(<CryptoTraderLab />);
    fireEvent.change(screen.getByLabelText('Synthetic market'), { target: { value: 'metal' } });
    fireEvent.change(screen.getByLabelText(/Fast window/), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/Slow window/), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('Random seed'), { target: { value: '1' } });
    const noTrades = screen.queryByText(/made no trades/);
    if (noTrades) expect(statValue('Trades')).toBe('0');
    else expect(Number(statValue('Trades'))).toBeGreaterThan(0);
  });
});
