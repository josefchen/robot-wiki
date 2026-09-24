/**
 * Which citation records each client widget may render, resolved on the
 * server.
 *
 * Fourteen interactive widgets link to primary sources, either from their
 * rows or through inline <CiteRef> chips. They used to import the whole
 * citation registry (data/citations.ts) into the browser, directly or via
 * the MDX chip resolver, to look up a handful of ids; the registry is the
 * site's entire bibliography, so every page mounting one of them
 * downloaded all of it.
 *
 * Now the article mount registry (components/mdx/article-mounts.tsx)
 * resolves each widget's records here, at build time, and hands them to
 * the widget through CitationRecordsProvider
 * (components/article/citation-records.tsx).
 *
 * Row-driven entries derive their ids from the same data rows the widget
 * reads, so adding a row adds its source automatically. A widget that looks
 * up an id its entry did not supply throws outside production, which the
 * widget's component tests (rendered through the same records) catch, and
 * tests/unit/widget-citations.test.tsx reads every literal chip id and
 * every lookup site back out of the widget sources.
 *
 * Server and test code only: importing this module from a Client
 * Component would put the registry back into the browser bundle.
 */
import type { CitationRecord } from '@/components/article/citation-records';
import { citationLabel, citationMeta, getCitation } from '@/data/citations';
import { METHODS } from '@/data/methods';
import { MILESTONES } from '@/lib/bear-case';
import { THESES } from '@/lib/competing-theses';
import { RELATIVE_EEF_CONTEXT_CITATION_ID, STRATEGIES } from '@/lib/cross-embodiment';
import { DEPLOYMENT_ROWS } from '@/lib/deployment-reality';
import { DEXTEROUS_HANDS } from '@/lib/dexterous-hands';
import { TRANSIENT_CONTACT_LIMIT_CITATION } from '@/lib/force-limits';
import { GENERALIST_RELEASES } from '@/lib/generalist-policies';
import { HIERARCHY_SYSTEMS } from '@/lib/hierarchy-timescales';
import { KNOWLEDGE_INSULATION_CITATION_ID } from '@/lib/knowledge-insulation';
import { PI_GENERATIONS } from '@/lib/pi-generations';

export const WIDGET_CITATION_IDS = {
  // Row-driven source links (useCitationLookup).
  ComparisonMatrix: () => METHODS.flatMap((method) => method.sources),
  CrossEmbodimentStrategies: () => [
    ...Object.values(STRATEGIES).map((strategy) => strategy.citationId),
    RELATIVE_EEF_CONTEXT_CITATION_ID,
  ],
  DeploymentDashboard: () => DEPLOYMENT_ROWS.map((row) => row.sourceId),
  GeneralistReleaseTimeline: () =>
    GENERALIST_RELEASES.map((release) => release.citationId),
  HandComparison: () =>
    DEXTEROUS_HANDS.flatMap((hand) =>
      hand.secondarySourceId
        ? [hand.sourceId, hand.secondarySourceId]
        : [hand.sourceId],
    ),
  HierarchyTimescales: () => HIERARCHY_SYSTEMS.map((system) => system.citationId),
  MotInsulation: () => [KNOWLEDGE_INSULATION_CITATION_ID],
  PiGenerationTimeline: () => PI_GENERATIONS.map((generation) => generation.citationId),
  // Inline <CiteRef> chips. Row-driven chips derive from their rows; the
  // literal ids are the chips written into the widget's own JSX, which
  // tests/unit/widget-citations.test.tsx reads back out of the source.
  ImpedanceContactLab: () => [TRANSIENT_CONTACT_LIMIT_CITATION],
  MilestonesWatchlist: () => MILESTONES.flatMap((milestone) => milestone.citationIds),
  PerceptionErrorBudget: () => ['realsense-d400-datasheet-2026', 'cleargrasp-2020'],
  SampleEfficiencyLedger: () => [
    'rudin-2021',
    'daydreamer-2022',
    'haarnoja-walk-2019',
    'qt-opt-2018',
    'levine-hand-eye-2016',
  ],
  SceneRepresentationLadder: () => ['curless-levoy-1996', 'moravec-elfes-1985'],
  ThesisExplorer: () =>
    THESES.flatMap((thesis) => [...thesis.evidenceFor, ...thesis.evidenceAgainst]).flatMap(
      (evidence) => evidence.citationIds,
    ),
} satisfies Record<string, () => readonly string[]>;

export type CitingWidget = keyof typeof WIDGET_CITATION_IDS;

/**
 * Resolves ids to the records a widget renders, deduplicated in first-seen
 * order. An id missing from the registry throws: the server resolves these
 * at prerender time, so a dangling source id fails the build instead of
 * shipping a widget with a missing link.
 */
export function citationRecords(ids: Iterable<string>): CitationRecord[] {
  const records = new Map<string, CitationRecord>();
  for (const id of ids) {
    if (records.has(id)) continue;
    const citation = getCitation(id);
    if (!citation) {
      throw new Error(`widget-citations: unknown citation id "${id}"`);
    }
    records.set(id, {
      id,
      url: citation.url,
      title: citation.title,
      label: citationLabel(citation),
      meta: citationMeta(citation),
    });
  }
  return [...records.values()];
}

/** The records one or more widgets may render. */
export function widgetCitationRecords(
  ...widgets: readonly CitingWidget[]
): CitationRecord[] {
  return citationRecords(widgets.flatMap((widget) => WIDGET_CITATION_IDS[widget]()));
}
