import React, { useRef } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  useTheme,
  alpha,
  useMediaQuery
} from '@mui/material';

interface CookieBannerProps {
  onAccept?: () => void;
  onDeny?: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onDeny }) => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleAcceptAll = () => {
    if (onAccept) onAccept();
    if (bannerRef.current) {
      bannerRef.current.style.display = 'none';
    }
  };

  const handleDenyAll = () => {
    if (onDeny) onDeny();
    if (bannerRef.current) {
      bannerRef.current.style.display = 'none';
    }
  };

  return (
    <Paper
      ref={bannerRef}
      component="div"
      elevation={24}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: alpha(theme.palette.common.black, 0.9),
        color: 'common.white',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: theme.zIndex.snackbar,
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          textAlign: isMobile ? 'center' : 'left',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            m: 0,
            lineHeight: 1.5,
          }}
        >
          We use cookies to enhance your browsing experience and analyze our traffic.
          By clicking "Accept All", you consent to our use of cookies.
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexShrink: 0,
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'center' : 'flex-end',
          }}
        >
          <Button
            variant="outlined"
            onClick={handleDenyAll}
            sx={{
              color: 'common.white',
              borderColor: 'common.white',
              '&:hover': {
                borderColor: 'common.white',
                bgcolor: alpha(theme.palette.common.white, 0.1),
              },
            }}
          >
            Deny All
          </Button>
          <Button
            variant="contained"
            onClick={handleAcceptAll}
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              },
            }}
          >
            Accept All
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default CookieBanner;
