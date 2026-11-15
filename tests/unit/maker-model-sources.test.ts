import { describe, expect, it } from 'vitest';
import {
  MAKER_MODEL_SOURCES,
  MAKER_MODEL_SOURCES_AS_OF,
} from '@/data/maker-model-sources';
import { MODELS_3D } from '@/data/models-3d';
import {
  makerModelSourceSchema,
  makerModelStatusSchema,
  type MakerModelSource,
} from '@/data/schemas/maker-model-source';
import {
  MAKER_MODEL_STATUS_ORDER,
  countsByStatus,
  rowsByStatus,
} from '@/lib/maker-model-sources';

/**
 * The maker-model register: every row parses, is pinned and sourced, links
 * its licence at the commit it names, and agrees with the models the site
 * ships. Counts are recomputed from the rows.
 */

const rows = MAKER_MODEL_SOURCES;
const onGitHub = (row: MakerModelSource) =>
  row.repository?.startsWith('https://github.com/') ?? false;

describe('maker model sources: rows', () => {
  it('every row parses against the schema', () => {
    for (const row of rows) makerModelSourceSchema.parse(row);
  });

  it('the schema rejects rows whose fields contradict their status', () => {
    const spot = rows.find((row) => row.id === 'bd-spot-sdk')!;
    const engineai = rows.find((row) => row.id === 'engineai-description')!;
    const bad = [
      { ...spot, clause: undefined },
      { ...spot, status: 'official' },
      { ...spot, commit: null },
      { ...engineai, status: 'none-found' },
      { ...engineai, licence: { name: 'MIT', url: 'https://example.com/' } },
    ];
    for (const row of bad) {
      expect(makerModelSourceSchema.safeParse(row).success).toBe(false);
    }
  });

  it('ids are unique', () => {
    const ids = rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every commit hash is 40 lowercase hex characters', () => {
    for (const row of rows) {
      if (row.commit) expect(row.commit.hash, row.id).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it('every GitHub row is pinned to a commit', () => {
    for (const row of rows.filter(onGitHub)) {
      expect(row.commit, row.id).not.toBeNull();
    }
  });

  it('official and restricted rows carry a primary source and a licence address', () => {
    for (const status of ['official', 'restricted'] as const) {
      for (const row of rowsByStatus(rows, status)) {
        expect(
          row.sources.some((s) => s.kind === 'primary'),
          `${row.id} has no primary source`,
        ).toBe(true);
        expect(row.licence?.url, row.id).toMatch(/^https:\/\//);
      }
    }
  });

  it('a GitHub licence address points at the text at the pinned commit', () => {
    for (const row of rows.filter(onGitHub)) {
      if (!row.licence || !row.commit) continue;
      expect(row.licence.url, row.id).toMatch(
        new RegExp(`^${row.repository}/blob/${row.commit.hash}/\\S+$`),
      );
    }
  });

  it('a GitHub row cites its repository at the pinned commit', () => {
    for (const row of rows.filter(onGitHub)) {
      expect(
        row.sources.some(
          (s) =>
            s.url.startsWith(`${row.repository}/`) &&
            s.url.includes(row.commit!.hash),
        ),
        row.id,
      ).toBe(true);
    }
  });

  it('only restricted rows quote a limiting clause', () => {
    for (const row of rows) {
      expect(row.clause !== undefined, row.id).toBe(row.status === 'restricted');
    }
  });

  it('no-licence and none-found rows name no licence', () => {
    for (const status of ['no-licence', 'none-found'] as const) {
      for (const row of rowsByStatus(rows, status)) {
        expect(row.licence, row.id).toBeNull();
      }
    }
  });

  it('no-licence rows cite the README read at the commit and open "No licence file"', () => {
    for (const row of rowsByStatus(rows, 'no-licence')) {
      expect(
        row.sources.some((s) =>
          s.url.startsWith(`${row.repository}/blob/${row.commit!.hash}/README`),
        ),
        row.id,
      ).toBe(true);
      expect(row.note, row.id).toMatch(/^No licence file\b/);
    }
  });

  it('a licence declared only in a manifest is official and says there is no licence file', () => {
    const manifest = /\/(?:package\.xml|setup\.py|pyproject\.toml)$/;
    const declared = rows.filter((row) => row.licence && manifest.test(row.licence.url));
    expect(declared.map((row) => row.id)).toEqual(['agibot-omnihand']);
    for (const row of declared) {
      expect(row.status, row.id).toBe('official');
      expect(row.note, row.id).toMatch(/no licence file/);
    }
  });

  it('none-found rows cite the maker, have no files and say "none found" with the date', () => {
    for (const row of rowsByStatus(rows, 'none-found')) {
      expect(row.repository, row.id).toBeNull();
      expect(row.commit, row.id).toBeNull();
      expect(row.formats, row.id).toEqual([]);
      expect(row.sources.every((s) => s.kind === 'primary'), row.id).toBe(true);
      expect(row.note, row.id).toMatch(/^None found on \d{1,2} [A-Z][a-z]{2} \d{4}\b/);
      expect(row.note, row.id).not.toMatch(/\b(?:no|none) (?:model )?exists?\b/i);
    }
  });

  it('every note is one sentence', () => {
    for (const row of rows) {
      expect(row.note, row.id).toMatch(/[.]$/);
      expect(row.note, row.id).not.toMatch(/[.!?]\s+\S/);
    }
  });

  it('no row is dated after MAKER_MODEL_SOURCES_AS_OF', () => {
    for (const row of rows) {
      expect(row.checked <= MAKER_MODEL_SOURCES_AS_OF, row.id).toBe(true);
      if (row.commit) {
        expect(row.commit.date <= MAKER_MODEL_SOURCES_AS_OF, row.id).toBe(true);
      }
    }
  });
});

describe('maker model sources: models the site ships', () => {
  it('every hostedModelId is in MODELS_3D with the same repository and commit', () => {
    for (const row of rows.filter((r) => r.hostedModelId)) {
      const model = MODELS_3D.find((m) => m.id === row.hostedModelId);
      expect(model, `${row.id} -> ${row.hostedModelId}`).toBeDefined();
      expect(model!.repository, row.id).toBe(row.repository);
      expect(model!.commit, row.id).toBe(row.commit?.hash);
      expect(row.status, row.id).toBe('official');
    }
  });

  it('every shipped model has its source row', () => {
    const hosted = rows.map((row) => row.hostedModelId);
    for (const model of MODELS_3D) expect(hosted, model.id).toContain(model.id);
  });

  it('Unitree is one row per repository and each says the G1 meshes differ', () => {
    const unitree = rows.filter((row) => row.maker === 'Unitree Robotics');
    expect(unitree.map((row) => row.repository)).toEqual([
      'https://github.com/unitreerobotics/unitree_ros',
      'https://github.com/unitreerobotics/unitree_mujoco',
    ]);
    for (const row of unitree) {
      expect(row.robots, row.id).toContain('G1');
      expect(row.note, row.id).toMatch(/G1 meshes/);
    }
  });
});

describe('maker model sources: counts', () => {
  it('the status order matches the schema enum', () => {
    expect([...MAKER_MODEL_STATUS_ORDER]).toEqual(makerModelStatusSchema.options);
  });

  it('counts every status from the rows', () => {
    const counts = countsByStatus(rows);
    expect(counts).toEqual({
      official: 21,
      restricted: 4,
      'no-licence': 2,
      'none-found': 7,
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(rows.length);
    expect(total).toBe(34);
  });

  it('groups rows by status in data order', () => {
    expect(rowsByStatus(rows, 'restricted').map((row) => row.id)).toEqual([
      'bd-spot-sdk',
      'ur-graphical-documentation',
      'leap-hand-v2-cad',
      'nvidia-isaac-sim-assets',
    ]);
    expect(rowsByStatus(rows, 'no-licence').map((row) => row.id)).toEqual([
      'agibot-x1-train',
      'engineai-description',
    ]);
    expect(rowsByStatus(rows, 'none-found').map((row) => row.maker)).toEqual([
      'Tesla',
      'Figure AI',
      '1X',
      'Agility Robotics',
      'Boston Dynamics',
      'Apptronik',
      'AgiBot',
    ]);
    for (const status of MAKER_MODEL_STATUS_ORDER) {
      expect(rowsByStatus(rows, status).every((row) => row.status === status)).toBe(true);
    }
  });

  it('reports zero for a status with no rows', () => {
    const official = rowsByStatus(rows, 'official');
    expect(countsByStatus(official)).toEqual({
      official: 21,
      restricted: 0,
      'no-licence': 0,
      'none-found': 0,
    });
    expect(countsByStatus([])).toEqual({
      official: 0,
      restricted: 0,
      'no-licence': 0,
      'none-found': 0,
    });
  });
});
