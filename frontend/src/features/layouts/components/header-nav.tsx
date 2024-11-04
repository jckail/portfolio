import React from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Box,
  useTheme,
  styled
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import DescriptionIcon from '@mui/icons-material/Description';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import { Theme } from '../../../features/theme/stores/theme-store';

interface HeaderNavProps {
  theme: Theme;
  toggleTheme: () => void;
  handleResumeClick: () => void;
  handleAdminClick: () => void;
  isAdminLoggedIn: boolean;
}

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  backdropFilter: 'blur(3px)',
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
}));

const StyledButton = styled(Button)(({ theme }) => ({
  marginLeft: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  textTransform: 'none',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const HeaderNav: React.FC<HeaderNavProps> = ({
  theme,
  toggleTheme,
  handleResumeClick,
  handleAdminClick,
  isAdminLoggedIn
}) => {
  const muiTheme = useTheme();

  return (
    <StyledAppBar position="fixed" color="default">
      <Toolbar>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          onClick={toggleTheme}
          color="primary"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          size="large"
        >
          {theme === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
        </IconButton>
        <StyledButton
          onClick={handleResumeClick}
          startIcon={<DescriptionIcon />}
          variant="text"
          color="primary"
        >
          Resume
        </StyledButton>
        <StyledButton
          onClick={handleAdminClick}
          startIcon={isAdminLoggedIn ? <LogoutIcon /> : <AdminPanelSettingsIcon />}
          variant="text"
          color="primary"
        >
          {isAdminLoggedIn ? 'Logout' : 'Admin'}
        </StyledButton>
      </Toolbar>
    </StyledAppBar>
  );
};

export default HeaderNav;
