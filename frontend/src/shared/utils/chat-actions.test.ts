import { describe, it, expect, beforeEach, vi } from 'vitest';

import { executeChatAction } from './chat-actions';

describe('executeChatAction', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    document.body.innerHTML = `
      <div id="about"></div>
      <div id="experience"></div>
      <div id="projects"></div>
      <div id="skills"></div>
      <div id="resume"></div>
    `;
    // scrollIntoView is missing in jsdom
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('navigates to a known section', () => {
    const label = executeChatAction({ action: 'navigate', target: 'projects' });
    expect(label).toBe('Opened projects');
  });

  it('rejects unknown sections', () => {
    expect(executeChatAction({ action: 'navigate', target: 'admin' })).toBeNull();
  });

  it('opens contact via query param', () => {
    const label = executeChatAction({ action: 'open_modal', kind: 'contact' });
    expect(label).toBe('Opened contact');
    expect(new URLSearchParams(window.location.search).get('contact')).toBe('open');
  });

  it('opens a project deep link', () => {
    const label = executeChatAction({
      action: 'open_modal',
      kind: 'project',
      key: 'jobbr',
    });
    expect(label).toBe('Opened jobbr');
    expect(new URLSearchParams(window.location.search).get('project')).toBe('jobbr');
  });
});
