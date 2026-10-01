import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';

import { ThemeProvider } from './app/providers/theme-provider';
import './styles/base/variables.css';

const App = lazy(() => import('./app/app'));
const DataPlayground = lazy(() => import('./app/dataplayground/data-playground'));
const isDataPlayground = /^\/dataplayground\/?$/.test(window.location.pathname);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Suspense fallback={<p role="status">Loading…</p>}>
        {isDataPlayground ? <DataPlayground /> : <App />}
      </Suspense>
    </ThemeProvider>
  </React.StrictMode>
);
