import { releaseActivityProblems } from '../../lib/brand-v2-release-activity';
import { writeFileSync } from 'node:fs';
import { expect, test } from './brand-v2-static-fixture';
import { probeReleaseState } from './helpers/release-state-probe';
import { RELEASE_PROFILES, releaseProfileProblems } from '../../lib/brand-v2-release-evidence';
import { waitForPlayground } from './helpers/playground';

/** Diagnostic only. No release artifact is written, and these tests do not
 * exist in the final corpus unless explicitly requested as a pilot. */
if (process.env.ROBOT_WIKI_RELEASE_PILOT === '1') {
  const subjects = [
    { id: 'home', route: '/', state: 'default' },
    { id: 'article', route: '/manipulation/action-chunking/', state: 'default' },
    { id: 'search-error', route: '/search/', state: 'both-indexes-unavailable' },
    { id: 'map-selection', route: '/market-map/', state: 'selected-company' },
    { id: 'playground', route: '/playground/', state: 'live-webgl' },
  ];
  for (const subject of subjects) test(`diagnostic release profile pilot: ${subject.id}`, async ({ page, staticBase }, info) => {
    test.setTimeout(480_000);
    const base = process.env.ROBOT_WIKI_PILOT_BASE_URL ?? staticBase;
    if (subject.id === 'search-error') {
      await page.route('**/search-index.json', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
      await page.route('**/pagefind/pagefind.js', (route) => route.fulfill({ status: 503, contentType: 'text/javascript', body: 'index unavailable' }));
    }
    const started = Date.now();
    await page.goto(`${base}${subject.route}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (subject.id === 'search-error') {
      await page.getByRole('searchbox', { name: 'Search the wiki' }).fill('action chunking');
      await expect(page.getByRole('status').first()).toHaveText('The search index is unavailable');
    }
    if (subject.id === 'map-selection') {
      await page.getByRole('button', { name: 'Bubble', exact: true }).click();
      await page.locator('circle[data-company-id]').first().click();
      await expect(page.locator('[data-company-detail]')).toBeVisible();
    }
    if (subject.id === 'playground') await waitForPlayground(page);
    const probeStarted = Date.now();
    let observation;
    let error: string | null = null;
    try { observation = await probeReleaseState(page, { id: `pilot:${subject.id}`, route: subject.route, state: subject.state, steps: ['diagnostic preparation only', subject.state] }); }
    catch (caught) { error = caught instanceof Error ? caught.message : String(caught); if(caught instanceof Error&&'observation'in caught)observation=caught.observation as Awaited<ReturnType<typeof probeReleaseState>>; }
    const problems = observation?.profiles.flatMap((profile) => releaseProfileProblems(profile, RELEASE_PROFILES.find(({ id }) => id === profile.id)!,subject.route)) ?? [];
    if(observation)problems.push(...releaseActivityProblems(observation.activity).map((failure)=>`native activity: ${failure}`));
    const report = { kind: 'diagnostic-pilot-not-final-evidence', subject, base, setupMs: probeStarted - started, probeMs: Date.now() - probeStarted, profiles: observation?.profiles.length ?? 0, problems, error, observation };
    writeFileSync(info.outputPath('pilot.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ subject: subject.id, setupMs: report.setupMs, probeMs: report.probeMs, profiles: report.profiles, failures: problems.length, error }));
    expect(error).toBeNull();
    expect(problems.length, problems.slice(0, 20).join('\n')).toBe(0);
  });
}
