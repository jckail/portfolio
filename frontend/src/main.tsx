import React from 'react';
import ReactDOM from 'react-dom/client';

import { ThemeProvider } from './app/providers/theme-provider';
import App from './app/app';
import './styles/base/variables.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
