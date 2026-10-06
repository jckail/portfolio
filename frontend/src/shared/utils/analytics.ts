/** Retired visitor analytics. Keep feature call signatures without tracking. */
type GtagParams = Record<string, unknown>;
declare global {
  interface Window {
    gtag: (command: string, action: string, params?: GtagParams) => void;
    dataLayer: unknown[];
  }
}
export { TRACKABLE_ANCHORS } from './analytics-anchors';

export const getSessionId = (): string => '';

export const trackThemeChange = async (
  _newTheme: string,
  _previousTheme: string
): Promise<void> => {};

export const trackAnchorChange = async (
  _newAnchor: string,
  _oldAnchor: string | null = null
): Promise<void> => {};

export const trackModalView = async (
  _modalId: string,
  _modalType: string,
  _modalTitle: string
): Promise<void> => {};

export const trackModalClose = async (
  _modalId: string,
  _modalType: string,
  _duration: number
): Promise<void> => {};

export const trackPageView = async (_path: string): Promise<void> => {};

export const trackSectionView = async (_sectionId: string): Promise<void> => {};

export const trackSocialClick = async (
  _platform: string,
  _action: string = 'visit',
  _url: string
): Promise<void> => {};

export const trackResumeDownload = async (
  _format: string,
  _version: string,
  _source: string
): Promise<void> => {};

export const trackResumeView = async (_format: string, _source: string): Promise<void> => {};

export const trackChatOpen = async (): Promise<void> => {};

export const trackChatMessage = async (
  _messageType: 'sent' | 'received',
  _messageLength: number
): Promise<void> => {};

export const trackContactOpened = async (): Promise<void> => {};

export const trackContactMessage = async (_messageLength: number): Promise<void> => {};

export const initializeAnalytics = async (): Promise<void> => {};
