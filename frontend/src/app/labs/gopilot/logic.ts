// Pure logic for the goPilot replay. Everything here is illustrative: the Go
// snippet, console output and assistant replies are canned and nothing is run,
// sent or fetched. The CLI flags, the errorParser keyword filter and the
// prompt templates mirror github.com/jckail/goPilot.

export type StageId = 'context' | 'run' | 'lint' | 'test' | 'ask';
export type LineKind = 'cmd' | 'out' | 'err' | 'info';
export interface LogLine {
  text: string;
  kind: LineKind;
}

export interface Options {
  directory: string; // -d
  updateContext: boolean; // -u
  deleteAll: boolean; // -a
  runCode: boolean; // -r
  runLint: boolean; // -n
  runTest: boolean; // -t
  deleteThreads: boolean; // -x (default true)
  codeOutput: string; // -c
  lintOutput: string; // -l
  testOutput: string; // -o
}

export const RESULTS_DIR = '~/projects/goHelper/goHelpers/results';
export const DEFAULTS: Options = {
  directory: '.',
  updateContext: false,
  deleteAll: false,
  runCode: false,
  runLint: false,
  runTest: false,
  deleteThreads: true,
  codeOutput: `${RESULTS_DIR}/codeRun.txt`,
  lintOutput: `${RESULTS_DIR}/lintOutput.txt`,
  testOutput: `${RESULTS_DIR}/testOutput.txt`,
};

/** The README's "most commonly used" preset: -u -r -n -t true. */
export const COMMON: Options = { ...DEFAULTS, updateContext: true, runCode: true, runLint: true, runTest: true };

export const CHAT_THREADS = `${RESULTS_DIR}/chatThreads.txt`;

// errorParser.py keeps a line when it contains any of these (case-sensitive).
export const ERROR_KEYWORDS = ['Failed', 'Error', 'ExpiredToken', 'status code: 400', '.go'];

export const SNIPPET_FILE = 'stats/stats.go';
export const SNIPPET_BEFORE = `package stats

func Average(values []int) int {
	total := 0
	for _, v := range values {
		total += v
	}
	return total / len(values)
}`;
export const SNIPPET_AFTER = `package stats

// Average returns the mean of values, or 0 for an empty slice.
func Average(values []int) int {
	if len(values) == 0 {
		return 0
	}
	total := 0
	for _, v := range values {
		total += v
	}
	return total / len(values)
}`;

const PROJECT = '/home/dev/myGoProject';

/** Illustrative console output of each tool against the buggy snippet. */
export const STAGE_OUTPUT: Record<'run' | 'lint' | 'test', string[]> = {
  run: [
    'panic: runtime error: integer divide by zero',
    '',
    'goroutine 1 [running]:',
    'myproject/stats.Average(...)',
    `\t${PROJECT}/stats/stats.go:8`,
    'main.main()',
    `\t${PROJECT}/localtest/run/run.go:11 +0x1d`,
    'exit status 2',
  ],
  lint: [`stats/stats.go:3:1: exported: exported function Average should have comment or be unexported (revive)`],
  test: [
    '--- FAIL: TestAverageEmpty (0.00s)',
    'panic: runtime error: integer divide by zero [recovered]',
    '\tpanic: runtime error: integer divide by zero',
    '',
    'goroutine 7 [running]:',
    'myproject/stats.Average(...)',
    `\t${PROJECT}/stats/stats.go:8`,
    'myproject/stats.TestAverageEmpty(0xc000102000)',
    `\t${PROJECT}/stats/stats_test.go:9 +0x1a`,
    'FAIL\texample.com/myproject/stats\t0.004s',
    'FAIL',
  ],
};

export type ThreadStage = 'run' | 'lint' | 'test';
export const THREAD_STAGES: ThreadStage[] = ['run', 'lint', 'test'];

export const STAGE_LABEL: Record<StageId, string> = {
  context: 'Update context',
  run: 'Run',
  lint: 'Lint',
  test: 'Test',
  ask: 'Ask the assistant',
};

/** Mirrors errorParser.main(): keep stripped lines containing a keyword. */
export function parseErrors(lines: string[]): string[] {
  return lines.filter((l) => ERROR_KEYWORDS.some((k) => l.includes(k))).map((l) => l.trim());
}

/** Mirrors addGo.AssistantManager.createThread's prompt selection. */
export function buildPrompt(errors: string[]): string {
  if (errors.length === 0) {
    return 'My code ran succesfully, that I stored in the "_go.txt" files I\'ve uploaded. What are some items marked as "TODO" or "//TODO" in any of the "_go.txt" files I\'ve uploaded?';
  }
  // In the real code the `== 1` template is overwritten by the `>= 1` one,
  // so the list form is used for one error as well.
  return `I have encountered these errors '${pythonList(errors)}' when running the the code I gave you in the "_go.txt" files I've uploaded. Please provide me a solution or debugging steps so I can quickly resolve.`;
}

/** Python's str(list) for a list of strings (what the f-string embeds). */
export function pythonList(items: string[]): string {
  const q = (s: string) => {
    const useDouble = s.includes("'") && !s.includes('"');
    const body = s.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n');
    if (useDouble) return `"${body}"`;
    return `'${body.replace(/'/g, "\\'")}'`;
  };
  return `[${items.map(q).join(', ')}]`;
}

function shellQuote(v: string): string {
  return /^[A-Za-z0-9_./~:@%+=,-]+$/.test(v) ? v : `'${v.replace(/'/g, `'\\''`)}'`;
}

/** The equivalent command line. Only non-default flags are emitted. */
export function buildCommand(o: Options): string {
  const parts = ['./localtest/run.sh'];
  const dir = o.directory.trim();
  if (dir !== '' && dir !== DEFAULTS.directory) parts.push('-d', shellQuote(dir));
  const bool = (flag: string, on: boolean, def: boolean) => {
    if (on !== def) parts.push(flag, on ? 'true' : 'false');
  };
  bool('-u', o.updateContext, DEFAULTS.updateContext);
  bool('-a', o.deleteAll, DEFAULTS.deleteAll);
  bool('-r', o.runCode, DEFAULTS.runCode);
  bool('-n', o.runLint, DEFAULTS.runLint);
  bool('-t', o.runTest, DEFAULTS.runTest);
  bool('-x', o.deleteThreads, DEFAULTS.deleteThreads);
  const path = (flag: string, v: string, def: string) => {
    const t = v.trim();
    if (t !== '' && t !== def) parts.push(flag, shellQuote(t));
  };
  path('-c', o.codeOutput, DEFAULTS.codeOutput);
  path('-l', o.lintOutput, DEFAULTS.lintOutput);
  path('-o', o.testOutput, DEFAULTS.testOutput);
  return parts.join(' ');
}

export interface Step {
  id: StageId;
  label: string;
  enabled: boolean;
}

/** The replay order follows localtest/run.sh: context, run, lint, test, threads. */
export function planSteps(o: Options): Step[] {
  const stage = (id: StageId, enabled: boolean): Step => ({ id, label: STAGE_LABEL[id], enabled });
  const threadStages = enabledThreadStages(o);
  return [
    // all_run.sh always runs: it uploads the consolidated files; -u adds web docs.
    stage('context', true),
    stage('run', o.runCode),
    stage('lint', o.runLint),
    stage('test', o.runTest),
    stage('ask', threadStages.length > 0),
  ];
}

export function enabledThreadStages(o: Options): ThreadStage[] {
  return THREAD_STAGES.filter((s) => (s === 'run' ? o.runCode : s === 'lint' ? o.runLint : o.runTest));
}

function outPath(o: Options, s: ThreadStage): string {
  return s === 'run' ? o.codeOutput : s === 'lint' ? o.lintOutput : o.testOutput;
}

const PLAYGROUND = 'https://platform.openai.com/playground?assistant=<assistant-id>&mode=assistant&thread=';
const threadId = (s: ThreadStage) => `thread_DEMO_${s}`;

export const CONTEXT_FILES = ['stats_go.txt', 'localtest_go.txt', 'package_map_context.txt', 'projectDirectoryTree_context.txt'];
export const WEB_DOCS = ['effective_go_context.txt', 'pkg_os_context.txt', 'pkg_encoding_json_context.txt'];

export function contextFiles(o: Options): string[] {
  return o.updateContext ? [...CONTEXT_FILES, ...WEB_DOCS] : CONTEXT_FILES;
}

const l = (kind: LineKind, text: string): LogLine => ({ kind, text });

/** Console lines produced by one step. Never executes anything. */
export function stepOutput(id: StageId, o: Options): LogLine[] {
  if (id === 'context') {
    const lines: LogLine[] = [l('info', `all_run.sh -d ${shellQuote(o.directory || '.')} -u ${o.updateContext} -a ${o.deleteAll}`)];
    if (o.updateContext) lines.push(l('out', 'Updating Context'), l('out', `fetching ${WEB_DOCS.length} Go documentation pages`));
    if (o.deleteAll) lines.push(l('out', 'removing files from assistant, deleting all uploaded files'));
    const files = contextFiles(o);
    lines.push(l('out', `uploading ${files.length} files to assistant`));
    for (const f of files) lines.push(l('out', `  Uploading: ${f}`));
    lines.push(l('out', 'uploadFilestoAssistant Completed!'));
    if (o.deleteThreads) lines.push(l('out', `Contents of ${CHAT_THREADS} have been erased.`));
    return lines;
  }
  if (id === 'ask') {
    const lines: LogLine[] = [];
    for (const s of enabledThreadStages(o)) {
      const errors = parseErrors(STAGE_OUTPUT[s]);
      lines.push(
        l('info', `[${s}] ${errors.length} error${errors.length === 1 ? '' : 's'} found`),
        l('out', `Thread Created: ${threadId(s)}`),
        l('out', `View response here: ${PLAYGROUND}${threadId(s)}`),
        l('out', 'Message Created, Run Created'),
        l('out', 'Ai Response completed!'),
      );
    }
    lines.push(l('out', 'Running Thread Parsers...'));
    for (const s of enabledThreadStages(o)) lines.push(l('out', `View response here: ${PLAYGROUND}${threadId(s)}`));
    return lines;
  }
  const s = id;
  const verb = s === 'run' ? 'Running code...' : s === 'lint' ? 'Running lints...' : 'Running tests...';
  const tool =
    s === 'run'
      ? 'go run localtest/run/run.go'
      : s === 'lint'
        ? 'golangci-lint run --timeout=5m'
        : 'go test ./... -coverprofile=coverage.txt -covermode count -timeout 2m';
  const file = outPath(o, s);
  const lines: LogLine[] = [l('out', verb), l('cmd', `${tool} > ${file} 2>&1`)];
  const errors = parseErrors(STAGE_OUTPUT[s]);
  lines.push(l('info', `--- contents of ${file} (illustrative) ---`));
  for (const t of STAGE_OUTPUT[s]) lines.push(l('err', t));
  lines.push(l('info', '--- errorParser.py ---'), l('out', `trying: ${file}`), l('out', pythonList(errors)));
  return lines;
}

export interface Assembly {
  files: string[];
  stage: ThreadStage;
  output: string[];
  kept: string[];
  prompt: string;
}

export function assemble(o: Options, s: ThreadStage): Assembly {
  const output = STAGE_OUTPUT[s];
  const kept = parseErrors(output);
  return { files: contextFiles(o), stage: s, output, kept, prompt: buildPrompt(kept) };
}

/** Canned, clearly illustrative assistant replies. Not model output. */
export const ASSISTANT_REPLY: Record<ThreadStage, string[]> = {
  run: [
    'The panic comes from stats/stats.go line 8: total / len(values) divides by zero when values is empty, and run.go line 11 passes an empty slice.',
    'Guard the empty case before dividing, for example by returning 0, or change the signature to return an error so callers decide.',
  ],
  lint: [
    'revive wants a doc comment on every exported identifier. Start it with the name: "// Average returns ...".',
    'While you are there, document what happens for an empty slice, since that is the case that currently panics.',
  ],
  test: [
    'TestAverageEmpty fails with the same divide by zero: stats_test.go line 9 calls Average with an empty slice and stats.go line 8 divides by len(values).',
    'After adding the guard, keep this test: it now asserts the intended behaviour for empty input.',
  ],
};

export type DiffKind = 'same' | 'add' | 'del';
export interface DiffLine {
  kind: DiffKind;
  text: string;
}

/** Line diff via longest common subsequence (small inputs only). */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: 'del', text: a[i++] });
    } else {
      out.push({ kind: 'add', text: b[j++] });
    }
  }
  while (i < a.length) out.push({ kind: 'del', text: a[i++] });
  while (j < b.length) out.push({ kind: 'add', text: b[j++] });
  return out;
}
