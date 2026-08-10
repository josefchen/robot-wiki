/**
 * Shown when the browser cannot create a WebGL context. Non-blocking: the
 * page around it keeps working, and the message explains why the 3D view is
 * missing.
 */
export function WebGLUnavailable() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-dim">
        3D unavailable
      </p>
      <h2 className="font-sans text-lg font-semibold tracking-tight text-text">
        WebGL is not available
      </h2>
      <p className="max-w-md text-sm leading-relaxed text-text-dim">
        The playground renders the robot with WebGL, and this browser refused
        to create a WebGL context. That usually means hardware acceleration is
        disabled or the GPU driver is blocked. The rest of robot-wiki is
        static HTML and works without it.
      </p>
    </div>
  );
}
