import { test, expect } from '@playwright/test';

test('lab deep link explores generated scenarios, pipeline, events, and SQL', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/dataplayground#workbench-lifecycle');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Data Playground | Jordan Kail');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.jckail.com/dataplayground');
  await page.getByRole('button', { name: 'Data quality incident', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Data quality incident', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Validate schema/ }).click();
  await expect(page.locator('.lab-stage-detail h3')).toHaveText('Validate schema');
  await page.getByRole('combobox', { name: 'Event type', exact: true }).selectOption('payment');
  const types = page.locator('.lab-event-type');
  expect(await types.count()).toBeGreaterThan(0);
  for (const value of await types.allTextContents()) expect(value).toBe('payment');
  await page.getByLabel('Search events').fill('this-event-does-not-exist');
  await expect(page.getByText('No sampled events match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.lab-event-type').first()).toBeVisible();
  await page.locator('.lab-lineage summary').filter({ hasText: /^Summary$/ }).click();
  await expect(page.locator('.lab-lineage details').first().locator('code')).toContainText('SELECT');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Baseline', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('lab supports mobile, keyboard entry, and both themes without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Test entry from the top of the document. A native fragment deep link
  // intentionally moves the browser's sequential focus starting point.
  const response = await page.goto('/dataplayground/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to experiments' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('link', { name: 'Lifecycle', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Baseline', exact: true })).toBeVisible();
  const initialTheme = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: /Use .* theme/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', initialTheme === 'dark' ? 'light' : 'dark');
  await page.getByRole('button', { name: /Use .* theme/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', initialTheme === 'dark' ? 'dark' : 'light');
  const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width);
  await page.getByRole('button', { name: 'Show copilot', exact: true }).click();
  const copilot = page.getByRole('complementary', { name: 'Data copilot', exact: true });
  await expect(copilot).toBeFocused();
  await expect(copilot).toBeInViewport();
  await page.getByRole('button', { name: 'Hide copilot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show copilot', exact: true })).toBeFocused();
});

test('every saved scenario has browser-valid custom parameters, including fractional churn', async ({ page }) => {
  await page.route('**/api/dataplayground', async route => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...await response.json(), live_simulation: true } });
  });
  await page.goto('/dataplayground#workbench-lifecycle');
  await page.getByText('Inspect parameters & run your own', { exact: true }).click();
  for (const name of ['Baseline', 'Acquisition surge', 'Stronger retention', 'Data quality incident']) {
    await page.getByRole('button', { name, exact: true }).click();
    expect(await page.locator('.lab-config form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(true);
  }
  await page.getByRole('button', { name: 'Stronger retention', exact: true }).click();
  await expect(page.getByLabel('Daily churn probability')).toHaveValue('0.005');
});

test('commerce dataset connects product filtering, graph traversal, and vector explanations', async ({ page }) => {
  await page.goto('/dataplayground#workbench-exploration');
  const exploration = page.getByRole('region', { name: 'One catalog. Two ways to explore.' });
  await expect(exploration).toBeVisible();
  await page.getByLabel('Search products', { exact: true }).fill('Travel tripod');
  const dataset = page.getByRole('region', { name: 'Synthetic product dataset', exact: true });
  await expect(dataset.locator('tbody tr')).toHaveCount(1);
  await dataset.getByRole('button', { name: 'Travel tripod', exact: true }).click();
  await expect(page.getByLabel('Product to compare', { exact: true })).toHaveValue('product-041');
  await expect(page.getByLabel('Graph node', { exact: true })).toHaveValue('product-041');
  await expect(page.getByRole('img', { name: 'Relationships for Travel tripod', exact: true })).toBeVisible();
  await expect(page.locator('.lab-similarity-list li')).toHaveCount(5);
  await expect(page.locator('.lab-similarity-list')).not.toContainText('Travel tripod');
  const alternative = page.locator('.lab-similarity-list button').nth(1);
  await alternative.click();
  await expect(alternative).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.lab-contributions')).toContainText('Contributions sum to the cosine score');
  await page.getByLabel('Graph node', { exact: true }).selectOption('customer-001');
  await expect(page.getByRole('img', { name: 'Relationships for Demo shopper 01', exact: true })).toBeVisible();
  await page.getByText(/^View relationships table/).click();
  await expect(page.getByRole('region', { name: 'Graph relationships table', exact: true })).toContainText('Purchased');
  await page.getByLabel('Search products', { exact: true }).fill('no-such-product');
  await expect(page.getByText('No products match these filters.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear product filters', exact: true }).click();
  await expect(dataset.locator('tbody tr')).toHaveCount(48);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (let theme = 0; theme < 2; theme++) {
      await page.getByRole('button', { name: /Use .* theme/ }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('engineering workbench replays dependency failures and exposes data model contracts', async ({ page }) => {
  await page.goto('/dataplayground#workbench-architecture');
  const workflow = page.getByRole('region', { name: 'Workflow execution', exact: true });
  await expect(workflow).toBeVisible();
  await page.getByLabel('Saved execution', { exact: true }).selectOption('normal');
  await workflow.getByRole('button', { name: 'Show complete trace', exact: true }).click();
  const normalFingerprint = await workflow.locator('.lab-recorded-outcome code').textContent();
  expect(normalFingerprint).toMatch(/^[a-f0-9]{64}$/);
  await page.getByLabel('Saved execution', { exact: true }).selectOption('analytics-retry');
  await workflow.getByRole('button', { name: 'Show complete trace', exact: true }).click();
  await expect(workflow.locator('.lab-recorded-outcome code')).toHaveText(normalFingerprint!);
  await workflow.getByRole('button', { name: /Aggregate in SQLite/ }).click();
  await expect(workflow.locator('.lab-architecture-detail')).toContainText('Up to 2 attempts');
  await expect(workflow.locator('.lab-architecture-detail')).toContainText('attempt 2');
  await workflow.getByText(/^View complete execution trace/).click();
  const trace = page.getByRole('region', { name: 'Recorded execution trace', exact: true });
  await expect(trace.locator('tbody tr')).toHaveCount(7);
  await expect(trace).toContainText('failed');
  await page.getByLabel('Saved execution', { exact: true }).selectOption('validation-failure');
  await workflow.getByRole('button', { name: 'Show complete trace', exact: true }).click();
  await expect(workflow.locator('.lab-recorded-outcome')).toContainText('Not published');
  await workflow.getByRole('button', { name: /Build commerce features/ }).click();
  await expect(workflow.locator('.lab-architecture-detail')).toContainText('success');
  await workflow.getByRole('button', { name: /Reconcile contracts/ }).click();
  await expect(workflow.locator('.lab-architecture-detail')).toContainText('blocked');
  await page.getByLabel('Data model', { exact: true }).selectOption('customers');
  const models = page.getByRole('region', { name: 'Data models', exact: true });
  await expect(models.locator('.lab-architecture-detail')).toContainText('One lifecycle user including non-paying users');
  await expect(page.getByRole('region', { name: 'Model columns', exact: true })).toContainText('first_payment');
  await expect(page.getByRole('region', { name: 'Derived lifecycle customers SQL definition', exact: true })).toContainText('GROUP BY user_id');
  await page.getByLabel('Data model', { exact: true }).selectOption('purchases');
  await expect(models.locator('.lab-architecture-detail')).toContainText('One purchase row');
  await expect(page.getByRole('region', { name: 'Model columns', exact: true })).toContainText('foreign key');
  await expect(page.getByRole('region', { name: 'Engineering decisions', exact: true })).toContainText('Production proposal');
  await page.getByLabel('Saved execution', { exact: true }).selectOption('analytics-retry');
  await workflow.getByRole('button', { name: 'Show complete trace', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (let theme = 0; theme < 2; theme++) {
    await page.getByRole('button', { name: /Use .* theme/ }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('isolated workbench controls move records and SQL observes the resulting warehouse', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dataplayground');
  await expect(page.getByRole('button', { name: 'Create workspace', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Data movement counts', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Operations', exact: true }).click();
  await page.getByRole('button', { name: 'Pause consumer', exact: true }).click();
  await page.getByLabel('Batch size', { exact: true }).fill('20');
  await page.getByLabel('Duplicate fraction', { exact: true }).fill('0.2');
  await page.getByLabel('Invalid fraction', { exact: true }).fill('0.1');
  await page.getByRole('button', { name: 'Produce one batch', exact: true }).click();
  const offsets = page.getByRole('region', { name: 'Partition offsets', exact: true });
  await expect(offsets.locator('tbody tr')).toHaveCount(3);
  await page.getByRole('button', { name: 'Drain one batch', exact: true }).click();
  await page.getByLabel('DAG failure injection', { exact: true }).selectOption('transient');
  await page.getByRole('button', { name: 'Run workspace DAG', exact: true }).click();
  const trace = page.getByRole('region', { name: 'Workspace DAG trace', exact: true });
  await expect(trace.locator('tbody tr')).toHaveCount(7);
  await expect(trace).toContainText('failed');
  await page.getByLabel('DAG failure injection', { exact: true }).selectOption('permanent');
  await page.getByRole('button', { name: 'Run workspace DAG', exact: true }).click();
  await expect(trace).toContainText('blocked');
  await page.getByRole('button', { name: 'Build SQL models', exact: true }).click();
  await page.getByRole('link', { name: 'SQL console', exact: true }).click();
  await page.getByLabel('SQL query', { exact: true }).fill('SELECT COUNT(*) AS accepted_rows FROM events');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  const results = page.getByRole('region', { name: 'SQL query results', exact: true });
  await expect(results).toContainText('accepted_rows');
  const beforeReplay = await results.locator('tbody td').first().textContent();
  await page.getByRole('link', { name: 'Operations', exact: true }).click();
  await page.getByRole('button', { name: 'Replay consumer log', exact: true }).click();
  await page.getByRole('button', { name: 'Drain one batch', exact: true }).click();
  await page.getByRole('link', { name: 'SQL console', exact: true }).click();
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(results.locator('tbody td').first()).toHaveText(beforeReplay!);
  await page.getByLabel('SQL query', { exact: true }).fill('DELETE FROM events');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(page.getByRole('alert').first()).toContainText('SELECT');
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Produced records: 20 total', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Consumer attempts: 40 total', exact: true })).toBeVisible();
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (let theme = 0; theme < 2; theme++) {
      await page.getByRole('button', { name: /Use .* theme/ }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('copilot exposes query evidence and requires an explicit change confirmation', async ({ page }) => {
  // Provider calls stay offline in CI; the actual Pi loop has Node/Python integration tests.
  await page.route('**/api/dataplayground/copilot/status', route => route.fulfill({ json: { available: true } }));
  let confirmations = 0;
  await page.route('**/api/dataplayground/copilot/chat', route => route.fulfill({ json: {
    text: 'The SQL tool found records in your warehouse. Pause the consumer to inspect lag.',
    events: [{ type: 'tool_result', tool: 'query_sql', result: { sql: 'SELECT COUNT(*) FROM events', columns: ['count'], rows: [[80]], row_count: 1, truncated: false, row_limit: 25, workspace_generation: 1, data_revision: 0 } }],
    proposals: [{ id: 'browser-fixture-proposal', action: { action: 'consumer_pause' }, reason: 'Observe backlog in an isolated workspace.', expires_in_seconds: 600 }], limited: false,
  } }));
  await page.route('**/api/dataplayground/copilot/confirm', async route => {
    confirmations++;
    const result = await page.request.post('/api/dataplayground/runtime/action', {
      headers: { Authorization: route.request().headers()['authorization'] }, data: { action: 'consumer_pause' },
    });
    await route.fulfill({ response: result });
  });
  await page.goto('/dataplayground');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hide copilot', exact: true })).toBeVisible();
  await page.getByLabel('Ask about this workspace', { exact: true }).fill('Count records and propose pausing the consumer.');
  await page.getByRole('button', { name: 'Investigate', exact: true }).click();
  await expect(page.getByText('The SQL tool found records in your warehouse.', { exact: false })).toBeVisible();
  await page.getByText('query sql', { exact: true }).click();
  await expect(page.locator('.lab-copilot-evidence')).toContainText('SELECT COUNT(*) FROM events');
  await expect(page.getByRole('region', { name: 'Copilot SQL evidence', exact: true })).toContainText('80');
  expect(confirmations).toBe(0);
  await page.getByRole('button', { name: 'Apply change', exact: true }).click();
  await expect(page.getByText('Applied to this workspace.', { exact: true })).toBeVisible();
  expect(confirmations).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('guided incidents verify recovery and downloaded SQL retains execution provenance', async ({ page }) => {
  await page.goto('/dataplayground');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await page.getByRole('link', { name: 'Operations', exact: true }).click();
  await page.getByText('Guided incident investigations', { exact: true }).click();
  const steps = ['Guide: stop producer', 'Guide: pause consumer', 'Guide: produce lag batch', 'Guide: drain recovery batch'];
  for (let index = 0; index < steps.length; index++) {
    const button = page.getByRole('button', { name: steps[index], exact: true });
    await button.focus();
    await page.keyboard.press('Enter');
    if (index + 1 < steps.length) await expect(page.getByRole('button', { name: steps[index + 1], exact: true })).toBeFocused();
  }
  await expect(page.locator('.lab-incident-guide')).toContainText('Investigation complete');
  await expect(page.locator('.lab-incident-guide [role="status"]')).toBeFocused();
  await expect(page.locator('.lab-incident-checkpoint')).toHaveCount(4);
  await page.getByLabel('Investigation', { exact: true }).selectOption('publication');
  await page.getByRole('button', { name: 'Guide: run failing DAG', exact: true }).click();
  await expect(page.locator('.lab-incident-checkpoint')).toContainText('Publication not published');
  await page.getByRole('button', { name: 'Guide: run repaired DAG', exact: true }).click();
  await expect(page.locator('.lab-incident-guide')).toContainText('Investigation complete');
  await page.getByRole('link', { name: 'SQL console', exact: true }).click();
  const executedSql = 'SELECT COUNT(*) AS accepted_rows FROM events';
  await page.getByLabel('SQL query', { exact: true }).fill(executedSql);
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await expect(page.getByRole('region', { name: 'SQL query results', exact: true })).toContainText('accepted_rows');
  await page.getByLabel('SQL query', { exact: true }).fill('SELECT 999 AS edited_but_not_executed');
  await expect(page.locator('.lab-query-evidence')).toContainText('Last executed query');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download query evidence', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Query evidence download was unavailable');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const evidence = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(evidence.sql).toBe(executedSql);
  expect(evidence.result.workspace_generation).toBe(1);
  expect(evidence.result.data_revision).toBeGreaterThan(0);
  expect(evidence.result.row_count).toBe(1);
  expect(Object.keys(evidence).sort()).toEqual(['kind', 'result', 'row_limit', 'sampled', 'schema_version', 'scope', 'sql', 'sql_truncated']);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('ambiguous confirmations retire and workspace loss clears evidence before fresh recreation', async ({ page }) => {
  let queryRequests = 0;
  page.on('request', request => {
    if (request.url().endsWith('/api/dataplayground/runtime/query') && request.method() === 'POST') queryRequests++;
  });
  await page.route('**/api/dataplayground/copilot/status', route => route.fulfill({ json: { available: true } }));
  await page.route('**/api/dataplayground/copilot/chat', route => route.fulfill({ json: {
    text: 'Inspect state before applying this consumer change.', events: [], limited: false,
    proposals: [{ id: 'ambiguous-confirmation', action: { action: 'consumer_pause' }, reason: 'Observe lag.', expires_in_seconds: 600 }],
  } }));
  let confirmations = 0;
  await page.route('**/api/dataplayground/copilot/confirm', async route => {
    confirmations++;
    await route.abort('failed');
  });
  await page.goto('/dataplayground');
  const allocation = page.waitForResponse(response => response.url().endsWith('/api/dataplayground/runtime/session') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  const capability = (await (await allocation).json()).token as string;
  await page.getByLabel('Ask about this workspace', { exact: true }).fill('Inspect the consumer and propose a pause.');
  await page.getByRole('button', { name: 'Investigate', exact: true }).click();
  await page.getByRole('button', { name: 'Apply change', exact: true }).click();
  await expect(page.getByText(/^Outcome not confirmed/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply change', exact: true })).toHaveCount(0);
  expect(confirmations).toBe(1);
  await page.getByLabel('Ask about this workspace', { exact: true }).fill('Inspect the current consumer state.');
  await expect(page.getByRole('button', { name: 'Investigate', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: 'Operations', exact: true }).click();
  const snapshots = page.getByRole('region', { name: 'Observed-state snapshots', exact: true });
  await snapshots.getByLabel('Snapshot name', { exact: true }).fill('Before workspace loss');
  await snapshots.getByRole('button', { name: 'Capture snapshot', exact: true }).click();
  await expect(snapshots.getByRole('button', { name: 'Delete snapshot Before workspace loss', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'SQL console', exact: true }).click();
  await page.getByLabel('SQL query', { exact: true }).fill('SELECT 17 AS before_workspace_loss');
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  const queryResults = page.getByRole('region', { name: 'SQL query results', exact: true });
  await expect(queryResults).toContainText('before_workspace_loss');
  await expect(queryResults.getByRole('cell')).toHaveText('17');
  await page.getByRole('link', { name: 'Operations', exact: true }).click();
  await page.getByRole('button', { name: 'Stop producer', exact: true }).click();
  await page.getByRole('button', { name: 'Pause consumer', exact: true }).click();
  await page.getByLabel('Batch size', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Produce one batch', exact: true }).click();
  await page.getByRole('button', { name: 'Drain one batch', exact: true }).click();
  await page.getByRole('link', { name: 'SQL console', exact: true }).click();
  await expect(page.getByText(/^These query results are historical:/)).toContainText('recorded at data revision 0');
  await expect(page.getByText(/^These query results are historical:/)).toContainText('current workspace is at revision 3');
  await expect(queryResults.getByRole('cell')).toHaveText('17');
  expect(queryRequests).toBe(1);
  await expect(page.getByText(/^Outcome not confirmed/)).toBeVisible();
  // Prevent an interval refresh from racing the explicit workspace-loss check.
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }));
  const lost = page.waitForResponse(response => response.url().endsWith('/api/dataplayground/runtime/state') && response.status() === 410);
  const closed = await page.request.post('/api/dataplayground/runtime/close', { headers: { Authorization: `Bearer ${capability}` } });
  expect(closed.status()).toBe(200);
  await page.getByRole('button', { name: 'Refresh workspace', exact: true }).click();
  await lost;
  await expect(page.getByRole('alert').first()).toContainText('workspace expired');
  await expect(queryResults).toHaveCount(0);
  await expect(page.getByText(/^Outcome not confirmed/)).toHaveCount(0);
  await expect(page.getByText('Inspect state before applying this consumer change.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Apply change', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Investigate', exact: true })).toBeDisabled();
  await expect(page.getByText(/^These query results are historical:/)).toHaveCount(0);
  await page.evaluate(() => Reflect.deleteProperty(document, 'visibilityState'));
  const replacement = page.waitForResponse(response => response.url().endsWith('/api/dataplayground/runtime/session') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  const fresh = await (await replacement).json();
  expect(fresh.token).not.toBe(capability);
  expect(fresh.state.workspace_generation).toBe(1);
  expect(fresh.state.data_revision).toBe(0);
  expect(fresh.state.streaming.produced).toBe(0);
  await expect(queryResults).toHaveCount(0);
  await page.getByRole('link', { name: 'Operations', exact: true }).click();
  await expect(snapshots.getByText('No snapshots captured in this workspace.', { exact: true })).toBeVisible();
  await page.getByLabel('Ask about this workspace', { exact: true }).fill('Inspect my new workspace.');
  await expect(page.getByRole('button', { name: 'Investigate', exact: true })).toBeEnabled();
});

test('named snapshots compare controlled counts, preserve observations and exclude private state', async ({ page }) => {
  await page.goto('/dataplayground');
  const allocation = page.waitForResponse(response => response.url().endsWith('/api/dataplayground/runtime/session') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  const capability = (await (await allocation).json()).token as string;
  await page.getByRole('link', { name: 'Operations', exact: true }).click();
  await page.getByRole('button', { name: 'Stop producer', exact: true }).click();
  await page.getByRole('button', { name: 'Pause consumer', exact: true }).click();
  const snapshots = page.getByRole('region', { name: 'Observed-state snapshots', exact: true });
  await snapshots.getByLabel('Snapshot name', { exact: true }).fill('Before');
  await snapshots.getByRole('button', { name: 'Capture snapshot', exact: true }).click();
  await page.getByLabel('Batch size', { exact: true }).fill('20');
  await page.getByLabel('Duplicate fraction', { exact: true }).fill('0');
  await page.getByLabel('Invalid fraction', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Produce one batch', exact: true }).click();
  await page.getByRole('button', { name: 'Drain one batch', exact: true }).click();
  await page.getByRole('button', { name: 'Run workspace DAG', exact: true }).click();
  await snapshots.getByLabel('Snapshot name', { exact: true }).fill('After');
  await snapshots.getByRole('button', { name: 'Capture snapshot', exact: true }).click();
  await snapshots.getByLabel('Before snapshot', { exact: true }).selectOption({ label: 'Before' });
  await snapshots.getByLabel('After snapshot', { exact: true }).selectOption({ label: 'After' });
  const differences = snapshots.getByRole('region', { name: 'Snapshot counter differences', exact: true });
  const inserted = differences.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Inserted records', exact: true }) });
  await expect(inserted.getByRole('cell')).toHaveText(['0', '20', '+20']);

  async function downloadComparison() {
    const downloading = page.waitForEvent('download');
    await snapshots.getByRole('button', { name: 'Download comparison evidence', exact: true }).click();
    const stream = await (await downloading).createReadStream();
    if (!stream) throw new Error('Comparison evidence download was unavailable');
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  const evidence = await downloadComparison();
  expect(Object.keys(evidence).sort()).toEqual(['after', 'before', 'comparison', 'kind', 'schema_version', 'scope']);
  expect(evidence.kind).toBe('dataplayground_run_comparison');
  expect(evidence.before.label).toBe('Before');
  expect(evidence.before.streaming.counters.inserted).toBe(0);
  expect(evidence.after.label).toBe('After');
  expect(evidence.after.streaming.counters.inserted).toBe(20);
  expect(evidence.comparison.compatible).toBe(true);
  expect(evidence.comparison.metrics).toContainEqual({ name: 'data_revision', before: 0, after: 20, delta: 20 });
  const beforeEvents = evidence.before.tables.find((table: { name: string }) => table.name === 'events').row_count;
  expect(evidence.comparison.tables).toContainEqual({ name: 'events', before: beforeEvents, after: beforeEvents + 20, delta: 20 });
  expect(evidence.after.dag.published).toBe(true);
  expect(evidence.after.dag.stale).toBe(false);
  expect(evidence.after.dag.trace).toHaveLength(6);
  expect(evidence.after.models.runs).toHaveLength(4);
  expect(JSON.stringify(evidence)).not.toContain(capability);
  const forbidden = new Set(['token', 'authorization', 'history', 'logs', 'events', 'payload', 'provider_state', 'sql']);
  function inspectKeys(value: unknown) {
    if (Array.isArray(value)) value.forEach(inspectKeys);
    else if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        expect(forbidden.has(key)).toBe(false);
        inspectKeys(child);
      }
    }
  }
  inspectKeys(evidence);

  // Change live state again, then refresh: both captures must remain historical.
  await page.getByLabel('Batch size', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Produce one batch', exact: true }).click();
  await page.getByRole('button', { name: 'Drain one batch', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh workspace', exact: true }).click();
  await expect(inserted.getByRole('cell')).toHaveText(['0', '20', '+20']);
  expect(await downloadComparison()).toEqual(evidence);
  await snapshots.getByLabel('Snapshot name', { exact: true }).fill('Before');
  await snapshots.getByRole('button', { name: 'Capture snapshot', exact: true }).click();
  const beforeSelection = snapshots.getByLabel('Before snapshot', { exact: true });
  const duplicateOptions = beforeSelection.getByRole('option', { name: /^Before \(snapshot-\d+\)$/ });
  await expect(duplicateOptions).toHaveCount(2);
  const duplicateIds = await duplicateOptions.evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  expect(duplicateIds).toContain(evidence.before.id);
  expect(await duplicateOptions.allTextContents()).toEqual(duplicateIds.map(id => `Before (${id})`));
  await expect(beforeSelection).toHaveValue(evidence.before.id);
  await expect(snapshots.getByLabel('After snapshot', { exact: true })).toHaveValue(evidence.after.id);
  for (const id of duplicateIds) {
    await expect(snapshots.getByRole('button', { name: `Delete snapshot Before (${id})`, exact: true })).toBeVisible();
  }
  await expect(inserted.getByRole('cell')).toHaveText(['0', '20', '+20']);
  expect(await downloadComparison()).toEqual(evidence);
  await snapshots.getByText('Inspect recorded contract tests', { exact: true }).click();
  const recordedModel = evidence.after.models.runs[0];
  const recordedContracts = snapshots.getByRole('region', { name: `After ${recordedModel.name} contract evidence`, exact: true });
  await expect(recordedContracts).toBeVisible();
  for (const contract of recordedModel.tests) {
    const row = recordedContracts.getByRole('row').filter({ has: page.getByRole('rowheader', { name: contract.name, exact: true }) });
    await expect(row.getByRole('cell')).toHaveText([contract.status, String(contract.failed_rows)]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (let theme = 0; theme < 2; theme++) {
    await page.getByRole('button', { name: /Use .* theme/ }).click();
    await expect(inserted.getByRole('cell')).toHaveText(['0', '20', '+20']);
    await expect(snapshots.getByRole('button', { name: 'Download comparison evidence', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Reset workspace', exact: true }).click();
  await expect(snapshots.getByText('No snapshots captured in this workspace.', { exact: true })).toBeVisible();
  await expect(snapshots.getByRole('region', { name: 'Snapshot counter differences', exact: true })).toHaveCount(0);
});
