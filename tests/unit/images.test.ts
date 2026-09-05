import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  attributionSentence,
  imageSchema,
  LEGAL_BASIS_BY_LICENCE,
  type SiteImage,
} from '@/data/schemas/image';
import {
  IMAGES,
  attributionText,
  creditNoun,
  figureKind,
  getImage,
  legalBasis,
  licenceLabel,
  preservationPolicy,
} from '@/data/images';
import { referencedImageIds } from '@/lib/images';
import { validateContent } from '@/lib/validate-content';
import { modules } from '@/data/modules';
import { CITATIONS } from '@/data/citations';
import { GLOSSARY } from '@/data/glossary';
import { COMPANIES } from '@/data/companies';

/**
 * Imagery pipeline (VAL-IMG-001, VAL-IMG-006, VAL-IMG-007, VAL-IMG-008,
 * VAL-IMG-013): the Zod schema is the licence gate, and the validator's
 * imagery check ties the registry to what pages actually reference in both
 * directions, so the /credits page cannot drift from what the site renders.
 */

const validEntry: SiteImage = {
  id: 'franka-emika-panda-cebit-2017',
  file: '/images/franka-emika-panda-cebit-2017.jpg',
  alt: 'A white seven-axis Franka Emika Panda robot arm mounted on a trade-show table, hand-guided by a demonstrator over small packaged goods.',
  caption: 'The Franka Emika Panda at CeBIT 2017.',
  sourceName: 'Wikimedia Commons',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Franka_Emika2.jpg',
  creator: 'Ims',
  licence: 'cc-by-sa-4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  retrieved: '2026-08-10',
  width: 1920,
  height: 1280,
  figureKind: 'photograph',
  legalBasis: 'cc-by-sa',
  attributionText: 'Photo: Ims / Wikimedia Commons. Licence: CC BY-SA 4.0.',
  preservationPolicy: 'external-bytes-preserved',
};

/**
 * A variant of the fixture whose §1.13 record stays coherent with whatever
 * the case changes. Cases below alter one field to test one rule; without
 * this they would also break the licence/basis and attribution cross-checks
 * and fail for a reason they are not about.
 */
function editorialPhoto(overrides: Partial<SiteImage> = {}): SiteImage {
  const base = { ...validEntry, ...overrides };
  return {
    ...base,
    legalBasis: LEGAL_BASIS_BY_LICENCE[base.licence],
    attributionText: attributionSentence(base),
  };
}

describe('imageSchema', () => {
  it('accepts a complete registry entry', () => {
    expect(imageSchema.safeParse(validEntry).success).toBe(true);
  });

  it('rejects an entry whose licence field is removed (VAL-IMG-008)', () => {
    const { licence: _licenceRemoved, ...rest } = validEntry;
    void _licenceRemoved;
    const parsed = imageSchema.safeParse(rest);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.message).toMatch(/licence/i);
  });

  it('rejects a licence outside the permitted set, naming the value (VAL-IMG-008)', () => {
    const parsed = imageSchema.safeParse({ ...validEntry, licence: 'cc-by-nc-4.0' });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.message).toContain('cc-by-nc-4.0');
  });

  it('rejects press-kit and permission licences without a recorded grant reference (VAL-IMG-007)', () => {
    for (const licence of ['press-kit', 'permission'] as const) {
      const parsed = imageSchema.safeParse(editorialPhoto({ licence }));
      expect(parsed.success).toBe(false);
      expect(parsed.error?.message).toMatch(/permissionNote/);
    }
    const withNote = imageSchema.safeParse(
      editorialPhoto({
        licence: 'press-kit',
        permissionNote: 'Editorial reuse granted on the press page.',
      }),
    );
    expect(withNote.success, withNote.error?.message).toBe(true);
  });

  it('accepts unlicensed and unknown official marks when sourceUrl is present', () => {
    for (const licence of ['unlicensed', 'unknown'] as const) {
      const parsed = imageSchema.safeParse({
        ...validEntry,
        id: 'skild-ai-logo',
        file: '/images/logos/skild-ai.svg',
        alt: 'Skild AI wordmark set in a dark grotesque on a transparent field',
        figureKind: 'official-mark',
        legalBasis: undefined,
        attributionText: undefined,
        preservationPolicy: undefined,
        licence,
        sourceUrl: 'https://www.skild.ai/',
        licenceUrl: 'https://www.skild.ai/',
      });
      expect(parsed.success, `${licence}: ${parsed.error?.message ?? ''}`).toBe(true);
    }
  });

  it('rejects unlicensed and unknown marks without a sourceUrl', () => {
    const { sourceUrl: _dropped, ...rest } = validEntry;
    void _dropped;
    for (const licence of ['unlicensed', 'unknown'] as const) {
      const parsed = imageSchema.safeParse({ ...rest, licence });
      expect(parsed.success, licence).toBe(false);
      expect(parsed.error?.message).toMatch(/sourceUrl/);
    }
  });

  it('rejects alt text that is generic, a filename, too short, or dashed (VAL-IMG-001)', () => {
    const badAlts = [
      'image',
      'Photo',
      'franka-emika-panda-cebit-2017',
      'franka-emika-panda-cebit-2017.jpg',
      'too short',
      'An arm with an em dash - no wait, an actual—dash',
    ];
    for (const alt of badAlts) {
      expect(
        imageSchema.safeParse({ ...validEntry, alt }).success,
        `alt rejected: ${alt}`,
      ).toBe(false);
    }
  });

  it('rejects a file path outside public/images/', () => {
    expect(
      imageSchema.safeParse({ ...validEntry, file: '/elsewhere/x.jpg' }).success,
    ).toBe(false);
  });

  it('accepts a logo file under public/images/logos/', () => {
    const parsed = imageSchema.safeParse({
      ...validEntry,
      id: 'nvidia-logo',
      file: '/images/logos/nvidia.svg',
      alt: 'NVIDIA wordmark in the company green on a transparent field',
      figureKind: 'official-mark',
      legalBasis: undefined,
      attributionText: undefined,
      preservationPolicy: undefined,
    });
    expect(parsed.success, parsed.error?.message).toBe(true);
  });
});

describe('referencedImageIds', () => {
  it('extracts <Image> and <ImageRef> ids in order, deduped', () => {
    const body = [
      '<Image id="alpha-one" />',
      'text <ImageRef id="beta-two" className="x" /> text',
      "<Image id='alpha-one' />",
    ].join('\n');
    expect(referencedImageIds(body)).toEqual(['alpha-one', 'beta-two']);
  });

  it('ignores image syntax inside code spans and fenced blocks', () => {
    const body = [
      '```',
      '<Image id="in-fence" />',
      '```',
      '`<Image id="in-span" />`',
      '<Image id="real-one" />',
    ].join('\n');
    expect(referencedImageIds(body)).toEqual(['real-one']);
  });
});

describe('validateContent imagery check', () => {
  let root: string;

  // Minimal module/citation fixtures, mirroring validate-content.test.ts:
  // one published module whose content file carries the <Image> usage.
  const moduleFixtures = [
    {
      domain: 'manipulation' as const,
      slug: 'action-chunking',
      title: 'Action Chunking',
      summary: 'Chunked actions.',
      order: 1,
      status: 'published' as const,
    },
    ...(['rl-sim2real', 'world-models', 'data-hardware', 'classical', 'frontier'] as const).map(
      (domain) => ({
        domain,
        slug: 'placeholder',
        title: 'Placeholder',
        summary: 'Planned module.',
        order: 1,
        status: 'draft' as const,
      }),
    ),
  ];

  const citationFixtures = [
    {
      id: 'act-aloha-2023',
      title: 'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
      authors: ['Tony Z. Zhao', 'Vikash Kumar', 'Sergey Levine', 'Chelsea Finn'],
      year: 2023,
      arxiv: '2304.13705',
      url: 'https://arxiv.org/abs/2304.13705',
      type: 'paper' as const,
    },
  ];

  function writeArticle(imageMarkup: string) {
    writeFileSync(
      join(root, 'manipulation', 'action-chunking.mdx'),
      [
        '---',
        'title: "Action Chunking"',
        'description: "Predicting action sequences instead of single steps."',
        'domain: "manipulation"',
        'slug: "action-chunking"',
        'order: 1',
        'status: "published"',
        'lastReviewed: "2026-08-10"',
        'citations:',
        '  - act-aloha-2023',
        '---',
        '',
        `Body prose. ${imageMarkup}`,
        '',
      ].join('\n'),
    );
  }

  const baseOpts = () => ({
    contentRoot: root,
    publicDir: join(process.cwd(), 'public'),
    modules: moduleFixtures,
    citations: citationFixtures,
    images: [validEntry],
  });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'robot-wiki-images-'));
    mkdirSync(join(root, 'manipulation'), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('fails on a referenced image that is not registered, naming the id', () => {
    writeArticle('<Image id="ghost-image" />');
    const issues = validateContent(baseOpts());
    const imagery = issues.filter((i) => i.message.includes('ghost-image'));
    expect(imagery.length).toBeGreaterThan(0);
    expect(imagery[0].message).toMatch(/not in the image registry/);
  });

  it('fails on a registered image no page references (stale registry drift)', () => {
    writeArticle('no imagery here');
    const issues = validateContent(baseOpts());
    expect(
      issues.some(
        (i) =>
          i.message.includes(validEntry.id) &&
          i.message.includes('no published page references'),
      ),
    ).toBe(true);
  });

  it('does not let draft-only usage satisfy the stale-registry guard (VAL-IMG-006)', () => {
    // The published module references nothing; a DRAFT references the
    // image. Readers never see a draft, so the registry entry is stale
    // and the build must fail even though some MDX body uses the id.
    writeArticle('no imagery here');
    mkdirSync(join(root, 'rl-sim2real'), { recursive: true });
    writeFileSync(
      join(root, 'rl-sim2real', 'placeholder.mdx'),
      [
        '---',
        'title: "Placeholder"',
        'description: "Planned module."',
        'domain: "rl-sim2real"',
        'slug: "placeholder"',
        'order: 1',
        'status: "draft"',
        'lastReviewed: "2026-08-10"',
        'citations: []',
        '---',
        '',
        `Draft body. <Image id="${validEntry.id}" />`,
        '',
      ].join('\n'),
    );
    const issues = validateContent(baseOpts());
    expect(
      issues.some(
        (i) =>
          i.message.includes(validEntry.id) &&
          i.message.includes('no published page references'),
      ),
    ).toBe(true);
    // The id gate still scanned the draft: a KNOWN id in a draft is not
    // itself an unregistered-id error.
    expect(
      issues.some((i) => i.message.includes('not in the image registry')),
    ).toBe(false);
  });

  it('passes when the reference and the registry agree', () => {
    writeArticle(`<Image id="${validEntry.id}" />`);
    const issues = validateContent(baseOpts()).filter((i) =>
      i.message.toLowerCase().includes('image'),
    );
    expect(issues).toEqual([]);
  });

  it('counts a company.logo as published usage and rejects an unknown logo id', () => {
    writeArticle('no imagery here');
    const viaCompany = validateContent({
      ...baseOpts(),
      companies: [{ id: 'nvidia-robotics', logo: validEntry.id }],
    }).filter((issue) => issue.message.toLowerCase().includes('image'));
    expect(viaCompany).toEqual([]);

    const unknown = validateContent({
      ...baseOpts(),
      companies: [{ id: 'nvidia-robotics', logo: 'ghost-logo' }],
    });
    expect(
      unknown.some((issue) =>
        issue.message.includes('ghost-logo') &&
        issue.message.includes('not in the image registry'),
      ),
    ).toBe(true);
  });

  it('fails on a schema-invalid registry entry, naming the id and the problem', () => {
    writeArticle(`<Image id="${validEntry.id}" />`);
    const broken = { ...validEntry, licence: 'made-up-licence' } as unknown as SiteImage;
    const issues = validateContent({ ...baseOpts(), images: [broken] });
    expect(
      issues.some(
        (i) =>
          i.message.includes(validEntry.id) &&
          i.message.includes('made-up-licence'),
      ),
    ).toBe(true);
  });

  it('fails when the registry file is missing from public/', () => {
    writeArticle(`<Image id="${validEntry.id}" />`);
    const missing: SiteImage = { ...validEntry, file: '/images/does-not-exist.jpg' };
    const issues = validateContent({ ...baseOpts(), images: [missing] });
    expect(
      issues.some(
        (i) => i.message.includes(missing.id) && i.message.includes('does-not-exist'),
      ),
    ).toBe(true);
  });

  it('fails on provenance that carries a synthesis marker (VAL-IMG-013)', () => {
    writeArticle(`<Image id="${validEntry.id}" />`);
    const synthetic = editorialPhoto({ sourceName: 'AI-generated render' });
    const issues = validateContent({ ...baseOpts(), images: [synthetic] });
    expect(
      issues.some(
        (i) => i.message.includes(synthetic.id) && /synthesis|AI/i.test(i.message),
      ),
    ).toBe(true);
  });
});

describe('the shipped registry (VAL-IMG-006, VAL-IMG-013)', () => {
  it('every registry entry is schema-valid', () => {
    for (const image of IMAGES) {
      const parsed = imageSchema.safeParse(image);
      expect(parsed.success, `${image.id}: ${parsed.error?.message ?? ''}`).toBe(true);
    }
  });

  it('registry ids are unique', () => {
    const ids = IMAGES.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the real content validator accepts the real registry and tree', () => {
    const issues = validateContent({
      contentRoot: join(process.cwd(), 'content'),
      publicDir: join(process.cwd(), 'public'),
      modules,
      citations: CITATIONS,
      terms: GLOSSARY,
      images: IMAGES,
      companies: COMPANIES,
      imageSources: [
        {
          label: 'app/page.tsx',
          // The home page is a tsx file; the validator scans it for
          // ImageRef usages exactly like an MDX body.
          body: readFileSync(join(process.cwd(), 'app', 'page.tsx'), 'utf8'),
        },
      ],
    });
    expect(issues).toEqual([]);
  });
});

/**
 * The §1.13 provenance record (VAL-B2-IMG-002, VAL-B2-IMG-003,
 * VAL-B2-IMG-008). Every editorial image has to carry one closed
 * legal-basis value, the attribution sentence the page renders, and a
 * preservation policy, and the schema has to refuse a record that
 * contradicts the licence beside it.
 */
describe('§1.13 provenance record', () => {
  const editorial = IMAGES.filter((image) => !image.file.startsWith('/images/logos/'));
  const marks = IMAGES.filter((image) => image.file.startsWith('/images/logos/'));

  it('covers every editorial image and leaves the mark path to VAL-B2-MAP-010', () => {
    expect(editorial.length).toBeGreaterThan(0);
    expect(marks.length).toBeGreaterThan(0);
    for (const image of editorial) {
      expect(image.figureKind, image.id).toBeDefined();
      expect(image.legalBasis, image.id).toBeDefined();
      expect(image.attributionText, image.id).toBeDefined();
      expect(image.preservationPolicy, image.id).toBeDefined();
      expect(figureKind(image), image.id).not.toBe('official-mark');
    }
    for (const image of marks) {
      expect(figureKind(image), image.id).toBe('official-mark');
      // A mark with a real reuse grant keeps that grant as its basis; only
      // the ungranted ones fall to the identification path.
      if (image.licence === 'unlicensed' || image.licence === 'unknown') {
        expect(legalBasis(image), image.id).toBe('official-identification-use');
      }
    }
    for (const image of editorial) {
      expect(legalBasis(image), image.id).not.toBe('official-identification-use');
    }
  });

  it('grounds each declared basis in the licence recorded beside it', () => {
    for (const image of IMAGES) {
      const grounded = [LEGAL_BASIS_BY_LICENCE[image.licence]];
      if (figureKind(image) === 'original-schematic') grounded.push('owned');
      expect(grounded, `${image.id} (${image.licence})`).toContain(legalBasis(image));
    }
  });

  it('renders the attribution sentence it records', () => {
    const panda = getImage('franka-emika-panda-cebit-2017');
    expect(panda?.attributionText).toBe(
      'Photo: Ims / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    );
    for (const image of IMAGES) {
      expect(attributionText(image), image.id).toBe(
        `${creditNoun(image)}: ${image.creator} / ${image.sourceName}. Licence: ${licenceLabel(image)}.`,
      );
    }
  });

  it('names the noun from the registry, not the file extension', () => {
    // The /credits page credited an `.svg` company mark as "Diagram:" and a
    // raster mark beside it as "Photo:" while extension decided the noun.
    const mark = marks.find((image) => image.file.endsWith('.svg'));
    expect(mark && creditNoun(mark)).toBe('Logo');
    expect(creditNoun(getImage('covariate-shift')!)).toBe('Diagram');
    expect(creditNoun(getImage('puma-560-nasa-ames')!)).toBe('Photo');
  });

  it('lets only the two first-party diagrams be restyled in place', () => {
    const restyled = IMAGES.filter(
      (image) => preservationPolicy(image) === 'first-party-restyled-semantics-preserved',
    );
    expect(restyled.map((image) => image.id).sort()).toEqual([
      'covariate-shift',
      'temporal-ensembling',
    ]);
    for (const image of restyled) {
      expect(figureKind(image), image.id).toBe('original-schematic');
      expect(legalBasis(image), image.id).toBe('owned');
    }
    for (const image of IMAGES.filter((i) => !restyled.includes(i))) {
      expect(preservationPolicy(image), image.id).toBe('external-bytes-preserved');
    }
  });

  it('refuses an editorial image that records no legal basis', () => {
    const parsed = imageSchema.safeParse({ ...validEntry, legalBasis: undefined });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.message).toMatch(/must record legalBasis/);
  });

  it('refuses a basis the licence does not ground', () => {
    const parsed = imageSchema.safeParse({ ...validEntry, legalBasis: 'owned' });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.message).toMatch(
      /claims legal basis \\?"owned\\?" where licence \\?"cc-by-sa-4\.0/,
    );
  });

  it('refuses an editorial image resting on an identification-only licence', () => {
    for (const licence of ['unlicensed', 'unknown'] as const) {
      const parsed = imageSchema.safeParse(editorialPhoto({ licence }));
      expect(parsed.success, licence).toBe(false);
      expect(parsed.error?.message).toMatch(/official-identification-use is the mark path/);
    }
  });

  it('refuses a restyle policy on anything but an original schematic', () => {
    const parsed = imageSchema.safeParse({
      ...validEntry,
      preservationPolicy: 'first-party-restyled-semantics-preserved',
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.message).toMatch(/must be external-bytes-preserved/);
  });

  it('refuses an official-mark kind outside the logo directory', () => {
    const parsed = imageSchema.safeParse({ ...validEntry, figureKind: 'official-mark' });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.message).toMatch(/cannot be an official-mark/);
  });

  it('refuses attribution text that disagrees with the entry it sits in', () => {
    const parsed = imageSchema.safeParse({
      ...validEntry,
      attributionText: 'Photo: Somebody Else / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.message).toMatch(/records attribution/);
  });
});
