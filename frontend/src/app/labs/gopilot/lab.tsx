import { useEffect, useMemo, useRef, useState } from 'react';

import './gopilot.css';
import {
  ASSISTANT_REPLY,
  COMMON,
  DEFAULTS,
  SNIPPET_AFTER,
  SNIPPET_BEFORE,
  SNIPPET_FILE,
  STAGE_LABEL,
  THREAD_STAGES,
  assemble,
  buildCommand,
  diffLines,
  enabledThreadStages,
  planSteps,
  stepOutput,
  type LogLine,
  type Options,
  type ThreadStage,
} from './logic';

type BoolKey = 'updateContext' | 'deleteAll' | 'runCode' | 'runLint' | 'runTest' | 'deleteThreads';
type TextKey = 'directory' | 'codeOutput' | 'lintOutput' | 'testOutput';

const BOOL_FLAGS: { key: BoolKey; flag: string; label: string; hint: string }[] = [
  { key: 'updateContext', flag: '-u', label: 'Update context', hint: 'also fetch Go documentation pages' },
  { key: 'runCode', flag: '-r', label: 'Run code', hint: 'go run localtest/run/run.go' },
  { key: 'runLint', flag: '-n', label: 'Run linter', hint: 'golangci-lint run' },
  { key: 'runTest', flag: '-t', label: 'Run tests', hint: 'go test ./...' },
  { key: 'deleteAll', flag: '-a', label: 'Delete all threads text', hint: 'remove files from the assistant first' },
  { key: 'deleteThreads', flag: '-x', label: 'Erase chatThreads.txt afterwards', hint: 'default is on' },
];
const TEXT_FLAGS: { key: TextKey; flag: string; label: string }[] = [
  { key: 'directory', flag: '-d', label: 'Directory' },
  { key: 'codeOutput', flag: '-c', label: 'Code output path' },
  { key: 'lintOutput', flag: '-l', label: 'Lint output path' },
  { key: 'testOutput', flag: '-o', label: 'Test output path' },
];

const BUG_LINE = 8;
const PREFIX: Record<LogLine['kind'], string> = { cmd: '$ ', out: '', err: '! ', info: '# ' };

export default function GoPilotLab() {
  const [opts, setOpts] = useState<Options>(COMMON);
  const [cursor, setCursor] = useState(0);
  const [stage, setStage] = useState<ThreadStage>('run');
  const logRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(() => planSteps(opts), [opts]);
  const command = useMemo(() => buildCommand(opts), [opts]);
  const lines = useMemo<LogLine[]>(() => {
    const out: LogLine[] = [{ kind: 'cmd', text: command }];
    steps.slice(0, cursor).forEach((s) => {
      if (s.enabled) out.push(...stepOutput(s.id, opts));
      else out.push({ kind: 'info', text: `${s.label}: skipped, its flag is off` });
    });
    return out;
  }, [steps, cursor, opts, command]);
  const diff = useMemo(() => diffLines(SNIPPET_BEFORE, SNIPPET_AFTER), []);
  const assembly = useMemo(() => assemble(opts, stage), [opts, stage]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const change = (patch: Partial<Options>) => {
    setOpts((o) => ({ ...o, ...patch }));
    setCursor(0);
  };
  const done = cursor >= steps.length;
  const next = () => {
    const idx = steps.findIndex((s, i) => i >= cursor && s.enabled);
    setCursor(idx === -1 ? steps.length : idx + 1);
  };
  const askIndex = steps.findIndex((s) => s.id === 'ask');
  const askDone = steps[askIndex].enabled && cursor > askIndex;
  const replyStages = enabledThreadStages(opts);
  const replyStage = replyStages.includes(stage) ? stage : replyStages[0];

  return (
    <main id="main-content" className="gp" tabIndex={-1}>
      <h1>goPilot: CLI replay</h1>
      <p className="gp-lede">
        goPilot is a CLI that runs a Go project&apos;s code, linter and tests, filters the output for errors and sends them, with
        the project&apos;s source as context, to an OpenAI assistant. This page replays that flow step by step.
      </p>
      <p className="gp-notice" role="note">
        Everything below is illustrative and canned: the Go snippet, console output and assistant replies are made up for this
        demo. Nothing is executed, no model is called and nothing leaves your browser.
      </p>

      <section aria-labelledby="gp-flags">
        <h2 id="gp-flags">1. Choose flags</h2>
        <div className="gp-presets">
          <button type="button" onClick={() => change(COMMON)}>
            README preset (-u -r -n -t)
          </button>
          <button type="button" onClick={() => change(DEFAULTS)}>
            All defaults
          </button>
        </div>
        <div className="gp-flags">
          <fieldset>
            <legend>Toggles</legend>
            {BOOL_FLAGS.map((f) => (
              <label key={f.key} className="gp-check">
                <input type="checkbox" checked={opts[f.key]} onChange={(e) => change({ [f.key]: e.target.checked })} />
                <span>
                  <code>{f.flag}</code> {f.label} <small>({f.hint})</small>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Paths</legend>
            {TEXT_FLAGS.map((f) => (
              <label key={f.key} className="gp-field">
                <span>
                  <code>{f.flag}</code> {f.label}
                </span>
                <input type="text" value={opts[f.key]} spellCheck={false} autoComplete="off" onChange={(e) => change({ [f.key]: e.target.value })} />
              </label>
            ))}
          </fieldset>
        </div>
        <p className="gp-cmdlabel" id="gp-cmd-label">
          Equivalent command line (only non-default flags are shown)
        </p>
        <pre className="gp-code gp-cmdbox" aria-labelledby="gp-cmd-label">
          <code>{command}</code>
        </pre>
      </section>

      <section aria-labelledby="gp-code">
        <h2 id="gp-code">2. Sample project</h2>
        <p>
          <code>{SNIPPET_FILE}</code> has a deliberate bug: <code>Average</code> divides by zero for an empty slice, and has no doc
          comment. The canned run, lint and test output below all point at it.
        </p>
        <pre className="gp-code" aria-label={`${SNIPPET_FILE} source`}>
          <code>
            {SNIPPET_BEFORE.split('\n').map((t, i) => (
              <span key={i} className={i + 1 === BUG_LINE ? 'gp-line gp-bug' : 'gp-line'}>
                <span className="gp-ln" aria-hidden="true">
                  {i + 1}
                </span>
                {t}
                {i + 1 === BUG_LINE ? <span className="gp-flag"> {'// bug: len(values) can be 0'}</span> : null}
                {'\n'}
              </span>
            ))}
          </code>
        </pre>
      </section>

      <section aria-labelledby="gp-replay">
        <h2 id="gp-replay">3. Replay the pipeline</h2>
        <div className="gp-presets">
          <button type="button" onClick={next} disabled={done}>
            {done ? 'Replay finished' : 'Next step'}
          </button>
          <button type="button" onClick={() => setCursor(steps.length)} disabled={done}>
            Run all steps
          </button>
          <button type="button" onClick={() => setCursor(0)} disabled={cursor === 0}>
            Reset replay
          </button>
        </div>
        <ol className="gp-steps" aria-label="Pipeline steps">
          {steps.map((s, i) => {
            const state = !s.enabled ? 'skipped (flag off)' : i < cursor ? 'done' : 'pending';
            return (
              <li key={s.id} data-state={i < cursor ? 'done' : 'pending'}>
                <strong>{s.label}</strong> <span>{state}</span>
              </li>
            );
          })}
        </ol>
        <div
          ref={logRef}
          className="gp-term"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Console output, read only. This is not a shell."
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable log must be keyboard reachable
          tabIndex={0}
        >
          {lines.map((ln, i) => (
            <div key={i} className={`gp-tl gp-${ln.kind}`}>
              <span aria-hidden={ln.kind === 'out' ? true : undefined}>{PREFIX[ln.kind]}</span>
              {ln.text || ' '}
            </div>
          ))}
        </div>
        <p className="gp-small">
          Read-only replay, not a shell. In the real script each stage creates its assistant thread right after the error parser
          runs; the replay groups the threads into the last step for readability. The parser keeps a line only if it contains
          one of <code>Failed</code>, <code>Error</code>, <code>ExpiredToken</code>, <code>status code: 400</code> or{' '}
          <code>.go</code> (case-sensitive), which is why the lines mentioning a file are the ones kept.
        </p>
      </section>

      <section aria-labelledby="gp-assembly">
        <h2 id="gp-assembly">4. How the request is assembled</h2>
        <div className="gp-tabs" role="group" aria-label="Show the request for stage">
          {THREAD_STAGES.map((s) => (
            <button key={s} type="button" aria-pressed={stage === s} onClick={() => setStage(s)}>
              {STAGE_LABEL[s]}
              {replyStages.includes(s) ? '' : ' (flag off)'}
            </button>
          ))}
        </div>
        <div className="gp-flow">
          <div className="gp-node">
            <h3>Context files on the assistant</h3>
            <ul>
              {assembly.files.map((f) => (
                <li key={f}>
                  <code>{f}</code>
                </li>
              ))}
            </ul>
            <small>{opts.updateContext ? 'Go documentation pages were fetched because -u is on.' : 'Documentation pages are not fetched without -u.'}</small>
          </div>
          <svg className="gp-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="gp-node">
            <h3>Parsed errors</h3>
            <p className="gp-small">
              {assembly.output.length} output lines, {assembly.kept.length} kept:
            </p>
            <ul>
              {assembly.kept.map((k) => (
                <li key={k}>
                  <code>{k}</code>
                </li>
              ))}
            </ul>
          </div>
          <svg className="gp-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="gp-node">
            <h3>Thread message</h3>
            <p className="gp-small">New thread, this user message, then a run on the assistant, polled until complete.</p>
            <blockquote>{assembly.prompt}</blockquote>
          </div>
        </div>
      </section>

      <section aria-labelledby="gp-answer">
        <h2 id="gp-answer">5. Assistant reply and suggested fix</h2>
        {askDone && replyStage ? (
          <>
            <p className="gp-badge">Illustrative reply, written for this demo, not model output</p>
            <div className="gp-tabs" role="group" aria-label="Show the reply for stage">
              {replyStages.map((s) => (
                <button key={s} type="button" aria-pressed={replyStage === s} onClick={() => setStage(s)}>
                  {STAGE_LABEL[s]}
                </button>
              ))}
            </div>
            {ASSISTANT_REPLY[replyStage].map((p) => (
              <p key={p}>{p}</p>
            ))}
            <h3>Suggested change to {SNIPPET_FILE}</h3>
            <pre className="gp-code" aria-label="Diff of the suggested fix">
              <code>
                {diff.map((d, i) => (
                  <span key={i} className={`gp-d gp-d-${d.kind}`}>
                    <span aria-hidden="true">{d.kind === 'add' ? '+ ' : d.kind === 'del' ? '- ' : '  '}</span>
                    <span className="sr-only">{d.kind === 'add' ? 'added: ' : d.kind === 'del' ? 'removed: ' : 'unchanged: '}</span>
                    {d.text}
                    {'\n'}
                  </span>
                ))}
              </code>
            </pre>
          </>
        ) : (
          <p>Step the replay through &ldquo;Ask the assistant&rdquo; (with at least one of Run, Lint or Test on) to see a canned reply and diff.</p>
        )}
      </section>
    </main>
  );
}
