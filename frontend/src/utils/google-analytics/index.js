import React from 'react';
import ReactGA from 'react-ga4';

const TRACKING_ID = "G-GDZX9ZYNHS";

// Initialize GA4
export const initGA = () => {
  ReactGA.initialize(TRACKING_ID);
  console.info('Google Analytics initialized with tracking ID:', TRACKING_ID);
};

// Track page views
export const trackPageView = (page = window.location.pathname + window.location.search) => {
  ReactGA.send({ 
    hitType: "pageview", 
    page,
    title: "Resume"
  });
  console.info('Page view tracked:', page);
};

// Event tracking
export const logEvent = (category, action, label) => {
  ReactGA.event({
    category,
    action,
    label,
  });
  console.info('GA Event tracked:', { category, action, label });
};

// Custom events structure
export const Events = {
  Categories: {
    NAVIGATION: 'Navigation',
    INTERACTION: 'Interaction',
    FORM: 'Form',
    RESUME: 'Resume',
    SECTION: 'Section'
  },
  Actions: {
    CLICK: 'Click',
    SUBMIT: 'Submit',
    DOWNLOAD: 'Download',
    VIEW: 'View'
  }
};

// Track resume button clicks
export const trackResumeButtonClick = () => {
  const category = Events.Categories.RESUME;
  const action = Events.Actions.DOWNLOAD;
  const label = 'Resume Download';
  
  logEvent(category, action, label);
  console.info('Resume download event tracked:', { category, action, label });
};

// Track section views
export const trackSectionView = (sectionId) => {
  const formattedSection = sectionId.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const category = Events.Categories.SECTION;
  const action = Events.Actions.VIEW;
  const label = `Viewed Section ${formattedSection}`;

  logEvent(category, action, label);
  console.info('Section view tracked:', { category, action, label });
};

// Custom hook for Google Analytics
export const useGoogleAnalytics = () => {
  React.useEffect(() => {
    initGA();
    trackPageView();

    // Track section views when URL hash changes
    const handleHashChange = () => {
      const sectionId = window.location.hash.slice(1); // Remove the # from the hash
      if (sectionId) {
        trackSectionView(sectionId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Track initial section if present in URL
    if (window.location.hash) {
      handleHashChange();
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return {
    trackPageView,
    trackResumeButtonClick,
    logEvent
  };
};
