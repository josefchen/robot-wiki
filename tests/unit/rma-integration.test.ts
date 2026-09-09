import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { GLOSSARY } from '../../data/glossary';
import { compoundPartDigest, compoundPlanDigest, parseCompoundPlans, parseLedger } from '../../lib/audit-ledger';
const article=readFileSync('content/rl-sim2real/sim2real-transfer.mdx','utf8');
const ledger=readFileSync('audit/rl-sim2real.md','utf8');
type Plan=ReturnType<typeof parseCompoundPlans>[number];
const plans=JSON.parse(readFileSync('audit/compound-evidence.json','utf8')) as Plan[];
const ids=new Set(CITATIONS.map(c=>c.id));
const selected=(n:number)=>{const p=plans.find(p=>p.id===`rma-writer-${n}-20260909`);expect(p).toBeDefined();return structuredClone(p!);};
const failures=(p:Plan,n:number)=>parseLedger('audit/rl-sim2real.md',ledger,ids,{compoundPlans:plans.map(q=>q.id===p.id?p:q)}).find(s=>s.slug==='sim2real-transfer')!.claimRecords[n-1].evidenceFailures;
describe('RMA separates latent inference from control and learning',()=>{
 it('retains the tested hardware, asynchronous rates and history duration',()=>{for(const s of ['tested Unitree A1','50 state-action steps (0.5 seconds of history)','about 10 Hz','100 Hz using the latest estimate'])expect(article).toContain(s);});
 it('removes the control-rate adaptation strengthening everywhere in its atomic reader spans',()=>{expect(article).not.toContain('fractions of a second at control rate');expect(article).not.toContain('latent extrinsics, online at control rate');expect(article).toContain('These are inference processes, not online gradient updates.');});
 it('retains failures and non-ground-truth latent limits',()=>{expect(article).toContain('failures after large perturbations or multiple leg obstructions');expect(article).toContain('not a guarantee of recovering each physical parameter');});
 it('answers the component question with the adaptation module, not the base policy',()=>{expect(article).toContain('Which RMA component estimates');expect(article).toContain("label: 'A separately trained adaptation module'");expect(article).toContain('neither an exact friction estimate nor adaptation at every control step is promised');});
 it('distinguishes RMA in the shared glossary without losing Lee',()=>{const s=GLOSSARY.find(g=>g.id==='teacher-student-distillation')!;expect(s.definition).toContain('RMA instead trained a base policy with a privileged encoder');expect(s.definition).toContain('asynchronous online inference. Lee and colleagues');expect(s.citations).toEqual(['rma-2021','lee-2020']);});
 for(const [n,partIds] of [[3,['reported-latency','actual-frequencies','paper-identity']],[11,['base-and-latent','adaptation-training-history','deployment','limits','paper-identity']]] as const){
  it(`original ${n} binds all AND parts and real writer review`,()=>{const p=selected(n);expect(p.parts.map(x=>x.id)).toEqual(partIds);expect(failures(p,n)).toEqual([]);expect(p.planReview?.reviewedBy).toBe('agent:91d0f5b9-f12a-456b-ab9d-5fb4d5691f28/integrator');expect(p.planReview?.planDigest).toBe(compoundPlanDigest(p));for(const a of p.adjudications)expect(a.evidenceDigest).toBe(compoundPartDigest(p,a.partId));});
  it(`original ${n} rejects missing evidence, stale passages, removed parts and stale tuple`,()=>{for(const mutate of [(p:Plan)=>{p.evidence.shift();},(p:Plan)=>{p.evidence[0].supportingPassage+=' invented';},(p:Plan)=>{p.parts.pop();},(p:Plan)=>{p.originalCellsDigest='0'.repeat(64);}]){const p=selected(n);mutate(p);expect(failures(p,n).length).toBeGreaterThan(0);}});
 }
 it('keeps the exact audited registry URL and complete source identity',()=>{const c=CITATIONS.find(c=>c.id==='rma-2021')!;expect(c.url).toBe('https://arxiv.org/abs/2107.04034');expect(c.authors).toEqual(['Ashish Kumar','Zipeng Fu','Deepak Pathak','Jitendra Malik']);expect(c.title).toBe('RMA: Rapid Motor Adaptation for Legged Robots');});
});
