import React from 'react';
import { 
  Box, 
  Typography, 
  Grid,
  Card,
  CardContent,
  Button,
  styled,
  useTheme
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import { ResumeData } from '../../types';

interface ProjectsProps {
  projects: ResumeData['projects'];
}

const SectionHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderBottom: `2px solid ${theme.palette.primary.main}`,
  paddingBottom: theme.spacing(1),
}));

const ProjectCard = styled(Card)<{ index: number }>(({ theme, index }) => ({
  height: '100%',
  backgroundColor: theme.palette.background.paper,
  animation: 'fadeIn 0.5s ease-out forwards',
  animationDelay: `${index * 0.1}s`,
  opacity: 0,
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
      transform: 'translateY(20px)'
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)'
    }
  },
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.standard,
  }),
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.shadows[8],
  },
}));

const ProjectTitle = styled(Typography)({
  fontWeight: 600,
  marginBottom: 2,
  transition: 'color 0.2s ease',
  '&:hover': {
    color: 'inherit',
  },
});

const ButtonContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

const Projects: React.FC<ProjectsProps> = ({ projects = [] }) => {
  const theme = useTheme();

  return (
    <Box>
      <SectionHeader>
        <Typography variant="h2" component="h2" gutterBottom={false}>
          Projects
        </Typography>
      </SectionHeader>
      <Grid container spacing={3}>
        {projects.map((project, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <ProjectCard index={index} elevation={2}>
              <CardContent>
                <ProjectTitle variant="h6">
                  <Box 
                    component="a" 
                    href={project.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    sx={{ 
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'block',
                    }}
                  >
                    {project.title}
                  </Box>
                </ProjectTitle>
                <Typography 
                  variant="body2" 
                  color="textSecondary"
                  sx={{ mb: 2 }}
                >
                  {project.description}
                </Typography>
                <ButtonContainer>
                  <Button
                    variant="contained"
                    color="primary"
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<LaunchIcon />}
                    size="small"
                  >
                    View Project
                  </Button>
                  {project.link2 && (
                    <Button
                      variant="outlined"
                      color="primary"
                      href={project.link2}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<LaunchIcon />}
                      size="small"
                    >
                      Live Demo
                    </Button>
                  )}
                </ButtonContainer>
              </CardContent>
            </ProjectCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Projects;
