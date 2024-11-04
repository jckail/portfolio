import React, { useEffect } from 'react';
import { 
  Box, 
  Stack,
  CircularProgress,
  Alert,
  AlertTitle,
  Paper,
  Typography,
  styled,
  useTheme
} from '@mui/material';
import TechnicalSkills from './sections/technical-skills';
import Experience from './sections/experience';
import Projects from './sections/projects';
import MyResume from './sections/my-resume';
import AboutMe from './sections/about-me';
import { ResumeData } from '../types';
import { useResume } from './resume-provider';
import { useScrollSpy } from '../../../shared/hooks/use-scroll-spy';

interface MainContentProps {
  resumeData: ResumeData | null;
  error: string | null | undefined;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  backgroundColor: theme.palette.background.paper,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: theme.shape.borderRadius * 2,
  border: `1px solid ${theme.palette.divider}`,
  transition: theme.transitions.create(
    ['transform', 'box-shadow', 'border-color', 'background-color'],
    {
      duration: theme.transitions.duration.standard,
      easing: theme.transitions.easing.easeInOut,
    }
  ),
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.mode === 'light'
      ? 'rgba(255, 255, 255, 0.95)'
      : 'rgba(20, 20, 20, 0.95)',
  },
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(6),
  },
}));

const Section = styled('section')(({ theme }) => ({
  marginBottom: theme.spacing(6),
  opacity: 0,
  transform: 'translateY(20px)',
  animation: 'fadeInUp 0.6s ease forwards',
  '@keyframes fadeInUp': {
    '0%': {
      opacity: 0,
      transform: 'translateY(20px)',
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  '&:nth-of-type(1)': { animationDelay: '0.1s' },
  '&:nth-of-type(2)': { animationDelay: '0.2s' },
  '&:nth-of-type(3)': { animationDelay: '0.3s' },
  '&:nth-of-type(4)': { animationDelay: '0.4s' },
  '&:nth-of-type(5)': { animationDelay: '0.5s' },
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  gap: theme.spacing(3),
  animation: 'fadeIn 0.3s ease',
  '@keyframes fadeIn': {
    '0%': { opacity: 0 },
    '100%': { opacity: 1 },
  },
}));

const StyledCircularProgress = styled(CircularProgress)(({ theme }) => ({
  color: theme.palette.primary.main,
  '& .MuiCircularProgress-circle': {
    strokeLinecap: 'round',
  },
}));

const MainContent: React.FC<MainContentProps> = ({ resumeData, error }) => {
  const { isLoading } = useResume();
  const theme = useTheme();
  useScrollSpy();

  useEffect(() => {
    if (!isLoading && resumeData) {
      window.dispatchEvent(new Event('resize'));
    }
  }, [isLoading, resumeData]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <StyledCircularProgress size={48} thickness={4} />
        <Typography 
          variant="h6" 
          color="textSecondary"
          sx={{ 
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}
        >
          Loading resume data...
        </Typography>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error"
          sx={{
            borderRadius: theme.shape.borderRadius * 1.5,
            '& .MuiAlert-icon': {
              fontSize: 28,
            },
          }}
        >
          <AlertTitle sx={{ fontWeight: 600 }}>Error</AlertTitle>
          <Typography variant="body1">{error}</Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 1,
              opacity: 0.8,
              fontStyle: 'italic',
            }}
          >
            Please try refreshing the page.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!resumeData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="warning"
          sx={{
            borderRadius: theme.shape.borderRadius * 1.5,
            '& .MuiAlert-icon': {
              fontSize: 28,
            },
          }}
        >
          <AlertTitle sx={{ fontWeight: 600 }}>No Data Available</AlertTitle>
          <Typography variant="body1">
            No resume data available. Please try refreshing the page.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Stack 
        spacing={6} 
        sx={{ 
          width: '100%', 
          alignItems: 'stretch',
          mb: 8,
        }}
      >
        <Section id="about">
          <StyledPaper elevation={4}>
            <AboutMe aboutMe={resumeData.aboutMe} />
          </StyledPaper>
        </Section>
        
        <Section id="skills">
          <StyledPaper elevation={4}>
            <TechnicalSkills skills={resumeData.technicalSkills} />
          </StyledPaper>
        </Section>
        
        <Section id="experience">
          <StyledPaper elevation={4}>
            <Experience experience={resumeData.experience} />
          </StyledPaper>
        </Section>
        
        <Section id="projects">
          <StyledPaper elevation={4}>
            <Projects projects={resumeData.projects} />
          </StyledPaper>
        </Section>
        
        <Section id="resume">
          <StyledPaper elevation={4}>
            <MyResume />
          </StyledPaper>
        </Section>
      </Stack>
    </Box>
  );
};

export default MainContent;
