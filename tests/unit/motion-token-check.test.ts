import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { scanMotionSourcesForViolations } from '../../scripts/check-motion-tokens';

const fixtureRoot = mkdtempSync(join(tmpdir(), 'motion-token-check-'));

function write(relative: string, text: string): string {
  const path = join(fixtureRoot, relative);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, text);
  return path;
}

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

describe('motion token check', () => {
  it('fails on a hard-coded hex colour in a scene file', () => {
    const path = write(
      'components/motion/scenes/example.tsx',
      `<ellipse fill="#58C4DD" />`,
    );
    const violations = scanMotionSourcesForViolations([path], {
      exemptPaths: new Set(),
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ rule: 'hex-colour' });
  });

  it('fails on rgb() and hsl() literals', () => {
    const path = write(
      'components/motion/example.tsx',
      `const fill = 'rgb(88, 196, 221)'; const edge = 'hsl(180, 50%, 50%)';`,
    );
    const rules = scanMotionSourcesForViolations([path], {
      exemptPaths: new Set(),
    }).map((v) => v.rule);
    expect(rules).toContain('colour-function');
  });

  it('fails on a hard-coded duration in an interactive or scene file', () => {
    const path = write(
      'components/interactive/example.tsx',
      `style={{ transitionDuration: '150ms' }} className="duration-500"`,
    );
    const rules = scanMotionSourcesForViolations([path], {
      exemptPaths: new Set(),
    }).map((v) => v.rule);
    expect(rules).toContain('duration');
  });

  it('fails on a hard-coded easing', () => {
    const path = write(
      'components/motion/example.tsx',
      `style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }} className="ease-out"`,
    );
    const rules = scanMotionSourcesForViolations([path], {
      exemptPaths: new Set(),
    }).map((v) => v.rule);
    expect(rules).toContain('easing');
  });

  it.each([
    'transition: opacity 1s ease;',
    'animation: reveal 2s steps(4, end);',
    'transition: transform 3s linear(0, 1);',
    "style={{ transition: 'opacity 1s ease-in-out' }}",
  ])('rejects literal timing in shorthand: %s', (source) => {
    const path = write('components/motion/shorthand.tsx', source);
    const rules = scanMotionSourcesForViolations([path], {
      exemptPaths: new Set(),
    }).map((violation) => violation.rule);
    expect(rules).toContain('duration');
    expect(rules).toContain('easing');
  });

  it.each([
    'transition: opacity var(--motion-beat) var(--motion-ease-smooth);',
    'transition: opacity var(--brand-transition-short) var(--brand-ease-out);',
    "style={{ transition: 'opacity var(--motion-beat) var(--motion-ease-smooth)' }}",
    'const steps = (n: number) => n + 1; const linear = (t: number) => t;',
    'const value = linear(x) + steps(y);',
    '<use href="#aabbcc" />',
  ])('keeps token timing, math, and references: %s', (source) => {
    const path = write('components/motion/positive.tsx', source);
    expect(scanMotionSourcesForViolations([path], {
      exemptPaths: new Set(),
    })).toEqual([]);
  });

  it('passes files that use tokens', () => {
    const path = write(
      'components/motion/scenes/example.tsx',
      [
        `<ellipse fill="var(--role-state-stage)" />`,
        `<path style={{ transitionDuration: 'var(--motion-beat)' }} />`,
        `<g style={{ transitionTimingFunction: 'var(--motion-ease-smooth)' }} />`,
      ].join('\n'),
    );
    expect(
      scanMotionSourcesForViolations([path], { exemptPaths: new Set() }),
    ).toEqual([]);
  });

  it('exempts the generated token stylesheet only', () => {
    const generated = write(
      'components/motion/motion-tokens.css',
      `--role-state-stage: #58C4DD;`,
    );
    expect(
      scanMotionSourcesForViolations([generated], {
        exemptPaths: new Set([generated]),
      }),
    ).toEqual([]);
    expect(
      scanMotionSourcesForViolations([generated], { exemptPaths: new Set() }),
    ).toHaveLength(1);
  });

  it('does not mistake id references for hex colours', () => {
    const path = write(
      'components/motion/example.tsx',
      `<use href="#arrow-head" /> <clipPath id="write-clip" />`,
    );
    expect(
      scanMotionSourcesForViolations([path], { exemptPaths: new Set() }),
    ).toEqual([]);
  });
});
