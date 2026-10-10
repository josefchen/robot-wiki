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
    // Owner-approved successor (owner directive of 2026-10-10 02:00, figures
    // to the Pantheon research-page standard): the role palette retires as
    // series colours. Roles paint ink and the grayscale chart steps, and the
    // highlight role is the figure's one muted blue accent. It replaces the
    // 2026-10-02 13:15 table of seven darkened hues and the lime halo.
    const tokens = loadTokens();
    const one = (hex: string) => ({ stage: hex, lightText: hex, lightGraphic: hex });
    expect(tokens.roles.state).toMatchObject(one('#1C1C1A'));
    expect(tokens.roles.measurement).toMatchObject(one('#3F3F3B'));
    expect(tokens.roles.action).toMatchObject(one('#1C1C1A'));
    expect(tokens.roles.value).toMatchObject(one('#3F3F3B'));
    expect(tokens.roles.constraint).toMatchObject(one('#1C1C1A'));
    expect(tokens.roles.reference).toMatchObject({
      stage: '#A3A39E',
      lightText: '#6C6B66',
      lightGraphic: '#A3A39E',
    });
    expect(tokens.roles.highlight).toMatchObject(one('#3B6EA8'));
  });

  it('keeps one accent: the highlight role is the only hue, and no lime remains', () => {
    const { roles, palette } = loadTokens();
    expect(roles.highlight.stage).toBe(palette.accent);
    const grays = new Set([palette.ink, palette['chart-dark'], palette['chart-medium'], palette.muted]);
    for (const [name, role] of Object.entries(roles)) {
      if (name === 'highlight') continue;
      for (const hex of [role.stage, role.lightText, role.lightGraphic]) expect(grays.has(hex), `${name} ${hex}`).toBe(true);
    }
    expect(JSON.stringify(roles)).not.toContain('#C6FF19');
  });

  it('writes the figure palette as zero-specificity fallbacks and roles as its custom properties', () => {
    const css = committed('components/motion/motion-tokens.css');
    expect(css).toMatch(/:where\(:root\) \{\n  --ink: #1C1C1A;\n  --muted: #6C6B66;\n  --line: rgba\(28, 28, 26, 0\.14\);\n  --line-strong: rgba\(28, 28, 26, 0\.22\);\n  --chart-background: #DEDEDB;\n  --chart-medium: #A3A39E;\n  --chart-dark: #3F3F3B;\n  --accent: #3B6EA8;\n  --ok: #3F8F4F;\n  --fail: #C4473A;\n\}/);
    expect(css).toContain('--role-state-stage: var(--ink);');
    expect(css).toContain('--role-reference-text: var(--muted);');
    expect(css).toContain('--role-highlight-stage: var(--accent);');
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
