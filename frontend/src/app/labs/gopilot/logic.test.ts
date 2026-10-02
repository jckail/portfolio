import { describe, expect, it } from 'vitest';

import {
  COMMON,
  DEFAULTS,
  SNIPPET_AFTER,
  SNIPPET_BEFORE,
  STAGE_OUTPUT,
  assemble,
  buildCommand,
  buildPrompt,
  contextFiles,
  diffLines,
  enabledThreadStages,
  parseErrors,
  planSteps,
  pythonList,
  stepOutput,
} from './logic';

describe('buildCommand', () => {
  it('is the bare script for defaults', () => {
    expect(buildCommand(DEFAULTS)).toBe('./localtest/run.sh');
  });
  it('matches the README common invocation', () => {
    expect(buildCommand(COMMON)).toBe('./localtest/run.sh -u true -r true -n true -t true');
  });
  it('emits -x only when changed and quotes paths', () => {
    const cmd = buildCommand({ ...DEFAULTS, deleteThreads: false, directory: '~/my go', codeOutput: '/tmp/c.txt', runTest: true });
    expect(cmd).toBe("./localtest/run.sh -d '~/my go' -t true -x false -c /tmp/c.txt");
  });
  it('escapes single quotes', () => {
    expect(buildCommand({ ...DEFAULTS, lintOutput: "a'b" })).toContain(`-l 'a'\\''b'`);
  });
  it('ignores blank paths', () => {
    expect(buildCommand({ ...DEFAULTS, directory: '  ', testOutput: '' })).toBe('./localtest/run.sh');
  });
});

describe('parseErrors', () => {
  it('uses the case-sensitive keyword list and strips whitespace', () => {
    const got = parseErrors(['  Error: x  ', 'runtime error: y', 'ok', 'a.go:1', 'status code: 400', 'ExpiredToken', 'Failed it']);
    expect(got).toEqual(['Error: x', 'a.go:1', 'status code: 400', 'ExpiredToken', 'Failed it']);
  });
  it('keeps only .go lines from the canned run output', () => {
    expect(parseErrors(STAGE_OUTPUT.run)).toEqual([
      '/home/dev/myGoProject/stats/stats.go:8',
      '/home/dev/myGoProject/localtest/run/run.go:11 +0x1d',
    ]);
  });
});

describe('pythonList and buildPrompt', () => {
  it('formats like str(list)', () => {
    expect(pythonList(['a', "it's", 'b\tc', 'q"\'x', 'back\\'])).toBe(`['a', "it's", 'b\\tc', 'q"\\'x', 'back\\\\']`);
  });
  it('asks about TODOs when there are no errors', () => {
    expect(buildPrompt([])).toContain('//TODO');
  });
  it('uses the list template for one or more errors', () => {
    expect(buildPrompt(['x.go:1'])).toContain("these errors '['x.go:1']'");
    expect(buildPrompt(['a.go', 'b.go'])).toContain("['a.go', 'b.go']");
  });
});

describe('planSteps', () => {
  it('always runs the context step and skips ask without stages', () => {
    const s = planSteps(DEFAULTS);
    expect(s.map((x) => x.id)).toEqual(['context', 'run', 'lint', 'test', 'ask']);
    expect(s.map((x) => x.enabled)).toEqual([true, false, false, false, false]);
  });
  it('enables stages from flags', () => {
    expect(planSteps(COMMON).every((x) => x.enabled)).toBe(true);
    expect(enabledThreadStages({ ...DEFAULTS, runLint: true })).toEqual(['lint']);
  });
});

describe('stepOutput', () => {
  it('lists web docs only with -u and erases threads with -x', () => {
    expect(contextFiles(DEFAULTS)).toHaveLength(4);
    expect(contextFiles(COMMON)).toHaveLength(7);
    const withU = stepOutput('context', { ...COMMON, deleteAll: true }).map((x) => x.text).join('\n');
    expect(withU).toContain('Updating Context');
    expect(withU).toContain('deleting all uploaded files');
    expect(withU).toContain('have been erased');
    const plain = stepOutput('context', { ...DEFAULTS, deleteThreads: false }).map((x) => x.text).join('\n');
    expect(plain).not.toContain('Updating Context');
    expect(plain).not.toContain('erased');
  });
  it('shows the tool command, output and parser result', () => {
    const t = stepOutput('lint', COMMON).map((x) => x.text).join('\n');
    expect(t).toContain('golangci-lint run --timeout=5m > ~/projects/goHelper/goHelpers/results/lintOutput.txt 2>&1');
    expect(t).toContain('errorParser.py');
    expect(stepOutput('run', COMMON).some((x) => x.kind === 'err')).toBe(true);
    expect(stepOutput('test', { ...COMMON, testOutput: '/t.txt' })[1].text).toContain('> /t.txt 2>&1');
  });
  it('creates one thread per enabled stage', () => {
    const t = stepOutput('ask', { ...DEFAULTS, runCode: true, runTest: true }).map((x) => x.text).join('\n');
    expect(t).toContain('thread_DEMO_run');
    expect(t).toContain('thread_DEMO_test');
    expect(t).not.toContain('thread_DEMO_lint');
    expect(t).toContain('2 errors found');
  });
  it('pluralises a single kept line', () => {
    expect(stepOutput('ask', { ...DEFAULTS, runLint: true }).some((x) => x.text.includes('1 error found'))).toBe(true);
  });
});

describe('assemble', () => {
  it('combines files, filtered lines and prompt', () => {
    const a = assemble(COMMON, 'test');
    expect(a.files).toHaveLength(7);
    expect(a.kept.length).toBeGreaterThan(0);
    expect(a.prompt).toContain(a.kept[0]);
  });
});

describe('diffLines', () => {
  it('marks added lines and keeps unchanged ones', () => {
    const d = diffLines(SNIPPET_BEFORE, SNIPPET_AFTER);
    expect(d.filter((x) => x.kind === 'del')).toHaveLength(0);
    expect(d.filter((x) => x.kind === 'add').map((x) => x.text.trim())).toContain('return 0');
    expect(d.filter((x) => x.kind !== 'add').map((x) => x.text).join('\n')).toBe(SNIPPET_BEFORE);
  });
  it('handles deletions', () => {
    expect(diffLines('a\nb', 'a')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'del', text: 'b' },
    ]);
    expect(diffLines('a', 'a\nb')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'add', text: 'b' },
    ]);
    expect(diffLines('x', 'y').map((d) => d.kind).sort()).toEqual(['add', 'del']);
  });
});
