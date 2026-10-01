/* eslint-disable @next/next/no-img-element -- static export serves plain images */
import {
  FIGURE_TEXT_CLASS,
  FigureFrame,
  FigureStage,
} from '@/components/motion/figure-frame';
import { LOGO_MARK_CLASS, LOGO_TILE_CLASS } from '@/components/ui/logo-tile';
import { ORIGINAL_SCHEMATICS } from '@/components/ui/original-schematics';
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
  /**
   * Where a photograph's 3:2 crop anchors. `top` is for a portrait whose
   * subject's head sits in the top half, which a centred crop would cut.
   */
  cropFocus?: 'center' | 'top';
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

const CREDIT_LINK_CLASS =
  'underline decoration-border-strong underline-offset-2 transition-colors hover:text-accent hover:decoration-accent';

function CreditLine({ credit, className }: { credit: FigureCredit; className: string }) {
  return (
    <span
      data-image-credit
      // Index-only exclusion: the credit is attribution chrome that
      // fused into search excerpts ("...guiding it by hand.Photo: Ims
      // / Wikimedia Commons. Licence: CC BY-SA 4.0."). It stays
      // VISIBLE here with both links; the licensing
      // guarantee is a rendered-DOM guarantee, untouched by this.
      // The caption above is content and stays indexed.
      data-pagefind-ignore
      className={className}
    >
      {credit.kind}: {credit.creator} /{' '}
      {credit.sourceUrl ? (
        <a
          href={credit.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-brand-control-id="control:link-focus"
          className={CREDIT_LINK_CLASS}
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
        className={CREDIT_LINK_CLASS}
      >
        {credit.licenceLabel}
      </a>
      .
    </span>
  );
}

/**
 * An original schematic is drawn inline in the shared figure frame, so its
 * labels sit on the stage type scale. The frame takes the drawing's own
 * one-line caption: the registry caption is the longer record and runs past
 * the frame's 20-word limit.
 */
function SchematicFigure({
  imageId,
  alt,
  credit,
  className,
}: {
  imageId?: string;
  alt: string;
  credit?: FigureCredit;
  className?: string;
}) {
  const schematic = imageId ? ORIGINAL_SCHEMATICS[imageId] : undefined;
  if (!imageId || !schematic) {
    throw new Error(
      `Original schematic "${imageId ?? alt}" has no inline drawing in components/ui/original-schematics.tsx`,
    );
  }
  // A page shows each schematic once, so the image id keeps the caption id unique.
  const captionId = `${imageId}-schematic-caption`;
  return (
    <FigureFrame
      figureId={imageId}
      data-figure-kind="original-schematic"
      data-image-id={imageId}
      className={className}
      heading={schematic.title}
      stage={
        <FigureStage>
          <span
            data-figure-label
            className="block px-3 pt-2.5 font-sans text-xs font-semibold leading-none text-instrument-muted"
          >
            {SCHEMATIC_LABEL}
          </span>
          {schematic.draw(alt, captionId)}
        </FigureStage>
      }
      caption={schematic.caption}
      captionProps={{ id: captionId }}
      source={
        credit ? <CreditLine credit={credit} className={FIGURE_TEXT_CLASS.source} /> : undefined
      }
    />
  );
}

export function Figure({
  src,
  alt,
  caption,
  figureKind = 'photograph',
  imageId,
  credit,
  width,
  height,
  cropFocus = 'center',
  className,
}: FigureProps) {
  if (figureKind === 'original-schematic') {
    return (
      <SchematicFigure imageId={imageId} alt={alt} credit={credit} className={className} />
    );
  }
  const mark = figureKind === 'official-mark';
  const photo = figureKind === 'photograph';
  const image = (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={cx(
        mark && cx(LOGO_MARK_CLASS, 'h-full w-auto'),
        // The border stays on the image rather than the crop box: a bordered
        // box holding an element is a surface the registry would govern.
        photo && 'h-full w-full rounded-md border border-border object-cover',
        photo && cropFocus === 'top' && 'object-top',
      )}
    />
  );
  return (
    <figure
      data-figure-kind={figureKind}
      data-image-id={imageId}
      className={cx(
        'my-6',
        // Every photograph takes one width at a given viewport, whatever
        // column it sits in, so photos never read as page heroes.
        photo && 'w-full max-w-[20rem] sm:max-w-[32rem]',
        className,
      )}
    >
      {mark ? (
        <span
          data-logo-tile=""
          data-brand-surface-id="surface:flat"
          className={cx(LOGO_TILE_CLASS, 'h-24 max-w-full')}
        >
          {image}
        </span>
      ) : (
        // One 3:2 crop for every photograph, filled rather than letterboxed.
        <span
          data-photo-frame=""
          className="block aspect-[3/2] w-full overflow-hidden rounded-md"
        >
          {image}
        </span>
      )}
      <figcaption className={FIGURE_TEXT_CLASS.caption + ' mt-2'}>
        {caption}
      </figcaption>
      {credit ? (
        // The credit is the figure system's source line.
        <CreditLine credit={credit} className={FIGURE_TEXT_CLASS.source + ' mt-1 block'} />
      ) : null}
    </figure>
  );
}
