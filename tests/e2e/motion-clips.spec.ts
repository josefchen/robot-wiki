import { expect, test } from '@playwright/test';

/**
 * Cinematic clips, end to end (VAL-MOTION-017/018). The mounted clip is
 * a native video element: controls on, preload none, a poster, a captions
 * track and a screen-reader transcript, and no autoplay attribute
 * anywhere. The clip ships silent, so it can never autoplay with sound.
 */
const CLIPS = [
  {
    id: 'kalman-episode',
    route: '/classical/state-estimation/',
  },
] as const;

for (const clip of CLIPS) {
  test.describe(`motion clip ${clip.id}`, () => {
    test('mounts a native, non-autoplaying video with captions and a transcript', async ({
      page,
    }) => {
      await page.goto(clip.route, { waitUntil: 'networkidle' });
      const scope = page.locator(`[data-motion-clip="${clip.id}"]`);
      await expect(scope).toBeVisible();

      const video = scope.locator('video');
      await expect(video).toBeVisible();
      await expect(await video.getAttribute('controls')).not.toBeNull();
      await expect(video).toHaveAttribute('preload', 'none');
      expect(await video.getAttribute('autoplay')).toBeNull();
      expect(await video.getAttribute('poster')).toMatch(/\.png$/);
      // Until the video has decoded a frame, the native control's loading
      // spinner must not cover the artwork. The still leaves the control
      // strip available and never initiates a video download.
      const still = scope.locator('[data-motion-clip-poster]');
      await expect(still).toBeVisible();
      await expect(still).toHaveJSProperty('complete', true);
      expect(
        await still.evaluate((image: HTMLImageElement) => image.naturalWidth),
      ).toBeGreaterThan(0);
      expect(
        await still.evaluate((image) => getComputedStyle(image).pointerEvents),
      ).toBe('none');
      expect(
        await still.evaluate((image) => {
          const imageBox = image.parentElement!.getBoundingClientRect();
          const videoBox = image.parentElement!.parentElement!
            .querySelector('video')!
            .getBoundingClientRect();
          return (
            imageBox.top === videoBox.top &&
            imageBox.left === videoBox.left &&
            imageBox.width === videoBox.width &&
            imageBox.height > videoBox.height * 0.65 &&
            imageBox.height < videoBox.height * 0.85
          );
        }),
      ).toBe(true);
      await video.evaluate((element: HTMLVideoElement) => {
        element.preload = 'auto';
        element.load();
      });
      await expect
        .poll(() =>
          video.evaluate(
            (element: HTMLVideoElement) =>
              element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
          ),
        )
        .toBe(true);
      await expect(still).toBeHidden();

      // Video bytes are never fetched before the reader asks: preload is
      // none and the poster is the only media the mount pulls in.
      const sources = video.locator('source');
      await expect(sources).toHaveCount(2);
      await expect(sources.nth(0)).toHaveAttribute('type', 'video/webm');
      await expect(sources.nth(1)).toHaveAttribute('type', 'video/mp4');

      const track = video.locator('track[kind="captions"]');
      await expect(track).toHaveCount(1);
      await expect(await track.getAttribute('src')).toMatch(/\.vtt$/);
      await expect(track).toHaveAttribute('srclang', 'en');

      // The captions file is served and well formed.
      const vttUrl = new URL(
        (await track.getAttribute('src')) ?? '',
        page.url(),
      );
      const vtt = await page.request.get(vttUrl.toString());
      expect(vtt.ok()).toBe(true);
      expect((await vtt.text()).startsWith('WEBVTT')).toBe(true);

      // The frame is labelled, the status vocabulary is visible, and the
      // transcript is reachable as a screen-reader alternative.
      await expect(
        page.getByRole('region', { name: /cinematic clip:/i }),
      ).toBeVisible();
      const describedBy = await scope.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      const alternative = page.locator(`#${describedBy}`);
      await expect(alternative).toHaveClass(/sr-only/);
      await expect(alternative).toContainText(/predict/i);
      await expect(alternative).toContainText(/update/i);
      expect(await scope.textContent()).toContain('schematic');
    });

    test('keeps the poster box stable at phone and desktop widths', async ({
      page,
    }) => {
      for (const width of [375, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(clip.route, { waitUntil: 'networkidle' });
        const video = page
          .locator(`[data-motion-clip="${clip.id}"]`)
          .locator('video');
        await expect(video).toBeVisible();
        const box = await video.boundingBox();
        expect(box?.width).toBeGreaterThan(0);
        // The intrinsic 16:9 stage keeps its aspect at every width.
        expect(box!.height / box!.width).toBeCloseTo(9 / 16, 2);
        const still = page.locator(
          `[data-motion-clip="${clip.id}"] [data-motion-clip-poster]`,
        );
        await expect(still).toBeVisible();
        await expect(still).toHaveJSProperty('complete', true);
        expect(
          await still.evaluate((image: HTMLImageElement) => image.naturalWidth),
        ).toBeGreaterThan(0);
        expect(
          await video.evaluate((element: HTMLVideoElement) => element.readyState),
        ).toBe(0);
      }
    });
  });
}
