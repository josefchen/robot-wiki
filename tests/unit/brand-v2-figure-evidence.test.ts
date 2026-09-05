import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FIGURE_RUNTIME_EVIDENCE_PATH,
  altTextAndDeliveryVerdicts,
  captionAndCreditVerdicts,
  darkInstrumentVerdicts,
  expectedFigureGraph,
  figureEvidenceFingerprint,
  figureOccurrenceMembers,
  readFigureRuntimeEvidence,
  schematicOccurrenceMembers,
  schematicSelfIdentificationVerdicts,
  type FigureObservation,
  type FigureRuntimeEvidence,
} from '@/lib/brand-v2-figure-evidence';
import {
  editorialAssetMembers,
  firstPartyImageryVerdicts,
  firstPartySvgMembers,
  materialHonestyVerdicts,
  originalSvgSemanticVerdicts,
  provenanceRecordVerdicts,
  reusableContentVerdicts,
  type AssetRow,
  type MaterialRow,
} from '@/lib/brand-v2-image-record';

/**
 * The figure lane's own gate (VAL-B2-ART-004/005/006, VAL-B2-IMG-001 to 008,
 * VAL-B2-VIZ-014).
 *
 * Every case here plants one defect in a copy of the committed evidence and
 * asserts the reader or the verdict refuses it. A verdict function that
 * always returns green would pass the sweep and the generator and certify a
 * broken figure, so the checks have to be shown to bite one at a time.
 */

const ROOT = process.cwd();

const registry = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as { assets: AssetRow[]; materials: MaterialRow[] };

const sealedSvgMembers = (
  JSON.parse(
    readFileSync(
      join(ROOT, 'evidence', 'brand-v2', 'baseline', 'assets-svg.json'),
      'utf8',
    ),
  ) as { members: Array<{ id: string; hash: string }> }
).members;

const artifact = JSON.parse(
  readFileSync(join(ROOT, FIGURE_RUNTIME_EVIDENCE_PATH), 'utf8'),
) as FigureRuntimeEvidence;

const fingerprint = figureEvidenceFingerprint({ root: ROOT });

function evidence(): FigureRuntimeEvidence {
  return readFigureRuntimeEvidence({
    artifact: structuredClone(artifact),
    fingerprint,
    root: ROOT,
  });
}

/** A copy of the committed sweep with one figure rewritten. */
function withFigure(
  match: (figure: FigureObservation) => boolean,
  patch: Partial<FigureObservation>,
): FigureRuntimeEvidence {
  const copy = structuredClone(artifact);
  let touched = 0;
  for (const observation of copy.observations) {
    observation.figures = observation.figures.map((figure) => {
      if (!match(figure)) return figure;
      touched += 1;
      return { ...figure, ...patch };
    });
  }
  expect(touched, 'the mutation matched no figure').toBeGreaterThan(0);
  return copy;
}

/**
 * The same rewrite applied to evidence the reader has already accepted.
 *
 * The verdict functions have to be provoked past the reader: several of the
 * defects below are ones the reader refuses outright, and routing them
 * through it again would prove the reader twice and the verdict never.
 */
function mutated(
  match: (figure: FigureObservation) => boolean,
  patch: Partial<FigureObservation>,
): FigureRuntimeEvidence {
  const copy = structuredClone(evidence());
  let touched = 0;
  for (const observation of copy.observations) {
    observation.figures = observation.figures.map((figure) => {
      if (!match(figure)) return figure;
      touched += 1;
      return { ...figure, ...patch };
    });
  }
  expect(touched, 'the mutation matched no figure').toBeGreaterThan(0);
  return copy;
}

const schematic = (figure: FigureObservation) =>
  figure.figureKind === 'original-schematic';
const photograph = (figure: FigureObservation) =>
  figure.figureKind === 'photograph';

function failuresOf(
  verdicts: Map<string, { failures: string[] }>,
): string[] {
  return [...verdicts.values()].flatMap(({ failures }) => failures);
}

describe('the committed figure sweep', () => {
  it('is the sweep this tree needs, and every rendered row passes on it', () => {
    const read = evidence();
    expect(read.routes).toEqual([...expectedFigureGraph(ROOT).keys()].sort());
    expect(failuresOf(darkInstrumentVerdicts(read))).toEqual([]);
    expect(failuresOf(schematicSelfIdentificationVerdicts(read))).toEqual([]);
    expect(failuresOf(captionAndCreditVerdicts(read))).toEqual([]);
    expect(failuresOf(altTextAndDeliveryVerdicts(read))).toEqual([]);
  });

  it('quantifies each row over the members it is about', () => {
    const read = evidence();
    const all = figureOccurrenceMembers(read);
    const schematics = schematicOccurrenceMembers(read);
    expect(all.length).toBeGreaterThan(schematics.length);
    expect(schematics.length).toBeGreaterThan(0);
    // Every schematic member is a figure member: the narrower rows cannot
    // record a member the wider population does not hold.
    expect(schematics.every((id) => all.includes(id))).toBe(true);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('the figure evidence reader', () => {
  it('refuses a sweep taken against a different tree', () => {
    expect(() =>
      readFigureRuntimeEvidence({
        artifact: { ...structuredClone(artifact), fingerprint: 'stale' },
        fingerprint,
        root: ROOT,
      }),
    ).toThrow(/stale/);
  });

  it('refuses a sweep that skipped a route the content derives', () => {
    const copy = structuredClone(artifact);
    copy.routes = copy.routes.slice(1);
    expect(() =>
      readFigureRuntimeEvidence({ artifact: copy, fingerprint, root: ROOT }),
    ).toThrow(/not the \d+ the content derives/);
  });

  it('refuses a page that rendered none of the figures its own source references', () => {
    const copy = structuredClone(artifact);
    const target = copy.observations.find(({ figures }) => figures.length > 0);
    if (!target) throw new Error('no observation carries a figure');
    target.figures = [];
    expect(() =>
      readFigureRuntimeEvidence({ artifact: copy, fingerprint, root: ROOT }),
    ).toThrow(/renders no figure for/);
  });

  it('refuses a figure the image registry does not hold', () => {
    const copy = structuredClone(artifact);
    const target = copy.observations.find(({ figures }) => figures.length > 0);
    if (!target) throw new Error('no observation carries a figure');
    target.figures.push({
      ...structuredClone(target.figures[0]),
      imageId: 'ghost-diagram',
      index: 0,
    });
    expect(() =>
      readFigureRuntimeEvidence({ artifact: copy, fingerprint, root: ROOT }),
    ).toThrow(/image registry does not hold/);
  });

  it('refuses a rendered kind that contradicts the registry', () => {
    expect(() =>
      readFigureRuntimeEvidence({
        artifact: withFigure(schematic, { figureKind: 'photograph' }),
        fingerprint,
        root: ROOT,
      }),
    ).toThrow(/where the registry declares original-schematic/);
  });

  it('refuses a dark plate under something that is not a schematic', () => {
    expect(() =>
      readFigureRuntimeEvidence({
        artifact: withFigure(photograph, {
          surfaceId: 'surface:bounded-dark-instrument',
        }),
        fingerprint,
        root: ROOT,
      }),
    ).toThrow(/populations have diverged/);
  });
});

describe('VAL-B2-ART-004 bounded dark instruments', () => {
  it('reports a diagram that lost its instrument', () => {
    const read = mutated(schematic, {
        surfaceId: null,
        surfaceLuminance: null,
        boundaryContrast: 1,
        surfaceBorderWidth: 0,
        surfaceBorderStyle: null,
      });
    // The reader accepts it only because the mutation also drops the kind
    // agreement check's subject; the verdict is what has to catch it.
    const failures = failuresOf(darkInstrumentVerdicts(read));
    expect(failures.some((f) => /rather than the registered/.test(f))).toBe(true);
  });

  it('reports an instrument whose edge disappears into the page', () => {
    const failures = failuresOf(
      darkInstrumentVerdicts(mutated(schematic, { boundaryContrast: 1.2 })),
    );
    expect(failuresOf(darkInstrumentVerdicts(evidence()))).toEqual([]);
    expect(failures.some((f) => /below the 3:1 floor/.test(f))).toBe(true);
  });

  it('reports an inverse label a reader cannot read on the plate', () => {
    const failures = failuresOf(
      darkInstrumentVerdicts(
        mutated(schematic, { labelContrast: 2.1 }),
      ),
    );
    expect(failures.some((f) => /below the 4.5:1 floor/.test(f))).toBe(true);
  });

  it('reports a diagram whose textual description is a label', () => {
    const failures = failuresOf(
      darkInstrumentVerdicts(
        mutated(schematic, { alt: 'A diagram of things' }),
      ),
    );
    expect(failures.some((f) => /too few to stand in for it/.test(f))).toBe(true);
  });
});

describe('VAL-B2-ART-006 and VAL-B2-IMG-003 self-identification', () => {
  it('reports a schematic that stopped saying what it is', () => {
    const failures = failuresOf(
      schematicSelfIdentificationVerdicts(
        mutated(schematic, { label: 'Figure 1' }),
      ),
    );
    expect(failures.some((f) => /identifies itself as "Figure 1"/.test(f))).toBe(
      true,
    );
  });

  it('reports a schematic credited as a photograph', () => {
    const failures = failuresOf(
      schematicSelfIdentificationVerdicts(
        mutated(schematic, {
            credit: 'Photo: Robot Wiki contributors / Robot Wiki (original diagram). Licence: CC BY 4.0.',
          }),
      ),
    );
    expect(failures.some((f) => /not the diagram noun/.test(f))).toBe(true);
  });

  it('reports a drawing that links to an "original" it does not have', () => {
    const failures = failuresOf(
      schematicSelfIdentificationVerdicts(
        readFigureRuntimeEvidence({
          artifact: withFigure(schematic, {
            creditLinks: [
              { href: 'https://arxiv.org/abs/2304.13705', text: 'arXiv' },
            ],
          }),
          fingerprint,
          root: ROOT,
        }),
      ),
    );
    expect(
      failures.some((f) => /implying a published original/.test(f)),
    ).toBe(true);
  });
});

describe('VAL-B2-ART-005 captions and credits', () => {
  it('reports a caption that is a label rather than a takeaway', () => {
    const failures = failuresOf(
      captionAndCreditVerdicts(
        mutated(schematic, { caption: 'A diagram.' }),
      ),
    );
    expect(failures.some((f) => /label rather than a takeaway/.test(f))).toBe(
      true,
    );
  });

  it('reports a caption that only repeats the alt text', () => {
    const copy = structuredClone(artifact);
    let touched = 0;
    for (const observation of copy.observations) {
      for (const figure of observation.figures) {
        if (!schematic(figure)) continue;
        figure.caption = figure.alt;
        touched += 1;
      }
    }
    expect(touched).toBeGreaterThan(0);
    const failures = failuresOf(
      captionAndCreditVerdicts(
        readFigureRuntimeEvidence({ artifact: copy, fingerprint, root: ROOT }),
      ),
    );
    expect(failures.some((f) => /caption adds nothing/.test(f))).toBe(true);
  });

  it('reports a credit that drops the creator', () => {
    const failures = failuresOf(
      captionAndCreditVerdicts(
        mutated(photograph, {
            credit: 'Photo: Wikimedia Commons. Licence: CC BY-SA 4.0.',
          }),
      ),
    );
    expect(failures.some((f) => /credits no creator/.test(f))).toBe(true);
  });

  it('reports a credit that names a licence without linking it', () => {
    const failures = failuresOf(
      captionAndCreditVerdicts(
        mutated(photograph, { creditLinks: [] }),
      ),
    );
    expect(
      failures.some((f) => /does not link its credit to the licence/.test(f)),
    ).toBe(true);
  });
});

describe('VAL-B2-IMG-005 alt text and static delivery', () => {
  it('reports alt text that repeats the caption beside it', () => {
    const copy = structuredClone(artifact);
    for (const observation of copy.observations) {
      for (const figure of observation.figures) {
        if (schematic(figure)) figure.alt = figure.caption;
      }
    }
    const failures = failuresOf(
      altTextAndDeliveryVerdicts(
        readFigureRuntimeEvidence({ artifact: copy, fingerprint, root: ROOT }),
      ),
    );
    expect(failures.some((f) => /hears the same sentence twice/.test(f))).toBe(
      true,
    );
  });

  it('reports the technical repository identity used as public branding', () => {
    const failures = failuresOf(
      altTextAndDeliveryVerdicts(
        mutated(schematic, {
            alt: 'The robot-wiki house diagram of covariate shift between a demonstration corridor and a policy rollout.',
          }),
      ),
    );
    expect(
      failures.some((f) => /technical repository identity in alt text/.test(f)),
    ).toBe(true);
  });

  it('reports a figure that reserves no space', () => {
    const failures = failuresOf(
      altTextAndDeliveryVerdicts(
        mutated(schematic, { declaredWidth: null }),
      ),
    );
    expect(failures.some((f) => /not the intrinsic 640/.test(f))).toBe(true);
  });

  it('reports a figure whose file never arrived', () => {
    const failures = failuresOf(
      altTextAndDeliveryVerdicts(
        mutated(schematic, { complete: false, naturalWidth: 0 }),
      ),
    );
    expect(failures.some((f) => /never decoded/.test(f))).toBe(true);
  });

  it('reports a figure wider than the phone it is being read on', () => {
    const failures = failuresOf(
      altTextAndDeliveryVerdicts(
        mutated(schematic, { renderedWidth: 900 }),
      ),
    );
    expect(failures.some((f) => /inside a 375px viewport/.test(f))).toBe(true);
  });
});

describe('the record rows', () => {
  const assets = registry.assets;

  it('passes on the shipped registry and quantifies over the right members', () => {
    expect(failuresOf(firstPartyImageryVerdicts(assets))).toEqual([]);
    expect(failuresOf(provenanceRecordVerdicts(assets, ROOT))).toEqual([]);
    expect(failuresOf(reusableContentVerdicts(assets))).toEqual([]);
    expect(failuresOf(materialHonestyVerdicts(registry.materials))).toEqual([]);
    expect(
      failuresOf(originalSvgSemanticVerdicts(assets, ROOT, sealedSvgMembers)),
    ).toEqual([]);

    // The editorial population is the seven reusable images, never the 111
    // company marks whose provenance row is VAL-B2-MAP-010.
    const editorial = editorialAssetMembers(assets);
    expect(editorial.every((id) => !id.includes('/logos/'))).toBe(true);
    expect(firstPartySvgMembers(assets)).toEqual([
      'asset:images/covariate-shift.svg',
      'asset:images/temporal-ensembling.svg',
    ]);
  });

  it('VAL-B2-IMG-002 reports a recorded content hash the shipped file does not have', () => {
    const mutated = assets.map((asset) =>
      asset.category === 'editorial-image'
        ? { ...asset, byteHash: 'f'.repeat(64) }
        : asset,
    );
    const failures = failuresOf(provenanceRecordVerdicts(mutated, ROOT));
    expect(failures.some((f) => /where the shipped file hashes/.test(f))).toBe(
      true,
    );
  });

  it('VAL-B2-IMG-001 reports an asset whose provenance advertises synthesis', () => {
    const mutated = assets.map((asset) =>
      asset.path === 'images/covariate-shift.svg'
        ? { ...asset, path: 'images/ai-generated-lab.svg' }
        : asset,
    );
    const failures = failuresOf(firstPartyImageryVerdicts(mutated));
    expect(failures.some((f) => /banned synthesis vocabulary/.test(f))).toBe(
      true,
    );
  });

  it('VAL-B2-IMG-004 reports a texture that claims to be a measurement', () => {
    const failures = failuresOf(
      materialHonestyVerdicts([
        {
          id: 'material:halftone',
          treatment: 'owned monochrome depth map of the scanned workcell',
          deterministic: true,
          ownership: 'owned',
        },
      ]),
    );
    expect(failures.some((f) => /claims to be a reading/.test(f))).toBe(true);
  });

  it('VAL-B2-VIZ-014 reports an original SVG whose geometry moved', () => {
    const failures = failuresOf(
      originalSvgSemanticVerdicts(
        assets,
        ROOT,
        sealedSvgMembers.map((member) =>
          member.id === 'public-svg:images/covariate-shift.svg'
            ? { ...member, hash: '0'.repeat(64) }
            : member,
        ),
      ),
    );
    expect(
      failures.some((f) => /does not reproduce the sealed baseline member/.test(f)),
    ).toBe(true);
  });
});
