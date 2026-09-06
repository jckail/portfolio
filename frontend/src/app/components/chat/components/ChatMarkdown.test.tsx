import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChatMarkdown } from './ChatMarkdown';

describe('ChatMarkdown', () => {
  it('renders plain paragraphs', () => {
    render(<ChatMarkdown text="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders bold and italic', () => {
    const { container } = render(
      <ChatMarkdown text="He said **bold** and *italic* words" />
    );
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
  });

  it('renders safe links and rejects javascript: URLs', () => {
    const { container } = render(
      <ChatMarkdown text={'[safe](https://example.com) and [bad](javascript:alert(1))'} />
    );
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.getAttribute('rel')).toContain('noopener');
    // Rejected protocol rendered as plain text, not an anchor
    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(container.textContent).toContain('bad');
  });

  it('renders unordered lists', () => {
    const { container } = render(
      <ChatMarkdown text={'- one\n- two\n- three'} />
    );
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('one');
  });

  it('renders fenced code blocks as text (escaped by React)', () => {
    const { container } = render(
      <ChatMarkdown text={'```\n<script>alert(1)</script>\n```'} />
    );
    const pre = container.querySelector('pre code');
    expect(pre?.textContent).toBe('<script>alert(1)</script>');
    // No actual script element injected
    expect(container.querySelector('script')).toBeNull();
  });

  // A fence whose info string isn't plain \w used to match the paragraph
  // loop's "don't consume" guard but not the fence pattern, so the parser
  // spun forever and froze the tab. Asking the assistant for a C++ snippet
  // was enough to trigger it.
  it.each([
    ['c++', '```c++\nint x = 1;\n```'],
    ['c#', '```c#\nvar x = 1;\n```'],
    ['leading space', '``` python\nx = 1\n```'],
    ['attributes', '```js title="a.js"\nconst x = 1;\n```'],
    ['braces', '```{r}\nx <- 1\n```'],
    ['four backticks', '````\nliteral\n````'],
  ])('renders a %s fence without hanging', (_label, text) => {
    const { container } = render(<ChatMarkdown text={text} />);
    expect(container.querySelector('pre code')).not.toBeNull();
  });

  it('renders an unterminated fence without hanging', () => {
    const { container } = render(<ChatMarkdown text={'```rust\nfn main() {}'} />);
    expect(container.querySelector('pre code')?.textContent).toContain('fn main');
  });

  it('shows a streaming cursor when isStreaming', () => {
    const { container } = render(
      <ChatMarkdown text="Partial" isStreaming />
    );
    expect(container.querySelector('.cursor')).not.toBeNull();
  });
});
