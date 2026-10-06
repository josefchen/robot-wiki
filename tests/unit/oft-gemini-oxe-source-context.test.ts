import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
const article = (slug: string) => readFileSync(`content/manipulation/${slug}.mdx`, 'utf8');

describe('OFT, Gemini and OXE source scope', () => {
  it('separates OFT success, input configurations, generation throughput and control', () => {
    const text = article('vla-models');
    for (const phrase of ['97.1%', 'wrist image and proprioceptive state', '100 one-image queries', '109.7 actions per second', '4.2', '71.4 with the added inputs', '25 Hz', 'all 25 actions', '95.3%', '95.4%', '50 denoising steps', 'leave multimodal demonstrations']) expect(text).toContain(phrase);
    expect(text).not.toContain('representation, not the model quality, was the bottleneck');
    expect(text).not.toContain('ACT made the same point');
  });
  it('preserves OXE pool, training subset and mixed transfer populations', () => {
    const text = article('vla-models');
    for (const phrase of ['22 embodiments', '527 skills', '160,266 tasks', 'names 21 institutions', '60 datasets from 34 labs', 'nine-embodiment subset', 'four of five small-data', 'underperformed', 'roughly on par']) expect(text).toContain(phrase);
    expect(text).not.toContain('the first large-scale evidence');
  });
  it('keeps Gemini mechanism disclosure, chart populations, and source-scoped unknowns distinct', () => {
    const text = article('generalist-policies');
    for (const phrase of ['October 2, 2025', 'The launch post, dated September 25, 2025', 'continuous numerical actions', 'Apollo with Inspire hands', '92%', '44%', '40%', '32%', 'image alt text', 'Single-task results', 'Trial counts', 'fewer than 200', 'error bars are unexplained']) expect(text).toContain(phrase);
    expect(text).not.toContain('specified in neither');
    expect(text).not.toContain('Weights are closed throughout');
    expect(article('cross-embodiment')).toContain('21 human hand keypoints to the 22-DoF Sharpa hand');
    expect(article('hierarchical')).toContain('its agentic system adds a separate GR-ER 1.5 orchestrator');
  });
  it('attributes Skild claims and preserves the valuation lower bound and data categories', () => {
    const text = article('generalist-policies');
    for (const phrase of ['over \\$14', 'company', 'simulation and Internet video', 'teleoperation and deployments', 'Architecture, parameter count, control rate, chunk horizon, benchmark protocol and weight terms are not given']) expect(text).toContain(phrase);
    expect(text).not.toContain('essentially nothing technical');
  });
  it('uses complete source author lists, not corporate affiliations as authors', () => {
    const oxe = getCitation('open-x-embodiment-2023')!;
    expect(oxe.authors).toHaveLength(294);
    expect(oxe.authors[0]).toBe('Open X-Embodiment Collaboration');
    expect(oxe.authors.at(-1)).toBe('Zipeng Lin');
    expect(oxe.year).toBe(2023);
    const gr = getCitation('gemini-robotics-15-2025')!;
    expect(gr.authors).toHaveLength(173);
    expect(gr.authors).toContain('Robert Baruch');
    expect(gr.authors).toContain('David B. D’Ambrosio');
    expect(gr.authors).toContain('Hiu Hong (Eddie) Yu');
    expect(gr.authors).not.toContain('Google DeepMind');
    expect(getCitation('gemini-robotics-2-2026')?.authors).toEqual(['Carolina Parada']);
    expect(getCitation('skild-series-c-2026')).toMatchObject({ title: 'Announcing Series C', authors: ['Skild AI Team'], year: 2026 });
  });
});
