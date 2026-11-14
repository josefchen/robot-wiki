import { IntentLink } from '@/components/ui/intent-link';
import type { HomeCounts } from '@/lib/home-counts';

/**
 * "Also in the wiki": the parts of the site that are not articles, each a
 * plain link and one line on what it holds. Every number is one of the
 * home counts.
 */
export function AlsoHere({ counts }: { counts: HomeCounts }) {
  const entries = [
    {
      key: 'how-robots-work',
      href: '/how-robots-work/',
      title: 'How robots work',
      line: `${counts.explainers} short explainers you can turn in 3D.`,
    },
    {
      key: 'market-map',
      href: '/market-map/',
      title: 'Market map',
      line: `${counts.companies} companies, with the sources behind each figure.`,
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
      line: `${counts.glossaryTerms} terms, each defined with its sources.`,
    },
    {
      key: 'a-z',
      href: '/a-z/',
      title: 'A to Z index',
      line: `All ${counts.articles} articles in one list.`,
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
        </li>
      ))}
    </ul>
  );
}
