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
  });

  it('exposes citation metadata through a described-by tooltip', () => {
    render(<Cite {...props} />);
    const link = screen.getByRole('link', { name: /Zhao 2023/ });
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent(props.title);
    expect(tooltip).toHaveTextContent('arXiv 2023');
    expect(link).toHaveAttribute('aria-describedby', tooltip.id);
    expect(tooltip.id).not.toBe('');
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
