import { CroppedPicture } from '@/components/home/cropped-picture';
import { IntentLink } from '@/components/ui/intent-link';
import { POSTER_SIZE } from '@/components/explainers/catalog';
import { COMPANIES } from '@/data/companies';
import { SEGMENT_LABELS, SEGMENT_ORDER } from '@/lib/market-map';

/**
 * Each poster cropped to its machine at 3:2, the shape the market map's
 * drawing takes too, so the three pictures read as one set.
 */
const DRONE_CROP = { x: 167, y: 180, width: 1080, height: 720 };
const ARM_CROP = { x: 210, y: 221, width: 870, height: 580 };

/**
 * The market map drawn small from its own data: one square per company,
 * grouped by segment in the map's segment order, the segments told apart by
 * alternating greys. The reader hears the counts.
 */
function CompanySquares() {
  const rows = SEGMENT_ORDER.map((segment) => ({
    segment,
    count: COMPANIES.filter((company) => company.segment === segment).length,
  }));
  const label = `${COMPANIES.length} companies, one square each, by segment: ${rows
    .map(({ segment, count }) => `${SEGMENT_LABELS[segment]} ${count}`)
    .join(', ')}.`;
  return (
    <span className="explore-visual explore-squares" role="img" aria-label={label}>
      <span className="squares">
        {rows.flatMap(({ segment, count }, group) =>
          Array.from({ length: count }, (_, index) => (
            <span key={`${segment}-${index}`} className="square" data-tone={group % 2 ? 'light' : 'dark'} />
          )),
        )}
      </span>
    </span>
  );
}

/**
 * "Explore": the three things on the site that are not articles, each with
 * a small picture of itself at 3:2. The explainer and playground pictures
 * are the explainers' own poster renders (the drone, and the grey SO-101 arm
 * of the reaching explainer); the market map is drawn from its data.
 */
export function Explore({ explainerCount }: { explainerCount: number }) {
  const entries = [
    {
      key: 'how-robots-work',
      href: '/how-robots-work/',
      title: 'How robots work',
      line: `${explainerCount} short explainers you can turn in 3D.`,
      visual: (
        <CroppedPicture
          src="/explainers/posters/flying.webp"
          width={POSTER_SIZE.width}
          height={POSTER_SIZE.height}
          crop={DRONE_CROP}
          alt="A rendered quadcopter drone with its propellers labelled clockwise and counter-clockwise."
          className="explore-visual"
        />
      ),
    },
    {
      key: 'market-map',
      href: '/market-map/',
      title: 'Market map',
      line: `${COMPANIES.length} companies, with the sources behind each figure.`,
      visual: <CompanySquares />,
    },
    {
      key: 'playground',
      href: '/playground/',
      title: 'Playground',
      line: 'Pose a small robot arm one joint at a time.',
      visual: (
        <CroppedPicture
          src="/explainers/posters/reaching.webp"
          width={POSTER_SIZE.width}
          height={POSTER_SIZE.height}
          crop={ARM_CROP}
          alt="A rendered SO-101 robot arm in grey, the open-source arm the playground lets you pose, reaching out with its gripper open."
          className="explore-visual"
        />
      ),
    },
  ];
  return (
    <ul className="explore">
      {entries.map((entry) => (
        <li key={entry.key} data-explore={entry.key} className="explore-entry">
          <IntentLink href={entry.href} tabIndex={-1} className="start-picture-link">
            {entry.visual}
          </IntentLink>
          <h3 className="explore-title">
            <IntentLink
              data-brand-control-id="control:link-focus"
              href={entry.href}
              className="start-link"
            >
              {entry.title}
            </IntentLink>
          </h3>
          <p className="explore-line">{entry.line}</p>
        </li>
      ))}
    </ul>
  );
}
