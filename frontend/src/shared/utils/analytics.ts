declare global {
  interface Window {
    gtag: (
      command: string,
      action: string,
      params?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

const DEBUG = true;
const debugLog = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[Analytics] ${message}`, data ? JSON.stringify(data) : '');
  }
};

const isGtagLoaded = (): boolean => {
  return typeof window.gtag === 'function';
};

// Wait for gtag to be available
const waitForGtag = (): Promise<void> => {
  return new Promise((resolve) => {
    if (isGtagLoaded()) {
      resolve();
      return;
    }

    const checkInterval = setInterval(() => {
      if (isGtagLoaded()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      debugLog('Warning: gtag not loaded after 5 seconds');
      resolve();
    }, 5000);
  });
};

// Generate a unique session ID
const generateSessionId = (): string => {
  return 'sid_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Get or create session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('ga_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('ga_session_id', sessionId);
    debugLog('Generated new session ID:', sessionId);
  }
  return sessionId;
};

// Safe wrapper for gtag calls
const safeGtagCall = (
  command: string,
  action: string,
  params?: Record<string, any>
): void => {
  try {
    if (!isGtagLoaded()) {
      debugLog('gtag not available, skipping event:', action);
      return;
    }
    window.gtag(command, action, params);
    debugLog(`Event tracked: ${action}`, params);
  } catch (error) {
    debugLog('Error tracking event:', error);
  }
};

// Section metadata for analytics
const sectionMetadata: Record<string, Record<string, string>> = {
  about: {
    title: 'About Me',
    category: 'Profile Section',
    type: 'Introduction'
  },
  experience: {
    title: 'Work Experience',
    category: 'Career Section',
    type: 'Professional History'
  },
  projects: {
    title: 'Projects',
    category: 'Portfolio Section',
    type: 'Work Samples'
  },
  skills: {
    title: 'Technical Skills',
    category: 'Skills Section',
    type: 'Capabilities'
  },
  resume: {
    title: 'Resume',
    category: 'Document Section',
    type: 'Career Summary'
  }
};

// Get full page path including hash
const getFullPagePath = (): string => {
  const pathname = window.location.pathname;
  const hash = window.location.hash;
  return hash ? `${pathname}${hash}` : pathname;
};

// Track URL anchor change
export const trackAnchorChange = async (
  newAnchor: string,
  oldAnchor: string | null = null
): Promise<void> => {
  await waitForGtag();
  const sessionId = getSessionId();
  const fullPath = getFullPagePath();
  
  safeGtagCall('event', 'anchor_change', {
    new_anchor: newAnchor,
    previous_anchor: oldAnchor,
    page_path: fullPath,
    session_id: sessionId
  });

  // Also send a page_view event to ensure it shows up in GA realtime
  safeGtagCall('event', 'page_view', {
    page_path: fullPath,
    page_title: document.title,
    session_id: sessionId
  });
};

// Track modal view
export const trackModalView = async (
  modalId: string,
  modalType: string,
  modalTitle: string
): Promise<void> => {
  await waitForGtag();
  const sessionId = getSessionId();
  const fullPath = getFullPagePath();
  
  safeGtagCall('event', 'modal_view', {
    modal_id: modalId,
    modal_type: modalType,
    modal_title: modalTitle,
    page_path: fullPath,
    session_id: sessionId
  });

  // Also send a page_view event to ensure it shows up in GA realtime
  safeGtagCall('event', 'page_view', {
    page_path: fullPath,
    page_title: modalTitle,
    session_id: sessionId
  });
};

// Track modal close
export const trackModalClose = async (
  modalId: string,
  modalType: string,
  duration: number
): Promise<void> => {
  await waitForGtag();
  const sessionId = getSessionId();
  safeGtagCall('event', 'modal_close', {
    modal_id: modalId,
    modal_type: modalType,
    view_duration: duration,
    page_path: getFullPagePath(),
    session_id: sessionId
  });
};

// Track page view
export const trackPageView = async (path: string): Promise<void> => {
  await waitForGtag();
  const sessionId = getSessionId();
  const fullPath = path + window.location.hash;
  
  safeGtagCall('event', 'page_view', {
    page_path: fullPath,
    page_title: document.title,
    session_id: sessionId
  });
};

// Track section view
export const trackSectionView = async (sectionId: string): Promise<void> => {
  await waitForGtag();
  const sessionId = getSessionId();
  const metadata = sectionMetadata[sectionId] || {
    title: sectionId,
    category: 'Unknown Section',
    type: 'Custom Section'
  };
  const fullPath = getFullPagePath();
  
  safeGtagCall('event', 'section_view', {
    section_id: sectionId,
    section_title: metadata.title,
    section_category: metadata.category,
    section_type: metadata.type,
    page_path: fullPath,
    session_id: sessionId
  });

  // Also send a page_view event to ensure it shows up in GA realtime
  safeGtagCall('event', 'page_view', {
    page_path: fullPath,
    page_title: metadata.title,
    session_id: sessionId
  });
};

// Track social link click
export const trackSocialClick = async (
  platform: string,
  action: string = 'visit',
  url: string
): Promise<void> => {
  await waitForGtag();
  const sessionId = getSessionId();
  safeGtagCall('event', 'social_interaction', {
    platform: platform,
    action: action,
    destination_url: url,
    interaction_type: 'outbound',
    session_id: sessionId
  });
};

// Track resume download
export const trackResumeDownload = async (
  format: string,
  version: string,
  source: string
): Promise<void> => {
  await waitForGtag();
  const sessionId = getSessionId();
  safeGtagCall('event', 'resume_download', {
    format: format,
    version: version,
    source: source,
    download_type: 'direct',
    session_id: sessionId
  });
};

// Track resume view
export const trackResumeView = async (
  format: string,
  source: string
): Promise<void> => {
  await waitForGtag();
  const sessionId = getSessionId();
  safeGtagCall('event', 'resume_view', {
    format: format,
    source: source,
    view_type: 'inline',
    session_id: sessionId
  });
};

// Initialize analytics with route tracking
export const initializeAnalytics = async (): Promise<void> => {
  debugLog('Initializing analytics...');
  await waitForGtag();
  
  // Track initial page load with full path
  const fullPath = getFullPagePath();
  trackPageView(fullPath);

  // Track initial anchor if present
  const initialAnchor = window.location.hash.slice(1);
  if (initialAnchor) {
    trackAnchorChange(initialAnchor);
  }

  debugLog('Analytics initialized');
};
