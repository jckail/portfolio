import React from 'react';

import { evidenceUrl, type PortfolioEvidence } from './public-evidence';

export function EvidencePanel({ evidence }: { evidence: PortfolioEvidence }) {
  return (
    <aside className="agent-evidence" aria-label="Portfolio evidence">
      <p className="agent-eyebrow">Public portfolio evidence</p>
      <h2>{evidence.profile.name}</h2>
      <p>{evidence.profile.title}</p>
      <p className="agent-muted">{evidence.profile.location}</p>
      <div className="agent-resource-links">
        <a href="/api/resume">Resume PDF</a>
        <a href="/context.json">Source context</a>
        {evidenceUrl(evidence.profile.github) && <a href={evidenceUrl(evidence.profile.github)}>GitHub</a>}
        {evidenceUrl(evidence.profile.linkedin) && <a href={evidenceUrl(evidence.profile.linkedin)}>LinkedIn</a>}
      </div>
      <h3>Experience</h3>
      {evidence.experience.slice(0, 3).map(role => (
        <article className="agent-evidence-card" key={role.id}>
          <a href={`/?company=${encodeURIComponent(role.id)}#experience`}><strong>{role.company}</strong></a>
          <p>{role.title}</p>
          <small>{role.date}</small>
          {role.highlights[0] && <p className="agent-muted">{role.highlights[0]}</p>}
        </article>
      ))}
      <h3>Selected projects</h3>
      {evidence.projects.slice(0, 3).map(project => (
        <article className="agent-evidence-card" key={project.id}>
          <a href={`/?project=${encodeURIComponent(project.id)}#projects`}><strong>{project.title}</strong></a>
          <p>{project.description}</p>
          {evidenceUrl(project.url) && <a href={evidenceUrl(project.url)}>Project source ↗</a>}
        </article>
      ))}
      <h3>Skills</h3>
      {evidence.skillGroups.map(group => (
        <details key={group.name}>
          <summary>{group.name}</summary>
          <p>{group.items.join(' · ')}</p>
        </details>
      ))}
    </aside>
  );
}
