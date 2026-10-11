import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Cite } from '@/components/ui/cite';

const props = {
  href: 'https://arxiv.org/abs/2304.13705',
  label: 'Zhao 2023',
  title: 'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
  meta: 'Zhao, Kumar, Levine, Finn. arXiv 2023.',
};

describe('Cite', () => {
  it('renders an outbound link with safe rel attributes', () => {
    render(<Cite {...props} />);
    const link = screen.getByRole('link', { name: /Zhao 2023/ });
    expect(link).toHaveAttribute('href', props.href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute(
      'data-brand-control-id',
      'control:link-focus',
    );
  });

  // Owner-approved successor (Josef, 2026-10-10, the Pantheon standard):
  // the floating tooltip is retired. Outside an article the metadata stays
  // the link's accessible description; inside one it is the sidenote
  // (tests/component/ui/cite-placement.test.tsx).
  it('exposes citation metadata as the link description', () => {
    render(<Cite {...props} />);
    const link = screen.getByRole('link', { name: /Zhao 2023/ });
    const description = document.getElementById(
      link.getAttribute('aria-describedby') ?? '',
    );
    expect(description).not.toBeNull();
    expect(description).toHaveTextContent(props.title);
    expect(description).toHaveTextContent('arXiv 2023');
    expect(description).toHaveAttribute('data-pagefind-ignore');
    expect(link).toHaveAccessibleDescription(
      expect.stringContaining(props.title),
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('renders no in-page reference affordance without a referenceHref', () => {
    render(<Cite {...props} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('adds an in-page jump to the References entry when referenceHref is set', () => {
    render(<Cite {...props} referenceHref="#ref-act-aloha-2023" />);
    // The outbound link stays primary; the jump is a second affordance.
    expect(screen.getByRole('link', { name: /Zhao 2023/ })).toHaveAttribute(
      'href',
      props.href,
    );
    const jump = screen.getByRole('link', {
      name: new RegExp(`reference.*${props.title}`, 'i'),
    });
    expect(jump).toHaveAttribute('href', '#ref-act-aloha-2023');
    // In-page jump, never an external navigation.
    expect(jump).not.toHaveAttribute('target');
  });

  it('exposes the registry id as data-cite-id when given', () => {
    const { container } = render(<Cite {...props} citeId="act-aloha-2023" />);
    expect(
      container.querySelector('[data-cite-id="act-aloha-2023"]'),
    ).not.toBeNull();
  });
});
