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
  materialPaintsFromCss,
  readMaterialPaints,
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
    ).toThrow(/renders 0 figure occurrence\(s\) where the page.s own sources derive/);
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
  const materialPaints = readMaterialPaints(ROOT, registry.materials);

  it('passes on the shipped registry and quantifies over the right members', () => {
    expect(failuresOf(firstPartyImageryVerdicts(assets))).toEqual([]);
    expect(failuresOf(provenanceRecordVerdicts(assets, ROOT))).toEqual([]);
    expect(failuresOf(reusableContentVerdicts(assets))).toEqual([]);
    expect(
      failuresOf(materialHonestyVerdicts(registry.materials, materialPaints)),
    ).toEqual([]);
    // Non-vacuity: the clauses that read the shipped stylesheet have
    // something to read for every registered material.
    expect(materialPaints.map((paint) => paint.rule === null)).toEqual([
      false,
      false,
      false,
    ]);
    expect(
      materialPaints.filter((paint) => paint.tile !== null).length,
    ).toBeGreaterThan(0);
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
      materialHonestyVerdicts(
        [
          {
            id: 'material:halftone',
            treatment: 'owned monochrome depth map of the scanned workcell',
            deterministic: true,
            ownership: 'owned',
          },
        ],
        materialPaints,
      ),
    );
    expect(failures.some((f) => /claims to be a reading/.test(f))).toBe(true);
  });

  it('VAL-B2-IMG-004 reads the tile, ground and contrast the export ships', () => {
    const halftone = materialPaints.find(
      (paint) => paint.id === 'material:halftone',
    );
    expect(halftone?.tile).toMatch(/<circle/);
    expect(halftone?.remoteUrls).toEqual([]);
    expect(halftone?.declarations['background-repeat']).toBe('repeat');
    // The ground is written as var(--color-surface), which is itself a var:
    // an unresolved chain would leave the contrast clause with nothing.
    expect(halftone?.groundHex).toMatch(/^#[0-9a-f]{6}$/);
    expect(halftone?.inkContrast.length).toBeGreaterThan(0);
    for (const { ratio } of halftone?.inkContrast ?? []) {
      expect(ratio).toBeLessThan(3);
    }
  });

  it('VAL-B2-IMG-004 reports ink drawn at reading contrast', () => {
    const failures = failuresOf(
      materialHonestyVerdicts(
        registry.materials,
        materialPaints.map((paint) =>
          paint.id === 'material:halftone'
            ? {
                ...paint,
                inkContrast: [{ ink: '#242D33@1', ratio: 12.4 }],
              }
            : paint,
        ),
      ),
    );
    expect(
      failures.some((f) =>
        /paints ink #242D33@1 at 12.4:1 .*WCAG non-text threshold/.test(f),
      ),
    ).toBe(true);
  });

  it('VAL-B2-IMG-004 reports a tile that is fetched rather than shipped', () => {
    const failures = failuresOf(
      materialHonestyVerdicts(
        registry.materials,
        materialPaints.map((paint) =>
          paint.id === 'material:concrete'
            ? { ...paint, remoteUrls: ['https://cdn.example.com/grain.png'] }
            : paint,
        ),
      ),
    );
    expect(
      failures.some((f) =>
        /paints from https:\/\/cdn\.example\.com\/grain\.png, which is fetched at read time/.test(
          f,
        ),
      ),
    ).toBe(true);
  });

  it('VAL-B2-IMG-004 reports a tile that draws a label, and one that is placed once', () => {
    const labelled = failuresOf(
      materialHonestyVerdicts(
        registry.materials,
        materialPaints.map((paint) =>
          paint.id === 'material:halftone'
            ? {
                ...paint,
                tile: '<svg><text x="0" y="8">0.42 m</text></svg>',
                declarations: { ...paint.declarations },
              }
            : paint,
        ),
      ),
    );
    expect(labelled.some((f) => /draws text, which labels a value/.test(f))).toBe(
      true,
    );

    const placedOnce = failuresOf(
      materialHonestyVerdicts(
        registry.materials,
        materialPaints.map((paint) =>
          paint.id === 'material:halftone'
            ? {
                ...paint,
                declarations: {
                  ...paint.declarations,
                  'background-repeat': 'no-repeat',
                },
              }
            : paint,
        ),
      ),
    );
    expect(
      placedOnce.some((f) => /background-repeat "no-repeat"/.test(f)),
    ).toBe(true);
  });

  it('VAL-B2-IMG-004 reports a material the shipped stylesheet never paints, and refuses when none of them ship', () => {
    const missing = failuresOf(
      materialHonestyVerdicts(
        registry.materials,
        materialPaints.map((paint) =>
          paint.id === 'material:concrete' ? { ...paint, rule: null } : paint,
        ),
      ),
    );
    expect(
      missing.some((f) =>
        /material:concrete is registered as a material the site paints, and the shipped stylesheet has no \.material-concrete rule/.test(
          f,
        ),
      ),
    ).toBe(true);

    expect(() =>
      materialHonestyVerdicts(
        registry.materials,
        materialPaints.map((paint) => ({ ...paint, rule: null })),
      ),
    ).toThrow(/no registered material resolved to a shipped stylesheet rule/);
  });

  it('VAL-B2-IMG-004 reports a rule that animates while the registry calls it deterministic', () => {
    const failures = failuresOf(
      materialHonestyVerdicts(
        registry.materials,
        materialPaints.map((paint) =>
          paint.id === 'material:concrete'
            ? {
                ...paint,
                declarations: {
                  ...paint.declarations,
                  animation: 'grain-drift 4s infinite',
                },
              }
            : paint,
        ),
      ),
    );
    expect(
      failures.some((f) =>
        /declares itself deterministic while its shipped rule animates \(grain-drift 4s infinite\)/.test(
          f,
        ),
      ),
    ).toBe(true);
  });

  it('VAL-B2-IMG-004 reads the rule that wins the cascade, not the first one written', () => {
    // The reader used to take the first `.material-x { ... }` in the
    // concatenated chunks and the last `--token:` anywhere in them. A
    // stylesheet that declares an honest tile and then overrides it with a
    // sensor readout passed, because the override was never read.
    const material = [
      { id: 'material:halftone', treatment: 'owned dot field', deterministic: true, ownership: 'owned' as const },
    ];
    const honest =
      "@layer theme{:root{--color-paper:#ffffff}}.material-halftone{background-color:var(--color-paper);background-image:url('data:image/svg+xml,%3Csvg%3E%3Ccircle fill=%27%23000000%27 fill-opacity=%270.2%27/%3E%3C/svg%3E')}";
    const overridden = `${honest}.material-halftone{background-image:url('https://sensors.example/lidar-return.png')}`;
    expect(materialPaintsFromCss(honest, material)[0].remoteUrls).toEqual([]);
    expect(materialPaintsFromCss(overridden, material)[0].remoteUrls).toEqual([
      'https://sensors.example/lidar-return.png',
    ]);
    // The ground follows the same cascade: the later `:root` wins.
    const reground = `${honest}:root{--color-paper:#101010}`;
    expect(materialPaintsFromCss(reground, material)[0].groundHex).toBe(
      '#101010',
    );
  });

  it('VAL-B2-IMG-004 preserves earlier important declarations across rules and inside one rule', () => {
    const materials = [registry.materials.find(({ id }) => id === 'material:halftone')!];
    const important =
      "background-image:url('https://sensors.example/lidar-return.png') !important;background-repeat:no-repeat !IMPORTANT";
    const normal =
      "background-image:url('data:image/svg+xml,%3Csvg/%3E');background-repeat:repeat";
    for (const css of [
      `.material-halftone{${important}}.material-halftone{${normal}}`,
      `.material-halftone{${important};${normal}}`,
    ]) {
      const paints = materialPaintsFromCss(css, materials);
      expect(paints[0].remoteUrls).toEqual(['https://sensors.example/lidar-return.png']);
      expect(paints[0].declarations['background-repeat']).toBe('no-repeat');
      const failures = failuresOf(materialHonestyVerdicts(materials, paints));
      expect(failures.some((failure) => /fetched at read time/.test(failure))).toBe(true);
    }
    const placedTile = materialPaintsFromCss(
      `.material-halftone{background-repeat:no-repeat !important}.material-halftone{${normal}}`,
      materials,
    );
    expect(
      failuresOf(materialHonestyVerdicts(materials, placedTile))
        .some((failure) => /background-repeat "no-repeat"/.test(failure)),
    ).toBe(true);
  });

  it('VAL-B2-IMG-004 reverses unlayered precedence for important declarations and applies token importance', () => {
    const materials = [registry.materials.find(({ id }) => id === 'material:halftone')!];
    const paints = materialPaintsFromCss(
      ':root{--ground:#ffffff !important;--ground:#000000}' +
      '@layer theme{.material-halftone{background-repeat:no-repeat !important}}' +
      '.material-halftone{background-repeat:repeat !important;background-color:var(--ground)}',
      materials,
    );
    expect(paints[0].declarations['background-repeat']).toBe('no-repeat');
    expect(paints[0].groundHex).toBe('#ffffff');
    expect(() => materialPaintsFromCss(
      '@layer first{.material-halftone{background-repeat:no-repeat !important}}' +
      '@layer second{.material-halftone{background-repeat:repeat !important}}',
      materials,
    )).toThrow(/layer order/);
  });

  it('VAL-B2-IMG-004 refuses a paint it cannot resolve from bytes alone', () => {
    const material = [
      { id: 'material:halftone', treatment: 'owned dot field', deterministic: true, ownership: 'owned' as const },
    ];
    const base = '.material-halftone{background-color:#ffffff}';
    expect(() =>
      materialPaintsFromCss(
        `${base}@media (prefers-color-scheme:dark){.material-halftone{background-color:#000000}}`,
        material,
      ),
    ).toThrow(/depends on a condition this reader cannot resolve/);
    expect(() =>
      materialPaintsFromCss(
        `${base}.dark .material-halftone{background-color:#000000}`,
        material,
      ),
    ).toThrow(/depends on a cascade this reader cannot resolve/);
    expect(() =>
      materialPaintsFromCss(
        '@layer a{:root{--color-paper:#ffffff}}@layer b{:root{--color-paper:#000000}}.material-halftone{background-color:var(--color-paper)}',
        material,
      ),
    ).toThrow(/depends on a layer order this reader cannot resolve/);
  });

  it('VAL-B2-IMG-008 reports reusable content resting on no approved licence basis', () => {
    // Filed as editorial content but pointed at a company mark's provenance
    // record: `official-identification-use` is VAL-B2-MAP-010's path, not a
    // licence for editorial reuse.
    const mutated = assets.map((asset) =>
      asset.category === 'editorial-image'
        ? {
            ...asset,
            path: 'images/logos/1x-technologies.svg',
            sourceRegistryId: '1x-technologies-logo',
          }
        : asset,
    );
    const failures = failuresOf(reusableContentVerdicts(mutated));
    expect(
      failures.some((f) =>
        /rests on "official-identification-use", which is not one of the reusable-content values/.test(
          f,
        ),
      ),
    ).toBe(true);
    expect(
      failures.some((f) =>
        /is filed as editorial content while declaring itself a company mark/.test(
          f,
        ),
      ),
    ).toBe(true);
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
