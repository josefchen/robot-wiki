import type { ComponentPropsWithoutRef, ComponentType } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMDXComponents } from '../../mdx-components';

function Anchor(props: ComponentPropsWithoutRef<'a'>) {
  const Link = useMDXComponents({}).a as ComponentType<ComponentPropsWithoutRef<'a'>>;
  return <Link {...props} />;
}

describe('authored Markdown links', () => {
  it.each([
    'https://huggingface.co/datasets/x-humanoid-robomind/RoboMIND',
    'http://example.org/paper',
    '//example.org/paper',
    'HTTPS://example.org/paper',
  ])('keeps %s safe without changing navigation or text', href => {
    render(<Anchor href={href}>Primary source</Anchor>);
    const link = screen.getByRole('link', { name: 'Primary source' });
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('tabindex');
    expect(link).toHaveAttribute('data-brand-control-id', 'control:link-focus');
  });

  it('preserves other relationship tokens and a declared target without allowing opener', () => {
    render(<Anchor href="https://example.org/" rel="nofollow opener noreferrer nofollow" target="_blank">Source</Anchor>);
    const link = screen.getByRole('link', { name: 'Source' });
    expect(link).toHaveAttribute('rel', 'nofollow noreferrer noopener');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it.each(['/classical/state-estimation/', '#references', 'mailto:editor@example.org'])(
    'preserves the relationship on %s', href => {
      render(<Anchor href={href} rel="author">Related</Anchor>);
      expect(screen.getByRole('link', { name: 'Related' })).toHaveAttribute('rel', 'author');
    },
  );
});
