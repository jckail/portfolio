import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import ConnectAssistantModal from './ConnectAssistantModal';
import { detectAssistantPlatform, MCP_URL } from './connect-assistant-setup';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Connect assistant overlay', () => {
  it.each([
    ['Mozilla Windows NT 10.0', '', 'windows'],
    ['Mozilla Macintosh Intel Mac OS X', '', 'mac'],
    ['Mozilla X11 Linux x86_64', '', 'linux'],
    ['Mozilla iPhone Mac OS X', '', null],
    ['Mozilla Android Linux', '', null],
    ['Unknown', 'Win32', 'windows'],
    ['Unknown', '', null],
  ])('detects desktop hints without assuming a mobile host: %s', (ua, platform, expected) => {
    expect(detectAssistantPlatform(ua, platform)).toBe(expected);
  });

  it('switches clients with the keyboard and adapts host instructions', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Windows NT 10.0');
    render(<ConnectAssistantModal onClose={vi.fn()} onUseAgent={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Your computer')).toHaveValue('windows');
    expect(screen.getByLabelText('Connection command')).toHaveValue(`claude mcp add --transport http --scope user jordan-kail ${MCP_URL}`);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Claude' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Codex' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Connection command')).toHaveValue(`codex mcp add jordan-kail --url ${MCP_URL}`);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Codex' }), { key: 'End' });
    expect(screen.getByLabelText('Connection command')).toHaveValue(`pi mcp add jordan-kail --url ${MCP_URL}`);
    expect(screen.getByText('%USERPROFILE%\\.pi\\agent\\mcp.json')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your computer'), { target: { value: 'linux' } });
    expect(screen.getByText('~/.pi/agent/mcp.json')).toBeInTheDocument();
    expect(screen.getByText('Older Pi without built-in MCP?').closest('details')).not.toHaveAttribute('open');
    expect((screen.getByLabelText('Optional adapter MCP configuration') as HTMLTextAreaElement).value).toContain(MCP_URL);
  });

  it('copies the selected client prompt and retains a manual copy fallback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<ConnectAssistantModal onClose={vi.fn()} onUseAgent={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Codex' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt for codex' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('enabled in Codex')));
    expect(await screen.findByText('Prompt for Codex copied.')).toBeInTheDocument();
    writeText.mockRejectedValueOnce(new Error('Clipboard denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy connection command' }));
    expect(await screen.findByText('Copy unavailable. The text is selected; copy it manually.')).toBeInTheDocument();
    const field = screen.getByLabelText('Connection command') as HTMLTextAreaElement;
    expect(field.selectionEnd).toBe(field.value.length);
  });

  it('offers the onsite agent and closes through the shared Escape handler', () => {
    const onClose = vi.fn();
    const onUseAgent = vi.fn();
    render(<ConnectAssistantModal onClose={onClose} onUseAgent={onUseAgent} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chat with my Agent' }));
    expect(onUseAgent).toHaveBeenCalledOnce();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
