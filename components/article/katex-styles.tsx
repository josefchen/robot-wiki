'use client';

import './math.css';

/**
 * Carries the math stylesheet and renders nothing. It exists to be loaded
 * through next/dynamic from ./math-stylesheet, which gives the stylesheet
 * its own chunk instead of the site-wide one.
 */
export default function KatexStyles() {
  return null;
}
