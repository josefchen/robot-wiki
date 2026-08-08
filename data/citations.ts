/**
 * Citation registry: the single source of truth for sources.
 *
 * MDX content cites these via <Cite id="..."/>; scripts/validate-content.ts
 * fails the build if a module references an id that is not registered here.
 * Add entries from the /research reports only; never invent arXiv ids, urls,
 * or author lists.
 *
 * Type-only relative import so this file loads under plain node, Vitest, and
 * Next.js alike.
 */
import type { Citation } from './schemas/citation.ts';

export type { Citation } from './schemas/citation.ts';

export const CITATIONS: Citation[] = [
  {
    id: 'alvinn-1988',
    title: 'ALVINN: An Autonomous Land Vehicle in a Neural Network',
    authors: ['Dean A. Pomerleau'],
    year: 1988,
    venue: 'NeurIPS 1988',
    url: 'https://papers.nips.cc/paper/95-alvinn-an-autonomous-land-vehicle-in-a-neural-network',
    type: 'paper',
  },
  {
    id: 'dagger-2011',
    title:
      'A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning',
    authors: ['Stéphane Ross', 'Geoffrey J. Gordon', 'J. Andrew Bagnell'],
    year: 2011,
    venue: 'AISTATS 2011',
    arxiv: '1011.0686',
    url: 'https://arxiv.org/abs/1011.0686',
    type: 'paper',
  },
  {
    id: 'act-aloha-2023',
    title:
      'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
    authors: ['Tony Z. Zhao', 'Vikash Kumar', 'Sergey Levine', 'Chelsea Finn'],
    year: 2023,
    venue: 'RSS 2023',
    arxiv: '2304.13705',
    url: 'https://arxiv.org/abs/2304.13705',
    type: 'paper',
  },
  {
    id: 'mobile-aloha-2024',
    title:
      'Mobile ALOHA: Learning Bimanual Mobile Manipulation with Low-Cost Whole-Body Teleoperation',
    authors: ['Zipeng Fu', 'Tony Z. Zhao', 'Chelsea Finn'],
    year: 2024,
    arxiv: '2401.02117',
    url: 'https://arxiv.org/abs/2401.02117',
    type: 'paper',
  },
  {
    id: 'diffusion-policy-2023',
    title: 'Diffusion Policy: Visuomotor Policy Learning via Action Diffusion',
    authors: [
      'Cheng Chi',
      'Zhenjia Xu',
      'Siyuan Feng',
      'Eric Cousineau',
      'Yilun Du',
      'Benjamin Burchfiel',
      'Russ Tedrake',
      'Shuran Song',
    ],
    year: 2023,
    venue: 'RSS 2023',
    arxiv: '2303.04137',
    url: 'https://arxiv.org/abs/2303.04137',
    type: 'paper',
  },
  {
    id: 'pi0-2024',
    title: 'π0: A Vision-Language-Action Flow Model for General Robot Control',
    authors: [
      'Kevin Black',
      'Noah Brown',
      'Danny Driess',
      'Adnan Esmail',
      'Michael Equi',
      'Chelsea Finn',
      'Niccolo Fusai',
      'Lachy Groom',
      'Karol Hausman',
      'Brian Ichter',
      'Szymon Jakubczak',
      'Tim Jones',
      'Liyiming Ke',
      'Sergey Levine',
      'Adrian Li-Bell',
      'Mohith Mothukuri',
      'Suraj Nair',
      'Karl Pertsch',
      'Lucy Xiaoyang Shi',
      'James Tanner',
      'Quan Vuong',
      'Anna Walling',
      'Haohuan Wang',
      'Ury Zhilinsky',
    ],
    year: 2024,
    venue: 'RSS 2025',
    arxiv: '2410.24164',
    url: 'https://arxiv.org/abs/2410.24164',
    type: 'paper',
  },
  {
    id: 'real-time-chunking-2025',
    title: 'Real-Time Execution of Action Chunking Flow Policies',
    authors: ['Kevin Black', 'Manuel Y. Galliker', 'Sergey Levine'],
    year: 2025,
    arxiv: '2506.07339',
    url: 'https://arxiv.org/abs/2506.07339',
    type: 'paper',
  },
  {
    id: 'hg-dagger-2019',
    title: 'HG-DAgger: Interactive Imitation Learning with Human Experts',
    authors: [
      'Michael Kelly',
      'Chelsea Sidrane',
      'Katherine Driggs-Campbell',
      'Mykel J. Kochenderfer',
    ],
    year: 2019,
    venue: 'ICRA 2019',
    arxiv: '1810.02890',
    url: 'https://arxiv.org/abs/1810.02890',
    type: 'paper',
  },
  {
    id: 'pistar06-blog-2025',
    title: 'π*0.6: a VLA that Learns from Experience',
    authors: ['Physical Intelligence'],
    year: 2025,
    url: 'https://www.pi.website/blog/pistar06',
    type: 'blog',
  },
  {
    id: 'pi-real-time-chunking-blog-2025',
    title: 'Real-Time Chunking',
    authors: ['Physical Intelligence'],
    year: 2025,
    url: 'https://www.pi.website/research/real_time_chunking',
    type: 'blog',
  },
];

const BY_ID = new Map(CITATIONS.map((c) => [c.id, c]));

export function getCitation(id: string): Citation | undefined {
  return BY_ID.get(id);
}

/**
 * Inline chip label, e.g. "Zhao 2023". Organization authors
 * ("Physical Intelligence") keep their full name instead of a surname.
 */
const ORG_TOKENS = new Set([
  'Team',
  'Labs',
  'Intelligence',
  'Research',
  'Robotics',
  'Technologies',
  'AI',
  'DeepMind',
  'Google',
  'NVIDIA',
  'Meta',
  'Toyota',
  'Figure',
]);

export function citationLabel(citation: Citation): string {
  const firstAuthor = citation.authors[0];
  const tokens = firstAuthor.split(' ');
  const surname = tokens.at(-1) ?? firstAuthor;
  const looksLikeOrg = tokens.length > 1 && ORG_TOKENS.has(surname);
  return `${looksLikeOrg ? firstAuthor : surname} ${citation.year}`;
}

/** Tooltip metadata line: up to three authors, then venue and year. */
export function citationMeta(citation: Citation): string {
  const shown = citation.authors.slice(0, 3);
  const suffix = citation.authors.length > 3 ? ' et al.' : '';
  const where = citation.venue ? `, ${citation.venue}` : '';
  return `${shown.join(', ')}${suffix}${where}, ${citation.year}`;
}
