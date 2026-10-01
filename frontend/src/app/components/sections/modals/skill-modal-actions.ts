import { scrollToSection } from '../../../../shared/utils/scroll-utils';
import { setQueryParam } from '../../../../shared/utils/url-params';

/**
 * Hand-offs from a skill dialog to the rest of the page. Each one removes the
 * ?skill= param first and tells the owner of the skill dialog to close, so the
 * popstate that wakes the next section cannot re-open this dialog.
 */

/** Set by the skill dialog, read by the chat once it mounts (see skillChat). */
export const CHAT_PREFILL_KEY = 'portfolio:chat-prefill';
export const CHAT_PREFILL_EVENT = 'portfolio:chat-prefill';

function settleThenScroll(section: string) {
  // The dialog's scroll lock is released when it unmounts, after this tick.
  window.setTimeout(() => scrollToSection(section), 60);
}

function handOff(param: string, value: string, section: string, close: () => void) {
  setQueryParam('skill', null, { replace: true });
  setQueryParam(param, value);
  close();
  window.dispatchEvent(new PopStateEvent('popstate'));
  settleThenScroll(section);
}

/** Open the experience dialog for a role (?company=<data key>). */
export function openRole(roleKey: string, close: () => void) {
  handOff('company', roleKey, 'experience', close);
}

/** Open the project dialog (?project=<data key>). */
export function openProject(projectKey: string, close: () => void) {
  handOff('project', projectKey, 'projects', close);
}

/**
 * Open the AI assistant with a question ready. The prompt is parked in
 * sessionStorage and announced on `portfolio:chat-prefill` so the chat can
 * pick it up whether it is already mounted or still loading; the assistant
 * opens with ?ai_chat=open either way.
 */
export function askAssistant(prompt: string, close: () => void) {
  try {
    sessionStorage.setItem(CHAT_PREFILL_KEY, prompt);
  } catch {
    // Storage can be blocked; the event below still reaches a mounted chat.
  }
  setQueryParam('skill', null, { replace: true });
  setQueryParam('ai_chat', 'open');
  close();
  window.dispatchEvent(new CustomEvent(CHAT_PREFILL_EVENT, { detail: { prompt } }));
  window.dispatchEvent(new PopStateEvent('popstate'));
}
