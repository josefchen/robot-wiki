import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForHydration } from './interaction-ready';

/**
 * Each world-models page used to pair a motion scene with a lab that showed
 * the same toy. The two are now one graphite figure, so the scene's beats
 * are states the figure's own controls reach from the keyboard. Every state
 * is audited on the stage at both widths, and the figure's text alternative
 * follows the state.
 */

interface StageAudit {
  svgCount: number;
  markCount: number;
  intersections: string[];
  overflow: string[];
  lowContrast: string[];
}

function auditFigure(root: Element): StageAudit {
  const intersections: string[] = [];
  const overflow: string[] = [];
  const lowContrast: string[] = [];
  let markCount = 0;
  const shown = (element: Element) => {
    for (let node: Element | null = element; node && node !== root.parentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.01) return false;
    }
    return true;
  };
  const svgs = [...root.querySelectorAll<SVGSVGElement>('[data-figure-stage] svg[role="img"]')];
  for (const svg of svgs) {
    const stage = svg.getBoundingClientRect();
    const texts = [...svg.querySelectorAll<SVGTextElement>('text')]
      .filter((node) => shown(node) && node.textContent?.trim())
      .map((node) => ({ name: node.textContent!.trim(), rect: node.getBoundingClientRect() }));
    const marks = [...svg.querySelectorAll<SVGGeometryElement>('circle, ellipse, line, path, polygon, polyline, rect')]
      .filter((node) => shown(node) && !node.closest('[data-scene-structure], [data-chart-axes], [data-chart-grid], defs, pattern'));
    markCount += marks.length;
    const inset = (name: string, rect: DOMRect) => {
      if (rect.width <= 0.01 && rect.height <= 0.01) return;
      if (rect.left < stage.left + 4 - 0.1 || rect.top < stage.top + 4 - 0.1 ||
        rect.right > stage.right - 4 + 0.1 || rect.bottom > stage.bottom - 4 + 0.1) {
        overflow.push(`${name}: ${[rect.left - stage.left, rect.top - stage.top, stage.right - rect.right, stage.bottom - rect.bottom].map((n) => n.toFixed(1)).join('/')} px`);
      }
    };
    for (const [index, text] of texts.entries()) {
      inset(`text "${text.name}"`, text.rect);
      for (const other of texts.slice(index + 1)) {
        if (Math.min(text.rect.right, other.rect.right) - Math.max(text.rect.left, other.rect.left) > 0.1 &&
          Math.min(text.rect.bottom, other.rect.bottom) - Math.max(text.rect.top, other.rect.top) > 0.1) {
          intersections.push(`text "${text.name}" / text "${other.name}"`);
        }
      }
      // Sampled against painted geometry: a bounding box would count the
      // empty area under a curve as covered.
      let hit = '';
      for (let sx = 0; sx <= 4 && !hit; sx += 1) {
        for (let sy = 0; sy <= 2 && !hit; sy += 1) {
          const px = text.rect.left + (text.rect.width * sx) / 4;
          const py = text.rect.top + (text.rect.height * sy) / 2;
          for (const mark of marks) {
            const ctm = mark.getScreenCTM();
            if (!ctm) continue;
            const local = new DOMPoint(px, py).matrixTransform(ctm.inverse());
            const point = svg.createSVGPoint();
            point.x = local.x;
            point.y = local.y;
            const style = getComputedStyle(mark);
            const inFill = style.fill !== 'none' && Number(style.fillOpacity) > 0.01 && mark.isPointInFill(point);
            const inStroke = style.stroke !== 'none' && mark.isPointInStroke(point);
            if (inFill || inStroke) {
              hit = `${mark.tagName}${mark.getAttribute('data-series') ? `:${mark.getAttribute('data-series')}` : ''}`;
              break;
            }
          }
        }
      }
      if (hit) intersections.push(`text "${text.name}" / mark ${hit}`);
    }
    for (const mark of marks) inset(`mark ${mark.tagName}`, mark.getBoundingClientRect());
  }

  const channels = (value: string) => {
    const values = value.match(/[\d.]+/g)?.map(Number) ?? [];
    if (!/^rgba?\(/.test(value) || values.length < 3) throw new Error(`unresolved colour: ${value}`);
    return [values[0], values[1], values[2], values[3] ?? 1];
  };
  const over = (top: number[], bottom: number[]) => {
    const alpha = top[3] + bottom[3] * (1 - top[3]);
    return [...[0, 1, 2].map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / alpha), alpha];
  };
  const luminance = (colour: number[]) => {
    const linear = colour.slice(0, 3).map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  for (const control of root.querySelectorAll<HTMLElement>('button[data-brand-control-id]')) {
    for (const animation of control.getAnimations()) animation.finish();
    if (!shown(control)) continue;
    const layers: number[][] = [];
    for (let node: Element | null = control; node; node = node.parentElement) {
      layers.push(channels(getComputedStyle(node).backgroundColor));
    }
    const background = layers.reverse().reduce((base, layer) => over(layer, base), [255, 255, 255, 1]);
    const ink = channels(getComputedStyle(control).color);
    const effective = over(ink, background);
    const [light, dark] = [luminance(effective), luminance(background)].sort((a, b) => b - a);
    const ratio = (light + 0.05) / (dark + 0.05);
    if (ratio < 4.5) lowContrast.push(`${control.getAttribute('aria-label') ?? control.textContent?.trim()}: ${ratio.toFixed(2)}:1`);
  }
  return { svgCount: svgs.length, markCount, intersections, overflow, lowContrast };
}

type Step = (figure: Locator, page: Page) => Promise<void>;
interface Beat { name: string; reach: Step; expectState: Step; describes: RegExp }

const press = (control: Locator, key: string, times = 1): Promise<void> =>
  control.focus().then(async () => {
    for (let i = 0; i < times; i += 1) await control.press(key);
  });
const number = async (locator: Locator) => Number.parseFloat((await locator.textContent()) ?? '');

const figures: Array<{ id: string; route: string; lab: string; beats: Beat[]; afterReset: Step }> = [
  {
    id: 'latent-imagination',
    route: '/world-models/latent-dynamics/',
    lab: 'LatentImagination',
    afterReset: async (figure) => {
      await expect(figure.getByRole('slider', { name: /imagination horizon/i })).toHaveValue('15');
      await expect(figure.getByTestId('decoder-free-note')).toHaveCount(0);
    },
    beats: [
      {
        name: 'real encoded state',
        reach: (figure) => press(figure.getByRole('slider', { name: /imagination horizon/i }), 'Home'),
        expectState: async (figure) => expect(figure.getByRole('slider', { name: /imagination horizon/i })).toHaveValue('1'),
        describes: /t = 1 of 50/,
      },
      {
        name: 'one-step error',
        reach: (figure) => press(figure.getByRole('slider', { name: /imagination horizon/i }), 'ArrowRight'),
        expectState: async (figure) => expect(figure.getByRole('slider', { name: /imagination horizon/i })).toHaveValue('2'),
        describes: /t = 2 of 50/,
      },
      {
        name: 'imagined rollout at the band edge',
        reach: (figure) => press(figure.getByRole('slider', { name: /imagination horizon/i }), 'ArrowRight', 13),
        expectState: async (figure) => expect(figure.getByRole('slider', { name: /imagination horizon/i })).toHaveValue('15'),
        describes: /t = 15 of 50/,
      },
      {
        name: 'decoder-free deviation',
        reach: (figure) => press(figure.getByRole('button', { name: /decoder-free/i }), 'Enter'),
        expectState: async (figure) => {
          await expect(figure.getByTestId('decoder-free-note')).toBeVisible();
          await expect(figure.getByTestId('reward-error-bars')).toBeVisible();
          await expect(figure.locator('details[data-chart-form="state"] dd').filter({ hasText: /^decoder-free$/ }))
            .toHaveCount(1);
        },
        describes: /t = 15 of 50/,
      },
    ],
  },
  {
    id: 'action-conditioning',
    route: '/world-models/generative-video/',
    lab: 'ActionConditioning',
    afterReset: async (figure) => {
      await expect(figure.getByTestId('sensitivity-readout')).toHaveText('0.419');
      await expect(figure.getByRole('button', { name: 'Strong conditioning' })).toHaveAttribute('aria-pressed', 'true');
    },
    beats: [
      {
        name: 'strong fork',
        reach: async () => {},
        expectState: async (figure) => {
          expect(await number(figure.getByTestId('sensitivity-readout'))).toBeGreaterThan(0.3);
          expect(await figure.getByTestId('block-a-4').getAttribute('x'))
            .not.toBe(await figure.getByTestId('block-b-4').getAttribute('x'));
        },
        describes: /diverge across 4 predicted frames/,
      },
      {
        name: 'weak collapse',
        reach: (figure) => press(figure.getByRole('button', { name: 'Weak conditioning' }), 'Enter'),
        expectState: async (figure) => {
          expect(await number(figure.getByTestId('sensitivity-readout'))).toBeLessThan(0.05);
          await expect(figure.getByTestId('realism-readout')).toHaveText('0.91');
        },
        describes: /stay near-identical across 4 predicted frames/,
      },
      {
        name: 'strong again with the same realism',
        reach: (figure) => press(figure.getByRole('button', { name: 'Strong conditioning' }), 'Enter'),
        expectState: async (figure) => {
          await expect(figure.getByTestId('sensitivity-readout')).toHaveText('0.419');
          await expect(figure.getByTestId('realism-readout')).toHaveText('0.91');
        },
        describes: /action sensitivity is 0\.419/,
      },
    ],
  },
  {
    id: 'appearance-physics-push',
    route: '/world-models/generative-sim/',
    lab: 'AppearancePhysicsPush',
    afterReset: async (figure) => {
      await expect(figure.getByTestId('displacement-readout')).toHaveText('0.0 cm');
      await expect(figure.getByRole('button', { name: /^physics proxy$/i })).toHaveAttribute('aria-pressed', 'false');
    },
    beats: [
      {
        name: 'appearance only',
        reach: async () => {},
        expectState: async (figure) => expect(figure.getByTestId('no-dynamics-marker')).toBeVisible(),
        describes: /physics proxy is off/,
      },
      {
        name: 'unanswered push',
        reach: (figure) => press(figure.getByRole('button', { name: /push the mug/i }), 'Enter'),
        expectState: async (figure) => {
          await expect(figure.getByTestId('displacement-readout')).toHaveText('0.0 cm');
          await expect(figure.getByTestId('mug')).toHaveAttribute('transform', 'translate(80 0)');
        },
        describes: /leaves the mug at 0\.0 cm/,
      },
      {
        name: 'integrated push',
        reach: async (figure) => {
          await press(figure.getByRole('button', { name: /^physics proxy$/i }), 'Enter');
          await press(figure.getByRole('button', { name: /push the mug/i }), 'Enter');
        },
        expectState: async (figure) => {
          await expect(figure.getByTestId('displacement-readout')).toHaveText('18.1 cm');
          await expect(figure.getByTestId('collision-hull')).toBeVisible();
        },
        describes: /current displacement 18\.1 cm after 1 effective pushes/,
      },
      {
        name: 'second push',
        reach: (figure) => press(figure.getByRole('button', { name: /push the mug/i }), 'Enter'),
        expectState: async (figure) => expect(figure.getByTestId('displacement-readout')).toHaveText('36.2 cm'),
        describes: /current displacement 36\.2 cm/,
      },
    ],
  },
];

async function openFigure(page: Page, route: string, id: string) {
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-motion-scene]')).toHaveCount(0);
  const figure = page.locator(`[data-figure-frame="${id}"]`);
  await expect(figure).toHaveCount(1);
  await waitForHydration(figure.locator('[data-brand-control-id]').first());
  return figure;
}

for (const { id, route, lab, beats, afterReset } of figures) {
  test(`${lab} reaches every former scene beat by keyboard with a clean stage at both widths`, async ({ browser }) => {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width === 375 ? 800 : 900 } });
      try {
        const page = await context.newPage();
        const figure = await openFigure(page, route, id);
        const svg = figure.locator('[data-figure-stage] svg[role="img"]').first();
        for (const beat of beats) {
          await beat.reach(figure, page);
          await beat.expectState(figure, page);
          await page.mouse.move(0, 0);
          const audit = await figure.evaluate(auditFigure);
          const label = `${id} ${width} ${beat.name}`;
          expect(audit.svgCount, `${label}: stage svg`).toBeGreaterThan(0);
          expect(audit.markCount, `${label}: marks`).toBeGreaterThan(0);
          expect(audit.intersections, `${label}: text/mark overlap`).toEqual([]);
          expect(audit.overflow, `${label}: stage overflow`).toEqual([]);
          expect(audit.lowContrast, `${label}: control contrast`).toEqual([]);
          const description = page.locator(`[id="${await svg.getAttribute('aria-describedby')}"]`);
          await expect(description, `${label}: text alternative`).toContainText(beat.describes);
        }
      } finally {
        await context.close();
      }
    }
  });

  test(`${lab} needs no playback and settles every state at once under reduced motion`, async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const figure = await openFigure(page, route, id);
      await expect(figure.locator('[data-figure-stage-band="timeline"]')).toHaveCount(0);
      await expect(figure.getByTestId('motion-poster')).toHaveCount(0);
      for (const beat of beats) {
        await beat.reach(figure, page);
        await beat.expectState(figure, page);
      }
      await figure.getByRole('button', { name: 'Reset', exact: true }).click();
      await afterReset(figure, page);
    } finally {
      await context.close();
    }
  });
}
