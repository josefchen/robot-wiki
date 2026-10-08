import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCENE_TARGETS } from '@/lib/motion-scene-registry';
import { auditSceneElement } from '@/lib/motion-scene-audit';
import { MOTION_CAMERA } from '@/lib/motion-tokens';
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

test('diffusion sample 60 approaches noise before the forward beat boundary', async ({ page }) => {
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
    const dot = group.locator('[data-scene-mark="noise-59"]');
    const position = async () => dot.evaluate((node) => [
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

test('diffusion camera closes on one guess and the relation is rewritten glyph by glyph', async ({ page }) => {
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
    const zoom = async () => Number(
      (await group.locator('[data-scene-camera]').getAttribute('transform'))?.match(/scale\(([\d.]+)\)/)?.[1],
    );
    const clean = async (moment: string) => {
      const audit = await group.evaluate(auditSceneElement);
      expect(audit.intersections, `${width} ${moment}`).toEqual([]);
      expect(audit.overflow, `${width} ${moment}`).toEqual([]);
    };

    // 40% into the clean-up beat the camera holds on the worked guess,
    // inside the zoom token, with the ring on it and the labels stepped aside.
    await scrubber.fill('3800');
    expect(await zoom()).toBeGreaterThan(1.5);
    expect(await zoom()).toBeLessThanOrEqual(MOTION_CAMERA.focusMaxZoom);
    expect(await opacity('[data-scene-mark="worked-guess"]')).toBeGreaterThan(0.9);
    expect(await opacity('text:text("move one")')).toBeLessThan(0.01);
    await clean('camera hold');
    await group.screenshot({ path: join(directory, `${width}-camera-hold.png`) });

    // The shared glyphs slide while "| o" waits for room, then "| o" writes in.
    await scrubber.fill('5900');
    expect(await opacity('[data-scene-glyph="arg"]')).toBe(1);
    expect(await opacity('[data-scene-glyph="given"]')).toBe(0);
    await clean('glyphs sliding');
    await group.screenshot({ path: join(directory, `${width}-symbols-slide.png`) });
    await scrubber.fill('6400');
    const writing = await opacity('[data-scene-glyph="seen"]');
    expect(writing).toBeGreaterThan(0);
    expect(writing).toBeLessThan(1);
    await clean('glyphs writing in');

    // The camera is home and every symbol gone on the finished frame.
    await scrubber.fill('9000');
    expect(await zoom()).toBe(1);
    for (const id of ['a', 'sim', 'p', 'open', 'arg', 'close', 'given', 'seen']) {
      expect(await opacity(`[data-scene-glyph="${id}"]`), id).toBe(0);
    }
  }
});

test('Kalman camera closes on the gap and the worked step is rewritten glyph by glyph', async ({ page }) => {
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
    const zoom = async () => Number(
      (await group.locator('[data-scene-camera]').getAttribute('transform'))?.match(/scale\(([\d.]+)\)/)?.[1],
    );
    const clean = async (moment: string) => {
      const audit = await group.evaluate(auditSceneElement);
      expect(audit.intersections, `${width} ${moment}`).toEqual([]);
      expect(audit.overflow, `${width} ${moment}`).toEqual([]);
    };

    // 40% into the blend beat the camera holds on the gap, inside the zoom
    // token, with the bracket drawn and the labels stepped aside.
    await scrubber.fill('3800');
    expect(await zoom()).toBeGreaterThan(1.5);
    expect(await zoom()).toBeLessThanOrEqual(MOTION_CAMERA.focusMaxZoom);
    expect(await opacity('[data-scene-mark="blend-point"]')).toBeGreaterThan(0.9);
    expect(await opacity('text:text("my guess")')).toBeLessThan(0.01);
    await clean('camera hold');
    await group.screenshot({ path: join(directory, `${width}-camera-hold.png`) });

    // The symbols beat first writes the step in the filter's own numbers.
    await scrubber.fill('5600');
    expect(await opacity('[data-scene-glyph="reading"]')).toBe(1);
    expect(await opacity('[data-scene-glyph="reading-symbol"]')).toBe(0);
    await clean('numbers written');
    await group.screenshot({ path: join(directory, `${width}-numbers-written.png`) });

    // The numbers have left and the shared signs slide; the symbols wait for room.
    await scrubber.fill('6300');
    expect(await opacity('[data-scene-glyph="equals"]')).toBe(1);
    expect(await opacity('[data-scene-glyph="reading"]')).toBe(0);
    expect(await opacity('[data-scene-glyph="reading-symbol"]')).toBe(0);
    await clean('glyphs sliding');
    await group.screenshot({ path: join(directory, `${width}-symbols-slide.png`) });
    await scrubber.fill('7000');
    expect(await opacity('[data-scene-glyph="estimate"]')).toBe(1);
    await clean('rule written');

    // The camera is home and every symbol gone on the finished frame.
    await scrubber.fill('8000');
    expect(await zoom()).toBe(1);
    for (const id of ['blend', 'equals', 'estimate', 'gain-symbol', 'reading-symbol', 'close']) {
      expect(await opacity(`[data-scene-glyph="${id}"]`), id).toBe(0);
    }

    // Between the beat ends too: labels, glyphs and marks never collide mid-move.
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
  // A mark the camera window cuts paints only inside the window, which keeps
  // the margin; widened to the stage edge, the same mark touches that edge.
  await group.locator('[clip-path]').evaluate((holder) => {
    const mark = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for (const [key, value] of Object.entries({ cx: '2', cy: '120', r: '8', 'data-scene-mark': 'planted-window-edge' })) {
      mark.setAttribute(key, value);
    }
    holder.append(mark);
  });
  const inWindow = await group.evaluate(auditSceneElement);
  expect(inWindow.overflow).toEqual([]);
  expect(inWindow.markCount).toBeGreaterThan(0);
  await group.locator('clipPath rect').evaluate((rect) => {
    rect.setAttribute('x', '0');
    rect.setAttribute('width', '340');
  });
  const widened = await group.evaluate(auditSceneElement);
  expect(widened.overflow.some((row) => row.includes('planted-window-edge'))).toBe(true);
});

test('painted horizontal, vertical, and thick strokes fail overlap and 4px margins', async ({ page }) => {
  await page.goto('/classical/state-estimation/', { waitUntil: 'networkidle' });
  const group = page.locator('[data-motion-scene="kalman-predict-update"]');
  const svg = group.locator('[data-motion-stage] svg');
  await svg.evaluate((node) => {
    const label = node.querySelector('text');
    if (!label) throw new Error('expected a stage label');
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
