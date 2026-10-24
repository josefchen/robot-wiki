import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BrandV2Registry } from '@/lib/brand-v2-runners';
import { buildManifest, sha256, type ApprovedDelta, type BaselineBundle } from '@/lib/brand-v2-baseline';
import {
  IDLE_MOTION_MODES,
  IDLE_WINDOW_MS,
  INTERACTIVE_LEDGER_EVIDENCE_PATH,
  LEDGER_ASSERTIONS,
  LEDGER_ENFORCED_ASSERTIONS,
  SPOKEN_TRANSITIONS,
  behavioralDefaultMembers,
  duplicateAnnouncements,
  interactiveLedgerEvidenceFingerprint,
  interactiveLedgerPlan,
  interactiveLedgerSourceJoins,
  interactiveLedgerVerdicts,
  joinSourceDefaults,
  readInteractiveLedgerEvidence,
  type InteractiveLedgerEvidence,
} from '@/lib/brand-v2-interactive-ledger';

const ROOT = process.cwd();
const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'contract/brand-v2-registries.json'), 'utf8'),
) as BrandV2Registry;
const PLAN = interactiveLedgerPlan(REGISTRY);

function committed(): InteractiveLedgerEvidence {
  return JSON.parse(readFileSync(join(ROOT, INTERACTIVE_LEDGER_EVIDENCE_PATH), 'utf8')) as InteractiveLedgerEvidence;
}

/** A structural clone, so a mutation in one case cannot leak into the next. */
function mutate(change: (evidence: InteractiveLedgerEvidence) => void): InteractiveLedgerEvidence {
  const copy = structuredClone(committed());
  change(copy);
  return copy;
}

let fingerprinted: string | undefined;
const fingerprint = () => (fingerprinted ??= interactiveLedgerEvidenceFingerprint({ root: ROOT, plan: PLAN }));

function accept(evidence: unknown, plan = PLAN) {
  return readInteractiveLedgerEvidence({ artifact: evidence, fingerprint: fingerprint(), plan });
}

/** The first committed reading with a control the ledger operated exactly once. */
function loneTransition(evidence: InteractiveLedgerEvidence) {
  for (const observation of evidence.observations) {
    for (const control of observation.controls) {
      const held = observation.transitions.filter((transition) => transition.control === control.index);
      if (!control.disabled && control.kind !== 'reset' && control.kind !== 'region' && held.length === 1) {
        return { observation, control };
      }
    }
  }
  throw new Error('no committed reading holds a control operated exactly once');
}

describe('interactive ledger evidence', { timeout: 60_000 }, () => {
  it('derives one deterministic plan that covers every registered mount and case', () => {
    expect(interactiveLedgerPlan(REGISTRY)).toEqual(PLAN);
    expect(PLAN.mounts.length, 'interactive mount population').toBeGreaterThan(0);
    expect(PLAN.mounts.map(({ mountId }) => mountId).sort()).toEqual(REGISTRY.interactive.mounts.map(({ id }) => id).sort());
    for (const mount of PLAN.mounts) {
      const registered = REGISTRY.interactive.mounts.find(({ id }) => id === mount.mountId)!;
      expect(mount.cases.map(({ id }) => id)).toEqual(registered.cases.map(({ id }) => id));
      expect(mount.group).toBe(mount.route.split('/').filter(Boolean)[0] ?? 'home');
    }
    expect(PLAN.groups.flatMap(({ mountIds }) => mountIds).sort()).toEqual(PLAN.mounts.map(({ mountId }) => mountId).sort());
    for (const group of PLAN.groups) expect(group.mountIds.length, `${group.id} mount population`).toBeGreaterThan(0);
    expect(LEDGER_ENFORCED_ASSERTIONS.every((id) => (LEDGER_ASSERTIONS as readonly string[]).includes(id))).toBe(true);
    expect(() => interactiveLedgerPlan({ interactive: { ...REGISTRY.interactive, mounts: [] } })).toThrow(/no mounts/);
  });

  it('refuses stale, empty, incomplete, reordered and omitted ledger evidence', () => {
    expect(() => accept(committed())).not.toThrow();
    const first = PLAN.mounts[0].mountId;
    const last = PLAN.mounts.at(-1)!.mountId;
    const refused: Array<[string, InteractiveLedgerEvidence, RegExp]> = [
      ['stale fingerprint', mutate((e) => (e.fingerprint = '0'.repeat(64))), /stale/],
      ['another viewport', mutate((e) => ((e as { viewport: string }).viewport = '375x812')), /1440x900|Invalid|expected/i],
      ['empty population', mutate((e) => ((e.mountIds = []), (e.observations = []))), /empty/],
      ['dropped mount', mutate((e) => (e.mountIds = e.mountIds.filter((id) => id !== last))), /mounts dropped/],
      ['extra mount', mutate((e) => e.mountIds.push('mount:/planted/:Planted:1')), /unregistered/],
      ['duplicated mount', mutate((e) => e.mountIds.splice(1, 0, first)), /duplicates|unregistered|order/],
      ['reordered mounts', mutate((e) => e.mountIds.reverse()), /out of plan order/],
      ['dropped group', mutate((e) => e.groups.pop()), /groups dropped/],
      ['misfiled group', mutate((e) => (e.groups[0].mountIds = e.groups[1].mountIds)), /other mounts than the plan/],
      ['missing reading', mutate((e) => e.observations.pop()), /readings dropped/],
      ['duplicated reading', mutate((e) => e.observations.splice(1, 0, structuredClone(e.observations[0]))), /readings/],
      ['reordered readings', mutate((e) => e.observations.reverse()), /out of plan order/],
      ['dropped case', mutate((e) => e.observations[0].cases.pop()), /cases dropped/],
      ['case of another kind', mutate((e) => (e.observations[0].cases[0].kind = 'planted')), /the registry has/],
      [
        'case typed not applicable without a reason',
        mutate((e) => {
          const observation = e.observations[0];
          const at = observation.cases.findIndex(({ status }) => status === 'observed');
          observation.cases[at].status = 'not-applicable';
        }),
        /typed reason/,
      ],
      ['transition of an unrecorded control', mutate((e) => (e.observations[0].transitions[0].control = 9999)), /never recorded/],
      ['transition under an unregistered case', mutate((e) => (e.observations[0].transitions[0].caseId = 'planted')), /does not hold/],
      ['control recorded twice', mutate((e) => e.observations[0].controls.push(structuredClone(e.observations[0].controls[0]))), /twice/],
      [
        'omitted transition',
        mutate((e) => {
          const { observation, control } = loneTransition(e);
          observation.transitions = observation.transitions.filter((transition) => transition.control !== control.index);
          for (const record of observation.cases) {
            record.records =
              record.kind === 'focus'
                ? observation.controls.length
                : record.kind === 'hover'
                  ? observation.hover.filter(({ control: hovered }) => hovered !== null).length
                  : observation.transitions.filter(({ caseId }) => caseId === record.caseId).length;
          }
        }),
        /omitted|records no transition/,
      ],
      [
        'case record count that disagrees with the ledger',
        mutate((e) => {
          const record = e.observations
            .flatMap(({ cases }) => cases)
            .find(({ status, matched }) => status === 'observed' && matched !== null && matched > 0)!;
          record.records += 1;
        }),
        /claims/,
      ],
      [
        'missing reset reading',
        mutate((e) => {
          const resettable = e.observations.find(({ mountId }) => PLAN.mounts.find((mount) => mount.mountId === mountId)!.hasReset)!;
          resettable.reset = null;
        }),
        /no reset reading/,
      ],
      [
        'missing idle window',
        mutate((e) => (e.observations.at(-1)!.idle = e.observations.at(-1)!.idle.slice(0, 1))),
        /idle windows/,
      ],
      ['malformed artifact', { version: 1 } as unknown as InteractiveLedgerEvidence, /interactive-ledger|Invalid|Required|expected/i],
    ];
    for (const [label, evidence, pattern] of refused) {
      expect(() => accept(evidence), label).toThrow(pattern);
    }
    expect(() => accept(committed(), { mounts: [], groups: [] }), 'an empty plan').toThrow(/empty/);
    const pairwise = committed().observations.find((observation) => observation.pairwise !== null);
    if (pairwise) {
      expect(() => accept(mutate((e) => (e.observations.find(({ mountId }) => mountId === pairwise.mountId)!.pairwise = null)))).toThrow(
        /pairwise/,
      );
    }
  });

  it('decides one verdict per planned mount from the committed ledger', () => {
    const verdicts = interactiveLedgerVerdicts(accept(committed()), PLAN, interactiveLedgerSourceJoins(ROOT, PLAN));
    expect([...verdicts.keys()]).toEqual(PLAN.mounts.map(({ mountId }) => mountId));
    for (const verdict of verdicts.values()) {
      for (const assertion of LEDGER_ASSERTIONS) {
        const measured = verdict.failures[assertion].filter((failure) => !verdict.sealedDefaultDrift.includes(failure));
        expect(measured, `${assertion} ${verdict.id}`).toEqual([]);
      }
      expect(verdict.observed.controls, `${verdict.id} controls`).toBeGreaterThan(0);
      expect(Object.keys(verdict.observed.idleMutations)).toEqual([...IDLE_MOTION_MODES]);
      expect(Object.values(verdict.observed.idleMutations)).toEqual(IDLE_MOTION_MODES.map(() => 0));
    }
    // One planted defect fails that mount alone.
    const target = PLAN.mounts.at(-1)!.mountId;
    const planted = mutate((e) => {
      const observation = e.observations.find(({ mountId }) => mountId === target)!;
      observation.idle[1] = { ...observation.idle[1], mutations: 3, samples: ['planted'] };
      observation.focusOrder.positiveTabindex = 2;
    });
    const failing = [...interactiveLedgerVerdicts(accept(planted), PLAN, interactiveLedgerSourceJoins(ROOT, PLAN)).values()].filter(
      ({ failures }) => failures['VAL-B2-VIZ-008'].length > 0 || failures['VAL-B2-VIZ-016'].length > 0,
    );
    expect(failing.map(({ id }) => id)).toEqual([target]);
    // An idle window the page could not draw through proves nothing about stillness.
    const starved = mutate((e) => {
      const observation = e.observations.find(({ mountId }) => mountId === target)!;
      observation.idle[0] = { ...observation.idle[0], windowMs: IDLE_WINDOW_MS - 1 };
    });
    const short = interactiveLedgerVerdicts(accept(starved), PLAN, interactiveLedgerSourceJoins(ROOT, PLAN)).get(target)!;
    expect(short.failures['VAL-B2-VIZ-008'].join(' ')).toMatch(/drew for only/);
  });

  it('joins a source’s behavioural defaults to the seal through exact approved deltas', () => {
    const sourcePath = 'components/interactive/planted.tsx';
    const sealedText = 'const DEFAULT_ROUND = 4;\nconst initialSpeed = 2;\n';
    const sealedMembers = behavioralDefaultMembers(sourcePath, sealedText);
    expect(sealedMembers.map(({ id }) => id)).toEqual([`default:${sourcePath}:1`, `default:${sourcePath}:2`]);
    const baseline = {
      manifests: {
        'interactive-sources-mounts': buildManifest('interactive-sources-mounts', [{ id: `source:${sourcePath}`, value: { sealed: true } }]),
        'behavioral-defaults': buildManifest(
          'behavioral-defaults',
          ['DEFAULT_ROUND = 4;', 'initialSpeed = 2;'].map((expression, index) => ({
            id: `default:${sourcePath}:${index + 1}`,
            value: { expression },
          })),
        ),
      },
    } as unknown as Pick<BaselineBundle, 'manifests'>;
    expect(baseline.manifests['behavioral-defaults'].members.map(({ hash }) => hash)).toEqual(sealedMembers.map(({ hash }) => hash));

    const unchanged = joinSourceDefaults({ sourcePath, text: sealedText, baseline, deltas: [] });
    expect(unchanged.sealed).toBe(true);
    expect(unchanged.members.map(({ status }) => status)).toEqual(['unchanged', 'unchanged']);

    const changedText = 'const DEFAULT_ROUND = 0;\nconst initialSpeed = 2;\nconst defaultLabel = "Back";\n';
    const drifted = joinSourceDefaults({ sourcePath, text: changedText, baseline, deltas: [] });
    expect(drifted.members.map(({ status, change }) => [status, change])).toEqual([
      ['unapproved', 'changed'],
      ['unchanged', null],
      ['unapproved', 'added'],
    ]);

    const current = new Map(behavioralDefaultMembers(sourcePath, changedText).map(({ id, hash }) => [id, hash]));
    const edge = (memberId: string, oldHash: string, newHash: string): ApprovedDelta =>
      ({ id: `planted-${memberId}`, manifest: 'behavioral-defaults', memberId, oldHash, newHash }) as ApprovedDelta;
    const first = `default:${sourcePath}:1`;
    const third = `default:${sourcePath}:3`;
    const approved = joinSourceDefaults({
      sourcePath,
      text: changedText,
      baseline,
      deltas: [
        edge(first, sealedMembers[0].hash, current.get(first)!),
        edge(third, sha256('missing'), current.get(third)!),
      ],
    });
    expect(approved.members.map(({ status }) => status)).toEqual(['approved', 'unchanged', 'approved']);

    const wrongEdge = joinSourceDefaults({
      sourcePath,
      text: changedText,
      baseline,
      deltas: [edge(first, sealedMembers[0].hash, sha256('planted'))],
    });
    expect(wrongEdge.members[0].status).toBe('unapproved');

    const unsealed = joinSourceDefaults({ sourcePath: 'components/interactive/new.tsx', text: changedText, baseline, deltas: [] });
    expect(unsealed.sealed).toBe(false);
    expect(unsealed.members.every(({ status }) => status === 'new-source')).toBe(true);
  });

  it('hears every filter of the generalist timeline once from its status, and fails a filter left unspoken', () => {
    expect(SPOKEN_TRANSITIONS.map(({ mountId }) => mountId)).toEqual([
      'mount:/manipulation/generalist-policies/:GeneralistReleaseTimeline:1',
    ]);
    const joins = interactiveLedgerSourceJoins(ROOT, PLAN);
    const evidence = accept(committed());
    for (const required of SPOKEN_TRANSITIONS) {
      expect(PLAN.mounts.map(({ mountId }) => mountId)).toContain(required.mountId);
      const observation = evidence.observations.find(({ mountId }) => mountId === required.mountId)!;
      const nameOf = new Map(observation.controls.map(({ index, name }) => [index, name]));
      for (const control of required.controls) expect([...nameOf.values()]).toContain(control);
      const moved = observation.transitions.filter(
        (transition) =>
          required.controls.includes(nameOf.get(transition.control) ?? '') &&
          transition.before.control !== transition.after.control,
      );
      // The toggle in view and the three filters in Adjust more that move.
      expect(moved.map(({ control }) => nameOf.get(control))).toEqual([
        'Downloadable only',
        'Downloadable',
        'Not downloadable',
        'Not disclosed',
      ]);
      for (const transition of moved) {
        const said = transition.announcements.filter(({ text }) => required.says.test(text));
        expect(said, `${nameOf.get(transition.control)} is heard once`).toHaveLength(1);
        expect(said[0].region).toMatch(/role=status/);
        expect(said[0].politeness).toBe('polite');
        expect(duplicateAnnouncements(transition.announcements)).toEqual([]);
      }
      expect(moved[0].announcements.map(({ text }) => text)).toEqual(['4 of 13 shown: downloadable only']);
    }

    const [required] = SPOKEN_TRANSITIONS;
    const failuresOf = (planted: InteractiveLedgerEvidence) =>
      interactiveLedgerVerdicts(accept(planted), PLAN, joins).get(required.mountId)!.failures;
    const at = (e: InteractiveLedgerEvidence) => e.observations.find(({ mountId }) => mountId === required.mountId)!;
    // The status without its live role: the recorder hears nothing from it.
    const silent = failuresOf(
      mutate((e) => {
        for (const transition of at(e).transitions) {
          transition.announcements = transition.announcements.filter(({ text }) => !required.says.test(text));
        }
      }),
    );
    for (const row of ['VAL-B2-VIZ-016', 'VAL-EDU-038'] as const) {
      expect(silent[row].filter((failure) => failure.includes('its result is not spoken'))).toHaveLength(4);
    }
    // A status that says something else, such as the card again, is not the result.
    const elsewhere = failuresOf(
      mutate((e) => {
        for (const transition of at(e).transitions) {
          for (const announcement of transition.announcements) {
            if (required.says.test(announcement.text)) announcement.text = 'Helix Figure Feb 2025';
          }
        }
      }),
    );
    expect(elsewhere['VAL-B2-VIZ-016'].some((failure) => failure.includes('live regions said "Helix Figure Feb 2025"'))).toBe(true);
    // No filter transition that moved its state: nothing proves the result is heard.
    const unmoved = failuresOf(
      mutate((e) => {
        for (const transition of at(e).transitions) transition.after.control = transition.before.control;
      }),
    );
    expect(unmoved['VAL-EDU-038'].some((failure) => failure.includes('was recorded, so its result was never heard'))).toBe(true);
  });

  it('counts an action announced twice, and not a run told pause by pause', () => {
    expect(duplicateAnnouncements([{ region: 'a', text: 'Speed 2 m/s' }, { region: 'b', text: 'speed 2 m/s.' }])).toHaveLength(1);
    expect(duplicateAnnouncements([{ region: 'a', text: 'x -0.23' }, { region: 'b', text: '0.23 left, 4 steps' }])).toHaveLength(1);
    expect(duplicateAnnouncements([{ region: 'a', text: 'Settling' }, { region: 'a', text: 'Balanced' }])).toEqual([]);
    expect(duplicateAnnouncements([{ region: 'a', text: 'Round 2 of 5' }, { region: 'b', text: 'Three robots moved up' }])).toEqual([]);
  });
});
