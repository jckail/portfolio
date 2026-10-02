import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseQueryEvidence, QueryEvidence, queryEvidenceDocument } from './query-evidence';

const result = {
  columns: ['value'],
  rows: [[null], [4]],
  row_count: 8,
  truncated: true,
  elapsed_ms: 1.5,
  workspace_generation: 2,
  data_revision: 7,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('query evidence', () => {
  it('distinguishes the displayed sample, returned limit and exact execution provenance', () => {
    render(<QueryEvidence sql="SELECT value FROM events" rowLimit={8} result={result} sampled />);
    expect(screen.getByRole('region', { name: 'SQL query results' })).toBeInTheDocument();
    expect(screen.getByLabelText('SQL NULL')).toBeVisible();
    expect(screen.getByText(/2 rows shown from 8 returned/)).toBeVisible();
    expect(screen.getByText(/1.50 ms measured by the server/)).toBeVisible();
    expect(screen.getByText(/not the total matching count/)).toBeVisible();
    expect(screen.getByText(/generation 2, data revision 7/)).toBeVisible();
    expect(screen.getByText('Last executed query')).toBeVisible();
  });
  it('does not invent measurements or rows when none were captured', () => {
    render(
      <QueryEvidence
        sql="SELECT 1 WHERE 0"
        result={{ columns: ['1'], rows: [], row_count: 0, truncated: false }}
      />
    );
    expect(screen.getByText('The query returned no rows.')).toBeVisible();
    expect(screen.queryByText(/measured by the server/)).not.toBeInTheDocument();
    expect(screen.queryByText(/data revision/)).not.toBeInTheDocument();
  });
  it('validates public tool evidence before using the structured table', () => {
    const parsed = parseQueryEvidence({
      sql: 'SELECT value FROM events',
      ...result,
      row_limit: 8,
      sql_truncated: true,
    });
    expect(parsed).toMatchObject({ sampled: true, sqlTruncated: true, rowLimit: 8, result });
    for (const bad of [
      null,
      {},
      { sql: 'SELECT 1', ...result, rows: [[{}]] },
      { sql: 'SELECT 1', ...result, rows: [[1, 2]] },
      { sql: 'SELECT 1', ...result, elapsed_ms: Infinity },
      { sql: 'SELECT 1', ...result, row_count: 1 },
      { sql: 'SELECT 1', ...result, rows: [[true]] },
    ]) {
      expect(parseQueryEvidence(bad)).toBeNull();
    }
  });
  it('exports only bounded query facts and preserves sample and SQL shortening disclosures', () => {
    const document = queryEvidenceDocument(
      'SELECT value',
      { ...result, token: 'never-export' } as typeof result,
      8,
      true,
      true
    );
    expect(document).toMatchObject({
      schema_version: 1,
      sql_truncated: true,
      sampled: true,
      row_limit: 8,
      result,
    });
    expect(JSON.stringify(document)).not.toContain('never-export');
  });
  it('renders and downloads a clipped cell at the shared text bound without suggesting a larger row limit', async () => {
    const clipped = 'x'.repeat(1999) + '…';
    const toolResult = {
      sql: "SELECT 'long text' AS value",
      columns: ['value'],
      rows: [[clipped]],
      row_count: 1,
      truncated: true,
      row_limit: 100,
      workspace_generation: 1,
      data_revision: 0,
    };
    const parsed = parseQueryEvidence(toolResult);
    expect(parsed).not.toBeNull();
    expect(parseQueryEvidence({ ...toolResult, rows: [[clipped + 'x']] })).toBeNull();
    expect(parseQueryEvidence({ ...toolResult, rows: [['🧪'.repeat(1999) + '…']] })).not.toBeNull();
    expect(parseQueryEvidence({ ...toolResult, rows: [['🧪'.repeat(2001)]] })).toBeNull();
    const makeUrl = vi.fn<(value: Blob) => string>(() => 'blob:clipped-query');
    vi.stubGlobal('URL', { createObjectURL: makeUrl, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<QueryEvidence {...parsed!} />);
    expect(screen.getByRole('cell')).toHaveTextContent(clipped);
    expect(screen.getByText(/row, cell text, or output-size limits/)).toBeVisible();
    expect(screen.queryByText(/increase the row limit/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download query evidence' }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.instances[0]).toHaveAttribute('download', 'dataplayground-query-evidence.json');
    const reader = new FileReader();
    reader.readAsText(makeUrl.mock.calls[0][0]);
    await waitFor(() => expect(reader.readyState).toBe(FileReader.DONE));
    const document = JSON.parse(String(reader.result));
    expect(document.result.rows).toEqual([[clipped]]);
    expect(document.result.rows[0][0]).toHaveLength(2000);
    expect(document.result.truncated).toBe(true);
    expect(document.result.row_count).toBe(1);
  });
});
