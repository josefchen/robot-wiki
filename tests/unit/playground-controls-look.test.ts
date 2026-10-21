import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The control deck takes the site's controls (contract/design-integrity.md
 * VAL-B2-PLAY-004): the radius tokens in app/globals.css that the shared
 * Action and input primitives draw with, and the figure controls of
 * components/motion/stage.css, which are square except for the 12 px round
 * slider thumb. Every corner the playground stylesheet declares is held to
 * those sources.
 */

const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const playground = strip(readFileSync('components/three/playground.css', 'utf8'));
const globals = strip(readFileSync('app/globals.css', 'utf8'));
const figures = strip(readFileSync('components/motion/stage.css', 'utf8'));

interface Corner {
  selector: string;
  radius: string;
}

/** Every innermost rule that declares a border-radius, with its selector. */
function corners(css: string): Corner[] {
  const found: Corner[] = [];
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const radius = rule[2].match(/border-radius:\s*([^;]+);/);
    if (radius) found.push({ selector: rule[1].trim(), radius: radius[1].trim() });
  }
  return found;
}

const isThumb = (selector: string) => /::-(webkit-slider|moz-range)-thumb/.test(selector);

describe('the playground controls take the site\'s corners', () => {
  it('reads square site radius tokens', () => {
    const tokens = [...globals.matchAll(/--radius-[a-z]+:\s*([^;]+);/g)].map((match) => match[1].trim());
    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) expect(token).toBe('0px');
  });

  it('gives every button, field and pose marker square corners, like the site', () => {
    const controls = corners(playground).filter((corner) => !isThumb(corner.selector));
    expect(controls.length).toBeGreaterThan(0);
    for (const corner of controls) {
      expect(Number.parseFloat(corner.radius), `${corner.selector} { border-radius: ${corner.radius} }`).toBe(0);
    }
  });

  it('rounds only the slider thumb, exactly as the figure controls do', () => {
    const thumbs = corners(playground).filter((corner) => isThumb(corner.selector));
    const figureThumbs = corners(figures).filter((corner) => isThumb(corner.selector));
    expect(thumbs).toHaveLength(2);
    expect(figureThumbs).toHaveLength(2);
    for (const thumb of thumbs) {
      expect(thumb.radius).toBe(figureThumbs[0].radius);
    }
  });
});
