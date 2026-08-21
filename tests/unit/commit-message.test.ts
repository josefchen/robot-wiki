import { describe, expect, it } from 'vitest';
import {
  COMMIT_TYPES,
  commitSubject,
  validateCommitMessage,
} from '@/lib/commit-message';

describe('commitSubject', () => {
  it('reads the first line of a plain message', () => {
    expect(commitSubject('fix(ik): clamp the damped-least-squares step\n')).toBe(
      'fix(ik): clamp the damped-least-squares step',
    );
  });

  it('skips the blank line and instruction block git hands an empty editor buffer', () => {
    const buffer = [
      '',
      '# Please enter the commit message for your changes. Lines starting',
      "# with '#' will be ignored, and an empty message aborts the commit.",
      '#',
      '# On branch main',
      '',
      'feat(playground): record and replay joint trajectories',
      '',
      '# Changes to be committed:',
      '#\tmodified:   components/playground/arm.tsx',
    ].join('\n');
    expect(commitSubject(buffer)).toBe(
      'feat(playground): record and replay joint trajectories',
    );
  });

  it('is empty when the message carries nothing but comments', () => {
    expect(commitSubject('\n# On branch main\n#\n')).toBe('');
  });

  it('stops at the scissors line so a verbose empty buffer is not a diff subject', () => {
    const buffer = [
      '',
      '# Please enter the commit message for your changes. Lines starting',
      "# with '#' will be ignored, and an empty message aborts the commit.",
      '#',
      '# ------------------------ >8 ------------------------',
      '# Do not modify or remove the line above.',
      '# Everything below it will be ignored.',
      'diff --git a/lib/commit-message.ts b/lib/commit-message.ts',
      'index 1111111..2222222 100644',
      '--- a/lib/commit-message.ts',
      '+++ b/lib/commit-message.ts',
    ].join('\n');
    expect(commitSubject(buffer)).toBe('');
  });

  it('still reads a subject written above the scissors line', () => {
    const buffer = [
      'fix(hooks): stop at the verbose scissors marker',
      '',
      '# ------------------------ >8 ------------------------',
      'diff --git a/lib/commit-message.ts b/lib/commit-message.ts',
    ].join('\n');
    expect(commitSubject(buffer)).toBe('fix(hooks): stop at the verbose scissors marker');
  });
});

describe('validateCommitMessage', () => {
  it('accepts the conventional subjects already on main', () => {
    for (const subject of [
      'fix(market-map): apply bubble deep-link highlight once the mark is plotted',
      'feat(seo): allow indexing at go-public (VAL-BRAND-007), keep /404/ noindex',
      'test: fix search-facet-pending pauseAt clock race under full-suite load',
      'chore: regenerate reading-times for action-chunking prose links',
      'docs: expand the contributing guide',
      'style: tighten the reference list spacing',
      // Acronym-first descriptions are legitimate, so no lowercase rule.
      'feat: SEO metadata fix, card next/link migration, eureka panel fit',
      // Long subjects are allowed; the longest on main is 121 characters.
      'fix: home adjacent-module links (VAL-ADJ-009) and action-chunking pi-line/diffusion-policy in-prose links (VAL-CROSS-006)',
      // Breaking-change marker.
      'feat(data)!: drop the legacy company schema',
    ]) {
      expect(validateCommitMessage(`${subject}\n`), subject).toEqual([]);
    }
  });

  it('accepts a subject followed by a body', () => {
    expect(
      validateCommitMessage(
        'fix(search): stop the facet count flickering\n\nMiniSearch was re-scoring on every keystroke.\n',
      ),
    ).toEqual([]);
  });

  it('rejects a subject with no conventional type', () => {
    // Both real offenders in the history this hook was written for.
    for (const subject of [
      'harden bubble view affordances: hover/focus labels, focus ring, roving arrows',
      'harden market-map URL filter edges and search facet transition',
      'update the glossary',
      'WIP',
    ]) {
      const problems = validateCommitMessage(`${subject}\n`);
      expect(problems.length, subject).toBe(1);
      expect(problems[0]).toMatch(/conventional type/);
    }
  });

  it('rejects a type that is not in the allowed set', () => {
    expect(validateCommitMessage('feature: add the bear case article\n')).toEqual([
      expect.stringMatching(/conventional type/),
    ]);
  });

  it('rejects a type with no description after the colon', () => {
    for (const subject of ['fix: ', 'fix:', 'fix:clamp the solver step']) {
      expect(validateCommitMessage(`${subject}\n`), subject).toEqual([
        expect.stringMatching(/conventional type/),
      ]);
    }
  });

  it('rejects a trailing period on the subject', () => {
    expect(
      validateCommitMessage('fix(ik): clamp the solver step.\n'),
    ).toEqual(['the subject must not end with a period']);
  });

  it('rejects em and en dashes, the prose rule the articles are linted against', () => {
    for (const subject of [
      'feat(glossary): cited definitions \u2014 hover and focus',
      'feat(glossary): cited definitions \u2013 hover and focus',
    ]) {
      expect(validateCommitMessage(`${subject}\n`), subject).toEqual([
        expect.stringMatching(/em or en dashes/),
      ]);
    }
  });

  it('reports every problem at once so one reword fixes the message', () => {
    expect(
      validateCommitMessage('reworked the market map \u2014 again.\n'),
    ).toHaveLength(2);
  });

  it('rejects an empty message', () => {
    expect(validateCommitMessage('\n\n')).toEqual(['the commit message is empty']);
  });

  it('leaves messages git writes itself alone', () => {
    for (const subject of [
      "Merge branch 'main' into feat/market-map",
      'Revert "feat(seo): allow indexing at go-public"',
      'fixup! feat(playground): record and replay joint trajectories',
      'squash! fix(ik): clamp the solver step',
      'amend! docs: expand the contributing guide',
    ]) {
      expect(validateCommitMessage(`${subject}\n`), subject).toEqual([]);
    }
  });
});

describe('COMMIT_TYPES', () => {
  it('covers the prefixes CONTRIBUTING.md names', () => {
    for (const type of ['feat', 'fix', 'chore', 'docs']) {
      expect(COMMIT_TYPES).toContain(type);
    }
  });

  it('holds only lowercase words, so the subject pattern stays predictable', () => {
    for (const type of COMMIT_TYPES) {
      expect(type).toMatch(/^[a-z]+$/);
    }
  });
});
