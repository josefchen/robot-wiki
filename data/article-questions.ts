const questions = [
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
];

export const ARTICLE_QUESTIONS_HEADING = 'Questions answered in the articles';

export function questionsForArticles(articles: readonly { domain: string; slug: string }[]) {
  const paths = new Set(articles.map(({ domain, slug }) => `/${domain}/${slug}/`));
  return questions.filter(({ href }) => paths.has(href.split('#')[0]));
}
