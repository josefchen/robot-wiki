import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NumberText, numericCellText } from '@/components/ui/number-text';
import { Table } from '@/components/ui/table';

describe('numeric text roles', () => {
  it('preserves prose, signs, precision and grouping while marking only the numbers', () => {
    const { container } = render(<NumberText>About 1,234.5 cm, or −13% below zero.</NumberText>);
    expect(container.textContent).toBe('About 1,234.5 cm, or −13% below zero.');
    expect([...container.querySelectorAll('[data-numeral-run]')].map((node) => node.textContent)).toEqual(['1,234.5', '−13']);
  });

  it('keeps numeric cell links and unknown-value prose intact', () => {
    const { container } = render(<Table caption="Published values" columns={[{ key: 'value', header: 'Value', numeric: true, render: (row) => <a href="https://example.org/source">{row.value}</a> }]} rows={[{ value: '16 samples, maximum' }, { value: 'not disclosed' }]} />);
    expect(screen.getByRole('link', { name: '16 samples, maximum' })).toHaveAttribute('href', 'https://example.org/source');
    expect(screen.getByRole('link', { name: 'not disclosed' }).querySelector('[data-numeral-run]')).toBeNull();
    expect(container.querySelector('td')).toHaveClass('font-sans');
    expect(container.querySelector('[data-numeral-run]')).toHaveClass('font-mono');
  });

  it('formats fragments and nested annotations without changing their text or links', () => {
    const { container } = render(<div>{numericCellText(<>
      {16}<span className="note"> of 32 samples; <a href="#source">measured in 2026</a></span>
      <><span>not disclosed</span>{' · '}<code>1 + 2</code></>
    </>)}</div>);
    expect(container.textContent).toBe('16 of 32 samples; measured in 2026not disclosed · 1 + 2');
    expect([...container.querySelectorAll('[data-numeral-run]')].map((node) => node.textContent)).toEqual(['16', '32', '2026']);
    expect(screen.getByRole('link', { name: 'measured in 2026' })).toHaveAttribute('href', '#source');
    expect(container.querySelector('code')?.innerHTML).toBe('1 + 2');
  });

  it('leaves custom component ownership and real code unchanged', () => {
    const code = <code>12 + 3</code>;
    expect(numericCellText(code)).toBe(code);
    const Custom = () => <span>12 samples</span>;
    const custom = <Custom />;
    expect(numericCellText(custom)).toBe(custom);
    const markup = <span dangerouslySetInnerHTML={{ __html: '<b>12</b>' }} />;
    expect(numericCellText(markup)).toBe(markup);
    const vector = <svg><text>12</text></svg>;
    expect(numericCellText(vector)).toBe(vector);
  });
});
