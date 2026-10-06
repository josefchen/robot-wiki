import { readFileSync } from 'node:fs';
import { compile } from '@mdx-js/mdx';
import matter from 'gray-matter';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import { PI_GENERATIONS } from '@/lib/pi-generations';

const article = (path: string) => readFileSync(`content/${path}.mdx`, 'utf8');

describe('source-scoped cross-article corrections', () => {
  it('separates KI toy outputs, language-model size and complete VLM size', () => {
    const text = article('manipulation/knowledge-insulation');
    expect(text).toContain('256 uniform bins');
    expect(text).toContain('backbone is a 2B language model');
    expect(text).not.toContain('paper (NeurIPS 2025)');
  });

  it('distinguishes training bodies, checkpoint transfer and measured model rates', () => {
    const text = article('manipulation/comparison-matrix');
    expect(text).toContain('Everyday Robots');
    expect(text).toContain('multi-TPU cloud service');
    expect(text).toContain('5 Hz and 15 Hz controllers');
  });

  it('separates TD-MPC2 offline scaling from the online benchmark', () => {
    for (const slug of ['latent-dynamics', 'taxonomy']) {
      const text = article(`world-models/${slug}`);
      expect(text).toContain('545M');
      expect(text).toContain('240 single-task agents');
      expect(text).toContain('104-task online benchmark');
      expect(text).toContain('joint-embedding');
    }
  });

  it('preserves both horizon-label disagreements without a reliable-range claim', () => {
    const text = article('world-models/latent-dynamics');
    expect(text).toContain('H = 15');
    expect(text).toContain('T = 16');
    expect(text).toContain('planning horizon H = 16, while its appendix lists imagination horizon H = 15');
    expect(text).toContain('no paper measures that as a reliable-horizon range');
    expect(text).toContain('latent-state consistency');
  });

  it('keeps reward-inclusive extraction and action-expert training distinct', () => {
    const text = article('manipulation/rl-finetuning');
    expect(text).toContain('N = 50');
    expect(text).toContain('task-dependent threshold');
    expect(text).toContain('beta_{\\mathrm{KL}}');
    expect(text).toContain('beta_{\\mathrm{CFG}}');
    expect(text).toContain("stops the action expert's gradient at the backbone interface");
    expect(text).not.toContain('no gradients pass through the action head');
  });

  it('retains task populations and distinct espresso duration accounts', () => {
    const text = article('manipulation/rl-finetuning');
    expect(text).toContain('about a factor of two');
    expect(text).toContain('more than 2×');
    expect(text).toContain('13 hours straight');
    expect(text).toContain('5:30am to 11:30pm');
    expect(text).toContain('reports stages separately');
  });

  it('does not turn MEM semantic memory into dense video or an invented date', () => {
    const text = article('manipulation/pi-line');
    expect(text).toContain('predicts updated natural-language summaries of earlier events');
    expect(text).toContain('on the same corrections');
    expect(text).not.toContain('A March 2026 variant');
    expect(PI_GENERATIONS.find((g) => g.id === 'pi06-mem')?.released).toBeNull();
    expect(getCitation('mem-2026')?.authors).toContain('Allen Z. Ren');
  });

  it('does not infer closed licensing from absence in the pinned catalogue', () => {
    const text = article('manipulation/pi-line');
    expect(text).not.toContain('All three are closed');
    expect(PI_GENERATIONS.filter((g) => g.openWeights === null)).toHaveLength(4);
  });

  it('compiles Recap display equations and rejects the original malformed delimiters', async () => {
    const source = matter(article('manipulation/rl-finetuning')).content;
    const compileMath = (text: string) => compile(text, {
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    });
    expect(source.match(/^\$\$$/gm)).toHaveLength(4);
    expect(String(await compileMath(source))).toContain('katex-display');
    await expect(compileMath(source.replace(/^\$\$$/gm, '$')))
      .rejects.toThrow(/acorn|parse expression/);
  });
});
