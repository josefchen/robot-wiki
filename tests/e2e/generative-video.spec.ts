import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTE = '/world-models/generative-video/';

async function prepareContext(context: import('@playwright/test').BrowserContext) {
  await context.addInitScript(() => {
    const install = () => {
      if (!document.documentElement || document.getElementById('cosmos-reader-no-motion')) return;
      const style = document.createElement('style');
      style.id = 'cosmos-reader-no-motion';
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}nextjs-portal{display:none!important}';
      document.documentElement.append(style);
    };
    install();
    new MutationObserver(install).observe(document, { childList: true, subtree: true });
  });
  await context.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    return ['127.0.0.1', 'localhost'].includes(host) ? route.continue() : route.abort();
  });
}

test.beforeEach(async ({ context }) => { await prepareContext(context); });


async function sensitivity(page: Page) {
  const text = await page.getByTestId('sensitivity-readout').textContent();
  const value = Number.parseFloat(text ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

async function realism(page: Page) {
  const text = await page.getByTestId('realism-readout').textContent();
  const value = Number.parseFloat(text ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

async function finalBlockX(page: Page, panel: 'a' | 'b') {
  const x = await page.getByTestId(`block-${panel}-4`).getAttribute('x');
  return Number(x);
}

test.describe('world-models generative-video module', () => {
  test('renders every system and all three evidence items', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Generative Video World Models',
      }),
    ).toBeVisible();
    const main = page.locator('#main-content');
    for (const name of [
      // Cosmos 3 as one omni-model.
      /Mixture-of-Transformers/,
      /autoregressive subsequence handles language tokens/,
      /Nano at 16B/,
      /Super at 64B/,
      // Genie 2/3 with the honest limitations and the 60-second cap.
      /Genie 2 \(December 2024\) moved to 3D at 360p/,
      /real time at 24 fps and 720p/,
      /Limited action space/,
      /60 seconds per world/,
      // GR-1/GR-2.
      /88\.9% to 94\.9%/,
      /38 million internet video clips/,
      /97\.7% average success rate/,
      // 1X and Odyssey.
      /World Model Lab, led by Sam Sinha/,
      /new frame every 50 ms/,
      // Evidence, both directions.
      /more than 10 minutes of visually stable generated-video interaction at up to 15 FPS on a single RTX 4090/,
      /192 steps \(19\.2 seconds\), not the ten-minute horizon/,
      /not robot-control frequencies/,
      /87\.9% versus 90\.3% for DP and 76\.2% versus 73\.6% for ACT/,
      /eight policy-level aggregate scores/,
      /26 February 2026 RoboArena leaderboard/,
      /Pearson r = 0\.989 and Spearman rho = 0\.970/,
      /neither a per-task correlation nor 4,186 independent correlation points/,
      /not calibrated success probability or absolute agreement/,
      /visual plausibility is only a weak proxy for control utility/,
      /top open challenge/,
    ]) {
      await expect(
        main.getByText(name).filter({ visible: true }).first(),
      ).toBeVisible();
    }
    const nav = page.getByRole('navigation', { name: 'Robot Wiki taxonomy' });
    await expect(
      nav.getByRole('link', { name: 'Generative Video World Models' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('Genie 3 claims retain announcement and limitation scope', async ({ page }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(main).toContainText('August 5, 2025');
    await expect(main).toContainText('limited research preview');
    await expect(main).toContainText('DeepMind-reported: 720p, a few minutes');
    await expect(main).toContainText('real time at 24 fps and 720p');
    await expect(main).toContainText('not necessarily performed by the agent itself');
    await expect(main).toContainText('perfect geographic accuracy');
    await expect(main).toContainText('input world description');
    await expect(main).toContainText('received no agent goal');
    await expect(main).toContainText('does not establish manipulation performance');
    await expect(main).not.toContainText('Generated places do not correspond to real ones');
    await expect(main).not.toContainText('cannot score candidate grasps');
  });

  test('citation chips link to the required primary sources', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const main = page.locator('#main-content');
    await expect(
      main.getByRole('link', { name: /Parker-Holder 2025/ }).first(),
    ).toHaveAttribute(
      'href',
      'https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/',
    );
    await expect(
      main.getByRole('link', { name: /Wang 2026/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2603.08546');
    await expect(
      main.getByRole('link', { name: /Jeon 2026/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2607.01060');
    await expect(
      main.getByRole('link', { name: /Hou 2026/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2605.00080');
    await expect(
      main.getByRole('link', { name: /Wu 2023/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2312.13139');
    await expect(
      main.getByRole('link', { name: /Cheang 2024/ }).first(),
    ).toHaveAttribute('href', 'https://arxiv.org/abs/2410.06158');
    // Scoped to the authored prose: the generated References bibliography
    // also renders external links inside main, and with every inline chip deleted its 10 registry anchors alone still passed this floor.
    const chips = page
      .locator('div.prose[data-pagefind-body]')
      .locator('a[href^="http"]');
    expect(await chips.count()).toBeGreaterThanOrEqual(10);
  });

  test('Cosmos report scopes towers, modes, and model scales', async ({ page }) => {
    await page.goto(ROUTE);
    const prose = page.locator('div.prose[data-pagefind-body]');
    await expect(prose).toContainText('dense 8B basis; dual-tower MoT');
    await expect(prose).toContainText('the reasoning stream is not updated from diffusion tokens');
    await expect(prose).toContainText('one unchanged checkpoint');
    await expect(prose).toContainText('freshly initializes the action encoder');
    await expect(prose).toContainText('Policy mode jointly denoises future video and actions');
    await expect(prose).toContainText('Section 2.5 reports Cosmos 3 Nano at 16B');
    await expect(prose).toContainText('Cosmos 3 Super at 64B');
    await expect(prose).toContainText('rectified flow matching');
    await expect(prose).toContainText('EDM loss');
    await expect(prose).not.toContainText('Two sizes are public at launch');
    const source = prose.getByRole('link', { name: 'NVIDIA 2026', exact: true }).first();
    await expect(source).toHaveAttribute(
      'href',
      'https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf',
    );
    await source.focus();
    await expect(source).toBeFocused();
    const reference = page.locator('[data-reference-id="cosmos-3-2026"]');
    await expect(reference).toContainText('and 287 more');
    const expand = reference.getByRole('button', { name: 'Show all 295 authors', exact: true });
    await expand.focus();
    await page.keyboard.press('Enter');
    await expect(reference.locator('[data-author-names]')).toContainText('Artur Zolkowski');
    const collapse = reference.getByRole('button', { name: 'Show 8 authors', exact: true });
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await collapse.press('Enter');
    await expect(reference).toContainText('and 287 more');
    await expect(reference.getByRole('button', { name: 'Show all 295 authors', exact: true })).toBeFocused();
  });

  test('interactive: two rollouts from one frame with a sensitivity score', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await expect(page.getByTestId('initial-frame')).toBeVisible();
    await expect(page.getByTestId('rollout-panel-a')).toBeVisible();
    await expect(page.getByTestId('rollout-panel-b')).toBeVisible();
    // Default strong conditioning: the two futures visibly diverge and the
    // score clears the stated 0.30 threshold.
    await expect(
      page.getByRole('button', { name: 'Strong conditioning' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(await sensitivity(page)).toBeGreaterThan(0.3);
    expect(await finalBlockX(page, 'a')).not.toBe(await finalBlockX(page, 'b'));
    expect(await realism(page)).toBeGreaterThanOrEqual(0.85);
  });

  test('interactive: weak conditioning collapses the futures while realism stays fixed', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const realismStrong = await realism(page);
    await page.getByRole('button', { name: 'Weak conditioning' }).click();
    expect(await sensitivity(page)).toBeLessThan(0.05);
    const [xa, xb] = await Promise.all([
      finalBlockX(page, 'a'),
      finalBlockX(page, 'b'),
    ]);
    expect(Math.abs(xa - xb)).toBeLessThan(2);
    // The realism indicator does not discriminate the two states.
    expect(await realism(page)).toBe(realismStrong);
    // Back to strong reproduces the original divergent score exactly.
    await page.getByRole('button', { name: 'Strong conditioning' }).click();
    expect(await sensitivity(page)).toBeCloseTo(0.419, 2);
  });

  test('interactive: deterministic re-selection and reset', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const initial = await sensitivity(page);
    // Change rollout B to a different action, then re-select the default.
    await page
      .getByRole('button', { name: /push right/i })
      .nth(1)
      .click();
    expect(await sensitivity(page)).not.toBe(initial);
    await page
      .getByRole('button', { name: /lift gripper/i })
      .nth(1)
      .click();
    expect(await sensitivity(page)).toBe(initial);
    // Same action in both panels: sensitivity is exactly zero.
    await page
      .getByRole('button', { name: /push left/i })
      .nth(1)
      .click();
    expect(await sensitivity(page)).toBe(0);
    // Reset restores the initial frame, default actions, strong conditioning.
    await page.getByRole('button', { name: 'Weak conditioning' }).click();
    await page.getByRole('button', { name: 'Reset' }).click();
    expect(await sensitivity(page)).toBe(initial);
    await expect(page.getByTestId('initial-frame')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Strong conditioning' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('rollout-panel-a')).toContainText(
      /push left/i,
    );
    await expect(page.getByTestId('rollout-panel-b')).toContainText(
      /lift gripper/i,
    );
  });

  test('interactive: keyboard path toggles conditioning', async ({ page }) => {
    await page.goto(ROUTE);
    const strong = await sensitivity(page);
    const weakButton = page.getByRole('button', { name: 'Weak conditioning' });
    await weakButton.focus();
    await page.keyboard.press('Enter');
    await expect(weakButton).toHaveAttribute('aria-pressed', 'true');
    expect(await sensitivity(page)).toBeLessThan(strong);
  });

  test('no horizontal page scroll at 375px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    await prepareContext(context);
    const page = await context.newPage();
    await page.goto(ROUTE);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('zero axe violations', async ({ page }) => {
    await page.goto(ROUTE);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
