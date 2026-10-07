export interface PortfolioEvidence {
  profile: { name: string; title: string; location: string; github: string; linkedin: string };
  experience: { id: string; company: string; title: string; date: string; highlights: string[] }[];
  projects: { id: string; title: string; description: string; url: string; technologies: string[] }[];
  skillGroups: { name: string; items: string[] }[];
}

/** External links from public content may only use web protocols. */
export function evidenceUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
