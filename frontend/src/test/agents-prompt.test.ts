import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

const page = readFileSync(resolve('public/agents.html'), 'utf8');
const script = readFileSync(resolve('public/agents-prompt.js'), 'utf8');

function mount(clipboard?: { writeText: (text: string) => Promise<void> }) {
  document.body.innerHTML = new DOMParser().parseFromString(page, 'text/html').body.innerHTML;
  // Execute the public script with a synthetic clipboard, without using the real system clipboard.
  new Function('document', 'navigator', script)(document, { clipboard });
  return {
    button: document.getElementById('copy-prompt') as HTMLButtonElement,
    prompt: document.getElementById('claude-prompt') as HTMLTextAreaElement,
    status: document.getElementById('copy-status') as HTMLElement,
  };
}

describe('Claude portfolio prompt', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('copies the complete visible prompt and announces completion', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const { button, prompt, status } = mount({ writeText });
    button.click();
    await waitFor(() => expect(status).toHaveTextContent('Prompt copied.'));
    expect(writeText).toHaveBeenCalledWith(prompt.value);
    expect(button).not.toBeDisabled();
    expect(status).toHaveAttribute('role', 'status');
    expect(document.querySelector('label[for="claude-prompt"]')).toBeInTheDocument();
  });

  it.each(['missing clipboard', 'denied clipboard'])('selects the prompt for manual copying after %s', async (mode) => {
    const clipboard = mode === 'denied clipboard'
      ? { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) }
      : undefined;
    const { button, prompt, status } = mount(clipboard);
    button.click();
    await waitFor(() => expect(status).toHaveTextContent('Automatic copy is unavailable.'));
    expect(prompt).toHaveFocus();
    expect(prompt.selectionStart).toBe(0);
    expect(prompt.selectionEnd).toBe(prompt.value.length);
    expect(button).not.toBeDisabled();
    expect(status).not.toHaveTextContent('Prompt copied.');
  });

  it('offers real source routes and explains that MCP requires separate setup', () => {
    const { prompt } = mount();
    expect(prompt.value).toContain('get_portfolio_context');
    expect(prompt.value).toContain('search_portfolio');
    for (const path of ['/mcp', '/context.json', '/llms-full.txt', '/graphql']) {
      expect(prompt.value).toContain(`https://jordankail.ai${path}`);
    }
    expect(document.body).toHaveTextContent('Pasting the prompt does not connect the server.');
    const parsed = new DOMParser().parseFromString(page, 'text/html');
    expect(parsed.querySelector('script')?.getAttribute('src')).toBe('/agents-prompt.js');
    expect(parsed.querySelectorAll('script:not([src])')).toHaveLength(0);
  });
});
