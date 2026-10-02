import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThesisExplorer, plainThesisName } from '@/components/interactive/thesis-explorer';
import { DEFAULT_THESIS_ID, THESES } from '@/lib/competing-theses';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('ThesisExplorer');

function thesisById(id: string) {
  const thesis = THESES.find((t) => t.id === id);
  if (!thesis) throw new Error(`unknown thesis ${id}`);
  return thesis;
}

const card = (id: string) =>
  screen.getByRole('button', { name: plainThesisName(id) });

describe('ThesisExplorer', () => {
  it('draws six bet cards with plain names, the bet and a "wrong if" line', () => {
    render(<ThesisExplorer />);
    expect(screen.getByText('Six competing bets on how robots will get smart')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^thesis-card-/)).toHaveLength(6);
    expect(
      [
        'Just make it bigger',
        'A planner directs simple skills',
        'Let the robot imagine first',
        'Copy first, then practise',
        'Humans steer while robots learn',
        'Human-shaped or built for the job',
      ],
    ).toEqual(THESES.map((thesis) => plainThesisName(thesis.id)));
    for (const thesis of THESES) {
      const scope = within(screen.getByTestId(`thesis-card-${thesis.id}`));
      expect(scope.getByRole('button', { name: plainThesisName(thesis.id) })).toBeInTheDocument();
      expect(scope.getByText(/wrong/)).toHaveAttribute('data-thesis-wrong-if');
      const drawing = screen.getByTestId(`thesis-card-${thesis.id}`).querySelector('svg');
      expect(drawing).toHaveAttribute('aria-hidden', 'true');
      expect(drawing?.querySelectorAll('rect, line, path, circle, ellipse').length).toBeGreaterThan(2);
    }
    expect(screen.getByTestId('thesis-wrong-if-note')).toHaveTextContent(
      'Each bet names the result that would prove it wrong',
    );
    expect(screen.getByTestId('thesis-readout')).toHaveTextContent(
      '6 bets. Tap one to read the evidence for and against.',
    );
  });

  it('keeps the technical names, claims, proponents and falsification wording in the method table', () => {
    render(<ThesisExplorer />);
    expect(screen.getAllByTestId(/^thesis-row-/)).toHaveLength(6);
    for (const thesis of THESES) {
      const row = screen.getByTestId(`thesis-row-${thesis.id}`);
      expect(row.closest('details')).not.toBeNull();
      const scope = within(row);
      expect(scope.getByText(thesis.name)).toBeInTheDocument();
      expect(scope.getByText(thesis.claim)).toBeInTheDocument();
      expect(scope.getByText(thesis.falsificationSignal)).toBeInTheDocument();
      expect(scope.getByText(thesis.falsification)).toBeInTheDocument();
      for (const proponent of thesis.proponents) {
        expect(row).toHaveTextContent(proponent);
      }
    }
  });

  it('opens with no card selected, then shows the four detail fields of a tapped card', async () => {
    const user = userEvent.setup();
    render(<ThesisExplorer />);
    expect(screen.queryByTestId('thesis-detail')).not.toBeInTheDocument();
    const thesis = thesisById(DEFAULT_THESIS_ID);
    await user.click(card(thesis.id));
    expect(card(thesis.id)).toHaveAttribute('aria-pressed', 'true');

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
    expect(scope.getByText(/wrong if/i)).toBeInTheDocument();
  });

  it('switches the detail view when another card is tapped', async () => {
    const user = userEvent.setup();
    render(<ThesisExplorer />);
    await user.click(card(DEFAULT_THESIS_ID));
    const target = thesisById('world-model-training');
    await user.click(card(target.id));

    expect(card(target.id)).toHaveAttribute('aria-pressed', 'true');
    expect(card(DEFAULT_THESIS_ID)).toHaveAttribute('aria-pressed', 'false');
    const detail = screen.getByTestId('thesis-detail');
    expect(detail).toHaveTextContent(target.falsification);
    for (const item of target.evidenceFor) {
      expect(detail).toHaveTextContent(item.text);
    }
    expect(detail).not.toHaveTextContent(thesisById(DEFAULT_THESIS_ID).falsification);
    expect(screen.getByTestId('thesis-readout')).toHaveTextContent(
      `showing: ${plainThesisName(target.id)}`,
    );
  });

  it('renders evidence citations as external links', async () => {
    const user = userEvent.setup();
    render(<ThesisExplorer />);
    const thesis = thesisById(DEFAULT_THESIS_ID);
    await user.click(card(thesis.id));
    const detail = screen.getByTestId('thesis-detail');
    const cited = new Set(
      [...thesis.evidenceFor, ...thesis.evidenceAgainst].flatMap((item) => item.citationIds),
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

  it('is operable from the keyboard: Enter selects, arrows move between cards', async () => {
    const user = userEvent.setup();
    render(<ThesisExplorer />);
    card('end-to-end-vla').focus();
    await user.keyboard('{Enter}');
    expect(card('end-to-end-vla')).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowDown}');
    expect(card('hierarchical-planner')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('thesis-detail')).toHaveTextContent(
      thesisById('hierarchical-planner').falsification,
    );
    await user.keyboard('{ArrowRight}');
    expect(card('world-model-training')).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowUp}');
    await user.keyboard('{Enter}');
    expect(card('hierarchical-planner')).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{End}');
    expect(card('form-factor')).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Home}');
    expect(card('end-to-end-vla')).toHaveAttribute('aria-pressed', 'true');
  });

  it('reset under "Adjust more" closes the open card', async () => {
    const user = userEvent.setup();
    render(<ThesisExplorer />);
    await user.click(card('form-factor'));
    expect(card('form-factor')).toHaveAttribute('aria-pressed', 'true');

    const reset = screen.getByRole('button', { name: /reset/i, hidden: true });
    expect(reset.closest('details')).not.toBeNull();
    await user.click(reset);
    for (const thesis of THESES) {
      expect(card(thesis.id)).toHaveAttribute('aria-pressed', 'false');
    }
    expect(screen.queryByTestId('thesis-detail')).not.toBeInTheDocument();
    expect(screen.getByTestId('thesis-readout')).toHaveTextContent(
      '6 bets. Tap one to read the evidence for and against.',
    );
  });
});
