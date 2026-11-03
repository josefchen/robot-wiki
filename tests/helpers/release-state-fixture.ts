import { RELEASE_PROFILES, type ReleaseProfile, type ReleaseStateArtifact } from '../../lib/brand-v2-release-evidence.ts';
import { RELEASE_TEXT_ONLY_SELECTORS, RELEASE_TEXT_ONLY_SOURCE } from '../../lib/brand-v2-release-text.ts';

export function releaseArtifactFixture(): ReleaseStateArtifact {
  return {
    version: 1, sourceFingerprint: 'a'.repeat(64), exportFingerprint: 'c'.repeat(64), group: 'routes', expectedStateIds: ['route:/'],
    cases: [{ id: 'route:/', route: '/', state: 'default', activity:{version:1,url:'/',initialUrl:'/',elapsedMs:1,truncated:false,startFocus:null,endFocus:null,initialRegions:[],finalRegions:[],finalRegionCount:0,operations:[],changes:[]}, steps: ['navigate', 'settle', 'profile'], profiles: RELEASE_PROFILES.map((plan): ReleaseProfile => ({
      id: plan.id, tableFrames:[],liveRegions:[],liveRegionCount:0, viewport: { width: plan.width, height: plan.height, dpr: plan.dpr },
      ...(plan.zoomBase ? { requestedCssViewport: { width: plan.zoomBase.width / 2, height: plan.zoomBase.height / 2 } } : {}),
      mainCount: 1, visibleTextCount: 5, fontsLoaded: true, fonts:{status:"loaded",used:[{family:"Geist",descriptor:"400 14px Geist",characters:"Hello",ready:true}],usedFaceFailures:[],unusedFaceFailures:[]}, documentOverflowPx: 0,
      axeViolations: [], semanticFailures: [], hiddenRequiredContent: [], requiredDisclosureIds: [], disclosures: [], focus: [],focusExpected:false,focusPaint:null,
      textSizes: plan.textOnly ? [{id:'text:0', selector: 'p',text:'Measured paragraph', baselinePx: 16, actualPx: 32, visible: true, clipped: false,overlapped:false }] : [],
      textPopulation:plan.textOnly?{source:RELEASE_TEXT_ONLY_SOURCE,selectors:[...RELEASE_TEXT_ONLY_SELECTORS],memberIds:['text:0']}:{source:null,selectors:[],memberIds:[]},
      residue: { elements: 10, colourValues: 2, findings: [] },accessibility:{counts:{textRuns:5},findings:[],tables:[],graphics:[],scrollRegions:[],svgText:[]}, forcedColorsActive: Boolean(plan.forcedColors), reducedMotion: Boolean(plan.reducedMotion), stateBefore: 'state-1', stateAfter: 'state-1',
      interaction:{forcedColors:Boolean(plan.forcedColors),systemText:'rgb(0, 0, 0)',systemCanvas:'rgb(255, 255, 255)',inputs:[],segmented:[],targets:{count:1,censusIds:['control:fixture'],large:{ids:['control:fixture'],count:1,minWidth:24,minHeight:24},small:[]},instruments:[],tables:[]},
      ...(plan.reducedMotion ? { motion: { windowMs: 3000, cssAnimations: [], geometryBefore: 'same', geometryAfter: 'same', canvases: [] } } : {}),
    })) }],
  };
}
