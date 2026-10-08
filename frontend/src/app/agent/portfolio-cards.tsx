import React from 'react';

import { evidenceUrl } from './public-evidence';

export interface PortfolioCard { kind: string; data: unknown }
type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value)
  ? value as RecordValue : {};
const text = (value: unknown, max = 600) => typeof value === 'string' ? value.slice(0, max) : '';
const rows = (value: unknown): RecordValue[] => Array.isArray(value) ? value.slice(0, 8).map(object) : [];
const strings = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').slice(0, 12).map(item => item.slice(0, 600)) : [];

function SourceLink({ value, label }: { value: unknown; label: string }) {
  const href = evidenceUrl(text(value, 2000));
  return href ? <a href={href}>{label} ↗</a> : null;
}

function EvidenceHits({ value }: { value: unknown }) {
  return <ul>{rows(value).map((hit, index) => <li key={index}>
    <strong>{text(hit.title) || text(hit.name) || text(hit.key)}</strong>
    <p>{strings(hit.snippets).join(' ') || text(hit.snippet) || text(hit.description)}</p>
    {['experience', 'projects', 'skills'].includes(text(hit.source)) && text(hit.key) && <a href={`/?${hit.source === 'experience' ? 'company' : hit.source === 'projects' ? 'project' : 'skill'}=${encodeURIComponent(text(hit.key))}`}>Review portfolio evidence ↗</a>}
    <SourceLink value={hit.url ?? hit.source_url} label="Review source" />
  </li>)}</ul>;
}

export function PortfolioCards({ cards, onPrompt, disabled = false }: {
  cards: PortfolioCard[]; onPrompt?: (prompt: string) => void; disabled?: boolean;
}) {
  return <div className="agent-generated-cards" role="region" aria-label="Evidence selected for this conversation">
    {cards.map((card, index) => {
      const data = object(card.data);
      if (!Object.keys(data).length) return null;
      let body: React.ReactNode;
      let title: string;
      if (card.kind === 'project') {
        if (!text(data.title)) return null;
        title = text(data.title);
        body = <><p>{text(data.description)}</p><p>{text(data.details, 1800)}</p>
          <p className="agent-muted">{strings(data.technologies).join(' · ')}</p>
          <div className="agent-resource-links">{rows(data.links).map((link, i) =>
            <SourceLink key={i} value={link.url} label={text(link.label) || 'Project link'} />)}
            <SourceLink value={data.source_url} label="Portfolio project" /></div></>;
      } else if (card.kind === 'recruiter_brief') {
        const profile = object(data.profile);
        if (!text(profile.name)) return null;
        title = `A brief on ${text(profile.name)}`;
        body = <><p>{text(profile.title)}</p><p>{text(profile.summary, 900)}</p>
          {rows(data.experience).map((role, i) => <div key={i}><strong>{text(role.title)} · {text(role.company)}</strong>
            <ul>{strings(role.highlights).map((item, j) => <li key={j}>{item}</li>)}</ul></div>)}
          <EvidenceHits value={data.relevant_evidence} />
          <SourceLink value={object(data.sources).context} label="Public evidence" />
          <SourceLink value={object(data.sources).pdf} label="Resume" /></>;
      } else if (card.kind === 'role_match') {
        if (!rows(data.requirements).length) return null;
        title = 'Your role, mapped to public evidence';
        body = <>{rows(data.requirements).map((requirement, i) => <div key={i}>
          <h4>{text(requirement.requirement)}</h4>
          {requirement.status === 'not_published' ? <p>No published evidence found. Ask Jordan directly.</p>
            : <EvidenceHits value={requirement.evidence} />}</div>)}
          <SourceLink value={data.source_url} label="Portfolio context" /></>;
      } else if (card.kind === 'contact_options') {
        title = 'Take the next step with Jordan';
        body = <><p>{text(data.message)}</p><p>{text(data.meeting)}</p>
          <div className="agent-resource-links"><SourceLink value={data.contact_form} label="Contact form" />
            <SourceLink value={data.linkedin} label="LinkedIn" /><SourceLink value={data.resume} label="Resume" /></div>
          {onPrompt && <button type="button" disabled={disabled} onClick={() => onPrompt('Help me draft a message to Jordan about working together.')}>Draft an introduction</button>}</>;
      } else if (card.kind === 'calendar_availability') {
        title = 'Find a time to connect';
        const slots = rows(data.slots).filter(slot => {
          const start = text(slot.start); const end = text(slot.end);
          return /T/.test(start) && Number.isFinite(Date.parse(start)) && Date.parse(end) > Date.parse(start);
        });
        body = <><p className="agent-muted">Times shown in your browser’s local timezone.
          A slot is booked only after you review, confirm and receive a successful result.</p>
          {data.status === 'available' && slots.length ? <div className="agent-calendar-slots">
            {slots.map((slot, i) => <button key={i} type="button" disabled={disabled || !onPrompt}
              onClick={() => onPrompt?.(`I would like to book the meeting starting at ${text(slot.start, 80)}. Please prepare the booking for my review.`)}>
              {new Date(text(slot.start)).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </button>)}</div>
            : <p>{data.status === 'available' ? 'No open slots in that range. Try another date.' : 'Live calendar scheduling is unavailable. Ask the assistant to send Jordan a meeting request instead.'}</p>}</>;
      } else return null;
      return <article key={index} className="agent-generated-card">
        <p className="agent-eyebrow">Selected from portfolio tools</p><h3>{title}</h3>{body}
        {text(data.note) && <p className="agent-disclosure">{text(data.note)}</p>}
      </article>;
    })}
  </div>;
}
