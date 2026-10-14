import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { TELEOP_RIGS } from '@/data/teleop-rigs';
import { HARDWARE } from '@/data/hardware';
import { getCitation } from '@/data/citations';
import { PUBLIC_DESCRIPTOR } from '@/lib/identity';
import { preDataHardwareCut } from '../helpers/seo-pass';

test('the ACT paper build cost never becomes configuration-specific USD data', () => {
  const rig = TELEOP_RIGS.find(({ id }) => id === 'aloha-workstation')!;
  const hardware = HARDWARE.find(({ id }) => id === 'aloha-2')!;
  expect(rig.costUsd).toBeNull();
  expect(hardware.priceUsd).toBeNull();
  expect(hardware.priceMaxUsd).toBeNull();
  expect(hardware.priceAsOf).toBeNull();
  // The ACT paper (arXiv 2304.13705, Sec. II, read 2026-10-14): "ALOHA ... is a
  // bimanual setup that costs $18k ($20k after adding optional add-ons such as
  // cameras)." The June 2026 community range is no longer shown.
  for (const context of [rig.costNote, hardware.priceNote]) {
    expect(context).toContain('ACT paper (2023)');
    expect(context).toContain('original ALOHA bimanual setup');
    expect(context).toContain('$18k');
    expect(context).toContain('$20k with optional add-ons such as cameras');
    expect(context).toContain('not a vendor quote');
    expect(context).not.toContain('$17k-32k');
  }
  expect(hardware.priceNote).toContain('no ALOHA 2 price published');
  expect(rig.details.cost).toContain('not a current vendor quote');
  expect(rig.details.cost).not.toContain('$17k-32k');
  expect(rig.details.throughput).not.toContain('$17,000');
  expect(rig.links).toContainEqual({ label: 'ACT paper', url: 'https://arxiv.org/abs/2304.13705' });
  expect(rig.links.map(({ url }) => url)).not.toContain('https://github.com/alpibrusl/lex-robot/issues/3');
  expect(rig.sources).toContain('act-aloha-2023');
  expect(hardware.sources).toContain('act-aloha-2023');
  expect(getCitation('lerobot-pricing-2026')?.url).toBe(
    'https://github.com/alpibrusl/lex-robot/issues/3',
  );
});

test('the about page qualifies source strength and home keeps the brand descriptor', () => {
  // JSX text wraps across source lines, so phrases are matched on the
  // whitespace-collapsed source.
  const flat = (path: string) => readFileSync(path, 'utf8').replace(/\s+/g, ' ');
  const home = flat('app/page.tsx');
  const about = flat('app/about/page.tsx');
  for (const page of [home, about]) expect(page).not.toContain('Every technical claim is');
  expect(about).toContain('Technical claims trace to cited evidence.');
  expect(about).toContain('labelled community estimates');
  expect(about).toContain('the kind of source tells you how far to trust it');
  expect(home).not.toContain('a citation is not a guarantee');
  expect(home).not.toContain('labelled community estimates');
  expect(home).toContain('{PUBLIC_DESCRIPTOR}');
  expect(PUBLIC_DESCRIPTOR).toBe('Citation-first encyclopedia of modern robot learning.');
});

test('teleop prose preserves attribution and removes the inferred budget floor', () => {
  // The data-hardware pass of 2026-10-13 cut the community estimate from the
  // article; these attribution checks read the pre-pass article the cut layer
  // rebuilds, and the live article states the paper's build cost instead.
  const live = readFileSync('content/data-hardware/teleop-rigs.mdx', 'utf8');
  expect(live).not.toContain('alpibrusl/lex-robot');
  expect(live).not.toContain('Community estimate below');
  expect(live).toContain('The paper put the bimanual setup at \\$18k, or \\$20k with add-ons such as cameras <Cite id="act-aloha-2023" />');
  expect(live).toContain('value="not disclosed"');
  expect(live).not.toContain('value="$17k+"');
  expect(live).not.toContain('tier starts at');
  const article = preDataHardwareCut('content/data-hardware/teleop-rigs.mdx').toString();
  expect(article).toContain('alpibrusl/lex-robot');
  expect(article).toContain('currency code, configurations, or itemized inclusions and exclusions');
  expect(article).toContain('not a verified minimum workstation budget');
  expect(article).toContain('value="not disclosed"');
  expect(article).not.toContain('value="$17k+"');
  expect(article).not.toContain('tier starts at');
  expect(article).toContain('The \\$300 buys a controller only');
  expect(TELEOP_RIGS.find(({ id }) => id === 'gello')?.costNote).toContain(
    'excludes the target robot arm',
  );
});
