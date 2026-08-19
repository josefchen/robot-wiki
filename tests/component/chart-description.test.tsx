import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChartDescription } from '@/components/ui/chart-description';

describe('ChartDescription state form', () => {
  it('renders a dl with term/value pairs and no table', () => {
    const { container } = render(
      <ChartDescription
        form="state"
        id="state-desc"
        summary="Current labelled state"
        description="At Kp 25.0 the pole is holding at release 12.0 degrees off upright."
        states={[
          { label: 'Kp', value: '25.0' },
          { label: 'angle', value: '+12.0°' },
          { label: 'status', value: 'holding at release' },
        ]}
      />,
    );
    const details = container.querySelector('details[data-chart-data]');
    expect(details).toHaveAttribute('data-chart-form', 'state');
    expect(details?.querySelector('table')).toBeNull();
    expect(details?.querySelectorAll('dl')).toHaveLength(1);
    expect(details?.querySelectorAll('dt')).toHaveLength(3);
    expect(details?.querySelectorAll('dd')).toHaveLength(3);
    expect(container.querySelector('#state-desc')?.textContent).toMatch(/Kp 25.0/);
  });

  it('rejects fewer than three state pairs', () => {
    expect(() =>
      render(
        <ChartDescription
          form="state"
          description="too thin"
          states={[
            { label: 'a', value: '1' },
            { label: 'b', value: '2' },
          ]}
        />,
      ),
    ).toThrow(/at least 3/);
  });

  it('rejects an empty term or value', () => {
    expect(() =>
      render(
        <ChartDescription
          form="state"
          description="empty value"
          states={[
            { label: 'a', value: '1' },
            { label: 'b', value: '2' },
            { label: 'c', value: '   ' },
          ]}
        />,
      ),
    ).toThrow(/non-empty/);
  });
});
