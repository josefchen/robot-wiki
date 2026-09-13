import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const article = readFileSync('content/frontier/competing-theses.mdx', 'utf8');
const table = readFileSync('lib/competing-theses.ts', 'utf8');

describe('bounded PI and Helix thesis corrections', () => {
  it('separates optional BAGEL prompts from action execution', () => {
    expect(article).toContain('optional subgoal-image prompts from a separate');
    expect(table).toContain('optional visual subgoals from a separate BAGEL-initialized world model');
    expect(table).toContain('the images condition the action policy');
  });
  it('attributes lightweight to the paper rather than asserting cheap inference', () => {
    expect(article).toContain('which the paper describes as lightweight');
    expect(table).toContain('described as lightweight in the paper');
    expect(article).not.toContain('consults a lightweight');
  });
  it('names Helix 02 and distinguishes 200 Hz targets from 1 kHz execution', () => {
    expect(article).toContain('S1 converts perception into full-body joint targets at 200 Hz');
    expect(article).toContain('S0 executes at 1 kHz');
    expect(table).toContain('Figure (Helix 02 S2/S1/S0)');
  });
  it('keeps the complete dishwasher task and protocol vendor-attributed', () => {
    expect(article).toContain('Figure reports that Helix 02 completed a continuous four-minute dishwasher unloading-and-reloading task');
    expect(table).toContain('Figure reports a continuous four-minute Helix 02 dishwasher unloading-and-reloading task');
    expect(table).toContain('without resets or human intervention');
    expect(table).toContain('described as ordered correctly with implicit error recovery');
  });
  it('bounds the specialist comparison and defines throughput', () => {
    for (const text of [article, table]) {
      expect(text).toContain('evaluated laundry-folding, espresso-making, and box-building tasks');
      expect(text).toContain('after distilling Recap experience with strategy metadata');
      expect(text).toContain('successful episodes per hour, not inference speed');
    }
    expect(article).toContain('not an exclusivity result');
    expect(table).toContain('does not establish failure on other tasks');
  });
  it('binds the existing paper AND blog without advancing the article date', () => {
    expect(article).toContain('  - pi07-2026\n  - pi07-blog-2026');
    expect(article).toContain('<Cite id="pi07-2026" /> <Cite id="pi07-blog-2026" />');
    expect(table).toContain("citationIds: ['pi07-2026', 'pi07-blog-2026']");
    expect(article).toMatch(/lastReviewed: ['"]?2026-08-18/);
  });
});
