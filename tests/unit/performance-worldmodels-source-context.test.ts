import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WM_PARADIGMS } from '@/lib/world-model-taxonomy';

const text = (path: string) => readFileSync(path, 'utf8');
const latent = () => text('content/world-models/latent-dynamics.mdx');
const taxonomy = () => text('content/world-models/taxonomy.mdx');
const jepa = () => text('content/world-models/jepa.mdx');

describe('Performance world-model source scopes', () => {
  it('separates RWM simulation policy training from hardware transfer and safe online learning', () => {
    expect(latent()).toContain('GRU');
    expect(latent()).toContain('MBPO-PPO');
    expect(latent()).toContain('zero-shot transfer');
    expect(latent()).toContain('Safe online policy learning directly on hardware remains a limitation');
    expect(latent()).not.toContain('robust robot control rather than benchmark RL');
  });
  it('retains Fast-WAM action denoising and the precise hardware comparison', () => {
    expect(latent()).toContain('190 ms');
    expect(latent()).toContain('810 ms');
    expect(latent()).toContain('5090D V2');
    for (const t of [latent(), jepa()]) {
      expect(t).toMatch(/action denois|action expert still denois/);
      expect(t).toMatch(/current.frame/);
    }
    expect(jepa()).not.toContain('LeWorldModel exist precisely');
    expect(jepa()).not.toContain('JEPA argument arriving through the back door');
  });
  it('scopes Dream-MPC pooled results and preserves the TD-MPC2 exception', () => {
    const t = latent();
    expect(t).toContain('26.7%');
    expect(t).toContain('20.5%');
    expect(t).toContain('24');
    expect(t).toContain('BMPC');
    expect(t).toMatch(/cannot consistently match|does not consistently match/);
    expect(WM_PARADIGMS.find(p => p.id === 'decoder-free-latent')?.primaryUse).toContain('gradient');
    expect(t).toContain('toy reward-error readout equal to 0.35');
    expect(t).toContain('H = 15');
    expect(t).toContain('T = 16');
  });
  it('labels six as local examples and removes the unsupported challenge ranking', () => {
    expect(WM_PARADIGMS).toHaveLength(6);
    expect(taxonomy()).toContain('selected in this article');
    expect(taxonomy()).not.toContain('named top open challenge');
    expect(taxonomy()).not.toContain('at least six architecturally distinct paradigms');
    const summary = taxonomy().match(/^description: "(.+)"$/m)?.[1];
    expect(summary).toBeTruthy();
    expect(text('data/modules.ts')).toContain(summary);
    expect(taxonomy()).toContain('id="the-six-paradigms"');
  });
});
