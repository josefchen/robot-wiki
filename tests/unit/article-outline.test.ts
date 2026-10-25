import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { articleOutline, headingText } from '@/lib/article-outline';
import { moduleBody } from '@/lib/references';

describe('article outline heading text', () => {
  it('turns an escaped dollar into a dollar, not the edge of a math span', () => {
    expect(headingText('Arms, from \\$122 to \\$70,000')).toBe('Arms, from $122 to $70,000');
    expect(articleOutline('## Arms, from \\$122 to \\$70,000')).toEqual([
      { id: 'arms-from-122-to-70000', text: 'Arms, from $122 to $70,000' },
    ]);
  });

  it('keeps every other escaped character literal and out of emphasis', () => {
    expect(headingText('Optimality: RRT\\*')).toBe('Optimality: RRT*');
    expect(headingText('\\*not emphasis\\* and \\_nor this\\_')).toBe('*not emphasis* and _nor this_');
    expect(headingText('A \\# and a \\\\ and \\[brackets\\]')).toBe('A # and a \\ and [brackets]');
  });

  it('still reduces math, emphasis, code and links', () => {
    expect(headingText('Where $T_a$ meets **bold**, `code` and [a link](/x/)')).toBe('Where T_a meets bold, code and a link');
  });

  it('leaves no backslash in any article heading on the contents rail', () => {
    const contentDir = join(process.cwd(), 'content');
    const headings = readdirSync(contentDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((dir) => readdirSync(join(contentDir, dir.name))
        .filter((file) => file.endsWith('.mdx'))
        .flatMap((file) => articleOutline(moduleBody(readFileSync(join(contentDir, dir.name, file), 'utf8')))
          .map((item) => `${dir.name}/${file}: ${item.text}`)));
    expect(headings.length).toBeGreaterThan(100);
    expect(headings.filter((line) => line.includes('\\'))).toEqual([]);
    expect(headings).toContain('data-hardware/hardware-taxonomy.mdx: Arms, from $122 to $70,000');
  });
});
