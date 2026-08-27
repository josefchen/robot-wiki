import { expect, test } from './brand-v2-static-fixture';
import {
  TEKTUR_ASSIGNED_STRINGS,
  TEKTUR_ROLE_INSTANCES,
} from '../../data/type-roles';

test.describe('Tektur web delivery', () => {
  test('loads the local variable face without a third-party request or glyph fallback', async ({
    page,
    staticBase,
  }) => {
    await page.goto(`${staticBase}/`);
    await page.evaluate(() => document.fonts.ready);

    const result = await page.evaluate(({ assignedStrings, roles }) => {
      const rootStyle = getComputedStyle(document.documentElement);
      const family = rootStyle.getPropertyValue('--font-tektur').trim();
      const text = assignedStrings.map(({ text }) => text).join(' ');
      const probe = document.createElement('span');
      probe.textContent = text;
      probe.style.cssText = [
        'position:fixed',
        'left:0',
        'top:0',
        'font-size:32px',
        'font-weight:600',
        'font-stretch:100%',
        'font-variation-settings:"wght" 600, "wdth" 100',
        `font-family:${family}`,
      ].join(';');
      document.body.append(probe);
      const roleElement = document.querySelector<HTMLElement>(
        '[data-tektur-role="home-wordmark"]',
      );
      if (!roleElement) throw new Error('home wordmark Tektur role missing');
      const roleStyle = getComputedStyle(roleElement);
      const registeredRoleStyles = roles.map((role) => {
        const element = document.createElement('span');
        element.className = role.cssClass;
        element.textContent = 'Robot Wiki 0123456789';
        document.body.append(element);
        const style = getComputedStyle(element);
        return {
          id: role.id,
          family: style.fontFamily,
          weight: style.fontWeight,
          stretch: style.fontStretch,
          variationSettings: style.fontVariationSettings,
        };
      });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('2D canvas context unavailable');
      context.font = `600 32px ${family}`;
      const tekturWidth = context.measureText(text).width;
      context.font = '600 32px monospace';
      const fallbackWidth = context.measureText(text).width;

      const resources = performance
        .getEntriesByType('resource')
        .filter(
          (entry) =>
            (entry as PerformanceResourceTiming).initiatorType === 'font' ||
            /\.(?:woff2?|ttf|otf)(?:$|\?)/i.test(entry.name),
        )
        .map(({ name }) => name);

      return {
        family,
        fontCheck: document.fonts.check(`600 32px ${family}`, text),
        computedFamily: getComputedStyle(probe).fontFamily,
        computedWeight: getComputedStyle(probe).fontWeight,
        computedStretch: getComputedStyle(probe).fontStretch,
        roleFamily: roleStyle.fontFamily,
        roleVariationSettings: roleStyle.fontVariationSettings,
        registeredRoleStyles,
        tekturWidth,
        fallbackWidth,
        resources,
        origin: location.origin,
      };
    }, {
      assignedStrings: TEKTUR_ASSIGNED_STRINGS,
      roles: TEKTUR_ROLE_INSTANCES,
    });

    expect(result.family.toLowerCase()).toContain('tektur');
    expect(result.computedFamily.toLowerCase()).toContain('tektur');
    expect(result.roleFamily.toLowerCase()).toContain('tektur');
    expect(result.roleVariationSettings).toContain('"wght" 600');
    expect(result.roleVariationSettings).toContain('"wdth" 100');
    expect(result.registeredRoleStyles).toHaveLength(
      TEKTUR_ROLE_INSTANCES.length,
    );
    for (const role of result.registeredRoleStyles) {
      expect(role.family.toLowerCase(), role.id).toContain('tektur');
      expect(role.weight, role.id).toBe('600');
      expect(role.stretch, role.id).toBe('100%');
      expect(role.variationSettings, role.id).toContain('"wght" 600');
      expect(role.variationSettings, role.id).toContain('"wdth" 100');
    }
    expect(result.computedWeight).toBe('600');
    expect(result.computedStretch).toBe('100%');
    expect(result.fontCheck).toBe(true);
    expect(result.tekturWidth).not.toBe(result.fallbackWidth);
    expect(result.resources.length).toBeGreaterThan(0);
    expect(result.resources).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/_next\/static\/media\/.+\.woff2(?:$|\?)/i),
      ]),
    );
    expect(
      result.resources.every((url) => new URL(url).origin === result.origin),
    ).toBe(true);
    expect(result.resources).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/fonts\.(?:googleapis|gstatic)\.com/i),
        expect.stringMatching(/Tektur-SemiBold\.ttf/i),
      ]),
    );
  });
});
