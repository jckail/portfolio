import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { toLookup } from '../../shared/utils/lookup';
import { DataProvider, useData } from './data-provider';

vi.mock('../../shared/utils/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../../shared/utils/api')>();
  const payloads: Record<string, unknown> = {
    [actual.endpoints.experience]: { prove: { company: 'Prove' } },
    [actual.endpoints.skills]: { python: { display_name: 'Python' } },
    [actual.endpoints.projects]: { portfolio: { title: 'Portfolio' } },
    [actual.endpoints.aboutMe]: { greeting: 'hi' },
    [actual.endpoints.contactInfo]: { firstName: 'J' },
  };
  return {
    ...actual,
    // JSON.parse so the payloads are shaped exactly like real responses
    getJson: vi.fn(async (path: string) => JSON.parse(JSON.stringify(payloads[path]))),
  };
});

// Keys a visitor can put in ?skill= / ?project= / ?company= that resolve
// through Object.prototype on a plain object.
const PROTOTYPE_KEYS = ['__proto__', 'constructor', 'hasOwnProperty', 'toString', 'valueOf'];

describe('toLookup', () => {
  it('answers only the keys the payload actually has', () => {
    const plain = JSON.parse('{"python": {"display_name": "Python"}}');
    const lookup = toLookup(plain) as Record<string, unknown>;

    for (const key of PROTOTYPE_KEYS) {
      expect(plain[key]).toBeTruthy(); // the bug: a plain object answers these
      expect(lookup[key]).toBeUndefined();
    }
    expect(lookup.python).toEqual({ display_name: 'Python' });
    expect(Object.keys(lookup)).toEqual(['python']);
  });

  it('keeps a literal "__proto__" key from the payload as plain data', () => {
    const plain = JSON.parse('{"__proto__": {"title": "x"}, "a": {"title": "a"}}');
    const lookup = toLookup(plain) as Record<string, unknown>;
    expect(Object.getPrototypeOf(lookup)).toBeNull();
    expect(Object.keys(lookup)).toEqual(['__proto__', 'a']);
  });
});

describe('DataProvider', () => {
  it('exposes the URL-indexed dictionaries without a prototype', async () => {
    let data: ReturnType<typeof useData> | null = null;
    const Probe = () => {
      data = useData();
      return <span>{data.isLoading ? 'loading' : 'ready'}</span>;
    };

    render(
      <DataProvider>
        <Probe />
      </DataProvider>
    );
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());

    const { skillsData, projectsData, experienceData } = data!;
    for (const dict of [skillsData, projectsData, experienceData] as Record<string, unknown>[]) {
      for (const key of PROTOTYPE_KEYS) {
        expect(dict[key]).toBeUndefined();
      }
    }
    expect(skillsData!.python.display_name).toBe('Python');
    expect(projectsData!.portfolio.title).toBe('Portfolio');
    expect(experienceData!.prove.company).toBe('Prove');
  });
});
