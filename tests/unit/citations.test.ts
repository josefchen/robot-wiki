import { describe, expect, it } from 'vitest';
import {
  CITATIONS,
  ORGANIZATION_CHIP_NAMES,
  citationLabel,
  citationMeta,
  getCitation,
  type Citation,
} from '@/data/citations';
import { citationSchema } from '@/data/schemas/citation';

// Exact retained primary-body editions, not a blanket arXiv HTML/PDF exception.
const primaryBodyExceptions = [
  ['octo-2024', '2405.12213', 'https://arxiv.org/html/2405.12213v2'],
  ['rt1-2022', '2212.06817', 'https://arxiv.org/html/2212.06817v2'],
  ['pi05-2025', '2504.16054', 'https://arxiv.org/html/2504.16054v1'],
  // Retained 2026-09-08 RL campaign PDF: explicit v4 / 28 Aug 2016,
  // four-author byline; distinct from the five-author IJRR 2018 citation.
  // Binary SHA-256: 23b74d74000a360d73592528035c4354ce1c592ca1c22f03d915559a9aca793c.
  ['levine-hand-eye-2016', '1603.02199', 'https://arxiv.org/pdf/1603.02199v4'],
  // Exact BOP 2023 challenge report, printed arXiv v1 / 14 Mar 2024.
  ['bop-challenge-2023', '2403.09799', 'https://arxiv.org/html/2403.09799v1'],
] as const;

function hasBoundArxivUrl(c: Pick<Citation, 'id' | 'arxiv' | 'url'>): boolean {
  if (!c.arxiv || !/^\d{4}\.\d{4,5}$/.test(c.arxiv)) return false;
  const abs = `https://arxiv.org/abs/${c.arxiv}`;
  return c.url === abs ||
    (c.url.startsWith(abs) && /^v[1-9]\d*$/.test(c.url.slice(abs.length))) ||
    primaryBodyExceptions.some(([id, arxiv, url]) =>
      c.id === id && c.arxiv === arxiv && c.url === url,
    );
}

describe('citation registry', () => {
  it('contains only schema-valid entries', () => {
    for (const citation of CITATIONS) {
      const parsed = citationSchema.safeParse(citation);
      expect(parsed.success, JSON.stringify(citation)).toBe(true);
    }
  });

  it('has unique ids', () => {
    const ids = CITATIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('binds arXiv URLs to the registered document and exact body exceptions', () => {
    for (const c of CITATIONS) {
      if (c.arxiv) {
        expect(hasBoundArxivUrl(c), `${c.id}: ${c.url}`).toBe(true);
      }
    }
  });

  it('rejects wrong documents, unknown exception IDs, wrong versions and unsafe URLs', () => {
    const rt1 = { id: 'rt1-2022', arxiv: '2212.06817' };
    for (const url of [
      'https://arxiv.org/abs/2504.16054v1',
      'https://arxiv.org/html/2212.06817v1',
      'https://arxiv.org/html/2212.06817v2?redirect=elsewhere',
      'http://arxiv.org/html/2212.06817v2',
      'https://arxiv.org.evil.example/html/2212.06817v2',
      'javascript:alert(1)',
    ]) expect(hasBoundArxivUrl({ ...rt1, url }), url).toBe(false);
    expect(hasBoundArxivUrl({
      ...rt1, id: 'unknown-exception', url: primaryBodyExceptions[1][2],
    })).toBe(false);
    expect(hasBoundArxivUrl({
      ...rt1, arxiv: '2504.16054', url: primaryBodyExceptions[1][2],
    })).toBe(false);
    expect(hasBoundArxivUrl({ ...rt1, url: 'https://arxiv.org/abs/2212.06817v2' })).toBe(true);
  });

  it('keeps the audited BOP pointer and exact inspected v1 identity distinct', () => {
    const c = getCitation('bop-challenge-2023')!;
    expect(c).toMatchObject({
      title: 'BOP Challenge 2023 on Detection, Segmentation and Pose Estimation of Seen and Unseen Rigid Objects',
      year: 2024, venue: 'arXiv preprint', arxiv: '2403.09799',
      url: 'https://arxiv.org/abs/2403.09799',
      authors: ['Tomas Hodan', 'Martin Sundermeyer', 'Yann Labbé', 'Van Nguyen Nguyen', 'Gu Wang', 'Eric Brachmann', 'Bertram Drost', 'Vincent Lepetit', 'Carsten Rother', 'Jiri Matas'],
    });
    expect(hasBoundArxivUrl(c)).toBe(true);
    // Body-edition proof is preserved; it is not a substitute for URL-audit coverage.
    const body = { ...c, url: 'https://arxiv.org/html/2403.09799v1' };
    expect(hasBoundArxivUrl(body)).toBe(true);
    for (const mutation of [
      { id: 'bop-challenge-2024' }, { arxiv: '2403.09798' },
      { url: 'https://arxiv.org/html/2403.09799v2' },
      { url: 'https://arxiv.org/html/2403.09799' },
      { url: 'https://arxiv.org/html/2403.09799v1?x=1' },
      { url: 'https://arxiv.org/html/2403.09799v1#other' },
      { url: 'http://arxiv.org/html/2403.09799v1' },
      { url: 'https://arxiv.org.evil.example/html/2403.09799v1' },
      { url: 'https://arxiv.org@evil.example/html/2403.09799v1' },
    ]) expect(hasBoundArxivUrl({ ...body, ...mutation })).toBe(false);
  });

  it('getCitation resolves known ids and misses unknown ones', () => {
    const known = CITATIONS[0];
    expect(getCitation(known.id)?.id).toBe(known.id);
    expect(getCitation('no-such-citation')).toBeUndefined();
  });

  it('accepts the retained four-author Levine 2016 v4 PDF without changing source identity', () => {
    const citation = getCitation('levine-hand-eye-2016')!;
    expect(citation).toMatchObject({
      arxiv: '1603.02199',
      url: 'https://arxiv.org/pdf/1603.02199v4',
      year: 2016,
      authors: ['Sergey Levine', 'Peter Pastor', 'Alex Krizhevsky', 'Deirdre Quillen'],
    });
    expect(hasBoundArxivUrl(citation)).toBe(true);
  });

  it.each([
    { id: 'levine-hand-eye-2018' },
    { id: 'unknown-exception' },
    { arxiv: '1603.02198' },
    { url: 'https://arxiv.org/pdf/1603.02198v4' },
    { url: 'https://arxiv.org/pdf/1603.02199v3' },
    { url: 'https://arxiv.org/pdf/1603.02199v5' },
    { url: 'https://arxiv.org/pdf/1603.02199' },
    { url: 'https://arxiv.org/html/1603.02199v4' },
    { url: 'https://arxiv.org/pdf/1603.02199v4?redirect=elsewhere' },
    { url: 'https://arxiv.org/pdf/1603.02199v4#other' },
    { url: 'http://arxiv.org/pdf/1603.02199v4' },
    { url: 'https://arxiv.org.evil.example/pdf/1603.02199v4' },
    { url: 'https://arxiv.org@evil.example/pdf/1603.02199v4' },
    { url: 'javascript:alert(1)' },
  ])('rejects an unbound Levine body tuple: %j', (mutation) => {
    expect(hasBoundArxivUrl({
      id: 'levine-hand-eye-2016',
      arxiv: '1603.02199',
      url: 'https://arxiv.org/pdf/1603.02199v4',
      ...mutation,
    })).toBe(false);
  });

  it('citationLabel is "FirstAuthorSurname et al. Year" for a multi-author source', () => {
    const zhao = getCitation('act-aloha-2023');
    expect(zhao).toBeDefined();
    expect(citationLabel(zhao!)).toBe('Zhao et al. 2023');
    expect(citationLabel(getCitation('kalman-1960-filter')!)).toBe('Kalman 1960');
  });

  it('citationLabel keeps organization names whole', () => {
    const org: Citation = {
      id: 'test-organization',
      title: 'Organization-authored fixture',
      authors: ['Physical Intelligence'],
      year: 2025,
      url: 'https://example.com/',
      type: 'blog',
    };
    expect(citationLabel(org)).toBe('Physical Intelligence 2025');
    expect(citationLabel(getCitation('bd-spot-rl-2024')!)).toBe('Boston Dynamics 2024');
    expect(citationLabel(getCitation('ros2-qos-2026')!)).toBe('ROS 2 Project 2026');
    expect(citationLabel(getCitation('osha-otm-robots')!)).toBe('OSHA 2026');
    // The real RTC blog has a named byline, not organization authorship.
    expect(citationLabel(getCitation('pi-real-time-chunking-blog-2025')!)).toMatch(/^Black /);
  });

  it('citationLabel keeps multi-word surnames via override, without breaking lookalikes', () => {
    const diCarlo = getCitation('di-carlo-2018');
    expect(diCarlo).toBeDefined();
    expect(citationLabel(diCarlo!)).toMatch(/^Di Carlo (et al\. )?2018$/);
    // "Di" as a given name must not be swallowed into the surname.
    const lookalike: Citation = {
      id: 'test-lookalike',
      title: 'T',
      authors: ['Di Huang'],
      year: 2024,
      url: 'https://example.com/',
      type: 'paper',
    };
    expect(citationLabel(lookalike)).toBe('Huang 2024');
  });

  // Words that end organisation names. A byline of two or more words that
  // carries one is an organisation, and must be registered so its chip
  // prints the whole name instead of the last word.
  const ORGANIZATION_WORDS = new Set([
    'AI', 'Administration', 'Agency', 'Association', 'Automation', 'Collaboration',
    'Commons', 'Company', 'Consortium', 'Contributors', 'Corporation', 'DeepMind',
    'Dynamics', 'Engagement', 'Face', 'Federation', 'Foundation', 'Group', 'Grumman',
    'Inc.', 'Institute', 'Intelligence', 'Japan', 'LLC', 'Laboratory', 'Labs', 'Ltd',
    'Maintainers', 'Project', 'Report', 'Research', 'Robot', 'Robotics', 'Robots',
    'Society', 'Studio', 'Surgical', 'Team', 'Technologies', 'University',
  ]);

  it.each(CITATIONS.map((citation) => [citation.id, citation] as const))(
    '%s labels its author or organisation, then its year',
    (_, citation) => {
      const label = citationLabel(citation);
      const first = citation.authors[0];
      const words = first.split(' ');
      const organisation = ORGANIZATION_CHIP_NAMES.get(first);
      expect(label.endsWith(` ${citation.year}`), label).toBe(true);
      const name = label.slice(0, -` ${citation.year}`.length).replace(/ et al\.$/, '');
      expect(label.includes(' et al. '), label).toBe(citation.authors.length > 1);
      if (organisation) {
        expect(name).toBe(organisation);
      } else {
        expect(
          words.length === 1 || !words.some((word) => ORGANIZATION_WORDS.has(word)),
          `"${first}" reads as an organisation: register it in ORGANIZATION_CHIP_NAMES`,
        ).toBe(true);
        expect(first.endsWith(name), `"${name}" is the surname of "${first}"`).toBe(true);
      }
      // No chip prints a trailing fragment of an organisation name.
      expect(ORGANIZATION_WORDS.has(name), `${citation.id}: "${label}"`).toBe(false);
    },
  );

  it('citationMeta lists authors, venue, and year', () => {
    const zhao = getCitation('act-aloha-2023');
    const meta = citationMeta(zhao!);
    expect(meta).toContain('Tony Z. Zhao');
    expect(meta).toContain('2023');
  });

  it('citationMeta truncates long author lists with et al.', () => {
    const meta = citationMeta({
      id: 'x',
      title: 't',
      authors: ['A One', 'B Two', 'C Three', 'D Four', 'E Five'],
      year: 2024,
      url: 'https://example.com',
      type: 'paper',
    });
    expect(meta).toContain('et al.');
    expect(meta).not.toContain('E Five');
  });

  it('citationMeta renders the year once when the venue already states it', () => {
    // act-aloha-2023: venue "RSS 2023", year 2023. The meta line must read
    // "..., RSS 2023." rather than "..., RSS 2023, 2023.".
    const zhao = getCitation('act-aloha-2023');
    expect(zhao).toBeDefined();
    const meta = citationMeta(zhao!);
    expect(meta).toContain('RSS 2023');
    expect(meta.match(/2023/g)).toHaveLength(1);
  });

  it('citationMeta keeps both years when the venue year differs from the entry year', () => {
    // A paper published at a later venue ("RSS 2025" with year 2024)
    // renders both years: dropping the entry year would lose information.
    const meta = citationMeta({
      id: 'x',
      title: 't',
      authors: ['A One'],
      year: 2024,
      venue: 'RSS 2025',
      url: 'https://example.com',
      type: 'paper',
    });
    expect(meta).toBe('A One, RSS 2025, 2024');
  });

  it('citationMeta keeps the trailing year when the venue has none', () => {
    const meta = citationMeta({
      id: 'x',
      title: 't',
      authors: ['A One'],
      year: 2024,
      venue: 'Science Robotics',
      url: 'https://example.com',
      type: 'paper',
    });
    expect(meta).toBe('A One, Science Robotics, 2024');
  });
});
