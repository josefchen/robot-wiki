import { CroppedPicture } from '@/components/home/cropped-picture';
import { IntentLink } from '@/components/ui/intent-link';
import type { FeaturedArticle } from '@/lib/featured-article';

/**
 * "Start here": the editor's four entry points, hottest first, as equal
 * entries: a picture at 3:2, the title, the dek and the picture's credit.
 * The title and the picture both link to the article; the credit links to
 * the picture's source and licence.
 */
export function StartHere({ entries }: { entries: readonly FeaturedArticle[] }) {
  return (
    <ol className="start-here">
      {entries.map((entry) => {
        const { picture } = entry;
        return (
          <li
            key={entry.href}
            data-start-here={`${entry.domain}/${entry.slug}`}
            className="start-entry"
          >
            {/* The picture links to the article too, for a pointer; the
                keyboard reaches the article once, through its title. */}
            <IntentLink href={entry.href} tabIndex={-1} className="start-picture-link">
              <CroppedPicture
                src={picture.src}
                width={picture.width}
                height={picture.height}
                crop={picture.crop}
                alt={picture.alt}
                imageId={picture.id}
                className="start-picture"
              />
            </IntentLink>
            <div className="start-text">
              <h3 className="start-title">
                <IntentLink
                  data-brand-control-id="control:link-focus"
                  href={entry.href}
                  className="start-link"
                >
                  {entry.title}
                </IntentLink>
              </h3>
              <p data-featured-dek className="start-dek">
                {entry.dek}
              </p>
              <p data-image-credit className="home-credit">
                {picture.credit.sourceUrl ? (
                  <a href={picture.credit.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {picture.credit.creator}
                  </a>
                ) : (
                  picture.credit.creator
                )}
                ,{' '}
                <a href={picture.credit.licenceUrl} target="_blank" rel="noopener noreferrer">
                  {picture.credit.licence}
                </a>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
