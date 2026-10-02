import { generatePostings, SAMPLE_RESUME } from './generator';
import { DEFAULT_WEIGHTS, readResume, scoreJob } from './matcher';
import { filledFields, parseJob, parseSalary, parseYears, toLines } from './parser';
import { createRng, sample } from './prng';
import { extractSkills } from './skills';

describe('prng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(5), b = createRng(5), c = createRng(6);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(createRng(5)()).not.toBe(c());
  });
  it('samples distinct items', () => {
    const out = sample(createRng(1), [1, 2, 3, 4, 5], 3);
    expect(new Set(out).size).toBe(3);
    expect(sample(createRng(1), [1, 2], 9)).toHaveLength(2);
  });
});

describe('skills', () => {
  it('matches whole terms and aliases only', () => {
    expect(extractSkills('Java and JS, plus k8s')).toEqual(['JavaScript', 'Java', 'Kubernetes']);
    expect(extractSkills('We go beyond; golang a plus; C++ ok')).toEqual(['Go', 'C++']);
    expect(extractSkills('GitHub only')).toEqual([]);
  });
});

describe('parser', () => {
  it('strips tags, scripts, comments and entities', () => {
    expect(toLines('<p>A &amp; B</p><script>x()</script><!-- c --><li>C</li>')).toEqual(['A & B', 'C']);
  });
  it('parses salary and years', () => {
    expect(parseSalary('Salary: $90k to $120k per year')).toEqual({ currency: '$', min: 90000, max: 120000, period: 'year' });
    expect(parseSalary('Pay: $50 - $60 per hour')?.period).toBe('hour');
    expect(parseSalary('no money here')).toBeNull();
    expect(parseYears(['x', '3+ years of Python'])).toBe(3);
    expect(parseYears(['none'])).toBeNull();
  });
  it('extracts structured fields from a posting', () => {
    const job = parseJob(
      '<h1>Data Engineer</h1><p>Company: Acme</p><p>Location: Austin, TX (Remote)</p><h3>About the role</h3><p>Build pipelines.</p>' +
        "<h3>What you'll need</h3><ul><li>4+ years experience</li><li>Python</li></ul><h3>Bonus points</h3><ul><li>Airflow</li><li>Python</li></ul>" +
        '<h3>Perks</h3><ul><li>PTO</li></ul><p>Salary: $100,000 - $130,000 per year</p>'
    );
    expect(job).toMatchObject({
      title: 'Data Engineer', company_name: 'Acme', location: ['Austin, TX'], remote: true, description: 'Build pipelines.',
      requirements: ['4+ years experience', 'Python'], benefits: ['PTO'], years_of_experience: 4,
      skills_required: ['Python'], skills_preferred: ['Airflow'],
    });
    expect(job.salary?.max).toBe(130000);
    expect(job.trace.length).toBeGreaterThan(5);
    expect(filledFields(job)).toBe(7);
  });
  it('leaves absent fields empty instead of guessing', () => {
    const job = parseJob('<p>nothing useful</p>');
    expect(job.salary).toBeNull();
    expect(filledFields(job)).toBe(0);
  });
});

describe('generator', () => {
  it('is deterministic and parses every posting', () => {
    expect(generatePostings(3)).toEqual(generatePostings(3));
    expect(generatePostings(3)).not.toEqual(generatePostings(4));
    for (const p of generatePostings(11, 20)) {
      const job = parseJob(p.raw);
      expect(job.title && job.company_name && job.requirements.length).toBeTruthy();
      expect(job.skills_required.length).toBeGreaterThan(0);
    }
  });
});

describe('matcher', () => {
  const job = parseJob(
    '<h1>T</h1><p>Company: A</p><p>Location: Denver, CO</p><h3>Requirements</h3><ul><li>2+ years</li><li>Python</li><li>SQL</li></ul><h3>Nice to have</h3><ul><li>Docker</li></ul>'
  );
  it('reads a resume', () => {
    const r = readResume(SAMPLE_RESUME);
    expect(r.skills).toContain('Python');
    expect(r.years).toBe(5);
  });
  it('scores deterministically with an explanation', () => {
    const r = readResume('Python developer, 3 years. Lives in Denver.');
    const m = scoreJob(job, r, DEFAULT_WEIGHTS);
    expect(m.matched).toEqual(['SQL'].slice(1).concat('Python'));
    expect(m.missing).toEqual(['SQL']);
    expect(m.preferredMissing).toEqual(['Docker']);
    // (50*.5 + 20*0 + 15*1 + 15*1) / 100
    expect(m.score).toBe(55);
    expect(scoreJob(job, r, DEFAULT_WEIGHTS)).toEqual(m);
  });
  it('responds to weights', () => {
    const r = readResume('Python, SQL, Docker');
    expect(scoreJob(job, r, { required: 0, preferred: 0, experience: 100, location: 0 }).score).toBe(0);
    expect(scoreJob(job, r, { required: 100, preferred: 0, experience: 0, location: 0 }).score).toBe(100);
    expect(scoreJob(job, r, { required: 0, preferred: 0, experience: 0, location: 0 }).score).toBeNull();
  });
  it('treats remote roles as a location fit', () => {
    const remote = { ...job, remote: true };
    expect(scoreJob(remote, readResume('x'), DEFAULT_WEIGHTS).parts[3].fit).toBe(1);
  });
});
