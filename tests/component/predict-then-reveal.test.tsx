import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PredictThenReveal } from '@/components/article/commit-to-reveal';

/** A stand-in for a wrapped interactive: an svg plus a control. */
function StubFigure() {
  return (
    <div data-testid="stub-figure">
      <svg viewBox="0 0 10 10" role="img" aria-label="stub chart">
        <path d="M0 0 L10 10" />
      </svg>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        defaultValue={5}
        aria-label="stub slider"
      />
    </div>
  );
}

const fixture = {
  prompt:
    'A policy gets every decision right 95% of the time. Roughly how many decisions in a row before the whole task succeeds only half the time?',
  revealHint:
    'The curve is mounted at 95.0% per-step success over 14 steps, reading 48.8% episode success.',
  options: [
    {
      value: 'fourteen',
      label: 'About 14 decisions, because the loss compounds at every step',
      why: 'The product 0.95 to the n reaches one half between 13 and 14 decisions. The per-step number sounded strong; the task-level number is a coin flip weighted toward failure.',
    },
    {
      value: 'fifty',
      label: 'About 50 decisions, since 95% leaves little room for error',
      why: 'This treats the per-step number as if it carried over linearly to the task. A 5% loss per decision compounds multiplicatively: by 50 decisions the product is 7.7%.',
    },
    {
      value: 'two-hundred',
      label: 'About 200 decisions, because errors average out over an episode',
      why: 'This encodes the belief that independent mistakes cancel like noise around a mean. Success needs every decision right, so errors multiply toward zero and longer episodes are worse, not safer.',
    },
  ],
  answer: 'fourteen',
  takeaway:
    'At 95% per step the task is a coin flip after 14 decisions, and after 30 it sits at 21.5%: the per-step number cannot be read off the task-level number.',
};

function setup() {
  return render(
    <PredictThenReveal {...fixture}>
      <StubFigure />
    </PredictThenReveal>,
  );
}

describe('PredictThenReveal (CommitToReveal primitive)', () => {
  it('renders the data-predict region, not the self-check hook, with the Prediction kicker', () => {
    setup();
    const region = document.querySelector('[data-predict]');
    expect(region).not.toBeNull();
    expect(document.querySelector('[data-self-check]')).toBeNull();
    expect(region?.textContent).toContain('Prediction');
  });

  it('keeps the native fieldset contract: legend prompt, three same-name radios', () => {
    setup();
    const fieldset = document.querySelector('[data-predict] fieldset');
    expect(fieldset).not.toBeNull();
    const legend = within(fieldset as HTMLFieldSetElement).getByText(
      fixture.prompt,
    );
    expect(legend.tagName).toBe('LEGEND');
    const radios = within(fieldset as HTMLFieldSetElement).getAllByRole(
      'radio',
    ) as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
  });

  it('ships the figure and the reveal hint inside the closed disclosure', () => {
    setup();
    const reveal = document.querySelector(
      '[data-predict] details[data-reveal]',
    ) as HTMLDetailsElement | null;
    expect(reveal).not.toBeNull();
    expect(reveal?.hasAttribute('open')).toBe(false);
    // The figure is present in the document, gated only by disclosure state.
    const figure = reveal?.querySelector('[data-testid="stub-figure"]');
    expect(figure).not.toBeNull();
    expect(figure?.querySelector('svg')).not.toBeNull();
    // The hint is inside the reveal and precedes the figure in DOM order.
    const hint = reveal?.querySelector('[data-reveal-hint]');
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toContain('95.0%');
    const hintFirst =
      (hint as Node).compareDocumentPosition(figure as Node) &
      Node.DOCUMENT_POSITION_FOLLOWING;
    expect(hintFirst).toBeTruthy();
  });

  it('opens through the summary without answering: figure, hint, takeaway and every reasoning render', async () => {
    const user = userEvent.setup();
    setup();
    const reveal = document.querySelector(
      '[data-predict] details[data-reveal]',
    ) as HTMLDetailsElement;
    await user.click(reveal.querySelector('summary') as HTMLElement);
    expect(reveal.hasAttribute('open')).toBe(true);
    const region = document.querySelector('[data-predict]') as HTMLElement;
    expect(region.querySelector('[data-testid="stub-figure"]')).not.toBeNull();
    const takeaway = region.querySelector('[data-takeaway]');
    expect(takeaway?.textContent).toContain('coin flip after 14 decisions');
    const reasons = Array.from(region.querySelectorAll('[data-reason]'));
    expect(reasons).toHaveLength(3);
    for (const option of fixture.options) {
      expect(
        reasons.some((r) => r.getAttribute('data-reason') === option.value),
      ).toBe(true);
    }
    // The escape path marks no option as chosen.
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.every((r) => !r.checked)).toBe(true);
    expect(document.querySelector('[data-chosen="true"]')).toBeNull();
  });

  it('reveals the same payload when an option is committed', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByLabelText(fixture.options[1].label));
    const reveal = document.querySelector(
      '[data-predict] details[data-reveal]',
    ) as HTMLDetailsElement;
    expect(reveal.hasAttribute('open')).toBe(true);
    const takeaway = document.querySelector('[data-takeaway]');
    expect(takeaway?.textContent).toContain('coin flip after 14 decisions');
    expect(document.querySelector('[data-chosen="true"]')?.textContent).toContain(
      fixture.options[1].label,
    );
  });

  it('wraps the takeaway in a polite live region', () => {
    setup();
    const takeaway = document.querySelector('[data-takeaway]');
    expect(takeaway?.closest('[aria-live="polite"]')).not.toBeNull();
  });
});
