import { describe, expect, it } from 'vitest';
import {
  ADJACENT_DOMAIN,
  CORE_DOMAINS,
  DOMAIN_META,
  getModule,
  modules,
  modulesByDomain,
  publishedModules,
} from '@/data/modules';
import { moduleRegistryEntrySchema } from '@/data/schemas/module';

describe('module registry', () => {
  it('contains only schema-valid entries', () => {
    for (const entry of modules) {
      const parsed = moduleRegistryEntrySchema.safeParse(entry);
      expect(parsed.success, JSON.stringify(entry)).toBe(true);
    }
  });

  it('covers every core domain with at least one module', () => {
    for (const domain of CORE_DOMAINS) {
      expect(
        modules.some((m) => m.domain === domain),
        `domain ${domain} has no modules`,
      ).toBe(true);
    }
  });

  it('covers the adjacent group with the four adjacent modules', () => {
    const adjacent = modules.filter((m) => m.domain === ADJACENT_DOMAIN);
    expect(adjacent.map((m) => m.slug).sort()).toEqual([
      'autonomous-vehicles',
      'drones',
      'space',
      'surgical',
    ]);
  });

  it('has unique domain/slug pairs', () => {
    const keys = modules.map((m) => `${m.domain}/${m.slug}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has unique order values within each domain', () => {
    for (const domain of [...CORE_DOMAINS, ADJACENT_DOMAIN]) {
      const orders = modules
        .filter((m) => m.domain === domain)
        .map((m) => m.order);
      expect(new Set(orders).size, `domain ${domain}`).toBe(orders.length);
    }
  });

  it('registers domain metadata for all seven groups', () => {
    for (const domain of [...CORE_DOMAINS, ADJACENT_DOMAIN]) {
      expect(DOMAIN_META[domain].name.length).toBeGreaterThan(0);
      expect(DOMAIN_META[domain].description.length).toBeGreaterThan(0);
    }
  });

  it('has at least one published module (the sample page)', () => {
    expect(publishedModules().length).toBeGreaterThanOrEqual(1);
  });

  it('excludes drafts from the published set', () => {
    for (const m of publishedModules()) {
      expect(m.status).toBe('published');
    }
  });

  it('getModule resolves by domain and slug', () => {
    const sample = publishedModules()[0];
    expect(getModule(sample.domain, sample.slug)?.slug).toBe(sample.slug);
    expect(getModule('manipulation', 'no-such-module')).toBeUndefined();
  });

  it('modulesByDomain returns registry order', () => {
    const grouped = modulesByDomain();
    for (const domain of Object.keys(grouped)) {
      const orders = grouped[domain].map((m) => m.order);
      expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    }
  });
});
