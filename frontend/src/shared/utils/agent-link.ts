import { useThemeStore } from '../stores/theme-store';

export function agentHref(): string {
  return `/agent?theme=${encodeURIComponent(useThemeStore.getState().theme)}`;
}
export const OPEN_AGENT_EVENT = 'portfolio:open-agent';
export function openAgent() {
  if (window.location.pathname === '/agent') return;
  window.dispatchEvent(new Event(OPEN_AGENT_EVENT));
}
