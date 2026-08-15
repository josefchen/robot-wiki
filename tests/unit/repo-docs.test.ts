import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

// Repo docs are load-bearing (VAL-ADJ-012/013/014): the README must document
// commands that actually exist in package.json, CONTRIBUTING must carry PR
// guidelines and the project's content standards, and both license files
// must hold the real license texts. These tests read the shipped files the
// way a build-time validator would instead of trusting the filenames.
// process.cwd() is the repo root: the e2e specs resolve out/ the same way,
// and the jsdom environment rewrites import.meta.url to an http URL.
// Reads are lazy (beforeAll) so one missing file reports as its own failing
// suite instead of taking the whole file down at import time.
const read = (rel: string): string => readFileSync(join(process.cwd(), rel), 'utf8');

const scripts: Record<string, string> = JSON.parse(read('package.json')).scripts;

/** Every `npm run <script>` invocation named in a doc. */
function npmRunCommands(text: string): string[] {
  return [...text.matchAll(/npm run ([a-z][a-z0-9:.-]*)/g)].map((m) => m[1]);
}

/** Markdown headings (h1-h3) of a doc, for topic coverage checks. */
function headings(text: string): string[] {
  return [...text.matchAll(/^#{1,3} (.+)$/gm)].map((m) => m[1]);
}

describe('README.md (VAL-ADJ-012)', () => {
  let readme: string;
  beforeAll(() => {
    readme = read('README.md');
  });

  it('exists and describes the project as a static robotics encyclopedia', () => {
    expect(readme.length).toBeGreaterThan(2000);
    expect(readme).toMatch(/robot-wiki/i);
    expect(readme).toMatch(/encycloped/i);
    expect(readme).toMatch(/robotics/i);
    expect(readme).toMatch(/static/i);
  });

  it('covers setup, run, test, build, and deploy as headings', () => {
    const hs = headings(readme);
    for (const topic of [
      /setup|install/i,
      /run|develop/i,
      /test/i,
      /build/i,
      /deploy/i,
    ]) {
      expect(
        hs.some((h) => topic.test(h)),
        `no README heading matches ${topic}`,
      ).toBe(true);
    }
  });

  it('only documents scripts that exist in package.json', () => {
    const documented = npmRunCommands(readme);
    expect(documented.length).toBeGreaterThan(0);
    const unknown = documented.filter((name) => !(name in scripts));
    expect(unknown).toEqual([]);
  });

  it('documents the core scripts', () => {
    const documented = new Set(npmRunCommands(readme));
    for (const name of [
      'dev',
      'build',
      'test',
      'test:e2e',
      'typecheck',
      'lint',
      'validate:content',
    ]) {
      expect(documented.has(name), `README must document npm run ${name}`).toBe(true);
    }
  });
});

describe('CONTRIBUTING.md (VAL-ADJ-013)', () => {
  let contributing: string;
  beforeAll(() => {
    contributing = read('CONTRIBUTING.md');
  });

  it('exists with an explicit pull request guidelines section', () => {
    expect(contributing.length).toBeGreaterThan(1500);
    expect(
      headings(contributing).some((h) => /pull request/i.test(h)),
      'no CONTRIBUTING heading mentions pull requests',
    ).toBe(true);
  });

  it('explains how to open a PR against main', () => {
    expect(contributing).toMatch(/branch/i);
    expect(contributing).toMatch(/main/i);
    expect(contributing).toMatch(/pull request/i);
  });

  it('sets review expectations', () => {
    expect(contributing).toMatch(/review/i);
  });

  it('states the content standards: citations and no invented data', () => {
    expect(contributing).toMatch(/citation/i);
    expect(contributing).toMatch(/not disclosed/i);
  });

  it('requires the checks a PR must pass, all real scripts', () => {
    const required = ['typecheck', 'lint', 'test', 'build'];
    const documented = new Set(npmRunCommands(contributing));
    for (const name of required) {
      expect(
        documented.has(name),
        `CONTRIBUTING must require npm run ${name}`,
      ).toBe(true);
    }
    const unknown = npmRunCommands(contributing).filter((n) => !(n in scripts));
    expect(unknown).toEqual([]);
  });
});

describe('LICENSE (VAL-ADJ-014, MIT)', () => {
  let license: string;
  beforeAll(() => {
    license = read('LICENSE');
  });

  it('contains the MIT license text', () => {
    expect(license).toMatch(/MIT License/);
    expect(license).toMatch(/Permission is hereby granted, free of charge/);
    expect(license).toMatch(/THE SOFTWARE IS PROVIDED "AS IS"/);
  });
});

describe('LICENSE-CONTENT (VAL-ADJ-014, CC BY 4.0)', () => {
  let license: string;
  beforeAll(() => {
    license = read('LICENSE-CONTENT');
  });

  it('contains the Creative Commons Attribution 4.0 International text', () => {
    expect(license).toMatch(/Attribution 4.0 International/);
    // The official plain-text legal code renders section dashes as "--";
    // allow en/em/double-hyphen variants so the check survives reflowing.
    expect(license).toMatch(/Section 1\s*[–—-]+\s*Definitions/i);
    expect(license).toMatch(/Section 3\s*[–—-]+\s*License Conditions/i);
  });
});
