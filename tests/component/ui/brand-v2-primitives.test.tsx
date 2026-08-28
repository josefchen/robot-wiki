import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrowUpRight } from '@phosphor-icons/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Action,
  BrandDevice,
  Chip,
  Icon,
  InputField,
  Material,
  Surface,
  Tabs,
} from '@/components/ui';

describe('brand-v2 shared primitives', () => {
  it('renders surface levels with stable variant annotations', () => {
    const { rerender } = render(<Surface level="flat">Flat</Surface>);
    expect(screen.getByText('Flat')).toHaveAttribute(
      'data-brand-surface-id',
      'surface:flat',
    );

    rerender(<Surface level="raised">Raised</Surface>);
    expect(screen.getByText('Raised')).toHaveAttribute(
      'data-brand-surface-id',
      'surface:raised',
    );

    rerender(<Surface level="floating">Floating</Surface>);
    expect(screen.getByText('Floating')).toHaveAttribute(
      'data-brand-surface-id',
      'surface:floating',
    );

    rerender(<Surface level="bounded-dark">Instrument</Surface>);
    expect(screen.getByText('Instrument')).toHaveAttribute(
      'data-brand-surface-id',
      'surface:bounded-dark-instrument',
    );
  });

  it('keeps primary action, persistent selection, and link focus semantics distinct', () => {
    render(
      <>
        <Action variant="primary">Run</Action>
        <Chip selected onClick={() => undefined}>Selected</Chip>
        <Action href="/search/" variant="link">
          Search
        </Action>
      </>,
    );

    const primary = screen.getByRole('button', { name: 'Run' });
    expect(primary).toHaveAttribute(
      'data-brand-control-id',
      'control:primary-action',
    );
    expect(primary).toHaveClass('bg-action', 'text-on-action');

    const selected = screen.getByText('Selected');
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(selected).toHaveAttribute(
      'data-brand-control-id',
      'control:selection',
    );
    expect(selected).toHaveClass('bg-selection', 'text-ink');

    const link = screen.getByRole('link', { name: 'Search' });
    expect(link).toHaveAttribute(
      'data-brand-control-id',
      'control:link-focus',
    );
    expect(link).toHaveClass('text-link');
  });

  it('renders inputs with a persistent visible label and described helper text', () => {
    render(
      <InputField
        label="Search modules"
        name="query"
        description="Titles and article text"
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Search modules' });
    expect(input).toHaveAttribute('data-brand-control-id', 'control:input');
    expect(input).toHaveAccessibleDescription('Titles and article text');
  });

  it('renders one framed tab group and exposes only persistent selection', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs
        ariaLabel="View"
        value="grid"
        onValueChange={onValueChange}
        items={[
          { value: 'grid', label: 'Grid' },
          { value: 'timeline', label: 'Timeline' },
        ]}
      />,
    );

    const tablist = screen.getByRole('tablist', { name: 'View' });
    expect(tablist).toHaveAttribute(
      'data-brand-control-id',
      'control:segmented',
    );
    expect(screen.getByRole('tab', { name: 'Grid' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    await user.click(screen.getByRole('tab', { name: 'Timeline' }));
    expect(onValueChange).toHaveBeenCalledWith('timeline');
  });

  it('keeps decorative devices pointer-inert and absent from accessibility', () => {
    const { container } = render(
      <BrandDevice
        device="registration-cross"
        anchorSelector="#surface"
      />,
    );
    const device = container.firstElementChild;
    expect(device).toHaveAttribute(
      'data-brand-device-id',
      'device:registration-cross',
    );
    expect(device).toHaveAttribute('aria-hidden', 'true');
    expect(device).toHaveClass('pointer-events-none');
  });

  it('registers material and icon primitives without inventing a brand symbol', () => {
    const { container } = render(
      <Material treatment="paper">
        <Icon icon={ArrowUpRight} label="Open source" />
      </Material>,
    );
    expect(container.firstElementChild).toHaveAttribute(
      'data-brand-material-id',
      'material:paper',
    );
    expect(screen.getByLabelText('Open source')).toHaveAttribute(
      'data-brand-icon-id',
      'icon:functional',
    );
  });
});
