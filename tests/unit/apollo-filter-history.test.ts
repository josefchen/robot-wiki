import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const article = readFileSync('content/classical/state-estimation.mdx', 'utf8');
describe('Apollo history preserves NASA source scope', () => {
  it('separates Ames development from MIT and Potter implementation', () => {
    expect(article).toContain('adapting the filter to nonlinear circumlunar navigation');
    expect(article).toContain("Battin's Apollo studies at MIT and Potter's square-root implementation");
    expect(article).not.toContain('developed it into the navigation method for Apollo');
  });
  it('separates early simulation from demonstrated flight-computer operation', () => {
    expect(article).toContain('By early 1961');
    expect(article).toContain('operation on available flight computers was unverified');
  });
  it('preserves ground-primary and onboard-backup roles', () => {
    expect(article).toContain('Primary Apollo navigation used ground radar, with an onboard backup');
  });
  it('preserves qualified relinearization rather than a sufficient-cause claim', () => {
    expect(article).toContain('nominal reference trajectory');
    expect(article).toContain('*current estimated state*');
    expect(article).toContain('which they hoped would bring "substantial advantages"');
    expect(article).not.toContain('was the modification that made the filter practical');
  });
  it('keeps the simulation and numerical-model limitations visible', () => {
    expect(article).toContain('converged after initial overshoots');
    expect(article).toContain('An accidentally off-nominal simulation converged');
    expect(article).toContain('round-off, inadequate statistical models and nonlinearities');
  });
  it('preserves three NASA citation placements and the original review date', () => {
    expect(article.match(/<Cite id="mcgee-schmidt-1985" \/>/g)).toHaveLength(3);
    expect(article).toContain('lastReviewed: "2026-08-17"');
  });
});
