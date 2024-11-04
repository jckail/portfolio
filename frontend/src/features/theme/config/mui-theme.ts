import { createTheme, alpha, Components, Theme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Components {
    MuiBox?: {
      styleOverrides?: {
        root?: {
          backgroundColor?: string;
        };
      };
    };
  }
}

const createAppTheme = (mode: 'light' | 'dark'): Theme => {
  const isLight = mode === 'light';

  // Enhanced color palette
  const PRIMARY = '#0403ff';
  const SECONDARY = isLight ? '#2D3748' : '#A0AEC0';
  const SUCCESS = '#48BB78';
  const WARNING = '#ECC94B';
  const ERROR = '#F56565';

  const shadowColor = isLight
    ? 'rgba(0, 0, 0, 0.1)'
    : 'rgba(0, 0, 0, 0.2)';

  const backgroundColor = isLight 
    ? alpha('#ffffff', 0.9)
    : alpha('#141414', 0.9);

  // Enhanced shadows with more depth
  const shadows = [
    'none',
    `0 1px 2px ${shadowColor}`,
    `0 4px 6px ${shadowColor}`,
    `0 10px 15px ${shadowColor}`,
    `0 2px 4px -1px ${shadowColor},0 4px 5px 0 ${shadowColor},0 1px 10px 0 ${shadowColor}`,
    `0 3px 5px -1px ${shadowColor},0 5px 8px 0 ${shadowColor},0 1px 14px 0 ${shadowColor}`,
    `0 3px 5px -1px ${shadowColor},0 6px 10px 0 ${shadowColor},0 1px 18px 0 ${shadowColor}`,
    `0 4px 5px -2px ${shadowColor},0 7px 10px 1px ${shadowColor},0 2px 16px 1px ${shadowColor}`,
    `0 5px 5px -3px ${shadowColor},0 8px 10px 1px ${shadowColor},0 3px 14px 2px ${shadowColor}`,
    `0 5px 6px -3px ${shadowColor},0 9px 12px 1px ${shadowColor},0 3px 16px 2px ${shadowColor}`,
    `0 6px 6px -3px ${shadowColor},0 10px 14px 1px ${shadowColor},0 4px 18px 3px ${shadowColor}`,
    `0 6px 7px -4px ${shadowColor},0 11px 15px 1px ${shadowColor},0 4px 20px 3px ${shadowColor}`,
    `0 7px 8px -4px ${shadowColor},0 12px 17px 2px ${shadowColor},0 5px 22px 4px ${shadowColor}`,
    `0 7px 8px -4px ${shadowColor},0 13px 19px 2px ${shadowColor},0 5px 24px 4px ${shadowColor}`,
    `0 7px 9px -4px ${shadowColor},0 14px 21px 2px ${shadowColor},0 5px 26px 4px ${shadowColor}`,
    `0 8px 9px -5px ${shadowColor},0 15px 22px 2px ${shadowColor},0 6px 28px 5px ${shadowColor}`,
    `0 8px 10px -5px ${shadowColor},0 16px 24px 2px ${shadowColor},0 6px 30px 5px ${shadowColor}`,
    `0 8px 11px -5px ${shadowColor},0 17px 26px 2px ${shadowColor},0 6px 32px 5px ${shadowColor}`,
    `0 9px 11px -5px ${shadowColor},0 18px 28px 2px ${shadowColor},0 7px 34px 6px ${shadowColor}`,
    `0 9px 12px -6px ${shadowColor},0 19px 29px 2px ${shadowColor},0 7px 36px 6px ${shadowColor}`,
    `0 10px 13px -6px ${shadowColor},0 20px 31px 3px ${shadowColor},0 8px 38px 7px ${shadowColor}`,
    `0 10px 13px -6px ${shadowColor},0 21px 33px 3px ${shadowColor},0 8px 40px 7px ${shadowColor}`,
    `0 10px 14px -6px ${shadowColor},0 22px 35px 3px ${shadowColor},0 8px 42px 7px ${shadowColor}`,
    `0 11px 14px -7px ${shadowColor},0 23px 36px 3px ${shadowColor},0 9px 44px 8px ${shadowColor}`,
    `0 11px 15px -7px ${shadowColor},0 24px 38px 3px ${shadowColor},0 9px 46px 8px ${shadowColor}`
  ] as Theme['shadows'];

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: PRIMARY,
        light: isLight ? alpha(PRIMARY, 0.1) : alpha(PRIMARY, 0.2),
        dark: isLight ? '#0302cc' : '#3332ff',
        contrastText: '#fff',
      },
      secondary: {
        main: SECONDARY,
        light: isLight ? alpha(SECONDARY, 0.1) : alpha(SECONDARY, 0.2),
        dark: isLight ? '#1A202C' : '#CBD5E0',
        contrastText: '#fff',
      },
      success: {
        main: SUCCESS,
        light: alpha(SUCCESS, 0.1),
        dark: '#2F855A',
      },
      warning: {
        main: WARNING,
        light: alpha(WARNING, 0.1),
        dark: '#D69E2E',
      },
      error: {
        main: ERROR,
        light: alpha(ERROR, 0.1),
        dark: '#C53030',
      },
      background: {
        default: backgroundColor,
        paper: backgroundColor,
      },
      text: {
        primary: isLight ? '#1A202C' : '#F7FAFC',
        secondary: isLight ? '#4A5568' : '#A0AEC0',
      },
      divider: isLight 
        ? alpha('#000000', 0.1)
        : alpha('#ffffff', 0.1),
    },
    typography: {
      fontFamily: [
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.01562em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: '-0.00833em',
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '0em',
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '0.00735em',
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '0em',
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '0.0075em',
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
        letterSpacing: '0.00938em',
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
        letterSpacing: '0.01071em',
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.75,
        letterSpacing: '0.00938em',
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.57,
        letterSpacing: '0.00714em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    spacing: 8,
    shadows,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          'html, body': {
            margin: 0,
            padding: 0,
            minHeight: '100vh',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          body: {
            backgroundColor: backgroundColor,
            color: isLight ? '#1A202C' : '#F7FAFC',
            transition: 'color 0.3s ease, background-color 0.3s ease',
            position: 'relative',
            zIndex: 1,
          },
          '#particles-js': {
            position: 'fixed !important',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            pointerEvents: 'none',
            background: 'transparent !important',
          },
          '#root': {
            position: 'relative',
            zIndex: 3,
            backgroundColor: 'transparent',
            minHeight: '100vh',
          },
          a: {
            color: PRIMARY,
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              color: isLight ? '#0302cc' : '#3332ff',
              textDecoration: 'none',
            },
          },
        },
      },
      MuiBox: {

      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 12,
            padding: '10px 20px',
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          },
          contained: {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: backgroundColor,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: isLight 
                ? '0 8px 16px rgba(0,0,0,0.1)'
                : '0 8px 16px rgba(0,0,0,0.2)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: backgroundColor,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${
              isLight 
                ? alpha('#000000', 0.1)
                : alpha('#ffffff', 0.1)
            }`,
            boxShadow: 'none',
            zIndex: 1300,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: backgroundColor,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          },
        },
      },
    },
  });

  return theme;
};

export default createAppTheme;
