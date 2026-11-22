import { describe, expect, it } from 'vitest';
import { arxivPaper } from '@/lib/arxiv-search';
import { GET } from '@/app/paper-citations.json/route';
import type { PaperCitations } from '@/lib/arxiv-search';

describe('exact paper identifiers', () => {
  it.each([
    ['2304.13705', '2304.13705', ''],
    ['  arXiv: 2304.13705v3  ', '2304.13705', 'v3'],
    ['http://www.arxiv.org/abs/0704.0001', '0704.0001', ''],
    ['https://arxiv.org/html/2403.12945v1#S3', '2403.12945', 'v1'],
    ['https://arxiv.org/pdf/2111.08933v2.pdf#page=2', '2111.08933', 'v2'],
    ['https://arxiv.org/pdf/2603.04356?download=1', '2603.04356', ''],
  ])('reads %s', (query, id, version) => {
    expect(arxivPaper(query)).toEqual({ id, version });
  });

  it.each([
    'What is 2304.13705?', 'Action Chunking', '2304.13705v0', '2313.00001',
    '2304.13705 extra', '2304.137050', 'https://example.com/abs/2304.13705',
    'https://arxiv.org.example.com/abs/2304.13705', 'https://arxiv.org@elsewhere.com/pdf/2304.13705',
    'https://arxiv.org/search/2304.13705', 'https://arxiv.org/abs/2304.13705.pdf',
    'https://arxiv.org/abs/2304.13705/notes', 'https://arxiv.org/abs/2304.13705#section another word',
  ])('leaves %s to ordinary search', (query) => {
    expect(arxivPaper(query)).toBeUndefined();
  });

  it('resolves unique citing pages in a stable order and retains the registered paper title', async () => {
    const index: PaperCitations = await GET().json();
    const { papers } = index;
    expect(await GET().json()).toEqual(index);
    for (const [id, path] of [
      ['2304.13705', '/manipulation/action-chunking/#ref-act-aloha-2023'],
      ['2603.04356', '/world-models/generative-sim/#ref-robocasa365-2026'],
      ['2111.08933', '/classical/kinematics/#ref-ikflow-2021'],
      ['2403.12945', '/data-hardware/datasets/#ref-droid-2024'],
    ]) {
      const [article, ref] = path.split('#ref-');
      expect(papers[id].citations).toContainEqual(expect.objectContaining({ article, ref }));
      expect(index.articles[article].summary).not.toBe('');
    }
    expect(papers['2304.13705'].citations.length).toBeGreaterThan(1);
    for (const { citations } of Object.values(papers)) {
      const pages = citations.map(({ article }) => article);
      expect(new Set(pages).size).toBe(pages.length);
    }
    expect(papers['2403.99999']).toBeUndefined();
  });
});
