import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Term } from '@/components/ui/term';

const props = {
  termId: 'covariate-shift',
  term: 'covariate shift',
  definition:
    'The mismatch between the state distribution in the training demonstrations and the distribution the learned policy visits at deployment.',
};

describe('Term', () => {
  it('renders the MDX children as the inline text', () => {
    render(<Term {...props}>covariate shift</Term>);
    expect(screen.getByRole('link', { name: 'covariate shift' })).toBeVisible();
  });

  it('falls back to the registry term name when no children are given', () => {
    render(<Term {...props} />);
    expect(screen.getByRole('link', { name: 'covariate shift' })).toBeVisible();
  });

  it('links the term to its glossary anchor', () => {
    render(<Term {...props}>covariate shift</Term>);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/glossary#covariate-shift',
    );
  });

  it('wires aria-describedby to the element that holds the definition', () => {
    render(<Term {...props}>covariate shift</Term>);
    const link = screen.getByRole('link');
    const describedBy = link.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const tooltip = document.getElementById(describedBy!);
    expect(tooltip).not.toBeNull();
    expect(tooltip).toHaveAttribute('role', 'tooltip');
    expect(tooltip!.textContent).toContain(props.definition);
    expect(tooltip!.textContent).toContain(props.term);
  });

  it('reveals via hover and focus-within CSS hooks (group classes), not JS visibility', () => {
    render(<Term {...props}>covariate shift</Term>);
    const link = screen.getByRole('link');
    const tooltip = document.getElementById(
      link.getAttribute('aria-describedby')!,
    );
    expect(tooltip!.className).toContain('group-hover:block');
    expect(tooltip!.className).toContain('group-focus-within:block');
    expect(tooltip!.className).toContain('hidden');
  });

  it('exposes the glossary id as data-term-id for reconciliation', () => {
    const { container } = render(<Term {...props}>covariate shift</Term>);
    expect(
      container.querySelector('[data-term-id="covariate-shift"]'),
    ).not.toBeNull();
  });
});
