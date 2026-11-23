import { describe, expect, it } from 'vitest';
import { GET } from '@/app/company-sources.json/route';
import { COMPANIES } from '@/data/companies';
import { buildLlmsFullTxt, buildLlmsTxt } from '@/lib/llms';
import { registryLlmsInput } from '@/lib/llms-registry';
import { SITE_URL } from '@/lib/site';

describe('market map source index', () => {
  it('publishes the same company names, destinations and ordered sources as the map', async () => {
    const response = GET();
    expect(response.headers.get('Content-Type')).toContain('application/json');
    const { companies } = await response.json();
    expect(Object.keys(companies).sort()).toEqual(COMPANIES.map(({ id }) => id).sort());
    for (const company of COMPANIES) {
      expect(companies[company.id]).toEqual({
        name: company.name,
        marketMapUrl: `${SITE_URL}/market-map/#company-${company.id}`,
        sources: company.sources,
      });
    }
  });

  it('links the source index in both plain-text guides before the reference entries', () => {
    const input = registryLlmsInput();
    const link = `[market map source index](${input.siteUrl}/company-sources.json)`;
    for (const guide of [buildLlmsTxt(input), buildLlmsFullTxt(input)]) {
      expect(guide.split('\n## ')[0]).toContain(link);
    }
  });
});
