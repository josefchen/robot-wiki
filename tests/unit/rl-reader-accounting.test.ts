import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '../../data/citations';
import {
  AUDIT_LEDGERS,
  parseCompoundPlans,
  parseLedger,
} from '../../lib/audit-ledger';

const read = (path: string) => readFileSync(path, 'utf8');
const plans = parseCompoundPlans(JSON.parse(read('audit/compound-evidence.json')));
const ids = new Set(CITATIONS.map(c => c.id));
const ledgers = AUDIT_LEDGERS.map(ledger => {
  const articleCitations = Object.fromEntries(plans
    .filter(p => p.ledgerPath === ledger.ledgerPath && p.kind === 'frontmatter-p1')
    .map(p => [p.articleSlug,
      matter(read(`content/${ledger.domain}/${p.articleSlug}.mdx`)).data.citations]));
  return {
    ...ledger,
    sections: parseLedger(ledger.ledgerPath, read(ledger.ledgerPath), ids,
      { compoundPlans: plans, articleCitations }),
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
    expect(current).toContain(`${complete} complete / ${records.length - complete} incomplete / ${records.length} original identities`);
    expect(current).toContain('not acceptance');
    expect(read('audit/README.md')).not.toMatch(/^## Current partial Isaac/m);
  });
});
