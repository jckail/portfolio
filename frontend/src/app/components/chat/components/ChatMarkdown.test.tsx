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

  it('shows a streaming cursor when isStreaming', () => {
    const { container } = render(
      <ChatMarkdown text="Partial" isStreaming />
    );
    expect(container.querySelector('.cursor')).not.toBeNull();
  });
});
