import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GeneralistReleaseTimeline } from '@/components/interactive/generalist-release-timeline';
import { GENERALIST_RELEASES } from '@/lib/generalist-policies';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('GeneralistReleaseTimeline');

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

  it('leads with the plain headline, one toggle and one note, with everything else in Adjust more', () => {
    const { container } = render(<GeneralistReleaseTimeline />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Thirteen robot brains since 2025; four you can download',
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Generalist policies');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "most makers don't offer the trained model or haven't said",
    );
    const notes = container.querySelectorAll('[data-figure-annotation]');
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toBe('Filled: you can download it.Hollow: not offered, or not stated');
    const adjust = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(adjust).not.toContainElement(screen.getByTestId('generalist-downloadable-only'));
    expect(adjust).toContainElement(screen.getByTestId('release-track'));
    expect(adjust).toContainElement(screen.getByRole('button', { name: /^not disclosed$/i }));
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
    // One shape: every node is a circle until the source types are asked for.
    expect(container.querySelectorAll('[data-release] polygon, [data-release] rect + rect')).toHaveLength(0);
    expect(container.querySelectorAll('[data-release][data-filled]')).toHaveLength(
      GENERALIST_RELEASES.filter((r) => r.openWeights).length,
    );
    // The main view drops the per-row status words.
    expect(screen.getByTestId('release-detail').closest('figure')?.querySelector('svg[role="img"]')).not.toHaveTextContent(
      /not disclosed|not downloadable/,
    );
  });

  it('the Downloadable only toggle keeps the four downloadable releases', async () => {
    const user = userEvent.setup();
    const { container } = render(<GeneralistReleaseTimeline />);
    const toggle = screen.getByTestId('generalist-downloadable-only');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelectorAll('[data-release]')).toHaveLength(4);
    expect(screen.getByTestId('release-availability')).toHaveTextContent('Downloadable: yes');
    await user.click(toggle);
    expect(container.querySelectorAll('[data-release]')).toHaveLength(GENERALIST_RELEASES.length);
  });

  it('tapping a row opens its card', () => {
    const { container } = render(<GeneralistReleaseTimeline />);
    fireEvent.click(container.querySelector('[data-release="skild-brain"]')!);
    expect(screen.getByTestId('release-detail')).toHaveTextContent('Skild Brain');
    expect(screen.getByTestId('release-availability')).toHaveTextContent('Downloadable: not stated');
  });

  it('source types sit behind a toggle in Adjust more, with a legend separating papers from vendor material', async () => {
    const user = userEvent.setup();
    const { container } = render(<GeneralistReleaseTimeline />);
    expect(screen.queryByTestId('provenance-legend')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('generalist-source-type'));
    const legend = screen.getByTestId('provenance-legend');
    expect(legend).toHaveTextContent(/paper/i);
    expect(legend).toHaveTextContent(/lab blog/i);
    expect(legend).toHaveTextContent(/press release/i);
    expect(container.querySelectorAll('[data-release] polygon').length).toBeGreaterThan(0);
    const method = container.querySelector('details[data-figure-fold="method"]')!;
    expect(method).toHaveTextContent('vendor-reported');
    expect(method.querySelectorAll('tbody tr')).toHaveLength(GENERALIST_RELEASES.length);
  });

  it('download and undisclosed filters preserve distinct availability states', async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    await user.click(screen.getByRole('button', { name: /^downloadable$/i }));
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
    await user.click(screen.getByRole('button', { name: /^not disclosed$/i }));
    expect(
      screen.queryByRole('button', { name: /^GR00T N1$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Skild Brain$/i }),
    ).toBeInTheDocument();
  });

  it("vendor-reported entries say they are the maker's own report in the card, paper entries do not", async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    await user.click(screen.getByRole('button', { name: /^Helix 02$/i }));
    expect(screen.getByTestId('release-detail')).toHaveTextContent(/the maker's own report/i);
    await user.click(screen.getByRole('button', { name: /^Skild Brain$/i }));
    expect(screen.getByTestId('release-detail')).toHaveTextContent(/the maker's own report/i);
    expect(screen.getByTestId('release-row-skild-brain')).toHaveTextContent(/press release/i);
    await user.click(screen.getByRole('button', { name: /^GR00T N1$/i }));
    const detail = screen.getByTestId('release-detail');
    expect(detail).not.toHaveTextContent(/own report/i);
    expect(screen.getByTestId('release-row-gr00t-n1')).toHaveTextContent(/paper/i);
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
    await user.click(screen.getByRole('button', { name: /^downloadable$/i }));
    expect(screen.getByTestId('release-detail')).toHaveTextContent('GR00T N1');
  });

  it('describes the release axis and tracks the selected policy', () => {
    const { container } = render(<GeneralistReleaseTimeline />);
    const img = screen.getByRole('img');
    const id = img.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/13 of 13 selected generalist policy records/);
    expect(desc?.textContent).toMatch(/selected is Helix/);
    fireEvent.click(screen.getByRole('button', { name: /^GR00T N1$/i }));
    const moved = container.querySelector('[data-chart-description]')
      ?.textContent ?? '';
    expect(moved).toMatch(/selected is GR00T N1/);
  });

  it('renders an unknown as not disclosed rather than closed and exposes its source scope', async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('hollow circles are either not offered or not disclosed'),
    );
    expect(screen.getByRole('button', { name: /^Helix$/i })).toHaveAttribute('data-status', 'undisclosed');
    await user.click(screen.getByRole('button', { name: /^not disclosed$/i }));
    const skild = screen.getByRole('button', { name: /^Skild Brain$/i });
    expect(skild).toHaveAttribute('data-status', 'undisclosed');
    await user.click(skild);
    expect(screen.getByTestId('release-detail')).toHaveTextContent('Downloadable: not stated');
    expect(screen.getByTestId('release-detail')).toHaveTextContent(/January 14, 2026/);
    expect(screen.getByTestId('release-detail')).not.toHaveTextContent('closed weights');
    expect(screen.getByTestId('release-row-skild-brain')).toHaveTextContent('not disclosed');
  });

  it('reset restores the default filter and selection', async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    await user.click(screen.getByRole('button', { name: /^not disclosed$/i }));
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
