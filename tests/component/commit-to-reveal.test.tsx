import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SelfCheck } from '@/components/article/commit-to-reveal';

const fixture = {
  prompt:
    'A constant torque bias hits one joint of a walking robot. Which layer removes it?',
  options: [
    {
      value: 'retrain',
      label: 'Retrain the policy with the payload present',
      why: 'This encodes the belief that a constant disturbance needs data. Feedback exists precisely so it does not: integral action removes the bias at runtime with no new demonstrations.',
    },
    {
      value: 'integral',
      label: 'An integral term in the joint loop',
      why: 'Proportional action alone always leaves a steady-state error, because a nonzero error is what generates the corrective torque. The integral term is what erases a constant offset.',
    },
    {
      value: 'faster-mpc',
      label: 'A faster MPC re-solve rate',
      why: 'Re-solving faster does not remove a steady-state bias the model omits. MPC pays for constraints and horizon, not for erasing constant offsets.',
    },
  ],
  answer: 'integral',
  takeaway:
    'A constant disturbance is the textbook case for integral action: the loop removes it at runtime, whatever policy sits above it.',
};

function setup() {
  return render(<SelfCheck {...fixture} />);
}

describe('SelfCheck (CommitToReveal primitive)', () => {
  it('renders one fieldset whose legend is the prompt and three same-name radios', () => {
    setup();
    const fieldsets = document.querySelectorAll('fieldset');
    expect(fieldsets).toHaveLength(1);
    const legend = within(fieldsets[0]).getByText(fixture.prompt);
    expect(legend.tagName).toBe('LEGEND');
    const radios = within(fieldsets[0]).getAllByRole('radio') as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    const names = new Set(radios.map((r) => r.name));
    expect(names.size).toBe(1);
    expect(radios.every((r) => r.name.length > 0)).toBe(true);
    // No hand-rolled radiogroup, no submit control.
    expect(document.querySelector('[role="radiogroup"]')).toBeNull();
    expect(document.querySelector('button[type="submit"]')).toBeNull();
    expect(document.querySelector('input[type="submit"]')).toBeNull();
  });

  it('ships the stable data hooks: region, reveal, takeaway, per-option reasoning', () => {
    setup();
    const region = document.querySelector('[data-self-check]');
    expect(region).not.toBeNull();
    const reveal = region?.querySelector('details[data-reveal]') as HTMLDetailsElement | null;
    expect(reveal).not.toBeNull();
    expect(region?.querySelector('[data-takeaway]')).not.toBeNull();
    const reasons = [
      ...(region?.querySelectorAll('[data-reason]') ?? []),
    ] as HTMLElement[];
    expect(reasons).toHaveLength(3);
    for (const option of fixture.options) {
      const reason = reasons.find((r) => r.dataset.reason === option.value);
      expect(reason).toBeDefined();
      expect(reason?.textContent).toContain(option.why);
    }
    const correct = reasons.find((r) => r.dataset.reason === fixture.answer);
    expect(correct?.dataset.correct).toBe('true');
  });

  it('serves the reasoning inside a closed disclosure with no blur or hiding gate', () => {
    setup();
    const reveal = document.querySelector(
      '[data-self-check] details[data-reveal]',
    ) as HTMLDetailsElement;
    expect(reveal.hasAttribute('open')).toBe(false);
    // Present in the document (no-JS reachable), closed at rest.
    expect(reveal.textContent).toContain(fixture.options[0].why);
    expect(reveal.className).not.toMatch(/blur|invisible|opacity-0/);
    expect(reveal.querySelector('summary')).not.toBeNull();
  });

  it('opens the reveal on commit, marks the chosen option, and re-reveals on a second pick', async () => {
    const user = userEvent.setup();
    setup();
    const reveal = document.querySelector(
      '[data-self-check] details[data-reveal]',
    ) as HTMLDetailsElement;
    expect(reveal.hasAttribute('open')).toBe(false);

    await user.click(screen.getByLabelText(fixture.options[0].label));
    expect(reveal.hasAttribute('open')).toBe(true);
    const chosen0 = document.querySelector('[data-chosen="true"]');
    expect(chosen0?.textContent).toContain(fixture.options[0].label);

    await user.click(screen.getByLabelText(fixture.options[1].label));
    expect(reveal.hasAttribute('open')).toBe(true);
    const chosen1 = document.querySelector('[data-chosen="true"]');
    expect(chosen1?.textContent).toContain(fixture.options[1].label);
    // Nothing locks.
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.every((r) => !r.disabled && !r.readOnly)).toBe(true);
  });

  it('marks the correct row unconditionally and the reader pick only after a commit', async () => {
    const user = userEvent.setup();
    setup();
    const rows = () =>
      [...document.querySelectorAll('[data-reason]')] as HTMLElement[];
    const correct = () => rows().find((r) => r.dataset.reason === fixture.answer)!;

    // The correct-row marking is attribute driven, so it is present
    // before any commit (the closed disclosure is what hides it) and
    // needs no effect to appear for the reader who declines to guess.
    expect(correct().dataset.correct).toBe('true');
    expect(correct().className).toMatch(/data-\[correct=true\]:/);
    // Nothing is marked as the reader's pick yet.
    expect(document.querySelectorAll('[data-selected="true"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-pick-marker]')).toHaveLength(0);

    // A wrong commit marks the reader's own row, distinctly from the
    // correct row, and puts a neutral marker on it.
    const wrong = fixture.options.find((o) => o.value !== fixture.answer)!;
    await user.click(screen.getByLabelText(wrong.label));
    const selected = rows().filter((r) => r.dataset.selected === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0].dataset.reason).toBe(wrong.value);
    expect(selected[0].querySelectorAll('[data-pick-marker]')).toHaveLength(1);
    expect(correct().dataset.selected).toBeUndefined();
    expect(correct().querySelectorAll('[data-pick-marker]')).toHaveLength(0);

    // Committing to the correct option puts both marks on one row,
    // still individually detectable.
    await user.click(screen.getByLabelText(fixture.options[1].label));
    expect(correct().dataset.correct).toBe('true');
    expect(correct().dataset.selected).toBe('true');
    expect(correct().querySelectorAll('[data-pick-marker]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-pick-marker]')).toHaveLength(1);
  });

  it('never renders a verdict word inside the region', async () => {
    const user = userEvent.setup();
    setup();
    const region = document.querySelector('[data-self-check]')!;
    const VERDICT =
      /^\s*(correct|incorrect|wrong|right|nice|well done|good job|try again|yes|no|✓|✗|✔|✘)\s*[.!]?\s*$/i;
    const scan = (label: string) => {
      for (const el of region.querySelectorAll('*')) {
        const text = (el.textContent ?? '').trim();
        expect(VERDICT.test(text), `${label}: verdict element "${text}"`).toBe(
          false,
        );
      }
    };
    scan('unanswered');
    await user.click(screen.getByLabelText(fixture.options[0].label));
    scan('wrong commit');
    await user.click(screen.getByLabelText(fixture.options[1].label));
    scan('correct commit');
  });

  it('toggles open through the summary without answering', async () => {
    const user = userEvent.setup();
    setup();
    const reveal = document.querySelector(
      '[data-self-check] details[data-reveal]',
    ) as HTMLDetailsElement;
    await user.click(reveal.querySelector('summary') as HTMLElement);
    expect(reveal.hasAttribute('open')).toBe(true);
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.every((r) => !r.checked)).toBe(true);
  });

  it('wraps the revealed reasoning in a polite live region and writes no storage', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByLabelText(fixture.options[1].label));
    const takeaway = document.querySelector('[data-takeaway]');
    expect(takeaway?.closest('[aria-live="polite"]')).not.toBeNull();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
  });
});
