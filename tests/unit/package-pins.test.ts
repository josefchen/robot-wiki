import { describe, expect, it } from 'vitest';
import pkg from '@/package.json';

// Guards the scaffold contract: critical dependencies stay exactly pinned
// (no caret/tilde ranges) and the required npm scripts exist.
describe('scaffold dependency pins', () => {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<
    string,
    string
  >;

  it('pins exact versions for every declared dependency', () => {
    // Allows plain exact pins ("16.3.0") and exact npm aliases
    // ("npm:typescript@6.0.3", used for the typescript-eslint TS 6 bridge).
    const exactPin = /^(npm:[a-z0-9@/.-]+@)?\d+\.\d+\.\d+$/;
    for (const [name, version] of Object.entries(allDeps)) {
      expect(version, `${name} must be pinned exactly`).toMatch(exactPin);
    }
  });

  it('pins the verified core stack from the architecture', () => {
    expect(allDeps.next).toBe('16.3.0');
    expect(allDeps['@next/mdx']).toBe('16.3.0');
    expect(allDeps.react).toMatch(/^19\./);
    expect(allDeps['react-dom']).toMatch(/^19\./);
    expect(allDeps.typescript).toBe('7.0.2');
    expect(allDeps.tailwindcss).toBe('4.3.3');
    expect(allDeps['@tailwindcss/postcss']).toBe('4.3.3');
    expect(allDeps['@react-three/fiber']).toBe('9.7.0');
    expect(allDeps['@react-three/drei']).toBe('10.7.8');
    expect(allDeps.three).toBe('0.185.1');
    expect(allDeps['urdf-loader']).toBe('0.13.1');
    expect(allDeps.motion).toBe('13.0.0');
    expect(allDeps.recharts).toBe('3.10.1');
    expect(allDeps.d3).toBe('7.9.0');
    expect(allDeps.pagefind).toBe('1.5.2');
    expect(allDeps.minisearch).toBe('7.2.0');
    expect(allDeps.katex).toBe('0.18.1');
    expect(allDeps.zod).toMatch(/^3\./);
    expect(allDeps.vitest).toBe('4.1.10');
    expect(allDeps['@playwright/test']).toBe('1.62.1');
    expect(allDeps['@axe-core/playwright']).toBe('4.12.1');
  });
});

describe('scaffold npm scripts', () => {
  it.each([
    'dev',
    'build',
    'typecheck',
    'lint',
    'test',
    'test:e2e',
    'validate:content',
  ])('defines the "%s" script', (script) => {
    expect(pkg.scripts).toHaveProperty(script);
  });
});
