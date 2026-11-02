import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { Color, SRGBColorSpace } from 'three';
import { COMPANIES } from '../data/companies.ts';
import { IMAGES, legalBasis, attributionText, figureKind } from '../data/images.ts';
import { configurationFingerprint, isApprovedTabIconDeclaration, validateApprovedTabIcons, validateExactRegistryParity, validateNoInventedSymbols } from './brand-v2-census.ts';
import { compareBaseline, type ApprovedDelta, type BaselineBundle } from './brand-v2-baseline.ts';
import { ARTICLE_BODY_COMPUTED_IMPORT, deriveEvidenceClosure, evidenceClosureGraph, routeEntryModules } from './brand-v2-evidence-closure.ts';
import { extractBrandV2Assertions } from './brand-v2-enforcement.ts';
import { readAssetSeal, reconcileAssetSeal } from './brand-v2-asset-seal.ts';
import { firstPartyVisualAssets } from './identity-populations.ts';
import { firstPartyImageryVerdicts, type AssetRow } from './brand-v2-image-record.ts';
import { deriveTechnicalIdentifiers, technicalIdentifierWitness, type IdentityRuntimeEvidence } from './brand-v2-identity-evidence.ts';
import type { ControlStatesEvidence } from './brand-v2-control-states-evidence.ts';
import type { GlobalConvergenceEvidence } from './brand-v2-global-convergence-evidence.ts';
import { expectedFigureGraph, type FigureRuntimeEvidence } from './brand-v2-figure-evidence.ts';
import type { OgEvidence } from './brand-v2-og-evidence.ts';
import { BLOCK_FILL, WITHHELD_MARKS } from './market-map-marks.ts';
import { stripComments } from './source-comments.ts';
import { expectedReleaseMetadata, FIXED_PUBLIC_ROUTES, metadataDifferences, NON_INDEXABLE_ROUTES, parseExportedMetadata, releasePublicRoutes, type ReleaseMetadata } from './brand-v2-release-metadata.ts';
import { RELEASE_RESIDUE_PATH, readReleaseResidueRuntime, releaseResidueFingerprint, type ReleaseResidueRuntime, type ResidueObservation } from './brand-v2-release-residue-runtime.ts';
const PREFIX = 'lib/brand-v2-release-residue.ts#';
export const ASSERTION_POPULATION_SOURCES: Readonly<Record<string, string>> = {
  'VAL-B2-BASE-008': PREFIX + 'technical-occurrences',
  'VAL-B2-CONT-007': PREFIX + 'route-union',
  'VAL-B2-CONT-008': PREFIX + 'metadata-owners',
  'VAL-B2-CONT-009': PREFIX + 'sweep-techniques',
  'VAL-B2-IMG-006': PREFIX + 'official-marks',
  'VAL-B2-IMG-007': PREFIX + 'asset-union',
  'VAL-B2-IMG-009': PREFIX + 'asset-union',
  'VAL-B2-IMG-010': PREFIX + 'symbol-surfaces',
  'VAL-B2-RES-001': PREFIX + 'rendered-routes',
  'VAL-B2-RES-002': PREFIX + 'rendered-routes',
  'VAL-B2-RES-003': PREFIX + 'paint-surfaces',
  'VAL-B2-RES-004': PREFIX + 'paint-surfaces',
  'VAL-B2-RES-005': PREFIX + 'rendered-routes',
  'VAL-B2-RES-006': PREFIX + 'rendered-routes',
  'VAL-B2-RES-007': PREFIX + 'active-tests',
  'VAL-B2-RES-008': PREFIX + 'visual-surfaces',
  'VAL-B2-RES-009': PREFIX + 'generated-images',
  'VAL-B2-RES-010': PREFIX + 'metadata-owners'
};
export type ResidueVerdict = {
  id: string;
  failures: string[];
  observed: unknown;
  evidencePaths: string[];
  mode: 'automated-machine' | 'browser-state' | 'autonomous-visual';
};
export type ReleaseResidueRegistry = {
  routes: {
    public: Array<{
      id: string;
      path: string;
      routeKind: 'article' | 'destination';
    }>;
    notFound: {
      id: string;
      path: string;
      publicContent: boolean;
    };
  };
  metadata: Array<{
    id: string;
    routeId: string;
    owner: string;
    ownerPath: string;
    ownerSourceFingerprint: string;
    exported?: ReleaseMetadata;
  }>;
  assets: AssetRow[];
  assetUses: string[];
  assetExceptions: Array<{
    path?: string;
    id?: string;
    reason?: string;
  }>;
};
export type ActivatedResidueReading = {
  id: string;
  route: string;
  elements: number;
  colourValues: number;
  findings: string[];
  evidencePaths: string[];
};
export type ReleaseResidueInput = {
  root: string;
  registry: ReleaseResidueRegistry;
  identity: IdentityRuntimeEvidence;
  global: GlobalConvergenceEvidence;
  controls: ControlStatesEvidence;
  figures: FigureRuntimeEvidence;
  og: OgEvidence;
  baseline: BaselineBundle;
  current: BaselineBundle;
  approvedDeltas: readonly ApprovedDelta[];
  runtime?: unknown;
  activatedStateResidue?: readonly ActivatedResidueReading[];
  expectedActivatedStateIds?: readonly string[];
};
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const uniq = (values: readonly string[]) => [...new Set(values)].sort();
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
function pixelProblems(p: NonNullable<OgEvidence['manifest']['cards'][number]['pixels']>): string[] {
  const errors: string[] = [];
  if (p.decodedWidth !== 1200 || p.decodedHeight !== 630) errors.push('wrong decoded card dimensions');
  if (p.offPalettePixels !== 0) errors.push('off-palette pixels: ' + p.offPalettePixels);
  if (p.translucentPixels !== 0) errors.push('translucent pixels');
  if (!p.anchorsChecked) errors.push('no geometric pixel anchors checked');
  errors.push(...p.anchorsFailed.map(a => 'failed pixel anchor: ' + a));
  return errors;
}
const sourcePath = 'lib/brand-v2-release-residue.ts';
function files(root: string, dir: string): string[] {
  if (!existsSync(join(root, dir))) return [];
  return readdirSync(join(root, dir), {
    withFileTypes: true
  }).flatMap(e => {
    const path = dir + '/' + e.name;
    if (e.isSymbolicLink()) throw Error('Symlink in residue inventory: ' + path);
    return e.isDirectory() ? files(root, path) : [path];
  }).sort();
}
const assetExtensions = new Set(['.avif', '.gif', '.glb', '.ico', '.jpeg', '.jpg', '.png', '.stl', '.svg', '.ttf', '.urdf', '.webp', '.woff', '.woff2']);
const generated = (path: string) => /^public\/(og|structured-images|pagefind)\//.test(path);
const normalSvg = (text: string) => text.replace(/<!--[\s\S]*?-->/g, '').replace(/\s(?:class|style|fill|stroke|stroke-width|opacity)=["'][^"']*["']/g, '').replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
export function residueSvgSemanticHash(text: string): string {
  return configurationFingerprint(normalSvg(text));
}
const legacyName = /(?:\brobot-wiki\b|\bRobot-Wiki\b|\bROBOT WIKI\b)/g;
const legacyDescriptor = /robotics\s+encyclopa?edia/i;
const oldSignal = new Set(['#245edb', '#245fff']);
const oldGround = new Set(['#f4f3ef', '#fbfaf7', '#eceae4']);
/** CSS and Three.js literals are compared in their rendered sRGB space. */
export function normalizedPaints(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(/#[a-f\d]{3,8}\b|0x[a-f\d]{6}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|\bcolor\([^)]*\)/gi)) {
    const raw = m[0].toLowerCase();
    if (raw.startsWith('color(') && /new\s+(?:THREE\.)?$/.test(text.slice(0, m.index))) continue;
    const c = new Color();
    let parsed = false;
    if (/^0x[a-f\d]{6}$/.test(raw)) {
      c.setHex(parseInt(raw.slice(2), 16));
      parsed = true;
    } else if (/^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/.test(raw)) {
      c.setStyle(raw.length === 5 ? raw.slice(0, 4) : raw.length === 9 ? raw.slice(0, 7) : raw);
      parsed = true;
    } else {
      const call = /^(rgba?|hsla?|color)\((.*)\)$/.exec(raw);
      if (call) {
        const parts = call[2].split('/')[0].trim().split(/[\s,]+/);
        if (call[1].startsWith('rgb') && parts.length >= 3 && parts.slice(0, 3).every(p => /^[\d.]+%?$/.test(p))) {
          const channels = parts.slice(0, 3).map(v => parseFloat(v) / (v.endsWith('%') ? 100 : 255));
          c.setRGB(channels[0], channels[1], channels[2], SRGBColorSpace);
          parsed = true;
        } else if (call[1].startsWith('hsl') && parts.length >= 3 && /^[\d.]+(?:deg|turn|rad|grad)?$/.test(parts[0]) && parts.slice(1, 3).every(v => /^[\d.]+%$/.test(v))) {
          const h = parseFloat(parts[0]) * (parts[0].endsWith('turn') ? 1 : parts[0].endsWith('grad') ? 1 / 400 : parts[0].endsWith('rad') ? 1 / (2 * Math.PI) : 1 / 360);
          c.setHSL(h, parseFloat(parts[1]) / 100, parseFloat(parts[2]) / 100, SRGBColorSpace);
          parsed = true;
        } else if (call[1] === 'color' && parts[0] === 'srgb' && parts.length === 4) {
          const channels = parts.slice(1).map(Number);
          if (channels.every(Number.isFinite)) {
            c.setRGB(channels[0], channels[1], channels[2], SRGBColorSpace);
            parsed = true;
          }
        }
      }
    }
    found.push(parsed ? '#' + c.getHexString() : raw.includes('${') ? 'dynamic:' + raw : 'unparsed:' + raw);
  }
  for (const m of text.matchAll(/new\s+(?:THREE\.)?Color\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g)) found.push('#' + new Color(Number(m[1]), Number(m[2]), Number(m[3])).getHexString());
  return uniq(found);
}

/** Exact validator vocabulary, not a paint exemption. Only this complete
 * classifier entry is removed before the literal scan; another occurrence
 * in the same file still fails. */
export const SOURCE_LITERAL_CONTEXTS = [{
  path: 'lib/figure-system-paint.ts',
  context: "  ['#245fff', 'signal'],",
  reason: 'Negative source-paint classifier names the retired signal so an authored literal can be rejected.'
}] as const;
export const RELEASE_MIGRATION_MAP = [{
  from: 'robot-wiki / Robot-Wiki / ROBOT WIKI public names',
  to: 'Robot Wiki',
  basis: 'VAL-B2-ID-001; technical URLs and identifiers retain their own contexts'
}, {
  from: 'Robotics encyclopaedia / encyclopedia descriptor',
  to: 'Citation-first encyclopedia of modern robot learning.',
  basis: 'VAL-B2-ID-002'
}, {
  from: '#245EDB and #245FFF signal',
  to: '#3B6EA8 figure accent; ink links and controls',
  basis: 'VAL-B2-VIZ-003; owner decisions 2026-10-10 and 2026-10-19'
}, {
  from: '#F4F3EF / #FBFAF7 / #ECEAE4 ground',
  to: '#FAFAF8 reading ground',
  basis: 'VAL-B2-COL-001 research-page successor'
}, {
  from: 'IBM Plex Sans display',
  to: 'DM Sans web display; registered Tektur offline cards',
  basis: 'VAL-B2-TYPE-003 and VAL-B2-ID-005'
}, {
  from: 'home-only grid / no bounded dark surfaces / no permitted elevation / 2-3-4-only radius',
  to: 'sealed VAL-B2 criteria and explicit research-page successors',
  basis: 'VAL-B2-RES-007'
}] as const;
export function sourcePaintReading(path: string, source: string) {
  let text = /\.mdx?$/.test(path) ? source : stripComments(source);
  const allowances = SOURCE_LITERAL_CONTEXTS.filter(e => e.path === path);
  for (const e of allowances) {
    if (text.split(e.context).length !== 2) throw Error('Stale source-literal context: ' + path);
    text = text.replace(e.context, '');
  }
  return {
    path,
    paints: normalizedPaints(text),
    text,
    allowances
  };
}
export function legacyAcceptanceRestrictions(text: string): string[] {
  const active = stripComments(text);
  const patterns = [/home[- ]only\s+grid/i, /no\s+bounded\s+dark\s+surfaces/i, /no\s+permitted\s+elevation/i, /(?:2\s*[,/]\s*3\s*[,/]\s*4|2\/3\/4)[- ]only\s+radius/i];
  return patterns.filter(p => p.test(active)).map(p => p.source);
}
function routeFromHtml(path: string): string | null {
  if (path === 'out/index.html') return '/';
  if (['out/404.html', 'out/404/index.html'].includes(path)) return '/404/';
  if (!path.endsWith('.html')) return null;
  return '/' + path.slice(4).replace(/index\.html$/, '').replace(/\.html$/, '/');
}
function localAsset(url: string): string | null {
  if (url.startsWith('#') || url.startsWith('data:')) return null;
  try {
    const path = new URL(url, 'https://robot-wiki.com').pathname;
    return path.startsWith('/_next/') || path.startsWith('/pagefind/') || /^\/(favicon.ico|icon.svg|apple-icon.png)$/.test(path) ? null : path.replace(/^\//, '');
  } catch {
    return null;
  }
}
function fieldStrings(value: unknown, technical = false): string[] {
  if (typeof value === 'string') return technical || /^(https?:\/\/|\/)/.test(value) ? [] : [value];
  if (Array.isArray(value)) return value.flatMap(v => fieldStrings(v));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, v]) => fieldStrings(v, ['url', '@id', 'href', 'image', 'logo', 'item', 'target'].includes(key)));
  return [];
}
export function collectReleaseResidueEvidence(input: ReleaseResidueInput): {
  populations: Record<string, string[]>;
  verdicts: Record<string, ResidueVerdict[]>;
} {
  const {
    root,
    registry
  } = input;
  const populations: Record<string, string[]> = {};
  const verdicts: Record<string, ResidueVerdict[]> = {};
  const emit = (assertion: string, rows: ResidueVerdict[]) => {
    if (!rows.length) throw Error(assertion + ': empty applicable population');
    const members = rows.map(r => r.id);
    if (new Set(members).size !== members.length) throw Error(assertion + ': duplicate result member');
    const key = ASSERTION_POPULATION_SOURCES[assertion];
    if (!key) throw Error('Unknown residue assertion ' + assertion);
    if (populations[key] && !same(populations[key], members)) throw Error('Inconsistent canonical population ' + key);
    populations[key] = members.sort();
    verdicts[assertion] = rows;
  };
  const row = (id: string, failures: string[], observed: unknown, evidencePaths: string[], mode: ResidueVerdict['mode'] = 'automated-machine'): ResidueVerdict => ({
    id,
    failures: uniq(failures),
    observed,
    evidencePaths: uniq(evidencePaths),
    mode
  });
  const publicRoutes = releasePublicRoutes();
  const allRoutes = [...publicRoutes, '/404/'];
  const exportPaths = files(root, 'out').filter(p => p.endsWith('.html'));
  const exportRoutes = uniq(exportPaths.map(routeFromHtml).filter((p): p is string => p !== null));
  const appFixed = files(root, 'app').filter(p => p.endsWith('/page.tsx') && !p.includes('[')).map(p => '/' + p.slice(4).replace(/page\.tsx$/, ''));
  const xml = readFileSync(join(root, 'out/sitemap.xml'), 'utf8');
  const sitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => {
    const u = new URL(m[1]);
    if (u.origin !== 'https://robot-wiki.com') throw Error('Foreign sitemap origin');
    return u.pathname;
  });
  const expectedSitemap = publicRoutes.filter(r => !(NON_INDEXABLE_ROUTES as readonly string[]).includes(r));
  const routeIssues: string[] = [];
  if (!same(registry.routes.public.map(r => r.path), publicRoutes)) routeIssues.push('module/fixed registry route set differs');
  if (files(root, 'app').some(p => p.endsWith('/page.tsx') && p.includes('[') && !['app/(content)/[domain]/page.tsx', 'app/(content)/[domain]/[slug]/page.tsx'].includes(p))) routeIssues.push('unregistered dynamic app route');
  if (!same(appFixed, [...FIXED_PUBLIC_ROUTES])) routeIssues.push('app fixed route inventory differs');
  if (!same(exportRoutes, allRoutes)) routeIssues.push('export HTML route inventory differs');
  if (!same(sitemap, expectedSitemap)) routeIssues.push('sitemap must equal the indexable route set');
  if (!same(registry.metadata.map(m => m.routeId.replace(/^route:/, '')), allRoutes)) routeIssues.push('metadata owner route set differs');
  if (publicRoutes.length !== 75 || expectedSitemap.length !== 73 || registry.routes.public.filter(r => r.routeKind === 'article').length !== 57) routeIssues.push('sealed route counts differ');
  if (registry.routes.notFound.path !== '/404/' || registry.routes.notFound.publicContent !== false) routeIssues.push('404 must be separately registered');
  const union = uniq([...allRoutes, ...exportRoutes, ...sitemap, ...registry.routes.public.map(r => r.path), ...registry.metadata.map(m => m.routeId.replace(/^route:/, ''))]);
  emit('VAL-B2-CONT-007', union.map(route => row('route:' + route, routeIssues, {
    route,
    public: publicRoutes.includes(route),
    indexed: sitemap.includes(route),
    exported: exportRoutes.includes(route),
    metadata: registry.metadata.some(m => m.routeId === 'route:' + route)
  }, ['contract/brand-v2-registries.json', 'out/sitemap.xml', 'data/modules.ts', 'app/sitemap.ts'])));
  const heads = new Map<string, ReleaseMetadata>();
  const metadataRows = allRoutes.map(route => {
    const failures: string[] = [];
    const ledger = registry.metadata.find(m => m.routeId === 'route:' + route);
    const expected = expectedReleaseMetadata(root, route);
    const path = route === '/404/' ? 'out/404.html' : route === '/' ? 'out/index.html' : 'out' + route + 'index.html';
    try {
      const actual = parseExportedMetadata(readFileSync(join(root, path), 'utf8'));
      heads.set(route, actual);
      failures.push(...metadataDifferences(expected, actual).map(f => 'export: ' + f));
    } catch (e) {
      failures.push(String(e));
    }
    if (!ledger) failures.push('missing metadata owner');else {
      if (!ledger.exported) failures.push('metadata ledger lacks exported expectations');else failures.push(...metadataDifferences(expected, ledger.exported).map(f => 'ledger: ' + f));
      if (configurationFingerprint(readFileSync(join(root, ledger.ownerPath), 'utf8').replace(/\r\n/g, '\n')) !== ledger.ownerSourceFingerprint) failures.push('stale metadata owner source');
    }
    return row('metadata:' + route, failures, {
      route,
      expected,
      actual: heads.get(route),
      owner: ledger?.ownerPath
    }, [path, 'contract/brand-v2-registries.json', ledger?.ownerPath ?? sourcePath]);
  });
  emit('VAL-B2-CONT-008', metadataRows);
  let runtime: ReleaseResidueRuntime | null = null;
  const runtimeFailures: string[] = [];
  try {
    const artifact = input.runtime ?? JSON.parse(readFileSync(join(root, RELEASE_RESIDUE_PATH), 'utf8'));
    runtime = readReleaseResidueRuntime({
      artifact,
      fingerprint: releaseResidueFingerprint(root),
      routes: allRoutes
    });
  } catch (e) {
    runtimeFailures.push(String(e));
  }
  const observations = (route: string): ResidueObservation[] => runtime?.observations.filter(o => o.route === route) ?? [];
  const activated = input.activatedStateResidue ?? [];
  const activatedFailures: string[] = [];
  if (!input.expectedActivatedStateIds?.length || !same(activated.map(x => x.id), input.expectedActivatedStateIds ?? [])) activatedFailures.push('missing, duplicate or incomplete activated-state residue matrix');
  if (activated.some(x => x.elements <= 0 || x.colourValues <= 0 || !x.evidencePaths.length)) activatedFailures.push('empty activated-state measurement');
  const activatedFor = (route: string, prefixes: readonly string[]) => activated.filter(x => x.route === route).flatMap(x => x.findings.filter(f => prefixes.some(p => f.startsWith(p))).map(f => x.id + ': ' + f));
  const runtimeRows = (check: (o: ResidueObservation) => string[], extra: (route: string) => string[] = () => [], prefixes: readonly string[] = []) => allRoutes.map(route => row('route:' + route, [...runtimeFailures, ...activatedFailures, ...observations(route).flatMap(check), ...extra(route), ...activatedFor(route, prefixes)], {
    route,
    observations: observations(route).map(o => ({
      viewport: o.viewport,
      elements: o.elementCount,
      texts: o.texts.length,
      rawPaints: o.rawPaints.length,
      fonts: o.fonts.length
    }))
  }, [RELEASE_RESIDUE_PATH], 'browser-state'));
  emit('VAL-B2-RES-001', runtimeRows(o => o.texts.filter(t => !t.technicalContext && Boolean(t.value.match(legacyName))).map(t => o.viewport + ' ' + t.kind + ' ' + t.selector + ': ' + t.value), () => [], ['legacy-public-identity:']));
  emit('VAL-B2-RES-002', runtimeRows(o => o.texts.filter(t => legacyDescriptor.test(t.value)).map(t => 'retired descriptor at ' + t.selector), route => fieldStrings(heads.get(route)).filter(t => legacyDescriptor.test(t)).map(t => 'metadata: ' + t), ['legacy-descriptor:']));
  emit('VAL-B2-RES-005', runtimeRows(o => o.displayFaces.filter(f => /IBM Plex Sans/i.test(f.family)).map(f => 'retired display face ' + f.selector), () => [], ['legacy-display-face:']));
  const globalFor = (route: string, predicates: readonly string[]) => input.global.observations.filter(o => o.route === route).flatMap(o => o.page.findings.filter(f => predicates.includes(f.predicate) && !f.exemption).map(f => o.viewport + ' ' + f.predicate + ' ' + f.element + ' ' + f.detail));
  emit('VAL-B2-RES-006', runtimeRows(o => o.rawPaints.filter(p => oldSignal.has(normalizedPaints(p.value)[0] ?? '')).map(p => 'retired signal attribute ' + p.selector), route => globalFor(route, ['primary-ink-fill', 'action-colour-fill', 'success-in-grey-or-accent', 'accent-as-warning', 'state-non-colour-cue']).concat(input.controls.statusChips.filter(c => c.route === route && c.lime).map(c => 'lime status paint ' + c.text), input.controls.selections.filter(c => c.route === route && c.paint.lime).map(c => 'lime selection paint ' + c.element)), ['blue-filled-action:', 'retired-lime:']));
  const graph = evidenceClosureGraph(root);
  const closure = deriveEvidenceClosure({
    root,
    entries: routeEntryModules(graph),
    computedSpecifiers: [ARTICLE_BODY_COMPUTED_IMPORT]
  });
  const firstPartyVectorPaths = registry.assets.filter(a => a.path.endsWith('.svg') && a.category !== 'official-mark' && (!a.sourceRegistryId || figureKind(IMAGES.find(image => image.id === a.sourceRegistryId)!) === 'original-schematic')).map(a => 'public/' + a.path);
  const activeSourcePaths = uniq([...closure.files, ...firstPartyVectorPaths, ...files(root, 'lib').filter(p => /^lib\/og-(card|renderer)/.test(p)), ...['README.md', 'CONTRIBUTING.md', 'library/design-system.md'].filter(p => existsSync(join(root, p)))]).filter(p => /\.(tsx?|css|mdx|md|svg)$/.test(p));
  const sourcePaints = activeSourcePaths.map(path => sourcePaintReading(path, readFileSync(join(root, path), 'utf8')));
  const paintMembers = uniq([...allRoutes.map(r => 'route:' + r), ...sourcePaints.map(s => 'source:' + s.path), ...input.og.manifest.cards.map(c => 'og-card:' + c.cardId)]);
  for (const [assertion, retired] of [['VAL-B2-RES-003', oldSignal], ['VAL-B2-RES-004', oldGround]] as const) {
    emit(assertion, paintMembers.map(id => {
      const failures: string[] = [];
      let observed: unknown = {
        id
      };
      const evidencePaths = [sourcePath];
      if (id.startsWith('source:')) {
        const s = sourcePaints.find(s => id === 'source:' + s.path)!;
        const hits = s.paints.filter(p => retired.has(p));
        const unknown = s.paints.filter(p => p.startsWith('unparsed:'));
        if (unknown.length) failures.push('unparsed source paints: ' + unknown.join(','));
        const annotatedHistory = /\.md$/.test(s.path) && hits.every(p => s.text.split('\n').filter(line => line.toLowerCase().includes(p)).every(line => /v1|previous|superseded|retired|replace|legacy/i.test(line)));
        if (hits.length && !annotatedHistory) failures.push('retired source paints: ' + hits.join(','));
        observed = {
          path: s.path,
          hits,
          annotatedHistory,
          validatorContexts: s.allowances,
          dynamicColourExpressions: s.paints.filter(p => p.startsWith('dynamic:'))
        };
        evidencePaths.push(s.path);
      } else if (id.startsWith('route:')) {
        const route = id.slice(6);
        failures.push(...runtimeFailures, ...activatedFailures, ...activatedFor(route, assertion === 'VAL-B2-RES-003' ? ['legacy-signal:'] : ['legacy-surface:']));
        for (const o of observations(route)) {
          for (const p of Object.keys(o.computedPaints)) if (normalizedPaints(p).some(c => retired.has(c))) failures.push('retired computed paint ' + p);
          for (const p of o.rawPaints) if (normalizedPaints(p.value).some(c => retired.has(c))) failures.push('retired attribute ' + p.selector);
        }
        observed = {
          route,
          captured: observations(route).length
        };
        evidencePaths.push(RELEASE_RESIDUE_PATH);
      } else {
        const card = input.og.manifest.cards.find(c => id === 'og-card:' + c.cardId)!;
        const pixels = card.pixels;
        if (!pixels) failures.push('missing decoded pixel report');else failures.push(...pixelProblems(pixels));
        observed = {
          card: card.cardId,
          pixels
        };
        evidencePaths.push('evidence/brand-v2/og-cards/manifest.json');
      }
      return row(id, failures, observed, evidencePaths, id.startsWith('route:') ? 'browser-state' : 'automated-machine');
    }));
  }
  const tests = files(root, 'tests').filter(p => /\.(tsx?|mjs|mts)$/.test(p));
  emit('VAL-B2-RES-007', tests.map(path => row('test:' + path, legacyAcceptanceRestrictions(readFileSync(join(root, path), 'utf8')).map(m => 'active v1 restriction: ' + m), {
    path,
    sha256: digest(readFileSync(join(root, path)))
  }, [path])));
  const publicPhysical = files(root, 'public').filter(p => assetExtensions.has(extname(p)) && !generated(p));
  const registered = new Map(registry.assets.map(a => [a.id, a]));
  const physicalIds = publicPhysical.map(p => (lstatSync(join(root, p)).isSymbolicLink() ? 'symlink:' : '') + 'asset:' + p.slice(7));
  const renderedAssets = uniq((runtime?.observations ?? []).flatMap(o => [...o.assets.map(a => localAsset(a.url)), ...o.resources.filter(url => {
    try {
      return assetExtensions.has(extname(new URL(url).pathname));
    } catch {
      return false;
    }
  }).map(localAsset)]).filter((p): p is string => Boolean(p) && !generated('public/' + p)).map(p => 'asset:' + p));
  const assetUnion = uniq([...registry.assets.map(a => a.id), ...physicalIds.map(p => p.replace(/^symlink:/, '')), ...registry.assetUses, ...renderedAssets]);
  const parity = validateExactRegistryParity(physicalIds, registry.assets.map(a => a.id), registry.assetUses);
  const figureGraph = expectedFigureGraph(root);
  const independentImageUses = new Set([...figureGraph].filter(([route]) => route !== '/credits/').flatMap(([, ids]) => ids).concat(COMPANIES.flatMap(company => company.logo ? [company.logo] : [])));
  const expectedCredits = IMAGES.filter(image => !WITHHELD_MARKS[image.id as keyof typeof WITHHELD_MARKS]).map(image => image.id);
  const creditsReadings = input.figures.observations.filter(o => o.route === '/credits/');
  const creditParityFailures = creditsReadings.length !== 2 || creditsReadings.some(o => !same(o.figures.map(f => f.imageId), expectedCredits)) ? ['credits population differs from non-withheld registered images'] : [];
  const baselineFailures = compareBaseline(input.baseline, input.current, input.approvedDeltas).failures.filter(f => f.manifest === 'assets-svg' || f.reason === 'invalid-approved-delta');
  const assetRows = assetUnion.map(id => {
    const asset = registered.get(id);
    const failures = parity.filter(f => f.memberId === id).map(f => f.reason);
    if (!asset) failures.push('asset is not registered');else {
      if (!asset.ownershipId) failures.push('asset has no ownership ID');
      if (existsSync(join(root, 'public', asset.path)) && digest(readFileSync(join(root, 'public', asset.path))) !== asset.byteHash) failures.push('current file differs from registered hash');
    }
    return {
      id,
      asset,
      failures
    };
  });
  emit('VAL-B2-IMG-007', assetRows.map(({
    id,
    asset,
    failures
  }) => {
    const own = [...failures, ...runtimeFailures];
    if (asset?.sourceRegistryId) {
      const image = IMAGES.find(i => i.id === asset.sourceRegistryId);
      if (!image || image.file.replace(/^\//, '') !== asset.path) own.push('image registry ID does not resolve to this asset');
      if (!independentImageUses.has(asset.sourceRegistryId)) own.push('image is orphaned outside its own registry and credits');
      const withheld = WITHHELD_MARKS[asset.sourceRegistryId as keyof typeof WITHHELD_MARKS];
      if (!withheld && !renderedAssets.includes(id)) own.push('registered image has no rendered use');
      if (withheld && renderedAssets.includes(id)) own.push('withheld image has a rendered use');
      own.push(...creditParityFailures);
    }
    return row(id, own, {
      asset,
      physical: physicalIds.includes(id),
      sourceUse: registry.assetUses.includes(id),
      independentImageUse: asset?.sourceRegistryId ? independentImageUses.has(asset.sourceRegistryId) : null,
      renderedUse: renderedAssets.includes(id)
    }, ['contract/brand-v2-registries.json', RELEASE_RESIDUE_PATH, 'evidence/brand-v2/figures.json', ...(asset ? ['public/' + asset.path] : [])]);
  }));
  emit('VAL-B2-IMG-009', assetRows.map(({
    id,
    asset,
    failures
  }) => {
    const own = [...failures];
    if (asset) {
      const memberIds = ['registered-image:' + asset.sourceRegistryId, 'public-svg:' + asset.path];
      own.push(...baselineFailures.filter(f => f.reason === 'invalid-approved-delta' || memberIds.includes(f.memberId ?? '')).map(f => f.reason + ': ' + f.memberId));
      if (asset.semanticHash && existsSync(join(root, 'public', asset.path)) && residueSvgSemanticHash(readFileSync(join(root, 'public', asset.path), 'utf8')) !== asset.semanticHash) own.push('SVG semantic registry hash differs');
    }
    return row(id, own, {
      asset,
      baselineCommit: input.baseline.source.commit
    }, ['contract/brand-v2-registries.json', 'evidence/brand-v2/baseline/assets-svg.json']);
  }));
  const marks = registry.assets.filter(a => a.category === 'official-mark');
  emit('VAL-B2-IMG-006', marks.map(asset => {
    const failures = [...runtimeFailures];
    const image = IMAGES.find(i => i.id === asset.sourceRegistryId);
    const withheld = asset.sourceRegistryId ? WITHHELD_MARKS[asset.sourceRegistryId as keyof typeof WITHHELD_MARKS] : undefined;
    const draws = (runtime?.observations ?? []).flatMap(o => o.logos.filter(l => localAsset(l.file) === asset.path).map(l => ({
      ...l,
      route: o.route,
      viewport: o.viewport
    })));
    if (!image || !image.sourceUrl || !image.creator || legalBasis(image) !== 'official-identification-use' || !attributionText(image)) failures.push('official mark lacks required provenance/attribution');
    if (!draws.length && !withheld) failures.push('official mark has no rendered treatment observations');
    if (withheld && draws.length) failures.push('withheld mark was rendered');
    for (const l of draws) {
      if (l.filter !== 'none' || l.inkFilter !== 'none' || l.shadow !== 'none' || l.border.some(x => x !== 0) || l.padding.some(x => x !== 0) || l.background !== 'rgba(0, 0, 0, 0)') failures.push('unapproved logo surface/effect ' + l.route);
      if (normalizedPaints(l.ink)[0] !== '#6c6b66' || !l.mask.includes(asset.path) || l.width <= 0 || l.height <= 0) failures.push('unapproved or empty ink mask ' + l.route);
    }
    const credits = input.figures.observations.filter(o => o.route === '/credits/').flatMap(o => o.figures.filter(f => f.imageId === asset.sourceRegistryId));
    if (!withheld && (!credits.length || credits.some(c => !c.credit.trim() || !c.creditLinks.some(l => l.href === image?.sourceUrl)))) failures.push('credits omit original mark attribution');
    return row(asset.id, failures, {
      asset,
      draws,
      withheld: withheld ?? null,
      approvedTreatment: 'Owner decision 19 October 2026: plate-less secondary-ink silhouette; source bytes preserved',
      blockFillCeiling: BLOCK_FILL
    }, ['contract/design-integrity.md', 'components/ui/logo-mark.tsx', RELEASE_RESIDUE_PATH, 'evidence/brand-v2/figures.json'], 'browser-state');
  }));
  const sealFailures: string[] = [];
  try {
    reconcileAssetSeal({
      root,
      shippedPaths: firstPartyVisualAssets(registry.assets).map(a => a.path),
      seal: readAssetSeal(root)
    });
  } catch (e) {
    sealFailures.push(String(e));
  }
  const symbolPaths = uniq([...publicPhysical, ...files(root, 'app').filter(p => /(?:^|\/)(?:favicon|icon|apple-icon)\d*\./i.test(p))]);
  const symbols = validateNoInventedSymbols(symbolPaths);
  const iconFailures = validateApprovedTabIcons(path => existsSync(join(root, path)) ? readFileSync(join(root, path)) : null);
  const symbolMembers = uniq([...symbolPaths.map(p => 'file:' + p), ...allRoutes.map(r => 'route:' + r)]);
  emit('VAL-B2-IMG-010', symbolMembers.map(id => {
    const failures: string[] = [...sealFailures];
    if (id.startsWith('file:')) {
      const path = id.slice(5);
      failures.push(...symbols.filter(f => f.memberId === path).map(f => f.reason), ...iconFailures.filter(f => f.memberId === path).map(f => f.reason));
    } else {
      const route = id.slice(6);
      failures.push(...runtimeFailures);
      for (const o of observations(route)) {
        for (const declaration of o.iconDeclarations) if (!isApprovedTabIconDeclaration(declaration)) failures.push('unapproved icon/manifest declaration ' + declaration);
        for (const e of o.effects) if (e.mask !== 'none' && !e.logoId) failures.push('unregistered CSS mask ' + e.selector);
      }
      failures.push(...input.identity.observations.filter(o => o.route === route).flatMap(o => o.symbolNodesInLockups));
    }
    return row(id, failures, {
      id
    }, [RELEASE_RESIDUE_PATH, 'contract/brand-v2-asset-seal.json', 'app/layout.tsx']);
  }));
  const imagery = firstPartyImageryVerdicts(registry.assets);
  emit('VAL-B2-RES-008', [...allRoutes.map(route => row('route:' + route, [...runtimeFailures, ...activatedFailures, ...activatedFor(route, ['glass:']), ...globalFor(route, ['bento-grid', 'glow', 'shadow', 'texture', 'unregistered-device', 'technical-glyph']), ...observations(route).flatMap(o => o.effects.filter(e => e.backdrop !== 'none').map(e => 'glass/backdrop ' + e.selector))], {
    route
  }, [RELEASE_RESIDUE_PATH, 'evidence/brand-v2/global-convergence.json'], 'browser-state')), ...registry.assets.map(asset => row(asset.id, imagery.get(asset.id)?.failures ?? ['missing provenance reading'], imagery.get(asset.id)?.observed ?? asset, ['data/images.ts', 'contract/brand-v2-registries.json']))]);
  const cards = input.og.manifest.cards;
  const structured = cards.flatMap(c => c.structuredVariants);
  const generatedRows = cards.flatMap(c => [c.asset, ...c.structuredVariants].map(a => ({
    card: c,
    asset: a
  })));
  const generatedFailures: string[] = [];
  const expectedOg = cards.map(c => c.asset.path);
  const expectedStructured = structured.map(a => a.path);
  for (const tree of ['public', 'out']) {
    if (!same(files(root, tree + '/og').filter(p => p.endsWith('.png')).map(p => p.slice(tree.length)), expectedOg)) generatedFailures.push(tree + ' OG physical tree differs');
    if (!same(files(root, tree + '/structured-images').filter(p => p.endsWith('.png')).map(p => p.slice(tree.length)), expectedStructured)) generatedFailures.push(tree + ' structured-image physical tree differs');
  }
  if (cards.length !== 58 || cards.filter(c => c.kind === 'article').length !== 57 || structured.length !== 114) generatedFailures.push('generated corpus must be 58 OG cards plus 114 structured images');
  if (new Set(cards.filter(c => c.kind === 'article').map(c => c.asset.sha256)).size !== 57) generatedFailures.push('duplicate article-card hashes');
  emit('VAL-B2-RES-009', generatedRows.map(({
    card,
    asset
  }) => {
    const failures = [...generatedFailures];
    const bytes = input.og.shipped.get(asset.path);
    if (!bytes || digest(bytes) !== asset.sha256) failures.push('generated bytes missing or changed');
    if (!card.pixels) failures.push('missing pixel validation');else failures.push(...pixelProblems(card.pixels));
    if (card.strings.some(s => legacyDescriptor.test(s.text) || Boolean(s.text.match(legacyName)))) failures.push('retired generated text');
    return row('generated:' + asset.path, failures, {
      card: card.cardId,
      asset,
      pixels: card.pixels
    }, ['evidence/brand-v2/og-cards/manifest.json', 'public' + asset.path]);
  }));
  emit('VAL-B2-RES-010', allRoutes.map(route => row('metadata:' + route, [...runtimeFailures, ...activatedFailures, ...activatedFor(route, ['mixed-accessible-identity:']), ...fieldStrings(heads.get(route)).filter(v => legacyDescriptor.test(v) || Boolean(v.match(legacyName))).map(v => 'mixed metadata: ' + v), ...observations(route).flatMap(o => o.texts.filter(t => t.kind !== 'visible' && !t.technicalContext && (legacyDescriptor.test(t.value) || Boolean(t.value.match(legacyName)))).map(t => t.kind + ' ' + t.selector + ': ' + t.value))], {
    route,
    metadata: heads.get(route)
  }, ['out' + (route === '/' ? '/index.html' : route === '\/404/' ? '/404.html' : route + 'index.html'), RELEASE_RESIDUE_PATH], 'browser-state')));
  const assertion = extractBrandV2Assertions(readFileSync(join(root, 'contract/design-integrity.md'), 'utf8')).find(a => a.id === 'VAL-B2-BASE-008');
  if (!assertion) throw Error('Missing technical identifier requirement');
  const literals = deriveTechnicalIdentifiers(assertion.requirement);
  const technical = literals.flatMap(literal => {
    const occurrences = closure.modules.flatMap(path => stripComments(readFileSync(join(root, path), 'utf8')).split('\n').flatMap((line, i) => line.includes(literal) ? [{
      literal,
      path,
      line: i + 1,
      text: line.trim()
    }] : []));
    if (!occurrences.length) return [{
      literal,
      path: 'missing',
      line: 0,
      text: ''
    }];
    return occurrences;
  });
  emit('VAL-B2-BASE-008', technical.map(o => {
    const failures: string[] = [];
    if (!o.text) failures.push('identifier occurs in no reachable product module');
    try {
      technicalIdentifierWitness(o.literal, input.identity);
    } catch (e) {
      failures.push(String(e));
    }
    const display = input.identity.observations.flatMap(r => r.technicalIdentifierVisibleMatches).filter(s => s.includes(o.literal));
    failures.push(...display.map(s => 'technical identifier used as public identity: ' + s));
    return row('technical:' + o.literal + ':' + o.path + ':' + o.line, failures, o, [o.path, 'evidence/brand-v2/identity-runtime.json']);
  }));
  const resourceFailures = (runtime?.observations ?? []).flatMap(o => o.fonts.filter(url => !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)).map(url => 'font request escaped static origin: ' + url));
  const techniques = [['source-literals', sourcePaints.length], ['raw-attributes', runtime?.observations.reduce((n, o) => n + o.rawPaints.length, 0) ?? 0], ['computed-states', activated.length], ['generated-pixels', cards.filter(c => c.pixels).length], ['resources-fonts', runtime?.observations.reduce((n, o) => n + o.fonts.length, 0) ?? 0], ['asset-provenance', registry.assets.length], ['migration-map', RELEASE_MIGRATION_MAP.length], ['active-runtime-documentation', activeSourcePaths.filter(p => p.endsWith('.md')).length]] as const;
  emit('VAL-B2-CONT-009', techniques.map(([id, count]) => row('technique:' + id, [...(count ? [] : ['empty sweep population']), ...runtimeFailures, ...(id === 'computed-states' ? activatedFailures : []), ...(id === 'resources-fonts' ? resourceFailures : [])], {
    id,
    count,
    migrationMap: id === 'migration-map' ? RELEASE_MIGRATION_MAP : undefined,
    normalization: 'CSS hex/rgb/hsl and Three linear RGB normalized to sRGB; decoded OG pixel tolerance3'
  }, [sourcePath, RELEASE_RESIDUE_PATH, 'evidence/brand-v2/global-convergence.json', 'evidence/brand-v2/og-cards/manifest.json'])));
  return {
    populations,
    verdicts
  };
}
