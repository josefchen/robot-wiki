import { describe, expect, it } from 'vitest';
import { RELEASE_MACHINE_SCRIPTS,releaseMachineCommand,unitReportProblems,type UnitInventory,type UnitJson } from '@/lib/brand-v2-release-machine';
import { draftUnitInapplicability, recorderCallHash, RELEASE_UNIT_RECORDERS, releaseUnitNonExecutions } from '@/lib/brand-v2-release-unit-scope';

function fixture():{inventory:UnitInventory;report:UnitJson}{return {inventory:[{file:'/repo/tests/a.test.ts',name:'scope > checks behavior'}],report:{success:true,numTotalTests:1,numPassedTests:1,numFailedTests:0,numPendingTests:0,numTodoTests:0,testResults:[{name:'/repo/tests/a.test.ts',status:'passed',message:'',assertionResults:[{ancestorTitles:['scope'],title:'checks behavior',fullName:'scope checks behavior',status:'passed',failureMessages:[]}]}]}};}
describe('final machine-gate evidence',()=>{
  it('declares the fixed read-only gate population without build, generate or self-check recursion',()=>{
    expect(RELEASE_MACHINE_SCRIPTS).toHaveLength(22);
    expect(RELEASE_MACHINE_SCRIPTS.some((name)=>/^(build|generate)|release|machine-gate/.test(name))).toBe(false);
    expect(releaseMachineCommand('test')).toEqual(['npm','test','--','--reporter=default','--reporter=json','--outputFile.json=evidence/brand-v2/release/machine/unit-report.json','--allowOnly=false']);
    expect(()=>releaseMachineCommand('build')).toThrow('Unregistered');
  });
  it('accepts an actually complete unit report including duplicate-title multiplicity',()=>{
    const {inventory,report}=fixture();expect(unitReportProblems(inventory,report)).toEqual([]);
    inventory.push({...inventory[0]});report.testResults[0].assertionResults.push({...report.testResults[0].assertionResults[0]});report.numTotalTests=report.numPassedTests=2;
    expect(unitReportProblems(inventory,report)).toEqual([]);
    report.testResults[0].assertionResults.pop();expect(unitReportProblems(inventory,report)).toContain('executed unit inventory differs from independent complete list');
  });
  it('classifies only the exact source-bound writer rows without counting them as passes',()=>{
    const scope=releaseUnitNonExecutions(process.cwd(),{});
    expect(scope.filter(({kind})=>kind==='conditional-evidence-producer')).toHaveLength(8);
    const {inventory,report}=fixture();const excluded=scope[0];
    inventory.push({file:`/repo/${excluded.file}`,name:excluded.name});
    const names=excluded.name.split(' > ');const title=names.pop()!;
    report.testResults.push({name:`/repo/${excluded.file}`,status:'passed',assertionResults:[{ancestorTitles:names,title,fullName:excluded.name,status:'skipped',failureMessages:[]}]});
    report.numTotalTests++;report.numPendingTests++;
    expect(unitReportProblems(inventory,report,[excluded])).toEqual([]);
    expect(unitReportProblems(inventory,report,[]).length).toBeGreaterThan(0);
    report.testResults[1].assertionResults[0].title+=' changed';
    expect(unitReportProblems(inventory,report,[excluded]).length).toBeGreaterThan(0);
    expect(()=>releaseUnitNonExecutions(process.cwd(),{[RELEASE_UNIT_RECORDERS[0].env]:'1'})).toThrow('before the final source freeze');
  });
  it('binds the complete guarded recorder call and reopens the draft test when data gains a draft',()=>{
    const source="it.runIf(process.env.WRITE === '1')('records', () => { expect(2 + 2).toBe(4); save(); });";
    expect(recorderCallHash(source,'records','WRITE')).not.toBe(recorderCallHash(source.replace('toBe(4)','toBe(5)'),'records','WRITE'));
    expect(()=>recorderCallHash(source.replace("WRITE === '1'","WRITE !== '1'"),'records','WRITE')).toThrow('guard');
    expect(draftUnitInapplicability([],['domain/published'],'a'.repeat(64))).toHaveLength(1);
    expect(draftUnitInapplicability(['domain/draft'],['domain/published'],'a'.repeat(64))).toEqual([]);
    expect(()=>draftUnitInapplicability([],[],'a'.repeat(64))).toThrow('empty');
  });
  it.each([
    ['missing test',(r:UnitJson)=>{r.testResults[0].assertionResults=[];}],
    ['wrong test',(r:UnitJson)=>{r.testResults[0].assertionResults[0].title='other';}],
    ['skipped test',(r:UnitJson)=>{r.testResults[0].assertionResults[0].status='pending';r.numPendingTests=1;}],
    ['todo test',(r:UnitJson)=>{r.numTodoTests=1;}],
    ['failed test',(r:UnitJson)=>{r.success=false;r.numFailedTests=1;}],
    ['concealed error',(r:UnitJson)=>{r.testResults[0].assertionResults[0].failureMessages=['failed'];}],
    ['incomplete file',(r:UnitJson)=>{r.testResults[0].status='failed';}],
  ])('refuses %s',(_name,mutate)=>{const {inventory,report}=fixture();mutate(report);expect(unitReportProblems(inventory,report).length).toBeGreaterThan(0);});
});
