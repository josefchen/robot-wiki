import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCENE_TARGETS } from '@/lib/motion-scene-registry';
import { expectedSceneRole } from '@/lib/motion-scene-roles';
import { auditSceneElement } from '@/lib/motion-scene-audit';
import { openAdjustMore } from './helpers/figure-fold';
import { waitForHydration } from './interaction-ready';

type ObservedRole = { mark: string; role: string; hex: string; beats: number[] };
const observations = new Map<string, ObservedRole[]>();
const tokens = JSON.parse(readFileSync(join(process.cwd(), 'motion-tokens.json'), 'utf8')) as {
  roles: Record<string, { stage: string }>;
};
const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const asHex = (rgb: string) => {
  const channels = rgb.match(/\d+/g);
  if (!channels || channels.length !== 3) throw new Error(`unsupported computed paint: ${rgb}`);
  return `#${channels.map((channel) => Number(channel).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

test.afterAll(() => {
  if (observations.size !== SCENE_TARGETS.length) return;
  const directory = join(process.cwd(), 'evidence/motion/scenes/site-wide');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'roles.json'), `${JSON.stringify({
    palette: Object.fromEntries(Object.entries(tokens.roles).map(([role, color]) => [role, color.stage])),
    motionSpecSha256: sha256(join(process.cwd(), 'motion-tokens.json')),
    scenes: SCENE_TARGETS.map((scene) => ({
      id: scene.id,
      route: scene.route,
      sourceSha256: sha256(join(process.cwd(), 'components/motion/scenes', `${scene.id}.tsx`)),
      marks: observations.get(scene.id),
    })),
  }, null, 2)}\n`);
});

for (const target of SCENE_TARGETS) {
  test(`${target.id}: reduced-motion beats retain controls and semantic colour roles`, async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 375, height: 800 },
    });
    try {
      const page = await context.newPage();
      await page.goto(target.route, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const scene = page.locator(`[data-motion-scene="${target.id}"]`);
      await expect(scene.getByTestId('motion-poster')).toBeVisible();
      // A poster click before hydration is lost and the player never mounts.
      await waitForHydration(scene.getByTestId('motion-poster'));
      await scene.getByTestId('motion-poster').click();
      const scrubber = scene.getByTestId('motion-scrubber');
      await expect(scrubber).toBeVisible();
      await expect(scene.getByRole('button', { name: /^Play the scene$/i })).toBeVisible();
      await scrubber.focus();
      await page.keyboard.press('Home');
      const rows = new Map<string, ObservedRole>();
      for (let index = 0; index < target.beats; index += 1) {
        await page.keyboard.press('ArrowRight');
        await expect(scene.getByTestId('motion-beat-count')).toHaveText(`beat ${index + 1} / ${target.beats}`);
        // The counter can land a frame before the stage writes the beat's
        // end-state, so the marks are read from the next painted frame.
        await page.evaluate(() => new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const caption = (await scene.getByTestId('motion-caption').textContent())?.trim();
        expect(caption).toMatch(/[.!?]$/);
        await expect(scrubber).toHaveAttribute('aria-valuetext', caption!);
        const audit = await scene.evaluate(auditSceneElement);
        expect(audit.intersections, `${target.id} beat ${index + 1}`).toEqual([]);
        expect(audit.overflow, `${target.id} beat ${index + 1}`).toEqual([]);
        expect(audit.lowContrast, `${target.id} beat ${index + 1}`).toEqual([]);
        const marks = await scene.locator('[data-motion-stage] svg').evaluate((svg) => {
          const root = getComputedStyle(document.documentElement);
          const palette = Object.fromEntries(
            ['state', 'measurement', 'action', 'value', 'constraint', 'reference', 'highlight']
              .map((role) => {
                const probe = document.createElement('span');
                probe.style.color = `var(--role-${role}-stage)`;
                document.body.append(probe);
                const color = getComputedStyle(probe).color;
                probe.remove();
                return [role, color];
              }),
          );
          // Accessing the root style ensures the generated tokens were loaded.
          if (!root.getPropertyValue('--role-state-stage')) throw new Error('motion CSS tokens missing');
          return [...svg.querySelectorAll<SVGElement>('[data-scene-mark]')].map((mark) => {
            const style = getComputedStyle(mark);
            const visible = Number(style.opacity) > 0.01 && [...function* () {
              for (let node: Element | null = mark.parentElement; node && node !== svg; node = node.parentElement) yield Number(getComputedStyle(node).opacity);
            }()].every((opacity) => opacity > 0.01);
            const paints = [style.fill, style.stroke].filter((paint) => Object.values(palette).includes(paint));
            return { name: mark.getAttribute('data-scene-mark')!, paints, palette, visible };
          });
        });
        expect(marks.length).toBeGreaterThan(0);
        for (const mark of marks) {
          const semantic = expectedSceneRole(target.id, mark.name);
          if (!mark.visible) continue;
          // A gait bar is stance when filled, loss of support when hatched.
          const role = semantic === 'gait-phase'
            ? mark.paints.includes(mark.palette.state) ? 'state' : 'constraint'
            : semantic;
          expect(mark.paints, `${target.id} beat ${index + 1} ${mark.name}: ${role}`)
            .toContain(mark.palette[role]);
          expect(mark.paints.every((paint) => paint === mark.palette[role]),
            `${target.id} ${mark.name} mixes semantic colours`).toBe(true);
          const hex = asHex(mark.paints[0]);
          const key = `${mark.name}:${role}`;
          const previous = rows.get(key);
          if (previous) previous.beats.push(index + 1);
          else rows.set(key, { mark: mark.name, role, hex, beats: [index + 1] });
        }
      }
      expect(rows.size, `${target.id} visible classified marks`).toBeGreaterThan(0);
      await openAdjustMore(scene);
      await scene.getByRole('button', { name: /step back one beat/i }).click();
      await expect(scene.getByTestId('motion-beat-count')).toHaveText(`beat ${target.beats - 1} / ${target.beats}`);
      const before = await scene.locator('[data-motion-stage] svg').innerHTML();
      await page.waitForTimeout(120);
      expect(await scene.locator('[data-motion-stage] svg').innerHTML()).toBe(before);
      await scrubber.fill('0');
      await expect(scene.getByTestId('motion-beat-count')).toHaveText(`beat 1 / ${target.beats}`);
      const startFrame = await scene.locator('[data-motion-stage] svg').innerHTML();
      await scene.getByTestId('motion-play').click();
      await page.waitForTimeout(250);
      expect(await scene.locator('[data-motion-stage] svg').innerHTML(),
        `${target.id} must not tween before the first reduced-motion hold`).toBe(startFrame);
      await expect(scene.getByTestId('motion-beat-count'))
        .toHaveText(`beat 2 / ${target.beats}`, { timeout: 3500 });
      const nextFrame = await scene.locator('[data-motion-stage] svg').innerHTML();
      expect(nextFrame, `${target.id} reduced-motion play should jump to the next still`).not.toBe(startFrame);
      await page.waitForTimeout(120);
      expect(await scene.locator('[data-motion-stage] svg').innerHTML(),
        `${target.id} must hold the new reduced-motion still`).toBe(nextFrame);
      await scene.getByTestId('motion-play').click();
      observations.set(target.id, [...rows.values()].sort((a, b) =>
        a.mark.localeCompare(b.mark) || a.role.localeCompare(b.role)));
      console.log(`${target.id}: ${target.beats} reduced-motion beats, ${rows.size} classified marks`);
    } finally {
      await context.close();
    }
  });
}
