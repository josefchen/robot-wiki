import { fireEvent, render, screen, within } from '@testing-library/react';
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
  it('renders the data-predict region, not the self-check hook, with the Guess first kicker', () => {
    setup();
    const region = document.querySelector('[data-predict]');
    expect(region).not.toBeNull();
    expect(document.querySelector('[data-self-check]')).toBeNull();
    expect(region?.querySelector(':scope > p')?.textContent).toBe('Guess first');
  });

  it('paints no panel of its own, so the figure sits on the page ground', () => {
    setup();
    const region = document.querySelector('[data-predict]') as HTMLElement;
    expect(region.className).not.toMatch(/\bbg-/);
    expect(region.className).not.toMatch(/\bborder\b/);
    expect(region.getAttribute('data-brand-surface-id')).toBe('surface:flat');
    const block = region.querySelector(':scope > [data-predict-figure]') as HTMLElement;
    expect(block.className).not.toMatch(/\bbg-/);
    // Without a panel around it, a ruled takeaway would be a stray full-width rule.
    const takeaway = region.querySelector('[data-takeaway]') as HTMLElement;
    expect(takeaway.className).not.toMatch(/\bborder/);
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

  it('shows the figure and the hint outside the closed disclosure, between the question and the reasoning', () => {
    setup();
    const region = document.querySelector('[data-predict]') as HTMLElement;
    const reveal = region.querySelector(
      ':scope > details[data-reveal]',
    ) as HTMLDetailsElement | null;
    expect(reveal).not.toBeNull();
    expect(reveal?.hasAttribute('open')).toBe(false);
    // The figure is rendered at settle in its own block, never in the disclosure.
    const block = region.querySelector(':scope > [data-predict-figure]');
    expect(block).not.toBeNull();
    const figure = block?.querySelector('[data-testid="stub-figure"]');
    expect(figure).not.toBeNull();
    expect(figure?.querySelector('svg')).not.toBeNull();
    expect(reveal?.querySelector('[data-testid="stub-figure"]')).toBeNull();
    expect(reveal?.querySelector('svg')).toBeNull();
    expect(figure?.closest('details')).toBeNull();
    // The hint sits directly above the figure, also outside the disclosure.
    const hint = block?.querySelector(':scope > [data-reveal-hint]');
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toContain('95.0%');
    expect(hint?.nextElementSibling).toBe(figure);
    expect(reveal?.querySelector('[data-reveal-hint]')).toBeNull();
    // Question, then figure, then reasoning: the prompt precedes its figure.
    const fieldset = region.querySelector(':scope > fieldset') as Node;
    expect(
      fieldset.compareDocumentPosition(block as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      (block as Node).compareDocumentPosition(reveal as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // The reasoning and the takeaway stay in the closed disclosure.
    expect(reveal?.querySelector('[data-takeaway]')).not.toBeNull();
    expect(reveal?.querySelectorAll('[data-reason]')).toHaveLength(3);
  });

  it('keeps the figure operable without answering', () => {
    setup();
    const slider = screen.getByRole('slider', { name: 'stub slider' }) as HTMLInputElement;
    // In the accessibility tree at settle: no closed disclosure hides it.
    expect(slider.closest('details')).toBeNull();
    expect(slider.disabled).toBe(false);
    fireEvent.change(slider, { target: { value: '6' } });
    expect(slider.value).toBe('6');
    const reveal = document.querySelector('[data-predict] details[data-reveal]') as HTMLDetailsElement;
    expect(reveal.hasAttribute('open')).toBe(false);
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.every((r) => !r.checked)).toBe(true);
  });

  it('opens through the summary without answering: takeaway and every reasoning render, figure stays put', async () => {
    const user = userEvent.setup();
    setup();
    const reveal = document.querySelector(
      '[data-predict] details[data-reveal]',
    ) as HTMLDetailsElement;
    await user.click(reveal.querySelector('summary') as HTMLElement);
    expect(reveal.hasAttribute('open')).toBe(true);
    const region = document.querySelector('[data-predict]') as HTMLElement;
    expect(
      region.querySelector(':scope > [data-predict-figure] [data-testid="stub-figure"]'),
    ).not.toBeNull();
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
