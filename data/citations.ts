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
    id: 'consistency-policy-2024',
    title:
      'Consistency Policy: Accelerated Visuomotor Policies via Consistency Distillation',
    authors: [
      'Aaditya Prasad',
      'Kevin Lin',
      'Jimmy Wu',
      'Linqi Zhou',
      'Jeannette Bohg',
    ],
    year: 2024,
    arxiv: '2405.07503',
    url: 'https://arxiv.org/abs/2405.07503',
    type: 'paper',
  },
  {
    id: 'one-step-diffusion-2024',
    title:
      'One-Step Diffusion Policy: Fast Visuomotor Policies via Diffusion Distillation',
    authors: [
      'Zhendong Wang',
      'Zhaoshuo Li',
      'Ajay Mandlekar',
      'Zhenjia Xu',
      'Jiaojiao Fan',
      'Yashraj Narang',
      'Linxi Fan',
      'Yuke Zhu',
      'Yogesh Balaji',
      'Mingyuan Zhou',
      'Ming-Yu Liu',
      'Yu Zeng',
    ],
    year: 2024,
    arxiv: '2410.21257',
    url: 'https://arxiv.org/abs/2410.21257',
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
    id: 'rt1-2022',
    title: 'RT-1: Robotics Transformer for Real-World Control at Scale',
    authors: ['Anthony Brohan', 'Noah Brown', 'Justice Carbajal'],
    year: 2022,
    arxiv: '2212.06817',
    url: 'https://arxiv.org/abs/2212.06817',
    type: 'paper',
  },
  {
    id: 'rt2-2023',
    title:
      'RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control',
    authors: ['Anthony Brohan', 'Noah Brown', 'Justice Carbajal'],
    year: 2023,
    arxiv: '2307.15818',
    url: 'https://arxiv.org/abs/2307.15818',
    type: 'paper',
  },
  {
    id: 'open-x-embodiment-2023',
    title:
      'Open X-Embodiment: Robotic Learning Datasets and RT-X Models',
    authors: ['Open X-Embodiment Collaboration'],
    year: 2023,
    arxiv: '2310.08864',
    url: 'https://arxiv.org/abs/2310.08864',
    type: 'paper',
  },
  {
    id: 'octo-2024',
    title: 'Octo: An Open-Source Generalist Robot Policy',
    authors: [
      'Dibya Ghosh',
      'Homer Walke',
      'Karl Pertsch',
      'Kevin Black',
      'Oier Mees',
    ],
    year: 2024,
    arxiv: '2405.12213',
    url: 'https://arxiv.org/abs/2405.12213',
    type: 'paper',
  },
  {
    id: 'openvla-2024',
    title: 'OpenVLA: An Open-Source Vision-Language-Action Model',
    authors: [
      'Moo Jin Kim',
      'Karl Pertsch',
      'Siddharth Karamcheti',
      'Ted Xiao',
    ],
    year: 2024,
    arxiv: '2406.09246',
    url: 'https://arxiv.org/abs/2406.09246',
    type: 'paper',
  },
  {
    id: 'openvla-oft-2025',
    title:
      'Fine-Tuning Vision-Language-Action Models: Optimizing Speed and Success',
    authors: ['Moo Jin Kim', 'Chelsea Finn', 'Percy Liang'],
    year: 2025,
    arxiv: '2502.19645',
    url: 'https://arxiv.org/abs/2502.19645',
    type: 'paper',
  },
  {
    id: 'knowledge-insulation-2025',
    title: 'Knowledge Insulation',
    authors: ['Physical Intelligence'],
    year: 2025,
    url: 'https://www.pi.website/research/knowledge_insulation',
    type: 'blog',
  },
  {
    id: 'pi0-fast-2025',
    title:
      'FAST: Efficient Action Tokenization for Vision-Language-Action Models',
    authors: [
      'Karl Pertsch',
      'Kyle Stachowicz',
      'Brian Ichter',
      'Danny Driess',
      'Suraj Nair',
      'Quan Vuong',
      'Oier Mees',
      'Chelsea Finn',
      'Sergey Levine',
    ],
    year: 2025,
    venue: 'RSS 2025',
    arxiv: '2501.09747',
    url: 'https://arxiv.org/abs/2501.09747',
    type: 'paper',
  },
  {
    id: 'pi05-2025',
    title:
      'π0.5: a Vision-Language-Action Model with Open-World Generalization',
    authors: [
      'Kevin Black',
      'Noah Brown',
      'James Darpinian',
      'Karan Dhabalia',
      'Danny Driess',
      'Adnan Esmail',
      'Michael Equi',
      'Chelsea Finn',
      'Niccolo Fusai',
      'Manuel Y. Galliker',
      'Dibya Ghosh',
      'Lachy Groom',
      'Karol Hausman',
      'Brian Ichter',
      'Szymon Jakubczak',
      'Tim Jones',
      'Liyiming Ke',
      'Devin LeBlanc',
      'Sergey Levine',
      'Adrian Li-Bell',
      'Mohith Mothukuri',
      'Suraj Nair',
      'Karl Pertsch',
      'Allen Z. Ren',
      'Lucy Xiaoyang Shi',
      'Laura Smith',
      'Jost Tobias Springenberg',
      'Kyle Stachowicz',
      'James Tanner',
      'Quan Vuong',
      'Homer Walke',
      'Anna Walling',
      'Haohuan Wang',
      'Lili Yu',
      'Ury Zhilinsky',
    ],
    year: 2025,
    venue: 'CoRL 2025',
    arxiv: '2504.16054',
    url: 'https://arxiv.org/abs/2504.16054',
    type: 'paper',
  },
  {
    id: 'knowledge-insulation-paper-2025',
    title:
      'Knowledge Insulating Vision-Language-Action Models: Train Fast, Run Fast, Generalize Better',
    authors: [
      'Danny Driess',
      'Jost Tobias Springenberg',
      'Brian Ichter',
      'Lili Yu',
      'Adrian Li-Bell',
      'Karl Pertsch',
      'Allen Z. Ren',
      'Homer Walke',
      'Quan Vuong',
      'Lucy Xiaoyang Shi',
      'Sergey Levine',
    ],
    year: 2025,
    venue: 'NeurIPS 2025',
    arxiv: '2505.23705',
    url: 'https://arxiv.org/abs/2505.23705',
    type: 'paper',
  },
  {
    // Closed model; the dated model-card PDF is the primary source (no arXiv).
    id: 'pi06-model-card-2025',
    title: 'π0.6 Model Card',
    authors: ['Physical Intelligence'],
    year: 2025,
    url: 'https://website.pi-asset.com/pi06star/PI06_model_card.pdf',
    type: 'docs',
  },
  {
    // Lab PDF report; no arXiv id exists for this paper.
    id: 'pistar06-2025',
    title: 'π*0.6: a VLA that Learns from Experience',
    authors: ['Physical Intelligence'],
    year: 2025,
    url: 'https://www.pi.website/download/pistar06.pdf',
    type: 'docs',
  },
  {
    // MEM lab PDF; no arXiv id as of 2026-08.
    id: 'mem-2026',
    title: 'VLAs with Long and Short-Term Memory',
    authors: [
      'Marcel Torne',
      'Karl Pertsch',
      'Homer Walke',
      'Kyle Vedder',
      'Suraj Nair',
      'Brian Ichter',
      'Allen Ren',
      'Haohuan Wang',
      'Jiaming Tang',
      'Kyle Stachowicz',
      'Karan Dhabalia',
      'Michael Equi',
      'Quan Vuong',
      'Jost Tobias Springenberg',
      'Sergey Levine',
      'Chelsea Finn',
      'Danny Driess',
    ],
    year: 2026,
    url: 'https://www.pi.website/download/Mem.pdf',
    type: 'docs',
  },
  {
    // ~80-author lab PDF; no arXiv id as of 2026-08.
    id: 'pi07-2026',
    title: 'π0.7: a Steerable Model with Emergent Capabilities',
    authors: ['Physical Intelligence'],
    year: 2026,
    url: 'https://www.pi.website/download/pi07.pdf',
    type: 'docs',
  },
  {
    id: 'openpi-repo-2024',
    title: 'openpi',
    authors: ['Physical Intelligence'],
    year: 2024,
    url: 'https://github.com/Physical-Intelligence/openpi',
    type: 'docs',
  },
  {
    id: 'oxe-quality-critique-2026',
    title: 'State of VLA Research at ICLR 2026',
    authors: ['Moritz Reuss'],
    year: 2025,
    url: 'https://mbreuss.github.io/blog_post_iclr_26_vla.html',
    type: 'blog',
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
  {
    id: 'gemini-robotics-2025',
    title: 'Gemini Robotics: Bringing AI into the Physical World',
    authors: ['Gemini Robotics Team', 'Google DeepMind'],
    year: 2025,
    arxiv: '2503.20020',
    url: 'https://arxiv.org/abs/2503.20020',
    type: 'paper',
  },
  {
    id: 'gemini-robotics-15-2025',
    title:
      'Gemini Robotics 1.5: Pushing the Frontier of Generalist Robots with Advanced Embodied Reasoning, Thinking, and Motion Transfer',
    authors: ['Gemini Robotics Team', 'Google DeepMind'],
    year: 2025,
    arxiv: '2510.03342',
    url: 'https://arxiv.org/abs/2510.03342',
    type: 'paper',
  },
  {
    id: 'gemini-robotics-2-2026',
    title: 'Gemini Robotics 2 brings whole body intelligence to robots',
    authors: ['Carolina Parada', 'Google DeepMind'],
    year: 2026,
    url: 'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
    type: 'blog',
  },
  {
    id: 'gr00t-n1-2025',
    title:
      'GR00T N1: An Open Foundation Model for Generalist Humanoid Robots',
    authors: ['Johan Bjorck', 'Yuke Zhu', 'NVIDIA'],
    year: 2025,
    arxiv: '2503.14734',
    url: 'https://arxiv.org/abs/2503.14734',
    type: 'paper',
  },
  {
    id: 'isaac-gr00t-repo-2026',
    title: 'Isaac GR00T (N1.7 release notes and code)',
    authors: ['NVIDIA'],
    year: 2026,
    url: 'https://github.com/NVIDIA/Isaac-GR00T',
    type: 'docs',
  },
  {
    id: 'helix-2025',
    title: 'Helix (System 1 / System 2 humanoid VLA announcement)',
    authors: ['Figure AI'],
    year: 2025,
    url: 'https://www.figure.ai/news/helix',
    type: 'blog',
  },
  {
    id: 'helix-02-2026',
    title: 'Introducing Helix 02: Full-Body Autonomy',
    authors: ['Figure AI'],
    year: 2026,
    url: 'https://www.figure.ai/news/helix-02',
    type: 'blog',
  },
  {
    id: 'agibot-world-2025',
    title:
      'AgiBot World Colosseo: A Large-scale Manipulation Platform for Scalable and Intelligent Embodied Systems',
    authors: ['AgiBot Research'],
    year: 2025,
    arxiv: '2503.06669',
    url: 'https://arxiv.org/abs/2503.06669',
    type: 'paper',
  },
  {
    id: 'agibot-go2-2026',
    title: 'AgiBot GO-2 announcement',
    authors: ['AgiBot'],
    year: 2026,
    url: 'https://www.agibot.com/article/231/detail/56.html',
    type: 'press',
  },
  {
    id: 'agibot-go2-robotreport-2026',
    title: 'AgiBot releases GO-2 foundation model for embodied AI',
    authors: ['The Robot Report'],
    year: 2026,
    url: 'https://www.therobotreport.com/agibot-releases-go-2-foundation-model-embodied-ai/',
    type: 'press',
  },
  {
    id: 'skild-series-c-2026',
    title: 'Skild AI Series C announcement',
    authors: ['Skild AI'],
    year: 2026,
    url: 'https://www.skild.ai/blogs/series-c',
    type: 'press',
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
  'Collaboration',
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
