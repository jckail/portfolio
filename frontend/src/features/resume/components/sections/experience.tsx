import React from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem,
  Link,
  Paper,
  styled,
  useTheme
} from '@mui/material';
import { ResumeData } from '../../types';

interface ExperienceProps {
  experience?: ResumeData['experience'];
}

const SectionHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderBottom: `2px solid ${theme.palette.primary.main}`,
  paddingBottom: theme.spacing(1),
}));

const TimelineItem = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  marginBottom: theme.spacing(4),
  '&:last-child': {
    marginBottom: 0
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    left: -8,
    top: 32,
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: theme.palette.primary.main,
    border: `2px solid ${theme.palette.background.paper}`,
    zIndex: 1,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    left: -1,
    top: 48,
    bottom: -32,
    width: 2,
    backgroundColor: theme.palette.divider,
    display: 'block',
  },
  '&:last-child::after': {
    display: 'none',
  },
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.standard,
  }),
  '&:hover': {
    transform: 'translateX(8px)',
    boxShadow: theme.shadows[4],
  },
}));

const TimelineMeta = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(2),
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(0.5, 0),
  '&::before': {
    content: '"•"',
    color: theme.palette.primary.main,
    marginRight: theme.spacing(1),
  },
}));

const Experience: React.FC<ExperienceProps> = ({ experience = [] }) => {
  const theme = useTheme();

  return (
    <Box>
      <SectionHeader>
        <Typography variant="h2" component="h2" gutterBottom={false}>
          Experience
        </Typography>
      </SectionHeader>
      <Box sx={{ position: 'relative', pl: 3 }}>
        {experience.map((item, index) => (
          <TimelineItem key={index} elevation={2}>
            <Box>
              <Typography 
                variant="h3" 
                component="h3"
                sx={{ 
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  mb: 1
                }}
              >
                {item.title}
              </Typography>
              <Typography 
                variant="h4" 
                component="h4"
                sx={{ 
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  color: theme.palette.primary.main,
                  mb: 1
                }}
              >
                {item.company}
              </Typography>
              <TimelineMeta>
                <Typography variant="body2">
                  {item.date}
                </Typography>
              </TimelineMeta>
              {item.responsibilities && (
                <List disablePadding sx={{ mb: 2 }}>
                  {item.responsibilities.map((responsibility, idx) => (
                    <StyledListItem key={idx} disableGutters>
                      <Typography variant="body2">
                        {responsibility}
                      </Typography>
                    </StyledListItem>
                  ))}
                </List>
              )}
              {item.link && (
                <Link
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-block',
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Company Website
                </Link>
              )}
            </Box>
          </TimelineItem>
        ))}
      </Box>
    </Box>
  );
};

export default Experience;
