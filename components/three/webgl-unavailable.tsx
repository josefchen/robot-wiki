import { PUBLIC_IDENTITY } from '@/lib/identity';

/**
 * Shown in the stage when the browser cannot create a WebGL context. It
 * replaces only the 3D view: the page around it keeps working, and the
 * message says what is missing and how a reader usually gets it back.
 * Reduced motion never leads here; it only calms the live scene.
 */
export function WebGLUnavailable() {
  return (
    <div className="pg-unavailable" data-testid="webgl-unavailable">
      <h2>WebGL is not available</h2>
      <p>
        The 3D arm needs WebGL, and this browser did not start it. Turning on
        hardware acceleration in the browser&apos;s settings and reloading
        usually fixes it. The rest of {PUBLIC_IDENTITY} works without it.
      </p>
    </div>
  );
}
