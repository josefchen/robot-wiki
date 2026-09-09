import { describe, expect, it } from 'vitest';
import { getTerm } from '../../data/glossary';
import { getCitation } from '../../data/citations';

// Retained OSHA Technical Manual, "Integrating Robot Applications" and
// "Risk Assessments": text SHA256
// 4c2bae15d3803a1db7be3f49c6b787847361655093e13d919dcef32daeb40755.
// Retained EVST Engineering Team guide, July 15, 2026: text SHA256
// b51c5395721f10ea1ddaae213b67ba8209d8b4e3201fab4014b19061bfd6393c.
// These are September 6 retained bodies, not a new liveness observation.
const definition = getTerm('systems-integrator')!.definition;

describe('systems integrator glossary source alignment', () => {
  it('defines concrete application integration rather than an empty disclaimer', () => {
    expect(definition).toContain('integrates a robot');
    for (const component of ['end-effectors', 'sensors', 'safeguarding', 'controls']) {
      expect(definition).toContain(component);
    }
    expect(definition).toContain('needed for an application');
  });

  it('preserves OSHA’s explicit manufacturer and employer role overlap', () => {
    // OSHA: "Some robot manufacturers and some users (employers) also act
    // as the integrator of their robots".
    expect(definition).toContain('Manufacturers or employers may also act as integrators.');
    expect(definition).not.toMatch(/not the robot manufacturer|manufacturer.{0,30}exempt/i);
  });

  it('scopes the risk-assessment statement to the manual’s dated standard', () => {
    expect(definition).toContain("OSHA's Technical Manual");
    expect(definition).toContain('discussing ANSI/RIA R15.06-2012');
    expect(definition).toContain('complete and document an application risk assessment before commissioning');
    expect(definition).not.toContain('Under ISO');
    expect(definition).not.toContain('ISO 10218-2:2025');
  });

  it('retains the employer’s workplace-safety responsibility', () => {
    // OSHA: "it is the employer's responsibility under OSHA to maintain
    // a safe work place for their employees".
    expect(definition).toContain('employers remain responsible for a safe workplace');
  });

  it('uses EVST for its own dated commercial cell-budget scope', () => {
    expect(definition).toContain("EVST's July 15, 2026 commercial palletising guide");
    for (const component of ['tooling', 'guarding', 'controls integration', 'commissioning', 'programming']) {
      expect(definition).toContain(component);
    }
    expect(definition).toContain('beyond the arm price');
  });

  it('does not turn a vendor estimate or site acceptance into universal guarantees', () => {
    expect(definition).not.toMatch(/two to three|2\s*[-–]\s*3|third to half|sign-off|agreed cycle time/i);
    expect(definition).not.toContain('fixtures and guarding');
    expect(definition).not.toMatch(/independently verified|current prices|certified safe/i);
  });

  it('retains the exact two registered citations and a substantive definition', () => {
    const term = getTerm('systems-integrator')!;
    expect(term.citations).toEqual(['evst-cell-cost-2026', 'osha-otm-robots']);
    expect(term.definition.length).toBeGreaterThan(300);
    expect(term.definition.endsWith('.')).toBe(true);
    expect(term.citations.map(id => getCitation(id)?.url)).toEqual([
      'https://www.evsint.com/palletizing-robot-cost-roi-price-payback-2026/',
      'https://www.osha.gov/otm/section-4-safety-hazards/chapter-4',
    ]);
  });
});
