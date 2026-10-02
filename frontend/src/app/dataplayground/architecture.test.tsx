import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import Architecture, { dependencyLayout, dependencyRoutes, replayStatuses } from './architecture';

import type { ArchitectureDataset } from './types';

const tasks = [
  {
    id: 'generate',
    name: 'Generate events',
    depends_on: [],
    description: 'Create seeded records.',
    source: 'engine.generate',
    output: 'Raw events',
    max_attempts: 1,
    idempotency: 'Stable seed and IDs.',
  },
  {
    id: 'validate',
    name: 'Validate events',
    depends_on: ['generate'],
    description: 'Check records.',
    source: 'engine.validate',
    output: 'Accepted events',
    max_attempts: 2,
    idempotency: 'Deterministic checks.',
  },
  {
    id: 'publish',
    name: 'Publish outputs',
    depends_on: ['validate'],
    description: 'Publish reconciled output.',
    source: 'engine.publish',
    output: 'Publication artifact',
    max_attempts: 1,
    idempotency: 'Content fingerprint.',
  },
];
const dataset: ArchitectureDataset = {
  dags: [
    {
      id: 'test',
      name: 'Test workflow',
      description: 'Recorded workflow.',
      tasks,
      runs: [
        {
          id: 'retry',
          name: 'Retry execution',
          description: 'A recovered failure.',
          published: true,
          fingerprint: 'abc123',
          trace: [
            { task_id: 'generate', attempt: 1, status: 'success', detail: 'Generated.' },
            { task_id: 'validate', attempt: 1, status: 'failed', detail: 'Transient failure.' },
            { task_id: 'validate', attempt: 2, status: 'success', detail: 'Recovered.' },
            { task_id: 'publish', attempt: 1, status: 'success', detail: 'Published.' },
          ],
        },
        {
          id: 'failed',
          name: 'Failed execution',
          description: 'Publication blocked.',
          published: false,
          fingerprint: null,
          trace: [
            { task_id: 'generate', attempt: 1, status: 'success', detail: 'Generated.' },
            { task_id: 'validate', attempt: 1, status: 'failed', detail: 'Invalid input.' },
            { task_id: 'publish', attempt: 0, status: 'blocked', detail: 'Dependency failed.' },
          ],
        },
      ],
    },
  ],
  models: [
    {
      id: 'events',
      name: 'Events',
      kind: 'table',
      description: 'Accepted event records.',
      grain: 'One row per event ID',
      materialization: 'In-memory SQLite',
      source: 'engine.load',
      depends_on: [],
      columns: [
        {
          name: 'event_id',
          type: 'TEXT',
          nullable: false,
          key: 'primary',
          description: 'Unique event identifier',
        },
      ],
      sql: 'CREATE TABLE events (event_id TEXT PRIMARY KEY);',
      contracts: ['Event IDs are unique.'],
    },
    {
      id: 'daily',
      name: 'Daily totals',
      kind: 'view',
      description: 'Daily metrics.',
      grain: 'One row per day',
      materialization: 'Query result',
      source: 'engine.daily',
      depends_on: ['events'],
      columns: [
        {
          name: 'day',
          type: 'TEXT',
          nullable: false,
          key: 'primary',
          description: 'UTC calendar day',
        },
        {
          name: 'revenue',
          type: 'INTEGER',
          nullable: true,
          key: 'none',
          description: 'Collected cents',
        },
      ],
      sql: 'SELECT day, SUM(amount_cents) FROM events GROUP BY day;',
      contracts: ['Revenue reconciles to accepted payments.'],
    },
  ],
  decisions: [
    {
      id: 'local',
      title: 'Local execution',
      choice: 'Execute Python locally.',
      tradeoff: 'Single-process throughput.',
      evidence: 'engine.run executes tasks.',
      production_path: 'Evaluate a durable scheduler.',
    },
  ],
};
afterEach(cleanup);

describe('architecture workbench', () => {
  it('routes rank-skipping dependencies above every box without crossing intermediate nodes', () => {
    const { positions, edges } = dependencyRoutes([
      { id: 'products', name: 'Products', depends_on: [] },
      { id: 'shoppers', name: 'Shoppers', depends_on: [] },
      { id: 'daily', name: 'Unrelated output', depends_on: ['products'] },
      { id: 'purchases', name: 'Purchases', depends_on: ['products', 'shoppers'] },
      { id: 'graph', name: 'Graph', depends_on: ['products', 'shoppers', 'purchases'] },
    ]);
    const skipped = edges.filter((edge) => edge.skipped);
    expect(skipped).toHaveLength(2);
    expect(skipped[0].points[2].y).not.toBe(skipped[1].points[2].y);
    for (const edge of skipped) {
      expect(edge.points[2].y).toBeLessThan(Math.min(...positions.map((node) => node.y - 28)));
      for (let index = 1; index < edge.points.length; index += 1) {
        const left = edge.points[index - 1];
        const right = edge.points[index];
        for (const node of positions) {
          const horizontalIntersection =
            left.y === right.y &&
            left.y > node.y - 28 &&
            left.y < node.y + 28 &&
            Math.max(left.x, right.x) > node.x - 82 &&
            Math.min(left.x, right.x) < node.x + 82;
          const verticalIntersection =
            left.x === right.x &&
            left.x > node.x - 82 &&
            left.x < node.x + 82 &&
            Math.max(left.y, right.y) > node.y - 28 &&
            Math.min(left.y, right.y) < node.y + 28;
          expect(horizontalIntersection || verticalIntersection).toBe(false);
        }
      }
    }
    expect(edges.filter((edge) => !edge.skipped).every((edge) => edge.path.includes(' C '))).toBe(
      true
    );
  });
  it('lays out dependencies before consumers including out-of-order declarations and parallel roots', () => {
    const nodes = dependencyLayout([
      tasks[2],
      tasks[0],
      tasks[1],
      { id: 'independent', name: 'Independent', depends_on: [] },
    ]);
    expect(nodes.find((item) => item.id === 'generate')!.x).toBeLessThan(
      nodes.find((item) => item.id === 'validate')!.x
    );
    expect(nodes.find((item) => item.id === 'validate')!.x).toBeLessThan(
      nodes.find((item) => item.id === 'publish')!.x
    );
    expect(nodes.find((item) => item.id === 'independent')!.x).toBe(
      nodes.find((item) => item.id === 'generate')!.x
    );
    expect(nodes.find((item) => item.id === 'independent')!.y).not.toBe(
      nodes.find((item) => item.id === 'generate')!.y
    );
  });
  it('replays actual attempt statuses and clears replay when another saved execution is selected', () => {
    render(<Architecture dataset={dataset} />);
    const workflow = screen.getByRole('region', { name: 'Workflow execution' });
    fireEvent.click(within(workflow).getByRole('button', { name: 'Validate events pending' }));
    expect(within(workflow).getByText('engine.validate')).toBeInTheDocument();
    expect(within(workflow).getByText('Up to 2 attempts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next trace event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next trace event' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Validate events: failed on attempt 1. Transient failure.'
    );
    expect(replayStatuses(dataset.dags[0].runs[0], 2).get('validate')?.status).toBe('failed');
    fireEvent.click(screen.getByRole('button', { name: 'Next trace event' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Validate events: success on attempt 2. Recovered.'
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Saved execution' }), {
      target: { value: 'failed' },
    });
    expect(screen.getByRole('status')).toHaveTextContent('All tasks are pending');
    fireEvent.click(screen.getByRole('button', { name: 'Show complete trace' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Publish outputs: blocked. Dependency failed.'
    );
    expect(screen.getByText('Not published')).toBeInTheDocument();
    expect(screen.getByText('None — no publication artifact')).toBeInTheDocument();
    fireEvent.click(screen.getByText('View complete execution trace (3 events)'));
    expect(
      within(screen.getByRole('region', { name: 'Recorded execution trace' })).getByText(
        'Not attempted'
      )
    ).toBeInTheDocument();
  });
  it('shows complete model grain, columns, contracts and SQL from the selected metadata', () => {
    render(<Architecture dataset={dataset} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Data model' }), {
      target: { value: 'daily' },
    });
    expect(screen.getByText('One row per day')).toBeInTheDocument();
    expect(screen.getByText('engine.daily')).toBeInTheDocument();
    expect(screen.getByText('Revenue reconciles to accepted payments.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Daily totals SQL definition' })).toHaveTextContent(
      dataset.models[1].sql
    );
    expect(
      within(screen.getByRole('region', { name: 'Model columns' })).getByText('Collected cents')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('View model relationships dependencies'));
    expect(
      screen.getByRole('region', { name: 'Model relationships dependencies' })
    ).toHaveTextContent('Events');
    expect(screen.getByText('Production proposal')).toBeInTheDocument();
    expect(screen.getByText('Evaluate a durable scheduler.')).toBeInTheDocument();
  });
  it('does not invent SQL for source-defined artifacts', () => {
    render(
      <Architecture
        dataset={{ ...dataset, models: [{ ...dataset.models[0], kind: 'artifact', sql: '' }] }}
      />
    );
    expect(
      screen.getByText('This model has no SQL definition. Its source above defines the artifact.')
    ).toBeInTheDocument();
  });
});
