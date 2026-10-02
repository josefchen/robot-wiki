import { readFileSync } from 'node:fs';
import { evaluate } from '@mdx-js/mdx';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as runtime from 'react/jsx-runtime';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '@/data/glossary';
import rehypeGlossaryLinks, { glossaryNames } from '@/lib/rehype-glossary-links.mjs';

const terms = GLOSSARY.map(({ id, term }) => ({ id, term }));

async function html(source: string): Promise<string> {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: false }], [rehypeGlossaryLinks, { terms }]],
  });
  return renderToStaticMarkup(
    createElement(Content, {
      components: {
        Term: ({ id, children }: { id: string; children?: ReactNode }) =>
          createElement('span', { 'data-term-id': id }, children),
        Cite: ({ id }: { id: string }) => createElement('cite', null, id),
      },
    }),
  );
}

const links = (markup: string) =>
  [...markup.matchAll(/<a href="\/glossary\/#([^"]+)" data-glossary-term="\1">([^<]+)<\/a>/g)].map(
    ([, id, text]) => `${id}:${text}`,
  );

describe('rehype-glossary-links', () => {
  it('links the first prose mention of each term, and only the first', async () => {
    const markup = await html('Behavior cloning fits a policy. Behavior cloning compounds error.\n\n- A world model predicts.\n- World models dream.');
    expect(links(markup)).toEqual(['behavior-cloning:Behavior cloning', 'world-model:world model']);
  });

  it('links several first mentions in one sentence, in reading order', async () => {
    expect(links(await html('Teleoperation feeds imitation learning and DAgger.'))).toEqual([
      'teleoperation:Teleoperation', 'imitation-learning:imitation learning', 'dagger:DAgger',
    ]);
  });

  it('skips headings, quoted titles, code, math, tables and captions', async () => {
    const markup = await html([
      '## Behavior cloning',
      '',
      '| Term |\n| --- |\n| PPO |',
      '',
      '“Behavior Cloning from Observation” used `PPO` and $PPO$.',
      '',
      'Behavior cloning then met PPO.',
    ].join('\n'));
    expect(links(markup)).toEqual(['behavior-cloning:Behavior cloning', 'ppo:PPO']);
    expect(markup).toContain('<h2>Behavior cloning</h2>');
  });

  it('counts an authored Term as the first mention and adds nothing for it', async () => {
    const markup = await html('A <Term id="dagger">DAgger</Term> loop. DAgger again.');
    expect(links(markup)).toEqual([]);
    expect(markup).toContain('<span data-term-id="dagger">DAgger</span>');
  });

  it('links a plain mention that comes before the authored Term', async () => {
    const markup = await html('DAgger first. Later a <Term id="dagger">DAgger</Term> trigger.');
    expect(links(markup)).toEqual(['dagger:DAgger']);
  });

  it('leaves a mention inside another link alone and links the next one', async () => {
    const markup = await html('[behavior cloning](/manipulation/bc-foundations/) and then behavior cloning.');
    expect(links(markup)).toEqual(['behavior-cloning:behavior cloning']);
    expect(markup).toContain('<a href="/manipulation/bc-foundations/">behavior cloning</a>');
  });

  it('matches plurals and hyphenated forms, and capital-only names only in capitals', async () => {
    expect(links(await html('Two end-effectors and point clouds.'))).toEqual([
      'end-effector:end-effectors', 'point-cloud:point clouds',
    ]);
    expect(links(await html('An odd result inside the ODD.'))).toEqual(['operational-design-domain:ODD']);
  });

  it('reads abbreviated names as the full name, the name before the parenthesis and the abbreviation', () => {
    expect(glossaryNames('operational design domain (ODD)')).toEqual([
      'operational design domain (ODD)', 'operational design domain', 'ODD',
    ]);
  });

  it('is wired into the MDX pipeline with the whole glossary registry', () => {
    const config = readFileSync('next.config.ts', 'utf8');
    expect(config).toContain("path.join(process.cwd(), 'lib/rehype-glossary-links.mjs')");
    expect(config).toContain('{ terms: GLOSSARY.map(({ id, term }) => ({ id, term })) }');
  });
});
