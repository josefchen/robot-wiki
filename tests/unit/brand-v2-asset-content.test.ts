import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ASSET_CONTENT_LIMITATIONS,
  assetContentVerdicts,
  decodeFormat,
  decodeKinematicDescription,
  decodeModel,
  decodeRaster,
  decodeVector,
  identitySlotReferences,
  type AssetProvenance,
} from '@/lib/brand-v2-asset-content';
import { IMAGES } from '@/data/images';
import { firstPartyVisualAssets, identityLockupSourcePaths } from '@/lib/identity-populations';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as {
  assets: Array<{
    id: string;
    path: string;
    category: string;
    byteHash: string;
    sourceRegistryId: string | null;
  }>;
  metadata: Array<{ ownerPath: string }>;
};

const ASSET_ROWS = new Map(REGISTRY.assets.map((row) => [row.id, row]));

const PROVENANCE = new Map<string, AssetProvenance>(
  IMAGES.filter((image) => typeof image.width === 'number').map((image) => [
    image.id,
    image as unknown as AssetProvenance,
  ]),
);

const IDENTITY_SOURCE_PATHS = [
  ...new Set([
    ...REGISTRY.metadata.map(({ ownerPath }) => ownerPath),
    ...identityLockupSourcePaths(),
  ]),
].sort();

function registeredPopulation() {
  return firstPartyVisualAssets(REGISTRY.assets).map((asset) => {
    const row = ASSET_ROWS.get(asset.id)!;
    return {
      id: asset.id,
      path: asset.path,
      category: asset.category,
      byteHash: row.byteHash,
      sourceRegistryId: row.sourceRegistryId,
    };
  });
}

/** A scratch tree carrying only the files one verdict needs to read. */
const scratchRoots: string[] = [];
function scratchRoot(files: Record<string, string | Buffer>): string {
  const root = mkdtempSync(join(tmpdir(), 'rw-asset-content-'));
  scratchRoots.push(root);
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  }
  return root;
}

const MINIMAL_URDF = `<?xml version="1.0"?>
<robot name="scratch">
  <link name="base"/>
  <link name="arm"/>
  <joint name="shoulder" type="revolute"/>
  <mesh filename="assets/arm.glb"/>
</robot>
`;

function glb(document: object): Buffer {
  const json = Buffer.from(JSON.stringify(document), 'utf8');
  const padded = Buffer.concat([
    json,
    Buffer.alloc((4 - (json.length % 4)) % 4, 0x20),
  ]);
  const header = Buffer.alloc(20);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.write('JSON', 16, 'ascii');
  return Buffer.concat([header, padded]);
}

function hash(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

afterEach(() => {
  while (scratchRoots.length > 0) {
    rmSync(scratchRoots.pop() as string, { recursive: true, force: true });
  }
});

describe('asset container decoding', () => {
  it('reads the format out of the bytes, not the filename', () => {
    expect(decodeFormat(Buffer.from('<svg viewBox="0 0 1 1"></svg>'))).toBe('svg');
    expect(decodeFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(decodeFormat(glb({ asset: { version: '2.0' } }))).toBe('glb');
    expect(decodeFormat(Buffer.from(MINIMAL_URDF))).toBe('urdf');
    expect(decodeFormat(Buffer.from('not a picture'))).toBe('unknown');
  });

  it('censuses a vector by element, label and embedded payload', () => {
    const decoded = decodeVector(
      readFileSync(join(ROOT, 'public', 'images', 'covariate-shift.svg'), 'utf8'),
    );

    expect(decoded.viewBox).toBe('0 0 640 250');
    expect(decoded.widthPx).toBe(640);
    expect(decoded.heightPx).toBe(250);
    expect(decoded.textRuns.length).toBeGreaterThanOrEqual(5);
    expect(decoded.drawingPrimitives).toBeGreaterThan(5);
    expect(decoded.embeddedRasterCount).toBe(0);
    expect(decoded.externalReferences).toEqual([]);
    expect(decoded.accessibleLabel).toMatch(/covariate shift/i);
  });

  it('reads a glTF scene graph and refuses a container that lies about itself', () => {
    const decoded = decodeModel(
      readFileSync(
        join(ROOT, 'public', 'models', 'so101', 'assets', 'base_so101_v2.glb'),
      ),
    );

    expect(decoded.gltfVersion).toBe('2.0');
    expect(decoded.nodeNames).toContain('base_so101_v2');
    expect(decoded.embeddedImageCount).toBe(0);

    const truncated = glb({ asset: { version: '2.0' } }).subarray(0, 24);
    expect(() => decodeModel(truncated)).toThrow(/declares \d+ bytes/);
    expect(() => decodeModel(Buffer.from('<svg></svg>'))).toThrow(
      /not a glTF binary/,
    );
  });

  it('reads a kinematic chain out of its description', () => {
    const decoded = decodeKinematicDescription(
      readFileSync(join(ROOT, 'public', 'models', 'so101', 'so101.urdf'), 'utf8'),
    );

    expect(decoded.robotName).toBeTruthy();
    expect(decoded.linkNames.length).toBeGreaterThan(0);
    expect(decoded.jointNames.length).toBeGreaterThan(0);
    expect(decoded.meshReferences).toContain('assets/base_so101_v2.glb');
  });

  it('reads a raster frame header and says plainly that it read no pixels', () => {
    const decoded = decodeRaster(
      readFileSync(
        join(ROOT, 'public', 'images', 'spot-raf-agile-liberty-2021.jpg'),
      ),
      'jpeg',
    );

    expect(decoded.widthPx).toBeGreaterThan(0);
    expect(decoded.heightPx).toBeGreaterThan(0);
    expect(decoded.pixelsDecoded).toBe(false);
  });
});

describe('identity slot references', () => {
  const source = readFileSync(join(ROOT, 'app', 'page.tsx'), 'utf8');

  it('does not read a content reference as an identity slot', () => {
    // The home page names the shipped kinematic description in a comment
    // about the playground preview. A file-wide substring match would call
    // that an identity slot; it is a statement about content.
    expect(source).toContain('models/so101/so101.urdf');
    expect(identitySlotReferences(source, 'models/so101/so101.urdf')).toEqual([]);
  });

  it('reads an icon declaration as one', () => {
    expect(
      identitySlotReferences(
        'export const metadata = { icons: { icon: "/images/diagram.svg" } };',
        'images/diagram.svg',
      ),
    ).toHaveLength(1);
  });
});

describe('registered first-party asset verdicts', () => {
  it('decides every registered asset on its own bytes, with no failures', () => {
    const verdicts = assetContentVerdicts({
      root: ROOT,
      assets: registeredPopulation(),
      provenanceById: PROVENANCE,
      identitySourcePaths: IDENTITY_SOURCE_PATHS,
    });

    expect(verdicts).toHaveLength(firstPartyVisualAssets(REGISTRY.assets).length);
    expect(verdicts.length).toBeGreaterThan(0);
    for (const verdict of verdicts) {
      expect(verdict.failures).toEqual([]);
      expect(verdict.formatMatchesExtension).toBe(true);
      expect(verdict.established.length).toBeGreaterThan(0);
      expect(verdict.basis).not.toBe('undecidable');
    }

    // Two bases, and each carries the limitation that belongs to it: the
    // decoded ones read content, the raster ones rest on external origin.
    const raster = verdicts.filter(({ basis }) => basis === 'external-provenance');
    expect(raster.length).toBeGreaterThan(0);
    for (const verdict of raster) {
      expect(verdict.limitations).toContain(ASSET_CONTENT_LIMITATIONS.raster);
    }
    for (const verdict of verdicts.filter(({ decodedFormat }) => decodedFormat === 'glb')) {
      expect(verdict.limitations).toContain(ASSET_CONTENT_LIMITATIONS.model);
    }
  });

  it('refuses a monogram registered under an innocent name', () => {
    // The exact defect this row could not see: nothing in the path, the
    // category or the sweep says what these bytes draw.
    const monogram = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="30"/><path d="M20 44 L32 20 L44 44 Z"/></svg>',
    );
    const root = scratchRoot({
      'public/images/state-distribution.svg': monogram,
      'public/models/so101/so101.urdf': MINIMAL_URDF,
    });

    const [verdict] = assetContentVerdicts({
      root,
      assets: [
        {
          id: 'asset:images/state-distribution.svg',
          path: 'images/state-distribution.svg',
          category: 'editorial-image',
          byteHash: hash(monogram),
          sourceRegistryId: null,
        },
        {
          id: 'asset:models/so101/so101.urdf',
          path: 'models/so101/so101.urdf',
          category: 'playground-model',
          byteHash: hash(MINIMAL_URDF),
          sourceRegistryId: null,
        },
      ],
      provenanceById: new Map(),
      identitySourcePaths: [],
    });

    expect(verdict.failures.join(' ')).toMatch(/label run/);
    expect(verdict.failures.join(' ')).toMatch(/icon-shaped canvas/);
  });

  it('refuses a vector whose bytes hide behind a raster name', () => {
    const bytes = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><text>RW</text><circle cx="32" cy="32" r="30"/></svg>',
    );
    const root = scratchRoot({
      'public/images/robot-photo.jpg': bytes,
      'public/models/so101/so101.urdf': MINIMAL_URDF,
    });

    const [verdict] = assetContentVerdicts({
      root,
      assets: [
        {
          id: 'asset:images/robot-photo.jpg',
          path: 'images/robot-photo.jpg',
          category: 'editorial-image',
          byteHash: hash(bytes),
          sourceRegistryId: null,
        },
        {
          id: 'asset:models/so101/so101.urdf',
          path: 'models/so101/so101.urdf',
          category: 'playground-model',
          byteHash: hash(MINIMAL_URDF),
          sourceRegistryId: null,
        },
      ],
      provenanceById: new Map(),
      identitySourcePaths: [],
    });

    expect(verdict.decodedFormat).toBe('svg');
    expect(verdict.failures.join(' ')).toMatch(
      /svg file behind a \.jpg name/,
    );
  });

  it('refuses a raster with no external origin rather than pass it on its name', () => {
    // Pixels are not decoded, so a first-party raster has no content
    // evidence at all. Fail closed instead of resting on the filename.
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08]),
      Buffer.from([0x02, 0x00, 0x03, 0x00, 0x03]),
      Buffer.alloc(32, 0),
    ]);
    const root = scratchRoot({
      'public/images/diagram-render.jpg': jpeg,
      'public/models/so101/so101.urdf': MINIMAL_URDF,
    });

    const [verdict] = assetContentVerdicts({
      root,
      assets: [
        {
          id: 'asset:images/diagram-render.jpg',
          path: 'images/diagram-render.jpg',
          category: 'editorial-image',
          byteHash: hash(jpeg),
          sourceRegistryId: null,
        },
        {
          id: 'asset:models/so101/so101.urdf',
          path: 'models/so101/so101.urdf',
          category: 'playground-model',
          byteHash: hash(MINIMAL_URDF),
          sourceRegistryId: null,
        },
      ],
      provenanceById: new Map(),
      identitySourcePaths: [],
    });

    expect(verdict.basis).toBe('undecidable');
    expect(verdict.failures.join(' ')).toMatch(/no registered external origin/);
  });

  it('refuses a model that no shipped chain builds from', () => {
    const model = glb({
      asset: { version: '2.0' },
      nodes: [{ name: 'mark' }],
      meshes: [{}],
      materials: [{}],
    });
    const root = scratchRoot({
      'public/models/so101/assets/mark.glb': model,
      'public/models/so101/so101.urdf': MINIMAL_URDF,
    });

    const [verdict] = assetContentVerdicts({
      root,
      assets: [
        {
          id: 'asset:models/so101/assets/mark.glb',
          path: 'models/so101/assets/mark.glb',
          category: 'playground-model',
          byteHash: hash(model),
          sourceRegistryId: null,
        },
        {
          id: 'asset:models/so101/so101.urdf',
          path: 'models/so101/so101.urdf',
          category: 'playground-model',
          byteHash: hash(MINIMAL_URDF),
          sourceRegistryId: null,
        },
      ],
      provenanceById: new Map(),
      identitySourcePaths: [],
    });

    expect(verdict.failures.join(' ')).toMatch(/builds its chain from/);
  });

  it('refuses an asset whose registered hash is about other bytes', () => {
    const bytes = readFileSync(
      join(ROOT, 'public', 'images', 'covariate-shift.svg'),
    );
    const root = scratchRoot({
      'public/images/covariate-shift.svg': bytes,
      'public/models/so101/so101.urdf': MINIMAL_URDF,
    });

    const [verdict] = assetContentVerdicts({
      root,
      assets: [
        {
          id: 'asset:images/covariate-shift.svg',
          path: 'images/covariate-shift.svg',
          category: 'editorial-image',
          byteHash: hash('something else entirely'),
          sourceRegistryId: null,
        },
        {
          id: 'asset:models/so101/so101.urdf',
          path: 'models/so101/so101.urdf',
          category: 'playground-model',
          byteHash: hash(MINIMAL_URDF),
          sourceRegistryId: null,
        },
      ],
      provenanceById: new Map(),
      identitySourcePaths: [],
    });

    expect(verdict.failures.join(' ')).toMatch(/registry describes different bytes/);
  });

  it('refuses to quantify over an empty asset population', () => {
    expect(() =>
      assetContentVerdicts({
        root: ROOT,
        assets: [],
        provenanceById: PROVENANCE,
        identitySourcePaths: IDENTITY_SOURCE_PATHS,
      }),
    ).toThrow(/quantify over nothing/);
  });
});
