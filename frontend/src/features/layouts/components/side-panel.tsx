import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  useTheme,
  styled,
  alpha,
  Typography,
  Divider
} from '@mui/material';
import { useScrollSpy } from '../../../shared/hooks/use-scroll-spy';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const HEADER_HEIGHT = 64;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: 280,
    backgroundColor: alpha(theme.palette.background.paper, 0.95),
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    transition: theme.transitions.create(['box-shadow', 'background-color'], {
      duration: theme.transitions.duration.standard,
    }),
    '&:hover': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `4px 0 8px ${alpha(theme.palette.common.black, 0.1)}`,
    },
  },
  '& .MuiBackdrop-root': {
    backgroundColor: alpha(theme.palette.background.paper, 0.2),
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  },
}));

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 1.5,
  margin: theme.spacing(0.5, 2),
  padding: theme.spacing(1.5, 2),
  transition: theme.transitions.create(
    ['background-color', 'color', 'transform', 'box-shadow'],
    {
      duration: theme.transitions.duration.shorter,
    }
  ),
  '&.Mui-selected': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    transform: 'scale(1.02)',
    boxShadow: `0 2px 4px ${alpha(theme.palette.primary.main, 0.15)}`,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.15),
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: -8,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 4,
      height: '60%',
      backgroundColor: theme.palette.primary.main,
      borderRadius: theme.shape.borderRadius,
    },
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.action.hover, 0.7),
    transform: 'translateX(4px)',
  },
}));

const NavigationHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3, 2, 2),
  marginBottom: theme.spacing(1),
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(1, 2, 2),
  borderColor: alpha(theme.palette.divider, 0.1),
}));

const useCurrentSection = () => {
  const [currentSection, setCurrentSection] = React.useState('');
  useScrollSpy();

  React.useEffect(() => {
    const updateSection = () => {
      const hash = window.location.hash.slice(1);
      setCurrentSection(hash || 'about');
    };

    updateSection();
    window.addEventListener('hashchange', updateSection);

    const handleScroll = () => {
      const sections = document.querySelectorAll<HTMLElement>('section[id]');
      let currentSectionId = '';
      let minDistance = Infinity;

      sections.forEach((section) => {
        if (section.id) {
          const rect = section.getBoundingClientRect();
          const distance = Math.abs(rect.top);
          if (distance < minDistance) {
            minDistance = distance;
            currentSectionId = section.id;
          }
        }
      });

      if (currentSectionId) {
        setCurrentSection(currentSectionId);
      }
    };

    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollListener, { passive: true });

    return () => {
      window.removeEventListener('hashchange', updateSection);
      window.removeEventListener('scroll', scrollListener);
    };
  }, []);

  return currentSection;
};

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose }) => {
  const theme = useTheme();
  const currentSection = useCurrentSection();

  const sections = [
    { id: 'about', label: 'About Me' },
    { id: 'skills', label: 'Technical Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'resume', label: 'My Resume' },
  ];

  const handleNavClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = window.scrollY + elementPosition - HEADER_HEIGHT;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      onClose();
    }
  };

  return (
    <StyledDrawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      variant="temporary"
      ModalProps={{
        keepMounted: true,
      }}
      SlideProps={{
        timeout: {
          enter: theme.transitions.duration.enteringScreen,
          exit: theme.transitions.duration.leavingScreen,
        },
      }}
    >
      <Box
        sx={{
          width: 280,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        role="presentation"
      >
        <NavigationHeader>
          <Typography
            variant="h6"
            color="primary"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.5px',
              mb: 0.5,
            }}
          >
            Navigation
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ 
              fontWeight: 500,
              opacity: 0.8,
            }}
          >
            Jump to any section
          </Typography>
        </NavigationHeader>

        <StyledDivider />

        <List sx={{ flex: 1, py: 0 }}>
          {sections.map((section, index) => (
            <ListItem 
              key={section.id} 
              disablePadding
              sx={{
                opacity: 0,
                animation: 'slideIn 0.3s ease forwards',
                animationDelay: `${index * 0.05}s`,
                '@keyframes slideIn': {
                  from: {
                    opacity: 0,
                    transform: 'translateX(-20px)',
                  },
                  to: {
                    opacity: 1,
                    transform: 'translateX(0)',
                  },
                },
              }}
            >
              <StyledListItemButton
                onClick={() => handleNavClick(section.id)}
                selected={currentSection === section.id}
              >
                <ListItemText 
                  primary={section.label}
                  primaryTypographyProps={{
                    sx: {
                      fontWeight: currentSection === section.id ? 600 : 500,
                      letterSpacing: '0.2px',
                      transition: theme.transitions.create('font-weight', {
                        duration: theme.transitions.duration.shorter,
                      }),
                    }
                  }}
                />
              </StyledListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ p: 2, opacity: 0.7 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              display: 'block',
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            Click anywhere outside to close
          </Typography>
        </Box>
      </Box>
    </StyledDrawer>
  );
};

export default SidePanel;
