import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTION_INK_RGB,
  HOME_COMPOSITION_ANCHORS,
  HOME_COMPOSITION_EVIDENCE_PATH,
  HOME_VIEWPORT,
  domainDestinationVerdicts,
  heroLockupVerdicts,
  homeCompositionVerdicts,
  homeEvidenceFingerprint,
  longestAdjacentRun,
  readHomeCompositionEvidence,
  type HomeCompositionEvidence,
} from '@/lib/brand-v2-home-evidence';
import { canonicalDomainDestinations } from '@/lib/home-populations';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';

const ROOT = process.cwd();
const LITERALS = {
  identity: PUBLIC_IDENTITY,
  descriptor: PUBLIC_DESCRIPTOR,
};

function fingerprint(): string {
  return homeEvidenceFingerprint({ root: ROOT, ...LITERALS });
}

function committed(): HomeCompositionEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, HOME_COMPOSITION_EVIDENCE_PATH), 'utf8'),
  ) as HomeCompositionEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(
  change: (evidence: HomeCompositionEvidence) => void,
): HomeCompositionEvidence {
  const copy = JSON.parse(JSON.stringify(committed())) as HomeCompositionEvidence;
  change(copy);
  return copy;
}

function accept(evidence: HomeCompositionEvidence): HomeCompositionEvidence {
  return readHomeCompositionEvidence({
    artifact: evidence,
    fingerprint: fingerprint(),
  });
}

/** The anchors that fail after one planted change, and nothing else. */
function failingAnchors(
  change: (evidence: HomeCompositionEvidence) => void,
): string[] {
  return homeCompositionVerdicts(mutate(change), LITERALS)
    .filter(({ failures }) => failures.length > 0)
    .map(({ id }) => id as string)
    .sort();
}

function anchorFailures(
  change: (evidence: HomeCompositionEvidence) => void,
): string {
  return homeCompositionVerdicts(mutate(change), LITERALS)
    .flatMap(({ failures }) => failures)
    .join(' ');
}

describe('home composition evidence', () => {
  it('accepts the committed sweep for the tree it was measured against', () => {
    const evidence = accept(committed());
    expect(evidence.viewport).toBe(HOME_VIEWPORT.id);
    expect(evidence.route).toBe('/');
    expect(evidence.heroLockups).toHaveLength(1);
    expect(
      homeCompositionVerdicts(evidence, LITERALS).map(({ id }) => id),
    ).toEqual([...HOME_COMPOSITION_ANCHORS]);
  });

  it('refuses stale, incomplete, and unmeasured home evidence', () => {
    const current = fingerprint();
    // Each case is one way the artifact can stop describing this tree.
    expect(() =>
      readHomeCompositionEvidence({
        artifact: committed(),
        // A fixed replacement digit silently stops being a mutation
        // whenever the real fingerprint already ends in it.
        fingerprint: `${current.slice(0, 63)}${current.endsWith('0') ? '1' : '0'}`,
      }),
    ).toThrow(/stale/);
    expect(() =>
      readHomeCompositionEvidence({ artifact: null, fingerprint: current }),
    ).toThrow(/not an object/);
    expect(() =>
      readHomeCompositionEvidence({
        artifact: mutate((evidence) => {
          evidence.version = 2 as unknown as 1;
        }),
        fingerprint: current,
      }),
    ).toThrow(/version/);
    expect(() =>
      readHomeCompositionEvidence({
        artifact: mutate((evidence) => {
          evidence.viewport = '375x812';
        }),
        fingerprint: current,
      }),
    ).toThrow(/swept at 375x812/);
    expect(() =>
      readHomeCompositionEvidence({
        artifact: mutate((evidence) => {
          evidence.route = '/glossary/';
        }),
        fingerprint: current,
      }),
    ).toThrow(/covers \/glossary\//);
    expect(() =>
      readHomeCompositionEvidence({
        artifact: mutate((evidence) => {
          evidence.visibleTextLength = 0;
        }),
        fingerprint: current,
      }),
    ).toThrow(/empty rendered page/);
    expect(() =>
      readHomeCompositionEvidence({
        artifact: mutate((evidence) => {
          evidence.heroLockups = [];
        }),
        fingerprint: current,
      }),
    ).toThrow(/no hero lockup/);
    expect(() =>
      readHomeCompositionEvidence({
        artifact: mutate((evidence) => {
          evidence.domainEntries = [];
        }),
        fingerprint: current,
      }),
    ).toThrow(/no domain entry/);
    expect(() =>
      readHomeCompositionEvidence({
        artifact: mutate((evidence) => {
          evidence.sections = [];
        }),
        fingerprint: current,
      }),
    ).toThrow(/no top-level section/);
  });

  it('fails a duplicate lockup, a wrong identity, a non-Tektur hero and a reworded descriptor', () => {
    expect(
      heroLockupVerdicts(committed(), LITERALS).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);
    const duplicated = heroLockupVerdicts(
      mutate((evidence) => {
        evidence.heroLockups.push({
          ...evidence.heroLockups[0],
          index: 1,
          descriptorText: null,
        });
      }),
      LITERALS,
    );
    expect(duplicated).toHaveLength(2);
    expect(duplicated[0].failures).toEqual([]);
    expect(duplicated[1].failures.join(' ')).toMatch(/duplicate hero lockup/);
    expect(
      heroLockupVerdicts(
        mutate((evidence) => {
          evidence.heroLockups[0].text = 'robot-wiki';
        }),
        LITERALS,
      ).flatMap(({ failures }) => failures).join(' '),
    ).toMatch(/not the exact public identity/);
    expect(
      heroLockupVerdicts(
        mutate((evidence) => {
          evidence.heroLockups[0].fontFamilyHead = 'IBM Plex Sans';
        }),
        LITERALS,
      ).flatMap(({ failures }) => failures).join(' '),
    ).toMatch(/not Tektur/);
    expect(
      heroLockupVerdicts(
        mutate((evidence) => {
          evidence.heroLockups[0].descriptorText =
            'Citation first encyclopedia of modern robot learning';
        }),
        LITERALS,
      ).flatMap(({ failures }) => failures).join(' '),
    ).toMatch(/not the exact/);
    expect(
      heroLockupVerdicts(
        mutate((evidence) => {
          evidence.heroLockups[0].renderedLines = 4;
        }),
        LITERALS,
      ).flatMap(({ failures }) => failures).join(' '),
    ).toMatch(/renders on 4 lines/);
  });

  it('fails each composition anchor independently', () => {
    expect(
      homeCompositionVerdicts(committed(), LITERALS).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);
    // A hero only 1.2x its largest supporting heading is not dominant.
    expect(
      failingAnchors((evidence) => {
        evidence.largestSupportingHeadingPx =
          evidence.heroLockups[0].fontSizePx / 1.2;
      }),
    ).toEqual(['anchor:home-dominant-hero']);
    expect(
      failingAnchors((evidence) => {
        evidence.heroLockups[0].descriptorText = 'Robotics encyclopaedia';
      }),
    ).toEqual(['anchor:home-exact-descriptor']);
    // An action scrolled below the fold is not in the first composition.
    expect(
      failingAnchors((evidence) => {
        for (const action of evidence.actions) {
          action.topPx += HOME_VIEWPORT.height;
          action.bottomPx += HOME_VIEWPORT.height;
        }
      }),
    ).toEqual(['anchor:home-black-primary-action']);
    expect(
      anchorFailures((evidence) => {
        for (const action of evidence.actions) {
          if (action.backgroundColour === ACTION_INK_RGB) {
            action.colour = 'rgb(11, 11, 12)';
          }
        }
      }),
    ).toMatch(/not the on-action white/);
    // Lime carried by colour alone, with no cue a non-sighted reader gets.
    expect(
      failingAnchors((evidence) => {
        for (const highlight of evidence.highlights) {
          highlight.tag = 'span';
          highlight.nonColourCue = null;
        }
      }),
    ).toEqual(['anchor:home-lime-highlight']);
    expect(
      failingAnchors((evidence) => {
        evidence.sections[2].signature = null;
      }),
    ).toEqual(['anchor:home-board-derived-structure']);
    expect(
      anchorFailures((evidence) => {
        for (const section of evidence.sections.slice(2)) {
          section.derivedSignature = 'one measured form';
          section.derivedSurfaceHeadingAction = 'one measured form';
        }
      }),
    ).toMatch(/adjacent top-level sections measure one structural form/);
    expect(
      anchorFailures((evidence) => {
        for (const entry of evidence.domainEntries) entry.bordered = true;
      }),
    ).toMatch(/bordered cards rather than index rows/);
    expect(
      failingAnchors((evidence) => {
        evidence.progressMetadataMatches = ['coming soon'];
      }),
    ).toEqual(['anchor:home-no-fabricated-metrics']);
  });

  it('refuses a highlight whose only cue is the annotation the sweep reads', () => {
    // The input that used to pass: the collector credited
    // `data-brand-highlight` as the non-colour cue, so a lime-painted span
    // carrying it satisfied the anchor while a reader in greyscale or forced
    // colours met nothing at all where the emphasis was supposed to be.
    expect(
      anchorFailures((evidence) => {
        for (const highlight of evidence.highlights) {
          highlight.tag = 'span';
          highlight.nonColourCue = null;
          highlight.annotation = 'home-premise';
        }
      }),
    ).toMatch(/is an annotation addressed to this sweep/);
  });

  it('refuses four identical sections that declare four different signatures', () => {
    // The input that used to pass: the bound ran over the authored
    // `data-brand-module-signature` strings, so four adjacent sections built
    // from one template could each declare a different string and the run
    // measured 1. The bound now runs over what they measure as, and the
    // annotation has to agree with the measurement.
    const planted = (evidence: HomeCompositionEvidence): void => {
      for (const [offset, section] of evidence.sections.slice(2, 6).entries()) {
        section.derivedSignature = 'one measured form';
        section.derivedSurfaceHeadingAction = 'one measured form';
        section.signature = `plain/module-heading/variant-${offset}`;
      }
    };
    const failures = anchorFailures(planted);
    expect(failures).toMatch(
      /4 adjacent top-level sections measure one structural form, over the 3/,
    );
    expect(failures).toMatch(
      /measure one structural form yet declare 4 different data-brand-module-signature values/,
    );
    // The run over the authored strings, which is what used to decide this,
    // is still 1 on exactly this input.
    expect(
      longestAdjacentRun(
        mutate(planted).sections.map(({ signature }) => signature),
      ),
    ).toBe(1);
  });

  it('fails a dropped, renamed, undescribed or invisible domain destination', () => {
    const domains = canonicalDomainDestinations();
    expect(domains.length).toBeGreaterThan(0);
    expect(
      domainDestinationVerdicts(committed(), domains).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual([]);
    const dropped = mutate((evidence) => {
      evidence.domainEntries = evidence.domainEntries.filter(
        ({ href }) => href !== '/world-models/',
      );
    });
    expect(
      domainDestinationVerdicts(dropped, domains).flatMap(
        ({ failures }) => failures,
      ),
    ).toEqual(['home renders no entry point for /world-models/']);
    const renamed = mutate((evidence) => {
      for (const entry of evidence.domainEntries) {
        if (entry.href === '/world-models/') entry.name = 'Learned simulators';
      }
    });
    expect(
      domainDestinationVerdicts(renamed, domains)
        .flatMap(({ failures }) => failures)
        .join(' '),
    ).toMatch(/never under the registry name "World Models"/);
    const undescribed = mutate((evidence) => {
      for (const entry of evidence.domainEntries) entry.description = ' ';
    });
    expect(
      domainDestinationVerdicts(undescribed, domains).flatMap(
        ({ failures }) => failures,
      ),
    ).toHaveLength(domains.length);
    const invisible = mutate((evidence) => {
      for (const entry of evidence.domainEntries) entry.heightPx = 0;
    });
    expect(
      domainDestinationVerdicts(invisible, domains)
        .flatMap(({ failures }) => failures)
        .join(' '),
    ).toMatch(/renders with no box/);
    expect(() => domainDestinationVerdicts(committed(), [])).toThrow(
      /quantify over nothing/,
    );
  });

  it('counts only consecutive equal signatures as a run', () => {
    expect(longestAdjacentRun([])).toBe(0);
    expect(longestAdjacentRun(['a', 'b', 'a'])).toBe(1);
    expect(longestAdjacentRun(['a', 'a', 'b', 'b', 'b'])).toBe(3);
    // A null breaks a run rather than extending one.
    expect(longestAdjacentRun([null, null])).toBe(0);
    expect(longestAdjacentRun(['a', null, 'a'])).toBe(1);
  });
});
