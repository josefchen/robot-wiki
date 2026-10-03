import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCss,
  buildPythonTheme,
  buildTypeScript,
  loadTokens,
} from '../../scripts/generate-motion-tokens';

const ROOT = join(__dirname, '../..');

function committed(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf8');
}

describe('motion tokens', () => {
  it('declares exactly the seven spec roles', () => {
    const tokens = loadTokens();
    expect(Object.keys(tokens.roles).sort()).toEqual(
      [
        'action',
        'constraint',
        'highlight',
        'measurement',
        'reference',
        'state',
        'value',
      ].sort(),
    );
  });

  it('pins the stage and light variants byte-for-byte to the spec table', () => {
    // The stage is the page ground (owner addendum, 2026-10-02 13:15), so a
    // role paints one colour on the stage and in page text, darkened to at
    // least 4.6:1 on the paper. Only highlight keeps the lime, as a halo.
    const tokens = loadTokens();
    const one = (hex: string) => ({ stage: hex, lightText: hex, lightGraphic: hex });
    expect(tokens.roles.state).toMatchObject(one('#007A91'));
    expect(tokens.roles.measurement).toMatchObject(one('#8E6A00'));
    expect(tokens.roles.action).toMatchObject(one('#866299'));
    expect(tokens.roles.value).toMatchObject(one('#56793D'));
    expect(tokens.roles.constraint).toMatchObject(one('#CB3B32'));
    expect(tokens.roles.reference).toMatchObject(one('#6E6F70'));
    expect(tokens.roles.highlight).toMatchObject({
      stage: '#507C00',
      lightText: '#507C00',
      lightGraphic: '#C6FF19',
    });
  });

  it('keeps the brand lime as the highlight halo, never as stage text', () => {
    const { highlight } = loadTokens().roles;
    expect(highlight.lightGraphic).toBe('#C6FF19');
    expect(highlight.stage).not.toBe('#C6FF19');
  });

  it('pins the timing ladder and lag ratios', () => {
    const tokens = loadTokens();
    expect(tokens.timing).toMatchObject({
      beat: 1000,
      beatShort: 500,
      beatLong: 2000,
      indicate: 800,
      create: 1000,
      write: 1000,
      writePerGlyph: 100,
      writeMax: 2000,
    });
    expect(tokens.lag).toEqual({ default: 0.1, dense: 0.05, denseThreshold: 12 });
    expect(tokens.uncertainty).toEqual({ fillAlpha: 0.22, edge: 'dashed' });
  });

  it('generates the committed TypeScript constants without drift', () => {
    expect(buildTypeScript(loadTokens())).toBe(
      committed('lib/motion-tokens.ts'),
    );
  });

  it('generates the committed CSS custom properties without drift', () => {
    expect(buildCss(loadTokens())).toBe(
      committed('components/motion/motion-tokens.css'),
    );
  });

  it('generates the committed Python theme without drift', () => {
    expect(buildPythonTheme(loadTokens())).toBe(
      committed('scripts/motion/motion_theme.py'),
    );
  });

  it('exposes every role variant as a CSS custom property', () => {
    const css = committed('components/motion/motion-tokens.css');
    for (const role of [
      'state',
      'measurement',
      'action',
      'value',
      'constraint',
      'reference',
      'highlight',
    ]) {
      expect(css).toContain(`--role-${role}-stage:`);
      expect(css).toContain(`--role-${role}-text:`);
      expect(css).toContain(`--role-${role}-graphic:`);
    }
  });

  it('samples the smooth easing into a CSS linear() of at least 20 stops', () => {
    const css = committed('components/motion/motion-tokens.css');
    const match = css.match(/--motion-ease-smooth:\s*linear\(([^)]+)\)/);
    expect(match).not.toBeNull();
    const stops = match![1].split(',').map((s) => Number.parseFloat(s));
    expect(stops.length).toBeGreaterThanOrEqual(20);
    expect(stops[0]).toBeCloseTo(0, 6);
    expect(stops[stops.length - 1]).toBeCloseTo(1, 6);
  });

  it('regenerates identical bytes end to end', () => {
    const before = committed('lib/motion-tokens.ts');
    execFileSync('node', ['scripts/generate-motion-tokens.ts'], {
      cwd: ROOT,
    });
    expect(committed('lib/motion-tokens.ts')).toBe(before);
  });
});
