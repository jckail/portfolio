import React from 'react';
import { Box, Container, styled } from '@mui/material';
import Header from '../../../features/resume/components/header';
import { useResume } from '../../../features/resume/components/resume-provider';
import { useAppLogic } from '../../../app/providers/app-logic-provider';
import { useAdminStore } from '../../../features/admin/stores/admin-store';

interface MainLayoutProps {
  children: React.ReactNode;
}

// Define header height in theme units
const HEADER_HEIGHT = 64; // 8 spacing units * 8px = 64px

const LayoutRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  transition: theme.transitions.create(['background-color'], {
    duration: theme.transitions.duration.standard,
  }),
  position: 'relative',
  zIndex: 3,
}));

const MainContent = styled('main')(({ theme }) => ({
  flexGrow: 1,
  paddingTop: HEADER_HEIGHT,
  width: '100%',
  position: 'relative',
  backgroundColor: theme.palette.background.default,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
}));

const StyledContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    paddingTop: theme.spacing(6),
    paddingBottom: theme.spacing(6),
  },
}));

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { resumeData } = useResume();
  const { theme, toggleTheme } = useAppLogic();
  const { isLoggedIn: isAdminLoggedIn } = useAdminStore();

  const handleResumeClick = () => {
    const resumeSection = document.getElementById('resume');
    if (resumeSection) {
      const yOffset = -HEADER_HEIGHT; // Account for fixed header
      const y = resumeSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleAdminClick = () => {
    // This should be handled by the admin feature
    console.log('Admin click');
  };

  return (
    <LayoutRoot>
      <Header 
        resumeData={resumeData}
        theme={theme}
        toggleTheme={toggleTheme}
        handleResumeClick={handleResumeClick}
        handleAdminClick={handleAdminClick}
        isAdminLoggedIn={isAdminLoggedIn}
      />
      <MainContent>
        <StyledContainer maxWidth="lg">
          {children}
        </StyledContainer>
      </MainContent>
    </LayoutRoot>
  );
};
