import { IntentLink } from '@/components/ui/intent-link';
import {
  DOMAINS,
  DOMAIN_META,
  publishedModules,
  type Domain,
} from '@/data/modules';

/**
 * What each domain covers, in the few words the front page has room for.
 * The domain landings carry the longer DOMAIN_META descriptions.
 */
export const HOME_DOMAIN_SUMMARIES: Record<Domain, string> = {
  manipulation: 'From imitation to VLA models',
  'rl-sim2real': 'Policies trained in simulation',
  'world-models': 'Learned predictive simulators',
  'data-hardware': 'Datasets, robots and benchmarks',
  classical: 'Kinematics to state estimation',
  frontier: 'What still blocks deployment',
  adjacent: 'Vehicles, drones, surgery and space',
};

const linkClass = 'ink-link';

/**
 * The contents index: every domain, then every published article in it as
 * a plain link, in registry order.
 *
 * Each domain's name and summary share one element so the name link's
 * parent is the entry the home sweeps measure; the article list is its
 * sibling, so a long list does not stretch that entry below the fold.
 */
export function ContentsIndex() {
  const published = publishedModules();
  return (
    <div className="divide-y divide-border border-y border-border">
      {DOMAINS.map((domain) => (
        <div
          key={domain}
          data-contents-domain={domain}
          className="grid items-start gap-x-6 gap-y-1 py-2 md:grid-cols-[15.5rem_minmax(0,1fr)]"
        >
          <p className="text-[15px] leading-[1.4]">
            <IntentLink
              data-brand-control-id="control:link-focus"
              href={`/${domain}/`}
              className="font-display font-semibold text-text transition-colors hover:text-text-dim"
            >
              {DOMAIN_META[domain].name}
            </IntentLink>
            <span className="block text-[13px] text-text-dim">
              {HOME_DOMAIN_SUMMARIES[domain]}
            </span>
          </p>
          <ul
            aria-label={`${DOMAIN_META[domain].name} articles`}
            className="home-run text-[14px] leading-[1.45]"
          >
            {published
              .filter((entry) => entry.domain === domain)
              .map((entry, index) => (
                <li key={entry.slug}>
                  {index > 0 ? ' ' : null}
                  <IntentLink
                    data-brand-control-id="control:link-focus"
                    href={`/${domain}/${entry.slug}/`}
                    className={linkClass}
                  >
                    {entry.title}
                  </IntentLink>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
