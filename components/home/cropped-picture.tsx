/* eslint-disable @next/next/no-img-element -- static export serves plain images */
import type { CSSProperties } from 'react';
import type { HomeCrop } from '@/data/home-featured';
import { cx } from '@/lib/utils';

/**
 * A registered picture shown through a crop of its own pixels. The frame
 * takes the crop's shape, so the page reserves the space before the image
 * arrives, and the image is scaled and offset inside it with percentages, so
 * the crop holds at every width. The file itself is the registered one,
 * unaltered; `width` and `height` are its own.
 */
export function CroppedPicture({
  src,
  width,
  height,
  crop,
  alt,
  imageId,
  className,
  eager = false,
}: {
  src: string;
  width: number;
  height: number;
  crop: HomeCrop;
  alt: string;
  imageId?: string;
  className?: string;
  eager?: boolean;
}) {
  const place = (part: HomeCrop) => ({
    '--crop-ratio': `${part.width} / ${part.height}`,
    '--crop-width': `${(width / part.width) * 100}%`,
    '--crop-left': `${(-part.x / part.width) * 100}%`,
    '--crop-top': `${(-part.y / part.height) * 100}%`,
  });
  return (
    <span
      className={cx('home-crop', className)}
      style={place(crop) as CSSProperties}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? undefined : 'lazy'}
        decoding="async"
        data-image-id={imageId}
      />
    </span>
  );
}
