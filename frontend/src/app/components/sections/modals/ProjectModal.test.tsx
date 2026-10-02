import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProjectModal from './ProjectModal';

import type { Project } from '../../../../types/resume';

const base: Project = {
  title: 'Demo',
  description: 'A demo project',
  description_detail: '',
  link: 'https://example.com/demo',
};

function renderModal(project: Project) {
  render(
    <ProjectModal
      projectKey="demo"
      project={project}
      skillsData={{}}
      onClose={vi.fn()}
      onSelectSkill={vi.fn()}
    />,
  );
}

describe('ProjectModal primary link label', () => {
  it('defaults to "View project"', () => {
    renderModal(base);
    expect(screen.getByRole('link', { name: 'View project' }).getAttribute('href')).toBe(base.link);
  });

  it('uses link_label when the project provides one', () => {
    renderModal({ ...base, link_label: 'Read coverage' });
    expect(screen.getByRole('link', { name: 'Read coverage' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'View project' })).toBeNull();
  });
});

describe('ProjectModal secondary link label', () => {
  it('defaults to "Live demo"', () => {
    renderModal({ ...base, link2: 'https://example.com/live' });
    expect(screen.getByRole('link', { name: 'Live demo' }).getAttribute('href')).toBe('https://example.com/live');
  });

  it('uses link2_label when provided', () => {
    renderModal({ ...base, link2: 'https://example.com/live', link2_label: 'Interactive demo' });
    expect(screen.getByRole('link', { name: 'Interactive demo' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Live demo' })).toBeNull();
  });

  it('renders no secondary link without link2', () => {
    renderModal(base);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});
