// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';
import { deepPhaseSubject, readDeepReleaseArtifact, releaseScreenshotFacts, type DeepReleaseArtifact } from '@/lib/brand-v2-release-deep';
import { BRAND_V2_DEEP_ROWS } from '@/lib/brand-v2-runners';
import { releaseArtifactHash } from '@/lib/brand-v2-release-evidence';
import { evaluateReferenceFeatures, type ReferenceFeatureMeasurements } from '@/lib/brand-v2-reference-rubric';

function passingMeasurements(): ReferenceFeatureMeasurements {
  return {
    surfaceKind: 'home',
    viewport: { width: 1440, height: 900 },
    identity: {
      publicName: 'Robot Wiki',
      descriptor: 'Citation-first encyclopedia of modern robot learning.',
      descriptorRequired: true,
      webDisplayFamily: 'DM Sans',
      ogStaticRoleMatched: true,
      alternateSymbolCount: 0,
      v1IdentityCount: 0,
    },
    hierarchy: {
      primarySizePx: 96,
      supportingSizePx: 60,
      bodySizePx: 20,
      primaryLineCount: 2,
    },
    gridAndDevices: {
      registeredCount: 2,
      unregisteredCount: 0,
      maximumAlignmentErrorPx: 2,
      missingPurposeCount: 0,
      missingOwnerCount: 0,
      maximumDominantMotifsPerSection: 1,
      mobileDeviceCount: 0,
      desktopDeviceCount: 2,
      obscuringCount: 0,
      inputInterceptingCount: 0,
    },
    lightDarkBalance: {
      bodyIsLight: true,
      shellIsLight: true,
      proseIsLight: true,
      darkNonActionAreaPx2: 300_000,
      firstViewportAreaPx2: 1_296_000,
      unregisteredDarkSurfaceCount: 0,
      shellOrProseIntersectionCount: 0,
    },
    repetitionAndFrames: {
      registeredPopulationCount: 2,
      maximumAdjacentRepeatedSignatures: 3,
      redundantNestedFourSidedFrameCount: 0,
      maximumFrameDepth: 2,
      unregisteredDepthTwoCount: 0,
    },
    paletteAndType: {
      auditedColourCount: 7,
      matchingColourCount: 7,
      auditedTypeRoleCount: 30,
      matchingTypeRoleCount: 30,
      unregisteredRoleCount: 0,
      fallbackGlyphCount: 0,
    },
    materialTreatment: {
      registeredRepresentativeCount: 1,
      deterministicCount: 1,
      contrastPassingCount: 1,
      provenanceCompleteCount: 1,
      externalRepresentativeCount: 1,
      proseElementResolved: true,
      proseTextureIntersectionCount: 0,
    },
  };
}

const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));
function tinyPng(blank = false) {
  const chunk = (kind: string, bytes: Buffer) => { const header = Buffer.alloc(8); header.writeUInt32BE(bytes.length); header.write(kind, 4); return Buffer.concat([header, bytes, Buffer.alloc(4)]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(2); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,0,0,0,...(blank ? [0,0,0] : [255,255,255])]))),chunk('IEND',Buffer.alloc(0))]);
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'deep-release-')); temporary.push(root);
  // A genuine checked-in PNG supplies realistic dimensions and nonblank pixels.
  const bytes = readFileSync(join(process.cwd(), 'public/og/classical/perception.png'));
  const facts = releaseScreenshotFacts(bytes);
  const row = structuredClone(BRAND_V2_DEEP_ROWS[0]); row.viewport = { width: facts.width, height: facts.height };
  mkdirSync(join(root, 'library')); writeFileSync(join(root, 'capture.png'), bytes);
  for (const name of ['brand-reference-board.jpeg','brand-reference-article.png']) writeFileSync(join(root,'library',name), 'sealed-reference-fixture');
  const shot = { path: 'capture.png', sha256: releaseArtifactHash(root, 'capture.png') };
  const measurements = passingMeasurements(); measurements.viewport = row.viewport;
  const report = evaluateReferenceFeatures(measurements);
  const artifact: DeepReleaseArtifact = {
    version: 1, sourceFingerprint: 'a'.repeat(64), exportFingerprint: 'c'.repeat(64), id: row.id, declaredRoute: row.route, renderedRoute: row.route, viewport: row.viewport, state: row.state,
    expectedSteps: row.steps.map(({id})=>id), executedSteps: row.steps.map(({id})=>id), captures: row.captures,
    documentCapture: { geometry: { ...row.viewport, documentHeight: facts.height, scrollY: 0 }, files: [{...shot, top:0,bottom:facts.height}] },
    phaseCaptures: row.captures.filter(({kind})=>kind==='bounded').map((capture)=>({...shot,id:capture.id,afterStep:capture.afterStep,subject:deepPhaseSubject(row,capture),width:facts.width,height:facts.height})),
    bounded: shot, referenceHashes: ['library/brand-reference-board.jpeg','library/brand-reference-article.png'].map((path)=>({path,sha256:releaseArtifactHash(root,path)})),
    computed: { publicText:'Robot Wiki', viewport:row.viewport, fontsLoaded:true,pendingFonts:[],busy:[],transitions:[], tokens:{'--color-paper':'#FAFAF8','--color-ink':'#1C1C1A','--color-signal':'#3B6EA8'},
      elements:[{selector:'h1',text:'Robot Wiki',fontFamily:'DM Sans',fontSize:'96px',lineHeight:'96px',colour:'rgb(28, 28, 26)',background:'rgba(0, 0, 0, 0)',radius:'0px',shadow:'none',filter:'none',outline:'none',outlineOffset:'0px',aria:{}}]},
    measurements, payload:{kind:'autonomous-reference-comparison',rubricVersion:1,comparisonMode:'feature-anchors-only',contractLiteralOverridesApplied:true,referenceIds:['library/brand-reference-board.jpeg','library/brand-reference-article.png'],surfaceId:row.id,screenshotPaths:['capture.png','capture.png'],anchors:report.anchors,passed:report.passed},
  };
  return {root,row,artifact};
}

describe('final deep release evidence', () => {
  it('re-evaluates every anchor and decodes the exact phase and full-document bytes', () => {
    const {root,row,artifact}=fixture(); expect(readDeepReleaseArtifact(root,row,'a'.repeat(64),'c'.repeat(64),artifact)).toEqual(artifact);
  });
  it.each([
    ['missing phase',(a:DeepReleaseArtifact)=>{a.phaseCaptures=[];}],
    ['unrelated phase subject',(a:DeepReleaseArtifact)=>{a.phaseCaptures[0].subject='unrelated title';}],
    ['missing executed step',(a:DeepReleaseArtifact)=>{a.executedSteps.pop();}],
    ['reordered steps',(a:DeepReleaseArtifact)=>{a.executedSteps.reverse();}],
    ['viewport drift',(a:DeepReleaseArtifact)=>{a.viewport.width++;}],
    ['stale source',(a:DeepReleaseArtifact)=>{a.sourceFingerprint='b'.repeat(64);}],
    ['wrong destination',(a:DeepReleaseArtifact)=>{a.renderedRoute='/search/';}],
    ['missing document interval',(a:DeepReleaseArtifact)=>{a.documentCapture.files[0].top=1;}],
    ['fake screenshot hash',(a:DeepReleaseArtifact)=>{a.bounded.sha256='b'.repeat(64);}],
    ['fake screenshot dimensions',(a:DeepReleaseArtifact)=>{a.phaseCaptures[0].width=1;}],
    ['pending async state',(a:DeepReleaseArtifact)=>{a.computed.busy=['main'];}],
    ['unloaded font',(a:DeepReleaseArtifact)=>{a.computed.pendingFonts=['Geist:loading'];}],
    ['animation in flight',(a:DeepReleaseArtifact)=>{a.computed.transitions=['CSSTransition'];}],
    ['missing computed token',(a:DeepReleaseArtifact)=>{delete a.computed.tokens['--color-ink'];}],
    ['independent failed anchor',(a:DeepReleaseArtifact)=>{a.measurements.identity.publicName='Wrong';}],
  ])('rejects %s',(_name,mutate)=>{const {root,row,artifact}=fixture();mutate(artifact);expect(()=>readDeepReleaseArtifact(root,row,'a'.repeat(64),'c'.repeat(64),artifact)).toThrow();});
  it('rejects blank and truncated image bytes independently of their names',()=>{
    expect(releaseScreenshotFacts(tinyPng()).distinctColourFloor).toBe(2);
    expect(()=>releaseScreenshotFacts(tinyPng(true))).toThrow('blank');
    expect(()=>releaseScreenshotFacts(tinyPng().subarray(0,28))).toThrow();
  });
  it('does not allow a missing live state to become an identity screenshot',()=>{
    const row=BRAND_V2_DEEP_ROWS.find(({state})=>state==='market-select-company')!;
    const capture=row.captures.find(({afterStep})=>afterStep===row.steps.find(({action})=>action==='select-company')!.id)!;
    expect(deepPhaseSubject(row,capture)).toBe('selected company detail');
  });
});
