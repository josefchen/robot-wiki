/**
 * Domain taxonomy for Robot Wiki. Single source of truth for the seven
 * top-level groups: the six core domains plus the adjacent group.
 *
 * This file intentionally has zero imports so it can be consumed by the
 * Next.js app, the content validator (plain node), and Vitest alike.
 */
export const CORE_DOMAINS = [
  'manipulation',
  'rl-sim2real',
  'world-models',
  'data-hardware',
  'classical',
  'frontier',
] as const;

export const ADJACENT_DOMAIN = 'adjacent' as const;

export const DOMAINS = [...CORE_DOMAINS, ADJACENT_DOMAIN] as const;

export type CoreDomain = (typeof CORE_DOMAINS)[number];
export type Domain = (typeof DOMAINS)[number];
