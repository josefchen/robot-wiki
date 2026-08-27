/**
 * Canonical resolved values for renderers that cannot consume CSS custom
 * properties. app/globals.css mirrors these literals for the browser.
 */
export const BRAND_COLORS = {
  ink: '#0B0B0C',
  graphite: '#242D33',
  concrete: '#D9DADB',
  paper: '#F5F6F7',
  white: '#FFFFFF',
  highlight: '#C6FF19',
  signal: '#245FFF',
  ok: '#1A6F45',
  warn: '#8A5A00',
  error: '#A52A1E',
  destructive: '#6B1839',
} as const;

export const BRAND_SPACING = [
  4, 8, 12, 16, 24, 32, 48, 64, 96, 128,
] as const;

export type BrandColor = keyof typeof BRAND_COLORS;
