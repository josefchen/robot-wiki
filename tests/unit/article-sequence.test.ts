import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DomainLandingPage from '@/app/(content)/[domain]/page';
import { DOMAINS, publishedModules } from '@/data/modules';
import {
  articleEditUrl,
  articleErrorReportUrl,
  articleNeighbours,
  domainSequence,
} from '@/lib/article-sequence';
import { REPOSITORY_URL } from '@/lib/identity';
import { SITE_URL } from '@/lib/site';

const key = (m: { domain: string; slug: string }) => `${m.domain}/${m.slug}`;

/** The article keys a domain's hub page lists, in the order it renders them. */
async function hubOrder(domain: string): Promise<string[]> {
  const html = renderToStaticMarkup(
    await DomainLandingPage({ params: Promise.resolve({ domain }) }),
  );
  const page = new DOMParser().parseFromString(html, 'text/html');
  return [...page.querySelectorAll('li[data-domain-article]')].map(
    (item) => item.getAttribute('data-domain-article')!,
  );
}

describe('the article sequence', () => {
  it('covers every published article exactly once', () => {
    const all = DOMAINS.flatMap((domain) => domainSequence(domain).map(key));
    expect([...all].sort()).toEqual(publishedModules().map(key).sort());
  });

  for (const domain of DOMAINS) {
    it(`${domain} runs in the order its hub page lists`, async () => {
      const hub = await hubOrder(domain);
      expect(hub.length).toBeGreaterThan(1);
      expect(domainSequence(domain).map(key)).toEqual(hub);
    });

    it(`${domain} steps through its hub order and stops at both ends`, async () => {
      const hub = await hubOrder(domain);
      hub.forEach((articleKey, index) => {
        const slug = articleKey.split('/')[1];
        const { previous, next } = articleNeighbours(domain, slug);
        expect(previous ? key(previous) : undefined, `before ${articleKey}`).toBe(
          hub[index - 1],
        );
        expect(next ? key(next) : undefined, `after ${articleKey}`).toBe(hub[index + 1]);
      });

      const first = articleNeighbours(domain, hub[0].split('/')[1]);
      expect(first.previous).toBeUndefined();
      expect(first.next).toBeDefined();
      const last = articleNeighbours(domain, hub.at(-1)!.split('/')[1]);
      expect(last.previous).toBeDefined();
      expect(last.next).toBeUndefined();
    });
  }

  it('gives an article outside the registry no neighbours', () => {
    expect(articleNeighbours('manipulation', 'no-such-article')).toEqual({});
    expect(articleNeighbours('no-such-domain', 'vla-models')).toEqual({});
  });
});

describe('the article end links', () => {
  it('opens each article source file that exists on disk in the editor on main', () => {
    for (const m of publishedModules()) {
      const url = articleEditUrl(m.domain, m.slug);
      expect(url.startsWith(`${REPOSITORY_URL}/edit/main/`), url).toBe(true);
      const file = url.slice(`${REPOSITORY_URL}/edit/main/`.length);
      expect(file).toBe(`content/${m.domain}/${m.slug}.mdx`);
      expect(existsSync(join(process.cwd(), file)), file).toBe(true);
    }
  });

  it('opens the correction form with the page address in its Page URL field', () => {
    const template = 'content-correction.yml';
    const form = readFileSync(
      join(process.cwd(), '.github', 'ISSUE_TEMPLATE', template),
      'utf8',
    );
    // The query key is the form field's id; the form must still have it.
    expect(form).toMatch(/- type: input\n\s+id: page\n\s+attributes:\n\s+label: Page URL/);

    for (const m of publishedModules()) {
      const url = new URL(articleErrorReportUrl(m));
      expect(`${url.origin}${url.pathname}`).toBe(`${REPOSITORY_URL}/issues/new`);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        template,
        title: `content correction: ${m.title}`,
        page: `${SITE_URL}/${m.domain}/${m.slug}/`,
      });
    }
  });
});
