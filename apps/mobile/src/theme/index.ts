import { createTheme } from '@shopify/restyle';

const palette = {
  obsidian: '#0B0F19',
  deepSlate: '#161F30',
  pureWhite: '#FFFFFF',
  greyBlue: '#94A3B8',
  teal: '#708C84',
  emerald: '#10B981',
  coral: '#EF4444',
};

const theme = createTheme({
  colors: {
    backgroundPrimary: palette.obsidian,
    backgroundCard: palette.deepSlate,
    textPrimary: palette.pureWhite,
    textMuted: palette.greyBlue,
    interactivePrimary: palette.teal,
    success: palette.emerald,
    error: palette.coral,
    border: palette.deepSlate,
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 40,
  },
  textVariants: {
    header: {
      fontWeight: 'bold',
      fontSize: 34,
      color: 'textPrimary',
    },
    subheader: {
      fontWeight: '600',
      fontSize: 22,
      color: 'textPrimary',
    },
    body: {
      fontSize: 16,
      color: 'textPrimary',
    },
    muted: {
      fontSize: 14,
      color: 'textMuted',
    },
    button: {
      fontWeight: 'bold',
      fontSize: 16,
      color: 'textPrimary',
      textAlign: 'center',
    },
  },
});

export type Theme = typeof theme;
export default theme;
