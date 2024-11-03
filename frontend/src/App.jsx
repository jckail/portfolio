import React from 'react';
import './App.css';
import Header from './components/Header';
import MainContent from './components/MainContent';
import { ParticlesProvider } from './components/ParticlesProvider';
import { ResumeProvider } from './components/ResumeProvider';
import { AppLogicProvider, AppContent } from './components/AppLogicProvider';
import CookieBanner from './components/CookieBanner';
import BrowserBanner from './components/BrowserBanner';

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
