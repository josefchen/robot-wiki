import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GeneralistReleaseTimeline } from '@/components/interactive/generalist-release-timeline';
import { GENERALIST_RELEASES } from '@/lib/generalist-policies';

describe('GeneralistReleaseTimeline', () => {
  it('renders a selectable node for every release', () => {
    render(<GeneralistReleaseTimeline />);
    for (const r of GENERALIST_RELEASES) {
      const escaped = r.name.replace(/[.*]/g, '\\$&');
      expect(
        screen.getByRole('button', { name: new RegExp(`^${escaped}$`, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('exposes a provenance legend distinguishing papers from vendor material', () => {
    render(<GeneralistReleaseTimeline />);
    const legend = screen.getByTestId('provenance-legend');
    expect(legend).toHaveTextContent(/paper/i);
    expect(legend).toHaveTextContent(/lab blog/i);
    expect(legend).toHaveTextContent(/press release/i);
  });

  it('the open filter hides closed entries and the closed filter hides open ones', async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    await user.click(screen.getByRole('button', { name: /^open$/i }));
    expect(
      screen.queryByRole('button', { name: /^Gemini Robotics 1\.0$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^GR00T N1$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^AgiBot GO-1$/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('release-track')).toHaveTextContent(
      `${GENERALIST_RELEASES.filter((r) => r.openWeights).length} of ${GENERALIST_RELEASES.length} shown`,
    );
    await user.click(screen.getByRole('button', { name: /^closed$/i }));
    expect(
      screen.queryByRole('button', { name: /^GR00T N1$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Skild Brain$/i }),
    ).toBeInTheDocument();
  });

  it('vendor-reported entries say so in the detail readout, paper entries do not', async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    await user.click(screen.getByRole('button', { name: /^Helix 02$/i }));
    expect(screen.getByTestId('release-detail')).toHaveTextContent(
      /vendor-reported/i,
    );
    await user.click(screen.getByRole('button', { name: /^Skild Brain$/i }));
    expect(screen.getByTestId('release-detail')).toHaveTextContent(
      /press release/i,
    );
    await user.click(screen.getByRole('button', { name: /^GR00T N1$/i }));
    const detail = screen.getByTestId('release-detail');
    expect(detail).toHaveTextContent(/paper/i);
    expect(detail).not.toHaveTextContent(/vendor-reported/i);
  });

  it('selecting a release shows its capability annotation and source link', async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    await user.click(screen.getByRole('button', { name: /^GR00T N1\.7$/i }));
    const detail = screen.getByTestId('release-detail');
    expect(detail).toHaveTextContent('relative-EEF');
    const source = screen.getByRole('link', { name: /source/i });
    expect(source).toHaveAttribute(
      'href',
      'https://github.com/NVIDIA/Isaac-GR00T',
    );
  });

  it('arrow keys move the selection between releases', async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    const first = screen.getByRole('button', { name: /^Helix$/i });
    await user.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('button', { name: /^Gemini Robotics 1\.0$/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(first).toHaveAttribute('aria-pressed', 'true');
  });

  it('filtering away the selection moves it to a visible entry', async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    await user.click(screen.getByRole('button', { name: /^Helix$/i }));
    await user.click(screen.getByRole('button', { name: /^open$/i }));
    expect(screen.getByTestId('release-detail')).toHaveTextContent('GR00T N1');
  });

  it('reset restores the default filter and selection', async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    await user.click(screen.getByRole('button', { name: /^closed$/i }));
    await user.click(screen.getByRole('button', { name: /^Skild Brain$/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByRole('button', { name: /^all$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: /^Helix$/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
