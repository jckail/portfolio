import React from 'react';
import './App.css';
import './theme.css';
import { ResumeProvider } from './components/ResumeProvider';
import { AppLogicProvider, AppContent } from './components/AppLogicProvider';
import { SidebarProvider } from './components/SidebarProvider';

function App() {
  return (
    <AppLogicProvider>
      <SidebarProvider>
        <ResumeProvider>
          <AppContent />
        </ResumeProvider>
      </SidebarProvider>
    </AppLogicProvider>
  );
}

export default App;
