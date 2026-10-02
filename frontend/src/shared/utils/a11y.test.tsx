import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buttonize } from './a11y';

function Fixture({ onActivate }: { onActivate: () => void }) {
  return <span {...buttonize(onActivate)}>Open</span>;
}

describe('buttonize', () => {
  it('is exposed as a focusable button', () => {
    render(<Fixture onActivate={vi.fn()} />);
    const node = screen.getByRole('button', { name: 'Open' });
    expect(node).toHaveProperty('tabIndex', 0);
  });

  it('activates on click', () => {
    const onActivate = vi.fn();
    render(<Fixture onActivate={onActivate} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it.each(['Enter', ' '])('activates on %j and prevents the default scroll/submit', (key) => {
    const onActivate = vi.fn();
    render(<Fixture onActivate={onActivate} />);
    const notPrevented = fireEvent.keyDown(screen.getByRole('button'), { key });
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });

  it.each(['Tab', 'Escape', 'a', 'ArrowDown'])('ignores %s', (key) => {
    const onActivate = vi.fn();
    render(<Fixture onActivate={onActivate} />);
    const notPrevented = fireEvent.keyDown(screen.getByRole('button'), { key });
    expect(onActivate).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });
});
