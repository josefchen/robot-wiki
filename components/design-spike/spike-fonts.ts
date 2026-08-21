import {
  Archivo,
  DM_Mono,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Literata,
  Newsreader,
  Roboto_Mono,
  Space_Grotesk,
  Spectral,
} from 'next/font/google';

/**
 * Type systems for the visual-elevation design spike.
 *
 * Each candidate names its own sans, serif and mono. The families are loaded
 * here rather than in the root layout so the extra nine faces stay on the one
 * review route: nothing outside components/design-spike imports this module,
 * and the CSS variables below are only read under the scoped
 * [data-design-spike] selectors in design-spike.css.
 */

const plexSans = IBM_Plex_Sans({
  variable: '--spike-paper-sans',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
});

const newsreader = Newsreader({
  variable: '--spike-paper-serif',
  subsets: ['latin'],
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  variable: '--spike-paper-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  variable: '--spike-blueprint-sans',
  subsets: ['latin'],
  display: 'swap',
});

const spectral = Spectral({
  variable: '--spike-blueprint-serif',
  weight: ['400', '600'],
  subsets: ['latin'],
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  variable: '--spike-blueprint-mono',
  subsets: ['latin'],
  display: 'swap',
});

const archivo = Archivo({
  variable: '--spike-oxide-sans',
  subsets: ['latin'],
  display: 'swap',
});

const literata = Literata({
  variable: '--spike-oxide-serif',
  subsets: ['latin'],
  display: 'swap',
});

const dmMono = DM_Mono({
  variable: '--spike-oxide-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
});

/** The font-variable classes a candidate needs on the document element. */
export const SPIKE_FONT_CLASSES: readonly string[] = [
  plexSans.variable,
  newsreader.variable,
  plexMono.variable,
  spaceGrotesk.variable,
  spectral.variable,
  robotoMono.variable,
  archivo.variable,
  literata.variable,
  dmMono.variable,
];

export type SpikeThemeId = 'paper' | 'blueprint' | 'oxide';

export const SPIKE_THEME_IDS: readonly SpikeThemeId[] = [
  'paper',
  'blueprint',
  'oxide',
];

export function isSpikeThemeId(value: string | null): value is SpikeThemeId {
  return value !== null && (SPIKE_THEME_IDS as readonly string[]).includes(value);
}
