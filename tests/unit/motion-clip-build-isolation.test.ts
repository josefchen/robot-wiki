import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');

interface PackageScripts {
  scripts: Record<string, string>;
}

/**
 * The clip renderer runs offline on a build machine, in a Python venv the
 * deployment platform never sees. These tests pin that boundary from both
 * sides: the production entry point (and every hook it pulls in) must not
 * invoke the renderer, while the renderer entry itself must stay runnable
 * as a plain script for the machine that has the venv.
 */
describe('clip renderer build isolation', () => {
  const pkg = JSON.parse(
    readFileSync(join(ROOT, 'package.json'), 'utf8'),
  ) as PackageScripts;

  it('keeps the renderer out of the production build entry point', () => {
    const vercelBuild = pkg.scripts['vercel-build'];
    expect(vercelBuild).toBeDefined();
    for (const banned of ['render-clips', 'manim', 'motion-venv']) {
      expect(vercelBuild).not.toContain(banned);
    }
  });

  it('keeps the renderer out of every build-phase hook', () => {
    for (const hook of ['prebuild', 'build', 'postbuild']) {
      const script = pkg.scripts[hook];
      expect(script, hook).toBeDefined();
      for (const banned of ['render-clips', 'manim', 'motion-venv']) {
        expect(script, `${hook} must not invoke ${banned}`).not.toContain(
          banned,
        );
      }
    }
  });

  it('exposes the renderer and the venv setup as standalone scripts', () => {
    expect(pkg.scripts['clips:render']).toBe(
      'node scripts/render-clips.ts',
    );
    expect(pkg.scripts['clips:venv']).toBe(
      'bash scripts/motion/setup-venv.sh',
    );
  });

  it('pins the renderer version in a requirements file', () => {
    const requirements = readFileSync(
      join(ROOT, 'scripts', 'motion', 'requirements.txt'),
      'utf8',
    );
    expect(requirements).toMatch(/^manim==0\.21\.0$/m);
  });
});
