import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import lintStagedConfig from '@/lint-staged.config.mjs';
import pkg from '@/package.json';

// The pre-commit gate is only real if it stays wired. Husky installs the hooks
// from the `prepare` script, so a hook file that disappears, a lint-staged
// glob that names a script package.json no longer defines, or a `prepare` that
// stops calling husky would all silently drop the gate on every fresh clone
// without any other test noticing. These read the shipped files the way git
// does. process.cwd() is the repo root, matching tests/unit/repo-docs.test.ts.
const read = (rel: string): string =>
  readFileSync(join(process.cwd(), rel), 'utf8');

const scripts = pkg.scripts as Record<string, string>;

/** Every `npm run <script>` invocation in a hook or config file. */
function npmRunCommands(text: string): string[] {
  return [...text.matchAll(/npm run ([a-z][a-z0-9:.-]*)/g)].map((m) => m[1]);
}

/**
 * The commands lint-staged would run for a glob, with functions resolved. A
 * task is a string, a function, or an array of either.
 */
function commandsFor(glob: string): string[] {
  const task = (lintStagedConfig as Record<string, unknown>)[glob];
  const entries = Array.isArray(task) ? task : [task];
  return entries.map((entry) =>
    typeof entry === 'function'
      ? String((entry as (files: string[]) => string)(['staged.ts']))
      : String(entry),
  );
}

describe('husky installation', () => {
  it('installs the hooks from prepare, so a fresh clone is gated after npm install', () => {
    expect(scripts.prepare).toBe('husky');
    expect(
      { ...pkg.dependencies, ...pkg.devDependencies },
    ).toHaveProperty('husky');
  });

  it('keeps the postinstall TS 6 bridge alongside prepare', () => {
    // npm runs postinstall before prepare, so adding husky must not have
    // displaced the typescript-eslint bridge that `npm run lint` depends on.
    expect(scripts.postinstall).toBe('node scripts/postinstall.mjs');
  });

  it.each(['pre-commit', 'commit-msg', 'pre-push'])(
    'ships an executable .husky/%s',
    (hook) => {
      const path = join(process.cwd(), '.husky', hook);
      expect(existsSync(path), `${path} is missing`).toBe(true);
      expect(read(`.husky/${hook}`).trim().length).toBeGreaterThan(0);
    },
  );
});

describe('pre-commit hook', () => {
  const hook = () => read('.husky/pre-commit');

  it('runs lint-staged', () => {
    expect(hook()).toMatch(/lint-staged/);
  });

  it('runs the tasks serially, so typecheck and the validators cannot race', () => {
    // `next typegen` rewrites .next/types while it runs; concurrent tasks
    // reading those files would flake the hook rather than the code.
    expect(hook()).toMatch(/--concurrent false/);
  });
});

describe('lint-staged tasks', () => {
  const globs = Object.keys(lintStagedConfig as Record<string, unknown>);

  it('covers the TypeScript and TSX sources', () => {
    const sourceGlob = globs.find((glob) => /\{.*\btsx\b.*\}/.test(glob));
    expect(sourceGlob, `no glob matches .tsx: ${globs.join(', ')}`).toBeDefined();
    const commands = commandsFor(sourceGlob as string);
    expect(commands.some((c) => c.startsWith('eslint '))).toBe(true);
    expect(commands).toContain('npm run typecheck');
  });

  it('lints staged files with --fix and refuses warnings', () => {
    const sourceGlob = globs.find((glob) => /\{.*\btsx\b.*\}/.test(glob));
    const eslintCommand = commandsFor(sourceGlob as string).find((c) =>
      c.startsWith('eslint '),
    );
    expect(eslintCommand).toMatch(/--fix\b/);
    expect(eslintCommand).toMatch(/--max-warnings=0\b/);
    // eslint.config.mjs ignores research/ and generated output; without this
    // an ignored staged file becomes a warning and --max-warnings=0 would
    // reject an otherwise clean commit.
    expect(eslintCommand).toMatch(/--no-warn-ignored\b/);
  });

  it('validates content when staged MDX prose or a data registry feeds it', () => {
    const contentGlob = globs.find((glob) => glob.includes('.mdx'));
    expect(contentGlob, `no glob matches .mdx: ${globs.join(', ')}`).toBeDefined();
    expect(contentGlob).toMatch(/data\//);
    expect(commandsFor(contentGlob as string)).toContain(
      'npm run validate:content',
    );
  });

  it('only calls npm scripts that package.json defines', () => {
    for (const glob of globs) {
      for (const name of npmRunCommands(commandsFor(glob).join('\n'))) {
        expect(scripts, `lint-staged runs unknown script "${name}"`).toHaveProperty(
          name,
        );
      }
    }
  });

  it('runs each project-wide gate once per commit, not once per staged file', () => {
    // lint-staged appends the file list to a string command; a function's
    // return value is used verbatim. typecheck and validate:content take no
    // file arguments, so they must come from functions.
    for (const glob of globs) {
      const task = (lintStagedConfig as Record<string, unknown>)[glob];
      const entries = Array.isArray(task) ? task : [task];
      for (const entry of entries) {
        if (typeof entry === 'string' && entry.startsWith('npm run')) {
          throw new Error(
            `lint-staged glob "${glob}" would append staged filenames to "${entry}"`,
          );
        }
      }
    }
  });
});

describe('commit-msg hook', () => {
  it('runs the checker against the message file git passes as $1', () => {
    const hook = read('.husky/commit-msg');
    expect(hook).toMatch(/node scripts\/check-commit-msg\.ts "\$1"/);
    expect(
      existsSync(join(process.cwd(), 'scripts/check-commit-msg.ts')),
    ).toBe(true);
  });
});

describe('pre-push hook', () => {
  it('runs the Vitest suite, the gate a per-commit hook cannot afford', () => {
    const hook = read('.husky/pre-push');
    expect(npmRunCommands(hook)).toContain('test');
    for (const name of npmRunCommands(hook)) {
      expect(scripts).toHaveProperty(name);
    }
  });
});
