import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  READER_WIDTHS, REGISTRY_PATH, recordPath, recordProblems, screenshotPath, sourceDigest,
  type ReaderRecord, type RegistryEntry,
} from '../../lib/reader-first';
import {
  RUBRIC_PATH, countedTerms, exemptionFor, loadRubric, readerVerdict, reviewerBrief, rubricProblems, type Rubric,
} from '../../lib/reader-first-rubric';

const root = resolve(import.meta.dirname, '../..');
const committed = loadRubric(root);

const scratchRoots: string[] = [];
afterEach(() => {
  for (const tmp of scratchRoots.splice(0)) rmSync(tmp, { recursive: true, force: true });
});

function put(base: string, path: string, text: string) {
  mkdirSync(dirname(join(base, path)), { recursive: true });
  writeFileSync(join(base, path), text);
}

// A planted figure on /credits/, so the check's export scan finds its frame.
const ENTRY: RegistryEntry = {
  id: 'fixture--planted-figure',
  route: '/credits/',
  mount: 'mount:/credits/:PlantedFigure:1',
  figure: 'planted-figure',
  audit: null,
  sources: ['components/planted-figure.tsx'],
  takeaway: 'A planted figure shows one planted point.',
};
const NAME = `${ENTRY.route} [${ENTRY.figure}]`;

type Review = { unclearTerms: string[]; samePoint?: 'yes' | 'no'; verdict?: 'pass' | 'fail' };

/** A scratch tree holding the registry, the committed rubric, the planted
 * source, its screenshots and, unless `review` is null, its record. The
 * verdict is the one the record script would write, unless overridden. */
function plantedTree(review: Review | null): string {
  const tmp = mkdtempSync(join(tmpdir(), 'reader-first-rubric-test-'));
  scratchRoots.push(tmp);
  put(tmp, REGISTRY_PATH, JSON.stringify({ schemaVersion: 'reader-first-registry-v1', figures: [ENTRY] }));
  cpSync(join(root, RUBRIC_PATH), join(tmp, RUBRIC_PATH));
  put(tmp, ENTRY.sources[0], 'export const planted = 1;\n');
  for (const width of READER_WIDTHS) put(tmp, screenshotPath(ENTRY.id, width), 'planted screenshot');
  put(tmp, 'out/credits/index.html', `<main><figure data-figure-frame="${ENTRY.figure}"></figure></main>`);
  if (review) {
    const rubric = loadRubric(tmp);
    const samePoint = review.samePoint ?? 'yes';
    const record: ReaderRecord = {
      schemaVersion: 'reader-first-record-v1',
      route: ENTRY.route,
      mount: ENTRY.mount,
      screenshots: { 1280: screenshotPath(ENTRY.id, 1280), 375: screenshotPath(ENTRY.id, 375) },
      takeaway: ENTRY.takeaway,
      sentence: 'The figure shows one planted point.',
      unclearTerms: review.unclearTerms,
      samePoint,
      reason: 'Same subject and same point.',
      verdict: review.verdict ?? readerVerdict(rubric.rubric, { samePoint, unclearTerms: review.unclearTerms }),
      screenshotCommit: 'abcdef1',
      date: '2026-10-12',
      reviewerSession: 'reader-session-planted',
      sourceDigest: sourceDigest(tmp, ENTRY.sources),
      rubricDigest: rubric.digest,
    };
    put(tmp, recordPath(ENTRY.id), `${JSON.stringify(record, null, 2)}\n`);
  }
  return tmp;
}

const problemsIn = (tmp: string) => recordProblems(tmp, ENTRY, loadRubric(tmp));

describe('the committed reader-test rubric', () => {
  it('is well formed', () => {
    expect(rubricProblems(committed.rubric)).toEqual([]);
  });

  it('gives reviewers the fixed listing rule', () => {
    expect(committed.rubric.reviewer.listRule).toBe(
      'List a term only if a curious non-engineer could not guess it from the frame.');
  });

  it('keeps the definition exemptions and adds the clarification', () => {
    const byOrigin = (origin: string) => committed.rubric.exemptions
      .filter((exemption) => exemption.origin === origin).map((exemption) => exemption.id);
    expect(byOrigin('definition')).toEqual(['kicker', 'status-label', 'external-credit']);
    expect(byOrigin('clarification')).toEqual(
      ['fold-names', 'playback-controls', 'counters', 'highlight-mark', 'legend-keyed-marks']);
  });

  it('exempts only words that a file it names renders', () => {
    const unrendered = committed.rubric.exemptions.flatMap((exemption) => (exemption.words ?? [])
      .filter((word) => !(exemption.renderedBy ?? [])
        .some((file) => readFileSync(join(root, file), 'utf8').includes(word)))
      .map((word) => `${exemption.id}: ${word}`));
    expect(unrendered).toEqual([]);
  });

  it('flags a malformed rubric', () => {
    const broken = structuredClone(committed.rubric) as Rubric;
    broken.reviewer.listRule = ' ';
    broken.exemptions.push({ ...broken.exemptions[0] });
    expect(rubricProblems(broken)).toEqual([
      `${RUBRIC_PATH}: no reviewer line "listRule"`,
      `${RUBRIC_PATH}: exemption fold-names is listed twice`,
    ]);
  });
});

describe('which listed terms the rubric exempts', () => {
  const rubric = committed.rubric;

  it.each([
    ['Adjust more', 'fold-names'],
    ["the 'Adjust more' control", 'fold-names'],
    ['\u201CAdjust more\u201D fold: what it opens', 'fold-names'],
    ['How this was made: unclear what it covers', 'fold-names'],
    ['Play button: I could not tell what would happen if I pressed it', 'playback-controls'],
    ['Play the run', 'playback-controls'],
    ['Pause', 'playback-controls'],
    ['Step back and Step forward buttons', 'playback-controls'],
    ['Next round / Reset buttons: I guessed they move through the rounds', 'playback-controls'],
    ['Round 1 of 3: fine, but I was unsure whether the text panels change', 'counters'],
    ['Step 2/5', 'counters'],
  ])('%s is exempt (%s)', (term, id) => {
    expect(exemptionFor(rubric, term)).toBe(id);
  });

  it.each([
    'occupancy grid',
    'Trot: I know it from horses',
    'Give it a push (I could not tell who or what does the pushing)',
    'Surprise for the robot buttons: I guessed the buttons choose the surprise',
    'Play the 2 seconds',
    'Reset the arm',
    'Replay',
    'Adjusting more',
    "Round 2 'never walks': unclear what goes wrong in round 2",
    'Round 2 and Round 3 robots look almost the same',
    'Adjust more and occupancy grid',
    'the hatched line at the bottom',
    'green arrow and green text: unclear what the colour means',
    'purple dots: I needed the key to learn they are joint motors',
    '',
    ': no words',
  ])('%s still counts', (term) => {
    expect(exemptionFor(rubric, term)).toBeNull();
  });

  it('counts what is left and passes only a matched point with nothing left', () => {
    const terms = ['Adjust more', 'joint motor: I guessed the elbows', ' ', 'Round 1 of 3'];
    expect(countedTerms(rubric, terms)).toEqual(['joint motor: I guessed the elbows']);
    expect(readerVerdict(rubric, { samePoint: 'yes', unclearTerms: ['Adjust more', 'Round 1 of 3'] })).toBe('pass');
    expect(readerVerdict(rubric, { samePoint: 'yes', unclearTerms: terms })).toBe('fail');
    expect(readerVerdict(rubric, { samePoint: 'no', unclearTerms: [] })).toBe('fail');
  });
});

describe('planted reader-test records', () => {
  it('passes a record whose only listed term is an exempt word', () => {
    const tmp = plantedTree({ unclearTerms: ['Adjust more'] });
    expect(JSON.parse(readFileSync(join(tmp, recordPath(ENTRY.id)), 'utf8')).verdict).toBe('pass');
    expect(problemsIn(tmp)).toEqual([]);
  });

  it('passes a record that lists only shared fold names, controls and counters', () => {
    const tmp = plantedTree({ unclearTerms: [
      "the 'Adjust more' control",
      'How this was made: unclear whether it explains the drawing',
      'Next round / Reset buttons: I guessed they move through the rounds',
      'Round 1 of 3: fine',
    ] });
    expect(problemsIn(tmp)).toEqual([]);
  });

  it('fails a record that lists a domain term', () => {
    const tmp = plantedTree({ unclearTerms: ['occupancy grid: a technical name'] });
    expect(problemsIn(tmp)).toEqual([
      `${NAME}: reader-test verdict is fail`,
      `${NAME}: reader-test record does not support a pass (1 counted unclear term)`,
    ]);
  });

  it('fails a record that lists a domain term beside an exempt word, even if it claims a pass', () => {
    const tmp = plantedTree({ unclearTerms: ['Adjust more', 'occupancy grid'], verdict: 'pass' });
    expect(problemsIn(tmp)).toEqual([`${NAME}: reader-test record does not support a pass (1 counted unclear term)`]);
  });

  it('fails a record that lists a label written for the figure or an unlabelled mark', () => {
    const tmp = plantedTree({ unclearTerms: ['Give it a push: who pushes?', 'the hatched line at the bottom'] });
    expect(problemsIn(tmp)).toContain(`${NAME}: reader-test record does not support a pass (2 counted unclear terms)`);
  });

  it('fails a record that missed the point', () => {
    const tmp = plantedTree({ unclearTerms: [], samePoint: 'no' });
    expect(problemsIn(tmp)).toEqual([
      `${NAME}: reader-test verdict is fail`,
      `${NAME}: reader-test record does not support a pass (missed point)`,
    ]);
  });

  it('fails a record that missed the point, even if it claims a pass', () => {
    const tmp = plantedTree({ unclearTerms: ['Adjust more'], samePoint: 'no', verdict: 'pass' });
    expect(problemsIn(tmp)).toEqual([`${NAME}: reader-test record does not support a pass (missed point)`]);
  });

  it('fails a figure with no record', () => {
    const tmp = plantedTree(null);
    expect(problemsIn(tmp)).toEqual([`${NAME}: no reader-test record at ${recordPath(ENTRY.id)}`]);
  });

  it('fails a record made before the fixed rubric', () => {
    const tmp = plantedTree({ unclearTerms: [] });
    const file = join(tmp, recordPath(ENTRY.id));
    const record = JSON.parse(readFileSync(file, 'utf8'));
    delete record.rubricDigest;
    writeFileSync(file, JSON.stringify(record));
    expect(problemsIn(tmp)).toEqual([`${NAME}: reviewed before the fixed reader-test rubric (${RUBRIC_PATH})`]);
  });

  it('counts an exempt word again once its exemption is removed, and asks for a new review', () => {
    const tmp = plantedTree({ unclearTerms: ['Adjust more'] });
    const rubric = loadRubric(tmp).rubric;
    rubric.exemptions = rubric.exemptions.filter((exemption) => exemption.id !== 'fold-names');
    put(tmp, RUBRIC_PATH, `${JSON.stringify(rubric, null, 2)}\n`);
    const problems = problemsIn(tmp);
    expect(problems).toContain(`${NAME}: reader-test record does not support a pass (1 counted unclear term)`);
    expect(problems.filter((problem) => problem.startsWith(`${NAME}: reviewed under another reader-test rubric`)))
      .toHaveLength(1);
  });
});

describe('check:reader-first reads the rubric', () => {
  const check = (tmp: string) => {
    const run = spawnSync(process.execPath,
      ['scripts/check-reader-first.ts', '--root', tmp, '--out', join(tmp, 'out')], { cwd: root, encoding: 'utf8' });
    return `${run.stdout}\n${run.stderr}`.split('\n').filter((line) => line.startsWith(`reader-first: ${NAME}`));
  };

  it('reports nothing for the figure when its only listed term is exempt', () => {
    expect(check(plantedTree({ unclearTerms: ['Adjust more'] }))).toEqual([]);
  }, 60_000);

  it('names the figure when a domain term is listed', () => {
    expect(check(plantedTree({ unclearTerms: ['occupancy grid'], verdict: 'pass' }))).toEqual([
      `reader-first: ${NAME}: reader-test record does not support a pass (1 counted unclear term)`,
    ]);
  }, 60_000);
});

describe('the reviewer brief', () => {
  const figures = [
    { id: 'manipulation--action-chunking--chunk-size-curve', takeaway: 'Planning ahead raised success.',
      screenshots: { 1280: 'a.1280.png', 375: 'a.375.png' } },
    { id: 'classical--control--pendulum-controller', takeaway: 'The motor must push back harder than gravity.',
      screenshots: { 1280: 'b.1280.png', 375: 'b.375.png' } },
  ];
  const brief = reviewerBrief(committed, figures);

  it('gives every reviewer the same instructions and the whole exemption list', () => {
    const before = ['role', 'look', 'sentence', 'list', 'listRule', 'listFormat', 'exemptionsIntro', 'stillList', 'order',
      'answerBefore'] as const;
    for (const key of before) expect(brief.before).toContain(committed.rubric.reviewer[key]);
    for (const exemption of committed.rubric.exemptions) expect(brief.before).toContain(`- ${exemption.reviewer}`);
    expect(brief.before).toContain('- F1');
    expect(brief.before).toContain('- F2');
  });

  it('shows no takeaway, id or file name before the answers', () => {
    for (const figure of figures) {
      expect(brief.before).not.toContain(figure.takeaway);
      expect(brief.before).not.toContain(figure.id);
      expect(brief.before).not.toContain(figure.screenshots[1280]);
    }
  });

  it('shows the takeaways afterwards and keeps the key for the operator', () => {
    expect(brief.after).toContain(`- F1: ${figures[0].takeaway}`);
    expect(brief.after).toContain(`- F2: ${figures[1].takeaway}`);
    for (const key of ['takeawayIntro', 'samePoint', 'answerAfter'] as const) {
      expect(brief.after).toContain(committed.rubric.reviewer[key]);
    }
    expect(brief.key).toEqual({
      rubricDigest: committed.digest,
      figures: figures.map(({ id, screenshots }, index) => ({ label: `F${index + 1}`, id, screenshots })),
    });
  });
});
