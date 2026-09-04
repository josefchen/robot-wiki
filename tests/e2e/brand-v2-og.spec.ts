import {
  archivedExpectedRed,
  expectedRedAssertionIds,
  test,
  expect,
} from './brand-v2-static-fixture';
import { PUBLIC_DESCRIPTOR, PUBLIC_IDENTITY } from '../../lib/identity';

test.describe('brand-v2 OG authority', () => {
  test('site metadata carries exact v2 identity and descriptor', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/`);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      'content',
      PUBLIC_IDENTITY,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute('content', PUBLIC_DESCRIPTOR);
  });

  test('article metadata uses compact Robot Wiki without the descriptor', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/manipulation/action-chunking/`);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      'content',
      PUBLIC_IDENTITY,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).not.toHaveAttribute('content', PUBLIC_DESCRIPTOR);
  });

  test('archives only the still-v1 card artwork, not the metadata', async () => {
    // The metadata half of VAL-B2-ID-009 is enforced above. What remains
    // archived is the drawn card, whose wordmark is still painted by
    // lib/og-card-artwork.ts and belongs to the social-convergence
    // milestone; this reads the archive so narrowing it back to cover
    // metadata again cannot pass silently.
    expect(expectedRedAssertionIds('brand-v2 OG authority')).toEqual([
      'VAL-B2-ID-009',
    ]);
    expect(
      archivedExpectedRed('brand-v2 OG authority', 'VAL-B2-ID-009'),
    ).toContain('card artwork');
  });
});
