import { expect, test, type Locator, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticExportServer, type StaticExportServer } from './static-export-server';

/**
 * State-form chart descriptions (VAL-EDU-032..034) plus the article-route
 * design-bounds guard this sweep claims (VAL-EDU-031). Against the shipped
 * static export on an OS-assigned port.
 */

let BASE: string;
let server: StaticExportServer | null = null;

test.beforeAll(async () => {
  const outDir = join(process.cwd(), 'out');
  expect(
    existsSync(join(outDir, 'index.html')),
    'out/ is missing or stale: run `npm run build` before the chart-state-descriptions spec',
  ).toBe(true);
  server = await startStaticExportServer(outDir);
  BASE = `http://localhost:${server.port}`;
});

test.afterAll(async () => {
  await server?.stop();
});

const CHARTS: Array<{
  route: string;
  name: string;
  control: 'range' | 'button';
  moves: string[];
  def: string;
  match?: string;
}> = [
  { route: '/classical/control', name: 'pendulum', control: 'range', moves: ['9.5', '40'], def: '25' },
  {
    route: '/classical/grasp-planning',
    name: 'grasp-object',
    control: 'range',
    moves: ['0.20', '1.20'],
    def: '0.7',
    match: 'frictional contacts',
  },
  {
    route: '/classical/grasp-planning',
    name: 'grasp-wrench',
    control: 'range',
    moves: ['0.20', '1.20'],
    def: '0.7',
    match: 'Ferrari-Canny',
  },
  { route: '/classical/motion-planning', name: 'rrt', control: 'range', moves: ['40', '120'], def: '0' },
  { route: '/classical/kinematics', name: 'planar-fk', control: 'range', moves: ['40', '160'], def: '110' },
  {
    route: '/manipulation/bc-foundations',
    name: 'compounding-rollout',
    control: 'range',
    moves: ['10', '1'],
    def: '5',
    match: 'Per-timestep prediction',
  },
  {
    route: '/manipulation/diffusion-policy',
    name: 'denoising',
    control: 'range',
    moves: ['10', '5'],
    def: '0',
    match: 'denoising step',
  },
  {
    route: '/manipulation/diffusion-policy',
    name: 'receding',
    control: 'range',
    moves: ['24', '8'],
    def: '16',
    match: 'receding-horizon plan',
  },
  {
    route: '/manipulation/vla-models',
    name: 'tokenization-bin',
    control: 'range',
    moves: ['0', '15'],
    def: '7',
    match: 'quantization error',
  },
  {
    route: '/manipulation/pi-line',
    name: 'flow-matching',
    control: 'range',
    moves: ['1', '50'],
    def: '10',
    match: 'Euler',
  },
  {
    route: '/manipulation/knowledge-insulation',
    name: 'mot',
    control: 'range',
    moves: ['3', '0'],
    def: '8',
  },
  {
    route: '/manipulation/cross-embodiment',
    name: 'cross-embodiment',
    control: 'button',
    moves: ['Shared relative EEF space', 'Motion transfer'],
    def: 'Padded shared vector',
  },
  {
    route: '/manipulation/hierarchical',
    name: 'hierarchy',
    control: 'range',
    moves: ['400', '1000'],
    def: '0',
  },
  {
    route: '/rl-sim2real/why-rl-locomotion',
    name: 'contact-geometry',
    control: 'range',
    moves: ['8', '25'],
    def: '2',
    match: 'Locomotion at',
  },
  {
    route: '/rl-sim2real/sim2real-transfer',
    name: 'teacher-student',
    control: 'range',
    moves: ['40', '90'],
    def: '15',
    match: 'proprioceptive degradation',
  },
  {
    route: '/rl-sim2real/humanoid-wbc',
    name: 'wbc',
    control: 'button',
    moves: ['Latent-action hierarchy', 'End-to-end VLA'],
    def: 'Motion-tracking RL',
    match: 'Motion-tracking RL',
  },
  {
    route: '/adjacent/drones',
    name: 'perception-latency',
    control: 'range',
    moves: ['150', '0'],
    def: '70',
    match: 'perception latency',
  },
  {
    route: '/world-models/generative-sim',
    name: 'appearance-physics',
    control: 'range',
    moves: ['8', '1'],
    def: '4',
    match: 'physics proxy is off',
  },
  {
    route: '/manipulation/pi-line',
    name: 'pi-timeline',
    control: 'button',
    moves: ['π0.5', 'π0.7'],
    def: 'π0',
    match: 'openpi stops',
  },
  {
    route: '/manipulation/generalist-policies',
    name: 'generalist-timeline',
    control: 'button',
    moves: ['GR00T N1', 'Skild Brain'],
    def: 'Helix',
    match: 'generalist policies',
  },
  {
    route: '/world-models/latent-dynamics',
    name: 'latent-rollout',
    control: 'range',
    moves: ['30', '50'],
    def: '15',
    match: 'latent rollout view',
  },
  {
    route: '/world-models/jepa',
    name: 'jepa-planning',
    control: 'range',
    moves: ['8', '48'],
    def: '24',
    match: 'search budget of',
  },
  {
    route: '/world-models/generative-video',
    name: 'action-conditioning',
    control: 'button',
    moves: ['Weak conditioning', 'Strong conditioning'],
    def: 'Strong conditioning',
    match: 'action sensitivity',
  },
];

const HOST_ROUTES = [...new Set(CHARTS.map((c) => c.route))];

async function setRange(page: Page, input: Locator, value: string) {
  await input.evaluate((el, v) => {
    const target = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(target, String(v));
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(150);
}

async function setControl(
  page: Page,
  shell: Locator,
  chart: (typeof CHARTS)[number],
  value: string,
) {
  if (chart.control === 'button') {
    await shell.getByRole('button', { name: value, exact: true }).click();
    await page.waitForTimeout(150);
    return;
  }
  const control = shell.locator('input[type="range"]').first();
  await setRange(page, control, value);
}

function digitOrRegimeTokens(text: string): string[] {
  return text.split(/\s+/).filter((t) => /\d/.test(t) || /[A-Za-z]{3,}/.test(t));
}

for (const chart of CHARTS) {
  test.describe(`${chart.name} state description (${chart.route})`, () => {
    test('SVG resolves a state-form dl that is richer than the name', async ({ page }) => {
      await page.goto(`${BASE}${chart.route}`);
      const desc = chart.match
        ? page.locator('[data-chart-description]', { hasText: chart.match }).first()
        : page.locator('[data-chart-description]').first();
      await expect(desc).toBeAttached();
      const shell = page.locator('div.rounded-md.border', { has: desc }).first();
      const svg = shell.locator('svg[role][aria-describedby]').first();
      const describedby = await svg.getAttribute('aria-describedby');
      expect(describedby, 'aria-describedby is set').toBeTruthy();
      const resolved = await shell.evaluate((el, id) => {
        const target = el.querySelector(`[id="${id}"]`);
        if (!target) return null;
        return {
          tag: target.tagName,
          text: (target.textContent ?? '').trim(),
        };
      }, describedby!);
      expect(resolved, 'describedby target exists').toBeTruthy();
      expect(resolved!.tag.toLowerCase()).toBe('p');
      expect(resolved!.text.length).toBeGreaterThanOrEqual(60);

      const details = desc.locator('xpath=../details[@data-chart-data]').first();
      await expect(details).toHaveAttribute('data-chart-form', 'state');
      await details.evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
      await expect(details.locator('table')).toHaveCount(0);
      await expect(details.locator('dl')).toHaveCount(1);
      const terms = details.locator('dt');
      const values = details.locator('dd');
      const termCount = await terms.count();
      expect(termCount).toBeGreaterThanOrEqual(3);
      expect(await values.count()).toBe(termCount);
      const pairs: Array<{ term: string; value: string }> = [];
      for (let i = 0; i < termCount; i += 1) {
        const term = ((await terms.nth(i).innerText()) ?? '').trim();
        const value = ((await values.nth(i).innerText()) ?? '').trim();
        expect(term.length, 'term non-empty').toBeGreaterThan(0);
        expect(value.length, 'value non-empty').toBeGreaterThan(0);
        pairs.push({ term, value });
      }
      const rich = pairs.filter((p) => /\d/.test(p.value) || /[A-Za-z]{3,}/.test(p.value));
      expect(rich.length, 'at least 2 digit or named-regime values').toBeGreaterThanOrEqual(2);

      const label = (await svg.getAttribute('aria-label')) ?? '';
      const norm = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
      expect(norm(label).includes(norm(resolved!.text))).toBe(false);
      const extra = digitOrRegimeTokens(resolved!.text + ' ' + pairs.map((p) => p.value).join(' '))
        .map((t) => t.toLowerCase())
        .filter((t) => !norm(label).includes(t.toLowerCase()));
      expect(extra.length, 'at least one token absent from the aria-label').toBeGreaterThan(0);
    });

    test('state list and takeaway track the primary control', async ({ page }) => {
      await page.goto(`${BASE}${chart.route}`);
      const desc = chart.match
        ? page.locator('[data-chart-description]', { hasText: chart.match }).first()
        : page.locator('[data-chart-description]').first();
      const shell = page.locator('div.rounded-md.border', { has: desc }).first();
      const details = desc.locator('xpath=../details[@data-chart-data]').first();
      await details.evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
      const original = (await desc.innerText()).trim();
      const originalValues = await details.locator('dd').evaluateAll((els) =>
        els.map((el) => (el.textContent ?? '').trim()),
      );
      const tokenKey = (s: string) =>
        digitOrRegimeTokens(s).join(' ');
      await setControl(page, shell, chart, chart.moves[0]);
      const moved = (await desc.innerText()).trim();
      const movedValues = await details.locator('dd').evaluateAll((els) =>
        els.map((el) => (el.textContent ?? '').trim()),
      );
      expect(movedValues.join('|') !== originalValues.join('|'), 'a state value changes').toBe(
        true,
      );
      expect(
        tokenKey(moved) !== tokenKey(original),
        'a digit or named-regime token in the takeaway changes',
      ).toBe(true);
      await setControl(page, shell, chart, chart.def);
      await expect.poll(async () => (await desc.innerText()).trim()).toBe(original);
    });
  });
}

test.describe('article-route design bounds after the state retrofit (VAL-EDU-031)', () => {
  for (const route of HOST_ROUTES) {
    test(`${route} keeps micro-label, rule and boxing bounds`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}${route}`);
      const report = await page.evaluate(() => {
        const alpha = (color: string) => {
          const m = color.match(/rgba?\(([^)]+)\)/);
          if (!m) return 1;
          const parts = m[1].split(',').map((s) => parseFloat(s));
          return parts.length === 4 ? parts[3] : 1;
        };
        const micro: string[] = [];
        for (const el of Array.from(document.querySelectorAll('body *'))) {
          if (el.children.length > 0) continue;
          const text = (el.textContent ?? '').trim();
          if (text.length < 3) continue;
          const cs = getComputedStyle(el);
          const fontSize = parseFloat(cs.fontSize);
          if (fontSize > 15) continue;
          const spacing =
            cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
          if (spacing < 0.02 * fontSize) continue;
          const upper =
            cs.textTransform === 'uppercase' ||
            (text === text.toUpperCase() && /[A-Z]/.test(text));
          if (upper) micro.push(text);
        }
        const main = document.querySelector('main');
        const rules: string[] = [];
        if (main) {
          for (const el of Array.from(main.querySelectorAll('*'))) {
            if (el.closest('table')) continue;
            const role = el.getAttribute('role');
            if (el.tagName === 'ASIDE' || role === 'note' || role === 'alert') continue;
            const cs = getComputedStyle(el);
            const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({
              w: parseFloat(cs[`border${s}Width` as 'borderTopWidth']),
              a: alpha(cs[`border${s}Color` as 'borderTopColor']),
            }));
            const four = sides.every((s) => s.w > 0 && s.a > 0);
            const single =
              (sides[0].w >= 1 && sides[0].a > 0) || (sides[2].w >= 1 && sides[2].a > 0);
            if (four) continue;
            if (!(el.tagName === 'HR' || single)) continue;
            const column =
              el.closest('article') ??
              (el.closest('[style*="max-width"], .prose') as HTMLElement | null) ??
              main;
            const colW = column.getBoundingClientRect().width;
            const w = el.getBoundingClientRect().width;
            if (colW > 0 && w / colW >= 0.8) rules.push(el.tagName);
          }
        }
        const summaries = Array.from(
          document.querySelectorAll('details[data-chart-data] > summary'),
        ).map((el) => {
          const cs = getComputedStyle(el);
          return {
            text: (el.textContent ?? '').trim(),
            transform: cs.textTransform,
          };
        });
        return { micro: micro.length, rules: rules.length, summaries };
      });
      expect(report.micro, `${route} micro-labels`).toBeLessThanOrEqual(5);
      expect(report.rules, `${route} full-width rules`).toBeLessThanOrEqual(2);
      for (const summary of report.summaries) {
        expect(summary.transform).not.toBe('uppercase');
        expect(summary.text).not.toBe(summary.text.toUpperCase());
      }
    });
  }
});
