import { IntentLink } from '@/components/ui/intent-link';
import { formatCount, type HomeCounts } from '@/lib/home-counts';

type Entry = {
  key: string;
  href: string;
  title: string;
  line: string;
  /** A page under this one: its link opens a second line in the same cell. */
  under?: { href: string; title: string; line: string };
};

const NO_BREAK_SPACE = String.fromCharCode(0xa0);

/**
 * "Also in the wiki": the parts of the site that are not articles, each a
 * plain link and one line on what it holds. The market map's cell also names
 * the page under it. Every number and date comes from the home counts.
 */
export function AlsoHere({ counts }: { counts: HomeCounts }) {
  // The span of dates stays on one line.
  const roundsWindow = counts.roundsWindow.replace(/ /g, NO_BREAK_SPACE);
  const entries: Entry[] = [
    {
      key: 'now',
      href: '/now/',
      title: 'Robotics now',
      line: `${counts.developments} developments since ${counts.developmentsSince}.`,
    },
    {
      key: 'how-robots-work',
      href: '/how-robots-work/',
      title: 'How robots work',
      line: `${formatCount(counts.explainers)} short explainers you can turn in 3D.`,
    },
    {
      key: 'market-map',
      href: '/market-map/',
      title: 'Market map',
      line: `${formatCount(counts.companies)} companies, with the sources behind each figure.`,
      under: {
        href: '/market-map/rounds/',
        title: 'Recent rounds',
        line: `${formatCount(counts.closedRounds)} closed from ${roundsWindow}.`,
      },
    },
    {
      key: 'playground',
      href: '/playground/',
      title: 'Playground',
      line: 'Pose a small robot arm one joint at a time.',
    },
    {
      key: 'glossary',
      href: '/glossary/',
      title: 'Glossary',
      line: `${formatCount(counts.glossaryTerms)} terms, each defined with its sources.`,
    },
    {
      key: 'a-z',
      href: '/a-z/',
      title: 'A to Z index',
      line: `All ${formatCount(counts.articles)} articles in one list.`,
    },
  ];
  return (
    <ul className="home-cells">
      {entries.map((entry) => (
        <li key={entry.key} data-also={entry.key}>
          <h3 className="home-term">
            <IntentLink
              data-brand-control-id="control:link-focus"
              href={entry.href}
              className="ink-link"
            >
              {entry.title}
            </IntentLink>
          </h3>
          <p className="home-line">{entry.line}</p>
          {entry.under ? (
            <p className="home-line">
              <IntentLink
                data-brand-control-id="control:link-focus"
                href={entry.under.href}
                className="ink-link"
              >
                {entry.under.title}
              </IntentLink>
              {`: ${entry.under.line}`}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
