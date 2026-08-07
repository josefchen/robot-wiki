/**
 * Returns true when the browser can create a WebGL2 or WebGL1 context.
 * False on the server, in jsdom, and on clients with WebGL disabled.
 */
export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl'),
    );
  } catch {
    return false;
  }
}
