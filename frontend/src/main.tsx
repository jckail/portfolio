import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';

import App from './app/app';
import { ThemeProvider } from './app/providers/theme-provider';
import { labSlugFromPath } from './app/labs/lab-path';
import { disableBrowserAnalytics } from './shared/utils/cookie-consent';
import './styles/base/variables.css';

disableBrowserAnalytics();

const DataPlayground = lazy(() => import('./app/dataplayground/data-playground'));
const LabHost = lazy(() => import('./app/labs/lab-host'));
const labSlug = labSlugFromPath(window.location.pathname);
const isDataPlayground = /^\/dataplayground\/?$/.test(window.location.pathname);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Suspense fallback={<p role="status">Loading…</p>}>
        {isDataPlayground ? <DataPlayground /> : labSlug ? <LabHost slug={labSlug} /> : <App />}
      </Suspense>
    </ThemeProvider>
  </React.StrictMode>
);
