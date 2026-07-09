import { scrollToSection } from './scroll-utils';
import { setQueryParam } from './url-params';

export type ChatAction =
  | { action: 'navigate'; target: string }
  | { action: 'open_modal'; kind: string; key?: string | null }
  | { action: 'download_resume' };

const SECTION_IDS = new Set([
  'about',
  'experience',
  'projects',
  'skills',
  'resume',
  'doodle',
]);

/**
 * Execute a validated action frame from the chat assistant.
 * Returns a short human label for an optional UI toast/note.
 */
export function executeChatAction(payload: ChatAction): string | null {
  if (payload.action === 'navigate') {
    const target = payload.target?.toLowerCase();
    if (!SECTION_IDS.has(target)) return null;
    if (target === 'doodle') {
      window.history.pushState(null, '', '#doodle');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    scrollToSection(target);
    return `Opened ${target}`;
  }

  if (payload.action === 'open_modal') {
    const { kind, key } = payload;
    if (kind === 'contact') {
      setQueryParam('contact', 'open');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return 'Opened contact';
    }
    if (!key) return null;
    if (kind === 'company') {
      setQueryParam('company', key);
      scrollToSection('experience');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return `Opened ${key}`;
    }
    if (kind === 'skill') {
      setQueryParam('skill', key);
      scrollToSection('skills');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return `Opened ${key}`;
    }
    if (kind === 'project') {
      setQueryParam('project', key);
      scrollToSection('projects');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return `Opened ${key}`;
    }
    return null;
  }

  if (payload.action === 'download_resume') {
    const link = document.createElement('a');
    link.href = '/api/resume?download=1';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    scrollToSection('resume');
    return 'Downloading resume';
  }

  return null;
}
