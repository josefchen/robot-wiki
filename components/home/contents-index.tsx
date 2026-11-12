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

/**
 * The contents index: every domain, its one-line scope, then every
 * published article in it as a plain link, in registry order. On a phone the
 * articles run inline, so the index stays short; from a tablet up they stand
 * one to a line in columns, read like the contents of a book.
 *
 * Each domain's name and scope share one element, and the article list is
 * its sibling.
 */
export function ContentsIndex() {
  const published = publishedModules();
  return (
    <div className="home-index">
      {DOMAINS.map((domain) => {
        const articles = published.filter((entry) => entry.domain === domain);
        return (
          <div key={domain} data-contents-domain={domain} className="contents-domain">
            <p className="contents-head">
              <IntentLink
                data-brand-control-id="control:link-focus"
                href={`/${domain}/`}
                className="contents-name"
              >
                {DOMAIN_META[domain].name}
              </IntentLink>
              <span className="contents-scope">{HOME_DOMAIN_SUMMARIES[domain]}</span>
            </p>
            <ul aria-label={`${DOMAIN_META[domain].name} articles`} className="home-run contents-list">
              {articles.map((entry, index) => (
                <li key={entry.slug}>
                  {index > 0 ? ' ' : null}
                  <IntentLink
                    data-brand-control-id="control:link-focus"
                    href={`/${domain}/${entry.slug}/`}
                    className="ink-link"
                  >
                    {entry.title}
                  </IntentLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
