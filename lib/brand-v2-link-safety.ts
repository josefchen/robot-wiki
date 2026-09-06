import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { z } from 'zod';
import { parseEvidenceArtifact } from './brand-v2-evidence-schema.ts';

/**
 * The outbound-link census `VAL-B2-BASE-007` is decided on, shared by the
 * sweep that walks the keyboard and the generator that records the row.
 *
 * The assertion has two halves and they are not the same kind of fact.
 *
 * Relationship safety is a property of the shipped bytes: an anchor either
 * carries `rel="noopener"` or it does not, and reading that needs no
 * browser. So the generator re-derives it here, from the export, on every
 * run. It is deliberately NOT read back out of the artifact: an evidence
 * file that stores its own verdict can only ever prove that nothing has
 * drifted since the sweep, and would bless a wrong verdict that was wrong
 * when it was written.
 *
 * Keyboard reachability is not decidable from the bytes. It depends on
 * layout, focusability and the tab order a browser actually builds, so it
 * comes from the persisted sweep, and the fingerprint below is what stops a
 * stale trace from standing in for a current one.
 */
export const LINK_SAFETY_EVIDENCE_PATH = 'evidence/brand-v2/link-safety.json';

export const LINK_SAFETY_SWEEP_MODULE =
  'tests/e2e/brand-v2-link-safety.spec.ts';

export const LINK_SAFETY_CENSUS_MODULE = 'lib/brand-v2-link-safety.ts';

export const LINK_SAFETY_POPULATION_SOURCE =
  'evidence/brand-v2/link-safety.json#routes';

/** Hosts that are this site rather than somewhere else. */
export const FIRST_PARTY_HOSTS = ['robot-wiki.com', 'www.robot-wiki.com'];

export type OutboundAnchorShape =
  | 'citation-chip'
  | 'reference-entry'
  | 'figure-credit'
  | 'footer'
  | 'other';

export interface OutboundAnchor {
  route: string;
  href: string;
  rel: string | null;
  target: string | null;
  tabindex: string | null;
  shape: OutboundAnchorShape;
}

/** Every route the export carries, as a site-absolute trailing-slash path. */
export function exportedRoutes(outDir: string): string[] {
  const routes: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name !== 'index.html') continue;
      const path = relative(outDir, dir).split('\\').join('/');
      routes.push(path === '' ? '/' : `/${path}/`);
    }
  };
  walk(outDir);
  return routes.sort();
}

export function anchorAttribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag);
  return match ? match[1] : null;
}

/**
 * Classify an anchor by the surface that rendered it, using the markup
 * around it rather than class names: `data-cite-id` wraps the inline chip,
 * `id="ref-…"` list items are the References section, `<figure>` wraps image
 * credits, and `<footer>` is the site footer.
 */
export function outboundAnchorShape(
  html: string,
  anchorIndex: number,
): OutboundAnchorShape {
  const before = html.slice(0, anchorIndex);
  const lastOpen = (tag: string): number => before.lastIndexOf(`<${tag}`);
  const lastClose = (tag: string): number => before.lastIndexOf(`</${tag}>`);
  if (lastOpen('footer') > lastClose('footer')) return 'footer';
  if (lastOpen('figure') > lastClose('figure')) return 'figure-credit';
  const citeOpen = before.lastIndexOf('data-cite-id=');
  const refOpen = before.lastIndexOf('id="ref-');
  const inChip =
    citeOpen !== -1 && before.slice(citeOpen).split('</span>').length <= 3;
  const inReference = refOpen !== -1 && before.lastIndexOf('</li>') < refOpen;
  // A References list item sits inside prose that already rendered chips, so
  // both markers can be open at once. The nearer one is the container the
  // anchor actually belongs to.
  if (inChip && inReference) {
    return citeOpen > refOpen ? 'citation-chip' : 'reference-entry';
  }
  if (inChip) return 'citation-chip';
  if (inReference) return 'reference-entry';
  return 'other';
}

export function isOutboundHref(href: string): boolean {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return !FIRST_PARTY_HOSTS.includes(new URL(href).hostname);
  } catch {
    return false;
  }
}

/** Every outbound anchor in the export, with the attributes that matter. */
export function censusOutboundAnchors(outDir: string): OutboundAnchor[] {
  const found: OutboundAnchor[] = [];
  for (const route of exportedRoutes(outDir)) {
    const file = join(outDir, route === '/' ? '' : route, 'index.html');
    const html = readFileSync(file, 'utf8');
    const anchor = /<a\b[^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = anchor.exec(html)) !== null) {
      const href = anchorAttribute(match[0], 'href');
      if (!href || !isOutboundHref(href)) continue;
      found.push({
        route,
        href,
        rel: anchorAttribute(match[0], 'rel'),
        target: anchorAttribute(match[0], 'target'),
        tabindex: anchorAttribute(match[0], 'tabindex'),
        shape: outboundAnchorShape(html, match.index),
      });
    }
  }
  return found;
}

/**
 * The fingerprint the sweep records and the generator re-derives.
 *
 * Two things decide whether a keyboard trace still speaks for the site: the
 * export it walked and the code that decided what to walk. The census is
 * hashed anchor by anchor, so a new outbound link, a dropped `rel`, or a
 * route that gained or lost one invalidates the trace; the sweep's own bytes
 * and this module's bytes are hashed with it, so changing what the sweep
 * measures invalidates it too.
 */
export function linkSafetyFingerprint(input: {
  root: string;
  census: readonly OutboundAnchor[];
}): string {
  const hash = createHash('sha256');
  hash.update('link-safety/v2\n');
  for (const path of [LINK_SAFETY_SWEEP_MODULE, LINK_SAFETY_CENSUS_MODULE]) {
    hash.update(
      `module:${path}:${createHash('sha256')
        .update(readFileSync(join(input.root, path)))
        .digest('hex')}\n`,
    );
  }
  for (const anchor of [...input.census].sort((left, right) =>
    `${left.route}\u0000${left.href}\u0000${left.shape}`.localeCompare(
      `${right.route}\u0000${right.href}\u0000${right.shape}`,
    ),
  )) {
    hash.update(
      `${anchor.route}|${anchor.href}|${anchor.rel ?? ''}|${anchor.target ?? ''}|${anchor.tabindex ?? ''}|${anchor.shape}\n`,
    );
  }
  return hash.digest('hex');
}

export function linkSafetyMemberId(route: string): string {
  return `link-safety:${route}`;
}

export function linkSafetyRouteMembers(
  census: readonly OutboundAnchor[],
): string[] {
  const routes = [...new Set(census.map(({ route }) => route))].sort();
  if (routes.length === 0) {
    throw new Error(
      'the link-safety population is empty: the export carries no outbound anchor to judge',
    );
  }
  return routes.map(linkSafetyMemberId);
}

/**
 * The same population, read from the persisted artifact rather than from
 * out/. A corpus check that runs without a build has no export to census,
 * and the artifact's own route list is reconciled against the census in
 * `readLinkSafetyEvidence`, so the two agree wherever both exist.
 */
export function linkSafetyRouteMembersFromArtifact(artifact: unknown): string[] {
  const parsed = parseEvidenceArtifact(
    linkSafetyEvidenceSchema,
    artifact,
    'link-safety evidence',
  );
  return parsed.routes
    .map(({ route }) => linkSafetyMemberId(route))
    .sort((left, right) => left.localeCompare(right));
}

const keyboardVerdictSchema = z
  .object({
    route: z.string().min(1),
    outboundInDom: z.number().int().nonnegative(),
    reachedByTab: z.number().int().nonnegative(),
    unreached: z.array(z.string()),
    withoutFocusIndicator: z.array(z.string()),
    tabStops: z.number().int().positive(),
  })
  .strict();

const routeCensusSchema = z
  .object({
    route: z.string().min(1),
    outboundAnchors: z.number().int().positive(),
    distinctHrefs: z.number().int().positive(),
    shapes: z.array(z.string().min(1)).min(1),
  })
  .strict();

const linkSafetyEvidenceSchema = z
  .object({
    schemaVersion: z.literal(2),
    assertionId: z.literal('VAL-B2-BASE-007'),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    source: z.string().min(1),
    routes: z.array(routeCensusSchema).min(1),
    routesSwept: z.number().int().positive(),
    outboundAnchors: z.number().int().positive(),
    distinctOutboundHrefs: z.number().int().positive(),
    anchorsByShape: z.record(z.string(), z.number().int().nonnegative()),
    anchorsWithoutNoopener: z.number().int().nonnegative(),
    anchorsWithNoreferrer: z.number().int().nonnegative(),
    keyboard: z.array(keyboardVerdictSchema).min(1),
  })
  .strict();

export interface LinkSafetyRouteVerdict {
  id: string;
  route: string;
  outboundAnchors: number;
  distinctHrefs: number;
  shapes: OutboundAnchorShape[];
  anchorsWithNoreferrer: number;
  keyboardMeasured: boolean;
  /** Distinct outbound hrefs the Tab key reached on this route. */
  reachedByTab: number | null;
  tabStops: number | null;
  /**
   * Where this route's shapes were proven keyboard reachable when the route
   * itself was not walked. Every shape in the export is carried by at least
   * one walked route, which is what makes the sample honest rather than a
   * subset nobody reconciled.
   */
  keyboardWitnesses: Array<{ shape: OutboundAnchorShape; route: string }>;
}

export interface LinkSafetyEvidence {
  fingerprint: string;
  anchors: number;
  distinctHrefs: number;
  routes: LinkSafetyRouteVerdict[];
  keyboardRoutes: string[];
  shapes: OutboundAnchorShape[];
  anchorsWithoutNoopener: number;
}

/**
 * The link-safety verdicts, or a throw naming what is wrong.
 *
 * The byte half is re-derived from `census` here rather than read out of the
 * artifact. The keyboard half is read, and refused when the trace does not
 * match the export it claims to describe, when it records an unreached link
 * or an invisible focus ring, or when a shape the export renders was never
 * walked by any route in the trace.
 */
export function readLinkSafetyEvidence(input: {
  artifact: unknown;
  census: readonly OutboundAnchor[];
  exportedRoutes: readonly string[];
  fingerprint: string;
}): LinkSafetyEvidence {
  if (input.census.length === 0) {
    throw new Error(
      'link-safety evidence has an empty census: out/ carries no outbound anchor, so every clause below would hold vacuously',
    );
  }
  const envelope = input.artifact;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('link-safety evidence is not an object');
  }
  const { fingerprint } = envelope as { fingerprint?: unknown };
  if (fingerprint !== input.fingerprint) {
    throw new Error(
      `link-safety evidence is stale: the export's outbound anchors or the sweep itself changed since the keyboard trace ran. Re-run npx playwright test --config playwright.brand-v2.config.ts ${LINK_SAFETY_SWEEP_MODULE}.`,
    );
  }
  const artifact = parseEvidenceArtifact(
    linkSafetyEvidenceSchema,
    envelope,
    'link-safety evidence',
  );

  const unsafe = input.census.filter(
    (anchor) => !(anchor.rel ?? '').split(/\s+/).includes('noopener'),
  );
  if (unsafe.length > 0) {
    throw new Error(
      `${unsafe.length} outbound anchor(s) ship without rel="noopener": ${unsafe
        .slice(0, 5)
        .map((anchor) => `${anchor.route} -> ${anchor.href}`)
        .join(', ')}`,
    );
  }
  const untabbable = input.census.filter(
    (anchor) => anchor.tabindex !== null && Number(anchor.tabindex) < 0,
  );
  if (untabbable.length > 0) {
    throw new Error(
      `${untabbable.length} outbound anchor(s) are removed from the tab order by markup: ${untabbable
        .slice(0, 5)
        .map((anchor) => `${anchor.route} -> ${anchor.href}`)
        .join(', ')}`,
    );
  }

  const routes = [...new Set(input.census.map(({ route }) => route))].sort();
  // The artifact's own totals are a second, independent statement about the
  // export. They are compared with the census this run derived rather than
  // reported: a trace taken over a different export than the one shipping is
  // exactly the failure the fingerprint exists to catch, and these say which
  // part moved when it does.
  if (artifact.routesSwept !== input.exportedRoutes.length) {
    throw new Error(
      `link-safety evidence swept ${artifact.routesSwept} routes and the export carries ${input.exportedRoutes.length}`,
    );
  }
  if (artifact.outboundAnchors !== input.census.length) {
    throw new Error(
      `link-safety evidence counted ${artifact.outboundAnchors} outbound anchors and the export carries ${input.census.length}`,
    );
  }
  const distinct = new Set(input.census.map(({ href }) => href)).size;
  if (artifact.distinctOutboundHrefs !== distinct) {
    throw new Error(
      `link-safety evidence counted ${artifact.distinctOutboundHrefs} distinct outbound hrefs and the export carries ${distinct}`,
    );
  }
  const censusByRoute = new Map(
    routes.map((route) => {
      const anchors = input.census.filter((anchor) => anchor.route === route);
      return [
        route,
        {
          outboundAnchors: anchors.length,
          distinctHrefs: new Set(anchors.map(({ href }) => href)).size,
          shapes: [...new Set(anchors.map(({ shape }) => shape))].sort(),
        },
      ] as const;
    }),
  );
  const recordedRoutes = artifact.routes.map(({ route }) => route).sort();
  if (JSON.stringify(recordedRoutes) !== JSON.stringify(routes)) {
    throw new Error(
      `link-safety evidence records ${recordedRoutes.length} routes carrying outbound links and the export carries ${routes.length}`,
    );
  }
  for (const recorded of artifact.routes) {
    const derived = censusByRoute.get(recorded.route);
    if (!derived) {
      throw new Error(
        `link-safety evidence records ${recorded.route}, which carries no outbound anchor in this export`,
      );
    }
    if (
      recorded.outboundAnchors !== derived.outboundAnchors ||
      recorded.distinctHrefs !== derived.distinctHrefs ||
      JSON.stringify([...recorded.shapes].sort()) !==
        JSON.stringify(derived.shapes)
    ) {
      throw new Error(
        `link-safety evidence records ${recorded.route} with ${recorded.outboundAnchors} outbound anchor(s) across ${recorded.shapes.join(', ')} and the export ships ${derived.outboundAnchors} across ${derived.shapes.join(', ')}`,
      );
    }
  }

  const keyboardRoutes = artifact.keyboard.map(({ route }) => route);
  if (new Set(keyboardRoutes).size !== keyboardRoutes.length) {
    throw new Error(
      'link-safety evidence walks the same route twice, so its keyboard coverage cannot be counted',
    );
  }
  const foreign = keyboardRoutes.filter((route) => !routes.includes(route));
  if (foreign.length > 0) {
    throw new Error(
      `link-safety evidence walks ${foreign[0]}, which carries no outbound anchor in this export`,
    );
  }
  for (const verdict of artifact.keyboard) {
    if (verdict.outboundInDom === 0) {
      throw new Error(
        `link-safety evidence walked ${verdict.route} and found no outbound link to reach`,
      );
    }
    if (verdict.unreached.length > 0) {
      throw new Error(
        `${verdict.route} has outbound links the Tab key never reached: ${verdict.unreached.slice(0, 3).join(', ')}`,
      );
    }
    if (verdict.withoutFocusIndicator.length > 0) {
      throw new Error(
        `${verdict.route} focused outbound links with no visible focus indicator: ${verdict.withoutFocusIndicator.slice(0, 3).join(', ')}`,
      );
    }
    if (verdict.reachedByTab !== verdict.outboundInDom) {
      throw new Error(
        `${verdict.route} reached ${verdict.reachedByTab} of ${verdict.outboundInDom} outbound links`,
      );
    }
  }

  const shapes = [...new Set(input.census.map(({ shape }) => shape))].sort();
  const witnessesByShape = new Map<OutboundAnchorShape, string[]>();
  for (const shape of shapes) {
    const walked = keyboardRoutes.filter((route) =>
      input.census.some(
        (anchor) => anchor.route === route && anchor.shape === shape,
      ),
    );
    if (walked.length === 0) {
      throw new Error(
        `the export renders ${shape} outbound links and no keyboard-walked route carries one, so that shape's reachability is measured by nothing`,
      );
    }
    witnessesByShape.set(shape, walked);
  }

  return {
    fingerprint: artifact.fingerprint,
    anchors: input.census.length,
    distinctHrefs: new Set(input.census.map(({ href }) => href)).size,
    keyboardRoutes,
    shapes,
    anchorsWithoutNoopener: 0,
    routes: routes.map((route) => {
      const anchors = input.census.filter((anchor) => anchor.route === route);
      const routeShapes = [
        ...new Set(anchors.map(({ shape }) => shape)),
      ].sort();
      const keyboard = artifact.keyboard.find(
        (verdict) => verdict.route === route,
      );
      return {
        id: linkSafetyMemberId(route),
        route,
        outboundAnchors: anchors.length,
        distinctHrefs: new Set(anchors.map(({ href }) => href)).size,
        shapes: routeShapes,
        anchorsWithNoreferrer: anchors.filter((anchor) =>
          (anchor.rel ?? '').split(/\s+/).includes('noreferrer'),
        ).length,
        keyboardMeasured: keyboard !== undefined,
        reachedByTab: keyboard?.reachedByTab ?? null,
        tabStops: keyboard?.tabStops ?? null,
        keyboardWitnesses:
          keyboard === undefined
            ? routeShapes.map((shape) => ({
                shape,
                route: (witnessesByShape.get(shape) as string[])[0],
              }))
            : [],
      };
    }),
  };
}
