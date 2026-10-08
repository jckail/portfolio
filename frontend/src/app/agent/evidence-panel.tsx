import React from 'react';

import { evidenceUrl, type PortfolioEvidence } from './public-evidence';

export function EvidencePanel({ evidence }: { evidence: PortfolioEvidence }) {
  const professionalRoles = evidence.experience.filter(role => role.id !== 'sabbatical').slice(0, 3);
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
      <h3>Recent engineering experience</h3>
      {professionalRoles.map(role => (
        <details className="agent-evidence-card" key={role.id}>
          <summary><strong>{role.company}</strong><span>{role.title}</span></summary>
          <p className="agent-muted">{role.date}</p>
          {role.highlights[0] && <p>{role.highlights[0]}</p>}
          <a href={`/?company=${encodeURIComponent(role.id)}#experience`}>Full experience ↗</a>
        </details>
      ))}
      <details className="agent-evidence-group">
        <summary>Selected projects <span>{Math.min(evidence.projects.length, 3)}</span></summary>
        {evidence.projects.slice(0, 3).map(project => (
          <article className="agent-evidence-card" key={project.id}>
            <a href={`/?project=${encodeURIComponent(project.id)}#projects`}><strong>{project.title}</strong></a>
            <p>{project.description}</p>
            {evidenceUrl(project.url) && <a href={evidenceUrl(project.url)}>Project source ↗</a>}
          </article>
        ))}
      </details>
      <details className="agent-evidence-group">
        <summary>Skills <span>{evidence.skillGroups.length} groups</span></summary>
        {evidence.skillGroups.map(group => (
          <details key={group.name}>
            <summary>{group.name}</summary>
            <p>{group.items.join(' · ')}</p>
          </details>
        ))}
      </details>
      <a className="agent-evidence-footer" href="/#experience">Explore the complete portfolio ↗</a>
    </aside>
  );
}
