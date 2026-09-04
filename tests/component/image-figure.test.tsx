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
