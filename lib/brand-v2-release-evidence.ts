import { releaseActivitySchema,releaseActivityProblems,releaseLiveRegionSchema } from './brand-v2-release-activity.ts';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { z } from 'zod';
import { BRAND_V2_DEEP_ROWS } from './brand-v2-runners.ts';
import type { LedgerObservation } from './brand-v2-interactive-ledger.ts';
import { releaseAccessibilitySchema, releaseAccessibilityProblems } from './brand-v2-release-accessibility.ts';
import { focusPaintSchema, focusPaintFailures } from './brand-v2-focus-paint.ts';
import { releaseInteractionDetailsSchema, releaseInteractionDetailProblems, type ReleaseTargetRegistry } from './brand-v2-release-interaction-details.ts';
import registry from '../contract/brand-v2-registries.json' with {type:'json'};
import {RELEASE_TEXT_ONLY_SELECTORS,RELEASE_TEXT_ONLY_SOURCE}from './brand-v2-release-text.ts';
import { frameDataSchema } from './brand-v2-release-frame-data.ts';

/** Final evidence is separate from iterative captures. Its schema contains
 * observations, never a caller-supplied "passed" bit. Readers re-evaluate
 * every predicate and exact population against current source bytes. */
export const RELEASE_EVIDENCE_DIRECTORY = 'evidence/brand-v2/release';
export const RELEASE_STATE_VERSION = 1;
export {RELEASE_SOURCE_ROOTS,RELEASE_TOOLING_IGNORE_NOTE,canonicalReleaseSourceBytes,releaseSourceFingerprint}from './brand-v2-release-source.ts';

export function releaseArtifactHash(root: string, path: string): string {
  const resolved = isAbsolute(path) ? path : join(root, path);
  if (relative(root, resolved).startsWith('..')) throw new Error(`release artifact escapes repository: ${path}`);
  return createHash('sha256').update(readFileSync(resolved)).digest('hex');
}

const nonempty = z.string().min(1);
const viewport = z.object({ width: z.number().positive(), height: z.number().positive(), dpr: z.number().positive() }).strict();
const textSize = z.object({id:nonempty,selector: nonempty,text:z.string(), baselinePx: z.number().positive(), actualPx: z.number().positive().nullable(), visible: z.boolean(), clipped: z.boolean(),overlapped:z.boolean() }).strict();
const focus = z.object({ selector: nonempty, reached: z.boolean(), visible: z.boolean(), obscured: z.boolean(), name: z.string(), label: z.string() }).strict();

export const releaseProfileSchema = z.object({
  id: nonempty,
  liveRegions:z.array(releaseLiveRegionSchema),liveRegionCount:z.number().int().nonnegative(),
  tableFrames:z.array(z.object({mountId:nonempty,sourceId:nonempty,tableIds:z.array(nonempty).min(1),frame:z.lazy(()=>frameDataSchema)}).strict()),
  viewport,
  requestedCssViewport: z.object({ width: z.number().positive(), height: z.number().positive() }).strict().optional(),
  mainCount: z.number().int().nonnegative(),
  visibleTextCount: z.number().int().nonnegative(),
  fontsLoaded: z.boolean(),
  fonts: z.object({ status: z.enum(['loading','loaded']), used:z.array(z.object({family:nonempty,descriptor:nonempty,characters:nonempty,ready:z.boolean()}).strict()).min(1),
    usedFaceFailures:z.array(z.object({family:nonempty,status:z.enum(['loading','error']),weight:nonempty,style:nonempty}).strict()),
    unusedFaceFailures:z.array(z.object({family:nonempty,status:z.enum(['loading','error']),weight:nonempty,style:nonempty}).strict()) }).strict(),
  documentOverflowPx: z.number().nonnegative(),
  axeViolations: z.array(nonempty),
  semanticFailures: z.array(nonempty),
  hiddenRequiredContent: z.array(nonempty),
  requiredDisclosureIds: z.array(nonempty),
  disclosures: z.array(z.object({ id: nonempty, reached: z.boolean(), keyboard: z.boolean(), textPresent: z.boolean(), restored: z.boolean() }).strict()),
  focus: z.array(focus),
  focusExpected:z.boolean(),
  focusPaint:focusPaintSchema.nullable(),
  textSizes: z.array(textSize),
  textPopulation:z.object({source:z.string().nullable(),selectors:z.array(nonempty),memberIds:z.array(nonempty)}).strict(),
  forcedColorsActive: z.boolean(),
  reducedMotion: z.boolean(),
  residue: z.object({ elements: z.number().int().positive(), colourValues: z.number().int().positive(), findings: z.array(nonempty) }).strict(),
  accessibility: releaseAccessibilitySchema,
  interaction:releaseInteractionDetailsSchema,
  stateBefore: nonempty,
  stateAfter: nonempty,
  motion: z.object({
    windowMs: z.number().int().min(3000), cssAnimations: z.array(nonempty),
    geometryBefore: nonempty, geometryAfter: nonempty,
    canvases: z.array(z.object({ id: nonempty, before: nonempty, after: nonempty }).strict()),
  }).strict().optional(),
}).strict();
export type ReleaseProfile = z.infer<typeof releaseProfileSchema>;

export const releaseStateSchema = z.object({
  id: nonempty,
  route: nonempty,
  state: nonempty,
  // Actual operations performed by the owning state driver, in order.
  steps: z.array(nonempty).min(1),
  profiles: z.array(releaseProfileSchema).min(1),
  activity:releaseActivitySchema,
}).strict();
export type ReleaseState = z.infer<typeof releaseStateSchema>;

export const releaseStateArtifactSchema = z.object({
  version: z.literal(RELEASE_STATE_VERSION),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  exportFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  group: nonempty,
  // The expected state IDs are independently derived by the reader. This
  // recorded list makes omissions in partial/sharded runs inspectable.
  expectedStateIds: z.array(nonempty).min(1),
  cases: z.array(releaseStateSchema).min(1),
}).strict();
export type ReleaseStateArtifact = z.infer<typeof releaseStateArtifactSchema>;

export type ReleaseProfilePlan = {
  id: string;
  width: number;
  height: number;
  dpr: number;
  forcedColors?: true;
  textOnly?: true;
  reducedMotion?: true;
  zoomBase?: { width: number; height: number };
};

/** Technical measurement successor, 2026-11-02: Chromium's metrics API takes
 * integer CSS widths. Odd sealed dimensions round DOWN, giving at most the
 * required half-width (stricter by <1px). Both the exact requested half-size
 * and the measured integer size are recorded. No browser-chrome zoom claim. */
const ZOOM_BASES = [...new Map(BRAND_V2_DEEP_ROWS.map(({ viewport: size }) => [`${size.width}x${size.height}`, size])).values()];
export const RELEASE_PROFILES: readonly ReleaseProfilePlan[] = [
  { id: 'desktop', width: 1440, height: 900, dpr: 1 },
  { id: 'phone', width: 375, height: 812, dpr: 1 },
  { id: 'tablet', width: 768, height: 1024, dpr: 1 },
  { id: 'small-desktop', width: 1024, height: 768, dpr: 1 },
  { id: 'forced-colors', width: 1440, height: 900, dpr: 1, forcedColors: true },
  { id: 'reflow-320', width: 320, height: 800, dpr: 1 },
  ...ZOOM_BASES.map((base) => ({ id: `zoom-equivalent-200-${base.width}x${base.height}`, width: Math.floor(base.width / 2), height: Math.floor(base.height / 2), dpr: 2, zoomBase: base })),
  { id: 'text-only-200', width: 1440, height: 900, dpr: 1, textOnly: true },
  { id: 'reduced-motion', width: 1440, height: 900, dpr: 1, reducedMotion: true },
];

export function releaseProfileProblems(profile: ReleaseProfile, plan: ReleaseProfilePlan, route = '/'): string[] {
  const problems: string[] = [];
  const name = profile.id;
  if(profile.liveRegions.length!==profile.liveRegionCount||new Set(profile.liveRegions.map(region=>region.id)).size!==profile.liveRegions.length)problems.push(`${name}: live-region census is missing or duplicated`);
  if (profile.id !== plan.id) problems.push(`${name}: profile id differs from its plan`);
  for (const key of ['width', 'height', 'dpr'] as const) {
    if (profile.viewport[key] !== plan[key]) problems.push(`${name}: ${key} ${profile.viewport[key]} differs from ${plan[key]}`);
  }
  if (plan.zoomBase && (profile.requestedCssViewport?.width !== plan.zoomBase.width / 2 || profile.requestedCssViewport?.height !== plan.zoomBase.height / 2)) problems.push(`${name}: exact requested half-size is not recorded`);
  if (profile.mainCount !== 1) problems.push(`${name}: main landmark count ${profile.mainCount}`);
  if (profile.visibleTextCount === 0) problems.push(`${name}: empty visible text population`);
  if(profile.accessibility.tables.length!==profile.interaction.tables.length)problems.push(`${name}: table census differs between independent semantic and data readers`);
  const boundTables=profile.tableFrames.flatMap(frame=>frame.tableIds);
  if(new Set(boundTables).size!==boundTables.length||boundTables.some(id=>!profile.interaction.tables.some(table=>table.id===id))||new Set(profile.tableFrames.map(frame=>frame.mountId)).size!==profile.tableFrames.length)problems.push(`${name}: source/configuration table-frame bindings are extra or duplicated`);
  for(const [index,table]of profile.interaction.tables.entries()){
    const independent=profile.accessibility.tables[index];
    if(!independent||independent.cells!==table.cells.length||independent.headers<table.headers.length)problems.push(`${name}: ${table.id} omits an independently counted table cell or header`);
  }
  if (!profile.fontsLoaded || profile.fonts.status!=='loaded' || !profile.fonts.used.length || profile.fonts.used.some(({ready})=>!ready) || profile.fonts.usedFaceFailures.length) problems.push(`${name}: fonts not loaded for visible text`);
  if (profile.documentOverflowPx > 0) problems.push(`${name}: ${profile.documentOverflowPx}px document overflow`);
  problems.push(...profile.axeViolations.map((id) => `${name}: Axe ${id}`));
  problems.push(...profile.semanticFailures.map((failure) => `${name}: ${failure}`));
  problems.push(...profile.hiddenRequiredContent.map((item) => `${name}: required content hidden: ${item}`));
  if (new Set(profile.requiredDisclosureIds).size !== profile.requiredDisclosureIds.length ||
      profile.disclosures.length !== profile.requiredDisclosureIds.length ||
      new Set(profile.disclosures.map(({ id }) => id)).size !== profile.disclosures.length ||
      profile.requiredDisclosureIds.some((id) => !profile.disclosures.some((row) => row.id === id))) problems.push(`${name}: disclosure availability population differs`);
  for (const entry of profile.disclosures) if (!entry.reached || !entry.keyboard || !entry.textPresent || !entry.restored) problems.push(`${name}: disclosure content is not keyboard reachable or not restored: ${entry.id}`);
  if (profile.stateBefore !== profile.stateAfter) problems.push(`${name}: measurement changed the semantic state`);
  if (Boolean(plan.forcedColors) !== profile.forcedColorsActive) problems.push(`${name}: forced-colors media state differs`);
  if (Boolean(plan.reducedMotion) !== profile.reducedMotion) problems.push(`${name}: motion media state differs`);
  problems.push(...profile.residue.findings.map((finding) => `${name}: residue ${finding}`));
  problems.push(...releaseAccessibilityProblems(profile.accessibility,route,Boolean(plan.forcedColors)).map((finding)=>`${name}: ${finding}`));
  if(profile.interaction.forcedColors!==profile.forcedColorsActive)problems.push(`${name}: interaction paint was measured in another forced-colour mode`);
  problems.push(...releaseInteractionDetailProblems(profile.interaction,registry.controls as unknown as ReleaseTargetRegistry).map((finding)=>`${name}: ${finding}`));
  if(profile.focusPaint)problems.push(...focusPaintFailures(profile.focusPaint,profile.focusPaint.matched).map((finding)=>`${name}: ${finding}`));
  if(profile.focusPaint&&(profile.focusPaint.route!==route||profile.focusPaint.forcedColors!==profile.forcedColorsActive))problems.push(`${name}: focus paint belongs to another route or media state`);
  if (plan.reducedMotion) {
    if (!profile.motion) problems.push(`${name}: missing actual idle motion observation`);
    else {
      if (profile.motion.cssAnimations.length) problems.push(`${name}: active CSS movement ${profile.motion.cssAnimations.join(', ')}`);
      if (profile.motion.geometryBefore !== profile.motion.geometryAfter) problems.push(`${name}: drawing geometry moved during the idle window`);
      for (const canvas of profile.motion.canvases) if (canvas.before !== canvas.after) problems.push(`${name}: canvas ${canvas.id} moved during the idle window`);
    }
  }
  for (const item of profile.focus) {
    if (!item.reached || !item.visible || item.obscured) problems.push(`${name}: focus inaccessible at ${item.selector}`);
    const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!item.name.trim() || !normalize(item.name).includes(normalize(item.label))) problems.push(`${name}: label-in-name at ${item.selector}`);
  }
  if(profile.focusExpected&&profile.focus.length===0)problems.push(`${name}: focused control was lost during profile change`);
  if(profile.focusExpected&&!profile.focusPaint)problems.push(`${name}: current control has no literal focus paint observation`);
  if (plan.textOnly && profile.textSizes.length === 0) problems.push(`${name}: text-only population is empty`);
  if(plan.textOnly){
    const census=profile.textPopulation;
    if(census.source!==RELEASE_TEXT_ONLY_SOURCE||JSON.stringify(census.selectors)!==JSON.stringify(RELEASE_TEXT_ONLY_SELECTORS))problems.push(`${name}: registered text selectors or source binding differ`);
    if(!census.memberIds.length||new Set(census.memberIds).size!==census.memberIds.length||JSON.stringify(census.memberIds)!==JSON.stringify(profile.textSizes.map(({id})=>id)))problems.push(`${name}: observed text population differs from the pre-injection census`);
  }else if(profile.textSizes.length||profile.textPopulation.memberIds.length||profile.textPopulation.selectors.length||profile.textPopulation.source!==null)problems.push(`${name}: unexpected text-only measurements in another profile`);
  for (const item of profile.textSizes) {
    if (item.actualPx===null||Math.abs(item.actualPx - item.baselinePx * 2) > 0.5) problems.push(`${name}: ${item.selector} not doubled`);
    if (!item.visible || item.clipped) problems.push(`${name}: ${item.selector} hidden or clipped after text resize`);
    if(item.overlapped)problems.push(`${name}: ${item.selector} text lines overlap after text resize`);
  }
  return problems;
}

export function releaseStateProblems(
  input: unknown,
  expected: { fingerprint: string; exportFingerprint: string; group: string; stateIds: readonly string[]; profiles?: readonly ReleaseProfilePlan[] },
): string[] {
  const parsed = releaseStateArtifactSchema.safeParse(input);
  if (!parsed.success) return [`release evidence: invalid schema: ${parsed.error.message}`];
  const artifact = parsed.data;
  const failures: string[] = [];
  if (artifact.sourceFingerprint !== expected.fingerprint) failures.push('release evidence: stale source fingerprint');
  if (artifact.exportFingerprint !== expected.exportFingerprint) failures.push('release evidence: stale production export fingerprint');
  if (artifact.group !== expected.group) failures.push('release evidence: wrong group');
  const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((id, i) => id === [...b].sort()[i]);
  if (!expected.stateIds.length || new Set(expected.stateIds).size !== expected.stateIds.length) failures.push('release evidence: invalid expected population');
  if (!sameSet(artifact.expectedStateIds, expected.stateIds)) failures.push('release evidence: declared population differs');
  if (!sameSet(artifact.cases.map(({ id }) => id), expected.stateIds)) failures.push('release evidence: executed population differs');
  const profiles = expected.profiles ?? RELEASE_PROFILES;
  for (const record of artifact.cases) {
    if (!sameSet(record.profiles.map(({ id }) => id), profiles.map(({ id }) => id))) failures.push(`${record.id}: missing, extra or duplicate profile`);
    failures.push(...releaseActivityProblems(record.activity).map((failure)=>`${record.id}: ${failure}`));
    for (const profile of record.profiles) {
      const plan = profiles.find(({ id }) => id === profile.id);
      if (plan) failures.push(...releaseProfileProblems(profile, plan, record.route).map((failure) => `${record.id}: ${failure}`));
    }
  }
  return failures;
}

export function readReleaseStateArtifact(root: string, group: string, stateIds: readonly string[], frozen: { source: string; exported: string }): ReleaseStateArtifact {
  if (!/^[a-z0-9-]+$/.test(group)) throw new Error(`invalid release evidence group: ${group}`);
  const path = join(root, RELEASE_EVIDENCE_DIRECTORY, `${group}.json`);
  if (!existsSync(path)) throw new Error(`release evidence missing: ${path}`);
  const artifact: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const failures = releaseStateProblems(artifact, { fingerprint: frozen.source, exportFingerprint: frozen.exported, group, stateIds });
  if (failures.length) throw new Error(failures.join('\n'));
  return releaseStateArtifactSchema.parse(artifact);
}

/** The required profile states are derived from the independently validated
 * keyboard ledger, including every recorded transition and reveal. A source
 * witness is deliberately required as a runtime state too; source matching
 * cannot satisfy final state coverage. */
export function ledgerReleaseStateIds(observation: Omit<LedgerObservation, 'idle'>): string[] {
  const local = [
    'default',
    ...observation.controls.filter(({ disabled, reached }) => !disabled && reached).map(({ index }) => `focus:${index}`),
    ...observation.transitions.map((entry) => `transition:${entry.control}:${entry.fold ?? 'main'}:${entry.caseId}:${entry.keys.join('+')}`),
    ...observation.hover.map(({ target }) => `hover:${target}`),
    ...(observation.reset ? ['reset'] : []),
    ...(observation.pairwise ? ['pairwise'] : []),
    ...observation.cases.filter(({ status }) => status === 'source-witness').map(({ caseId }) => `witness:${caseId}`),
  ];
  return [...new Set(local)].map((id) => `${observation.mountId}|${id}`);
}

export function releaseMapShard(value: string | undefined, stateIds: readonly string[]) {
  if (!value) return { group: 'market-map', stateIds: [...stateIds] };
  const match = /^(\d+)\/(\d+)$/.exec(value);
  const index = Number(match?.[1]); const count = Number(match?.[2]);
  if (!match || index < 1 || index > count || count < 1 || count > 64) throw new Error('ROBOT_WIKI_RELEASE_MAP_SHARD must be I/N with 1 <= I <= N <= 64');
  const selected = stateIds.filter((_, position) => position % count === index - 1);
  if (!selected.length) throw new Error('release map shard has an empty applicable population');
  return { group: `market-map-shard-${index}-of-${count}`, stateIds: selected };
}

/** Preserve transient phases before their owning driver dismisses them.
 * This expands phase coverage; it does not change the semantic case plan. */
export function mapReleaseStateIds(cases:readonly {id:string;kind:string;group:string;dismissal?:string}[]):string[]{
  return cases.flatMap((entry)=>entry.kind==='exception'?[]:entry.group==='selection'
    ?[`map:${entry.id}:opened`,...(entry.dismissal?[`map:${entry.id}:dismissed`]:[])]
    :entry.group==='tooltip-parity'?[`map:${entry.id}:hover`,`map:${entry.id}:keyboard-equivalent`]
      :[`map:${entry.id}`]);
}
