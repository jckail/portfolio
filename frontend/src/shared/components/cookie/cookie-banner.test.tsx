import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import CookieBanner from './cookie-banner';

describe('CookieBanner', () => {
  it('offers Deny and Accept as equal buttons in one row', () => {
    render(<CookieBanner />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Deny All', 'Accept All']);
    expect(buttons[0].parentElement).toBe(buttons[1].parentElement);
  });

  it('keeps the full sentence, with the footer hint in a span phones can hide', () => {
    const { container } = render(<CookieBanner />);
    const text = container.querySelector('p')?.textContent?.replace(/\s+/g, ' ');
    expect(text).toContain(
      'unless you click "Accept All", and you can change your choice anytime under "Cookie settings" in the footer.',
    );
    expect(container.querySelector('.cookie-detail')?.textContent).toMatch(/^, and you can/);
  });

  it('calls the matching handler', () => {
    const onAccept = vi.fn();
    const onDeny = vi.fn();
    render(<CookieBanner onAccept={onAccept} onDeny={onDeny} />);
    fireEvent.click(screen.getByText('Deny All'));
    expect(onDeny).toHaveBeenCalledOnce();
    expect(onAccept).not.toHaveBeenCalled();
  });
});
