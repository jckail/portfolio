import { fireEvent, render, screen } from '@testing-library/react';

import JobbrLab from './lab';

describe('JobbrLab', () => {
  it('renders one h1, the synthetic notice and postings without a resume', () => {
    render(<JobbrLab />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('note')).toHaveTextContent(/Synthetic demo/);
    expect(screen.getByTestId('jobbr-count')).toHaveTextContent('8 of 8 postings shown');
    expect(screen.queryByText(/Match score/)).toBeNull();
  });

  it('scores after the sample resume is loaded, and clears again', () => {
    render(<JobbrLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Use sample resume' }));
    expect(screen.getAllByText(/Match score: \d+ \/ 100/)).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Clear resume' }));
    expect(screen.queryByText(/Match score/)).toBeNull();
  });

  it('filters by remote and search, and explains a posting', () => {
    render(<JobbrLab />);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'zzz-nothing' } });
    expect(screen.getByTestId('jobbr-count')).toHaveTextContent('0 of 8');
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Remote only'));
    const n = Number(/^(\d+) of/.exec(screen.getByTestId('jobbr-count').textContent ?? '')?.[1]);
    expect(n).toBeLessThan(8);
    fireEvent.click(screen.getByLabelText('Remote only'));
    fireEvent.click(screen.getByRole('button', { name: 'Use sample resume' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Show details/ })[0]);
    expect(screen.getByText('Why this score')).toBeInTheDocument();
    expect(screen.getByText(/Missing skills:/)).toBeInTheDocument();
  });

  it('changes seed, weights and pipeline stage', () => {
    render(<JobbrLab />);
    fireEvent.click(screen.getByRole('button', { name: '2. Parse' }));
    expect(screen.getByText(/came out non-empty/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3. Match' }));
    expect(screen.getByText(/Add a resume below/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Seed/), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/Required skills/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset weights' }));
    expect(screen.getByLabelText(/Required skills/)).toHaveValue('50');
  });
});
