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
});
