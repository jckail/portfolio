export interface RuntimeAction {
  action:
    | 'producer_start'
    | 'producer_stop'
    | 'produce'
    | 'consumer_pause'
    | 'consumer_resume'
    | 'consumer_drain'
    | 'consumer_replay'
    | 'dag_run'
    | 'models_run'
    | 'reset';
  batch_size?: number;
  rate_per_second?: number;
  partitions?: number;
  limit?: number;
  failure?: 'none' | 'transient' | 'permanent';
  duplicate_rate?: number;
  invalid_rate?: number;
}
export interface QueryRequest {
  sql: string;
  row_limit: number;
}
export interface QueryResult {
  workspace_generation?: number | null;
  data_revision?: number | null;
  columns: string[];
  rows: (string | number | null)[][];
  row_count: number;
  truncated: boolean;
  elapsed_ms: number;
}
export interface RuntimeState {
  workspace_generation?: number;
  data_revision?: number;
  dag_input_revision?: number | null;
  model_input_revision?: number | null;
  dag_stale?: boolean;
  models_stale?: boolean;
  scenario_id: string;
  runtime: string;
  source: string;
  expires_in_seconds: number;
  tables: {
    name: string;
    row_count: number;
    columns: { name: string; type: string; nullable: boolean; key: string }[];
    source: string;
  }[];
  streaming: {
    producer_running: boolean;
    consumer_paused: boolean;
    batch_size: number;
    rate_per_second: number;
    partitions: {
      partition: number;
      produced_offset: number;
      consumed_offset: number;
      backlog: number;
    }[];
    produced: number;
    consumed: number;
    inserted: number;
    duplicates: number;
    quarantined: number;
    accepted: number;
    duplicate_rate: number;
    invalid_rate: number;
    consumer_batch_size: number;
    consumer_rate_per_second: number;
    backlog: number;
    capacity: number;
  };
  dag_trace: {
    task_id: string;
    attempt: number;
    status: 'success' | 'failed' | 'blocked';
    detail: string;
  }[];
  dag_published: boolean;
  dag_fingerprint: string | null;
  model_runs: {
    name: string;
    status: 'success' | 'failed';
    row_count: number;
    sql: string;
    source: string;
    tests: { name: string; status: 'pass' | 'fail'; failed_rows: number; sql: string }[];
  }[];
  logs: { sequence: number; component: string; status: string; detail: string }[];
  flow: { source: string; target: string; value: number }[];
}
export interface RuntimeSession {
  token: string;
  expires_in_seconds: number;
  state: RuntimeState;
}
