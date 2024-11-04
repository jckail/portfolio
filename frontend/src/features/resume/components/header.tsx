import React, { useState, useEffect } from 'react';
import { 
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  useTheme,
  styled,
  alpha,
  Tooltip,
  Zoom,
  Link
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { ResumeData } from '../types';
import { Theme } from '../../theme/stores/theme-store';
import GitHubIcon from '../../theme/components/icons/github-icon';
import LinkedInIcon from '../../theme/components/icons/linkedin-icon';
import SidePanel from '../../layouts/components/side-panel';

interface HeaderProps {
  resumeData: ResumeData | null;
  theme: Theme;
  toggleTheme: () => void;
  handleResumeClick: () => void;
  handleAdminClick: () => void;
  isAdminLoggedIn: boolean;
}

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: 'none',
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: theme.transitions.create(
    ['background-color', 'border-color', 'box-shadow'],
    {
      duration: theme.transitions.duration.standard,
    }
  ),
  '&:hover': {
    backgroundColor: alpha(theme.palette.background.paper, 0.95),
    boxShadow: theme.shadows[2],
  },
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  justifyContent: 'space-between',
  padding: theme.spacing(1, 2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(1, 3),
  },
  gap: theme.spacing(2),
}));

const NavSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
  transition: theme.transitions.create(['transform', 'background-color', 'box-shadow'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    transform: 'scale(1.1)',
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
}));

const StyledLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  color: 'inherit',
  textDecoration: 'none',
}));

const ResumeButton = styled(Button)(({ theme }) => ({
  minWidth: 'auto',
  padding: theme.spacing(1, 2),
  borderRadius: theme.shape.borderRadius * 1.5,
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'none',
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 8px ${alpha(theme.palette.primary.main, 0.25)}`,
  },
  '&:active': {
    transform: 'translateY(0)',
  },
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(1, 3),
  },
}));

const NameContainer = styled(Box)(({ theme }) => ({
  animation: 'fadeIn 0.5s ease-out',
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
      transform: 'translateY(-10px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
}));

const Header: React.FC<HeaderProps> = ({
  resumeData,
  theme: colorTheme,
  toggleTheme,
  handleResumeClick,
  handleAdminClick,
  isAdminLoggedIn
}) => {
  const theme = useTheme();
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const updateURL = (isOpen: boolean) => {
    const url = new URL(window.location.href);
    url.searchParams.set('sidepanel', isOpen ? 'open' : 'closed');
    window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sidePanelState = params.get('sidepanel');
    const shouldBeOpen = sidePanelState === 'open';
    
    setIsSidePanelOpen(shouldBeOpen);
    
    if (!sidePanelState) {
      updateURL(false);
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSidePanel = () => {
    const newState = !isSidePanelOpen;
    setIsSidePanelOpen(newState);
    updateURL(newState);
  };

  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    updateURL(false);
  };

  return (
    <>
      <StyledAppBar
        sx={{
          boxShadow: isScrolled ? theme.shadows[4] : 'none',
          backgroundColor: isScrolled 
            ? alpha(theme.palette.background.paper, 0.95)
            : alpha(theme.palette.background.paper, 0.8),
        }}
      >
        <StyledToolbar>
          <NavSection>
            <Tooltip 
              title="Toggle navigation menu" 
              placement="right"
              TransitionComponent={Zoom}
            >
              <StyledIconButton
                edge="start"
                aria-label="Toggle navigation menu"
                onClick={toggleSidePanel}
                sx={{
                  transform: isSidePanelOpen ? 'rotate(90deg)' : 'none',
                }}
              >
                <MenuIcon />
              </StyledIconButton>
            </Tooltip>
            <NameContainer>
              <Typography 
                variant="h6" 
                component="h1"
                color="text.primary"
                sx={{ 
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.5px',
                }}
              >
                {resumeData?.name || 'Loading...'}
              </Typography>
              <Typography 
                variant="subtitle1" 
                component="h2"
                color="text.secondary"
                sx={{ 
                  lineHeight: 1.2,
                  fontWeight: 500,
                }}
              >
                {resumeData?.title || ''}
              </Typography>
            </NameContainer>
          </NavSection>

          <NavSection>
            <IconContainer>
              {resumeData?.github && (
                <Tooltip 
                  title="View GitHub Profile" 
                  placement="bottom"
                  TransitionComponent={Zoom}
                >
                  <StyledLink
                    href={resumeData.github}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <StyledIconButton aria-label="GitHub Profile">
                      <GitHubIcon />
                    </StyledIconButton>
                  </StyledLink>
                </Tooltip>
              )}
              {resumeData?.linkedin && (
                <Tooltip 
                  title="View LinkedIn Profile" 
                  placement="bottom"
                  TransitionComponent={Zoom}
                >
                  <StyledLink
                    href={resumeData.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <StyledIconButton aria-label="LinkedIn Profile">
                      <LinkedInIcon />
                    </StyledIconButton>
                  </StyledLink>
                </Tooltip>
              )}
            </IconContainer>

            <ResumeButton
              variant="contained"
              color="primary"
              onClick={handleResumeClick}
            >
              See My Resume
            </ResumeButton>

            <Tooltip 
              title={`Switch to ${colorTheme === 'light' ? 'dark' : 'light'} mode`}
              placement="bottom"
              TransitionComponent={Zoom}
            >
              <StyledIconButton
                onClick={toggleTheme}
                aria-label={`Switch to ${colorTheme === 'light' ? 'dark' : 'light'} mode`}
                sx={{
                  width: 40,
                  height: 40,
                }}
              >
                {colorTheme === 'light' ? '🌙' : '☀️'}
              </StyledIconButton>
            </Tooltip>
          </NavSection>
        </StyledToolbar>
      </StyledAppBar>

      <SidePanel 
        isOpen={isSidePanelOpen} 
        onClose={handleCloseSidePanel} 
      />
    </>
  );
};

export default Header;
