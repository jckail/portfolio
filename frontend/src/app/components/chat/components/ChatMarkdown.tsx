import React, { useMemo } from 'react';

/**
 * Minimal markdown → React renderer for assistant replies.
 *
 * Supports: paragraphs, line breaks, **bold**, *italic*, `code`,
 * [links](https://...), unordered/ordered lists, and fenced ```code``` blocks.
 * Rendered as React elements (no dangerouslySetInnerHTML). Only http(s) and
 * mailto links are allowed.
 */

const SAFE_URL = /^(https?:|mailto:)/i;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern =
    /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const [full, code, link, bold, italic] = match;
    const key = `${keyPrefix}-${i++}`;

    if (code) {
      nodes.push(
        <code key={key} className="chat-md-code">
          {code.slice(1, -1)}
        </code>
      );
    } else if (link) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(link);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        if (SAFE_URL.test(href)) {
          nodes.push(
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-md-link"
            >
              {label}
            </a>
          );
        } else {
          nodes.push(label);
        }
      }
    } else if (bold) {
      nodes.push(
        <strong key={key}>{renderInline(bold.slice(2, -2), key)}</strong>
      );
    } else if (italic) {
      nodes.push(<em key={key}>{renderInline(italic.slice(1, -1), key)}</em>);
    } else {
      nodes.push(full);
    }
    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

type Block =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; lang: string; body: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Must match exactly what the paragraph loop below refuses to consume
    // (`/^```/`). A stricter pattern here — e.g. requiring a \w-only info
    // string — leaves fences like ```c++ or ```js title="x" matching neither
    // branch, so `i` never advances and the outer loop spins forever.
    const fence = /^```\s*([^\s`]*)/.exec(line);
    if (fence) {
      const lang = fence[1];
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', lang, body: body.join('\n') });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^```/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    // Belt and braces: if no branch consumed this line, step over it anyway so
    // the loop is provably terminating whatever the patterns above do.
    if (para.length === 0) {
      i += 1;
      continue;
    }
    blocks.push({ type: 'paragraph', lines: para });
  }

  return blocks;
}

interface ChatMarkdownProps {
  text: string;
  isStreaming?: boolean;
}

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({
  text,
  isStreaming = false,
}) => {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  return (
    <div className="chat-md">
      {blocks.map((block, bi) => {
        const key = `b-${bi}`;
        if (block.type === 'code') {
          return (
            <pre key={key} className="chat-md-pre">
              <code>{block.body}</code>
            </pre>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={key} className="chat-md-list">
              {block.items.map((item, ii) => (
                <li key={`${key}-${ii}`}>{renderInline(item, `${key}-${ii}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={key} className="chat-md-list">
              {block.items.map((item, ii) => (
                <li key={`${key}-${ii}`}>{renderInline(item, `${key}-${ii}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={key} className="chat-md-p">
            {block.lines.map((line, li) => (
              <React.Fragment key={`${key}-l${li}`}>
                {li > 0 && <br />}
                {renderInline(line, `${key}-l${li}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
      {isStreaming && <span className="cursor">|</span>}
    </div>
  );
};

export default ChatMarkdown;
