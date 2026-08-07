import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KeyValue } from '@/components/ui/key-value';

describe('KeyValue', () => {
  it('renders terms and definitions in a description list', () => {
    render(
      <KeyValue
        items={[
          { key: 'Backbone', value: 'PaliGemma 3B' },
          { key: 'Action expert', value: 'Flow matching, 300M' },
        ]}
      />,
    );
    expect(screen.getAllByRole('term')).toHaveLength(2);
    expect(screen.getByText('Backbone')).toBeInTheDocument();
    expect(screen.getByText('PaliGemma 3B')).toBeInTheDocument();
    expect(screen.getByText('Action expert')).toBeInTheDocument();
    expect(screen.getByText('Flow matching, 300M')).toBeInTheDocument();
  });
});
