import React from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Paper,
  styled,
  useTheme
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import { useResume } from '../../components/resume-provider';

const SectionHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderBottom: `2px solid ${theme.palette.primary.main}`,
  paddingBottom: theme.spacing(1),
}));

const ResumeContent = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  backgroundColor: 'transparent',
  backdropFilter: 'blur(3px)',
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.standard,
  }),
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  fontSize: '4rem',
  marginBottom: theme.spacing(2),
  color: theme.palette.primary.main,
  animation: 'float 3s ease-in-out infinite',
  '@keyframes float': {
    '0%': {
      transform: 'translateY(0px)',
    },
    '50%': {
      transform: 'translateY(-10px)',
    },
    '100%': {
      transform: 'translateY(0px)',
    },
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(1.5, 4),
  borderRadius: theme.shape.borderRadius * 2,
  fontSize: '1.1rem',
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    transform: 'scale(1.05)',
  },
  '& .MuiButton-startIcon': {
    marginRight: theme.spacing(1.5),
  },
}));

const MyResume: React.FC = () => {
  const theme = useTheme();
  const { handleDownload } = useResume();

  return (
    <Box>
      <SectionHeader>
        <Typography variant="h2" component="h2" gutterBottom={false}>
          Get My Full Resume
        </Typography>
      </SectionHeader>
      <ResumeContent elevation={2}>
        <IconWrapper>
          <DescriptionIcon sx={{ fontSize: 'inherit' }} />
        </IconWrapper>
        <Typography 
          variant="body1" 
          sx={{ 
            maxWidth: '600px',
            mb: 3,
            color: theme.palette.text.secondary
          }}
        >
          Download my complete resume to learn more about my experience, 
          skills, and qualifications. The PDF version includes additional 
          details about my projects and achievements.
        </Typography>
        <StyledButton
          variant="contained"
          color="primary"
          onClick={handleDownload}
          startIcon={<DownloadIcon />}
          aria-label="Download Resume PDF"
        >
          Download Resume PDF
        </StyledButton>
      </ResumeContent>
    </Box>
  );
};

export default MyResume;
