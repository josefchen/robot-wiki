/* eslint-disable @next/next/no-img-element -- static export serves plain images */
import { cx } from '@/lib/utils';

/**
 * Structured credit carried by a licensed content image (VAL-IMG-002,
 * VAL-IMG-003). Rendered as a visible line inside the figure subtree with
 * the stable `data-image-credit` hook, naming creator, source and licence,
 * and linking to the original asset page and the licence.
 */
export type FigureCredit = {
  /** "Photo" for photographs, "Diagram" for original diagrams. */
  kind: string;
  creator: string;
  sourceName: string;
  /**
   * The original asset page. Absent for site-created diagrams, where
   * there is no external original: the source is named in text instead
   * (VAL-IMG-003's no-source-URL branch).
   */
  sourceUrl?: string;
  licenceLabel: string;
  licenceUrl: string;
};

type FigureProps = {
  src: string;
  alt: string;
  caption: string;
  credit?: FigureCredit;
  width?: number;
  height?: number;
  className?: string;
};

export function Figure({
  src,
  alt,
  caption,
  credit,
  width,
  height,
  className,
}: FigureProps) {
  return (
    <figure className={cx('my-6', className)}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="h-auto w-full rounded-md border border-border"
      />
      <figcaption className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        {caption}
      </figcaption>
      {credit ? (
        <span
          data-image-credit
          // Index-only exclusion: the credit is attribution chrome that
          // fused into search excerpts ("...guiding it by hand.Photo: Ims
          // / Wikimedia Commons. Licence: CC BY-SA 4.0."). It stays
          // VISIBLE here with both links — the VAL-IMG-002/003 licensing
          // guarantee is a rendered-DOM guarantee, untouched by this.
          // The caption above is content and stays indexed.
          data-pagefind-ignore
          className="mt-1 block font-sans text-[11px] leading-relaxed text-text-dim"
        >
          {credit.kind}: {credit.creator} /{' '}
          {credit.sourceUrl ? (
            <a
              href={credit.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-border-strong underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
            >
              {credit.sourceName}
            </a>
          ) : (
            credit.sourceName
          )}
          . Licence:{' '}
          <a
            href={credit.licenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-border-strong underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
          >
            {credit.licenceLabel}
          </a>
          .
        </span>
      ) : null}
    </figure>
  );
}
