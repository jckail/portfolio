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

// Track section views
export const trackSectionView = (sectionId) => {
  const formattedSection = sectionId.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  ReactGA.event({
    category: Events.Categories.NAVIGATION,
    action: 'View Section',
    label: formattedSection
  });
  console.info('Section view tracked:', formattedSection);
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
    RESUME: 'Resume'
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

// Custom hook for Google Analytics
export const useGoogleAnalytics = () => {
  React.useEffect(() => {
    initGA();
    trackPageView();
  }, []);

  return {
    trackPageView,
    trackResumeButtonClick,
    trackSectionView,
    logEvent
  };
};
