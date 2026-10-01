export interface SimulationConfig {
  seed: number;
  days: number;
  daily_signups: number;
  activation_rate: number;
  payment_rate: number;
  churn_rate: number;
  duplicate_rate: number;
  invalid_rate: number;
}
export interface RunResult {
  id: string;
  scenario: { id: string; name: string; description: string };
  config: SimulationConfig;
  summary: {
    signups: number;
    activated_users: number;
    paying_users: number;
    active_customers: number;
    revenue_cents: number;
    conversion_rate: number;
    churn_rate: number;
    quality_pass_rate: number;
  };
  daily: {
    date: string;
    signups: number;
    activations: number;
    payments: number;
    churns: number;
    revenue_cents: number;
    active_customers: number;
  }[];
  funnel: { stage: string; users: number; rate: number }[];
  cohorts: { cohort: string; size: number; retention: (number | null)[] }[];
  pipeline: {
    id: string;
    name: string;
    input_count: number;
    output_count: number;
    rejected_count: number;
    description: string;
  }[];
  quality: {
    id: string;
    name: string;
    status: 'pass' | 'warn';
    checked: number;
    failed: number;
    description: string;
  }[];
  events: {
    event_id: string;
    occurred_at: string;
    user_id: string;
    event_type: string;
    amount_cents: number;
    channel: string;
    plan: string;
  }[];
  quarantined: { event_id: string; event_type: string; reason: string }[];
  lineage: { metric: string; definition: string; source: string; sql: string }[];
}
export interface Catalog {
  exploration?: ExplorationDataset | null;
  schema_version: number;
  engine_version: string;
  source: { repository: string; command: string };
  live_simulation: boolean;
  runs: RunResult[];
}

export interface ExplorationProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  price_cents: number;
  vector: number[];
}
export interface ExplorationDataset {
  seed: number;
  description: string;
  dimensions: string[];
  products: ExplorationProduct[];
  customers: { id: string; name: string; segment: string }[];
  purchases: { id: string; customer_id: string; product_id: string; quantity: number }[];
  graph: {
    nodes: { id: string; label: string; kind: 'customer' | 'product' | 'category' }[];
    edges: {
      source: string;
      target: string;
      relation: 'purchased' | 'belongs_to';
      weight: number;
    }[];
  };
}
