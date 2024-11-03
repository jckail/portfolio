import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/app';
import { ResumeProvider } from '@/features/resume/components/resume-provider';
import { AppLogicProvider } from '@/app/providers/app-logic-provider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppLogicProvider>
      <ResumeProvider>
        <App />
      </ResumeProvider>
    </AppLogicProvider>
  </React.StrictMode>
);
