import { describe, expect, it } from 'vitest';
import { NOW_ARGUMENTS, NOW_DEBATES_AS_OF, OPEN_QUESTIONS } from '@/data/now-debates';
import {
  NONE_PUBLISHED,
  QUOTE_MAX_LENGTH,
  WHOLE_POST_MAX_LENGTH,
  evidenceSchema,
  hasEllipsis,
  isDashFree,
  isOneSentence,
  nowArgumentSchema,
  nowDebatesSchema,
  openQuestionSchema,
  positionSchema,
  quoteSchema,
  siteCopySchema,
  terminalMarks,
  wholePostQuoteSchema,
} from '@/data/schemas/now-debate';
import {
  NONE_PUBLISHED as LIB_NONE_PUBLISHED,
  allPositions,
  argumentForQuestion,
  argumentsByRank,
  debateCounts,
  isSourced,
  positionsBySide,
  questionForArgument,
  questionsByRank,
  siteCopy,
  unlinkedQuestions,
} from '@/lib/now-debates';
import { DASH_PATTERN, findBannedVocabulary } from '@/lib/prose-lint';

const debates = { asOf: NOW_DEBATES_AS_OF, questions: OPEN_QUESTIONS, arguments: NOW_ARGUMENTS };
const positions = allPositions();
const sourcedEvidence = OPEN_QUESTIONS.flatMap((question) =>
  [question.evidenceFor, question.evidenceAgainst].filter(isSourced),
);
const copy = siteCopy();

/** The calendar date X shows a reader in US Eastern time for a UTC timestamp. */
function easternDate(utc: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(utc));
  const part = (type: string) => parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function argument(id: string) {
  const row = NOW_ARGUMENTS.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`no argument ${id}`);
  return row;
}

function question(id: string) {
  const row = OPEN_QUESTIONS.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`no question ${id}`);
  return row;
}

function urls(): string[] {
  return [
    ...sourcedEvidence.map((evidence) => evidence.sourceUrl),
    ...positions.map((position) => position.postUrl),
  ];
}

describe('now debates: schema', () => {
  it('parses every record, as of 14 Nov 2026', () => {
    expect(() => nowDebatesSchema.parse(debates)).not.toThrow();
    for (const row of OPEN_QUESTIONS) expect(openQuestionSchema.safeParse(row).success, row.id).toBe(true);
    for (const row of NOW_ARGUMENTS) expect(nowArgumentSchema.safeParse(row).success, row.id).toBe(true);
    for (const row of positions) expect(positionSchema.safeParse(row).success, row.id).toBe(true);
    expect(NOW_DEBATES_AS_OF).toBe('2026-11-14');
  });

  it('keeps question, argument and position ids unique', () => {
    for (const ids of [
      OPEN_QUESTIONS.map((row) => row.id),
      NOW_ARGUMENTS.map((row) => row.id),
      positions.map((row) => row.id),
    ]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
    const duplicate = { ...debates, questions: [...OPEN_QUESTIONS, OPEN_QUESTIONS[0]] };
    expect(nowDebatesSchema.safeParse(duplicate).success).toBe(false);
  });

  it('links over https only', () => {
    const all = urls();
    expect(all.length).toBe(sourcedEvidence.length + positions.length);
    for (const url of all) expect(url, url).toMatch(/^https:\/\//);
    const insecure = { ...positions[1], postUrl: 'http://x.com/xuningy/status/2110468153147089292' };
    expect(positionSchema.safeParse(insecure).success).toBe(false);
  });

  it('gives every argument two to four positions, on at least two sides', () => {
    for (const row of NOW_ARGUMENTS) {
      expect(row.positions.length, row.id).toBeGreaterThanOrEqual(2);
      expect(row.positions.length, row.id).toBeLessThanOrEqual(4);
      expect(positionsBySide(row).length, row.id).toBeGreaterThanOrEqual(2);
    }
    const oneSided = {
      ...argument('teleop-vs-human-video'),
      positions: argument('teleop-vs-human-video').positions.map((row) => ({ ...row, side: 'human video' })),
    };
    expect(nowArgumentSchema.safeParse(oneSided).success).toBe(false);
    const unknownSide = {
      ...argument('teleop-vs-human-video'),
      positions: argument('teleop-vs-human-video').positions.map((row, i) => (i === 0 ? { ...row, side: 'teleop' } : row)),
    };
    expect(nowArgumentSchema.safeParse(unknownSide).success).toBe(false);
  });

  it('stores every quote as one sentence of at most 240 characters, with no ellipsis', () => {
    for (const row of positions.filter((candidate) => !candidate.wholePost)) {
      expect(terminalMarks(row.quote), row.id).toBe(1);
      expect(hasEllipsis(row.quote), row.id).toBe(false);
      expect(row.quote.length, row.id).toBeLessThanOrEqual(QUOTE_MAX_LENGTH);
      expect(isOneSentence(row.quote), row.id).toBe(true);
    }
    expect(terminalMarks('Praxis-1 finished 15.6x faster on Gemini Robotics 2.5.')).toBe(1);
    expect(quoteSchema.safeParse('Real. Autonomous. No speed up.').success).toBe(false);
    expect(quoteSchema.safeParse('Robotics is finally just another sub area of ai').success).toBe(false);
    expect(quoteSchema.safeParse('A model trained entirely in simulation... without data.').success).toBe(false);
    expect(quoteSchema.safeParse(`${'word '.repeat(48)}end.`).success).toBe(false);
  });

  it('exempts only whole posts from the one-sentence rule, and holds them to 60 characters', () => {
    const whole = positions.filter((row) => row.wholePost);
    expect(whole.map((row) => [row.id, row.quote])).toEqual([
      ['jim-fan-keynote-autonomous', 'Real. Autonomous. No speed up.'],
    ]);
    for (const row of whole) {
      expect(row.quote.length, row.id).toBeLessThanOrEqual(WHOLE_POST_MAX_LENGTH);
      expect(hasEllipsis(row.quote), row.id).toBe(false);
    }
    const [fan] = whole;
    const unmarked: Record<string, unknown> = { ...fan };
    delete unmarked.wholePost;
    expect(positionSchema.safeParse(unmarked).success).toBe(false);
    const long = { ...fan, quote: 'Real. Autonomous. No speed up. '.repeat(2).trim() };
    expect(long.quote.length).toBeGreaterThan(WHOLE_POST_MAX_LENGTH);
    expect(positionSchema.safeParse(long).success).toBe(false);
    expect(wholePostQuoteSchema.safeParse('Real... Autonomous.').success).toBe(false);
  });

  it('resolves every questionId, and links each question at most once', () => {
    const ids = new Set(OPEN_QUESTIONS.map((row) => row.id));
    const linked = NOW_ARGUMENTS.flatMap((row) => (row.questionId ? [row.questionId] : []));
    for (const id of linked) expect(ids.has(id), id).toBe(true);
    expect(new Set(linked).size).toBe(linked.length);
    const dangling = {
      ...debates,
      arguments: NOW_ARGUMENTS.map((row, i) => (i === 1 ? { ...row, questionId: 'q-not-a-question' } : row)),
    };
    expect(nowDebatesSchema.safeParse(dangling).success).toBe(false);
  });

  it('writes no dash in any site copy, roles and side labels included', () => {
    expect(copy.length).toBeGreaterThan(40);
    for (const row of NOW_ARGUMENTS) for (const side of row.sides) expect(copy).toContain(side);
    for (const row of positions) expect(copy).toContain(row.role);
    for (const text of copy) {
      expect(isDashFree(text), text).toBe(true);
      expect(DASH_PATTERN.test(text), text).toBe(false);
    }
    expect(siteCopySchema.safeParse(`Due in December ${String.fromCodePoint(0x2014)} reported.`).success).toBe(false);
    expect(siteCopySchema.safeParse('Due in December - reported.').success).toBe(false);
    expect(siteCopySchema.safeParse('GPT-6 Astra on RoboLab-120.').success).toBe(true);
  });

  it('keeps site copy free of banned vocabulary and British spellings', () => {
    expect(findBannedVocabulary(copy.join('\n'))).toEqual([]);
    for (const text of copy) {
      expect(text, text).not.toMatch(/\b(reorganis\w*|realis\w*|recognis\w*|colour|behaviour|programme|modelling|analys(e|ed|ing)|centre)\b/i);
    }
  });
});

describe('now debates: what the page must not store', () => {
  const everything = JSON.stringify(debates);

  it('leaves out the dropped posts and claims by name', () => {
    for (const absent of ['saranormous', 'Sarah Guo', 'advait', 'Advait', '174,362', 'Agility', 'ns123abc', 'NIK']) {
      expect(everything, absent).not.toContain(absent);
    }
    expect(everything).not.toMatch(/it[’']s over/i);
    expect(everything).not.toMatch(/five demonstrations|95% after|Dexter-50/i);
    expect(NOW_ARGUMENTS.map((row) => row.id)).not.toContain('humanoid-vs-other-forms');
    expect(NOW_ARGUMENTS.map((row) => row.id)).not.toContain('benchmarks');
  });

  it('stores no view counts', () => {
    expect(everything).not.toMatch(/"views?"|\bviews\b/i);
    for (const row of positions) expect(Object.keys(row).some((key) => /view/i.test(key)), row.id).toBe(false);
  });

  it('calls Mercedes-Benz a proof of concept with 96% accuracy, never a success rate or deployment', () => {
    const mentions = [...copy, ...positions.map((row) => row.quote)].filter((text) => /Mercedes/.test(text));
    expect(mentions.length).toBeGreaterThanOrEqual(3);
    for (const text of mentions) {
      expect(text, text).toMatch(/proof of concept/);
      expect(text, text).not.toMatch(/success rate|deploy/i);
      if (/%/.test(text)) expect(text, text).toMatch(/96% accuracy/);
    }
    const evidence = question('q-reliability-measurement').evidenceAgainst;
    expect(isSourced(evidence) && evidence.passages.join(' ')).toMatch(/96% accuracy/);
  });

  it('says simulation next to every simulated benchmark and keeps RoboDojo forms apart', () => {
    for (const text of copy.filter((candidate) => /RoboLab|LIBERO|RoboDojo/.test(candidate))) {
      expect(text, text).toMatch(/simulation/);
    }
    for (const text of copy.filter((candidate) => /RoboDojo/.test(candidate))) {
      expect(text, text).toMatch(/RoboDojo (Sim|RC)|RoboDojo-RC/);
    }
  });

  it('says GR00T 2 weights are due in December', () => {
    const weights = copy.filter((text) => /weights/.test(text) && /GR00T|Jim Fan/.test(text));
    expect(weights.length).toBe(1);
    for (const text of weights) expect(text).toMatch(/due in December/);
  });
});

describe('now debates: evidence', () => {
  it('backs both sides of every question with a sourced result, each with its number', () => {
    for (const row of OPEN_QUESTIONS) {
      for (const evidence of [row.evidenceFor, row.evidenceAgainst]) {
        expect(isSourced(evidence), row.id).toBe(true);
        if (!isSourced(evidence)) continue;
        expect(evidence.text, row.id).toMatch(/\d/);
        expect(isOneSentence(evidence.text), row.id).toBe(true);
        expect(evidence.passages.length, row.id).toBeGreaterThan(0);
        expect(evidence.checked, row.id).toBe(NOW_DEBATES_AS_OF);
      }
    }
  });

  it('accepts none published, and rejects evidence without a number or a source', () => {
    expect(evidenceSchema.safeParse(NONE_PUBLISHED).success).toBe(true);
    expect(LIB_NONE_PUBLISHED).toBe(NONE_PUBLISHED);
    const sourced = question('q-china-volume-lead').evidenceFor;
    if (!isSourced(sourced)) throw new Error('expected sourced evidence');
    expect(evidenceSchema.safeParse({ ...sourced, text: 'Chinese vendors made most shipments.' }).success).toBe(false);
    const unsourced: Record<string, unknown> = { ...sourced };
    delete unsourced.sourceUrl;
    expect(evidenceSchema.safeParse(unsourced).success).toBe(false);
  });

  it('marks analyst estimates as reported', () => {
    const reported = sourcedEvidence.filter((evidence) => evidence.sourceType === 'reported');
    expect(reported.map((evidence) => evidence.publisher)).toEqual([
      'Smart Analytics Global',
      'Smart Analytics Global',
      'Smart Analytics Global',
    ]);
    for (const evidence of reported) expect(evidence.text).toMatch(/SAG’s estimate/);
  });
});

describe('now debates: positions', () => {
  it('dates every post as X shows it to a US Eastern reader', () => {
    for (const row of positions) expect(row.postedDate, row.id).toBe(easternDate(row.postedUtc));
    expect(easternDate('2026-11-09T02:08:20Z')).toBe('2026-11-08');
    expect(easternDate('2026-10-18T05:01:05Z')).toBe('2026-10-18');
    expect(easternDate('2026-11-07T23:12:27Z')).toBe('2026-11-07');
  });

  it('links each post to its own status under its own handle', () => {
    for (const row of positions.filter((candidate) => candidate.channel === 'x')) {
      expect(row.postUrl, row.id).toMatch(new RegExp(`^https://x\\.com/${row.handle}/status/\\d+$`));
    }
    const wrongHandle = { ...argument('sim-vs-real').positions[0], handle: 'usv' };
    expect(positionSchema.safeParse(wrongHandle).success).toBe(false);
  });

  it('names a person with a full name and a role, or an organization', () => {
    for (const row of positions) {
      expect(row.role.length, row.id).toBeGreaterThan(0);
      if (row.speaker === 'person') expect(row.person.split(' ').length, row.id).toBeGreaterThanOrEqual(2);
    }
    expect(positions.filter((row) => row.speaker === 'organization').map((row) => row.person)).toEqual([
      'Runway',
      'Physical Intelligence',
    ]);
  });

  it('marks the press quote reported and names its article', () => {
    const press = positions.filter((row) => row.channel === 'press');
    expect(press.map((row) => row.id)).toEqual(['guanya-shi-special-problem']);
    expect(press[0].sourceType).toBe('reported');
    expect(press[0].article?.publisher).toBe('Fortune');
    expect(press[0].handle).toBeNull();
    const primaryPress = { ...press[0], sourceType: 'primary' as const };
    expect(positionSchema.safeParse(primaryPress).success).toBe(false);
    const unnamed = { ...press[0], article: undefined };
    expect(positionSchema.safeParse(unnamed).success).toBe(false);
  });

  it('checked every post and article on the as-of date', () => {
    for (const row of positions) expect(row.checked, row.id).toBe(NOW_DEBATES_AS_OF);
  });

  it('files Guanya Shi as his reading of OpenAI, with his own view in the context', () => {
    const shi = argument('general-models-as-policies').positions.find((row) => row.person === 'Guanya Shi');
    expect(shi?.side).toBe('for (reading of OpenAI)');
    expect(shi?.context).toMatch(/His reading.*how OpenAI sees robotics/);
    expect(shi?.context).toMatch(/smaller, specialized models are still needed on the robot’s own computer/);
  });

  it('gives a short quote its subject and a side its reason', () => {
    expect(argument('sim-vs-real').positions.find((row) => row.id === 'qiayuan-liao-compute')?.context).toMatch(
      /SuperMimic.*humanoid motion tracking.*learned world model/,
    );
    expect(
      argument('valuations-vs-revenue').positions.find((row) => row.id === 'rebecca-torrence-pi-talks')?.context,
    ).toMatch(/pre-revenue, which is her statement, not a published figure/);
  });
});

describe('now debates: lib', () => {
  it('orders arguments and questions by rank', () => {
    expect(argumentsByRank().map((row) => row.id)).toEqual([
      'general-models-as-policies',
      'sim-vs-real',
      'teleop-vs-human-video',
      'what-counts-as-deployment',
      'autonomy-of-demos',
      'weights-release',
      'valuations-vs-revenue',
    ]);
    expect(argumentsByRank([...NOW_ARGUMENTS].reverse()).map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(questionsByRank().map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('groups one argument’s positions by side, in the argument’s side order', () => {
    const groups = positionsBySide(argument('general-models-as-policies'));
    expect(groups.map((group) => [group.side, group.positions.map((row) => row.id)])).toEqual([
      ['for (reading of OpenAI)', ['guanya-shi-special-problem']],
      ['yes on score, no on speed', ['xuning-yang-astranomy']],
      ['split: VLM for semantics, VLA for action', ['sergey-levine-semantics']],
      ['against', ['dmytro-hrybov-latency']],
    ]);
    const simulation = positionsBySide(argument('sim-vs-real'));
    expect(simulation.map((group) => group.positions.length)).toEqual([1, 1, 1]);
  });

  it('links the three shared subjects both ways and leaves the rest unlinked', () => {
    expect(questionForArgument(argument('general-models-as-policies'))?.id).toBe('q-general-model-as-robot-policy');
    expect(questionForArgument(argument('teleop-vs-human-video'))?.id).toBe('q-human-video-vs-robot-data');
    expect(questionForArgument(argument('valuations-vs-revenue'))?.id).toBe('q-valuations-vs-revenue');
    expect(questionForArgument(argument('sim-vs-real'))).toBeNull();
    for (const row of NOW_ARGUMENTS) {
      const linked = questionForArgument(row);
      if (linked) expect(argumentForQuestion(linked)?.id).toBe(row.id);
    }
    expect(unlinkedQuestions().map((row) => row.id)).toEqual([
      'q-benchmarks-measure-generalization',
      'q-humanoid-form-factor',
      'q-world-models-vs-simulators',
      'q-reliability-measurement',
      'q-china-volume-lead',
    ]);
  });

  it('counts questions, arguments, positions and reported positions from the rows', () => {
    expect(debateCounts()).toEqual({
      questions: 8,
      arguments: 7,
      positions: 21,
      reportedPositions: 2,
      sourcedEvidence: 16,
      evidenceNonePublished: 0,
      linkedSubjects: 3,
    });
    const counts = debateCounts();
    expect(counts.positions).toBe(NOW_ARGUMENTS.reduce((total, row) => total + row.positions.length, 0));
    expect(positions.filter((row) => row.sourceType === 'reported').map((row) => row.id)).toEqual([
      'guanya-shi-special-problem',
      'rebecca-torrence-pi-talks',
    ]);
  });
});
