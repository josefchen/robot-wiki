import { writeFileSync } from 'node:fs';
import { test, expect } from './brand-v2-static-fixture';
import { collectFrame } from './helpers/interactive-frame-evidence';
import { frameDataSchema, type RawFrameData } from '../../lib/brand-v2-release-frame-data';
import { SOURCE_ORACLES } from '../../lib/brand-v2-source-oracles';
import { SourceOracleContext } from '../../lib/brand-v2-source-oracle-core';

for (const width of [1440, 375]) {
  test(`pendulum part keys bind to actual painted needle geometry at ${width}px`, async ({ page, staticBase }, testInfo) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.emulateMedia({ reducedMotion: width === 375 ? 'reduce' : 'no-preference' });
    await page.goto(`${staticBase}/classical/control/`);
    const frame = page.locator('[data-figure-frame="pendulum-controller"]');
    await expect(frame).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const readings: Array<{ state: string; frame: RawFrameData }> = [];
    const verify = async (state: string) => {
      const raw = frameDataSchema.parse(await collectFrame(frame));
      const context = new SourceOracleContext(raw, SOURCE_ORACLES['interactive:PendulumController'], state);
      context.oracle.check(context); context.finish();
      expect(context.failures, state).toEqual([]);
      readings.push({ state, frame: raw });
    };
    await verify('release');
    await frame.getByRole('button', { name: 'Give it a push', exact: true }).click();
    await expect.poll(async () => Number(await frame.locator('[data-source-steps]').getAttribute('data-source-steps'))).toBeGreaterThan(0);
    await frame.locator('[data-figure-fold="adjust"] > summary').click();
    await frame.getByRole('button', { name: 'Pause the simulation', exact: true }).click();
    await verify('pushed and paused');
    await frame.getByRole('button', { name: 'Reset the simulation and restore default gains', exact: true }).click();
    await verify('reset');

    // Neither unchanged model inputs nor a valid readout can excuse a
    // moved physical needle, a hidden key, or an unknown unbound key.
    const evaluate = (raw: RawFrameData) => {
      const context = new SourceOracleContext(raw, SOURCE_ORACLES['interactive:PendulumController'], 'mutation');
      context.oracle.check(context); context.finish(); return context.failures;
    };
    const base = readings.at(-1)!.frame;
    const moved = structuredClone(base);
    moved.physicalNeedles![0].topPaths[0] = moved.physicalNeedles![0].topPaths[0].replace(/^M[\d.-]+/, 'M0');
    expect(evaluate(moved).join(' ')).toMatch(/physical part annotation/);
    const hidden = structuredClone(base);
    hidden.legend.find(key => key.text.includes('Long needle'))!.paintFailures = ['text hidden by CSS'];
    expect(evaluate(hidden).join(' ')).toMatch(/physical part annotation/);
    const unknown = structuredClone(base);
    unknown.legend.push({ text: 'Unregistered needle', seriesId: null, swatch: null, paintFailures: [] });
    expect(evaluate(unknown).join(' ')).toMatch(/no attributed plotted series/);
    const missing = structuredClone(base); delete missing.physicalNeedles;
    expect(evaluate(missing).join(' ')).toMatch(/physical needle population/);
    writeFileSync(testInfo.outputPath('actual-part-readings.json'), JSON.stringify(readings, null, 2));
  });
}
