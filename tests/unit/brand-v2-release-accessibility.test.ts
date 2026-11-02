import { describe, expect, it } from 'vitest';
import { releaseAccessibilitySchema, releaseAccessibilityProblems, type ReleaseAccessibility } from '@/lib/brand-v2-release-accessibility';
function reading():ReleaseAccessibility{return {counts:{textRuns:12,fields:2,persistentStates:1},findings:[],
  tables:[{id:'table:one',name:'Results',headers:2,cells:4,unassociated:[]}],
  graphics:[{id:'graph:one',name:'Success curve',alternative:'Success increases from20 to40.',binding:'aria-describedby',interactive:true,keyboardControls:1,geometry:3,visibleGeometry:3,hiddenFromAT:false}],
  scrollRegions:[{id:'scroll:one',name:'Results',keyboard:true,alternative:'Results data'}],
  svgText:[{id:'text:one',foreground:'rgb(0, 0, 0)',background:'rgb(255, 255, 255)',ratio:21,required:4.5}]};}
describe('release state accessibility observations',()=>{
  it('accepts measured tables, alternatives, named keyboard regions and contrast',()=>{
    expect(releaseAccessibilityProblems(releaseAccessibilitySchema.parse(reading()),'/',true)).toEqual([]);
  });
  it.each([
    ['no contrast census',(r:ReleaseAccessibility)=>{r.counts.textRuns=0;}],
    ['low HTML contrast',(r:ReleaseAccessibility)=>{r.findings=[{predicate:'text-contrast',element:'p',detail:'2.1 <4.5',exemption:null}];}],
    ['colour-only selection',(r:ReleaseAccessibility)=>{r.findings=[{predicate:'state-non-colour-cue',element:'button',detail:'no distinct structural cue',exemption:null}];}],
    ['invented exemption',(r:ReleaseAccessibility)=>{r.findings=[{predicate:'text-contrast',element:'p',detail:'2.1 <4.5',exemption:'invented'}];}],
    ['missing table name',(r:ReleaseAccessibility)=>{r.tables[0].name='';}],
    ['missing header association',(r:ReleaseAccessibility)=>{r.tables[0].unassociated=['row1,column1'];}],
    ['missing graphic alternative',(r:ReleaseAccessibility)=>{r.graphics[0].alternative='';}],
    ['unbound graphic alternative',(r:ReleaseAccessibility)=>{r.graphics[0].binding='';}],
    ['unnamed graphic',(r:ReleaseAccessibility)=>{r.graphics[0].name='';}],
    ['no keyboard equivalent',(r:ReleaseAccessibility)=>{r.graphics[0].keyboardControls=0;}],
    ['invisible forced-colour drawing',(r:ReleaseAccessibility)=>{r.graphics[0].visibleGeometry=0;}],
    ['unreachable scroller',(r:ReleaseAccessibility)=>{r.scrollRegions[0].keyboard=false;}],
    ['low SVG contrast',(r:ReleaseAccessibility)=>{r.svgText[0].ratio=1.4;}],
  ])('refuses %s',(_name,mutate)=>{const value=reading();mutate(value);expect(releaseAccessibilityProblems(value,'/',true).length).toBeGreaterThan(0);});
});
