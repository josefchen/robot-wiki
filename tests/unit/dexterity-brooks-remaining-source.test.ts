import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  compoundPartDigest, compoundPlanDigest, originalClaimDigest,
  parseCompoundPlans, parseLedger,
} from '../../lib/audit-ledger';

const text = readFileSync('content/frontier/dexterity.mdx', 'utf8');
const ledger = readFileSync('audit/frontier.md', 'utf8');
const plans = parseCompoundPlans(JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')));
const ids = new Set(CITATIONS.map(c => c.id));
const essayURL = 'https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/';
const records = (catalog = plans) => parseLedger('audit/frontier.md', ledger, ids, {
  compoundPlans: catalog,
}).find(s => s.slug === 'dexterity')!.claimRecords;
const plan = (id: string) => {
  const selected = plans.filter(p => p.id === id);
  expect(selected).toHaveLength(1);
  return selected[0];
};
const ernstPlan = () => plan('dexterity-brooks-ernst-1-source-20260915');
const eweekPlan = () => plan('dexterity-brooks-eweek-4-source-20260915');
const forecastPlan = () => plan('dexterity-brooks-forecast-7-source-20260915');

describe('Brooks dexterity original1 (Ernst) correction', () => {
  test('completes exactly native original1 with a reviewed C, not its historical V', () => {
    expect(records()).toHaveLength(30);
    expect(records()[0].verdict).toBe('C');
    expect(records()[0].evidenceFailures).toEqual([]);
    const p = ernstPlan();
    expect(p.rowOrdinal).toBe(1);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(records()[0]));
  });

  test('scopes the 1961 Ernst account to Brooks with thesis, TX-0 and picking/stacking', () => {
    const p = ernstPlan();
    expect(p.parts.map(part => part.id)).toEqual([
      'ernst-date-thesis', 'ernst-arm-hand-tx0', 'ernst-block-task',
    ]);
    expect(p.evidence).toHaveLength(3);
    for (const e of p.evidence) {
      expect(e.citationId).toBe('brooks-dexterity-2025');
      expect(e.sourceUrl).toBe(essayURL);
      expect(e.supportingPassage).toContain('By 1961 Heinrich Ernst had produced a');
      expect(e.supportingPassage).toContain('connected to the TX-0 computer at MIT');
      expect(e.supportingPassage).toContain('picking up blocks and stacking them');
    }
  });

  test('article span attributes the account to Brooks and cuts the universal-researcher inference', () => {
    expect(text).toContain(
      'Rodney Brooks opens his dexterity essay with Heinrich Ernst\'s PhD work: by 1961, he writes, Ernst had connected a computer-controlled arm and hand to MIT\'s TX-0 and had it picking up and stacking blocks <Cite id="brooks-dexterity-2025" />.',
    );
    expect(text).not.toContain('manipulation has been hard for every researcher since');
    expect(text).not.toContain('Robot manipulation is as old as artificial intelligence itself.');
  });
});

describe('Brooks dexterity original4 (eWeek report) correction', () => {
  test('completes exactly native original4 with a reviewed C', () => {
    expect(records()[3].verdict).toBe('C');
    expect(records()[3].evidenceFailures).toEqual([]);
    const p = eweekPlan();
    expect(p.rowOrdinal).toBe(4);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(records()[3]));
  });

  test('keeps the report hierarchy, moving-toward transition, rig count, task examples and mimic purpose', () => {
    const p = eweekPlan();
    expect(p.parts.map(part => part.id)).toEqual([
      'report-hierarchy', 'reported-transition', 'reported-rig-count',
      'reported-task-examples', 'reported-training-purpose',
    ]);
    expect(p.evidence).toHaveLength(5);
    const transition = p.evidence.find(x => x.partId === 'reported-transition')!;
    expect(transition.supportingPassage).toContain('Tesla is moving toward a vision-only approach.');
    const rig = p.evidence.find(x => x.partId === 'reported-rig-count')!;
    expect(rig.supportingPassage).toContain('helmets and backpacks with five in-house cameras');
    const hierarchy = p.evidence.find(x => x.partId === 'report-hierarchy')!;
    expect(hierarchy.supportingPassage).toContain('press story from eWeek');
  });

  test('article span reports the eWeek text as reproduced by Brooks, not Tesla specifications', () => {
    expect(text).toContain('Brooks reproduces an eWeek report that describes Tesla as moving Optimus training toward a "vision-only approach" instead of motion capture suits and teleoperation.');
    expect(text).toContain('record tasks such as folding a t-shirt or picking up an object, and use the videos to train Optimus to mimic those actions <Cite id="brooks-dexterity-2025" />.');
    expect(text).toContain('This is the report as reproduced in Brooks\'s essay, not a verified account of Tesla\'s complete training pipeline or evidence of tested dexterity.');
    expect(text).not.toContain('Tesla has shifted Optimus training to a vision-only approach');
  });
});

describe('Brooks dexterity original7 (forecast) historical-ledger correction', () => {
  test('completes exactly native original7 with a reviewed C and zero article endpoints', () => {
    expect(records()[6].verdict).toBe('C');
    expect(records()[6].evidenceFailures).toEqual([]);
    const p = forecastPlan();
    expect(p.rowOrdinal).toBe(7);
    expect(p.originalCellsDigest).toBe(originalClaimDigest(records()[6]));
  });

  test('keeps plug-compatible economics, opinion scope, Baxter/Sawyer and specialized-future countercontext', () => {
    const p = forecastPlan();
    expect(p.parts.map(part => part.id)).toEqual([
      'forecast-target-economics', 'forecast-opinion-decades',
      'counter-past-deployment', 'counter-future-forms',
    ]);
    expect(p.evidence).toHaveLength(4);
    const econ = p.evidence.find(x => x.partId === 'forecast-target-economics')!;
    expect(econ.supportingPassage).toContain('\u201cplug compatible\u201d with humans');
    expect(econ.supportingPassage).toContain('at lower prices and just as well');
    const opinion = p.evidence.find(x => x.partId === 'forecast-opinion-decades')!;
    expect(opinion.supportingPassage).toContain('In my opinion, believing that this will happen any time within decades is pure fantasy thinking');
    const past = p.evidence.find(x => x.partId === 'counter-past-deployment')!;
    expect(past.supportingPassage).toContain('thousands of two models of humanoids, Baxter and Sawyer');
    const future = p.evidence.find(x => x.partId === 'counter-future-forms')!;
    expect(future.supportingPassage).toContain('That is the next fifteen years for you.');
  });

  test('no forecast paragraph exists in the article; the completed touch conclusion is untouched', () => {
    expect(text).not.toContain('within decades');
    expect(text).not.toContain('pure fantasy thinking');
    expect(text).toContain('"It looks like humanoid robots will need a sense of touch, and a level of touch sensing that no one has yet built in the lab"');
  });
});

describe('reviewed plans and adjudications are internally consistent', () => {
  test('every plan review digest matches the library recomputation', () => {
    for (const p of [ernstPlan(), eweekPlan(), forecastPlan()]) {
      expect(p.planReview).not.toBeNull();
      expect(p.planReview!.planDigest).toBe(compoundPlanDigest(p));
      expect(p.adjudications.map(a => a.partId)).toEqual(p.parts.map(part => part.id));
      for (const a of p.adjudications) {
        expect(a.outcome).toBe('supported');
        expect(a.evidenceDigest).toBe(compoundPartDigest(p, a.partId));
      }
    }
  });

  test('prior Brooks/Holson/Figure dexterity plans survive unchanged', () => {
    for (const id of [
      'dexterity-brooks-2-source-20260914', 'dexterity-brooks-3-source-20260914',
      'dexterity-brooks-5-source-20260914', 'dexterity-brooks-6-source-20260914',
      'dexterity-figure15-source-20260914', 'dexterity-holson-pipeline-source-20260915',
      'dexterity-tactile-outlook-source-20260915', 'dexterity-keyring-rules-source-20260915',
    ]) {
      expect(plans.some(p => p.id === id)).toBe(true);
    }
    expect(plans).toHaveLength(475);
  });
});
