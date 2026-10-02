import type { RuntimeState } from './runtime-types';

export const MAX_SNAPSHOTS = 6;
const MAX_TABLES = 50;
const MAX_MODELS = 50;
const MAX_TESTS = 50;
const MAX_TRACE = 100;
const MAX_PARTITIONS = 8;

export interface SnapshotControls {
  producer_running: boolean;
  consumer_paused: boolean;
  batch_size: number;
  rate_per_second: number;
  duplicate_rate: number;
  invalid_rate: number;
  consumer_batch_size: number;
  consumer_rate_per_second: number;
}
export interface SnapshotCounters {
  produced: number;
  consumed: number;
  inserted: number;
  duplicates: number;
  quarantined: number;
  accepted: number;
  backlog: number;
  capacity: number;
}
export interface SnapshotPartition {
  partition: number;
  produced_offset: number;
  consumed_offset: number;
  backlog: number;
}
export interface SnapshotModel {
  name: string;
  status: 'success' | 'failed';
  row_count: number;
  tests: readonly { name: string; status: 'pass' | 'fail'; failed_rows: number }[];
}
export interface SnapshotDag {
  trace: readonly { task_id: string; attempt: number; status: 'success' | 'failed' | 'blocked' }[];
  published: boolean;
  fingerprint: string | null;
  input_revision: number | null;
  stale: boolean | null;
}
export interface RunSnapshot {
  readonly id: string;
  readonly label: string;
  readonly capturedAt: string;
  readonly scenario_id: string;
  readonly workspace_generation: number | null;
  readonly data_revision: number | null;
  readonly streaming: {
    readonly controls: Readonly<SnapshotControls>;
    readonly counters: Readonly<SnapshotCounters>;
    readonly partitions: readonly Readonly<SnapshotPartition>[];
  };
  readonly tables: readonly { readonly name: string; readonly row_count: number }[];
  readonly dag: Readonly<SnapshotDag>;
  readonly models: {
    readonly input_revision: number | null;
    readonly stale: boolean | null;
    readonly runs: readonly Readonly<SnapshotModel>[];
  };
  readonly clipped: {
    readonly partitions: boolean;
    readonly tables: boolean;
    readonly dag_trace: boolean;
    readonly models: boolean;
    readonly model_tests: boolean;
  };
}
export interface SnapshotComparison {
  compatible: boolean;
  reason: string | null;
  metrics: {
    name: keyof SnapshotCounters | 'data_revision';
    before: number | null;
    after: number | null;
    delta: number | null;
  }[];
  controls: { name: keyof SnapshotControls; before: number | boolean; after: number | boolean }[];
  tables: { name: string; before: number | null; after: number | null; delta: number | null }[];
  partitions: {
    partition: number;
    before: Readonly<SnapshotPartition> | null;
    after: Readonly<SnapshotPartition> | null;
    delta: Omit<SnapshotPartition, 'partition'> | null;
  }[];
  models: {
    name: string;
    before: Readonly<SnapshotModel> | null;
    after: Readonly<SnapshotModel> | null;
    row_count_delta: number | null;
  }[];
  dag: { before: Readonly<SnapshotDag>; after: Readonly<SnapshotDag> };
}

const counterNames: (keyof SnapshotCounters)[] = [
  'produced',
  'consumed',
  'inserted',
  'duplicates',
  'quarantined',
  'accepted',
  'backlog',
  'capacity',
];
const controlNames: (keyof SnapshotControls)[] = [
  'producer_running',
  'consumer_paused',
  'batch_size',
  'rate_per_second',
  'duplicate_rate',
  'invalid_rate',
  'consumer_batch_size',
  'consumer_rate_per_second',
];
const revision = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const stale = (value: boolean | undefined): boolean | null =>
  typeof value === 'boolean' ? value : null;
const delta = (before: number | null, after: number | null) =>
  before === null || after === null ? null : after - before;
const name = (value: string) => value.slice(0, 100);
function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Copy already observed state; this function never requests or advances execution. */
export function captureRunSnapshot(
  state: RuntimeState,
  label: string,
  id: string,
  capturedAt: string
): RunSnapshot {
  const stream = state.streaming;
  return freeze({
    id: name(id),
    label: label.trim().slice(0, 60) || 'Observed snapshot',
    capturedAt: capturedAt.slice(0, 64),
    scenario_id: name(state.scenario_id),
    workspace_generation:
      (revision(state.workspace_generation) ?? 0) > 0 ? state.workspace_generation! : null,
    data_revision: revision(state.data_revision),
    streaming: {
      controls: {
        producer_running: stream.producer_running,
        consumer_paused: stream.consumer_paused,
        batch_size: stream.batch_size,
        rate_per_second: stream.rate_per_second,
        duplicate_rate: stream.duplicate_rate,
        invalid_rate: stream.invalid_rate,
        consumer_batch_size: stream.consumer_batch_size,
        consumer_rate_per_second: stream.consumer_rate_per_second,
      },
      counters: {
        produced: stream.produced,
        consumed: stream.consumed,
        inserted: stream.inserted,
        duplicates: stream.duplicates,
        quarantined: stream.quarantined,
        accepted: stream.accepted,
        backlog: stream.backlog,
        capacity: stream.capacity,
      },
      partitions: stream.partitions.slice(0, MAX_PARTITIONS).map((partition) => ({
        partition: partition.partition,
        produced_offset: partition.produced_offset,
        consumed_offset: partition.consumed_offset,
        backlog: partition.backlog,
      })),
    },
    tables: state.tables
      .slice(0, MAX_TABLES)
      .map((table) => ({ name: name(table.name), row_count: table.row_count })),
    dag: {
      trace: state.dag_trace
        .slice(0, MAX_TRACE)
        .map((task) => ({
          task_id: name(task.task_id),
          attempt: task.attempt,
          status: task.status,
        })),
      published: state.dag_published,
      fingerprint:
        typeof state.dag_fingerprint === 'string' && /^[a-f0-9]{64}$/i.test(state.dag_fingerprint)
          ? state.dag_fingerprint
          : null,
      input_revision: revision(state.dag_input_revision),
      stale: stale(state.dag_stale),
    },
    models: {
      input_revision: revision(state.model_input_revision),
      stale: stale(state.models_stale),
      runs: state.model_runs.slice(0, MAX_MODELS).map((model) => ({
        name: name(model.name),
        status: model.status,
        row_count: model.row_count,
        tests: model.tests
          .slice(0, MAX_TESTS)
          .map((test) => ({
            name: name(test.name),
            status: test.status,
            failed_rows: test.failed_rows,
          })),
      })),
    },
    clipped: {
      partitions: stream.partitions.length > MAX_PARTITIONS,
      tables: state.tables.length > MAX_TABLES,
      dag_trace: state.dag_trace.length > MAX_TRACE,
      models: state.model_runs.length > MAX_MODELS,
      model_tests: state.model_runs
        .slice(0, MAX_MODELS)
        .some((model) => model.tests.length > MAX_TESTS),
    },
  });
}

export function createRunSnapshot(
  state: RuntimeState,
  label: string,
  metadata: { id: string; capturedAt: string }
): RunSnapshot {
  return captureRunSnapshot(state, label, metadata.id, metadata.capturedAt);
}

/** Signed observation differences, never causal attribution or throughput benchmarks. */
export function compareRunSnapshots(before: RunSnapshot, after: RunSnapshot): SnapshotComparison {
  const reason =
    before.workspace_generation === null || after.workspace_generation === null
      ? 'Workspace generation is unavailable; a shared generation cannot be established.'
      : before.workspace_generation !== after.workspace_generation
        ? 'Snapshots belong to different workspace generations.'
        : before.scenario_id !== after.scenario_id
          ? 'Snapshots belong to different scenarios.'
          : null;
  const comparison: SnapshotComparison = {
    compatible: reason === null,
    reason,
    metrics: [],
    controls: [],
    tables: [],
    partitions: [],
    models: [],
    dag: { before: before.dag, after: after.dag },
  };
  if (reason) return freeze(comparison);
  comparison.metrics = counterNames.map((name) => ({
    name,
    before: before.streaming.counters[name],
    after: after.streaming.counters[name],
    delta: after.streaming.counters[name] - before.streaming.counters[name],
  }));
  comparison.metrics.push({
    name: 'data_revision',
    before: before.data_revision,
    after: after.data_revision,
    delta: delta(before.data_revision, after.data_revision),
  });
  comparison.controls = controlNames.map((name) => ({
    name,
    before: before.streaming.controls[name],
    after: after.streaming.controls[name],
  }));
  const tableNames = [
    ...new Set([...before.tables, ...after.tables].map((table) => table.name)),
  ].sort();
  comparison.tables = tableNames.map((name) => {
    const left = before.tables.find((table) => table.name === name)?.row_count ?? null;
    const right = after.tables.find((table) => table.name === name)?.row_count ?? null;
    return { name, before: left, after: right, delta: delta(left, right) };
  });
  const partitions = [
    ...new Set(
      [...before.streaming.partitions, ...after.streaming.partitions].map((item) => item.partition)
    ),
  ].sort((a, b) => a - b);
  comparison.partitions = partitions.map((partition) => {
    const left = before.streaming.partitions.find((item) => item.partition === partition) ?? null;
    const right = after.streaming.partitions.find((item) => item.partition === partition) ?? null;
    return {
      partition,
      before: left,
      after: right,
      delta:
        left && right
          ? {
              produced_offset: right.produced_offset - left.produced_offset,
              consumed_offset: right.consumed_offset - left.consumed_offset,
              backlog: right.backlog - left.backlog,
            }
          : null,
    };
  });
  const models = [
    ...new Set([...before.models.runs, ...after.models.runs].map((item) => item.name)),
  ].sort();
  comparison.models = models.map((name) => {
    const left = before.models.runs.find((item) => item.name === name) ?? null;
    const right = after.models.runs.find((item) => item.name === name) ?? null;
    return {
      name,
      before: left,
      after: right,
      row_count_delta: delta(left?.row_count ?? null, right?.row_count ?? null),
    };
  });
  return freeze(comparison);
}

export function snapshotPairDocument(before: RunSnapshot, after: RunSnapshot) {
  const left = allowlistedSnapshot(before);
  const right = allowlistedSnapshot(after);
  return freeze({
    schema_version: 1,
    kind: 'dataplayground_run_comparison',
    scope:
      'Observed snapshots of a temporary visitor workspace. Consumed counts consumer attempts including replay; inserted counts unique additions, and produced excludes seed rows. Deltas do not prove causation or benchmark throughput. No credentials or replayable actions are included.',
    before: left,
    after: right,
    comparison: compareRunSnapshots(left, right),
  });
}

/** Repeat the projection at export so extra properties on typed objects cannot leak. */
function allowlistedSnapshot(snapshot: RunSnapshot): RunSnapshot {
  const projected = captureRunSnapshot(
    {
      scenario_id: snapshot.scenario_id,
      workspace_generation: snapshot.workspace_generation ?? undefined,
      data_revision: snapshot.data_revision ?? undefined,
      dag_input_revision: snapshot.dag.input_revision,
      model_input_revision: snapshot.models.input_revision,
      dag_stale: snapshot.dag.stale ?? undefined,
      models_stale: snapshot.models.stale ?? undefined,
      streaming: {
        ...snapshot.streaming.controls,
        ...snapshot.streaming.counters,
        partitions: snapshot.streaming.partitions.map((partition) => ({ ...partition })),
      },
      tables: snapshot.tables.map((table) => ({
        name: table.name,
        row_count: table.row_count,
        columns: [],
        source: '',
      })),
      dag_trace: snapshot.dag.trace.map((task) => ({
        task_id: task.task_id,
        attempt: task.attempt,
        status: task.status,
        detail: '',
      })),
      dag_published: snapshot.dag.published,
      dag_fingerprint: snapshot.dag.fingerprint,
      model_runs: snapshot.models.runs.map((model) => ({
        name: model.name,
        status: model.status,
        row_count: model.row_count,
        sql: '',
        source: '',
        tests: model.tests.map((test) => ({
          name: test.name,
          status: test.status,
          failed_rows: test.failed_rows,
          sql: '',
        })),
      })),
      runtime: '',
      source: '',
      expires_in_seconds: 0,
      logs: [],
      flow: [],
    },
    snapshot.label,
    snapshot.id,
    snapshot.capturedAt
  );
  return freeze({
    ...projected,
    clipped: {
      partitions: projected.clipped.partitions || snapshot.clipped?.partitions === true,
      tables: projected.clipped.tables || snapshot.clipped?.tables === true,
      dag_trace: projected.clipped.dag_trace || snapshot.clipped?.dag_trace === true,
      models: projected.clipped.models || snapshot.clipped?.models === true,
      model_tests: projected.clipped.model_tests || snapshot.clipped?.model_tests === true,
    },
  });
}

export function serializeRunComparison(before: RunSnapshot, after: RunSnapshot): string {
  return JSON.stringify(snapshotPairDocument(before, after), null, 2);
}
