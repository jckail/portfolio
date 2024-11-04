import React from 'react';
import {
  Paper,
  Box,
  Typography,
  useTheme,
  alpha,
  styled
} from '@mui/material';
import { useTelemetryStore } from '../stores/telemetry-store';

interface TelemetryBannerProps {
  isAdminLoggedIn: boolean;
}

const LogsContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  maxHeight: 400,
  fontFamily: 'monospace',
  fontSize: 12,
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: alpha(theme.palette.common.black, 0.1),
  },
  '&::-webkit-scrollbar-thumb': {
    background: alpha(theme.palette.common.white, 0.3),
    '&:hover': {
      background: alpha(theme.palette.common.white, 0.4),
    },
  },
}));

const LogEntry = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  padding: theme.spacing(0.5),
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  wordWrap: 'break-word',
}));

const TelemetryBanner: React.FC<TelemetryBannerProps> = ({ isAdminLoggedIn }) => {
  const logs = useTelemetryStore((state) => state.logs);
  const theme = useTheme();

  if (!isAdminLoggedIn) {
    return null;
  }

  return (
    <Paper
      elevation={24}
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 300,
        maxHeight: '100vh',
        bgcolor: alpha(theme.palette.common.black, 0.9),
        color: 'common.white',
        zIndex: theme.zIndex.tooltip,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          p: 1,
          bgcolor: alpha(theme.palette.common.white, 0.1),
          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
        }}
      >
        <Typography
          variant="subtitle2"
          component="h3"
          sx={{
            m: 0,
            fontFamily: 'monospace',
            fontSize: 14,
          }}
        >
          Telemetry Logs
        </Typography>
      </Box>

      <LogsContainer p={1}>
        {logs.map((log: string, index: number) => (
          <LogEntry key={index}>
            <Typography
              variant="body2"
              component="div"
              sx={{
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              {log}
            </Typography>
          </LogEntry>
        ))}
      </LogsContainer>
    </Paper>
  );
};

export default TelemetryBanner;
