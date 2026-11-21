export const NO_CLOSE = 'no close in the data';

/** The host a source sits on, without "www.": what a reader sees before following it. */
export function sourceHost(url: string): string {
  return new URL(url).hostname.replace(/^www\d?\./, '');
}
