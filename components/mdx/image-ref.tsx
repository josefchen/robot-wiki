import { Figure } from '@/components/ui/figure';
import { getImage, licenceLabel } from '@/data/images';

/**
 * Registry-backed image resolver. MDX authors write <Image id="..."/> (the
 * mdx-components alias) and tsx pages render <ImageRef id="..."/>; both map
 * the id to the image registry and render the Figure primitive with the
 * caption, intrinsic dimensions, and the visible credit (creator, source,
 * licence, links) that VAL-IMG-002/003/009 require. The primitive itself
 * stays untouched.
 */
export function ImageRef({ id }: { id: string }) {
  const image = getImage(id);
  if (!image) {
    // Unreachable in shipped content: scripts/validate-content.ts fails the
    // prebuild gate on unregistered image ids. Defensive fallback only.
    return (
      <span className="inline-flex items-center rounded-xs border border-err px-1.5 font-mono text-[0.72em] leading-5 text-err">
        missing image: {id}
      </span>
    );
  }
  return (
    <Figure
      src={image.file}
      alt={image.alt}
      caption={image.caption}
      width={image.width}
      height={image.height}
      credit={{
        kind: image.file.endsWith('.svg') ? 'Diagram' : 'Photo',
        creator: image.creator,
        sourceName: image.sourceName,
        sourceUrl: image.sourceUrl,
        licenceLabel: licenceLabel(image),
        licenceUrl: image.licenceUrl,
      }}
    />
  );
}
