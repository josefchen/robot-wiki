/* eslint-disable @next/next/no-img-element -- static export serves plain images */
import { cx } from '@/lib/utils';

type FigureProps = {
  src: string;
  alt: string;
  caption: string;
  sourceHref?: string;
  sourceLabel?: string;
  width?: number;
  height?: number;
  className?: string;
};

export function Figure({
  src,
  alt,
  caption,
  sourceHref,
  sourceLabel,
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
        className="w-full rounded-md border border-border"
      />
      <figcaption className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        {caption}
        {sourceHref && sourceLabel ? (
          <>
            {' '}
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline decoration-accent/45 underline-offset-2 hover:decoration-accent"
            >
              Source: {sourceLabel}
            </a>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
