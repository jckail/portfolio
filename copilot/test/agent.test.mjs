import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runCopilot, LIMITS, TOOL_SCHEMAS, SafeError } from '../agent.mjs';

const start = { prompt: 'Inspect workspace and suggest draining the consumer.', model: 'gemini-3.1-flash', history: [] };
const final = text => ({ text, tool_calls: [], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: 'end' });
const tools = calls => ({ text: '', tool_calls: calls, usage: { input_tokens: 5, output_tokens: 5 }, stop_reason: 'tool_use' });
const call = (id, name, args, provider_state = {}) => ({ id, name, args, provider_state });
const done = frames => frames.findLast(frame => frame.type === 'done');

// These tests instantiate and execute the installed Pi Agent, not a host mock.
test('real Pi loop executes tools and echoes opaque Vertex state across rounds', async () => {
  const frames = [], requests = [], reads = [];
  const providerState = { thoughtSignature: 'opaque-signature-not-browser-data', extra: { future: true } };
  await runCopilot({ request: start, emit: frame => frames.push(frame), bridge: async (type, payload, _signal, delta) => {
    if (type === 'provider_request') {
      requests.push(payload.request);
      if (requests.length === 1) return tools([call('one', 'inspect_workspace', {}, providerState)]);
      const assistant = payload.request.messages.find(message => message.role === 'assistant' && message.tool_calls.length);
      assert.deepEqual(assistant.tool_calls[0].provider_state, providerState);
      assert.deepEqual(payload.request.messages.at(-1).results[0].output, { table_count: 4 });
      delta('Four '); delta('tables are ready.');
      return final('Four tables are ready.');
    }
    reads.push(payload);
    return { table_count: 4 };
  } });
  assert.equal(requests.length, 2);
  assert.deepEqual(reads, [{ tool: 'inspect_workspace', args: {} }]);
  assert.deepEqual(requests[0].tools.map(tool => tool.name), TOOL_SCHEMAS.map(tool => tool.name));
  assert.equal(frames.filter(frame => frame.type === 'delta').map(frame => frame.text).join(''), 'Four tables are ready.');
  assert.equal(JSON.stringify(frames).includes('opaque-signature'), false);
  assert.equal(frames.filter(frame => frame.type === 'tool_start').length, 1);
  assert.equal(done(frames).ok, true);
});

test('proposal only forwards bounded args; no local workspace mutation', async () => {
  const frames = [], workspace = { active: false }, invocations = [];
  let round = 0;
  await runCopilot({ request: start, emit: frame => frames.push(frame), bridge: async (type, payload) => {
    if (type === 'provider_request') return ++round === 1 ? tools([call('proposal', 'propose_runtime_change', { action: 'consumer_drain', limit: 20, reason: 'Process buffered rows.' })]) : final('Confirm the proposal to drain buffered rows.');
    invocations.push(payload);
    return { proposal: { id: 'pending-one', action: payload.args.action, args: payload.args } };
  } });
  assert.deepEqual(workspace, { active: false });
  assert.equal(invocations.length, 1);
  assert.equal(invocations[0].tool, 'propose_runtime_change');
  assert.equal(frames.find(frame => frame.type === 'proposal').proposal.id, 'pending-one');
  assert.equal(done(frames).ok, true);
});

test('invalid schemas never cross the tool bridge', async () => {
  for (const args of [{ action: 'reset', reason: 'test', shell: 'rm -rf /' }, { action: 'produce', batch_size: 1000, reason: 'test' }]) {
    const frames = [], forwarded = [];
    let round = 0;
    await runCopilot({ request: start, emit: frame => frames.push(frame), bridge: async (type, payload) => {
      if (type === 'provider_request') return ++round === 1 ? tools([call('bad', 'propose_runtime_change', args)]) : final('The change was rejected.');
      forwarded.push(payload);
      return {};
    } });
    assert.equal(forwarded.length, 0);
    assert.equal(frames.find(frame => frame.type === 'tool_end').ok, false);
  }
});

test('unknown shell tool is fatal and never executed', async () => {
  const frames = [], forwarded = [];
  await runCopilot({ request: start, emit: frame => frames.push(frame), bridge: async (type, payload) => {
    if (type === 'provider_request') return tools([call('bad', 'bash', { command: 'anything' })]);
    forwarded.push(payload);
    return {};
  } });
  assert.equal(forwarded.length, 0);
  assert.equal(done(frames).ok, false);
  assert.equal(frames.find(frame => frame.type === 'error').kind, 'protocol');
});

test('provider failures are sanitized and do not expose credentials or response bodies', async () => {
  const frames = [];
  await runCopilot({ request: start, emit: frame => frames.push(frame), bridge: async () => { throw new Error('key=PRIVATE_SECRET provider response body'); } });
  assert.equal(JSON.stringify(frames).includes('PRIVATE_SECRET'), false);
  assert.equal(frames.find(frame => frame.type === 'error').kind, 'error');
  assert.equal(done(frames).ok, false);
});

test('round and total tool caps stop unbounded tool requests', async () => {
  for (const limits of [{ ...LIMITS, rounds: 2 }, { ...LIMITS, tools: 1 }]) {
    const frames = [], forwarded = [];
    let count = 0;
    await runCopilot({ request: start, limits, emit: frame => frames.push(frame), bridge: async (type, payload) => {
      if (type === 'provider_request') return tools([call('call' + ++count, 'inspect_workspace', {})]);
      forwarded.push(payload); return { ready: true };
    } });
    assert.equal(done(frames).limited, true);
    assert.ok(forwarded.length <= Math.min(limits.rounds, limits.tools));
  }
});

test('cancellation aborts a pending provider bridge and emits terminal done', async () => {
  const frames = [], controller = new AbortController();
  let observedAbort = false;
  const running = runCopilot({ request: start, emit: frame => frames.push(frame), signal: controller.signal, bridge: async (_type, _payload, signal) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => { observedAbort = true; reject(new SafeError('cancelled')); }, { once: true });
    setTimeout(() => controller.abort(), 5);
  }) });
  await running;
  assert.equal(observedAbort, true);
  assert.equal(done(frames).cancelled, true);
  assert.equal(done(frames).ok, false);
});

test('deadline aborts stalled provider and tools', async () => {
  for (const target of ['provider_request', 'tool_request']) {
    const frames = [];
    await runCopilot({ request: start, limits: { ...LIMITS, deadlineMs: 15 }, emit: frame => frames.push(frame), bridge: async (type, _payload, signal) => {
      if (type !== target) return tools([call('read', 'inspect_workspace', {})]);
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new SafeError('cancelled')), { once: true }));
    } });
    assert.equal(done(frames).ok, false);
    assert.equal(frames.find(frame => frame.type === 'error').kind, 'timeout');
  }
});

test('history and tool output bounds are enforced', async () => {
  const rejected = [];
  await runCopilot({ request: { ...start, history: Array(21).fill({ role: 'user', text: 'hello' }) }, emit: frame => rejected.push(frame), bridge: async () => assert.fail('must not reach provider') });
  assert.equal(done(rejected).limited, true);
  const frames = [];
  await runCopilot({ request: start, emit: frame => frames.push(frame), bridge: async type => type === 'provider_request' ? tools([call('read', 'inspect_catalog', {})]) : { blob: 'x'.repeat(LIMITS.toolBytes + 1) } });
  assert.equal(done(frames).limited, true);
});

test('private NDJSON process supports real provider/tool round trip and clean exit', async () => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], { stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: process.env.PATH } });
  const frames = []; let buffer = '', errors = '', round = 0;
  child.stderr.on('data', chunk => { errors += chunk; });
  child.stdout.on('data', chunk => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const frame = JSON.parse(buffer.slice(0, index)); buffer = buffer.slice(index + 1); frames.push(frame);
      if (frame.type === 'provider_request') {
        const result = ++round === 1 ? tools([call('read', 'query_sql', { sql: 'SELECT COUNT(*) FROM events', row_limit: 1 })]) : final('There are 30 events.');
        child.stdin.write(JSON.stringify({ type: 'provider_result', id: frame.id, result }) + '\n');
      }
      if (frame.type === 'tool_request') child.stdin.write(JSON.stringify({ type: 'tool_result', id: frame.id, result: { columns: ['count'], rows: [[30]] } }) + '\n');
    }
  });
  child.stdin.write(JSON.stringify({ type: 'start', ...start }) + '\n');
  const exit = await new Promise(resolve => child.on('close', code => resolve(code)));
  assert.equal(exit, 0); assert.equal(errors, ''); assert.equal(round, 2); assert.equal(done(frames).ok, true);
});

test('invalid tool attempts also consume the total call budget', async () => {
  const frames = []; let sequence = 0;
  await runCopilot({ request: start, limits: { ...LIMITS, tools: 2 }, emit: frame => frames.push(frame), bridge: async type => {
    assert.equal(type, 'provider_request');
    return tools([call('invalid' + ++sequence, 'query_sql', { sql: 'SELECT 1', row_limit: 10000 })]);
  } });
  assert.equal(sequence, 3);
  assert.equal(done(frames).limited, true);
  assert.equal(frames.filter(frame => frame.type === 'tool_end').length, 2);
});

test('private NDJSON cancellation reaps worker without provider completion', async () => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], { stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: process.env.PATH } });
  const frames = []; let buffer = '', errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  child.stdout.on('data', chunk => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const frame = JSON.parse(buffer.slice(0, index)); buffer = buffer.slice(index + 1); frames.push(frame);
      if (frame.type === 'provider_request') child.stdin.write('{"type":"cancel"}\n');
    }
  });
  child.stdin.write(JSON.stringify({ type: 'start', ...start }) + '\n');
  const exit = await new Promise(resolve => child.on('close', code => resolve(code)));
  assert.equal(exit, 0); assert.equal(errors, ''); assert.equal(done(frames).cancelled, true);
});

test('Vertex fallback IDs can repeat across rounds while Pi IDs and signatures remain distinct', async () => {
  const frames = [], requests = [], executed = [];
  const definitions = [
    ['inspect_workspace', {}],
    ['query_sql', { sql: 'SELECT COUNT(*) FROM products', row_limit: 1 }],
    ['propose_runtime_change', { action: 'consumer_pause', reason: 'Observe lag.' }],
  ];
  await runCopilot({ request: start, emit: frame => frames.push(frame), bridge: async (type, payload) => {
    if (type === 'provider_request') {
      requests.push(payload.request);
      if (requests.length <= definitions.length) {
        const [name, args] = definitions[requests.length - 1];
        return tools([call('call_0', name, args, { thoughtSignature: 'signature-' + requests.length })]);
      }
      return final('Inspected the workspace, queried products and proposed a pause.');
    }
    executed.push(payload.tool);
    if (payload.tool === 'propose_runtime_change') return { proposal: { id: 'visitor-confirmation-one', action: { action: 'consumer_pause' } } };
    return { count: 48 };
  } });
  assert.equal(done(frames).ok, true);
  assert.deepEqual(executed, definitions.map(([name]) => name));
  const transcript = requests.at(-1).messages;
  const calls = transcript.filter(message => message.role === 'assistant').flatMap(message => message.tool_calls);
  const results = transcript.filter(message => message.role === 'tool').flatMap(message => message.results);
  assert.equal(new Set(calls.map(item => item.id)).size, 3);
  assert.deepEqual(results.map(item => item.call_id), calls.map(item => item.id));
  assert.deepEqual(calls.map(item => item.provider_state.thoughtSignature), ['signature-1', 'signature-2', 'signature-3']);
  assert.equal(frames.find(frame => frame.type === 'proposal').proposal.id, 'visitor-confirmation-one');
  assert.equal(JSON.stringify(frames).includes('signature-'), false);
});

test('duplicate IDs within one provider response are still rejected', async () => {
  const frames = []; let executions = 0;
  await runCopilot({ request: start, emit: frame => frames.push(frame), bridge: async type => {
    if (type === 'provider_request') return tools([call('call_0', 'inspect_workspace', {}), call('call_0', 'inspect_catalog', {})]);
    executions += 1; return {};
  } });
  assert.equal(done(frames).ok, false);
  assert.equal(frames.find(frame => frame.type === 'error').kind, 'protocol');
  assert.equal(executions, 0);
});
