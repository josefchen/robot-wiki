import { Figure } from '@/components/ui/figure';
import {
  creditNoun,
  figureKind,
  getImage,
  licenceLabel,
} from '@/data/images';

/**
 * Registry-backed image resolver. MDX authors write <Image id="..."/> (the
 * mdx-components alias) and tsx pages render <ImageRef id="..."/>; both map
 * the id to the image registry and render the Figure primitive with the
 * caption, intrinsic dimensions, and the visible credit (creator, source,
 * licence, links) that the image contract requires. The primitive itself
 * stays untouched.
 *
 * The figure's kind comes from the registry rather than from the file
 * extension. Extension was a lie in both directions: it credited an `.svg`
 * company mark on /credits as `Diagram: Fox Robotics` and a `.png` mark
 * beside it as `Photo:`, and it could never have named a schematic as one.
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
      figureKind={figureKind(image)}
      imageId={image.id}
      width={image.width}
      height={image.height}
      credit={{
        kind: creditNoun(image),
        creator: image.creator,
        sourceName: image.sourceName,
        sourceUrl: image.sourceUrl,
        licenceLabel: licenceLabel(image),
        licenceUrl: image.licenceUrl,
      }}
    />
  );
}
