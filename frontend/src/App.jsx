import React from 'react';
import './App.css';
import './theme.css';
import { ResumeProvider } from './components/ResumeProvider';
import { AppLogicProvider, AppContent } from './components/AppLogicProvider';

function App() {
  return (
    <AppLogicProvider>
      <ResumeProvider>
        <AppContent />
      </ResumeProvider>
    </AppLogicProvider>
  );
}

export default App;
