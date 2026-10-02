import { createRng, randInt } from './rng';

export type Scenario = 'steady' | 'spike' | 'runaway';

export const SCENARIOS: { id: Scenario; label: string; blurb: string }[] = [
  { id: 'steady', label: 'Steady usage', blurb: 'Threads send a modest, even stream of messages across the day.' },
  { id: 'spike', label: 'Spike', blurb: 'Most threads are quiet, then many threads burst at once around mid-day.' },
  { id: 'runaway', label: 'Runaway thread', blurb: 'One thread loops, sending long messages continuously and dominating cost.' },
];

export interface Message {
  id: number;
  threadId: string;
  /** Minutes since 00:00 of the synthetic day. */
  minute: number;
  modelId: string;
  inTokens: number;
  outTokens: number;
}

export interface Thread {
  id: string;
  user: string;
  title: string;
  modelId: string;
}

export interface Dataset {
  scenario: Scenario;
  seed: number;
  threads: Thread[];
  messages: Message[];
}

const TITLES = ['Support triage', 'Contract summary', 'Code review helper', 'Onboarding Q&A', 'Report drafting', 'Data cleanup', 'Meeting notes', 'Translation batch', 'FAQ assistant', 'Sales email draft'];
const MODELS = ['small', 'small', 'medium', 'large'];
export const THREAD_COUNT = 10;

export function generateDataset(scenario: Scenario, seed: number): Dataset {
  const rng = createRng(seed * 7919 + scenario.length * 31);
  const threads: Thread[] = [];
  const messages: Message[] = [];
  let id = 1;
  for (let i = 0; i < THREAD_COUNT; i++) {
    const t: Thread = {
      id: `T-${String(i + 1).padStart(3, '0')}`,
      user: `user-${String.fromCharCode(97 + (i % 5))}`,
      title: TITLES[i % TITLES.length],
      modelId: scenario === 'runaway' && i === 3 ? 'medium' : MODELS[randInt(rng, 0, MODELS.length - 1)],
    };
    threads.push(t);
    const runaway = scenario === 'runaway' && i === 3;
    const count = runaway ? 90 : randInt(rng, 6, 16);
    for (let k = 0; k < count; k++) {
      let minute: number;
      if (runaway) minute = 600 + Math.floor((k * 240) / count) + randInt(rng, 0, 2);
      else if (scenario === 'spike') minute = rng() < 0.7 ? randInt(rng, 720, 780) : randInt(rng, 0, 1439);
      else minute = randInt(rng, 0, 1439);
      const inTokens = runaway ? randInt(rng, 3000, 6000) : randInt(rng, 40, 900);
      const outTokens = runaway ? randInt(rng, 1500, 3500) : randInt(rng, 60, 1200);
      messages.push({ id: id++, threadId: t.id, minute, modelId: t.modelId, inTokens, outTokens });
    }
  }
  messages.sort((a, b) => a.minute - b.minute || a.id - b.id);
  messages.forEach((m, i) => (m.id = i + 1));
  return { scenario, seed, threads, messages };
}
