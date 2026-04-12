/**
 * Zenko — Visual Theme
 *
 * Zenko's brand uses a deep indigo/purple palette inspired by fabric and craft.
 * The dark mode uses a very dark background to make the brand color pop.
 */

export const zencoTheme = {
  // ── Brand colors ──────────────────────────────────────────────────────────
  primaryColor: '#6D28D9',      // Violet 700 — main brand
  accentColor: '#A78BFA',       // Violet 400 — highlights
  colorScheme: 'light' as const,

  // ── CSS variable overrides (applied to :root) ─────────────────────────────
  // These map to shadcn/ui CSS variables.
  cssVars: {
    light: {
      '--background': '0 0% 98%',
      '--foreground': '224 71.4% 4.1%',
      '--card': '0 0% 100%',
      '--card-foreground': '224 71.4% 4.1%',
      '--primary': '262 83.3% 57.8%',
      '--primary-foreground': '210 20% 98%',
      '--secondary': '220 14.3% 95.9%',
      '--secondary-foreground': '220.9 39.3% 11%',
      '--muted': '220 14.3% 95.9%',
      '--muted-foreground': '220 8.9% 46.1%',
      '--accent': '262 83.3% 95%',
      '--accent-foreground': '262 83.3% 30%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 20% 98%',
      '--border': '220 13% 91%',
      '--input': '220 13% 91%',
      '--ring': '262 83.3% 57.8%',
      '--radius': '0.5rem',
    },
    dark: {
      '--background': '224 71.4% 4.1%',
      '--foreground': '210 20% 98%',
      '--card': '224 71.4% 6%',
      '--card-foreground': '210 20% 98%',
      '--primary': '262 83.3% 57.8%',
      '--primary-foreground': '210 20% 98%',
      '--secondary': '215 27.9% 16.9%',
      '--secondary-foreground': '210 20% 98%',
      '--muted': '215 27.9% 16.9%',
      '--muted-foreground': '217.9 10.6% 64.9%',
      '--accent': '262 30% 25%',
      '--accent-foreground': '262 83.3% 80%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 20% 98%',
      '--border': '215 27.9% 16.9%',
      '--input': '215 27.9% 16.9%',
      '--ring': '262 83.3% 57.8%',
    },
  },

  // ── Typography ────────────────────────────────────────────────────────────
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
} as const;

export default zencoTheme;
