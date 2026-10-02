import { describe, expect, it } from 'vitest';

import {
  captureRunSnapshot,
  compareRunSnapshots,
  MAX_SNAPSHOTS,
  serializeRunComparison,
} from './run-snapshots';

import type { RunSnapshot } from './run-snapshots';
import type { RuntimeState } from './runtime-types';

function state(): RuntimeState {
  return {
    scenario_id: 'baseline',
    workspace_generation: 1,
    data_revision: 0,
    dag_input_revision: null,
    model_input_revision: null,
    dag_stale: false,
    models_stale: false,
    runtime: 'private runtime detail',
    source: 'private source detail',
    expires_in_seconds: 100,
    tables: [{ name: 'events', row_count: 99, columns: [], source: 'private table source' }],
    streaming: {
      producer_running: false,
      consumer_paused: true,
      batch_size: 10,
      rate_per_second: 5,
      consumer_batch_size: 100,
      consumer_rate_per_second: 5,
      duplicate_rate: 0,
      invalid_rate: 0,
      produced: 0,
      consumed: 0,
      inserted: 0,
      duplicates: 0,
      quarantined: 0,
      accepted: 0,
      backlog: 0,
      capacity: 2000,
      partitions: [{ partition: 0, produced_offset: 0, consumed_offset: 0, backlog: 0 }],
    },
    dag_trace: [
      { task_id: 'publish', attempt: 0, status: 'blocked', detail: 'private task detail' },
    ],
    dag_published: false,
    dag_fingerprint: null,
    model_runs: [
      {
        name: 'runtime_daily',
        row_count: 7,
        status: 'success',
        sql: 'private SQL',
        source: 'private model source',
        tests: [
          { name: 'unique_day', status: 'pass', failed_rows: 0, sql: 'private contract SQL' },
        ],
      },
    ],
    logs: [{ sequence: 1, component: 'provider', status: 'error', detail: 'private-log-payload' }],
    flow: [{ source: 'raw payload', target: 'warehouse', value: 0 }],
  };
}
const capture = (value: RuntimeState, label = ' Before ') =>
  captureRunSnapshot(value, label, 'snapshot-one', '2026-10-01T12:00:00Z');

describe('observed run snapshots', () => {
  it('captures immutable copies and exports only selected operational evidence', () => {
    const observed = state();
    const snapshot = capture(observed);
    observed.streaming.partitions[0].backlog = 77;
    observed.tables[0].row_count = 777;
    observed.model_runs[0].tests[0].failed_rows = 77;
    expect(snapshot.streaming.partitions[0].backlog).toBe(0);
    expect(snapshot.tables[0].row_count).toBe(99);
    expect(snapshot.models.runs[0].tests[0].failed_rows).toBe(0);
    expect(Object.isFrozen(snapshot.models.runs[0].tests[0])).toBe(true);
    expect(Object.isFrozen(snapshot.streaming.controls)).toBe(true);
    expect(snapshot.label).toBe('Before');
    const capsule = serializeRunComparison(snapshot, snapshot);
    for (const hidden of ['private', 'raw payload', 'expires_in_seconds', 'sql', 'logs'])
      expect(capsule).not.toContain(hidden);
    expect(MAX_SNAPSHOTS).toBe(6);
  });

  it('reports signed attempt and row deltas without treating absent identities as zero', () => {
    const observed = state();
    const before = capture(observed);
    observed.streaming.produced = 10;
    observed.streaming.consumed = 12; // Replay attempts can exceed produced records.
    observed.streaming.inserted = 8;
    observed.streaming.duplicates = 2;
    observed.streaming.quarantined = 2;
    observed.streaming.accepted = 8;
    observed.streaming.backlog = 2;
    observed.streaming.consumer_paused = false;
    observed.streaming.partitions[0] = {
      partition: 0,
      produced_offset: 10,
      consumed_offset: 8,
      backlog: 2,
    };
    observed.streaming.partitions.push({
      partition: 1,
      produced_offset: 0,
      consumed_offset: 0,
      backlog: 0,
    });
    observed.tables = [
      { ...observed.tables[0], row_count: 107 },
      { name: 'new_table', row_count: 4, source: '', columns: [] },
    ];
    observed.data_revision = 8;
    observed.model_runs = [{ ...observed.model_runs[0], name: 'product_sales', row_count: 48 }];
    const after = capture(observed, 'After');
    const comparison = compareRunSnapshots(before, after);
    expect(comparison.compatible).toBe(true);
    expect(comparison.metrics.find((metric) => metric.name === 'consumed')?.delta).toBe(12);
    expect(comparison.metrics.find((metric) => metric.name === 'data_revision')?.delta).toBe(8);
    expect(comparison.tables.find((table) => table.name === 'events')?.delta).toBe(8);
    expect(comparison.tables.find((table) => table.name === 'new_table')).toEqual({
      name: 'new_table',
      before: null,
      after: 4,
      delta: null,
    });
    expect(comparison.models.find((model) => model.name === 'runtime_daily')).toMatchObject({
      before: before.models.runs[0],
      after: null,
      row_count_delta: null,
    });
    expect(
      comparison.models.find((model) => model.name === 'product_sales')?.row_count_delta
    ).toBeNull();
    expect(comparison.partitions.find((partition) => partition.partition === 1)?.delta).toBeNull();
    expect(comparison.controls.find((control) => control.name === 'consumer_paused')).toEqual({
      name: 'consumer_paused',
      before: true,
      after: false,
    });
    expect(
      compareRunSnapshots(after, before).metrics.find((metric) => metric.name === 'consumed')?.delta
    ).toBe(-12);
  });

  it('rejects cross-generation, cross-scenario and unknown-generation comparisons', () => {
    const before = capture(state());
    for (const change of [
      { workspace_generation: 2 },
      { scenario_id: 'acquisition' },
      { workspace_generation: undefined },
    ]) {
      const comparison = compareRunSnapshots(before, capture({ ...state(), ...change }));
      expect(comparison.compatible).toBe(false);
      expect(comparison.reason).toBeTruthy();
      expect(comparison.metrics).toEqual([]);
      expect(comparison.tables).toEqual([]);
    }
    const legacy = state();
    delete legacy.workspace_generation;
    delete legacy.data_revision;
    delete legacy.dag_stale;
    delete legacy.models_stale;
    const snapshot = capture(legacy);
    expect(snapshot.workspace_generation).toBeNull();
    expect(snapshot.data_revision).toBeNull();
    expect(snapshot.dag.stale).toBeNull();
    expect(snapshot.models.stale).toBeNull();
    expect(snapshot.models.input_revision).toBeNull();
    expect(compareRunSnapshots(snapshot, snapshot).compatible).toBe(false);
  });

  it('retains historical failed attempts, contracts and stale publication without claims of repair', () => {
    const observed = state();
    observed.dag_trace = [
      { task_id: 'analytics', attempt: 1, status: 'failed', detail: 'private' },
      { task_id: 'analytics', attempt: 2, status: 'success', detail: 'private' },
    ];
    observed.dag_published = true;
    observed.dag_fingerprint = 'a'.repeat(64);
    observed.dag_input_revision = 0;
    observed.data_revision = 5;
    observed.dag_stale = true;
    const snapshot = capture(observed);
    expect(snapshot.dag.trace.map((task) => task.status)).toEqual(['failed', 'success']);
    expect(snapshot.dag).toMatchObject({
      published: true,
      stale: true,
      input_revision: 0,
      fingerprint: 'a'.repeat(64),
    });
    expect(snapshot.models.runs[0].tests).toEqual([
      { name: 'unique_day', status: 'pass', failed_rows: 0 },
    ]);
  });

  it('bounds labels and arrays with clipping notices and re-allowlists export input', () => {
    const observed = state();
    observed.streaming.partitions = Array.from({ length: 10 }, (_, partition) => ({
      partition,
      produced_offset: 0,
      consumed_offset: 0,
      backlog: 0,
    }));
    observed.tables = Array.from({ length: 55 }, (_, index) => ({
      ...observed.tables[0],
      name: `table-${index}`,
    }));
    observed.dag_trace = Array.from({ length: 110 }, () => observed.dag_trace[0]);
    observed.model_runs = Array.from({ length: 55 }, (_, index) => ({
      ...observed.model_runs[0],
      name: `model-${index}`,
      tests: Array.from({ length: 55 }, () => observed.model_runs[0].tests[0]),
    }));
    const snapshot = capture(observed, ' ' + 'x'.repeat(80) + ' ');
    expect(snapshot.label).toHaveLength(60);
    expect(capture(observed, '   ').label).toBe('Observed snapshot');
    expect(snapshot.streaming.partitions).toHaveLength(8);
    expect(snapshot.tables).toHaveLength(50);
    expect(snapshot.dag.trace).toHaveLength(100);
    expect(snapshot.models.runs).toHaveLength(50);
    expect(snapshot.models.runs[0].tests).toHaveLength(50);
    expect(Object.values(snapshot.clipped).every(Boolean)).toBe(true);
    const tainted = {
      ...snapshot,
      token: 'secret-token',
      logs: ['secret-log'],
      dag: { ...snapshot.dag, provider_state: 'secret-thought' },
      streaming: {
        ...snapshot.streaming,
        controls: { ...snapshot.streaming.controls, credentials: 'secret-key' },
      },
      models: {
        ...snapshot.models,
        runs: snapshot.models.runs.map((model) => ({
          ...model,
          sql: 'secret-sql',
          tests: model.tests.map((test) => ({ ...test, sql: 'secret-contract' })),
        })),
      },
    } as RunSnapshot;
    const document = JSON.parse(serializeRunComparison(tainted, snapshot));
    expect(document).toMatchObject({ schema_version: 1, kind: 'dataplayground_run_comparison' });
    expect(JSON.stringify(document)).not.toContain('secret-');
    expect(document.before.clipped).toEqual(snapshot.clipped);
    expect(document.scope).toContain('do not prove causation');
  });
});
