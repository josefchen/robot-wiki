import { describe, expect, it } from 'vitest';
import { reportCases, testRunProblems, releaseTestCommand, fixtureInapplicabilities, releaseScopeFiles, type PlaywrightJson } from '@/lib/brand-v2-release-test-run';

function report(): PlaywrightJson {
  return { suites: [{ title: 'spec.ts', specs: [{ id: 'real-case', file: 'spec.ts', line: 10, column: 1, title: 'proves required behavior',
    tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed', errors: [] }], annotations: [] }] }] }],
    errors: [], stats: { expected: 1, unexpected: 0, flaky: 0, skipped: 0 } };
}

describe('complete final test-run evidence', () => {
  it('joins executed cases to the independent full inventory', () => {
    expect(testRunProblems(report(), report(), 0)).toEqual([]);
    expect(reportCases(report())[0]).toMatchObject({ id: 'real-case|chromium', title: 'spec.ts › proves required behavior' });
    for (const scope of ['brand-v2', 'product'] as const) {
      expect(releaseTestCommand(scope, true)).toEqual([...releaseTestCommand(scope, false), '--list']);
      expect(releaseTestCommand(scope, false)).toContain('--forbid-only');
    }
  });
  it.each([
    ['omitted case',(r:PlaywrightJson)=>{r.suites[0].specs=[];}],
    ['renamed case',(r:PlaywrightJson)=>{r.suites[0].specs![0].id='other';}],
    ['different project',(r:PlaywrightJson)=>{r.suites[0].specs![0].tests[0].projectName='other';}],
    ['skip',(r:PlaywrightJson)=>{r.suites[0].specs![0].tests[0].results=[{status:'skipped'}];}],
    ['expected failure',(r:PlaywrightJson)=>{r.suites[0].specs![0].tests[0].expectedStatus='failed';r.suites[0].specs![0].tests[0].results=[{status:'failed'}];}],
    ['retry',(r:PlaywrightJson)=>{r.suites[0].specs![0].tests[0].results!.unshift({status:'failed'});}],
    ['ignored error',(r:PlaywrightJson)=>{r.suites[0].specs![0].tests[0].results![0].errors=['failure'];}],
    ['collection error',(r:PlaywrightJson)=>{r.errors=['collection failed'];}],
    ['truncated result',(r:PlaywrightJson)=>{r.suites[0].specs![0].tests[0].results=[];}],
    ['missing summary',(r:PlaywrightJson)=>{delete r.stats;}],
    ['declared skip',(r:PlaywrightJson)=>{r.suites[0].specs![0].tests[0].annotations=[{type:'skip',description:'ignored'}];}],
  ])('rejects %s',(_name,mutate)=>{
    const actual=report();mutate(actual);
    let failures:string[];try{failures=testRunProblems(report(),actual,0);}catch(error){failures=[String(error)];}
    expect(failures.length).toBeGreaterThan(0);
  });
  it('does not let a green report conceal a failed command',()=>{
    expect(testRunProblems(report(),report(),1)).toContain('test command exited 1');
  });
  it('permits only the exactly named independently empty fixture and reopens it when data appears',()=>{
    const exclusions=fixtureInapplicabilities([],[],['content/example.mdx']);
    expect(exclusions).toHaveLength(2);
    const empty=report();const spec=empty.suites[0].specs![0];
    spec.file=exclusions[0].file;spec.title=exclusions[0].title;
    spec.tests[0]={projectName:'chromium',expectedStatus:'skipped',status:'skipped',results:[{status:'skipped'}],annotations:[{type:'skip',description:exclusions[0].reason}]};
    empty.stats={expected:0,unexpected:0,flaky:0,skipped:1};
    expect(testRunProblems(empty,empty,0,exclusions)).toEqual([]);
    expect(testRunProblems(empty,empty,0,fixtureInapplicabilities(['new/draft'],[],['content/example.mdx'])).length).toBeGreaterThan(0);
    expect(fixtureInapplicabilities([],['article/without-inbound'],['content/example.mdx']).some(({file})=>file==='see-also.spec.ts')).toBe(false);
    expect(()=>fixtureInapplicabilities([],[],[])).toThrow();
  });
  it('partitions the full current spec population into disjoint final scopes',()=>{
    const scopes=['brand-v2','product','grasp','dexterity','rl'] as const;
    const sets=scopes.map((scope)=>releaseScopeFiles(process.cwd(),scope));
    expect(sets.every((rows)=>rows.length>0)).toBe(true);
    expect(new Set(sets.flat()).size).toBe(sets.flat().length);
    expect(sets.flat().some((file)=>file.endsWith('release-pilot.spec.ts'))).toBe(false);
  });
});
