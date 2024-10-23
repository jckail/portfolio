import React from 'react';
import ReactGA from 'react-ga4';

const GA_CONFIG = {
  TRACKING_ID: 'G-GDZX9ZYNHS',
  EVENTS: {
    PAGEVIEW: 'pageview',
    CUSTOM: 'event'
  },
  CATEGORIES: {
    NAVIGATION: 'Navigation',
    INTERACTION: 'Interaction',
    FORM: 'Form',
    RESUME: 'Resume',
    SECTION: 'Section'
  },
  ACTIONS: {
    CLICK: 'Click',
    SUBMIT: 'Submit',
    DOWNLOAD: 'Download',
    VIEW: 'View'
  }
};

const logGAEvent = (type, data) => console.info('GA Event:', { type, ...data });

const formatSectionTitle = (sectionId) => 
  sectionId.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const gaService = {
  init: () => {
    ReactGA.initialize(GA_CONFIG.TRACKING_ID);
    console.info('Google Analytics initialized with tracking ID:', GA_CONFIG.TRACKING_ID);
  },

  trackPageView: (page = window.location.pathname + window.location.search, title = 'N/A') => {
    const data = { hitType: GA_CONFIG.EVENTS.PAGEVIEW, page, title };
    ReactGA.send(data);
    logGAEvent(GA_CONFIG.EVENTS.PAGEVIEW, data);
  },

  trackEvent: (category, action, label) => {
    const data = { category, action, label };
    ReactGA.event(data);
    logGAEvent(GA_CONFIG.EVENTS.CUSTOM, data);
  },

  trackResumeDownload: () => {
    gaService.trackEvent(
      GA_CONFIG.CATEGORIES.RESUME,
      GA_CONFIG.ACTIONS.DOWNLOAD,
      'Resume Download'
    );
  }
};

export const useGoogleAnalytics = () => {
  React.useEffect(() => {
    gaService.init();
    gaService.trackPageView();

    const handleHashChange = () => {
      const sectionId = window.location.hash.slice(1);
      if (sectionId) {
        gaService.trackPageView(
          `/${sectionId}`,
          formatSectionTitle(sectionId)
        );
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    if (window.location.hash) handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return {
    trackPageView: gaService.trackPageView,
    trackResumeButtonClick: gaService.trackResumeDownload,
    logEvent: gaService.trackEvent
  };
};

// Export aliases for backward compatibility
export const GA = gaService;
export const Events = GA_CONFIG;
