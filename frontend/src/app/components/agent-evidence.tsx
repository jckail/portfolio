import React, { useEffect, useRef, useState } from 'react';

import { postJson } from '../../shared/utils/api';
import { endpoints } from '../../shared/utils/api/endpoints';
import '../../styles/components/agent-evidence.css';

interface Source { id: string; title: string; url: string; snippets: string[] }
interface Answer { mode: string; answer: string; sources: Source[] }

const suggestions = ['agent systems', 'data platforms', 'machine learning'];
const endpoint = endpoints.publicMcp;

export default function AgentEvidence() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState('');
  const pending = useRef<AbortController | null>(null);
  const serial = useRef(0);
  const requestActive = useRef(false);
  const mounted = useRef(true);
  const [demoState, setDemoState] = useState('');

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current?.abort(); serial.current += 1; };
  }, []);

  const search = async (text: string) => {
    if (requestActive.current || !text.trim()) return;
    requestActive.current = true;
    const id = ++serial.current;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    setAnswer(null);
    try {
      const result = await postJson<Answer>(endpoints.assistantEvidence, { query: text.trim() }, { signal: controller.signal });
      if (id === serial.current && mounted.current) setAnswer(result);
    } catch (failure) {
      if (id === serial.current && mounted.current && !controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : 'Search is unavailable. Please use the projects below.');
      }
    } finally {
      if (id === serial.current && mounted.current) {
        requestActive.current = false;
        setBusy(false);
      }
    }
  };

  const cancel = () => {
    pending.current?.abort();
    serial.current += 1;
    requestActive.current = false;
    setBusy(false);
    setError('Search canceled. You can ask another question.');
  };

  // Derive origin from this rendered site, never from query parameters or model output.
  const url = window.location.origin + endpoint;
  const command = `claude mcp add --transport http jordan-portfolio ${url}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      if (mounted.current) setCopyState('Command copied.');
    } catch {
      if (mounted.current) setCopyState('Clipboard unavailable. Select and copy the command below.');
    }
  };

  return (
    <section id="agent-evidence" className="agent-evidence" aria-labelledby="agent-evidence-heading">
      <h2 id="agent-evidence-heading">Ask about my work</h2>
      <p>Explore public project and resume evidence, with source links for every match.</p>
      <form onSubmit={event => { event.preventDefault(); void search(query); }}>
        <label htmlFor="evidence-question">What would you like to explore?</label>
        <div className="agent-evidence-input">
          <input id="evidence-question" value={query} maxLength={200} disabled={busy}
            onChange={event => setQuery(event.target.value)} placeholder="e.g. agent systems or data platforms" />
          <button type="submit" disabled={busy || !query.trim()}>{busy ? 'Searching…' : 'Ask'}</button>
          {busy && <button type="button" onClick={cancel}>Cancel</button>}
        </div>
      </form>
      <div className="agent-evidence-suggestions" aria-label="Suggested questions">
        {suggestions.map(text => <button type="button" key={text} disabled={busy}
          onClick={() => { setQuery(text); void search(text); }}>{text}</button>)}
      </div>
      <p className="agent-evidence-status" role="status" aria-live="polite">{error || (busy ? 'Searching public evidence…' : '')}</p>
      {answer && <div aria-live="polite">
        <p>{answer.answer}</p>
        {answer.sources.map(source => <article key={source.id}>
          <h3><a href={source.url}>{source.title}</a></h3>
          {source.snippets.map((snippet, index) => <blockquote key={index}>{snippet}</blockquote>)}
        </article>)}
      </div>}
      <details>
        <summary>Connect your assistant</summary>
        <p>Give your assistant read-only access to the same public evidence. It cannot send messages, reveal private contact details, or run code.</p>
        <label htmlFor="portfolio-mcp-url">Remote MCP URL</label>
        <input id="portfolio-mcp-url" readOnly value={url} />
        <p>Claude Code: run this command in your terminal.</p>
        <pre><code>{command}</code></pre>
        <button type="button" onClick={() => { void copy(); }}>Copy Claude Code command</button>
        <p role="status">{copyState}</p>
        <p>In clients that support custom remote MCP connectors, use the URL above with Streamable HTTP. Available clients and account plans vary. No portfolio credentials are required for this public interface; your assistant’s model usage is billed by its provider.</p>
        <p>For an OpenAI API integration, configure a Responses API MCP tool:</p>
        <pre><code>{JSON.stringify({ type: 'mcp', server_label: 'jordan_portfolio', server_url: url,
          allowed_tools: ['search_public_evidence'], require_approval: 'always' }, null, 2)}</code></pre>
        <p>If your client cannot connect, it can read <a href="/llms-full.txt">the public evidence document</a> or <a href="/resume.json">JSON resume</a>.</p>
      </details>
      <details>
        <summary>Richer demos</summary>
        <p>Public projects remain available below. Email-gated guided demos and coding-agent sessions are under review and aren’t enabled yet.</p>
        <button type="button" onClick={() => setDemoState('Demo access is not enabled. No sign-in, email or paid session was started.')}>
          Check demo access
        </button>
        <p role="status">{demoState}</p>
      </details>
      <p className="agent-evidence-mode">Public evidence lookup · no generated claims or model calls</p>
    </section>
  );
}
