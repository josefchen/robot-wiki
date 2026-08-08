// The probe result is memoized: it feeds a useSyncExternalStore snapshot,
// so it runs on every render. Each naive call creates a new canvas and a
// new WebGL context, and browsers cap active contexts (~16) by force-losing
// the oldest one, which was killing the playground's R3F context once
// playback/slider updates made renders frequent. Probe once, then
// explicitly release the probe context.
let cached: boolean | null = null;

/**
 * Returns true when the browser can create a WebGL2 or WebGL1 context.
 * False on the server, in jsdom, and on clients with WebGL disabled.
 */
export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    cached = gl !== null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
