/** Controlled skill vocabulary with aliases. Shared by the parser and the resume reader. */
export const SKILLS: Record<string, string[]> = {
  Python: ['python'],
  SQL: ['sql'],
  FastAPI: ['fastapi'],
  Django: ['django'],
  Flask: ['flask'],
  TypeScript: ['typescript'],
  JavaScript: ['javascript', 'js'],
  React: ['react', 'reactjs'],
  'Node.js': ['node.js', 'nodejs', 'node'],
  Java: ['java'],
  Go: ['golang'],
  Rust: ['rust'],
  'C++': ['c++'],
  Docker: ['docker'],
  Kubernetes: ['kubernetes', 'k8s'],
  AWS: ['aws'],
  GCP: ['gcp', 'google cloud'],
  Terraform: ['terraform'],
  PostgreSQL: ['postgresql', 'postgres'],
  Pandas: ['pandas'],
  NumPy: ['numpy'],
  Spark: ['spark', 'pyspark'],
  Airflow: ['airflow'],
  dbt: ['dbt'],
  'Machine learning': ['machine learning', 'ml'],
  NLP: ['nlp', 'natural language processing'],
  LangChain: ['langchain'],
  'CI/CD': ['ci/cd', 'cicd'],
  Git: ['git'],
  GraphQL: ['graphql'],
};

export const SKILL_NAMES = Object.keys(SKILLS);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

const PATTERNS: [string, RegExp][] = SKILL_NAMES.map(name => {
  // "go" is an ordinary English word, so Go is only recognised through its alias.
  const terms = [...(name === 'Go' ? [] : [name.toLowerCase()]), ...SKILLS[name]].map(escapeRegExp).join('|');
  // Not part of a longer word or token (so "java" does not match "javascript", "c++" stays whole).
  return [name, new RegExp(`(?<![a-z0-9+#.])(?:${terms})(?![a-z0-9+#])`, 'i')];
});

/** Skills found in free text, in vocabulary order. */
export function extractSkills(text: string): string[] {
  return PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}
