/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Query tables need keyboard scrolling. */
import './query-evidence.css';

import type { QueryResult } from './runtime-types';

type EvidenceResult = Omit<QueryResult, 'elapsed_ms'> & { elapsed_ms?: number };
export interface ParsedQueryEvidence {
  sql: string;
  rowLimit?: number;
  result: EvidenceResult;
  sampled: boolean;
  sqlTruncated: boolean;
}
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function parseQueryEvidence(value: unknown): ParsedQueryEvidence | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.sql !== 'string' ||
    !item.sql.trim() ||
    item.sql.length > 20000 ||
    !Array.isArray(item.columns) ||
    item.columns.length > 50 ||
    !item.columns.every((column) => typeof column === 'string' && column.length <= 2000) ||
    !Array.isArray(item.rows) ||
    item.rows.length > 500 ||
    !integer(item.row_count) ||
    item.row_count > 500 ||
    item.rows.length > item.row_count ||
    typeof item.truncated !== 'boolean'
  )
    return null;
  const columns = item.columns as string[];
  if (
    !item.rows.every(
      (row) =>
        Array.isArray(row) &&
        row.length === columns.length &&
        row.every(
          (cell) =>
            cell === null ||
            (typeof cell === 'string' && cell.length <= 2000) ||
            (typeof cell === 'number' && Number.isFinite(cell))
        )
    )
  )
    return null;
  if (
    item.elapsed_ms !== undefined &&
    (typeof item.elapsed_ms !== 'number' ||
      !Number.isFinite(item.elapsed_ms) ||
      item.elapsed_ms < 0)
  )
    return null;
  const result: EvidenceResult = {
    columns,
    rows: item.rows as QueryResult['rows'],
    row_count: item.row_count,
    truncated: item.truncated,
    ...(typeof item.elapsed_ms === 'number' ? { elapsed_ms: item.elapsed_ms } : {}),
    ...(integer(item.workspace_generation)
      ? { workspace_generation: item.workspace_generation }
      : {}),
    ...(integer(item.data_revision) ? { data_revision: item.data_revision } : {}),
  };
  return {
    sql: item.sql,
    result,
    ...(integer(item.row_limit) && item.row_limit >= 1 && item.row_limit <= 500
      ? { rowLimit: item.row_limit }
      : {}),
    sampled: item.sample_truncated === true || result.rows.length < result.row_count,
    sqlTruncated: item.sql_truncated === true,
  };
}

export function queryEvidenceDocument(
  sql: string,
  result: EvidenceResult,
  rowLimit?: number,
  sampled = false,
  sqlTruncated = false
) {
  return {
    schema_version: 1,
    kind: 'dataplayground_query_evidence',
    scope:
      'Temporary visitor SQLite workspace; returned rows are bounded, not total matching rows.',
    sql,
    sql_truncated: sqlTruncated,
    ...(rowLimit !== undefined ? { row_limit: rowLimit } : {}),
    sampled: sampled || result.rows.length < result.row_count,
    result: {
      columns: result.columns,
      rows: result.rows,
      row_count: result.row_count,
      truncated: result.truncated,
      ...(result.elapsed_ms !== undefined ? { elapsed_ms: result.elapsed_ms } : {}),
      ...(result.workspace_generation != null
        ? { workspace_generation: result.workspace_generation }
        : {}),
      ...(result.data_revision != null ? { data_revision: result.data_revision } : {}),
    },
  };
}

export function QueryEvidence({
  sql,
  rowLimit,
  result,
  regionLabel = 'SQL query results',
  caption = 'Last executed query',
  sampled = false,
  sqlTruncated = false,
}: {
  sql: string;
  rowLimit?: number;
  result: EvidenceResult;
  regionLabel?: string;
  caption?: string;
  sampled?: boolean;
  sqlTruncated?: boolean;
}) {
  const download = () => {
    const data = queryEvidenceDocument(sql, result, rowLimit, sampled, sqlTruncated);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dataplayground-query-evidence.json';
    link.click();
    // Let the browser consume the object URL before releasing it.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <div className="lab-query-evidence">
      <p role="status">
        {result.row_count} rows returned
        {result.elapsed_ms !== undefined && (
          <> · {result.elapsed_ms.toFixed(2)} ms measured by the server</>
        )}
        {rowLimit !== undefined && <> · Requested limit {rowLimit}</>}
      </p>
      {(sampled || result.rows.length < result.row_count) && (
        <p>
          {result.rows.length} rows shown from {result.row_count} returned. This evidence is a
          sample.
        </p>
      )}
      {result.truncated && (
        <p>
          Result truncated; narrow the query or increase the row limit. The returned count is not
          the total matching count.
        </p>
      )}
      {result.workspace_generation != null && result.data_revision != null && (
        <p>
          Recorded in workspace generation {result.workspace_generation}, data revision{' '}
          {result.data_revision}.
        </p>
      )}
      <details className="lab-query-statement">
        <summary>Executed SQL{sqlTruncated ? ' (shortened in this evidence)' : ''}</summary>
        <pre>
          <code>{sql}</code>
        </pre>
      </details>
      <div className="lab-table-scroll" role="region" aria-label={regionLabel} tabIndex={0}>
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              {result.columns.map((column, index) => (
                <th scope="col" key={`${column}-${index}`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, column) => (
                  <td key={column}>
                    {cell === null ? <span aria-label="SQL NULL">NULL</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!result.rows.length && (
          <p>
            {result.row_count
              ? 'No row sample is included in this evidence.'
              : 'The query returned no rows.'}
          </p>
        )}
      </div>
      <button type="button" onClick={download}>
        Download query evidence
      </button>
    </div>
  );
}
