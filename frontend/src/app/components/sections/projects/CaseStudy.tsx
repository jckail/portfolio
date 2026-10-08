import React from 'react';

import type { ProjectCaseStudy } from '../../../../types/resume';
import '../../../../styles/components/sections/case-study.css';

function EvidenceLink({ url, children }: { url?: string | null; children: React.ReactNode }) {
  // Registry validation is authoritative; also fail closed for client fixtures or stale data.
  if (!url?.startsWith('https://')) return null;
  return <a href={url} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export function CaseStudy({ study }: { study: ProjectCaseStudy }) {
  return (
    <div className="case-study" role="region" aria-label="Engineering case study">
      {study.problem && <section><h3>Problem</h3><p>{study.problem}</p></section>}
      {study.role && <section><h3>My role</h3><p>{study.role}</p></section>}
      {!!study.constraints?.length && <section><h3>Constraints</h3><ul>{study.constraints.map(item => <li key={item}>{item}</li>)}</ul></section>}
      {study.architecture && <section><h3>Architecture</h3><p>{study.architecture}</p></section>}
      {!!study.decisions?.length && <section><h3>Decisions and tradeoffs</h3><dl>{study.decisions.map(item => (
        <React.Fragment key={item.decision}><dt>{item.decision}</dt><dd><p>{item.tradeoff}</p><EvidenceLink url={item.evidence_url}>Decision source</EvidenceLink></dd></React.Fragment>
      ))}</dl></section>}
      {!!study.challenges?.length && <section><h3>Engineering challenges</h3><dl>{study.challenges.map(item => (
        <React.Fragment key={item.challenge}><dt>{item.challenge}</dt><dd>{item.resolution}</dd></React.Fragment>
      ))}</dl></section>}
      {!!study.outcomes?.length && <section><h3>Verified outcomes</h3><ul>{study.outcomes.map(item => (
        <li key={item.statement}>{item.statement}{item.source_url && <> <EvidenceLink url={item.source_url}>Outcome source</EvidenceLink></>}</li>
      ))}</ul></section>}
      {!!study.limitations?.length && <section><h3>Limitations and next steps</h3><ul>{study.limitations.map(item => <li key={item}>{item}</li>)}</ul></section>}
      {!!study.evidence_links?.length && <section><h3>Explore the evidence</h3><ul>{study.evidence_links.map(item => (
        <li key={item.url}><EvidenceLink url={item.url}>{item.label}</EvidenceLink></li>
      ))}</ul></section>}
    </div>
  );
}
