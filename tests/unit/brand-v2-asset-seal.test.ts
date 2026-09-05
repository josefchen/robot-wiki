import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ASSET_SEAL_PATH,
  readAssetSeal,
  reconcileAssetSeal,
  type SealedAsset,
} from '@/lib/brand-v2-asset-seal';
import { assetContentVerdicts } from '@/lib/brand-v2-asset-content';
import { firstPartyVisualAssets } from '@/lib/identity-populations';

const ROOT = process.cwd();

const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract', 'brand-v2-registries.json'), 'utf8'),
) as {
  assets: Array<{ id: string; path: string; category: string }>;
};

const SHIPPED_PATHS = firstPartyVisualAssets(REGISTRY.assets).map(
  ({ path }) => path,
);

/**
 * The exact plant a scrutiny reviewer used against the deleted heuristics: a
 * wide canvas (so the icon-aspect clause could not fire) carrying several
 * label runs (so the minimum-label clause could not fire) around a drawing
 * of a robot head. Recognising that this depicts a robot head is not
 * decidable, which is why nothing here tries.
 */
const WIDE_LABELLED_ROBOT_HEAD = Buffer.from(
  [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400" aria-label="Robot head reference">',
    '<title>Robot head reference</title>',
    '<desc>Front view of a robot head with two camera eyes and an antenna.</desc>',
    '<rect x="420" y="90" width="360" height="260" rx="24"/>',
    '<circle cx="520" cy="200" r="34"/>',
    '<circle cx="680" cy="200" r="34"/>',
    '<line x1="600" y1="90" x2="600" y2="30"/>',
    '<circle cx="600" cy="24" r="14"/>',
    '<text x="60" y="60">head shell</text>',
    '<text x="60" y="120">camera eye</text>',
    '<text x="60" y="180">antenna</text>',
    '<text x="60" y="240">jaw plate</text>',
    '</svg>',
  ].join(''),
);

const MINIMAL_URDF = `<?xml version="1.0"?>
<robot name="scratch">
  <link name="base"/>
  <joint name="shoulder" type="revolute"/>
  <mesh filename="assets/arm.glb"/>
</robot>
`;

function hash(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function sealEntry(path: string, bytes: Buffer): SealedAsset {
  return {
    path,
    sha256: hash(bytes),
    byteCount: bytes.length,
    owner: 'robot-wiki-editorial',
    purpose:
      'Scratch fixture standing in for an approved editorial asset in this test.',
  };
}

const scratchRoots: string[] = [];
function scratchRoot(files: Record<string, string | Buffer>): string {
  const root = mkdtempSync(join(tmpdir(), 'rw-asset-seal-'));
  scratchRoots.push(root);
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  }
  return root;
}

afterEach(() => {
  while (scratchRoots.length > 0) {
    rmSync(scratchRoots.pop() as string, { recursive: true, force: true });
  }
});

describe('first-party visual asset seal', () => {
  it('ships exactly the approved asset set', () => {
    const seal = readAssetSeal(ROOT);
    // Before any plant: the shipped tree is accepted as it stands, so a
    // refusal below is the plant and not a broken harness.
    const verdicts = reconcileAssetSeal({
      root: ROOT,
      shippedPaths: SHIPPED_PATHS,
      seal,
    });

    expect(SHIPPED_PATHS.length).toBeGreaterThan(0);
    expect(verdicts.size).toBe(SHIPPED_PATHS.length);
    expect([...verdicts.keys()].sort()).toEqual([...SHIPPED_PATHS].sort());
    for (const verdict of verdicts.values()) {
      expect(verdict.shippedSha256).toBe(verdict.sealedSha256);
      expect(verdict.owner.length).toBeGreaterThan(0);
      expect(verdict.purpose.length).toBeGreaterThan(23);
    }

    // An unsealed asset in the tree, a sealed asset the tree does not ship,
    // and an approved path carrying other bytes each refuse the whole set.
    const unsealed = reconcileAssetSeal.bind(null, {
      root: ROOT,
      shippedPaths: [...SHIPPED_PATHS, 'images/state-distribution.svg'],
      seal,
    });
    expect(unsealed).toThrow(/no sealed entry/);
    expect(unsealed).toThrow(/images\/state-distribution\.svg/);

    expect(() =>
      reconcileAssetSeal({
        root: ROOT,
        shippedPaths: SHIPPED_PATHS.slice(1),
        seal,
      }),
    ).toThrow(/the tree does not ship/);

    const swapped = seal.map((entry) =>
      entry.path === SHIPPED_PATHS[0]
        ? { ...entry, sha256: hash('different artwork entirely') }
        : entry,
    );
    expect(swapped).not.toEqual(seal);
    expect(() =>
      reconcileAssetSeal({ root: ROOT, shippedPaths: SHIPPED_PATHS, seal: swapped }),
    ).toThrow(/the approved artwork is not the artwork in the tree/);
  });

  it('refuses a wide labelled robot head that the deleted heuristics accepted', () => {
    const root = scratchRoot({
      'public/images/state-distribution.svg': WIDE_LABELLED_ROBOT_HEAD,
      'public/models/so101/so101.urdf': MINIMAL_URDF,
    });
    const approved = [
      sealEntry('models/so101/so101.urdf', Buffer.from(MINIMAL_URDF)),
    ];

    // The seal is the mechanism that fails it: nobody approved these bytes.
    expect(() =>
      reconcileAssetSeal({
        root,
        shippedPaths: [
          'images/state-distribution.svg',
          'models/so101/so101.urdf',
        ],
        seal: approved,
      }),
    ).toThrow(
      /1 shipped first-party visual asset\(s\) have no sealed entry in contract\/brand-v2-asset-seal\.json, so nobody approved their bytes: images\/state-distribution\.svg/,
    );

    // And content analysis is honest about not being that mechanism: the
    // drawing decodes cleanly and describes itself, which is exactly why the
    // subject heuristics that used to sit here were deleted rather than
    // tightened. A tighter threshold would have been evaded by the next
    // drawing; an approval cannot be.
    const [described] = assetContentVerdicts({
      root,
      assets: [
        {
          id: 'asset:images/state-distribution.svg',
          path: 'images/state-distribution.svg',
          category: 'editorial-image',
          byteHash: hash(WIDE_LABELLED_ROBOT_HEAD),
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
    expect(described.failures).toEqual([]);
    expect(described.limitations.join(' ')).toMatch(
      /what a drawing depicts is not classified/,
    );
  });

  it('refuses a seal that approves one path twice', () => {
    const bytes = Buffer.from(MINIMAL_URDF);
    const root = scratchRoot({
      [ASSET_SEAL_PATH]: `${JSON.stringify(
        {
          schemaVersion: 1,
          assets: [
            sealEntry('models/so101/so101.urdf', bytes),
            {
              ...sealEntry('models/so101/so101.urdf', bytes),
              owner: 'somebody-else',
            },
          ],
        },
        null,
        2,
      )}\n`,
    });

    expect(() => readAssetSeal(root)).toThrow(/more than once/);
  });

  it('refuses an empty seal and an empty shipped set rather than reconcile nothing', () => {
    expect(() =>
      reconcileAssetSeal({ root: ROOT, shippedPaths: [], seal: readAssetSeal(ROOT) }),
    ).toThrow(/reconcile against nothing/);
    expect(() =>
      reconcileAssetSeal({ root: ROOT, shippedPaths: SHIPPED_PATHS, seal: [] }),
    ).toThrow(/seals no asset/);
  });
});
