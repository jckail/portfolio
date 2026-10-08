import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChatMarkdown } from './ChatMarkdown';

describe('ChatMarkdown', () => {
  it('renders plain paragraphs', () => {
    render(<ChatMarkdown text="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders reply headings between paragraphs and lists without literal markers', () => {
    render(
      <ChatMarkdown
        text={
          'Jordan builds agent platforms.\n### Strongest **engineering** evidence ###\n- Agent harnesses\n## Relevant links\n[Portfolio](https://jckail.com)'
        }
      />
    );
    expect(
      screen.getByRole('heading', { name: 'Strongest engineering evidence', level: 3 })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Relevant links', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('Agent harnesses')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute(
      'href',
      'https://jckail.com/'
    );
  });

  it('keeps heading-like text literal in code and rejects invalid heading prefixes', () => {
    const { container } = render(
      <ChatMarkdown
        text={'```text\n### literal code\n```\n#hashtag\n####### not a heading\n#### Detail'}
      />
    );
    expect(container.querySelector('pre code')?.textContent).toBe('### literal code');
    expect(screen.getByText('#hashtag', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Detail', level: 4 })).toBeInTheDocument();
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(1);
  });

  it('renders untrusted heading HTML as text and tolerates partial streamed headings', () => {
    const { container, rerender } = render(<ChatMarkdown text="###" isStreaming />);
    expect(container.querySelector('.cursor')).toBeInTheDocument();
    rerender(
      <ChatMarkdown text={'### <img src=x onerror=alert(1)> [unsafe](javascript:alert(1))'} />
    );
    expect(container.querySelector('img, script, a')).toBeNull();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      '<img src=x onerror=alert(1)>'
    );
  });

  it('renders bold and italic', () => {
    const { container } = render(<ChatMarkdown text="He said **bold** and *italic* words" />);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
  });

  it('renders safe links and rejects javascript: URLs', () => {
    const { container } = render(
      <ChatMarkdown text={'[safe](https://example.com) and [bad](javascript:alert(1))'} />
    );
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://example.com/');
    expect(link?.getAttribute('rel')).toContain('noopener');
    // Rejected protocol rendered as plain text, not an anchor
    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(container.textContent).toContain('bad');
  });

  it.each([
    ['http', '[x](http://example.com)'],
    ['mailto', '[x](mailto:a@example.com?subject=hi)'],
    ['data', '[x](data:text/html,hi)'],
    ['relative', '[x](/admin)'],
  ])('renders a %s link as plain text', (_label, text) => {
    const { container } = render(<ChatMarkdown text={text} />);
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toBe('x');
  });

  it('shows the real hostname next to an off-site link', () => {
    const { container } = render(
      <ChatMarkdown text={'[GitHub profile](https://github.com.evil.example/login)'} />
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      'https://github.com.evil.example/login'
    );
    expect(container.textContent).toContain('(github.com.evil.example)');
  });

  it('shows the real host when userinfo disguises it', () => {
    const { container } = render(
      <ChatMarkdown text={'[repo](https://github.com@evil.example/x)'} />
    );
    expect(container.textContent).toContain('(evil.example)');
  });

  it('does not annotate links to trusted hosts', () => {
    const { container } = render(<ChatMarkdown text={'[GitHub](https://github.com/jckail)'} />);
    expect(container.querySelector('a')).not.toBeNull();
    expect(container.textContent).toBe('GitHub');
  });

  it.each([
    ['https://www.jckail.com/skills', 'https://www.jckail.com/#skills'],
    ['https://jckail.com/experience', 'https://jckail.com/#experience'],
    ['https://jordankail.ai/projects/', 'https://jordankail.ai/#projects'],
    [
      'https://www.jordankail.ai/contact?theme=dark',
      'https://www.jordankail.ai/?theme=dark&contact=open',
    ],
    ['https://jordankail.ai/?company=together_ai', 'https://jordankail.ai/?company=together_ai'],
    ['https://jordankail.ai/context.json', 'https://jordankail.ai/context.json'],
    ['https://other.example/skills', 'https://other.example/skills'],
    ['https://jckail.com.evil.example/contact', 'https://jckail.com.evil.example/contact'],
  ])('resolves only known portfolio section aliases: %s', (input, expected) => {
    render(<ChatMarkdown text={`[Evidence](${input})`} />);
    expect(screen.getByRole('link', { name: 'Evidence' })).toHaveAttribute('href', expected);
  });

  it('renders unordered lists', () => {
    const { container } = render(<ChatMarkdown text={'- one\n- two\n- three'} />);
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('one');
  });

  it('renders fenced code blocks as text (escaped by React)', () => {
    const { container } = render(<ChatMarkdown text={'```\n<script>alert(1)</script>\n```'} />);
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
    const { container } = render(<ChatMarkdown text="Partial" isStreaming />);
    expect(container.querySelector('.cursor')).not.toBeNull();
  });
});
