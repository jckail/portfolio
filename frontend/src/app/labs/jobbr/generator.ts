import { createRng, int, pick, sample } from './prng';
import { SKILL_NAMES } from './skills';

export interface RawPosting {
  id: string;
  raw: string;
}

const COMPANIES = ['Northwind Analytics', 'Lumen Freight', 'Quillstone Labs', 'Harbor & Pine', 'Brightmoor Health', 'Tessel Robotics', 'Alder Payments', 'Kestrel Cloud'];
const TITLES = ['Backend Engineer', 'Data Engineer', 'Machine Learning Engineer', 'Full-Stack Engineer', 'Platform Engineer', 'Software Engineer', 'Analytics Engineer'];
const CITIES = ['Austin, TX', 'Denver, CO', 'Seattle, WA', 'Chicago, IL', 'Boston, MA', 'Portland, OR'];
const BENEFITS = ['Health, dental and vision coverage', '401(k) with company match', 'Flexible paid time off', 'Learning stipend', 'Home office budget', 'Parental leave', 'Wellness allowance'];
const REQ_HEADS = ['Requirements', "What you'll need", 'Qualifications'];
const NICE_HEADS = ['Nice to have', 'Bonus points', 'Preferred'];
const BENEFIT_HEADS = ['Benefits', 'Perks', 'What we offer'];
const ABOUT = [
  'Build and operate services that turn messy inputs into reliable products.',
  'Own pipelines and APIs end to end with a small, collaborative team.',
  'Help the team ship well-tested features and keep production healthy.',
];

/** Generates synthetic, fictional postings as raw HTML-like text. Same seed, same postings. */
export function generatePostings(seed: number, count = 8): RawPosting[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, (_, i) => {
    const company = COMPANIES[i % COMPANIES.length];
    const title = pick(rng, TITLES);
    const city = pick(rng, CITIES);
    const remote = rng() < 0.35;
    const skills = sample(rng, SKILL_NAMES, int(rng, 5, 7));
    const required = skills.slice(0, 4);
    const nice = skills.slice(4);
    const years = int(rng, 1, 7);
    const lo = int(rng, 9, 17) * 10000;
    const hasSalary = rng() > 0.2;
    const noisy = rng() < 0.3;
    const parts = [
      `<div class="posting"><h1>${title}</h1>`,
      `<p>Company: ${company.replace('&', '&amp;')}</p>`,
      `<p>Location: ${city}${remote ? ' (Remote)' : ''}</p>`,
      `<h3>About the role</h3><p>${pick(rng, ABOUT)}</p>`,
      `<h3>${pick(rng, REQ_HEADS)}</h3><ul><li>${years}+ years of professional experience</li>`,
      ...required.map(s => `<li>Hands-on ${s}</li>`),
      '</ul>',
      `<h3>${pick(rng, NICE_HEADS)}</h3><ul>${nice.map(s => `<li><b>${s}</b></li>`).join('')}</ul>`,
      `<h3>${pick(rng, BENEFIT_HEADS)}</h3><ul>${sample(rng, BENEFITS, 3).map(b => `<li>${b.replace('&', '&amp;')}</li>`).join('')}</ul>`,
      hasSalary ? `<p>Salary: $${lo.toLocaleString('en-US')} - $${(lo + 30000).toLocaleString('en-US')} per year</p>` : '',
      noisy ? '<script>track()</script><!-- footer --><p class="legal">Equal opportunity employer.</p>' : '',
      '</div>',
    ];
    return { id: `JOB-${seed}-${i + 1}`, raw: parts.join('\n') };
  });
}

export const SAMPLE_RESUME = `Alex Sample - Backend and Data Engineer
Based in Austin, TX. 5 years of professional experience.

Skills: Python, SQL, FastAPI, Docker, PostgreSQL, Pandas, Airflow, Git, CI/CD
Experience: Built data pipelines and REST APIs in Python and SQL; containerised services with Docker; maintained Airflow DAGs.
(Fictional sample resume for the demo.)`;
