/**
 * Registry-derived draft fixtures for tests.
 *
 * Some tests need a draft module as a probe: a route expected to 404, or a
 * title that must be absent from the sidebar and the domain landing page.
 * Hard-coding a specific draft breaks the moment that
 * module publishes, so these helpers derive the probe from the module
 * registry (data/modules.ts) instead. Selection is the first draft in
 * registry order, which is deterministic for a given registry.
 */
import { modules } from '@/data/modules';
import type { ModuleRegistryEntry } from '@/data/modules';

/**
 * The first draft module in registry order, optionally restricted to one
 * domain. Returns undefined when every (matching) module is published.
 */
export function firstDraftModule(
  domain?: ModuleRegistryEntry['domain'],
): ModuleRegistryEntry | undefined {
  return modules.find(
    (m) => m.status === 'draft' && (domain === undefined || m.domain === domain),
  );
}

/**
 * A route that must render the themed not-found page. Draft routes are
 * excluded from the static export (generateStaticParams covers published
 * modules only), so the first draft's route is the probe. Once every module
 * has shipped there is no draft left, so fall back to a genuinely unknown
 * route under a real domain, which 404s for the same reason.
 */
export function notFoundProbeRoute(): string {
  const draft = firstDraftModule();
  return draft ? `/${draft.domain}/${draft.slug}/` : '/manipulation/nowhere/';
}
