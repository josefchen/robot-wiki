export interface TableComparison {
  row: string;
  column: string;
  sources: ReadonlyArray<{ tag: string; label: string; citation: string }>;
}

export interface QuestionSource {
  label: string;
  url: string;
}

interface ArticleQuestion {
  label: string;
  href: string;
  searchPhrases?: readonly string[];
  citations?: readonly string[];
  comparison?: TableComparison;
  source?: QuestionSource;
  related?: (query: string) => boolean;
}

/** A question about the speed of seeing and acting needs both parts. A camera's
 * refresh rate or a model name alone does not identify this comparison. */
function asksAboutControlRates(query: string) {
  const model = /\bgr00t[ -]n1\b(?![.\d])/.test(query);
  if (/\bgr00t\b/.test(query) && !model) return false;
  const observation = /\b(camera|frames?|images?|observations?)\b/.test(query);
  const visionModel = /\b(?:vision(?:[ -]language)?|visual|vlm)\b/.test(query);
  const motion = /\b(act(?:ion)?s?|acting|motor|mov(?:e|es|ing|ement|ements)|commands?|control(?:ler)?)\b/.test(query);
  const rateQuestion = /\b(?:rate|rates|often|fast|faster|slow|slower|frequency|frequencies|every|each)\b/.test(query);
  const robotPlanner = /\b(?:robot|arm|gripper)\b/.test(query)
    && /\b(?:vision[ -]language model|vlm|planner|planning model)\b/.test(query)
    && /\b(?:fast|slow)(?:er)?\b/.test(query);
  return motion && rateQuestion && ((model && (visionModel || observation)) || (robotPlanner && observation));
}

const questions: readonly ArticleQuestion[] = [
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
    searchPhrases: ['System 1 System 2', 'System 1 and System 2 robotics'],
    related: asksAboutControlRates,
    source: {
      label: 'NVIDIA’s SO-100 control loop',
      url: 'https://github.com/NVIDIA/Isaac-GR00T/blob/1184da1013ceb359f8b0e1801280ae12347396df/getting_started/examples/eval_gr00t_so100.py#L235-L303',
    },
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
        { tag: 'store', label: 'Store page', citation: 'trossen-widowx-ai-2026' },
        { tag: 'docs', label: 'Technical specifications', citation: 'trossen-wxai-docs-2026' },
      ],
    },
  },
  {
    label: 'Did knowledge insulation cut the training steps needed to clear a table?',
    href: '/manipulation/knowledge-insulation/#insulation-trains-faster',
  },
  {
    label: 'Can a world model predict which robot policy will work best on a real robot?',
    href: '/world-models/evaluation/#level-4-the-best-simulators-order-policies-as-real-trials-do',
  },
  {
    label: 'Can a robot reach the same cup with its elbow up or down?',
    href: '/classical/kinematics/#inverse-kinematics-has-many-answers-or-none',
    searchPhrases: [
      'Two elbow poses reach the same cup',
      'Two elbow poses reach the same cup. Does one local joint-speed calculation tell me all the poses?',
      'Can the gripper reach the same cup with the elbow bent the other way?',
    ],
    citations: ['modern-robotics-2017'],
  },
  {
    label: 'What share of a robot dataset sale does the seller receive?',
    href: '/data-hardware/data-market/#selling-robot-data',
    citations: ['roboticscenter-seller-terms', 'ay-robots-dataset-marketplace'],
  },
];

export const ARTICLE_QUESTIONS_HEADING = 'Questions answered in the articles';

export function questionsForArticles(articles: readonly { domain: string; slug: string }[]) {
  const paths = new Set(articles.map(({ domain, slug }) => `/${domain}/${slug}/`));
  return questions.filter(({ href }) => paths.has(href.split('#')[0]));
}

/** Only exact, reviewed phrasings can override ordinary page search. */
export function exactSearchQuestion(query: string) {
  const normalize = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.join(' ');
  const phrase = normalize(query);
  return phrase && questions.find(({label, searchPhrases}) =>
    searchPhrases && [label, ...searchPhrases].some(text => normalize(text) === phrase)
  );
}

/** Supplemental reading when a complete question has no ordinary page match. */
export function relatedSearchQuestion(query: string) {
  const text = query.toLowerCase().replace(/[\u2010-\u2015]/g, '-');
  return questions.find(question => question.related?.(text));
}
