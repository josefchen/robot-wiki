import { render, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import CompanyProfilePage from '@/app/companies/[slug]/page';

vi.mock('@/components/model-viewer/model-viewer.css', () => ({}));

it('opens the Unitree profile with the maker’s G1 still, credits, and a model the reader can load', async () => {
  const page = await CompanyProfilePage({ params: Promise.resolve({ slug: 'unitree' }) });
  const { container, getByRole } = render(page);
  const viewer = container.querySelector<HTMLElement>('[data-model-viewer="unitree-g1"]')!;
  const view = within(viewer);
  expect(view.getByRole('button', { name: 'Load model' })).toBeInTheDocument();
  expect(view.getByRole('img').getAttribute('alt')).toContain('g1_23dof_rev_1_0.urdf');
  expect(viewer.querySelector('canvas')).toBeNull();
  expect(getByRole('link', { name: /^BSD-3-Clause$/ })).toHaveAttribute('href', '/robots-in-3d/licences/unitree-g1.txt');
  expect(getByRole('link', { name: 'Model details' })).toHaveAttribute('href', '/robots-in-3d/#unitree-g1');
  const specs = getByRole('heading', { name: 'G1 specifications' }).parentElement!;
  expect(specs).toHaveTextContent('USD 13,500');
  expect(specs).toHaveTextContent('about 35 kg');
  expect(specs).toHaveTextContent('Degrees of freedom23');
  expect(specs).toHaveTextContent('May 2024');
  expect(getByRole('link', { name: 'g1_23dof_rev_1_0.urdf' }).getAttribute('href'))
    .toContain('/blob/157ff950351e5f535e03c5d85a16b7d594b3dbcc/robots/g1_description/g1_23dof_rev_1_0.urdf');
});
