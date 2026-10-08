import React, { useId, useRef, useState } from 'react';

import { DialogShell } from '../../../../shared/components/dialog-shell';
import '../../../../styles/components/connect-assistant.css';
import {
  assistantPrompt, CLIENT_DOCS, CLIENT_LABELS, connectionCommand,
  detectAssistantPlatform, MCP_URL, PI_CONFIG,
  type AssistantClient, type AssistantPlatform,
} from './connect-assistant-setup';

const clients: AssistantClient[] = ['claude', 'codex', 'pi'];
const platformLabels: Record<AssistantPlatform, string> = {
  windows: 'Windows', mac: 'macOS', linux: 'Linux',
};

function CopyBlock({ label, value }: { label: string; value: string }) {
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} copied.`);
    } catch {
      field.current?.focus();
      field.current?.select();
      setStatus('Copy unavailable. The text is selected; copy it manually.');
    }
  };
  return <div className="connect-copy-block">
    <div className="connect-copy-heading">
      <label htmlFor={id}>{label}</label>
      <button className="copy-link-button" type="button" onClick={() => void copy()}>Copy {label.toLowerCase()}</button>
    </div>
    <textarea id={id} ref={field} readOnly spellCheck={false} value={value} rows={value.includes('\n') ? 6 : 2} />
    <p className="connect-copy-status" role="status">{status}</p>
  </div>;
}

export default function ConnectAssistantModal({ onClose, onUseAgent }: {
  onClose: () => void;
  onUseAgent: () => void;
}) {
  const titleId = useId();
  const panelId = useId();
  const [client, setClient] = useState<AssistantClient>('claude');
  const [detected] = useState(() => detectAssistantPlatform(navigator.userAgent, navigator.platform));
  const [platform, setPlatform] = useState<AssistantPlatform>(detected ?? 'linux');
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const configPath = platform === 'windows' ? '%USERPROFILE%\\.pi\\agent\\mcp.json' : '~/.pi/agent/mcp.json';
  const adapterPath = platform === 'windows' ? '%USERPROFILE%\\.config\\mcp\\mcp.json' : '~/.config/mcp/mcp.json';

  return <DialogShell overlayClassName="connect-assistant-overlay" className="connect-assistant-modal"
    labelledBy={titleId} onClose={onClose} closeButton>
    <header className="connect-assistant-header">
      <span className="connect-eyebrow">Your agent, my public context</span>
      <h2 id={titleId}>Connect your assistant</h2>
      <p>Explore my experience, projects, and skills in the assistant you already use. Public, read-only access. No API key required.</p>
    </header>
    <div className="connect-client-tabs" role="tablist" aria-label="Choose your assistant">
      {clients.map((item, index) => <button key={item} type="button" role="tab"
        id={`${panelId}-${item}`} ref={node => { tabs.current[index] = node; }}
        aria-controls={panelId} aria-selected={item === client} tabIndex={item === client ? 0 : -1}
        onClick={() => setClient(item)} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % clients.length
            : event.key === 'ArrowLeft' ? (index + clients.length - 1) % clients.length
              : event.key === 'Home' ? 0 : event.key === 'End' ? clients.length - 1 : null;
          if (next === null) return;
          event.preventDefault();
          setClient(clients[next]);
          tabs.current[next]?.focus();
        }}>{CLIENT_LABELS[item]}</button>)}
    </div>
    <div className="connect-platform-row">
      <label htmlFor={`${panelId}-platform`}>Your computer</label>
      <select id={`${panelId}-platform`} value={platform}
        onChange={event => setPlatform(event.target.value as AssistantPlatform)}>
        {Object.entries(platformLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <span>{detected ? `Detected ${platformLabels[detected]} · change if needed` : 'Choose the computer where your assistant runs'}</span>
    </div>
    <section role="tabpanel" id={panelId} aria-labelledby={`${panelId}-${client}`} className="connect-client-panel">
      <h3>1. Connect {CLIENT_LABELS[client]}</h3>
      <p>{client === 'claude' ? 'In Claude Code, run this in your terminal. In the Claude app, add the server URL under Settings → Connectors → Add custom connector, then enable it for your conversation.'
        : client === 'codex' ? 'Run this with the Codex CLI installed. The server is saved to your user configuration; restart or reconnect your Codex session afterward.'
          : 'Current Pi releases support remote MCP directly. Run this with the Pi CLI installed, then use pi mcp list or /mcp to check the connection. Run /reload if your Pi session is already open.'}</p>
      <p className="connect-terminal-hint">{platform === 'windows' ? 'Windows: run in PowerShell. If your agent runs in WSL, select Linux.' : `${platformLabels[platform]}: run in Terminal.`}</p>
      <CopyBlock key={`${client}-command`} label="Connection command" value={connectionCommand(client)} />
      {client === 'pi' && <>
        <p>The command saves the server to <code>{configPath}</code> and keeps your existing servers.</p>
        <details className="connect-pi-compatibility"><summary>Older Pi without built-in MCP?</summary>
          <p>Update Pi for native MCP, or review the optional <a href="https://github.com/nicobailon/pi-mcp-adapter" target="_blank" rel="noopener noreferrer">community MCP adapter</a> before installing it.</p>
          <CopyBlock label="Optional adapter install command" value="pi install npm:pi-mcp-adapter" />
          <p>Restart Pi after installing the adapter. Merge this configuration into <code>{adapterPath}</code> or a project <code>.mcp.json</code>, then inspect it with <code>/mcp-adapter</code>. Keep your existing servers. The adapter replaces Pi’s built-in MCP when installed.</p>
          <CopyBlock label="Optional adapter MCP configuration" value={PI_CONFIG} />
        </details>
      </>}
      <p className="connect-docs"><a href={CLIENT_DOCS[client]} target="_blank" rel="noopener noreferrer">{CLIENT_LABELS[client]} setup documentation ↗</a></p>
      <div className="connect-endpoint"><span>Remote MCP · Streamable HTTP</span><code>{MCP_URL}</code></div>
      <h3>2. Ask about Jordan</h3>
      <p>Copy this prompt into {CLIENT_LABELS[client]}, then add a role description or business problem. If MCP is unavailable, it includes public API and text sources.</p>
      <CopyBlock key={`${client}-prompt`} label={`Prompt for ${CLIENT_LABELS[client]}`} value={assistantPrompt(client)} />
    </section>
    <aside className="connect-use-agent">
      <div><h3>Don’t want to connect your agent? Use mine.</h3><p>Ask about my work, assess a role, or start a conversation with me.</p></div>
      <button className="btn" type="button" onClick={onUseAgent}>Chat with my Agent</button>
    </aside>
    <nav className="connect-public-links" aria-label="Public portfolio sources">
      <a href="/context.json">Portfolio JSON</a><a href="/llms-full.txt">Plain text</a><a href="/graphql">GraphQL</a>
    </nav>
  </DialogShell>;
}
