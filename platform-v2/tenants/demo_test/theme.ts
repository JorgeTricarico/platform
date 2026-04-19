/**
 * MG Masajes — Visual Theme
 *
 * MG Masajes uses a warm teal/sage palette evoking wellness, calm, and nature.
 */

export const mgMasajesTheme = {
  // ── Brand colors ──────────────────────────────────────────────────────────
  primaryColor: '#0D9488',      // Teal 600 — wellness green
  accentColor: '#5EEAD4',       // Teal 300 — soft highlights
  colorScheme: 'light' as const,

  // ── CSS variable overrides ────────────────────────────────────────────────
  cssVars: {
    light: {
      '--background': '0 0% 98%',
      '--foreground': '174 71% 8%',
      '--card': '0 0% 100%',
      '--card-foreground': '174 71% 8%',
      '--primary': '174 77% 31%',
      '--primary-foreground': '0 0% 98%',
      '--secondary': '166 76% 95%',
      '--secondary-foreground': '174 77% 15%',
      '--muted': '166 20% 95%',
      '--muted-foreground': '174 15% 45%',
      '--accent': '166 76% 92%',
      '--accent-foreground': '174 77% 20%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '174 20% 88%',
      '--input': '174 20% 88%',
      '--ring': '174 77% 31%',
      '--radius': '0.75rem',
    },
    dark: {
      '--background': '174 71% 4%',
      '--foreground': '166 30% 95%',
      '--card': '174 50% 7%',
      '--card-foreground': '166 30% 95%',
      '--primary': '174 77% 40%',
      '--primary-foreground': '174 71% 4%',
      '--secondary': '174 30% 15%',
      '--secondary-foreground': '166 30% 90%',
      '--muted': '174 30% 15%',
      '--muted-foreground': '174 15% 55%',
      '--accent': '174 40% 20%',
      '--accent-foreground': '174 77% 65%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '174 30% 15%',
      '--input': '174 30% 15%',
      '--ring': '174 77% 40%',
    },
  },

  // ── Typography ────────────────────────────────────────────────────────────
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
} as const;

export default mgMasajesTheme;
