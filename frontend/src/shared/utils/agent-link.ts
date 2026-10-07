import { useThemeStore } from '../stores/theme-store';

export function agentHref(): string {
  return `/agent?theme=${encodeURIComponent(useThemeStore.getState().theme)}`;
}
export function openAgent() { window.location.assign(agentHref()); }
