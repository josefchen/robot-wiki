/**
 * Canonical resolved values for renderers that cannot consume CSS custom
 * properties. app/globals.css mirrors these literals for the browser.
 */
export const BRAND_COLORS = {
  ink: '#1C1C1A',
  graphite: '#3F3F3B',
  concrete: '#DEDEDB',
  paper: '#FAFAF8',
  white: '#FFFFFF',
  highlight: '#A3A39E',
  signal: '#3B6EA8',
  ok: '#1A6F45',
  warn: '#8A5A00',
  error: '#A52A1E',
  destructive: '#6B1839',
} as const;

export const BRAND_SPACING = [
  4, 8, 12, 16, 24, 32, 48, 64, 96, 128,
] as const;

export type BrandColor = keyof typeof BRAND_COLORS;
