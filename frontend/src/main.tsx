import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppLogicProvider } from './app/providers/app-logic-provider';
import { ThemeProvider } from './app/providers/theme-provider';
import App from './app/app';
import './styles/base/variables.css';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppLogicProvider>
        <ThemeProvider>
          
            <App />
          
        </ThemeProvider>
      </AppLogicProvider>
    </BrowserRouter>
  </React.StrictMode>
);
