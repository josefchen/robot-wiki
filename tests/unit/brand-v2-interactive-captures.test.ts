import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { BrandV2Registry } from '@/lib/brand-v2-runners';
import {
  CAPTURE_RUBRIC,
  INTERACTIVE_CAPTURES_EVIDENCE_PATH,
  INTERACTIVE_CAPTURE_SHEET_DIR,
  INTERACTIVE_CAPTURE_VIEWPORTS,
  interactiveCapturePlan,
  interactiveCaptureVerdicts,
  interactiveCapturesEvidenceFingerprint,
  plannedSheets,
  readInteractiveCapturesEvidence,
  sheetCaptureKeys,
  type InteractiveCapturesEvidence,
} from '@/lib/brand-v2-interactive-captures';

const ROOT = process.cwd();
const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract/brand-v2-registries.json'), 'utf8'),
) as BrandV2Registry;
const PLAN = interactiveCapturePlan(REGISTRY);

function committed(): InteractiveCapturesEvidence {
  return JSON.parse(
    readFileSync(join(ROOT, INTERACTIVE_CAPTURES_EVIDENCE_PATH), 'utf8'),
  ) as InteractiveCapturesEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(change: (evidence: InteractiveCapturesEvidence) => void): InteractiveCapturesEvidence {
  const copy = structuredClone(committed());
  change(copy);
  return copy;
}

const fingerprint = () => interactiveCapturesEvidenceFingerprint({ root: ROOT, plan: PLAN });

function accept(evidence: InteractiveCapturesEvidence, root?: string) {
  return readInteractiveCapturesEvidence({ artifact: evidence, fingerprint: fingerprint(), plan: PLAN, root });
}

const scratch: string[] = [];
afterEach(() => {
  for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true });
});

/** A root holding a copy of the committed contact sheets, to tamper with. */
function sheetRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'interactive-captures-'));
  scratch.push(root);
  const from = join(ROOT, INTERACTIVE_CAPTURE_SHEET_DIR);
  const to = join(root, INTERACTIVE_CAPTURE_SHEET_DIR);
  mkdirSync(to, { recursive: true });
  for (const file of readdirSync(from)) copyFileSync(join(from, file), join(to, file));
  return root;
}

describe('interactive-captures evidence', { timeout: 30_000 }, () => {
  it('derives one deterministic plan that accounts every registered source and mount', () => {
    expect(interactiveCapturePlan(REGISTRY)).toEqual(PLAN);
    expect(PLAN.mounts.map(({ mountId }) => mountId).sort()).toEqual(
      REGISTRY.interactive.mounts.map(({ id }) => id).sort(),
    );
    expect(PLAN.sources.map(({ sourceId }) => sourceId)).toEqual(REGISTRY.interactive.sources.map(({ id }) => id));
    const mounted = new Set(REGISTRY.interactive.mounts.map(({ sourceId }) => sourceId));
    for (const source of PLAN.sources) {
      // A source is captured through its mounts, or it says why it cannot be.
      expect(source.mountIds.length > 0, source.sourceId).toBe(mounted.has(source.sourceId));
      expect(source.notApplicableReason === null, source.sourceId).toBe(mounted.has(source.sourceId));
    }
    for (const mount of PLAN.mounts) {
      const registered = REGISTRY.interactive.mounts.find(({ id }) => id === mount.mountId)!;
      expect(mount.caseIds).toEqual(registered.cases.map(({ id }) => id));
      expect(mount.expectedCaseCount).toBe(registered.cases.length);
      const changed = registered.cases.find(({ id }) => id === mount.changedCaseId);
      expect(changed?.notApplicableReason ?? null, `${mount.mountId} changes through an applicable case`).toBeNull();
      expect(mount.hasReset).toBe(registered.cases.some(({ kind, notApplicableReason }) => kind === 'reset' && !notApplicableReason));
    }
    // Every capture lands on exactly one sheet.
    const tiled = plannedSheets(PLAN).flatMap(({ mountIds }) => sheetCaptureKeys(mountIds));
    expect(new Set(tiled).size).toBe(tiled.length);
    expect(tiled).toHaveLength(PLAN.mounts.length * INTERACTIVE_CAPTURE_VIEWPORTS.length * 2);
  });

  it('refuses stale, incomplete, reordered and malformed capture evidence', () => {
    expect(() => accept(committed(), ROOT)).not.toThrow();
    const first = PLAN.mounts[0].mountId;
    const last = PLAN.mounts.at(-1)!.mountId;
    const refused: Array<[string, InteractiveCapturesEvidence, RegExp]> = [
      ['stale fingerprint', mutate((e) => (e.fingerprint = '0'.repeat(64))), /stale/],
      ['wrong viewports', mutate((e) => e.viewports.reverse()), /reads 1440x900\/375x812/],
      ['dropped mount', mutate((e) => (e.mountIds = e.mountIds.filter((id) => id !== last))), /mounts dropped/],
      ['extra mount', mutate((e) => e.mountIds.push('mount:/planted/:Planted:1')), /unregistered/],
      ['duplicated mount', mutate((e) => e.mountIds.splice(1, 0, first)), /duplicates|unregistered|order/],
      ['reordered mounts', mutate((e) => e.mountIds.reverse()), /out of plan order/],
      ['dropped source', mutate((e) => e.sources.pop()), /sources dropped/],
      ['misfiled source mounts', mutate((e) => (e.sources[0].mountIds = [])), /accounts mounts/],
      [
        'untyped unmounted source',
        mutate((e) => {
          const unmounted = e.sources.find(({ notApplicableReason }) => notApplicableReason !== null);
          if (unmounted) unmounted.notApplicableReason = null;
          else e.sources[0].notApplicableReason = 'planted';
        }),
        /typed reason/,
      ],
      ['missing reading', mutate((e) => e.observations.pop()), /readings dropped/],
      ['duplicated reading', mutate((e) => e.observations.splice(1, 0, structuredClone(e.observations[0]))), /readings/],
      ['captures taken away', mutate((e) => (e.observations[0].captures = [])), /captures/],
      [
        'captures out of order',
        mutate((e) => e.observations[0].captures.reverse()),
        /not default\/changed/,
      ],
      [
        'unowned predicate',
        mutate((e) =>
          e.observations[0].findings.push({ state: 'default', predicate: 'planted', element: 'div', detail: '', exemption: null }),
        ),
        /no rubric row/,
      ],
      [
        'invented exemption',
        mutate((e) =>
          e.observations[0].findings.push({ state: 'default', predicate: 'shadow', element: 'div', detail: '', exemption: 'planted' }),
        ),
        /does not hold/,
      ],
      ['sheet tile with other bytes', mutate((e) => (e.sheets.at(-1)!.captures[0].sha256 = '0'.repeat(64))), /bytes the reading did not record/],
      ['sheet that drops a tile', mutate((e) => e.sheets[0].captures.pop()), /exactly once/],
      ['sheet that tiles another mount', mutate((e) => (e.sheets[0].mountIds = e.sheets[1].mountIds)), /the plan puts/],
      ['nondeterministic sheet', mutate((e) => (e.sheets[0].renderedTwiceIdentical = false)), /not a deterministic/],
      ['dropped sheet', mutate((e) => e.sheets.pop()), /contact sheets dropped/],
      ['malformed artifact', { version: 1 } as unknown as InteractiveCapturesEvidence, /interactive-captures|Invalid|Required|expected/i],
    ];
    for (const [label, evidence, pattern] of refused) {
      expect(() => accept(evidence), label).toThrow(pattern);
    }
  });

  it('refuses a committed sheet that is missing, holds other bytes or has a stray beside it', () => {
    const sheet = committed().sheets[0].path;

    const missing = sheetRoot();
    unlinkSync(join(missing, sheet));
    expect(() => accept(committed(), missing)).toThrow(/recorded but not committed/);

    const tampered = sheetRoot();
    const bytes = readFileSync(join(tampered, sheet));
    bytes[bytes.length - 3] ^= 0xff;
    writeFileSync(join(tampered, sheet), bytes);
    expect(() => accept(committed(), tampered)).toThrow(/other bytes/);

    const stray = sheetRoot();
    writeFileSync(join(stray, INTERACTIVE_CAPTURE_SHEET_DIR, 'sheet-99.jpg'), bytes);
    expect(() => accept(committed(), stray)).toThrow(/sits beside the recorded contact sheets/);
  });

  it('decides one verdict per planned mount, which root computed styles alone cannot satisfy', () => {
    const verdicts = interactiveCaptureVerdicts(accept(committed()), PLAN);
    expect([...verdicts.keys()]).toEqual(PLAN.mounts.map(({ mountId }) => mountId));
    for (const verdict of verdicts.values()) {
      expect(verdict.failures, verdict.id).toEqual([]);
      expect(verdict.observed.captures).toHaveLength(INTERACTIVE_CAPTURE_VIEWPORTS.length * 2);
      expect(Object.keys(verdict.observed.rubric)).toEqual(CAPTURE_RUBRIC.map(({ id }) => id));
      expect(Object.values(verdict.observed.observedCaseCount)).toEqual(
        INTERACTIVE_CAPTURE_VIEWPORTS.map(() => verdict.observed.expectedCaseCount),
      );
      expect(verdict.observed.contactSheet).toMatch(/^evidence\/brand-v2\/interactive-captures\/sheet-\d+\.jpg$/);
    }
    // A reading whose pixels are blank, mid-transition or the default
    // repainted carries nothing a computed style could stand in for.
    const target = PLAN.mounts.at(-1)!.mountId;
    const planted = mutate((e) => {
      const row = e.observations.find(({ mountId, viewport }) => mountId === target && viewport === '375x812')!;
      row.captures[0].luminanceSpread = 0;
      row.captures[1].settled = false;
      row.captures[1].sha256 = row.captures[0].sha256;
      // The sheet tiles the repainted capture, so the artifact stays coherent
      // and only the verdict can refuse it.
      const key = `${target}@375x812:changed`;
      for (const sheet of e.sheets) {
        for (const tile of sheet.captures) if (tile.key === key) tile.sha256 = row.captures[0].sha256;
      }
    });
    const failing = [...interactiveCaptureVerdicts(accept(planted), PLAN).values()].filter(({ failures }) => failures.length > 0);
    expect(failing.map(({ id }) => id)).toEqual([target]);
    expect(failing[0].failures.join('\n')).toMatch(/blank[\s\S]*mid-transition[\s\S]*same pixels/);
  });
});
