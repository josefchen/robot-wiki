import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import { RlMethodsTable } from '@/components/mdx/rl-methods-table';

const article = readFileSync('content/manipulation/rl-finetuning.mdx', 'utf8');
const overview = readFileSync('content/rl-sim2real/rl-for-robotics.mdx', 'utf8');

describe('retained pi_RL v3 and PLD v1 source corrections', () => {
  it('keeps the printed sixteen-author pi_RL byline and edition year', () => {
    expect(CITATIONS.find(({ id }) => id === 'pi-rl-2026')).toMatchObject({
      year: 2026,
      authors: [
        'Kang Chen', 'Zhihao Liu', 'Tonghe Zhang', 'Zhen Guo', 'Si Xu',
        'Hao Lin', 'Hongzhi Zang', 'Xiang Li', 'Bingwen Wei', 'Jiakai Zhou',
        'Quanlu Zhang', 'Zhaofei Yu', 'Guoliang Fan', 'Tiejun Huang',
        'Yu Wang', 'Chao Yu',
      ],
    });
  });

  it('does not infer PLD acceptance from an old ledger label', () => {
    const citation = CITATIONS.find(({ id }) => id === 'pld-2026');
    expect(citation?.year).toBe(2025);
    expect(citation?.venue).toBeUndefined();
    expect(citation?.authors).toHaveLength(12);
  });

  it('distinguishes denoising-path likelihood and qualified transfer', () => {
    expect(article).toContain('joint likelihood of the denoising path');
    expect(article).toContain('not an exact marginal likelihood');
    expect(article).toContain('one randomly chosen denoising step stochastic');
    expect(article).toContain('40% real-world success without stating an evaluation-trial denominator');
    expect(article).toContain('five unseen tasks in MetaWorld ML45');
    expect(overview).toContain('not the supervised flow-matching regression loss');
    expect(article).not.toContain('most complete treatment');
    expect(article).not.toContain('log-likelihood fix');
  });

  it('preserves PLD denominators, arithmetic conflict and recovery limits', () => {
    expect(article).toContain('50.6-percentage-point gain');
    expect(article).toContain('displayed means differ by 24.8 points');
    expect(article).toContain('per-stage one-shot success is not 100%');
    expect(article).toContain('The inspected PLD and DSRL sources do not establish a code or weight release');
    expect(article).not.toContain('Xiao et al., ICLR 2026');
    expect(article).not.toContain('100% success on its real Franka and YAM');
    expect(overview).toContain('hybrid recovery data');
  });

  it('renders the coupled rows without granting the aggregate audit credit', () => {
    render(<RlMethodsTable />);
    const pirl = within(screen.getByRole('row', { name: /^pi_RL / }));
    expect(pirl.getByText(/joint denoising-path likelihood/)).toBeInTheDocument();
    expect(pirl.getByText('code')).toBeInTheDocument();
    const pld = within(screen.getByRole('row', { name: /^Residual RL \(PLD\)/ }));
    expect(pld.getByText('2025')).toBeInTheDocument();
    expect(pld.getByText('preprint')).toBeInTheDocument();
    expect(pld.queryByText('peer-reviewed')).not.toBeInTheDocument();
    expect(pld.getByText(/50 trials\/task/)).toBeInTheDocument();
    expect(pld.getByText(/not 100% one-shot success/)).toBeInTheDocument();
  });
});
