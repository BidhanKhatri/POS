import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#271310', // Design.md primary
      dark: '#3e2723', // Design.md primary-container (Agent.md primary)
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#79564b', // Design.md secondary
      dark: '#6d4c41', // Agent.md secondary
      contrastText: '#ffffff',
    },
    error: {
      main: '#B71C1C',
    },
    warning: {
      main: '#B26A00',
    },
    info: {
      main: '#0277BD',
    },
    success: {
      main: '#2E7D4F',
    },
    background: {
      default: '#fbf9f7', // Design.md background
      paper: '#ffffff', // Design.md surface-container-lowest
    },
    text: {
      primary: '#1b1c1b', // Design.md on-surface
      secondary: '#504442', // Design.md on-surface-variant
    },
    divider: '#DDD2CC',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    // Overriding standard MUI typography to map to Design.md requests implicitly
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 4, // Design.md rounded: DEFAULT: 0.25rem (4px)
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '48px', // Design.md touch target constraint
          borderRadius: '4px',
        },
        containedPrimary: {
          backgroundColor: '#3E2723',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#5A3A33',
          },
        },
        outlinedSecondary: {
          borderColor: '#3E2723',
          color: '#3E2723',
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: '#F3EDE9',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #DDD2CC',
          boxShadow: 'none', // Tonal layers instead of heavy shadows
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '8px', // Design.md large component radius
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        },
      },
    },
  },
});

export default theme;
