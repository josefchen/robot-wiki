'use client';

import { Component, type ReactNode } from 'react';

/**
 * Catches render-time failures from the R3F canvas (for example a WebGL
 * context that probes available but fails at creation) and swaps in the
 * documented fallback UI instead of crashing the page. Deliberately does not
 * log: the console must stay clean on the degraded path.
 */
export class SceneErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
