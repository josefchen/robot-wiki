import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThesisExplorer } from '@/components/interactive/thesis-explorer';
import { DEFAULT_THESIS_ID, THESES } from '@/lib/competing-theses';

function thesisById(id: string) {
  const thesis = THESES.find((t) => t.id === id);
  if (!thesis) throw new Error(`unknown thesis ${id}`);
  return thesis;
}

describe('ThesisExplorer', () => {
  it('renders a row for each of the six theses with its claim and falsification signal', () => {
    render(<ThesisExplorer />);
    expect(screen.getAllByTestId(/^thesis-row-/)).toHaveLength(6);
    for (const thesis of THESES) {
      const row = screen.getByTestId(`thesis-row-${thesis.id}`);
      const scope = within(row);
      expect(
        scope.getByRole('button', { name: thesis.name }),
      ).toBeInTheDocument();
      expect(scope.getByText(thesis.claim)).toBeInTheDocument();
      expect(scope.getByText(thesis.falsificationSignal)).toBeInTheDocument();
    }
    expect(screen.getByTestId('thesis-readout')).toHaveTextContent(
      /^6 theses, showing: /,
    );
  });

  it('opens with the default thesis selected and its four detail fields visible', () => {
    render(<ThesisExplorer />);
    const thesis = thesisById(DEFAULT_THESIS_ID);
    expect(
      screen.getByRole('button', { name: thesis.name }),
    ).toHaveAttribute('aria-pressed', 'true');

    const detail = screen.getByTestId('thesis-detail');
    const scope = within(detail);
    expect(scope.getByText(thesis.claim)).toBeInTheDocument();
    for (const proponent of thesis.proponents) {
      expect(scope.getByText(proponent)).toBeInTheDocument();
    }
    for (const item of thesis.evidenceFor) {
      expect(scope.getByText(item.text)).toBeInTheDocument();
    }
    for (const item of thesis.evidenceAgainst) {
      expect(scope.getByText(item.text)).toBeInTheDocument();
    }
    expect(scope.getByText(thesis.falsification)).toBeInTheDocument();
    expect(scope.getByText(/evidence for/i)).toBeInTheDocument();
    expect(scope.getByText(/evidence against/i)).toBeInTheDocument();
    expect(scope.getByText(/falsification/i)).toBeInTheDocument();
  });

  it('switches the detail view when another thesis row is clicked', async () => {
    const user = userEvent.setup();
    render(<ThesisExplorer />);
    const target = thesisById('world-model-training');
    await user.click(screen.getByRole('button', { name: target.name }));

    expect(
      screen.getByRole('button', { name: target.name }),
    ).toHaveAttribute('aria-pressed', 'true');
    const detail = screen.getByTestId('thesis-detail');
    expect(detail).toHaveTextContent(target.falsification);
    for (const item of target.evidenceFor) {
      expect(detail).toHaveTextContent(item.text);
    }
    // The previous thesis's detail is gone.
    const previous = thesisById(DEFAULT_THESIS_ID);
    expect(detail).not.toHaveTextContent(previous.falsification);
    expect(screen.getByTestId('thesis-readout')).toHaveTextContent(
      `showing: ${target.name}`,
    );
  });

  it('renders evidence citations as external links', () => {
    render(<ThesisExplorer />);
    const thesis = thesisById(DEFAULT_THESIS_ID);
    const detail = screen.getByTestId('thesis-detail');
    // The detail view cites the ids the data row declares; each chip's
    // primary link goes out to the source (the chip also carries an
    // in-page anchor to the References entry, which is internal).
    const cited = new Set(
      [...thesis.evidenceFor, ...thesis.evidenceAgainst].flatMap(
        (item) => item.citationIds,
      ),
    );
    expect(cited.size).toBeGreaterThanOrEqual(2);
    for (const id of cited) {
      const chip = detail.querySelector(`[data-cite-id="${id}"]`);
      expect(chip, `missing chip for ${id}`).not.toBeNull();
      const external = chip?.querySelector('a[href^="http"]');
      expect(external, `chip ${id} has no external link`).not.toBeNull();
      expect(external).toHaveAttribute('target', '_blank');
    }
  });

  it('is operable from the keyboard: Enter selects, arrows move between theses', async () => {
    const user = userEvent.setup();
    render(<ThesisExplorer />);
    const first = thesisById('end-to-end-vla');
    const second = thesisById('hierarchical-planner');
    const third = thesisById('world-model-training');

    const firstButton = screen.getByRole('button', { name: first.name });
    firstButton.focus();
    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('button', { name: second.name }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('thesis-detail')).toHaveTextContent(
      second.falsification,
    );

    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('button', { name: third.name }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{ArrowUp}');
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('button', { name: second.name }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('reset restores the default selection', async () => {
    const user = userEvent.setup();
    render(<ThesisExplorer />);
    const target = thesisById('form-factor');
    await user.click(screen.getByRole('button', { name: target.name }));
    expect(
      screen.getByRole('button', { name: target.name }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /reset/i }));
    const fallback = thesisById(DEFAULT_THESIS_ID);
    expect(
      screen.getByRole('button', { name: fallback.name }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('thesis-detail')).toHaveTextContent(
      fallback.falsification,
    );
    expect(screen.getByTestId('thesis-readout')).toHaveTextContent(
      `showing: ${fallback.name}`,
    );
  });
});
