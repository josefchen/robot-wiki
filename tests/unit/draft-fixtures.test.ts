import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleRegistryEntry } from '@/data/modules';

// The helpers read the registry at call time, so tests can restub the module
// list to simulate publish states the real registry has not reached yet.
vi.mock('@/data/modules', () => ({ modules: [] }));

import { modules } from '@/data/modules';
import {
  firstDraftModule,
  notFoundProbeRoute,
} from '@/tests/helpers/draft-fixtures';

function entry(
  domain: ModuleRegistryEntry['domain'],
  slug: string,
  status: ModuleRegistryEntry['status'],
  order = 1,
): ModuleRegistryEntry {
  return {
    domain,
    slug,
    title: `${slug} title`,
    summary: 'summary',
    order,
    status,
  };
}

function setRegistry(entries: ModuleRegistryEntry[]): void {
  modules.length = 0;
  modules.push(...entries);
}

describe('draft fixtures', () => {
  beforeEach(() => {
    setRegistry([]);
  });

  it('firstDraftModule returns the first draft in registry order', () => {
    setRegistry([
      entry('manipulation', 'shipped', 'published', 1),
      entry('manipulation', 'planned-a', 'draft', 2),
      entry('manipulation', 'planned-b', 'draft', 3),
    ]);
    expect(firstDraftModule()?.slug).toBe('planned-a');
  });

  it('firstDraftModule can restrict to one domain', () => {
    setRegistry([
      entry('classical', 'planned-elsewhere', 'draft'),
      entry('manipulation', 'planned-here', 'draft'),
    ]);
    expect(firstDraftModule('manipulation')?.slug).toBe('planned-here');
  });

  it('firstDraftModule returns undefined when everything is published', () => {
    setRegistry([entry('manipulation', 'shipped', 'published')]);
    expect(firstDraftModule()).toBeUndefined();
    expect(firstDraftModule('manipulation')).toBeUndefined();
  });

  it('notFoundProbeRoute uses the first draft route while drafts exist', () => {
    setRegistry([entry('adjacent', 'space', 'draft')]);
    expect(notFoundProbeRoute()).toBe('/adjacent/space/');
  });

  it('notFoundProbeRoute falls back to a genuinely unknown route when no draft remains', () => {
    setRegistry([entry('manipulation', 'shipped', 'published')]);
    expect(notFoundProbeRoute()).toBe('/manipulation/nowhere/');
  });
});
