import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';

type IconPrimitiveProps = {
  icon: ComponentType<IconProps>;
  label?: string;
  size?: number;
  weight?: IconProps['weight'];
  className?: string;
};

export function Icon({
  icon: Glyph,
  label,
  size = 16,
  weight = 'regular',
  className,
}: IconPrimitiveProps) {
  return (
    <Glyph
      size={size}
      weight={weight}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      data-brand-icon-id={label ? 'icon:functional' : 'icon:decorative'}
      className={className}
    />
  );
}
