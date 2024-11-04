import React, { useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress,
  Alert,
  AlertTitle
} from '@mui/material';
import TechnicalSkills from '../sections/technical-skills';
import Experience from '../sections/experience';
import Projects from '../sections/projects';
import MyResume from '../sections/my-resume';
import AboutMe from '../sections/about-me';
import { ResumeData } from '../../types';
import { useResume } from '../resume-provider';
import { useScrollSpy } from '../../../../shared/hooks/use-scroll-spy';

interface MainContentProps {
  resumeData: ResumeData | null;
  error: string | null | undefined;
}

const MainContent: React.FC<MainContentProps> = ({ resumeData, error }) => {
  const { isLoading } = useResume();
  useScrollSpy(); // Initialize scroll spy

  useEffect(() => {
    // Force a layout recalculation after content loads
    if (!isLoading && resumeData) {
      window.dispatchEvent(new Event('resize'));
    }
  }, [isLoading, resumeData]);

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2
        }}
      >
        <CircularProgress size={40} color="primary" />
        <Typography variant="body1" color="textSecondary">
          Loading resume data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
          <Typography variant="body2" sx={{ mt: 1 }}>
            Please try refreshing the page.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!resumeData) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">
          <AlertTitle>No Data Available</AlertTitle>
          <Typography variant="body2">
            No resume data available. Please try refreshing the page.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ width: '100%', '& > section': { mb: 4 } }}>
        <Box id="about" component="section">
          <AboutMe aboutMe={resumeData.aboutMe} />
        </Box>
        <Box id="skills" component="section">
          <TechnicalSkills skills={resumeData.technicalSkills} />
        </Box>
        <Box id="experience" component="section">
          <Experience experience={resumeData.experience} />
        </Box>
        <Box id="projects" component="section">
          <Projects projects={resumeData.projects} />
        </Box>
        <Box id="resume" component="section">
          <MyResume />
        </Box>
      </Box>
    </Box>
  );
};

export default MainContent;
