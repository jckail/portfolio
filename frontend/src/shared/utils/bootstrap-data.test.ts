import { afterEach, describe, expect, it } from 'vitest';

import { BOOTSTRAP_ELEMENT_ID, readBootstrapData } from './bootstrap-data';

const VALID = {
  aboutMe: { greeting: 'hi' },
  contact: { firstName: 'J' },
  experience: { prove: { company: 'Prove' } },
  projects: { portfolio: { title: 'Portfolio' } },
  skills: { python: { display_name: 'Python' } },
};

const mount = (text: string, type = 'application/json') => {
  const el = document.createElement('script');
  el.type = type;
  el.id = BOOTSTRAP_ELEMENT_ID;
  el.textContent = text;
  document.body.appendChild(el);
};

afterEach(() => {
  document.getElementById(BOOTSTRAP_ELEMENT_ID)?.remove();
});

describe('readBootstrapData', () => {
  it('returns null when the page has no bootstrap block', () => {
    expect(readBootstrapData()).toBeNull();
  });

  it('parses a complete block', () => {
    mount(JSON.stringify(VALID));
    expect(readBootstrapData()).toEqual(VALID);
  });

  it('decodes the \\u003c escapes the server writes', () => {
    // What backend/app/api/content.py emits for "</script>" inside data
    mount('{"aboutMe":{"greeting":"\\u003c/script\\u003e"},"contact":{},"experience":{},"projects":{},"skills":{}}');
    expect(readBootstrapData()?.aboutMe.greeting).toBe('</script>');
  });

  it.each([
    ['malformed JSON', '{"aboutMe":'],
    ['an array', '[]'],
    ['a missing payload', JSON.stringify({ ...VALID, skills: undefined })],
    ['a null payload', JSON.stringify({ ...VALID, contact: null })],
    ['an inherited key only', '{"__proto__":{"aboutMe":{}}}'],
  ])('returns null for %s', (_, text) => {
    mount(text);
    expect(readBootstrapData()).toBeNull();
  });
});
