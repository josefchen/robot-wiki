/**
 * clips:capture — the cinematic side of the motion capture loop.
 *
 * Walks every registered clip at 375 px and 1440 px and captures the
 * mount exactly as a reader meets it: the poster state before any video
 * bytes are fetched, then the deterministic stills named by the
 * manifest's beats (each beat's end second), taken by seeking the native
 * video element rather than playing it, so the captures never depend on
 * decode timing. Re-running overwrites identical bytes.
 *
 * Usage: node scripts/capture-motion-clip.ts [-- <clip-id> | all]
 * Needs the dev server on :3200 (or CAPTURE_BASE_URL).
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Same manifest the renderer and the registry are generated from. */
const MANIFEST = JSON.parse(
  readFileSync(path.resolve('motion-clips.json'), 'utf8'),
) as {
  clips: Array<{
    id: string;
    route: string;
    beats: Array<{ caption: string; durationMs: number }>;
  }>;
};

const VIEWPORTS = [
  { name: '375', width: 375, height: 800 },
  { name: '1440', width: 1440, height: 900 },
] as const;

const BASE_URL = process.env.CAPTURE_BASE_URL ?? 'http://localhost:3200';

async function captureClip(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  clipId: string,
): Promise<string[]> {
  const clip = MANIFEST.clips.find((entry) => entry.id === clipId);
  if (!clip) {
    throw new Error(`unknown clip id: ${clipId}`);
  }
  const outDir = path.resolve('evidence/motion/clips', clipId);
  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  const selector = `[data-motion-clip="${clipId}"]`;

  // Cumulative beat end-times in whole seconds, for deterministic names.
  let cursor = 0;
  const beatEnds = clip.beats.map((beat, index) => {
    cursor += beat.durationMs;
    return { index: index + 1, seconds: (cursor - 1) / 1000 };
  });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await page.goto(BASE_URL + clip.route, { waitUntil: 'networkidle' });
    const scope = page.locator(selector);
    await scope.waitFor();

    // The native video can display a loading spinner over its poster while
    // HAVE_NOTHING. Wait for the inert still above that paint to decode;
    // video bytes remain untouched and the native controls stay exposed.
    await scope.locator('[data-motion-clip-poster]').evaluate(async (image) => {
      const still = image as HTMLImageElement;
      await still.decode();
      if (!still.naturalWidth) throw new Error('clip poster did not decode');
    });
    await page.evaluate(() => document.fonts.ready);
    const posterPath = path.join(outDir, `${viewport.name}-poster.png`);
    await scope.screenshot({ path: posterPath });
    written.push(posterPath);

    const video = scope.locator('video');
    // preload="none" means the browser has fetched nothing, and seeking a
    // HAVE_NOTHING video only sets a default start position. The capture
    // harness (never the shipped component) raises the hint, loads, and
    // then seeks, so each still is the real decoded frame of its beat.
    const handle = await video.elementHandle();
    await page.evaluate((element) => {
      const media = element as HTMLVideoElement;
      media.preload = 'auto';
      media.load();
    }, handle);
    await page.waitForFunction((element) => {
      const media = element as HTMLVideoElement;
      return media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    }, handle);
    const videoBox = await video.boundingBox();
    const scopeBox = await scope.boundingBox();
    if (!videoBox || !scopeBox) throw new Error(`${clipId}: missing stage bounds`);
    const stage = {
      x: Math.round(videoBox.x - scopeBox.x),
      y: Math.round(videoBox.y - scopeBox.y),
      width: Math.round(videoBox.width),
      height: Math.round(videoBox.height),
    };
    for (const beat of beatEnds) {
      // Seek, then wait for the decoded frame and native control overlay to
      // settle. A seeked event alone leaves Chromium's buffering arc painted
      // for several frames even though the video pixels are available.
      await page.evaluate(
        ([element, time]) => {
          const media = element as HTMLVideoElement;
          return new Promise<void>((resolve) => {
            const onSeeked = () => {
              media.removeEventListener('seeked', onSeeked);
              requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
              });
            };
            media.addEventListener('seeked', onSeeked);
            media.currentTime = time as number;
          });
        },
        [handle, beat.seconds] as const,
      );
      await page.waitForTimeout(900);
      const still = path.join(
        outDir,
        `${viewport.name}-beat-${beat.index}.png`,
      );
      // A paused Chromium video occasionally reports seeked but paints a
      // blank first frame on mobile. Inspect the captured PNG's upper stage
      // before accepting it; every beat has a light title or annotation in
      // that region. Retry the paint, not the renderer or the clip timeline.
      let painted = false;
      for (let attempt = 0; attempt < 4 && !painted; attempt += 1) {
        const screenshot = await scope.screenshot({ path: still });
        painted = await page.evaluate(
          async ({ png, rect }) => {
            const bytes = Uint8Array.from(atob(png), (char) => char.charCodeAt(0));
            const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext('2d')!;
            context.drawImage(bitmap, 0, 0);
            bitmap.close();
            const { data } = context.getImageData(
              rect.x + 8, rect.y + 8, rect.width - 16,
              Math.floor(rect.height * 0.38) - 8,
            );
            let paintedPixels = 0;
            for (let index = 0; index < data.length; index += 4) {
              if (data[index] + data[index + 1] + data[index + 2] > 360) {
                paintedPixels += 1;
              }
            }
            return paintedPixels > 30;
          },
          { png: screenshot.toString('base64'), rect: stage },
        );
        if (!painted) await page.waitForTimeout(600);
      }
      if (!painted) throw new Error(`${clipId} ${viewport.name} beat ${beat.index}: blank decoded still`);
      written.push(still);
    }
    await context.close();
  }
  return written;
}

async function main() {
  const requested = process.argv.slice(2).filter((arg) => arg !== '--');
  const ids =
    requested.length === 0 || requested.includes('all')
      ? MANIFEST.clips.map((clip) => clip.id)
      : requested;
  for (const id of ids) {
    if (!MANIFEST.clips.some((clip) => clip.id === id)) {
      console.error(
        `unknown clip id: ${id} (known: ${MANIFEST.clips.map((clip) => clip.id).join(', ')})`,
      );
      process.exit(1);
    }
  }
  const browser = await chromium.launch();
  try {
    for (const id of ids) {
      for (const file of await captureClip(browser, id)) {
        console.log(`wrote ${file}`);
      }
    }
  } finally {
    await browser.close();
  }
}

main();
