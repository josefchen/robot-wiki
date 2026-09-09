import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const article = readFileSync('content/classical/state-estimation.mdx', 'utf8');
describe('Apollo history preserves NASA source scope', () => {
  it('separates Ames development from MIT and Potter implementation', () => {
    expect(article).toContain("adapting Kalman's linear filter to nonlinear circumlunar navigation");
    expect(article).toContain("Battin's Apollo navigation studies at MIT and Potter's square-root implementation");
    expect(article).not.toContain('developed it into the navigation method for Apollo');
  });
  it('separates early simulation from demonstrated flight-computer operation', () => {
    expect(article).toContain('By early 1961');
    expect(article).toContain('operation on available flight computers had not yet been verified');
  });
  it('preserves ground-primary and onboard-backup roles', () => {
    expect(article).toContain('ground radar for primary Apollo navigation, with an onboard backup');
  });
  it('preserves qualified relinearization rather than a sufficient-cause claim', () => {
    expect(article).toContain('nominal reference trajectory');
    expect(article).toContain('*current estimated state*');
    expect(article).toContain('might offer substantial advantages');
    expect(article).not.toContain('was the modification that made the filter practical');
  });
  it('keeps the simulation and numerical-model limitations visible', () => {
    expect(article).toContain('converged after initial overshoots');
    expect(article).toContain('not a general convergence guarantee');
    expect(article).toContain('round-off, inadequate statistical models and nonlinearities');
  });
  it('preserves two NASA citation placements and the original review date', () => {
    expect(article.match(/<Cite id="mcgee-schmidt-1985" \/>/g)).toHaveLength(2);
    expect(article).toContain('lastReviewed: "2026-08-17"');
  });
});
