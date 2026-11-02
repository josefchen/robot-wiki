/** The same explicit viewport must reach project fixtures and hand-made contexts. */
export function parseE2EViewport(requested: string): { width: number; height: number } {
  const size = /^(\d{3,4})x(\d{3,4})$/.exec(requested);
  if (!size || Number(size[1]) <= 0 || Number(size[2]) <= 0) {
    throw new Error(`E2E_VIEWPORT must be WIDTHxHEIGHT, for example 375x812 or 1440x900 (got "${requested}")`);
  }
  return { width: Number(size[1]), height: Number(size[2]) };
}
