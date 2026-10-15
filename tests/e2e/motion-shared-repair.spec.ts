import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCENE_TARGETS } from '@/lib/motion-scene-registry';
import { auditSceneElement } from '@/lib/motion-scene-audit';
import { waitForHydration } from './interaction-ready';

const descriptions = [
  {
    id: 'kalman-predict-update',
    route: '/classical/state-estimation/',
    relation: /posterior.*predicted.*gain K.*reading z.*predicted/i,
  },
  {
    id: 'diffusion-denoising',
    route: '/manipulation/diffusion-policy/',
    relation: /a ~ p\(a \| o\).*action.*distribution.*conditioned on.*observed state/i,
  },
] as const;

for (const target of SCENE_TARGETS) {
  test(`${target.id}: poster, alternative, and ${target.beats} painted beat bounds at both widths`, async ({ browser }) => {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 375 ? 800 : 900 },
        reducedMotion: 'reduce',
      });
      try {
        const page = await context.newPage();
        await page.goto(target.route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const scope = page.locator(`[data-motion-scene="${target.id}"]`);
        await expect(scope.getByTestId('motion-poster')).toBeVisible();
        const posterId = await scope.getAttribute('aria-describedby');
        expect(posterId).toBeTruthy();
        const posterText = await page.locator(`[id="${posterId}"]`).textContent();
        expect(posterText).toContain('Beat 1:');
        expect(posterText).toContain(`Beat ${target.beats}:`);
        let observedMarks = 0;
        const probe = async (beat: string) => {
          const audit = await scope.evaluate(auditSceneElement);
          expect(audit.intersections, `${target.id} ${width} ${beat}`).toEqual([]);
          expect(audit.overflow, `${target.id} ${width} ${beat}`).toEqual([]);
          observedMarks += audit.markCount;
        };
        await probe('poster');
        // A poster click before hydration is lost and the player never
        // mounts; network idle can arrive first on a loaded dev server.
        await waitForHydration(scope.getByTestId('motion-poster'));
        await scope.getByTestId('motion-poster').click();
        await expect(scope.getByTestId('motion-scrubber')).toBeVisible();
        const activeId = await scope.getAttribute('aria-describedby');
        expect(activeId).toBeTruthy();
        expect(await page.locator(`[id="${activeId}"]`).textContent()).toBe(posterText);
        await scope.getByTestId('motion-scrubber').focus();
        await page.keyboard.press('Home');
        for (let beat = 1; beat <= target.beats; beat += 1) {
          await page.keyboard.press('ArrowRight');
          await expect(scope.getByTestId('motion-beat-count')).toHaveText(`beat ${beat} / ${target.beats}`);
          await probe(`beat ${beat}`);
        }
        expect(observedMarks, `${target.id} ${width} painted marks`).toBeGreaterThan(0);
      } finally {
        await context.close();
      }
    }
  });
}

for (const reference of descriptions) {
  test(`${reference.id}: no-JS poster exposes the relation as its accessible description`, async ({ browser }) => {
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await noJs.newPage();
      await page.goto(reference.route, { waitUntil: 'domcontentloaded' });
      const group = page.locator(`[data-motion-scene="${reference.id}"]`);
      const id = await group.getAttribute('aria-describedby');
      expect(id).toBeTruthy();
      const alt = page.locator(`[id="${id}"]`);
      await expect(alt).toHaveClass(/sr-only/);
      await expect(alt).toContainText(reference.relation);
      await expect(group).toHaveAccessibleDescription(reference.relation);
      await expect(group.getByTestId('motion-poster')).toBeVisible();
      await expect(group.getByTestId('motion-scrubber')).toHaveCount(0);
      await expect(group.locator('[data-motion-stage] svg')).toHaveAttribute('aria-hidden', 'true');
      await expect(group.locator('[data-scene-equation] .katex')).toHaveCount(1);
    } finally {
      await noJs.close();
    }
  });
}

test('diffusion pin 32 approaches its noise before the forward beat boundary', async ({ page }) => {
  const directory = join(process.cwd(), 'evidence/motion/scenes/diffusion-denoising');
  mkdirSync(directory, { recursive: true });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: width === 375 ? 800 : 900 });
    await page.goto('/manipulation/diffusion-policy/', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.evaluate(() => document.fonts.ready);
    const group = page.locator('[data-motion-scene="diffusion-denoising"]');
    await waitForHydration(group.getByTestId('motion-poster'));
    await group.getByTestId('motion-poster').click();
    const scrubber = group.getByTestId('motion-scrubber');
    await expect(scrubber).toBeVisible();
    await page.keyboard.press('k');
    // The back gauge's last pin's ball, while it is random.
    const ball = group.locator('[data-scene-mark="noise-31"]');
    const position = async () => ball.evaluate((node) => [
      Number(node.getAttribute('cx')),
      Number(node.getAttribute('cy')),
    ]);
    await scrubber.fill('1000');
    const clean = await position();
    await scrubber.fill('2900');
    const near = await position();
    await group.screenshot({ path: join(directory, `${width}-beat-2-95.png`) });
    await scrubber.fill('3000');
    const boundary = await position();
    await group.screenshot({ path: join(directory, `${width}-beat-2-boundary.png`) });
    const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    expect(distance(near, boundary)).toBeLessThan(distance(clean, boundary) * 0.3);
  }
});

test('diffusion clean-up follows one guess on the step dial and the camera\'s sight line lights, with no word in the drawing', async ({ page }) => {
  const directory = join(process.cwd(), 'evidence/motion/scenes/diffusion-denoising');
  mkdirSync(directory, { recursive: true });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: width === 375 ? 800 : 900 });
    await page.goto('/manipulation/diffusion-policy/', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.evaluate(() => document.fonts.ready);
    const group = page.locator('[data-motion-scene="diffusion-denoising"]');
    await waitForHydration(group.getByTestId('motion-poster'));
    await group.getByTestId('motion-poster').click();
    const scrubber = group.getByTestId('motion-scrubber');
    await expect(scrubber).toBeVisible();
    await page.keyboard.press('k');
    const opacity = (selector: string) => group.locator(selector).first().evaluate((node) => {
      let alpha = 1;
      for (let el: Element | null = node; el && !el.matches('svg'); el = el.parentElement) {
        alpha *= Number(getComputedStyle(el).opacity);
      }
      return alpha;
    });
    const clean = async (moment: string) => {
      const audit = await group.evaluate(auditSceneElement);
      expect(audit.textCount, `${width} ${moment} words in the drawing`).toBe(0);
      expect(audit.intersections, `${width} ${moment}`).toEqual([]);
      expect(audit.overflow, `${width} ${moment}`).toEqual([]);
    };

    // 40% into the clean-up the followed guess is highlighted and the dial
    // has counted four of the ten steps, which the readout says in words.
    await scrubber.fill('3800');
    expect(await opacity('[data-scene-mark="worked-guess"]')).toBeGreaterThan(0.9);
    await expect(group.getByTestId('motion-readout')).toContainText('Step 4 of 10');
    await clean('clean-up');
    await group.screenshot({ path: join(directory, `${width}-cleanup-hold.png`) });

    // While the scene says what the move is drawn for, the camera's sight
    // line to the bar is lit, and the followed guess steps back.
    await scrubber.fill('6000');
    expect(await opacity('[data-scene-part="sight-line"]')).toBeGreaterThan(0.9);
    expect(await opacity('[data-scene-mark="worked-guess"]')).toBe(0);
    await clean('sight line');
    await group.screenshot({ path: join(directory, `${width}-sight-line.png`) });

    // The finished frame: every pin set, the sight line out.
    await scrubber.fill('9000');
    expect(await opacity('[data-scene-mark="noise-0"]')).toBe(0);
    expect(await opacity('[data-scene-mark="action-0"]')).toBe(1);
    expect(await opacity('[data-scene-part="sight-line"]')).toBe(0);

    // Between the beat ends too: no word, no overlap and no overflow mid-move.
    for (let t = 0; t <= 9000; t += 100) {
      await scrubber.fill(String(t));
      await clean(`t=${t}`);
    }
  }
});

test('Kalman blend copies the guess, lands between it and the reading, and closes narrower than both', async ({ page }) => {
  const directory = join(process.cwd(), 'evidence/motion/scenes/kalman-predict-update');
  mkdirSync(directory, { recursive: true });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: width === 375 ? 800 : 900 });
    await page.goto('/classical/state-estimation/', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.evaluate(() => document.fonts.ready);
    const group = page.locator('[data-motion-scene="kalman-predict-update"]');
    await waitForHydration(group.getByTestId('motion-poster'));
    await group.getByTestId('motion-poster').click();
    const scrubber = group.getByTestId('motion-scrubber');
    await expect(scrubber).toBeVisible();
    await page.keyboard.press('k');
    const opacity = (selector: string) => group.locator(selector).first().evaluate((node) => {
      let alpha = 1;
      for (let el: Element | null = node; el && !el.matches('svg'); el = el.parentElement) {
        alpha *= Number(getComputedStyle(el).opacity);
      }
      return alpha;
    });
    // A band's painted box: every lane is equally deep, so a wider box is a wider gap between the jaws.
    const band = (lane: string) => group.locator(`[data-scene-mark="${lane}-area"]`).evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width };
    });
    const point = () => group.locator('[data-scene-mark="blend-point"]').evaluate((node) => {
      const box = node.getBoundingClientRect();
      return box.left + box.width / 2;
    });
    const clean = async (moment: string) => {
      const audit = await group.evaluate(auditSceneElement);
      expect(audit.textCount, `${width} ${moment}: words in the drawing`).toBe(0);
      expect(audit.intersections, `${width} ${moment}`).toEqual([]);
      expect(audit.overflow, `${width} ${moment}`).toEqual([]);
    };
    const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    // Just past 22% into the blend beat the blend caliper is an exact copy of the guess: the same gap.
    await scrubber.fill('3450');
    await settle();
    expect(Math.abs((await band('blend')).width - (await band('guess')).width)).toBeLessThan(0.5);
    expect(await opacity('[data-scene-mark="blend-curve"]')).toBeGreaterThan(0.9);
    expect(await opacity('[data-scene-mark="blend-share"]')).toBeLessThan(0.01);
    await clean('blend copy');
    await group.screenshot({ path: join(directory, `${width}-blend-copy.png`) });

    // Mid-slide the rule is laid and the blend runs along it, its jaws closing.
    await scrubber.fill('4100');
    await settle();
    const sliding = await band('blend');
    expect(sliding.width).toBeLessThan((await band('guess')).width);
    expect(await opacity('[data-scene-mark="blend-share"]')).toBeGreaterThan(0.9);
    await clean('blend sliding');
    await group.screenshot({ path: join(directory, `${width}-blend-sliding.png`) });

    // The symbols beat measures the share out along the rule, from the guess's stop.
    await scrubber.fill('6000');
    await settle();
    const fill = await group.locator('[data-scene-part="share-measured"]').evaluate((node) => node.getBoundingClientRect().right);
    expect(fill).toBeLessThan(await point());
    await clean('share measured');
    await group.screenshot({ path: join(directory, `${width}-share-measured.png`) });

    // The finished frame: narrower than both, the measured share ending at the blend's pointer.
    await scrubber.fill('8000');
    await settle();
    const [guess, reading, blend] = [await band('guess'), await band('reading'), await band('blend')];
    expect(guess.width).toBeGreaterThan(reading.width);
    expect(reading.width).toBeGreaterThan(blend.width);
    const measured = await group.locator('[data-scene-part="share-measured"]').evaluate((node) => node.getBoundingClientRect().right);
    expect(Math.abs(measured - (await point()))).toBeLessThan(2.5);
    await expect(group.getByTestId('motion-readout')).toContainText('Jaws either side: guess 1.27 · reading 1.00 · blend 0.79');

    // Between the beat ends too: no mark leaves the stage margin mid-move, and no word appears.
    for (let t = 0; t <= 8000; t += 100) {
      await scrubber.fill(String(t));
      await clean(`t=${t}`);
    }
  }
});

test('a camera window that reaches the stage edge fails the 4px margin', async ({ page }) => {
  await page.goto('/manipulation/diffusion-policy/', { waitUntil: 'networkidle' });
  const group = page.locator('[data-motion-scene="diffusion-denoising"]');
  await waitForHydration(group.getByTestId('motion-poster'));
  await group.getByTestId('motion-poster').click();
  const scrubber = group.getByTestId('motion-scrubber');
  await expect(scrubber).toBeVisible();
  await page.keyboard.press('k');
  await scrubber.fill('3800');
  // A camera window inset 6 units from the stage edge, as scenes with a
  // camera draw one, holding a mark that reaches past the stage edge: the
  // mark paints only inside the window, which keeps the margin; widened to
  // the stage edge, the same mark touches that edge.
  await group.locator('[data-motion-stage] svg').evaluate((svg) => {
    const ns = 'http://www.w3.org/2000/svg';
    const [, , width, height] = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
    const defs = document.createElementNS(ns, 'defs');
    const clip = document.createElementNS(ns, 'clipPath');
    clip.setAttribute('id', 'planted-camera-window');
    const rect = document.createElementNS(ns, 'rect');
    for (const [key, value] of Object.entries({ x: 6, y: 30, width: width - 12, height: height - 36 })) {
      rect.setAttribute(key, String(value));
    }
    clip.append(rect);
    defs.append(clip);
    svg.append(defs);
    const holder = document.createElementNS(ns, 'g');
    holder.setAttribute('clip-path', 'url(#planted-camera-window)');
    const mark = document.createElementNS(ns, 'circle');
    for (const [key, value] of Object.entries({ cx: '2', cy: '120', r: '8', 'data-scene-mark': 'planted-window-edge' })) {
      mark.setAttribute(key, value);
    }
    holder.append(mark);
    svg.append(holder);
  });
  const inWindow = await group.evaluate(auditSceneElement);
  expect(inWindow.overflow).toEqual([]);
  expect(inWindow.markCount).toBeGreaterThan(0);
  await group.locator('#planted-camera-window rect').evaluate((rect) => {
    const svg = rect.closest('svg')!;
    rect.setAttribute('x', '0');
    rect.setAttribute('width', String(Number((svg.getAttribute('viewBox') ?? '').split(/\s+/)[2])));
  });
  const widened = await group.evaluate(auditSceneElement);
  expect(widened.overflow.some((row) => row.includes('planted-window-edge'))).toBe(true);
});

test('painted horizontal, vertical, and thick strokes fail overlap and 4px margins', async ({ page }) => {
  // Neither the Kalman rail nor the denoising gauge has words in its
  // drawing, so the strokes cross a label planted for the purpose, as the
  // scene spec's overlap check plants one.
  await page.goto('/manipulation/diffusion-policy/', { waitUntil: 'networkidle' });
  const group = page.locator('[data-motion-scene="diffusion-denoising"]');
  const svg = group.locator('[data-motion-stage] svg');
  await svg.evaluate((node) => {
    let label = node.querySelector('text');
    if (!label) {
      label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('data-scene-label', 'planted-label');
      label.setAttribute('x', '40');
      label.setAttribute('y', '40');
      label.textContent = 'planted label';
      node.append(label);
    }
    const text = label.getBoundingClientRect();
    const stage = node.getBoundingClientRect();
    const inverse = (node as SVGSVGElement).getScreenCTM()!.inverse();
    const point = (x: number, y: number) => new DOMPoint(x, y).matrixTransform(inverse);
    const add = (name: string, a: DOMPoint, b: DOMPoint, strokeWidth = 2) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('data-scene-mark', name);
      for (const [key, value] of Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })) {
        line.setAttribute(key, String(value));
      }
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', String(strokeWidth));
      node.append(line);
    };
    add('planted-horizontal', point(text.left - 8, text.top + text.height / 2),
      point(text.right + 8, text.top + text.height / 2));
    add('planted-vertical', point(text.left + text.width / 2, text.top - 8),
      point(text.left + text.width / 2, text.bottom + 8));
    add('planted-thick-edge', point(stage.left + 6, stage.top + 30),
      point(stage.left + 6, stage.top + 65), 8);
    add('planted-horizontal-edge', point(stage.left + 30, stage.top + 5),
      point(stage.left + 65, stage.top + 5), 4);
    const invisible = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    invisible.setAttribute('data-scene-mark', 'zero-area');
    invisible.setAttribute('cx', '-20');
    invisible.setAttribute('cy', '-20');
    invisible.setAttribute('r', '0');
    node.append(invisible);
    const structural = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    structural.setAttribute('data-scene-structure', 'test-axis');
    structural.setAttribute('x1', '0');
    structural.setAttribute('x2', '100');
    structural.setAttribute('y1', '0');
    structural.setAttribute('y2', '0');
    structural.setAttribute('stroke', 'currentColor');
    structural.setAttribute('stroke-width', '30');
    node.append(structural);
  });
  const audit = await group.evaluate(auditSceneElement);
  expect(audit.intersections.some((row) => row.includes('planted-horizontal'))).toBe(true);
  expect(audit.intersections.some((row) => row.includes('planted-vertical'))).toBe(true);
  expect(audit.overflow.some((row) => row.includes('planted-thick-edge'))).toBe(true);
  expect(audit.overflow.some((row) => row.includes('planted-horizontal-edge'))).toBe(true);
  expect([...audit.intersections, ...audit.overflow].join(' ')).not.toMatch(/zero-area|test-axis/);
});
