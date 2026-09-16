import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { parseLedger, compoundPlanDigest, compoundPartDigest } from '../../lib/audit-ledger';
const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
const ledger = readFileSync('audit/classical.md', 'utf8');
const registry = new Set(CITATIONS.map(c => c.id));
const targets = [['perception', 56], ['perception', 57], ['perception', 58], ['state-estimation', 4], ['state-estimation', 5]] as const;
const selected = plans.filter((p: {articleSlug:string;rowOrdinal:number}) => targets.some(([slug,n])=>p.articleSlug===slug && p.rowOrdinal===n));
const parse = (input = plans) => parseLedger('audit/classical.md', ledger, registry, {compoundPlans:input});
describe('servo and Apollo exact original AND evidence', () => {
  it('binds exactly five original identities, twenty-one parts and twenty-three source pairs', () => {
    expect(selected).toHaveLength(5);
    expect(selected.reduce((n: number,p: {parts:unknown[]})=>n+p.parts.length,0)).toBe(21);
    expect(selected.reduce((n: number,p: {evidence:unknown[]})=>n+p.evidence.length,0)).toBe(23);
    for (const [slug,n] of targets) expect(parse().find(s=>s.slug===slug)!.claimRecords[n-1].evidenceFailures).toEqual([]);
  });
  it('requires current non-null plan and every paired source adjudication', () => {
    expect(selected).toHaveLength(5);
    for (const p of selected) {
      expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));
      expect(p.adjudications).toHaveLength(p.parts.length);
      for (const a of p.adjudications) {expect(a.outcome).toBe('supported'); expect(a.evidenceDigest).toBe(compoundPartDigest(p,a.partId));}
    }
  });
  it('rejects a stale tuple, a missing AND part adjudication and a missing source pair', () => {
    expect(selected).toHaveLength(5);
    for (const mode of ['tuple','and','pair']) {
      const changed = structuredClone(plans); const p = changed.find((x: {id:string})=>x.id===selected[0].id);
      if(mode==='tuple')p.originalCellsDigest='0'.repeat(64);
      if(mode==='and')p.adjudications.pop();
      if(mode==='pair')p.evidence.pop();
      expect(parse(changed).find(s=>s.slug==='perception')!.claimRecords[55].evidenceFailures.length).toBeGreaterThan(0);
    }
  });
});
describe('servo source scope', () => {
  const article=readFileSync('content/classical/perception.mdx','utf8');
  const section=article.split('## Visual servoing:')[1]?.split('## ')[0] ?? '';
  it('retains depth, local stability, visibility and Part I scope',()=>{
    expect(section).toContain('image-based and position-based control');
    expect(section).not.toContain('deletes the pose-estimation term');
    expect(section).toMatch(/depth/); expect(section).toMatch(/local/); expect(section).toMatch(/poor estimates/);
    expect(section).toMatch(/Part I[\s\S]*performance and stability/);
    // A later packet added a sixth 2006 cite (the field-of-view sentence).
    expect(section.match(/<Cite id="chaumette-hutchinson-2006" \/>/g)).toHaveLength(6);
    expect(section.match(/<Cite id="chaumette-hutchinson-2007" \/>/g)).toHaveLength(2);
  });
  it('uses the source titles and complete accented bylines without repinning DOI URLs',()=>{
    for(const [id,title,url] of [
      ['chaumette-hutchinson-2006','Visual Servo Control, Part I: Basic Approaches','https://doi.org/10.1109/MRA.2006.250573'],
      ['chaumette-hutchinson-2007','Visual Servo Control, Part II: Advanced Approaches','https://doi.org/10.1109/MRA.2007.339609']]) {
      const c=CITATIONS.find(c=>c.id===id)!;expect(c.title).toBe(title);expect(c.authors).toEqual(['François Chaumette','Seth Hutchinson']);expect(c.url).toBe(url);
    }
  });
});
