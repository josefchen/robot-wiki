import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GeneralistReleaseTimeline } from '@/components/interactive/generalist-release-timeline';
import { GENERALIST_RELEASES, filterReleases } from '@/lib/generalist-policies';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('GeneralistReleaseTimeline');

/**
 * What the figure's live regions hand a screen reader, in order: each new
 * non-empty text of a polite or status region outside a closed fold, the way
 * the interactive ledger's recorder hears it.
 */
function listen(container: HTMLElement) {
  const live = '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]';
  const text = (region: Element) => (region.textContent ?? '').replace(/\s+/g, ' ').trim();
  const last = new Map<Element, string>();
  for (const region of container.querySelectorAll(live)) last.set(region, text(region));
  const spoken: string[] = [];
  const observer = new MutationObserver(() => {
    for (const region of container.querySelectorAll(live)) {
      if (region.closest('details:not([open])')) continue;
      const now = text(region);
      if (now && now !== last.get(region)) spoken.push(now);
      last.set(region, now);
    }
  });
  observer.observe(container, { subtree: true, childList: true, characterData: true, attributes: true });
  return { spoken, stop: () => observer.disconnect() };
}

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

  it('the Downloadable only toggle keeps the four downloadable releases in full and fades the rest in place', async () => {
    const user = userEvent.setup();
    const { container } = render(<GeneralistReleaseTimeline />);
    const plot = container.querySelector('svg[role="img"]')!;
    const viewBox = plot.getAttribute('viewBox');
    const ids = (selector: string) =>
      [...container.querySelectorAll(selector)].map((row) => row.getAttribute('data-release'));
    const toggle = screen.getByTestId('generalist-downloadable-only');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(ids('[data-release]:not([data-faint])')).toEqual(
      GENERALIST_RELEASES.filter((r) => r.openWeights).map((r) => r.id),
    );
    expect(ids('[data-release][data-faint]')).toEqual(
      GENERALIST_RELEASES.filter((r) => !r.openWeights).map((r) => r.id),
    );
    for (const row of container.querySelectorAll('[data-release]')) {
      const faint = row.hasAttribute('data-faint');
      const mark = row.querySelector(':scope > [data-row-mark]');
      if (faint) expect(mark).toHaveAttribute('opacity', '0.3');
      else expect(mark).not.toHaveAttribute('opacity');
      // The name never fades, so it keeps text contrast in every filter state.
      expect(row).not.toHaveAttribute('opacity');
      expect(row.querySelector(':scope > text')).not.toHaveAttribute('opacity');
    }
    // Every row keeps its place, so the plot keeps its size and the card stays.
    expect(plot.getAttribute('viewBox')).toBe(viewBox);
    expect(screen.getByTestId('release-detail')).toHaveTextContent('Helix');
    expect(container.querySelector('[data-chart-description]')?.textContent).toMatch(
      /13 of 13 selected generalist policy records are shown, 4 in full and the other 9 faint/,
    );
    await user.click(toggle);
    expect(container.querySelectorAll('[data-release]')).toHaveLength(GENERALIST_RELEASES.length);
    expect(container.querySelectorAll('[data-faint]')).toHaveLength(0);
  });

  it('says each filter result once in a polite status beside the toggle, by keyboard and pointer, and nothing on load', async () => {
    const user = userEvent.setup();
    const { container } = render(<GeneralistReleaseTimeline />);
    const total = GENERALIST_RELEASES.length;
    const status = screen.getByTestId('generalist-filter-status');
    // A polite status outside every fold, so it speaks while Adjust more is
    // closed, and hidden from sight, so it adds nothing to the figure.
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveClass('sr-only');
    expect(status.closest('details')).toBeNull();
    expect(status.closest('[data-figure-controls]')).toContainElement(screen.getByTestId('generalist-downloadable-only'));
    // Nothing is said on load.
    expect(status).toBeEmptyDOMElement();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(status).toBeEmptyDOMElement();

    const heard = listen(container);
    const card = screen.getByTestId('release-detail').textContent;
    const toggle = screen.getByTestId('generalist-downloadable-only');
    const downloadable = `${filterReleases('open').length} of ${total} shown: downloadable only`;

    // Keyboard: Space and Enter on the toggle.
    toggle.focus();
    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(status).toHaveTextContent(new RegExp(`^${downloadable}$`));
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(status).toHaveTextContent(new RegExp(`^All ${total} shown$`));

    // Pointer: the toggle, then the full filter in Adjust more.
    await user.click(toggle);
    expect(status).toHaveTextContent(new RegExp(`^${downloadable}$`));
    await user.click(screen.getByRole('button', { name: /^not downloadable$/i }));
    const closed = `${filterReleases('closed').length} of ${total} shown: not downloadable only`;
    expect(status).toHaveTextContent(new RegExp(`^${closed}$`));
    await user.click(screen.getByRole('button', { name: /^not disclosed$/i }));
    const undisclosed = `${filterReleases('undisclosed').length} of ${total} shown: not disclosed only`;
    expect(status).toHaveTextContent(new RegExp(`^${undisclosed}$`));
    // Pressing the filter already chosen changes nothing and says nothing.
    await user.click(screen.getByRole('button', { name: /^not disclosed$/i }));
    await user.click(screen.getByRole('button', { name: /^all$/i }));
    expect(status).toHaveTextContent(new RegExp(`^All ${total} shown$`));
    await user.click(screen.getByRole('button', { name: /^all$/i }));

    // One announcement per change, all from the status: the card stays as it
    // was, so the polite card never repeats the filter's result.
    expect(screen.getByTestId('release-detail').textContent).toBe(card);
    expect(heard.spoken).toEqual([
      downloadable,
      `All ${total} shown`,
      downloadable,
      closed,
      undisclosed,
      `All ${total} shown`,
    ]);
    heard.stop();
  });

  it('the reset says the filter it returns to, and only when the filter moved', async () => {
    const user = userEvent.setup();
    render(<GeneralistReleaseTimeline />);
    const status = screen.getByTestId('generalist-filter-status');
    await user.click(screen.getByRole('button', { name: /^Skild Brain$/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(status).toBeEmptyDOMElement();
    await user.click(screen.getByTestId('generalist-downloadable-only'));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(status).toHaveTextContent(`All ${GENERALIST_RELEASES.length} shown`);
    expect(screen.getByTestId('generalist-downloadable-only')).toHaveAttribute('aria-pressed', 'false');
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

  it('filtering away the selection fades its row but keeps its card, and the track lists the filter alone', async () => {
    const user = userEvent.setup();
    const { container } = render(<GeneralistReleaseTimeline />);
    await user.click(screen.getByRole('button', { name: /^Helix$/i }));
    await user.click(screen.getByRole('button', { name: /^downloadable$/i }));
    expect(screen.getByTestId('release-detail')).toHaveTextContent('Helix');
    expect(screen.getByTestId('release-availability')).toHaveTextContent('Downloadable: not stated');
    expect(container.querySelector('[data-release="helix"]')).toHaveAttribute('data-faint');
    expect(screen.queryByRole('button', { name: /^Helix$/i })).not.toBeInTheDocument();
    // Choosing from the filtered track moves the card as before.
    await user.click(screen.getByRole('button', { name: /^GR00T N1$/i }));
    expect(screen.getByTestId('release-detail')).toHaveTextContent('GR00T N1');
    expect(screen.getByTestId('release-availability')).toHaveTextContent('Downloadable: yes');
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
