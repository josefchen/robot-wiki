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
    url: 'https://proceedings.neurips.cc/paper/1988/hash/812b4ba287f5ee0bc9d43bbf5bbe87fb-Abstract.html',
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
    id: 'training-time-rtc-2025',
    title: 'Training-Time Action Conditioning for Efficient Real-Time Chunking',
    authors: ['Physical Intelligence'],
    year: 2025,
    arxiv: '2512.05964',
    url: 'https://arxiv.org/abs/2512.05964',
    type: 'paper',
  },
  {
    id: 'vla-perf-2026',
    title:
      'VLA-Perf: Systematic Latency Analysis of Vision-Language-Action Models on Edge and Cloud Hardware',
    authors: ['NVIDIA Research'],
    year: 2026,
    arxiv: '2602.18397',
    url: 'https://arxiv.org/abs/2602.18397',
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
    id: 'saycan-2022',
    title:
      'Do As I Can, Not As I Say: Grounding Language in Robotic Affordances',
    authors: [
      'Michael Ahn',
      'Anthony Brohan',
      'Noah Brown',
      'Yevgen Chebotar',
      'Omar Cortes',
      'Byron David',
      'Chelsea Finn',
      'Chuyuan Fu',
      'Keerthana Gopalakrishnan',
      'Karol Hausman',
      'Alex Herzog',
      'Daniel Ho',
      'Jasmine Hsu',
      'Julian Ibarz',
      'Brian Ichter',
      'Alex Irpan',
      'Eric Jang',
      'Rosario Jauregui Ruano',
      'Kyle Jeffrey',
      'Sally Jesmonth',
      'Nikhil J Joshi',
      'Ryan Julian',
      'Dmitry Kalashnikov',
      'Yuheng Kuang',
      'Kuang-Huei Lee',
      'Sergey Levine',
      'Yao Lu',
      'Linda Luu',
      'Carolina Parada',
      'Peter Pastor',
      'Jornell Quiambao',
      'Kanishka Rao',
      'Jarek Rettinghouse',
      'Diego Reyes',
      'Pierre Sermanet',
      'Nicolas Sievers',
      'Clayton Tan',
      'Alexander Toshev',
      'Vincent Vanhoucke',
      'Fei Xia',
      'Ted Xiao',
      'Peng Xu',
      'Sichun Xu',
      'Mengyuan Yan',
      'Andy Zeng',
    ],
    year: 2022,
    arxiv: '2204.01691',
    url: 'https://arxiv.org/abs/2204.01691',
    type: 'paper',
  },
  {
    id: 'code-as-policies-2022',
    title: 'Code as Policies: Language Model Programs for Embodied Control',
    authors: [
      'Jacky Liang',
      'Wenlong Huang',
      'Fei Xia',
      'Peng Xu',
      'Karol Hausman',
      'Brian Ichter',
      'Pete Florence',
      'Andy Zeng',
    ],
    year: 2022,
    venue: 'ICRA 2023',
    arxiv: '2209.07753',
    url: 'https://arxiv.org/abs/2209.07753',
    type: 'paper',
  },
  {
    id: 'moka-2024',
    title:
      'MOKA: Open-World Robotic Manipulation through Mark-Based Visual Prompting',
    authors: ['Fangchen Liu', 'Kuan Fang', 'Pieter Abbeel', 'Sergey Levine'],
    year: 2024,
    arxiv: '2403.03174',
    url: 'https://arxiv.org/abs/2403.03174',
    type: 'paper',
  },
  {
    id: 'robopoint-2024',
    title:
      'RoboPoint: A Vision-Language Model for Spatial Affordance Prediction for Robotics',
    authors: [
      'Wentao Yuan',
      'Jiafei Duan',
      'Valts Blukis',
      'Wilbert Pumacay',
      'Ranjay Krishna',
      'Adithyavairavan Murali',
      'Arsalan Mousavian',
      'Dieter Fox',
    ],
    year: 2024,
    arxiv: '2406.10721',
    url: 'https://arxiv.org/abs/2406.10721',
    type: 'paper',
  },
  {
    id: 'rekep-2024',
    title:
      'ReKep: Spatio-Temporal Reasoning of Relational Keypoint Constraints for Robotic Manipulation',
    authors: [
      'Wenlong Huang',
      'Chen Wang',
      'Yunzhu Li',
      'Ruohan Zhang',
      'Li Fei-Fei',
    ],
    year: 2024,
    arxiv: '2409.01652',
    url: 'https://arxiv.org/abs/2409.01652',
    type: 'paper',
  },
  {
    id: 'ecot-2024',
    title: 'Robotic Control via Embodied Chain-of-Thought Reasoning',
    authors: [
      'Michał Zawalski',
      'William Chen',
      'Karl Pertsch',
      'Oier Mees',
      'Chelsea Finn',
      'Sergey Levine',
    ],
    year: 2024,
    venue: 'CoRL 2024',
    arxiv: '2407.08693',
    url: 'https://arxiv.org/abs/2407.08693',
    type: 'paper',
  },
  {
    id: 'hi-robot-2025',
    title:
      'Hi Robot: Open-Ended Instruction Following with Hierarchical Vision-Language-Action Models',
    authors: [
      'Lucy Xiaoyang Shi',
      'Brian Ichter',
      'Michael Equi',
      'Liyiming Ke',
      'Karl Pertsch',
      'Quan Vuong',
      'James Tanner',
      'Anna Walling',
      'Haohuan Wang',
      'Niccolo Fusai',
      'Adrian Li-Bell',
      'Danny Driess',
      'Lachy Groom',
      'Sergey Levine',
      'Chelsea Finn',
    ],
    year: 2025,
    venue: 'ICML 2025',
    arxiv: '2502.19417',
    url: 'https://arxiv.org/abs/2502.19417',
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
    // Lab research page; no arXiv id as of 2026-08.
    id: 'pi-human-to-robot-2025',
    title: 'Emergent Human-to-Robot Transfer (pi.website research note)',
    authors: ['Physical Intelligence'],
    year: 2025,
    url: 'https://www.pi.website/research/human_to_robot',
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
  {
    id: 'dppo-2024',
    title: 'Diffusion Policy Policy Optimization',
    authors: [
      'Allen Z. Ren',
      'Justin Lidard',
      'Lars L. Ankile',
      'Anthony Simeonov',
      'Pulkit Agrawal',
      'Anirudha Majumdar',
      'Benjamin Burchfiel',
      'Hongkai Dai',
      'Max Simchowitz',
    ],
    year: 2024,
    arxiv: '2409.00588',
    url: 'https://arxiv.org/abs/2409.00588',
    type: 'paper',
  },
  {
    id: 'conrft-2025',
    title:
      'ConRFT: A Reinforced Fine-tuning Method for VLA Models via Consistency Policy',
    authors: [
      'Yuhui Chen',
      'Shuai Tian',
      'Shugao Liu',
      'Yingting Zhou',
      'Haoran Li',
      'Dongbin Zhao',
    ],
    year: 2025,
    arxiv: '2502.05450',
    url: 'https://arxiv.org/abs/2502.05450',
    type: 'paper',
  },
  {
    // v3 (2026-01-29) is the version with the full Flow-Noise / Flow-SDE
    // treatment; first submitted October 2025.
    id: 'pi-rl-2026',
    title:
      'π_RL: Online RL Fine-tuning for Flow-based Vision-Language-Action Models',
    authors: [
      'Kang Chen',
      'Zhihao Liu',
      'Tonghe Zhang',
      'Zhen Guo',
      'Si Xu',
      'Hao Lin',
      'Hongzhi Zang',
      'Xiang Li',
      'Quanlu Zhang',
      'Zhaofei Yu',
      'Guoliang Fan',
      'Tiejun Huang',
      'Yu Wang',
      'Chao Yu',
    ],
    year: 2026,
    arxiv: '2510.25889',
    url: 'https://arxiv.org/abs/2510.25889',
    type: 'paper',
  },
  {
    id: 'hil-serl-2024',
    title:
      'Precise and Dexterous Robotic Manipulation via Human-in-the-Loop Reinforcement Learning',
    authors: ['Jianlan Luo', 'Charles Xu', 'Jeffrey Wu', 'Sergey Levine'],
    year: 2024,
    arxiv: '2410.21845',
    url: 'https://arxiv.org/abs/2410.21845',
    type: 'paper',
  },
  {
    id: 'pld-2026',
    title:
      'Self-Improving Vision-Language-Action Models with Data Generation via Residual RL',
    authors: [
      'Wenli Xiao',
      'Haotian Lin',
      'Andy Peng',
      'Haoru Xue',
      'Tairan He',
      'Yuqi Xie',
      'Fengyuan Hu',
      'Jimmy Wu',
      'Zhengyi Luo',
      'Linxi "Jim" Fan',
      'Guanya Shi',
      'Yuke Zhu',
    ],
    year: 2026,
    venue: 'ICLR 2026',
    arxiv: '2511.00091',
    url: 'https://arxiv.org/abs/2511.00091',
    type: 'paper',
  },
  {
    id: 'rldg-2024',
    title:
      'RLDG: Robotic Generalist Policy Distillation via Reinforcement Learning',
    authors: ['Charles Xu', 'Qiyang Li', 'Jianlan Luo', 'Sergey Levine'],
    year: 2024,
    arxiv: '2412.09858',
    url: 'https://arxiv.org/abs/2412.09858',
    type: 'paper',
  },
  {
    id: 'rl-vla-generalization-2025',
    title: 'What Can RL Bring to VLA Generalization? An Empirical Study',
    authors: [
      'Jijia Liu',
      'Feng Gao',
      'Bingwen Wei',
      'Xinlei Chen',
      'Qingmin Liao',
      'Yi Wu',
      'Chao Yu',
      'Yu Wang',
    ],
    year: 2025,
    venue: 'NeurIPS 2025',
    arxiv: '2505.19789',
    url: 'https://arxiv.org/abs/2505.19789',
    type: 'paper',
  },
  {
    id: 'pair-vla-2026',
    title:
      'What to Ignore, What to React: Visually Robust RL Fine-Tuning of VLA Models',
    authors: [
      'Yuanfang Peng',
      'Jingjing Fu',
      'Chuheng Zhang',
      'Li Zhao',
      'Jiang Bian',
      'Mingyu Liu',
      'Ling Zhang',
      'Jun Zhang',
      'Rui Wang',
    ],
    year: 2026,
    arxiv: '2605.13105',
    url: 'https://arxiv.org/abs/2605.13105',
    type: 'paper',
  },
  {
    id: 'rudin-2021',
    title:
      'Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning',
    authors: ['Nikita Rudin', 'David Hoeller', 'Philipp Reist', 'Marco Hutter'],
    year: 2021,
    venue: 'CoRL 2021',
    arxiv: '2109.11978',
    url: 'https://arxiv.org/abs/2109.11978',
    type: 'paper',
  },
  {
    id: 'ppo-2017',
    title: 'Proximal Policy Optimization Algorithms',
    authors: [
      'John Schulman',
      'Filip Wolski',
      'Prafulla Dhariwal',
      'Alec Radford',
      'Oleg Klimov',
    ],
    year: 2017,
    arxiv: '1707.06347',
    url: 'https://arxiv.org/abs/1707.06347',
    type: 'paper',
  },
  {
    id: 'ng-reward-shaping-1999',
    title:
      'Policy Invariance Under Reward Transformations: Theory and Application to Reward Shaping',
    authors: ['Andrew Y. Ng', 'Daishi Harada', 'Stuart Russell'],
    year: 1999,
    venue: 'ICML 1999',
    url: 'https://people.eecs.berkeley.edu/~russell/papers/icml99-shaping.pdf',
    type: 'paper',
  },
  {
    id: 'isaac-gym-2021',
    title:
      'Isaac Gym: High Performance GPU-Based Physics Simulation for Robot Learning',
    authors: [
      'Viktor Makoviychuk',
      'Lukasz Wawrzyniak',
      'Yunrong Guo',
      'Michelle Lu',
      'Kier Storey',
      'Miles Macklin',
      'David Hoeller',
      'Nikita Rudin',
      'Arthur Allshire',
      'Ankur Handa',
      'Gavriel State',
    ],
    year: 2021,
    arxiv: '2108.10470',
    url: 'https://arxiv.org/abs/2108.10470',
    type: 'paper',
  },
  {
    id: 'brax-2021',
    title:
      'Brax: A Differentiable Physics Engine for Large Scale Rigid Body Simulation',
    authors: [
      'C. Daniel Freeman',
      'Erik Frey',
      'Anton Raichuk',
      'Sertan Girgin',
      'Igor Mordatch',
      'Olivier Bachem',
    ],
    year: 2021,
    arxiv: '2106.13281',
    url: 'https://arxiv.org/abs/2106.13281',
    type: 'paper',
  },
  {
    id: 'mujoco-playground-2025',
    title: 'MuJoCo Playground',
    authors: [
      'Kevin Zakka',
      'Baruch Tabanpour',
      'Qiayuan Liao',
      'Mustafa Haiderbhai',
      'Samuel Holt',
      'Jing Yuan Luo',
      'Arthur Allshire',
      'Erik Frey',
      'Koushil Sreenath',
      'Lueder A. Kahrs',
      'Carmelo Sferrazza',
      'Yuval Tassa',
      'Pieter Abbeel',
    ],
    year: 2025,
    arxiv: '2502.08844',
    url: 'https://arxiv.org/abs/2502.08844',
    type: 'paper',
  },
  {
    // NVIDIA Technical Blog, 2026-03-16 (Newton 1.0 GA, GTC 2026).
    id: 'newton-manipulation-blog-2026',
    title:
      'Newton Adds Contact-Rich Manipulation and Locomotion Capabilities for Industrial Robotics',
    authors: [
      'Philipp Reist',
      'Miguel Zamora Mora',
      'JC Chang',
      'Rishabh Chadha',
      'Mohammad Mohajerani',
    ],
    year: 2026,
    url: 'https://developer.nvidia.com/blog/newton-adds-contact-rich-manipulation-and-locomotion-capabilities-for-industrial-robotics',
    type: 'blog',
  },
  {
    // NVIDIA community article on Hugging Face, 2026-07-21.
    id: 'state-of-simulation-2026',
    title: 'The State of Simulation for Physical AI: An Overview',
    authors: [
      'Johnny Nuñez Cano',
      'Mitesh Patel',
      'Asier Arranz',
      'Lior Ben Horin',
      'Raymond Lo',
      'Rishabh Chadha',
    ],
    year: 2026,
    url: 'https://huggingface.co/blog/nvidia/state-of-simulation-for-physical-ai',
    type: 'blog',
  },
  {
    id: 'reality-gap-survey-2026',
    title:
      'The Reality Gap in Robotics: Challenges, Solutions, and Best Practices',
    authors: [
      'Elie Aljalbout',
      'Jiaxu Xing',
      'Angel Romero',
      'Iretiayo Akinola',
      'Caelan Reed Garrett',
      'Eric Heiden',
      'Abhishek Gupta',
      'Tucker Hermans',
      'Yashraj Narang',
      'Dieter Fox',
      'Davide Scaramuzza',
      'Fabio Ramos',
    ],
    year: 2025,
    venue:
      'Annual Review of Control, Robotics, and Autonomous Systems 2026 (accepted)',
    arxiv: '2510.20808',
    url: 'https://arxiv.org/abs/2510.20808',
    type: 'paper',
  },
  {
    id: 'isaac-lab-2025',
    title:
      'Isaac Lab: A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning',
    authors: ['Mayank Mittal', 'NVIDIA'],
    year: 2025,
    arxiv: '2511.04831',
    url: 'https://arxiv.org/abs/2511.04831',
    type: 'paper',
  },
  {
    id: 'lin-humanoid-sim2real-2025',
    title:
      'Sim-to-Real Reinforcement Learning for Vision-Based Dexterous Manipulation on Humanoids',
    authors: [
      'Toru Lin',
      'Kartik Sachdev',
      'Linxi Fan',
      'Jitendra Malik',
      'Yuke Zhu',
    ],
    year: 2025,
    venue: 'CoRL 2025',
    arxiv: '2502.20396',
    url: 'https://arxiv.org/abs/2502.20396',
    type: 'paper',
  },
  {
    id: 'openai-rubiks-cube-2019',
    title: "Solving Rubik's Cube with a Robot Hand",
    authors: ['OpenAI', 'Ilge Akkaya', 'Marcin Andrychowicz'],
    year: 2019,
    arxiv: '1910.07113',
    url: 'https://arxiv.org/abs/1910.07113',
    type: 'paper',
  },
  {
    id: 'play2perfect-2026',
    title:
      'Play2Perfect: What Matters in Dexterous Play Pretraining for Precise Assembly?',
    authors: [
      'Tyler Ga Wei Lum',
      'Kushal Kedia',
      'C. Karen Liu',
      'Jeannette Bohg',
    ],
    year: 2026,
    arxiv: '2606.26428',
    url: 'https://arxiv.org/abs/2606.26428',
    type: 'paper',
  },
  {
    id: 'tobin-2017',
    title:
      'Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World',
    authors: [
      'Josh Tobin',
      'Rachel Fong',
      'Alex Ray',
      'Jonas Schneider',
      'Wojciech Zaremba',
      'Pieter Abbeel',
    ],
    year: 2017,
    venue: 'IROS 2017',
    arxiv: '1703.06907',
    url: 'https://arxiv.org/abs/1703.06907',
    type: 'paper',
  },
  {
    id: 'peng-2018',
    title: 'Sim-to-Real Transfer of Robotic Control with Dynamics Randomization',
    authors: [
      'Xue Bin Peng',
      'Marcin Andrychowicz',
      'Wojciech Zaremba',
      'Pieter Abbeel',
    ],
    year: 2018,
    venue: 'ICRA 2018',
    arxiv: '1710.06537',
    url: 'https://arxiv.org/abs/1710.06537',
    type: 'paper',
  },
  {
    id: 'lee-2020',
    title: 'Learning Quadrupedal Locomotion over Challenging Terrain',
    authors: [
      'Joonho Lee',
      'Jemin Hwangbo',
      'Lorenz Wellhausen',
      'Vladlen Koltun',
      'Marco Hutter',
    ],
    year: 2020,
    venue: 'Science Robotics 5(47)',
    arxiv: '2010.11251',
    url: 'https://arxiv.org/abs/2010.11251',
    type: 'paper',
  },
  {
    id: 'rma-2021',
    title: 'RMA: Rapid Motor Adaptation for Legged Robots',
    authors: ['Ashish Kumar', 'Zipeng Fu', 'Deepak Pathak', 'Jitendra Malik'],
    year: 2021,
    venue: 'RSS 2021',
    arxiv: '2107.04034',
    url: 'https://arxiv.org/abs/2107.04034',
    type: 'paper',
  },
  {
    id: 'hwangbo-2019',
    title: 'Learning Agile and Dynamic Motor Skills for Legged Robots',
    authors: [
      'Jemin Hwangbo',
      'Joonho Lee',
      'Alexey Dosovitskiy',
      'Dario Bellicoso',
      'Vassilios Tsounis',
      'Vladlen Koltun',
      'Marco Hutter',
    ],
    year: 2019,
    venue: 'Science Robotics 4(26)',
    arxiv: '1901.08652',
    url: 'https://arxiv.org/abs/1901.08652',
    type: 'paper',
  },
  {
    id: 'asap-2025',
    title:
      'ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid Whole-Body Skills',
    authors: [
      'Tairan He',
      'Jiawei Gao',
      'Wenli Xiao',
      'Yuanhang Zhang',
      'Zi Wang',
      'Jiashun Wang',
      'Zhengyi Luo',
      'Guanqi He',
      'Nikhil Sobanbab',
      'Chaoyi Pan',
      'Zeji Yi',
      'Guannan Qu',
      'Kris Kitani',
      'Jessica Hodgins',
      'Linxi "Jim" Fan',
      'Yuke Zhu',
      'Changliu Liu',
      'Guanya Shi',
    ],
    year: 2025,
    venue: 'RSS 2025',
    arxiv: '2502.01143',
    url: 'https://arxiv.org/abs/2502.01143',
    type: 'paper',
  },
  {
    id: 'splatsim-2024',
    title:
      'SplatSim: Zero-Shot Sim2Real Transfer of RGB Manipulation Policies Using Gaussian Splatting',
    authors: [
      'Mohammad Nomaan Qureshi',
      'Sparsh Garg',
      'Francisco Yandun',
      'David Held',
      'George Kantor',
      'Abhisesh Silwal',
    ],
    year: 2024,
    arxiv: '2409.10161',
    url: 'https://arxiv.org/abs/2409.10161',
    type: 'paper',
  },
  {
    id: 'robogsim-2024',
    title: 'RoboGSim: A Real2Sim2Real Robotic Gaussian Splatting Simulator',
    authors: [
      'Xinhai Li',
      'Jialin Li',
      'Ziheng Zhang',
      'Rui Zhang',
      'Fan Jia',
      'Tiancai Wang',
      'Haoqiang Fan',
      'Kuo-Kun Tseng',
      'Ruiping Wang',
    ],
    year: 2024,
    arxiv: '2411.11839',
    url: 'https://arxiv.org/abs/2411.11839',
    type: 'paper',
  },
  {
    id: 'miki-2022',
    title:
      'Learning Robust Perceptive Locomotion for Quadrupedal Robots in the Wild',
    authors: [
      'Takahiro Miki',
      'Joonho Lee',
      'Jemin Hwangbo',
      'Lorenz Wellhausen',
      'Vladlen Koltun',
      'Marco Hutter',
    ],
    year: 2022,
    venue: 'Science Robotics 7(62)',
    arxiv: '2201.08117',
    url: 'https://arxiv.org/abs/2201.08117',
    type: 'paper',
  },
  {
    // No arXiv version; the Science Robotics page is the primary source.
    id: 'choi-2023',
    title: 'Learning Quadrupedal Locomotion on Deformable Terrain',
    authors: [
      'Suyoung Choi',
      'Gwanghyun Ji',
      'Jeongsoo Park',
      'Hyunwoo Kim',
      'Juhwan Mun',
      'Jun Ho Lee',
      'Jemin Hwangbo',
    ],
    year: 2023,
    venue: 'Science Robotics 8(74)',
    url: 'https://www.science.org/doi/10.1126/scirobotics.ade2256',
    type: 'paper',
  },
  {
    id: 'h2o-2024',
    title:
      'Learning Human-to-Humanoid Real-Time Whole-Body Teleoperation',
    authors: [
      'Tairan He',
      'Zhengyi Luo',
      'Wenli Xiao',
      'Chong Zhang',
      'Kris Kitani',
      'Changliu Liu',
      'Guanya Shi',
    ],
    year: 2024,
    venue: 'IROS 2024',
    arxiv: '2403.04436',
    url: 'https://arxiv.org/abs/2403.04436',
    type: 'paper',
  },
  {
    id: 'mit-humanoid-rewards-2023',
    title:
      'Benchmarking Potential Based Rewards for Learning Humanoid Locomotion',
    authors: ['Se Hwan Jeon', 'Steve Heim', 'Charles Khazoom', 'Sangbae Kim'],
    year: 2023,
    venue: 'ICRA 2023',
    arxiv: '2307.10142',
    url: 'https://arxiv.org/abs/2307.10142',
    type: 'paper',
  },
  {
    // RAI Institute demo page, 2025-03-19: Atlas RL policies tracking
    // retargeted human motion, ~150M simulator runs, zero-shot to hardware.
    id: 'rai-atlas-rl-2025',
    title: 'Reinforcement Learning Accelerates Humanoid Behavior Production',
    authors: ['Robotics and AI Institute'],
    year: 2025,
    url: 'https://rai-inst.com/resources/videos/reinforcement-learning-accelerates-humanoid-behavior-production/',
    type: 'press',
  },
  {
    id: 'park-2017-bounding',
    title:
      'High-Speed Bounding with the MIT Cheetah 2: Control Design and Experiments',
    authors: ['Hae-Won Park', 'Patrick M. Wensing', 'Sangbae Kim'],
    year: 2017,
    venue: 'International Journal of Robotics Research 36(2)',
    url: 'https://journals.sagepub.com/doi/10.1177/0278364917694244',
    type: 'paper',
  },
  {
    // Boston Dynamics blog, 2024: RL integrated into Spot's locomotion
    // control system alongside the existing MPC stack.
    id: 'bd-spot-rl-2024',
    title: 'Starting on the Right Foot with Reinforcement Learning',
    authors: ['Boston Dynamics'],
    year: 2024,
    url: 'https://bostondynamics.com/blog/starting-on-the-right-foot-with-reinforcement-learning/',
    type: 'blog',
  },
  {
    // Boston Dynamics + TRI blog, 2025-08: Large Behavior Models on Atlas.
    id: 'bd-atlas-lbm-2025',
    title: 'Large Behavior Models and Atlas Find New Footing',
    authors: [
      'Eric Cousineau',
      'Scott Kuindersma',
      'Lucas Manuelli',
      'Pat Marion',
    ],
    year: 2025,
    url: 'https://bostondynamics.com/blog/large-behavior-models-atlas-find-new-footing/',
    type: 'blog',
  },
  {
    // Verified against the arXiv abs page (2026-08-08). ICCV 2023.
    id: 'phc-2023',
    title: 'Perpetual Humanoid Control for Real-time Simulated Avatars',
    authors: [
      'Zhengyi Luo',
      'Jinkun Cao',
      'Alexander Winkler',
      'Kris Kitani',
      'Weipeng Xu',
    ],
    year: 2023,
    venue: 'ICCV 2023',
    arxiv: '2305.06456',
    url: 'https://arxiv.org/abs/2305.06456',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08). CoRL 2024.
    id: 'omnih2o-2024',
    title:
      'OmniH2O: Universal and Dexterous Human-to-Humanoid Whole-Body Teleoperation and Learning',
    authors: [
      'Tairan He',
      'Zhengyi Luo',
      'Xialin He',
      'Wenli Xiao',
      'Chong Zhang',
      'Weinan Zhang',
      'Kris Kitani',
      'Changliu Liu',
      'Guanya Shi',
    ],
    year: 2024,
    venue: 'CoRL 2024',
    arxiv: '2406.08858',
    url: 'https://arxiv.org/abs/2406.08858',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08).
    id: 'humanplus-2024',
    title: 'HumanPlus: Humanoid Shadowing and Imitation from Humans',
    authors: [
      'Zipeng Fu',
      'Qingqing Zhao',
      'Qi Wu',
      'Gordon Wetzstein',
      'Chelsea Finn',
    ],
    year: 2024,
    arxiv: '2406.10454',
    url: 'https://arxiv.org/abs/2406.10454',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08).
    id: 'exbody2-2024',
    title: 'ExBody2: Advanced Expressive Humanoid Whole-Body Control',
    authors: [
      'Mazeyu Ji',
      'Xuanbin Peng',
      'Fangchen Liu',
      'Jialong Li',
      'Ge Yang',
      'Xuxin Cheng',
      'Xiaolong Wang',
    ],
    year: 2024,
    arxiv: '2412.13196',
    url: 'https://arxiv.org/abs/2412.13196',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08). NeurIPS 2025.
    id: 'kungfubot-2025',
    title:
      'KungfuBot: Physics-Based Humanoid Whole-Body Control for Learning Highly-Dynamic Skills',
    authors: [
      'Weiji Xie',
      'Jinrui Han',
      'Jiakun Zheng',
      'Huanyu Li',
      'Xinzhe Liu',
      'Jiyuan Shi',
      'Weinan Zhang',
      'Chenjia Bai',
      'Xuelong Li',
    ],
    year: 2025,
    venue: 'NeurIPS 2025',
    arxiv: '2506.12851',
    url: 'https://arxiv.org/abs/2506.12851',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08).
    id: 'gmt-2025',
    title: 'GMT: General Motion Tracking for Humanoid Whole-Body Control',
    authors: [
      'Zixuan Chen',
      'Mazeyu Ji',
      'Xuxin Cheng',
      'Xuanbin Peng',
      'Xue Bin Peng',
      'Xiaolong Wang',
    ],
    year: 2025,
    arxiv: '2506.14770',
    url: 'https://arxiv.org/abs/2506.14770',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08).
    id: 'robust-tracking-2026',
    title: 'Robust and Generalized Humanoid Motion Tracking',
    authors: [
      'Yubiao Ma',
      'Han Yu',
      'Jiayin Xie',
      'Changtai Lv',
      'Qiang Luo',
      'Chi Zhang',
      'Yunpeng Yin',
      'Boyang Xing',
      'Xuemei Ren',
      'Dongdong Zheng',
    ],
    year: 2026,
    arxiv: '2601.23080',
    url: 'https://arxiv.org/abs/2601.23080',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08).
    id: 'leverb-2025',
    title:
      'LeVERB: Humanoid Whole-Body Control with Latent Vision-Language Instruction',
    authors: [
      'Haoru Xue',
      'Xiaoyu Huang',
      'Dantong Niu',
      'Qiayuan Liao',
      'Thomas Kragerud',
      'Jan Tommy Gravdahl',
      'Xue Bin Peng',
      'Guanya Shi',
      'Trevor Darrell',
      'Koushil Sreenath',
      'Shankar Sastry',
    ],
    year: 2025,
    arxiv: '2506.13751',
    url: 'https://arxiv.org/abs/2506.13751',
    type: 'paper',
  },
  {
    // NVIDIA GEAR-SONIC whole-body controller workflow repo; pairs with the
    // Isaac GR00T N1.7 UNITREE_G1_SONIC embodiment tag.
    id: 'groot-wbc-2026',
    title: 'GR00T-WholeBodyControl (GEAR-SONIC whole-body controller workflow)',
    authors: ['NVIDIA'],
    year: 2026,
    url: 'https://github.com/NVlabs/GR00T-WholeBodyControl',
    type: 'docs',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 9 authors, ICLR 2024,
    // 83% of 29 tasks and 52% average normalized improvement confirmed in the
    // abstract.
    id: 'eureka-2024',
    title:
      'Eureka: Human-Level Reward Design via Coding Large Language Models',
    authors: [
      'Yecheng Jason Ma',
      'William Liang',
      'Guanzhi Wang',
      'De-An Huang',
      'Osbert Bastani',
      'Dinesh Jayaraman',
      'Yuke Zhu',
      'Linxi Fan',
      'Anima Anandkumar',
    ],
    year: 2024,
    venue: 'ICLR 2024',
    arxiv: '2310.12931',
    url: 'https://arxiv.org/abs/2310.12931',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): RLC 2026, VLM-based
    // reward design agent that restates the Eureka loop as its baseline.
    id: 'rda-2026',
    title: 'RDA: Reward Design Agent for Reinforcement Learning',
    authors: [
      'Hojoon Lee',
      'Ajay Subramanian',
      'Ben Abbatematteo',
      'Vijay Veerabadran',
      'Pedro Matias',
      'Karl Ridgeway',
      'Nitin Kamra',
    ],
    year: 2026,
    venue: 'RLC 2026',
    arxiv: '2606.01672',
    url: 'https://arxiv.org/abs/2606.01672',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 8 authors, T-RO 2024.
    id: 'rewards-constraints-2024',
    title:
      'Not Only Rewards But Also Constraints: Applications on Legged Robot Locomotion',
    authors: [
      'Yunho Kim',
      'Hyunsik Oh',
      'Jeonghyun Lee',
      'Jinhyeok Choi',
      'Gwanghyeon Ji',
      'Moonkyu Jung',
      'Donghoon Youm',
      'Jemin Hwangbo',
    ],
    year: 2024,
    venue: 'IEEE Transactions on Robotics 2024',
    arxiv: '2308.12517',
    url: 'https://arxiv.org/abs/2308.12517',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): RSS 2025, ROGER
    // online reward-gain adaptation.
    id: 'gain-adaptation-2025',
    title:
      'Gain Tuning Is Not What You Need: Reward Gain Adaptation for Constrained Locomotion Learning',
    authors: ['Arthicha Srisuchinnawong', 'Poramate Manoonpong'],
    year: 2025,
    venue: 'RSS 2025',
    arxiv: '2510.10759',
    url: 'https://arxiv.org/abs/2510.10759',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 5 authors, constrained
    // multi-objective RL with per-stage rewards and costs.
    id: 'stagewise-cmorl-2024',
    title:
      'Stage-Wise Reward Shaping for Acrobatic Robots: A Constrained Multi-Objective Reinforcement Learning Approach',
    authors: [
      'Dohyeong Kim',
      'Hyeokjin Kwon',
      'Junseok Kim',
      'Gunmin Lee',
      'Songhwai Oh',
    ],
    year: 2024,
    arxiv: '2409.15755',
    url: 'https://arxiv.org/abs/2409.15755',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 9 authors, ICRA 2026,
    // iLQR with MuJoCo dynamics and finite-difference derivatives; abstract
    // confirms "few sim-to-real considerations" and the three hardware
    // experiments.
    id: 'mujoco-ilqr-2026',
    title: 'Whole-Body Model-Predictive Control of Legged Robots with MuJoCo',
    authors: [
      'John Z. Zhang',
      'Taylor A. Howell',
      'Zeji Yi',
      'Chaoyi Pan',
      'Guanya Shi',
      'Guannan Qu',
      'Tom Erez',
      'Yuval Tassa',
      'Zachary Manchester',
    ],
    year: 2026,
    venue: 'ICRA 2026',
    arxiv: '2503.04613',
    url: 'https://arxiv.org/abs/2503.04613',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 18 authors, the
    // 2026 world-model-for-robot-learning survey whose functional
    // definition anchors the taxonomy module.
    id: 'world-model-survey-2026',
    title: 'World Model for Robot Learning: A Comprehensive Survey',
    authors: [
      'Bohan Hou',
      'Gen Li',
      'Jindou Jia',
      'Tuo An',
      'Xinying Guo',
      'Sicong Leng',
      'Haoran Geng',
      'Yanjie Ze',
      'Tatsuya Harada',
      'Philip Torr',
      'Oier Mees',
      'Marc Pollefeys',
      'Zhuang Liu',
      'Jiajun Wu',
      'Pieter Abbeel',
      'Jitendra Malik',
      'Yilun Du',
      'Jianfei Yang',
    ],
    year: 2026,
    arxiv: '2605.00080',
    url: 'https://arxiv.org/abs/2605.00080',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 4 authors; the
    // DreamerV3 paper, published in Nature 2025.
    id: 'dreamerv3-2023',
    title: 'Mastering Diverse Domains through World Models',
    authors: [
      'Danijar Hafner',
      'Jurgis Pasukonis',
      'Jimmy Ba',
      'Timothy Lillicrap',
    ],
    year: 2023,
    venue: 'Nature 2025',
    arxiv: '2301.04104',
    url: 'https://arxiv.org/abs/2301.04104',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 3 authors,
    // ICLR 2024; the decoder-free latent model behind TD-MPC2.
    id: 'tdmpc2-2023',
    title: 'TD-MPC2: Scalable, Robust World Models for Continuous Control',
    authors: ['Nicklas Hansen', 'Hao Su', 'Xiaolong Wang'],
    year: 2023,
    venue: 'ICLR 2024',
    arxiv: '2310.16828',
    url: 'https://arxiv.org/abs/2310.16828',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 5 authors,
    // CoRL 2022; Dreamer online on four physical robots.
    id: 'daydreamer-2022',
    title: 'DayDreamer: World Models for Physical Robot Learning',
    authors: [
      'Philipp Wu',
      'Alejandro Escontrela',
      'Danijar Hafner',
      'Ken Goldberg',
      'Pieter Abbeel',
    ],
    year: 2022,
    venue: 'CoRL 2022',
    arxiv: '2206.14176',
    url: 'https://arxiv.org/abs/2206.14176',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 4 authors;
    // the original Dreamer agent, behaviors learned purely by latent
    // imagination (ICLR 2020).
    id: 'dreamer-2019',
    title: 'Dream to Control: Learning Behaviors by Latent Imagination',
    authors: [
      'Danijar Hafner',
      'Timothy Lillicrap',
      'Jimmy Ba',
      'Mohammad Norouzi',
    ],
    year: 2019,
    venue: 'ICLR 2020',
    arxiv: '1912.01603',
    url: 'https://arxiv.org/abs/1912.01603',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 3 authors, ICML
    // 2022; the original TD-MPC, task-oriented latent dynamics plus local
    // trajectory optimization with a terminal value function.
    id: 'tdmpc-2022',
    title: 'Temporal Difference Learning for Model Predictive Control',
    authors: ['Nicklas Hansen', 'Xiaolong Wang', 'Hao Su'],
    year: 2022,
    venue: 'ICML 2022',
    arxiv: '2203.04955',
    url: 'https://arxiv.org/abs/2203.04955',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 3 authors;
    // dual-autoregressive latent world model for robust robot policy
    // optimization.
    id: 'robotic-world-model-2025',
    title:
      'Robotic World Model: A Neural Network Simulator for Robust Policy Optimization in Robotics',
    authors: ['Chenhao Li', 'Andreas Krause', 'Marco Hutter'],
    year: 2025,
    arxiv: '2501.10100',
    url: 'https://arxiv.org/abs/2501.10100',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 2 authors, ICML
    // 2026; gradient-based latent MPC, motivated by the policy-versus-MPC
    // performance gap in TD-MPC2-style hybrids.
    id: 'dream-mpc-2026',
    title:
      'Dream-MPC: Gradient-Based Model Predictive Control with Latent Imagination',
    authors: ['Jonathan Spieler', 'Sven Behnke'],
    year: 2026,
    venue: 'ICML 2026',
    arxiv: '2605.04568',
    url: 'https://arxiv.org/abs/2605.04568',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 4 authors; keeps
    // world modeling during training but skips future prediction at test
    // time (190 ms latency, over 4x faster than imagine-then-execute).
    id: 'fast-wam-2026',
    title: 'Fast-WAM: Do World Action Models Need Test-time Future Imagination?',
    authors: ['Tianyuan Yuan', 'Zibin Dong', 'Yicheng Liu', 'Hang Zhao'],
    year: 2026,
    arxiv: '2603.16666',
    url: 'https://arxiv.org/abs/2603.16666',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 30 authors;
    // 1M+ hours of action-free video pretraining, 62 hours of robot video
    // for the action-conditioned post-training.
    id: 'vjepa2-2025',
    title:
      'V-JEPA 2: Self-Supervised Video Models Enable Understanding, Prediction and Planning',
    authors: [
      'Mido Assran',
      'Adrien Bardes',
      'David Fan',
      'Quentin Garrido',
      'Russell Howes',
      'Mojtaba Komeili',
      'Matthew Muckley',
      'Ammar Rizvi',
      'Claire Roberts',
      'Koustuv Sinha',
      'Artem Zholus',
      'Sergio Arnaud',
      'Abha Gejji',
      'Ada Martin',
      'Francois Robert Hogan',
      'Daniel Dugas',
      'Piotr Bojanowski',
      'Vasil Khalidov',
      'Patrick Labatut',
      'Francisco Massa',
      'Marc Szafraniec',
      'Kapil Krishnakumar',
      'Yong Li',
      'Xiaodong Ma',
      'Sarath Chandar',
      'Franziska Meier',
      'Yann LeCun',
      'Michael Rabbat',
      'Nicolas Ballas',
    ],
    year: 2025,
    arxiv: '2506.09985',
    url: 'https://arxiv.org/abs/2506.09985',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 8 authors; the
    // original V-JEPA, feature prediction as a stand-alone objective with
    // no reconstruction, trained on 2M videos.
    id: 'vjepa-2024',
    title:
      'Revisiting Feature Prediction for Learning Visual Representations from Video',
    authors: [
      'Adrien Bardes',
      'Quentin Garrido',
      'Jean Ponce',
      'Xinlei Chen',
      'Michael Rabbat',
      'Yann LeCun',
      'Mahmoud Assran',
      'Nicolas Ballas',
    ],
    year: 2024,
    arxiv: '2404.08471',
    url: 'https://arxiv.org/abs/2404.08471',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 5 authors; shapes
    // the JEPA representation space so embedding distance approximates the
    // negative goal-conditioned value, improving planning.
    id: 'jepa-value-planning-2026',
    title: 'Value-guided action planning with JEPA world models',
    authors: [
      'Matthieu Destrade',
      'Oumayma Bounou',
      'Quentin Le Lidec',
      'Jean Ponce',
      'Yann LeCun',
    ],
    year: 2026,
    arxiv: '2601.00844',
    url: 'https://arxiv.org/abs/2601.00844',
    type: 'paper',
  },
  {
    // Verified against the TechCrunch article (2026-08-08): byline Anna
    // Heim, 2026-03-09; $1.03B at a $3.5B pre-money valuation, CEO
    // Alexandre LeBrun's buzzword quote.
    id: 'ami-labs-2026',
    title: "Yann LeCun's AMI Labs raises $1.03B to build world models",
    authors: ['Anna Heim'],
    year: 2026,
    venue: 'TechCrunch',
    url: 'https://techcrunch.com/2026/03/09/yann-lecuns-ami-labs-raises-1-03-billion-to-build-world-models/',
    type: 'press',
  },
  {
    // NVIDIA Cosmos 3 omni-model technical report (2026), URL per
    // research/02 Part B2.
    id: 'cosmos-3-2026',
    title: 'Cosmos 3: Omnimodal World Models for Physical AI',
    authors: ['NVIDIA'],
    year: 2026,
    url: 'https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf',
    type: 'paper',
  },
  {
    // Verified against the DeepMind blog (2026-08-08): byline Jack
    // Parker-Holder and Shlomi Fruchter, 2025-08-05; 24 fps, 720p,
    // few-minutes consistency, published limitation list.
    id: 'genie-3-2025',
    title: 'Genie 3: A new frontier for world models',
    authors: ['Jack Parker-Holder', 'Shlomi Fruchter'],
    year: 2025,
    venue: 'Google DeepMind',
    url: 'https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/',
    type: 'blog',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 12 authors;
    // autoregressive action world model unifying VLA and world model.
    id: 'worldvla-2025',
    title: 'WorldVLA: Towards Autoregressive Action World Model',
    authors: [
      'Jun Cen',
      'Chaohui Yu',
      'Hangjie Yuan',
      'Yuming Jiang',
      'Siteng Huang',
      'Jiayan Guo',
      'Xin Li',
      'Yibing Song',
      'Hao Luo',
      'Fan Wang',
      'Deli Zhao',
      'Hao Chen',
    ],
    year: 2025,
    arxiv: '2506.21539',
    url: 'https://arxiv.org/abs/2506.21539',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 6 authors; world
    // model in 3D occupancy space for driving.
    id: 'occworld-2023',
    title: 'OccWorld: Learning a 3D Occupancy World Model for Autonomous Driving',
    authors: [
      'Wenzhao Zheng',
      'Weiliang Chen',
      'Yuanhui Huang',
      'Borui Zhang',
      'Yueqi Duan',
      'Jiwen Lu',
    ],
    year: 2023,
    arxiv: '2311.16038',
    url: 'https://arxiv.org/abs/2311.16038',
    type: 'paper',
  },
  {
    // Canonical MuJoCo reference: Todorov, Erez, Tassa, IROS 2012,
    // DOI 10.1109/IROS.2012.6386109.
    id: 'mujoco-2012',
    title: 'MuJoCo: A physics engine for model-based control',
    authors: ['Emanuel Todorov', 'Tom Erez', 'Yuval Tassa'],
    year: 2012,
    venue: 'IROS 2012',
    url: 'https://ieeexplore.ieee.org/document/6386109',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 10 authors;
    // consistency-model world simulator, >10 minutes of stable interaction
    // at 15 FPS on one RTX 4090, policies trained only on generated
    // demonstrations match real-data-trained ones.
    id: 'interactive-world-simulator-2026',
    title: 'Interactive World Simulator for Robot Policy Training and Evaluation',
    authors: [
      'Yixuan Wang',
      'Rhythm Syed',
      'Fangyu Wu',
      'Mengchao Zhang',
      'Aykut Onol',
      'Jose Barreiros',
      'Hooshang Nayyeri',
      'Tony Dear',
      'Huan Zhang',
      'Yunzhu Li',
    ],
    year: 2026,
    arxiv: '2603.08546',
    url: 'https://arxiv.org/abs/2603.08546',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 7 authors;
    // evaluation pipeline with Step Forcing, Pearson r = 0.989 and
    // Spearman rho = 0.970 against real-robot evaluation.
    id: 'roboworld-2026',
    title:
      'RoboWorld: Fast and Reliable Neural Simulators for Generalist Robot Policy Evaluation',
    authors: [
      'Byeongguk Jeon',
      'Seonghyeon Ye',
      'JaeHyeok Doo',
      'Sungdong Kim',
      'Minjoon Seo',
      'Hyungmok Son',
      'Kimin Lee',
    ],
    year: 2026,
    arxiv: '2607.01060',
    url: 'https://arxiv.org/abs/2607.01060',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 9 authors;
    // large-scale video generative pre-training then fine-tuning for
    // multi-task manipulation (CALVIN 88.9 to 94.9).
    id: 'gr-1-2023',
    title:
      'Unleashing Large-Scale Video Generative Pre-training for Visual Robot Manipulation',
    authors: [
      'Hongtao Wu',
      'Ya Jing',
      'Chilam Cheang',
      'Guangzeng Chen',
      'Jiafeng Xu',
      'Xinghang Li',
      'Minghuan Liu',
      'Hang Li',
      'Tao Kong',
    ],
    year: 2023,
    arxiv: '2312.13139',
    url: 'https://arxiv.org/abs/2312.13139',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 12 authors,
    // alphabetical order; 38M video clips and 50B+ tokens of pre-training,
    // 97.7% average success across 100+ tasks.
    id: 'gr-2-2024',
    title:
      'GR-2: A Generative Video-Language-Action Model with Web-Scale Knowledge for Robot Manipulation',
    authors: [
      'Chi-Lam Cheang',
      'Guangzeng Chen',
      'Ya Jing',
      'Tao Kong',
      'Hang Li',
      'Yifeng Li',
      'Yuxiao Liu',
      'Hongtao Wu',
      'Jiafeng Xu',
      'Yichu Yang',
      'Hanbo Zhang',
      'Minzhao Zhu',
    ],
    year: 2024,
    arxiv: '2410.06158',
    url: 'https://arxiv.org/abs/2410.06158',
    type: 'paper',
  },
  {
    // Verified against the 1X blog (2026-08-08): dated June 2026;
    // dedicated World Model Lab led by Sam Sinha (ex-Luma AI).
    id: '1x-world-model-lab-2026',
    title: '1X Launches World Model Lab to Scale Humanoid Intelligence',
    authors: ['1X'],
    year: 2026,
    url: 'https://www.1x.tech/discover/1x-world-model-lab',
    type: 'blog',
  },
  {
    // Verified against the Odyssey blog (2026-08-08): byline Oliver
    // Cameron, 2025-10-27; causal autoregressive interactive video
    // streaming a new frame every 50 ms.
    id: 'odyssey-2-2025',
    title: 'Introducing Odyssey-2: A General-Purpose World Model',
    authors: ['Oliver Cameron'],
    year: 2025,
    venue: 'Odyssey',
    url: 'https://odyssey.ml/introducing-odyssey-2',
    type: 'blog',
  },
  {
    // Verified against Ars Technica (2026-08-08): Ryan Whitwam,
    // 2026-01-29; Project Genie launch coverage reporting the 60-second
    // per-world session cap. Press source (no first-party technical post
    // documents the cap).
    id: 'project-genie-2026',
    title:
      'Google Project Genie lets you create interactive worlds from a photo or prompt',
    authors: ['Ryan Whitwam'],
    year: 2026,
    venue: 'Ars Technica',
    url: 'https://arstechnica.com/google/2026/01/google-project-genie-lets-you-create-interactive-worlds-from-a-photo-or-prompt/',
    type: 'press',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 4 authors,
    // ACM TOG 42(4) / SIGGRAPH 2023.
    id: '3dgs-2023',
    title: '3D Gaussian Splatting for Real-Time Radiance Field Rendering',
    authors: [
      'Bernhard Kerbl',
      'Georgios Kopanas',
      'Thomas Leimkühler',
      'George Drettakis',
    ],
    year: 2023,
    venue: 'SIGGRAPH 2023',
    arxiv: '2308.04079',
    url: 'https://arxiv.org/abs/2308.04079',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 9 authors, ICML 2024.
    id: 'robogen-2024',
    title:
      'RoboGen: Towards Unleashing Infinite Data for Automated Robot Learning via Generative Simulation',
    authors: [
      'Yufei Wang',
      'Zhou Xian',
      'Feng Chen',
      'Tsun-Hsuan Wang',
      'Yian Wang',
      'Katerina Fragkiadaki',
      'Zackory Erickson',
      'David Held',
      'Chuang Gan',
    ],
    year: 2024,
    venue: 'ICML 2024',
    arxiv: '2311.01455',
    url: 'https://arxiv.org/abs/2311.01455',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 14 authors, CVPR 2024.
    id: 'holodeck-2024',
    title:
      'Holodeck: Language Guided Generation of 3D Embodied AI Environments',
    authors: [
      'Yue Yang',
      'Fan-Yun Sun',
      'Luca Weihs',
      'Eli VanderBilt',
      'Alvaro Herrasti',
      'Winson Han',
      'Jiajun Wu',
      'Nick Haber',
      'Ranjay Krishna',
      'Lingjie Liu',
      'Chris Callison-Burch',
      'Mark Yatskar',
      'Aniruddha Kembhavi',
      'Christopher Clark',
    ],
    year: 2024,
    venue: 'CVPR 2024',
    arxiv: '2312.09067',
    url: 'https://arxiv.org/abs/2312.09067',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 8 authors, RSS 2024.
    id: 'robocasa-2024',
    title:
      'RoboCasa: Large-Scale Simulation of Everyday Tasks for Generalist Robots',
    authors: [
      'Soroush Nasiriany',
      'Abhiram Maddukuri',
      'Lance Zhang',
      'Adeet Parikh',
      'Aaron Lo',
      'Abhishek Joshi',
      'Ajay Mandlekar',
      'Yuke Zhu',
    ],
    year: 2024,
    venue: 'RSS 2024',
    arxiv: '2406.02523',
    url: 'https://arxiv.org/abs/2406.02523',
    type: 'paper',
  },
  {
    // Verified against the robocasa.ai project page bibtex block
    // (2026-08-08): 4 authors, ICLR 2026; no arXiv listing, so the entry
    // links the hosted PDF.
    id: 'robocasa365-2026',
    title:
      'RoboCasa365: A Large-Scale Simulation Framework for Training and Benchmarking Generalist Robots',
    authors: [
      'Soroush Nasiriany',
      'Sepehr Nasiriany',
      'Abhiram Maddukuri',
      'Yuke Zhu',
    ],
    year: 2026,
    venue: 'ICLR 2026',
    url: 'https://robocasa.ai/assets/robocasa365_iclr26.pdf',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 6 authors.
    id: 'grs-2024',
    title: 'GRS: Generating Robotic Simulation Tasks from Real-World Images',
    authors: [
      'Alex Zook',
      'Fan-Yun Sun',
      'Josef Spjut',
      'Valts Blukis',
      'Stan Birchfield',
      'Jonathan Tremblay',
    ],
    year: 2024,
    arxiv: '2410.15536',
    url: 'https://arxiv.org/abs/2410.15536',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 31 authors; first three listed.
    id: 'gpt3-2020',
    title: 'Language Models are Few-Shot Learners',
    authors: ['Tom B. Brown', 'Benjamin Mann', 'Nick Ryder'],
    year: 2020,
    venue: 'NeurIPS 2020',
    arxiv: '2005.14165',
    url: 'https://arxiv.org/abs/2005.14165',
    type: 'paper',
  },
  {
    // Verified against the live page (2026-08-08): over 15T pretraining tokens.
    id: 'llama-3-2024',
    title:
      'Introducing Meta Llama 3: The most capable openly available LLM to date',
    authors: ['Meta AI'],
    year: 2024,
    url: 'https://ai.meta.com/blog/meta-llama-3/',
    type: 'blog',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 8 authors.
    id: 'fineweb-2024',
    title:
      'The FineWeb Datasets: Decanting the Web for the Finest Text Data at Scale',
    authors: [
      'Guilherme Penedo',
      'Hynek Kydlíček',
      'Loubna Ben allal',
      'Anton Lozhkov',
      'Margaret Mitchell',
      'Colin Raffel',
      'Leandro Von Werra',
      'Thomas Wolf',
    ],
    year: 2024,
    venue: 'NeurIPS 2024',
    arxiv: '2406.17557',
    url: 'https://arxiv.org/abs/2406.17557',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 101 authors; first three listed.
    id: 'droid-2024',
    title: 'DROID: A Large-Scale In-The-Wild Robot Manipulation Dataset',
    authors: ['Alexander Khazatsky', 'Karl Pertsch', 'Suraj Nair'],
    year: 2024,
    arxiv: '2403.12945',
    url: 'https://arxiv.org/abs/2403.12945',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 14 authors; first
    // three listed. CoRL 2023 per the PMLR v229 proceedings entry (venue
    // omitted from the entry: it duplicates the year in the chip tooltip).
    // research/03 does not cover BridgeData V2; figures verified against the
    // abs page and the project site (60,096 trajectories, 24 environments,
    // 13 skills, CC BY 4.0).
    id: 'bridgedata-v2-2023',
    title: 'BridgeData V2: A Dataset for Robot Learning at Scale',
    authors: ['Homer Walke', 'Kevin Black', 'Abraham Lee'],
    year: 2023,
    arxiv: '2308.12952',
    url: 'https://arxiv.org/abs/2308.12952',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 37 authors; first
    // three listed. RSS 2025 per the journal reference on the abs page.
    id: 'robomind-2024',
    title:
      'RoboMIND: Benchmark on Multi-embodiment Intelligence Normative Data for Robot Manipulation',
    authors: ['Kun Wu', 'Chengkai Hou', 'Jiaming Liu'],
    year: 2024,
    venue: 'RSS 2025',
    arxiv: '2412.13877',
    url: 'https://arxiv.org/abs/2412.13877',
    type: 'paper',
  },
  {
    // Dataset release page (research/03 ref [5]). Episode and hour counts
    // are not published there as of August 2026; total file size 13.2 TB.
    id: 'agibot-world-2026',
    title: 'AgiBot World 2026 (dataset release)',
    authors: ['AgiBot'],
    year: 2026,
    url: 'https://huggingface.co/datasets/agibot-world/AgiBotWorld2026',
    type: 'docs',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): team author plus 81 names.
    // Science Robotics 2026 per research/03.
    id: 'tri-lbm-2025',
    title:
      'A Careful Examination of Large Behavior Models for Multitask Dexterous Manipulation',
    authors: ['TRI LBM Team'],
    year: 2025,
    venue: 'Science Robotics 2026',
    arxiv: '2507.05331',
    url: 'https://arxiv.org/abs/2507.05331',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 6 authors.
    // ICLR 2025 oral per research/03.
    id: 'lin-data-scaling-laws-2024',
    title: 'Data Scaling Laws in Imitation Learning for Robotic Manipulation',
    authors: [
      'Fanqi Lin',
      'Yingdong Hu',
      'Pingyue Sheng',
      'Chuan Wen',
      'Jiacheng You',
      'Yang Gao',
    ],
    year: 2024,
    venue: 'ICLR 2025',
    arxiv: '2410.18647',
    url: 'https://arxiv.org/abs/2410.18647',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 10 authors.
    id: 'diversity-scaling-2025',
    title: 'Is Diversity All You Need for Scalable Robotic Manipulation?',
    authors: [
      'Modi Shi',
      'Li Chen',
      'Jin Chen',
      'Yuxiang Lu',
      'Chiming Liu',
      'Guanghui Ren',
      'Ping Luo',
      'Di Huang',
      'Maoqing Yao',
      'Hongyang Li',
    ],
    year: 2025,
    arxiv: '2507.06219',
    url: 'https://arxiv.org/abs/2507.06219',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 5 authors; ICLR 2026
    // per the arXiv comments field.
    id: 'egodex-2025',
    title:
      'EgoDex: Learning Dexterous Manipulation from Large-Scale Egocentric Video',
    authors: [
      'Ryan Hoque',
      'Peide Huang',
      'David J. Yoon',
      'Mouli Sivapurapu',
      'Jian Zhang',
    ],
    year: 2025,
    venue: 'ICLR 2026',
    arxiv: '2505.11709',
    url: 'https://arxiv.org/abs/2505.11709',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 15 authors.
    id: 'egoscale-2026',
    title:
      'EgoScale: Scaling Dexterous Manipulation with Diverse Egocentric Human Data',
    authors: [
      'Ruijie Zheng',
      'Dantong Niu',
      'Yuqi Xie',
      'Jing Wang',
      'Mengda Xu',
      'Yunfan Jiang',
      'Fernando Castañeda',
      'Fengyuan Hu',
      'You Liang Tan',
      'Letian Fu',
      'Trevor Darrell',
      'Furong Huang',
      'Yuke Zhu',
      'Danfei Xu',
      'Linxi Fan',
    ],
    year: 2026,
    arxiv: '2602.16710',
    url: 'https://arxiv.org/abs/2602.16710',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 8 authors.
    id: 'umi-2024',
    title:
      'Universal Manipulation Interface: In-The-Wild Robot Teaching Without In-The-Wild Robots',
    authors: [
      'Cheng Chi',
      'Zhenjia Xu',
      'Chuer Pan',
      'Eric Cousineau',
      'Benjamin Burchfiel',
      'Siyuan Feng',
      'Russ Tedrake',
      'Shuran Song',
    ],
    year: 2024,
    arxiv: '2402.10329',
    url: 'https://arxiv.org/abs/2402.10329',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 85 authors; first three listed.
    id: 'ego4d-2022',
    title: 'Ego4D: Around the World in 3,000 Hours of Egocentric Video',
    authors: ['Kristen Grauman', 'Andrew Westbury', 'Eugene Byrne'],
    year: 2022,
    venue: 'CVPR 2022',
    arxiv: '2110.07058',
    url: 'https://arxiv.org/abs/2110.07058',
    type: 'paper',
  },
  {
    // Verified against the live repository (2026-08-09): SO-ARM100 BOM,
    // SO-101 assembly and the $121.94 follower-arm parts table.
    id: 'so-arm100-repo-2026',
    title: 'SO-ARM100: Low-Cost Robot Arms for Everyone',
    authors: ['TheRobotStudio'],
    year: 2026,
    url: 'https://github.com/TheRobotStudio/SO-ARM100',
    type: 'docs',
  },
  {
    // Verified against the live docs index (2026-08-09): supported robots
    // (SO-101, LeKiwi, Koch v1.1), ACT / pi0 / SmolVLA policies.
    id: 'lerobot-docs-2026',
    title: 'LeRobot Documentation',
    authors: ['Hugging Face'],
    year: 2026,
    url: 'https://huggingface.co/docs/lerobot/index',
    type: 'docs',
  },
  {
    // Community-compiled pricing table (June 2026), researched with sources
    // listed at the bottom. Secondary compilation; used only for figures
    // with no first-party page (Koch BOM, ALOHA 2, Reachy 2).
    id: 'lerobot-pricing-2026',
    title: 'LeRobot ecosystem and hardware pricing (June 2026)',
    authors: ['alpibrusl'],
    year: 2026,
    url: 'https://github.com/alpibrusl/lex-robot/issues/3',
    type: 'blog',
  },
  {
    // Verified against the live product pages (2026-08-09): assembled kit
    // $299, unassembled bundle $295, 5+1 DoF, 500 g payload.
    id: 'seeed-so-arm101-pro-2026',
    title: 'SO-ARM101 Pro Kits',
    authors: ['Seeed Studio'],
    year: 2026,
    url: 'https://www.seeedstudio.com/SO-ARM-101-Assembled-Kit-Pro-p-6691.html',
    type: 'docs',
  },
  {
    // Verified against the live product line (2026-08-09): WidowX AI
    // $2,995 (was $4,545.95) through Mobile AI $22,995 (was $33,695.95),
    // 500 Hz CAN FD, LeRobot + OpenPI integration.
    id: 'trossen-ai-2026',
    title: 'Trossen AI Product Line (formerly ALOHA)',
    authors: ['Trossen Robotics'],
    year: 2026,
    url: 'https://www.trossenrobotics.com/ai',
    type: 'docs',
  },
  {
    // Secondary aggregator ("38 Best Humanoid Robots in 2026"); authors
    // state prices and specs were re-verified against manufacturer pages
    // on 2026-07-13. Used only where no first-party page was reachable.
    id: 'robozaps-humanoids-2026',
    title: '38 Best Humanoid Robots in 2026',
    authors: ['RoboZaps'],
    year: 2026,
    url: 'https://blog.robozaps.com/b/best-humanoid-robots',
    type: 'press',
  },
  {
    // Verified against the live product page (2026-08-09): 1320 mm, ~35 kg,
    // $13,500 base, 23 DoF base / 23-43 EDU, Dex3-1 hand specs.
    id: 'unitree-g1-2026',
    title: 'Unitree G1 Product Page',
    authors: ['Unitree Robotics'],
    year: 2026,
    url: 'https://www.unitree.com/g1/',
    type: 'docs',
  },
  {
    // Verified against the live product page (2026-08-09): 1820 mm, ~70 kg,
    // $29,900, 31 DoF breakdown, 360 N·m leg torque, dexterous hand options.
    id: 'unitree-h2-2026',
    title: 'Unitree H2 Product Page',
    authors: ['Unitree Robotics'],
    year: 2026,
    url: 'https://www.unitree.com/H2/',
    type: 'docs',
  },
  {
    // Verified against the live product page (2026-08-09): $20,000 or
    // $499/month, $200 deposit, 168 cm, 30 kg, Jetson Thor onboard.
    id: '1x-neo-2026',
    title: '1X NEO Product Page',
    authors: ['1X Technologies'],
    year: 2026,
    url: 'https://www.1x.tech/neo',
    type: 'docs',
  },
  {
    // Verified against the live product page (2026-08-09): 56 DoF with
    // continuous rotation, 50 kg instant payload, IP67, 2026 deployments
    // committed to Hyundai and Google DeepMind.
    id: 'bd-atlas-2026',
    title: 'Atlas Product Page',
    authors: ['Boston Dynamics'],
    year: 2026,
    url: 'https://bostondynamics.com/products/atlas/',
    type: 'docs',
  },
  {
    // Verified against the live announcement (2026-08-09): fleet
    // production, palm cameras, 2 kW wireless charging through foot coils.
    id: 'figure-03-2025',
    title: 'Introducing Figure 03',
    authors: ['Figure AI'],
    year: 2025,
    url: 'https://www.figure.ai/news/introducing-figure-03',
    type: 'blog',
  },
  {
    // Verified against the arXiv abs page and the LEAP Hand project site
    // (2026-08-09): 16 DoF, assembled in 4 hours at a cost of $2,000,
    // one eighth the cost of the Allegro Hand. RSS 2023.
    id: 'leap-hand-2023',
    title:
      'LEAP Hand: Low-Cost, Efficient, and Anthropomorphic Hand for Robot Learning',
    authors: ['Kenneth Shaw', 'Ananye Agarwal', 'Deepak Pathak'],
    year: 2023,
    venue: 'RSS 2023',
    arxiv: '2309.06440',
    url: 'https://arxiv.org/abs/2309.06440',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): six authors,
    // accepted to IEEE Transactions on Robotics.
    id: 'tactile-outlook-2025',
    title: 'Tactile Robotics: An Outlook',
    authors: [
      'Shan Luo',
      'Nathan F. Lepora',
      'Wenzhen Yuan',
      'Kaspar Althoefer',
      'Gordon Cheng',
      'Ravinder Dahiya',
    ],
    year: 2025,
    venue: 'IEEE Transactions on Robotics (accepted)',
    arxiv: '2508.11261',
    url: 'https://arxiv.org/abs/2508.11261',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 12 authors; the
    // DIGIT fingertip sensor design, IEEE RA-L.
    id: 'digit-sensor-2020',
    title:
      'DIGIT: A Novel Design for a Low-Cost Compact High-Resolution Tactile Sensor with Application to In-Hand Manipulation',
    authors: [
      'Mike Lambeta',
      'Po-Wei Chou',
      'Stephen Tian',
      'Brian Yang',
      'Benjamin Maloon',
      'Victoria Rose Most',
      'Dave Stroud',
      'Raymond Santos',
      'Ahmad Byagowi',
      'Gregg Kammerer',
      'Dinesh Jayaraman',
      'Roberto Calandra',
    ],
    year: 2020,
    venue: 'IEEE RA-L',
    arxiv: '2005.14679',
    url: 'https://arxiv.org/abs/2005.14679',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): six authors;
    // magnetic skin with cross-instance policy generalization.
    id: 'anyskin-2024',
    title: 'AnySkin: Plug-and-play Skin Sensing for Robotic Touch',
    authors: [
      'Raunaq Bhirangi',
      'Venkatesh Pattabiraman',
      'Enes Erciyes',
      'Yifeng Cao',
      'Tess Hellebrekers',
      'Lerrel Pinto',
    ],
    year: 2024,
    arxiv: '2409.08276',
    url: 'https://arxiv.org/abs/2409.08276',
    type: 'paper',
  },
  {
    // Verified against the live Meta AI blog (2026-08-09): Digit 360 with
    // GelSight, released Oct 2024.
    id: 'meta-fair-touch-2024',
    title:
      'Advancing embodied AI through progress in touch perception, dexterity, and human-robot interaction',
    authors: ['Meta AI'],
    year: 2024,
    url: 'https://ai.meta.com/blog/fair-robotics-open-source/',
    type: 'blog',
  },
  {
    // Verified against the live product page (2026-08-09): T5000 2,070 FP4
    // TFLOPS / 128 GB LPDDR5X / 40-130 W, T4000 1,200 TFLOPS / 64 GB,
    // modules sold via NVIDIA partners.
    id: 'jetson-thor-2026',
    title: 'Jetson Thor: Advanced AI for Physical Robotics',
    authors: ['NVIDIA'],
    year: 2026,
    url: 'https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/',
    type: 'docs',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 5 authors. The
    // full title ends "...for Robot Manipulators" (research/03 truncates
    // it). Parts BOM under $300 and the ~30 min assembly come from the
    // paper's project site (wuphilipp.github.io/gello/).
    id: 'gello-2023',
    title:
      'GELLO: A General, Low-Cost, and Intuitive Teleoperation Framework for Robot Manipulators',
    authors: ['Philipp Wu', 'Yide Shentu', 'Zhongke Yi', 'Xingyu Lin', 'Pieter Abbeel'],
    year: 2023,
    arxiv: '2309.13037',
    url: 'https://arxiv.org/abs/2309.13037',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 5 authors, CoRL
    // 2024 (venue omitted: it duplicates the entry year in the chip
    // tooltip). research/03 lists Open TeleVision as [UNVERIFIED]; the
    // paper was located and verified at arXiv 2407.01512.
    id: 'open-television-2024',
    title: 'Open-TeleVision: Teleoperation with Immersive Active Visual Feedback',
    authors: ['Xuxin Cheng', 'Jialong Li', 'Shiqi Yang', 'Ge Yang', 'Xiaolong Wang'],
    year: 2024,
    arxiv: '2407.01512',
    url: 'https://arxiv.org/abs/2407.01512',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 8 authors. The
    // full title carries "...for Imitation Learning" (research/03
    // truncates it). Vision Pro launch price ($3,499) per Apple's
    // January 2024 announcement, also carried by research/03.
    id: 'bunny-visionpro-2024',
    title:
      'Bunny-VisionPro: Real-Time Bimanual Dexterous Teleoperation for Imitation Learning',
    authors: [
      'Runyu Ding',
      'Yuzhe Qin',
      'Jiyue Zhu',
      'Chengzhe Jia',
      'Shiqi Yang',
      'Ruihan Yang',
      'Xiaojuan Qi',
      'Xiaolong Wang',
    ],
    year: 2024,
    arxiv: '2407.03162',
    url: 'https://arxiv.org/abs/2407.03162',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 9 authors, TRI and
    // Princeton; accepted to RSS 2025 per the arXiv comments field. The
    // near-optimal sequential test cuts evaluation trials by up to 32%
    // while preserving statistical power.
    id: 'optimal-stopping-2025',
    title:
      'Is Your Imitation Learning Policy Better than Mine? Policy Comparison with Near-Optimal Stopping',
    authors: [
      'David Snyder',
      'Asher James Hancock',
      'Apurva Badithela',
      'Emma Dixon',
      'Patrick Miller',
      'Rares Andrei Ambrus',
      'Anirudha Majumdar',
      'Masha Itkina',
      'Haruki Nishimura',
    ],
    year: 2025,
    venue: 'RSS 2025',
    arxiv: '2503.10966',
    url: 'https://arxiv.org/abs/2503.10966',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page and the SIMPLER project site
    // (2026-08-09): 16 authors across UCSD, Stanford, Berkeley, and Google
    // DeepMind. research/03 misattributes this as an arXiv 2507.05331
    // companion; the paper is arXiv 2405.05941. Visual matching and system
    // identification close the visual and control gaps; ~1,500 paired
    // sim-and-real episodes validate Pearson r and the Mean Maximum Rank
    // Violation (MMRV) metric.
    id: 'simpler-2024',
    title: 'Evaluating Real-World Robot Manipulation Policies in Simulation',
    authors: [
      'Xuanlin Li',
      'Kyle Hsu',
      'Jiayuan Gu',
      'Karl Pertsch',
      'Oier Mees',
      'Homer Rich Walke',
      'Chuyuan Fu',
      'Ishikaa Lunawat',
      'Isabel Sieh',
      'Sean Kirmani',
      'Sergey Levine',
      'Jiajun Wu',
      'Chelsea Finn',
      'Hao Su',
      'Quan Vuong',
      'Ted Xiao',
    ],
    year: 2024,
    arxiv: '2405.05941',
    url: 'https://arxiv.org/abs/2405.05941',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 7 authors. Four
    // task suites, 130 tasks in total, with human-teleoperated
    // demonstrations for every task. Venue omitted: the arXiv page lists
    // no publication venue.
    id: 'libero-2023',
    title: 'LIBERO: Benchmarking Knowledge Transfer for Lifelong Robot Learning',
    authors: [
      'Bo Liu',
      'Yifeng Zhu',
      'Chongkai Gao',
      'Yihao Feng',
      'Qiang Liu',
      'Yuke Zhu',
      'Peter Stone',
    ],
    year: 2023,
    arxiv: '2306.03310',
    url: 'https://arxiv.org/abs/2306.03310',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 13 authors.
    // Perturbations across seven dimensions drop models from 95% to below
    // 30% success under modest camera-viewpoint and initial-state shifts,
    // and the models largely ignore the language instructions.
    id: 'libero-plus-2025',
    title:
      'LIBERO-Plus: In-depth Robustness Analysis of Vision-Language-Action Models',
    authors: [
      'Senyu Fei',
      'Siyin Wang',
      'Junhao Shi',
      'Zihao Dai',
      'Jikun Cai',
      'Pengfang Qian',
      'Li Ji',
      'Xinzhe He',
      'Shiduo Zhang',
      'Zhaoye Fei',
      'Jinlan Fu',
      'Jingjing Gong',
      'Xipeng Qiu',
    ],
    year: 2025,
    arxiv: '2510.13626',
    url: 'https://arxiv.org/abs/2510.13626',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 32 authors across 7
    // institutions. Crowd-sourced double-blind pairwise comparisons on the
    // DROID platform: more than 600 pairwise real-robot episodes over 7
    // generalist policies, aggregated into a policy ranking.
    id: 'roboarena-2025',
    title:
      'RoboArena: Distributed Real-World Evaluation of Generalist Robot Policies',
    authors: [
      'Pranav Atreya',
      'Karl Pertsch',
      'Tony Lee',
      'Moo Jin Kim',
      'Arhan Jain',
      'Artur Kuramshin',
      'Clemens Eppner',
      'Cyrus Neary',
      'Edward Hu',
      'Fabio Ramos',
      'Jonathan Tremblay',
      'Kanav Arora',
      'Kirsty Ellis',
      'Luca Macesanu',
      'Marcel Torne Villasevil',
      'Matthew Leonard',
      'Meedeum Cho',
      'Ozgur Aslan',
      'Shivin Dass',
      'Jie Wang',
      'William Reger',
      'Xingfang Yuan',
      'Xuning Yang',
      'Abhishek Gupta',
      'Dinesh Jayaraman',
      'Glen Berseth',
      'Kostas Daniilidis',
      'Roberto Martin-Martin',
      'Youngwoon Lee',
      'Percy Liang',
      'Chelsea Finn',
      'Sergey Levine',
    ],
    year: 2025,
    arxiv: '2506.18123',
    url: 'https://arxiv.org/abs/2506.18123',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-09): 37 authors in
    // alphabetical order. An online evaluation system for large-scale
    // real-robot testing of VLA models, benchmarked with the Table30 task
    // suite. research/03 marks further details UNVERIFIED; only the
    // abstract's claims are used.
    id: 'robochallenge-2025',
    title: 'RoboChallenge: Large-scale Real-robot Evaluation of Embodied Policies',
    authors: [
      'Adina Yakefu',
      'Bin Xie',
      'Chongyang Xu',
      'Enwen Zhang',
      'Erjin Zhou',
      'Fan Jia',
      'Haitao Yang',
      'Haoqiang Fan',
      'Haowei Zhang',
      'Hongyang Peng',
      'Jing Tan',
      'Junwen Huang',
      'Kai Liu',
      'Kaixin Liu',
      'Kefan Gu',
      'Qinglun Zhang',
      'Ruitao Zhang',
      'Saike Huang',
      'Shen Cheng',
      'Shuaicheng Liu',
      'Tiancai Wang',
      'Tiezhen Wang',
      'Wei Sun',
      'Wenbin Tang',
      'Yajun Wei',
      'Yang Chen',
      'Youqiang Gui',
      'Yucheng Zhao',
      'Yunchao Ma',
      'Yunfei Wei',
      'Yunhuan Yang',
      'Yutong Guo',
      'Ze Chen',
      'Zhengyuan Du',
      'Ziheng Zhang',
      'Ziming Liu',
      'Ziwei Yan',
    ],
    year: 2025,
    arxiv: '2510.17950',
    url: 'https://arxiv.org/abs/2510.17950',
    type: 'paper',
  },
  {
    // Verified against the ASME Digital Collection article page
    // (2026-08-10): J. Appl. Mech. 22(2):215-221, June 1955. The paper that
    // introduced the DH convention.
    id: 'denavit-hartenberg-1955',
    title: 'A Kinematic Notation for Lower-Pair Mechanisms Based on Matrices',
    authors: ['J. Denavit', 'R. S. Hartenberg'],
    year: 1955,
    venue: 'ASME J. Applied Mechanics',
    url: 'https://doi.org/10.1115/1.4011045',
    type: 'paper',
  },
  {
    // Verified against the IEEE Xplore document page (2026-08-10): IEEE
    // Trans. Man-Machine Systems 10(2):47-53, June 1969. Introduced resolved
    // motion rate control, the Jacobian-velocity mapping used to command
    // manipulators in task space.
    id: 'whitney-1969',
    title: 'Resolved Motion Rate Control of Manipulators and Human Prostheses',
    authors: ['Daniel E. Whitney'],
    year: 1969,
    venue: 'IEEE Trans. Man-Machine Systems',
    url: 'https://doi.org/10.1109/TMMS.1969.299896',
    type: 'paper',
  },
  {
    // Verified against the IEEE Xplore document page (2026-08-10): IEEE
    // Trans. Systems, Man, and Cybernetics 16(1):93-101, January 1986. The
    // damped-least-squares IK formulation the 3D playground solver builds on.
    id: 'wampler-1986',
    title:
      'Manipulator Inverse Kinematic Solutions Based on Vector Formulations and Damped Least-Squares Methods',
    authors: ['Charles W. Wampler'],
    year: 1986,
    venue: 'IEEE Trans. Systems, Man, and Cybernetics',
    url: 'https://doi.org/10.1109/TSMC.1986.289285',
    type: 'paper',
  },
  {
    // Verified against the publisher DOI record (2026-08-10): Quarterly of
    // Applied Mathematics 2(2):164-168, 1944. The damping idea behind
    // Levenberg-Marquardt-style IK solvers.
    id: 'levenberg-1944',
    title:
      'A Method for the Solution of Certain Non-linear Problems in Least Squares',
    authors: ['Kenneth Levenberg'],
    year: 1944,
    venue: 'Quarterly of Applied Mathematics',
    url: 'https://doi.org/10.1090/qam/10666',
    type: 'paper',
  },
  {
    // Verified against the SIAM ePubs page (2026-08-10): J. Society for
    // Industrial and Applied Mathematics 11(2):431-441, 1963. Adaptive
    // damping for nonlinear least squares; paired with Levenberg in the
    // Levenberg-Marquardt method.
    id: 'marquardt-1963',
    title: 'An Algorithm for Least-Squares Estimation of Nonlinear Parameters',
    authors: ['Donald W. Marquardt'],
    year: 1963,
    venue: 'J. SIAM',
    url: 'https://doi.org/10.1137/0111030',
    type: 'paper',
  },
  {
    // Verified against the live Northwestern book site (2026-08-10): the
    // official companion for Lynch and Park, Cambridge University Press,
    // 2017, ISBN 9781107156302. Free full text and video lectures.
    id: 'modern-robotics-2017',
    title: 'Modern Robotics: Mechanics, Planning, and Control',
    authors: ['Kevin M. Lynch', 'Frank C. Park'],
    year: 2017,
    venue: 'Cambridge University Press',
    url: 'https://modernrobotics.northwestern.edu/',
    type: 'docs',
  },
  {
    // Verified against the IEEE Xplore DOI record (2026-08-11): IEEE Trans.
    // Computers C-32(2):108-120, February 1983. Introduced the configuration
    // space formulation: shrink the robot to a point and grow the obstacles.
    id: 'lozano-perez-1983',
    title: 'Spatial Planning: A Configuration Space Approach',
    authors: ['Tomás Lozano-Pérez'],
    year: 1983,
    venue: 'IEEE Trans. Computers',
    url: 'https://doi.org/10.1109/TC.1983.1676196',
    type: 'paper',
  },
  {
    // Verified against the IEEE Xplore DOI record (2026-08-11): IEEE Trans.
    // Robotics and Automation 12(4):566-580, August 1996. The probabilistic
    // roadmap paper, the multi-query half of sampling-based planning.
    id: 'kavraki-1996',
    title:
      'Probabilistic Roadmaps for Path Planning in High-Dimensional Configuration Spaces',
    authors: [
      'Lydia E. Kavraki',
      'Petr Svestka',
      'Jean-Claude Latombe',
      'Mark H. Overmars',
    ],
    year: 1996,
    venue: 'IEEE Trans. Robotics and Automation',
    url: 'https://doi.org/10.1109/70.508439',
    type: 'paper',
  },
  {
    // Verified against the author's paper archive (2026-08-11): Computer
    // Science Department TR 98-11, Iowa State University, October 1998. The
    // original RRT report.
    id: 'lavalle-1998',
    title: 'Rapidly-exploring Random Trees: A New Tool for Path Planning',
    authors: ['Steven M. LaValle'],
    year: 1998,
    venue: 'Iowa State University TR 98-11',
    url: 'https://lavalle.pl/papers/Lav98c.pdf',
    type: 'paper',
  },
  {
    // Verified against the author's paper archive (2026-08-11): Int. J.
    // Robotics Research 20(5):378-400, May 2001. The journal treatment of
    // RRTs, including kinodynamic planning with dynamics constraints.
    id: 'lavalle-kuffner-2001',
    title: 'Randomized Kinodynamic Planning',
    authors: ['Steven M. LaValle', 'James J. Kuffner'],
    year: 2001,
    venue: 'Int. J. Robotics Research',
    url: 'https://lavalle.pl/papers/LavKuf01.pdf',
    type: 'paper',
  },
  {
    // Verified against the arXiv abstract page (2026-08-11): IJRR 30(7),
    // 2011. Proves RRT and PRM converge to non-optimal solutions and
    // introduces the asymptotically optimal PRM* and RRT* variants.
    id: 'karaman-frazzoli-2011',
    title: 'Sampling-based Algorithms for Optimal Motion Planning',
    authors: ['Sertac Karaman', 'Emilio Frazzoli'],
    year: 2011,
    venue: 'Int. J. Robotics Research',
    arxiv: '1105.1186',
    url: 'https://arxiv.org/abs/1105.1186',
    type: 'paper',
  },
  {
    // Verified against the arXiv abstract page (2026-08-11): IROS 2014,
    // pp. 2997-3004. Focuses RRT* sampling on the prolate hyperspheroid of
    // states that can still improve the current solution.
    id: 'gammell-2014',
    title:
      'Informed RRT*: Optimal Sampling-based Path Planning Focused via Direct Sampling of an Admissible Ellipsoidal Heuristic',
    authors: [
      'Jonathan D. Gammell',
      'Siddhartha S. Srinivasa',
      'Timothy D. Barfoot',
    ],
    year: 2014,
    venue: 'IROS 2014',
    arxiv: '1404.2334',
    url: 'https://arxiv.org/abs/1404.2334',
    type: 'paper',
  },
  {
    // Verified against the CMU Robotics Institute publication page
    // (2026-08-11): ICRA 2009, pp. 489-494. Covariant functional-gradient
    // trajectory optimization against a signed-distance cost field.
    id: 'ratliff-2009',
    title:
      'CHOMP: Gradient Optimization Techniques for Efficient Motion Planning',
    authors: [
      'Nathan Ratliff',
      'Matthew Zucker',
      'J. Andrew Bagnell',
      'Siddhartha Srinivasa',
    ],
    year: 2009,
    venue: 'ICRA 2009',
    url: 'https://www.ri.cmu.edu/publications/chomp-gradient-optimization-techniques-for-efficient-motion-planning/',
    type: 'paper',
  },
  {
    // Verified against the open Robotics: Science and Systems proceedings
    // (2026-08-11, pdftotext of p31.pdf): RSS 2013. The TrajOpt paper:
    // sequential convex optimization with hinge-loss collision penalties
    // and continuous-time collision checking.
    id: 'schulman-2013',
    title:
      'Finding Locally Optimal, Collision-Free Trajectories with Sequential Convex Optimization',
    authors: [
      'John Schulman',
      'Jonathan Ho',
      'Alex Lee',
      'Ibrahim Awwal',
      'Henry Bradlow',
      'Pieter Abbeel',
    ],
    year: 2013,
    venue: 'RSS 2013',
    url: 'https://www.roboticsproceedings.org/rss09/p31.pdf',
    type: 'paper',
  },
  {
    // Verified against the author's free web edition (2026-08-11): LaValle,
    // Cambridge University Press, 2006. The standard textbook treatment of
    // configuration space, sampling-based planning, and optimality.
    id: 'lavalle-2006',
    title: 'Planning Algorithms',
    authors: ['Steven M. LaValle'],
    year: 2006,
    venue: 'Cambridge University Press',
    url: 'https://lavalle.pl/planning/',
    type: 'docs',
  },
  {
    // Verified against the project site (2026-08-11): the Kavraki Lab's
    // Open Motion Planning Library, the reference implementation of PRM,
    // RRT, RRT*, and their descendants (Sucan, Moll, Kavraki, IEEE RAM
    // 19(4), 2012).
    id: 'ompl-2012',
    title: 'The Open Motion Planning Library',
    authors: ['Ioan A. Șucan', 'Mark Moll', 'Lydia E. Kavraki'],
    year: 2012,
    venue: 'IEEE Robotics & Automation Magazine',
    url: 'https://ompl.kavrakilab.org/',
    type: 'docs',
  },
  {
    // Verified against the free second-edition PDF on the book site
    // (2026-08-11): chapter 1 states "More than 95% of all industrial
    // control problems are solved by PID control"; chapters 10-11 cover PID
    // and chapter 7 state feedback with the algebraic Riccati equation.
    id: 'astrom-murray-2008',
    title: 'Feedback Systems: An Introduction for Scientists and Engineers',
    authors: ['Karl Johan Åström', 'Richard M. Murray'],
    year: 2008,
    venue: 'Princeton University Press',
    url: 'https://fbsbook.org/',
    type: 'docs',
  },
  {
    // DOI verified via Crossref (2026-08-11): the record is the 1993 JDSMC
    // reprint of the 1942 Transactions of the ASME original (64:759-768),
    // the classic relay tuning rules for PID gains.
    id: 'ziegler-nichols-1942',
    title: 'Optimum Settings for Automatic Controllers',
    authors: ['John G. Ziegler', 'Nathaniel B. Nichols'],
    year: 1942,
    venue: 'Trans. ASME',
    url: 'https://doi.org/10.1115/1.2899060',
    type: 'paper',
  },
  {
    // DOI verified via Crossref and IEEE Xplore (2026-08-11): the IEEE
    // Press reprint (Control Theory: Twenty-Five Seminal Papers) of
    // Kalman's 1960 Bol. Soc. Mat. Mexicana paper, which introduced the
    // optimal state-feedback problem LQR solves.
    id: 'kalman-1960',
    title: 'Contributions to the Theory of Optimal Control',
    authors: ['Rudolf E. Kalman'],
    year: 1960,
    venue: 'Bol. Soc. Mat. Mexicana',
    url: 'https://doi.org/10.1109/9780470544334.ch8',
    type: 'paper',
  },
  {
    // Verified against the live MIT course site (2026-08-11): chapters on
    // the pendulum and acrobot cover the nonlinear dynamics, the LQR
    // balancing controller, and swing-up used in this module's demo.
    id: 'tedrake-underactuated',
    title: 'Underactuated Robotics',
    authors: ['Russ Tedrake'],
    year: 2024,
    venue: 'MIT course notes',
    url: 'https://underactuated.mit.edu/',
    type: 'docs',
  },
  {
    // Verified via the publisher DOI record (2026-08-11): Automatica 25(3),
    // 335-348. The canonical early survey of the industrial MPC lineage
    // (DMC, QDMC) and its theory.
    id: 'garcia-1989',
    title: 'Model Predictive Control: Theory and Practice - A Survey',
    authors: ['Carlos E. Garcia', 'David M. Prett', 'Manfred Morari'],
    year: 1989,
    venue: 'Automatica',
    url: 'https://doi.org/10.1016/0005-1098(89)90002-2',
    type: 'paper',
  },
  {
    // Verified via the publisher DOI record (2026-08-11): Automatica 36(6),
    // 789-814. Establishes the stability conditions (terminal cost and
    // constraint set) that made receding-horizon MPC a rigorous method.
    id: 'mayne-2000',
    title:
      'Constrained Model Predictive Control: Stability and Optimality',
    authors: [
      'David Q. Mayne',
      'James B. Rawlings',
      'Christopher V. Rao',
      'Pierre O. M. Scokaert',
    ],
    year: 2000,
    venue: 'Automatica',
    url: 'https://doi.org/10.1016/S0005-1098(99)00214-9',
    type: 'paper',
  },
  {
    // Verified via the publisher DOI record (2026-08-11): Control
    // Engineering Practice 11(7), 733-764. Survey of industrial MPC
    // technology reporting thousands of installed applications, the
    // majority in refining and petrochemicals.
    id: 'qin-badgwell-2003',
    title: 'A Survey of Industrial Model Predictive Control Technology',
    authors: ['S. Joe Qin', 'Thomas A. Badgwell'],
    year: 2003,
    venue: 'Control Engineering Practice',
    url: 'https://doi.org/10.1016/S0967-0661(02)00186-7',
    type: 'paper',
  },
  {
    // Verified against the IEEE Xplore record (2026-08-11): IROS 2018.
    // Convex MPC on the MIT Cheetah 3: single-rigid-body simplification,
    // prediction horizons up to 0.5 s, QP solved in under 1 ms at 20-30 Hz.
    id: 'di-carlo-2018',
    title:
      'Dynamic Locomotion in the MIT Cheetah 3 Through Convex Model-Predictive Control',
    authors: [
      'Jared Di Carlo',
      'Patrick M. Wensing',
      'Benjamin Katz',
      'Gerardo Bledt',
      'Sangbae Kim',
    ],
    year: 2018,
    venue: 'IEEE/RSJ IROS',
    url: 'https://doi.org/10.1109/IROS.2018.8594448',
    type: 'paper',
  },
  {
    // DOI verified via Crossref (2026-08-11): IEEE Journal on Robotics and
    // Automation 3(1):43-53. The operational-space formulation that puts
    // task-space dynamics at the center of manipulator force/motion
    // control; ancestor of modern whole-body control.
    id: 'khatib-1987',
    title:
      'A Unified Approach for Motion and Force Control of Robot Manipulators: The Operational Space Formulation',
    authors: ['Oussama Khatib'],
    year: 1987,
    venue: 'IEEE J. Robotics and Automation',
    url: 'https://doi.org/10.1109/JRA.1987.1087068',
    type: 'paper',
  },
  {
    // DOI verified via Crossref (2026-08-11): International Journal of
    // Humanoid Robotics 2(4):505-518. Whole-body hierarchical control of
    // task primitives under joint and postural constraints.
    id: 'sentis-khatib-2005',
    title:
      'Synthesis of Whole-Body Behaviors through Hierarchical Control of Behavioral Primitives',
    authors: ['Luis Sentis', 'Oussama Khatib'],
    year: 2005,
    venue: 'Int. J. Humanoid Robotics',
    url: 'https://doi.org/10.1142/S0219843605000594',
    type: 'paper',
  },
  {
    // Verified 2026-08-11: the DOI resolves to the ASME Journal of Basic
    // Engineering record (82(1):35-45, March 1960). ASME bot-walls curl
    // (403) exactly like the other ASME DOIs already in this registry; the
    // link is live in a browser. The recursive linear filter paper that the
    // state-estimation module is built around.
    id: 'kalman-1960-filter',
    title: 'A New Approach to Linear Filtering and Prediction Problems',
    authors: ['Rudolf E. Kalman'],
    year: 1960,
    venue: 'J. Basic Engineering',
    url: 'https://doi.org/10.1115/1.3662552',
    type: 'paper',
  },
  {
    // Verified against the NTRS record (2026-08-11): NASA TM-86847,
    // November 1985, NASA's own history of the filter's adoption. The
    // "Extended Kalman Filter" section documents the Ames group's move
    // from linearizing about a nominal trajectory to relinearizing about
    // the current estimate, the modification Apollo navigation used.
    id: 'mcgee-schmidt-1985',
    title:
      'Discovery of the Kalman Filter as a Practical Tool for Aerospace and Industry',
    authors: ['Leonard A. McGee', 'Stanley F. Schmidt'],
    year: 1985,
    venue: 'NASA TM-86847',
    url: 'https://ntrs.nasa.gov/citations/19860003843',
    type: 'paper',
  },
  {
    // The canonical textbook for the Bayes-filter framing (ch. 2) and the
    // Kalman/EKF family (ch. 3). The book's own site was down at
    // verification time; the MIT Press page bot-walls curl (403) but is
    // live in a browser (2026-08-11), same handling as the bot-walled
    // publisher DOIs in this registry.
    id: 'thrun-2005',
    title: 'Probabilistic Robotics',
    authors: ['Sebastian Thrun', 'Wolfram Burgard', 'Dieter Fox'],
    year: 2005,
    venue: 'MIT Press',
    url: 'https://mitpress.mit.edu/9780262201629/probabilistic-robotics/',
    type: 'docs',
  },
  {
    // Springer chapter DOI verified resolving (2026-08-11), in Autonomous
    // Robot Vehicles, pp. 167-193. The canonical reference for reasoning
    // about uncertain spatial relationships with covariance, the technical
    // root of EKF-based mapping.
    id: 'smith-1990',
    title: 'Estimating Uncertain Spatial Relationships in Robotics',
    authors: ['Randall C. Smith', 'Matthew Self', 'Peter Cheeseman'],
    year: 1990,
    venue: 'Autonomous Robot Vehicles',
    url: 'https://doi.org/10.1007/978-1-4613-8997-2_14',
    type: 'paper',
  },
  {
    // SPIE proceedings DOI verified resolving (2026-08-11): Signal
    // Processing, Sensor Fusion, and Target Recognition VI, 3068:182-193.
    // Introduces the unscented transform: deterministic sigma points pushed
    // through the true nonlinearity instead of analytic linearization.
    id: 'julier-uhlmann-1997',
    title: 'New Extension of the Kalman Filter to Nonlinear Systems',
    authors: ['Simon J. Julier', 'Jeffrey K. Uhlmann'],
    year: 1997,
    venue: 'Proc. SPIE 3068',
    url: 'https://doi.org/10.1117/12.280797',
    type: 'paper',
  },
  {
    // IEEE Trans. Information Theory 47(2):498-519; DOI verified
    // 2026-08-11 (IEEE answers bots with a 202 challenge page, live in a
    // browser). The paper that unified inference on factor graphs under
    // the sum-product algorithm.
    id: 'kschischang-2001',
    title: 'Factor Graphs and the Sum-Product Algorithm',
    authors: [
      'Frank R. Kschischang',
      'Brendan J. Frey',
      'Hans-Andrea Loeliger',
    ],
    year: 2001,
    venue: 'IEEE Trans. Information Theory',
    url: 'https://doi.org/10.1109/18.910572',
    type: 'paper',
  },
  {
    // IJRR 25(12):1181-1203; SAGE bot-walls curl (403) but the DOI is live
    // in a browser (2026-08-11), same handling as the other SAGE entries.
    // Reframes SLAM as smoothing: factor the information matrix once and
    // the whole trajectory falls out.
    id: 'dellaert-kaess-2006',
    title:
      'Square Root SAM: Simultaneous Localization and Mapping via Square Root Information Smoothing',
    authors: ['Frank Dellaert', 'Michael Kaess'],
    year: 2006,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/0278364906072768',
    type: 'paper',
  },
  {
    // IEEE Trans. Robotics 24(6):1365-1378; DOI verified 2026-08-11.
    // Incremental smoothing: update only the part of the factorization a
    // new measurement touches.
    id: 'kaess-2008',
    title: 'iSAM: Incremental Smoothing and Mapping',
    authors: ['Michael Kaess', 'Ananth Ranganathan', 'Frank Dellaert'],
    year: 2008,
    venue: 'IEEE Trans. Robotics',
    url: 'https://doi.org/10.1109/TRO.2008.2006706',
    type: 'paper',
  },
  {
    // IJRR 31(2):216-235; SAGE bot-walls curl (403) but the DOI is live in
    // a browser (2026-08-11). Organizes the factor graph into the Bayes
    // tree so incremental updates stay local as the graph grows.
    id: 'kaess-2012',
    title: 'iSAM2: Incremental Smoothing and Mapping Using the Bayes Tree',
    authors: [
      'Michael Kaess',
      'Hordur Johannsson',
      'Richard Roberts',
      'Viorela Ila',
      'John J. Leonard',
      'Frank Dellaert',
    ],
    year: 2012,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/0278364911430419',
    type: 'paper',
  },
  {
    // IEEE Trans. Robotics 32(6):1309-1332; arXiv abs page verified
    // 2026-08-11. The survey records the field's move from EKF-based SLAM
    // to factor-graph smoothing and names the open problems.
    id: 'cadena-2016',
    title:
      'Past, Present, and Future of Simultaneous Localization and Mapping: Toward the Robust-Perception Age',
    authors: [
      'Cesar Cadena',
      'Luca Carlone',
      'Henry Carrillo',
      'Yasir Latif',
      'Davide Scaramuzza',
      'Jose Neira',
      'Ian Reid',
      'John J. Leonard',
    ],
    year: 2016,
    venue: 'IEEE Trans. Robotics',
    arxiv: '1606.05830',
    url: 'https://arxiv.org/abs/1606.05830',
    type: 'paper',
  },
  {
    // IEEE Trans. Robotics 33(1):1-21; arXiv abs page verified 2026-08-11.
    // On-manifold preintegration collapses the high-rate IMU stream
    // between two keyframes into a single factor, which is what makes
    // inertial data practical inside a factor graph.
    id: 'forster-2017',
    title:
      'On-Manifold Preintegration for Real-Time Visual-Inertial Odometry',
    authors: [
      'Christian Forster',
      'Luca Carlone',
      'Frank Dellaert',
      'Davide Scaramuzza',
    ],
    year: 2017,
    venue: 'IEEE Trans. Robotics',
    arxiv: '1512.02363',
    url: 'https://arxiv.org/abs/1512.02363',
    type: 'paper',
  },
  {
    // Project site verified live (2026-08-11). GTSAM is the reference
    // implementation of factor-graph smoothing and the Bayes tree, used
    // across visual-inertial odometry and offline mapping.
    id: 'gtsam-2026',
    title: 'GTSAM: Georgia Tech Smoothing and Mapping',
    authors: ['Frank Dellaert', 'GTSAM Contributors'],
    year: 2026,
    url: 'https://gtsam.org/',
    type: 'docs',
  },
];

const BY_ID = new Map(CITATIONS.map((c) => [c.id, c]));

export function getCitation(id: string): Citation | undefined {
  return BY_ID.get(id);
}

/**
 * Inline chip label, e.g. "Zhao 2023". Organization authors
 * ("Physical Intelligence") keep their full name instead of a surname.
 * SURNAME_OVERRIDES pins multi-word surnames that naive last-token
 * splitting gets wrong ("Jared Di Carlo" -> "Di Carlo", not "Carlo").
 * A particle heuristic is unsafe here: "Di Huang" keeps surname "Huang".
 */
const SURNAME_OVERRIDES = new Map<string, string>([
  ['Jared Di Carlo', 'Di Carlo'],
]);
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
  const surname = SURNAME_OVERRIDES.get(firstAuthor) ?? tokens.at(-1) ?? firstAuthor;
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
