import React from 'react';
import { Box, Typography, styled } from '@mui/material';

interface AboutMeProps {
  aboutMe: string;
}

const SectionHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderBottom: `2px solid ${theme.palette.primary.main}`,
  paddingBottom: theme.spacing(1),
}));

const AboutMe: React.FC<AboutMeProps> = ({ aboutMe }) => {
  if (!aboutMe) {
    return null;
  }

  return (
    <Box>
      <SectionHeader>
        <Typography variant="h2" component="h2" gutterBottom={false}>
          About Me
        </Typography>
      </SectionHeader>
      <Box>
        {aboutMe.split('\n\n').map((paragraph, index) => (
          paragraph.trim() && (
            <Typography 
              key={index} 
              variant="body1" 
              paragraph 
              sx={{ 
                lineHeight: 1.6,
                '&:last-child': {
                  marginBottom: 0
                }
              }}
            >
              {paragraph.trim()}
            </Typography>
          )
        ))}
      </Box>
    </Box>
  );
};

export default AboutMe;
