export interface TableComparison {
  row: string;
  column: string;
  sources: ReadonlyArray<{ tag: string; label: string; citation: string }>;
}

const questions: ReadonlyArray<{ label: string; href: string; comparison?: TableComparison }> = [
  {
    label: 'Why do Mars rovers drive themselves?',
    href: '/adjacent/space/#light-delay-makes-rovers-drive-themselves',
  },
  {
    label: 'How do humanoids use whole-body skills learned in simulation?',
    href: '/rl-sim2real/humanoid-wbc/#trackers-reached-real-humanoids-in-2024',
  },
  {
    label: 'Which paper should I cite for OpenVLA?',
    href: '/manipulation/vla-models/#ref-openvla-2024',
  },
  {
    label: 'Did robots do better when PACE varied the number of moves between plans?',
    href: '/manipulation/action-chunking/#chunk-size-trades-error-against-reaction-time',
  },
  {
    label: 'What do System 1 and System 2 do in a humanoid robot?',
    href: '/manipulation/hierarchical/#two-speeds-in-one-system',
  },
  {
    label: 'What did the original GELLO controllers cost in parts?',
    href: '/data-hardware/teleop-rigs/#gello-copies-the-arm-in-printed-parts',
  },
  {
    label: 'How far can robot arms reach, and how precisely can they return to the same spot?',
    href: '/data-hardware/research-arms-compared/#mechanics',
    comparison: {
      row: 'WidowX AI',
      column: 'Reach',
      sources: [
        { tag: 'store', label: 'store', citation: 'trossen-widowx-ai-2026' },
        { tag: 'docs', label: 'specifications', citation: 'trossen-wxai-docs-2026' },
      ],
    },
  },
];

export const ARTICLE_QUESTIONS_HEADING = 'Questions answered in the articles';

export function questionsForArticles(articles: readonly { domain: string; slug: string }[]) {
  const paths = new Set(articles.map(({ domain, slug }) => `/${domain}/${slug}/`));
  return questions.filter(({ href }) => paths.has(href.split('#')[0]));
}
