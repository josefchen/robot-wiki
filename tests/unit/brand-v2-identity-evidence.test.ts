import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  IDENTITY_RUNTIME_EVIDENCE_PATH,
  IDENTITY_VIEWPORTS,
  deriveTechnicalIdentifierOccurrences,
  deriveTechnicalIdentifiers,
  descriptorSurfaces,
  identityEvidenceFingerprint,
  readIdentityRuntimeEvidence,
  routeVerdicts,
  sealedTechnicalIdentifiers,
  technicalIdentifierDestinations,
  type IdentityRuntimeEvidence,
} from '@/lib/brand-v2-identity-evidence';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '@/lib/identity';
import { identityLockupSourcePaths } from '@/lib/identity-populations';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as {
  routes: { public: Array<{ path: string }> };
  metadata: Array<{ routeId: string; ownerPath: string }>;
};

const ROUTES = REGISTRY.routes.public.map(({ path }) => path);
const LOCKUP_SOURCE_PATHS = identityLockupSourcePaths();
const TECHNICAL_IDENTIFIERS = sealedTechnicalIdentifiers(ROOT);

function fingerprint(): string {
  return identityEvidenceFingerprint({
    root: ROOT,
    metadataOwnerPaths: [
      ...new Set(REGISTRY.metadata.map(({ ownerPath }) => ownerPath)),
    ],
    lockupSourcePaths: LOCKUP_SOURCE_PATHS,
  });
}

function committed(): IdentityRuntimeEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, IDENTITY_RUNTIME_EVIDENCE_PATH), 'utf8'),
  ) as IdentityRuntimeEvidence;
}

/**
 * A structural clone, so a mutation in one case cannot leak into the next.
 */
function mutate(
  change: (evidence: IdentityRuntimeEvidence) => void,
): IdentityRuntimeEvidence {
  const copy = JSON.parse(JSON.stringify(committed())) as IdentityRuntimeEvidence;
  change(copy);
  return copy;
}

describe('identity runtime evidence', () => {
  it('accepts the committed sweep for the tree it was measured against', () => {
    const evidence = readIdentityRuntimeEvidence({
      artifact: committed(),
      routes: ROUTES,
      technicalIdentifiers: TECHNICAL_IDENTIFIERS,
      fingerprint: fingerprint(),
    });
    expect(evidence.identity).toBe(PUBLIC_IDENTITY);
    expect(evidence.descriptor).toBe(PUBLIC_DESCRIPTOR);
    expect(evidence.routes).toHaveLength(ROUTES.length);
    expect(evidence.observations).toHaveLength(
      ROUTES.length * IDENTITY_VIEWPORTS.length,
    );
  });

  it('refuses stale, incomplete, and unmeasured identity evidence', () => {
    const current = fingerprint();
    // Each case is one way the artifact can stop describing this tree.
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: committed(),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        // A fixed replacement digit silently stops being a mutation
        // whenever the real fingerprint already ends in it.
        fingerprint: `${current.slice(0, 63)}${current.endsWith('0') ? '1' : '0'}`,
      }),
    ).toThrow(/stale/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.version = 2 as unknown as 1;
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/version/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.identity = 'robot-wiki';
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/measured robot-wiki/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.descriptor = 'Robotics encyclopaedia';
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/descriptor other than the locked one/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: committed(),
        routes: ROUTES.slice(0, ROUTES.length - 1),
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/registered public routes/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: committed(),
        routes: [],
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/population is empty/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.viewports = [evidence.viewports[0]];
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/both required viewports/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.observations = evidence.observations.slice(1);
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/missing 1 route\/viewport observations/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[0].visibleTextLength = 0;
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/empty rendered page/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: mutate((evidence) => {
          evidence.observations[0].brandDisplayTexts = [];
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/discovered no brand display text/);
  });

  it('reports a non-compliant lockup rather than passing it', () => {
    const evidence = readIdentityRuntimeEvidence({
      artifact: mutate((artifact) => {
        artifact.observations[0].brandDisplayTexts[0].text = 'robot-wiki';
        artifact.observations[0].brandDisplayTexts[0].role = null;
      }),
      routes: ROUTES,
      technicalIdentifiers: TECHNICAL_IDENTIFIERS,
      fingerprint: fingerprint(),
    });
    const verdict = routeVerdicts(evidence).get(
      evidence.observations[0].route,
    );
    expect(verdict?.wrongNames.join(' ')).toContain('robot-wiki');
    expect(verdict?.unannotatedLockups).not.toHaveLength(0);
  });

  it('names the CSS that rewrote a wordmark, and refuses one CSS supplied', () => {
    // The input that used to pass: `text-transform: lowercase` renders the
    // superseded v1 wordmark while the document still stores `Robot Wiki`,
    // and no forbidden-spelling scan matches `robot wiki` with a space.
    const transformed = routeVerdicts(
      readIdentityRuntimeEvidence({
        artifact: mutate((artifact) => {
          const lockup = artifact.observations[0].brandDisplayTexts[0];
          lockup.text = 'robot wiki';
          lockup.textTransform = 'lowercase';
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: fingerprint(),
      }),
    ).get(committed().observations[0].route);
    expect(transformed?.wrongNames.join(' ')).toMatch(
      /renders robot wiki through text-transform: lowercase/,
    );
    // And the mirror image: a document that stores something else and lets a
    // stylesheet paint the locked name over it.
    const substituted = routeVerdicts(
      readIdentityRuntimeEvidence({
        artifact: mutate((artifact) => {
          const lockup = artifact.observations[0].brandDisplayTexts[0];
          lockup.domText = 'robot-wiki';
          lockup.pseudoText = { before: 'Robot Wiki', after: '' };
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: fingerprint(),
      }),
    ).get(committed().observations[0].route);
    expect(substituted?.wrongNames).toEqual([]);
    expect(substituted?.cssSubstitutedNames.join(' ')).toMatch(
      /renders Robot Wiki only through ::before content "Robot Wiki"; the document stores robot-wiki/,
    );
  });

  it('refuses a technical identifier with no surviving use in the built export', () => {
    const current = fingerprint();
    // The input that used to pass: the row reported source occurrences and
    // an optional destination list, so zero shipped uses read as compliance.
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: mutate((artifact) => {
          const witness = artifact.technicalIdentifierWitnesses[0];
          witness.fileCount = 0;
          witness.fileKinds = [];
          witness.occurrences = 0;
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/carries no file containing/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: mutate((artifact) => {
          artifact.technicalIdentifierWitnesses =
            artifact.technicalIdentifierWitnesses.slice(1);
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: current,
      }),
    ).toThrow(/sealed by VAL-B2-ID-004/);
    expect(() =>
      readIdentityRuntimeEvidence({
        artifact: committed(),
        routes: ROUTES,
        technicalIdentifiers: [],
        fingerprint: current,
      }),
    ).toThrow(/identifier population is empty/);
  });

  it('derives technical destinations from every recorded field, not three named ones', () => {
    const evidence = readIdentityRuntimeEvidence({
      artifact: committed(),
      routes: ROUTES,
      technicalIdentifiers: TECHNICAL_IDENTIFIERS,
      fingerprint: fingerprint(),
    });
    // A destination that moves to a field the old list did not mention is
    // still a destination, and is now found rather than silently unwatched.
    const moved = technicalIdentifierDestinations(
      'robot-wiki',
      readIdentityRuntimeEvidence({
        artifact: mutate((artifact) => {
          artifact.observations[0].metadata.ogImageAlt =
            'https://example.invalid/robot-wiki-moved.png';
        }),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: fingerprint(),
      }),
    );
    expect(moved).toContain('https://example.invalid/robot-wiki-moved.png');
    // Prose is not a destination: VAL-B2-ID-003 fails it as display text.
    expect(
      technicalIdentifierDestinations(
        'robot-wiki',
        readIdentityRuntimeEvidence({
          artifact: mutate((artifact) => {
            artifact.observations[0].metadata.ogSiteName = 'robot-wiki';
          }),
          routes: ROUTES,
          technicalIdentifiers: TECHNICAL_IDENTIFIERS,
          fingerprint: fingerprint(),
        }),
      ),
    ).not.toContain('robot-wiki');
    expect(
      technicalIdentifierDestinations('robot-wiki.com', evidence).length,
    ).toBeGreaterThan(0);
  });

  it('derives the descriptor surfaces the assertion quantifies over', () => {
    const siteOwnerPath = REGISTRY.metadata.find(
      ({ routeId }) => routeId === 'route:/',
    )?.ownerPath;
    expect(siteOwnerPath).toBeTruthy();
    const surfaces = descriptorSurfaces(
      readIdentityRuntimeEvidence({
        artifact: committed(),
        routes: ROUTES,
        technicalIdentifiers: TECHNICAL_IDENTIFIERS,
        fingerprint: fingerprint(),
      }),
      siteOwnerPath as string,
    );
    expect(surfaces.length).toBeGreaterThan(0);
    // Every discovered rendered slot is on the home hero, which is the one
    // placement design-system 3.5 gives the descriptor.
    for (const surface of surfaces.filter(({ kind }) => kind === 'rendered')) {
      expect(surface.route).toBe('/');
      expect(surface.value).toBe(PUBLIC_DESCRIPTOR);
    }
    for (const surface of surfaces.filter(({ kind }) => kind === 'metadata')) {
      expect(surface.value).toContain(PUBLIC_DESCRIPTOR);
    }
  });

  it('parses the sealed technical identifiers out of the requirement row', () => {
    const identifiers = deriveTechnicalIdentifiers(
      'Technical uses of `robot-wiki`, `robot-wiki.com`, and `robot-atlas-trajectory` remain technical.',
    );
    expect(identifiers).toEqual([
      'robot-atlas-trajectory',
      'robot-wiki',
      'robot-wiki.com',
    ]);
    expect(() => deriveTechnicalIdentifiers('no literals here')).toThrow(
      /population would be empty/,
    );
  });

  it('finds every sealed identifier still load-bearing in runtime source', () => {
    for (const literal of [
      'robot-wiki',
      'robot-wiki.com',
      'robot-atlas-trajectory',
    ]) {
      const occurrences = deriveTechnicalIdentifierOccurrences(ROOT, literal);
      expect(occurrences.length, literal).toBeGreaterThan(0);
      // Comments are stripped before the scan, so prose about the rename
      // cannot stand in for a live use.
      for (const occurrence of occurrences) {
        expect(occurrence.text, `${literal} in ${occurrence.path}`).not.toMatch(
          /^\s*(\/\/|\*)/,
        );
      }
    }
  });
});
