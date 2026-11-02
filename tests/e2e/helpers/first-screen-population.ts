import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publishedModules } from '../../../data/modules.ts';
import { SCENE_TARGETS } from '../../../lib/motion-scene-registry.ts';
import { MOTION_CLIPS } from '../../../lib/motion-clips.ts';
import { EXPLAINER_MOUNTS } from '../../../components/explainers/mounts.ts';
import { getImage, figureKind } from '../../../data/images.ts';
import { LAZY_MDX_CLIENT_MODULES } from '../../../lib/recma-lazy-mounts.mjs';
import type { FirstScreenMount } from '../../helpers/first-screen-contract.ts';

type RegistrySource = { id: string; component: string; sourcePath: string; cases: { kind: string }[] };
type RegistryMount = { id: string; sourceId: string; route: string; ownerPath: string; ordinal: number };
type Registry = { interactive: { sources: RegistrySource[]; mounts: RegistryMount[] } };

const normalize = (name: string) => name.replace(/-/g, '').toLowerCase();
const body = (source: string) => source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
  .replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const count = (source: string, tag: string) => [...source.matchAll(new RegExp(`<${tag}\\b`, 'g'))].length;

/**
 * The interactive registry owns widgets, while the existing scene,
 * explainer and clip authorities own their mounts. The MDX source owns
 * authored questions and the explicitly registered sortable MDX tables.
 * No historical route count or exclusion list controls this join.
 */
export function firstScreenPopulation(root = process.cwd()) {
  const routes = publishedModules().map((module) => `/${module.domain}/${module.slug}/`);
  if (!routes.length || new Set(routes).size !== routes.length) throw new Error('Empty or duplicate published article population');
  const texts = new Map(routes.map((route) => [route, body(readFileSync(join(root, 'content', `${route.slice(1, -1)}.mdx`), 'utf8'))]));
  const registry = JSON.parse(readFileSync(join(root, 'contract/brand-v2-registries.json'), 'utf8')) as Registry;
  if (!registry.interactive.sources.length || !registry.interactive.mounts.length) throw new Error('Empty canonical interactive source/mount registry');
  const sources = new Map(registry.interactive.sources.map((source) => [source.id, source]));
  if (sources.size !== registry.interactive.sources.length) throw new Error('Duplicate canonical interactive source');
  const componentNames: Record<string, string> = {};
  const registerName = (name: string) => {
    const key = normalize(name);
    if (componentNames[key] && componentNames[key] !== name) throw new Error(`Ambiguous DOM frame identity: ${name}`);
    componentNames[key] = name;
  };
  for (const source of sources.values()) registerName(source.component);
  const expected: FirstScreenMount[] = [];
  const add = (route: string, identity: string, source: string, operable: boolean, ordinal = 1) => {
    if (!texts.has(route)) throw new Error(`${source} names an unpublished article ${route}`);
    expected.push({ id: `mount:${route}:${identity}:${ordinal}`, route, identity, source, operable });
  };
  for (const mount of registry.interactive.mounts.filter((entry) => texts.has(entry.route))) {
    const source = sources.get(mount.sourceId);
    if (!source) throw new Error(`${mount.id} has no canonical source`);
    const expectedPath = `content/${mount.route.slice(1, -1)}.mdx`;
    if (mount.ownerPath !== expectedPath || count(texts.get(mount.route)!, source.component) < mount.ordinal) {
      throw new Error(`${mount.id} does not bind to its current article source`);
    }
    // These cases require a native action/choice; the default focus case
    // alone also exists on static figures with a method disclosure.
    const operable = source.cases.some((entry) => ['hover', 'reset', 'discrete-options', 'slider-boundaries', 'pairwise'].includes(entry.kind));
    add(mount.route, source.component, `${mount.sourceId} (${source.sourcePath})`, operable, mount.ordinal);
    if (expected.at(-1)!.id !== mount.id) throw new Error(`${mount.id}: inconsistent canonical mount identity`);
  }
  // Source discovery is independent of the serialized registry: removing a
  // registry row cannot make the expected DOM population quietly smaller.
  for (const [route, text] of texts) {
    const diagramOrdinals = new Map<string, number>();
    for (const match of text.matchAll(/<Image\b[^>]*\bid=["']([^"']+)["']/g)) {
      const image = getImage(match[1]);
      if (!image) throw new Error(`${route}: unregistered image ${match[1]}`);
      if (figureKind(image) !== 'original-schematic') continue;
      const ordinal = (diagramOrdinals.get(image.id) ?? 0) + 1;
      diagramOrdinals.set(image.id, ordinal);
      add(route, `diagram:${image.id}`, `data/images.ts#${image.id}`, false, ordinal);
    }
    for (const match of text.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"](@\/components\/interactive\/[^'"]+)['"]/g)) {
      for (const raw of match[1].split(',')) {
        const name = raw.trim();
        if (!name || name.startsWith('type ')) continue;
        if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) throw new Error(`${route}: unclassified interactive import ${name}`);
        const mounted = count(text, name);
        const registered = expected.filter((entry) => entry.route === route && entry.identity === name).length;
        if (mounted !== registered) throw new Error(`${route}: ${name} source/registry mount mismatch (${mounted} / ${registered})`);
      }
    }
    for (const [tag, identity] of [['SelfCheck', 'SelfCheck'], ['PredictThenReveal', 'PredictThenReveal']] as const) {
      for (let ordinal = 1; ordinal <= count(text, tag); ordinal++) add(route, identity, `${route}: authored ${tag}`, true, ordinal);
    }
    for (const match of text.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"](@\/components\/mdx\/[^'"]+)['"]/g)) {
      if (!LAZY_MDX_CLIENT_MODULES.has(match[2])) continue;
      for (const raw of match[1].split(',')) {
        const name = raw.trim();
        if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) throw new Error(`${route}: unclassified MDX client import ${name}`);
        registerName(name);
        for (let ordinal = 1; ordinal <= count(text, name); ordinal++) add(route, name, match[2], true, ordinal);
      }
    }
  }
  for (const scene of SCENE_TARGETS) add(scene.route, `scene:${scene.id}`, 'lib/motion-scene-registry.ts', true);
  for (const [id, mount] of Object.entries(EXPLAINER_MOUNTS)) add(`/${mount.article}/`, `explainer:${id}`, 'components/explainers/mounts.ts', true);
  for (const clip of Object.values(MOTION_CLIPS)) add(`${clip.route.replace(/\/$/, '')}/`, `clip:${clip.id}`, 'lib/motion-clips.ts', true);
  if (new Set(expected.map((entry) => entry.id)).size !== expected.length) throw new Error('Duplicate expected production mount identity');
  return { routes, expected, componentNames };
}
