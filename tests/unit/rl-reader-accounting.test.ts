import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import { publishedModules } from '../../data/modules';
import { moduleFrontmatterSchema } from '../../data/schemas/module';
import { parseCorrectedDispositions } from '../../lib/audit-corrected-disposition';
import { loadLocalBasisContext } from '../../lib/audit-local-basis';
import {
  AUDIT_LEDGERS,
  parseCompoundPlans,
  parseLedger,
} from '../../lib/audit-ledger';
import { preDomainPassCitations } from '../helpers/domain-pass';
import { verifyLedgerAdditions } from '../helpers/ledger-additions';

const read = (path: string) => readFileSync(path, 'utf8');
const plans = parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
const ids = new Set(CITATIONS.map(c => c.id));
const localBasis = loadLocalBasisContext(
  process.cwd(),
  publishedModules().map(({ domain, slug }) => `/${domain}/${slug}/`),
);
const correctedDispositions = {
  root: process.cwd(),
  records: parseCorrectedDispositions(
    ['industrial-release-20260924', 'residual-release-20260924']
      .flatMap(directory =>
        JSON.parse(read(`audit/evidence/${directory}/corrections.json`)))
      .concat(
        (JSON.parse(read('audit/evidence/classical-closure-20260923/corrections.json')) as Array<{ originalId: string }>)
          .filter(record => ['audit/classical.md:control:1', 'audit/classical.md:control:2']
            .includes(record.originalId)),
      ),
  ),
};
const ledgers = AUDIT_LEDGERS.map(ledger => {
  const articleCitations = Object.fromEntries(plans
    .filter(p => p.ledgerPath === ledger.ledgerPath && p.kind === 'frontmatter-p1')
    .map(p => {
      const frontmatter = moduleFrontmatterSchema.parse(
        matter(read(`content/${ledger.domain}/${p.articleSlug}.mdx`)).data,
      );
      if (frontmatter.domain !== ledger.domain || frontmatter.slug !== p.articleSlug) {
        throw new Error(`compound plan ${p.id} has a different canonical target`);
      }
      return [p.articleSlug, preDomainPassCitations(ledger.domain, p.articleSlug, frontmatter.citations)];
    }));
  return {
    ...ledger,
    sections: parseLedger(ledger.ledgerPath, read(ledger.ledgerPath), ids,
      { compoundPlans: plans, articleCitations, localBasis, correctedDispositions }),
  };
});

describe('RL reader checkpoint accounting', () => {
  it('reconciles the manipulation summary with canonical P1 context', () => {
    const ledger = ledgers.find(l => l.ledgerPath === 'audit/manipulation.md')!;
    expect(ledger.sections.flatMap(s => s.summaryFailures)).toEqual([]);
  });

  it('reports current row completeness separately from verdicts and gate findings', () => {
    const records = ledgers.flatMap(l => l.sections.flatMap(s => s.claimRecords));
    const complete = records.filter(r => r.evidenceFailures.length === 0
      && !['unresolved', 'unrecognised'].includes(r.outcome)).length;
    const current = read('audit/README.md')
      .match(/<!-- rl-reader-current:start -->([\s\S]*?)<!-- rl-reader-current:end -->/)?.[1];
    expect(current).toBeDefined();
    const counts = ledgers.flatMap(ledger => ledger.sections.map(section => verifyLedgerAdditions(section)));
    expect(counts.reduce((sum, section) => sum + section.originalRows, 0)).toBe(1080);
    expect(counts.reduce((sum, section) => sum + section.addedRows, 0)).toBe(174);
    expect(current).toContain('1080 complete / 0 incomplete / 1080 original identities');
    expect(complete).toBe(1254);
    expect(records).toHaveLength(1254);
    const latest = read('audit/README.md').split('<!-- rl-reader-current:start -->')[0];
    expect(latest).toContain('1,254 claim rows and 1,545 citation identities');
    expect(CITATIONS).toHaveLength(1545);
    expect(latest).toContain('not source certification or final release acceptance');
    expect(current).toContain('not acceptance');
    expect(read('audit/README.md')).not.toMatch(/^## Current partial Isaac/m);
  });
});
