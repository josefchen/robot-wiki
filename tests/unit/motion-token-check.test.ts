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
    'transition: opacity var(--motion-beat)\n  ease;',
    'transition:\n  opacity var(--motion-beat)\n  ease-out;',
    'animation: reveal var(--motion-beat)\n  ease;',
    'animation:\n  reveal var(--motion-beat)\n  linear;',
    'animation: reveal var(--motion-beat)\n  steps(4, end);',
    'transition: opacity var(--motion-beat)\n  linear(0, 1);',
    "style={{ transition: 'opacity var(--motion-beat)\\n  ease' }}",
    "style={{ animation: 'reveal var(--motion-beat)\\n  ease' }}",
    'style={{ animation: `reveal var(--motion-beat)\n  ease` }}',
    "const css = 'transition: opacity var(--motion-beat)\\n  ease';",
  ])('rejects literal easing in a complete multiline declaration: %s', (source) => {
    const path = write('components/motion/multiline.tsx', source);
    const violations = scanMotionSourcesForViolations([path], {
      exemptPaths: new Set(),
    });
    expect(violations).toContainEqual(expect.objectContaining({
      rule: 'easing',
      line: source.includes('\\n') ? 1 : source.split('\n').length,
    }));
  });

  it.each([
    { source: "style={{ 'transition': 'opacity var(--motion-beat) ease' }}", line: 1, literal: 'ease' },
    { source: 'style={{ "transition": "opacity var(--motion-beat) linear" }}', line: 1, literal: 'linear' },
    { source: "style={{ 'animation': 'reveal var(--motion-beat) ease' }}", line: 1, literal: 'ease' },
    { source: 'style={{ "animation": `reveal var(--motion-beat)\n  steps(4, end)` }}', line: 2, literal: 'steps(' },
    { source: "style={{\n  'transition': `opacity var(--motion-beat)\n    ease`\n}}", line: 3, literal: 'ease' },
    { source: 'style={{\n  "animation": `reveal var(--motion-beat)\n    linear`\n}}', line: 3, literal: 'linear' },
    { source: "style={{ 'transition-timing-function': `\n  ease` }}", line: 2, literal: 'ease' },
    { source: 'style={{ "animationTimingFunction": `reveal\n  steps(2, end)` }}', line: 2, literal: 'steps(' },
  ])('rejects literal easing inside a quoted timing key: $source', ({ source, line, literal }) => {
    const path = write('components/motion/quoted-key.tsx', source);
    const violations = scanMotionSourcesForViolations([path], {
      exemptPaths: new Set(),
    });
    expect(violations, source).toContainEqual(expect.objectContaining({
      rule: 'easing',
      line,
      snippet: expect.stringContaining(literal),
    }));
  });

  it.each([
    "style={{ 'transition': 'opacity var(--motion-beat) var(--motion-ease-smooth)' }}",
    'style={{ "animation": `reveal var(--motion-beat)\n  var(--motion-ease-smooth)` }}',
    "style={{ 'transition-timing-function': 'var(--motion-ease-smooth)' }}",
    'style={{ "animationTimingFunction": "var(--motion-ease-smooth)" }}',
    "style={{ 'transition-duration': 'var(--motion-beat)' }}",
    'style={{ "animationDuration": "var(--motion-beat)" }}',
    "style={{ 'transition': 'opacity var(--motion-beat) var(--motion-ease-smooth)' }}; const linear = (x: number) => x; const value = linear(1) + steps(2); <use href=\"#aabbcc\" />",
  ])('keeps token-backed quoted timing and non-timing math/IDs: %s', (source) => {
    const path = write('components/motion/quoted-positive.tsx', source);
    expect(scanMotionSourcesForViolations([path], { exemptPaths: new Set() })).toEqual([]);
  });

  it.each([
    'transition: opacity var(--motion-beat) var(--motion-ease-smooth);',
    'transition: opacity var(--brand-transition-short) var(--brand-ease-out);',
    'transition: opacity var(--motion-beat)\n  var(--motion-ease-smooth);',
    'animation:\n  reveal var(--motion-beat)\n  var(--motion-ease-smooth);',
    "style={{ transition: 'opacity var(--motion-beat)\\n  var(--motion-ease-smooth)' }}",
    'style={{ animation: `reveal var(--motion-beat)\n  var(--motion-ease-smooth)` }}',
    "style={{ transition: 'opacity var(--motion-beat) var(--motion-ease-smooth)' }}",
    "const css = 'transition: opacity var(--motion-beat)'; const value = linear(x);",
    'transition: opacity var(--motion-beat) var(--motion-ease-smooth);\nconst value = linear(x) + steps(y);',
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
