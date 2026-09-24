import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { planPacket } from '../helpers/audit-plan-history';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest,
  parseCompoundPlans, parseLedger,
} from '../../lib/audit-ledger';
import { committedJson } from '../helpers/editorial-current-context';

const text = readFileSync('content/frontier/dexterity.mdx', 'utf8');
const citations = readFileSync('data/citations.ts', 'utf8');
const ledger = readFileSync('audit/frontier.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const records = (catalog = plans) => parseLedger('audit/frontier.md', ledger, ids, {
  compoundPlans: catalog,
}).find(s => s.slug === 'dexterity')!.claimRecords;
const plan = (id: string) => {
  const selected = plans.filter(p => p.id === id);
  expect(selected).toHaveLength(1);
  return selected[0];
};
const holson8Plan = () => plan('dexterity-holson-original8-20260915');
const goBigPlan = () => plan('dexterity-gobig-navigation-12-20260915');
const figure02Plan = () => plan('dexterity-figure02-dof-23-20260915');
const helix02Plan = () => plan('dexterity-helix02-tasks-25-20260915');

describe('Holson dexterity original8 correction', () => {
  test('completes exactly native original8 with a reviewed C, distinct from completed original10', () => {
    expect(records()).toHaveLength(30);
    expect(records()[7].verdict).toBe('C');
    expect(records()[7].evidenceFailures).toEqual([]);
    const p = holson8Plan();
    expect(p.rowOrdinal).toBe(8);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(records()[7]));
    expect(records()[9].verdict).toBe('C');
    expect(records()[9].evidenceFailures).toEqual([]);
  });

  test('keeps dated commentary, exceptions, operator scope, video-guessed precision and counterexample', () => {
    const p = holson8Plan();
    expect(p.parts.map(part => part.id)).toEqual([
      'dated-author-account', 'setups-and-exceptions', 'human-wrist-feedback',
      'finger-control-not-hardware', 'humanlike-touch-to-puppeteer',
      'video-guessed-task-precision', 'likely-teleoperation-not-model',
      'author-described-subcm-exception',
    ]);
    expect(p.evidence).toHaveLength(8);
    for (const e of p.evidence) {
      expect(e.citationId).toBe('holson-olympics-2025');
      expect(e.sourceUrl).toBe('https://generalrobots.substack.com/p/benjies-humanoid-olympic-games');
    }
    const wrist = p.evidence.find(x => x.partId === 'human-wrist-feedback')!;
    expect(wrist.supportingPassage).toContain("we don’t yet have good standard ways of getting force information to the human teleoperator");
    const fingers = p.evidence.find(x => x.partId === 'finger-control-not-hardware')!;
    expect(fingers.supportingPassage).toContain('more finesse than just open/close');
    const touch = p.evidence.find(x => x.partId === 'humanlike-touch-to-puppeteer')!;
    expect(touch.supportingPassage).toContain('usable by a human puppeteer is not currently possible');
    const guess = p.evidence.find(x => x.partId === 'video-guessed-task-precision')!;
    expect(guess.supportingPassage).toContain('Guessing based on videos I think we’ve got about 1-3 cm precision for tasks.');
    const caveat = p.evidence.find(x => x.partId === 'likely-teleoperation-not-model')!;
    expect(caveat.supportingPassage).toContain('likely more a teleoperation precision limitation than a model limitation');
  });

  test('article span stays the exact original10-shared replacement without a second write', () => {
    expect(text).toContain(
      'In his September 8, 2025 post, Benjie Holson described limitations of the learning-from-demonstration setups he was seeing, explicitly calling them a general trend with exceptions.',
    );
    expect(text).toContain('was a guess from videos; he said it was likely more a teleoperation limitation than a model limitation and pointed to a video he described as showing sub-centimeter tasks <Cite id="holson-olympics-2025" />.');
    expect(records()[7].note).toContain('original8');
    expect(records()[7].note).toContain('remains unverified');
  });
});

describe('Figure Go-Big dexterity original12 correction', () => {
  test('completes exactly native original12 with a reviewed C', () => {
    expect(records()[11].verdict).toBe('C');
    expect(records()[11].evidenceFailures).toEqual([]);
    const p = goBigPlan();
    expect(p.rowOrdinal).toBe(12);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(records()[11]));
  });

  test('keeps navigation scope, SE(2) mapping, Brookfield portfolio bound and begun collection', () => {
    const p = goBigPlan();
    expect(p.parts.map(part => part.id)).toEqual([
      'd12-human-video', 'd12-no-robot-demonstrations', 'd12-brookfield-access',
      'd12-residential-units', 'd12-zero-shot-navigation', 'd12-coupled-full-scale',
    ]);
    expect(p.evidence).toHaveLength(6);
    for (const e of p.evidence) {
      expect(e.citationId).toBe('figure-go-big-2025');
      expect(e.sourceUrl).toBe('https://www.figure.ai/news/project-go-big');
    }
    const nav = p.evidence.find(x => x.partId === 'd12-zero-shot-navigation')!;
    expect(nav.supportingPassage).toContain('low-level SE(2) velocity commands');
    expect(nav.supportingPassage).toContain('To our knowledge');
    const units = p.evidence.find(x => x.partId === 'd12-residential-units')!;
    expect(units.supportingPassage).toContain('over 100,000 diverse residential units');
    const access = p.evidence.find(x => x.partId === 'd12-brookfield-access')!;
    expect(access.supportingPassage).toContain('already begun data collection efforts in Brookfield environments');
  });

  test('article span narrows the result to navigation and cuts the coupled full-scale lead', () => {
    expect(text).not.toContain('Two of the best-funded humanoid programs are running that experiment at full scale.');
    expect(text).toContain("Figure's September 2025 Project Go-Big announcement describes a pretraining data-collection initiative rather than a general-dexterity result");
    expect(text).toContain('its initial human-video result is navigation, with Helix trained on 100% egocentric human video, no robot demonstrations for that approach, mapping images and language to low-level SE(2) velocity commands');
    expect(text).toContain("a transfer Figure calls zero-shot and, \"to our knowledge\", a first");
    expect(text).toContain("the announcement's more than 100,000 residential units describe Brookfield's portfolio, not homes or trajectories collected");
    expect(text).not.toContain('trains its Helix model on 100% egocentric human video with no robot demonstrations at all');
  });

  test('registry comment narrows the same overstatement', () => {
    const idx = citations.indexOf("'figure-go-big-2025'");
    const block = citations.slice(citations.lastIndexOf('}', idx - 1), idx + 200);
    expect(block).toContain('Go-Big human-video result is navigation');
    expect(block).toContain('portfolio bound');
    expect(citations).not.toContain('Helix trained on 100% egocentric human video with no robot demonstrations;');
  });
});

describe('Figure 02 dexterity original23 correction', () => {
  test('completes exactly native original23 with a reviewed C', () => {
    expect(records()[22].verdict).toBe('C');
    expect(records()[22].evidenceFailures).toEqual([]);
    const p = figure02Plan();
    expect(p.rowOrdinal).toBe(23);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(records()[22]));
  });

  test('keeps plural hand wording, generation labels, ambiguity disclosure and vendor provenance', () => {
    const p = figure02Plan();
    expect(p.parts.map(part => part.id)).toEqual([
      'd23-sixteen-dof', 'd23-generation', 'd23-hand-and-actuation',
      'd23-capability-provenance',
    ]);
    expect(p.evidence).toHaveLength(4);
    for (const e of p.evidence) {
      expect(e.citationId).toBe('figure-02-2024');
      expect(e.sourceUrl).toBe('https://www.prnewswire.com/news-releases/figure-unveils-figure-02-its-second-generation-humanoid-setting-new-standards-in-ai-and-robotics-302214889.html');
    }
    const dof = p.evidence.find(x => x.partId === 'd23-sixteen-dof')!;
    expect(dof.supportingPassage).toContain('**4th generation hands**: the latest human-scale hands are equipped with 16 degrees of freedom');
    const gen = p.evidence.find(x => x.partId === 'd23-generation')!;
    expect(gen.supportingPassage).toContain('unveils its second-generation humanoid, Figure 02');
    const issuer = p.evidence.find(x => x.partId === 'd23-capability-provenance')!;
    expect(issuer.supportingPassage).toContain('SOURCE Figure AI Inc.');
  });

  test('article span quotes the release and discloses the per-hand/combined limit', () => {
    expect(text).toContain('its August 6, 2024 release for Figure 02, Figure\'s own announcement hosted by PRNewswire, describes the second-generation robot\'s "4th generation hands" as "equipped with 16 degrees of freedom" without saying whether that count is per hand or combined, or giving an actuator count');
    expect(text).not.toContain('16 degrees of freedom on the Figure 02 hand');
  });

  test('registry comment discloses the same ambiguity', () => {
    const idx = citations.indexOf("'figure-02-2024'");
    const block = citations.slice(citations.lastIndexOf('}', idx - 1), idx + 200);
    expect(block).toContain('per-hand versus combined');
    expect(block).toContain('Figure AI Inc.');
  });
});

describe('Helix 02 dexterity original25 correction', () => {
  test('completes exactly native original25 with a reviewed C', () => {
    expect(records()[24].verdict).toBe('C');
    expect(records()[24].evidenceFailures).toEqual([]);
    const p = helix02Plan();
    expect(p.rowOrdinal).toBe(25);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(records()[24]));
  });

  test('keeps four task titles, autonomy wording, task-value limit and no-ablation limit', () => {
    const p = helix02Plan();
    expect(p.parts.map(part => part.id)).toEqual([
      'd25-version-sensors', 'd25-prior-reach', 'd25-protocol-limits',
      'd25-cap', 'd25-pill', 'd25-syringe', 'd25-metal',
    ]);
    expect(p.evidence).toHaveLength(7);
    for (const e of p.evidence) {
      expect(e.citationId).toBe('helix-02-2026');
      expect(e.sourceUrl).toBe('https://www.figure.ai/news/helix-02');
    }
    const reach = p.evidence.find(x => x.partId === 'd25-prior-reach')!;
    expect(reach.supportingPassage).toContain('previously out of reach');
    const protocol = p.evidence.find(x => x.partId === 'd25-protocol-limits')!;
    expect(protocol.supportingPassage).toContain('All videos shown below are fully autonomous, not teleoperated');
    const syringe = p.evidence.find(x => x.partId === 'd25-syringe')!;
    expect(syringe.supportingPassage).toContain('Push exactly 5 ml from a syringe');
    const metal = p.evidence.find(x => x.partId === 'd25-metal')!;
    expect(metal.supportingPassage).toContain('BotQ manufacturing facility');
  });

  test('article span attributes out-of-reach to Figure and titles the syringe task', () => {
    expect(text).toContain("Figure says Helix 02, using Figure 03's fingertip sensors and palm cameras, performs four tasks it describes as manipulation previously out of reach for its stack, in videos it calls fully autonomous rather than teleoperated");
    expect(text).toContain('a task titled "Push exactly 5 ml from a syringe"');
    expect(text).toContain('The announcement publishes no task-level success rates, volume calibration, or sensor-ablation results');
    expect(text).not.toContain('dispensing exactly 5 ml from a syringe');
    expect(text).not.toContain('previously out of reach for its stack: unscrewing');
  });

  test('the per-task training sentence remains untouched out-of-scope debt', () => {
    expect(text).toContain('Each is a task or a task family with its own training run.');
  });
});

describe('reviewed plans and adjudications are internally consistent', () => {
  test('every plan review digest matches the library recomputation', () => {
    for (const p of [holson8Plan(), goBigPlan(), figure02Plan(), helix02Plan()]) {
      expect(p.planReview).not.toBeNull();
      expect(p.planReview!.planDigest).toBe(compoundPlanDigest(p));
      expect(p.adjudications.map(a => a.partId)).toEqual(p.parts.map(part => part.id));
      for (const a of p.adjudications) {
        expect(a.outcome).toBe('supported');
        expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      }
    }
  });

  test('prior dexterity plans survive unchanged and the catalog grows by exactly four', () => {
    const historical = committedJson<typeof plans>(
      'ee95d0a625762fd4e6379196bf7386cd0d53618b', 'audit/compound-evidence.json',
    );
    expect(historical).toHaveLength(475);
    for (const id of [
      'dexterity-brooks-2-source-20260914', 'dexterity-figure15-source-20260914',
      'dexterity-holson-pipeline-source-20260915', 'dexterity-tactile-outlook-source-20260915',
      'dexterity-keyring-rules-source-20260915', 'dexterity-brooks-ernst-1-source-20260915',
      'dexterity-brooks-eweek-4-source-20260915', 'dexterity-brooks-forecast-7-source-20260915',
    ]) {
      expect(plans.find(p => p.id === id)).toEqual(historical.find(p => p.id === id));
    }
    const packetIds = [
      'dexterity-holson-original8-20260915',
      'dexterity-gobig-navigation-12-20260915',
      'dexterity-figure02-dof-23-20260915',
      'dexterity-helix02-tasks-25-20260915',
    ];
    expect(planPacket(plans, packetIds).map(p => p.id)).toEqual(packetIds);
    const checkpointDexterity = historical.filter(p => p.id.startsWith('dexterity-'));
    const checkpointIds = new Set(checkpointDexterity.map(p => p.id));
    expect(plans.filter(p => checkpointIds.has(p.id))).toEqual(checkpointDexterity);
  });
});
