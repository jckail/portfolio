import React, { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAdminStore } from '../stores/admin-store';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAdminStore();
  const theme = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await login({ email, password });
    if (success) {
      onLoginSuccess();
      onClose();
      setEmail('');
      setPassword('');
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="admin-login-modal"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
      BackdropProps={{
        sx: {
          backgroundColor: alpha(theme.palette.background.default, 0.5),
          backdropFilter: 'blur(3px)',
        }
      }}
    >
      <Box
        component="div"
        sx={{
          position: 'relative',
          width: '90%',
          maxWidth: 400,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 3,
          p: 4,
        }}
      >
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'text.secondary',
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography
          variant="h5"
          component="h2"
          align="center"
          gutterBottom
          sx={{ mb: 3 }}
        >
          Admin Login
        </Typography>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{
              py: 1.5,
              fontWeight: 600,
            }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default AdminLogin;
