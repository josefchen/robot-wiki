import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { TELEOP_RIGS } from '@/data/teleop-rigs';
import { HARDWARE } from '@/data/hardware';
import { getCitation } from '@/data/citations';
import { PUBLIC_DESCRIPTOR } from '@/lib/identity';

test('the community range never becomes configuration-specific USD data', () => {
  const rig = TELEOP_RIGS.find(({ id }) => id === 'aloha-workstation')!;
  const hardware = HARDWARE.find(({ id }) => id === 'aloha-2')!;
  expect(rig.costUsd).toBeNull();
  expect(hardware.priceUsd).toBeNull();
  expect(hardware.priceMaxUsd).toBeNull();
  expect(hardware.priceAsOf).toBeNull();
  for (const context of [rig.costNote, hardware.priceNote]) {
    expect(context).toContain('ALOHA / ALOHA 2');
    expect(context).toContain('$17k-32k');
    expect(context).toContain('researched Jun 2026');
    expect(context).toContain('currency code');
    expect(context).toContain('configurations');
    expect(context).toContain('not a vendor quote');
  }
  expect(rig.details.cost).toContain('inclusions/exclusions');
  expect(rig.details.throughput).not.toContain('$17,000');
  expect(rig.links).toContainEqual({
    label: 'Community estimate (Jun 2026)',
    url: 'https://github.com/alpibrusl/lex-robot/issues/3',
  });
  expect(getCitation('lerobot-pricing-2026')?.url).toBe(
    'https://github.com/alpibrusl/lex-robot/issues/3',
  );
});

test('home qualifies source strength without changing the brand descriptor', () => {
  const home = readFileSync('app/page.tsx', 'utf8');
  expect(home).not.toContain('Every technical claim is');
  expect(home).toContain('traceable to cited evidence');
  expect(home).toContain('explicitly labelled community estimates');
  expect(home).toContain('a citation is not a guarantee');
  expect(home).toContain('{PUBLIC_DESCRIPTOR}');
  expect(PUBLIC_DESCRIPTOR).toBe('Citation-first encyclopedia of modern robot learning.');
});

test('teleop prose preserves attribution and removes the inferred budget floor', () => {
  const article = readFileSync('content/data-hardware/teleop-rigs.mdx', 'utf8');
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
