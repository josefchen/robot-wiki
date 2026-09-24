import { describe, expect, it } from 'vitest';
import { validateClientRegistries } from '@/lib/registry-validation';

describe('client-imported data registries', () => {
  it('parse against their schemas to exactly the rows the widgets import', () => {
    expect(() => validateClientRegistries()).not.toThrow();
  });
});
