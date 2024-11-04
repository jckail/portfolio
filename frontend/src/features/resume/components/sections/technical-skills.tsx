import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  List, 
  ListItem,
  styled,
  useTheme
} from '@mui/material';
import { ResumeData } from '../../types';

interface TechnicalSkillsProps {
  skills: ResumeData['technicalSkills'];
}

const SectionHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderBottom: `2px solid ${theme.palette.primary.main}`,
  paddingBottom: theme.spacing(1),
}));

const SkillCategory = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '&:last-child': {
    marginBottom: 0
  }
}));

const StyledListItem = styled(ListItem)<{ index: number }>(({ theme, index }) => ({
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  marginBottom: theme.spacing(1),
  animation: 'fadeIn 0.5s ease-out forwards',
  animationDelay: `${index * 0.1}s`,
  opacity: 0,
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
      transform: 'translateY(10px)'
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)'
    }
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    transform: 'translateY(-2px)',
    transition: theme.transitions.create(['transform', 'background-color'], {
      duration: theme.transitions.duration.shorter
    })
  }
}));

const TechnicalSkills: React.FC<TechnicalSkillsProps> = ({ skills }) => {
  const theme = useTheme();

  if (!skills) {
    return null;
  }

  return (
    <Box>
      <SectionHeader>
        <Typography variant="h2" component="h2" gutterBottom={false}>
          Technical Skills
        </Typography>
      </SectionHeader>
      <Grid container spacing={3}>
        {Object.entries(skills).map(([category, skillList]) => (
          <Grid item xs={12} sm={6} md={4} key={category}>
            <SkillCategory>
              <Typography 
                variant="h3" 
                component="h3" 
                gutterBottom 
                sx={{ 
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  mb: 2
                }}
              >
                {category}
              </Typography>
              <List disablePadding>
                {skillList.map((skill: string, index: number) => (
                  <StyledListItem 
                    key={`${category}-${index}`}
                    index={index}
                    disableGutters
                  >
                    <Typography variant="body2">
                      {skill}
                    </Typography>
                  </StyledListItem>
                ))}
              </List>
            </SkillCategory>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TechnicalSkills;
