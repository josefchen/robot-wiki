/* eslint-disable @next/next/no-img-element -- static export serves plain images */
import { Surface } from '@/components/ui/surface';
import { cx } from '@/lib/utils';
import type { FigureKind } from '@/data/schemas/image';

/**
 * Structured credit carried by a licensed content image. Rendered as a visible line inside the figure subtree with
 * the stable `data-image-credit` hook, naming creator, source and licence,
 * and linking to the original asset page and the licence.
 */
export type FigureCredit = {
  /** The noun the credit opens with, chosen by what the figure is. */
  kind: string;
  creator: string;
  sourceName: string;
  /**
   * The original asset page. Absent for site-created diagrams, where
   * there is no external original: the source is named in text instead.
   */
  sourceUrl?: string;
  licenceLabel: string;
  licenceUrl: string;
};

type FigureProps = {
  src: string;
  alt: string;
  caption: string;
  /**
   * What the figure is. It decides the plate the image sits on and whether
   * the figure names itself as an original schematic, so it is declared by
   * the registry rather than guessed from the file extension.
   */
  figureKind?: FigureKind;
  /**
   * The registry id this figure resolves. Emitted as `data-image-id` so a
   * rendered figure can be joined back to the entry that licensed it
   * instead of being matched on its src.
   */
  imageId?: string;
  credit?: FigureCredit;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * The visible label a first-party diagram opens with.
 *
 * `VAL-B2-ART-006` and `VAL-B2-IMG-003` both turn on the same thing: a
 * drawing that is not a reproduction of a published figure has to say so, or
 * a reader has no way to tell an explanatory sketch from a mapping somebody
 * measured. The credit line already names Robot Wiki as the creator, but it
 * sits below the caption in small type and reads as attribution; this reads
 * as a classification, which is what the row asks for.
 */
const SCHEMATIC_LABEL = 'Original schematic';

export function Figure({
  src,
  alt,
  caption,
  figureKind = 'photograph',
  imageId,
  credit,
  width,
  height,
  className,
}: FigureProps) {
  const schematic = figureKind === 'original-schematic';
  const image = (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={cx(
        'h-auto w-full',
        // Inside the instrument the plate already carries the boundary, so a
        // second border here would be the redundant nested frame the
        // repetition rubric counts.
        schematic ? 'rounded-xs' : 'rounded-md border border-border',
      )}
    />
  );
  return (
    <figure
      data-figure-kind={figureKind}
      data-image-id={imageId}
      className={cx('my-6', className)}
    >
      {schematic ? (
        <Surface level="bounded-dark" className="p-3">
          <span
            data-figure-label
            className="block font-mono text-[11px] uppercase leading-none tracking-[0.14em] text-instrument-muted"
          >
            {SCHEMATIC_LABEL}
          </span>
          <span className="mt-2 block">{image}</span>
        </Surface>
      ) : (
        image
      )}
      <figcaption className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        {caption}
      </figcaption>
      {credit ? (
        <span
          data-image-credit
          // Index-only exclusion: the credit is attribution chrome that
          // fused into search excerpts ("...guiding it by hand.Photo: Ims
          // / Wikimedia Commons. Licence: CC BY-SA 4.0."). It stays
          // VISIBLE here with both links — the licensing
          // guarantee is a rendered-DOM guarantee, untouched by this.
          // The caption above is content and stays indexed.
          data-pagefind-ignore
          // Source metadata is a monospace role in design-system 13.1, which
          // is also what separates the provenance line from the caption
          // above it without another rule or another colour.
          className="mt-1 block font-mono text-[11px] leading-relaxed text-text-dim"
        >
          {credit.kind}: {credit.creator} /{' '}
          {credit.sourceUrl ? (
            <a
              href={credit.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-brand-control-id="control:link-focus"
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
            data-brand-control-id="control:link-focus"
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
