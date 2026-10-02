/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Named overflow regions support keyboard scrolling. */
import { useId, useState } from 'react';

import './architecture.css';

import type { ArchitectureDataset, ArchitectureRun } from './types';

type DependencyNode = { id: string; name: string; depends_on: string[] };

/** Place each node after all its parents; retain declared order within a layer. */
export function dependencyLayout(nodes: DependencyNode[]) {
  const levels = new Map<string, number>();
  const visiting = new Set<string>();
  const level = (id: string): number => {
    if (levels.has(id)) return levels.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = nodes.find((node) => node.id === id)?.depends_on || [];
    const value = parents.length ? 1 + Math.max(...parents.map(level)) : 0;
    visiting.delete(id);
    levels.set(id, value);
    return value;
  };
  nodes.forEach((node) => level(node.id));
  const counts = new Map<number, number>();
  return nodes.map((node) => {
    const layer = levels.get(node.id)!;
    const row = counts.get(layer) || 0;
    counts.set(layer, row + 1);
    return { ...node, x: 110 + layer * 210, y: 54 + row * 100 };
  });
}

/** Longer edges use separate lanes above nodes and the gaps between ranks. */
export function dependencyRoutes(nodes: DependencyNode[]) {
  const layout = dependencyLayout(nodes);
  const relationships = layout.flatMap((node) =>
    node.depends_on.flatMap((id) => {
      const parent = layout.find((item) => item.id === id);
      return parent ? [{ parent, node, skipped: node.x - parent.x > 210 }] : [];
    })
  );
  const laneCount = relationships.filter((edge) => edge.skipped).length;
  const topPadding = laneCount * 18;
  let lane = 0;
  const edges = relationships.map(({ parent, node, skipped }) => {
    const sourceY = parent.y + topPadding;
    const targetY = node.y + topPadding;
    let points: { x: number; y: number }[] = [];
    let path = `M ${parent.x + 82} ${sourceY} C ${parent.x + 118} ${sourceY}, ${node.x - 118} ${targetY}, ${node.x - 86} ${targetY}`;
    if (skipped) {
      // The 46px gap separates two 164px boxes spaced 210px apart.
      const offset = ((lane + 1) * 46) / (laneCount + 1);
      const sourceGap = parent.x + 82 + offset;
      const targetGap = node.x - 128 + offset;
      const laneY = 16 + lane * 18;
      points = [
        { x: parent.x + 82, y: sourceY },
        { x: sourceGap, y: sourceY },
        { x: sourceGap, y: laneY },
        { x: targetGap, y: laneY },
        { x: targetGap, y: targetY },
        { x: node.x - 86, y: targetY },
      ];
      path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
      lane += 1;
    }
    return { id: `${parent.id}-${node.id}`, path, skipped, points };
  });
  return { positions: layout.map((node) => ({ ...node, y: node.y + topPadding })), edges };
}

export function replayStatuses(run: ArchitectureRun | undefined, progress: number) {
  const statuses = new Map<string, ArchitectureRun['trace'][number]>();
  run?.trace.slice(0, progress).forEach((entry) => statuses.set(entry.task_id, entry));
  return statuses;
}

function DependencyDiagram({
  nodes,
  selectedId,
  onSelect,
  title,
  statuses,
}: {
  nodes: DependencyNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  title: string;
  statuses?: ReturnType<typeof replayStatuses>;
}) {
  const uid = useId();
  const { positions, edges } = dependencyRoutes(nodes);
  const width = Math.max(400, ...positions.map((node) => node.x + 110));
  const height = Math.max(110, ...positions.map((node) => node.y + 54));
  return (
    <>
      <div
        className="lab-architecture-diagram"
        role="region"
        aria-label={`${title} diagram`}
        tabIndex={0}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: width }}
          role="img"
          aria-labelledby={`${uid}-title`}
          aria-describedby={`${uid}-desc`}
        >
          <title id={`${uid}-title`}>{title}</title>
          <desc id={`${uid}-desc`}>
            Arrows run from a dependency to its consumer. Numbered buttons below select each node.
            Full dependencies are available in the table.
          </desc>
          <defs>
            <marker
              id={`${uid}-arrow`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          {edges.map((edge) => (
            <path
              key={edge.id}
              className="lab-architecture-edge"
              d={edge.path}
              markerEnd={`url(#${uid}-arrow)`}
            />
          ))}
          {positions.map((node, index) => (
            <g
              key={node.id}
              className={node.id === selectedId ? 'lab-architecture-selected' : undefined}
            >
              <rect x={node.x - 82} y={node.y - 28} width="164" height="56" rx="3" />
              <text x={node.x} y={node.y - 3} textAnchor="middle">
                {index + 1}. {node.id.length > 18 ? `${node.id.slice(0, 17)}…` : node.id}
              </text>
              <text x={node.x} y={node.y + 15} textAnchor="middle">
                {statuses ? statuses.get(node.id)?.status || 'pending' : 'dependency node'}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <ol className="lab-architecture-node-list">
        {nodes.map((node) => (
          <li key={node.id}>
            <button aria-pressed={node.id === selectedId} onClick={() => onSelect(node.id)}>
              {node.name}
              {statuses && <span>{statuses.get(node.id)?.status || 'pending'}</span>}
            </button>
          </li>
        ))}
      </ol>
      <details>
        <summary>View {title.toLowerCase()} dependencies</summary>
        <div
          className="lab-table-scroll"
          role="region"
          aria-label={`${title} dependencies`}
          tabIndex={0}
        >
          <table>
            <caption>Dependencies point to their downstream consumers.</caption>
            <thead>
              <tr>
                <th scope="col">Node</th>
                <th scope="col">Depends on</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.id}>
                  <th scope="row">{node.name}</th>
                  <td>
                    {node.depends_on
                      .map((id) => nodes.find((item) => item.id === id)?.name || id)
                      .join(', ') || 'None — independent root'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

function Workflow({ dag }: { dag: ArchitectureDataset['dags'][number] }) {
  const [taskId, setTaskId] = useState(dag.tasks[0]?.id || '');
  const [runId, setRunId] = useState(dag.runs[0]?.id || '');
  const run = dag.runs.find((item) => item.id === runId) || dag.runs[0];
  const [progress, setProgress] = useState(0);
  const task = dag.tasks.find((item) => item.id === taskId) || dag.tasks[0];
  const statuses = replayStatuses(run, progress);
  const current = run?.trace[progress - 1];
  return (
    <>
      <p>{dag.description}</p>
      <div className="lab-architecture-controls">
        <div>
          <label htmlFor="lab-saved-execution">Saved execution</label>
          <select
            id="lab-saved-execution"
            value={run?.id || ''}
            onChange={(event) => {
              setRunId(event.target.value);
              setProgress(0);
            }}
          >
            {dag.runs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        {run && (
          <div>
            <label htmlFor="lab-replay-progress">
              Replay progress: {progress} of {run.trace.length} events
            </label>
            <input
              id="lab-replay-progress"
              type="range"
              min="0"
              max={run.trace.length}
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
            />
          </div>
        )}
      </div>
      {run && (
        <>
          <p>{run.description}</p>
          <p className="lab-note">
            Replay steps through a recorded Python execution. Moving the slider does not run tasks
            or publish data.
          </p>
          <div className="lab-replay-buttons">
            <button onClick={() => setProgress(0)} disabled={progress === 0}>
              Reset replay
            </button>
            <button
              onClick={() => setProgress((value) => Math.min(run.trace.length, value + 1))}
              disabled={progress === run.trace.length}
            >
              Next trace event
            </button>
            <button
              onClick={() => setProgress(run.trace.length)}
              disabled={progress === run.trace.length}
            >
              Show complete trace
            </button>
          </div>
          <p className="lab-replay-status" role="status">
            {current
              ? `${dag.tasks.find((item) => item.id === current.task_id)?.name || current.task_id}: ${current.status}${current.attempt ? ` on attempt ${current.attempt}` : ''}. ${current.detail}`
              : 'Replay ready. All tasks are pending.'}
          </p>
        </>
      )}
      <DependencyDiagram
        nodes={dag.tasks}
        selectedId={task?.id || ''}
        onSelect={setTaskId}
        title="Workflow"
        statuses={statuses}
      />
      {task && (
        <section className="lab-architecture-detail" aria-labelledby="lab-task-title">
          <h3 id="lab-task-title">{task.name}</h3>
          <p>{task.description}</p>
          <dl>
            <dt>Output</dt>
            <dd>{task.output}</dd>
            <dt>Source</dt>
            <dd>
              <code>{task.source}</code>
            </dd>
            <dt>Retry policy</dt>
            <dd>
              Up to {task.max_attempts} {task.max_attempts === 1 ? 'attempt' : 'attempts'}
            </dd>
            <dt>Idempotency</dt>
            <dd>{task.idempotency}</dd>
            <dt>Replay state</dt>
            <dd>
              {statuses.get(task.id)?.status || 'pending'}
              {statuses.get(task.id)?.attempt ? ` · attempt ${statuses.get(task.id)!.attempt}` : ''}
            </dd>
          </dl>
        </section>
      )}
      {run && (
        <>
          <div className="lab-recorded-outcome">
            <h4>Recorded publication outcome</h4>
            <p>{run.published ? 'Published' : 'Not published'}</p>
            <p>
              Artifact fingerprint:{' '}
              <code>{run.fingerprint || 'None — no publication artifact'}</code>
            </p>
          </div>
          <details>
            <summary>View complete execution trace ({run.trace.length} events)</summary>
            <div
              className="lab-table-scroll"
              role="region"
              aria-label="Recorded execution trace"
              tabIndex={0}
            >
              <table>
                <caption>
                  Full saved trace, including events beyond the current replay position.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col">Attempt</th>
                    <th scope="col">Status</th>
                    <th scope="col">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {run.trace.map((entry, index) => (
                    <tr key={`${entry.task_id}-${index}`}>
                      <th scope="row">
                        {dag.tasks.find((item) => item.id === entry.task_id)?.name || entry.task_id}
                      </th>
                      <td>{entry.attempt || 'Not attempted'}</td>
                      <td>{entry.status}</td>
                      <td>{entry.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </>
  );
}

function Models({ models }: { models: ArchitectureDataset['models'] }) {
  const [modelId, setModelId] = useState(models[0]?.id || '');
  const model = models.find((item) => item.id === modelId) || models[0];
  return (
    <section
      id="lab-models"
      className="lab-section lab-architecture-section"
      aria-labelledby="lab-models-title"
    >
      <h2 id="lab-models-title">Data models</h2>
      <p>
        Follow model dependencies, then inspect the grain, keys, contracts, and SQL that define each
        output.
      </p>
      <label htmlFor="lab-data-model">Data model</label>
      <select
        id="lab-data-model"
        value={model?.id || ''}
        onChange={(event) => setModelId(event.target.value)}
      >
        {models.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <DependencyDiagram
        nodes={models}
        selectedId={model?.id || ''}
        onSelect={setModelId}
        title="Model relationships"
      />
      <p className="lab-note">
        Arrows show derivation dependencies. Column keys below describe primary and foreign keys;
        they do not imply every arrow is a foreign-key join.
      </p>
      {model ? (
        <section className="lab-architecture-detail" aria-labelledby="lab-model-detail-title">
          <h3 id="lab-model-detail-title">{model.name}</h3>
          <p>{model.description}</p>
          <dl>
            <dt>Kind</dt>
            <dd>{model.kind}</dd>
            <dt>Grain</dt>
            <dd>{model.grain}</dd>
            <dt>Materialization</dt>
            <dd>{model.materialization}</dd>
            <dt>Source</dt>
            <dd>
              <code>{model.source}</code>
            </dd>
          </dl>
          <div className="lab-table-scroll" role="region" aria-label="Model columns" tabIndex={0}>
            <table>
              <caption>Columns for {model.name}</caption>
              <thead>
                <tr>
                  <th scope="col">Column</th>
                  <th scope="col">Type</th>
                  <th scope="col">Nullable</th>
                  <th scope="col">Key</th>
                  <th scope="col">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {model.columns.map((column) => (
                  <tr key={column.name}>
                    <th scope="row">
                      <code>{column.name}</code>
                    </th>
                    <td>{column.type}</td>
                    <td>{column.nullable ? 'Yes' : 'No'}</td>
                    <td>{column.key === 'none' ? 'None' : `${column.key} key`}</td>
                    <td>{column.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4>Contracts</h4>
          {model.contracts.length ? (
            <ul>
              {model.contracts.map((contract) => (
                <li key={contract}>{contract}</li>
              ))}
            </ul>
          ) : (
            <p>No contracts are recorded for this model.</p>
          )}
          <h4>SQL definition</h4>
          {model.sql ? (
            <pre tabIndex={0} role="region" aria-label={`${model.name} SQL definition`}>
              <code>{model.sql}</code>
            </pre>
          ) : (
            <p>This model has no SQL definition. Its source above defines the artifact.</p>
          )}
        </section>
      ) : (
        <p>No data models are available.</p>
      )}
    </section>
  );
}

export default function Architecture({ dataset }: { dataset: ArchitectureDataset }) {
  const [dagId, setDagId] = useState(dataset.dags[0]?.id || '');
  const dag = dataset.dags.find((item) => item.id === dagId) || dataset.dags[0];
  return (
    <div className="lab-architecture">
      <section
        id="lab-dags"
        className="lab-section lab-architecture-section"
        aria-labelledby="lab-dags-title"
      >
        <div className="lab-section-heading">
          <div>
            <h2 id="lab-dags-title">Workflow execution</h2>
            <p>
              Inspect the dependency graph and replay success, retry, and failure from saved
              executions.
            </p>
          </div>
        </div>
        <label htmlFor="lab-workflow">Workflow</label>
        <select
          id="lab-workflow"
          value={dag?.id || ''}
          onChange={(event) => setDagId(event.target.value)}
        >
          {dataset.dags.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {dag ? <Workflow key={dag.id} dag={dag} /> : <p>No workflows are available.</p>}
      </section>
      <Models models={dataset.models} />
      <section
        id="lab-decisions"
        className="lab-section lab-architecture-section"
        aria-labelledby="lab-decisions-title"
      >
        <h2 id="lab-decisions-title">Engineering decisions</h2>
        <p>Current implementation choices, their costs, and proposed production changes.</p>
        <div className="lab-decision-list">
          {dataset.decisions.map((decision) => (
            <article key={decision.id}>
              <h3>{decision.title}</h3>
              <dl>
                <dt>Current choice</dt>
                <dd>{decision.choice}</dd>
                <dt>Tradeoff</dt>
                <dd>{decision.tradeoff}</dd>
                <dt>Implementation evidence</dt>
                <dd>{decision.evidence}</dd>
                <dt>Production proposal</dt>
                <dd>{decision.production_path}</dd>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
