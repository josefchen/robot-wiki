import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Figure } from '@/components/ui/figure';
import { ImageRef } from '@/components/mdx/image-ref';
import { getImage, licenceLabel, type SiteImage } from '@/data/images';

/**
 * The registry-backed figure (VAL-IMG-001/002/003/009): intrinsic
 * dimensions on the img, and a visible credit naming creator, source and
 * licence, with the source link pointing at the registry's source URL.
 */

const entry = getImage('franka-emika-panda-cebit-2017') as SiteImage;

describe('Figure with a registry credit', () => {
  function renderFigure() {
    return render(
      <Figure
        src={entry.file}
        alt={entry.alt}
        caption={entry.caption}
        width={entry.width}
        height={entry.height}
        credit={{
          kind: 'Photo',
          creator: entry.creator,
          sourceName: entry.sourceName,
          sourceUrl: entry.sourceUrl,
          licenceLabel: licenceLabel(entry),
          licenceUrl: entry.licenceUrl,
        }}
      />,
    );
  }

  it('renders the image with intrinsic width and height (VAL-IMG-009)', () => {
    renderFigure();
    const img = screen.getByRole('img', { name: entry.alt });
    expect(img).toHaveAttribute('width', String(entry.width));
    expect(img).toHaveAttribute('height', String(entry.height));
    expect(img).toHaveAttribute('src', entry.file);
  });

  it('renders a visible credit naming creator, source and licence (VAL-IMG-002)', () => {
    renderFigure();
    const credit = document.querySelector('[data-image-credit]');
    expect(credit).not.toBeNull();
    expect(credit!.textContent).toContain(entry.creator);
    expect(credit!.textContent).toContain(entry.sourceName);
    expect(credit!.textContent).toContain('CC BY-SA 4.0');
  });

  it('links the credit to the original source URL and the licence (VAL-IMG-003)', () => {
    renderFigure();
    const credit = document.querySelector('[data-image-credit]')!;
    const anchors = Array.from(credit.querySelectorAll('a'));
    const sourceLink = anchors.find((a) => a.getAttribute('href') === entry.sourceUrl);
    expect(sourceLink).toBeDefined();
    expect(sourceLink).toHaveAttribute('target', '_blank');
    expect(sourceLink!.getAttribute('rel')).toContain('noopener');
    const licenceLink = anchors.find((a) => a.getAttribute('href') === entry.licenceUrl);
    expect(licenceLink).toBeDefined();
  });
});

describe('ImageRef (registry resolver)', () => {
  it('resolves a registered id to the full figure with credit', () => {
    render(<ImageRef id="franka-emika-panda-cebit-2017" />);
    expect(screen.getByRole('img', { name: entry.alt })).toBeInTheDocument();
    expect(document.querySelector('[data-image-credit]')!.textContent).toContain(
      entry.sourceName,
    );
  });

  it('names a site-created diagram in text with no external source link (VAL-IMG-003)', () => {
    const diagram = getImage('covariate-shift') as SiteImage;
    expect(diagram.sourceUrl).toBeUndefined();
    render(<ImageRef id="covariate-shift" />);
    const credit = document.querySelector('[data-image-credit]')!;
    expect(credit.textContent).toContain('Robot Wiki contributors');
    expect(credit.textContent).toContain('Robot Wiki (original diagram)');
    expect(credit.textContent).toContain('CC BY 4.0');
    // The only anchor in the credit is the licence deed; nothing links to
    // an inaccessible "original".
    const anchors = Array.from(credit.querySelectorAll('a'));
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toHaveAttribute('href', diagram.licenceUrl);
  });

  it('renders a named fallback for an unknown id', () => {
    render(<ImageRef id="no-such-image" />);
    expect(screen.getByText(/no-such-image/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});

/**
 * The brand-v2 figure treatment (VAL-B2-ART-004, VAL-B2-ART-005,
 * VAL-B2-ART-006, VAL-B2-IMG-003). A dark diagram is a bounded instrument
 * that says what it is; a photograph is not, and neither loses its caption
 * or its credit to the change.
 */
describe('figure treatment by kind', () => {
  it('mounts a schematic on a bounded dark instrument that identifies itself', () => {
    render(<ImageRef id="covariate-shift" />);
    const figure = document.querySelector('figure')!;
    expect(figure).toHaveAttribute('data-figure-kind', 'original-schematic');

    const surface = figure.querySelector('[data-brand-surface-id]')!;
    expect(surface).not.toBeNull();
    expect(surface).toHaveAttribute(
      'data-brand-surface-id',
      'surface:bounded-dark-instrument',
    );
    expect(surface.querySelector('img')).not.toBeNull();

    const label = figure.querySelector('[data-figure-label]')!;
    expect(label.textContent).toBe('Original schematic');
    expect(label.className).toContain('font-mono');
    // The label is inside the instrument, so it reads as the plate's own
    // caption rather than as another line of body prose.
    expect(surface.contains(label)).toBe(true);
  });

  it('leaves a photograph on the page surface with no schematic claim', () => {
    render(<ImageRef id="franka-emika-panda-cebit-2017" />);
    const figure = document.querySelector('figure')!;
    expect(figure).toHaveAttribute('data-figure-kind', 'photograph');
    expect(figure.querySelector('[data-brand-surface-id]')).toBeNull();
    expect(figure.querySelector('[data-figure-label]')).toBeNull();
  });

  it('keeps the caption and sets the credit in the source-metadata face', () => {
    render(<ImageRef id="covariate-shift" />);
    const figure = document.querySelector('figure')!;
    const caption = figure.querySelector('figcaption')!;
    expect(caption.textContent).toBe(
      (getImage('covariate-shift') as SiteImage).caption,
    );
    expect(caption.className).toContain('font-sans');
    const credit = figure.querySelector('[data-image-credit]')!;
    expect(credit.className).toContain('font-mono');
  });

  it('opens each credit with the noun the registry declares', () => {
    const { unmount } = render(<ImageRef id="covariate-shift" />);
    expect(
      document.querySelector('[data-image-credit]')!.textContent,
    ).toMatch(/^Diagram: /);
    unmount();

    render(<ImageRef id="puma-560-nasa-ames" />);
    expect(
      document.querySelector('[data-image-credit]')!.textContent,
    ).toMatch(/^Photo: /);
  });

  it('credits a company mark as a logo whatever it ships as', () => {
    // /credits renders every registered image through this resolver. While
    // the noun came from the file extension it credited the vector mark as
    // "Diagram:" and the raster mark beside it as "Photo:".
    for (const id of ['nvidia-logo', 'physical-intelligence-logo']) {
      const { unmount } = render(<ImageRef id={id} />);
      const figure = document.querySelector('figure')!;
      expect(figure, id).toHaveAttribute('data-figure-kind', 'official-mark');
      expect(
        document.querySelector('[data-image-credit]')!.textContent,
        id,
      ).toMatch(/^Logo: /);
      expect(figure.querySelector('[data-figure-label]'), id).toBeNull();
      unmount();
    }
  });

  it('renders the attribution sentence the registry records', () => {
    render(<ImageRef id="franka-emika-panda-cebit-2017" />);
    const credit = document.querySelector('[data-image-credit]')!;
    const rendered = credit.textContent!.replace(/\s+/g, ' ').trim();
    expect(rendered).toBe(entry.attributionText);
  });
});
