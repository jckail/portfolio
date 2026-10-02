/** Per-request duplex NDJSON worker; no listening sockets or credential access. */
import { runCopilot, SafeError, LIMITS } from './agent.mjs';

const controller = new AbortController();
const pending = new Map();
let buffer = Buffer.alloc(0), counter = 0, started = false, finished = false;
const MAX_FRAME = 1048576;
const write = frame => { if (!finished) process.stdout.write(JSON.stringify(frame) + '\n'); };
function fail(kind = 'protocol') {
  for (const item of pending.values()) item.reject(new SafeError(kind));
  controller.abort();
  if (!started) { write({ type: 'error', kind }); write({ type: 'done', ok: false, cancelled: false, limited: kind === 'limit' }); finish(); }
}
function finish() {
  finished = true;
  for (const item of pending.values()) item.reject(new SafeError('cancelled'));
  pending.clear();
  process.stdin.destroy();
}
function bridge(type, payload, signal, delta) {
  if (signal?.aborted) return Promise.reject(new SafeError('cancelled'));
  const id = String(++counter);
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); pending.delete(id); };
    const abort = () => { cleanup(); reject(new SafeError('cancelled')); };
    const timer = setTimeout(() => { cleanup(); reject(new SafeError('timeout')); }, LIMITS.bridgeTimeoutMs);
    pending.set(id, { type, delta, resolve: result => { cleanup(); resolve(result); }, reject: error => { cleanup(); reject(error); } });
    signal?.addEventListener('abort', abort, { once: true });
    write({ type, id, ...payload });
  });
}
function frame(line) {
  let message;
  try { message = JSON.parse(line); } catch { fail(); return; }
  if (!message || typeof message !== 'object') { fail(); return; }
  if (message.type === 'cancel') { controller.abort(); return; }
  if (message.type === 'start') {
    if (started) { fail(); return; }
    started = true;
    void runCopilot({ request: message, bridge, emit: write, signal: controller.signal }).finally(finish);
    return;
  }
  const item = pending.get(message.id);
  if (!item) { fail(); return; }
  if (message.type === 'provider_delta' && item.type === 'provider_request') { item.delta?.(message.text); return; }
  const prefix = item.type === 'provider_request' ? 'provider' : 'tool';
  if (message.type === prefix + '_result') item.resolve(message.result);
  else if (message.type === prefix + '_error') item.reject(new SafeError(message.kind));
  else fail();
}
process.stdin.on('data', chunk => {
  if (finished) return;
  buffer = Buffer.concat([buffer, chunk]);
  let index;
  while ((index = buffer.indexOf(10)) >= 0) {
    if (index > MAX_FRAME) { fail('limit'); return; }
    const line = buffer.subarray(0, index).toString('utf8');
    buffer = buffer.subarray(index + 1);
    if (line.trim()) frame(line);
    if (finished) return;
  }
  if (buffer.length > MAX_FRAME) fail('limit');
});
process.stdin.on('end', () => { if (!finished) fail('cancelled'); });
process.stdin.on('error', () => { if (!finished) fail('error'); });
