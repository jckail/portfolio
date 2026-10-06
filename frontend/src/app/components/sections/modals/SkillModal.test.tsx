import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';

import { setChatAvailable } from '../../../../shared/utils/chat-availability';
import { CHAT_PREFILL_KEY } from './skill-modal-actions';
import { SkillModalHost } from './SkillModalHost';

import type { SkillsData } from '../../../../types/skills';

const skill = (display_name: string, extra: Record<string, unknown> = {}) => ({
  display_name,
  description: `${display_name} description`,
  years_of_experience: 5,
  professional_experience: true,
  image: '',
  tags: ['ai'],
  examples: {},
  weblink: 'https://example.com/docs',
  general_category: 'Programming Languages',
  sub_category: 'General',
  related: [] as string[],
  ...extra,
});

const skillsData = {
  python: skill('Python', { related: ['kafka', 'missing'] }),
  go: skill('Go'),
  rust: skill('Rust'),
  kafka: skill('Kafka', { general_category: 'Data Engineering' }),
  lonely: skill('Lonely', { general_category: 'Other', weblink: '', related: [] }),
} as unknown as SkillsData;

const experienceData = {
  together_ai: {
    company: 'Together AI',
    title: 'Staff Engineer',
    date: '02/2025 - Present',
    tech_stack: ['python'],
  },
  meta: {
    company: 'Meta',
    title: 'Data Engineer',
    date: '2019 - 2022',
    tech_stack: ['Python', 'kafka'],
  },
  old: { company: 'Old Co', title: 'Dev', date: '2013', tech_stack: ['go'] },
};
const projectsData = { qr: { title: 'QR Project', tech_stack: ['python'] } };

let dataState: { experienceData: unknown; projectsData: unknown; isLoading: boolean };

vi.mock('../../../providers/data-provider', () => ({ useData: () => dataState }));
vi.mock('../../../../shared/utils/analytics', () => ({ trackModalView: vi.fn() }));
vi.mock('../../../../shared/components/skill-icon/SkillIcon', () => ({ default: () => null }));

const Harness = ({
  initial = 'python',
  onClose = () => {},
}: {
  initial?: string | null;
  onClose?: () => void;
}) => <SkillModalHost skillsData={skillsData} skillKey={initial} onClose={onClose} />;

beforeEach(() => {
  dataState = { experienceData, projectsData, isLoading: false };
  window.history.replaceState({}, '', '/');
  setChatAvailable(true);
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  setChatAvailable(true);
});

describe('SkillModal', () => {
  it('shows header, description, category and deep-link copy', async () => {
    render(<Harness />);
    const dialog = await screen.findByRole('dialog', { name: 'Python' });
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Python' })).toBeInTheDocument();
    expect(within(dialog).getByText('Python description')).toBeInTheDocument();
    expect(within(dialog).getByText('Programming Languages')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Python docs/ })).toHaveAttribute(
      'href',
      'https://example.com/docs'
    );
  });

  it('does not add a banner landmark while open', async () => {
    render(<Harness />);
    await screen.findByRole('dialog', { name: 'Python' });
    expect(screen.queryAllByRole('banner')).toHaveLength(0);
  });

  it('derives roles and projects from the data at render time', async () => {
    render(<Harness />);
    const dialog = await screen.findByRole('dialog', { name: 'Python' });
    const roles = within(within(dialog).getByRole('list', { name: 'Roles' })).getAllByRole(
      'button'
    );
    expect(roles.map((r) => r.textContent)).toEqual([
      'Together AIStaff Engineer02/2025 - Present (opens role details)',
      'MetaData Engineer2019 - 2022 (opens role details)',
    ]);
    expect(within(dialog).getByRole('button', { name: /QR Project/ })).toBeInTheDocument();
    expect(within(dialog).queryByText(/Old Co/)).toBeNull();
  });

  it('shows an honest empty state for a skill no role or project names', async () => {
    render(<Harness initial="rust" />);
    const dialog = await screen.findByRole('dialog', { name: 'Rust' });
    expect(within(dialog).getByText(/Not tied to a specific role or project/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('list', { name: 'Roles' })).toBeNull();
  });

  it('shows a loading state while the content data is not here yet', async () => {
    dataState = { experienceData: null, projectsData: null, isLoading: true };
    render(<Harness />);
    expect(await screen.findByText(/Loading roles and projects/)).toBeInTheDocument();
  });

  it('opens a role from the list: closes, drops ?skill= and sets ?company=', async () => {
    window.history.replaceState({}, '', '/?skill=python');
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(await screen.findByRole('button', { name: /Together AI/ }));
    expect(onClose).toHaveBeenCalled();
    const params = new URLSearchParams(window.location.search);
    expect(params.get('company')).toBe('together_ai');
    expect(params.get('skill')).toBeNull();
  });

  it('opens a project the same way', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(await screen.findByRole('button', { name: /QR Project/ }));
    expect(new URLSearchParams(window.location.search).get('project')).toBe('qr');
    expect(onClose).toHaveBeenCalled();
  });

  it('lists only related skills that exist and navigates to one in place', async () => {
    const onNavigate = vi.fn();
    render(
      <SkillModalHost
        skillsData={skillsData}
        skillKey="python"
        onClose={() => {}}
        onNavigate={onNavigate}
      />
    );
    const dialog = await screen.findByRole('dialog', { name: 'Python' });
    const related = within(
      within(dialog).getByRole('heading', { name: 'Related skills' }).parentElement as HTMLElement
    );
    expect(related.getAllByRole('button').map((b) => b.textContent)).toEqual(['Kafka']);
    fireEvent.click(related.getByRole('button', { name: 'Kafka' }));
    expect(onNavigate).toHaveBeenCalledWith('kafka');
    expect(await screen.findByRole('dialog', { name: 'Kafka' })).toBeInTheDocument();
  });

  it('steps through the category with the buttons and the arrow keys', async () => {
    render(<Harness initial="go" />);
    const dialog = await screen.findByRole('dialog', { name: 'Go' });
    const pager = within(dialog).getByRole('navigation', { name: 'More in Programming Languages' });
    expect(pager).toHaveTextContent('2 of 3');
    fireEvent.click(within(pager).getByRole('button', { name: /Next/ }));
    expect(await screen.findByRole('dialog', { name: 'Rust' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'ArrowLeft' });
    expect(await screen.findByRole('dialog', { name: 'Go' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'ArrowLeft' });
    expect(await screen.findByRole('dialog', { name: 'Python' })).toBeInTheDocument();
    // First of the category: Previous is disabled and ArrowLeft does nothing
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'ArrowLeft' });
    expect(screen.getByRole('dialog', { name: 'Python' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
  });

  it('steps with the arrow key while focus is on the close button', async () => {
    render(<Harness initial="go" />);
    const close = await screen.findByRole('button', { name: 'Close' });
    close.focus();
    fireEvent.keyDown(close, { key: 'ArrowRight' });
    expect(await screen.findByRole('dialog', { name: 'Rust' })).toBeInTheDocument();
  });

  it('ignores arrow keys typed into a field', async () => {
    render(<Harness initial="go" />);
    const dialog = await screen.findByRole('dialog', { name: 'Go' });
    const input = document.createElement('input');
    dialog.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(screen.getByRole('dialog', { name: 'Go' })).toBeInTheDocument();
    input.remove();
  });

  it('hides the pager for a category of one and the docs link when the data has none', async () => {
    render(<Harness initial="lonely" />);
    const dialog = await screen.findByRole('dialog', { name: 'Lonely' });
    expect(within(dialog).queryByRole('navigation')).toBeNull();
    expect(within(dialog).queryByRole('link')).toBeNull();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await screen.findByRole('dialog', { name: 'Python' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  describe('Ask the assistant', () => {
    it('opens the chat with the prompt parked for it', async () => {
      const onClose = vi.fn();
      const listener = vi.fn();
      window.addEventListener('portfolio:chat-prefill', listener);
      render(<Harness onClose={onClose} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Ask the assistant about this' }));
      expect(new URLSearchParams(window.location.search).get('ai_chat')).toBe('open');
      expect(sessionStorage.getItem(CHAT_PREFILL_KEY)).toContain('Python');
      expect(listener).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      window.removeEventListener('portfolio:chat-prefill', listener);
    });

    it('is hidden when the assistant is unavailable', async () => {
      setChatAvailable(false);
      render(<Harness />);
      await screen.findByRole('dialog', { name: 'Python' });
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Ask the assistant about this' })).toBeNull()
      );
    });
  });
});

it('shows hands-on use without inventing a duration when years are unspecified', async () => {
  const previousYears = skillsData.python.years_of_experience;
  skillsData.python.years_of_experience = 0;
  try {
    render(<Harness />);
    const dialog = await screen.findByRole('dialog', { name: 'Python' });
    expect(within(dialog).getByText('Hands-on use')).toBeInTheDocument();
    expect(within(dialog).queryByText('0 years')).not.toBeInTheDocument();
  } finally {
    skillsData.python.years_of_experience = previousYears;
  }
});
