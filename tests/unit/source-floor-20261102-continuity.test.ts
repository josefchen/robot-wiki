import { historicalGit } from '../helpers/historical-git';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { keepsSourceFloorObligations, loadSourceFloorReview, sourceFloorPredecessor,
  SOURCE_FLOOR_CONTINUITY_FILE, verifySourceFloorSource } from '../../lib/audit-source-floor-continuity';
import { owedFiguresPredecessor } from '../../lib/audit-owed-figures-continuity';
import { uiRepairPredecessor } from '../../lib/audit-ui-repair-continuity';
import { seoPassPredecessor } from '../../lib/audit-seo-pass-continuity';
import { exactEdits } from '../../scripts/record-reader-first-continuity';

const root = process.cwd();
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const fixture = 'content/example/article.mdx';
const before = `---\ntitle: Example\ndescription: A bounded claim.\ncitations:\n  - prior-2024\n---\n\nimport { Chart } from '@/components/interactive/chart';\n\nA fact <Cite id="prior-2024" />.\n\n<Chart initial={2} />\n`;
const after = before.replace('  - prior-2024\n', '  - prior-2024\n  - added-2025\n') + '\nA supported distinction <Cite id="added-2025" />.\n';

describe('final source-floor article continuity', () => {
  it('reconstructs every exact predecessor from current bytes and preserves current references', () => {
    const review = loadSourceFloorReview(root);
    expect(review.sources.length).toBeGreaterThan(40);
    for (const source of review.sources) {
      const live = readFileSync(join(root, source.after.path));
      const landing = uiRepairPredecessor(root, source.after, live);
      expect(landing.length).toBe(source.after.bytes);
      expect(hash(landing), source.after.path).toBe(source.after.sha256);
      const prior = sourceFloorPredecessor(root, source.before, landing);
      expect(hash(prior), source.after.path).toBe(source.before.sha256);
      expect(prior).toEqual(historicalGit(['show', `${source.archivedFrom}:${source.before.path}`], { cwd: root }));
      expect(sourceFloorPredecessor(root, source.after, landing)).toBe(landing);
      expect(owedFiguresPredecessor(root, { path: source.after.path, bytes: live.length, sha256: hash(live) }, live)).toBe(live);
      expect(owedFiguresPredecessor(root, source.before, live)).toEqual(prior);
      expect(seoPassPredecessor(root, source.before, live)).toEqual(prior);
    }
  }, 20_000); // Replays all 57 articles through the entire historical chain.

  it('accepts new supported sources while rejecting lost citations, figure changes and unnamed metadata edits', () => {
    expect(keepsSourceFloorObligations(fixture, before, after)).toBe(true);
    for (const mutation of [
      after.replace('<Cite id="prior-2024" />', ''),
      after.replace('  - prior-2024\n', ''),
      after.replace('<Chart initial={2} />', ''),
      after.replace('initial={2}', 'initial={3}'),
      after.replace("from '@/components/interactive/chart'", "from '@/components/interactive/other'"),
      after.replace('title: Example', 'title: Unreviewed'),
      after.replace('description: A bounded claim.', 'description: An unbounded claim.'),
      after.replace('  - added-2025\n', '  - added-2025\n  - added-2025\n'),
    ]) expect(keepsSourceFloorObligations(fixture, before, mutation), mutation).toBe(false);
    const corrected = after.replace('description: A bounded claim.', 'description: A more precise bounded claim.');
    expect(keepsSourceFloorObligations(fixture, before, corrected, [{ field: 'description',
      before: 'A bounded claim.', after: 'A more precise bounded claim.',
      reason: 'The named primary evidence narrows the earlier summary; this exact correction preserves the subject and source obligations.' }])).toBe(true);
  });

  it('rejects reordered figures even when all the original sources remain', () => {
    const prior = before + '\n<Other />\n';
    const reordered = after.replace('<Chart initial={2} />', '<Other />') + '\n<Chart initial={2} />\n';
    expect(keepsSourceFloorObligations(fixture, prior, reordered)).toBe(false);
  });

  it('admits only named photo relocation, retaining image content/order and every interactive', () => {
    const prior = before.replace('<Chart initial={2} />', '<Image id="photo-one" />\n\n<Chart initial={2} />\n\n<Other />');
    const current = after.replace('<Chart initial={2} />', '<Chart initial={2} />\n\n<Image id="photo-one" />\n\n<Other />');
    const moves = [{ id: 'photo-one', reason: 'Move this intact photograph immediately after the first interactive so its SVG can meet the required first-screen position.' }];
    expect(keepsSourceFloorObligations(fixture, prior, current)).toBe(false);
    expect(keepsSourceFloorObligations(fixture, prior, current, [], moves)).toBe(true);
    for (const changed of [
      current.replace('id="photo-one"', 'id="different-photo"'),
      current.replace('<Image id="photo-one" />', ''),
      current.replace('<Image id="photo-one" />', '<Image id="photo-one" className="smaller" />'),
      current.replace('<Chart initial={2} />', '<Other />').replace('<Other />\n\nA supported', '<Chart initial={2} />\n\nA supported'),
    ]) expect(keepsSourceFloorObligations(fixture, prior, changed, [], moves)).toBe(false);
    expect(keepsSourceFloorObligations(fixture, prior, current, [], [{ ...moves[0], id: 'unlisted' }])).toBe(false);
    const twoPrior = prior.replace('<Other />', '<Image id="photo-two" />\n\n<Other />');
    const swapped = current.replace('<Chart initial={2} />', '<Image id="photo-two" />\n\n<Chart initial={2} />');
    expect(keepsSourceFloorObligations(fixture, twoPrior, swapped, [], [...moves, { ...moves[0], id: 'photo-two' }])).toBe(false);
  });

  it('rejects plausible but incorrect predecessor hashes, edited review fragments and source bytes', () => {
    const artifact = (text: string) => ({ path: fixture, bytes: Buffer.byteLength(text), sha256: hash(text) });
    const source = { archivedFrom: 'a'.repeat(40), before: artifact(before), after: artifact(after), edits: exactEdits(before, after) };
    expect(verifySourceFloorSource(source, Buffer.from(after)).toString()).toBe(before);
    expect(() => verifySourceFloorSource({ ...source, before: { ...source.before, sha256: '0'.repeat(64) } }, Buffer.from(after))).toThrow();
    expect(() => verifySourceFloorSource({ ...source, edits: [{ before: 'unrelated', after: 'unrelated' }] }, Buffer.from(after))).toThrow();
    expect(() => verifySourceFloorSource(source, Buffer.from(after + '\n'))).toThrow();
  });

  it('does not grant historical acceptance to unreviewed live bytes or a tampered review', () => {
    const [source] = loadSourceFloorReview(root).sources;
    const changed = Buffer.concat([readFileSync(join(root, source.after.path)), Buffer.from('\n')]);
    expect(sourceFloorPredecessor(root, source.before, changed)).toBe(changed);
    expect(owedFiguresPredecessor(root, source.before, changed)).toBe(changed);
    expect(hash(changed)).not.toBe(source.before.sha256);
    const scratch = mkdtempSync(join(tmpdir(), 'source-floor-review-'));
    try {
      cpSync(join(root, SOURCE_FLOOR_CONTINUITY_FILE), join(scratch, 'review.json'));
      const target = join(scratch, SOURCE_FLOOR_CONTINUITY_FILE);
      cpSync(join(root, 'audit/evidence/source-floor-20261102'), join(scratch, 'audit/evidence/source-floor-20261102'), { recursive: true });
      loadSourceFloorReview(scratch);
      writeFileSync(target, readFileSync(target, 'utf8') + '\n');
      const landing = uiRepairPredecessor(root, source.after, readFileSync(join(root, source.after.path)));
      expect(hash(landing)).toBe(source.after.sha256);
      expect(() => sourceFloorPredecessor(scratch, source.before, landing)).toThrow(/source-floor continuity drift/);
    } finally { rmSync(scratch, { recursive: true, force: true }); }
  });
});
