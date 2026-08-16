import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Figure } from '@/components/ui/figure';

describe('Figure', () => {
  it('renders the image with its alt text', () => {
    render(
      <Figure
        src="/images/act-setup.png"
        alt="The ALOHA bimanual teleoperation setup with two leader and two follower arms."
        caption="ALOHA hardware setup."
      />,
    );
    expect(
      screen.getByRole('img', { name: /ALOHA bimanual teleoperation/ }),
    ).toHaveAttribute('src', '/images/act-setup.png');
  });

  it('renders the caption', () => {
    render(
      <Figure
        src="/images/x.png"
        alt="Diagram"
        caption="Action chunking over a horizon k."
      />,
    );
    expect(
      screen.getByText('Action chunking over a horizon k.'),
    ).toBeInTheDocument();
  });

  it('renders a source link when a credit carries a source URL', () => {
    render(
      <Figure
        src="/images/x.png"
        alt="Diagram"
        caption="Cap"
        credit={{
          kind: 'Photo',
          creator: 'Zhao et al.',
          sourceName: 'arXiv',
          sourceUrl: 'https://arxiv.org/abs/2304.13705',
          licenceLabel: 'CC BY 4.0',
          licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
        }}
      />,
    );
    const link = screen.getByRole('link', { name: 'arXiv' });
    expect(link).toHaveAttribute('href', 'https://arxiv.org/abs/2304.13705');
  });
});
