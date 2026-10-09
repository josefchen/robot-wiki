/**
 * Citation registry: the single source of truth for sources.
 *
 * MDX content cites these via <Cite id="..."/>; scripts/validate-content.ts
 * fails the build if a module references an id that is not registered here.
 * Add entries from the /research reports only; never invent arXiv ids, urls,
 * or author lists.
 *
 * AUTHOR-FIELD POLICY (binding since 2026-08-20): render what the source
 * publishes. If Crossref or the publisher's own byline gives an initial,
 * keep the initial; do not expand it from memory or from a web search of a
 * name you think you recognise — expanding an initial into a full given
 * name the source never printed is invention about a named person, the
 * defect this rule was written after (five fabricated given names landed in
 * one session with every DOI verified). Expanding is acceptable ONLY when
 * a record that genuinely transcribes or states the byline corroborates
 * it: the publisher's landing page or PDF byline, a DBLP publication
 * record, or the ORCID profile of the correct person with this work
 * actually listed (verify the affiliation and subject area match the
 * paper before trusting an ORCID). An aggregator's DISPLAY NAME is a
 * cluster-level guess about identity, NOT corroboration — OpenAlex
 * display_name mis-clustered doi:10.1007/BF01840373 onto a different
 * Mishra on 2026-08-20. OpenAlex's raw_author_name does transcribe the
 * byline, so it counts only where it actually prints the full name.
 * Where no transcription exists, keep the initial, and say where the full
 * name came from in the entry comment when one does. This is the same
 * principle the DOI/arXiv rules above already bind, applied to the author
 * field. `npm run check:crossref-authors` (run it whenever a citation is
 * added or an author field is edited) compares every DOI-bearing entry
 * against api.crossref.org and every arXiv-url entry against the arXiv
 * Atom API, flagging family-name, year and title mismatches plus exactly
 * this expansion pattern; byline-backed expansions are documented in
 * data/crossref-author-exceptions.ts, one authorIndex per entry — a
 * blanket entry there is rejected by the sweep.
 *
 * Urls are https. The one sanctioned exception pattern, for a canonical
 * source genuinely served over http only, is a DATED web.archive.org
 * capture (https://web.archive.org/web/<timestamp>/<original-url>); the
 * schema enforces the dated form and there is no http allowlist. Keep the
 * real author, title, venue and original year in the entry and name the
 * original location in the entry comment (precedent: Sutton, The Bitter
 * Lesson; see data/schemas/citation.ts).
 *
 * Two checkers sweep this registry on demand, never in the build:
 * `npm run check:links` (liveness: status, Crossref fallback for bot-walled
 * DOIs, documented exceptions in data/link-check-exceptions.ts) and
 * `npm run check:citations` (audit grade: redirect chain plus a fetched-
 * title-vs-registry-title plausibility check, so a URL that 200s but serves
 * a different document fails instead of passing).
 *
 * Type-only relative import so this file loads under plain node, Vitest, and
 * Next.js alike.
 */
import type { Citation } from './schemas/citation.ts';

export type { Citation } from './schemas/citation.ts';

export const CITATIONS: Citation[] = [
  {
    id: 'act-reference-2023',
    title: 'ACT reference implementation: imitate_episodes.py (76cf30b)',
    authors: ['tonyzhaozh'],
    year: 2023,
    url: 'https://github.com/tonyzhaozh/act/blob/76cf30b4fed1d72dafbc3e1c270c0839d57e8bcf/imitate_episodes.py',
    type: 'docs',
  },
  {
    id: 'alvinn-1988',
    title: 'ALVINN: An Autonomous Land Vehicle in a Neural Network',
    authors: ['Dean A. Pomerleau'],
    year: 1988,
    venue: 'Advances in Neural Information Processing Systems 1',
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
    // Landing metadata describes an extended journal version of the original RSS2023 paper.
    // Keep this eight-author work distinct from the explicitly cited original v1.
    arxiv: '2303.04137',
    url: 'https://arxiv.org/abs/2303.04137',
    type: 'paper',
  },
  {
    id: 'diffusion-policy-2023-v1',
    title: 'Diffusion Policy: Visuomotor Policy Learning via Action Diffusion',
    authors: [
      'Cheng Chi',
      'Siyuan Feng',
      'Yilun Du',
      'Zhenjia Xu',
      'Eric Cousineau',
      'Benjamin Burchfiel',
      'Shuran Song',
    ],
    year: 2023,
    // Original arXiv v1, 7 March 2023; not the later eight-author edition.
    arxiv: '2303.04137',
    url: 'https://arxiv.org/abs/2303.04137v1',
    type: 'paper',
  },
  {
    id: 'diffuser-2022',
    title: 'Planning with Diffusion for Flexible Behavior Synthesis',
    authors: [
      'Michael Janner',
      'Yilun Du',
      'Joshua B. Tenenbaum',
      'Sergey Levine',
    ],
    year: 2022,
    venue: 'ICML 2022',
    arxiv: '2205.09991',
    url: 'https://arxiv.org/abs/2205.09991',
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
    // Authors verified against the arXiv 2512.05964 abs page (2026-08-17,
    // audit-manipulation-iii): individual authors, not the lab name.
    id: 'training-time-rtc-2025',
    title: 'Training-Time Action Conditioning for Efficient Real-Time Chunking',
    authors: ['Kevin Black', 'Allen Z. Ren', 'Michael Equi', 'Sergey Levine'],
    year: 2025,
    arxiv: '2512.05964',
    url: 'https://arxiv.org/abs/2512.05964',
    type: 'paper',
  },
  {
    // Title and authors verified against the arXiv abs page (2026-08-16);
    // the registry previously carried a descriptive label, not the paper's
    // title, and "NVIDIA Research" instead of the author list.
    id: 'vla-perf-2026',
    title:
      'How Fast Can I Run My VLA? Demystifying VLA Inference Performance with VLA-Perf',
    authors: ['Wenqi Jiang', 'Jason Clemons', 'Karu Sankaralingam', 'Christos Kozyrakis'],
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
    // Retained landing and PDF identify v2, 11 March 2019; no ICRA venue proof.
    venue: 'arXiv v2 (11 March 2019)',
    arxiv: '1810.02890',
    url: 'https://arxiv.org/abs/1810.02890',
    type: 'paper',
  },
  {
    id: 'rt1-2022',
    title: 'RT-1: Robotics Transformer for Real-World Control at Scale',
    // Full 51-author list from the arXiv abs page (completed 2026-08-17
    // during the manipulation-ii audit; the entry previously carried only
    // the first three names).
    authors: [
      'Anthony Brohan',
      'Noah Brown',
      'Justice Carbajal',
      'Yevgen Chebotar',
      'Joseph Dabis',
      'Chelsea Finn',
      'Keerthana Gopalakrishnan',
      'Karol Hausman',
      'Alex Herzog',
      'Jasmine Hsu',
      'Julian Ibarz',
      'Brian Ichter',
      'Alex Irpan',
      'Tomas Jackson',
      'Sally Jesmonth',
      'Nikhil J Joshi',
      'Ryan Julian',
      'Dmitry Kalashnikov',
      'Yuheng Kuang',
      'Isabel Leal',
      'Kuang-Huei Lee',
      'Sergey Levine',
      'Yao Lu',
      'Utsav Malla',
      'Deeksha Manjunath',
      'Igor Mordatch',
      'Ofir Nachum',
      'Carolina Parada',
      'Jodilyn Peralta',
      'Emily Perez',
      'Karl Pertsch',
      'Jornell Quiambao',
      'Kanishka Rao',
      'Michael Ryoo',
      'Grecia Salazar',
      'Pannag Sanketi',
      'Kevin Sayed',
      'Jaspiar Singh',
      'Sumedh Sontakke',
      'Austin Stone',
      'Clayton Tan',
      'Huong Tran',
      'Vincent Vanhoucke',
      'Steve Vega',
      'Quan Vuong',
      'Fei Xia',
      'Ted Xiao',
      'Peng Xu',
      'Sichun Xu',
      'Tianhe Yu',
      'Brianna Zitkovich',
    ],
    year: 2022,
    arxiv: '2212.06817',
    url: 'https://arxiv.org/html/2212.06817v2',
    type: 'paper',
  },
  {
    id: 'rt2-2023',
    title:
      'RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control',
    // Full 54-author list from the arXiv abs page (completed 2026-08-17
    // during the manipulation-ii audit; the entry previously carried only
    // the first three names).
    authors: [
      'Anthony Brohan',
      'Noah Brown',
      'Justice Carbajal',
      'Yevgen Chebotar',
      'Xi Chen',
      'Krzysztof Choromanski',
      'Tianli Ding',
      'Danny Driess',
      'Avinava Dubey',
      'Chelsea Finn',
      'Pete Florence',
      'Chuyuan Fu',
      'Montse Gonzalez Arenas',
      'Keerthana Gopalakrishnan',
      'Kehang Han',
      'Karol Hausman',
      'Alexander Herzog',
      'Jasmine Hsu',
      'Brian Ichter',
      'Alex Irpan',
      'Nikhil Joshi',
      'Ryan Julian',
      'Dmitry Kalashnikov',
      'Yuheng Kuang',
      'Isabel Leal',
      'Lisa Lee',
      'Tsang-Wei Edward Lee',
      'Sergey Levine',
      'Yao Lu',
      'Henryk Michalewski',
      'Igor Mordatch',
      'Karl Pertsch',
      'Kanishka Rao',
      'Krista Reymann',
      'Michael Ryoo',
      'Grecia Salazar',
      'Pannag Sanketi',
      'Pierre Sermanet',
      'Jaspiar Singh',
      'Anikait Singh',
      'Radu Soricut',
      'Huong Tran',
      'Vincent Vanhoucke',
      'Quan Vuong',
      'Ayzaan Wahid',
      'Stefan Welker',
      'Paul Wohlhart',
      'Jialin Wu',
      'Fei Xia',
      'Ted Xiao',
      'Peng Xu',
      'Sichun Xu',
      'Tianhe Yu',
      'Brianna Zitkovich',
    ],
    year: 2023,
    arxiv: '2307.15818',
    url: 'https://arxiv.org/abs/2307.15818',
    type: 'paper',
  },
  {
    // Inspected source: arXiv v9, 14 May 2025; source-event proof is in the
    // OXE source-only packet. The 22-embodiment pool is distinct from the
    // nine-embodiment RT-X training subset. RT-1-X gains are scoped to
    // small-data domains; ordinary RT-2-X generalization is roughly on par.
    // The abstract names 21 institutions; Section III-A names 34 labs.
    // Preserve the collective and all 293 named arXiv metadata authors.
    id: 'open-x-embodiment-2023',
    title:
      'Open X-Embodiment: Robotic Learning Datasets and RT-X Models',
    authors: [
      "Open X-Embodiment Collaboration",
      "Abby O'Neill",
      "Abdul Rehman",
      "Abhinav Gupta",
      "Abhiram Maddukuri",
      "Abhishek Gupta",
      "Abhishek Padalkar",
      "Abraham Lee",
      "Acorn Pooley",
      "Agrim Gupta",
      "Ajay Mandlekar",
      "Ajinkya Jain",
      "Albert Tung",
      "Alex Bewley",
      "Alex Herzog",
      "Alex Irpan",
      "Alexander Khazatsky",
      "Anant Rai",
      "Anchit Gupta",
      "Andrew Wang",
      "Andrey Kolobov",
      "Anikait Singh",
      "Animesh Garg",
      "Aniruddha Kembhavi",
      "Annie Xie",
      "Anthony Brohan",
      "Antonin Raffin",
      "Archit Sharma",
      "Arefeh Yavary",
      "Arhan Jain",
      "Ashwin Balakrishna",
      "Ayzaan Wahid",
      "Ben Burgess-Limerick",
      "Beomjoon Kim",
      "Bernhard Schölkopf",
      "Blake Wulfe",
      "Brian Ichter",
      "Cewu Lu",
      "Charles Xu",
      "Charlotte Le",
      "Chelsea Finn",
      "Chen Wang",
      "Chenfeng Xu",
      "Cheng Chi",
      "Chenguang Huang",
      "Christine Chan",
      "Christopher Agia",
      "Chuer Pan",
      "Chuyuan Fu",
      "Coline Devin",
      "Danfei Xu",
      "Daniel Morton",
      "Danny Driess",
      "Daphne Chen",
      "Deepak Pathak",
      "Dhruv Shah",
      "Dieter Büchler",
      "Dinesh Jayaraman",
      "Dmitry Kalashnikov",
      "Dorsa Sadigh",
      "Edward Johns",
      "Ethan Foster",
      "Fangchen Liu",
      "Federico Ceola",
      "Fei Xia",
      "Feiyu Zhao",
      "Felipe Vieira Frujeri",
      "Freek Stulp",
      "Gaoyue Zhou",
      "Gaurav S. Sukhatme",
      "Gautam Salhotra",
      "Ge Yan",
      "Gilbert Feng",
      "Giulio Schiavi",
      "Glen Berseth",
      "Gregory Kahn",
      "Guangwen Yang",
      "Guanzhi Wang",
      "Hao Su",
      "Hao-Shu Fang",
      "Haochen Shi",
      "Henghui Bao",
      "Heni Ben Amor",
      "Henrik I Christensen",
      "Hiroki Furuta",
      "Homanga Bharadhwaj",
      "Homer Walke",
      "Hongjie Fang",
      "Huy Ha",
      "Igor Mordatch",
      "Ilija Radosavovic",
      "Isabel Leal",
      "Jacky Liang",
      "Jad Abou-Chakra",
      "Jaehyung Kim",
      "Jaimyn Drake",
      "Jan Peters",
      "Jan Schneider",
      "Jasmine Hsu",
      "Jay Vakil",
      "Jeannette Bohg",
      "Jeffrey Bingham",
      "Jeffrey Wu",
      "Jensen Gao",
      "Jiaheng Hu",
      "Jiajun Wu",
      "Jialin Wu",
      "Jiankai Sun",
      "Jianlan Luo",
      "Jiayuan Gu",
      "Jie Tan",
      "Jihoon Oh",
      "Jimmy Wu",
      "Jingpei Lu",
      "Jingyun Yang",
      "Jitendra Malik",
      "João Silvério",
      "Joey Hejna",
      "Jonathan Booher",
      "Jonathan Tompson",
      "Jonathan Yang",
      "Jordi Salvador",
      "Joseph J. Lim",
      "Junhyek Han",
      "Kaiyuan Wang",
      "Kanishka Rao",
      "Karl Pertsch",
      "Karol Hausman",
      "Keegan Go",
      "Keerthana Gopalakrishnan",
      "Ken Goldberg",
      "Kendra Byrne",
      "Kenneth Oslund",
      "Kento Kawaharazuka",
      "Kevin Black",
      "Kevin Lin",
      "Kevin Zhang",
      "Kiana Ehsani",
      "Kiran Lekkala",
      "Kirsty Ellis",
      "Krishan Rana",
      "Krishnan Srinivasan",
      "Kuan Fang",
      "Kunal Pratap Singh",
      "Kuo-Hao Zeng",
      "Kyle Hatch",
      "Kyle Hsu",
      "Laurent Itti",
      "Lawrence Yunliang Chen",
      "Lerrel Pinto",
      "Li Fei-Fei",
      "Liam Tan",
      "Linxi \"Jim\" Fan",
      "Lionel Ott",
      "Lisa Lee",
      "Luca Weihs",
      "Magnum Chen",
      "Marion Lepert",
      "Marius Memmel",
      "Masayoshi Tomizuka",
      "Masha Itkina",
      "Mateo Guaman Castro",
      "Max Spero",
      "Maximilian Du",
      "Michael Ahn",
      "Michael C. Yip",
      "Mingtong Zhang",
      "Mingyu Ding",
      "Minho Heo",
      "Mohan Kumar Srirama",
      "Mohit Sharma",
      "Moo Jin Kim",
      "Muhammad Zubair Irshad",
      "Naoaki Kanazawa",
      "Nicklas Hansen",
      "Nicolas Heess",
      "Nikhil J Joshi",
      "Niko Suenderhauf",
      "Ning Liu",
      "Norman Di Palo",
      "Nur Muhammad Mahi Shafiullah",
      "Oier Mees",
      "Oliver Kroemer",
      "Osbert Bastani",
      "Pannag R Sanketi",
      "Patrick \"Tree\" Miller",
      "Patrick Yin",
      "Paul Wohlhart",
      "Peng Xu",
      "Peter David Fagan",
      "Peter Mitrano",
      "Pierre Sermanet",
      "Pieter Abbeel",
      "Priya Sundaresan",
      "Qiuyu Chen",
      "Quan Vuong",
      "Rafael Rafailov",
      "Ran Tian",
      "Ria Doshi",
      "Roberto Martín-Martín",
      "Rohan Baijal",
      "Rosario Scalise",
      "Rose Hendrix",
      "Roy Lin",
      "Runjia Qian",
      "Ruohan Zhang",
      "Russell Mendonca",
      "Rutav Shah",
      "Ryan Hoque",
      "Ryan Julian",
      "Samuel Bustamante",
      "Sean Kirmani",
      "Sergey Levine",
      "Shan Lin",
      "Sherry Moore",
      "Shikhar Bahl",
      "Shivin Dass",
      "Shubham Sonawani",
      "Shubham Tulsiani",
      "Shuran Song",
      "Sichun Xu",
      "Siddhant Haldar",
      "Siddharth Karamcheti",
      "Simeon Adebola",
      "Simon Guist",
      "Soroush Nasiriany",
      "Stefan Schaal",
      "Stefan Welker",
      "Stephen Tian",
      "Subramanian Ramamoorthy",
      "Sudeep Dasari",
      "Suneel Belkhale",
      "Sungjae Park",
      "Suraj Nair",
      "Suvir Mirchandani",
      "Takayuki Osa",
      "Tanmay Gupta",
      "Tatsuya Harada",
      "Tatsuya Matsushima",
      "Ted Xiao",
      "Thomas Kollar",
      "Tianhe Yu",
      "Tianli Ding",
      "Todor Davchev",
      "Tony Z. Zhao",
      "Travis Armstrong",
      "Trevor Darrell",
      "Trinity Chung",
      "Vidhi Jain",
      "Vikash Kumar",
      "Vincent Vanhoucke",
      "Vitor Guizilini",
      "Wei Zhan",
      "Wenxuan Zhou",
      "Wolfram Burgard",
      "Xi Chen",
      "Xiangyu Chen",
      "Xiaolong Wang",
      "Xinghao Zhu",
      "Xinyang Geng",
      "Xiyuan Liu",
      "Xu Liangwei",
      "Xuanlin Li",
      "Yansong Pang",
      "Yao Lu",
      "Yecheng Jason Ma",
      "Yejin Kim",
      "Yevgen Chebotar",
      "Yifan Zhou",
      "Yifeng Zhu",
      "Yilin Wu",
      "Ying Xu",
      "Yixuan Wang",
      "Yonatan Bisk",
      "Yongqiang Dou",
      "Yoonyoung Cho",
      "Youngwoon Lee",
      "Yuchen Cui",
      "Yue Cao",
      "Yueh-Hua Wu",
      "Yujin Tang",
      "Yuke Zhu",
      "Yunchu Zhang",
      "Yunfan Jiang",
      "Yunshuang Li",
      "Yunzhu Li",
      "Yusuke Iwasawa",
      "Yutaka Matsuo",
      "Zehan Ma",
      "Zhuo Xu",
      "Zichen Jeff Cui",
      "Zichen Zhang",
      "Zipeng Fu",
      "Zipeng Lin",
    ],
    year: 2023,
    arxiv: '2310.08864',
    url: 'https://arxiv.org/abs/2310.08864',
    type: 'paper',
  },
  {
    id: 'octo-2024',
    title: 'Octo: An Open-Source Generalist Robot Policy',
    // Twenty byline entries, including Octo Model Team, in explicit arXiv v2.
    // The landing metadata omits Ria Doshi; this entry cites the v2 body.
    authors: [
      'Octo Model Team',
      'Dibya Ghosh',
      'Homer Walke',
      'Karl Pertsch',
      'Kevin Black',
      'Oier Mees',
      'Sudeep Dasari',
      'Joey Hejna',
      'Tobias Kreiman',
      'Ria Doshi',
      'Charles Xu',
      'Jianlan Luo',
      'You Liang Tan',
      'Lawrence Yunliang Chen',
      'Pannag Sanketi',
      'Quan Vuong',
      'Ted Xiao',
      'Dorsa Sadigh',
      'Chelsea Finn',
      'Sergey Levine',
    ],
    year: 2024,
    arxiv: '2405.12213',
    url: 'https://arxiv.org/html/2405.12213v2',
    type: 'paper',
  },
  {
    id: 'openvla-2024',
    title: 'OpenVLA: An Open-Source Vision-Language-Action Model',
    // Full 18-author list from the arXiv abs page (completed 2026-08-17
    // during the manipulation-ii audit).
    authors: [
      'Moo Jin Kim',
      'Karl Pertsch',
      'Siddharth Karamcheti',
      'Ted Xiao',
      'Ashwin Balakrishna',
      'Suraj Nair',
      'Rafael Rafailov',
      'Ethan Foster',
      'Grace Lam',
      'Pannag Sanketi',
      'Quan Vuong',
      'Thomas Kollar',
      'Benjamin Burchfiel',
      'Russ Tedrake',
      'Dorsa Sadigh',
      'Sergey Levine',
      'Percy Liang',
      'Chelsea Finn',
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
    title: 'VLAs that Train Fast, Run Fast, and Generalize Better',
    // Eleven named authors printed on the separate research note.
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
    url: 'https://www.pi.website/research/knowledge_insulation',
    type: 'blog',
    // The displayed heading and page title match this research-note title.
    // Distinct from the separately registered Knowledge Insulation paper.
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
    // Where2Place point-in-mask accuracies (46.77% RoboPoint, 29.06%
    // GPT-4o, means over three runs) are reported in Table 2 of the paper.
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
    // Author list re-verified against the DBLP record 2026-08-20 (arXiv
    // author sweep): DBLP (journals/corr/abs-2504-16054) transcribes the
    // arXiv byline as 36 entries, "Physical Intelligence, Kevin Black,
    // Noah Brown, ... Ury Zhilinsky" — the org credit is the first
    // element of the published byline itself, so the registry holds the
    // full transcribed sequence rather than the previous "first three
    // named" sample. Registry order = DBLP order.
    id: 'pi05-2025',
    title:
      'π0.5: a Vision-Language-Action Model with Open-World Generalization',
    authors: [
      'Physical Intelligence',
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
    // Explicit v1 source; the retained packet does not establish CoRL 2025.
    arxiv: '2504.16054',
    url: 'https://arxiv.org/html/2504.16054v1',
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
    arxiv: '2505.23705',
    url: 'https://arxiv.org/abs/2505.23705',
    type: 'paper',
  },
  {
    // Dated official model card; it does not establish model-specific licensing.
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
    // Title capitalization as printed on the PDF's title page.
    title: 'π*0.6: a VLA That Learns From Experience',
    // 55 named authors from the blog's own author list (the PDF title page
    // carries the same team); audit/README.md convention: named authors
    // wherever a list exists, org-as-author only when none does.
    authors: [
      'Ali Amin',
      'Raichelle Aniceto',
      'Ashwin Balakrishna',
      'Kevin Black',
      'Ken Conley',
      'Grace Connors',
      'James Darpinian',
      'Karan Dhabalia',
      'Jared DiCarlo',
      'Danny Driess',
      'Michael Equi',
      'Adnan Esmail',
      'Yunhao Fang',
      'Chelsea Finn',
      'Catherine Glossop',
      'Thomas Godden',
      'Ivan Goryachev',
      'Lachy Groom',
      'Hunter Hancock',
      'Karol Hausman',
      'Gashon Hussein',
      'Brian Ichter',
      'Szymon Jakubczak',
      'Rowan Jen',
      'Tim Jones',
      'Ben Katz',
      'Liyiming Ke',
      'Chandra Kuchi',
      'Marinda Lamb',
      'Devin LeBlanc',
      'Sergey Levine',
      'Adrian Li-Bell',
      'Yao Lu',
      'Vishnu Mano',
      'Mohith Mothukuri',
      'Suraj Nair',
      'Karl Pertsch',
      'Allen Z. Ren',
      'Charvi Sharma',
      'Lucy Xiaoyang Shi',
      'Laura Smith',
      'Jost Tobias Springenberg',
      'Kyle Stachowicz',
      'Will Stoeckle',
      'Alex Swerdlow',
      'James Tanner',
      'Marcel Torne',
      'Quan Vuong',
      'Anna Walling',
      'Haohuan Wang',
      'Blake Williams',
      'Sukwon Yoo',
      'Lili Yu',
      'Ury Zhilinsky',
      'Zhiyuan Zhou',
    ],
    year: 2025,
    url: 'https://www.pi.website/download/pistar06.pdf',
    type: 'docs',
  },
  {
    // MEM lab PDF; no arXiv id as of 2026-08. Title corrected against the
    // PDF's own title page (2026-08-16): the registry previously carried a
    // paraphrase, not the paper's title.
    id: 'mem-2026',
    title: 'MEM: Multi-Scale Embodied Memory for Vision Language Action Models',
    authors: [
      'Marcel Torne',
      'Karl Pertsch',
      'Homer Walke',
      'Kyle Vedder',
      'Suraj Nair',
      'Brian Ichter',
      'Allen Z. Ren',
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
    // 87-author lab PDF; no arXiv id as of 2026-08.
    id: 'pi07-2026',
    // Title as printed on the PDF's first page; the blog twin (pi07-blog-2026)
    // uses the shorter headline.
    title:
      'π0.7: a Steerable Generalist Robotic Foundation Model with Emergent Capabilities',
    // 87 named authors from the PDF's own title page (the blog twin
    // pi07-blog-2026 lists the same team, name for name).
    authors: [
      'Bo Ai',
      'Ali Amin',
      'Raichelle Aniceto',
      'Ashwin Balakrishna',
      'Greg Balke',
      'Kevin Black',
      'George Bokinsky',
      'Shihao Cao',
      'Thomas Charbonnier',
      'Vedant Choudhary',
      'Foster Collins',
      'Ken Conley',
      'Grace Connors',
      'James Darpinian',
      'Karan Dhabalia',
      'Maitrayee Dhaka',
      'Jared DiCarlo',
      'Danny Driess',
      'Michael Equi',
      'Adnan Esmail',
      'Yunhao Fang',
      'Chelsea Finn',
      'Catherine Glossop',
      'Thomas Godden',
      'Ivan Goryachev',
      'Lachlan Groom',
      'Haroun Habeeb',
      'Hunter Hancock',
      'Karol Hausman',
      'Gashon Hussein',
      'Victor Hwang',
      'Brian Ichter',
      'Connor Jacobsen',
      'Szymon Jakubczak',
      'Rowan Jen',
      'Tim Jones',
      'Gregg Kammerer',
      'Ben Katz',
      'Liyiming Ke',
      'Mairbek Khadikov',
      'Chandra Kuchi',
      'Marinda Lamb',
      'Devin LeBlanc',
      'Brendon LeCount',
      'Sergey Levine',
      'Xinyu Li',
      'Adrian Li-Bell',
      'Vladislav Lialin',
      'Zhonglin Liang',
      'Wallace Lim',
      'Yao Lu',
      'Enyu Luo',
      'Vishnu Mano',
      'Nandan Marwaha',
      'Aikys Mongush',
      'Liam Murphy',
      'Suraj Nair',
      'Tyler Patterson',
      'Karl Pertsch',
      'Allen Z. Ren',
      'Gavin Schelske',
      'Charvi Sharma',
      'Baifeng Shi',
      'Lucy Xiaoyang Shi',
      'Laura Smith',
      'Jost Tobias Springenberg',
      'Kyle Stachowicz',
      'Will Stoeckle',
      'Jiaming Tang',
      'Jimmy Tanner',
      'Shalom Tekeste',
      'Marcel Torne',
      'Kyle Vedder',
      'Quan Vuong',
      'Anna Walling',
      'Haohuan Wang',
      'Jason Wang',
      'XuDong Wang',
      'Chris Whalen',
      'Samuel Whitmore',
      'Blake Williams',
      'Charles Xu',
      'Sukwon Yoo',
      'Lili Yu',
      'Wuming Zhang',
      'Zhuoyang Zhang',
      'Ury Zhilinsky',
    ],
    year: 2026,
    url: 'https://www.pi.website/download/pi07.pdf',
    type: 'docs',
  },
  {
    // Blog twin of pi07-2026; the air-fryer "reasonable attempt, part of the
    // task, not finished fully" passage appears in the blog text, not the PDF.
    id: 'pi07-blog-2026',
    title: 'π0.7: a Steerable Model with Emergent Capabilities',
    // 87 named authors as printed on the blog page itself, the same list the
    // pi07-2026 PDF title page carries.
    authors: [
      'Bo Ai',
      'Ali Amin',
      'Raichelle Aniceto',
      'Ashwin Balakrishna',
      'Greg Balke',
      'Kevin Black',
      'George Bokinsky',
      'Shihao Cao',
      'Thomas Charbonnier',
      'Vedant Choudhary',
      'Foster Collins',
      'Ken Conley',
      'Grace Connors',
      'James Darpinian',
      'Karan Dhabalia',
      'Maitrayee Dhaka',
      'Jared DiCarlo',
      'Danny Driess',
      'Michael Equi',
      'Adnan Esmail',
      'Yunhao Fang',
      'Chelsea Finn',
      'Catherine Glossop',
      'Thomas Godden',
      'Ivan Goryachev',
      'Lachlan Groom',
      'Haroun Habeeb',
      'Hunter Hancock',
      'Karol Hausman',
      'Gashon Hussein',
      'Victor Hwang',
      'Brian Ichter',
      'Connor Jacobsen',
      'Szymon Jakubczak',
      'Rowan Jen',
      'Tim Jones',
      'Gregg Kammerer',
      'Ben Katz',
      'Liyiming Ke',
      'Mairbek Khadikov',
      'Chandra Kuchi',
      'Marinda Lamb',
      'Devin LeBlanc',
      'Brendon LeCount',
      'Sergey Levine',
      'Xinyu Li',
      'Adrian Li-Bell',
      'Vladislav Lialin',
      'Zhonglin Liang',
      'Wallace Lim',
      'Yao Lu',
      'Enyu Luo',
      'Vishnu Mano',
      'Nandan Marwaha',
      'Aikys Mongush',
      'Liam Murphy',
      'Suraj Nair',
      'Tyler Patterson',
      'Karl Pertsch',
      'Allen Z. Ren',
      'Gavin Schelske',
      'Charvi Sharma',
      'Baifeng Shi',
      'Lucy Xiaoyang Shi',
      'Laura Smith',
      'Jost Tobias Springenberg',
      'Kyle Stachowicz',
      'Will Stoeckle',
      'Jiaming Tang',
      'Jimmy Tanner',
      'Shalom Tekeste',
      'Marcel Torne',
      'Kyle Vedder',
      'Quan Vuong',
      'Anna Walling',
      'Haohuan Wang',
      'Jason Wang',
      'XuDong Wang',
      'Chris Whalen',
      'Samuel Whitmore',
      'Blake Williams',
      'Charles Xu',
      'Sukwon Yoo',
      'Lili Yu',
      'Wuming Zhang',
      'Zhuoyang Zhang',
      'Ury Zhilinsky',
    ],
    year: 2026,
    url: 'https://www.pi.website/blog/pi07',
    type: 'blog',
  },
  {
    id: 'openpi-repo-2024',
    title: 'openpi',
    authors: ['Physical Intelligence'],
    // Stable ID retained. Year identifies the 24 August 2026 repository snapshot,
    // not first publication; README itself was last edited 21 November 2025.
    year: 2026,
    url: 'https://github.com/Physical-Intelligence/openpi/blob/215abfb217dbac7d5f1273282331b9b1866c0479/README.md',
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
    // 55 named authors as printed on the blog page itself; see the
    // pistar06-2025 entry for the separate PDF byline. The blog prints Gashon, not Gashun, Hussein.
    authors: [
      'Ali Amin',
      'Raichelle Aniceto',
      'Ashwin Balakrishna',
      'Kevin Black',
      'Ken Conley',
      'Grace Connors',
      'James Darpinian',
      'Karan Dhabalia',
      'Jared DiCarlo',
      'Danny Driess',
      'Michael Equi',
      'Adnan Esmail',
      'Yunhao Fang',
      'Chelsea Finn',
      'Catherine Glossop',
      'Thomas Godden',
      'Ivan Goryachev',
      'Lachy Groom',
      'Hunter Hancock',
      'Karol Hausman',
      'Gashon Hussein',
      'Brian Ichter',
      'Szymon Jakubczak',
      'Rowan Jen',
      'Tim Jones',
      'Ben Katz',
      'Liyiming Ke',
      'Chandra Kuchi',
      'Marinda Lamb',
      'Devin LeBlanc',
      'Sergey Levine',
      'Adrian Li-Bell',
      'Yao Lu',
      'Vishnu Mano',
      'Mohith Mothukuri',
      'Suraj Nair',
      'Karl Pertsch',
      'Allen Z. Ren',
      'Charvi Sharma',
      'Lucy Xiaoyang Shi',
      'Laura Smith',
      'Jost Tobias Springenberg',
      'Kyle Stachowicz',
      'Will Stoeckle',
      'Alex Swerdlow',
      'James Tanner',
      'Marcel Torne',
      'Quan Vuong',
      'Anna Walling',
      'Haohuan Wang',
      'Blake Williams',
      'Sukwon Yoo',
      'Lili Yu',
      'Ury Zhilinsky',
      'Zhiyuan Zhou',
    ],
    year: 2025,
    url: 'https://www.pi.website/blog/pistar06',
    type: 'blog',
  },
  {
    // Dated PI research note, December 16, 2025; heading and eight named authors.
    // Source body recovered 2026-09-08; this is not a review-date bump.
    id: 'pi-human-to-robot-2025',
    title: 'Emergence of Human to Robot Transfer in VLAs',
    authors: [
      'Simar Kareer',
      'Karl Pertsch',
      'James Darpinian',
      'Judy Hoffman',
      'Danfei Xu',
      'Sergey Levine',
      'Chelsea Finn',
      'Suraj Nair',
    ],
    year: 2025,
    url: 'https://www.pi.website/research/human_to_robot',
    type: 'blog',
  },
  {
    id: 'pi-real-time-chunking-blog-2025',
    title: 'Real-Time Action Chunking with Large Models',
    authors: ['Kevin Black', 'Manuel Y. Galliker', 'Sergey Levine'],
    year: 2025,
    url: 'https://www.pi.website/research/real_time_chunking',
    type: 'blog',
  },
  {
    id: 'gemini-robotics-2025',
    title: 'Gemini Robotics: Bringing AI into the Physical World',
    authors: [
      "Gemini Robotics Team",
      "Saminda Abeyruwan",
      "Joshua Ainslie",
      "Jean-Baptiste Alayrac",
      "Montserrat Gonzalez Arenas",
      "Travis Armstrong",
      "Ashwin Balakrishna",
      "Robert Baruch",
      "Maria Bauza",
      "Michiel Blokzijl",
      "Steven Bohez",
      "Konstantinos Bousmalis",
      "Anthony Brohan",
      "Thomas Buschmann",
      "Arunkumar Byravan",
      "Serkan Cabi",
      "Ken Caluwaerts",
      "Federico Casarini",
      "Oscar Chang",
      "Jose Enrique Chen",
      "Xi Chen",
      "Hao-Tien Lewis Chiang",
      "Krzysztof Choromanski",
      "David D’Ambrosio",
      "Sudeep Dasari",
      "Todor Davchev",
      "Coline Devin",
      "Norman Di Palo",
      "Tianli Ding",
      "Adil Dostmohamed",
      "Danny Driess",
      "Yilun Du",
      "Debidatta Dwibedi",
      "Michael Elabd",
      "Claudio Fantacci",
      "Cody Fong",
      "Erik Frey",
      "Chuyuan Fu",
      "Marissa Giustina",
      "Keerthana Gopalakrishnan",
      "Laura Graesser",
      "Leonard Hasenclever",
      "Nicolas Heess",
      "Brandon Hernaez",
      "Alexander Herzog",
      "R. Alex Hofer",
      "Jan Humplik",
      "Atil Iscen",
      "Mithun George Jacob",
      "Deepali Jain",
      "Ryan Julian",
      "Dmitry Kalashnikov",
      "M. Emre Karagozler",
      "Stefani Karp",
      "Chase Kew",
      "Jerad Kirkland",
      "Sean Kirmani",
      "Yuheng Kuang",
      "Thomas Lampe",
      "Antoine Laurens",
      "Isabel Leal",
      "Alex X. Lee",
      "Tsang-Wei Edward Lee",
      "Jacky Liang",
      "Yixin Lin",
      "Sharath Maddineni",
      "Anirudha Majumdar",
      "Assaf Hurwitz Michaely",
      "Robert Moreno",
      "Michael Neunert",
      "Francesco Nori",
      "Carolina Parada",
      "Emilio Parisotto",
      "Peter Pastor",
      "Acorn Pooley",
      "Kanishka Rao",
      "Krista Reymann",
      "Dorsa Sadigh",
      "Stefano Saliceti",
      "Pannag Sanketi",
      "Pierre Sermanet",
      "Dhruv Shah",
      "Mohit Sharma",
      "Kathryn Shea",
      "Charles Shu",
      "Vikas Sindhwani",
      "Sumeet Singh",
      "Radu Soricut",
      "Jost Tobias Springenberg",
      "Rachel Sterneck",
      "Razvan Surdulescu",
      "Jie Tan",
      "Jonathan Tompson",
      "Vincent Vanhoucke",
      "Jake Varley",
      "Grace Vesom",
      "Giulia Vezzani",
      "Oriol Vinyals",
      "Ayzaan Wahid",
      "Stefan Welker",
      "Paul Wohlhart",
      "Fei Xia",
      "Ted Xiao",
      "Annie Xie",
      "Jinyu Xie",
      "Peng Xu",
      "Sichun Xu",
      "Ying Xu",
      "Zhuo Xu",
      "Yuxiang Yang",
      "Rui Yao",
      "Sergey Yaroshenko",
      "Wenhao Yu",
      "Wentao Yuan",
      "Jingwei Zhang",
      "Tingnan Zhang",
      "Allan Zhou",
      "Yuxiang Zhou"
    ],
    year: 2025,
    arxiv: '2503.20020',
    url: 'https://arxiv.org/abs/2503.20020',
    type: 'paper',
  },
  {
    // v3 (28 Nov 2025): team plus all 172 individuals under Section 8 Authors.
    // The canonical abstract lists team plus 171 and omits Robert Baruch.
    // Preserve both accounts in the retained OXE/GR1.5 event-bound source packet;
    // Google DeepMind is the affiliation, not a substitute individual author.
    id: 'gemini-robotics-15-2025',
    title:
      'Gemini Robotics 1.5: Pushing the Frontier of Generalist Robots with Advanced Embodied Reasoning, Thinking, and Motion Transfer',
    authors: [
      "Gemini Robotics Team",
      "Abbas Abdolmaleki",
      "Saminda Abeyruwan",
      "Joshua Ainslie",
      "Jean-Baptiste Alayrac",
      "Montserrat Gonzalez Arenas",
      "Ashwin Balakrishna",
      "Robert Baruch",
      "Nathan Batchelor",
      "Alex Bewley",
      "Jeff Bingham",
      "Michael Bloesch",
      "Konstantinos Bousmalis",
      "Philemon Brakel",
      "Anthony Brohan",
      "Thomas Buschmann",
      "Arunkumar Byravan",
      "Serkan Cabi",
      "Ken Caluwaerts",
      "Federico Casarini",
      "Christine Chan",
      "Oscar Chang",
      "London Chappellet-Volpini",
      "Jose Enrique Chen",
      "Xi Chen",
      "Hao-Tien Lewis Chiang",
      "Krzysztof Choromanski",
      "Adrian Collister",
      "David B. D’Ambrosio",
      "Sudeep Dasari",
      "Todor Davchev",
      "Meet Kirankumar Dave",
      "Coline Devin",
      "Norman Di Palo",
      "Tianli Ding",
      "Carl Doersch",
      "Adil Dostmohamed",
      "Yilun Du",
      "Debidatta Dwibedi",
      "Sathish Thoppay Egambaram",
      "Michael Elabd",
      "Tom Erez",
      "Xiaolin Fang",
      "Claudio Fantacci",
      "Cody Fong",
      "Erik Frey",
      "Chuyuan Fu",
      "Ruiqi Gao",
      "Marissa Giustina",
      "Keerthana Gopalakrishnan",
      "Laura Graesser",
      "Oliver Groth",
      "Agrim Gupta",
      "Roland Hafner",
      "Steven Hansen",
      "Leonard Hasenclever",
      "Sam Haves",
      "Nicolas Heess",
      "Brandon Hernaez",
      "Alex Hofer",
      "Jasmine Hsu",
      "Lu Huang",
      "Sandy H. Huang",
      "Atil Iscen",
      "Mithun George Jacob",
      "Deepali Jain",
      "Sally Jesmonth",
      "Abhishek Jindal",
      "Ryan Julian",
      "Dmitry Kalashnikov",
      "M. Emre Karagozler",
      "Stefani Karp",
      "Matija Kecman",
      "J. Chase Kew",
      "Donnie Kim",
      "Frank Kim",
      "Junkyung Kim",
      "Thomas Kipf",
      "Sean Kirmani",
      "Ksenia Konyushkova",
      "Li Yang Ku",
      "Yuheng Kuang",
      "Thomas Lampe",
      "Antoine Laurens",
      "Tuan Anh Le",
      "Isabel Leal",
      "Alex X. Lee",
      "Tsang-Wei Edward Lee",
      "Guy Lever",
      "Jacky Liang",
      "Li-Heng Lin",
      "Fangchen Liu",
      "Shangbang Long",
      "Caden Lu",
      "Sharath Maddineni",
      "Anirudha Majumdar",
      "Kevis-Kokitsi Maninis",
      "Andrew Marmon",
      "Sergio Martinez",
      "Assaf Hurwitz Michaely",
      "Niko Milonopoulos",
      "Joss Moore",
      "Robert Moreno",
      "Michael Neunert",
      "Francesco Nori",
      "Joy Ortiz",
      "Kenneth Oslund",
      "Carolina Parada",
      "Emilio Parisotto",
      "Amaris Paryag",
      "Acorn Pooley",
      "Thomas Power",
      "Alessio Quaglino",
      "Haroon Qureshi",
      "Rajkumar Vasudeva Raju",
      "Helen Ran",
      "Dushyant Rao",
      "Kanishka Rao",
      "Isaac Reid",
      "David Rendleman",
      "Krista Reymann",
      "Miguel Rivas",
      "Francesco Romano",
      "Yulia Rubanova",
      "Peter Pastor Sampedro",
      "Pannag R Sanketi",
      "Dhruv Shah",
      "Mohit Sharma",
      "Kathryn Shea",
      "Mohit Shridhar",
      "Charles Shu",
      "Vikas Sindhwani",
      "Sumeet Singh",
      "Radu Soricut",
      "Rachel Sterneck",
      "Ian Storz",
      "Razvan Surdulescu",
      "Jie Tan",
      "Jonathan Tompson",
      "Saran Tunyasuvunakool",
      "Jake Varley",
      "Grace Vesom",
      "Giulia Vezzani",
      "Maria Bauza Villalonga",
      "Oriol Vinyals",
      "René Wagner",
      "Ayzaan Wahid",
      "Stefan Welker",
      "Paul Wohlhart",
      "Chengda Wu",
      "Markus Wulfmeier",
      "Fei Xia",
      "Ted Xiao",
      "Annie Xie",
      "Jinyu Xie",
      "Peng Xu",
      "Sichun Xu",
      "Ying Xu",
      "Zhuo Xu",
      "Jimmy Yan",
      "Sherry Yang",
      "Skye Yang",
      "Yuxiang Yang",
      "Hiu Hong (Eddie) Yu",
      "Wenhao Yu",
      "Wentao Yuan",
      "Yuan Yuan",
      "Jingwei Zhang",
      "Tingnan Zhang",
      "Zhiyuan Zhang",
      "Allan Zhou",
      "Guangyao Zhou",
      "Yuxiang Zhou",
    ],
    year: 2025,
    arxiv: '2510.03342',
    url: 'https://arxiv.org/abs/2510.03342',
    type: 'paper',
  },
  {
    id: 'gemini-robotics-2-2026',
    title: 'Gemini Robotics 2 brings whole body intelligence to robots',
    authors: [
      "Carolina Parada",
    ],
    year: 2026,
    url: 'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
    type: 'blog',
  },
  {
    id: 'gr00t-n1-2025',
    title:
      'GR00T N1: An Open Foundation Model for Generalist Humanoid Robots',
    // Full author list in arXiv order (org first, then the 41 named
    // authors; completed 2026-08-17 during the manipulation-ii audit).
    authors: [
      'NVIDIA',
      'Johan Bjorck',
      'Fernando Castañeda',
      'Nikita Cherniadev',
      'Xingye Da',
      'Runyu Ding',
      'Linxi "Jim" Fan',
      'Yu Fang',
      'Dieter Fox',
      'Fengyuan Hu',
      'Spencer Huang',
      'Joel Jang',
      'Zhenyu Jiang',
      'Jan Kautz',
      'Kaushil Kundalia',
      'Lawrence Lao',
      'Zhiqi Li',
      'Zongyu Lin',
      'Kevin Lin',
      'Guilin Liu',
      'Edith Llontop',
      'Loic Magne',
      'Ajay Mandlekar',
      'Avnish Narayan',
      'Soroush Nasiriany',
      'Scott Reed',
      'You Liang Tan',
      'Guanzhi Wang',
      'Zu Wang',
      'Jing Wang',
      'Qi Wang',
      'Jiannan Xiang',
      'Yuqi Xie',
      'Yinzhen Xu',
      'Zhenjia Xu',
      'Seonghyeon Ye',
      'Zhiding Yu',
      'Ao Zhang',
      'Hao Zhang',
      'Yizhou Zhao',
      'Ruijie Zheng',
      'Yuke Zhu',
    ],
    year: 2025,
    arxiv: '2503.14734',
    url: 'https://arxiv.org/abs/2503.14734',
    type: 'paper',
  },
  {
    id: 'isaac-gr00t-repo-2026',
    title: 'NVIDIA Isaac GR00T',
    authors: ['NVIDIA'],
    year: 2026,
    url: 'https://github.com/NVIDIA/Isaac-GR00T',
    type: 'docs',
  },
  {
    id: 'helix-2025',
    title: 'Helix: A Vision-Language-Action Model for Generalist Humanoid Control',
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
    // Figures verified against the paper and the AgiBotWorld-Beta dataset
    // card (2026-08-17): 1,001,552 trajectories, 2,976.4 hours, 217 tasks,
    // 87 skills, 106 scenes, collected on the AgiBot G1 (not G2). The
    // "no published hour count" research/03 reports is wrong, as is the
    // ~100k h estimate that circulates from it.
    id: 'agibot-world-2025',
    title:
      'AgiBot World Colosseo: A Large-scale Manipulation Platform for Scalable and Intelligent Embodied Systems',
    authors: [
      "AgiBot-World-Contributors",
      "Qingwen Bu",
      "Jisong Cai",
      "Li Chen",
      "Xiuqi Cui",
      "Yan Ding",
      "Siyuan Feng",
      "Shenyuan Gao",
      "Xindong He",
      "Xuan Hu",
      "Xu Huang",
      "Shu Jiang",
      "Yuxin Jiang",
      "Cheng Jing",
      "Hongyang Li",
      "Jialu Li",
      "Chiming Liu",
      "Yi Liu",
      "Yuxiang Lu",
      "Jianlan Luo",
      "Ping Luo",
      "Yao Mu",
      "Yuehan Niu",
      "Yixuan Pan",
      "Jiangmiao Pang",
      "Yu Qiao",
      "Guanghui Ren",
      "Cheng Ruan",
      "Jiaqi Shan",
      "Yongjian Shen",
      "Chengshi Shi",
      "Mingkang Shi",
      "Modi Shi",
      "Chonghao Sima",
      "Jianheng Song",
      "Huijie Wang",
      "Wenhao Wang",
      "Dafeng Wei",
      "Chengen Xie",
      "Guo Xu",
      "Junchi Yan",
      "Cunbiao Yang",
      "Lei Yang",
      "Shukai Yang",
      "Maoqing Yao",
      "Jia Zeng",
      "Chi Zhang",
      "Qinglin Zhang",
      "Bin Zhao",
      "Chengyue Zhao",
      "Jiaqi Zhao",
      "Jianchao Zhu",
    ],
    year: 2025,
    arxiv: '2503.06669',
    url: 'https://arxiv.org/abs/2503.06669',
    type: 'paper',
  },
  {
    id: 'agibot-go2-2026',
    title: 'The Unity of Reasoning and Action: AGIBOT Unveils Genie Operator-2 (GO-2) Next-Gen Embodied Foundation Model',
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
    title: 'Announcing Series C',
    authors: ['Skild AI Team'],
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
    // Pin the printed v3 PDF (29 January 2026), whose byline has 16 authors.
    // The retained v3 HTML also contains all 16; a prior extraction omitted Chao Yu.
    // Landing and embedded PDF metadata list 14, omitting Wei and Zhou.
    // These metadata disagreements remain history, not a claim of matching lists.
    // First submission: 29 October 2025; printed preprint footer: 30 January 2026.
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
      'Bingwen Wei',
      'Jiakai Zhou',
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
    // arXiv abs page and HTML v2 full text both fetched 2026-09-25; the
    // five-author byline is printed on both. v2 is the cited revision
    // (Table 1/Table 2 numbers verified against its HTML).
    id: 'expo-ft-2026',
    title:
      'EXPO-FT: Sample-Efficient Reinforcement Learning Finetuning for Vision-Language-Action Models',
    authors: ['Perry Dong', 'Kuo-Han Hung', 'Tian Gao', 'Dorsa Sadigh', 'Chelsea Finn'],
    year: 2026,
    arxiv: '2605.25477',
    url: 'https://arxiv.org/abs/2605.25477',
    type: 'paper',
  },
  {
    id: 'expo-2025',
    title: 'EXPO: Stable Reinforcement Learning with Expressive Policies',
    authors: ['Perry Dong', 'Qiyang Li', 'Dorsa Sadigh', 'Chelsea Finn'],
    year: 2025,
    arxiv: '2507.07986',
    url: 'https://arxiv.org/abs/2507.07986',
    type: 'paper',
  },
  {
    id: 'realtime-expo-ft-2026',
    title: 'Reinforcement Learning for Real-Time Vision-Language-Action Policies',
    authors: ['Perry Dong', 'Kuo-Han Hung', 'Dorsa Sadigh', 'Chelsea Finn'],
    year: 2026,
    arxiv: '2609.18207',
    url: 'https://arxiv.org/abs/2609.18207',
    type: 'paper',
  },
  {
    id: 'dsrl-2025',
    title: 'Steering Your Diffusion Policy with Latent Space Reinforcement Learning',
    authors: [
      'Andrew Wagenmaker',
      'Mitsuhiko Nakamoto',
      'Yunchu Zhang',
      'Seohong Park',
      'Waleed Yagoub',
      'Anusha Nagabandi',
      'Abhishek Gupta',
      'Sergey Levine',
    ],
    year: 2025,
    arxiv: '2506.15799',
    url: 'https://arxiv.org/abs/2506.15799',
    type: 'paper',
  },
  {
    // Personal blog post by Perry Dong with Chelsea Finn, published
    // September 2026 and fetched 2026-09-25 for the dated attribution.
    id: 'perry-dong-post-training-2026',
    title: 'Towards Universal Post-Training for Robotics',
    authors: ['Perry Dong', 'Chelsea Finn'],
    year: 2026,
    url: 'https://pd-perry.github.io/posts/post-training.html',
    type: 'blog',
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
    // Inspected arXiv v1: submitted 2025-10-30. The prior ICLR 2026
    // attribution is not established by the retained primary captures.
    year: 2025,
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
    // Audited repository landing URL; README title and named maintainer.
    // Exact code claims use initial commit ae614c029977157123225f538ecdd3f873e54bd4
    // in the article and native evidence. Its three files were reconstructed
    // from the commit API; their blob URLs were not directly fetched.
    // the commit identifies Nikita Rudin as author/committer in October 2021.
    // Maintainer attribution is not the paper byline or a complete contributor list.
    // Base config: 15 scale entries, 9 nonzero; dormant functions are not active terms.
    id: 'legged-gym-repo-2021',
    title: 'Isaac Gym Environments for Legged Robots',
    authors: ['Nikita Rudin'],
    year: 2021,
    url: 'https://github.com/leggedrobotics/legged_gym',
    type: 'docs',
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
    // Second edition, free full text at the authors' site. The canonical
    // landing page (incompleteideas.net/book/the-book-2nd.html) is http-only
    // with a self-signed cert, so this is the dated web.archive.org capture
    // per the schema's archive policy (precedent: sutton-bitter-lesson-2019).
    id: 'sutton-barto-2018',
    title: 'Reinforcement Learning: An Introduction',
    authors: ['Richard S. Sutton', 'Andrew G. Barto'],
    year: 2018,
    venue: 'MIT Press, second edition',
    url: 'https://web.archive.org/web/20260818231355/http://www.incompleteideas.net/book/the-book-2nd.html',
    type: 'docs',
  },
  {
    id: 'sac-2018',
    title:
      'Soft Actor-Critic: Off-Policy Maximum Entropy Deep Reinforcement Learning with a Stochastic Actor',
    authors: [
      'Tuomas Haarnoja',
      'Aurick Zhou',
      'Pieter Abbeel',
      'Sergey Levine',
    ],
    year: 2018,
    venue: 'ICML 2018',
    arxiv: '1801.01290',
    url: 'https://arxiv.org/abs/1801.01290',
    type: 'paper',
  },
  {
    // RSS 2019 per the arXiv comment field; the preprint is dated 2018-12-26,
    // which is why the entry year is the venue year rather than the arXiv
    // <published> year.
    id: 'haarnoja-walk-2019',
    title: 'Learning to Walk via Deep Reinforcement Learning',
    authors: [
      'Tuomas Haarnoja',
      'Sehoon Ha',
      'Aurick Zhou',
      'Jie Tan',
      'George Tucker',
      'Sergey Levine',
    ],
    year: 2019,
    venue: 'RSS 2019',
    arxiv: '1812.11103',
    url: 'https://arxiv.org/abs/1812.11103',
    type: 'paper',
  },
  {
    id: 'ddpg-2016',
    title: 'Continuous Control with Deep Reinforcement Learning',
    authors: [
      'Timothy P. Lillicrap',
      'Jonathan J. Hunt',
      'Alexander Pritzel',
      'Nicolas Heess',
      'Tom Erez',
      'Yuval Tassa',
      'David Silver',
      'Daan Wierstra',
    ],
    year: 2016,
    venue: 'ICLR 2016',
    arxiv: '1509.02971',
    url: 'https://arxiv.org/abs/1509.02971',
    type: 'paper',
  },
  {
    id: 'td3-2018',
    title: 'Addressing Function Approximation Error in Actor-Critic Methods',
    authors: ['Scott Fujimoto', 'Herke van Hoof', 'David Meger'],
    year: 2018,
    venue: 'ICML 2018',
    arxiv: '1802.09477',
    url: 'https://arxiv.org/abs/1802.09477',
    type: 'paper',
  },
  {
    id: 'offline-rl-tutorial-2020',
    title:
      'Offline Reinforcement Learning: Tutorial, Review, and Perspectives on Open Problems',
    authors: [
      'Sergey Levine',
      'Aviral Kumar',
      'George Tucker',
      'Justin Fu',
    ],
    year: 2020,
    arxiv: '2005.01643',
    url: 'https://arxiv.org/abs/2005.01643',
    type: 'paper',
  },
  {
    id: 'cql-2020',
    title: 'Conservative Q-Learning for Offline Reinforcement Learning',
    authors: [
      'Aviral Kumar',
      'Aurick Zhou',
      'George Tucker',
      'Sergey Levine',
    ],
    year: 2020,
    venue: 'NeurIPS 2020',
    arxiv: '2006.04779',
    url: 'https://arxiv.org/abs/2006.04779',
    type: 'paper',
  },
  {
    // ICLR 2022 per DBLP; the preprint is 2021-10-12, so the entry cites the
    // conference year and the arXiv sweep suppresses its year check for
    // entries whose venue names a conference.
    id: 'iql-2022',
    title: 'Offline Reinforcement Learning with Implicit Q-Learning',
    authors: ['Ilya Kostrikov', 'Ashvin Nair', 'Sergey Levine'],
    year: 2022,
    venue: 'ICLR 2022',
    arxiv: '2110.06169',
    url: 'https://arxiv.org/abs/2110.06169',
    type: 'paper',
  },
  {
    id: 'td3-bc-2021',
    title: 'A Minimalist Approach to Offline Reinforcement Learning',
    authors: ['Scott Fujimoto', 'Shixiang Shane Gu'],
    year: 2021,
    venue: 'NeurIPS 2021',
    arxiv: '2106.06860',
    url: 'https://arxiv.org/abs/2106.06860',
    type: 'paper',
  },
  {
    // RLPD. manipulation/rl-finetuning refers to "RLPD-style" off-policy RL
    // with demonstrations in the buffer and had no citation of its own.
    id: 'rlpd-2023',
    title: 'Efficient Online Reinforcement Learning with Offline Data',
    authors: [
      'Philip J. Ball',
      'Laura Smith',
      'Ilya Kostrikov',
      'Sergey Levine',
    ],
    year: 2023,
    venue: 'ICML 2023',
    arxiv: '2302.02948',
    url: 'https://arxiv.org/abs/2302.02948',
    type: 'paper',
  },
  {
    // Full byline as printed in arXiv:2309.10150v2, including Jaspiar Singht.
    id: 'q-transformer-2023',
    title:
      'Q-Transformer: Scalable Offline Reinforcement Learning via Autoregressive Q-Functions',
    authors: [
      'Yevgen Chebotar',
      'Quan Vuong',
      'Alex Irpan',
      'Karol Hausman',
      'Fei Xia',
      'Yao Lu',
      'Aviral Kumar',
      'Tianhe Yu',
      'Alexander Herzog',
      'Karl Pertsch',
      'Keerthana Gopalakrishnan',
      'Julian Ibarz',
      'Ofir Nachum',
      'Sumedh Sontakke',
      'Grecia Salazar',
      'Huong T Tran',
      'Jodilyn Peralta',
      'Clayton Tan',
      'Deeksha Manjunath',
      'Jaspiar Singht',
      'Brianna Zitkovich',
      'Tomas Jackson',
      'Kanishka Rao',
      'Chelsea Finn',
      'Sergey Levine',
    ],
    year: 2023,
    venue: 'CoRL 2023',
    arxiv: '2309.10150',
    url: 'https://arxiv.org/abs/2309.10150',
    type: 'paper',
  },
  {
    // 11 authors on the arXiv abs page; first four listed. CoRL 2018 per the
    // arXiv comment field ("CoRL 2018 camera ready").
    id: 'qt-opt-2018',
    title:
      'QT-Opt: Scalable Deep Reinforcement Learning for Vision-Based Robotic Manipulation',
    authors: [
      'Dmitry Kalashnikov',
      'Alex Irpan',
      'Peter Pastor',
      'Julian Ibarz',
    ],
    year: 2018,
    venue: 'CoRL 2018',
    arxiv: '1806.10293',
    url: 'https://arxiv.org/abs/1806.10293',
    type: 'paper',
  },
  {
    // Protocol source for the RL campaign claims: explicitly arXiv v4,
    // 28 Aug 2016, four authors. This is not the five-author IJRR edition.
    id: 'levine-hand-eye-2016',
    title:
      'Learning Hand-Eye Coordination for Robotic Grasping with Deep Learning and Large-Scale Data Collection',
    authors: [
      'Sergey Levine',
      'Peter Pastor',
      'Alex Krizhevsky',
      'Deirdre Quillen',
    ],
    year: 2016,
    venue: 'arXiv preprint (v4)',
    arxiv: '1603.02199',
    url: 'https://arxiv.org/pdf/1603.02199v4',
    type: 'paper',
  },
  {
    // The journal version (IJRR 37(4-5), doi:10.1177/0278364917710318) whose
    // five-author byline adds Julian Ibarz to the four-author 2016 preprint;
    // cited by DOI because the journal record is the version being quoted.
    // Crossref issues it 2017-06-12 online and 2018-04 in print, and the
    // volume is dated 2018, which is the year here.
    id: 'levine-hand-eye-2018',
    title:
      'Learning hand-eye coordination for robotic grasping with deep learning and large-scale data collection',
    authors: [
      'Sergey Levine',
      'Peter Pastor',
      'Alex Krizhevsky',
      'Julian Ibarz',
      'Deirdre Quillen',
    ],
    year: 2018,
    venue: 'IJRR 37(4-5)',
    url: 'https://doi.org/10.1177/0278364917710318',
    type: 'paper',
  },
  {
    // Full byline verified in arXiv 1707.01495v3 (23 February 2018).
    // The first page identifies the conference publication as NIPS 2017.
    id: 'her-2017',
    title: 'Hindsight Experience Replay',
    authors: [
      'Marcin Andrychowicz',
      'Filip Wolski',
      'Alex Ray',
      'Jonas Schneider',
      'Rachel Fong',
      'Peter Welinder',
      'Bob McGrew',
      'Josh Tobin',
      'Pieter Abbeel',
      'Wojciech Zaremba',
    ],
    year: 2017,
    venue: 'NeurIPS 2017',
    arxiv: '1707.01495',
    url: 'https://arxiv.org/abs/1707.01495',
    type: 'paper',
  },
  {
    // Full ordered byline and ICLR 2022 header verified in arXiv 2112.09605v2.
    // First preprint: 17 December 2021; conference edition: 2022.
    id: 'autonomous-rl-2022',
    title: 'Autonomous Reinforcement Learning: Formalism and Benchmarking',
    authors: [
      'Archit Sharma',
      'Kelvin Xu',
      'Nikhil Sardana',
      'Abhishek Gupta',
      'Karol Hausman',
      'Sergey Levine',
      'Chelsea Finn',
    ],
    year: 2022,
    venue: 'ICLR 2022',
    arxiv: '2112.09605',
    url: 'https://arxiv.org/abs/2112.09605',
    type: 'paper',
  },
  {
    // ICRA 2021 per the arXiv comment field. All eight authors in source order;
    // the first four authors contributed equally.
    id: 'reset-free-rl-2021',
    title:
      'Reset-Free Reinforcement Learning via Multi-Task Learning: Learning Dexterous Manipulation Behaviors without Human Intervention',
    authors: [
      'Abhishek Gupta',
      'Justin Yu',
      'Tony Z. Zhao',
      'Vikash Kumar',
      'Aaron Rovinsky',
      'Kelvin Xu',
      'Thomas Devlin',
      'Sergey Levine',
    ],
    year: 2021,
    venue: 'ICRA 2021',
    arxiv: '2104.11203',
    url: 'https://arxiv.org/abs/2104.11203',
    type: 'paper',
  },
  {
    // Full ordered byline and ICLR 2020 header verified in arXiv 2004.12570v1.
    id: 'real-world-rl-ingredients-2020',
    title: 'The Ingredients of Real-World Robotic Reinforcement Learning',
    authors: [
      'Henry Zhu',
      'Justin Yu',
      'Abhishek Gupta',
      'Dhruv Shah',
      'Kristian Hartikainen',
      'Avi Singh',
      'Vikash Kumar',
      'Sergey Levine',
    ],
    year: 2020,
    venue: 'ICLR 2020',
    arxiv: '2004.12570',
    url: 'https://arxiv.org/abs/2004.12570',
    type: 'paper',
  },
  {
    id: 'offline-rl-vs-bc-2022',
    title:
      'When Should We Prefer Offline Reinforcement Learning Over Behavioral Cloning?',
    authors: [
      'Aviral Kumar',
      'Joey Hong',
      'Anikait Singh',
      'Sergey Levine',
    ],
    year: 2022,
    venue: 'ICLR 2022',
    arxiv: '2204.05618',
    url: 'https://arxiv.org/abs/2204.05618',
    type: 'paper',
  },
  {
    // robomimic. 10 authors on the arXiv abs page; first four listed. CoRL
    // 2021 (oral) per the arXiv comment field.
    id: 'robomimic-2021',
    title:
      'What Matters in Learning from Offline Human Demonstrations for Robot Manipulation',
    authors: [
      'Ajay Mandlekar',
      'Danfei Xu',
      'Josiah Wong',
      'Soroush Nasiriany',
    ],
    year: 2021,
    venue: 'CoRL 2021',
    arxiv: '2108.03298',
    url: 'https://arxiv.org/abs/2108.03298',
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
    // NVIDIA-authored community overview on Hugging Face: published 2026-07-21,
    // modified 2026-08-05 in the captured body. First-party for NVIDIA/Newton
    // descriptions and these authors' opinions, not independent technical
    // evidence about third-party engines or a comparative benchmark.
    id: 'state-of-simulation-2026',
    title: 'The State of Simulation for Physical AI: An Overview',
    authors: [
      'Johnny Nuñez Cano',
      'Mitesh Patel',
      'Asier Arranz',
      'lior ben horin',
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
    // Isaac Lab v1: collective byline NVIDIA; Appendix A credits 105 unique
    // individuals across contributor and leadership roles (108 role entries).
    // Listed once in first-appearance order; acknowledgments are not authors.
    // The body includes Soowan Park's Korean spelling and Linxi Fan's quoted
    // nickname; the abs metadata uses different spelling/order conventions.
    id: 'isaac-lab-2025',
    title:
      'Isaac Lab: A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning',
    authors: [
      "NVIDIA",
      "Mayank Mittal",
      "Yunrong Guo",
      "Pascal Roth",
      "David Hoeller",
      "James Tigue",
      "Antoine Richard",
      "Octi Zhang",
      "Peter Du",
      "Antonio Serrano-Muñoz",
      "Xinjie Yao",
      "René Zurbrügg",
      "Nikita Rudin",
      "Lukasz Wawrzyniak",
      "Milad Rakhsha",
      "Alain Denzler",
      "Eric Heiden",
      "Ales Borovicka",
      "Ossama Ahmed",
      "Iretiayo Akinola",
      "Abrar Anwar",
      "Mark T. Carlson",
      "Ji Yuan Feng",
      "Animesh Garg",
      "Renato Gasoto",
      "Lionel Gulich",
      "Yijie Guo",
      "M. Gussert",
      "Ankur Handa",
      "Alex Hansen",
      "Mihir Kulkarni",
      "Chenran Li",
      "Wei Liu",
      "Viktor Makoviychuk",
      "Grzegorz Malczyk",
      "Hammad Mazhar",
      "Masoud Moghani",
      "Adithyavairavan Murali",
      "Michael Noseworthy",
      "Alexander Poddubny",
      "Nathan Ratliff",
      "Welf Rehberg",
      "Clemens Schwarke",
      "Ritvik Singh",
      "James Latham Smith",
      "Bingjie Tang",
      "Ruchik Thaker",
      "Matthew Trepte",
      "Karl Van Wyk",
      "Fangzhou Yu",
      "Alex Millane",
      "Vikram Ramasamy",
      "Remo Steiner",
      "Sangeeta Subramanian",
      "Clemens Volk",
      "CY Chen",
      "Neel Jawale",
      "Ashwin Varghese Kuruttukulam",
      "Michael A. Lin",
      "Ajay Mandlekar",
      "Karsten Patzwaldt",
      "John Welsh",
      "Huihua Zhao",
      "Fatima Anes",
      "Jean-Francois Lafleche",
      "Nicolas Moënne-Loccoz",
      "Soowan Park (박수완)",
      "Rob Stepinski",
      "Dirk Van Gelder",
      "Chris Amevor",
      "Jan Carius",
      "Jumyung Chang",
      "Anka He Chen",
      "Pablo de Heras Ciechomski",
      "Gilles Daviet",
      "Mohammad Mohajerani",
      "Julia von Muralt",
      "Viktor Reutskyy",
      "Michael Sauter",
      "Simon Schirm",
      "Eric L. Shi",
      "Pierre Terdiman",
      "Kenny Vilella",
      "Tobias Widmer",
      "Gordon Yeoman",
      "Tiffany Chen",
      "Sergey Grizan",
      "Cathy Li",
      "Lotus Li",
      "Connor Smith",
      "Rafael Wiltz",
      "Kostas Alexis",
      "Yan Chang",
      "David Chu",
      "Linxi “Jim” Fan",
      "Farbod Farshidian",
      "Spencer Huang",
      "Marco Hutter",
      "Yashraj Narang",
      "Soha Pouya",
      "Shiwei Sheng",
      "Yuke Zhu",
      "Miles Macklin",
      "Adam Moravanszky",
      "Philipp Reist",
      "Gavriel State",
    ],
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
    // Unversioned URL: since the 2026-10-06 domain pass the article cites the
    // current version's sentence (dexterous sim-to-real RL "remains largely
    // limited to single-hand ... or state-based setups"), which arXiv v1
    // does not hold; the earlier v1-only quote is no longer on the page.
    url: 'https://arxiv.org/abs/2502.20396',
    type: 'paper',
  },
  {
    id: 'openai-rubiks-cube-2019',
    title: "Solving Rubik's Cube with a Robot Hand",
    authors: [
      "OpenAI",
      "Ilge Akkaya",
      "Marcin Andrychowicz",
      "Maciek Chociej",
      "Mateusz Litwin",
      "Bob McGrew",
      "Arthur Petron",
      "Alex Paino",
      "Matthias Plappert",
      "Glenn Powell",
      "Raphael Ribas",
      "Jonas Schneider",
      "Nikolas Tezak",
      "Jerry Tworek",
      "Peter Welinder",
      "Lilian Weng",
      "Qiming Yuan",
      "Wojciech Zaremba",
      "Lei Zhang",
    ],
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
    // Accepted at CoRL 2026: the project page (play2perfect.github.io), fetched 2026-10-07,
    // prints "Conference on Robot Learning (CoRL) 2026" under the byline.
    venue: 'CoRL 2026',
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
    title: 'Learning agile and dynamic motor skills for legged robots',
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
      // The observed v3 body spells Sobanbabu; arXiv abs metadata spells Sobanbab.
      'Nikhil Sobanbabu',
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
      'Learning robust perceptive locomotion for quadrupedal robots in the wild',
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
      // Authors exactly as Crossref prints them (verified 2026-08-20; the
      // previous registry row carried four invented given names).
      'Suyoung Choi',
      'Gwanghyeon Ji',
      'Jeongsoo Park',
      'Hyeongjun Kim',
      'Juhyeok Mun',
      'Jeong Hyun Lee',
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
    // Retained arXiv metadata (September 8, 2026) states the four authors and
    // ICRA 2023 journal reference; the ar5iv body is not independently version-pinned.
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
    id: 'wholebodyvla-2025',
    title:
      'WholeBodyVLA: Towards Unified Latent VLA for Whole-Body Loco-Manipulation Control',
    authors: [
      'Haoran Jiang',
      'Jin Chen',
      'Qingwen Bu',
      'Li Chen',
      'Modi Shi',
      'Yanjie Zhang',
      'Delong Li',
      'Chuanzhe Suo',
      'Chuang Wang',
      'Zhihui Peng',
      'Hongyang Li',
    ],
    year: 2025,
    venue: 'ICLR 2026',
    arxiv: '2512.11047',
    url: 'https://arxiv.org/abs/2512.11047',
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
    // Retained September 8, 2026 metadata includes the RDA: title prefix;
    // the printed v1 body omits it. RLC acceptance is an author-submitted comment,
    // not independently inspected proceedings. The matched baseline uses GPT-5.
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
    // Retained March 2026 v3 body and arXiv metadata have nine authors.
    // ICRA 2026 is the author-submitted "to appear" comment, not proof of presentation.
    // The abs/body abstracts differ; hardware uses laboratory motion capture.
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
    // Prior arXiv abs-page identity check recorded 2026-08-08; title and
    // four-author byline also match the retained paper v2 (23 Mar 2026).
    // Video co-training is retained; explicit future-video inference is
    // omitted, not action denoising. Sec. 4.3.3 reports 190 ms versus
    // Fast-WAM-IDM's 810 ms on one RTX 5090D V2 32GB GPU, not control Hz.
    id: 'fast-wam-2026',
    title: 'Fast-WAM: Do World Action Models Need Test-time Future Imagination?',
    authors: ['Tianyuan Yuan', 'Zibin Dong', 'Yicheng Liu', 'Hang Zhao'],
    year: 2026,
    arxiv: '2603.16666',
    url: 'https://arxiv.org/abs/2603.16666',
    type: 'paper',
  },
  {
    // V1 HTML and PDF-derived primary byline reviewed 2026-09-07: 29 authors.
    // The abs metadata uses Mido Assran and incorrectly splits Mojtaba/Komeili;
    // preserve that metadata discrepancy in the audit, use the body byline here.
    // Over 1M video hours; the action-conditioned stage uses less than 62 hours.
    id: 'vjepa2-2025',
    title:
      'V-JEPA 2: Self-Supervised Video Models Enable Understanding, Prediction and Planning',
    authors: [
      'Mahmoud Assran',
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
    // Year corrected 2026-08-20 (arXiv author sweep): the abs page prints
    // "[Submitted on 28 Dec 2025]", so the registry carries the year the
    // source itself publishes.
    id: 'jepa-value-planning-2026',
    title: 'Value-guided action planning with JEPA world models',
    authors: [
      'Matthieu Destrade',
      'Oumayma Bounou',
      'Quentin Le Lidec',
      'Jean Ponce',
      'Yann LeCun',
    ],
    year: 2025,
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
    // REQUIRED registration per frozen packet
    // convergence-source-x-jepa-20260916j record 1 (jepa row 9 part
    // j9-ami-expansion: the only TechCrunch print that AMI 'stands for
    // Advanced Machine Intelligence'). Fetched live by the packet's
    // source session (curl GET 200, 2026-09-16T15:18:58Z, 240,641 bytes,
    // retained sha-verified at
    // convergence-source-x-jepa-20260916j/sources/tc-20260123.html);
    // title, byline Anna Heim and dateline 4:04 PM PST - January 23, 2026
    // needle-verified by this zero-retrieval integrator against the
    // retained body before registering. The March raise piece stays on
    // ami-labs-2026; the January piece prints the CEO as 'Alex LeBrun'
    // (the March form is 'Alexandre'), recorded in the jepa row-9 note.
    id: 'ami-labs-founding-2026',
    title: "Who's behind AMI Labs, Yann LeCun's 'world model' startup",
    authors: ['Anna Heim'],
    year: 2026,
    venue: 'TechCrunch',
    url: 'https://techcrunch.com/2026/01/23/whos-behind-ami-labs-yann-lecuns-world-model-startup/',
    type: 'press',
  },
  {
    // The Cosmos Predict1 platform paper: transformer diffusion and
    // autoregressive WFMs (4B-14B), continuous/discrete video tokenizers,
    // post-training into camera-control, instruction-following and driving
    // variants. Abstract page verified live (HTTP 200, 2026-09-16).
    id: 'cosmos-predict-2025',
    title: 'Cosmos World Foundation Model Platform for Physical AI',
    authors: ['NVIDIA'],
    year: 2025,
    arxiv: '2501.03575',
    url: 'https://arxiv.org/abs/2501.03575',
    type: 'paper',
  },
  {
    // NVIDIA's own inference-performance tables for Cosmos-Predict2:
    // required VRAM per variant (2B-Video2World 32.54 GB, 14B-Video2World
    // 56.38 GB) and measured generation times across GPU hardware at
    // 480p/16fps and 720p. Docs page verified live (HTTP 200, 2026-09-16).
    id: 'cosmos-predict2-perf-2025',
    title: 'Cosmos-Predict2 Inference Performance and GPU Memory Requirements',
    authors: ['NVIDIA'],
    year: 2025,
    url: 'https://github.com/nvidia-cosmos/cosmos-predict2/blob/main/documentations/performance.md',
    type: 'docs',
  },
  {
    // NGC model card for Cosmos-1.0-Diffusion-14B-Video2World: 121-frame
    // output at 1280x704/24fps and the offload-strategy VRAM table
    // (14B exceeds 80 GB without offloading). Page verified live (2026-09-16).
    id: 'cosmos-1-diffusion-14b-card-2025',
    title: 'Cosmos-1.0-Diffusion-14B-Video2World Model Card',
    authors: ['NVIDIA'],
    year: 2025,
    url: 'https://catalog.ngc.nvidia.com/orgs/nvidia/cosmos/models/cosmos-1.0-diffusion-14b-video2world',
    type: 'docs',
  },
  {
    // NVIDIA newsroom launch release for Cosmos 3, registered by the
    // generative-video integrator for the launch dateline only. Fetched
    // live by the frozen packet's source session (curl GET 200, 2026-09-16,
    // 83,088 bytes, retained sha-verified at
    // convergence-source-n-generative-video-20260916e/sources/nv-launch-release.html);
    // prints the dateline 'NVIDIA GTC Taipei' and the date string
    // 'May 31, 2026'. The technical report stays on cosmos-3-2026.
    id: 'nvidia-cosmos-3-launch-2026',
    title: 'NVIDIA Launches Cosmos 3, the Open Frontier Foundation Model for Physical AI',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'NVIDIA Newsroom',
    url: 'https://nvidianews.nvidia.com/news/nvidia-launches-cosmos-3-the-open-frontier-foundation-model-for-physical-ai',
    type: 'press',
  },
  {
    // Official body dated2026-6-22; arXiv2606.02800v4 lists NVIDIA
    // and294 individuals, matching the complete AppendixG.1 contributor set.
    // G.2 acknowledgments are separate; no whole-edition byte equivalence implied.
    id: 'cosmos-3-2026',
    title: 'Cosmos 3: Omnimodal World Models for Physical AI',
    authors: [
      "NVIDIA",
      "Aditi",
      "Niket Agarwal",
      "Arslan Ali",
      "Jon Allen",
      "Martin Antolini",
      "Adeline Aubame",
      "Alisson Azzolini",
      "Junjie Bai",
      "Maciej Bala",
      "Yogesh Balaji",
      "Josh Bapst",
      "Aarti Basant",
      "Mukesh Beladiya",
      "Mohammad Qazim Bhat",
      "Zaid Pervaiz Bhat",
      "Dan Blick",
      "Vanni Brighella",
      "Han Cai",
      "Tiffany Cai",
      "Eric Cameracci",
      "Jiaxin Cao",
      "Yulong Cao",
      "Mark Carlson",
      "Carlos Casanova",
      "Ting-Yun Chang",
      "Yan Chang",
      "Yu-Wei Chao",
      "Prithvijit Chattopadhyay",
      "Roshan Chaudhari",
      "Chieh-Yun Chen",
      "Junyu Chen",
      "Ke Chen",
      "Qizhi Chen",
      "Wenkai Chen",
      "Xiaotong Chen",
      "Yu Chen",
      "An-Chieh Cheng",
      "Click Cheng",
      "Xiu Chia",
      "Jeana Choi",
      "Chaeyeon Chung",
      "Wenyan Cong",
      "Yin Cui",
      "Magdalena Dadela",
      "Nalin Dadhich",
      "Wenliang Dai",
      "Joyjit Daw",
      "Alperen Degirmenci",
      "Rodrigo Vieira Del Monte",
      "Robert Denomme",
      "Sameer Dharur",
      "Marco Di Lucca",
      "Ke Ding",
      "Wenhao Ding",
      "Yifan Ding",
      "Yuzhu Dong",
      "Nicole Drumheller",
      "Yilun Du",
      "Aigul Dzhumamuratova",
      "Aleksandr Efitorov",
      "Hamid Eghbalzadeh",
      "Naomi Eigbe",
      "Imad El Hanafi",
      "Hassan Eslami",
      "Benedikt Falk",
      "Jiaojiao Fan",
      "Jim Fan",
      "Amol Fasale",
      "Sergiy Fefilatyev",
      "Liang Feng",
      "Francesco Ferroni",
      "Sanja Fidler",
      "Xiao Fu",
      "Vikram Fugro",
      "Prashant Gaikwad",
      "TJ Galda",
      "Katelyn Gao",
      "Yihuai Gao",
      "Wenhang Ge",
      "Sreyan Ghosh",
      "Arushi Goel",
      "Vivek Goel",
      "Akash Gokul",
      "Rama Govindaraju",
      "Jinwei Gu",
      "Miguel Guerrero",
      "Elfie Guo",
      "Aryaman Gupta",
      "Siddharth Gururani",
      "Hugo Hadfield",
      "Song Han",
      "Ankur Handa",
      "Zekun Hao",
      "Mohammad Harrim",
      "Ali Hassani",
      "Nathan Hayes-Roth",
      "Yufan He",
      "Chris Helvig",
      "Cyrus Hogg",
      "Madison Huang",
      "Michael Huang",
      "Sophia Huang",
      "Yufan Huang",
      "Jacob Huffman",
      "DeLesley Hutchins",
      "Suneel Indupuru",
      "Boris Ivanovic",
      "Arihant Jain",
      "Joel Jang",
      "Ryan Ji",
      "Yanan Jian",
      "Dongfu Jiang",
      "Jingyi Jin",
      "Atharva Joshi",
      "Nikhilesh Joshi",
      "Pranjali Joshi",
      "Andy Ju",
      "Jaehun Jung",
      "Weiwei Kang",
      "Scott Kassekert",
      "Jan Kautz",
      "Ashna Khetan",
      "Julia Kiczka",
      "Slawek Kierat",
      "Gwanghyun Kim",
      "Kuno Kim",
      "Sunny Kim",
      "Kezhi Kong",
      "Xin Kong",
      "Zhifeng Kong",
      "Tomasz Kornuta",
      "Egor Krivov",
      "Hui Kuang",
      "Saurav Kumar",
      "Chia-Wen Kuo",
      "George Kurian",
      "Wojciech Kutak",
      "JF Lafleche",
      "Himangshu Lahkar",
      "Omar Laymoun",
      "Jayjun Lee",
      "Sanggil Lee",
      "Gabriele Leone",
      "Boyi Li",
      "Freya Li",
      "Jiajun Li",
      "Jinfeng Li",
      "Ling Li",
      "Pengcheng Li",
      "Shangru Li",
      "Tingle Li",
      "Xiaolong Li",
      "Xuan Li",
      "Zhaoshuo Li",
      "Zhiqi Li",
      "Hao Liang",
      "Maosheng Liao",
      "Chen-Hsuan Lin",
      "Tsung-Yi Lin",
      "Ming-Yu Liu",
      "Sifei Liu",
      "Zihan Liu",
      "Hai Loc Lu",
      "Xiangyu Lu",
      "Alice Luo",
      "Ruipu Luo",
      "Wenjie Luo",
      "Jiangran Lyu",
      "Martin Ding Ma",
      "Nic Ma",
      "Qianli Ma",
      "Dawid Majchrowski",
      "Louis Marcoux",
      "Miguel Martin",
      "Qing Miao",
      "Ashkan Mirzaei",
      "Shreyas Misra",
      "Kaichun Mo",
      "Durra Mohsin",
      "Hyejin Moon",
      "Pawel Morkisz",
      "Saeid Motiian",
      "Kirill Motkov",
      "Seungjun Nah",
      "Yashraj Narang",
      "Deepak Narayanan",
      "Thabang Ngazimbi",
      "Julian Ouyang",
      "Shubham Pachori",
      "David Page",
      "Yatian Pang",
      "Sehwi Park",
      "Mahesh Patekar",
      "Mostofa Patwary",
      "Marco Pavone",
      "Trung Pham",
      "Wei Ping",
      "Soha Pouya",
      "Shrimai Prabhumoye",
      "Varun Praveen",
      "Delin Qu",
      "Hesam Rabeti",
      "Morteza Ramezanali",
      "Marilyn Reeb",
      "Xuanchi Ren",
      "Kristen Rumley",
      "Wojciech Rymer",
      "Jun Saito",
      "Yeongho Seol",
      "John Shao",
      "Piyush Shekdar",
      "Tianwei Shen",
      "Humphrey Shi",
      "Min Shi",
      "Stella Shi",
      "Kevin Shih",
      "Mohammad Shoeybi",
      "Mateusz Sieniawski",
      "Shuran Song",
      "Alexander Sotelo",
      "Amir Sotoodeh",
      "Sunil Srinivasa",
      "Vignesh Srinivasakumar",
      "Bartosz Stefaniak",
      "Rahul Heinrich Steiger",
      "Shangkun Sun",
      "Jiaxiang Tang",
      "Shitao Tang",
      "Yangyang Tang",
      "Yue Tang",
      "Tolou Tavakkoli",
      "Kayley Ting",
      "Krzysztof Tomala",
      "Wei-Cheng Tseng",
      "Jibin Varghese",
      "Sergei Vasilev",
      "Thomas Volk",
      "Raju Wagwani",
      "Roger Waleffe",
      "Andrew Z. Wang",
      "Boxiang Wang",
      "Haoxiang Wang",
      "Qiao Wang",
      "Shihao Wang",
      "Shijie Wang",
      "Ting-Chun Wang",
      "Yan Wang",
      "Yu Wang",
      "Rohit Watve",
      "David Wehr",
      "Fangyin Wei",
      "Xinshuo Weng",
      "Jay Zhangjie Wu",
      "Kedi Wu",
      "Hongchi Xia",
      "Summer Xiao",
      "Tianjun Xiao",
      "Kevin Xie",
      "Daguang Xu",
      "Jiashu Xu",
      "Mengyao Xu",
      "Ruqing Xu",
      "Xingqian Xu",
      "Yao Xu",
      "Dinghao Yang",
      "Dong Yang",
      "Hans Yang",
      "Xiaodong Yang",
      "Xuning Yang",
      "Yichu Yang",
      "Yurong You",
      "Zhiding Yu",
      "Hao Yuan",
      "Simon Yuen",
      "Xiaohui Zeng",
      "Pengcuo Zeren",
      "Cindy Zha",
      "Haotian Zhang",
      "Jenny Zhang",
      "Jing Zhang",
      "Liangkai Zhang",
      "Paris Zhang",
      "Shun Zhang",
      "Xuanmeng Zhang",
      "Zhizheng Zhang",
      "Ann Zhao",
      "Yilin Zhao",
      "Yuliya Zhautouskaya",
      "Charles Zhou",
      "Fengzhe Zhou",
      "Shilin Zhu",
      "Yuke Zhu",
      "Dima Zhylko",
      "Artur Zolkowski",
    ],
    year: 2026,
    url: 'https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-17): 11 authors; adapts
    // Cosmos-Predict2 into a robot policy via a single post-training stage,
    // actions and future state images encoded as latent frames.
    id: 'cosmos-policy-2026',
    title: 'Cosmos Policy: Fine-Tuning Video Models for Visuomotor Control and Planning',
    authors: [
      'Moo Jin Kim',
      'Yihuai Gao',
      'Tsung-Yi Lin',
      'Yen-Chen Lin',
      'Yunhao Ge',
      'Grace Lam',
      'Percy Liang',
      'Shuran Song',
      'Ming-Yu Liu',
      'Chelsea Finn',
      'Jinwei Gu',
    ],
    year: 2026,
    arxiv: '2601.16163',
    url: 'https://arxiv.org/abs/2601.16163',
    type: 'paper',
  },
  {
    // Genie 1 paper, registered by the generative-video integrator. Abs
    // page and full PDF fetched live by the frozen packet's source session
    // (curl GET 200, 2026-09-16, retained sha-verified at
    // convergence-source-n-generative-video-20260916e/sources/genie1-abs.html
    // and genie1-paper.txt); 25-author list and order taken verbatim from
    // the abs page. The abs page prints no venue (the packet's proposed
    // 'ICML 2024' is printed by no retained text, so no venue is recorded).
    id: 'genie-1-2024',
    title: 'Genie: Generative Interactive Environments',
    authors: [
      'Jake Bruce',
      'Michael Dennis',
      'Ashley Edwards',
      'Jack Parker-Holder',
      'Yuge Shi',
      'Edward Hughes',
      'Matthew Lai',
      'Aditi Mavalankar',
      'Richie Steigerwald',
      'Chris Apps',
      'Yusuf Aytar',
      'Sarah Bechtle',
      'Feryal Behbahani',
      'Stephanie Chan',
      'Nicolas Heess',
      'Lucy Gonzalez',
      'Simon Osindero',
      'Sherjil Ozair',
      'Scott Reed',
      'Jingwei Zhang',
      'Konrad Zolna',
      'Jeff Clune',
      'Nando de Freitas',
      'Satinder Singh',
      'Tim Rocktäschel',
    ],
    year: 2024,
    arxiv: '2402.15391',
    url: 'https://arxiv.org/abs/2402.15391',
    type: 'paper',
  },
  {
    // Genie 2 blog, registered by the generative-video integrator. Fetched
    // live twice by the frozen packet's source session (web fetch 200 and
    // curl GET 200, 2026-09-16, retained sha-verified at
    // convergence-source-n-generative-video-20260916e/sources/genie2-blog.html);
    // 32-name byline taken verbatim from the page ('Please cite as
    // Parker-Holder et al.' also printed), byline date December 4, 2024.
    id: 'genie-2-2024',
    title: 'Genie 2: A large-scale foundation world model',
    authors: [
      'Jack Parker-Holder',
      'Philip Ball',
      'Jake Bruce',
      'Vibhavari Dasagi',
      'Kristian Holsheimer',
      'Christos Kaplanis',
      'Alexandre Moufarek',
      'Guy Scully',
      'Jeremy Shar',
      'Jimmy Shi',
      'Stephen Spencer',
      'Jessica Yung',
      'Michael Dennis',
      'Sultan Kenjeyev',
      'Shangbang Long',
      'Vlad Mnih',
      'Harris Chan',
      'Maxime Gazeau',
      'Bonnie Li',
      'Fabio Pardo',
      'Luyu Wang',
      'Lei Zhang',
      'Frederic Besse',
      'Tim Harley',
      'Anna Mitenkova',
      'Jane Wang',
      'Jeff Clune',
      'Demis Hassabis',
      'Raia Hadsell',
      'Adrian Bolton',
      'Satinder Singh',
      'Tim Rocktäschel',
    ],
    year: 2024,
    venue: 'Google DeepMind',
    url: 'https://deepmind.google/blog/genie-2-a-large-scale-foundation-world-model/',
    type: 'blog',
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
    // DOI 10.1109/IROS.2012.6386109. Cited via doi.org (preferred over the
    // IEEE page, which is a JS-rendered SPA with no title in raw HTML).
    id: 'mujoco-2012',
    title: 'MuJoCo: A physics engine for model-based control',
    authors: ['Emanuel Todorov', 'Tom Erez', 'Yuval Tassa'],
    year: 2012,
    venue: 'IROS 2012',
    url: 'https://doi.org/10.1109/IROS.2012.6386109',
    type: 'paper',
  },
  {
    // Retained v1 full-paper review: arXiv:2603.08546v1 (9 March 2026).
    // Reports >10-minute video interaction and up to 15 FPS on one RTX 4090.
    // Generated-demonstration policy results are task/policy-specific;
    // the simulator itself uses real interaction data. Not control-rate proof.
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
    // Retained v4 full-paper review: arXiv:2607.01060v4 (15 July 2026).
    // Pearson r=0.989 and Spearman rho=0.970 compare eight policy aggregates
    // with the 26 February 2026 RoboArena leaderboard under GPT-4o scoring.
    // Correlation is not success calibration, absolute agreement or safety proof.
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
    // Starchild-1 announcement, registered by the generative-video
    // integrator. Fetched live twice by the frozen packet's source session
    // (web fetch 200 and curl GET 200, 2026-09-16, retained sha-verified at
    // convergence-source-n-generative-video-20260916e/sources/starchild.html);
    // byline Oliver Cameron, May 17th, 2026; prints 'synchronized audio and
    // video in real-time'.
    id: 'odyssey-starchild-1-2026',
    title: 'Starchild-1: The First Real-Time Multimodal World Model',
    authors: ['Oliver Cameron'],
    year: 2026,
    venue: 'Odyssey',
    url: 'https://odyssey.systems/introducing-starchild-1',
    type: 'blog',
  },
  {
    // Agora-1 announcement, registered by the generative-video
    // integrator. Fetched live twice by the frozen packet's source session
    // (web fetch 200 and curl GET 200, 2026-09-16, retained sha-verified at
    // convergence-source-n-generative-video-20260916e/sources/agora.html);
    // byline Oliver Cameron, May 18th, 2026; prints 'up to four players to
    // interact within the same generated world in real time'.
    id: 'odyssey-agora-1-2026',
    title: 'Agora-1: The Multi-Agent World Model',
    authors: ['Oliver Cameron'],
    year: 2026,
    venue: 'Odyssey',
    url: 'https://odyssey.systems/introducing-agora-1',
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
    // Google's own Project Genie blog, registered by the generative-video
    // integrator as a first-party durability addition beside the Ars press
    // citation. Fetched live twice by the frozen packet's source session
    // (web fetch 200 and curl GET 200, 2026-09-16, retained sha-verified at
    // convergence-source-n-generative-video-20260916e/sources/google-project-genie.html);
    // prints the Jan 29, 2026 AI Ultra U.S. rollout and the limitation list
    // 'Limitations in generations to 60 seconds'. Page H1/og:title is the
    // registered title (the <title> tag is an SEO variant); no personal
    // byline is printed, so the corporate author stands.
    id: 'google-project-genie-2026',
    title: 'Project Genie: Experimenting with infinite, interactive worlds',
    authors: ['Google'],
    year: 2026,
    venue: 'Google (The Keyword)',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-deepmind/project-genie/',
    type: 'blog',
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
    venue: 'ACM Trans. Graph. 42(4), author manuscript (2023)',
    arxiv: '2308.04079',
    url: 'https://arxiv.org/abs/2308.04079',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 9 authors, ICML 2024.
    // Source recovery 2026-09-08: abs metadata and v3 HTML agree on the nine-author
    // byline. First submitted in 2023; year 2024 denotes the ICML publication.
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
    // Source recovery 2026-09-08: first submitted in 2023; year 2024 denotes CVPR.
    // The abs page spells Eli VanderBilt; v2 HTML spells Eli Vanderbilt.
    // Preserve the registered abs-page spelling rather than silently normalizing it.
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
    // Verified against the arXiv abs page and Atom API (2026-09-23): 561
    // authors; first three listed. The v3 PDF byline reads "Llama Team,
    // AI @ Meta". Table 3 gives the 8B model 32 layers, model dimension
    // 4,096, 32 attention heads and 8 key/value heads (GQA).
    id: 'llama-3-herd-2024',
    title: 'The Llama 3 Herd of Models',
    authors: ['Aaron Grattafiori', 'Abhimanyu Dubey', 'Abhinav Jauhri'],
    year: 2024,
    arxiv: '2407.21783',
    url: 'https://arxiv.org/abs/2407.21783',
    type: 'paper',
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
  // CC BY 4.0: 2013 is the license-version publication year, not the undated deed webpage.
  // Publisher License Versions table: 2013 Nov 25; retained retrieval 2026-09-21T22:59:00.538Z.
  // https://wiki.creativecommons.org/wiki/License_Versions (no origin HTTP status exposed).
  {
    id: 'cc-by-4-0-deed',
    title: 'Attribution 4.0 International',
    authors: ['Creative Commons'],
    year: 2013,
    url: 'https://creativecommons.org/licenses/by/4.0/',
    type: 'docs',
  },
  {
    // Verified against the arXiv abs page (2026-08-08): 101 authors; first three listed.
    // License re-verified 2026-08-17: the dataset ships CC BY 4.0, not the
    // CC BY-NC 4.0 research/03 reports.
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
    // are not published there as of August 2026; total file size 13.7 TB
    // (HF storage API, 13.66 TB, re-read 2026-08-17).
    id: 'agibot-world-2026',
    title: 'AgiBot World 2026 (dataset release)',
    authors: ['AgiBot'],
    year: 2026,
    url: 'https://huggingface.co/datasets/agibot-world/AgiBotWorld2026',
    type: 'docs',
  },
  {
    // Retained arXiv v1 and abs metadata inspected 2026-09-13; no fresh fetch.
    // Preserve the collective byline plus all 81 names listed by this registry URL.
    // Body contributions spell Ben Burchfiel; abs metadata spells Benjamin Burchfiel.
    // Science Robotics 2026 was inherited from research/03, not established by these captures.
    id: 'tri-lbm-2025',
    title: 'A Careful Examination of Large Behavior Models for Multitask Dexterous Manipulation',
    authors: [
      'TRI LBM Team',
      'Jose Barreiros',
      'Andrew Beaulieu',
      'Aditya Bhat',
      'Rick Cory',
      'Eric Cousineau',
      'Hongkai Dai',
      'Ching-Hsin Fang',
      'Kunimatsu Hashimoto',
      'Muhammad Zubair Irshad',
      'Masha Itkina',
      'Naveen Kuppuswamy',
      'Kuan-Hui Lee',
      'Katherine Liu',
      'Dale McConachie',
      'Ian McMahon',
      'Haruki Nishimura',
      'Calder Phillips-Grafflin',
      'Charles Richter',
      'Paarth Shah',
      'Krishnan Srinivasan',
      'Blake Wulfe',
      'Chen Xu',
      'Mengchao Zhang',
      'Alex Alspach',
      'Maya Angeles',
      'Kushal Arora',
      'Vitor Campagnolo Guizilini',
      'Alejandro Castro',
      'Dian Chen',
      'Ting-Sheng Chu',
      'Sam Creasey',
      'Sean Curtis',
      'Richard Denitto',
      'Emma Dixon',
      'Eric Dusel',
      'Matthew Ferreira',
      'Aimee Goncalves',
      'Grant Gould',
      'Damrong Guoy',
      'Swati Gupta',
      'Xuchen Han',
      'Kyle Hatch',
      'Brendan Hathaway',
      'Allison Henry',
      'Hillel Hochsztein',
      'Phoebe Horgan',
      'Shun Iwase',
      'Donovon Jackson',
      'Siddharth Karamcheti',
      'Sedrick Keh',
      'Joseph Masterjohn',
      'Jean Mercat',
      'Patrick Miller',
      'Paul Mitiguy',
      'Tony Nguyen',
      'Jeremy Nimmer',
      'Yuki Noguchi',
      'Reko Ong',
      'Aykut Onol',
      'Owen Pfannenstiehl',
      'Richard Poyner',
      'Leticia Priebe Mendes Rocha',
      'Gordon Richardson',
      'Christopher Rodriguez',
      'Derick Seale',
      'Michael Sherman',
      'Mariah Smith-Jones',
      'David Tago',
      'Pavel Tokmakov',
      'Matthew Tran',
      'Basile Van Hoorick',
      'Igor Vasiljevic',
      'Sergey Zakharov',
      'Mark Zolotas',
      'Rares Ambrus',
      'Kerri Fetzer-Borelli',
      'Benjamin Burchfiel',
      'Hadas Kress-Gazit',
      'Siyuan Feng',
      'Stacie Ford',
      'Russ Tedrake'
    ],
    year: 2025,
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
    // Full-text re-read 2026-08-17: $73 gripper + $298 GoPro, 155-degree
    // fisheye, 80 mm finger stroke on UMI's own gripper, and CPH 231 hand /
    // 111 UMI / 35 spacemouse measured in 15-minute windows. Deployment
    // needs "any robot arms with a compatible gripper and camera setup";
    // the ">85 mm stroke" figure is the project site's, not the paper's,
    // and the "~30 s per demonstration" figure is derived from CPH.
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
    // Project site for UMI (RSS 2024; Best Systems Paper Award Finalist
    // per the site's own byline). Registered by the teleop-rigs evidence
    // completion 2026-09-16: the 111/35/231 hourly rates and the
    // any-home-any-restaurant 2-minute start are site-only claims (packet
    // convergence-source-f-teleop-rigs-20260916, rows 9-10); fields from the
    // site's own team byline and BibTeX.
  {
    id: 'umi-gripper-site-2024',
    title:  'Universal Manipulation Interface (UMI) project site',
    authors: ['Cheng Chi', 'Zhenjia Xu', 'Chuer Pan', 'Eric Cousineau', 'Benjamin Burchfiel', 'Siyuan Feng', 'Russ Tedrake', 'Shuran Song'],
    year: 2024,
    url: 'https://umi-gripper.github.io/',
    type: 'docs',
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
    title: 'SO-ARM100: Standard Open Arm 100',
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
    // Secondary community issue, self-described as researched June 2026.
    // ALOHA / ALOHA 2 is one approximate dollar range, not a vendor quote.
    // Currency code, configurations and itemized contents are not established.
    // Retrieved issue body does not identify its author; repository ownership
    // alone does not independently verify the existing authors field.
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
    // Verified against the live product line (2026-08-17): WidowX AI
    // $4,545.95, Solo AI $11,385.95, Stationary AI $23,995.95, Mobile AI
    // $33,695.95; 500 Hz CAN FD, LeRobot + OpenPI integration. The
    // "30-34% price cut" research/03 reports is not supported by any live
    // page; the lower figures it lists appear nowhere on the site.
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
    // Editorial caution: the review repeats vendor claims this wiki
    // deliberately excludes (e.g. Agility's "Digit moves more than 100,000
    // totes", which no Agility primary source substantiates); never cite
    // this entry for a deployment-count claim.
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
    title: 'NEO Home Robot',
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
    title: 'Atlas Humanoid Robot',
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
    // accepted to IEEE Transactions on Robotics. Full-text re-read
    // 2026-08-17: states DIGIT retails at $350 and GelSight Mini at $500.
    // It never mentions OXE, DROID, or AgiBot World, so it cannot support
    // any claim about their sensor channels; its durability discussion
    // covers temperature sensitivity, hysteresis, and the absence of a
    // standardized evaluation framework, not "calibration drift".
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
    // it). The sub-$300 parts BOM comes from the paper's project site
    // (wuphilipp.github.io/gello/). No build time is published anywhere:
    // the "~30 minute assembly" research/03 reports appears in neither the
    // paper nor the site, whose BOM sheet link is dead as of 2026-08-17.
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
    // Apple's own January 8, 2024 press release printing the Vision Pro
    // U.S. launch price ("available starting at $3,499 (U.S.) with 256GB of
    // storage"). Registered by the teleop-rigs evidence completion
    // 2026-09-16 (packet row 13); first-party vendor source.
  {
    id: 'apple-visionpro-price-2024',
    title: 
      'Apple Vision Pro available in the U.S. on February 2 (press release)',
    authors: ['Apple'],
    year: 2024,
    url: 'https://www.apple.com/newsroom/2024/01/apple-vision-pro-available-in-the-us-on-february-2/',
    type: 'blog',
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
    // Source preparation 2026-09-13: arXiv 2405.05941 v1, 16 authors.
    // Visual matching and offline system identification mitigate, rather
    // than universally close, the visual and control gaps. Pearson r and
    // margin-weighted MMRV measure setup-scoped relative-policy agreement.
    // https://simpler-env.github.io/ reports approximately 1,500 episodes
    // from EACH of real and sim, not 1,500 one-to-one matching raw trials.
    // Appendix B specifies simulation repetitions by variants/colors/seeds.
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
    // Retained body-text review 2026-09-13: arXiv 2506.18123 v2, 32 named authors.
    // Seven universities evaluated seven DROID policies in 612 A/B comparisons;
    // the exhaustive oracle uses 4,284 individual rollouts. The authors also
    // have an NVIDIA affiliation; seven is not the count of all affiliations.
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
    // 2026-10-08: modernrobotics.northwestern.edu now redirects to a single
    // lecture-video page, so the entry links the book's home page, where
    // modernrobotics.org lands and the authors post the full-text preprint.
    id: 'modern-robotics-2017',
    title: 'Modern Robotics: Mechanics, Planning, and Control',
    authors: ['Kevin M. Lynch', 'Frank C. Park'],
    year: 2017,
    venue: 'Cambridge University Press',
    url: 'https://hades.mech.northwestern.edu/index.php/Modern_Robotics',
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
      // Crossref and OpenAlex's raw_author_name both print initials for
      // authors 2-4 (P. Švestka, J.-C. Latombe, M. H. Overmars), so the
      // initials are kept per the author-field policy; only Lydia E.
      // Kavraki's full name is corroborated by a byline transcription
      // (DBLP journals/trob/KavrakiSLO96, read 2026-08-20).
      'Lydia E. Kavraki',
      'P. Švestka',
      'J.-C. Latombe',
      'M. H. Overmars',
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
    // Identity-verified 2026-09-17: Crossref DOI 10.1177/02783640122067453
    // (IJRR 20(5):378-400, May 2001) and title-page OCR of LavKuf01b.pdf.
    // Prior url LavKuf01.pdf served the different paper 'Rapidly-Exploring
    // Random Trees: Progress and Prospects' and was corrected.
    id: 'lavalle-kuffner-2001',
    title: 'Randomized Kinodynamic Planning',
    authors: ['Steven M. LaValle', 'James J. Kuffner'],
    year: 2001,
    venue: 'Int. J. Robotics Research',
    url: 'https://lavalle.pl/papers/LavKuf01b.pdf',
    type: 'paper',
  },
  {
    // Source: arXiv:1105.1186v1, 5 May 2011; Karaman and Frazzoli.
    // The landing page says IJRR is forthcoming; final issue metadata
    // is not established by this preprint. Algorithm 1 PRM differs from sPRM.
    id: 'karaman-frazzoli-2011',
    title: 'Sampling-based Algorithms for Optimal Motion Planning',
    authors: ['Sertac Karaman', 'Emilio Frazzoli'],
    year: 2011,
    venue: 'arXiv preprint',
    arxiv: '1105.1186',
    url: 'https://arxiv.org/abs/1105.1186',
    type: 'paper',
  },
  {
    // Source: arXiv:1404.2334v3, 28 November 2014; landing metadata
    // records IROS 2014, pp. 2997-3004. The ellipsoidal path-length
    // heuristic is an admissible superset, not exact feasible improving states.
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
    // The 2012 paper itself (Crossref, 2026-10-08: IEEE RAM 19(4):72-82,
    // December 2012). The authors' preprint lists PRM and RRT among the
    // implemented planners, describes the Benchmark class, and says OMPL
    // includes no collision checker or visualization and plugs into host
    // systems that do. It does not establish field-wide adoption or testing
    // certification.
    id: 'ompl-2012',
    title: 'The Open Motion Planning Library',
    authors: ['Ioan A. Șucan', 'Mark Moll', 'Lydia E. Kavraki'],
    year: 2012,
    venue: 'IEEE Robotics & Automation Magazine',
    url: 'https://doi.org/10.1109/MRA.2012.2205651',
    type: 'paper',
  },
  {
    // DOI verified via Crossref (2026-08-11): the record is the 1993 JDSMC
    // reprint of the 1942 Transactions of the ASME original (64:759-768),
    // the classic relay tuning rules for PID gains.
    id: 'ziegler-nichols-1942',
    title: 'Optimum Settings for Automatic Controllers',
    // Crossref prints only initials (J. G. Ziegler, N. B. Nichols) and the
    // secondary records disagree about the given names (OpenAlex: "Jens"
    // and "Nancy"), so the printed initials are kept per the
    // author-field policy rather than trusting any expansion.
    authors: ['J. G. Ziegler', 'N. B. Nichols'],
    year: 1942,
    venue: 'Trans. ASME',
    url: 'https://doi.org/10.1115/1.2899060',
    type: 'paper',
  },
  {
    // DOI verified via Crossref and IEEE Xplore (2026-08-11): the IEEE
    // Press reprint (Control Theory: Twenty-Five Seminal Papers) of
    // Kalman's 1960 Bol. Soc. Mat. Mexicana paper. The catalogue/reprint
    // identifies the work; it does not prove historical LQR priority.
    id: 'kalman-1960',
    title: 'Contributions to the Theory of Optimal Control',
    // Crossref and OpenAlex both print "R. E. Kalman"; the initial is
    // kept per the author-field policy.
    authors: ['R. E. Kalman'],
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
      // Crossref prints initials for all four; the DBLP record
      // (journals/automatica/MayneRRS00, read 2026-08-20) transcribes
      // full names for all four, but the registry expands only Rawlings
      // and Rao; Mayne and Scokaert keep the printed initials.
      'D. Q. Mayne',
      'James B. Rawlings',
      'Christopher V. Rao',
      'P. O. M. Scokaert',
    ],
    year: 2000,
    venue: 'Automatica',
    url: 'https://doi.org/10.1016/S0005-1098(99)00214-9',
    type: 'paper',
  },
  {
    // Verified via the publisher DOI record (2026-08-11): Control
    // Engineering Practice 11(7), 733-764. Paper text verified verbatim
    // (2026-08-17): "More than 4600 total MPC applications" across
    // Tables 6-7, with the largest single block in refining (67% of
    // classified applications) and a solid foundation in refining and
    // petrochemicals.
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
    // Crossref and OpenAlex both print "R. E. Kalman"; the initial is
    // kept per the author-field policy.
    authors: ['R. E. Kalman'],
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
    // Historical SAGE note: bot-walls curl (403), DOI live in a browser
    // on 2026-08-11. Pagination 1181-1203 versus author-page 1181-1204 remains unestablished.
    // The retained author manuscript says To appear; its page names Dec. 2006.
    // Nonlinear MAP uses successive linearised solves, not one factorisation:
    // QR on the measurement Jacobian; Cholesky on information; ordering affects fill-in.
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
    // IJRR 31(2):216-235; historical SAGE 403/browser-live note, 2026-08-11.
    // Retained April 6, 2011 draft is linked by the February 2012 author page;
    // this is not publisher-version or PDF-byte equivalence certification.
    // Updates re-eliminate affected cliques and ancestors, then reattach subtrees.
    // Thresholded propagation is approximate; large loops may cost a batch solve.
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
    // Title follows the retained abstract and v4 manuscript; byline follows v4.
    // arXiv:1606.05830v4; printed 30 January 2017; journal citation year 2016; DOI 10.1109/TRO.2016.2624754.
    // Audited abstract URL retained; it is not a pinned v4 URL or a new liveness check.
    id: 'cadena-2016',
    title:
      'Past, Present, and Future of Simultaneous Localization And Mapping: Towards the Robust-Perception Age',
    authors: [
      'Cesar Cadena',
      'Luca Carlone',
      'Henry Carrillo',
      'Yasir Latif',
      'Davide Scaramuzza',
      'José Neira',
      'Ian Reid',
      'John J. Leonard',
    ],
    year: 2016,
    venue: 'IEEE Transactions on Robotics',
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
    // SIGGRAPH '96 pp. 303-312, doi read 2026-08-22. The origin of the
    // volumetric signed-distance representation: range images fused into a
    // cumulative weighted signed distance function, from which an
    // isosurface is extracted.
    id: 'curless-levoy-1996',
    title: 'A Volumetric Method for Building Complex Models from Range Images',
    authors: ['Brian Curless', 'Marc Levoy'],
    year: 1996,
    venue: 'SIGGRAPH 1996',
    url: 'https://doi.org/10.1145/237170.237269',
    type: 'paper',
  },
  {
    // ISMAR 2011 pp. 127-136, Crossref read 2026-08-22. Real-time dense
    // TSDF fusion from a Kinect depth camera using commodity GPU hardware.
    // The source reports depth tracking/mapping, not adoption on live robots.
    //
    // Author list follows the paper's own byline (the ISMAR PDF, read
    // 2026-08-22), which orders Fitzgibbon last; Crossref lists him second
    // and prints "Pushmeet Kohi" for Kohli. Both divergences are
    // documented in data/crossref-author-exceptions.ts.
    id: 'kinectfusion-2011',
    title: 'KinectFusion: Real-Time Dense Surface Mapping and Tracking',
    authors: [
      'Richard A. Newcombe',
      'Shahram Izadi',
      'Otmar Hilliges',
      'David Molyneaux',
      'David Kim',
      'Andrew J. Davison',
      'Pushmeet Kohli',
      'Jamie Shotton',
      'Steve Hodges',
      'Andrew Fitzgibbon',
    ],
    year: 2011,
    venue: 'ISMAR 2011',
    url: 'https://doi.org/10.1109/ISMAR.2011.6092378',
    type: 'paper',
  },
  {
    // Historical ICRA 1985 pp. 116-121 Crossref note, 2026-08-22;
    // venue expansion is not re-established by the retained CMU scan.
    // The paper projects probabilistic sonar constraints onto a 2D grid,
    // with unknown distinct from probably empty/occupied. Crossref
    // prints the byline as initials ("H. Moravec", "A. Elfes"); the CMU
    // Robotics Institute PDF prints the full given names, and that
    // expansion is documented in data/crossref-author-exceptions.ts.
    id: 'moravec-elfes-1985',
    title: 'High Resolution Maps from Wide Angle Sonar',
    authors: ['Hans P. Moravec', 'Alberto Elfes'],
    year: 1985,
    venue: 'ICRA 1985',
    url: 'https://doi.org/10.1109/ROBOT.1985.1087316',
    type: 'paper',
  },
  {
    // ECCV 2020 (oral); arXiv abs page read 2026-08-22. A scene as a
    // continuous 5D function from position and viewing direction to
    // density and view-dependent radiance, rendered by classical volume
    // rendering, optimised per scene from posed images alone.
    id: 'nerf-2020',
    title:
      'NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis',
    authors: [
      'Ben Mildenhall',
      'Pratul P. Srinivasan',
      'Matthew Tancik',
      'Jonathan T. Barron',
      'Ravi Ramamoorthi',
      'Ren Ng',
    ],
    year: 2020,
    venue: 'ECCV 2020',
    arxiv: '2003.08934',
    url: 'https://arxiv.org/abs/2003.08934',
    type: 'paper',
  },
  {
    // ACM Trans. Graph. 41(4) Article 102 (SIGGRAPH 2022); arXiv abs page
    // read 2026-08-22. The multiresolution hash encoding that collapsed
    // neural-field training from hours to seconds, which is what made the
    // per-scene optimisation cost arguable rather than prohibitive.
    id: 'instant-ngp-2022',
    title:
      'Instant Neural Graphics Primitives with a Multiresolution Hash Encoding',
    authors: [
      'Thomas Müller',
      'Alex Evans',
      'Christoph Schied',
      'Alexander Keller',
    ],
    year: 2022,
    venue: 'ACM Trans. Graph. (SIGGRAPH 2022)',
    arxiv: '2201.05989',
    url: 'https://arxiv.org/abs/2201.05989',
    type: 'paper',
  },
  {
    // Historical entry: CVPR 2024; abstract review recorded as 2026-08-22.
    // The pairwise network predicts pointmaps without supplied camera parameters.
    // Multiview reconstruction separately optimises their global alignment;
    // training uses geometric supervision and pretrained CroCo weights.
    id: 'dust3r-2024',
    title: 'DUSt3R: Geometric 3D Vision Made Easy',
    authors: [
      'Shuzhe Wang',
      'Vincent Leroy',
      'Yohann Cabon',
      'Boris Chidlovskii',
      'Jerome Revaud',
    ],
    year: 2024,
    venue: 'CVPR 2024',
    arxiv: '2312.14132',
    url: 'https://arxiv.org/abs/2312.14132',
    type: 'paper',
  },
  {
    // ECCV 2024 (LNCS 15832); arXiv abs page read 2026-08-22. The DUSt3R
    // successor, adding a dense local-feature head so the same
    // feed-forward pointmap network also does grounded image matching.
    id: 'mast3r-2024',
    title: 'Grounding Image Matching in 3D with MASt3R',
    authors: ['Vincent Leroy', 'Yohann Cabon', 'Jérôme Revaud'],
    year: 2024,
    venue: 'ECCV 2024',
    arxiv: '2406.09756',
    url: 'https://arxiv.org/abs/2406.09756',
    type: 'paper',
  },
  {
    // IEEE Trans. Robotics 31(5):1147-1163, Crossref read 2026-08-22. The
    // reference feature-based visual SLAM system: ORB features reused
    // across tracking, mapping, relocalisation and loop closing.
    // IEEE DOI landing metadata returned by web fetch on 2026-09-14;
    // publisher identity only, not certification of version-of-record body equality.
    // Retained printed arXiv v2 scientific passages keep their original source URLs/history.
    id: 'orb-slam-2015',
    title: 'ORB-SLAM: A Versatile and Accurate Monocular SLAM System',
    authors: [
      'Raúl Mur-Artal',
      'J. M. M. Montiel',
      'Juan D. Tardós',
    ],
    year: 2015,
    venue: 'IEEE Transactions on Robotics',
    url: 'https://doi.org/10.1109/TRO.2015.2463671',
    type: 'paper',
  },
  {
    // IEEE Trans. Robotics 37(6):1874-1890, Crossref read 2026-08-22. The
    // multi-map, visual-inertial successor, where a lost session becomes a
    // new map that is merged back when the place is recognised again.
    // IEEE DOI landing metadata returned by web fetch on 2026-09-14;
    // publisher identity only, not certification of version-of-record body equality.
    // Retained printed arXiv v2 scientific passages keep their original source URLs/history.
    id: 'orb-slam3-2021',
    title: 'ORB-SLAM3: An Accurate Open-Source Library for Visual, Visual–Inertial, and Multimap SLAM',
    authors: [
      'Carlos Campos',
      'Richard Elvira',
      'Juan J. Gómez Rodríguez',
      'José M. M. Montiel',
      'Juan D. Tardós',
    ],
    year: 2021,
    venue: 'IEEE Transactions on Robotics',
    url: 'https://doi.org/10.1109/TRO.2021.3075644',
    type: 'paper',
  },
  {
    // IEEE TPAMI 40(3):611-625, Crossref read 2026-08-22. The direct
    // counterpart to ORB-SLAM: photometric error on sampled pixels,
    // jointly optimised with geometry, with no feature detector at all.
    id: 'dso-2018',
    title: 'Direct Sparse Odometry',
    authors: ['Jakob Engel', 'Vladlen Koltun', 'Daniel Cremers'],
    year: 2018,
    venue: 'IEEE TPAMI',
    url: 'https://doi.org/10.1109/TPAMI.2017.2658577',
    type: 'paper',
  },
  {
    // IEEE Trans. Robotics 32(1):1-19, Crossref read 2026-08-22 (historical).
    // Retained QUT author manuscript: submitted 18 March 2015, 2016 issue;
    // not Version-of-Record certification. Visual-map recognition may use motion.
    id: 'lowry-2016-place-recognition',
    title: 'Visual Place Recognition: A Survey',
    authors: [
      'Stephanie Lowry',
      'Niko Sünderhauf',
      'Paul Newman',
      'John J. Leonard',
      'David Cox',
      'Peter Corke',
      'Michael J. Milford',
    ],
    year: 2016,
    venue: 'IEEE Trans. Robotics',
    url: 'https://doi.org/10.1109/TRO.2015.2496823',
    type: 'paper',
  },
  {
    // ICCV 2021. The scene-specific MLP is trained online from RGB-D;
    // keyframes, poses and network snapshots remain part of system state.
    // Paper v2 scopes the demonstration to room-scale scenes.
    id: 'imap-2021',
    title: 'iMAP: Implicit Mapping and Positioning in Real-Time',
    authors: [
      'Edgar Sucar',
      'Shikun Liu',
      'Joseph Ortiz',
      'Andrew J. Davison',
    ],
    year: 2021,
    venue: 'ICCV 2021',
    arxiv: '2103.12352',
    url: 'https://arxiv.org/abs/2103.12352',
    type: 'paper',
  },
  {
    // CVPR 2022. Three fixed pretrained geometry decoders plus a separate
    // online-optimized colour decoder; hierarchical grids support local updates.
    // The paper demonstrates a multi-room apartment, not unlimited scene scale.
    id: 'nice-slam-2022',
    title: 'NICE-SLAM: Neural Implicit Scalable Encoding for SLAM',
    authors: [
      'Zihan Zhu',
      'Songyou Peng',
      'Viktor Larsson',
      'Weiwei Xu',
      'Hujun Bao',
      'Zhaopeng Cui',
      'Martin R. Oswald',
      'Marc Pollefeys',
    ],
    year: 2022,
    venue: 'CVPR 2022',
    arxiv: '2112.12130',
    url: 'https://arxiv.org/abs/2112.12130',
    type: 'paper',
  },
  {
    // CoRL 2021; arXiv abs page read 2026-08-22. A radiance field used for
    // geometry rather than for rendering: transparency-aware depth
    // rendered out of the learned density and fed to a grasp planner,
    // reporting 90% and 100% grasp success in physical experiments.
    id: 'dex-nerf-2021',
    title:
      'Dex-NeRF: Using a Neural Radiance Field to Grasp Transparent Objects',
    authors: [
      'Jeffrey Ichnowski',
      'Yahav Avigal',
      'Justin Kerr',
      'Ken Goldberg',
    ],
    year: 2021,
    venue: 'CoRL 2021',
    arxiv: '2110.14217',
    url: 'https://arxiv.org/abs/2110.14217',
    type: 'paper',
  },
  {
    // IROS 2014, Crossref read 2026-08-22. The layered costmap: separate
    // semantic layers composed into the single grid a navigation planner
    // reads, which is the deployed form of the occupancy grid.
    id: 'layered-costmaps-2014',
    title: 'Layered Costmaps for Context-Sensitive Navigation',
    authors: ['David V. Lu', 'Dave Hershberger', 'William D. Smart'],
    year: 2014,
    venue: 'IROS 2014',
    url: 'https://doi.org/10.1109/IROS.2014.6942636',
    type: 'paper',
  },
  {
    // IROS 2020, Crossref read 2026-08-22. The ROS 2 navigation stack
    // paper: the global-planner and local-controller split, the costmap
    // layers underneath, and a long-duration deployment result.
    id: 'nav2-2020',
    title: 'The Marathon 2: A Navigation System',
    authors: [
      'Steve Macenski',
      'Francisco Martin',
      'Ruffin White',
      'Jonatan Gines Clavero',
    ],
    year: 2020,
    venue: 'IROS 2020',
    url: 'https://doi.org/10.1109/IROS45743.2020.9341207',
    type: 'paper',
  },
  {
    // Project site verified live (2026-08-11). GTSAM is the reference
    // implementation of factor-graph smoothing and the Bayes tree, used
    // across visual-inertial odometry and offline mapping. gtsam.org serves
    // its tagline as <title> rather than this project name; documented as a
    // title-mismatch exception in data/link-check-exceptions.ts.
    id: 'gtsam-2026',
    title: 'GTSAM: Georgia Tech Smoothing and Mapping',
    authors: ['Frank Dellaert', 'GTSAM Contributors'],
    year: 2026,
    url: 'https://gtsam.org/',
    type: 'docs',
  },
  {
    // Author-hosted complete PDF verified live at cds.caltech.edu
    // (2026-08-11). Chapter 5 is the primary source for the friction cone
    // alpha = arctan(mu), the soft-finger torsional model, force closure as
    // surjectivity of the grasp map, Nguyen's antipodal theorem (Theorem
    // 5.6), and the Table 5.3 lower bounds on contact counts.
    id: 'murray-li-sastry-1994',
    title: 'A Mathematical Introduction to Robotic Manipulation',
    authors: ['Richard M. Murray', 'Zexiang Li', 'S. Shankar Sastry'],
    year: 1994,
    venue: 'CRC Press',
    url: 'https://www.cds.caltech.edu/~murray/books/MLS/pdf/mls94-complete.pdf',
    type: 'docs',
  },
  {
    // CrossRef metadata verified (2026-08-11): IJRR 7(1):3-16, 1988.
    // Proves the antipodal grasp theorem: a planar two-contact frictional
    // grasp is force closure exactly when the line through the contacts
    // lies strictly inside both friction cones (also Murray, Li, and
    // Sastry, Theorem 5.6). Sage bot-walls direct HEAD requests; the
    // doi.org redirect resolves to journals.sagepub.com.
    id: 'nguyen-1988',
    title: 'Constructing Force-Closure Grasps',
    authors: ['Van-Duc Nguyen'],
    year: 1988,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/027836498800700301',
    type: 'paper',
  },
  {
    // CrossRef metadata verified (2026-08-11): ICRA 1992, pp. 2290-2295.
    // Introduces the epsilon grasp-quality metric: the radius of the largest
    // wrench ball around the origin inside the grasp wrench hull, equal to
    // the minimum origin-to-facet distance. IEEE Xplore bot-walls direct
    // HEAD requests (202); the doi.org redirect resolves to ieeexplore.
    id: 'ferrari-canny-1992',
    title: 'Planning Optimal Grasps',
    authors: ['Carlo Ferrari', 'John F. Canny'],
    year: 1992,
    venue: 'ICRA 1992',
    url: 'https://doi.org/10.1109/ROBOT.1992.219918',
    type: 'paper',
  },
  {
    // CrossRef metadata verified (2026-08-11): IJRR 14(4):319-334, 1995.
    // Unifies form and force closure under one closure framework and gives
    // the contact-count bounds for frictionless grasps.
    id: 'bicchi-1995',
    title: 'On the Closure Properties of Robotic Grasping',
    authors: ['Antonio Bicchi'],
    year: 1995,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/027836499501400402',
    type: 'paper',
  },
  {
    // CrossRef metadata verified (2026-08-11): Algorithmica 2:541-558,
    // 1987. Springer abstract verified verbatim (2026-08-17): frictionless
    // "positive grips", tight bounds on the number of fingers for the
    // equilibrium cases, and linear-time synthesis for polyhedral objects.
    // The 4-planar / 7-spatial frictionless lower bound itself traces to
    // Reuleaux (1875) and Somoff (1897) per Markenscoff-Ni-Papadimitriou
    // 1990's own abstract.
    id: 'mishra-1987',
    title: 'On the Existence and Synthesis of Multifinger Positive Grips',
    // Author 1 restored 2026-08-20: the author is Bhubaneswar Mishra
    // ("Bud" Mishra, NYU Courant). DBLP's publication record for this DOI
    // lists "Bhubaneswar Mishra, Jacob T. Schwartz, Micha Sharir" (author
    // pid m/BhubaneswarMishra, New York University), and the Courant
    // co-authors corroborate the identity. OpenAlex's display_name
    // "Brajendra Mishra" is MIS-CLUSTERED here: that name is attached to
    // ORCID 0000-0001-7897-1817, a materials scientist at Worcester
    // Polytechnic whose topics are extraction, corrosion and hydrogen
    // embrittlement, and OpenAlex's own raw_author_name for this record
    // prints only "B. Mishra". Do not "correct" this back from OpenAlex.
    authors: ['Bhubaneswar Mishra', 'Jacob T. Schwartz', 'Micha Sharir'],
    year: 1987,
    venue: 'Algorithmica',
    url: 'https://doi.org/10.1007/BF01840373',
    type: 'paper',
  },
  {
    // CrossRef metadata verified (2026-08-11): IJRR 9(1):61-74, 1990.
    // SAGE abstract verified verbatim (2026-08-17): attributes the
    // 4-planar / 7-spatial frictionless lower bound to Reuleaux (1875)
    // and Somoff (1897); proves sufficiency: 4 fingers for planar objects
    // with piecewise smooth boundary (a circle excepted), 12 in space iff
    // the object has no rotational symmetry, 7 under very general
    // conditions; with friction, 3 planar and 4 spatial contacts are
    // necessary and sufficient. The planar "6" sometimes cited alongside
    // is the Steinitz counting bound in Murray-Li-Sastry Table 5.3, not
    // an MNP result. DOI ends 090102; the near-identical 090104 is a
    // different paper in the same issue, an easy mis-citation.
    id: 'markenscoff-1990',
    title: 'The Geometry of Grasping',
    authors: [
      'Xanthippi Markenscoff',
      'Luqun Ni',
      'Christos H. Papadimitriou',
    ],
    year: 1990,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/027836499000900102',
    type: 'paper',
  },
  {
    // CrossRef metadata verified (2026-08-11): IEEE Trans. Robotics and
    // Automation 5(3):269-279, 1989. The grasp taxonomy (power vs.
    // precision, and the Cutkosky grasp tree) used to choose a grasp before
    // analyzing it.
    id: 'cutkosky-1989',
    title:
      'On Grasp Choice, Grasp Models, and the Design of Hands for Manufacturing Tasks',
    authors: ['Mark R. Cutkosky'],
    year: 1989,
    venue: 'IEEE Trans. Robotics and Automation',
    url: 'https://doi.org/10.1109/70.34763',
    type: 'paper',
  },
  {
    // CrossRef metadata verified (2026-08-11): ICRA 2000, pp. 348-353.
    // Review of contact models, grasp analysis, and quality metrics. DOI
    // ends 844081; neighboring 844777 is a different ICRA 2000 paper.
    id: 'bicchi-kumar-2000',
    title: 'Robotic Grasping and Contact: A Review',
    // Crossref prints "A." and "V."; the DBLP record (conf/icra/BicchiK00,
    // read 2026-08-20) transcribes "Antonio Bicchi" in full, so Kumar
    // keeps the initial.
    authors: ['Antonio Bicchi', 'V. Kumar'],
    year: 2000,
    venue: 'ICRA 2000',
    url: 'https://doi.org/10.1109/ROBOT.2000.844081',
    type: 'paper',
  },
  {
    // CrossRef metadata verified (2026-08-11): Springer Handbook of
    // Robotics, 2nd ed., chapter 38, pp. 955-988, 2016. The modern handbook
    // treatment of contact models, closure, and grasp quality.
    id: 'prattichizzo-trinkle-2016',
    title: 'Grasping',
    authors: ['Domenico Prattichizzo', 'Jeffrey C. Trinkle'],
    year: 2016,
    venue: 'Springer Handbook of Robotics',
    url: 'https://doi.org/10.1007/978-3-319-32552-1_38',
    type: 'paper',
  },
  {
    // Publisher HTML retrieved 2026-09-13: published 31 July 2014;
    // Autonomous Robots 38:65-88, January 2015 issue. Byline: Máximo A. Roa
    // and Raúl Suárez. Reviews contact-location and hand-configuration
    // measures using simple examples, with no generally best criterion;
    // largest-minimum resisted wrench values depend on torque origin,
    // wrench scaling and the selected force constraint.
    id: 'roa-suarez-2015',
    title: 'Grasp Quality Measures: Review and Performance',
    authors: ['Máximo A. Roa', 'Raúl Suárez'],
    year: 2015,
    venue: 'Autonomous Robots',
    url: 'https://doi.org/10.1007/s10514-014-9402-3',
    type: 'paper',
  },
  {
    // arXiv v3: 6.7M synthetic training datapoints, not physical trials or
    // necessarily unique scene views; Figure 3 says over 6.7M grasp images.
    // Binary labels combine thresholded expected epsilon with collision checks;
    // GQ-CNN predicts robustness from an aligned depth crop and gripper depth.
    // Table III: GQ-L-Adv, 93% success in 80 trials on eight known objects.
    // Separate CEM experiment: 100 trials/40 novel household objects,
    // 94% overall success and 99% precision (68/69 robust classifications).
    id: 'dexnet-2-2017',
    title:
      'Dex-Net 2.0: Deep Learning to Plan Robust Grasps with Synthetic Point Clouds and Analytic Grasp Metrics',
    authors: [
      'Jeffrey Mahler',
      'Jacky Liang',
      'Sherdil Niyaz',
      'Michael Laskey',
      'Richard Doan',
      'Xinyu Liu',
      'Juan Aparicio Ojea',
      'Ken Goldberg',
    ],
    year: 2017,
    venue: 'RSS 2017',
    arxiv: '1703.09312',
    url: 'https://arxiv.org/abs/1703.09312',
    type: 'paper',
  },
  {
    id: 'rl-100-2025',
    title:
      'RL-100: Performant Robotic Manipulation with Real-World Reinforcement Learning',
    authors: [
      'Kun Lei',
      'Huanyu Li',
      'Dongjie Yu',
      'Zhenyu Wei',
      'Lingxiao Guo',
      'Zhennan Jiang',
      'Ziyu Wang',
      'Shiyu Liang',
      'Huazhe Xu',
    ],
    year: 2025,
    arxiv: '2510.14830',
    url: 'https://arxiv.org/abs/2510.14830',
    type: 'paper',
  },
  {
    // Investor analysis; carries the Lisa Yan reliability-gap quote and the
    // 80%-to-99.9% framing this module anchors on.
    id: 'bessemer-robotics-2026',
    title: 'Bessemer Predicts: Robotics and physical AI',
    authors: ['Jeremy Levine', 'Talia Goldberg', 'Janelle Teng Wade', 'Alexandra Sukin', 'Bhavik Nagda', 'Jason Scheller', 'Christine Deakers'],
    year: 2026,
    url: 'https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai',
    type: 'blog',
  },
  {
    // Undated, changeable company homepage; Sep 24 is retrieval, not a
    // publication or measurement date. It says "65,000 hours", not 65,000+.
    id: 'agility-digit-production',
    title: 'Industrial Humanoid Automation | Agility',
    authors: ['Agility Robotics'],
    year: 'n.d.',
    accessedOn: '2026-09-24',
    url: 'https://www.agilityrobotics.com/',
    type: 'docs',
  },
  {
    // Dated first-party BMW pilot report: 84s and >99% are targets.
    id: 'figure-bmw-production-2025',
    title: 'F.02 Contributed to the Production of 30,000 Cars at BMW',
    authors: ['Figure AI'],
    year: 2025,
    url: 'https://www.figure.ai/news/production-at-bmw',
    type: 'blog',
  },
  {
    // Q1 period, not a mid-July production update; both lines listed under
    // Construction, with designed capacity explicitly distinct from output.
    id: 'tesla-q1-2026-update',
    title: 'Q1 2026 Update',
    authors: ['Tesla, Inc.'],
    year: 2026,
    url: 'https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q1-2026-Update.pdf',
    type: 'docs',
  },
  {
    // Dataset/evaluation harness page; no arXiv id as of 2026-08.
    id: 'asimov-agentic-2026',
    title: 'Asimov Agentic Safety Evaluation',
    authors: ['Google DeepMind'],
    year: 2026,
    url: 'https://huggingface.co/datasets/google/asimov_agentic',
    type: 'docs',
  },
  {
    // Press report of a vendor livestream; Figure published no technical
    // writeup of the eight-hour shift itself.
    id: 'figure-8hr-shift-2026',
    title:
      "Figure AI's Helix-02 Robots Complete Full 8-Hour Autonomous Shifts as Humanoid Race Intensifies",
    authors: ['Kyle Belmonte'],
    year: 2026,
    url: 'https://www.techtimes.com/articles/316632/20260514/figure-ais-helix-02-robots',
    type: 'press',
  },
  {
    // Brooks argues for engineered learning inputs and tactile data.
    // Speech preprocessing varies by implementation; humanoid forecasts
    // and hand-deployment assertions are his date-scoped assessments.
    // The essay reports video timings and physiology; this entry does
    // not independently certify those measurements or linked sources.
    // Historical registry check: 2026-08-12; not re-certified here.
    id: 'brooks-dexterity-2025',
    title: "Why Today's Humanoids Won't Learn Dexterity",
    authors: ['Rodney Brooks'],
    year: 2025,
    url: 'https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/',
    type: 'blog',
  },
  {
    // Perspective on Johansson & Vallbo's work; the source Brooks cites for
    // ~17,000 low-threshold mechanoreceptors per human hand, ~1,000 at each
    // fingertip. Wiley bot-walls direct fetches; verified through Crossref
    // content negotiation (2026-08-12). The bot-wall is durable, not
    // transient (re-observed 2026-08-18), and DOI-bearing URLs are the
    // documented-exception path in data/link-check-exceptions.ts when
    // Crossref cannot fully corroborate the entry; this one cross-checks
    // cleanly (Crossref title/author/year), so it needs no exception.
    id: 'macefield-touch-2022',
    title: 'Why is our sense of touch so good at our fingertips?',
    authors: ['Vaughan G. Macefield'],
    year: 2022,
    venue: 'The Journal of Physiology',
    url: 'https://doi.org/10.1113/JP282846',
    type: 'paper',
  },
  {
    // Science Robotics editorial; the "100,000-year data gap" framing and
    // the good-old-fashioned-engineering counterproposal. Science bot-walls
    // direct fetches; title, author, and date verified through Crossref
    // metadata (2026-08-12; bot-wall re-observed 2026-08-18, durable).
    // Crossref corroborates this entry fully (title/year), so it needs no
    // link-check exception: DOI-bearing bot-walls are only excepted when
    // the Crossref record itself cannot confirm the registry entry.
    id: 'goldberg-data-gap-2025',
    title:
      'Good old-fashioned engineering can close the 100,000-year "data gap" in robotics',
    authors: ['Ken Goldberg'],
    year: 2025,
    venue: 'Science Robotics',
    url: 'https://doi.org/10.1126/scirobotics.aea7390',
    type: 'paper',
  },
  {
    // Position paper; the "missing pillars" critique of policy-scaling-only
    // approaches. Title and author list verified against the live arXiv
    // abstract page (2026-08-12).
    id: 'karcini-position-2026',
    title: 'Robots Need More than VLA and World Models',
    authors: [
      'Elis Karcini',
      'Faisal Mehrban',
      'Quang Nguyen',
      'Mac Schwager',
      'Arash Ajoudani',
      'Cesar Cadena',
      'Jan Peters',
      'Marco Hutter',
      'Haitham Bou-Ammar',
    ],
    year: 2026,
    arxiv: '2606.06556',
    url: 'https://arxiv.org/abs/2606.06556',
    type: 'paper',
  },
  {
    // Brooks's rebuttal to Sutton: CNN front ends as engineered priors
    // and the total-cost-of-solution counterargument. Its closing
    // word-count comparison is Brooks's own statement, not a recount.
    // Historical registry check: 2026-08-12; not re-certified here.
    id: 'brooks-better-lesson-2019',
    title: 'A Better Lesson',
    authors: ['Rodney Brooks'],
    year: 2019,
    url: 'https://rodneybrooks.com/a-better-lesson/',
    type: 'blog',
  },
  {
    // Sutton's essay, the reference statement of the scaling thesis. The
    // original is http-only (self-signed cert; https 404s), so the registry
    // carries the dated archival mirror per the settled policy in
    // library/content-quality.md; author, title and the original March 13,
    // 2019 date stay in the entry. Mirror verified live (200, 2026-08-18):
    // "general methods that leverage computation are ultimately the most
    // effective".
    id: 'sutton-bitter-lesson-2019',
    title: 'The Bitter Lesson',
    authors: ['Rich Sutton'],
    year: 2019,
    url: 'https://web.archive.org/web/20241231102234/http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
    type: 'blog',
  },
  {
    // Press source for Musk's "We already changed the design. This one
    // didn't actually work." (X post, 2026-04-19, embedded in full); no
    // first-party URL is machine-checkable (x.com bot-walls). The DROIDS
    // patent writeup predates the post by two days and does not carry it.
    id: 'teslarati-optimus-hand-2026',
    title: 'Elon Musk reveals shocking Tesla Optimus patent detail',
    authors: ['Joey Klender'],
    year: 2026,
    venue: 'Teslarati',
    url: 'https://www.teslarati.com/elon-musk-reveals-shocking-tesla-optimus-patent-detail/',
    type: 'press',
  },
  {
    // Press source (no first-party page states the supervised-operations
    // deployment detail; nucleuslab.ai is a one-line landing page): Nucleus
    // emerged from stealth 2026-08 with humanoids in a German factory in
    // under 90 days, run under human supervision that is faded out as the
    // collected data improves the models.
    id: 'nucleus-supervised-2026',
    title:
      'Nucleus Robotics Emerges From Stealth With Humanoids on the German Factory Floor',
    authors: ['Rocking Robots'],
    year: 2026,
    url: 'https://www.rockingrobots.com/nucleus-robotics-emerges-from-stealth-with-humanoids-on-the-german-factory-floor/',
    type: 'press',
  },
  {
    // Verified against the live arXiv abstract page (2026-08-12): coding
    // agents running a reset-execute-verify-refine loop reach 99% success
    // on dexterous tasks (pin-box organizing, zip tie, tool use), faster
    // with a robot fleet.
    id: 'enpire-2026',
    title: 'ENPIRE: Agentic Robot Policy Self-Improvement in the Real World',
    authors: [
      'Wenli Xiao',
      'Jia Xie',
      'Tonghe Zhang',
      'Haotian Lin',
      'Letian Fu',
      'Haoru Xue',
      'Jalen Lu',
      'Yi Yang',
      'Cunxi Dai',
      'Zi Wang',
      'Jimmy Wu',
      'Guanzhi Wang',
      'S. Shankar Sastry',
      'Ken Goldberg',
      'Linxi Fan',
      'Yuke Zhu',
      'Guanya Shi',
    ],
    year: 2026,
    arxiv: '2606.19980',
    url: 'https://arxiv.org/abs/2606.19980',
    type: 'paper',
  },
  {
    // Model page, verified against the live page (2026-08-12): ER 2 is
    // "a high-level brain for robots" that plans multi-step tasks and
    // hands motor execution to a lower-level VLA.
    id: 'gemini-robotics-er2-2026',
    title: 'Gemini Robotics ER 2',
    authors: ['Google DeepMind'],
    year: 2026,
    url: 'https://deepmind.google/models/gemini-robotics/embodied-reasoning/',
    type: 'docs',
  },
  {
    // Verified against the live post (2026-08-12): the fifteen Robot
    // Olympics tasks, the four limitations of learning-from-demonstration
    // (no wrist force feedback, limited finger control, no sense of touch,
    // 1-3 cm precision), and footnote 3 on Optimus's 22-DoF cable-driven
    // hand.
    id: 'holson-olympics-2025',
    title: "Benjie's Humanoid Olympic Games",
    authors: ['Benjie Holson'],
    year: 2025,
    url: 'https://generalrobots.substack.com/p/benjies-humanoid-olympic-games',
    type: 'blog',
  },
  {
    // First-party release, verified 2026-08-12: "4th generation hands ...
    // 16 degrees of freedom and human-equivalent strength".
    // Figure AI Inc. release hosted by PRNewswire (Aug 6, 2024 dateline,
    // SOURCE Figure AI Inc.): second-generation humanoid, "4th generation
    // hands" "equipped with 16 degrees of freedom"; the release does not
    // explicitly resolve per-hand versus combined DoF or give an actuator
    // count. Retained web fetch text 2026-09-14, tool-reported 200.
    id: 'figure-02-2024',
    title:
      'Figure unveils Figure 02, its second-generation humanoid, setting new standards in AI and robotics',
    authors: ['Figure AI'],
    year: 2024,
    url: 'https://www.prnewswire.com/news-releases/figure-unveils-figure-02-its-second-generation-humanoid-setting-new-standards-in-ai-and-robotics-302214889.html',
    type: 'press',
  },
  {
    // Retained web fetch text (2026-09-14, tool-reported 200): the initial
    // Go-Big human-video result is navigation (images/language to low-level
    // SE(2) velocity commands, no robot demonstrations for that approach);
    // Brookfield owns 100,000+ residential units (portfolio bound) and
    // collection had begun and would expand.
    id: 'figure-go-big-2025',
    title:
      'Project Go-Big: Internet-Scale Humanoid Pretraining and Direct Human-to-Robot Transfer',
    authors: ['Figure AI'],
    year: 2025,
    url: 'https://www.figure.ai/news/project-go-big',
    type: 'blog',
  },
  {
    // First-party PR, verified 2026-08-12: 21-DoF hydraulic hands,
    // miniaturized valves tested past two billion cycles, zero-shot
    // in-hand manipulation demo.
    id: 'sanctuary-inhand-2024',
    title:
      'Sanctuary AI Demonstrates In-Hand Manipulation Capabilities for Improved General Purpose Robot Dexterity',
    authors: ['Sanctuary AI'],
    year: 2024,
    url: 'https://sanctuary.ai/news/sanctuary-ai-demonstrates-in-hand-manipulation-capabilities-for-improved-general-purpose-robot-dexterity/',
    type: 'press',
  },
  {
    // First-party PR, verified 2026-08-12: tactile sensor integration into
    // Phoenix, with the Wells and Fishel quotes on why vision alone is not
    // enough. The 5 mN sensitivity figure itself is not stated here; it is
    // documented by the RoboZaps review (robozaps-phoenix-2026).
    id: 'sanctuary-tactile-2025',
    title:
      'Sanctuary AI Equips General Purpose Robots with New Touch Sensors for Performing Highly Dexterous Tasks',
    authors: ['Sanctuary AI'],
    year: 2025,
    url: 'https://sanctuary.ai/news/sanctuary-ai-equips-general-purpose-robots/',
    type: 'press',
  },
  {
    // Vendor engineering blog, verified 2026-08-12: sim-trained in-hand
    // reorientation policy executed in the real world against gravity with
    // a 500 g added load. Vendor-run result; labeled as such in prose.
    id: 'sanctuary-hydraulic-rl-2025',
    title:
      'Sanctuary AI Leads the Industry in Controlling Advanced Hydraulic Hands Using Reinforcement Learning',
    authors: ['Sanctuary AI'],
    year: 2025,
    url: 'https://sanctuary.ai/news/sanctuary-ai-controlling-advanced-hydraulic-hands/',
    type: 'blog',
  },
  {
    // Verified against the live product page (2026-08-12): 20 actuated DoF
    // plus 4 under-actuated movements (24 joints), 20 DC motors, tendon
    // driven, 100+ sensors at up to 1 kHz, two Shadow Tactile Fingertips
    // fitted as standard, 4.3 kg.
    id: 'shadow-dexterous-hand-2026',
    title: 'Shadow Dexterous Hand Series',
    authors: ['Shadow Robot'],
    year: 2026,
    url: 'https://shadowrobot.com/dexterous-hand-series/',
    type: 'docs',
  },
  {
    // Verified against the live post (2026-08-12): "the price for the full
    // Shadow Hand Plus today is ... EUR 110k including shipping,
    // installation, training and support".
    id: 'shadow-hand-cost-2022',
    title: 'How Much does a Robot Hand Cost?',
    authors: ['Shadow Robot'],
    year: 2022,
    url: 'https://shadowrobot.com/how-much-does-a-robot-hand-cost/',
    type: 'blog',
  },
  {
    // Patent analysis, verified 2026-08-12: WO2026080687 describes a
    // tendon-driven hand with forearm actuators, ~4 DoF per finger, 2 wrist
    // DoF, three tendons per finger, 22 DoF in the hand as Teslarati
    // describes the V3 configuration; the post also documents Musk's
    // April 19, 2026 "this one didn't actually work" design change.
    id: 'droids-optimus-v3-hand-2026',
    title:
      "The Forearm Is the New Hand: Inside Tesla's Optimus V3 Patents",
    authors: ['Diana Wolf Torres', 'Alexander W. Torres'],
    year: 2026,
    url: 'https://droids.substack.com/p/the-forearm-is-the-new-hand-inside',
    type: 'blog',
  },
  {
    // Specialist aggregator review, verified 2026-08-12: documents the
    // 21-DoF-per-hand figure (correcting the stale 20-DoF total), the
    // ~5 mN micro-barometer tactile arrays, and Sanctuary's June 2026
    // pivot. Used because no first-party page states the 5 mN figure.
    id: 'robozaps-phoenix-2026',
    title: 'Sanctuary AI Phoenix 2026: Price, Is It For Sale & What It Is',
    authors: ['RoboZaps'],
    year: 2026,
    url: 'https://blog.robozaps.com/b/sanctuary-ai-phoenix-review',
    type: 'press',
  },
  {
    // Specialist aggregator review, verified 2026-08-12: $29,900 China list
    // price re-checked against Unitree's store on 2026-07-17, base model
    // ships with non-functional placeholder hands, Dex5 hands are paid
    // add-ons, H2 Plus at $100,000 with Sharpa Wave tactile hands.
    id: 'robozaps-unitree-h2-2026',
    title: 'Unitree H2 Humanoid Robot: $29,900 Price, Specs, vs H1 (2026)',
    authors: ['RoboZaps'],
    year: 2026,
    url: 'https://blog.robozaps.com/b/unitree-h2-review',
    type: 'press',
  },
  {
    // Tertiary aggregator. Used only for the Dex5-1 five-finger option's
    // ~10-12 DoF range, which Unitree does not publish; the underlying
    // references were spot-checked 2026-08-12.
    id: 'wikipedia-humanoid-hand-2026',
    title: 'Humanoid hand',
    authors: ['Wikipedia'],
    year: 2026,
    url: 'https://en.wikipedia.org/wiki/Humanoid_hand',
    type: 'docs',
  },
  {
    // Verified against the arXiv abs page (2026-08-12): ~1M contact-rich
    // interactions on Digit 360; +63% policy success over an end-to-end
    // tactile-image model.
    id: 'sparsh-x-2025',
    title:
      'Tactile Beyond Pixels: Multisensory Touch Representations for Robot Manipulation',
    authors: [
      'Carolina Higuera',
      'Akash Sharma',
      'Taosha Fan',
      'Chaithanya Krishna Bodduluri',
      'Byron Boots',
      'Michael Kaess',
      'Mike Lambeta',
      'Tingfan Wu',
      'Zixi Liu',
      'Francois Robert Hogan',
      'Mustafa Mukadam',
    ],
    year: 2025,
    arxiv: '2506.14754',
    url: 'https://arxiv.org/abs/2506.14754',
    type: 'paper',
  },
  {
    // Verified against the arXiv abs page (2026-08-12): 65.0% clean / 53.7%
    // perturbed success across six contact-rich tasks, +15.7/+18.5 points
    // over the strongest baseline.
    id: 'touchworld-2026',
    title:
      'TouchWorld: A Predictive and Reactive Tactile Foundation Model for Dexterous Manipulation',
    authors: [
      'Jianyi Zhou',
      'Feiyang Hong',
      'Yunhao Li',
      'Yicheng Zhao',
      'Yongjue Cen',
      'Zirui Liu',
      'Jiakang Huang',
      'Zirui Chen',
      'Ruiyang Zhang',
      'Weizhuo Zhu',
      'Xuhua Song',
      'Shuo Yang',
    ],
    year: 2026,
    arxiv: '2607.07287',
    url: 'https://arxiv.org/abs/2607.07287',
    type: 'paper',
  },
  {
    // Verified against the live post (2026-08-12): pi0.6 fine-tuned on
    // Holson's Robot Olympics tasks; gold in 3 of 5 categories, 52%
    // average success, 72% task progress, under 9 hours of data per task,
    // VLM baseline at 9% progress.
    id: 'pi-olympics-2025',
    title: "Moravec's Paradox and the Robot Olympics",
    authors: ['Physical Intelligence'],
    year: 2025,
    url: 'https://www.pi.website/blog/olympics',
    type: 'blog',
  },
  {
    // Verified against the live scorecard (2026-08-12): "Deployable
    // dexterity will remain pathetic compared to human hands beyond 2036"
    // and the prediction that walking humanoids stay too unsafe for close
    // proximity to humans without new mechanical systems.
    id: 'brooks-scorecard-2026',
    title: 'Predictions Scorecard, 2026 January 01',
    authors: ['Rodney Brooks'],
    year: 2026,
    url: 'https://rodneybrooks.com/predictions-scorecard-2026-january-01/',
    type: 'blog',
  },
  {
    // Press report of a Morgan Stanley research note; no first-party
    // publication of the note itself. Verified against the live article
    // (2026-08-12): the "social license to deploy" and "tangible evidence
    // of real-world return on investment" quotes, the retained 50,000-unit
    // China shipment target, and the US import ban raising R&D costs.
    id: 'morgan-stanley-pr-problem-2026',
    title:
      "'PR problem' is standing in the way of China's humanoid robot boom, says Morgan Stanley",
    authors: ['Joseph Wilkins'],
    year: 2026,
    venue: 'CNBC',
    url: 'https://www.cnbc.com/2026/07/29/morgan-stanley-humanoid-robots-pr-problem.html',
    type: 'press',
  },
  {
    // Press source for the on-stage collapse; no first-party incident
    // report exists. Verified against the live article (2026-08-12): the
    // Qualcomm Dragonwing IQ10 humanoid fell face-first during the
    // Computex 2026 keynote, attributed to a communication glitch, and was
    // covered and carried off stage.
    id: 'computex-collapse-2026',
    title: 'Watch: Qualcomm-powered humanoid robot collapses during live keynote',
    authors: ['Jijo Malayil'],
    year: 2026,
    venue: 'Interesting Engineering',
    url: 'https://interestingengineering.com/ai-robotics/qualcomm-robot-unexpected-collapse',
    type: 'press',
  },
  {
    // Press writeup of PitchBook funding data; the broad tally. Verified
    // against the live article (2026-08-12): more than $23B raised
    // globally in 2026 by early June, closing in on the $26B raised in
    // all of 2025.
    id: 'robotics-funding-23b-2026',
    title: 'Robotics Startups Raised $23 Billion in 2026, Closing In On All of 2025',
    authors: ['Andre Savage'],
    year: 2026,
    venue: 'Market Briefs',
    url: 'https://www.briefs.co/news/robotics-startups-raised-23-billion-in-2026-closing-in-on-all-of-2025/',
    type: 'press',
  },
  {
    // Press writeup of Crunchbase venture data; the narrower tally.
    // Verified against the live article (2026-08-12): $18.8B raised in
    // 2026 to date against $15B in all of 2025 and the $14.1B 2021 peak.
    id: 'crunchbase-robotics-funding-2026',
    title:
      'Sector Snapshot: Robotics Startups On Fire As Venture Funding Surges To Record Numbers In 2026',
    authors: ['Mary Ann Azevedo'],
    year: 2026,
    venue: 'Crunchbase News',
    url: 'https://news.crunchbase.com/robotics/startup-venture-funding-surges-2026-data/',
    type: 'press',
  },
  {
    // Press source for the Q1 2026 earnings move; Unitree's own filing
    // figures were not publicly itemized at writing. Title verified
    // against the live article (2026-08-12).
    id: 'unitree-profit-2026',
    title:
      'Robot Boom Meets Earnings Reality: Unitree Profits Halved, Optimus Not for Sale',
    authors: ['Mireya Ramsey'],
    year: 2026,
    venue: 'TechTimes',
    url: 'https://www.techtimes.com/articles/320197/20260711/robot-boom-meets-earnings-reality-unitree-profits-halved-optimus-not-sale.htm',
    type: 'press',
  },
  {
    // Verified against the arXiv abs page (2026-08-12): a global
    // benchmarking infrastructure with standardized hardware kits and two
    // tracks, Physical Skills and Embodied Reasoning; 23 authors.
    id: 'manipulationnet-2026',
    title:
      'ManipulationNet: An Infrastructure for Benchmarking Real-World Robot Manipulation with Physical Skill Challenges and Embodied Multimodal Reasoning',
    authors: [
      'Yiting Chen',
      'Kenneth Kimble',
      'Edward H. Adelson',
      'Tamim Asfour',
      'Podshara Chanrungmaneekul',
      'Sachin Chitta',
      'Yash Chitambar',
      'Ziyang Chen',
      'Ken Goldberg',
      'Danica Kragic',
      'Hui Li',
      'Xiang Li',
      'Yunzhu Li',
      'Aaron Prather',
      'Nancy Pollard',
      'Maximo A. Roa-Garzon',
      'Robert Seney',
      'Shuo Sha',
      'Shihefeng Wang',
      'Yu Xiang',
      'Kaifeng Zhang',
      'Yuke Zhu',
      'Kaiyu Hang',
    ],
    year: 2026,
    arxiv: '2603.04363',
    url: 'https://arxiv.org/abs/2603.04363',
    type: 'paper',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): 5 authors;
    // the canonical planning-and-control survey for urban AVs.
    id: 'paden-2016',
    title:
      'A Survey of Motion Planning and Control Techniques for Self-driving Urban Vehicles',
    authors: ['Brian Paden', 'Michal Cáp', 'Sze Zheng Yong', 'Dmitry S. Yershov', 'Emilio Frazzoli'],
    year: 2016,
    arxiv: '1604.07446',
    url: 'https://arxiv.org/abs/1604.07446',
    type: 'paper',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): 25 authors
    // ("Pei Sun and 24 other authors"); 1150 scenes of 20 s each,
    // lidar + camera, introduced with a geographic-diversity metric.
    id: 'waymo-open-dataset-2020',
    title: 'Scalability in Perception for Autonomous Driving: Waymo Open Dataset',
    authors: [
      'Pei Sun',
      'Henrik Kretzschmar',
      'Xerxes Dotiwalla',
      'Aurelien Chouard',
      'Vijaysai Patnaik',
      'Paul Tsui',
      'James Guo',
      'Yin Zhou',
      'Yuning Chai',
      'Benjamin Caine',
      'Vijay Vasudevan',
      'Wei Han',
      'Jiquan Ngiam',
      'Hang Zhao',
      'Aleksei Timofeev',
      'Scott Ettinger',
      'Maxim Krivokon',
      'Amy Gao',
      'Aditya Joshi',
      'Sheng Zhao',
      'Shuyang Cheng',
      'Yu Zhang',
      'Jonathon Shlens',
      'Zhifeng Chen',
      'Dragomir Anguelov',
    ],
    year: 2020,
    venue: 'CVPR 2020',
    arxiv: '1912.04838',
    url: 'https://arxiv.org/abs/1912.04838',
    type: 'paper',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): 7 authors;
    // graph network over vectorized agents and HD map, ~70% fewer
    // parameters than the raster baseline it matched.
    id: 'vectornet-2020',
    title: 'VectorNet: Encoding HD Maps and Agent Dynamics from Vectorized Representation',
    authors: [
      'Jiyang Gao',
      'Chen Sun',
      'Hang Zhao',
      'Yi Shen',
      'Dragomir Anguelov',
      'Congcong Li',
      'Cordelia Schmid',
    ],
    year: 2020,
    venue: 'CVPR 2020',
    arxiv: '2005.04259',
    url: 'https://arxiv.org/abs/2005.04259',
    type: 'paper',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): 3 authors;
    // 30 million examples still not enough for plain behavior cloning,
    // fixed by synthesizing perturbed (worst-case) demonstrations.
    id: 'chauffeurnet-2018',
    title: 'ChauffeurNet: Learning to Drive by Imitating the Best and Synthesizing the Worst',
    authors: ['Mayank Bansal', 'Alex Krizhevsky', 'Abhijit Ogale'],
    year: 2018,
    arxiv: '1812.03079',
    url: 'https://arxiv.org/abs/1812.03079',
    type: 'paper',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): 16 authors;
    // full-stack perception/prediction/planning in one network, query
    // interfaces between tasks.
    id: 'uniad-2023',
    title: 'Planning-oriented Autonomous Driving',
    authors: [
      'Yihan Hu',
      'Jiazhi Yang',
      'Li Chen',
      'Keyu Li',
      'Chonghao Sima',
      'Xizhou Zhu',
      'Siqi Chai',
      'Senyao Du',
      'Tianwei Lin',
      'Wenhai Wang',
      'Lewei Lu',
      'Xiaosong Jia',
      'Qiang Liu',
      'Jifeng Dai',
      'Yu Qiao',
      'Hongyang Li',
    ],
    year: 2023,
    venue: 'CVPR 2023',
    arxiv: '2212.10156',
    url: 'https://arxiv.org/abs/2212.10156',
    type: 'paper',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): 6 authors;
    // 270-paper survey of end-to-end driving, accepted by IEEE TPAMI.
    id: 'e2e-ad-survey-2024',
    title: 'End-to-end Autonomous Driving: Challenges and Frontiers',
    authors: ['Li Chen', 'Penghao Wu', 'Kashyap Chitta', 'Bernhard Jaeger', 'Andreas Geiger', 'Hongyang Li'],
    year: 2024,
    venue: 'IEEE TPAMI',
    arxiv: '2306.16927',
    url: 'https://arxiv.org/abs/2306.16927',
    type: 'paper',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): 14 authors;
    // Waymo's Gemini-based end-to-end model that emits trajectories,
    // objects, and road graph elements as text. Accepted by TMLR.
    id: 'emma-2024',
    title: 'EMMA: End-to-End Multimodal Model for Autonomous Driving',
    authors: [
      'Jyh-Jing Hwang',
      'Runsheng Xu',
      'Hubert Lin',
      'Wei-Chih Hung',
      'Jingwei Ji',
      'Kristy Choi',
      'Di Huang',
      'Tong He',
      'Paul Covington',
      'Benjamin Sapp',
      'Yin Zhou',
      'James Guo',
      'Dragomir Anguelov',
      'Mingxing Tan',
    ],
    year: 2024,
    venue: 'TMLR',
    arxiv: '2410.23262',
    url: 'https://arxiv.org/abs/2410.23262',
    type: 'paper',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): 3 authors;
    // Mobileye's Responsibility-Sensitive Safety: a white-box formal
    // model intended to make safety assurance verifiable and scalable.
    id: 'rss-2017',
    title: 'On a Formal Model of Safe and Scalable Self-driving Cars',
    authors: ['Shai Shalev-Shwartz', 'Shaked Shammah', 'Amnon Shashua'],
    year: 2017,
    arxiv: '1708.06374',
    url: 'https://arxiv.org/abs/1708.06374',
    type: 'paper',
  },
  {
    // DOI-bearing URL (redirects to the Elsevier page; the RAND-hosted
    // report page is bot-walled and Crossref metadata backs the DOI):
    // the RAND study quantifying how many failure-free miles it would
    // take to demonstrate AV reliability statistically.
    id: 'kalra-paddock-2016',
    title:
      'Driving to safety: How many miles of driving would it take to demonstrate autonomous vehicle reliability?',
    authors: ['Nidhi Kalra', 'Susan M. Paddock'],
    year: 2016,
    venue: 'Transportation Research Part A',
    url: 'https://doi.org/10.1016/j.tra.2016.09.010',
    type: 'paper',
  },
  {
    // Verified against the live page (2026-08-15, HTTP 200): the federal
    // investigation of the March 18, 2018 Tempe fatality, adopted
    // November 19, 2019.
    id: 'ntsb-uber-2019',
    title:
      'Collision Between Vehicle Controlled by Developmental Automated Driving System and Pedestrian, Tempe, Arizona, March 18, 2018',
    authors: ['NTSB'],
    year: 2019,
    venue: 'Highway Accident Report NTSB/HAR-19/03',
    url: 'https://www.ntsb.gov/investigations/accidentreports/reports/har1903.pdf',
    type: 'docs',
  },
  {
    // Verified against the live page (2026-08-15, HTTP 200): Koopman's
    // essay arguing "safe enough" is a multi-dimensional assurance
    // question, not a single crashes-per-mile ratio.
    id: 'koopman-safe-enough-2026',
    title: "What's the Deal with Safe Enough Autonomous Vehicles?",
    authors: ['Philip Koopman'],
    year: 2026,
    venue: 'Safe Autonomy (Substack)',
    url: 'https://philkoopman.substack.com/p/whats-the-deal-with-safe-enough-autonomous',
    type: 'blog',
  },
  {
    // Verified against the live page (2026-08-15, HTTP 200): SAE's own
    // summary of the J3016 levels revision.
    id: 'sae-j3016-2021',
    title: 'SAE Levels of Driving Automation Refined for Clarity and International Audience',
    authors: ['SAE'],
    year: 2021,
    venue: 'SAE International',
    url: 'https://www.sae.org/news/blog/sae-levels-driving-automation-clarity-refinements',
    type: 'docs',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): 6 authors;
    // 56.7M rider-only miles, crash rates by type against human
    // benchmarks aligned to the same roads.
    id: 'waymo-crash-rates-2025',
    title:
      'Comparison of Waymo Rider-Only Crash Rates by Crash Type to Human Benchmarks at 56.7 Million Miles',
    authors: [
      'Kristofer D. Kusano',
      'John M. Scanlon',
      'Yin-Hsiu Chen',
      'Timothy L. McMurry',
      'Tilia Gode',
      'Trent Victor',
    ],
    year: 2025,
    arxiv: '2505.01515',
    url: 'https://arxiv.org/abs/2505.01515',
    type: 'paper',
  },
  {
    // Verified against the live blog page (2026-08-15, HTTP 200): the
    // Genie-3-derived generative simulator emitting camera and lidar,
    // controllable through driving action, scene layout, and language.
    id: 'waymo-world-model-2026',
    title: 'The Waymo World Model: A New Frontier For Autonomous Driving Simulation',
    authors: ['Waymo'],
    year: 2026,
    venue: 'Waymo Blog',
    url: 'https://waymo.com/blog/2026/02/the-waymo-world-model-a-new-frontier-for-autonomous-driving-simulation/',
    type: 'blog',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): 20 authors;
    // survey mapping the driving VLA landscape into end-to-end and
    // dual-system paradigms.
    id: 'vla-ad-survey-2026',
    title: 'Vision-Language-Action Models for Autonomous Driving: Past, Present, and Future',
    authors: [
      'Tianshuai Hu',
      'Xiaolu Liu',
      'Song Wang',
      'Yiyao Zhu',
      'Ao Liang',
      'Lingdong Kong',
      'Guoyang Zhao',
      'Zeying Gong',
      'Jun Cen',
      'Zhiyu Huang',
      'Xiaoshuai Hao',
      'Linfeng Li',
      'Hang Song',
      'Xiangtai Li',
      'Jun Ma',
      'Shaojie Shen',
      'Jianke Zhu',
      'Dacheng Tao',
      'Ziwei Liu',
      'Junwei Liang',
    ],
    // Year corrected 2026-08-20 (arXiv author sweep): v1 submitted
    // 2025-12-18; the "2026 survey" phrasing in the citing article now
    // reads "a late-2025 survey".
    year: 2025,
    arxiv: '2512.16760',
    url: 'https://arxiv.org/abs/2512.16760',
    type: 'paper',
  },
  {
    // Verified via Crossref metadata for doi:10.1126/scirobotics.aat3536
    // (2026-08-18): six authors, Science Robotics 2018; abstract states
    // "validated with a self-organized swarm of 30 drones". The science.org
    // page itself is Cloudflare-walled to machine clients, Crossref stands
    // in per the link-check exception policy.
    id: 'vasarhelyi-flocking-2018',
    title: 'Optimized flocking of autonomous drones in confined environments',
    // First author corrected 2026-08-20: Crossref publishes Gábor
    // Vásárhelyi as first author (the registry previously said Tamás, who
    // is the fourth author).
    authors: [
      'Gábor Vásárhelyi',
      'Csaba Virágh',
      'Gergő Somorjai',
      'Tamás Nepusz',
      'Agoston E. Eiben',
      'Tamás Vicsek',
    ],
    year: 2018,
    venue: 'Science Robotics 3(20), eaat3536',
    url: 'https://www.science.org/doi/10.1126/scirobotics.aat3536',
    type: 'paper',
  },
  {
    // Registered 2026-09-16 from the frozen drones source packet (zero
    // retrieval by the integrator): the author's own page (red3d.com,
    // curl GET 200, 80,969 bytes, 2026-09-16T05:57:36Z) prints the title,
    // "the 1987 model" and "the SIGGRAPH '87 boids paper". The printed
    // bibliographic line comes from the fetched Soria Nature MI reference
    // list: "Reynolds, C. W. Flocks, herds and schools: a distributed
    // behavioral model. Comput. Graph. 21, 25-43 (1987)." The ACM DL record
    // (doi 10.1145/37402.37406) is Cloudflare-walled to machines (HTTP 403
    // in the preparing session), so the ACM-canonical page range is not
    // confirmed; the venue records the Soria-printed range with that caveat.
    id: 'reynolds-boids-1987',
    title: 'Flocks, Herds and Schools: A Distributed Behavioral Model',
    authors: ['Craig W. Reynolds'],
    year: 1987,
    venue:
      "Computer Graphics (SIGGRAPH '87) 21, pages 25-43 as printed by the fetched Soria reference list; ACM DL machine-walled so canonical pages unconfirmed",
    url: 'https://www.red3d.com/cwr/boids/',
    type: 'paper',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): title, six
    // authors, Science Robotics 2021 journal reference.
    id: 'high-speed-flight-2021',
    title: 'Learning High-Speed Flight in the Wild',
    authors: [
      'Antonio Loquercio',
      'Elia Kaufmann',
      'René Ranftl',
      'Matthias Müller',
      'Vladlen Koltun',
      'Davide Scaramuzza',
    ],
    year: 2021,
    venue: 'Science Robotics 2021, Vol. 6, Issue 59, abg5810',
    arxiv: '2110.05113',
    url: 'https://arxiv.org/abs/2110.05113',
    type: 'paper',
  },
  {
    // Verified against the live Nature page (2026-08-15): title, six
    // authors, Nature 620, 982-987; Swift beat three champions and set
    // the fastest race time.
    id: 'swift-drone-racing-2023',
    title: 'Champion-level drone racing using deep reinforcement learning',
    authors: [
      'Elia Kaufmann',
      'Leonard Bauersfeld',
      'Antonio Loquercio',
      'Matthias Müller',
      'Vladlen Koltun',
      'Davide Scaramuzza',
    ],
    year: 2023,
    venue: 'Nature 620, 982-987',
    url: 'https://www.nature.com/articles/s41586-023-06419-4',
    type: 'paper',
  },
  {
    // Verified against the live arXiv abs page (2026-08-15): five
    // authors; Science Robotics 2023 journal reference; the RL-vs-OC
    // racing study, 108 km/h peak, >12g peak acceleration.
    id: 'racing-rl-vs-oc-2023',
    title:
      'Reaching the Limit in Autonomous Racing: Optimal Control versus Reinforcement Learning',
    authors: [
      'Yunlong Song',
      'Angel Romero',
      'Matthias Mueller',
      'Vladlen Koltun',
      'Davide Scaramuzza',
    ],
    year: 2023,
    venue: 'Science Robotics 2023, adg1462',
    arxiv: '2310.10943',
    url: 'https://arxiv.org/abs/2310.10943',
    type: 'paper',
  },
  {
    // Verified against Crossref (2026-08-15): title, three authors,
    // RA-L 4(2):1884-1891. The sense-and-avoid latency study the drones
    // module's interactive reproduces.
    id: 'falanga-latency-2019',
    title:
      'How Fast Is Too Fast? The Role of Perception Latency in High-Speed Sense and Avoid',
    authors: ['Davide Falanga', 'Suseong Kim', 'Davide Scaramuzza'],
    year: 2019,
    venue: 'IEEE Robotics and Automation Letters 4(2), 1884-1891',
    url: 'https://doi.org/10.1109/LRA.2019.2898117',
    type: 'paper',
  },
  {
    // Verified against the HKUST research portal record (2026-08-15):
    // eleven authors, Science Robotics 7(66), eabm5954.
    id: 'micro-drone-swarm-2022',
    title: 'Swarm of micro flying robots in the wild',
    authors: [
      'Xin Zhou',
      'Xiangyong Wen',
      'Zhepei Wang',
      'Yuman Gao',
      'Haojia Li',
      'Qianhao Wang',
      'Tiankai Yang',
      'Haojian Lu',
      'Yanjun Cao',
      'Chao Xu',
      'Fei Gao',
    ],
    year: 2022,
    venue: 'Science Robotics 7(66), eabm5954',
    url: 'https://www.science.org/doi/10.1126/scirobotics.abm5954',
    type: 'paper',
  },
  {
    // Verified against the live Nature Machine Intelligence page
    // (2026-08-15): three authors, 3, 545-554; NMPC swarm control.
    id: 'soria-nmpc-swarm-2021',
    title: 'Predictive control of aerial swarms in cluttered environments',
    authors: ['Enrica Soria', 'Fabrizio Schiano', 'Dario Floreano'],
    year: 2021,
    venue: 'Nature Machine Intelligence 3, 545-554',
    url: 'https://www.nature.com/articles/s42256-021-00341-y',
    type: 'paper',
  },
  {
    // Verified against Crossref and the live Science Robotics page
    // (2026-08-15): editorial, 12 authors, Sci. Robot. 2(4), eaam8638;
    // proposes the six-level autonomy framework the module organizes
    // its comparison around.
    id: 'yang-autonomy-2017',
    title:
      'Medical robotics\u2014Regulatory, ethical, and legal considerations for increasing levels of autonomy',
    authors: [
      'Guang-Zhong Yang',
      'James Cambias',
      'Kevin Cleary',
      'Eric Daimler',
      'James Drake',
      'Pierre E. Dupont',
      'Nobuhiko Hata',
      'Peter Kazanzides',
      'Sylvain Martel',
      'Rajni V. Patel',
      'Veronica J. Santos',
      'Russell H. Taylor',
    ],
    year: 2017,
    venue: 'Science Robotics 2(4), eaam8638',
    url: 'https://doi.org/10.1126/scirobotics.aam8638',
    type: 'paper',
  },
  {
    // Verified against Crossref and the live Science Translational
    // Medicine page (2026-08-15): six authors, Sci. Transl. Med. 8(337),
    // 337ra64; the STAR supervised-autonomous anastomosis study.
    id: 'star-suturing-2016',
    title: 'Supervised autonomous robotic soft tissue surgery',
    authors: [
      'Azad Shademan',
      'Ryan S. Decker',
      'Justin D. Opfermann',
      'Simon Leonard',
      'Axel Krieger',
      'Peter C. W. Kim',
    ],
    year: 2016,
    venue: 'Science Translational Medicine 8(337), 337ra64',
    url: 'https://doi.org/10.1126/scitranslmed.aad9398',
    type: 'paper',
  },
  {
    // Verified against the live GlobeNewswire distribution of Intuitive's
    // release (2026-08-15): 510(k) for da Vinci 5, 150+ enhancements,
    // Force Feedback with up to 43% less force on tissue in preclinical
    // trials, 10,000x the computing power of Xi.
    id: 'davinci5-clearance-2024',
    title:
      'Intuitive Announces FDA Clearance of Fifth-Generation Robotic System, da Vinci 5',
    authors: ['Intuitive Surgical'],
    year: 2024,
    venue: 'GlobeNewswire, 14 March 2024',
    url: 'https://www.globenewswire.com/news-release/2024/03/14/2846718/7637/en/Intuitive-Announces-FDA-Clearance-of-Fifth-Generation-Robotic-System-da-Vinci-5.html',
    type: 'press',
  },
  {
    // Verified against the live GlobeNewswire distribution of Intuitive's
    // Q4 2025 earnings release (2026-08-15): 11,106 da Vinci systems
    // installed as of 31 December 2025, up 12% from 9,902 a year earlier;
    // ~17% da Vinci procedure growth in 2025.
    id: 'intuitive-q4-2025',
    title: 'Intuitive Announces Fourth Quarter Earnings',
    authors: ['Intuitive Surgical'],
    year: 2026,
    venue: 'GlobeNewswire, 22 January 2026',
    url: 'https://www.globenewswire.com/news-release/2026/01/22/3224266/0/en/intuitive-announces-fourth-quarter-earnings.html',
    type: 'press',
  },
  {
    // Verified against the live GlobeNewswire distribution of CMR's
    // release (2026-08-15): first multiport soft-tissue general surgical
    // RASD through De Novo, indicated for adult cholecystectomy; over
    // 26,000 procedures completed outside the US at announcement;
    // ~2.5% of ~10M annual US major OR procedures robotic-assisted.
    id: 'cmr-versius-authorization-2024',
    title:
      'CMR Surgical receives U.S. FDA Marketing Authorization for next-generation Versius Surgical System',
    authors: ['CMR Surgical'],
    year: 2024,
    venue: 'GlobeNewswire, 15 October 2024',
    url: 'https://www.globenewswire.com/news-release/2024/10/15/2963054/0/en/CMR-Surgical-receives-US-FDA-Marketing-Authorization-for-Versius-Surgical-System.html',
    type: 'press',
  },
  {
    // Verified against the live SAGES TAVAC record (2026-08-15): first
    // 510(k) 6 December 2022, predicate ENDEX Endoscopic Positioning
    // System (K936308); two-armed hold-and-position assistant compatible
    // with standard laparoscopic cameras and instruments; Cadiere's
    // 30-patient series without an assistant.
    id: 'maestro-tavac-2023',
    title: 'Moon Surgical Maestro Surgical Robotics System',
    authors: ['Ruben D. Salas Parra', 'David Pechman'],
    year: 2023,
    venue: 'SAGES Technology and Value Assessment Committee',
    url: 'https://www.sages.org/publications/tavac/moon-surgical-maestro-surgical-robotics-system',
    type: 'docs',
  },
  {
    // Verified against the live PR Newswire release via Yahoo Finance
    // (2026-08-15): ScoPilot 510(k) 18 March 2025, runs NVIDIA Holoscan
    // locally on Maestro, camera follows the instrument tip; commercial
    // Maestro cleared June 2024, over 1,100 patients treated across the
    // US and Europe at announcement. SAGES TAVAC corroborates the date.
    id: 'scopilot-clearance-2025',
    title:
      'Moon Surgical receives FDA clearance for ScoPilot on Maestro, industry\u2019s first AI-enhanced intraoperative capability, powered by NVIDIA Holoscan',
    authors: ['Moon Surgical'],
    year: 2025,
    venue: 'PR Newswire, 18 March 2025',
    url: 'https://www.prnewswire.com/news-releases/moon-surgical-receives-fda-clearance-for-scopilot-on-maestro-industrys-first-ai-enhanced-intraoperative-capability-powered-by--nvidia-holoscan-302404920.html',
    type: 'press',
  },
  {
    // Live-verified against the FDA database record (2026-08-16): 510(k)
    // K252111, cleared 16 December 2025, trade name "Versius Surgical
    // System (Versius Plus)", applicant CMR Surgical Limited. Backs the
    // Versius Plus December 2025 clearance in lib/surgical-systems.ts.
    id: 'versius-plus-510k-2025',
    title: '510(k) K252111: Versius Surgical System (Versius Plus)',
    authors: ['U.S. Food and Drug Administration'],
    year: 2025,
    venue: 'FDA 510(k) Premarket Notification Database',
    url: 'https://www.accessdata.fda.gov/cdrh_docs/pdf25/K252111.pdf',
    type: 'docs',
  },
  {
    // Live-verified against the FDA database record (2026-08-16): 510(k)
    // K240598, cleared 3 June 2024, trade name "Maestro System (REF100)",
    // applicant Moon Surgical. Backs the commercial Maestro June 2024
    // clearance in lib/surgical-systems.ts.
    id: 'maestro-commercial-510k-2024',
    title: '510(k) K240598: Maestro System (REF100)',
    authors: ['U.S. Food and Drug Administration'],
    year: 2024,
    venue: 'FDA 510(k) Premarket Notification Database',
    url: 'https://www.accessdata.fda.gov/cdrh_docs/pdf24/K240598.pdf',
    type: 'docs',
  },
  {
    // Verified against Crossref metadata and the live Science Robotics
    // record (2026-08-15): Science Robotics 2(7), eaan4582, June 2017,
    // 15 authors, Francis et al. first. AEGIS onboard autonomous
    // targeting for ChemCam on Curiosity.
    id: 'aegis-curiosity-2017',
    title:
      'AEGIS autonomous targeting for ChemCam on Mars Science Laboratory: Deployment and results of initial science team use',
    authors: [
      'R. Francis',
      'T. Estlin',
      'G. Doran',
      'S. Johnstone',
      'D. Gaines',
      'V. Verma',
      'M. Burl',
      'J. Frydenvang',
      'S. Monta\u00f1o',
      'R. C. Wiens',
      'S. Schaffer',
      'O. Gasnault',
      'L. DeFlores',
      'D. Blaney',
      'B. Bornstein',
    ],
    year: 2017,
    venue: 'Science Robotics 2(7), eaan4582',
    url: 'https://doi.org/10.1126/scirobotics.aan4582',
    type: 'paper',
  },
  {
    // Verified against Crossref metadata (2026-08-15): Science Robotics
    // 8(80), adi3099, 12 July 2023, 12 authors, Verma et al. first. The
    // AutoNav/AEGIS/OnBoard Planner overview: 88% of 17.7 km evaluated
    // autonomously in the first Mars year, 699.9 m without human review,
    // 347.7 m single-sol record.
    id: 'perseverance-autonomy-2023',
    title:
      "Autonomous robotics is driving Perseverance rover's progress on Mars",
    authors: [
      'Vandi Verma',
      'Mark W. Maimone',
      'Daniel M. Gaines',
      'Raymond Francis',
      'Tara A. Estlin',
      'Stephen R. Kuhn',
      'Gregg R. Rabideau',
      'Steve A. Chien',
      'Michael M. McHenry',
      'Evan J. Graser',
      'Arturo L. Rankin',
      'Ellen R. Thiel',
    ],
    year: 2023,
    venue: 'Science Robotics 8(80), adi3099',
    url: 'https://doi.org/10.1126/scirobotics.adi3099',
    type: 'paper',
  },
  {
    // Verified against the live JPL page (2026-08-15): 122 g of oxygen
    // over 16 runs, 12 g/h peak at 98% purity or better, twice NASA's
    // original goals; concluded 6 September 2023.
    id: 'moxie-completion-2023',
    title:
      'NASA\u2019s Oxygen-Generating Experiment MOXIE Completes Mars Mission',
    authors: ['NASA Jet Propulsion Laboratory'],
    year: 2023,
    venue: 'NASA/JPL news, 6 September 2023',
    url: 'https://www.jpl.nasa.gov/news/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/',
    type: 'press',
  },
  {
    // Verified against the live JPL page (2026-08-15): first powered,
    // controlled flight on another planet, 19 April 2021.
    id: 'ingenuity-first-flight-2021',
    title:
      'NASA\u2019s Ingenuity Mars Helicopter Succeeds in Historic First Flight',
    authors: ['NASA Jet Propulsion Laboratory'],
    year: 2021,
    venue: 'NASA/JPL news, 19 April 2021',
    url: 'https://www.jpl.nasa.gov/news/nasas-ingenuity-mars-helicopter-succeeds-in-historic-first-flight/',
    type: 'press',
  },
  {
    // Verified against the live NASA release (2026-08-15): designed for
    // five flights over 30 days, flew 72 over almost three years;
    // mission end announced 25 January 2024.
    id: 'ingenuity-mission-end-2024',
    title:
      'After Three Years on Mars, NASA\u2019s Ingenuity Helicopter Mission Ends',
    authors: ['NASA'],
    year: 2024,
    venue: 'NASA news release, 25 January 2024',
    url: 'https://www.nasa.gov/news-release/after-three-years-on-mars-nasas-ingenuity-helicopter-mission-ends/',
    type: 'press',
  },
  {
    // Verified against the live NASA article (2026-08-15): Athena landed
    // on its side ~400 m off Mons Mouton on 6 March 2025; TRIDENT's
    // actuators performed as designed; MSOLO detected only anthropogenic
    // gases; ~10 hours of operations against 10 planned days. Updated
    // 29 April 2025.
    id: 'prime-1-lunar-2025',
    title: 'NASA\u2019s Lunar Drill Technology Passes Tests on the Moon',
    authors: ['NASA'],
    year: 2025,
    venue: 'NASA article, 29 April 2025',
    url: 'https://www.nasa.gov/missions/artemis/nasas-lunar-drill-technology-passes-tests-on-the-moon/',
    type: 'press',
  },
  {
    // Verified against Crossref metadata (2026-08-15): Journal of
    // Spacecraft and Rockets 38(1), 105-111, January 2001. ETS-VII
    // performed the autonomous rendezvous and docking experiments in
    // 1997-1998.
    id: 'ets-vii-ard-2001',
    title:
      'Result of Autonomous Rendezvous Docking Experiment of Engineering Test Satellite-VII',
    authors: ['Isao Kawano', 'Masaaki Mokuno', 'Toru Kasai', 'Takashi Suzuki'],
    year: 2001,
    venue: 'Journal of Spacecraft and Rockets 38(1), 105-111',
    url: 'https://doi.org/10.2514/2.3661',
    type: 'paper',
  },
  {
    // Verified against Crossref metadata (2026-08-15): Experimental
    // Robotics VII, Lecture Notes in Control and Information Sciences,
    // pp. 209-218, volume published 2001. The on-orbit robot dynamics
    // and control experiments with ETS-VII's 2-metre, 6-DoF arm.
    id: 'ets-vii-robot-2001',
    title: 'ETS-VII Flight Experiments For Space Robot Dynamics and Control',
    authors: ['Kazuya Yoshida'],
    year: 2001,
    venue:
      'Experimental Robotics VII, Lecture Notes in Control and Information Sciences, 209-218',
    url: 'https://doi.org/10.1007/3-540-45118-8_22',
    type: 'paper',
  },
  {
    // Verified against Crossref metadata (2026-08-15): Proc. SPIE 6958,
    // Sensors and Systems for Space Applications II, April 2008. The
    // mission-level summary of DARPA's 2007 Orbital Express servicing
    // demonstration.
    id: 'orbital-express-2008',
    title: 'Orbital Express program summary and mission overview',
    authors: ['Robert B. Friend'],
    year: 2008,
    venue: 'Proc. SPIE 6958, Sensors and Systems for Space Applications II',
    url: 'https://doi.org/10.1117/12.783792',
    type: 'paper',
  },
  {
    // Verified against the live CSA page (2026-08-15): 17-metre arm,
    // ISS assembly, maintenance, and grappling of visiting vehicles.
    // Page date modified 16 July 2024.
    id: 'canadarm2-csa-2024',
    title: 'About Canadarm2',
    authors: ['Canadian Space Agency'],
    year: 2024,
    venue: 'Canadian Space Agency',
    url: 'https://www.asc-csa.gc.ca/eng/iss/canadarm2/about.asp',
    type: 'docs',
  },
  {
    // Verified against the live CSA page (2026-08-15): two-armed
    // external maintenance robot, replaces equipment including 100-kg
    // batteries. Page date modified 4 June 2024.
    id: 'dextre-csa-2024',
    title: 'About Dextre',
    authors: ['Canadian Space Agency'],
    year: 2024,
    venue: 'Canadian Space Agency',
    url: 'https://www.asc-csa.gc.ca/eng/iss/dextre/about.asp',
    type: 'docs',
  },
  {
    // Verified against the live Northrop Grumman release (2026-08-15):
    // MEV-1 performed the first-ever in-orbit commercial docking with
    // IS-901 in the GEO graveyard orbit in 2020, provided five years of
    // life extension, and undocked 9 April 2025.
    id: 'mev1-servicing-2025',
    title:
      'Northrop Grumman Achieves First-Ever Undocking Between Two Commercial Spacecraft in Geosynchronous Orbit',
    authors: ['Northrop Grumman'],
    year: 2025,
    venue: 'Northrop Grumman news, 9 April 2025',
    url: 'https://news.northropgrumman.com/satellites/Northrop-Grumman-Achieves-First-Ever-Undocking-Between-Two-Commercial-Spacecraft-in-Geosynchronous-Orbit',
    type: 'press',
  },
  {
    // Verified against the live Astroscale release (2026-08-15): 15 m
    // approach to a rocket upper stage on 30 November 2024, the closest
    // a commercial spacecraft has come to debris via RPO; autonomous
    // collision-avoidance abort before the capture initiation point.
    id: 'adras-j-15m-2024',
    title:
      'Astroscale\u2019s ADRAS-J Achieves Historic 15-Meter Approach to Space Debris',
    authors: ['Astroscale Japan'],
    year: 2024,
    venue: 'Astroscale announcement, 11 December 2024',
    url: 'https://www.astroscale.com/en/news/astroscales-adras-j-achieves-historic-15-meter-approach-to-space-debris',
    type: 'press',
  },
  {
    // Verified against the live NASA statement (2026-08-15): OSAM-1
    // discontinued 1 March 2024 after an independent review, citing
    // technical, cost, and schedule challenges and the community moving
    // away from refueling unprepared spacecraft.
    id: 'osam1-discontinued-2024',
    title: "Update on Status of NASA's OSAM-1 Project",
    authors: ['NASA'],
    year: 2024,
    venue: 'NASA, 1 March 2024',
    url: 'https://www.nasa.gov/missions/update-on-status-of-nasas-osam-1-project/',
    type: 'press',
  },
  {
    // DOI verified via Crossref 2026-08-20: Part I of the three-part
    // monograph, ASME J. Dynamic Systems, Measurement, and Control 107(1).
    id: 'hogan-1985',
    title:
      'Impedance Control: An Approach to Manipulation: Part I\u2014Theory',
    authors: ['Neville Hogan'],
    year: 1985,
    venue: 'ASME J. Dynamic Systems, Measurement, and Control',
    url: 'https://doi.org/10.1115/1.3140702',
    type: 'paper',
  },
  {
    // Public ISO catalogue entry for ISO/TS 15066:2016 (title, edition,
    // scope). iso.org returns HTTP 403 to non-browser clients, a
    // bot-wall; the page is live in a real browser (checked 2026-08-20)
    // and no DOI exists for a technical specification, so this entry
    // needs a link-check exception rather than a Crossref fallback.
    id: 'iso-ts-15066',
    title: 'ISO/TS 15066:2016, Robots and robotic devices \u2014 Collaborative robots',
    authors: ['ISO'],
    year: 2016,
    venue: 'ISO Technical Specification (public catalogue entry)',
    url: 'https://www.iso.org/standard/62996.html',
    type: 'docs',
  },
  {
    // DOI verified via Crossref 2026-08-20: JDSMC 103(2), 126-133.
    id: 'raibert-craig-1981',
    title: 'Hybrid Position/Force Control of Manipulators',
    // Authors keep the printed initials (2026-08-20): the ASME landing
    // page itself prints "M. H. Raibert" and "J. J. Craig", DBLP does not
    // index JDSMC, and no record transcribes a fuller byline, so the
    // earlier "Marc Raibert" / "John Craig" expansion (sourced from
    // OpenAlex display_name) was dropped per the author-field policy.
    authors: ['M. H. Raibert', 'J. J. Craig'],
    year: 1981,
    venue: 'ASME J. Dynamic Systems, Measurement, and Control',
    url: 'https://doi.org/10.1115/1.3139652',
    type: 'paper',
  },
  {
    // DOI verified via Crossref 2026-08-20: IEEE Trans. Systems, Man, and
    // Cybernetics SMC-11(6), 418-432.
    id: 'mason-1981',
    title: 'Compliance and Force Control for Computer Controlled Manipulators',
    authors: ['Matthew Mason'],
    year: 1981,
    venue: 'IEEE Trans. Systems, Man, and Cybernetics',
    url: 'https://doi.org/10.1109/TSMC.1981.4308708',
    type: 'paper',
  },
  {
    // DOI verified via Crossref 2026-08-20: 19th IEEE CDC, Albuquerque.
    // Crossref publishes the author as "J. Salisbury"; the initial is kept
    // per the author-field policy (J. Kenneth Salisbury is the person, but
    // the source record prints only the J.).
    id: 'salisbury-1980',
    title: 'Active Stiffness Control of a Manipulator in Cartesian Coordinates',
    authors: ['J. Salisbury'],
    year: 1980,
    venue: '19th IEEE Conf. Decision and Control',
    url: 'https://doi.org/10.1109/CDC.1980.272026',
    type: 'paper',
  },
  {
    // DOI verified via Crossref 2026-08-20: IROS 1995, Pittsburgh.
    id: 'pratt-williamson-1995',
    title: 'Series Elastic Actuators',
    authors: ['Gill Pratt', 'Matthew Williamson'],
    year: 1995,
    venue: 'IEEE/RSJ Int. Conf. Intelligent Robots and Systems',
    url: 'https://doi.org/10.1109/IROS.1995.525827',
    type: 'paper',
  },
  {
    // DOI verified via Crossref 2026-08-20: ICRA 2003, Taipei; Ott,
    // Albu-Schaeffer, Kugi, Hirzinger.
    id: 'albu-schaffer-2003',
    title: 'Decoupling Based Cartesian Impedance Control of Flexible Joint Robots',
    // Crossref prints initials for all four (C., A., A., G.); the DBLP
    // record for the DOI (conf/icra/OttAKH03, read 2026-08-23) transcribes
    // all four in full (Christian Ott, Alin Albu-Schäffer, Andreas Kugi,
    // Gerd Hirzinger), so the registry follows the fuller byline.
    authors: ['Christian Ott', 'Alin Albu-Schäffer', 'Andreas Kugi', 'Gerd Hirzinger'],
    year: 2003,
    venue: 'IEEE Int. Conf. Robotics and Automation',
    url: 'https://doi.org/10.1109/ROBOT.2003.1242067',
    type: 'paper',
  },
  {
    // DOI verified via Crossref 2026-08-20: ICRA 2010, Anchorage.
    // Crossref author list: Christian Ott, Ranjan Mukherjee, Yoshihiko
    // Nakamura (the 2026-08-20 audit corrected a fabricated given name,
    // "Ryojun", that contradicted the record).
    id: 'ott-2010',
    title: 'Unified Impedance and Admittance Control',
    authors: ['Christian Ott', 'Ranjan Mukherjee', 'Yoshihiko Nakamura'],
    year: 2010,
    venue: 'IEEE Int. Conf. Robotics and Automation',
    url: 'https://doi.org/10.1109/ROBOT.2010.5509861',
    type: 'paper',
  },
  {
    // DOI verified via Crossref 2026-08-20: IROS 2019, Macau. Crossref
    // authors: Roberto Martin-Martin, Michelle A. Lee, Rachel Gardner,
    // Silvio Savarese, Jeannette Bohg, Animesh Garg (the 2026-08-20 audit
    // corrected two fabricated given names: "Josef" and "Munhee").
    id: 'martin-martin-2019',
    title:
      'Variable Impedance Control in End-Effector Space: An Action Space for Reinforcement Learning in Contact-Rich Tasks',
    authors: ['Roberto Martin-Martin', 'Michelle A. Lee', 'Rachel Gardner', 'Silvio Savarese', 'Jeannette Bohg', 'Animesh Garg'],
    year: 2019,
    venue: 'IEEE/RSJ Int. Conf. Intelligent Robots and Systems',
    url: 'https://doi.org/10.1109/IROS40897.2019.8968201',
    type: 'paper',
  },
  {
    // DOI verified via Crossref 2026-08-20: Frontiers in Robotics and AI
    // 11:1374999. 75th-percentile transient-contact force pain thresholds
    // measured on 37 subjects; the biomechanical research basis for the
    // impedance lab's contact-force reference line.
    // Authors exactly as Crossref prints them (D. Han, M. Y. Park, J. Choi,
    // H. Shin, R. Behrens, S. Rhim): the byline gives initials for six of
    // six, so the initials are kept per the author-field policy. The
    // 2026-08-20 audit removed six unverifiable expansions, two of which
    // ("Seungjae Shin", "Yongsik Rhim") outright contradicted the printed
    // initials H. and S.
    id: 'han-force-pain-2024',
    title:
      'Evaluation of force pain thresholds to ensure collision safety in worker-robot collaborative operations',
    authors: ['D. Han', 'M. Y. Park', 'J. Choi', 'H. Shin', 'R. Behrens', 'S. Rhim'],
    year: 2024,
    venue: 'Frontiers in Robotics and AI',
    url: 'https://doi.org/10.3389/frobt.2024.1374999',
    type: 'paper',
  },
  {
    // Live as of 2026-08-20 (HTTP 200): the FCI documentation, including
    // the 1 kHz torque-level control interface and the Cartesian impedance
    // example controllers.
    id: 'franka-fci-docs',
    title: 'Franka Control Interface Documentation',
    authors: ['Franka Robotics'],
    year: 2026,
    venue: 'Franka Robotics, as of 2026-08-20',
    url: 'https://frankarobotics.github.io/docs/',
    type: 'docs',
  },
  {
    // Live as of 2026-08-20 (HTTP 200): URScript dynamic force control,
    // the force-mode behavior exposed to UR programs. The page shows only
    // "Last modified on Feb 17, 2016" (re-read 2026-10-08), so the year is
    // the access year, as for the other "as of" entries.
    id: 'ur-force-mode-docs',
    title: 'URScript: Dynamic Force Control',
    authors: ['Universal Robots'],
    year: 2026,
    venue: 'Universal Robots, as of 2026-08-20',
    url: 'https://www.universal-robots.com/articles/ur/programming/urscript-dynamic-force-control/',
    type: 'docs',
  },
  // ---- Perception for manipulation (mod-classical-perception, 2026-08-22) ----
  // Every id, DOI, author list and year below was read from Crossref, the
  // arXiv Atom API, DBLP or the vendor page itself on 2026-08-22. None was
  // written from memory.
  {
    // Crossref 10.1109/34.888718 read 2026-08-22: IEEE TPAMI 22(11),
    // 1330-1334. Crossref prints "Z. Zhang"; the initial is kept per the
    // author-field policy.
    id: 'zhang-2000-calibration',
    title: 'A flexible new technique for camera calibration',
    authors: ['Z. Zhang'],
    year: 2000,
    venue: 'IEEE Trans. Pattern Analysis and Machine Intelligence',
    url: 'https://doi.org/10.1109/34.888718',
    type: 'paper',
  },
  {
    // Crossref 10.1109/70.88014 read 2026-09-23: IEEE T-RA 5(1), 16-29,
    // 1989. Crossref prints "Y.C. Shiu" and "S. Ahmad"; initials kept. The
    // abstract (OpenAlex transcription of the IEEE record) states that moving
    // the robot and observing the sensor "yields a homogeneous transform
    // equation of the form AX=XB" and develops a closed-form solution.
    id: 'shiu-ahmad-1989',
    title:
      'Calibration of wrist-mounted robotic sensors by solving homogeneous transform equations of the form AX=XB',
    authors: ['Y. C. Shiu', 'S. Ahmad'],
    year: 1989,
    venue: 'IEEE Trans. Robotics and Automation',
    url: 'https://doi.org/10.1109/70.88014',
    type: 'paper',
  },
  {
    // Crossref 10.1109/70.34770 read 2026-08-22: IEEE T-RA 5(3), 345-358.
    // Crossref prints "R.Y. Tsai" and "R.K. Lenz"; initials kept.
    id: 'tsai-lenz-1989',
    title:
      'A new technique for fully autonomous and efficient 3D robotics hand/eye calibration',
    authors: ['R. Y. Tsai', 'R. K. Lenz'],
    year: 1989,
    venue: 'IEEE Trans. Robotics and Automation',
    url: 'https://doi.org/10.1109/70.34770',
    type: 'paper',
  },
  {
    // HAL author-deposited PDF (inria-00590039) fetched 2026-09-15:
    // IJRR 14(3), pp. 195-210, June 1995; the HAL cover prints the
    // citation and DOI 10.1177/027836499501400301. Registered exactly
    // as the frozen perception packet proposed; integrator needle-
    // verified the retained PDF passages (shared-form listing,
    // classical-linear naming, eq. 18/16, rank deficiency).
    id: 'horaud-dornaika-1995',
    title: 'Hand-Eye Calibration',
    authors: ['Radu Horaud', 'Fadi Dornaika'],
    year: 1995,
    venue: 'The International Journal of Robotics Research 14(3), pp. 195-210',
    url: 'https://inria.hal.science/inria-00590039/document',
    type: 'paper',
  },
  {
    // Crossref 10.1109/70.143350 read 2026-08-22: IEEE T-RA 8(3),
    // 313-326, June 1992. Initials as Crossref prints them.
    id: 'espiau-1992',
    title: 'A new approach to visual servoing in robotics',
    authors: ['B. Espiau', 'F. Chaumette', 'P. Rives'],
    year: 1992,
    venue: 'IEEE Trans. Robotics and Automation',
    url: 'https://doi.org/10.1109/70.143350',
    type: 'paper',
  },
  {
    // Crossref 10.1109/MRA.2006.250573 read 2026-08-22: IEEE RAM 13(4),
    // 82-90, December 2006. Part number and year verified against the
    // record rather than assumed.
    id: 'chaumette-hutchinson-2006',
    title: 'Visual Servo Control, Part I: Basic Approaches',
    authors: ['François Chaumette', 'Seth Hutchinson'],
    year: 2006,
    venue: 'IEEE Robotics and Automation Magazine',
    url: 'https://doi.org/10.1109/MRA.2006.250573',
    type: 'paper',
  },
  {
    // Crossref 10.1109/MRA.2007.339609 read 2026-08-22: IEEE RAM 14(1),
    // 109-118, March 2007. Part II is a 2007 issue, not 2006.
    id: 'chaumette-hutchinson-2007',
    title: 'Visual Servo Control, Part II: Advanced Approaches',
    authors: ['François Chaumette', 'Seth Hutchinson'],
    year: 2007,
    venue: 'IEEE Robotics and Automation Magazine',
    url: 'https://doi.org/10.1109/MRA.2007.339609',
    type: 'paper',
  },
  {
    // arXiv 1612.00593 read 2026-08-22 (feed comment "CVPR 2017", 4
    // authors, submitted 2016-12-02); DBLP indexes it at CVPR 2017. The
    // registry cites the published version, so the year is 2017.
    id: 'pointnet-2017',
    title:
      'PointNet: Deep Learning on Point Sets for 3D Classification and Segmentation',
    authors: ['Charles R. Qi', 'Hao Su', 'Kaichun Mo', 'Leonidas J. Guibas'],
    year: 2017,
    venue: 'CVPR 2017',
    arxiv: '1612.00593',
    url: 'https://arxiv.org/abs/1612.00593',
    type: 'paper',
  },
  {
    // arXiv 1706.02413 read 2026-08-22 (4 authors, submitted 2017-06-07);
    // NeurIPS 2017 proceedings page lists the same title.
    id: 'pointnet-plus-plus-2017',
    title:
      'PointNet++: Deep Hierarchical Feature Learning on Point Sets in a Metric Space',
    authors: ['Charles R. Qi', 'Li Yi', 'Hao Su', 'Leonidas J. Guibas'],
    year: 2017,
    venue: 'NeurIPS 2017',
    arxiv: '1706.02413',
    url: 'https://arxiv.org/abs/1706.02413',
    type: 'paper',
  },
  {
    // arXiv 2304.02643 read 2026-08-22: 12 authors, submitted 2023-04-05.
    // DBLP indexes the published version at ICCV 2023.
    id: 'segment-anything-2023',
    title: 'Segment Anything',
    authors: [
      'Alexander Kirillov',
      'Eric Mintun',
      'Nikhila Ravi',
      'Hanzi Mao',
      'Chloe Rolland',
      'Laura Gustafson',
      'Tete Xiao',
      'Spencer Whitehead',
      'Alexander C. Berg',
      'Wan-Yen Lo',
      'Piotr Dollár',
      'Ross Girshick',
    ],
    year: 2023,
    venue: 'arXiv 2023',
    arxiv: '2304.02643',
    url: 'https://arxiv.org/abs/2304.02643',
    type: 'paper',
  },
  {
    // arXiv 2408.00714 read 2026-08-22: 18 authors, submitted 2024-08-01.
    // DBLP indexes the published version at ICLR 2025; the registry cites
    // the 2024 preprint the article's claims come from, so the year is
    // 2024 and the venue names arXiv.
    id: 'sam2-2024',
    title: 'SAM 2: Segment Anything in Images and Videos',
    authors: [
      'Nikhila Ravi',
      'Valentin Gabeur',
      'Yuan-Ting Hu',
      'Ronghang Hu',
      'Chaitanya Ryali',
      'Tengyu Ma',
      'Haitham Khedr',
      'Roman Rädle',
      'Chloe Rolland',
      'Laura Gustafson',
      'Eric Mintun',
      'Junting Pan',
      'Kalyan Vasudev Alwala',
      'Nicolas Carion',
      'Chao-Yuan Wu',
      'Ross Girshick',
      'Piotr Dollár',
      'Christoph Feichtenhofer',
    ],
    year: 2024,
    venue: 'arXiv 2024',
    arxiv: '2408.00714',
    url: 'https://arxiv.org/abs/2408.00714',
    type: 'paper',
  },
  {
    // arXiv 2303.05499 read 2026-08-22: 12 authors, submitted 2023-03-09.
    // DBLP indexes the published version at ECCV 2024, so the registry
    // year is 2024 and the preprint year is deliberately not used.
    id: 'grounding-dino-2024',
    title:
      'Grounding DINO: Marrying DINO with Grounded Pre-Training for Open-Set Object Detection',
    authors: [
      'Shilong Liu',
      'Zhaoyang Zeng',
      'Tianhe Ren',
      'Feng Li',
      'Hao Zhang',
      'Jie Yang',
      'Qing Jiang',
      'Chunyuan Li',
      'Jianwei Yang',
      'Hang Su',
      'Jun Zhu',
      'Lei Zhang',
    ],
    year: 2024,
    venue: 'arXiv 2024',
    arxiv: '2303.05499',
    url: 'https://arxiv.org/abs/2303.05499',
    type: 'paper',
  },
  {
    // arXiv 2304.07193 read 2026-08-22: 26 authors, submitted 2023-04-14.
    // DBLP indexes the journal version in TMLR 2024; the registry cites
    // the 2023 preprint the article draws on.
    id: 'dinov2-2023',
    title: 'DINOv2: Learning Robust Visual Features without Supervision',
    authors: [
      'Maxime Oquab',
      'Timothée Darcet',
      'Théo Moutakanni',
      'Huy Vo',
      'Marc Szafraniec',
      'Vasil Khalidov',
      'Pierre Fernandez',
      'Daniel Haziza',
      'Francisco Massa',
      'Alaaeldin El-Nouby',
      'Mahmoud Assran',
      'Nicolas Ballas',
      'Wojciech Galuba',
      'Russell Howes',
      'Po-Yao Huang',
      'Shang-Wen Li',
      'Ishan Misra',
      'Michael Rabbat',
      'Vasu Sharma',
      'Gabriel Synnaeve',
      'Hu Xu',
      'Hervé Jegou',
      'Julien Mairal',
      'Patrick Labatut',
      'Armand Joulin',
      'Piotr Bojanowski',
    ],
    year: 2023,
    venue: 'arXiv 2023',
    arxiv: '2304.07193',
    url: 'https://arxiv.org/abs/2304.07193',
    type: 'paper',
  },
  {
    // arXiv 1711.00199 read 2026-08-22: 4 authors, feed comment "Accepted
    // to RSS 2018"; DBLP indexes it at RSS 2018.
    id: 'posecnn-2018',
    title:
      'PoseCNN: A Convolutional Neural Network for 6D Object Pose Estimation in Cluttered Scenes',
    authors: [
      'Yu Xiang',
      'Tanner Schmidt',
      'Venkatraman Narayanan',
      'Dieter Fox',
    ],
    year: 2018,
    venue: 'RSS 2018',
    arxiv: '1711.00199',
    url: 'https://arxiv.org/abs/1711.00199',
    type: 'paper',
  },
  {
    // arXiv 2312.08344 read 2026-08-22 (4 authors, submitted 2023-12-13);
    // Crossref 10.1109/cvpr52733.2024.01692 confirms CVPR 2024.
    id: 'foundationpose-2024',
    title: 'FoundationPose: Unified 6D Pose Estimation and Tracking of Novel Objects',
    authors: ['Bowen Wen', 'Wei Yang', 'Jan Kautz', 'Stan Birchfield'],
    year: 2024,
    venue: 'CVPR 2024',
    arxiv: '2312.08344',
    url: 'https://arxiv.org/abs/2312.08344',
    type: 'paper',
  },
  {
    // arXiv 2212.06870 read 2026-08-22: 10 authors, feed comment "CoRL
    // 2022", and DBLP indexes it at CoRL 2022. Venue and year both
    // verified rather than assumed.
    id: 'megapose-2022',
    title: 'MegaPose: 6D Pose Estimation of Novel Objects via Render and Compare',
    authors: [
      'Yann Labbé',
      'Lucas Manuelli',
      'Arsalan Mousavian',
      'Stephen Tyree',
      'Stan Birchfield',
      'Jonathan Tremblay',
      'Justin Carpentier',
      'Mathieu Aubry',
      'Dieter Fox',
      'Josef Sivic',
    ],
    year: 2022,
    venue: 'CoRL 2022',
    arxiv: '2212.06870',
    url: 'https://arxiv.org/abs/2212.06870',
    type: 'paper',
  },
  {
    // Inspected primary edition: arXiv 2403.09799v1, printed 14 Mar 2024.
    // Retain the abs URL audited on 2026-09-06; this is not a fresh URL audit.
    // Verified body: https://arxiv.org/html/2403.09799v1 (retained 2026-09-08).
    // Native supporting passages keep that exact body URL and edition.
    // Challenge year 2023 differs from this preprint's publication year.
    // The full v1 byline prints Labbé; the prior unversioned abs used Labbe.
    // Earlier CVPR Workshops 2024/DBLP metadata remains in audit history;
    // this entry deliberately identifies the verified preprint, not a VOR.
    id: 'bop-challenge-2023',
    title:
      'BOP Challenge 2023 on Detection, Segmentation and Pose Estimation of Seen and Unseen Rigid Objects',
    authors: [
      'Tomas Hodan',
      'Martin Sundermeyer',
      'Yann Labbé',
      'Van Nguyen Nguyen',
      'Gu Wang',
      'Eric Brachmann',
      'Bertram Drost',
      'Vincent Lepetit',
      'Carsten Rother',
      'Jiri Matas',
    ],
    year: 2024,
    venue: 'arXiv preprint',
    arxiv: '2403.09799',
    url: 'https://arxiv.org/abs/2403.09799',
    type: 'paper',
  },
  {
    // Retained Crossref field projection, requested 2026-09-06T01:11:32.621Z:
    // title and seven authors match the retained author-hosted manuscript.
    // Container: Computer Vision – ACCV 2012; issued/print year: 2013;
    // chapter pages: 548–562. The manuscript has 14 pages and no explicit
    // revision identifier; do not claim published-chapter byte identity.
    // The DOI remains the canonical HTTPS pointer. Its current liveness
    // is separately unverified; retained HTTP paper retrieval is not a
    // current link-check pass or proof of field-wide metric priority.
    id: 'hinterstoisser-2012',
    title:
      'Model Based Training, Detection and Pose Estimation of Texture-Less 3D Objects in Heavily Cluttered Scenes',
    authors: [
      'Stefan Hinterstoisser',
      'Vincent Lepetit',
      'Slobodan Ilic',
      'Stefan Holzer',
      'Gary Bradski',
      'Kurt Konolige',
      'Nassir Navab',
    ],
    year: 2013,
    venue: 'Computer Vision – ACCV 2012 (LNCS, published 2013)',
    url: 'https://doi.org/10.1007/978-3-642-37331-2_42',
    type: 'paper',
  },
  {
    // Crossref 10.1109/ICRA40945.2020.9197518 read 2026-08-22: ICRA 2020,
    // pages 3634-3642. Crossref prints the first author as "Shreeyak
    // Sajjan" while the arXiv byline prints "Shreeyak S. Sajjan"; the
    // registry follows the published-venue record it cites.
    id: 'cleargrasp-2020',
    title: 'ClearGrasp: 3D Shape Estimation of Transparent Objects for Manipulation',
    authors: [
      'Shreeyak Sajjan',
      'Matthew Moore',
      'Mike Pan',
      'Ganesh Nagaraja',
      'Johnny Lee',
      'Andy Zeng',
      'Shuran Song',
    ],
    year: 2020,
    venue: 'ICRA 2020',
    url: 'https://doi.org/10.1109/ICRA40945.2020.9197518',
    type: 'paper',
  },
  {
    // arXiv 1806.08756 read 2026-08-22: 3 authors, submitted 2018-06-22.
    // The PMLR volume 87 index (CoRL 2018) lists the same title.
    id: 'dense-object-nets-2018',
    title:
      'Dense Object Nets: Learning Dense Visual Object Descriptors By and For Robotic Manipulation',
    authors: ['Peter R. Florence', 'Lucas Manuelli', 'Russ Tedrake'],
    year: 2018,
    venue: 'CoRL 2018',
    arxiv: '1806.08756',
    url: 'https://arxiv.org/abs/1806.08756',
    type: 'paper',
  },
  {
    // Crossref 10.1109/CVPRW.2017.167 read 2026-08-22: CVPR Workshops
    // 2017, pages 1267-1276. The arXiv feed for 1705.05548 gives the same
    // four authors and names CCD 2017, a CVPR 2017 workshop; venue and
    // year verified rather than assumed.
    id: 'keselman-2017-realsense',
    title: 'Intel RealSense Stereoscopic Depth Cameras',
    authors: [
      'Leonid Keselman',
      'John Iselin Woodfill',
      'Anders Grunnet-Jepsen',
      'Achintya Bhowmik',
    ],
    year: 2017,
    venue: 'CVPR Workshops 2017',
    url: 'https://doi.org/10.1109/CVPRW.2017.167',
    type: 'paper',
  },
  {
    // Read as text 2026-08-22 (document number 337029-017): table 4-15
    // publishes Z-accuracy +/- 2% at <= 2 m within 80% of the field of
    // view at HD resolution, and table 3-50 states that on the D400 line
    // repetitive patterns "may cause false depth" and specular reflections
    // "may cause image saturation". No per-material accuracy figure is
    // published for transparent or specular surfaces.
    id: 'realsense-d400-datasheet-2026',
    title: 'RealSense Product Family D400 Series Datasheet',
    authors: ['RealSense'],
    year: 2026,
    venue: 'RealSense, as of 2026-08-22',
    url: 'https://www.realsenseai.com/wp-content/uploads/2026/03/RealSense-D400-Series-Datasheet-Mar-2026.pdf',
    type: 'docs',
  },
  {
    // Read 2026-08-22: the tuning guide states that stereo depth error
    // "scales as the square of the distance away", that repetitive
    // structures make left-right matching ambiguous, that a matte textured
    // background is preferable to a white glossy one, and that low light
    // yields grainy images and therefore poor depth.
    id: 'realsense-tuning-2026',
    title: 'Tuning depth cameras for best performance',
    authors: ['Anders Grunnet-Jepsen', 'John N. Sweetser', 'John Woodfill'],
    year: 2026,
    venue: 'RealSense documentation, as of 2026-08-22',
    url: 'https://dev.realsenseai.com/docs/tuning-depth-cameras-for-best-performance/',
    type: 'docs',
  },
  {
    // Read 2026-08-22: Microsoft's time-of-flight depth documentation
    // enumerates the five invalidation causes (outside the illumination
    // mask, saturated IR signal, low IR signal, filter outlier, multi-path
    // interference), and names object edges and corners as the common
    // multi-path cases. The page is dated 2019-06-26 (ms.date, re-read
    // 2026-10-08), so the year is the page's own; the venue states it next to
    // the access date so the reference prints one of each.
    id: 'azure-kinect-depth-docs-2026',
    title: 'Azure Kinect DK depth camera',
    authors: ['Microsoft'],
    year: 2019,
    venue: 'Microsoft Learn, 2019; accessed 2026-08-22',
    url: 'https://learn.microsoft.com/en-us/previous-versions/azure/kinect-dk/depth-camera',
    type: 'docs',
  },
  {
    // Read 2026-08-22: the PhoXi 3D Scanner L datasheet table publishes
    // calibration accuracy 0.200 mm and temporal noise 0.190 mm (both 1
    // sigma) over an 870 to 2150 mm scanning range, with a 250 to 2750 ms
    // scanning time. The figures the industrial structured-light claim in
    // this article rests on.
    id: 'photoneo-phoxi-l-2026',
    title: 'PhoXi 3D Scanner L',
    authors: ['Photoneo'],
    year: 2026,
    venue: 'Photoneo, as of 2026-08-22',
    url: 'https://www.photoneo.com/products/phoxi-scan-l/',
    type: 'docs',
  },

  /* ------------------------------------------------------------------ *
   * Safety and assurance (frontier/safety-and-assurance, 2026-08-22)
   *
   * STANDARDS ENTRIES ARE CATALOGUE ENTRIES, NOT THE STANDARDS. Every ISO
   * and IEC document below is paywalled and this project does not buy
   * standards, so each entry cites the PUBLIC catalogue page, which gives
   * the title, edition, publication date and scope abstract and nothing
   * more. No clause, table or numeric limit from any of these documents
   * is quoted or paraphrased anywhere on the site. iso.org answers HTTP
   * 403 to every non-browser client, so the ISO entries need link-check
   * exceptions in data/link-check-exceptions.ts (the precedent is the
   * existing iso-ts-15066 entry); webstore.iec.ch answers 200.
   * ------------------------------------------------------------------ */
  {
    // Catalogue page read 2026-08-22: "ISO 12100:2010, Safety of
    // machinery - General principles for design - Risk assessment and
    // risk reduction", edition 1, published 2010-11, stage 90.92 (to be
    // revised; ISO/DIS 12100.3 is in development). The abstract states
    // the document specifies principles of risk assessment and risk
    // reduction and describes procedures for identifying hazards and
    // estimating and evaluating risks.
    id: 'iso-12100',
    title:
      'ISO 12100:2010, Safety of machinery \u2014 General principles for design \u2014 Risk assessment and risk reduction',
    authors: ['ISO'],
    year: 2010,
    venue: 'ISO International Standard (public catalogue entry)',
    url: 'https://www.iso.org/standard/51528.html',
    type: 'docs',
  },
  {
    // Catalogue page read 2026-08-22: edition 3, published 2025-02, stage
    // 60.60, 95 pages, ISO/TC 299. The abstract states it covers the
    // robot as partly completed machinery and that integration is
    // covered by ISO 10218-2:2025. Supersedes the withdrawn 2011 edition.
    id: 'iso-10218-1-2025',
    title:
      'ISO 10218-1:2025, Robotics \u2014 Safety requirements \u2014 Part 1: Industrial robots',
    authors: ['ISO'],
    year: 2025,
    venue: 'ISO International Standard (public catalogue entry)',
    url: 'https://www.iso.org/standard/73933.html',
    type: 'docs',
  },
  {
    // Catalogue page read 2026-08-22: edition 2, published 2025-02, stage
    // 60.60, 223 pages. The abstract states it specifies requirements for
    // the integration of industrial robot applications and robot cells,
    // covering design, integration, commissioning, operation, maintenance
    // and decommissioning, and names the integrator as the party who
    // assesses foreseeable misuse.
    id: 'iso-10218-2-2025',
    title:
      'ISO 10218-2:2025, Robotics \u2014 Safety requirements \u2014 Part 2: Industrial robot applications and robot cells',
    authors: ['ISO'],
    year: 2025,
    venue: 'ISO International Standard (public catalogue entry)',
    url: 'https://www.iso.org/standard/73934.html',
    type: 'docs',
  },
  {
    // Catalogue page read 2026-08-22: edition 4, published 2023-04, stage
    // 60.60. The abstract states it specifies a methodology for the
    // design of safety-related parts of control systems performing safety
    // functions, including software, for high-demand and continuous modes,
    // and explicitly defers low-demand mode to the IEC 61508 series.
    id: 'iso-13849-1-2023',
    title:
      'ISO 13849-1:2023, Safety of machinery \u2014 Safety-related parts of control systems \u2014 Part 1: General principles for design',
    authors: ['ISO'],
    year: 2023,
    venue: 'ISO International Standard (public catalogue entry)',
    url: 'https://www.iso.org/standard/73481.html',
    type: 'docs',
  },
  {
    // Catalogue page read 2026-08-22: edition 3, published 2015-11, last
    // confirmed 2020. The abstract states it specifies functional
    // requirements and design principles for the emergency stop function
    // independent of the energy used, and notes that the electrical
    // realisation is described in IEC 60204-1.
    id: 'iso-13850-2015',
    title:
      'ISO 13850:2015, Safety of machinery \u2014 Emergency stop function \u2014 Principles for design',
    authors: ['ISO'],
    year: 2015,
    venue: 'ISO International Standard (public catalogue entry)',
    url: 'https://www.iso.org/standard/59970.html',
    type: 'docs',
  },
  {
    // Catalogue page read 2026-08-22: edition 2, published 2023-06, stage
    // 90.92. The abstract states it specifies safety requirements and
    // verification means for driverless industrial trucks and their
    // systems, naming automated guided vehicles and autonomous mobile
    // robots among its examples.
    id: 'iso-3691-4-2023',
    title:
      'ISO 3691-4:2023, Industrial trucks \u2014 Safety requirements and verification \u2014 Part 4: Driverless industrial trucks and their systems',
    authors: ['ISO'],
    year: 2023,
    venue: 'ISO International Standard (public catalogue entry)',
    url: 'https://www.iso.org/standard/83545.html',
    type: 'docs',
  },
  {
    // VERIFY-OR-DROP RESOLVED, 2026-08-22. The catalogue page reads
    // "ISO/CD 25785-1", Committee Draft, "Under development", stage 30.60
    // (close of comment period, dated 2026-07-08), edition 1, ISO/TC 299.
    // Its abstract states safety requirements for industrial mobile
    // robots with ACTIVELY CONTROLLED STABILITY, defined there as a robot
    // requiring active control to remain balanced, and names quadrupedal,
    // bipedal and wheeled balancing robots. So the standard is real and
    // its subject matches, but it is NOT published: the article states it
    // as a committee draft at that stage and claims nothing about its
    // contents beyond this public abstract.
    id: 'iso-cd-25785-1',
    title:
      'ISO/CD 25785-1, Robotics \u2014 Safety requirements for dynamically stable industrial mobile robots (legged, wheeled, or other forms of locomotion) \u2014 Part 1: Robots',
    authors: ['ISO'],
    year: 2026,
    venue: 'ISO Committee Draft, stage 30.60 (public catalogue entry)',
    url: 'https://www.iso.org/standard/91469.html',
    type: 'docs',
  },
  {
    // IEC webstore page read 2026-08-22 (HTTP 200): "IEC 61508-1:2010,
    // Functional safety of electrical/electronic/programmable electronic
    // safety-related systems - Part 1: General requirements". Part 1 is
    // the entry point of the seven-part series; the safety-integrity-level
    // concept the article names belongs to the series as a whole.
    id: 'iec-61508-1-2010',
    title:
      'IEC 61508-1:2010, Functional safety of electrical/electronic/programmable electronic safety-related systems \u2014 Part 1: General requirements',
    authors: ['IEC'],
    year: 2010,
    venue: 'IEC International Standard (public catalogue entry)',
    url: 'https://webstore.iec.ch/en/publication/5515',
    type: 'docs',
  },
  {
    // IEC webstore page read 2026-08-22 (HTTP 200): "IEC 60204-1:2016,
    // Safety of machinery - Electrical equipment of machines - Part 1:
    // General requirements", edition 6. This is the document ISO 13850's
    // own catalogue abstract names for the electrical realisation of the
    // emergency stop function, which is why it sits beside it here.
    id: 'iec-60204-1-2016',
    title:
      'IEC 60204-1:2016, Safety of machinery \u2014 Electrical equipment of machines \u2014 Part 1: General requirements',
    authors: ['IEC'],
    year: 2016,
    venue: 'IEC International Standard (public catalogue entry)',
    url: 'https://webstore.iec.ch/en/publication/26037',
    type: 'docs',
  },
  {
    // A3's own standards catalogue page, read 2026-08-22, which is the
    // authority for which parts of the R15.08 series are published: Part 1
    // as ANSI/RIA R15.08-1-2020 (the mobile robot itself), Part 2 as
    // ANSI/A3 R15.08-2-2023 (IMR systems and applications), and Part 3
    // listed as forthcoming for the user. The article states exactly that
    // and no more.
    id: 'a3-robot-safety-standards',
    title: 'Robot Safety Standard Documents',
    authors: ['Association for Advancing Automation'],
    year: 2026,
    venue: 'A3 (automate.org), as of 2026-08-22',
    url: 'https://www.automate.org/robotics/safety/robot-safety-standard-documents',
    type: 'docs',
  },
  {
    // Open-access NIST paper (PMC5117641), read in full 2026-08-22. This
    // is the article's evidence layer for the separation model: it
    // restates the protective-separation equation and its terms in
    // public, gives the ISO 13855 intrusion-margin decision table
    // (850 mm for a normal approach on multiple separate beams), the
    // 1600 mm/s worst-case operator speed and its 2000 mm/s alternative,
    // and a 10.0 m/s^2 robot deceleration worked example. The
    // interactive's model is built from this paper, not from the
    // paywalled specification.
    id: 'marvel-norcross-2017',
    title:
      'Implementing speed and separation monitoring in collaborative robot workcells',
    authors: ['Jeremy A. Marvel', 'Rick Norcross'],
    year: 2017,
    venue: 'Robotics and Computer-Integrated Manufacturing',
    url: 'https://doi.org/10.1016/j.rcim.2016.08.001',
    type: 'paper',
  },
  {
    // Crossref-verified 2026-08-22: 10.1177/0278364909343970, The
    // International Journal of Robotics Research, issued 2009. The
    // impact-experiment paper underneath every force-limit number in
    // collaborative robotics.
    id: 'haddadin-2009',
    title:
      'Requirements for Safe Robots: Measurements, Analysis and New Insights',
    authors: ['Sami Haddadin', 'Alin Albu-Sch\u00e4ffer', 'Gerd Hirzinger'],
    year: 2009,
    venue: 'The International Journal of Robotics Research',
    url: 'https://doi.org/10.1177/0278364909343970',
    type: 'paper',
  },
  {
    // arXiv abs page verified 2026-08-22 (id 1903.11199, submitted
    // 2019-03-27, six authors as listed). The tutorial-and-survey paper
    // the safety-filter literature builds on.
    id: 'ames-cbf-2019',
    title: 'Control Barrier Functions: Theory and Applications',
    authors: [
      'Aaron D. Ames',
      'Samuel Coogan',
      'Magnus Egerstedt',
      'Gennaro Notomista',
      'Koushil Sreenath',
      'Paulo Tabuada',
    ],
    year: 2019,
    venue: 'ECC 2019',
    arxiv: '1903.11199',
    url: 'https://arxiv.org/abs/1903.11199',
    type: 'paper',
  },
  {
    // Crossref-verified 2026-08-22: 10.1109/mcs.2023.3291885, IEEE
    // Control Systems, issued 2023-10, seven authors in this order. The
    // survey that names the safety-filter architecture as such.
    id: 'wabersich-safety-filters-2023',
    title:
      'Data-Driven Safety Filters: Hamilton-Jacobi Reachability, Control Barrier Functions, and Predictive Methods for Uncertain Systems',
    authors: [
      'Kim P. Wabersich',
      'Andrew J. Taylor',
      'Jason J. Choi',
      'Koushil Sreenath',
      'Claire J. Tomlin',
      'Aaron D. Ames',
      'Melanie N. Zeilinger',
    ],
    year: 2023,
    venue: 'IEEE Control Systems Magazine',
    url: 'https://doi.org/10.1109/MCS.2023.3291885',
    type: 'paper',
  },
  {
    // UL Standards & Engagement product page read 2026-08-22 (HTTP 200):
    // UL 4600, "Standard for Evaluation of Autonomous Products", Edition
    // 3, published and ANSI-approved 2023-03-17. Edition verified from
    // that page rather than from memory.
    id: 'ul-4600-2023',
    title:
      'UL 4600, Standard for Evaluation of Autonomous Products, Edition 3',
    authors: ['UL Standards & Engagement'],
    year: 2023,
    venue: 'UL Standard (public catalogue entry)',
    url: 'https://www.shopulstandards.com/ProductDetail.aspx?productid=UL4600',
    type: 'docs',
  },
  {
    // SCSC Assurance Case Working Group, Goal Structuring Notation
    // Community Standard Version 3, May 2021, ISBN 979-8451294949. The
    // version and date were checked against the SCSC's own GSN area
    // (scsc.uk/gsn, read 2026-08-22, which hosts the standard and states
    // the ACWG maintains it) and the document is published open under
    // CC BY 4.0. Version 3 is current; there is no Version 4.
    id: 'gsn-standard-v3',
    title: 'Goal Structuring Notation Community Standard (Version 3)',
    authors: ['SCSC Assurance Case Working Group'],
    year: 2021,
    venue: 'Safety-Critical Systems Club',
    url: 'https://scsc.uk/scsc-141c',
    type: 'docs',
  },
  {
    // Crossref-verified 2026-08-22: 10.1007/978-3-031-06649-8, Springer,
    // second edition issued 2022. The book that introduced conformal
    // prediction; the first edition is 2005 and the registry year is the
    // edition this DOI resolves to, which is the one a reader can open.
    id: 'vovk-conformal-2022',
    title: 'Algorithmic Learning in a Random World',
    authors: ['Vladimir Vovk', 'Alexander Gammerman', 'Glenn Shafer'],
    year: 2022,
    venue: 'Springer, 2nd edition',
    url: 'https://doi.org/10.1007/978-3-031-06649-8',
    type: 'paper',
  },
  {
    // arXiv abs page verified 2026-08-22 (id 2107.07511, submitted
    // 2021-07-15, two authors). The tutorial that made conformal
    // prediction usable outside its own literature.
    id: 'angelopoulos-conformal-2021',
    title:
      'A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification',
    authors: ['Anastasios N. Angelopoulos', 'Stephen Bates'],
    year: 2021,
    arxiv: '2107.07511',
    url: 'https://arxiv.org/abs/2107.07511',
    type: 'paper',
  },
  {
    // arXiv abs page verified 2026-08-22 (id 2307.01928, submitted
    // 2023-07-04). KnowNo: the strongest robotics instance of calibrated
    // abstention, and the reason this article can name a system rather
    // than only a technique.
    id: 'knowno-2023',
    title:
      'Robots That Ask For Help: Uncertainty Alignment for Large Language Model Planners',
    authors: [
      'Allen Z. Ren',
      'Anushri Dixit',
      'Alexandra Bodrova',
      'Sumeet Singh',
      'Stephen Tu',
      'Noah Brown',
      'Peng Xu',
      'Leila Takayama',
      'Fei Xia',
      'Jake Varley',
      'Zhenjia Xu',
      'Dorsa Sadigh',
      'Andy Zeng',
      'Anirudha Majumdar',
    ],
    year: 2023,
    venue: 'CoRL 2023',
    arxiv: '2307.01928',
    url: 'https://arxiv.org/abs/2307.01928',
    type: 'paper',
  },
  {
    // arXiv abs page verified 2026-08-22 (id 2407.08735, submitted
    // 2024-07-11, six authors in this order).
    id: 'sinha-anomaly-2024',
    title:
      'Real-Time Anomaly Detection and Reactive Planning with Large Language Models',
    authors: [
      'Rohan Sinha',
      'Amine Elhafsi',
      'Christopher Agia',
      'Matthew Foutter',
      'Edward Schmerling',
      'Marco Pavone',
    ],
    year: 2024,
    venue: 'RSS 2024',
    arxiv: '2407.08735',
    url: 'https://arxiv.org/abs/2407.08735',
    type: 'paper',
  },
  {
    // arXiv abs page verified 2026-08-22 (id 2207.12380, submitted
    // 2022-07-25, five authors). Venue confirmed as CoRL 2022 from the
    // PMLR proceedings listing (proceedings.mlr.press/v205/farid23a).
    id: 'farid-failure-2022',
    title:
      'Task-Relevant Failure Detection for Trajectory Predictors in Autonomous Vehicles',
    authors: [
      'Alec Farid',
      'Sushant Veer',
      'Boris Ivanovic',
      'Karen Leung',
      'Marco Pavone',
    ],
    year: 2022,
    venue: 'CoRL 2022',
    arxiv: '2207.12380',
    url: 'https://arxiv.org/abs/2207.12380',
    type: 'paper',
  },
  {
    // OSHA Technical Manual Section IV Chapter 4, "Industrial Robots and
    // Robot System Safety", read 2026-08-22 (HTTP 200, free and public).
    // The article's source for guarding practice, lockout/tagout under
    // 29 CFR 1910.147, the teach-pendant hazard and the incident
    // descriptions. Public regulator guidance, not a paywalled standard.
    id: 'osha-otm-robots',
    title:
      'OSHA Technical Manual, Section IV: Chapter 4, Industrial Robot Systems and Industrial Robot System Safety',
    authors: ['Occupational Safety and Health Administration'],
    year: 2026,
    venue: 'U.S. Department of Labor, as of 2026-08-22',
    url: 'https://www.osha.gov/otm/section-4-safety-hazards/chapter-4',
    type: 'docs',
  },
  {
    // IFR-hosted public executive-summary extract. The report's suggested
    // citation names Christopher Müller; VDMA Services GmbH produces it.
    // The extract establishes 2025, not a day-level publication date.
    id: 'ifr-world-robotics-2025',
    title: 'World Robotics 2025 – Industrial Robots',
    authors: ['Christopher Müller'],
    year: 2025,
    venue: 'IFR Statistical Department, VDMA Services GmbH, Frankfurt am Main, Germany',
    url: 'https://ifr.org/img/worldrobotics/Executive_Summary_WR_2025_Industrial_Robots.pdf',
    type: 'docs',
  },
  {
    // IFR press release, May 5 2026: China operational stock ~2 million
    // units, 4.5x the global no. 2 (Japan), 54% of annual installations.
    id: 'ifr-china-five-year-plan-2026',
    title: 'China Makes AI-powered Robots Core of National Strategy',
    authors: ['International Federation of Robotics'],
    year: 2026,
    venue: 'IFR press release, 2026-05-05',
    url: 'https://ifr.org/ifr-press-releases/news/china-makes-ai-powered-robots-core-of-national-strategy',
    type: 'press',
  },
  {
    // A3 press release: 2025 North American robot orders up 6.6%,
    // sixth straight quarter of growth. Cobots are 19.6% of UNITS ordered
    // (7,212 of 36,766) and 10.7% of order value ($241M of $2.25bn); an
    // earlier version of this comment reported the unit share as a value
    // share and the article inherited the error (audit 2026-09-06). The
    // corrected live slug includes "broader" (verified 2026-08-24); the
    // former slug returned a Cloudflare 403.
    id: 'a3-orders-2025',
    title:
      'Robot Orders Grow 6.6% in 2025 as General Industries Drive Broader Automation Adoption',
    authors: ['Association for Advancing Automation'],
    year: 2026,
    venue: 'A3, 2026-02-06',
    url: 'https://www.automate.org/robotics/news/robot-orders-grow-6-6-in-2025-as-general-industries-drive-broader-automation-adoption',
    type: 'press',
  },
  {
    // Symbotic FY2025 Form 10-K (fiscal year ended 2025-09-27), read via
    // EDGAR: $22.5B backlog, Walmart MAA covering all 42 regional
    // distribution centers, 48 Operational Systems under software
    // maintenance contracts, total revenue $2.247B (+26%).
    id: 'symbotic-10k-2025',
    title: 'Symbotic Inc. Form 10-K, fiscal year ended September 27, 2025',
    authors: ['Symbotic Inc.'],
    year: 2025,
    venue: 'U.S. Securities and Exchange Commission',
    url: 'https://www.sec.gov/Archives/edgar/data/1837240/000183724025000278/sym-20250927.htm',
    type: 'docs',
  },
  {
    // Company announcement: >750,000 robots working with employees in October 2023. Sequoia operating at one Houston site; Digit testing planned. Inventory identification/storage speed and order-processing time are distinct bounded metrics.
    id: "amazon-sequoia-digit-2023",
    title: "Amazon announces 2 new ways it's using robots to assist employees and deliver for customers",
    authors: ["Scott Dresser"],
    year: 2023,
    venue: "Amazon company press, published 2023-10-18",
    url: "https://www.aboutamazon.com/news/operations/amazon-introduces-new-robotics-solutions",
    type: "press",
  },
  {
    // Updated overview, not a simultaneous active-fleet census. More than one million deployed since 2012 is cumulative. Preserve the returned document title; the H1 differs. Named systems and next-generation Proteus pilot have distinct statuses. Stable citation ID retained.
    id: "amazon-robot-fleet-2026",
    title: "Amazon robotics: Meet the robots inside fulfillment centers",
    authors: ["Tyler Greenawalt"],
    year: 2024,
    venue: "Amazon company press, published 2024-10-09; updated 2026-06-04",
    url: "https://www.aboutamazon.com/news/operations/amazon-robotics-robots-fulfillment-center",
    type: "press",
  },
  {
    // Company-reported approximate item-type coverage and employee-comparable speed for pick/stow, not pick success or an independent reliability trial. Spokane/Hamburg pod work and further planned rollout are distinct. Stable citation ID retained.
    id: "amazon-vulcan-2026",
    title: "Introducing Vulcan: Amazon's first robot with a sense of touch",
    authors: ["Alex Davies"],
    year: 2025,
    venue: "Amazon company press, published 2025-05-07; updated 2026-06-04",
    url: "https://www.aboutamazon.com/news/operations/amazon-vulcan-robot-pick-stow-touch",
    type: "press",
  },
  {
    id: 'acemoglu-restrepo-2020',
    title: 'Robots and Jobs: Evidence from US Labor Markets',
    authors: ['Daron Acemoglu', 'Pascual Restrepo'],
    year: 2020,
    venue: 'Journal of Political Economy 128(6), 2188-2244',
    url: 'https://doi.org/10.1086/705716',
    type: 'paper',
  },
  {
    // Final report of the MIT Task Force on the Work of the Future
    // (co-chairs Autor and Mindell, executive director Reynolds;
    // published 2020-11-17). The url is the initiative's landing page,
    // which no longer carries the report or its downloads; the audited
    // text is the archived final-report PDF at
    // web.archive.org/web/20230918120306/https://workofthefuture.mit.edu/wp-content/uploads/2021/01/2020-Final-Report4.pdf
    // (audit 2026-09-06, industrial-deployment).
    id: 'mit-work-future-2020',
    title:
      'The Work of the Future: Building Better Jobs in an Age of Intelligent Machines',
    authors: [
      'David Autor',
      'David Mindell',
      'Elisabeth Reynolds',
      'MIT Task Force on the Work of the Future',
    ],
    year: 2020,
    venue: 'MIT, final report of the Task Force',
    url: 'https://ipc.mit.edu/research/work-of-the-future/',
    type: 'docs',
  },
  {
    // NASA LLIS Lesson 841 has Lesson Date 1994-12-01; submitting organization jsc.
    // Retained primary markdown supports the availability distinctions, not the
    // equation images or linked text alternatives, which were not retrieved.
    // The lesson date is not an inferred date for NASA TM4628 or the scrape.
    id: 'nasa-availability-prediction-analysis',
    title: 'Availability Prediction and Analysis',
    authors: ['NASA'],
    year: 1994,
    venue: 'NASA Lessons Learned Information System, Lesson 841, 1994-12-01; submitting organization: jsc',
    url: 'https://llis.nasa.gov/lesson/841',
    type: 'docs',
  },
  // Official LEI definition has no stated date; access is the retained 2026-09-22 observation.
  {
      "id": "lei-takt-time-definition",
      "title": "Takt Time",
      "authors": [
          "Lean Enterprise Institute"
      ],
      "year": "n.d.",
      "accessedOn": "2026-09-22",
      "venue": "Lean Lexicon",
      "url": "https://www.lean.org/lexicon-terms/takt-time/",
      "type": "docs"
  },
  // Official LEI definition has no stated date; access is the retained 2026-09-22 observation.
  {
      "id": "lei-cycle-time-definition",
      "title": "Cycle Time",
      "authors": [
          "Lean Enterprise Institute"
      ],
      "year": "n.d.",
      "accessedOn": "2026-09-22",
      "venue": "Lean Lexicon",
      "url": "https://www.lean.org/lexicon-terms/cycle-time/",
      "type": "docs"
  },
  {
    id: 'ohno-tps-1988',
    title: 'Toyota Production System: Beyond Large-Scale Production',
    authors: ['Taiichi Ohno'],
    year: 1988,
    venue: 'Productivity Press (reissued by Routledge)',
    url: 'https://www.taylorfrancis.com/books/mono/10.4324/9780429273018/toyota-production-system-taiichi-ohno',
    type: 'docs',
  },
  {
    // Commercial EVST integrator/vendor guide, last updated July 15, 2026.
    // Primary for EVST's own cost estimates and pricing policy, not independent
    // pricing research or authoritative proof of an ISO standards obligation.
    // Its payload bands describe complete cells, not fixed arm-only prices.
    id: 'evst-cell-cost-2026',
    title: 'Palletizing Robot Cost & ROI 2026: Price & Payback Guide',
    authors: ['EVST Engineering Team'],
    year: 2026,
    venue: 'EVST (EVS TECH CO., LTD), 2026-07-15',
    url: 'https://www.evsint.com/palletizing-robot-cost-roi-price-payback-2026/',
    type: 'docs',
  },
  {
    // Ocado Intelligent Automation, the division selling Ocado's
    // grid-based automated warehouse technology beyond grocery.
    id: 'ocado-oia-2026',
    title: 'Ocado Intelligent Automation',
    authors: ['Ocado Group'],
    year: 2026,
    venue: 'Ocado Group, as of 2026-08-22',
    url: 'https://ocadointelligentautomation.com/',
    type: 'docs',
  },
  {
    // AgiBot-World official repository README (OpenDriveLab), registered by
    // the datasets integrator for the repo trajectory count and the repo
    // license. Raw markdown fetched live by the frozen packet's source
    // session (curl 200, 2026-09-16T04:09:19Z, 19,254 bytes, retained at
    // convergence-source-i-datasets-20260916c/sources/agibot-github-readme.md);
    // year 2026 is the fetched-snapshot year (the living README prints no
    // publication year; latest printed news date is 2025/09/19), following
    // the so-arm100-repo-2026 repo-docs convention. Markdown document: no
    // HTML title tag for the reachability title check to compare.
    id: 'agibot-world-repo-2026',
    title: 'AgiBot-World repository README (OpenDriveLab): current trajectory count and repo license',
    authors: ['OpenDriveLab'],
    year: 2026,
    url: 'https://raw.githubusercontent.com/OpenDriveLab/AgiBot-World/main/README.md',
    type: 'docs',
  },
  {
    // Emily Hawkins, This is Money, 18 November 2025. The intended article
    // reports planned January closures of three warehouses, monitoring of
    // five remaining sites, and expected compensation of around £190 million.
    // The original live URL returned HTTP 403. The HTTPS capture of the same
    // article preserves its dated source body; see audit/citations.md.
    id: 'kroger-ocado-closures-2025',
    title:
      "Warehouse closures crush Ocado shares: US partner shuts three sites in 'a devastating blow' to UK firm",
    authors: ['Emily Hawkins'],
    year: 2025,
    venue: 'This is Money, 2025-11-18',
    url: 'https://web.archive.org/web/20251118224554/https://www.thisismoney.co.uk/money/markets/article-15303311/Warehouse-closures-crush-Ocado-shares-US-partner-shuts-three-sites-devastating-blow-UK-firm.html',
    type: 'press',
  },
  // ---- ROS 2 for ML engineers (classical/ros2-for-ml-engineers, 2026-08-24) ----
  // These pages have no individual byline. The project/maintainer collective
  // is retained as the organizational author rather than inventing names.
  {
    id: 'ros2-lyrical-2026',
    title: "Lyrical Luth (codename 'lyrical'; May, 2026)",
    authors: ['ROS 2 Project'],
    year: 2026,
    venue: 'ROS 2 Documentation, as of 2026-08-24',
    url: 'https://docs.ros.org/en/lyrical/Releases/Release-Lyrical-Luth.html',
    type: 'docs',
  },
  {
    id: 'ros2-interfaces-2026',
    title: 'Interfaces (topics, services, actions)',
    authors: ['ROS 2 Project'],
    year: 2026,
    venue: 'ROS 2 Documentation, as of 2026-08-24',
    url: 'https://docs.ros.org/en/lyrical/ROS-Framework/Interfaces-Topics-Services-Actions.html',
    type: 'docs',
  },
  {
    id: 'ros2-qos-2026',
    title: 'Quality of Service settings',
    authors: ['ROS 2 Project'],
    year: 2026,
    venue: 'ROS 2 Documentation, as of 2026-08-24',
    url: 'https://docs.ros.org/en/lyrical/ROS-Framework/interfaces/topics/About-Quality-of-Service-Settings.html',
    type: 'docs',
  },
  {
    id: 'moveit-planning-scene-2026',
    title: 'Planning Scene',
    authors: ['MoveIt Maintainers'],
    year: 2026,
    venue: 'MoveIt 2 Documentation, as of 2026-08-24',
    url: 'https://moveit.picknik.ai/main/api/html/planning_scene_overview.html',
    type: 'docs',
  },
  {
    // Registered 2026-09-17 by the convergence-aq integrator from the frozen
    // AO packet (convergence-ao-av2-plus-bookretry-20260917a, binding
    // autonomous-vehicles:2), removing the 2026-09-15 registration hold: the
    // tour pages serve over https with no redirect (re-verified fresh by the
    // preparer 2026-09-17; index 5,933 B, home page 1,444 B, ralph.html
    // 20,895 B, all sha256-pinned in the lane), so the locked registry schema
    // (https URLs and dated web.archive.org captures alone) admits the live
    // URL and no capture identity had to be constructed. The site is the
    // project's own CMU Robotics Institute page set (tjochem@ri.cmu.edu,
    // pomerlea@cs.cmu.edu); the tour's steering program RALPH and its ALVINN
    // lineage are printed there. alvinn-1988 remains the architecture
    // citation; this entry carries the 1995 demonstration-tour record.
    id: 'no-hands-across-america-1995',
    title: 'No Hands Across America (Navlab 5 USA tour)',
    authors: ['Dean Pomerleau', 'Todd Jochem'],
    year: 1995,
    venue: 'Carnegie Mellon University Robotics Institute (project pages)',
    url: 'https://www.cs.cmu.edu/~tjochem/nhaa/nhaa_home_page.html',
    type: 'docs',
  },
  {
    // KOL backlog batch 2026-10-01 (Yuke Zhu intake). Abstract page fetched
    // 2026-10-01; v1 submitted 26 June 2026, v4 revised 5 August 2026.
    id: 'simfoundry-2026',
    title: 'SimFoundry: Modular and Automated Scene Generation for Policy Learning and Evaluation',
    authors: [
      'Nadun Ranawaka', 'Josiah Wong', 'Wei-Lin Pai', 'Wei-Teng Chu', 'Tianyuan Dai',
      'Masoud Moghani', 'Hang Yin', 'Yunfan Jiang', 'Wesley Durbano', 'Brandon Huynh',
      'Yu Fang', 'Danfei Xu', 'Ruohan Zhang', 'Li Fei-Fei', 'Linxi Fan', 'Bowen Wen',
      'Ajay Mandlekar', 'Yuke Zhu',
    ],
    year: 2026,
    arxiv: '2606.28276',
    url: 'https://arxiv.org/abs/2606.28276',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-01 (Marco Hutter intake). Abstract and HTML
    // fetched 2026-10-01; submitted 25 September 2026. Affiliations from the
    // HTML: Robotic Systems Lab, ETH Zurich; AMTC, Universidad de Chile.
    id: 'excavator-mbrl-2026',
    title:
      'Precision at Speed: Sample-Efficient Online Model-Based Reinforcement Learning for Hydraulic Excavator Control',
    authors: ['Claudio Canales', 'Fang Nan', 'Marco Hutter', 'Javier Ruiz-del-Solar'],
    year: 2026,
    arxiv: '2609.31025',
    url: 'https://arxiv.org/abs/2609.31025',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-01 (Dieter Fox intake). Abstract and HTML
    // fetched 2026-10-01; submitted 23 September 2026, IROS 2026. The HTML
    // states the experiments run in simulation and build on TD-MPC2.
    id: 'insertion-world-models-2026',
    title: 'Generalizable Robotic Insertion with World Models',
    authors: [
      'Nicklas Hansen', 'Iretiayo Akinola', 'Yijie Guo', 'Jie Xu', 'Bingjie Tang', 'Hao Su',
      'Xiaolong Wang', 'Abhishek Gupta', 'Dieter Fox', 'Yashraj Narang',
    ],
    year: 2026,
    venue: 'IROS 2026',
    arxiv: '2609.28258',
    url: 'https://arxiv.org/abs/2609.28258',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-01 (Chris Paxton intake). Newsletter post
    // dated 12 September 2026, fetched 2026-10-01 for the dated attribution.
    id: 'paxton-autonomous-trucks-2026',
    title: 'The State of Autonomous Trucks in 2026',
    authors: ['Chris Paxton'],
    year: 2026,
    venue: 'It Can Think!',
    url: 'https://itcanthink.substack.com/p/the-state-of-autonomous-trucks-in',
    type: 'blog',
  },
  {
    // KOL backlog batch 2026-10-01 (Jitendra Malik intake). Abstract page
    // fetched 2026-10-01; v1 23 September 2026, v2 25 September 2026.
    id: 'morphometric-imitation-2026',
    title:
      'Morphometric Imitation: From Morphology and Contact Aware Hand Retargeting to Sim-to-Real Visuomotor Policy',
    authors: [
      'Tara Sadjadpour', 'Siming He', 'C.K. Wolfe', 'Haozhi Qi', 'Lea Wilken', 'S. Shankar Sastry',
      'Claire Tomlin', 'Jitendra Malik',
    ],
    year: 2026,
    arxiv: '2609.28660',
    url: 'https://arxiv.org/abs/2609.28660',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-01 (Yuke Zhu intake). Abstract page fetched
    // 2026-10-01; v1 submitted 17 February 2026. The paper names the model
    // DreamZero.
    id: 'dreamzero-2026',
    title: 'World Action Models are Zero-shot Policies',
    authors: [
      'Seonghyeon Ye', 'Yunhao Ge', 'Kaiyuan Zheng', 'Shenyuan Gao', 'Sihyun Yu', 'George Kurian',
      'Suneel Indupuru', 'You Liang Tan', 'Chuning Zhu', 'Jiannan Xiang', 'Ayaan Malik', 'Kyungmin Lee',
      'William Liang', 'Nadun Ranawaka', 'Jiasheng Gu', 'Yinzhen Xu', 'Guanzhi Wang', 'Fengyuan Hu',
      'Avnish Narayan', 'Johan Bjorck', 'Jing Wang', 'Gwanghyun Kim', 'Dantong Niu', 'Ruijie Zheng',
      'Yuqi Xie', 'Jimmy Wu', 'Qi Wang', 'Ryan Julian', 'Danfei Xu', 'Yilun Du', 'Yevgen Chebotar',
      'Scott Reed', 'Jan Kautz', 'Yuke Zhu', 'Linxi "Jim" Fan', 'Joel Jang',
    ],
    year: 2026,
    arxiv: '2602.15922',
    url: 'https://arxiv.org/abs/2602.15922',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-01 (Yuke Zhu intake). Abstract page fetched
    // 2026-10-02; v1 15 June 2026, v2 18 June 2026.
    id: 't-rex-2026',
    title: 'T-Rex: Tactile-Reactive Dexterous Manipulation',
    authors: [
      'Dantong Niu', 'Zhuoyang Liu', 'Zekai Wang', 'Boning Shao', 'Zhao-Heng Yin', 'Anirudh Pai',
      'Yuvan Sharma', 'Stefano Saravalle', 'Ruijie Zheng', 'Jing Wang', 'Ryan Punamiya', 'Mengda Xu',
      'Yuqi Xie', 'Yunfan Jiang', 'Letian Fu', 'Konstantinos Kallidromitis', 'Matteo Gioia',
      'Junyi Zhang', 'Jiaxin Ge', 'Haiwen Feng', 'Fabio Galasso', 'Wei Zhan', 'David M. Chan',
      'Yutong Bai', 'Roei Herzig', 'Jiahui Lei', 'Li Fei-Fei', 'Ken Goldberg', 'Jitendra Malik',
      'Pieter Abbeel', 'Yuke Zhu', 'Danfei Xu', 'Linxi Fan', 'Trevor Darrell',
    ],
    year: 2026,
    arxiv: '2606.17055',
    url: 'https://arxiv.org/abs/2606.17055',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-01 (Yuke Zhu intake). Abstract page fetched
    // 2026-10-02; v1 22 June 2026, v2 14 August 2026.
    id: 'chord-2026',
    title: 'Learning Dexterous Manipulation Using Contact Wrench Guidance From Human Demonstration',
    authors: [
      'Xinghao Zhu', 'Zixi Liu', 'Shalin Jain', 'Chenran Li', 'Milad Noori', 'Michael Andres Lin',
      'Huihua Zhao', 'John Welsh', 'Mrinal Verghese', 'Wei Liu', 'Tingwu Wang', 'Xingye Da',
      'Zhengyi Luo', 'Vishal Kulkarni', 'Naema Bhatti', 'Yuke Zhu', 'Linxi Fan', 'Bowen Wen',
      'Danfei Xu', 'Soha Pouya', 'Yan Chang',
    ],
    year: 2026,
    arxiv: '2607.00033',
    url: 'https://arxiv.org/abs/2607.00033',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-01 (Ken Goldberg intake). Abstract page
    // fetched 2026-10-02; submitted 24 September 2026, accepted to IROS 2026.
    id: 'trace-cables-2026',
    title: 'TRACE: Interactive Bi-Directional Tracing of Monochrome Cables Amid Clutter',
    authors: [
      'Nidhya Shivakumar', 'Ethan Ransing', 'Josh Zhang', 'Shamak Gowda', 'Kevin Yang', 'Miles Hua',
      'Anika Agrawal', 'Justin Yu', 'Ken Goldberg',
    ],
    year: 2026,
    venue: 'IROS 2026',
    arxiv: '2609.29103',
    url: 'https://arxiv.org/abs/2609.29103',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Yann LeCun intake). Abstract page fetched
    // 2026-10-05; submitted 28 September 2026.
    id: 'ad-e2e-jepa-2026',
    title: 'AD-E2E-JEPA: A Joint-Embedding Predictive Architecture For End-to-End Autonomous Driving',
    authors: ['Haoran Zhu', 'Wancong Zhang', 'Yann LeCun', 'Anna Choromanska'],
    year: 2026,
    arxiv: '2609.34085',
    url: 'https://arxiv.org/abs/2609.34085',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Guanya Shi intake). Abstract page fetched
    // 2026-10-05; submitted 30 September 2026.
    id: 'simex-2026',
    title: 'SimEX: Simulation-Integrated Robotics AutoResearch',
    authors: ['Jiaheng Hu', 'Roberto Martin-Martin', 'Peter Stone', 'Rocky Duan', 'Zhenyu Jiang', 'Guanya Shi'],
    year: 2026,
    arxiv: '2609.38982',
    url: 'https://arxiv.org/abs/2609.38982',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Dhruv Shah intake). Abstract page fetched
    // 2026-10-05; v1 23 September 2026, v2 25 September 2026.
    id: 'embodiedswe-2026',
    title: 'EmbodiedSWE: Coding Agents for Long Horizon Dexterous Robotics',
    authors: [
      'Zeyu Shen', 'Haoxiang You', 'Yilang Liu', 'Zhicheng Zheng', 'Lihan Zha', 'Kashu Yamazaki',
      'Mingtong Zhang', 'Suning Huang', 'Jiankai Sun', 'Qianzhong Chen', 'Lucy He', 'Kaiyuan Liu',
      'Haoran Chang', 'Katerina Fragkiadaki', 'Dhruv Shah', 'Mac Schwager', 'Peter Henderson',
      'Ian Abraham', 'Canwen Xu',
    ],
    year: 2026,
    arxiv: '2609.27308',
    url: 'https://arxiv.org/abs/2609.27308',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Cheng Chi intake). Abstract page fetched
    // 2026-10-05; v1 29 September 2026, v2 30 September 2026.
    id: 'roboharn-evo-2026',
    title: 'RoboHarn-Evo: Evolving Hierarchical Physical Knowledge for Self-Improving Robotic Manipulation',
    authors: [
      'Shifeng Bao', 'Fanding Huang', 'Yihan Lin', 'Youhe Feng', 'Guanlin Li', 'Chen Zhao', 'Yang Li',
      'Jiawei He', 'Cheng Chi', 'Jing Zhang',
    ],
    year: 2026,
    arxiv: '2609.37583',
    url: 'https://arxiv.org/abs/2609.37583',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Jim Fan intake). Abstract page fetched
    // 2026-10-05; submitted 30 September 2026.
    id: 'asena-2026',
    title: 'ASENA: Self-evolving Agents for Embodied Navigation',
    authors: [
      'An-Chieh Cheng', 'Isabella Liu', 'Edmund Bu', 'Johan Bjorck', 'Hongxu Yin', 'Zhengyi Luo', 'Jan Kautz',
      'Linxi Fan', 'Yuke Zhu', 'Sifei Liu',
    ],
    year: 2026,
    arxiv: '2609.39207',
    url: 'https://arxiv.org/abs/2609.39207',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Yuke Zhu intake). Abstract page and HTML
    // full text fetched 2026-10-05; submitted 16 July 2026.
    id: 'robottt-2026',
    title: 'RoboTTT: Context Scaling for Robot Policies',
    authors: [
      'Yunfan Jiang', 'Yevgen Chebotar', 'Ruijie Zheng', 'Fengyuan Hu', 'Yunhao Ge', 'Jimmy Wu', 'Tianyuan Dai',
      'Scott Reed', 'Li Fei-Fei', 'Yuke Zhu', 'Linxi Fan',
    ],
    year: 2026,
    arxiv: '2607.15275',
    url: 'https://arxiv.org/abs/2607.15275',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Jiajun Wu intake). Abstract page fetched
    // 2026-10-05; submitted 29 September 2026. arXiv typesets the name as T$^2$Mem.
    id: 't2mem-2026',
    title: 'T²Mem: Learning Test-Time Memory for Robotics',
    authors: ['Yize Liu', 'Huang Huang', 'Yining Hong', 'Zijian Du', 'Zhi Cao', 'Li Fei-Fei', 'Jiajun Wu'],
    year: 2026,
    arxiv: '2609.36720',
    url: 'https://arxiv.org/abs/2609.36720',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Cheng Chi intake). Abstract page fetched
    // 2026-10-05; submitted 30 September 2026.
    id: 'chunktrust-2026',
    title: 'ChunkTrust: Adapting Execution Horizons for Robot Policies with Action-Expert Evidence',
    authors: [
      'Fanding Huang', 'Jingyan Jiang', 'Shifeng Bao', 'Mingkang Pu', 'Shiwei Li', 'Jing Xu', 'Shijia Xu',
      'Guanbo Huang', 'Chenghao Gu', 'Yuzhi Huang', 'Chenxin Li', 'Faisal Nadeem Khan', 'Huan Yang', 'Yan Wang',
      'Cheng Chi', 'Zhi Wang',
    ],
    year: 2026,
    arxiv: '2609.39754',
    url: 'https://arxiv.org/abs/2609.39754',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Danfei Xu intake). Abstract page fetched
    // 2026-10-05; submitted 30 September 2026.
    id: 'prefpi-2026',
    title: 'PrefPI: Preference-Guided Steering into Out-of-Distribution Behaviors',
    authors: ['Seungeun Rho', 'Wontaek Kim', 'Danfei Xu', 'Sehoon Ha'],
    year: 2026,
    arxiv: '2609.40165',
    url: 'https://arxiv.org/abs/2609.40165',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Ken Goldberg intake). Abstract page fetched
    // 2026-10-05; v1 28 September 2026, v2 29 September 2026.
    id: 'agro-suvide-2026',
    title: 'AGRO-SUVIDE: Agentic Robotics for Surgical Viscoelastic Debridement',
    authors: [
      'Shutong Jin', 'Ziyang Chen', 'Preethi Satish', 'Meadow Shen', 'Gary Guthart', 'Florian T. Pokorny',
      'Ken Goldberg',
    ],
    year: 2026,
    arxiv: '2609.34823',
    url: 'https://arxiv.org/abs/2609.34823',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Xiaolong Wang intake). Abstract page fetched
    // 2026-10-05; v1 27 September 2026, v2 29 September 2026.
    id: 'fingr-2026',
    title: "FINGR: Learning Dexterous Hand Control for Real-World Rubik's Cube Solving",
    authors: ['Yutong Liang', 'Quanquan Peng', 'Matthew Kim', 'Xiaolong Wang'],
    year: 2026,
    arxiv: '2609.33973',
    url: 'https://arxiv.org/abs/2609.33973',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Daniela Rus intake). Abstract page fetched
    // 2026-10-05; submitted 21 September 2026.
    id: 'wcbf-hyper-redundant-2026',
    title: 'Safety Control of a Hyper-redundant Robot via Adaptive Weighted Control Barrier Functions',
    authors: ['Zijian Cai', 'Kiwan Wong', 'Wenci Xin', 'Wei Xiao', 'Daniela Rus', 'Cecilia Laschi'],
    year: 2026,
    arxiv: '2609.24062',
    url: 'https://arxiv.org/abs/2609.24062',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Yuke Zhu intake). Abstract page and HTML
    // full text fetched 2026-10-05; submitted 3 June 2026.
    id: 'grail-2026',
    title: 'GRAIL: Generating Humanoid Loco-Manipulation from 3D Assets and Video Priors',
    authors: [
      'Tianyi Xie', 'Haotian Zhang', 'Jinhyung Park', 'Zi Wang', 'Bowen Wen', 'Jiefeng Li', 'Xueting Li',
      'Qingwei Ben', 'Haoyang Weng', 'Yufei Ye', 'David Minor', 'Tingwu Wang', 'Chenfanfu Jiang', 'Sanja Fidler',
      'Jan Kautz', 'Linxi Fan', 'Yuke Zhu', 'Zhengyi Luo', 'Umar Iqbal', 'Ye Yuan',
    ],
    year: 2026,
    arxiv: '2606.05160',
    url: 'https://arxiv.org/abs/2606.05160',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Yuke Zhu intake). Abstract page and HTML
    // full text fetched 2026-10-05; submitted 26 May 2026.
    id: 'humanoidmimicgen-2026',
    title: 'HumanoidMimicGen: Data Generation for Loco-Manipulation via Whole-Body Planning',
    authors: [
      'Kevin Lin', 'Ajay Mandlekar', 'Caelan Reed Garrett', 'Nikita Chernyadev', 'Yu Fang', 'Runyu Ding',
      'Yuqi Xie', 'Justin Tran', 'Linxi Fan', 'Yuke Zhu',
    ],
    year: 2026,
    arxiv: '2605.27724',
    url: 'https://arxiv.org/abs/2605.27724',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Pieter Abbeel intake). Abstract page fetched
    // 2026-10-05; submitted 29 September 2026; the page lists CoRL 2026.
    id: 'prism-humanoid-2026',
    title: 'Counterfactual Video Generation Enables Scalable Humanoid Loco-Manipulation',
    authors: [
      'Zihan Wang', 'Zhen Wu', 'Pieter Abbeel', 'Rocky Duan', 'Jitendra Malik', 'Carmelo Sferrazza',
      'C. Karen Liu', 'Guanya Shi', 'Angjoo Kanazawa',
    ],
    year: 2026,
    venue: 'CoRL 2026',
    arxiv: '2609.38172',
    url: 'https://arxiv.org/abs/2609.38172',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (Jiajun Wu intake). Abstract page fetched
    // 2026-10-05; submitted 28 September 2026.
    id: 'dexagent-2026',
    title: 'DexAgent: An Agentic Human2Sim2Robot Framework for Dexterous Manipulation with Self-Evolving Tool Library',
    authors: ['Youhui Wang', 'Yunzhu Li', 'Li Fei-Fei', 'Jiajun Wu', 'Huang Huang'],
    year: 2026,
    arxiv: '2609.35318',
    url: 'https://arxiv.org/abs/2609.35318',
    type: 'paper',
  },
  {
    // KOL backlog batch 2026-10-05 (The Robot Report intake, a trade summary;
    // the IFR release itself is cited). Press release fetched 2026-10-05.
    id: 'ifr-world-robotics-2026-release',
    title: 'Five Million Robots now Operate in Factories Globally',
    authors: ['International Federation of Robotics'],
    year: 2026,
    venue: 'IFR press release, 2026-09-24',
    url: 'https://ifr.org/ifr-press-releases/news/five-million-robots-now-operate-in-factories-globally',
    type: 'press',
  },
  {
    // KOL backlog batch 2026-10-05 (Marco Hutter intake). Abstract page fetched
    // 2026-10-05; submitted 25 September 2026.
    id: 'mesh-mcl-construction-2026',
    title: 'Transformer-based Monte Carlo Localization in Construction Meshes',
    authors: ['Linus Kramer', 'William Talbot', 'Olga Vysotska', 'Marco Hutter'],
    year: 2026,
    arxiv: '2609.31357',
    url: 'https://arxiv.org/abs/2609.31357',
    type: 'paper',
  },
  // robosuite-2020: domain pass 2026-10-06, from drafts/manipulation/action-spaces.citations.ts.
  // Source pack pack-manipulation-1.md#10 for manipulation/action-spaces.
  {
    id: 'robosuite-2020',
    title: 'robosuite: A Modular Simulation Framework and Benchmark for Robot Learning',
    authors: ['Yuke Zhu', 'Josiah Wong', 'Ajay Mandlekar', 'Roberto Martín-Martín', 'Abhishek Joshi', 'Kevin Lin', 'Abhiram Maddukuri', 'Soroush Nasiriany', 'Yifeng Zhu'],
    year: 2020,
    arxiv: '2009.12293',
    url: 'https://arxiv.org/abs/2009.12293',
    type: 'paper',
  },
  // peng-action-space-2016: domain pass 2026-10-06, from drafts/classical/control.citations.ts; also drafts/manipulation/action-spaces.citations.ts.
  // arXiv 1611.01055 v1 2016-11-03 (SCA 2017). "four different action parameterizations (torques,
  // muscle-activations, target joint angles, and target joint-angle velocities)"; "We demonstrate
  // that the local feedback provided by higher-level action parameterizations can significantly
  // impact the learning, robustness, and quality of the resulting policies."
  {
    id: 'peng-action-space-2016',
    title: 'Learning Locomotion Skills Using DeepRL: Does the Choice of Action Space Matter?',
    authors: ['Xue Bin Peng', 'Michiel van de Panne'],
    year: 2016,
    venue: 'arXiv preprint (SCA 2017)',
    arxiv: '1611.01055',
    url: 'https://arxiv.org/abs/1611.01055',
    type: 'paper',
  },
  // rotation-continuity-2018: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts; also drafts/manipulation/action-spaces.citations.ts.
  // arXiv 1812.07035 (CVPR 2019). Rotation representations in four or fewer dimensions are
  // discontinuous; 5D and 6D are continuous.
  {
    id: 'rotation-continuity-2018',
    title: 'On the Continuity of Rotation Representations in Neural Networks',
    authors: ['Yi Zhou', 'Connelly Barnes', 'Jingwan Lu', 'Jimei Yang', 'Hao Li'],
    year: 2018,
    arxiv: '1812.07035',
    url: 'https://arxiv.org/abs/1812.07035',
    type: 'paper',
  },
  // gr00t-n1-6-2025: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts; also drafts/manipulation/action-spaces.citations.ts, drafts/manipulation/comparison-matrix.citations.ts, drafts/manipulation/cross-embodiment.citations.ts, drafts/manipulation/generalist-policies.citations.ts, drafts/manipulation/knowledge-insulation.citations.ts, drafts/manipulation/realtime-execution.citations.ts.
  // Official NVIDIA GEAR Lab research page (2025-12). State-relative action chunks; smoother motion;
  // error accumulation with small datasets. Authors as printed on the page (re-read 2026-10-04):
  // "Authors (alphabetical): *GEAR Team, Allison Azzolini, ... Yuke Zhu" ("GEAR Team" plus 58 named
  // authors).
  {
    id: 'gr00t-n1-6-2025',
    title: 'GR00T N1.6: An Improved Open Foundation Model for Generalist Humanoid Robots',
    authors: ['GEAR Team', 'Allison Azzolini', 'Johan Bjorck', 'Valts Blukis', 'Fernando Castañeda', 'Rahul Chand', 'Yan Chang', 'Danyi Chen', 'Nikita Cherniadev', 'Xingye Da', 'Runyu Ding', 'Shunjia Ding', 'Hassan Eslami', 'Linxi "Jim" Fan', 'Yu Fang', 'Max Fu', 'Shenyuan Gao', 'Yunhao Ge', 'Fengyuan Hu', 'Spencer Huang', 'Joel Jang', 'Xiaowei Jiang', 'Yunfan Jiang', 'Ryan Julian', 'Kaushil Kundalia', 'Jan Kautz', 'Zhiqi Li', 'Kevin Lin', 'Wei Liu', 'Runyu Lu', 'Zhengyi Luo', 'Loic Magne', 'Yunze Man', 'Ajay Mandlekar', 'Abhishek Mishra', 'Avnish Narayan', 'Connor Pederson', 'Nadun Ranawaka', 'Scott Reed', 'Sunil Srinivasa', 'You Liang Tan', 'Guanzhi Wang', 'Jing Wang', 'Qi Wang', 'Shihao Wang', 'Jimmy Wu', 'Yubo Wu', 'Yuqi Xie', 'Tianyi Xiong', 'Mengda Xu', 'Yinzhen Xu', 'Fu-En Yang', 'Seonghyeon Ye', 'Zhiding Yu', 'K.R. Zentner', 'Zhe Zhang', 'Kaiyuan Zheng', 'Ruijie Zheng', 'Yuke Zhu'],
    year: 2025,
    url: 'https://research.nvidia.com/labs/gear/gr00t-n1_6/',
    type: 'blog',
  },
  // vla-scaling-alignment-2026: domain pass 2026-10-06, from drafts/manipulation/action-spaces.citations.ts.
  // Source pack pack-manipulation-1.md#4 for manipulation/action-spaces.
  {
    id: 'vla-scaling-alignment-2026',
    title: 'Rethinking Visual-Language-Action Model Scaling: Alignment, Mixture, and Regularization',
    authors: ['Ye Wang', 'Sipeng Zheng', 'Hao Luo', 'Wanpeng Zhang', 'Haoqi Yuan', 'Chaoyi Xu', 'Haiweng Xu', 'Yicheng Feng', 'Mingyang Yu', 'Zhiyu Kang', 'Zongqing Lu', 'Qin Jin'],
    year: 2026,
    arxiv: '2602.09722',
    url: 'https://arxiv.org/abs/2602.09722',
    type: 'paper',
  },
  // levine-visuomotor-2015: domain pass 2026-10-06, from drafts/manipulation/action-spaces.citations.ts.
  // Source pack pack-manipulation-1.md#13 for manipulation/action-spaces.
  {
    id: 'levine-visuomotor-2015',
    title: 'End-to-End Training of Deep Visuomotor Policies',
    authors: ['Sergey Levine', 'Chelsea Finn', 'Trevor Darrell', 'Pieter Abbeel'],
    year: 2015,
    arxiv: '1504.00702',
    url: 'https://arxiv.org/abs/1504.00702',
    type: 'paper',
  },
  // varin-action-spaces-2019: domain pass 2026-10-06, from drafts/manipulation/action-spaces.citations.ts.
  // Source pack pack-manipulation-1.md#1 for manipulation/action-spaces.
  {
    id: 'varin-action-spaces-2019',
    title: 'A Comparison of Action Spaces for Learning Manipulation Tasks',
    authors: ['Patrick Varin', 'Lev Grossman', 'Scott Kuindersma'],
    year: 2019,
    arxiv: '1908.08659',
    url: 'https://arxiv.org/abs/1908.08659',
    type: 'paper',
  },
  // acp-2024: domain pass 2026-10-06, from drafts/classical/control.citations.ts; also drafts/manipulation/action-spaces.citations.ts.
  // arXiv 2410.09309 v1 2024-10-12 (ICRA 2025). "learns to dynamically adjust system compliance both
  // spatially and temporally for given manipulation tasks from human demonstrations"; "achieves over
  // 50\% performance improvement compared to state-of-the-art visuomotor policy methods".
  {
    id: 'acp-2024',
    title: 'Adaptive Compliance Policy: Learning Approximate Compliance for Diffusion Guided Control',
    authors: ['Yifan Hou', 'Zeyi Liu', 'Cheng Chi', 'Eric Cousineau', 'Naveen Kuppuswamy', 'Siyuan Feng', 'Benjamin Burchfiel', 'Shuran Song'],
    year: 2024,
    venue: 'arXiv preprint (ICRA 2025)',
    arxiv: '2410.09309',
    url: 'https://arxiv.org/abs/2410.09309',
    type: 'paper',
  },
  // beast-2025: domain pass 2026-10-06, from drafts/manipulation/action-spaces.citations.ts.
  // Source pack pack-manipulation-1.md#21 for manipulation/action-spaces.
  {
    id: 'beast-2025',
    title: 'BEAST: Efficient Tokenization of B-Splines Encoded Action Sequences for Imitation Learning',
    authors: ['Hongyi Zhou', 'Weiran Liao', 'Xi Huang', 'Yucheng Tang', 'Fabian Otto', 'Xiaogang Jia', 'Xinkai Jiang', 'Simon Hilber', 'Ge Li', 'Qian Wang', 'Ömer Erdinç Yağmurlu', 'Nils Blank', 'Moritz Reuss', 'Rudolf Lioutikov'],
    year: 2025,
    arxiv: '2506.06072',
    url: 'https://arxiv.org/abs/2506.06072',
    type: 'paper',
  },
  // vq-bet-2024: domain pass 2026-10-06, from drafts/manipulation/action-spaces.citations.ts.
  // Source pack pack-manipulation-1.md#23 for manipulation/action-spaces.
  {
    id: 'vq-bet-2024',
    title: 'Behavior Generation with Latent Actions',
    authors: ['Seungjae Lee', 'Yibin Wang', 'Haritheja Etukuru', 'H. Jin Kim', 'Nur Muhammad Mahi Shafiullah', 'Lerrel Pinto'],
    year: 2024,
    arxiv: '2403.03181',
    url: 'https://arxiv.org/abs/2403.03181',
    type: 'paper',
  },
  // action-space-design-2026: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts; also drafts/manipulation/action-spaces.citations.ts.
  // arXiv 2602.23408. 13,000+ real rollouts, 500+ trained models.
  {
    id: 'action-space-design-2026',
    title: 'Demystifying Action Space Design for Robotic Manipulation Policies',
    authors: ['Yuchun Feng', 'Jinliang Zheng', 'Zhihao Wang', 'Dongxiu Liu', 'Jianxiong Li', 'Jiangmiao Pang', 'Tai Wang', 'Xianyuan Zhan'],
    year: 2026,
    arxiv: '2602.23408',
    url: 'https://arxiv.org/abs/2602.23408',
    type: 'paper',
  },
  // bommasani-foundation-models-2021: domain pass 2026-10-06, from drafts/manipulation/foundation-models.citations.ts.
  // Source pack pack-manipulation-2.md#1 for manipulation/foundation-models.
  {
    id: 'bommasani-foundation-models-2021',
    title: 'On the Opportunities and Risks of Foundation Models',
    authors: ['Rishi Bommasani', 'Drew A. Hudson', 'Ehsan Adeli', 'Russ Altman', 'Simran Arora', 'Sydney von Arx', 'Michael S. Bernstein', 'Jeannette Bohg', 'Antoine Bosselut', 'Emma Brunskill', 'Erik Brynjolfsson', 'Shyamal Buch', 'Dallas Card', 'Rodrigo Castellon', 'Niladri Chatterji', 'Annie Chen', 'Kathleen Creel', 'Jared Quincy Davis', 'Dora Demszky', 'Chris Donahue', 'Moussa Doumbouya', 'Esin Durmus', 'Stefano Ermon', 'John Etchemendy', 'Kawin Ethayarajh', 'Li Fei-Fei', 'Chelsea Finn', 'Trevor Gale', 'Lauren Gillespie', 'Karan Goel', 'Noah Goodman', 'Shelby Grossman', 'Neel Guha', 'Tatsunori Hashimoto', 'Peter Henderson', 'John Hewitt', 'Daniel E. Ho', 'Jenny Hong', 'Kyle Hsu', 'Jing Huang', 'Thomas Icard', 'Saahil Jain', 'Dan Jurafsky', 'Pratyusha Kalluri', 'Siddharth Karamcheti', 'Geoff Keeling', 'Fereshte Khani', 'Omar Khattab', 'Pang Wei Koh', 'Mark Krass', 'Ranjay Krishna', 'Rohith Kuditipudi', 'Ananya Kumar', 'Faisal Ladhak', 'Mina Lee', 'Tony Lee', 'Jure Leskovec', 'Isabelle Levent', 'Xiang Lisa Li', 'Xuechen Li', 'Tengyu Ma', 'Ali Malik', 'Christopher D. Manning', 'Suvir Mirchandani', 'Eric Mitchell', 'Zanele Munyikwa', 'Suraj Nair', 'Avanika Narayan', 'Deepak Narayanan', 'Ben Newman', 'Allen Nie', 'Juan Carlos Niebles', 'Hamed Nilforoshan', 'Julian Nyarko', 'Giray Ogut', 'Laurel Orr', 'Isabel Papadimitriou', 'Joon Sung Park', 'Chris Piech', 'Eva Portelance', 'Christopher Potts', 'Aditi Raghunathan', 'Rob Reich', 'Hongyu Ren', 'Frieda Rong', 'Yusuf Roohani', 'Camilo Ruiz', 'Jack Ryan', 'Christopher Ré', 'Dorsa Sadigh', 'Shiori Sagawa', 'Keshav Santhanam', 'Andy Shih', 'Krishnan Srinivasan', 'Alex Tamkin', 'Rohan Taori', 'Armin W. Thomas', 'Florian Tramèr', 'Rose E. Wang', 'William Wang', 'Bohan Wu', 'Jiajun Wu', 'Yuhuai Wu', 'Sang Michael Xie', 'Michihiro Yasunaga', 'Jiaxuan You', 'Matei Zaharia', 'Michael Zhang', 'Tianyi Zhang', 'Xikun Zhang', 'Yuhui Zhang', 'Lucia Zheng', 'Kaitlyn Zhou', 'Percy Liang'],
    year: 2021,
    arxiv: '2108.07258',
    url: 'https://arxiv.org/abs/2108.07258',
    type: 'paper',
  },
  // robocat-2023: domain pass 2026-10-06, from drafts/manipulation/foundation-models.citations.ts.
  // Source pack pack-manipulation-2.md#5 for manipulation/foundation-models.
  {
    id: 'robocat-2023',
    title: 'RoboCat: A Self-Improving Generalist Agent for Robotic Manipulation',
    authors: ['Konstantinos Bousmalis', 'Giulia Vezzani', 'Dushyant Rao', 'Coline Devin', 'Alex X. Lee', 'Maria Bauza', 'Todor Davchev', 'Yuxiang Zhou', 'Agrim Gupta', 'Akhil Raju', 'Antoine Laurens', 'Claudio Fantacci', 'Valentin Dalibard', 'Martina Zambelli', 'Murilo Martins', 'Rugile Pevceviciute', 'Michiel Blokzijl', 'Misha Denil', 'Nathan Batchelor', 'Thomas Lampe', 'Emilio Parisotto', 'Konrad Żołna', 'Scott Reed', 'Sergio Gómez Colmenarejo', 'Jon Scholz', 'Abbas Abdolmaleki', 'Oliver Groth', 'Jean-Baptiste Regli', 'Oleg Sushkov', 'Tom Rothörl', 'José Enrique Chen', 'Yusuf Aytar', 'Dave Barker', 'Joy Ortiz', 'Martin Riedmiller', 'Jost Tobias Springenberg', 'Raia Hadsell', 'Francesco Nori', 'Nicolas Heess'],
    year: 2023,
    venue: 'TMLR',
    arxiv: '2306.11706',
    url: 'https://arxiv.org/abs/2306.11706',
    type: 'paper',
  },
  // gen-1-5-2026: domain pass 2026-10-06, from drafts/frontier/generalization.citations.ts; also drafts/manipulation/comparison-matrix.citations.ts, drafts/manipulation/foundation-models.citations.ts, drafts/manipulation/generalist-policies.citations.ts.
  // Generalist AI research post dated August 19, 2026, byline "Generalist Team" (fetched
  // 2026-10-04): "The model learns new tasks in seconds when prompted with 3 to 12 seconds of a
  // single demonstration, no training required." Company-reported.
  {
    id: 'gen-1-5-2026',
    title: 'GEN-1.5: Embodied Foundation Models are One-Shot Learners',
    authors: ['Generalist Team'],
    year: 2026,
    venue: 'Generalist AI blog',
    url: 'https://generalistai.com/blog/gen-1.5',
    type: 'blog',
  },
  // skild-s1-2026: domain pass 2026-10-06, from drafts/manipulation/comparison-matrix.citations.ts; also drafts/manipulation/foundation-models.citations.ts, drafts/manipulation/generalist-policies.citations.ts.
  // Same source and id as drafts/manipulation/foundation-models.citations.ts,
  // drafts/manipulation/generalist-policies.citations.ts; copied here unchanged so this draft is
  // self-contained; register once.
  {
    id: 'skild-s1-2026',
    title: 'Introducing S1: In-Context Learning for Robotics',
    authors: ['Skild AI Team'],
    year: 2026,
    venue: 'Skild AI blog',
    url: 'https://www.skild.ai/blogs/s1',
    type: 'blog',
  },
  // r3m-2022: domain pass 2026-10-06, from drafts/manipulation/foundation-models.citations.ts.
  // Source pack pack-manipulation-2.md#7 for manipulation/foundation-models.
  {
    id: 'r3m-2022',
    title: 'R3M: A Universal Visual Representation for Robot Manipulation',
    authors: ['Suraj Nair', 'Aravind Rajeswaran', 'Vikash Kumar', 'Chelsea Finn', 'Abhinav Gupta'],
    year: 2022,
    venue: 'CoRL 2022',
    arxiv: '2203.12601',
    url: 'https://arxiv.org/abs/2203.12601',
    type: 'paper',
  },
  // dreamer4-2025: domain pass 2026-10-06, from drafts/manipulation/foundation-models.citations.ts; also drafts/world-models/latent-dynamics.citations.ts.
  // Source pack pack-manipulation-2.md#22 for manipulation/foundation-models; same source and id
  // also proposed in drafts/world-models/latent-dynamics.citations.ts; register once.
  {
    id: 'dreamer4-2025',
    title: 'Training Agents Inside of Scalable World Models',
    authors: ['Danijar Hafner', 'Wilson Yan', 'Timothy Lillicrap'],
    year: 2025,
    arxiv: '2509.24527',
    url: 'https://arxiv.org/abs/2509.24527',
    type: 'paper',
  },
  // ctrl-world-2025: domain pass 2026-10-06, from drafts/data-hardware/evaluation-crisis.citations.ts; also drafts/manipulation/foundation-models.citations.ts, drafts/world-models/evaluation.citations.ts.
  // Same id as drafts/world-models/evaluation.citations.ts; keep one entry when merging.
  {
    id: 'ctrl-world-2025',
    title: 'Ctrl-World: A Controllable Generative World Model for Robot Manipulation',
    authors: ['Yanjiang Guo', 'Lucy Xiaoyang Shi', 'Jianyu Chen', 'Chelsea Finn'],
    year: 2025,
    arxiv: '2510.10125',
    url: 'https://arxiv.org/abs/2510.10125',
    type: 'paper',
  },
  // nvidia-gtc-gr00t-n2-2026: domain pass 2026-10-06, from drafts/manipulation/comparison-matrix.citations.ts; also drafts/manipulation/foundation-models.citations.ts, drafts/manipulation/generalist-policies.citations.ts.
  // Same source and id as drafts/manipulation/foundation-models.citations.ts,
  // drafts/manipulation/generalist-policies.citations.ts; copied here unchanged so this draft is
  // self-contained; register once.
  {
    id: 'nvidia-gtc-gr00t-n2-2026',
    title: 'NVIDIA and Global Robotics Leaders Take Physical AI to the Real World',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'NVIDIA Newsroom',
    url: 'https://nvidianews.nvidia.com/news/nvidia-and-global-robotics-leaders-take-physical-ai-to-the-real-world',
    type: 'press',
  },
  // vc1-2023: domain pass 2026-10-06, from drafts/manipulation/foundation-models.citations.ts.
  // Source pack pack-manipulation-2.md#8 for manipulation/foundation-models.
  {
    id: 'vc1-2023',
    title: 'Where are we in the search for an Artificial Visual Cortex for Embodied Intelligence?',
    authors: ['Arjun Majumdar', 'Karmesh Yadav', 'Sergio Arnaud', 'Yecheng Jason Ma', 'Claire Chen', 'Sneha Silwal', 'Aryan Jain', 'Vincent-Pierre Berges', 'Pieter Abbeel', 'Jitendra Malik', 'Dhruv Batra', 'Yixin Lin', 'Oleksandr Maksymets', 'Aravind Rajeswaran', 'Franziska Meier'],
    year: 2023,
    arxiv: '2303.18240',
    url: 'https://arxiv.org/abs/2303.18240',
    type: 'paper',
  },
  // robopair-2024: domain pass 2026-10-06, from drafts/frontier/safety-and-assurance.citations.ts; also drafts/manipulation/foundation-models.citations.ts.
  // Abstract re-read 2026-10-04: "often achieving 100% attack success rates"; "our results on the
  // Unitree Go2 represent the first successful jailbreak of a deployed commercial robotic system."
  // Source pack pack-manipulation-2.md#34 for manipulation/foundation-models.
  {
    id: 'robopair-2024',
    title: 'Jailbreaking LLM-Controlled Robots',
    authors: ['Alexander Robey', 'Zachary Ravichandran', 'Vijay Kumar', 'Hamed Hassani', 'George J. Pappas'],
    year: 2024,
    arxiv: '2410.13691',
    url: 'https://arxiv.org/abs/2410.13691',
    type: 'paper',
  },
  // libero-pro-2025: domain pass 2026-10-06, from drafts/data-hardware/evaluation-crisis.citations.ts; also drafts/frontier/generalization.citations.ts, drafts/manipulation/foundation-models.citations.ts.
  {
    id: 'libero-pro-2025',
    title: 'LIBERO-PRO: Towards Robust and Fair Evaluation of Vision-Language-Action Models Beyond Memorization',
    authors: ['Xueyang Zhou', 'Yangming Xu', 'Guiyao Tie', 'Yongchao Chen', 'Guowen Zhang', 'Duanfeng Chu', 'Pan Zhou', 'Lichao Sun'],
    year: 2025,
    arxiv: '2510.03827',
    url: 'https://arxiv.org/abs/2510.03827',
    type: 'paper',
  },
  // bidirectional-decoding-2024: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts; also drafts/manipulation/diffusion-policy.citations.ts, drafts/manipulation/realtime-execution.citations.ts.
  // Source pack pack-manipulation-1.md#10 for manipulation/action-chunking; same source and id also
  // proposed in drafts/manipulation/diffusion-policy.citations.ts,
  // drafts/manipulation/realtime-execution.citations.ts; register once.
  {
    id: 'bidirectional-decoding-2024',
    title: 'Bidirectional Decoding: Improving Action Chunking via Guided Test-Time Sampling',
    authors: ['Yuejiang Liu', 'Jubayer Ibn Hamid', 'Annie Xie', 'Yoonho Lee', 'Maximilian Du', 'Chelsea Finn'],
    year: 2024,
    arxiv: '2408.17355',
    url: 'https://arxiv.org/abs/2408.17355',
    type: 'paper',
  },
  // implicit-bc-2021: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts; also drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-1.md#16 for manipulation/bc-foundations.
  {
    id: 'implicit-bc-2021',
    title: 'Implicit Behavioral Cloning',
    authors: ['Pete Florence', 'Corey Lynch', 'Andy Zeng', 'Oscar Ramirez', 'Ayzaan Wahid', 'Laura Downs', 'Adrian Wong', 'Johnny Lee', 'Igor Mordatch', 'Jonathan Tompson'],
    year: 2021,
    arxiv: '2109.00137',
    url: 'https://arxiv.org/abs/2109.00137',
    type: 'paper',
  },
  // pearce-diffusion-bc-2023: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#13 for manipulation/diffusion-policy.
  {
    id: 'pearce-diffusion-bc-2023',
    title: 'Imitating Human Behaviour with Diffusion Models',
    authors: ['Tim Pearce', 'Tabish Rashid', 'Anssi Kanervisto', 'Dave Bignell', 'Mingfei Sun', 'Raluca Georgescu', 'Sergio Valcarcel Macua', 'Shan Zheng Tan', 'Ida Momennejad', 'Katja Hofmann', 'Sam Devlin'],
    year: 2023,
    venue: 'ICLR 2023',
    arxiv: '2301.10677',
    url: 'https://arxiv.org/abs/2301.10677',
    type: 'paper',
  },
  // much-ado-noising-2025: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts; also drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-1.md#17 for manipulation/bc-foundations.
  {
    id: 'much-ado-noising-2025',
    title: 'Much Ado About Noising: Dispelling the Myths of Generative Robotic Control',
    authors: ['Chaoyi Pan', 'Giri Anantharaman', 'Nai-Chieh Huang', 'Claire Jin', 'Daniel Pfrommer', 'Chenyang Yuan', 'Frank Permenter', 'Guannan Qu', 'Nicholas Boffi', 'Guanya Shi', 'Max Simchowitz'],
    year: 2025,
    arxiv: '2512.01809',
    url: 'https://arxiv.org/abs/2512.01809',
    type: 'paper',
  },
  // ddpm-2020: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#1 for manipulation/diffusion-policy.
  {
    id: 'ddpm-2020',
    title: 'Denoising Diffusion Probabilistic Models',
    authors: ['Jonathan Ho', 'Ajay Jain', 'Pieter Abbeel'],
    year: 2020,
    arxiv: '2006.11239',
    url: 'https://arxiv.org/abs/2006.11239',
    type: 'paper',
  },
  // iddpm-2021: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#3 for manipulation/diffusion-policy.
  {
    id: 'iddpm-2021',
    title: 'Improved Denoising Diffusion Probabilistic Models',
    authors: ['Alex Nichol', 'Prafulla Dhariwal'],
    year: 2021,
    arxiv: '2102.09672',
    url: 'https://arxiv.org/abs/2102.09672',
    type: 'paper',
  },
  // ddim-2021: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#2 for manipulation/diffusion-policy.
  {
    id: 'ddim-2021',
    title: 'Denoising Diffusion Implicit Models',
    authors: ['Jiaming Song', 'Chenlin Meng', 'Stefano Ermon'],
    year: 2021,
    venue: 'ICLR 2021',
    arxiv: '2010.02502',
    url: 'https://arxiv.org/abs/2010.02502',
    type: 'paper',
  },
  // film-2018: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts; also drafts/manipulation/vla-models.citations.ts.
  // Source pack pack-manipulation-2.md#8 for manipulation/diffusion-policy.
  {
    id: 'film-2018',
    title: 'FiLM: Visual Reasoning with a General Conditioning Layer',
    authors: ['Ethan Perez', 'Florian Strub', 'Harm de Vries', 'Vincent Dumoulin', 'Aaron Courville'],
    year: 2018,
    venue: 'AAAI 2018',
    arxiv: '1709.07871',
    url: 'https://arxiv.org/abs/1709.07871',
    type: 'paper',
  },
  // scaledp-2024: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#16 for manipulation/diffusion-policy.
  {
    id: 'scaledp-2024',
    title: 'Scaling Diffusion Policy in Transformer to 1 Billion Parameters for Robotic Manipulation',
    authors: ['Minjie Zhu', 'Yichen Zhu', 'Jinming Li', 'Junjie Wen', 'Zhiyuan Xu', 'Ning Liu', 'Ran Cheng', 'Chaomin Shen', 'Yaxin Peng', 'Feifei Feng', 'Jian Tang'],
    year: 2024,
    arxiv: '2409.14411',
    url: 'https://arxiv.org/abs/2409.14411',
    type: 'paper',
  },
  // groupnorm-2018: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#9 for manipulation/diffusion-policy.
  {
    id: 'groupnorm-2018',
    title: 'Group Normalization',
    authors: ['Yuxin Wu', 'Kaiming He'],
    year: 2018,
    arxiv: '1803.08494',
    url: 'https://arxiv.org/abs/1803.08494',
    type: 'paper',
  },
  // dp3-2024: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#14 for manipulation/diffusion-policy.
  {
    id: 'dp3-2024',
    title: '3D Diffusion Policy: Generalizable Visuomotor Policy Learning via Simple 3D Representations',
    authors: ['Yanjie Ze', 'Gu Zhang', 'Kangning Zhang', 'Chenyuan Hu', 'Muhan Wang', 'Huazhe Xu'],
    year: 2024,
    venue: 'RSS 2024',
    arxiv: '2403.03954',
    url: 'https://arxiv.org/abs/2403.03954',
    type: 'paper',
  },
  // equivariant-diffusion-policy-2024: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#15 for manipulation/diffusion-policy.
  {
    id: 'equivariant-diffusion-policy-2024',
    title: 'Equivariant Diffusion Policy',
    authors: ['Dian Wang', 'Stephen Hart', 'David Surovik', 'Tarik Kelestemur', 'Haojie Huang', 'Haibo Zhao', 'Mark Yeatman', 'Jiuguang Wang', 'Robin Walters', 'Robert Platt'],
    year: 2024,
    venue: 'CoRL 2024',
    arxiv: '2407.01812',
    url: 'https://arxiv.org/abs/2407.01812',
    type: 'paper',
  },
  // aloha-unleashed-2024: domain pass 2026-10-06, from drafts/data-hardware/teleop-rigs.citations.ts; also drafts/manipulation/action-chunking.citations.ts, drafts/manipulation/diffusion-policy.citations.ts.
  // Fleet figures read in the arXiv HTML body 2026-10-04: "a pool of 35 operators without oversight
  // by researchers" and "over 26k episodes for 5 real tasks, on 10 different robots in 2 different
  // buildings over the course of 8 months".
  {
    id: 'aloha-unleashed-2024',
    title: 'ALOHA Unleashed: A Simple Recipe for Robot Dexterity',
    authors: ['Tony Z. Zhao', 'Jonathan Tompson', 'Danny Driess', 'Pete Florence', 'Kamyar Ghasemipour', 'Chelsea Finn', 'Ayzaan Wahid'],
    year: 2024,
    arxiv: '2410.13126',
    url: 'https://arxiv.org/abs/2410.13126',
    type: 'paper',
  },
  // consistency-models-2023: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#5 for manipulation/diffusion-policy.
  {
    id: 'consistency-models-2023',
    title: 'Consistency Models',
    authors: ['Yang Song', 'Prafulla Dhariwal', 'Mark Chen', 'Ilya Sutskever'],
    year: 2023,
    venue: 'ICML 2023',
    arxiv: '2303.01469',
    url: 'https://arxiv.org/abs/2303.01469',
    type: 'paper',
  },
  // mp1-2026: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#25 for manipulation/diffusion-policy.
  {
    id: 'mp1-2026',
    title: 'MP1: MeanFlow Tames Policy Learning in 1-step for Robotic Manipulation',
    authors: ['Juyi Sheng', 'Ziyi Wang', 'Peiming Li', 'Mengyuan Liu'],
    year: 2026,
    venue: 'AAAI 2026',
    arxiv: '2507.10543',
    url: 'https://arxiv.org/abs/2507.10543',
    type: 'paper',
  },
  // one-step-flow-policy-2026: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#26 for manipulation/diffusion-policy.
  {
    id: 'one-step-flow-policy-2026',
    title: 'One-Step Flow Policy: Self-Distillation for Fast Visuomotor Policies',
    authors: ['Shaolong Li', 'Lichao Sun', 'Yongchao Chen'],
    year: 2026,
    arxiv: '2603.12480',
    url: 'https://arxiv.org/abs/2603.12480',
    type: 'paper',
  },
  // lipman-flow-matching-2022: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts; also drafts/manipulation/knowledge-insulation.citations.ts, drafts/manipulation/pi-line.citations.ts, drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-2.md#6 for manipulation/diffusion-policy; same source and id also
  // proposed in drafts/manipulation/knowledge-insulation.citations.ts; register once.
  {
    id: 'lipman-flow-matching-2022',
    title: 'Flow Matching for Generative Modeling',
    authors: ['Yaron Lipman', 'Ricky T. Q. Chen', 'Heli Ben-Hamu', 'Maximilian Nickel', 'Matt Le'],
    year: 2022,
    arxiv: '2210.02747',
    url: 'https://arxiv.org/abs/2210.02747',
    type: 'paper',
  },
  // rectified-flow-2022: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts; also drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-2.md#7 for manipulation/diffusion-policy.
  {
    id: 'rectified-flow-2022',
    title: 'Flow Straight and Fast: Learning to Generate and Transfer Data with Rectified Flow',
    authors: ['Xingchao Liu', 'Chengyue Gong', 'Qiang Liu'],
    year: 2022,
    arxiv: '2209.03003',
    url: 'https://arxiv.org/abs/2209.03003',
    type: 'paper',
  },
  // demystifying-diffusion-policies-2025: domain pass 2026-10-06, from drafts/manipulation/diffusion-policy.citations.ts.
  // Source pack pack-manipulation-2.md#31 for manipulation/diffusion-policy.
  {
    id: 'demystifying-diffusion-policies-2025',
    title: 'Demystifying Diffusion Policies: Action Memorization and Simple Lookup Table Alternatives',
    authors: ['Chengyang He', 'Xu Liu', 'Gadiel Sznaier Camps', 'Guillaume Sartoretti', 'Mac Schwager'],
    year: 2025,
    arxiv: '2505.05787',
    url: 'https://arxiv.org/abs/2505.05787',
    type: 'paper',
  },
  // efficientnet-2019: domain pass 2026-10-06, from drafts/manipulation/vla-models.citations.ts.
  // Source pack pack-manipulation-4.md#1 for manipulation/vla-models.
  {
    id: 'efficientnet-2019',
    title: 'EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks',
    authors: ['Mingxing Tan', 'Quoc V. Le'],
    year: 2019,
    venue: 'ICML 2019',
    arxiv: '1905.11946',
    url: 'https://arxiv.org/abs/1905.11946',
    type: 'paper',
  },
  // tokenlearner-2021: domain pass 2026-10-06, from drafts/manipulation/vla-models.citations.ts.
  // Source pack pack-manipulation-4.md#2 for manipulation/vla-models.
  {
    id: 'tokenlearner-2021',
    title: 'TokenLearner: What Can 8 Learned Tokens Do for Images and Videos?',
    authors: ['Michael S. Ryoo', 'AJ Piergiovanni', 'Anurag Arnab', 'Mostafa Dehghani', 'Anelia Angelova'],
    year: 2021,
    venue: 'NeurIPS 2021',
    arxiv: '2106.11297',
    url: 'https://arxiv.org/abs/2106.11297',
    type: 'paper',
  },
  // palm-e-2023: domain pass 2026-10-06, from drafts/manipulation/vla-models.citations.ts.
  // Source pack pack-manipulation-4.md#5 for manipulation/vla-models.
  {
    id: 'palm-e-2023',
    title: 'PaLM-E: An Embodied Multimodal Language Model',
    authors: ['Danny Driess', 'Fei Xia', 'Mehdi S. M. Sajjadi', 'Corey Lynch', 'Aakanksha Chowdhery', 'Brian Ichter', 'Ayzaan Wahid', 'Jonathan Tompson', 'Quan Vuong', 'Tianhe Yu', 'Wenlong Huang', 'Yevgen Chebotar', 'Pierre Sermanet', 'Daniel Duckworth', 'Sergey Levine', 'Vincent Vanhoucke', 'Karol Hausman', 'Marc Toussaint', 'Klaus Greff', 'Andy Zeng', 'Igor Mordatch', 'Pete Florence'],
    year: 2023,
    arxiv: '2303.03378',
    url: 'https://arxiv.org/abs/2303.03378',
    type: 'paper',
  },
  // vla-0-2025: domain pass 2026-10-06, from drafts/manipulation/vla-models.citations.ts.
  // Source pack pack-manipulation-4.md#17 for manipulation/vla-models.
  {
    id: 'vla-0-2025',
    title: 'VLA-0: Building State-of-the-Art VLAs with Zero Modification',
    authors: ['Ankit Goyal', 'Hugo Hadfield', 'Xuning Yang', 'Valts Blukis', 'Fabio Ramos'],
    year: 2025,
    arxiv: '2510.13054',
    url: 'https://arxiv.org/abs/2510.13054',
    type: 'paper',
  },
  // remix-2024: domain pass 2026-10-06, from drafts/data-hardware/datasets.citations.ts; also drafts/manipulation/cross-embodiment.citations.ts, drafts/manipulation/vla-models.citations.ts.
  {
    id: 'remix-2024',
    title: 'Re-Mix: Optimizing Data Mixtures for Large Scale Imitation Learning',
    authors: ['Joey Hejna', 'Chethan Bhateja', 'Yichen Jiang', 'Karl Pertsch', 'Dorsa Sadigh'],
    year: 2024,
    arxiv: '2408.14037',
    url: 'https://arxiv.org/abs/2408.14037',
    type: 'paper',
  },
  // prismatic-vlm-2024: domain pass 2026-10-06, from drafts/manipulation/vla-models.citations.ts.
  // Source pack pack-manipulation-4.md#9 for manipulation/vla-models.
  {
    id: 'prismatic-vlm-2024',
    title: 'Prismatic VLMs: Investigating the Design Space of Visually-Conditioned Language Models',
    authors: ['Siddharth Karamcheti', 'Suraj Nair', 'Ashwin Balakrishna', 'Percy Liang', 'Thomas Kollar', 'Dorsa Sadigh'],
    year: 2024,
    venue: 'ICML 2024',
    arxiv: '2402.07865',
    url: 'https://arxiv.org/abs/2402.07865',
    type: 'paper',
  },
  // llama-2-2023: domain pass 2026-10-06, from drafts/manipulation/vla-models.citations.ts.
  // Source pack pack-manipulation-4.md#12 for manipulation/vla-models.
  {
    id: 'llama-2-2023',
    title: 'Llama 2: Open Foundation and Fine-Tuned Chat Models',
    authors: ['Hugo Touvron', 'Louis Martin', 'Kevin Stone', 'Peter Albert', 'Amjad Almahairi', 'Yasmine Babaei', 'Nikolay Bashlykov', 'Soumya Batra', 'Prajjwal Bhargava', 'Shruti Bhosale', 'Dan Bikel', 'Lukas Blecher', 'Cristian Canton Ferrer', 'Moya Chen', 'Guillem Cucurull', 'David Esiobu', 'Jude Fernandes', 'Jeremy Fu', 'Wenyin Fu', 'Brian Fuller', 'Cynthia Gao', 'Vedanuj Goswami', 'Naman Goyal', 'Anthony Hartshorn', 'Saghar Hosseini', 'Rui Hou', 'Hakan Inan', 'Marcin Kardas', 'Viktor Kerkez', 'Madian Khabsa', 'Isabel Kloumann', 'Artem Korenev', 'Punit Singh Koura', 'Marie-Anne Lachaux', 'Thibaut Lavril', 'Jenya Lee', 'Diana Liskovich', 'Yinghai Lu', 'Yuning Mao', 'Xavier Martinet', 'Todor Mihaylov', 'Pushkar Mishra', 'Igor Molybog', 'Yixin Nie', 'Andrew Poulton', 'Jeremy Reizenstein', 'Rashi Rungta', 'Kalyan Saladi', 'Alan Schelten', 'Ruan Silva', 'Eric Michael Smith', 'Ranjan Subramanian', 'Xiaoqing Ellen Tan', 'Binh Tang', 'Ross Taylor', 'Adina Williams', 'Jian Xiang Kuan', 'Puxin Xu', 'Zheng Yan', 'Iliyan Zarov', 'Yuchen Zhang', 'Angela Fan', 'Melanie Kambadur', 'Sharan Narang', 'Aurelien Rodriguez', 'Robert Stojnic', 'Sergey Edunov', 'Thomas Scialom'],
    year: 2023,
    arxiv: '2307.09288',
    url: 'https://arxiv.org/abs/2307.09288',
    type: 'paper',
  },
  // siglip-2023: domain pass 2026-10-06, from drafts/manipulation/vla-models.citations.ts.
  // Source pack pack-manipulation-4.md#10 for manipulation/vla-models.
  {
    id: 'siglip-2023',
    title: 'Sigmoid Loss for Language Image Pre-Training',
    authors: ['Xiaohua Zhai', 'Basil Mustafa', 'Alexander Kolesnikov', 'Lucas Beyer'],
    year: 2023,
    venue: 'ICCV 2023',
    arxiv: '2303.15343',
    url: 'https://arxiv.org/abs/2303.15343',
    type: 'paper',
  },
  // smolvla-2025: domain pass 2026-10-06, from drafts/data-hardware/robot-learning-stack.citations.ts; also drafts/manipulation/comparison-matrix.citations.ts, drafts/manipulation/realtime-execution.citations.ts, drafts/manipulation/robot-learning-roadmap.citations.ts, drafts/manipulation/vla-models.citations.ts.
  {
    id: 'smolvla-2025',
    title: 'SmolVLA: A Vision-Language-Action Model for Affordable and Efficient Robotics',
    authors: ['Mustafa Shukor', 'Dana Aubakirova', 'Francesco Capuano', 'Pepijn Kooijmans', 'Steven Palma', 'Adil Zouitine', 'Michel Aractingi', 'Caroline Pascal', 'Martino Russi', 'Andres Marafioti', 'Simon Alibert', 'Matthieu Cord', 'Thomas Wolf', 'Remi Cadene'],
    year: 2025,
    arxiv: '2506.01844',
    url: 'https://arxiv.org/abs/2506.01844',
    type: 'paper',
  },
  // cogact-2024: domain pass 2026-10-06, from drafts/manipulation/vla-models.citations.ts.
  // Source pack pack-manipulation-4.md#18 for manipulation/vla-models.
  {
    id: 'cogact-2024',
    title: 'CogACT: A Foundational Vision-Language-Action Model for Synergizing Cognition and Action in Robotic Manipulation',
    authors: ['Qixiu Li', 'Yaobo Liang', 'Zeyu Wang', 'Lin Luo', 'Xi Chen', 'Mozheng Liao', 'Fangyun Wei', 'Yu Deng', 'Sicheng Xu', 'Yizhong Zhang', 'Xiaofan Wang', 'Bei Liu', 'Jianlong Fu', 'Jianmin Bao', 'Dong Chen', 'Yuanchun Shi', 'Jiaolong Yang', 'Baining Guo'],
    year: 2024,
    arxiv: '2411.19650',
    url: 'https://arxiv.org/abs/2411.19650',
    type: 'paper',
  },
  // pd-vla-2025: domain pass 2026-10-06, from drafts/manipulation/realtime-execution.citations.ts; also drafts/manipulation/vla-models.citations.ts.
  // Source pack pack-manipulation-3.md#28 for manipulation/realtime-execution.
  {
    id: 'pd-vla-2025',
    title: 'PD-VLA: Accelerating Vision-Language-Action Model Integrated with Action Chunking via Parallel Decoding',
    authors: ['Wenxuan Song', 'Jiayi Chen', 'Pengxiang Ding', 'Han Zhao', 'Wei Zhao', 'Zhide Zhong', 'Zongyuan Ge', 'Zhijun Li', 'Donglin Wang', 'Jun Ma', 'Lujia Wang', 'Haoang Li'],
    year: 2025,
    venue: 'IROS 2025',
    arxiv: '2503.02310',
    url: 'https://arxiv.org/abs/2503.02310',
    type: 'paper',
  },
  // robot-learning-tutorial-2025: domain pass 2026-10-06, from drafts/manipulation/robot-learning-roadmap.citations.ts.
  // Source pack pack-manipulation-4.md#1 for manipulation/robot-learning-roadmap.
  {
    id: 'robot-learning-tutorial-2025',
    title: 'Robot Learning: A Tutorial',
    authors: ['Francesco Capuano', 'Caroline Pascal', 'Adil Zouitine', 'Thomas Wolf', 'Michel Aractingi'],
    year: 2025,
    arxiv: '2510.12403',
    url: 'https://arxiv.org/abs/2510.12403',
    type: 'paper',
  },
  // tedrake-manipulation-2026: domain pass 2026-10-06, from drafts/manipulation/robot-learning-roadmap.citations.ts.
  // Source pack pack-manipulation-4.md#3 for manipulation/robot-learning-roadmap; Chapter 3, Basic
  // Pick and Place, fetched 2026-10-04: "This is one area where careful notation can yield
  // dividends, and sloppy notation will inevitably lead to confusion and bugs." Page byline (c) Russ
  // Tedrake, 2020-2026; working notes updated through the Fall 2026 semester.
  {
    id: 'tedrake-manipulation-2026',
    title: 'Robotic Manipulation: Perception, Planning, and Control',
    authors: ['Russ Tedrake'],
    year: 2026,
    accessedOn: '2026-10-04',
    venue: 'MIT course notes',
    url: 'https://manipulation.csail.mit.edu/pick.html',
    type: 'docs',
  },
  // kalibr-2013: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts; also drafts/classical/state-estimation.citations.ts, drafts/data-hardware/robot-learning-stack.citations.ts, drafts/manipulation/robot-learning-roadmap.citations.ts.
  {
    id: 'kalibr-2013',
    title: 'Unified temporal and spatial calibration for multi-sensor systems',
    authors: ['Paul Furgale', 'Joern Rehder', 'Roland Siegwart'],
    year: 2013,
    venue: '2013 IEEE/RSJ International Conference on Intelligent Robots and Systems',
    url: 'https://doi.org/10.1109/IROS.2013.6696514',
    type: 'paper',
  },
  // rlds-2021: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts; also drafts/data-hardware/robot-learning-stack.citations.ts, drafts/manipulation/robot-learning-roadmap.citations.ts.
  {
    id: 'rlds-2021',
    title: 'RLDS: an Ecosystem to Generate, Share and Use Datasets in Reinforcement Learning',
    authors: ['Sabela Ramos', 'Sertan Girgin', 'Léonard Hussenot', 'Damien Vincent', 'Hanna Yakubovich', 'Daniel Toyama', 'Anita Gergely', 'Piotr Stanczyk', 'Raphael Marinier', 'Jeremiah Harmsen', 'Olivier Pietquin', 'Nikola Momchev'],
    year: 2021,
    arxiv: '2111.02767',
    url: 'https://arxiv.org/abs/2111.02767',
    type: 'paper',
  },
  // lerobot-paper-2026: domain pass 2026-10-06, from drafts/data-hardware/robot-learning-stack.citations.ts; also drafts/manipulation/robot-learning-roadmap.citations.ts.
  // LeRobot library paper. Abstract read 2026-10-04: integrates "across the entire robot learning
  // stack" and describes "a generalized asynchronous inference stack".
  {
    id: 'lerobot-paper-2026',
    title: 'LeRobot: An Open-Source Library for End-to-End Robot Learning',
    authors: ['Remi Cadene', 'Simon Aliberts', 'Francesco Capuano', 'Michel Aractingi', 'Adil Zouitine', 'Pepijn Kooijmans', 'Jade Choghari', 'Martino Russi', 'Caroline Pascal', 'Steven Palma', 'Mustafa Shukor', 'Jess Moss', 'Alexander Soare', 'Dana Aubakirova', 'Quentin Lhoest', 'Quentin Gallouédec', 'Thomas Wolf'],
    year: 2026,
    arxiv: '2602.22818',
    url: 'https://arxiv.org/abs/2602.22818',
    type: 'paper',
  },
  // kress-gazit-evaluation-2024: domain pass 2026-10-06, from drafts/data-hardware/robot-learning-stack.citations.ts; also drafts/frontier/reliability-gap.citations.ts, drafts/manipulation/robot-learning-roadmap.citations.ts.
  {
    id: 'kress-gazit-evaluation-2024',
    title: 'Robot Learning as an Empirical Science: Best Practices for Policy Evaluation',
    authors: ['Hadas Kress-Gazit', 'Kunimatsu Hashimoto', 'Naveen Kuppuswamy', 'Paarth Shah', 'Phoebe Horgan', 'Gordon Richardson', 'Siyuan Feng', 'Benjamin Burchfiel'],
    year: 2024,
    arxiv: '2409.09491',
    url: 'https://arxiv.org/abs/2409.09491',
    type: 'paper',
  },
  // ros2-science-robotics-2022: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts; also drafts/data-hardware/robot-learning-stack.citations.ts.
  // Crossref 10.1126/scirobotics.abm6074 read 2026-10-04: Science Robotics 7(66), published
  // 2022-05-25.
  {
    id: 'ros2-science-robotics-2022',
    title: 'Robot Operating System 2: Design, architecture, and uses in the wild',
    authors: ['Steven Macenski', 'Tully Foote', 'Brian Gerkey', 'Chris Lalancette', 'William Woodall'],
    year: 2022,
    venue: 'Science Robotics 7(66)',
    url: 'https://doi.org/10.1126/scirobotics.abm6074',
    type: 'paper',
  },
  // serl-2024: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts; also drafts/manipulation/robot-learning-roadmap.citations.ts, drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // Source pack pack-manipulation-4.md#17 for manipulation/rl-finetuning; same source and id also
  // proposed in drafts/manipulation/robot-learning-roadmap.citations.ts; register once.
  {
    id: 'serl-2024',
    title: 'SERL: A Software Suite for Sample-Efficient Robotic Reinforcement Learning',
    authors: ['Jianlan Luo', 'Zheyuan Hu', 'Charles Xu', 'You Liang Tan', 'Jacob Berg', 'Archit Sharma', 'Stefan Schaal', 'Chelsea Finn', 'Abhishek Gupta', 'Sergey Levine'],
    year: 2024,
    venue: 'ICRA 2024',
    arxiv: '2401.16013',
    url: 'https://arxiv.org/abs/2401.16013',
    type: 'paper',
  },
  // lai-action-chunking-2022: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts.
  // Source pack pack-manipulation-1.md#1 for manipulation/action-chunking; PsyArXiv preprint; title,
  // authors and 2022 from Crossref; abstract read via the OSF API on 2026-10-04: "The action
  // sequence can become a ``chunk'' when individual actions are grouped together and executed as one
  // unit, making them more efficient to store and execute.".
  {
    id: 'lai-action-chunking-2022',
    title: 'Action chunking as conditional policy compression',
    authors: ['Lucy Lai', 'Ann Zixiang Huang', 'Samuel J. Gershman'],
    year: 2022,
    venue: 'PsyArXiv',
    url: 'https://doi.org/10.31234/osf.io/z8yrv',
    type: 'paper',
  },
  // dehp-2026: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts.
  // Source pack pack-manipulation-1.md#14 for manipulation/action-chunking.
  {
    id: 'dehp-2026',
    title: 'Dynamic Execution Horizon Prediction for Chunk-based Robot Policies',
    authors: ['Yuchi Zhao', 'Miroslav Bogdanovic', 'Arjun Sohal', 'Liyu Tao', 'Kourosh Darvish', 'Alán Aspuru-Guzik', 'Florian Shkurti', 'Animesh Garg'],
    year: 2026,
    arxiv: '2606.11408',
    url: 'https://arxiv.org/abs/2606.11408',
    type: 'paper',
  },
  // simchowitz-continuous-il-2025: domain pass 2026-10-06, from drafts/frontier/reliability-gap.citations.ts; also drafts/manipulation/action-chunking.citations.ts, drafts/manipulation/bc-foundations.citations.ts.
  // arXiv API check 2026-10-04: first submitted 2025-03-12, 3 authors.
  {
    id: 'simchowitz-continuous-il-2025',
    title: 'The Pitfalls of Imitation Learning when Actions are Continuous',
    authors: ['Max Simchowitz', 'Daniel Pfrommer', 'Ali Jadbabaie'],
    year: 2025,
    arxiv: '2503.09722',
    url: 'https://arxiv.org/abs/2503.09722',
    type: 'paper',
  },
  // zhang-chunking-exploration-2025: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts; also drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#8 for manipulation/action-chunking; same source and id also
  // proposed in drafts/manipulation/bc-foundations.citations.ts; register once.
  {
    id: 'zhang-chunking-exploration-2025',
    title: 'Action Chunking and Exploratory Data Collection Yield Exponential Improvements in Behavior Cloning for Continuous Control',
    authors: ['Thomas T. Zhang', 'Daniel Pfrommer', 'Chaoyi Pan', 'Nikolai Matni', 'Max Simchowitz'],
    year: 2025,
    arxiv: '2507.09061',
    url: 'https://arxiv.org/abs/2507.09061',
    type: 'paper',
  },
  // autohorizon-2026: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts.
  // Source pack pack-manipulation-1.md#12 for manipulation/action-chunking.
  {
    id: 'autohorizon-2026',
    title: 'VLA Knows Its Limits: Adaptive Execution Horizons for Robot Policies',
    authors: ['Haoxuan Wang', 'Gengyu Zhang', 'Yan Yan', 'Ramana Rao Kompella', 'Gaowen Liu'],
    year: 2026,
    arxiv: '2602.21445',
    url: 'https://arxiv.org/abs/2602.21445',
    type: 'paper',
  },
  // pace-2026: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts.
  // Source pack pack-manipulation-1.md#13 for manipulation/action-chunking.
  {
    id: 'pace-2026',
    title: 'PACE: Phase-Aware Chunk Execution for Robot Policies with Action Chunking',
    authors: ['Junnan Nie', 'Jiayi Li', 'Chenghao Liu', 'Junyi Lao', 'Jiachen Zhang', 'Tianle Zhang', 'Liang Lin', 'Songfang Huang'],
    year: 2026,
    arxiv: '2606.00537',
    url: 'https://arxiv.org/abs/2606.00537',
    type: 'paper',
  },
  // moh-2025: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts.
  // Source pack pack-manipulation-1.md#11 for manipulation/action-chunking.
  {
    id: 'moh-2025',
    title: 'Mixture of Horizons in Action Chunking',
    authors: ['Dong Jing', 'Gang Wang', 'Jiaqi Liu', 'Weiliang Tang', 'Zelong Sun', 'Yunchao Yao', 'Zhenyu Wei', 'Yunhui Liu', 'Zhiwu Lu', 'Mingyu Ding'],
    year: 2025,
    arxiv: '2511.19433',
    url: 'https://arxiv.org/abs/2511.19433',
    type: 'paper',
  },
  // lerobot-rtc-docs: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts.
  // Source pack pack-manipulation-1.md#20 for manipulation/action-chunking; LeRobot docs page, no
  // publication date printed; read 2026-10-04: "Real-Time Chunking (RTC) is an inference-time method
  // that allows large, flow-matching based robotic policies, such as Pi0, Pi0.5, and SmolVLA, to
  // produce smooth, continuous, and reactive motion despite having high inference latency.".
  {
    id: 'lerobot-rtc-docs',
    title: 'Real-Time Chunking (RTC)',
    authors: ['Hugging Face'],
    year: 'n.d.',
    accessedOn: '2026-10-04',
    venue: 'LeRobot documentation',
    url: 'https://huggingface.co/docs/lerobot/en/rtc',
    type: 'docs',
  },
  // a2c2-2025: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts; also drafts/manipulation/realtime-execution.citations.ts.
  // Source pack pack-manipulation-1.md#16 for manipulation/action-chunking; same source and id also
  // proposed in drafts/manipulation/realtime-execution.citations.ts; register once.
  {
    id: 'a2c2-2025',
    title: 'Leave No Observation Behind: Real-time Correction for VLA Action Chunks',
    authors: ['Kohei Sendai', 'Maxime Alvarez', 'Tatsuya Matsushima', 'Yutaka Matsuo', 'Yusuke Iwasawa'],
    year: 2025,
    arxiv: '2509.23224',
    url: 'https://arxiv.org/abs/2509.23224',
    type: 'paper',
  },
  // remac-2026: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts.
  // Source pack pack-manipulation-1.md#17 for manipulation/action-chunking.
  {
    id: 'remac-2026',
    title: 'Real-Time Robot Execution with Masked Action Chunking',
    authors: ['Haoxuan Wang', 'Gengyu Zhang', 'Yan Yan', 'Yuzhang Shang', 'Ramana Rao Kompella', 'Gaowen Liu'],
    year: 2026,
    arxiv: '2601.20130',
    url: 'https://arxiv.org/abs/2601.20130',
    type: 'paper',
  },
  // q-chunking-2025: domain pass 2026-10-06, from drafts/manipulation/action-chunking.citations.ts.
  // Source pack pack-manipulation-1.md#27 for manipulation/action-chunking.
  {
    id: 'q-chunking-2025',
    title: 'Reinforcement Learning with Action Chunking',
    authors: ['Qiyang Li', 'Zhiyuan Zhou', 'Sergey Levine'],
    year: 2025,
    arxiv: '2507.07969',
    url: 'https://arxiv.org/abs/2507.07969',
    type: 'paper',
  },
  // ross-bagnell-2010: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#1 for manipulation/bc-foundations.
  {
    id: 'ross-bagnell-2010',
    title: 'Efficient Reductions for Imitation Learning',
    authors: ['Stéphane Ross', 'J. Andrew Bagnell'],
    year: 2010,
    venue: 'AISTATS 2010 (PMLR vol. 9)',
    url: 'https://proceedings.mlr.press/v9/ross10a.html',
    type: 'paper',
  },
  // pomerleau-1991: domain pass 2026-10-06, from drafts/adjacent/autonomous-vehicles.citations.ts; also drafts/manipulation/bc-foundations.citations.ts.
  // Same id and fields as drafts/manipulation/bc-foundations.citations.ts (drop one copy when
  // merging). Crossref abstract (read 2026-10-04): "ALVINN is a backpropagation network designed to
  // drive the CMU Navlab, a modified Chevy van"; "the training techniques that allow ALVINN to learn
  // in under 5 minutes to autonomously control the Navlab by watching the reactions of a human
  // driver".
  {
    id: 'pomerleau-1991',
    title: 'Efficient Training of Artificial Neural Networks for Autonomous Navigation',
    authors: ['Dean A. Pomerleau'],
    year: 1991,
    venue: 'Neural Computation 3(1)',
    url: 'https://doi.org/10.1162/neco.1991.3.1.88',
    type: 'paper',
  },
  // bojarski-e2e-driving-2016: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#3 for manipulation/bc-foundations.
  {
    id: 'bojarski-e2e-driving-2016',
    title: 'End to End Learning for Self-Driving Cars',
    authors: ['Mariusz Bojarski', 'Davide Del Testa', 'Daniel Dworakowski', 'Bernhard Firner', 'Beat Flepp', 'Prasoon Goyal', 'Lawrence D. Jackel', 'Mathew Monfort', 'Urs Muller', 'Jiakai Zhang', 'Xin Zhang', 'Jake Zhao', 'Karol Zieba'],
    year: 2016,
    arxiv: '1604.07316',
    url: 'https://arxiv.org/abs/1604.07316',
    type: 'paper',
  },
  // foster-bc-horizon-2024: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#9 for manipulation/bc-foundations.
  {
    id: 'foster-bc-horizon-2024',
    title: 'Is Behavior Cloning All You Need? Understanding Horizon in Imitation Learning',
    authors: ['Dylan J. Foster', 'Adam Block', 'Dipendra Misra'],
    year: 2024,
    arxiv: '2407.15007',
    url: 'https://arxiv.org/abs/2407.15007',
    type: 'paper',
  },
  // rajaraman-il-limits-2020: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#8 for manipulation/bc-foundations.
  {
    id: 'rajaraman-il-limits-2020',
    title: 'Toward the Fundamental Limits of Imitation Learning',
    authors: ['Nived Rajaraman', 'Lin F. Yang', 'Jiantao Jiao', 'Kannan Ramachandran'],
    year: 2020,
    arxiv: '2009.05990',
    url: 'https://arxiv.org/abs/2009.05990',
    type: 'paper',
  },
  // causal-confusion-2019: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#6 for manipulation/bc-foundations.
  {
    id: 'causal-confusion-2019',
    title: 'Causal Confusion in Imitation Learning',
    authors: ['Pim de Haan', 'Dinesh Jayaraman', 'Sergey Levine'],
    year: 2019,
    arxiv: '1905.11979',
    url: 'https://arxiv.org/abs/1905.11979',
    type: 'paper',
  },
  // copycat-bc-2020: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#7 for manipulation/bc-foundations.
  {
    id: 'copycat-bc-2020',
    title: 'Fighting Copycat Agents in Behavioral Cloning from Observation Histories',
    authors: ['Chuan Wen', 'Jierui Lin', 'Trevor Darrell', 'Dinesh Jayaraman', 'Yang Gao'],
    year: 2020,
    arxiv: '2010.14876',
    url: 'https://arxiv.org/abs/2010.14876',
    type: 'paper',
  },
  // butterfly-sgd-noise-2023: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#12 for manipulation/bc-foundations.
  {
    id: 'butterfly-sgd-noise-2023',
    title: 'Butterfly Effects of SGD Noise: Error Amplification in Behavior Cloning and Autoregression',
    authors: ['Adam Block', 'Dylan J. Foster', 'Akshay Krishnamurthy', 'Max Simchowitz', 'Cyril Zhang'],
    year: 2023,
    arxiv: '2310.11428',
    url: 'https://arxiv.org/abs/2310.11428',
    type: 'paper',
  },
  // dart-2017: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#4 for manipulation/bc-foundations.
  {
    id: 'dart-2017',
    title: 'DART: Noise Injection for Robust Imitation Learning',
    authors: ['Michael Laskey', 'Jonathan Lee', 'Roy Fox', 'Anca Dragan', 'Ken Goldberg'],
    year: 2017,
    arxiv: '1703.09327',
    url: 'https://arxiv.org/abs/1703.09327',
    type: 'paper',
  },
  // diffusion-meets-dagger-2024: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#22 for manipulation/bc-foundations.
  {
    id: 'diffusion-meets-dagger-2024',
    title: 'Diffusion Meets DAgger: Supercharging Eye-in-hand Imitation Learning',
    authors: ['Xiaoyu Zhang', 'Matthew Chang', 'Pranav Kumar', 'Saurabh Gupta'],
    year: 2024,
    arxiv: '2402.17768',
    url: 'https://arxiv.org/abs/2402.17768',
    type: 'paper',
  },
  // bc-z-2022: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#21 for manipulation/bc-foundations.
  {
    id: 'bc-z-2022',
    title: 'BC-Z: Zero-Shot Task Generalization with Robotic Imitation Learning',
    authors: ['Eric Jang', 'Alex Irpan', 'Mohi Khansari', 'Daniel Kappler', 'Frederik Ebert', 'Corey Lynch', 'Sergey Levine', 'Chelsea Finn'],
    year: 2022,
    arxiv: '2202.02005',
    url: 'https://arxiv.org/abs/2202.02005',
    type: 'paper',
  },
  // cr-dagger-2025: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#24 for manipulation/bc-foundations.
  {
    id: 'cr-dagger-2025',
    title: 'Compliant Residual DAgger: Improving Real-World Contact-Rich Manipulation with Human Corrections',
    authors: ['Xiaomeng Xu', 'Yifan Hou', 'Chendong Xin', 'Zeyi Liu', 'Shuran Song'],
    year: 2025,
    arxiv: '2506.16685',
    url: 'https://arxiv.org/abs/2506.16685',
    type: 'paper',
  },
  // sop-2026: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts; also drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-1.md#25 for manipulation/bc-foundations.
  {
    id: 'sop-2026',
    title: 'SOP: A Scalable Online Post-Training System for Vision-Language-Action Models',
    authors: ['Mingjie Pan', 'Siyuan Feng', 'Qinglin Zhang', 'Xinchen Li', 'Jianheng Song', 'Chendi Qu', 'Yi Wang', 'Chuankang Li', 'Ziyu Xiong', 'Zhi Chen', 'Yi Liu', 'Jianlan Luo'],
    year: 2026,
    arxiv: '2601.03044',
    url: 'https://arxiv.org/abs/2601.03044',
    type: 'paper',
  },
  // rac-2025: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#23 for manipulation/bc-foundations.
  {
    id: 'rac-2025',
    title: 'RaC: Robot Learning for Long-Horizon Tasks by Scaling Recovery and Correction',
    authors: ['Zheyuan Hu', 'Robyn Wu', 'Naveen Enock', 'Jasmine Li', 'Riya Kadakia', 'Zackory Erickson', 'Aviral Kumar'],
    year: 2025,
    arxiv: '2509.07953',
    url: 'https://arxiv.org/abs/2509.07953',
    type: 'paper',
  },
  // block-generative-bc-2023: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#13 for manipulation/bc-foundations.
  {
    id: 'block-generative-bc-2023',
    title: 'Provable Guarantees for Generative Behavior Cloning: Bridging Low-Level Stability and High-Level Behavior',
    authors: ['Adam Block', 'Ali Jadbabaie', 'Daniel Pfrommer', 'Max Simchowitz', 'Russ Tedrake'],
    year: 2023,
    arxiv: '2307.14619',
    url: 'https://arxiv.org/abs/2307.14619',
    type: 'paper',
  },
  // gail-2016: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#15 for manipulation/bc-foundations.
  {
    id: 'gail-2016',
    title: 'Generative Adversarial Imitation Learning',
    authors: ['Jonathan Ho', 'Stefano Ermon'],
    year: 2016,
    arxiv: '1606.03476',
    url: 'https://arxiv.org/abs/1606.03476',
    type: 'paper',
  },
  // darp-2026: domain pass 2026-10-06, from drafts/manipulation/bc-foundations.citations.ts.
  // Source pack pack-manipulation-1.md#28 for manipulation/bc-foundations.
  {
    id: 'darp-2026',
    title: 'Difference-Aware Retrieval Policies for Imitation Learning',
    authors: ['Quinn Pfeifer', 'Ethan Pronovost', 'Paarth Shah', 'Khimya Khetarpal', 'Siddhartha Srinivasa', 'Abhishek Gupta'],
    year: 2026,
    arxiv: '2606.09758',
    url: 'https://arxiv.org/abs/2606.09758',
    type: 'paper',
  },
  // kumar-finetuning-distorts-2022: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#3 for manipulation/knowledge-insulation.
  {
    id: 'kumar-finetuning-distorts-2022',
    title: 'Fine-Tuning can Distort Pretrained Features and Underperform Out-of-Distribution',
    authors: ['Ananya Kumar', 'Aditi Raghunathan', 'Robbie Jones', 'Tengyu Ma', 'Percy Liang'],
    year: 2022,
    venue: 'ICLR 2022',
    arxiv: '2202.10054',
    url: 'https://arxiv.org/abs/2202.10054',
    type: 'paper',
  },
  // chatvla-2025: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#16 for manipulation/knowledge-insulation.
  {
    id: 'chatvla-2025',
    title: 'ChatVLA: Unified Multimodal Understanding and Robot Control with Vision-Language-Action Model',
    authors: ['Zhongyi Zhou', 'Yichen Zhu', 'Minjie Zhu', 'Junjie Wen', 'Ning Liu', 'Zhiyuan Xu', 'Weibin Meng', 'Ran Cheng', 'Yaxin Peng', 'Chaomin Shen', 'Feifei Feng'],
    year: 2025,
    arxiv: '2502.14420',
    url: 'https://arxiv.org/abs/2502.14420',
    type: 'paper',
  },
  // instructvla-2025: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#19 for manipulation/knowledge-insulation.
  {
    id: 'instructvla-2025',
    title: 'InstructVLA: Vision-Language-Action Instruction Tuning from Understanding to Manipulation',
    authors: ['Shuai Yang', 'Hao Li', 'Bin Wang', 'Yilun Chen', 'Yang Tian', 'Tai Wang', 'Hanqing Wang', 'Feng Zhao', 'Yiyi Liao', 'Jiangmiao Pang'],
    year: 2025,
    arxiv: '2507.17520',
    url: 'https://arxiv.org/abs/2507.17520',
    type: 'paper',
  },
  // vla-continual-forgetting-2026: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#27 for manipulation/knowledge-insulation.
  {
    id: 'vla-continual-forgetting-2026',
    title: 'Pretrained Vision-Language-Action Models are Surprisingly Resistant to Forgetting in Continual Learning',
    authors: ['Huihan Liu', 'Changyeon Kim', 'Bo Liu', 'Minghuan Liu', 'Yuke Zhu'],
    year: 2026,
    arxiv: '2603.03818',
    url: 'https://arxiv.org/abs/2603.03818',
    type: 'paper',
  },
  // paligemma-2024: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts; also drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#9 for manipulation/knowledge-insulation.
  {
    id: 'paligemma-2024',
    title: 'PaliGemma: A versatile 3B VLM for transfer',
    authors: ['Lucas Beyer', 'Andreas Steiner', 'André Susano Pinto', 'Alexander Kolesnikov', 'Xiao Wang', 'Daniel Salz', 'Maxim Neumann', 'Ibrahim Alabdulmohsin', 'Michael Tschannen', 'Emanuele Bugliarello', 'Thomas Unterthiner', 'Daniel Keysers', 'Skanda Koppula', 'Fangyu Liu', 'Adam Grycner', 'Alexey Gritsenko', 'Neil Houlsby', 'Manoj Kumar', 'Keran Rong', 'Julian Eisenschlos', 'Rishabh Kabra', 'Matthias Bauer', 'Matko Bošnjak', 'Xi Chen', 'Matthias Minderer', 'Paul Voigtlaender', 'Ioana Bica', 'Ivana Balazevic', 'Joan Puigcerver', 'Pinelopi Papalampidi', 'Olivier Henaff', 'Xi Xiong', 'Radu Soricut', 'Jeremiah Harmsen', 'Xiaohua Zhai'],
    year: 2024,
    arxiv: '2407.07726',
    url: 'https://arxiv.org/abs/2407.07726',
    type: 'paper',
  },
  // gr00t-n1-5-2025: domain pass 2026-10-06, from drafts/manipulation/generalist-policies.citations.ts; also drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-2.md#8 for manipulation/generalist-policies; same source and id
  // also proposed in drafts/manipulation/knowledge-insulation.citations.ts; register once. Fix
  // 2026-10-04: metadata aligned with the page byline / the other drafts carrying this id (see
  // verify/manipulation/).
  {
    id: 'gr00t-n1-5-2025',
    title: 'GR00T N1.5: An Improved Open Foundation Model for Generalist Humanoid Robots',
    authors: ['Johan Bjorck', 'Valts Blukis', 'Fernando Castañeda', 'Nikita Cherniadev', 'Xingye Da', 'Runyu Ding', 'Linxi "Jim" Fan', 'Yu Fang', 'Dieter Fox', 'Fengyuan Hu', 'Spencer Huang', 'Joel Jang', 'Xiaowei Jiang', 'Kaushil Kundalia', 'Jan Kautz', 'Zhiqi Li', 'Kevin Lin', 'Zongyu Lin', 'Loic Magne', 'Yunze Man', 'Ajay Mandlekar', 'Avnish Narayan', 'Soroush Nasiriany', 'Scott Reed', 'You Liang Tan', 'Guanzhi Wang', 'Jing Wang', 'Qi Wang', 'Shihao Wang', 'Jiannan Xiang', 'Yuqi Xie', 'Yinzhen Xu', 'Seonghyeon Ye', 'Zhiding Yu', 'Yizhou Zhao', 'Zhe Zhang', 'Ruijie Zheng', 'Yuke Zhu'],
    year: 2025,
    url: 'https://research.nvidia.com/labs/gear/gr00t-n1_5/',
    type: 'blog',
  },
  // blip2-2023: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#5 for manipulation/knowledge-insulation.
  {
    id: 'blip2-2023',
    title: 'BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models',
    authors: ['Junnan Li', 'Dongxu Li', 'Silvio Savarese', 'Steven Hoi'],
    year: 2023,
    arxiv: '2301.12597',
    url: 'https://arxiv.org/abs/2301.12597',
    type: 'paper',
  },
  // vlm2vla-2025: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#18 for manipulation/knowledge-insulation.
  {
    id: 'vlm2vla-2025',
    title: 'Actions as Language: Fine-Tuning VLMs into VLAs Without Catastrophic Forgetting',
    authors: ['Asher J. Hancock', 'Xindi Wu', 'Lihan Zha', 'Olga Russakovsky', 'Anirudha Majumdar'],
    year: 2025,
    arxiv: '2509.22195',
    url: 'https://arxiv.org/abs/2509.22195',
    type: 'paper',
  },
  // uam-forgetting-2026: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#25 for manipulation/knowledge-insulation.
  {
    id: 'uam-forgetting-2026',
    title: 'UAM: A Dual-Stream Perspective on Forgetting in VLA Training',
    authors: ['Jianke Zhang', 'Yuanfei Luo', 'Yucheng Hu', 'Xiaoyu Chen', 'Yanjiang Guo', 'Ziyang Liu', 'Hongbin Xu', 'Tian Lan', 'Jianyu Chen'],
    year: 2026,
    arxiv: '2605.15735',
    url: 'https://arxiv.org/abs/2605.15735',
    type: 'paper',
  },
  // hybridvla-2025: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#17 for manipulation/knowledge-insulation.
  {
    id: 'hybridvla-2025',
    title: 'HybridVLA: Collaborative Diffusion and Autoregression in a Unified Vision-Language-Action Model',
    authors: ['Jiaming Liu', 'Hao Chen', 'Pengju An', 'Zhuoyang Liu', 'Renrui Zhang', 'Chenyang Gu', 'Xiaoqi Li', 'Ziyu Guo', 'Sixiang Chen', 'Mengzhen Liu', 'Chengkai Hou', 'Mengdi Zhao', 'KC alex Zhou', 'Pheng-Ann Heng', 'Shanghang Zhang'],
    year: 2025,
    arxiv: '2503.10631',
    url: 'https://arxiv.org/abs/2503.10631',
    type: 'paper',
  },
  // apt-action-expert-pretraining-2026: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#23 for manipulation/knowledge-insulation.
  {
    id: 'apt-action-expert-pretraining-2026',
    title: 'APT: Action Expert Pretraining Improves Instruction Generalization of Vision-Language-Action Policies',
    authors: ['Kechun Xu', 'Zhenjie Zhu', 'Anzhe Chen', 'Rong Xiong', 'Yue Wang'],
    year: 2026,
    arxiv: '2606.12366',
    url: 'https://arxiv.org/abs/2606.12366',
    type: 'paper',
  },
  // anchor-align-2026: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#24 for manipulation/knowledge-insulation.
  {
    id: 'anchor-align-2026',
    title: 'Generalizable VLA Finetuning via Representation Anchoring and Language-Action Alignment',
    authors: ['Dwip Dalal', 'Shivansh Patel', 'Chahit Jain', 'Jeonghwan Kim', 'Utkarsh Mishra', 'Yuchen Song', 'Alex Baratian', 'Hyeonjeong Ha', 'Heng Ji', 'Svetlana Lazebnik', 'Unnat Jain'],
    year: 2026,
    arxiv: '2607.13429',
    url: 'https://arxiv.org/abs/2607.13429',
    type: 'paper',
  },
  // garg-self-demonstrated-control-2026: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts; also drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#26 for manipulation/knowledge-insulation.
  {
    id: 'garg-self-demonstrated-control-2026',
    title: 'Fine-Tuning VLAs with Self-Demonstrated Generative Control for Multi-Task Manipulation',
    authors: ['Prachi Garg', 'Steve Xing', 'Prahit Yaugand', 'Saurabh Gupta', 'Derek Hoiem'],
    year: 2026,
    arxiv: '2608.19490',
    url: 'https://arxiv.org/abs/2608.19490',
    type: 'paper',
  },
  // act2answer-2026: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#28 for manipulation/knowledge-insulation.
  {
    id: 'act2answer-2026',
    title: 'Does VLA Even Know the Basics? Measuring Commonsense and World Knowledge Retention in Vision-Language-Action Models',
    authors: ['Nikita Kachaev', 'Andrey Moskalenko', 'Matvey Skripkin', 'Nikita Kurlaev', 'Daria Pugacheva', 'Albina Burlova', 'Mikhail Kolosov', 'Denis Shepelev', 'Andrey Kuznetsov', 'Elena Tutubalina', 'Aleksandr I. Panov', 'Alexey K. Kovalev', 'Vlad Shakhuro'],
    year: 2026,
    arxiv: '2606.19297',
    url: 'https://arxiv.org/abs/2606.19297',
    type: 'paper',
  },
  // lap-2026: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts; also drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-2.md#10 for manipulation/cross-embodiment; same source and id also
  // proposed in drafts/manipulation/knowledge-insulation.citations.ts; register once.
  {
    id: 'lap-2026',
    title: 'LAP: Language-Action Pre-Training Enables Zero-shot Cross-Embodiment Transfer',
    authors: ['Lihan Zha', 'Asher J. Hancock', 'Mingtong Zhang', 'Tenny Yin', 'Yixuan Huang', 'Dhruv Shah', 'Allen Z. Ren', 'Anirudha Majumdar'],
    year: 2026,
    arxiv: '2602.10556',
    url: 'https://arxiv.org/abs/2602.10556',
    type: 'paper',
  },
  // labvla-2026: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#21 for manipulation/knowledge-insulation.
  {
    id: 'labvla-2026',
    title: 'LabVLA: Grounding Vision-Language-Action Models in Scientific Laboratories',
    authors: ['Baochang Ren', 'Xinjie Liu', 'Xi Chen', 'Yanshuo Liu', 'Chenxi Li', 'Daqi Gao', 'Zeqin Su', 'Jintao Xing', 'Zirui Xue', 'Rui Li', 'Xiangyu Zhao', 'Shuofei Qiao', 'Minting Pan', 'Wangmeng Zuo', 'Lei Bai', 'Dongzhan Zhou', 'Ningyu Zhang', 'Huajun Chen'],
    year: 2026,
    arxiv: '2606.13578',
    url: 'https://arxiv.org/abs/2606.13578',
    type: 'paper',
  },
  // stulp-full-stack-transfer-2026: domain pass 2026-10-06, from drafts/manipulation/knowledge-insulation.citations.ts.
  // Source pack pack-manipulation-3.md#22 for manipulation/knowledge-insulation.
  {
    id: 'stulp-full-stack-transfer-2026',
    title: 'Are Foundation Models the Route to Full-Stack Transfer in Robotics?',
    authors: ['Freek Stulp', 'Samuel Bustamante', 'João Silvério', 'Alin Albu-Schäffer', 'Jeannette Bohg', 'Shuran Song'],
    year: 2026,
    arxiv: '2602.22001',
    url: 'https://arxiv.org/abs/2602.22001',
    type: 'paper',
  },
  // crossformer-2024: domain pass 2026-10-06, from drafts/data-hardware/datasets.citations.ts; also drafts/manipulation/comparison-matrix.citations.ts, drafts/manipulation/cross-embodiment.citations.ts.
  {
    id: 'crossformer-2024',
    title: 'Scaling Cross-Embodied Learning: One Policy for Manipulation, Navigation, Locomotion and Aviation',
    authors: ['Ria Doshi', 'Homer Walke', 'Oier Mees', 'Sudeep Dasari', 'Sergey Levine'],
    year: 2024,
    arxiv: '2408.11812',
    url: 'https://arxiv.org/abs/2408.11812',
    type: 'paper',
  },
  // hpt-2024: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#2 for manipulation/cross-embodiment.
  {
    id: 'hpt-2024',
    title: 'Scaling Proprioceptive-Visual Learning with Heterogeneous Pre-trained Transformers',
    authors: ['Lirui Wang', 'Xinlei Chen', 'Jialiang Zhao', 'Kaiming He'],
    year: 2024,
    venue: 'NeurIPS 2024',
    arxiv: '2409.20537',
    url: 'https://arxiv.org/abs/2409.20537',
    type: 'paper',
  },
  // x-vla-2025: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#9 for manipulation/cross-embodiment.
  {
    id: 'x-vla-2025',
    title: 'X-VLA: Soft-Prompted Transformer as Scalable Cross-Embodiment Vision-Language-Action Model',
    authors: ['Jinliang Zheng', 'Jianxiong Li', 'Zhihao Wang', 'Dongxiu Liu', 'Xirui Kang', 'Yuchun Feng', 'Yinan Zheng', 'Jiayin Zou', 'Yilun Chen', 'Jia Zeng', 'Ya-Qin Zhang', 'Jiangmiao Pang', 'Jingjing Liu', 'Tai Wang', 'Xianyuan Zhan'],
    year: 2025,
    arxiv: '2510.10274',
    url: 'https://arxiv.org/abs/2510.10274',
    type: 'paper',
  },
  // gemini-robotics-15-blog-2025: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts; also drafts/manipulation/generalist-policies.citations.ts.
  // Source pack pack-manipulation-2.md#14 for manipulation/cross-embodiment; Launch post;
  // datePublished 2025-09-25, author Carolina Parada (read 2026-10-04): "tasks only presented to the
  // ALOHA 2 robot during training, also just work on the Apptronik's humanoid robot, Apollo, and the
  // bi-arm Franka robot, and vice versa".
  {
    id: 'gemini-robotics-15-blog-2025',
    title: 'Gemini Robotics 1.5 brings AI agents into the physical world',
    authors: ['Carolina Parada'],
    year: 2025,
    venue: 'Google DeepMind blog',
    url: 'https://deepmind.google/blog/gemini-robotics-15-brings-ai-agents-into-the-physical-world/',
    type: 'blog',
  },
  // gemini-robotics-on-device-2025: domain pass 2026-10-06, from drafts/manipulation/comparison-matrix.citations.ts; also drafts/manipulation/cross-embodiment.citations.ts, drafts/manipulation/generalist-policies.citations.ts.
  // Source pack pack-manipulation-1.md#6 for manipulation/comparison-matrix; Launch post;
  // datePublished 2025-06-24, author Carolina Parada (the pack lists the byline as Google DeepMind)
  // (read 2026-10-04): "Developers can access the SDK by signing up to our trusted tester program.";
  // same source and id also proposed in drafts/manipulation/cross-embodiment.citations.ts,
  // drafts/manipulation/generalist-policies.citations.ts; register once.
  {
    id: 'gemini-robotics-on-device-2025',
    title: 'Gemini Robotics On-Device brings AI to local robotic devices',
    authors: ['Carolina Parada'],
    year: 2025,
    venue: 'Google DeepMind blog',
    url: 'https://deepmind.google/blog/gemini-robotics-on-device-brings-ai-to-local-robotic-devices/',
    type: 'blog',
  },
  // mirage-2024: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#16 for manipulation/cross-embodiment.
  {
    id: 'mirage-2024',
    title: 'Mirage: Cross-Embodiment Zero-Shot Policy Transfer with Cross-Painting',
    authors: ['Lawrence Yunliang Chen', 'Kush Hari', 'Karthik Dharmarajan', 'Chenfeng Xu', 'Quan Vuong', 'Ken Goldberg'],
    year: 2024,
    venue: 'RSS 2024',
    arxiv: '2402.19249',
    url: 'https://arxiv.org/abs/2402.19249',
    type: 'paper',
  },
  // rovi-aug-2024: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#17 for manipulation/cross-embodiment; oral.
  {
    id: 'rovi-aug-2024',
    title: 'RoVi-Aug: Robot and Viewpoint Augmentation for Cross-Embodiment Robot Learning',
    authors: ['Lawrence Yunliang Chen', 'Chenfeng Xu', 'Karthik Dharmarajan', 'Muhammad Zubair Irshad', 'Richard Cheng', 'Kurt Keutzer', 'Masayoshi Tomizuka', 'Quan Vuong', 'Ken Goldberg'],
    year: 2024,
    venue: 'CoRL 2024',
    arxiv: '2409.03403',
    url: 'https://arxiv.org/abs/2409.03403',
    type: 'paper',
  },
  // shadow-2025: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#18 for manipulation/cross-embodiment.
  {
    id: 'shadow-2025',
    title: 'Shadow: Leveraging Segmentation Masks for Cross-Embodiment Policy Transfer',
    authors: ['Marion Lepert', 'Ria Doshi', 'Jeannette Bohg'],
    year: 2025,
    arxiv: '2503.00774',
    url: 'https://arxiv.org/abs/2503.00774',
    type: 'paper',
  },
  // lapa-2025: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#30 for manipulation/cross-embodiment.
  {
    id: 'lapa-2025',
    title: 'Latent Action Pretraining from Videos',
    authors: ['Seonghyeon Ye', 'Joel Jang', 'Byeongguk Jeon', 'Sejune Joo', 'Jianwei Yang', 'Baolin Peng', 'Ajay Mandlekar', 'Reuben Tan', 'Yu-Wei Chao', 'Bill Yuchen Lin', 'Lars Liden', 'Kimin Lee', 'Jianfeng Gao', 'Luke Zettlemoyer', 'Dieter Fox', 'Minjoon Seo'],
    year: 2025,
    venue: 'ICLR 2025',
    arxiv: '2410.11758',
    url: 'https://arxiv.org/abs/2410.11758',
    type: 'paper',
  },
  // egomimic-2024: domain pass 2026-10-06, from drafts/data-hardware/teleop-rigs.citations.ts; also drafts/manipulation/cross-embodiment.citations.ts.
  {
    id: 'egomimic-2024',
    title: 'EgoMimic: Scaling Imitation Learning via Egocentric Video',
    authors: ['Simar Kareer', 'Dhruv Patel', 'Ryan Punamiya', 'Pranay Mathur', 'Shuo Cheng', 'Chen Wang', 'Judy Hoffman', 'Danfei Xu'],
    year: 2024,
    arxiv: '2410.24221',
    url: 'https://arxiv.org/abs/2410.24221',
    type: 'paper',
  },
  // egobridge-2025: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#24 for manipulation/cross-embodiment; the pack also lists a
  // CoRL 2025 oral.
  {
    id: 'egobridge-2025',
    title: 'EgoBridge: Domain Adaptation for Generalizable Imitation from Egocentric Human Data',
    authors: ['Ryan Punamiya', 'Dhruv Patel', 'Patcharapong Aphiwetsa', 'Pranav Kuppili', 'Lawrence Y. Zhu', 'Simar Kareer', 'Judy Hoffman', 'Danfei Xu'],
    year: 2025,
    venue: 'NeurIPS 2025',
    arxiv: '2509.19626',
    url: 'https://arxiv.org/abs/2509.19626',
    type: 'paper',
  },
  // h-rdt-2025: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#26 for manipulation/cross-embodiment.
  {
    id: 'h-rdt-2025',
    title: 'H-RDT: Human Manipulation Enhanced Bimanual Robotic Manipulation',
    authors: ['Hongzhe Bi', 'Lingxuan Wu', 'Tianwei Lin', 'Hengkai Tan', 'Zhizhong Su', 'Hang Su', 'Jun Zhu'],
    year: 2025,
    arxiv: '2507.23523',
    url: 'https://arxiv.org/abs/2507.23523',
    type: 'paper',
  },
  // phantom-2025: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#27 for manipulation/cross-embodiment.
  {
    id: 'phantom-2025',
    title: 'Phantom: Training Robots Without Robots Using Only Human Videos',
    authors: ['Marion Lepert', 'Jiaying Fang', 'Jeannette Bohg'],
    year: 2025,
    venue: 'CoRL 2025',
    arxiv: '2503.00779',
    url: 'https://arxiv.org/abs/2503.00779',
    type: 'paper',
  },
  // masquerade-2026: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#28 for manipulation/cross-embodiment.
  {
    id: 'masquerade-2026',
    title: 'Masquerade: Learning from In-the-wild Human Videos using Data-Editing',
    authors: ['Marion Lepert', 'Jiaying Fang', 'Jeannette Bohg'],
    year: 2026,
    venue: 'ICRA 2026',
    arxiv: '2508.09976',
    url: 'https://arxiv.org/abs/2508.09976',
    type: 'paper',
  },
  // helix-2-5-2026: domain pass 2026-10-06, from drafts/frontier/generalization.citations.ts; also drafts/manipulation/comparison-matrix.citations.ts, drafts/manipulation/cross-embodiment.citations.ts, drafts/manipulation/generalist-policies.citations.ts, drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // Figure news post dated September 17, 2026 (fetched 2026-10-04, no byline): "Then we took the
  // robot into 30 Bay Area homes with zero data collected in any of them."; "In blind evaluations,
  // the policy trained from scratch succeeded on 9% of zero-shot trials. The Index-pretrained policy
  // succeeded on 56%"; "We chose three whole-body tasks: tidying a room, making a bed, and folding
  // towels."; "A human-to-humanoid robot transfer scaling law. Repeatedly doubling Index pretraining
  // data improved downstream robot-action prediction smoothly enough to forecast our largest run".
  // The page publishes no trial counts. Vendor-reported.
  {
    id: 'helix-2-5-2026',
    title: 'Helix 2.5: Zero-Shot 30-Home Generalization',
    authors: ['Figure AI'],
    year: 2026,
    venue: 'Figure news',
    url: 'https://www.figure.ai/news/helix-2-5-zero-shot-30-home-generalization',
    type: 'blog',
  },
  // embodiment-scaling-2025: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts.
  // Source pack pack-manipulation-2.md#11 for manipulation/cross-embodiment.
  {
    id: 'embodiment-scaling-2025',
    title: 'Towards Embodiment Scaling Laws in Robot Locomotion',
    authors: ['Bo Ai', 'Liu Dai', 'Nico Bohlinger', 'Dichen Li', 'Tongzhou Mu', 'Zhanxin Wu', 'K. Fay', 'Henrik I. Christensen', 'Jan Peters', 'Hao Su'],
    year: 2025,
    venue: 'CoRL 2025',
    arxiv: '2505.05753',
    url: 'https://arxiv.org/abs/2505.05753',
    type: 'paper',
  },
  // skild-omni-bodied-2025: domain pass 2026-10-06, from drafts/manipulation/cross-embodiment.citations.ts; also drafts/manipulation/generalist-policies.citations.ts.
  // Source pack pack-manipulation-2.md#13 for manipulation/cross-embodiment; Vendor post;
  // article:published_time "24 Sep, 2025", article:author "Skild AI Team" (read 2026-10-04): "We
  // created a universe with 100,000 different robots and trained our AI to control them all.".
  {
    id: 'skild-omni-bodied-2025',
    title: 'The case for an omni-bodied robot brain',
    authors: ['Skild AI Team'],
    year: 2025,
    venue: 'Skild AI blog',
    url: 'https://www.skild.ai/blogs/omni-bodied',
    type: 'blog',
  },
  // generalist-gen1-2026: domain pass 2026-10-06, from drafts/data-hardware/teleop-rigs.citations.ts; also drafts/frontier/generalization.citations.ts, drafts/manipulation/comparison-matrix.citations.ts, drafts/manipulation/generalist-policies.citations.ts.
  // Company research post dated April 2, 2026, byline "Generalist Team" (read 2026-10-04). "half a
  // million hours" and the no-robot-data pretraining are company-reported.
  {
    id: 'generalist-gen1-2026',
    title: 'GEN-1: Scaling Embodied Foundation Models to Mastery',
    authors: ['Generalist Team'],
    year: 2026,
    venue: 'Generalist AI blog',
    url: 'https://generalistai.com/blog/gen-1',
    type: 'blog',
  },
  // gemini-robotics-blog-2025: domain pass 2026-10-06, from drafts/manipulation/generalist-policies.citations.ts.
  // Source pack pack-manipulation-2.md#1 for manipulation/generalist-policies; Launch post;
  // datePublished 2025-03-12, author Carolina Parada (read 2026-10-04; the pack's /discover/blog/
  // URL redirects here): "Gemini Robotics more than doubles performance on a comprehensive
  // generalization benchmark compared to other state-of-the-art vision-language-action models".
  {
    id: 'gemini-robotics-blog-2025',
    title: 'Gemini Robotics brings AI into the physical world',
    authors: ['Carolina Parada'],
    year: 2025,
    venue: 'Google DeepMind blog',
    url: 'https://deepmind.google/blog/gemini-robotics-brings-ai-into-the-physical-world/',
    type: 'blog',
  },
  // gemini-robotics-er-1-6-2026: domain pass 2026-10-06, from drafts/classical/perception.citations.ts; also drafts/manipulation/generalist-policies.citations.ts.
  // Google DeepMind blog, datePublished 2026-04-14, byline Laura Graesser and Peng Xu. "Gemini
  // Robotics-ER 1.6 shows significant improvement over both Gemini Robotics-ER 1.5 and Gemini 3.0
  // Flash, specifically enhancing spatial and physical reasoning capabilities such as pointing,
  // counting, and success detection." and "It acts as the high-level reasoning model for a robot,
  // capable of executing tasks by natively calling tools like Google Search to find information,
  // vision-language-action models (VLAs) or any other third-party user-defined functions." (vendor
  // self-report)
  {
    id: 'gemini-robotics-er-1-6-2026',
    title: 'Gemini Robotics-ER 1.6: Powering real-world robotics tasks through enhanced embodied reasoning',
    authors: ['Laura Graesser', 'Peng Xu'],
    year: 2026,
    venue: 'Google DeepMind blog',
    url: 'https://deepmind.google/blog/gemini-robotics-er-1-6/',
    type: 'blog',
  },
  // gemini-robotics-er-2-2026: domain pass 2026-10-06, from drafts/manipulation/generalist-policies.citations.ts; also drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-2.md#6 for manipulation/generalist-policies; Google post;
  // datePublished 2026-07-30, author Steven Hansen (read 2026-10-04): "Success/failure detection:
  // Now operates on raw video feeds rather than static snapshots" / "We tested it across 10
  // different types of instruments.".
  {
    id: 'gemini-robotics-er-2-2026',
    title: 'Introducing Gemini Robotics ER 2',
    authors: ['Steven Hansen'],
    year: 2026,
    venue: 'The Keyword (blog.google)',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-robotics-er-2/',
    type: 'blog',
  },
  // veo-world-simulator-2025: domain pass 2026-10-06, from drafts/data-hardware/evaluation-crisis.citations.ts; also drafts/manipulation/generalist-policies.citations.ts, drafts/world-models/evaluation.citations.ts.
  // Same id as drafts/world-models/evaluation.citations.ts; keep one entry when merging.
  {
    id: 'veo-world-simulator-2025',
    title: 'Evaluating Gemini Robotics Policies in a Veo World Simulator',
    authors: ['Gemini Robotics Team', 'Krzysztof Choromanski', 'Coline Devin', 'Yilun Du', 'Debidatta Dwibedi', 'Ruiqi Gao', 'Abhishek Jindal', 'Thomas Kipf', 'Sean Kirmani', 'Isabel Leal', 'Fangchen Liu', 'Anirudha Majumdar', 'Andrew Marmon', 'Carolina Parada', 'Yulia Rubanova', 'Dhruv Shah', 'Vikas Sindhwani', 'Jie Tan', 'Fei Xia', 'Ted Xiao', 'Sherry Yang', 'Wenhao Yu', 'Allan Zhou'],
    year: 2025,
    arxiv: '2512.10675',
    url: 'https://arxiv.org/abs/2512.10675',
    type: 'paper',
  },
  // figure-index-2026: domain pass 2026-10-06, from drafts/manipulation/generalist-policies.citations.ts.
  // Source pack pack-manipulation-2.md#16 for manipulation/generalist-policies; Vendor post dated
  // August 25, 2026 (read 2026-10-04): "Our Creators, the network of individuals building this data,
  // have uploaded over 16M videos to our app" / "committed to spend over $1B the next 12 months on
  // data and compute".
  {
    id: 'figure-index-2026',
    title: 'Introducing Index: Building The World\'s Largest and Most Diverse Physical Dataset',
    authors: ['Figure AI'],
    year: 2026,
    venue: 'Figure news',
    url: 'https://www.figure.ai/news/introducing-index',
    type: 'blog',
  },
  // agibot-world-repo: domain pass 2026-10-06, from drafts/data-hardware/datasets.citations.ts; also drafts/manipulation/generalist-policies.citations.ts.
  // Repository README read 2026-10-04: "AgiBot World Beta : Our complete dataset featuring 1,003,672
  // trajectories" and "All the data and code within this repo are under CC BY-NC-SA 4.0".
  // Organisation as author; no byline.
  {
    id: 'agibot-world-repo',
    title: 'AgiBot-World (release repository)',
    authors: ['OpenDriveLab'],
    year: 'n.d.',
    accessedOn: '2026-10-04',
    venue: 'GitHub',
    url: 'https://github.com/OpenDriveLab/AgiBot-World',
    type: 'docs',
  },
  // acot-vla-2026: domain pass 2026-10-06, from drafts/manipulation/generalist-policies.citations.ts.
  // Source pack pack-manipulation-2.md#19 for manipulation/generalist-policies.
  {
    id: 'acot-vla-2026',
    title: 'ACoT-VLA: Action Chain-of-Thought for Vision-Language-Action Models',
    authors: ['Linqing Zhong', 'Yi Liu', 'Yifei Wei', 'Ziyu Xiong', 'Maoqing Yao', 'Si Liu', 'Guanghui Ren'],
    year: 2026,
    venue: 'CVPR 2026',
    arxiv: '2601.11404',
    url: 'https://arxiv.org/abs/2601.11404',
    type: 'paper',
  },
  // skild-brain-2025: domain pass 2026-10-06, from drafts/manipulation/generalist-policies.citations.ts.
  // Source pack pack-manipulation-2.md#24 for manipulation/generalist-policies; Vendor post;
  // article:published_time "29 July, 2025", article:author "Skild AI Team" (read 2026-10-04):
  // "follows a hierarchical architecture: (1) a low-frequency high-level manipulation and navigation
  // action policy which provides inputs to a (2) high-frequency low-level action policy".
  {
    id: 'skild-brain-2025',
    title: 'Building the general-purpose robotic brain',
    authors: ['Skild AI Team'],
    year: 2025,
    venue: 'Skild AI blog',
    url: 'https://www.skild.ai/blogs/building-the-general-purpose-robotic-brain',
    type: 'blog',
  },
  // skild-self-play-2026: domain pass 2026-10-06, from drafts/manipulation/generalist-policies.citations.ts.
  // Source pack pack-manipulation-2.md#27 for manipulation/generalist-policies; Vendor post;
  // article:published_time "Sep 23, 2026", article:author "Skild Team" (read 2026-10-04): "After 140
  // years of simulated play, we transferred the policy into a robot".
  {
    id: 'skild-self-play-2026',
    title: 'Physical Self-Play',
    authors: ['Skild Team'],
    year: 2026,
    venue: 'Skild AI blog',
    url: 'https://www.skild.ai/blogs/physical-self-play',
    type: 'blog',
  },
  // skild-arr-2026: domain pass 2026-10-06, from drafts/manipulation/generalist-policies.citations.ts.
  // Source pack pack-manipulation-2.md#28 for manipulation/generalist-policies; Vendor post;
  // article:published_time "Sep 10, 2026", article:author "Deepak Pathak and Abhinav Gupta" (read
  // 2026-10-04): "We have crossed $100M in annual recurring revenue." / "In ten months, we've scaled
  // to 60+ paying customers".
  {
    id: 'skild-arr-2026',
    title: 'The Hidden Pillar of Robotics',
    authors: ['Deepak Pathak', 'Abhinav Gupta'],
    year: 2026,
    venue: 'Skild AI blog',
    url: 'https://www.skild.ai/blogs/skild-crosses-100m-arr',
    type: 'blog',
  },
  // generalist-gen0-2025: domain pass 2026-10-06, from drafts/data-hardware/robot-learning-stack.citations.ts; also drafts/frontier/generalization.citations.ts, drafts/manipulation/generalist-policies.citations.ts.
  // Conflict resolved: title follows the publisher's own citation block on
  // https://generalistai.com/blog/gen-0 ("Please cite this work as: Generalist
  // Team, 'GEN-0: Embodied Foundation Models That Scale with Physical
  // Interaction', Generalist AI Blog, Nov 2025"). frontier/generalization used
  // the page heading form with ' / '.
  // Company research post dated November 4, 2025, byline "Generalist Team" (read 2026-10-04). Corpus
  // figures (270,000+ hours, 10,000 hours a week) are company-reported. Title as in the post's own
  // "Please cite this work as" block (the page heading prints "GEN-0 /"), matching
  // drafts/manipulation/generalist-policies.citations.ts (fix 2026-10-04).
  {
    id: 'generalist-gen0-2025',
    title: 'GEN-0: Embodied Foundation Models That Scale with Physical Interaction',
    authors: ['Generalist Team'],
    year: 2025,
    venue: 'Generalist AI blog',
    url: 'https://generalistai.com/blog/gen-0',
    type: 'blog',
  },
  // pi0-blog-2024: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#1 for manipulation/pi-line; PI post published October 31,
  // 2024; pi.website returns 429 to scripted requests, so read via the Wayback capture of 2026-09-22
  // (2026-10-04): "We use a smaller 3 billion parameter VLM as a starting point" / "our own datasets
  // consisting of dexterous tasks from 8 distinct robots".
  {
    id: 'pi0-blog-2024',
    title: 'π0: Our First Generalist Policy',
    authors: ['Kevin Black', 'Noah Brown', 'Danny Driess', 'Michael Equi', 'Adnan Esmail', 'Chelsea Finn', 'Nick Fusai', 'Lachy Groom', 'Karol Hausman', 'Brian Ichter', 'Szymon Jakubczak', 'Tim Jones', 'Kay Ke', 'Sergey Levine', 'Adrian Li-Bell', 'Mohith Mothukuri', 'Suraj Nair', 'Karl Pertsch', 'Lucy Shi', 'James Tanner', 'Quan Vuong', 'Anna Walling', 'Haohuan Wang', 'Ury Zhilinsky'],
    year: 2024,
    venue: 'Physical Intelligence',
    url: 'https://www.pi.website/blog/pi0',
    type: 'blog',
  },
  // openpi-blog-2025: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#2 for manipulation/pi-line; PI post published February 4,
  // 2025; pi.website returns 429 to scripted requests, so read via the Wayback capture of 2026-09-23
  // (2026-10-04): "Today, we are releasing the code and weights for the π0 as part of our
  // experimental openpi repository." / "between 1 and 20 hours of data was sufficient to fine-tune
  // to a variety of tasks" / "The model is trained on OXE and 7 of our robot platforms.".
  {
    id: 'openpi-blog-2025',
    title: 'Open Sourcing π0',
    authors: ['Physical Intelligence'],
    year: 2025,
    venue: 'Physical Intelligence',
    url: 'https://www.pi.website/blog/openpi',
    type: 'blog',
  },
  // jetson-ai-lab-openpi-thor: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts; also drafts/manipulation/realtime-execution.citations.ts.
  // Source pack pack-manipulation-3.md#26 for manipulation/pi-line; same source and id also proposed
  // in drafts/manipulation/realtime-execution.citations.ts; register once. Fix 2026-10-04: aligned
  // with the realtime-execution copy (page prints authors Aditya Sahu and Anqi Liu and no date;
  // title "OpenPi π₀.₅ on Jetson Thor").
  {
    id: 'jetson-ai-lab-openpi-thor',
    title: 'OpenPi π₀.₅ on Jetson Thor',
    authors: ['Aditya Sahu', 'Anqi Liu'],
    year: 'n.d.',
    accessedOn: '2026-10-04',
    venue: 'official tutorial',
    url: 'https://www.jetson-ai-lab.com/tutorials/openpi_on_thor/',
    type: 'docs',
  },
  // pi-fast-blog-2025: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#9 for manipulation/pi-line; PI post published January 16,
  // 2025; pi.website returns 429 to scripted requests, so read via the Wayback capture of 2026-07-30
  // (2026-10-04): "we are releasing a general-purpose variant of the FAST tokenizer trained on 1M
  // real robot action sequences".
  {
    id: 'pi-fast-blog-2025',
    title: 'FAST: Efficient Robot Action Tokenization',
    authors: ['Karl Pertsch', 'Kyle Stachowicz', 'Brian Ichter', 'Danny Driess', 'Suraj Nair', 'Quan Vuong', 'Oier Mees', 'Chelsea Finn', 'Sergey Levine'],
    year: 2025,
    venue: 'Physical Intelligence',
    url: 'https://www.pi.website/research/fast',
    type: 'blog',
  },
  // hi-robot-blog-2025: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#10 for manipulation/pi-line; PI post published February 26,
  // 2025; pi.website returns 429 to scripted requests, so read via the Wayback capture of 2026-07-30
  // (2026-10-04): "π0 serves as the instinctual, reactive \"System 1\"" / "This high-level policy is
  // itself a VLM (in fact, it uses exactly the same VLM backbone as π0)".
  {
    id: 'hi-robot-blog-2025',
    title: 'Teaching Robots to Listen and Think Harder',
    authors: ['Lucy Shi', 'Brian Ichter', 'Michael Equi', 'Liyiming Ke', 'Karl Pertsch', 'Quan Vuong', 'James Tanner', 'Anna Walling', 'Haohuan Wang', 'Niccolo Fusai', 'Adrian Li-Bell', 'Danny Driess', 'Lachy Groom', 'Sergey Levine', 'Chelsea Finn'],
    year: 2025,
    venue: 'Physical Intelligence',
    url: 'https://www.pi.website/research/hirobot',
    type: 'blog',
  },
  // gemma3-2025: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#13 for manipulation/pi-line.
  {
    id: 'gemma3-2025',
    title: 'Gemma 3 Technical Report',
    authors: ['Gemma Team', 'Aishwarya Kamath', 'Johan Ferret', 'Shreya Pathak', 'Nino Vieillard', 'Ramona Merhej', 'Sarah Perrin', 'Tatiana Matejovicova', 'Alexandre Ramé', 'Morgane Rivière', 'Louis Rouillard', 'Thomas Mesnard', 'Geoffrey Cideron', 'Jean-bastien Grill', 'Sabela Ramos', 'Edouard Yvinec', 'Michelle Casbon', 'Etienne Pot', 'Ivo Penchev', 'Gaël Liu', 'Francesco Visin', 'Kathleen Kenealy', 'Lucas Beyer', 'Xiaohai Zhai', 'Anton Tsitsulin', 'Robert Busa-Fekete', 'Alex Feng', 'Noveen Sachdeva', 'Benjamin Coleman', 'Yi Gao', 'Basil Mustafa', 'Iain Barr', 'Emilio Parisotto', 'David Tian', 'Matan Eyal', 'Colin Cherry', 'Jan-Thorsten Peter', 'Danila Sinopalnikov', 'Surya Bhupatiraju', 'Rishabh Agarwal', 'Mehran Kazemi', 'Dan Malkin', 'Ravin Kumar', 'David Vilar', 'Idan Brusilovsky', 'Jiaming Luo', 'Andreas Steiner', 'Abe Friesen', 'Abhanshu Sharma', 'Abheesht Sharma', 'Adi Mayrav Gilady', 'Adrian Goedeckemeyer', 'Alaa Saade', 'Alex Feng', 'Alexander Kolesnikov', 'Alexei Bendebury', 'Alvin Abdagic', 'Amit Vadi', 'András György', 'André Susano Pinto', 'Anil Das', 'Ankur Bapna', 'Antoine Miech', 'Antoine Yang', 'Antonia Paterson', 'Ashish Shenoy', 'Ayan Chakrabarti', 'Bilal Piot', 'Bo Wu', 'Bobak Shahriari', 'Bryce Petrini', 'Charlie Chen', 'Charline Le Lan', 'Christopher A. Choquette-Choo', 'CJ Carey', 'Cormac Brick', 'Daniel Deutsch', 'Danielle Eisenbud', 'Dee Cattle', 'Derek Cheng', 'Dimitris Paparas', 'Divyashree Shivakumar Sreepathihalli', 'Doug Reid', 'Dustin Tran', 'Dustin Zelle', 'Eric Noland', 'Erwin Huizenga', 'Eugene Kharitonov', 'Frederick Liu', 'Gagik Amirkhanyan', 'Glenn Cameron', 'Hadi Hashemi', 'Hanna Klimczak-Plucińska', 'Harman Singh', 'Harsh Mehta', 'Harshal Tushar Lehri', 'Hussein Hazimeh', 'Ian Ballantyne', 'Idan Szpektor', 'Ivan Nardini', 'Jean Pouget-Abadie', 'Jetha Chan', 'Joe Stanton', 'John Wieting', 'Jonathan Lai', 'Jordi Orbay', 'Joseph Fernandez', 'Josh Newlan', 'Ju-yeong Ji', 'Jyotinder Singh', 'Kat Black', 'Kathy Yu', 'Kevin Hui', 'Kiran Vodrahalli', 'Klaus Greff', 'Linhai Qiu', 'Marcella Valentine', 'Marina Coelho', 'Marvin Ritter', 'Matt Hoffman', 'Matthew Watson', 'Mayank Chaturvedi', 'Michael Moynihan', 'Min Ma', 'Nabila Babar', 'Natasha Noy', 'Nathan Byrd', 'Nick Roy', 'Nikola Momchev', 'Nilay Chauhan', 'Noveen Sachdeva', 'Oskar Bunyan', 'Pankil Botarda', 'Paul Caron', 'Paul Kishan Rubenstein', 'Phil Culliton', 'Philipp Schmid', 'Pier Giuseppe Sessa', 'Pingmei Xu', 'Piotr Stanczyk', 'Pouya Tafti', 'Rakesh Shivanna', 'Renjie Wu', 'Renke Pan', 'Reza Rokni', 'Rob Willoughby', 'Rohith Vallu', 'Ryan Mullins', 'Sammy Jerome', 'Sara Smoot', 'Sertan Girgin', 'Shariq Iqbal', 'Shashir Reddy', 'Shruti Sheth', 'Siim Põder', 'Sijal Bhatnagar', 'Sindhu Raghuram Panyam', 'Sivan Eiger', 'Susan Zhang', 'Tianqi Liu', 'Trevor Yacovone', 'Tyler Liechty', 'Uday Kalra', 'Utku Evci', 'Vedant Misra', 'Vincent Roseberry', 'Vlad Feinberg', 'Vlad Kolesnikov', 'Woohyun Han', 'Woosuk Kwon', 'Xi Chen', 'Yinlam Chow', 'Yuvein Zhu', 'Zichuan Wei', 'Zoltan Egyed', 'Victor Cotruta', 'Minh Giang', 'Phoebe Kirk', 'Anand Rao', 'Kat Black', 'Nabila Babar', 'Jessica Lo', 'Erica Moreira', 'Luiz Gustavo Martins', 'Omar Sanseviero', 'Lucas Gonzalez', 'Zach Gleicher', 'Tris Warkentin', 'Vahab Mirrokni', 'Evan Senter', 'Eli Collins', 'Joelle Barral', 'Zoubin Ghahramani', 'Raia Hadsell', 'Yossi Matias', 'D. Sculley', 'Slav Petrov', 'Noah Fiedel', 'Noam Shazeer', 'Oriol Vinyals', 'Jeff Dean', 'Demis Hassabis', 'Koray Kavukcuoglu', 'Clement Farabet', 'Elena Buchatskaya', 'Jean-Baptiste Alayrac', 'Rohan Anil', 'Dmitry', 'Lepikhin', 'Sebastian Borgeaud', 'Olivier Bachem', 'Armand Joulin', 'Alek Andreev', 'Cassidy Hardin', 'Robert Dadashi', 'Léonard Hussenot'],
    year: 2025,
    arxiv: '2503.19786',
    url: 'https://arxiv.org/abs/2503.19786',
    type: 'paper',
  },
  // pi-partner-2026: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#21 for manipulation/pi-line; PI post published February 24,
  // 2026; pi.website returns 429 to scripted requests, so read via the Wayback capture of 2026-07-30
  // (2026-10-04): "Continuous shot of π0.6 packaging orders at Ultra's customer site for a full
  // shift at 96.4% autonomy.".
  {
    id: 'pi-partner-2026',
    title: 'The Physical Intelligence Layer',
    authors: ['Physical Intelligence'],
    year: 2026,
    venue: 'Physical Intelligence',
    url: 'https://www.pi.website/blog/partner',
    type: 'blog',
  },
  // cfgrl-2025: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#15 for manipulation/pi-line.
  {
    id: 'cfgrl-2025',
    title: 'Diffusion Guidance Is a Controllable Policy Improvement Operator',
    authors: ['Kevin Frans', 'Seohong Park', 'Pieter Abbeel', 'Sergey Levine'],
    year: 2025,
    arxiv: '2505.23458',
    url: 'https://arxiv.org/abs/2505.23458',
    type: 'paper',
  },
  // mem-blog-2026: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#19 for manipulation/pi-line; PI post published March 3, 2026;
  // pi.website returns 429 to scripted requests, so read via the Wayback capture of 2026-08-31
  // (2026-10-04): "MEM VLAs can solve tasks that require up to 15 minutes of memory".
  {
    id: 'mem-blog-2026',
    title: 'VLAs with Long and Short-Term Memory',
    authors: ['Marcel Torne', 'Karl Pertsch', 'Homer Walke', 'Kyle Vedder', 'Suraj Nair', 'Brian Ichter', 'Allen Ren', 'Haohuan Wang', 'Jiaming Tang', 'Kyle Stachowicz', 'Karan Dhabalia', 'Michael Equi', 'Quan Vuong', 'Jost Tobias Springenberg', 'Sergey Levine', 'Chelsea Finn', 'Danny Driess'],
    year: 2026,
    venue: 'Physical Intelligence',
    url: 'https://www.pi.website/research/memory',
    type: 'blog',
  },
  // rlt-2026: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts; also drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-3.md#20 for manipulation/pi-line; PI post published March 19,
  // 2026; pi.website returns 429 to scripted requests, so read via the Wayback capture of 2026-09-14
  // (2026-10-04): "Across four challenging manipulation tasks, RLT speeds up the most precise stages
  // of each task by up to 3×" / "Training takes a total of two hours, with just 15 minutes of total
  // robot data".
  {
    id: 'rlt-2026',
    title: 'Precise Manipulation with Efficient Online RL',
    authors: ['Charles Xu', 'Jost Tobias Springenberg', 'Michael Equi', 'Ali Amin', 'Adnan Esmail', 'Sergey Levine', 'Liyiming Ke'],
    year: 2026,
    venue: 'Physical Intelligence',
    url: 'https://www.pi.website/research/rlt',
    type: 'blog',
  },
  // bagel-2025: domain pass 2026-10-06, from drafts/manipulation/pi-line.citations.ts.
  // Source pack pack-manipulation-3.md#22 for manipulation/pi-line.
  {
    id: 'bagel-2025',
    title: 'Emerging Properties in Unified Multimodal Pretraining',
    authors: ['Chaorui Deng', 'Deyao Zhu', 'Kunchang Li', 'Chenhui Gou', 'Feng Li', 'Zeyu Wang', 'Shu Zhong', 'Weihao Yu', 'Xiaonan Nie', 'Ziang Song', 'Guang Shi', 'Haoqi Fan'],
    year: 2025,
    arxiv: '2505.14683',
    url: 'https://arxiv.org/abs/2505.14683',
    type: 'paper',
  },
  // huang-zero-shot-planners-2022: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#2 for manipulation/hierarchical.
  {
    id: 'huang-zero-shot-planners-2022',
    title: 'Language Models as Zero-Shot Planners: Extracting Actionable Knowledge for Embodied Agents',
    authors: ['Wenlong Huang', 'Pieter Abbeel', 'Deepak Pathak', 'Igor Mordatch'],
    year: 2022,
    arxiv: '2201.07207',
    url: 'https://arxiv.org/abs/2201.07207',
    type: 'paper',
  },
  // inner-monologue-2022: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#1 for manipulation/hierarchical.
  {
    id: 'inner-monologue-2022',
    title: 'Inner Monologue: Embodied Reasoning through Planning with Language Models',
    authors: ['Wenlong Huang', 'Fei Xia', 'Ted Xiao', 'Harris Chan', 'Jacky Liang', 'Pete Florence', 'Andy Zeng', 'Jonathan Tompson', 'Igor Mordatch', 'Yevgen Chebotar', 'Pierre Sermanet', 'Noah Brown', 'Tomas Jackson', 'Linda Luu', 'Sergey Levine', 'Karol Hausman', 'Brian Ichter'],
    year: 2022,
    arxiv: '2207.05608',
    url: 'https://arxiv.org/abs/2207.05608',
    type: 'paper',
  },
  // text2motion-2023: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#5 for manipulation/hierarchical.
  {
    id: 'text2motion-2023',
    title: 'Text2Motion: From Natural Language Instructions to Feasible Plans',
    authors: ['Kevin Lin', 'Christopher Agia', 'Toki Migimatsu', 'Marco Pavone', 'Jeannette Bohg'],
    year: 2023,
    arxiv: '2303.12153',
    url: 'https://arxiv.org/abs/2303.12153',
    type: 'paper',
  },
  // voxposer-2023: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#7 for manipulation/hierarchical.
  {
    id: 'voxposer-2023',
    title: 'VoxPoser: Composable 3D Value Maps for Robotic Manipulation with Language Models',
    authors: ['Wenlong Huang', 'Chen Wang', 'Ruohan Zhang', 'Yunzhu Li', 'Jiajun Wu', 'Li Fei-Fei'],
    year: 2023,
    arxiv: '2307.05973',
    url: 'https://arxiv.org/abs/2307.05973',
    type: 'paper',
  },
  // rt-trajectory-2023: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#11 for manipulation/hierarchical.
  {
    id: 'rt-trajectory-2023',
    title: 'RT-Trajectory: Robotic Task Generalization via Hindsight Trajectory Sketches',
    authors: ['Jiayuan Gu', 'Sean Kirmani', 'Paul Wohlhart', 'Yao Lu', 'Montserrat Gonzalez Arenas', 'Kanishka Rao', 'Wenhao Yu', 'Chuyuan Fu', 'Keerthana Gopalakrishnan', 'Zhuo Xu', 'Priya Sundaresan', 'Peng Xu', 'Hao Su', 'Karol Hausman', 'Chelsea Finn', 'Quan Vuong', 'Ted Xiao'],
    year: 2023,
    arxiv: '2311.01977',
    url: 'https://arxiv.org/abs/2311.01977',
    type: 'paper',
  },
  // hamster-2025: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#12 for manipulation/hierarchical.
  {
    id: 'hamster-2025',
    title: 'HAMSTER: Hierarchical Action Models For Open-World Robot Manipulation',
    authors: ['Yi Li', 'Yuquan Deng', 'Jesse Zhang', 'Joel Jang', 'Marius Memmel', 'Raymond Yu', 'Caelan Reed Garrett', 'Fabio Ramos', 'Dieter Fox', 'Anqi Li', 'Abhishek Gupta', 'Ankit Goyal'],
    year: 2025,
    arxiv: '2502.05485',
    url: 'https://arxiv.org/abs/2502.05485',
    type: 'paper',
  },
  // robobrain-25-2026: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#14 for manipulation/hierarchical.
  {
    id: 'robobrain-25-2026',
    title: 'RoboBrain 2.5: Depth in Sight, Time in Mind',
    authors: ['Huajie Tan', 'Enshen Zhou', 'Zhiyu Li', 'Yijie Xu', 'Yuheng Ji', 'Xiansheng Chen', 'Cheng Chi', 'Pengwei Wang', 'Huizhu Jia', 'Yulong Ao', 'Mingyu Cao', 'Sixiang Chen', 'Zhe Li', 'Mengzhen Liu', 'Zixiao Wang', 'Shanyu Rong', 'Yaoxu Lyu', 'Zhongxia Zhao', 'Peterson Co', 'Yibo Li', 'Yi Han', 'Shaoxuan Xie', 'Guocai Yao', 'Songjing Wang', 'Leiduo Zhang', 'Xi Yang', 'Yance Jiao', 'Donghai Shi', 'Kunchang Xie', 'Shaokai Nie', 'Chunlei Men', 'Yonghua Lin', 'Zhongyuan Wang', 'Tiejun Huang', 'Shanghang Zhang'],
    year: 2026,
    arxiv: '2601.14352',
    url: 'https://arxiv.org/abs/2601.14352',
    type: 'paper',
  },
  // rt-h-2024: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#16 for manipulation/hierarchical.
  {
    id: 'rt-h-2024',
    title: 'RT-H: Action Hierarchies Using Language',
    authors: ['Suneel Belkhale', 'Tianli Ding', 'Ted Xiao', 'Pierre Sermanet', 'Quon Vuong', 'Jonathan Tompson', 'Yevgen Chebotar', 'Debidatta Dwibedi', 'Dorsa Sadigh'],
    year: 2024,
    arxiv: '2403.01823',
    url: 'https://arxiv.org/abs/2403.01823',
    type: 'paper',
  },
  // cot-vla-2025: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#22 for manipulation/hierarchical.
  {
    id: 'cot-vla-2025',
    title: 'CoT-VLA: Visual Chain-of-Thought Reasoning for Vision-Language-Action Models',
    authors: ['Qingqing Zhao', 'Yao Lu', 'Moo Jin Kim', 'Zipeng Fu', 'Zhuoyang Zhang', 'Yecheng Wu', 'Zhaoshuo Li', 'Qianli Ma', 'Song Han', 'Chelsea Finn', 'Ankur Handa', 'Ming-Yu Liu', 'Donglai Xiang', 'Gordon Wetzstein', 'Tsung-Yi Lin'],
    year: 2025,
    arxiv: '2503.22020',
    url: 'https://arxiv.org/abs/2503.22020',
    type: 'paper',
  },
  // molmoact-2025: domain pass 2026-10-06, from drafts/classical/perception.citations.ts; also drafts/manipulation/hierarchical.citations.ts.
  // arXiv 2508.07917 abstract: "Our model, MolmoAct, encodes observations and instructions into
  // depth-aware perception tokens, generates mid-level spatial plans as editable trajectory traces,
  // and predicts precise low-level actions".
  {
    id: 'molmoact-2025',
    title: 'MolmoAct: Action Reasoning Models that can Reason in Space',
    authors: ['Jason Lee', 'Jiafei Duan', 'Haoquan Fang', 'Yuquan Deng', 'Shuo Liu', 'Boyang Li', 'Bohan Fang', 'Jieyu Zhang', 'Yi Ru Wang', 'Sangho Lee', 'Winson Han', 'Wilbert Pumacay', 'Angelica Wu', 'Rose Hendrix', 'Karen Farley', 'Eli VanderBilt', 'Ali Farhadi', 'Dieter Fox', 'Ranjay Krishna'],
    year: 2025,
    arxiv: '2508.07917',
    url: 'https://arxiv.org/abs/2508.07917',
    type: 'paper',
  },
  // fast-in-slow-2025: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts; also drafts/manipulation/realtime-execution.citations.ts.
  // Source pack pack-manipulation-3.md#19 for manipulation/hierarchical; same source and id also
  // proposed in drafts/manipulation/realtime-execution.citations.ts; register once.
  {
    id: 'fast-in-slow-2025',
    title: 'Fast-in-Slow: A Dual-System Foundation Model Unifying Fast Manipulation within Slow Reasoning',
    authors: ['Hao Chen', 'Jiaming Liu', 'Chenyang Gu', 'Zhuoyang Liu', 'Renrui Zhang', 'Xiaoqi Li', 'Xiao He', 'Yandong Guo', 'Chi-Wing Fu', 'Shanghang Zhang', 'Pheng-Ann Heng'],
    year: 2025,
    arxiv: '2506.01953',
    url: 'https://arxiv.org/abs/2506.01953',
    type: 'paper',
  },
  // vista-2026: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#29 for manipulation/hierarchical.
  {
    id: 'vista-2026',
    title: 'Scaling World Model for Hierarchical Manipulation Policies',
    authors: ['Qian Long', 'Yueze Wang', 'Jiaxi Song', 'Junbo Zhang', 'Peiyan Li', 'Wenxuan Wang', 'Yuqi Wang', 'Haoyang Li', 'Shaoxuan Xie', 'Guocai Yao', 'Hanbo Zhang', 'Xinlong Wang', 'Zhongyuan Wang', 'Xuguang Lan', 'Huaping Liu', 'Xinghang Li'],
    year: 2026,
    arxiv: '2602.10983',
    url: 'https://arxiv.org/abs/2602.10983',
    type: 'paper',
  },
  // gemini-robotics-er-15-dev-2025: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#24 for manipulation/hierarchical; Google post; datePublished
  // 2025-09-25, authors Kendra Byrne and Fei Xia (read 2026-10-04): "This is the first Gemini
  // Robotics model to be made broadly available. It acts as a high-level reasoning model for a
  // robot." / "can call a vision-language-action model (VLA) or any other third-party user-defined
  // functions to execute the task".
  {
    id: 'gemini-robotics-er-15-dev-2025',
    title: 'Building the Next Generation of Physical Agents with Gemini Robotics-ER 1.5',
    authors: ['Kendra Byrne', 'Fei Xia'],
    year: 2025,
    venue: 'Google Developers Blog',
    url: 'https://developers.googleblog.com/building-the-next-generation-of-physical-agents-with-gemini-robotics-er-15/',
    type: 'blog',
  },
  // orchestrating-policies-2026: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#27 for manipulation/hierarchical.
  {
    id: 'orchestrating-policies-2026',
    title: 'What Matters in Orchestrating Robot Policies: A Systematic Study of Hierarchical VLA Agents',
    authors: ['Jiaheng Hu', 'Mohit Shridhar', 'Caden Lu', 'Dhruv Shah', 'Hao-Tien Lewis Chiang', 'Jie Tan', 'Annie Xie'],
    year: 2026,
    arxiv: '2606.10267',
    url: 'https://arxiv.org/abs/2606.10267',
    type: 'paper',
  },
  // fast-plans-2026: domain pass 2026-10-06, from drafts/manipulation/hierarchical.citations.ts.
  // Source pack pack-manipulation-3.md#28 for manipulation/hierarchical.
  {
    id: 'fast-plans-2026',
    title: 'Fast Plans, Faithful Actions: Closing the Planning-Execution Gap in Hierarchical Vision-Language-Action Models',
    authors: ['Chuanliang Xie', 'Boyu Ma', 'Gen Li', 'Yizhou Liu', 'Houwang Chen', 'Xinyu Zhou', 'Jianfei Yang'],
    year: 2026,
    arxiv: '2609.30833',
    url: 'https://arxiv.org/abs/2609.30833',
    type: 'paper',
  },
  // nvidia-jetson-thor-available-2025: domain pass 2026-10-06, from drafts/data-hardware/hardware-taxonomy.citations.ts; also drafts/manipulation/realtime-execution.citations.ts.
  // Same id as drafts/manipulation/realtime-execution.citations.ts; keep one entry when merging.
  // Dated August 25, 2025 (read 2026-10-04): "The NVIDIA Jetson AGX Thor developer kit is available
  // now starting at $3,499"; "up to 7.5x higher AI compute and 3.5x greater energy efficiency".
  {
    id: 'nvidia-jetson-thor-available-2025',
    title: 'NVIDIA Blackwell-Powered Jetson Thor Now Available, Accelerating the Age of General Robotics',
    authors: ['NVIDIA'],
    year: 2025,
    venue: 'press release',
    url: 'https://nvidianews.nvidia.com/news/nvidia-blackwell-powered-jetson-thor-now-available-accelerating-the-age-of-general-robotics',
    type: 'press',
  },
  // vlash-2025: domain pass 2026-10-06, from drafts/manipulation/realtime-execution.citations.ts.
  // Source pack pack-manipulation-3.md#9 for manipulation/realtime-execution.
  {
    id: 'vlash-2025',
    title: 'VLASH: Real-Time VLAs via Future-State-Aware Asynchronous Inference',
    authors: ['Jiaming Tang', 'Yufei Sun', 'Yilong Zhao', 'Shang Yang', 'Yujun Lin', 'Zhuoyang Zhang', 'James Hou', 'Yao Lu', 'Zhijian Liu', 'Song Han'],
    year: 2025,
    arxiv: '2512.01031',
    url: 'https://arxiv.org/abs/2512.01031',
    type: 'paper',
  },
  // futurertc-2026: domain pass 2026-10-06, from drafts/manipulation/realtime-execution.citations.ts.
  // Source pack pack-manipulation-3.md#12 for manipulation/realtime-execution.
  {
    id: 'futurertc-2026',
    title: 'FutureRTC: Real-Time Robot Execution with Anticipatory-Conditioned Action Chunking',
    authors: ['Hai Jiang', 'Yixian Zou', 'Binbin Liang', 'Boqian Liu', 'Fanman Meng', 'Shuaicheng Liu'],
    year: 2026,
    arxiv: '2607.24008',
    url: 'https://arxiv.org/abs/2607.24008',
    type: 'paper',
  },
  // event-triggered-vla-2026: domain pass 2026-10-06, from drafts/manipulation/realtime-execution.citations.ts.
  // Source pack pack-manipulation-3.md#13 for manipulation/realtime-execution.
  {
    id: 'event-triggered-vla-2026',
    title: 'React When You Need To: Event-Triggered Asynchronous Inference for VLA Policies',
    authors: ['Yansong Wu', 'Huaqing Li', 'Tianding Hou', 'Lingyun Chen', 'Alois Knoll'],
    year: 2026,
    arxiv: '2609.22587',
    url: 'https://arxiv.org/abs/2609.22587',
    type: 'paper',
  },
  // lerobot-async-inference-2025: domain pass 2026-10-06, from drafts/manipulation/realtime-execution.citations.ts.
  // Source pack pack-manipulation-3.md#7 for manipulation/realtime-execution; Hugging Face blog,
  // published July 10, 2025; byline read from the page.
  {
    id: 'lerobot-async-inference-2025',
    title: 'Asynchronous Robot Inference: Decoupling Action Prediction and Execution',
    authors: ['Francesco Capuano', 'Steven Palma', 'Michel Aractingi', 'Mustafa Shukor', 'Dana Aubakirova', 'Adil Zouitine', 'Simon Alibert', 'Remi Cadene'],
    year: 2025,
    venue: 'official post',
    url: 'https://huggingface.co/blog/async-robot-inference',
    type: 'blog',
  },
  // soft-rtc-2026: domain pass 2026-10-06, from drafts/manipulation/realtime-execution.citations.ts.
  // Source pack pack-manipulation-3.md#3 for manipulation/realtime-execution.
  {
    id: 'soft-rtc-2026',
    title: 'Action-Prior Denoising for Smooth Real-Time Chunking',
    authors: ['Dongyang Liu', 'Zhaowen Zheng', 'Yu Sun', 'Longxu Zhang', 'Yixuan Liu', 'Hao Wan'],
    year: 2026,
    arxiv: '2605.25537',
    url: 'https://arxiv.org/abs/2605.25537',
    type: 'paper',
  },
  // faster-flow-vla-2026: domain pass 2026-10-06, from drafts/manipulation/realtime-execution.citations.ts.
  // Source pack pack-manipulation-3.md#11 for manipulation/realtime-execution.
  {
    id: 'faster-flow-vla-2026',
    title: 'FASTER: Rethinking Real-Time Flow VLAs',
    authors: ['Yuxiang Lu', 'Zhe Liu', 'Xianzhe Fan', 'Zhenya Yang', 'Jinghua Hou', 'Junyi Li', 'Kaixin Ding', 'Hengshuang Zhao'],
    year: 2026,
    arxiv: '2603.19199',
    url: 'https://arxiv.org/abs/2603.19199',
    type: 'paper',
  },
  // ire-vla-2025: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#27 for manipulation/rl-finetuning.
  {
    id: 'ire-vla-2025',
    title: 'Improving Vision-Language-Action Model with Online Reinforcement Learning',
    authors: ['Yanjiang Guo', 'Jianke Zhang', 'Xiaoyu Chen', 'Xiang Ji', 'Yen-Jen Wang', 'Yucheng Hu', 'Jianyu Chen'],
    year: 2025,
    venue: 'ICRA 2025',
    arxiv: '2501.16664',
    url: 'https://arxiv.org/abs/2501.16664',
    type: 'paper',
  },
  // ddpo-2023: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#2 for manipulation/rl-finetuning.
  {
    id: 'ddpo-2023',
    title: 'Training Diffusion Models with Reinforcement Learning',
    authors: ['Kevin Black', 'Michael Janner', 'Yilun Du', 'Ilya Kostrikov', 'Sergey Levine'],
    year: 2023,
    arxiv: '2305.13301',
    url: 'https://arxiv.org/abs/2305.13301',
    type: 'paper',
  },
  // reinflow-2025: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#6 for manipulation/rl-finetuning.
  {
    id: 'reinflow-2025',
    title: 'ReinFlow: Fine-tuning Flow Matching Policy with Online Reinforcement Learning',
    authors: ['Tonghe Zhang', 'Chao Yu', 'Sichang Su', 'Yu Wang'],
    year: 2025,
    arxiv: '2505.22094',
    url: 'https://arxiv.org/abs/2505.22094',
    type: 'paper',
  },
  // fpo-2025: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#7 for manipulation/rl-finetuning.
  {
    id: 'fpo-2025',
    title: 'Flow Matching Policy Gradients',
    authors: ['David McAllister', 'Songwei Ge', 'Brent Yi', 'Chung Min Kim', 'Ethan Weber', 'Hongsuk Choi', 'Haiwen Feng', 'Angjoo Kanazawa'],
    year: 2025,
    arxiv: '2507.21053',
    url: 'https://arxiv.org/abs/2507.21053',
    type: 'paper',
  },
  // pa-rl-2024: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts; also drafts/rl-sim2real/offline-rl.citations.ts.
  // Source pack pack-manipulation-4.md#10 for manipulation/rl-finetuning; same source and id also
  // proposed in drafts/rl-sim2real/offline-rl.citations.ts; register once.
  {
    id: 'pa-rl-2024',
    title: 'Policy Agnostic RL: Offline RL and Online RL Fine-Tuning of Any Class and Backbone',
    authors: ['Max Sobol Mark', 'Tian Gao', 'Georgia Gabriela Sampaio', 'Mohan Kumar Srirama', 'Archit Sharma', 'Chelsea Finn', 'Aviral Kumar'],
    year: 2024,
    arxiv: '2412.06685',
    url: 'https://arxiv.org/abs/2412.06685',
    type: 'paper',
  },
  // grpo-2024: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#5 for manipulation/rl-finetuning.
  {
    id: 'grpo-2024',
    title: 'DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models',
    authors: ['Zhihong Shao', 'Peiyi Wang', 'Qihao Zhu', 'Runxin Xu', 'Junxiao Song', 'Xiao Bi', 'Haowei Zhang', 'Mingchuan Zhang', 'Y. K. Li', 'Y. Wu', 'Daya Guo'],
    year: 2024,
    arxiv: '2402.03300',
    url: 'https://arxiv.org/abs/2402.03300',
    type: 'paper',
  },
  // cfg-2022: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#13 for manipulation/rl-finetuning.
  {
    id: 'cfg-2022',
    title: 'Classifier-Free Diffusion Guidance',
    authors: ['Jonathan Ho', 'Tim Salimans'],
    year: 2022,
    arxiv: '2207.12598',
    url: 'https://arxiv.org/abs/2207.12598',
    type: 'paper',
  },
  // awr-2019: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#12 for manipulation/rl-finetuning.
  {
    id: 'awr-2019',
    title: 'Advantage-Weighted Regression: Simple and Scalable Off-Policy Reinforcement Learning',
    authors: ['Xue Bin Peng', 'Aviral Kumar', 'Grace Zhang', 'Sergey Levine'],
    year: 2019,
    arxiv: '1910.00177',
    url: 'https://arxiv.org/abs/1910.00177',
    type: 'paper',
  },
  // residual-rl-2018: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#23 for manipulation/rl-finetuning.
  {
    id: 'residual-rl-2018',
    title: 'Residual Reinforcement Learning for Robot Control',
    authors: ['Tobias Johannink', 'Shikhar Bahl', 'Ashvin Nair', 'Jianlan Luo', 'Avinash Kumar', 'Matthias Loskyll', 'Juan Aparicio Ojea', 'Eugen Solowjow', 'Sergey Levine'],
    year: 2018,
    arxiv: '1812.03201',
    url: 'https://arxiv.org/abs/1812.03201',
    type: 'paper',
  },
  // lwd-2026: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#21 for manipulation/rl-finetuning.
  {
    id: 'lwd-2026',
    title: 'Learning While Deploying: Fleet-Scale Reinforcement Learning for Generalist Robot Policies',
    authors: ['Yi Wang', 'Xinchen Li', 'Pengwei Xie', 'Pu Yang', 'Buqing Nie', 'Yunuo Cai', 'Qinglin Zhang', 'Chendi Qu', 'Jeffrey Wu', 'Jianheng Song', 'Xinlin Ren', 'Jingshun Huang', 'Mingjie Pan', 'Siyuan Feng', 'Zhi Chen', 'Jianlan Luo'],
    year: 2026,
    arxiv: '2605.00416',
    url: 'https://arxiv.org/abs/2605.00416',
    type: 'paper',
  },
  // simplevla-rl-2025: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#30 for manipulation/rl-finetuning.
  {
    id: 'simplevla-rl-2025',
    title: 'SimpleVLA-RL: Scaling VLA Training via Reinforcement Learning',
    authors: ['Haozhan Li', 'Yuxin Zuo', 'Jiale Yu', 'Yuhao Zhang', 'Zhaohui Yang', 'Kaiyan Zhang', 'Xuekai Zhu', 'Yuchen Zhang', 'Tianxing Chen', 'Ganqu Cui', 'Dehui Wang', 'Dingxiang Luo', 'Yuchen Fan', 'Youbang Sun', 'Jia Zeng', 'Jiangmiao Pang', 'Shanghang Zhang', 'Yu Wang', 'Yao Mu', 'Bowen Zhou', 'Ning Ding'],
    year: 2025,
    arxiv: '2509.09674',
    url: 'https://arxiv.org/abs/2509.09674',
    type: 'paper',
  },
  // roboreward-2026: domain pass 2026-10-06, from drafts/manipulation/rl-finetuning.citations.ts.
  // Source pack pack-manipulation-4.md#32 for manipulation/rl-finetuning.
  {
    id: 'roboreward-2026',
    title: 'RoboReward: General-Purpose Vision-Language Reward Models for Robotics',
    authors: ['Tony Lee', 'Andrew Wagenmaker', 'Karl Pertsch', 'Percy Liang', 'Sergey Levine', 'Chelsea Finn'],
    year: 2026,
    arxiv: '2601.00675',
    url: 'https://arxiv.org/abs/2601.00675',
    type: 'docs',
  },
  // ecomem-2026: domain pass 2026-10-06, KOL intake note of Jiajun Wu.
  // Abstract page fetched 2026-10-06; submitted 30 September 2026.
  {
    id: 'ecomem-2026',
    title: 'ECoMEM: Explicit Concept Memory for Memory-Dependent Robot Control',
    authors: ['Yize Liu', 'Ke Wang', 'Mac Schwager', 'Yiqing Xu', 'Jiajun Wu'],
    year: 2026,
    arxiv: '2610.00801',
    url: 'https://arxiv.org/abs/2610.00801',
    type: 'paper',
  },
  // rpg-2026: domain pass 2026-10-06, KOL intake note of Pieter Abbeel.
  // Abstract page fetched 2026-10-06; submitted 1 October 2026.
  {
    id: 'rpg-2026',
    title: 'Reconstruct, Practice, Go Real: Guided Self-Improvement for Embodied Agents',
    authors: [
      'Yen-Jen Wang', 'Haozhe Jiang', 'Shuying Deng', 'Haoru Xue', 'Weirui Ye', 'Rocky Duan', 'Nika Haghtalab',
      'S. Shankar Sastry', 'Pieter Abbeel', 'Haozhi Qi',
    ],
    year: 2026,
    arxiv: '2610.02204',
    url: 'https://arxiv.org/abs/2610.02204',
    type: 'paper',
  },
  // lbm-cotraining-2026: domain pass 2026-10-06, owner sweep item VLA.R4 (also KI.R3, HI.R3, CE.R6, FM.R5).
  // Abstract and HTML fetched 2026-10-06; v1 submitted 1 February 2026. Toyota Research Institute
  // per the correspondence address (tri.global) and acknowledgements; no affiliation block is printed.
  {
    id: 'lbm-cotraining-2026',
    title: 'A Systematic Study of Data Modalities and Strategies for Co-training Large Behavior Models for Robot Manipulation',
    authors: [
      'Fanqi Lin', 'Kushal Arora', 'Jean Mercat', 'Haruki Nishimura', 'Paarth Shah', 'Chen Xu', 'Mengchao Zhang',
      'Mark Zolotas', 'Maya Angeles', 'Owen Pfannenstiehl', 'Andrew Beaulieu', 'Jose Barreiros',
    ],
    year: 2026,
    arxiv: '2602.01067',
    url: 'https://arxiv.org/abs/2602.01067',
    type: 'paper',
  },
  // xiaomi-robotics-1-2026: domain pass 2026-10-06, owner sweep item VLA.R5 (also DP.R3).
  // Abstract and HTML fetched 2026-10-06; v1 16 July 2026, v2 22 July 2026.
  {
    id: 'xiaomi-robotics-1-2026',
    title: 'Xiaomi-Robotics-1: Scaling Vision-Language-Action Models with over 100K Hours of Real-World Trajectories',
    authors: [
      'Xiaomi Robotics Team', 'Jun Guo', 'Piaopiao Jin', 'Jason Li', 'Peiyan Li', 'Yingyan Li', 'Futeng Liu',
      'Wanli Peng', 'Optimus Qin', 'Yifei Su', 'Nan Sun', 'Qiao Sun', 'Runze Suo', 'Heyun Wang', 'Yunhong Wang',
      'Rujie Wu', 'Caoyu Xia', 'Lina Zhang', 'Jack Zhao', 'Guoliang Chen', 'Wenlong Chen', 'Xinze He', 'Bin Li',
      'Qing Li', 'Zhuorong Li', 'Heng Qu', 'Wenxuan Song', 'Diyun Xiang', 'Yifan Xie', 'Peiran Xu', 'Hangjun Ye',
      'Wen Ye', 'Han Zhao', 'Quanyun Zhou',
    ],
    year: 2026,
    arxiv: '2607.15330',
    url: 'https://arxiv.org/abs/2607.15330',
    type: 'paper',
  },
  // drifting-models-2026: domain pass 2026-10-06, owner sweep item DP.R2.
  // Abstract and HTML fetched 2026-10-06; v1 4 February 2026, v2 6 February 2026.
  {
    id: 'drifting-models-2026',
    title: 'Generative Modeling via Drifting',
    authors: [
      'Mingyang Deng', 'He Li', 'Tianhong Li', 'Yilun Du', 'Kaiming He',
    ],
    year: 2026,
    arxiv: '2602.04770',
    url: 'https://arxiv.org/abs/2602.04770',
    type: 'paper',
  },
  // realtime-vla-2025: domain pass 2026-10-06, owner sweep item RT.R1.
  // Abstract and HTML fetched 2026-10-06; v1 30 October 2025. Dexmal and StepFun.
  {
    id: 'realtime-vla-2025',
    title: 'Running VLAs at Real-time Speed',
    authors: [
      'Yunchao Ma', 'Yizhuang Zhou', 'Yunhuan Yang', 'Tiancai Wang', 'Haoqiang Fan',
    ],
    year: 2025,
    arxiv: '2510.26742',
    url: 'https://arxiv.org/abs/2510.26742',
    type: 'paper',
  },
  // dm0-2026: domain pass 2026-10-06, owner sweep item KI.R2.
  // Abstract and HTML fetched 2026-10-06; v1 16 February 2026. "DM0 Team, Dexmal & StepFun";
  // the 49 authors are listed alphabetically by the paper.
  {
    id: 'dm0-2026',
    title: 'DM0: An Embodied-Native Vision-Language-Action Model towards Physical AI',
    authors: [
      'En Yu', 'Haoran Lv', 'Jianjian Sun', 'Kangheng Lin', 'Ruitao Zhang', 'Yukang Shi', 'Yuyang Chen', 'Ze Chen',
      'Ziheng Zhang', 'Fan Jia', 'Kaixin Liu', 'Meng Zhang', 'Ruitao Hao', 'Saike Huang', 'Songhan Xie', 'Yu Liu',
      'Zhao Wu', 'Bin Xie', 'Pengwei Zhang', 'Qi Yang', 'Xianchi Deng', 'Yunfei Wei', 'Enwen Zhang', 'Hongyang Peng',
      'Jie Zhao', 'Kai Liu', 'Wei Sun', 'Yajun Wei', 'Yi Yang', 'Yunqiao Zhang', 'Ziwei Yan', 'Haitao Yang',
      'Hao Liu', 'Haoqiang Fan', 'Haowei Zhang', 'Junwen Huang', 'Yang Chen', 'Yunchao Ma', 'Yunhuan Yang',
      'Zhengyuan Du', 'Ziming Liu', 'Jiahui Niu', 'Yucheng Zhao', 'Daxin Jiang', 'Wenbin Tang', 'Xiangyu Zhang',
      'Zheng Ge', 'Erjin Zhou', 'Tiancai Wang',
    ],
    year: 2026,
    arxiv: '2602.14974',
    url: 'https://arxiv.org/abs/2602.14974',
    type: 'paper',
  },
  // actioncodec-2026: domain pass 2026-10-06, owner sweep item AS.R1.
  // Abstract and HTML fetched 2026-10-06; v1 17 February 2026.
  {
    id: 'actioncodec-2026',
    title: 'ActionCodec: What Makes for Good Action Tokenizers',
    authors: [
      'Zibin Dong', 'Yicheng Liu', 'Shiduo Zhang', 'Baijun Ye', 'Yifu Yuan', 'Fei Ni', 'Jingjing Gong', 'Xipeng Qiu',
      'Hang Zhao', 'Yinchuan Li', 'Jianye Hao',
    ],
    year: 2026,
    arxiv: '2602.15397',
    url: 'https://arxiv.org/abs/2602.15397',
    type: 'paper',
  },
  // factr-2-2026: domain pass 2026-10-06, owner sweep item AS.R4.
  // Abstract and HTML fetched 2026-10-06; v1 10 June 2026, v2 12 August 2026. Carnegie Mellon University
  // and Waseda University.
  {
    id: 'factr-2-2026',
    title: 'FACTR 2: Learning External Force Sensing for Commodity Robot Arms Improves Policy Learning',
    authors: [
      'Steven Oh', 'Jason Jingzhou Liu', 'Tony Tao', 'Philip Han', 'Kenneth Shaw', 'Satoshi Funabashi',
      'Ruslan Salakhutdinov', 'Deepak Pathak',
    ],
    year: 2026,
    arxiv: '2606.12406',
    url: 'https://arxiv.org/abs/2606.12406',
    type: 'paper',
  },
  // recova-2026: domain pass 2026-10-06, KOL intake note of Linxi Fan.
  // Abstract and HTML fetched 2026-10-06; v1 submitted 1 October 2026. UC San Diego, UT Austin and NVIDIA.
  {
    id: 'recova-2026',
    title: 'Recova: Agent-Guided Failure Recovery for Autonomous Robotic Manipulation',
    authors: [
      'Isabella Liu', 'An-Chieh Cheng', 'Johan Bjorck', 'Zhiding Yu', 'Hongxu Yin', 'Jan Kautz', 'Linxi Fan',
      'Yuke Zhu', 'Sifei Liu',
    ],
    year: 2026,
    arxiv: '2610.01178',
    url: 'https://arxiv.org/abs/2610.01178',
    type: 'paper',
  },
  // rebarsim-2026: domain pass 2026-10-06, KOL intake note of Abhishek Gupta.
  // Abstract and HTML fetched 2026-10-06; v1 submitted 17 September 2026. University of Washington, McGill
  // University and Princeton University; corresponding author Yi Shao (McGill).
  {
    id: 'rebarsim-2026',
    title: 'Visual Sim-to-Real Learning for Robotic Insertion under Geometric Variations: Application to Rebar Installation',
    authors: [
      'Tao Sun', 'Beining Han', 'Patrick Yin', 'Rui Xu', 'Harry He', 'Abhishek Gupta', 'Szymon Rusinkiewicz',
      'Yi Shao',
    ],
    year: 2026,
    arxiv: '2609.20477',
    url: 'https://arxiv.org/abs/2609.20477',
    type: 'paper',
  },
  // seeq-2026: domain pass 2026-10-06, KOL intake note of Aviral Kumar.
  // Abstract and HTML fetched 2026-10-06; v1 18 September 2026, v2 27 September 2026. Carnegie Mellon University.
  {
    id: 'seeq-2026',
    title: 'SeeQ: Training Generalist Value Functions for Long-Horizon Robotic Manipulation',
    authors: [
      'Saksham Singh', 'Zheyuan Hu', 'Max Sobol Mark', 'Jeffrey Yu', 'Zackory Erickson', 'Aviral Kumar',
    ],
    year: 2026,
    arxiv: '2609.22085',
    url: 'https://arxiv.org/abs/2609.22085',
    type: 'paper',
  },
  // bilinear-flow-policy-2026: domain pass 2026-10-06, KOL intake note of Abhishek Gupta.
  // Abstract and HTML fetched 2026-10-06; v1 submitted 5 October 2026. Georgia Institute of Technology,
  // Toyota Research Institute and University of Washington.
  {
    id: 'bilinear-flow-policy-2026',
    title: 'Bilinear Flow Policy: Distributional Extrapolation for Goal-Conditioned Visuomotor Imitation',
    authors: [
      'Wonsuhk Jung', 'Sundhar Vinodh Sangeetha', 'Chen Xu', 'Abhishek Gupta', 'Masha Itkina', 'Shreyas Kousik',
      'Haruki Nishimura',
    ],
    year: 2026,
    arxiv: '2610.05765',
    url: 'https://arxiv.org/abs/2610.05765',
    type: 'paper',
  },
  // ditto-x-2026: domain pass 2026-10-06, KOL intake note of Jiajun Wu.
  // Abstract and HTML fetched 2026-10-06; v1 30 September 2026, v2 5 October 2026. Stanford University and
  // Columbia University.
  {
    id: 'ditto-x-2026',
    title: 'DITTO-X: Forward and Reverse Teleoperation for Dexterous Manipulation and Human Intervention',
    authors: [
      'Zhanpeng He', 'Joaquin Palacios', 'Zhangyu Wang', 'Chenhao Li', 'Katelyn Lee', 'Matei Ciocarlie',
      'C. Karen Liu', 'Jiajun Wu',
    ],
    year: 2026,
    arxiv: '2610.00781',
    url: 'https://arxiv.org/abs/2610.00781',
    type: 'paper',
  },
  // gott-2026: domain pass 2026-10-06, KOL intake note of Pieter Abbeel.
  // Abstract and HTML fetched 2026-10-06; v1 submitted 2 October 2026. Amazon FAR, UC San Diego, UC Berkeley
  // and University of Chicago.
  {
    id: 'gott-2026',
    title: 'GOTT: Object-centric Dexterous Manipulation with a Reusable Cross-Embodiment Primitive',
    authors: [
      'Yulin Liu', 'Lai Wei', 'Yen-Jen Wang', 'Akash Sharma', 'Pieter Abbeel', 'Henrik I. Christensen', 'Haozhi Qi',
    ],
    year: 2026,
    arxiv: '2610.03861',
    url: 'https://arxiv.org/abs/2610.03861',
    type: 'paper',
  },
  // roth-mooring-ravani-1987: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // IEEE J. Robotics and Automation 3(5), 1987. "Modeling, measurement, identification, and
  // correction issues in robot calibration are discussed".
  {
    id: 'roth-mooring-ravani-1987',
    title: 'An overview of robot calibration',
    authors: ['Z. Roth', 'B. Mooring', 'B. Ravani'],
    year: 1987,
    venue: 'IEEE J. Robotics and Automation',
    url: 'https://doi.org/10.1109/JRA.1987.1087124',
    type: 'paper',
  },
  // halo-payload-2026: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts; also drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2603.15084. Two stages: calibrate the nominal model, then identify the unknown payload's
  // mass distribution.
  {
    id: 'halo-payload-2026',
    title: 'HALO: Closing Sim-to-Real Gap for Heavy-loaded Humanoid Agile Motion Skills via Differentiable Simulation',
    authors: ['Xingyi Wang', 'Chenyun Zhang', 'Weiji Xie', 'Chao Yu', 'Wei Song', 'Chenjia Bai', 'Shiqiang Zhu'],
    year: 2026,
    arxiv: '2603.15084',
    url: 'https://arxiv.org/abs/2603.15084',
    type: 'paper',
  },
  // kannala-brandt-2006: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // IEEE TPAMI 28(8), 2006. Crossref byline: J. Kannala, S.S. Brandt.
  {
    id: 'kannala-brandt-2006',
    title: 'A generic camera model and calibration method for conventional, wide-angle, and fish-eye lenses',
    authors: ['J. Kannala', 'S. S. Brandt'],
    year: 2006,
    venue: 'IEEE TPAMI',
    url: 'https://doi.org/10.1109/TPAMI.2006.153',
    type: 'paper',
  },
  // anycalib-2025: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2503.12701 (ICCV 2025). Single in-the-wild image; pinhole, Brown-Conrady and
  // Kannala-Brandt models.
  {
    id: 'anycalib-2025',
    title: 'AnyCalib: On-Manifold Learning for Model-Agnostic Single-View Camera Calibration',
    authors: ['Javier Tirado-Garín', 'Javier Civera'],
    year: 2025,
    venue: 'ICCV 2025',
    arxiv: '2503.12701',
    url: 'https://arxiv.org/abs/2503.12701',
    type: 'paper',
  },
  // khoshelham-kinect-2012: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // Sensors 12(2), 2012. Random error "ranges from a few millimeters up to about 4 cm at the maximum
  // range of the sensor."
  {
    id: 'khoshelham-kinect-2012',
    title: 'Accuracy and Resolution of Kinect Depth Data for Indoor Mapping Applications',
    authors: ['Kourosh Khoshelham', 'Sander Oude Elberink'],
    year: 2012,
    venue: 'Sensors',
    url: 'https://doi.org/10.3390/s120201437',
    type: 'paper',
  },
  // herrera-depth-color-2012: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // IEEE TPAMI 34(10), 2012. Crossref byline prints "Janne Heikkila" without the diaeresis.
  {
    id: 'herrera-depth-color-2012',
    title: 'Joint Depth and Color Camera Calibration with Distortion Correction',
    authors: ['Daniel Herrera C.', 'Juho Kannala', 'Janne Heikkila'],
    year: 2012,
    venue: 'IEEE TPAMI',
    url: 'https://doi.org/10.1109/TPAMI.2012.125',
    type: 'paper',
  },
  // camera-depth-models-2025: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2509.02530. "CDMs achieve nearly simulation-level accuracy in depth prediction".
  {
    id: 'camera-depth-models-2025',
    title: 'Manipulation as in Simulation: Enabling Accurate Geometry Perception in Robots',
    authors: ['Minghuan Liu', 'Zhengbang Zhu', 'Xiaoshen Han', 'Peng Hu', 'Haotong Lin', 'Xinyao Li', 'Jingxiao Chen', 'Jiafeng Xu', 'Yichu Yang', 'Yunfeng Lin', 'Xinghang Li', 'Yong Yu', 'Weinan Zhang', 'Tao Kong', 'Bingyi Kang'],
    year: 2025,
    arxiv: '2509.02530',
    url: 'https://arxiv.org/abs/2509.02530',
    type: 'paper',
  },
  // park-martin-1994: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts; also drafts/classical/perception.citations.ts.
  // IEEE T-RA 10(5), 1994. Closed-form exact and least-squares AX=XB solutions via Lie theory.
  {
    id: 'park-martin-1994',
    title: 'Robot sensor calibration: solving AX=XB on the Euclidean group',
    authors: ['F. C. Park', 'B. J. Martin'],
    year: 1994,
    venue: 'IEEE Trans. Robotics and Automation',
    url: 'https://doi.org/10.1109/70.326576',
    type: 'paper',
  },
  // daniilidis-1999: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts; also drafts/classical/perception.citations.ts.
  // IJRR 18(3), 1999. Simultaneous rotation and translation via SVD.
  {
    id: 'daniilidis-1999',
    title: 'Hand-Eye Calibration Using Dual Quaternions',
    authors: ['Konstantinos Daniilidis'],
    year: 1999,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/02783649922066213',
    type: 'paper',
  },
  // apriltag-2011: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // ICRA 2011. "allowing full 6 DOF localization of features from a single image".
  {
    id: 'apriltag-2011',
    title: 'AprilTag: A robust and flexible visual fiducial system',
    authors: ['Edwin Olson'],
    year: 2011,
    venue: 'ICRA 2011',
    url: 'https://doi.org/10.1109/ICRA.2011.5979561',
    type: 'paper',
  },
  // opencv-hand-eye-docs-2026: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts; also drafts/classical/perception.citations.ts.
  // calibrateHandEye: "A minimum of 2 motions with non parallel rotation axes are necessary ... So
  // at least 3 different poses are required, but it is strongly recommended to use many more poses."
  // docs.opencv.org returned 403 to the generic UA on 2026-10-04; the same text was matched in
  // opencv/opencv 4.x modules/calib3d/include/opencv2/calib3d.hpp.
  {
    id: 'opencv-hand-eye-docs-2026',
    title: 'Camera Calibration and 3D Reconstruction: calibrateHandEye',
    authors: ['OpenCV'],
    year: 2026,
    venue: 'OpenCV 4.x Documentation, as of 2026-10-04',
    url: 'https://docs.opencv.org/4.x/d9/d0c/group__calib3d.html',
    type: 'docs',
  },
  // moveit-hand-eye-tutorial-2026: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // "The calibration will improve significantly with a few more samples, and will typically plateau
  // after about 12 or 15 samples." Matched 2026-10-04.
  {
    id: 'moveit-hand-eye-tutorial-2026',
    title: 'Hand-Eye Calibration',
    authors: ['MoveIt Maintainers'],
    year: 2026,
    venue: 'MoveIt Documentation, as of 2026-10-04',
    url: 'https://moveit.picknik.ai/main/doc/examples/hand_eye_calibration/hand_eye_calibration_tutorial.html',
    type: 'docs',
  },
  // dream-2019: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 1911.09231 (ICRA 2020). Single-frame accuracy "comparable to that of classic off-line
  // hand-eye calibration using multiple frames."
  {
    id: 'dream-2019',
    title: 'Camera-to-Robot Pose Estimation from a Single Image',
    authors: ['Timothy E. Lee', 'Jonathan Tremblay', 'Thang To', 'Jia Cheng', 'Terry Mosier', 'Oliver Kroemer', 'Dieter Fox', 'Stan Birchfield'],
    year: 2019,
    venue: 'ICRA 2020',
    arxiv: '1911.09231',
    url: 'https://arxiv.org/abs/1911.09231',
    type: 'paper',
  },
  // easyhec-2023: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2305.01191; IEEE RA-L 8 (2023) 7234-7241.
  {
    id: 'easyhec-2023',
    title: 'EasyHeC: Accurate and Automatic Hand-eye Calibration via Differentiable Rendering and Space Exploration',
    authors: ['Linghao Chen', 'Yuzhe Qin', 'Xiaowei Zhou', 'Hao Su'],
    year: 2023,
    venue: 'IEEE Robotics and Automation Letters',
    arxiv: '2305.01191',
    url: 'https://arxiv.org/abs/2305.01191',
    type: 'paper',
  },
  // kalib-2024: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2408.10562. Prerequisites: "the robot's kinematic chain and a predefined reference point
  // on the robot."
  {
    id: 'kalib-2024',
    title: 'Kalib: Easy Hand-Eye Calibration with Reference Point Tracking',
    authors: ['Tutian Tang', 'Minghao Liu', 'Wenqiang Xu', 'Cewu Lu'],
    year: 2024,
    arxiv: '2408.10562',
    url: 'https://arxiv.org/abs/2408.10562',
    type: 'paper',
  },
  // hydra-hand-eye-2025: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2504.20584. "5 mm in task space" against "7 mm in task space".
  {
    id: 'hydra-hand-eye-2025',
    title: 'Hydra: Marker-Free RGB-D Hand-Eye Calibration',
    authors: ['Martin Huber', 'Huanyu Tian', 'Christopher E. Mower', 'Lucas-Raphael Müller', 'Sébastien Ourselin', 'Christos Bergeles', 'Tom Vercauteren'],
    year: 2025,
    arxiv: '2504.20584',
    url: 'https://arxiv.org/abs/2504.20584',
    type: 'paper',
  },
  // drhec-2026: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2609.36779; IEEE Trans. Instrumentation and Measurement 75 (2026), Art. 7505816. 88.9%
  // grasping, +46.3 points over EasyHeC (authors' claim).
  {
    id: 'drhec-2026',
    title: 'DRHeC: Differentiable Rendering for Hand-Eye Calibration with RGB-Based Gradients',
    authors: ['Xiaotian Zhang', 'Yusheng Wang', 'Naoya Kagawa', 'Noritaka Takamura', 'Keiji Okuhara', 'Hiroyasu Baba', 'Jun Ota'],
    year: 2026,
    venue: 'IEEE Trans. Instrumentation and Measurement',
    arxiv: '2609.36779',
    url: 'https://arxiv.org/abs/2609.36779',
    type: 'paper',
  },
  // humanoid-geometric-calibration-2025: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2507.16369. 31 optimal postures; RMS error reduced by a factor of 2.3 against the
  // manufacturer's model.
  {
    id: 'humanoid-geometric-calibration-2025',
    title: 'Humanoid Robot Whole-body Geometric Calibration with Embedded Sensors and a Single Plane',
    authors: ['Thanh D V Nguyen', 'Vincent Bonnet', 'Pierre Fernbach', 'David Daney', 'Florent Lamiraux'],
    year: 2025,
    arxiv: '2507.16369',
    url: 'https://arxiv.org/abs/2507.16369',
    type: 'paper',
  },
  // omnicalib-2026: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2609.19582. Left-wrist correction 10.56 mm and 1.74 degrees relative to CAD; writes only
  // supported corrections.
  {
    id: 'omnicalib-2026',
    title: 'OmniCalib: Target-Free, Task-Structured Self-Calibration for Humanoid Robots',
    authors: ['Kaixiang Lu', 'Haiyu Lan', 'Chunxiao Qiao', 'You Li', 'Enyu Li', 'Yehao Lu', 'Jiarui Yang', 'Peiwen Lin', 'Chuang Wang'],
    year: 2026,
    arxiv: '2609.19582',
    url: 'https://arxiv.org/abs/2609.19582',
    type: 'paper',
  },
  // ieee-1588-2019: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // IEEE SA standard page, matched 2026-10-04: "The protocol supports synchronization accuracy and
  // precision in the sub-microsecond range". Board approval 2019-11-07; published 2020-06-16.
  {
    id: 'ieee-1588-2019',
    title: 'IEEE 1588-2019: Standard for a Precision Clock Synchronization Protocol for Networked Measurement and Control Systems',
    authors: ['IEEE Standards Association'],
    year: 2019,
    venue: 'IEEE Standard',
    url: 'https://standards.ieee.org/ieee/1588/6825/',
    type: 'docs',
  },
  // realtime-vla-v2-2026: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2603.26360. Delay table for the DOS W1 rig (RealSense D435, Airbot Play): t_camera 55 ms,
  // t_proprio 50 ms, t_motion 150 ms.
  {
    id: 'realtime-vla-v2-2026',
    title: 'Realtime-VLA V2: Learning to Run VLAs Fast, Smooth, and Accurate',
    authors: ['Chen Yang', 'Yucheng Hu', 'Yunchao Ma', 'Yunhuan Yang', 'Jing Tan', 'Haoqiang Fan'],
    year: 2026,
    arxiv: '2603.26360',
    url: 'https://arxiv.org/abs/2603.26360',
    type: 'paper',
  },
  // atkeson-an-hollerbach-1986: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // IJRR 5(3), 1986. Identified parameters beat CAD-derived predictions.
  {
    id: 'atkeson-an-hollerbach-1986',
    title: 'Estimation of Inertial Parameters of Manipulator Loads and Links',
    authors: ['Christopher G. Atkeson', 'Chae H. An', 'John M. Hollerbach'],
    year: 1986,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/027836498600500306',
    type: 'paper',
  },
  // swevers-excitation-1997: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // IEEE T-RA 13(5), 1997. Finite Fourier series excitation optimized for parameter uncertainty.
  {
    id: 'swevers-excitation-1997',
    title: 'Optimal robot excitation and identification',
    authors: ['J. Swevers', 'C. Ganseman', 'D. B. Tukel', 'J. de Schutter', 'H. Van Brussel'],
    year: 1997,
    venue: 'IEEE Trans. Robotics and Automation',
    url: 'https://doi.org/10.1109/70.631234',
    type: 'paper',
  },
  // gaz-panda-dynamics-2019: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // IEEE RA-L 4(4), 2019. First identification of the Panda's dynamic coefficients, friction model
  // and feasible parameters.
  {
    id: 'gaz-panda-dynamics-2019',
    title: 'Dynamic Identification of the Franka Emika Panda Robot With Retrieval of Feasible Parameters Using Penalty-Based Optimization',
    authors: ['Claudio Gaz', 'Marco Cognetti', 'Alexander Oliva', 'Paolo Robuffo Giordano', 'Alessandro De Luca'],
    year: 2019,
    venue: 'IEEE Robotics and Automation Letters',
    url: 'https://doi.org/10.1109/LRA.2019.2931248',
    type: 'paper',
  },
  // spi-active-2025: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts; also drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2505.14266. "outperforming baselines by 42-63% in various locomotion tasks."
  {
    id: 'spi-active-2025',
    title: 'Sampling-Based System Identification with Active Exploration for Legged Robot Sim2Real Learning',
    authors: ['Nikhil Sobanbabu', 'Guanqi He', 'Tairan He', 'Yuxiang Yang', 'Guanya Shi'],
    year: 2025,
    arxiv: '2505.14266',
    url: 'https://arxiv.org/abs/2505.14266',
    type: 'paper',
  },
  // bjelonic-sim2real-2025: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2509.06342; IJRR 2026. Three primary platforms plus ten more robots, without randomization
  // of dynamic parameters.
  {
    id: 'bjelonic-sim2real-2025',
    title: 'Towards bridging the gap: Systematic sim-to-real transfer for diverse legged robots',
    authors: ['Filip Bjelonic', 'Fabian Tischhauser', 'Marco Hutter'],
    year: 2025,
    venue: 'Int. J. Robotics Research',
    arxiv: '2509.06342',
    url: 'https://arxiv.org/abs/2509.06342',
    type: 'paper',
  },
  // calib-all-2025: domain pass 2026-10-06, from drafts/classical/calibration.citations.ts.
  // arXiv 2511.17001 ("CalibAll"). 16 datasets, 4 robot platforms, about 97K calibrated episodes.
  {
    id: 'calib-all-2025',
    title: 'Unify Robot Actions in Camera Frame',
    authors: ['Sicheng Xie', 'Lingchen Meng', 'Zijie Diao', 'Haidong Cao', 'Zhiying Du', 'Shuyuan Tu', 'Jiaqi Leng', 'Qiuyue Wang', 'Mingsheng Li', 'Shuai Bai', 'Zuxuan Wu', 'Yu-Gang Jiang'],
    year: 2025,
    arxiv: '2511.17001',
    url: 'https://arxiv.org/abs/2511.17001',
    type: 'paper',
  },
  // fbs-2020: domain pass 2026-10-06, from drafts/classical/control.citations.ts.
  // Official free electronic edition, Version v3.1.5 (2020-07-24), linked from fbswiki.org; PDF text
  // read 2026-10-04. Chapter epigraph: "Based on a survey of over eleven thousand controllers in the
  // refining, chemicals and pulp and paper industries, 97% of regulatory controllers utilize a PID
  // feedback control algorithm. L. Desborough and R. Miller, 2002"; "a controller with integral
  // action has zero steady-state error"; "an effect known as "integrator windup" can occur and may
  // result in poor performance unless appropriate "anti-windup" compensation is used".
  {
    id: 'fbs-2020',
    title: 'Feedback Systems: An Introduction for Scientists and Engineers (Second Edition)',
    authors: ['Karl Johan Åström', 'Richard M. Murray'],
    year: 2020,
    venue: 'Princeton University Press (electronic edition v3.1.5)',
    url: 'https://fbswiki.org/wiki/index.php/Main_Page',
    type: 'docs',
  },
  // berkeley-humanoid-2024: domain pass 2026-10-06, from drafts/classical/control.citations.ts.
  // arXiv 2407.21781 v1 2024-07-31. HTML body: "The RL policy executes at 50 Hz, the state estimator
  // at 1 kHz, and the PD controller at 25 kHz."
  {
    id: 'berkeley-humanoid-2024',
    title: 'Berkeley Humanoid: A Research Platform for Learning-based Control',
    authors: ['Qiayuan Liao', 'Bike Zhang', 'Xuanyu Huang', 'Xiaoyu Huang', 'Zhongyu Li', 'Koushil Sreenath'],
    year: 2024,
    venue: 'arXiv preprint',
    arxiv: '2407.21781',
    url: 'https://arxiv.org/abs/2407.21781',
    type: 'paper',
  },
  // koenemann-2015: domain pass 2026-10-06, from drafts/classical/control.citations.ts.
  // Crossref 10.1109/IROS.2015.7353843 (IROS 2015); byline printed with initials. Pack quote: "It is
  // the first time that such a whole-body model predictive controller is applied in real-time on a
  // complex dynamic robot."
  {
    id: 'koenemann-2015',
    title: 'Whole-body model-predictive control applied to the HRP-2 humanoid',
    authors: ['J. Koenemann', 'A. Del Prete', 'Y. Tassa', 'E. Todorov', 'O. Stasse', 'M. Bennewitz', 'N. Mansard'],
    year: 2015,
    venue: 'IROS 2015',
    url: 'https://doi.org/10.1109/IROS.2015.7353843',
    type: 'paper',
  },
  // neunert-2018: domain pass 2026-10-06, from drafts/classical/control.citations.ts.
  // Crossref 10.1109/LRA.2018.2800124 (IEEE RA-L 2018). Pack quote: "allows for running the
  // nonlinear Optimal Control solver at rates up to 190 Hz on a quadruped for a time horizon of half
  // a second."
  {
    id: 'neunert-2018',
    title: 'Whole-Body Nonlinear Model Predictive Control Through Contacts for Quadrupeds',
    authors: ['Michael Neunert', 'Markus Stauble', 'Markus Giftthaler', 'Carmine D. Bellicoso', 'Jan Carius', 'Christian Gehring', 'Marco Hutter', 'Jonas Buchli'],
    year: 2018,
    venue: 'IEEE Robotics and Automation Letters',
    url: 'https://doi.org/10.1109/LRA.2018.2800124',
    type: 'paper',
  },
  // dial-mpc-2024: domain pass 2026-10-06, from drafts/classical/control.citations.ts; also drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2409.15610 v1 2024-09-23 (submitted to ICRA 2025). "outperforms reinforcement learning
  // (RL) policies by $50\%$ in challenging climbing tasks without any training"; "To the best of our
  // knowledge, DIAL-MPC is the first training-free method that optimizes over full-order quadruped
  // dynamics in real-time."
  {
    id: 'dial-mpc-2024',
    title: 'Full-Order Sampling-Based MPC for Torque-Level Locomotion Control via Diffusion-Style Annealing',
    authors: ['Haoru Xue', 'Chaoyi Pan', 'Zeji Yi', 'Guannan Qu', 'Guanya Shi'],
    year: 2024,
    venue: 'arXiv preprint (ICRA 2025)',
    arxiv: '2409.15610',
    url: 'https://arxiv.org/abs/2409.15610',
    type: 'paper',
  },
  // escande-2014: domain pass 2026-10-06, from drafts/classical/control.citations.ts.
  // Crossref 10.1177/0278364914521306 (IJRR 2014). Pack quote: "can consider inequalities at any
  // level while running at the typical control frequency on whole-body size problems."
  {
    id: 'escande-2014',
    title: 'Hierarchical quadratic programming: Fast online humanoid-robot motion generation',
    authors: ['Adrien Escande', 'Nicolas Mansard', 'Pierre-Brice Wieber'],
    year: 2014,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/0278364914521306',
    type: 'paper',
  },
  // kuindersma-2015: domain pass 2026-10-06, from drafts/classical/control.citations.ts.
  // Crossref 10.1007/s10514-015-9479-3 (Autonomous Robots, 2015). Pack quote: "we describe several
  // novel applications of convex, mixed-integer, and sparse nonlinear optimization to problems
  // ranging from footstep placement to whole-body planning and control."
  {
    id: 'kuindersma-2015',
    title: 'Optimization-based locomotion planning, estimation, and control design for the atlas humanoid robot',
    authors: ['Scott Kuindersma', 'Robin Deits', 'Maurice Fallon', 'Andrés Valenzuela', 'Hongkai Dai', 'Frank Permenter', 'Twan Koolen', 'Pat Marion', 'Russ Tedrake'],
    year: 2015,
    venue: 'Autonomous Robots',
    url: 'https://doi.org/10.1007/s10514-015-9479-3',
    type: 'paper',
  },
  // geiger-impedance-2025: domain pass 2026-10-06, from drafts/classical/control.citations.ts.
  // arXiv 2509.19696 v1 2025-09-24. "adapt impedance online through directional stiffness and
  // damping modulation"; "Deployed in real-time torque control on a KUKA LBR iiwa, the approach
  // enables smooth obstacle traversal and generalizes to unseen tasks, achieving 100% success in
  // multi-geometry peg-in-hole insertion."
  {
    id: 'geiger-impedance-2025',
    title: 'Diffusion-Based Impedance Learning for Contact-Rich Manipulation Tasks',
    authors: ['Noah Geiger', 'Tamim Asfour', 'Neville Hogan', 'Johannes Lachner'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2509.19696',
    url: 'https://arxiv.org/abs/2509.19696',
    type: 'paper',
  },
  // hartmann-iso-2026: domain pass 2026-10-06, from drafts/classical/control.citations.ts.
  // Crossref 10.1016/j.rineng.2026.110486 (Results in Engineering, 2026). Pack quote: "the full
  // normative assimilation of the technical specification ISO/TS 15066". The Elsevier page returned
  // 403 and Crossref carries no abstract on 2026-10-04; relies on the pack researcher's read.
  {
    id: 'hartmann-iso-2026',
    title: 'Evolution of safety requirements in industrial robotics: Comparative analysis of ISO 10218-1/2 (2011 vs. 2025) and integration of ISO/TS 15066',
    authors: ['Daniel Hartmann', 'Kristýna Hamříková', 'Aleš Vysocký', 'Vendula Laciok', 'Aleš Bernatík'],
    year: 2026,
    venue: 'Results in Engineering',
    url: 'https://doi.org/10.1016/j.rineng.2026.110486',
    type: 'paper',
  },
  // safety-filter-2023: domain pass 2026-10-06, from drafts/classical/control.citations.ts.
  // arXiv 2309.05837 v1 2023-09-11 (Annual Review of Control, Robotics, and Autonomous Systems).
  // "emerging data-driven approaches tend to lack well-understood guarantees, which can result in
  // unpredictable catastrophic failures"; "This article provides a review of safety filter
  // approaches".
  {
    id: 'safety-filter-2023',
    title: 'The Safety Filter: A Unified View of Safety-Critical Control in Autonomous Systems',
    authors: ['Kai-Chieh Hsu', 'Haimin Hu', 'Jaime Fernández Fisac'],
    year: 2023,
    venue: 'Annual Review of Control, Robotics, and Autonomous Systems',
    arxiv: '2309.05837',
    url: 'https://arxiv.org/abs/2309.05837',
    type: 'paper',
  },
  // ishihara-2024: domain pass 2026-10-06, from drafts/classical/control.citations.ts.
  // arXiv 2409.08488 v1 2024-09-13. "The simulation-to-real gap problem and the high computational
  // burden of whole-body Model Predictive Control (whole-body MPC) continue to present challenges";
  // "an augmented model using a deep residual network is trained by model-based reinforcement
  // learning".
  {
    id: 'ishihara-2024',
    title: 'Hierarchical Learning Framework for Whole-Body Model Predictive Control of a Real Humanoid Robot',
    authors: ['Koji Ishihara', 'Hiroaki Gomi', 'Jun Morimoto'],
    year: 2024,
    venue: 'arXiv preprint',
    arxiv: '2409.08488',
    url: 'https://arxiv.org/abs/2409.08488',
    type: 'paper',
  },
  // dierking-2026: domain pass 2026-10-06, from drafts/classical/control.citations.ts; also drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2606.20712 v1 2026-06-16 (ICRA 2026 workshop). "deploy it on a Franka Research 3"; "global
  // physics parameters provide feedback that is too weak for reliable exploitation at typical
  // replanning frequencies".
  {
    id: 'dierking-2026',
    title: 'Real-World Deployment of Massively Parallel Sampling-Based MPC for Contact-Rich Manipulation',
    authors: ['Magnus Dierking', 'Joao Carvalho', 'An Thai Le', 'Georgia Chalvatzaki', 'Jan Peters'],
    year: 2026,
    venue: 'ICRA 2026 Workshop on Frontiers of Optimization for Robotics',
    arxiv: '2606.20712',
    url: 'https://arxiv.org/abs/2606.20712',
    type: 'paper',
  },
  // salisbury-roth-1983: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // ASME J. Mechanisms, Transmissions, and Automation in Design 105(1), 1983. Crossref byline: J. K.
  // Salisbury, B. Roth.
  {
    id: 'salisbury-roth-1983',
    title: 'Kinematic and Force Analysis of Articulated Mechanical Hands',
    authors: ['J. K. Salisbury', 'B. Roth'],
    year: 1983,
    venue: 'ASME J. Mechanisms, Transmissions, and Automation in Design',
    url: 'https://doi.org/10.1115/1.3267342',
    type: 'paper',
  },
  // han-trinkle-li-2000: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // IEEE T-RA 16(6), 2000. Friction cones cast as LMIs; force-closure and force-optimization
  // problems as convex programs.
  {
    id: 'han-trinkle-li-2000',
    title: 'Grasp analysis as linear matrix inequality problems',
    authors: ['Li Han', 'J. C. Trinkle', 'Z. X. Li'],
    year: 2000,
    venue: 'IEEE Trans. Robotics and Automation',
    url: 'https://doi.org/10.1109/70.897778',
    type: 'paper',
  },
  // kao-lynch-burdick-2016: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // Springer Handbook of Robotics, 2nd ed. (2016), chapter 37. Friction limit surface constructed
  // for a soft contact.
  {
    id: 'kao-lynch-burdick-2016',
    title: 'Contact Modeling and Manipulation',
    authors: ['Imin Kao', 'Kevin M. Lynch', 'Joel W. Burdick'],
    year: 2016,
    venue: 'Springer Handbook of Robotics (2nd ed.)',
    url: 'https://doi.org/10.1007/978-3-319-32552-1_37',
    type: 'paper',
  },
  // dexonomy-2025: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2504.18829 (RSS 2025). 10.7k objects, 9.5M grasps, 31 GRASP types.
  {
    id: 'dexonomy-2025',
    title: 'Dexonomy: Synthesizing All Dexterous Grasp Types in a Grasp Taxonomy',
    authors: ['Jiayi Chen', 'Yubin Ke', 'Lin Peng', 'He Wang'],
    year: 2025,
    venue: 'RSS 2025',
    arxiv: '2504.18829',
    url: 'https://arxiv.org/abs/2504.18829',
    type: 'paper',
  },
  // graspqp-2025: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2508.15002. Simplified force-closure analysis "tend[s] to converge to power grasps".
  {
    id: 'graspqp-2025',
    title: 'GraspQP: Differentiable Optimization of Force Closure for Diverse and Robust Dexterous Grasping',
    authors: ['René Zurbrügg', 'Andrei Cramariuc', 'Marco Hutter'],
    year: 2025,
    arxiv: '2508.15002',
    url: 'https://arxiv.org/abs/2508.15002',
    type: 'paper',
  },
  // liu-closure-lp-1999: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // IEEE T-RA 15(1), 1999. Origin-in-hull query as ray shooting, dual to an LP. Crossref byline:
  // Yun-Hui Liu.
  {
    id: 'liu-closure-lp-1999',
    title: 'Qualitative test and force optimization of 3-D frictional form-closure grasps using linear programming',
    authors: ['Yun-Hui Liu'],
    year: 1999,
    venue: 'IEEE Trans. Robotics and Automation',
    url: 'https://doi.org/10.1109/70.744611',
    type: 'paper',
  },
  // task-wrench-boundary-2023: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2309.13586. Task Wrench Space versus Grasp Wrench Space objective.
  {
    id: 'task-wrench-boundary-2023',
    title: 'Task-Oriented Dexterous Hand Pose Synthesis Using Differentiable Grasp Wrench Boundary Estimator',
    authors: ['Jiayi Chen', 'Yuxing Chen', 'Jialiang Zhang', 'He Wang'],
    year: 2023,
    arxiv: '2309.13586',
    url: 'https://arxiv.org/abs/2309.13586',
    type: 'paper',
  },
  // zheng-qian-2005: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // IJRR 24(4), 2005. "Friction uncertainty and contact position uncertainty may have a disastrous
  // effect on the closure properties of grasps."
  {
    id: 'zheng-qian-2005',
    title: 'Coping with the Grasping Uncertainties in Force-closure Analysis',
    authors: ['Yu Zheng', 'Wen-Han Qian'],
    year: 2005,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/0278364905049469',
    type: 'paper',
  },
  // differentiable-force-closure-2021: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2104.09194 (RA-L). Tests force closure "within milliseconds".
  {
    id: 'differentiable-force-closure-2021',
    title: 'Synthesizing Diverse and Physically Stable Grasps with Arbitrary Hand Structures using Differentiable Force Closure Estimator',
    authors: ['Tengyu Liu', 'Zeyu Liu', 'Ziyuan Jiao', 'Yixin Zhu', 'Song-Chun Zhu'],
    year: 2021,
    venue: 'IEEE Robotics and Automation Letters',
    arxiv: '2104.09194',
    url: 'https://arxiv.org/abs/2104.09194',
    type: 'paper',
  },
  // kirkpatrick-mishra-yap-1992: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // Discrete & Computational Geometry 7, 1992 (STOC 1990 conference version:
  // https://doi.org/10.1145/100216.100261). Quantitative Steinitz theorem as a notion of efficiency
  // for closure grasps.
  {
    id: 'kirkpatrick-mishra-yap-1992',
    title: 'Quantitative Steinitz\'s theorems with applications to multifingered grasping',
    authors: ['David Kirkpatrick', 'Bhubaneswar Mishra', 'Chee-Keng Yap'],
    year: 1992,
    venue: 'Discrete & Computational Geometry',
    url: 'https://doi.org/10.1007/BF02187843',
    type: 'paper',
  },
  // pokorny-kragic-2013: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // IROS 2013. l-edge polyhedral cone approximation; Lipschitz continuity of the quality measure.
  {
    id: 'pokorny-kragic-2013',
    title: 'Classical grasp quality evaluation: New algorithms and theory',
    authors: ['Florian T. Pokorny', 'Danica Kragic'],
    year: 2013,
    venue: 'IROS 2013',
    url: 'https://doi.org/10.1109/IROS.2013.6696854',
    type: 'paper',
  },
  // firmgrasp-2026: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2607.25049. "53% of the nominally force-closed grasps lose closure in the adverse friction
  // tail" / ranking probability "only 0.53 in the shake test".
  {
    id: 'firmgrasp-2026',
    title: 'FIRMGrasp: A Friction-Informed Risk Margin for Robust Grasp Synthesis',
    authors: ['Clinton Enwerem', 'John S. Baras', 'Calin Belta'],
    year: 2026,
    arxiv: '2607.25049',
    url: 'https://arxiv.org/abs/2607.25049',
    type: 'paper',
  },
  // weisz-allen-2012: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // ICRA 2012. The most pose-error-robust grasp is usually not the highest- epsilon grasp.
  {
    id: 'weisz-allen-2012',
    title: 'Pose error robust grasping from contact wrench space metrics',
    authors: ['Jonathan Weisz', 'Peter K. Allen'],
    year: 2012,
    venue: 'ICRA 2012',
    url: 'https://doi.org/10.1109/ICRA.2012.6224697',
    type: 'paper',
  },
  // rubert-grasp-metrics-2017: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // IROS 2017. Good prediction "critically depends on using a combination of metrics as input
  // features."
  {
    id: 'rubert-grasp-metrics-2017',
    title: 'On the relevance of grasp metrics for predicting grasp success',
    authors: ['Carlos Rubert', 'Daniel Kappler', 'Antonio Morales', 'Stefan Schaal', 'Jeannette Bohg'],
    year: 2017,
    venue: 'IROS 2017',
    url: 'https://doi.org/10.1109/IROS.2017.8202167',
    type: 'paper',
  },
  // li-sastry-1988: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // IEEE J. Robotics and Automation 4(1), 1988. Crossref byline: Z. Li, S.S. Sastry. Tasks modeled
  // as ellipsoids in wrench space.
  {
    id: 'li-sastry-1988',
    title: 'Task-oriented optimal grasping by multifingered robot hands',
    authors: ['Z. Li', 'S. S. Sastry'],
    year: 1988,
    venue: 'IEEE J. Robotics and Automation',
    url: 'https://doi.org/10.1109/56.769',
    type: 'paper',
  },
  // borst-task-wrench-2004: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // ICRA 2004. Drawbacks "derive from the non-uniformity of the wrench space, composed of force and
  // torque dimensions."
  {
    id: 'borst-task-wrench-2004',
    title: 'Grasp planning: how to choose a suitable task wrench space',
    authors: ['Ch. Borst', 'M. Fischer', 'G. Hirzinger'],
    year: 2004,
    venue: 'ICRA 2004',
    url: 'https://doi.org/10.1109/ROBOT.2004.1307170',
    type: 'paper',
  },
  // frogger-2023: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2302.13687 (IROS 2023). Min-weight metric; "median synthesis time of 0.834s".
  {
    id: 'frogger-2023',
    title: 'FRoGGeR: Fast Robust Grasp Generation via the Min-Weight Metric',
    authors: ['Albert H. Li', 'Preston Culbertson', 'Joel W. Burdick', 'Aaron D. Ames'],
    year: 2023,
    venue: 'IROS 2023',
    arxiv: '2302.13687',
    url: 'https://arxiv.org/abs/2302.13687',
    type: 'paper',
  },
  // dexnet-4-2019: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts; also drafts/data-hardware/industrial-deployment.citations.ts.
  // Science Robotics 4(26), 2019 (Dex-Net 4.0). Bins of up to 25 novel objects, >95% reliability,
  // >300 mean picks per hour.
  {
    id: 'dexnet-4-2019',
    title: 'Learning ambidextrous robot grasping policies',
    authors: ['Jeffrey Mahler', 'Matthew Matl', 'Vishal Satish', 'Michael Danielczuk', 'Bill DeRose', 'Stephen McKinley', 'Ken Goldberg'],
    year: 2019,
    venue: 'Science Robotics',
    url: 'https://doi.org/10.1126/scirobotics.aau4984',
    type: 'paper',
  },
  // graspnet-1billion-2020: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // CVPR 2020. 97,280 RGB-D images, over one billion grasp poses, analytic evaluation.
  {
    id: 'graspnet-1billion-2020',
    title: 'GraspNet-1Billion: A Large-Scale Benchmark for General Object Grasping',
    authors: ['Hao-Shu Fang', 'Chenxi Wang', 'Minghao Gou', 'Cewu Lu'],
    year: 2020,
    venue: 'CVPR 2020',
    url: 'https://doi.org/10.1109/CVPR42600.2020.01146',
    type: 'paper',
  },
  // dexgraspnet-2-2024: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2410.23004 (CoRL 2024). 427 million grasps; 90.7% real-world dexterous grasping in
  // cluttered scenes.
  {
    id: 'dexgraspnet-2-2024',
    title: 'DexGraspNet 2.0: Learning Generative Dexterous Grasping in Large-scale Synthetic Cluttered Scenes',
    authors: ['Jialiang Zhang', 'Haoran Liu', 'Danshi Li', 'Xinqiang Yu', 'Haoran Geng', 'Yufei Ding', 'Jiayi Chen', 'He Wang'],
    year: 2024,
    venue: 'CoRL 2024',
    arxiv: '2410.23004',
    url: 'https://arxiv.org/abs/2410.23004',
    type: 'paper',
  },
  // graspgen-2025: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2507.13097 (NVIDIA). Over 53 million grasps; labels by simulated shaking in Isaac.
  {
    id: 'graspgen-2025',
    title: 'GraspGen: A Diffusion-based Framework for 6-DOF Grasping with On-Generator Training',
    authors: ['Adithyavairavan Murali', 'Balakumar Sundaralingam', 'Yu-Wei Chao', 'Wentao Yuan', 'Jun Yamada', 'Mark Carlson', 'Fabio Ramos', 'Stan Birchfield', 'Dieter Fox', 'Clemens Eppner'],
    year: 2025,
    arxiv: '2507.13097',
    url: 'https://arxiv.org/abs/2507.13097',
    type: 'paper',
  },
  // bodex-2024: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2412.16490 (ICRA 2025). 8-vertex pyramidal cones; over 49 grasps per second on a single
  // 3090 GPU.
  {
    id: 'bodex-2024',
    title: 'BODex: Scalable and Efficient Robotic Dexterous Grasp Synthesis Using Bilevel Optimization',
    authors: ['Jiayi Chen', 'Yubin Ke', 'He Wang'],
    year: 2024,
    venue: 'ICRA 2025',
    arxiv: '2412.16490',
    url: 'https://arxiv.org/abs/2412.16490',
    type: 'paper',
  },
  // dexevolve-2026: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2602.15201. Analytic synthesis "often yield[s] physically infeasible grasps that need to
  // be filtered in high-fidelity simulators".
  {
    id: 'dexevolve-2026',
    title: 'DexEvolve: Evolutionary Optimization for Robust and Diverse Dexterous Grasp Synthesis',
    authors: ['René Zurbrügg', 'Andrei Cramariuc', 'Marco Hutter'],
    year: 2026,
    arxiv: '2602.15201',
    url: 'https://arxiv.org/abs/2602.15201',
    type: 'paper',
  },
  // grasp-distance-fields-2026: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2608.00600. Median 94% of synthesized quality margin retained; 0.09 ms per QP solve within
  // a 20 ms control interval.
  {
    id: 'grasp-distance-fields-2026',
    title: 'Grasp Execution Without a Planner: Configuration-Space Grasp Distance Fields with Certified Safety & Guaranteed Quality',
    authors: ['Clinton Enwerem', 'John S. Baras', 'Calin Belta'],
    year: 2026,
    arxiv: '2608.00600',
    url: 'https://arxiv.org/abs/2608.00600',
    type: 'paper',
  },
  // get-a-grip-2024: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2410.23701. 3.5M grasps on 4.3K objects; most methods degrade when deployed on hardware.
  {
    id: 'get-a-grip-2024',
    title: 'Get a Grip: Multi-Finger Grasp Evaluation at Scale Enables Robust Sim-to-Real Transfer',
    authors: ['Tyler Ga Wei Lum', 'Albert H. Li', 'Preston Culbertson', 'Krishnan Srinivasan', 'Aaron D. Ames', 'Mac Schwager', 'Jeannette Bohg'],
    year: 2024,
    arxiv: '2410.23701',
    url: 'https://arxiv.org/abs/2410.23701',
    type: 'paper',
  },
  // robustdexgrasp-2025: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2504.05287 (CoRL 2025). "Trained in simulation ... 94.6% across 512 real objects".
  {
    id: 'robustdexgrasp-2025',
    title: 'RobustDexGrasp: Robust Dexterous Grasping of General Objects',
    authors: ['Hui Zhang', 'Zijian Wu', 'Linyi Huang', 'Sammy Christen', 'Jie Song'],
    year: 2025,
    venue: 'CoRL 2025',
    arxiv: '2504.05287',
    url: 'https://arxiv.org/abs/2504.05287',
    type: 'paper',
  },
  // graspvla-2025: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2505.03233. SynGrasp-1B, a billion-frame synthetic grasping dataset.
  {
    id: 'graspvla-2025',
    title: 'GraspVLA: a Grasping Foundation Model Pre-trained on Billion-scale Synthetic Action Data',
    authors: ['Shengliang Deng', 'Mi Yan', 'Songlin Wei', 'Haixin Ma', 'Yuxin Yang', 'Jiayi Chen', 'Zhiqi Zhang', 'Taoyu Yang', 'Xuheng Zhang', 'Wenhao Zhang', 'Heming Cui', 'Zhizheng Zhang', 'He Wang'],
    year: 2025,
    arxiv: '2505.03233',
    url: 'https://arxiv.org/abs/2505.03233',
    type: 'paper',
  },
  // dexgraspvla-2025: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2502.20900. "90+% dexterous grasping success rate under thousands of challenging unseen
  // cluttered scenes."
  {
    id: 'dexgraspvla-2025',
    title: 'DexGraspVLA: A Vision-Language-Action Framework Towards General Dexterous Grasping',
    authors: ['Yifan Zhong', 'Xuchuan Huang', 'Ruochong Li', 'Ceyao Zhang', 'Zhang Chen', 'Tianrui Guan', 'Fanlian Zeng', 'Ka Num Lui', 'Yuyao Ye', 'Yitao Liang', 'Yaodong Yang', 'Yuanpei Chen'],
    year: 2025,
    arxiv: '2502.20900',
    url: 'https://arxiv.org/abs/2502.20900',
    type: 'paper',
  },
  // touch-dexterous-grasping-2026: domain pass 2026-10-06, from drafts/classical/grasp-planning.citations.ts.
  // arXiv 2609.24068. Vision plus wrench and taxel feedback: 24/25 against 14/25 for vision only.
  {
    id: 'touch-dexterous-grasping-2026',
    title: 'When Does Touch Matter? Charting the Vision-Interaction Gap in Cluttered Dexterous Grasping',
    authors: ['Hao Jiang', 'Luis Dominguez', 'Daniel Seita'],
    year: 2026,
    arxiv: '2609.24068',
    url: 'https://arxiv.org/abs/2609.24068',
    type: 'paper',
  },
  // corke-dh-2007: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // Crossref byline prints "P.I. Corke". Standard and modified DH from one string of elementary
  // transforms.
  {
    id: 'corke-dh-2007',
    title: 'A Simple and Systematic Approach to Assigning Denavit–Hartenberg Parameters',
    authors: ['P. I. Corke'],
    year: 2007,
    venue: 'IEEE Trans. Robotics',
    url: 'https://doi.org/10.1109/TRO.2007.896765',
    type: 'paper',
  },
  // okamura-park-1996: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // Robotica 14(4), 1996. POE parameters vary smoothly with the joint axes, unlike DH parameters.
  {
    id: 'okamura-park-1996',
    title: 'Kinematic calibration using the product of exponentials formula',
    authors: ['Koichiro Okamura', 'F. C. Park'],
    year: 1996,
    venue: 'Robotica',
    url: 'https://doi.org/10.1017/S0263574700019810',
    type: 'paper',
  },
  // brockett-1984: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // Mathematical Theory of Networks and Systems, Springer LNCIS vol. 58 (1984). Crossref carries no
  // issued year for the chapter; 1984 is the volume's publication year.
  {
    id: 'brockett-1984',
    title: 'Robotic manipulators and the product of exponentials formula',
    authors: ['R. W. Brockett'],
    year: 1984,
    venue: 'Mathematical Theory of Networks and Systems (LNCIS 58)',
    url: 'https://doi.org/10.1007/BFb0031048',
    type: 'paper',
  },
  // urdf-dataset-2023: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts; also drafts/classical/ros2-for-ml-engineers.citations.ts.
  // arXiv 2308.00514 (IEEE RA-L 2024): 322 URDF files, 195 unique robots.
  {
    id: 'urdf-dataset-2023',
    title: 'Understanding URDF: A Dataset and Analysis',
    authors: ['Daniella Tola', 'Peter Corke'],
    year: 2023,
    arxiv: '2308.00514',
    url: 'https://arxiv.org/abs/2308.00514',
    type: 'paper',
  },
  // yoshikawa-1985: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // IJRR 4(2), 1985. Proposes the manipulability measure.
  {
    id: 'yoshikawa-1985',
    title: 'Manipulability of Robotic Mechanisms',
    authors: ['Tsuneo Yoshikawa'],
    year: 1985,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/027836498500400201',
    type: 'paper',
  },
  // siciliano-slotine-1991: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // ICAR '91. Task-priority framework for highly redundant systems.
  {
    id: 'siciliano-slotine-1991',
    title: 'A general framework for managing multiple tasks in highly redundant robotic systems',
    authors: ['B. Siciliano', 'J.-J. E. Slotine'],
    year: 1991,
    venue: 'Fifth International Conference on Advanced Robotics (ICAR \'91)',
    url: 'https://doi.org/10.1109/ICAR.1991.240390',
    type: 'paper',
  },
  // nakamura-hanafusa-1986: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // ASME JDSMC 108(3), 1986. Introduces the singularity-robust inverse.
  {
    id: 'nakamura-hanafusa-1986',
    title: 'Inverse Kinematic Solutions With Singularity Robustness for Robot Manipulator Control',
    authors: ['Yoshihiko Nakamura', 'Hideo Hanafusa'],
    year: 1986,
    venue: 'ASME J. Dynamic Systems, Measurement, and Control',
    url: 'https://doi.org/10.1115/1.3143764',
    type: 'paper',
  },
  // raghavan-roth-1993: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // ASME J. Mechanical Design 115(3), 1993. Crossref byline: M. Raghavan, B. Roth. General 6R IK as
  // one minimum-degree polynomial.
  {
    id: 'raghavan-roth-1993',
    title: 'Inverse Kinematics of the General 6R Manipulator and Related Linkages',
    authors: ['M. Raghavan', 'B. Roth'],
    year: 1993,
    venue: 'ASME J. Mechanical Design',
    url: 'https://doi.org/10.1115/1.2919218',
    type: 'paper',
  },
  // manocha-canny-1994: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // IEEE T-RA 10(5), 1994. "The average running time of the algorithm, for most cases, is 11
  // milliseconds on an IBM RS/6000 workstation."
  {
    id: 'manocha-canny-1994',
    title: 'Efficient inverse kinematics for general 6R manipulators',
    authors: ['D. Manocha', 'J. F. Canny'],
    year: 1994,
    venue: 'IEEE Trans. Robotics and Automation',
    url: 'https://doi.org/10.1109/70.326569',
    type: 'paper',
  },
  // ikfast-diankov-2010: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // PhD thesis, CMU-RI-TR-10-29, August 2010 (IKFast). "on the order of 6 microseconds" against "on
  // the order of 10 milliseconds".
  {
    id: 'ikfast-diankov-2010',
    title: 'Automated Construction of Robotic Manipulation Programs',
    authors: ['Rosen Diankov'],
    year: 2010,
    venue: 'PhD thesis, Carnegie Mellon University Robotics Institute (CMU-RI-TR-10-29)',
    url: 'https://www.ri.cmu.edu/publications/automated-construction-of-robotic-manipulation-programs/',
    type: 'paper',
  },
  // trac-ik-2015: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // IEEE-RAS Humanoids 2015. KDL false negatives; TRAC-IK alternative.
  {
    id: 'trac-ik-2015',
    title: 'TRAC-IK: An open-source library for improved solving of generic inverse kinematics',
    authors: ['Patrick Beeson', 'Barrett Ames'],
    year: 2015,
    venue: 'IEEE-RAS Humanoids 2015',
    url: 'https://doi.org/10.1109/HUMANOIDS.2015.7363472',
    type: 'paper',
  },
  // curobo-2023: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts; also drafts/classical/motion-planning.citations.ts.
  // arXiv 2310.17274 v1 2023-10-26. "a collision-free IK solver that can solve over 7000 queries/s".
  {
    id: 'curobo-2023',
    title: 'cuRobo: Parallelized Collision-Free Minimum-Jerk Robot Motion Generation',
    authors: ['Balakumar Sundaralingam', 'Siva Kumar Sastry Hari', 'Adam Fishman', 'Caelan Garrett', 'Karl Van Wyk', 'Valts Blukis', 'Alexander Millane', 'Helen Oleynikova', 'Ankur Handa', 'Fabio Ramos', 'Nathan Ratliff', 'Dieter Fox'],
    year: 2023,
    arxiv: '2310.17274',
    url: 'https://arxiv.org/abs/2310.17274',
    type: 'paper',
  },
  // pyroki-2025: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // arXiv 2505.03728. "PyRoki can be 1.4-1.7x faster and converges to lower errors than cuRobo".
  {
    id: 'pyroki-2025',
    title: 'PyRoki: A Modular Toolkit for Robot Kinematic Optimization',
    authors: ['Chung Min Kim', 'Brent Yi', 'Hongsuk Choi', 'Yi Ma', 'Ken Goldberg', 'Angjoo Kanazawa'],
    year: 2025,
    arxiv: '2505.03728',
    url: 'https://arxiv.org/abs/2505.03728',
    type: 'paper',
  },
  // ikflow-2021: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // arXiv 2111.08933 (IEEE RA-L 2022). "2000 solutions in under 10ms", "within 10 millimeters and 2
  // degrees of an exact solution".
  {
    id: 'ikflow-2021',
    title: 'IKFlow: Generating Diverse Inverse Kinematics Solutions',
    authors: ['Barrett Ames', 'Jeremy Morgan', 'George Konidaris'],
    year: 2021,
    arxiv: '2111.08933',
    url: 'https://arxiv.org/abs/2111.08933',
    type: 'paper',
  },
  // rl-action-spaces-2026: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // arXiv 2606.18594. Joint velocity best for vision-based picking and pushing among four action
  // spaces.
  {
    id: 'rl-action-spaces-2026',
    title: 'Benchmarking Action Spaces in Reinforcement Learning for Vision-based Robotic Manipulation',
    authors: ['Seyed Alireza Azimi', 'Homayoon Farrahi', 'Abhishek Naik', 'Colin Bellinger', 'A. Rupam Mahmood'],
    year: 2026,
    arxiv: '2606.18594',
    url: 'https://arxiv.org/abs/2606.18594',
    type: 'paper',
  },
  // latent-action-diffusion-2025: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // arXiv 2506.14608 (ICRA 2026). "up to 25.3% improved manipulation success rates".
  {
    id: 'latent-action-diffusion-2025',
    title: 'Latent Action Diffusion for Cross-Embodiment Manipulation',
    authors: ['Erik Bauer', 'Elvis Nava', 'Robert K. Katzschmann'],
    year: 2025,
    arxiv: '2506.14608',
    url: 'https://arxiv.org/abs/2506.14608',
    type: 'paper',
  },
  // gmr-retargeting-2025: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts; also drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2510.02252 (ICRA 2026). Retargeting artifacts reduce tracking policy robustness.
  {
    id: 'gmr-retargeting-2025',
    title: 'Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking',
    authors: ['Joao Pedro Araujo', 'Yanjie Ze', 'Pei Xu', 'Jiajun Wu', 'C. Karen Liu'],
    year: 2025,
    arxiv: '2510.02252',
    url: 'https://arxiv.org/abs/2510.02252',
    type: 'paper',
  },
  // rep-103-2010: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts; also drafts/classical/ros2-for-ml-engineers.citations.ts.
  // ROS Enhancement Proposal 103 (Active, 2010). ros.org served a bot challenge to the researchers;
  // quotes were read from the official REP source, ros-infrastructure/rep, rep-0103.rst.
  {
    id: 'rep-103-2010',
    title: 'REP 103: Standard Units of Measure and Coordinate Conventions',
    authors: ['Tully Foote', 'Mike Purvis'],
    year: 2010,
    venue: 'ROS Enhancement Proposals',
    url: 'https://www.ros.org/reps/rep-0103.html',
    type: 'docs',
  },
  // rep-105-2010: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts; also drafts/classical/ros2-for-ml-engineers.citations.ts.
  // ROS Enhancement Proposal 105 (Active, 2010). Quotes read from the official REP source,
  // ros-infrastructure/rep, rep-0105.rst.
  {
    id: 'rep-105-2010',
    title: 'REP 105: Coordinate Frames for Mobile Platforms',
    authors: ['Wim Meeussen'],
    year: 2010,
    venue: 'ROS Enhancement Proposals',
    url: 'https://www.ros.org/reps/rep-0105.html',
    type: 'docs',
  },
  // tf-library-2013: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts; also drafts/classical/ros2-for-ml-engineers.citations.ts.
  // IEEE TePRA 2013. Frame bookkeeping as a common source of bugs.
  {
    id: 'tf-library-2013',
    title: 'tf: The transform library',
    authors: ['Tully Foote'],
    year: 2013,
    venue: 'IEEE TePRA 2013',
    url: 'https://doi.org/10.1109/TePRA.2013.6556373',
    type: 'paper',
  },
  // lerobot-so101-docs-2026: domain pass 2026-10-06, from drafts/classical/kinematics.citations.ts.
  // LeRobot SO-101 page, read 2026-10-02 for the source pack: leader and follower calibration; 6x
  // STS3215 motors with 1/345 gearing.
  {
    id: 'lerobot-so101-docs-2026',
    title: 'SO-101',
    authors: ['Hugging Face'],
    year: 2026,
    venue: 'LeRobot Documentation, as of 2026-10-02',
    url: 'https://huggingface.co/docs/lerobot/so101',
    type: 'docs',
  },
  // solovey-complexity-2020: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2003.03632 v1 2020-03-07; chapter for the Encyclopedia of Robotics. PDF text: "the problem
  // is PSPACE-hard for a planar mechanical linkage robot with multiple links ( Hopcroft et al 1984a
  // ) and for for a multi-arm robot in a 3-dimensional polyhedral environment ( Reif 1979 )"; "a
  // singly exponential algorithm termed the roadmap method was presented Canny (1993)".
  {
    id: 'solovey-complexity-2020',
    title: 'Complexity of Planning',
    authors: ['Kiril Solovey'],
    year: 2020,
    venue: 'arXiv preprint (Encyclopedia of Robotics chapter)',
    arxiv: '2003.03632',
    url: 'https://arxiv.org/abs/2003.03632',
    type: 'paper',
  },
  // mcvamp-2026: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2604.13323 v1 2026-04-14. "Current state-of-the-art methods can take tens of seconds to
  // solve these tasks for complex systems such as humanoid robots"; "CPU SIMD-accelerated
  // manifold-constrained motion planner"; "Our approach achieves up to 100-1000x speed-ups over the
  // state-of-the-art".
  {
    id: 'mcvamp-2026',
    title: 'Vectorizing Projection in Manifold-Constrained Motion Planning for Real-Time Whole-Body Control',
    authors: ['Shrutheesh R Iyer', 'I-Chia Chang', 'Andrew Z. Liu', 'Yan Gu', 'Zachary Kingston'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2604.13323',
    url: 'https://arxiv.org/abs/2604.13323',
    type: 'paper',
  },
  // flask-2026: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2603.16059 v1 2026-03-17; comment: accepted at Transactions on Robotics. "requires solving
  // either challenging two-point boundary value problems (BVPs) or propagating robot dynamics";
  // "differentially flat robot systems"; "closed-form dynamically feasible trajectory"; "requiring
  // mere microseconds to milliseconds of planning time".
  {
    id: 'flask-2026',
    title: 'Ultrafast Sampling-based Kinodynamic Planning via Differential Flatness',
    authors: ['Thai Duong', 'Clayton W. Ramsey', 'Zachary Kingston', 'Wil Thomason', 'Lydia E. Kavraki'],
    year: 2026,
    venue: 'IEEE Trans. Robotics (accepted)',
    arxiv: '2603.16059',
    url: 'https://arxiv.org/abs/2603.16059',
    type: 'paper',
  },
  // rrt-connect-2000: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // Crossref 10.1109/ROBOT.2000.844730 (ICRA 2000); byline printed with initials. Pack quote: "The
  // method works by incrementally building two rapidly-exploring random trees (RRTs) rooted at the
  // start and the goal configurations."
  {
    id: 'rrt-connect-2000',
    title: 'RRT-connect: An efficient approach to single-query path planning',
    authors: ['J. J. Kuffner', 'S. M. LaValle'],
    year: 2000,
    venue: 'ICRA 2000',
    url: 'https://doi.org/10.1109/ROBOT.2000.844730',
    type: 'paper',
  },
  // orthey-review-2023: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2309.13119 v1 2023-09-22; accepted for Annual Review of Control, Robotics, and Autonomous
  // Systems vol. 7 (2024). Abstract: "compared on 24 challenging planning problems"; HTML body:
  // "RRT-Connect has the best overall success rate".
  {
    id: 'orthey-review-2023',
    title: 'Sampling-Based Motion Planning: A Comparative Review',
    authors: ['Andreas Orthey', 'Constantinos Chamzas', 'Lydia E. Kavraki'],
    year: 2023,
    venue: 'Annual Review of Control, Robotics, and Autonomous Systems',
    arxiv: '2309.13119',
    url: 'https://arxiv.org/abs/2309.13119',
    type: 'paper',
  },
  // vamp-2023: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2309.14545 v1 2023-09-25 (submitted to ICRA 2024). "performance improvements of more than
  // 500x over the state-of-the-art, bringing planning times into the range of microseconds and
  // solution rates into the range of kilohertz, without specialized hardware"; "exploit fine-grained
  // parallelism"; "forward kinematics and collision checking"; "robots ranging from 7 to 14
  // degrees-of-freedom".
  {
    id: 'vamp-2023',
    title: 'Motions in Microseconds via Vectorized Sampling-Based Planning',
    authors: ['Wil Thomason', 'Zachary Kingston', 'Lydia E. Kavraki'],
    year: 2023,
    venue: 'arXiv preprint (ICRA 2024)',
    arxiv: '2309.14545',
    url: 'https://arxiv.org/abs/2309.14545',
    type: 'paper',
  },
  // prrtc-2025: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2503.06757 v1 2025-03-09. "co-designed for GPU acceleration across the entire algorithm";
  // "pRRTC achieves as much as a 10x speedup on constrained reaching tasks with a 5.4x reduction in
  // standard deviation".
  {
    id: 'prrtc-2025',
    title: 'pRRTC: GPU-Parallel RRT-Connect for Fast, Consistent, and Low-Cost Motion Planning',
    authors: ['Chih H. Huang', 'Pranav Jadhav', 'Brian Plancher', 'Zachary Kingston'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2503.06757',
    url: 'https://arxiv.org/abs/2503.06757',
    type: 'paper',
  },
  // ompl-2-2026: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2605.29301 v1 2026-05-28. "we introduce OMPL 2.0, a major evolution of the library that
  // targets real-time motion planning through hardware acceleration".
  {
    id: 'ompl-2-2026',
    title: 'The Open Motion Planning Library 2.0',
    authors: ['Weihang Guo', 'Theodoros Tyrovouzis', 'Emiliano Flores', 'Clayton W. Ramsey', 'Zachary K. Kingston', 'Ioan A. Şucan', 'Mark Moll', 'Lydia E. Kavraki'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2605.29301',
    url: 'https://arxiv.org/abs/2605.29301',
    type: 'paper',
  },
  // ompl-release-notes-2026: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // Live page read 2026-10-04: "OMPL 2.0.0 (April 6, 2026)"; "Added VAMP (Vector-Accelerated Motion
  // Planning) as an optional high-performance backend for collision checking and motion validation
  // VAMP leverages SIMD instructions to accelerate forward kinematics and collision detection,
  // achieving planning speeds up to 25 kHz"; "New geometric planners: AORRTC". No individual byline;
  // the maintaining lab is the author.
  {
    id: 'ompl-release-notes-2026',
    title: 'OMPL Release Notes: OMPL 2.0.0 (April 6, 2026)',
    authors: ['Kavraki Lab'],
    year: 2026,
    accessedOn: '2026-10-04',
    venue: 'OMPL documentation',
    url: 'https://ompl.kavrakilab.org/releaseNotes.html',
    type: 'docs',
  },
  // fmt-star-2013: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 1306.3532 v1 2013-06-15 (later IJRR). "the extra mathematical flexibility of this approach
  // allows for convergence rate bounds--the first in the field of optimal sampling-based motion
  // planning".
  {
    id: 'fmt-star-2013',
    title: 'Fast Marching Tree: a Fast Marching Sampling-Based Method for Optimal Motion Planning in Many Dimensions',
    authors: ['Lucas Janson', 'Edward Schmerling', 'Ashley Clark', 'Marco Pavone'],
    year: 2013,
    venue: 'arXiv preprint',
    arxiv: '1306.3532',
    url: 'https://arxiv.org/abs/1306.3532',
    type: 'paper',
  },
  // bit-star-2017: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 1707.01888 v1 2017-07-06; journal ref IJRR 39(5):543-567, 2020. "Its search is ordered by
  // potential solution quality, as in A*, and its approximation improves indefinitely with
  // additional computational time, as in RRT*."
  {
    id: 'bit-star-2017',
    title: 'Batch Informed Trees (BIT*): Informed Asymptotically Optimal Anytime Search',
    authors: ['Jonathan D. Gammell', 'Timothy D. Barfoot', 'Siddhartha S. Srinivasa'],
    year: 2017,
    venue: 'Int. J. Robotics Research',
    arxiv: '1707.01888',
    url: 'https://arxiv.org/abs/1707.01888',
    type: 'paper',
  },
  // aorrtc-2025: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2505.10542 v1 2025-05-15; journal ref IEEE RA-L 10(12):13375-13382. "AORRTC finds initial
  // solutions as fast as RRT-Connect"; "AORRTC finds solutions to difficult high-DoF planning
  // problems in milliseconds where the other a.s.a.o. planners could not consistently find solutions
  // in seconds."
  {
    id: 'aorrtc-2025',
    title: 'AORRTC: Almost-Surely Asymptotically Optimal Planning with RRT-Connect',
    authors: ['Tyler Wilson', 'Wil Thomason', 'Zachary Kingston', 'Jonathan Gammell'],
    year: 2025,
    venue: 'IEEE Robotics and Automation Letters',
    arxiv: '2505.10542',
    url: 'https://arxiv.org/abs/2505.10542',
    type: 'paper',
  },
  // gcs-2022: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2205.04422 v1 2022-05-09; journal version Science Robotics 2023, DOI
  // 10.1126/scirobotics.adf7843. arXiv abstract: "the convex relaxation of our programs is very
  // tight, and a cheap rounding of its solution is typically sufficient to design globally-optimal
  // trajectories"; "formulate the planning problem as a compact mixed-integer optimization".
  {
    id: 'gcs-2022',
    title: 'Motion Planning around Obstacles with Convex Optimization',
    authors: ['Tobia Marcucci', 'Mark Petersen', 'David von Wrangel', 'Russ Tedrake'],
    year: 2022,
    venue: 'arXiv preprint (Science Robotics 2023)',
    arxiv: '2205.04422',
    url: 'https://arxiv.org/abs/2205.04422',
    type: 'paper',
  },
  // chomp-ijrr-2013: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // Crossref 10.1177/0278364913488805 (IJRR 2013). Pack quote: "It uses Hamiltonian Monte Carlo to
  // alleviate the problem of convergence to high-cost local minima (and for probabilistic
  // completeness), and is capable of respecting hard constraints along the trajectory."
  {
    id: 'chomp-ijrr-2013',
    title: 'CHOMP: Covariant Hamiltonian optimization for motion planning',
    authors: ['Matt Zucker', 'Nathan Ratliff', 'Anca D. Dragan', 'Mihail Pivtoraiko', 'Matthew Klingensmith', 'Christopher M. Dellin', 'J. Andrew Bagnell', 'Siddhartha S. Srinivasa'],
    year: 2013,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/0278364913488805',
    type: 'paper',
  },
  // stomp-2011: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // Crossref 10.1109/ICRA.2011.5980280 (ICRA 2011). Pack quote: "We experimentally show that the
  // stochastic nature of STOMP allows it to overcome local minima that gradient-based methods like
  // CHOMP can get stuck in."
  {
    id: 'stomp-2011',
    title: 'STOMP: Stochastic trajectory optimization for motion planning',
    authors: ['Mrinal Kalakrishnan', 'Sachin Chitta', 'Evangelos Theodorou', 'Peter Pastor', 'Stefan Schaal'],
    year: 2011,
    venue: 'ICRA 2011',
    url: 'https://doi.org/10.1109/ICRA.2011.5980280',
    type: 'paper',
  },
  // trajopt-ijrr-2014: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // Crossref 10.1177/0278364914528132 (IJRR 2014). Pack quote: "We consider motion planning for 7
  // DOF robot arms, 18 DOF full-body robots, statically stable walking motion for the 34 DOF Atlas
  // humanoid robot, and physical experiments with the 18 DOF PR2."
  {
    id: 'trajopt-ijrr-2014',
    title: 'Motion planning with sequential convex optimization and convex collision checking',
    authors: ['John Schulman', 'Yan Duan', 'Jonathan Ho', 'Alex Lee', 'Ibrahim Awwal', 'Henry Bradlow', 'Jia Pan', 'Sachin Patil', 'Ken Goldberg', 'Pieter Abbeel'],
    year: 2014,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/0278364914528132',
    type: 'paper',
  },
  // industrial-curobo-2025: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2508.04146 v1 2025-08-06. Abstract: "including a 7th-axis gantry"; HTML body: "Planning
  // Time : cuRobo: 45 ± 8ms, MoveIt: 1,200 ± 400ms"; "Planning was performed in ROS2 environment
  // with RViz visualization using OMPL's RRTConnect planner."
  {
    id: 'industrial-curobo-2025',
    title: 'Industrial Robot Motion Planning with GPUs: Integration of cuRobo for Extended DOF Systems',
    authors: ['Luai Abuelsamen', 'Harsh Rana', 'Ho-Wei Lu', 'Wenhan Tang', 'Swati Priyadarshini', 'Gabriel Gomes'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2508.04146',
    url: 'https://arxiv.org/abs/2508.04146',
    type: 'paper',
  },
  // mr-pop-2026: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2609.30644 v1 2026-09-25. "a GPU-based a.s.a.o. multi-robot planner"; "MR. POP also raises
  // the success rate of downstream motion optimizers (e.g., from 4% to 72%), by creating
  // high-quality, diverse seeds that help avoid local minima."
  {
    id: 'mr-pop-2026',
    title: 'MR. POP: Multi-Robot Parallel Optimizing Planner for Almost-Surely Asymptotically Optimal Planning',
    authors: ['Chih H. Huang', 'Roy Xing', 'Brian Plancher', 'Zachary Kingston'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2609.30644',
    url: 'https://arxiv.org/abs/2609.30644',
    type: 'paper',
  },
  // hauser-shortcut-2010: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // Crossref 10.1109/ROBOT.2010.5509683 (ICRA 2010). Pack quote: "The heuristic repeatedly picks two
  // points on the trajectory and attempts to replace the intermediate trajectory with a shorter,
  // collision-free segment."
  {
    id: 'hauser-shortcut-2010',
    title: 'Fast smoothing of manipulator trajectories using optimal bounded-acceleration shortcuts',
    authors: ['Kris Hauser', 'Victor Ng-Thow-Hing'],
    year: 2010,
    venue: 'ICRA 2010',
    url: 'https://doi.org/10.1109/ROBOT.2010.5509683',
    type: 'paper',
  },
  // moveit-trajectory-processing-2026: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // Live page read 2026-10-04: "The recommended algorithm as of January 2023 is
  // TimeOptimalTrajectoryGeneration (TOTG)." No individual byline; follows the registry precedent of
  // moveit-planning-scene-2026.
  {
    id: 'moveit-trajectory-processing-2026',
    title: 'Trajectory Processing',
    authors: ['MoveIt Maintainers'],
    year: 2026,
    venue: 'MoveIt 2 Documentation, as of 2026-10-04',
    url: 'https://moveit.picknik.ai/main/doc/concepts/trajectory_processing.html',
    type: 'docs',
  },
  // moveit-time-parameterization-2026: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // Live page read 2026-10-04: "A time parameterization algorithm such as TOTG calculates velocities
  // and accelerations for a trajectory, but none of the time parameterization algorithms support
  // jerk limits."; "As a further post-processing step, the Ruckig jerk-limited smoothing algorithm
  // can be appliied [sic] to limit joint jerks over the trajectories."; "The Ruckig smoothing
  // algorithm should run after AddTimeOptimalParameterization".
  {
    id: 'moveit-time-parameterization-2026',
    title: 'Time Parameterization',
    authors: ['MoveIt Maintainers'],
    year: 2026,
    venue: 'MoveIt 2 Documentation, as of 2026-10-04',
    url: 'https://moveit.picknik.ai/main/doc/examples/time_parameterization/time_parameterization_tutorial.html',
    type: 'docs',
  },
  // moveit-pro-10-1-2026: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // Live page read 2026-10-04 (datePublished 2026-09-18). "Fixed the ProRRT shortcut stage
  // validating segments more coarsely than the planner's own step, which let paths pass through
  // obstacles between collision checks."; "Fixed ValidateTrajectory checking the wrong robot
  // configuration when a trajectory listed the planning group's joints in a different order than the
  // group, which could report a colliding trajectory as collision-free."
  {
    id: 'moveit-pro-10-1-2026',
    title: 'MoveIt Pro 10.1.0 release notes',
    authors: ['PickNik Robotics'],
    year: 2026,
    venue: 'MoveIt Pro documentation, 2026-09-18',
    url: 'https://docs.picknik.ai/release-notes/2026/09/18/10.1.0',
    type: 'docs',
  },
  // mpinets-2022: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2210.12209 v1 2022-10-21 (CoRL 2022). "M$\pi$Nets are trained on over 3 million motion
  // planning problems in over 500,000 environments." Second author printed "Adithyavairan Murali" in
  // the arXiv record; kept as printed.
  {
    id: 'mpinets-2022',
    title: 'Motion Policy Networks',
    authors: ['Adam Fishman', 'Adithyavairan Murali', 'Clemens Eppner', 'Bryan Peele', 'Byron Boots', 'Dieter Fox'],
    year: 2022,
    venue: 'CoRL 2022',
    arxiv: '2210.12209',
    url: 'https://arxiv.org/abs/2210.12209',
    type: 'paper',
  },
  // neural-mp-2024: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2409.05864 v1 2024-09-09. "collects expert data from a motion planner, then distills it
  // into a reactive generalist policy. We then combine this with lightweight optimization to obtain
  // a safe path for real world deployment."; "improvement of 23%, 17% and 79% motion planning
  // success rate over state of the art sampling, optimization and learning based planning methods".
  {
    id: 'neural-mp-2024',
    title: 'Neural MP: A Generalist Neural Motion Planner',
    authors: ['Murtaza Dalal', 'Jiahui Yang', 'Russell Mendonca', 'Youssef Khaky', 'Ruslan Salakhutdinov', 'Deepak Pathak'],
    year: 2024,
    venue: 'arXiv preprint',
    arxiv: '2409.05864',
    url: 'https://arxiv.org/abs/2409.05864',
    type: 'paper',
  },
  // deep-reactive-policy-2025: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2509.06953 v1 2025-09-08. HTML body: "we replace AIT* with cuRobo as the expert motion
  // planner. Due to its GPU acceleration, cuRobo allows us to scale data generation to 10 million
  // expert trajectories."; "Sampling-based planners such as AIT* completely fail in dynamic
  // environments, achieving 0% success on all such tasks despite extended planning horizons.";
  // "cuRobo drops to 3.00% on Dynamic Goal Blocking (DGB), where the goal is temporarily
  // obstructed."
  {
    id: 'deep-reactive-policy-2025',
    title: 'Deep Reactive Policy: Learning Reactive Manipulator Motion Planning for Dynamic Environments',
    authors: ['Jiahui Yang', 'Jason Jingzhou Liu', 'Yulong Li', 'Youssef Khaky', 'Kenneth Shaw', 'Deepak Pathak'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2509.06953',
    url: 'https://arxiv.org/abs/2509.06953',
    type: 'paper',
  },
  // totg-2012: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // Crossref 10.15607/rss.2012.viii.027 (RSS VIII, 2012). Pack quote: "This paper presents a novel
  // method to generate the time-optimal trajectory that exactly follows a given differentiable
  // joint-space path within given bounds on joint accelerations and velocities."
  {
    id: 'totg-2012',
    title: 'Time-Optimal Trajectory Generation for Path Following with Bounded Acceleration and Velocity',
    authors: ['Tobias Kunz', 'Mike Stilman'],
    year: 2012,
    venue: 'Robotics: Science and Systems VIII',
    url: 'https://doi.org/10.15607/rss.2012.viii.027',
    type: 'paper',
  },
  // ruckig-2021: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2105.04830 v1 2021-05-11 (RSS 2021). "We evaluate the robustness and real-time capability
  // of the proposed algorithm on a test suite with over 1,000,000,000 random trajectories as well as
  // in real-world applications."
  {
    id: 'ruckig-2021',
    title: 'Jerk-limited Real-time Trajectory Generation with Arbitrary Target States',
    authors: ['Lars Berscheid', 'Torsten Kröger'],
    year: 2021,
    venue: 'RSS 2021',
    arxiv: '2105.04830',
    url: 'https://arxiv.org/abs/2105.04830',
    type: 'paper',
  },
  // curobo-v2-2026: domain pass 2026-10-06, from drafts/classical/motion-planning.citations.ts.
  // arXiv 2603.05493 v1 2026-03-05 (NVIDIA technical report). "Current methods are fragmented: fast
  // planners output physically unexecutable trajectories"; "cuRoboV2 achieves 99.7% success under
  // 3kg payload (where baselines achieve only 72--77%)".
  {
    id: 'curobo-v2-2026',
    title: 'cuRoboV2: Dynamics-Aware Motion Generation with Depth-Fused Distance Fields for High-DoF Robots',
    authors: ['Balakumar Sundaralingam', 'Adithyavairavan Murali', 'Stan Birchfield'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2603.05493',
    url: 'https://arxiv.org/abs/2603.05493',
    type: 'paper',
  },
  // dope-2018: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 1809.10790 abstract: "this is the first deep network trained only on synthetic data that
  // is able to achieve state-of-the-art performance on 6-DoF object pose estimation", "perform
  // competitively against a state-of-the-art network trained on a combination of real and synthetic
  // data" and "estimating object poses with sufficient accuracy for real-world semantic grasping of
  // known household objects in clutter by a real robot".
  {
    id: 'dope-2018',
    title: 'Deep Object Pose Estimation for Semantic Robotic Grasping of Household Objects',
    authors: ['Jonathan Tremblay', 'Thang To', 'Balakumar Sundaralingam', 'Yu Xiang', 'Dieter Fox', 'Stan Birchfield'],
    year: 2018,
    venue: 'Conference on Robot Learning (CoRL) 2018',
    arxiv: '1809.10790',
    url: 'https://arxiv.org/abs/1809.10790',
    type: 'paper',
  },
  // enebuse-2022: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // PLOS ONE 17(10): e0273261, published 2022-10-19 (article page and Crossref). Abstract: "the
  // simultaneous methods are more resistant to rotation noise, whereas the separate methods are
  // better at dealing with translation noise. Additionally, while increasing the robot rotation
  // motion span during calibration enhances the accuracy of the separate methods, it has a negative
  // effect on the simultaneous methods. Conversely, increasing the translation motion range improves
  // the accuracy of simultaneous methods but degrades the accuracy of the separate methods. These
  // findings suggest that those conditions should be considered when benchmarking algorithms or
  // performing a calibration process". Body: "we used a UR5e robot arm".
  {
    id: 'enebuse-2022',
    title: 'Accuracy evaluation of hand-eye calibration techniques for vision-guided robots',
    authors: ['Ikenna Enebuse', 'Babul K. S. M. Kader Ibrahim', 'Mathias Foo', 'Ranveer S. Matharu', 'Hafiz Ahmed'],
    year: 2022,
    venue: 'PLOS ONE',
    url: 'https://doi.org/10.1371/journal.pone.0273261',
    type: 'paper',
  },
  // realsense-spinout-2025: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // Press release dated July 11, 2025 (datePublished 2025-07-11): "RealSense, a pioneer in
  // AI-powered computer vision, today announced its successful spinout from Intel Corporation and
  // the close of a $50 million Series A funding round."
  {
    id: 'realsense-spinout-2025',
    title: 'RealSense Completes Spinout from Intel, Raises $50 Million to Accelerate AI-Powered Vision for Robotics and Biometrics',
    authors: ['RealSense'],
    year: 2025,
    venue: 'RealSense press release',
    url: 'https://www.realsenseai.com/news-insights/news/realsense-completes-spin-out-from-intel-raises-50-million-to-accelerate-ai-powered-vision-for-robotics-and-biometrics/',
    type: 'press',
  },
  // foundationstereo-2025: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2501.09898 abstract: "a foundation model for stereo depth estimation designed to achieve
  // strong zero-shot generalization" and "we first construct a large-scale (1M stereo pairs)
  // synthetic training dataset featuring large diversity and high photorealism".
  {
    id: 'foundationstereo-2025',
    title: 'FoundationStereo: Zero-Shot Stereo Matching',
    authors: ['Bowen Wen', 'Matthew Trepte', 'Joseph Aribido', 'Jan Kautz', 'Orazio Gallo', 'Stan Birchfield'],
    year: 2025,
    venue: 'arXiv preprint (CVPR 2025)',
    arxiv: '2501.09898',
    url: 'https://arxiv.org/abs/2501.09898',
    type: 'paper',
  },
  // depth-pro-2024: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2410.02073 abstract: "The predictions are metric, with absolute scale, without relying on
  // the availability of metadata such as camera intrinsics. And the model is fast, producing a
  // 2.25-megapixel depth map in 0.3 seconds on a standard GPU."
  {
    id: 'depth-pro-2024',
    title: 'Depth Pro: Sharp Monocular Metric Depth in Less Than a Second',
    authors: ['Aleksei Bochkovskii', 'Amaël Delaunoy', 'Hugo Germain', 'Marcel Santos', 'Yichao Zhou', 'Stephan R. Richter', 'Vladlen Koltun'],
    year: 2024,
    venue: 'arXiv preprint (ICLR 2025)',
    arxiv: '2410.02073',
    url: 'https://arxiv.org/abs/2410.02073',
    type: 'paper',
  },
  // prompt-depth-anything-2024: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2412.14015 abstract: "we use a low-cost LiDAR as the prompt to guide the Depth Anything
  // model for accurate metric depth output, achieving up to 4K resolution".
  {
    id: 'prompt-depth-anything-2024',
    title: 'Prompting Depth Anything for 4K Resolution Accurate Metric Depth Estimation',
    authors: ['Haotong Lin', 'Sida Peng', 'Jingxiao Chen', 'Songyou Peng', 'Jiaming Sun', 'Minghuan Liu', 'Hujun Bao', 'Jiashi Feng', 'Xiaowei Zhou', 'Bingyi Kang'],
    year: 2024,
    venue: 'arXiv preprint (CVPR 2025)',
    arxiv: '2412.14015',
    url: 'https://arxiv.org/abs/2412.14015',
    type: 'paper',
  },
  // transcg-2022: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2202.08471 abstract: "ordinary depth sensors usually fail to produce accurate depth
  // information for transparent objects owing to the reflection and refraction of light" and
  // "contains 57,715 RGB-D images from 130 different scenes".
  {
    id: 'transcg-2022',
    title: 'TransCG: A Large-Scale Real-World Dataset for Transparent Object Depth Completion and a Grasping Baseline',
    authors: ['Hongjie Fang', 'Hao-Shu Fang', 'Sheng Xu', 'Cewu Lu'],
    year: 2022,
    venue: 'IEEE Robotics and Automation Letters',
    arxiv: '2202.08471',
    url: 'https://arxiv.org/abs/2202.08471',
    type: 'paper',
  },
  // dreds-2022: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2208.03792 abstract: "Commercial depth sensors usually generate noisy and missing depths,
  // especially on specular and transparent objects", "simulate an active stereo depth system using
  // physically based rendering", "130K photorealistic RGB images along with their simulated depths
  // carrying realistic sensor noises" and "trained on DREDS, our SwinDRNet can seamlessly generalize
  // to other real depth datasets".
  {
    id: 'dreds-2022',
    title: 'Domain Randomization-Enhanced Depth Simulation and Restoration for Perceiving and Grasping Specular and Transparent Objects',
    authors: ['Qiyu Dai', 'Jiyao Zhang', 'Qiwei Li', 'Tianhao Wu', 'Hao Dong', 'Ziyuan Liu', 'Ping Tan', 'He Wang'],
    year: 2022,
    venue: 'arXiv preprint (ECCV 2022)',
    arxiv: '2208.03792',
    url: 'https://arxiv.org/abs/2208.03792',
    type: 'paper',
  },
  // mask-rcnn-2017: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 1703.06870 abstract: "The method, called Mask R-CNN, extends Faster R-CNN by adding a
  // branch for predicting an object mask in parallel with the existing branch for bounding box
  // recognition."
  {
    id: 'mask-rcnn-2017',
    title: 'Mask R-CNN',
    authors: ['Kaiming He', 'Georgia Gkioxari', 'Piotr Dollár', 'Ross Girshick'],
    year: 2017,
    venue: 'arXiv preprint (ICCV 2017)',
    arxiv: '1703.06870',
    url: 'https://arxiv.org/abs/1703.06870',
    type: 'paper',
  },
  // owlv2-2023: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2306.09683 abstract: "self-training, which uses an existing detector to generate
  // pseudo-box annotations on image-text pairs", "with OWL-ST, we can scale to over 1B examples" and
  // "With an L/14 architecture, OWL-ST improves AP on LVIS rare classes, for which the model has
  // seen no human box annotations, from 31.2% to 44.6%".
  {
    id: 'owlv2-2023',
    title: 'Scaling Open-Vocabulary Object Detection',
    authors: ['Matthias Minderer', 'Alexey Gritsenko', 'Neil Houlsby'],
    year: 2023,
    arxiv: '2306.09683',
    url: 'https://arxiv.org/abs/2306.09683',
    type: 'paper',
  },
  // grounding-dino-1-5-2024: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2405.10300 abstract: "the Grounding DINO 1.5 Edge model, when optimized with TensorRT,
  // achieves a speed of 75.2 FPS while attaining a zero-shot performance of 36.2 AP on the
  // LVIS-minival benchmark".
  {
    id: 'grounding-dino-1-5-2024',
    title: 'Grounding DINO 1.5: Advance the "Edge" of Open-Set Object Detection',
    authors: ['Tianhe Ren', 'Qing Jiang', 'Shilong Liu', 'Zhaoyang Zeng', 'Wenlong Liu', 'Han Gao', 'Hongjie Huang', 'Zhengyu Ma', 'Xiaoke Jiang', 'Yihao Chen', 'Yuda Xiong', 'Hao Zhang', 'Feng Li', 'Peijun Tang', 'Kent Yu', 'Lei Zhang'],
    year: 2024,
    arxiv: '2405.10300',
    url: 'https://arxiv.org/abs/2405.10300',
    type: 'paper',
  },
  // dinov3-2025: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2508.10104 abstract: "we introduce a new method called Gram anchoring, which effectively
  // addresses the known yet unsolved issue of dense feature maps degrading during long training
  // schedules".
  {
    id: 'dinov3-2025',
    title: 'DINOv3',
    authors: ['Oriane Siméoni', 'Huy V. Vo', 'Maximilian Seitzer', 'Federico Baldassarre', 'Maxime Oquab', 'Cijo Jose', 'Vasil Khalidov', 'Marc Szafraniec', 'Seungeun Yi', 'Michaël Ramamonjisoa', 'Francisco Massa', 'Daniel Haziza', 'Luca Wehrstedt', 'Jianyuan Wang', 'Timothée Darcet', 'Théo Moutakanni', 'Leonel Sentana', 'Claire Roberts', 'Andrea Vedaldi', 'Jamie Tolan', 'John Brandt', 'Camille Couprie', 'Julien Mairal', 'Hervé Jégou', 'Patrick Labatut', 'Piotr Bojanowski'],
    year: 2025,
    venue: 'arXiv technical report',
    arxiv: '2508.10104',
    url: 'https://arxiv.org/abs/2508.10104',
    type: 'paper',
  },
  // sam3-2025: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2511.16719 abstract: "based on concept prompts, which we define as either short noun
  // phrases (e.g., "yellow school bus"), image exemplars, or a combination of both", "returns
  // segmentation masks and unique identities for all matching object instances", "a high-quality
  // dataset with 4M unique concept labels" and "SAM 3 doubles the accuracy of existing systems in
  // both image and video PCS".
  {
    id: 'sam3-2025',
    title: 'SAM 3: Segment Anything with Concepts',
    authors: ['Nicolas Carion', 'Laura Gustafson', 'Yuan-Ting Hu', 'Shoubhik Debnath', 'Ronghang Hu', 'Didac Suris', 'Chaitanya Ryali', 'Kalyan Vasudev Alwala', 'Haitham Khedr', 'Andrew Huang', 'Jie Lei', 'Tengyu Ma', 'Baishan Guo', 'Arpit Kalla', 'Markus Marks', 'Joseph Greer', 'Meng Wang', 'Peize Sun', 'Roman Rädle', 'Triantafyllos Afouras', 'Effrosyni Mavroudi', 'Katherine Xu', 'Tsung-Han Wu', 'Yu Zhou', 'Liliane Momeni', 'Rishi Hazra', 'Shuangrui Ding', 'Sagar Vaze', 'Francois Porcher', 'Feng Li', 'Siyuan Li', 'Aishwarya Kamath', 'Ho Kei Cheng', 'Piotr Dollár', 'Nikhila Ravi', 'Kate Saenko', 'Pengchuan Zhang', 'Christoph Feichtenhofer'],
    year: 2025,
    arxiv: '2511.16719',
    url: 'https://arxiv.org/abs/2511.16719',
    type: 'paper',
  },
  // grounded-sam-2024: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2401.14159 abstract: "uses Grounding DINO as an open-set object detector to combine with
  // the segment anything model (SAM)" and "achieving 48.7 mean AP on SegInW (Segmentation in the
  // wild) zero-shot benchmark".
  {
    id: 'grounded-sam-2024',
    title: 'Grounded SAM: Assembling Open-World Models for Diverse Visual Tasks',
    authors: ['Tianhe Ren', 'Shilong Liu', 'Ailing Zeng', 'Jing Lin', 'Kunchang Li', 'He Cao', 'Jiayu Chen', 'Xinyu Huang', 'Yukang Chen', 'Feng Yan', 'Zhaoyang Zeng', 'Hao Zhang', 'Feng Li', 'Jie Yang', 'Hongyang Li', 'Qing Jiang', 'Lei Zhang'],
    year: 2024,
    arxiv: '2401.14159',
    url: 'https://arxiv.org/abs/2401.14159',
    type: 'paper',
  },
  // cnos-2023: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2307.11067 abstract: "segment unseen objects in RGB images using their CAD models",
  // "Leveraging recent powerful foundation models, DINOv2 and Segment Anything, we create
  // descriptors and generate proposals", "matching proposals with reference descriptors created from
  // CAD models" and "surpassing existing approaches on the seven core datasets of the BOP challenge
  // by 19.8% AP".
  {
    id: 'cnos-2023',
    title: 'CNOS: A Strong Baseline for CAD-based Novel Object Segmentation',
    authors: ['Van Nguyen Nguyen', 'Thibault Groueix', 'Georgy Ponimatkin', 'Vincent Lepetit', 'Tomas Hodan'],
    year: 2023,
    venue: 'ICCV 2023 R6D Workshop',
    arxiv: '2307.11067',
    url: 'https://arxiv.org/abs/2307.11067',
    type: 'paper',
  },
  // nocs-2019: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 1901.02970 abstract: "estimate the 6D pose and dimensions of unseen object instances" and
  // "our problem assumes that no exact object CAD models are available during either training or
  // testing time".
  {
    id: 'nocs-2019',
    title: 'Normalized Object Coordinate Space for Category-Level 6D Object Pose and Size Estimation',
    authors: ['He Wang', 'Srinath Sridhar', 'Jingwei Huang', 'Julien Valentin', 'Shuran Song', 'Leonidas J. Guibas'],
    year: 2019,
    venue: 'arXiv preprint (CVPR 2019)',
    arxiv: '1901.02970',
    url: 'https://arxiv.org/abs/1901.02970',
    type: 'paper',
  },
  // sam6d-2023: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2311.15707 abstract: "ISM takes SAM as an advanced starting point to generate all possible
  // object proposals" and "By treating pose estimation as a partial-to-partial point matching
  // problem" on "cluttered RGB-D images".
  {
    id: 'sam6d-2023',
    title: 'SAM-6D: Segment Anything Model Meets Zero-Shot 6D Object Pose Estimation',
    authors: ['Jiehong Lin', 'Lihua Liu', 'Dekun Lu', 'Kui Jia'],
    year: 2023,
    venue: 'arXiv preprint (CVPR 2024)',
    arxiv: '2311.15707',
    url: 'https://arxiv.org/abs/2311.15707',
    type: 'paper',
  },
  // any6d-2025: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2503.18673 abstract: "requires only a single RGB-D anchor image to estimate both the 6D
  // pose and size of unknown objects in novel scenes".
  {
    id: 'any6d-2025',
    title: 'Any6D: Model-free 6D Pose Estimation of Novel Objects',
    authors: ['Taeyeop Lee', 'Bowen Wen', 'Minjun Kang', 'Gyuree Kang', 'In So Kweon', 'Kuk-Jin Yoon'],
    year: 2025,
    venue: 'arXiv preprint (CVPR 2025)',
    arxiv: '2503.18673',
    url: 'https://arxiv.org/abs/2503.18673',
    type: 'paper',
  },
  // sam3d-2025: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2511.16624 abstract: "predicting geometry, texture, and layout from a single image" and
  // "with at least a 5:1 win rate in human preference tests on real-world objects and scenes".
  {
    id: 'sam3d-2025',
    title: 'SAM 3D: 3Dfy Anything in Images',
    authors: ['SAM 3D Team', 'Xingyu Chen', 'Fu-Jen Chu', 'Pierre Gleize', 'Kevin J Liang', 'Alexander Sax', 'Hao Tang', 'Weiyao Wang', 'Michelle Guo', 'Thibaut Hardin', 'Xiang Li', 'Aohan Lin', 'Jiawei Liu', 'Ziqi Ma', 'Anushka Sagar', 'Bowen Song', 'Xiaodong Wang', 'Jianing Yang', 'Bowen Zhang', 'Piotr Dollár', 'Georgia Gkioxari', 'Matt Feiszli', 'Jitendra Malik'],
    year: 2025,
    arxiv: '2511.16624',
    url: 'https://arxiv.org/abs/2511.16624',
    type: 'paper',
  },
  // bop-2020: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2009.07378 abstract: "Methods based on deep neural networks have finally caught up with
  // methods based on point pair features, which were dominating previous editions of the challenge."
  // The 2023 report defers threshold grids to this report (as the original page states).
  {
    id: 'bop-2020',
    title: 'BOP Challenge 2020 on 6D Object Localization',
    authors: ['Tomas Hodan', 'Martin Sundermeyer', 'Bertram Drost', 'Yann Labbe', 'Eric Brachmann', 'Frank Michel', 'Carsten Rother', 'Jiri Matas'],
    year: 2020,
    venue: 'ECCV 2020 Workshops',
    arxiv: '2009.07378',
    url: 'https://arxiv.org/abs/2009.07378',
    type: 'paper',
  },
  // cosypose-2020: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2008.08465 abstract: "solving an object-level bundle adjustment problem that refines the
  // poses of cameras and objects to minimize the reprojection error in all views".
  {
    id: 'cosypose-2020',
    title: 'CosyPose: Consistent multi-view multi-object 6D pose estimation',
    authors: ['Yann Labbé', 'Justin Carpentier', 'Mathieu Aubry', 'Josef Sivic'],
    year: 2020,
    venue: 'arXiv preprint (ECCV 2020)',
    arxiv: '2008.08465',
    url: 'https://arxiv.org/abs/2008.08465',
    type: 'paper',
  },
  // bop-2024: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // arXiv 2504.02812 abstract: "the best 2024 method for model-based 6D localization of unseen
  // objects (FreeZeV2.1) achieves 22% higher accuracy on BOP-Classic-Core than the best 2023 method
  // (GenFlow), and is only 4% behind the best 2023 method for seen objects (GPose2023) although
  // being significantly slower (24.9 vs 2.7s per image)", "Co-op which takes only 0.8s per image and
  // is 13% more accurate than GenFlow", "we introduced new model-free tasks, where no 3D object
  // models are available and methods need to onboard objects just from provided reference videos"
  // and "the 2D detection stage is consequently the main bottleneck of existing pipelines for 6D
  // localization/detection of unseen objects".
  {
    id: 'bop-2024',
    title: 'BOP Challenge 2024 on Model-Based and Model-Free 6D Object Pose Estimation',
    authors: ['Van Nguyen Nguyen', 'Stephen Tyree', 'Andrew Guo', 'Mederic Fourmy', 'Anas Gouda', 'Taeyeop Lee', 'Sungphill Moon', 'Hyeontae Son', 'Lukas Ranftl', 'Jonathan Tremblay', 'Eric Brachmann', 'Bertram Drost', 'Vincent Lepetit', 'Carsten Rother', 'Stan Birchfield', 'Jiri Matas', 'Yann Labbe', 'Martin Sundermeyer', 'Tomas Hodan'],
    year: 2025,
    arxiv: '2504.02812',
    url: 'https://arxiv.org/abs/2504.02812',
    type: 'paper',
  },
  // hutchinson-hager-corke-1996: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // Crossref 10.1109/70.538972 (IEEE T-RA 12(5), 1996); byline printed with initials. Pack quote:
  // "We then present a taxonomy of visual servo control systems. The two major classes of systems,
  // position-based and image-based systems, are then discussed in detail."
  {
    id: 'hutchinson-hager-corke-1996',
    title: 'A tutorial on visual servo control',
    authors: ['S. Hutchinson', 'G. D. Hager', 'P. I. Corke'],
    year: 1996,
    venue: 'IEEE Transactions on Robotics and Automation',
    url: 'https://doi.org/10.1109/70.538972',
    type: 'paper',
  },
  // bateux-2018: domain pass 2026-10-06, from drafts/classical/perception.citations.ts.
  // Crossref 10.1109/ICRA.2018.8461068 (ICRA 2018). Pack quote: "A convolutional neural network is
  // fine-tuned to estimate the relative pose between the current and desired images and a pose-based
  // visual servoing control law is considered to reach the desired pose."
  {
    id: 'bateux-2018',
    title: 'Training Deep Neural Networks for Visual Servoing',
    authors: ['Quentin Bateux', 'Eric Marchand', 'Jürgen Leitner', 'François Chaumette', 'Peter Corke'],
    year: 2018,
    venue: '2018 IEEE International Conference on Robotics and Automation (ICRA)',
    url: 'https://doi.org/10.1109/ICRA.2018.8461068',
    type: 'paper',
  },
  // ros2-distributions-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // Distribution table: Lyrical Luth released May 22, 2026, EOL May 2031; Jazzy EOL May 2029; Humble
  // EOL May 2027; "Nodes are not guaranteed to be able to communicate across distributions."
  {
    id: 'ros2-distributions-2026',
    title: 'Distributions',
    authors: ['ROS 2 Project'],
    year: 2026,
    venue: 'ROS 2 Documentation, as of 2026-10-04',
    url: 'https://docs.ros.org/en/lyrical/Releases.html',
    type: 'docs',
  },
  // ros-llm-2024: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // arXiv 2406.19741; published as Nature Machine Intelligence 8, 313-325 (2026). Executes ROS
  // actions/services from LLM output.
  {
    id: 'ros-llm-2024',
    title: 'ROS-LLM: A ROS framework for embodied AI with task feedback and structured reasoning',
    authors: ['Christopher E. Mower', 'Yuhui Wan', 'Hongzhan Yu', 'Antoine Grosnit', 'Jonas Gonzalez-Billandon', 'Matthieu Zimmer', 'Jinlong Wang', 'Xinyu Zhang', 'Yao Zhao', 'Anbang Zhai', 'Puze Liu', 'Daniel Palenicek', 'Davide Tateo', 'Cesar Cadena', 'Marco Hutter', 'Jan Peters', 'Guangjian Tian', 'Yuzheng Zhuang', 'Kun Shao', 'Xingyue Quan', 'Jianye Hao', 'Jun Wang', 'Haitham Bou-Ammar'],
    year: 2024,
    arxiv: '2406.19741',
    url: 'https://arxiv.org/abs/2406.19741',
    type: 'paper',
  },
  // ros2-dds-design-2014: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // ROS 2 design article by William Woodall, written 2014-06 (modified 2019-07). "Control over
  // several parameters of reliability, what DDS calls Quality of Service (QoS) ...".
  {
    id: 'ros2-dds-design-2014',
    title: 'ROS on DDS',
    authors: ['William Woodall'],
    year: 2014,
    venue: 'ROS 2 Design',
    url: 'https://design.ros2.org/articles/ros_on_dds.html',
    type: 'docs',
  },
  // ros2-latency-2021: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // arXiv 2101.02074. "end-to-end latency strongly depends on the used DDS middleware" and "ROS2 can
  // lead to 50% latency overhead".
  {
    id: 'ros2-latency-2021',
    title: 'Latency Analysis of ROS2 Multi-Node Systems',
    authors: ['Tobias Kronauer', 'Joshwa Pohlmann', 'Maximilian Matthe', 'Till Smejkal', 'Gerhard Fettweis'],
    year: 2021,
    arxiv: '2101.02074',
    url: 'https://arxiv.org/abs/2101.02074',
    type: 'paper',
  },
  // ros2-kilted-2025: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // Kilted Kaiju release notes (May 2025): "The rmw_zenoh_cpp is now considered Tier 1."; ros2 bag
  // play --message-order {received,sent}.
  {
    id: 'ros2-kilted-2025',
    title: 'Kilted Kaiju (codename \'kilted\'; May, 2025)',
    authors: ['ROS 2 Project'],
    year: 2025,
    venue: 'ROS 2 Documentation',
    url: 'https://docs.ros.org/en/lyrical/Releases/Release-Kilted-Kaiju.html',
    type: 'docs',
  },
  // mcap-spec-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // MCAP message record: log_time "Time at which the message was recorded"; publish_time "Time at
  // which the message was published".
  {
    id: 'mcap-spec-2026',
    title: 'MCAP Format Specification',
    authors: ['Foxglove'],
    year: 2026,
    venue: 'mcap.dev, as of 2026-10-04',
    url: 'https://mcap.dev/spec',
    type: 'docs',
  },
  // ros2-tracing-2022: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // arXiv 2201.00393; IEEE RA-L 7(3), 6511-6518, July 2022. "the end-to-end message latency
  // overhead, when enabling all ROS 2 instrumentation, is on average 0.0033 ms".
  {
    id: 'ros2-tracing-2022',
    title: 'ros2_tracing: Multipurpose Low-Overhead Framework for Real-Time Tracing of ROS 2',
    authors: ['Christophe Bédard', 'Ingo Lütkebohle', 'Michel Dagenais'],
    year: 2022,
    venue: 'IEEE Robotics and Automation Letters',
    arxiv: '2201.00393',
    url: 'https://arxiv.org/abs/2201.00393',
    type: 'paper',
  },
  // ros2-clock-design: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // ROS 2 design article "Clock and Time" (Tully Foote). The page shows no date, so it is registered
  // as undated with the access date.
  {
    id: 'ros2-clock-design',
    title: 'Clock and Time',
    authors: ['Tully Foote'],
    year: 'n.d.',
    accessedOn: '2026-10-04',
    venue: 'ROS 2 Design',
    url: 'https://design.ros2.org/articles/clock_and_time.html',
    type: 'docs',
  },
  // tf2-docs-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // "tf2 maintains the relationship between coordinate frames in a tree structure buffered in time
  // ..."; static transforms broadcast separately.
  {
    id: 'tf2-docs-2026',
    title: 'Tf2',
    authors: ['ROS 2 Project'],
    year: 2026,
    venue: 'ROS 2 Documentation, as of 2026-10-04',
    url: 'https://docs.ros.org/en/lyrical/ROS-Framework/interfaces/About-Tf2/About-Tf2.html',
    type: 'docs',
  },
  // tf2-time-tutorial-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // "Once the timeout has been reached (fifty milliseconds in this case), an exception will be
  // raised only if the transform is still not available."
  {
    id: 'tf2-time-tutorial-2026',
    title: 'Using time (C++)',
    authors: ['ROS 2 Project'],
    year: 2026,
    venue: 'ROS 2 Documentation, as of 2026-10-04',
    url: 'https://docs.ros.org/en/lyrical/ROS-Framework/client-libraries/Working-with-Client-Libraries/Tf2/Learning-About-Tf2-And-Time-Cpp.html',
    type: 'docs',
  },
  // ros2-iron-mcap-2023: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts; also drafts/data-hardware/robot-learning-stack.citations.ts.
  // Same release notes as the Lyrical-docs copy at /en/lyrical/Releases/Release-Iron-Irwini.html,
  // whose quote "This release switches to using mcap as the default file format for writing new
  // bags." was re-fetched 2026-10-04.
  {
    id: 'ros2-iron-mcap-2023',
    title: 'Iron Irwini (iron)',
    authors: ['ROS 2 Project'],
    year: 2023,
    venue: 'ROS 2 Documentation: Iron',
    url: 'https://docs.ros.org/en/iron/Releases/Release-Iron-Irwini.html',
    type: 'docs',
  },
  // ros2-lifecycle-design-2015: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // ROS 2 design article "Managed nodes" (Geoffrey Biggs, Tully Foote), written 2015-06, modified
  // 2021-02.
  {
    id: 'ros2-lifecycle-design-2015',
    title: 'Managed nodes',
    authors: ['Geoffrey Biggs', 'Tully Foote'],
    year: 2015,
    venue: 'ROS 2 Design',
    url: 'https://design.ros2.org/articles/node_lifecycle.html',
    type: 'docs',
  },
  // ros2-realtime-docs-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // "we must avoid nondeterministic operations in the execution path, things like: pagefault events,
  // dynamic memory allocation/deallocation, and synchronization primitives that block indefinitely."
  {
    id: 'ros2-realtime-docs-2026',
    title: 'Understanding real-time programming',
    authors: ['ROS 2 Project'],
    year: 2026,
    venue: 'ROS 2 Documentation, as of 2026-10-04',
    url: 'https://docs.ros.org/en/lyrical/Capabilities/Motion-planning/Real-Time-Programming.html',
    type: 'docs',
  },
  // ros2-executors-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // EventsCBGExecutor (Lyrical onward) reduces CPU overhead; "there is no limit to the number of
  // events that can be added to the queue."
  {
    id: 'ros2-executors-2026',
    title: 'Executors',
    authors: ['ROS 2 Project'],
    year: 2026,
    venue: 'ROS 2 Documentation, as of 2026-10-04',
    url: 'https://docs.ros.org/en/lyrical/ROS-Framework/client-libraries/About-Executors/About-Executors.html',
    type: 'docs',
  },
  // ros2-buffer-backends-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // rosidl::Buffer: "the bytes of a uint8[] field can live in CPU memory, GPU memory, or any other
  // memory domain a vendor provides".
  {
    id: 'ros2-buffer-backends-2026',
    title: 'About rosidl::Buffer backends',
    authors: ['ROS 2 Project'],
    year: 2026,
    venue: 'ROS 2 Documentation, as of 2026-10-04',
    url: 'https://docs.ros.org/en/lyrical/ROS-Framework/interfaces/Working-with-interfaces/Buffer-Backends/About-Buffer-Backends.html',
    type: 'docs',
  },
  // isaac-ros-nitros-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // README: "NITROS is deprecated." / "Update 2026-09-21: Deprecated NITROS in favor of
  // rosidl::Buffer and the CUDA buffer backend".
  {
    id: 'isaac-ros-nitros-2026',
    title: 'Isaac ROS NITROS',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'GitHub, as of 2026-10-04',
    url: 'https://github.com/NVIDIA-ISAAC-ROS/isaac_ros_nitros',
    type: 'docs',
  },
  // isaac-ros-rosidl-buffer-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // "Copying those bytes to a CPU vector only to publish them, and then copying them back to the
  // device in a subscriber, adds latency and consumes CPU and memory bandwidth."
  {
    id: 'isaac-ros-rosidl-buffer-2026',
    title: 'rosidl::Buffer and Buffer Backends',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'Isaac ROS Documentation, as of 2026-10-04',
    url: 'https://nvidia-isaac-ros.github.io/concepts/rosidl_buffer/index.html',
    type: 'docs',
  },
  // smac-planner-2024: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts; also drafts/classical/scene-representation.citations.ts.
  // arXiv 2401.13078 (rev. 2025-05). "Smac Planner now powers thousands of robots worldwide"
  // (authors' claim).
  {
    id: 'smac-planner-2024',
    title: 'Open-Source, Cost-Aware Kinematically Feasible Planning for Mobile and Surface Robotics',
    authors: ['Steve Macenski', 'Matthew Booker', 'Joshua Wallace', 'Tobias Fischer'],
    year: 2024,
    arxiv: '2401.13078',
    url: 'https://arxiv.org/abs/2401.13078',
    type: 'paper',
  },
  // nav2-costmap-2d-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts; also drafts/classical/scene-representation.citations.ts.
  // "a number of sensor processing plugins (AI outputs, depth sensor obstacle buffering, semantic
  // information, etc)".
  {
    id: 'nav2-costmap-2d-2026',
    title: 'Costmap 2D',
    authors: ['Nav2 Project'],
    year: 2026,
    venue: 'Nav2 Documentation (Lyrical), as of 2026-10-04',
    url: 'https://docs.nav2.org/lyrical/configuration_and_development/configuration_guide/core_servers/costmap_2d/',
    type: 'docs',
  },
  // ros2-middleware-vendors-2026: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // "While the different DDS implementations may be compatible in limited circumstances, this is not
  // guaranteed."
  {
    id: 'ros2-middleware-vendors-2026',
    title: 'Different ROS 2 middleware vendors',
    authors: ['ROS 2 Project'],
    year: 2026,
    venue: 'ROS 2 Documentation, as of 2026-10-04',
    url: 'https://docs.ros.org/en/lyrical/ROS-Framework/client-libraries/About-Different-Middleware-Vendors.html',
    type: 'docs',
  },
  // noetic-eol-2025: domain pass 2026-10-06, from drafts/classical/ros2-for-ml-engineers.citations.ts.
  // Canonical Ubuntu blog, August 2025: "As of May 2025, the Robot Operating System (ROS) Noetic
  // Ninjemys officially reached its end of life (EOL)."
  {
    id: 'noetic-eol-2025',
    title: 'ROS Noetic is EOL – take action to maintain fleet security',
    authors: ['Florencia Cabral Berenfus'],
    year: 2025,
    venue: 'Ubuntu blog (Canonical)',
    url: 'https://ubuntu.com/blog/ros-noetic-is-eol-take-action-to-maintain-fleet-security',
    type: 'blog',
  },
  // neural-fields-survey-2024: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2410.20220 abstract: "based on over 200 papers. First, we present four key Neural Fields
  // frameworks: Occupancy Networks, Signed Distance Fields, Neural Radiance Fields, and Gaussian
  // Splatting."
  {
    id: 'neural-fields-survey-2024',
    title: 'Neural Fields in Robotics: A Survey',
    authors: ['Muhammad Zubair Irshad', 'Mauro Comi', 'Yen-Chen Lin', 'Nick Heppert', 'Abhinav Valada', 'Rares Ambrus', 'Zsolt Kira', 'Jonathan Tremblay'],
    year: 2024,
    arxiv: '2410.20220',
    url: 'https://arxiv.org/abs/2410.20220',
    type: 'paper',
  },
  // octomap-2013: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // Crossref 10.1007/s10514-012-9321-0 (Autonomous Robots 34(3), 2013). Pack quote: "It explicitly
  // represents not only occupied space, but also free and unknown areas."
  {
    id: 'octomap-2013',
    title: 'OctoMap: an efficient probabilistic 3D mapping framework based on octrees',
    authors: ['Armin Hornung', 'Kai M. Wurm', 'Maren Bennewitz', 'Cyrill Stachniss', 'Wolfram Burgard'],
    year: 2013,
    venue: 'Autonomous Robots',
    url: 'https://doi.org/10.1007/s10514-012-9321-0',
    type: 'paper',
  },
  // cut3r-2025: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2501.12387 abstract: "it can also infer unseen regions of the scene by probing at virtual,
  // unobserved views".
  {
    id: 'cut3r-2025',
    title: 'Continuous 3D Perception Model with Persistent State',
    authors: ['Qianqian Wang', 'Yifei Zhang', 'Aleksander Holynski', 'Alexei A. Efros', 'Angjoo Kanazawa'],
    year: 2025,
    arxiv: '2501.12387',
    url: 'https://arxiv.org/abs/2501.12387',
    type: 'paper',
  },
  // voxblox-2016: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 1611.03631 abstract: "We show that we can build TSDFs faster than Octomaps, and that it is
  // more accurate to build ESDFs out of TSDFs than occupancy maps."
  {
    id: 'voxblox-2016',
    title: 'Voxblox: Incremental 3D Euclidean Signed Distance Fields for On-Board MAV Planning',
    authors: ['Helen Oleynikova', 'Zachary Taylor', 'Marius Fehr', 'Juan Nieto', 'Roland Siegwart'],
    year: 2016,
    venue: 'arXiv preprint (IROS 2017)',
    arxiv: '1611.03631',
    url: 'https://arxiv.org/abs/1611.03631',
    type: 'paper',
  },
  // nvblox-2023: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2311.00626 abstract: "achieving up to a 177x speed-up in surface reconstruction, and up to
  // a 31x improvement in distance field computation".
  {
    id: 'nvblox-2023',
    title: 'nvblox: GPU-Accelerated Incremental Signed Distance Field Mapping',
    authors: ['Alexander Millane', 'Helen Oleynikova', 'Emilie Wirbel', 'Remo Steiner', 'Vikram Ramasamy', 'David Tingdahl', 'Roland Siegwart'],
    year: 2023,
    venue: 'arXiv preprint (ICRA 2024)',
    arxiv: '2311.00626',
    url: 'https://arxiv.org/abs/2311.00626',
    type: 'paper',
  },
  // voxel-hashing-2013: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // Crossref 10.1145/2508363.2508374 (ACM Transactions on Graphics 32(6), 2013). Pack quote:
  // "Surface data is only stored densely where measurements are observed."
  {
    id: 'voxel-hashing-2013',
    title: 'Real-time 3D reconstruction at scale using voxel hashing',
    authors: ['Matthias Nießner', 'Michael Zollhöfer', 'Shahram Izadi', 'Marc Stamminger'],
    year: 2013,
    venue: 'ACM Transactions on Graphics',
    url: 'https://doi.org/10.1145/2508363.2508374',
    type: 'paper',
  },
  // nerfpp-2020: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2010.07492 (v1 2020-10-15). Full text: "Such phenomena are encapsulated in the
  // shape-radiance ambiguity (Figure 1, left), wherein one can fit a set of training images
  // perfectly for an arbitrary incorrect geometry by a suitable choice of outgoing 2D radiance at
  // each surface point. We empirically show that the specific MLP structure used in NeRF plays an
  // important role in avoiding such ambiguities"; preceding sentence: "in the absence of any
  // regularization".
  {
    id: 'nerfpp-2020',
    title: 'NeRF++: Analyzing and Improving Neural Radiance Fields',
    authors: ['Kai Zhang', 'Gernot Riegler', 'Noah Snavely', 'Vladlen Koltun'],
    year: 2020,
    arxiv: '2010.07492',
    url: 'https://arxiv.org/abs/2010.07492',
    type: 'paper',
  },
  // vggt-2025: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2503.11651 abstract: "directly infers all key 3D attributes of a scene, including camera
  // parameters, point maps, depth maps, and 3D point tracks, from one, a few, or hundreds of its
  // views" and "reconstructing images in under one second".
  {
    id: 'vggt-2025',
    title: 'VGGT: Visual Geometry Grounded Transformer',
    authors: ['Jianyuan Wang', 'Minghao Chen', 'Nikita Karaev', 'Andrea Vedaldi', 'Christian Rupprecht', 'David Novotny'],
    year: 2025,
    venue: 'arXiv preprint (CVPR 2025)',
    arxiv: '2503.11651',
    url: 'https://arxiv.org/abs/2503.11651',
    type: 'paper',
  },
  // mapanything-2025: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2509.13414 abstract: "ingests one or more images along with optional geometric inputs such
  // as camera intrinsics, poses, depth, or partial reconstructions, and then directly regresses the
  // metric 3D scene geometry and cameras".
  {
    id: 'mapanything-2025',
    title: 'MapAnything: Universal Feed-Forward Metric 3D Reconstruction',
    authors: ['Nikhil Keetha', 'Norman Müller', 'Johannes Schönberger', 'Lorenzo Porzi', 'Yuchen Zhang', 'Tobias Fischer', 'Arno Knapitsch', 'Duncan Zauss', 'Ethan Weber', 'Nelson Antunes', 'Jonathon Luiten', 'Manuel Lopez-Antequera', 'Samuel Rota Bulò', 'Christian Richardt', 'Deva Ramanan', 'Sebastian Scherer', 'Peter Kontschieder'],
    year: 2025,
    venue: 'arXiv preprint (3DV 2026)',
    arxiv: '2509.13414',
    url: 'https://arxiv.org/abs/2509.13414',
    type: 'paper',
  },
  // pi3-2025: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2507.13347 abstract: "Previous methods often anchor their reconstructions to a designated
  // viewpoint, an inductive bias that can lead to instability and failures if the reference is
  // suboptimal."
  {
    id: 'pi3-2025',
    title: 'π³: Permutation-Equivariant Visual Geometry Learning',
    authors: ['Yifan Wang', 'Jianjun Zhou', 'Haoyi Zhu', 'Wenzheng Chang', 'Yang Zhou', 'Zizun Li', 'Junyi Chen', 'Jiangmiao Pang', 'Chunhua Shen', 'Tong He'],
    year: 2025,
    arxiv: '2507.13347',
    url: 'https://arxiv.org/abs/2507.13347',
    type: 'paper',
  },
  // depth-anything-3-2025: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2511.10647 abstract (authors' claim): "surpassing prior SOTA VGGT by an average of 44.3%
  // in camera pose accuracy and 25.1% in geometric accuracy".
  {
    id: 'depth-anything-3-2025',
    title: 'Depth Anything 3: Recovering the Visual Space from Any Views',
    authors: ['Haotong Lin', 'Sili Chen', 'Junhao Liew', 'Donny Y. Chen', 'Zhenyu Li', 'Guang Shi', 'Jiashi Feng', 'Bingyi Kang'],
    year: 2025,
    arxiv: '2511.10647',
    url: 'https://arxiv.org/abs/2511.10647',
    type: 'paper',
  },
  // sugar-2023: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2311.12775 abstract: "a regularization term that encourages the gaussians to align well
  // with the surface of the scene" and "extract a mesh from the Gaussians using Poisson
  // reconstruction".
  {
    id: 'sugar-2023',
    title: 'SuGaR: Surface-Aligned Gaussian Splatting for Efficient 3D Mesh Reconstruction and High-Quality Mesh Rendering',
    authors: ['Antoine Guédon', 'Vincent Lepetit'],
    year: 2023,
    arxiv: '2311.12775',
    url: 'https://arxiv.org/abs/2311.12775',
    type: 'paper',
  },
  // 2dgs-2024: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2403.17888 abstract: "3DGS fails to accurately represent surfaces due to the multi-view
  // inconsistent nature of 3D Gaussians", "collapse the 3D volume into a set of 2D oriented planar
  // Gaussian disks" and "2D Gaussians provide view-consistent geometry".
  {
    id: '2dgs-2024',
    title: '2D Gaussian Splatting for Geometrically Accurate Radiance Fields',
    authors: ['Binbin Huang', 'Zehao Yu', 'Anpei Chen', 'Andreas Geiger', 'Shenghua Gao'],
    year: 2024,
    arxiv: '2403.17888',
    url: 'https://arxiv.org/abs/2403.17888',
    type: 'paper',
  },
  // phystwin-2025: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts; also drafts/world-models/world-models-vs-simulators.citations.ts.
  {
    id: 'phystwin-2025',
    title: 'PhysTwin: Physics-Informed Reconstruction and Simulation of Deformable Objects from Videos',
    authors: ['Hanxiao Jiang', 'Hao-Yu Hsu', 'Kaifeng Zhang', 'Hsin-Ni Yu', 'Shenlong Wang', 'Yunzhu Li'],
    year: 2025,
    arxiv: '2503.17973',
    url: 'https://arxiv.org/abs/2503.17973',
    type: 'paper',
  },
  // f3rm-2023: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2308.07931 abstract: "leveraging distilled feature fields to combine accurate 3D geometry
  // with rich semantics from 2D foundation models" and "a few-shot learning method for 6-DOF
  // grasping and placing".
  {
    id: 'f3rm-2023',
    title: 'Distilled Feature Fields Enable Few-Shot Language-Guided Manipulation',
    authors: ['William Shen', 'Ge Yang', 'Alan Yu', 'Jansen Wong', 'Leslie Pack Kaelbling', 'Phillip Isola'],
    year: 2023,
    venue: 'arXiv preprint (CoRL 2023)',
    arxiv: '2308.07931',
    url: 'https://arxiv.org/abs/2308.07931',
    type: 'paper',
  },
  // dbow2-2012: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // Crossref 10.1109/TRO.2012.2197158 (IEEE T-RO 28(5), 2012); Crossref prints the byline with
  // initials. Pack quote: "The whole technique, including feature extraction, requires 22 ms/frame
  // in a sequence with 26 300 images that is one order of magnitude faster than previous
  // approaches."
  {
    id: 'dbow2-2012',
    title: 'Bags of Binary Words for Fast Place Recognition in Image Sequences',
    authors: ['D. Galvez-López', 'J. D. Tardos'],
    year: 2012,
    venue: 'IEEE Transactions on Robotics',
    url: 'https://doi.org/10.1109/TRO.2012.2197158',
    type: 'paper',
  },
  // droid-slam-2021: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2108.10869 abstract: "DROID-SLAM consists of recurrent iterative updates of camera pose
  // and pixelwise depth through a Dense Bundle Adjustment layer."
  {
    id: 'droid-slam-2021',
    title: 'DROID-SLAM: Deep Visual SLAM for Monocular, Stereo, and RGB-D Cameras',
    authors: ['Zachary Teed', 'Jia Deng'],
    year: 2021,
    arxiv: '2108.10869',
    url: 'https://arxiv.org/abs/2108.10869',
    type: 'paper',
  },
  // anyloc-2023: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2308.00688 abstract: "general-purpose feature representations derived from off-the-shelf
  // self-supervised models with no VPR-specific training", "(urban, outdoors, indoors, aerial,
  // underwater, and subterranean environments) without any re-training or fine-tuning" and "to
  // achieve up to 4X significantly higher performance than existing approaches".
  {
    id: 'anyloc-2023',
    title: 'AnyLoc: Towards Universal Visual Place Recognition',
    authors: ['Nikhil Keetha', 'Avneesh Mishra', 'Jay Karhade', 'Krishna Murthy Jatavallabhula', 'Sebastian Scherer', 'Madhava Krishna', 'Sourav Garg'],
    year: 2023,
    venue: 'arXiv preprint (IEEE RA-L 2023)',
    arxiv: '2308.00688',
    url: 'https://arxiv.org/abs/2308.00688',
    type: 'paper',
  },
  // gnc-2019: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 1909.08605 abstract: "Although GNC's global optimality cannot be guaranteed, we
  // demonstrate the empirical robustness" and "Our solvers are robust to 70-80% of outliers,
  // outperform RANSAC".
  {
    id: 'gnc-2019',
    title: 'Graduated Non-Convexity for Robust Spatial Perception: From Non-Minimal Solvers to Global Outlier Rejection',
    authors: ['Heng Yang', 'Pasquale Antonante', 'Vasileios Tzoumas', 'Luca Carlone'],
    year: 2019,
    venue: 'IEEE Robotics and Automation Letters',
    arxiv: '1909.08605',
    url: 'https://arxiv.org/abs/1909.08605',
    type: 'paper',
  },
  // splatam-2023: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2312.02126 abstract: "It utilizes a silhouette mask to elegantly capture the presence of
  // scene density." and "quickly determining if areas have been previously mapped".
  {
    id: 'splatam-2023',
    title: 'SplaTAM: Splat, Track & Map 3D Gaussians for Dense RGB-D SLAM',
    authors: ['Nikhil Keetha', 'Jay Karhade', 'Krishna Murthy Jatavallabhula', 'Gengshan Yang', 'Sebastian Scherer', 'Deva Ramanan', 'Jonathon Luiten'],
    year: 2023,
    venue: 'arXiv preprint (CVPR 2024)',
    arxiv: '2312.02126',
    url: 'https://arxiv.org/abs/2312.02126',
    type: 'paper',
  },
  // monogs-2023: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2312.06741 abstract: "Our method, which runs live at 3fps, utilises Gaussians as the only
  // 3D representation".
  {
    id: 'monogs-2023',
    title: 'Gaussian Splatting SLAM',
    authors: ['Hidenobu Matsuki', 'Riku Murai', 'Paul H. J. Kelly', 'Andrew J. Davison'],
    year: 2023,
    venue: 'arXiv preprint (CVPR 2024)',
    arxiv: '2312.06741',
    url: 'https://arxiv.org/abs/2312.06741',
    type: 'paper',
  },
  // mast3r-slam-2024: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts; also drafts/classical/state-estimation.citations.ts.
  {
    id: 'mast3r-slam-2024',
    title: 'MASt3R-SLAM: Real-Time Dense SLAM with 3D Reconstruction Priors',
    authors: ['Riku Murai', 'Eric Dexheimer', 'Andrew J. Davison'],
    year: 2024,
    venue: 'arXiv preprint (CVPR 2025)',
    arxiv: '2412.12392',
    url: 'https://arxiv.org/abs/2412.12392',
    type: 'paper',
  },
  // slam3r-2024: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2412.09401 abstract: "all without explicitly solving any camera parameters" and
  // "maintaining real-time performance at 20+ FPS".
  {
    id: 'slam3r-2024',
    title: 'SLAM3R: Real-Time Dense Scene Reconstruction from Monocular RGB Videos',
    authors: ['Yuzheng Liu', 'Siyan Dong', 'Shuzhe Wang', 'Yingda Yin', 'Yanchao Yang', 'Qingnan Fan', 'Baoquan Chen'],
    year: 2024,
    venue: 'arXiv preprint (CVPR 2025)',
    arxiv: '2412.09401',
    url: 'https://arxiv.org/abs/2412.09401',
    type: 'paper',
  },
  // vggt-slam-2025: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2505.12549 abstract: "the scene can only be reconstructed up to a 15-degrees-of-freedom
  // projective transformation of the true geometry".
  {
    id: 'vggt-slam-2025',
    title: 'VGGT-SLAM: Dense RGB SLAM Optimized on the SL(4) Manifold',
    authors: ['Dominic Maggio', 'Hyungtae Lim', 'Luca Carlone'],
    year: 2025,
    arxiv: '2505.12549',
    url: 'https://arxiv.org/abs/2505.12549',
    type: 'paper',
  },
  // cartographer-2016: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // Crossref 10.1109/ICRA.2016.7487258 (ICRA 2016). Pack quote: "We present the approach used in our
  // backpack mapping platform which achieves real-time mapping and loop closure at a 5 cm
  // resolution."
  {
    id: 'cartographer-2016',
    title: 'Real-time loop closure in 2D LIDAR SLAM',
    authors: ['Wolfgang Hess', 'Damon Kohler', 'Holger Rapp', 'Daniel Andor'],
    year: 2016,
    venue: '2016 IEEE International Conference on Robotics and Automation (ICRA)',
    url: 'https://doi.org/10.1109/ICRA.2016.7487258',
    type: 'paper',
  },
  // hydra-2022: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2201.13360 abstract: "these algorithms build a local Euclidean Signed Distance Function
  // (ESDF) around the current robot location, extract a topological map of places from the ESDF, and
  // then segment the places into rooms".
  {
    id: 'hydra-2022',
    title: 'Hydra: A Real-time Spatial Perception System for 3D Scene Graph Construction and Optimization',
    authors: ['Nathan Hughes', 'Yun Chang', 'Luca Carlone'],
    year: 2022,
    venue: 'Robotics: Science and Systems (RSS) 2022',
    arxiv: '2201.13360',
    url: 'https://arxiv.org/abs/2201.13360',
    type: 'paper',
  },
  // conceptfusion-2023: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2302.07241 abstract: "We demonstrate that pixel-aligned open-set features can be fused
  // into 3D maps via traditional SLAM and multi-view fusion approaches."
  {
    id: 'conceptfusion-2023',
    title: 'ConceptFusion: Open-set Multimodal 3D Mapping',
    authors: ['Krishna Murthy Jatavallabhula', 'Alihusein Kuwajerwala', 'Qiao Gu', 'Mohd Omama', 'Tao Chen', 'Alaa Maalouf', 'Shuang Li', 'Ganesh Iyer', 'Soroush Saryazdi', 'Nikhil Keetha', 'Ayush Tewari', 'Joshua B. Tenenbaum', 'Celso Miguel de Melo', 'Madhava Krishna', 'Liam Paull', 'Florian Shkurti', 'Antonio Torralba'],
    year: 2023,
    venue: 'Robotics: Science and Systems (RSS) 2023',
    arxiv: '2302.07241',
    url: 'https://arxiv.org/abs/2302.07241',
    type: 'paper',
  },
  // conceptgraphs-2023: domain pass 2026-10-06, from drafts/classical/scene-representation.citations.ts.
  // arXiv 2309.16650 abstract: "these approaches tend to produce maps with per-point feature
  // vectors, which do not scale well in larger environments".
  {
    id: 'conceptgraphs-2023',
    title: 'ConceptGraphs: Open-Vocabulary 3D Scene Graphs for Perception and Planning',
    authors: ['Qiao Gu', 'Alihusein Kuwajerwala', 'Sacha Morin', 'Krishna Murthy Jatavallabhula', 'Bipasha Sen', 'Aditya Agarwal', 'Corban Rivera', 'William Paul', 'Kirsty Ellis', 'Rama Chellappa', 'Chuang Gan', 'Celso Miguel de Melo', 'Joshua B. Tenenbaum', 'Antonio Torralba', 'Florian Shkurti', 'Liam Paull'],
    year: 2023,
    arxiv: '2309.16650',
    url: 'https://arxiv.org/abs/2309.16650',
    type: 'paper',
  },
  // gordon-salmond-smith-1993: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1049/ip-f-2.1993.0015 (IEE Proc. F 140(2), 1993); byline printed with initials. Pack
  // quote: "The method is not restricted by assumptions of linearity or Gaussian noise: it may be
  // applied to any state transition or measurement model."
  {
    id: 'gordon-salmond-smith-1993',
    title: 'Novel approach to nonlinear/non-Gaussian Bayesian state estimation',
    authors: ['N. J. Gordon', 'D. J. Salmond', 'A. F. M. Smith'],
    year: 1993,
    venue: 'IEE Proceedings F (Radar and Signal Processing)',
    url: 'https://doi.org/10.1049/ip-f-2.1993.0015',
    type: 'paper',
  },
  // dellaert-mcl-1999: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1109/ROBOT.1999.772544 (ICRA 1999; Crossref carries no issued year, 1999 is the
  // conference year); byline printed with initials. Pack quote: "We show experimentally that the
  // resulting method is able to efficiently localize a mobile robot without knowledge of its
  // starting location."
  {
    id: 'dellaert-mcl-1999',
    title: 'Monte Carlo localization for mobile robots',
    authors: ['F. Dellaert', 'D. Fox', 'W. Burgard', 'S. Thrun'],
    year: 1999,
    venue: 'ICRA 1999',
    url: 'https://doi.org/10.1109/ROBOT.1999.772544',
    type: 'paper',
  },
  // kalman-bucy-1961: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1115/1.3658902 (J. Basic Engineering 83(1), 1961); byline printed with initials.
  // Pack quote: "A nonlinear differential equation of the Riccati type is derived for the covariance
  // matrix of the optimal filtering error."
  {
    id: 'kalman-bucy-1961',
    title: 'New Results in Linear Filtering and Prediction Theory',
    authors: ['R. E. Kalman', 'R. S. Bucy'],
    year: 1961,
    venue: 'J. Basic Engineering',
    url: 'https://doi.org/10.1115/1.3658902',
    type: 'paper',
  },
  // julier-uhlmann-2004: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1109/JPROC.2003.823141 (Proc. IEEE 92(3), 2004); byline printed with initials. Pack
  // quote: "more than 35 years of experience in the estimation community has shown that is difficult
  // to implement, difficult to tune, and only reliable for systems that are almost linear on the
  // time scale of the updates".
  {
    id: 'julier-uhlmann-2004',
    title: 'Unscented Filtering and Nonlinear Estimation',
    authors: ['S. J. Julier', 'J. K. Uhlmann'],
    year: 2004,
    venue: 'Proceedings of the IEEE',
    url: 'https://doi.org/10.1109/JPROC.2003.823141',
    type: 'paper',
  },
  // li-mourikis-2013: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1177/0278364913481251 (IJRR 32(6), 2013). Pack quote: "we prove that both types of
  // EKF approaches are inconsistent, due to the way in which Jacobians are computed" / "which causes
  // the filters to underestimate the uncertainty in the state estimates".
  {
    id: 'li-mourikis-2013',
    title: 'High-precision, consistent EKF-based visual-inertial odometry',
    authors: ['Mingyang Li', 'Anastasios I. Mourikis'],
    year: 2013,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/0278364913481251',
    type: 'paper',
  },
  // hartley-inekf-2019: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // arXiv 1904.09251 v1 2019-04-19 (IJRR 2020). "unlike the standard EKF, neither the linearized
  // error dynamics nor the linearized observation model depend on the current state estimate".
  {
    id: 'hartley-inekf-2019',
    title: 'Contact-Aided Invariant Extended Kalman Filtering for Robot State Estimation',
    authors: ['Ross Hartley', 'Maani Ghaffari', 'Ryan M. Eustice', 'Jessy W. Grizzle'],
    year: 2019,
    venue: 'arXiv preprint (Int. J. Robotics Research 2020)',
    arxiv: '1904.09251',
    url: 'https://arxiv.org/abs/1904.09251',
    type: 'paper',
  },
  // eqvio-2022: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // arXiv 2205.01980 v1 2022-05-04; journal ref IEEE T-RO 39(5):3567-3585, Oct. 2023. "the
  // equivariant filter (EqF) based on this Lie group is a consistent estimator for VIO with lower
  // linearisation error in the propagation of state dynamics".
  {
    id: 'eqvio-2022',
    title: 'EqVIO: An Equivariant Filter for Visual Inertial Odometry',
    authors: ['Pieter van Goor', 'Robert Mahony'],
    year: 2022,
    venue: 'IEEE Trans. Robotics',
    arxiv: '2205.01980',
    url: 'https://arxiv.org/abs/2205.01980',
    type: 'paper',
  },
  // gtsam-4-3-2026: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // GitHub release page read 2026-10-04 (published 2026-09-18). "GTSAM 4.3 moves to C++17 and modern
  // Eigen versions"; "GTSAM 4.3 introduces experimental CUDA acceleration for both bundle adjustment
  // and more general nonlinear optimization."; "EKF and invariant-EKF infrastructure, equivariant
  // filtering and EqVIO support"; "several legged-state-estimation implementations". Distinct from
  // gtsam-2026 (gtsam.org homepage).
  {
    id: 'gtsam-4-3-2026',
    title: 'GTSAM 4.3.0',
    authors: ['Frank Dellaert', 'GTSAM Contributors'],
    year: 2026,
    venue: 'borglab/gtsam GitHub release, 2026-09-18',
    url: 'https://github.com/borglab/gtsam/releases/tag/4.3.0',
    type: 'docs',
  },
  // rauch-tung-striebel-1965: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.2514/3.3166 (AIAA Journal 3(8), 1965); Crossref prints the byline in capitals with
  // initials. Pack quote: "Difference equations relating the estimates for the problems of filtering
  // and smoothing are derived" / "A numerical example is included to show the advantage of smoothing
  // in reducing the errors in estimation."
  {
    id: 'rauch-tung-striebel-1965',
    title: 'Maximum likelihood estimates of linear dynamic systems',
    authors: ['H. E. Rauch', 'F. Tung', 'C. T. Striebel'],
    year: 1965,
    venue: 'AIAA Journal',
    url: 'https://doi.org/10.2514/3.3166',
    type: 'paper',
  },
  // grisetti-gmapping-2007: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1109/TRO.2006.889486 (IEEE T-RO 23(1), 2007). Pack quote: "This approach uses a
  // particle filter in which each particle carries an individual map of the environment."
  {
    id: 'grisetti-gmapping-2007',
    title: 'Improved Techniques for Grid Mapping With Rao-Blackwellized Particle Filters',
    authors: ['Giorgio Grisetti', 'Cyrill Stachniss', 'Wolfram Burgard'],
    year: 2007,
    venue: 'IEEE Trans. Robotics',
    url: 'https://doi.org/10.1109/TRO.2006.889486',
    type: 'paper',
  },
  // msckf-2007: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1109/ROBOT.2007.364024 (ICRA 2007). Pack quote: "This measurement model does not
  // require including the 3D feature position in the state vector of the EKF and is optimal, up to
  // linearization errors."
  {
    id: 'msckf-2007',
    title: 'A Multi-State Constraint Kalman Filter for Vision-aided Inertial Navigation',
    authors: ['Anastasios I. Mourikis', 'Stergios I. Roumeliotis'],
    year: 2007,
    venue: 'ICRA 2007',
    url: 'https://doi.org/10.1109/ROBOT.2007.364024',
    type: 'paper',
  },
  // okvis-2014: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1177/0278364914554813 (IJRR; Crossref issued 2014, issue 34(3) dated 2015). Pack
  // quote: "advancements in visual estimation suggest that nonlinear optimization offers superior
  // accuracy, while still tractable in complexity thanks to the sparsity of the underlying problem."
  {
    id: 'okvis-2014',
    title: 'Keyframe-based visual–inertial odometry using nonlinear optimization',
    authors: ['Stefan Leutenegger', 'Simon Lynen', 'Michael Bosse', 'Roland Siegwart', 'Paul Furgale'],
    year: 2014,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/0278364914554813',
    type: 'paper',
  },
  // backprop-kf-2016: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // arXiv 1605.07148 v1 2016-05-23 (NIPS 2016). "the parameters of the latent state distribution are
  // directly optimized as a deterministic computation graph"; "raw camera images, which must be
  // processed using expressive nonlinear function approximators such as convolutional neural
  // networks"; "the connection to probabilistic filtering allows us to design a network architecture
  // that is particularly well suited for state estimation".
  {
    id: 'backprop-kf-2016',
    title: 'Backprop KF: Learning Discriminative Deterministic State Estimators',
    authors: ['Tuomas Haarnoja', 'Anurag Ajay', 'Sergey Levine', 'Pieter Abbeel'],
    year: 2016,
    venue: 'NIPS 2016',
    arxiv: '1605.07148',
    url: 'https://arxiv.org/abs/1605.07148',
    type: 'paper',
  },
  // tlio-2020: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // arXiv 2007.01867 v1 2020-07-06 (IEEE RA-L). "This paper demonstrates a network that regresses 3D
  // displacement estimates and its uncertainty, giving us the ability to tightly fuse the relative
  // state measurement into a stochastic cloning EKF".
  {
    id: 'tlio-2020',
    title: 'TLIO: Tight Learned Inertial Odometry',
    authors: ['Wenxin Liu', 'David Caruso', 'Eddy Ilg', 'Jing Dong', 'Anastasios I. Mourikis', 'Kostas Daniilidis', 'Vijay Kumar', 'Jakob Engel'],
    year: 2020,
    venue: 'IEEE Robotics and Automation Letters',
    arxiv: '2007.01867',
    url: 'https://arxiv.org/abs/2007.01867',
    type: 'paper',
  },
  // airio-2025: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // arXiv 2501.15659 v1 2025-01-26. "Combined with a data-driven IMU correction model (AirIMU) and
  // an uncertainty-aware Extended Kalman Filter (EKF), our approach ensures robust state estimation
  // under aggressive UAV maneuvers".
  {
    id: 'airio-2025',
    title: 'AirIO: Learning Inertial Odometry with Enhanced IMU Feature Observability',
    authors: ['Yuheng Qiu', 'Can Xu', 'Yutian Chen', 'Shibo Zhao', 'Junyi Geng', 'Sebastian Scherer'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2501.15659',
    url: 'https://arxiv.org/abs/2501.15659',
    type: 'paper',
  },
  // mac-vo-2024: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // arXiv 2409.09479 v1 2024-09-14 (ICRA 2025). "we design a metrics-aware covariance model to
  // capture the spatial error during keypoint registration and the correlations between different
  // axes. Integrating this covariance model into pose graph optimization enhances the robustness and
  // reliability of pose estimation".
  {
    id: 'mac-vo-2024',
    title: 'MAC-VO: Metrics-aware Covariance for Learning-based Stereo Visual Odometry',
    authors: ['Yuheng Qiu', 'Yutian Chen', 'Zihao Zhang', 'Wenshan Wang', 'Sebastian Scherer'],
    year: 2024,
    venue: 'arXiv preprint (ICRA 2025)',
    arxiv: '2409.09479',
    url: 'https://arxiv.org/abs/2409.09479',
    type: 'paper',
  },
  // tartan-imu-2025: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // CVF open-access PDF read 2026-10-04 (CVPR 2025); byline from the PDF. "a pre-trained foundation
  // model leverages over 100 hours of multi-platform data to establish general motion knowledge,
  // achieving 36% improvement in ATE over specialized models"; "allowing the model to continuously
  // "learn as it operates" at 200 FPS in real-time".
  {
    id: 'tartan-imu-2025',
    title: 'Tartan IMU: A Light Foundation Model for Inertial Positioning in Robotics',
    authors: ['Shibo Zhao', 'Sifan Zhou', 'Raphael Blanchard', 'Yuheng Qiu', 'Wenshan Wang', 'Sebastian Scherer'],
    year: 2025,
    venue: 'CVPR 2025',
    url: 'https://openaccess.thecvf.com/content/CVPR2025/papers/Zhao_Tartan_IMU_A_Light_Foundation_Model_for_Inertial_Positioning_in_CVPR_2025_paper.pdf',
    type: 'paper',
  },
  // gait-2026: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // arXiv 2606.14160 v1 2026-06-12. "the proposed method learns this behavior without relying on an
  // explicit contact estimator or on explicit measurement updates based on a stationary contact
  // assumption"; "we conducted experiments on a Unitree Go1 robot"; "also improves performance over
  // contact-aided model-based methods".
  {
    id: 'gait-2026',
    title: 'GAIT: Legged Robot Proprioceptive State Estimation with Attention over Inertial-Leg Tokens',
    authors: ['Young-Rang Seo', 'Hajun Kim', 'Sangmin Kim', 'Dongyun Kang', 'Hae-Won Park'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2606.14160',
    url: 'https://arxiv.org/abs/2606.14160',
    type: 'paper',
  },
  // planet-2018: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts; also drafts/world-models/latent-dynamics.citations.ts.
  // "a multi-step variational inference objective".
  {
    id: 'planet-2018',
    title: 'Learning Latent Dynamics for Planning from Pixels',
    authors: ['Danijar Hafner', 'Timothy Lillicrap', 'Ian Fischer', 'Ruben Villegas', 'David Ha', 'Honglak Lee', 'James Davidson'],
    year: 2018,
    arxiv: '1811.04551',
    url: 'https://arxiv.org/abs/1811.04551',
    type: 'paper',
  },
  // dreamerv3-nature-2025: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts; also drafts/world-models/latent-dynamics.citations.ts.
  // Pack quote: "Dreamer learns a model of the environment and improves its behaviour by imagining
  // future scenarios."
  {
    id: 'dreamerv3-nature-2025',
    title: 'Mastering diverse control tasks through world models',
    authors: ['Danijar Hafner', 'Jurgis Pasukonis', 'Jimmy Ba', 'Timothy Lillicrap'],
    year: 2025,
    venue: 'Nature 640, 647-653',
    url: 'https://doi.org/10.1038/s41586-025-08744-2',
    type: 'paper',
  },
  // li-mourikis-temporal-2014: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1177/0278364913515286 (IJRR 33(7), 2014). Pack quote: "When fusing visual and
  // inertial measurements for motion estimation, each measurement's sampling time must be precisely
  // known." / "We show that the offset is locally identifiable, except in a small number of
  // degenerate motion cases".
  {
    id: 'li-mourikis-temporal-2014',
    title: 'Online temporal calibration for camera–IMU systems: Theory and algorithms',
    authors: ['Mingyang Li', 'Anastasios I. Mourikis'],
    year: 2014,
    venue: 'Int. J. Robotics Research',
    url: 'https://doi.org/10.1177/0278364913515286',
    type: 'paper',
  },
  // li-rolling-shutter-2013: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1109/ICRA.2013.6631248 (ICRA 2013). Pack quote: "the vast majority of consumer-grade
  // cameras use rolling-shutter sensors, which capture each row of pixels at a slightly different
  // time instant".
  {
    id: 'li-rolling-shutter-2013',
    title: 'Real-time motion tracking on a cellphone using inertial sensing and a rolling-shutter camera',
    authors: ['Mingyang Li', 'Byung Hyung Kim', 'Anastasios I. Mourikis'],
    year: 2013,
    venue: 'ICRA 2013',
    url: 'https://doi.org/10.1109/ICRA.2013.6631248',
    type: 'paper',
  },
  // openvins-2020: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // Crossref 10.1109/ICRA40945.2020.9196524 (ICRA 2020). Pack quote: "(i) on-manifold sliding window
  // Kalman filter, (ii) online camera intrinsic and extrinsic calibration, (iii) camera to inertial
  // sensor time offset calibration".
  {
    id: 'openvins-2020',
    title: 'OpenVINS: A Research Platform for Visual-Inertial Estimation',
    authors: ['Patrick Geneva', 'Kevin Eckenhoff', 'Woosik Lee', 'Yulin Yang', 'Guoquan Huang'],
    year: 2020,
    venue: 'ICRA 2020',
    url: 'https://doi.org/10.1109/ICRA40945.2020.9196524',
    type: 'paper',
  },
  // grandtour-2026: domain pass 2026-10-06, from drafts/classical/state-estimation.citations.ts.
  // arXiv 2602.18164 v1 2026-02-20. "it includes high-precision ground-truth trajectories from
  // satellite-based RTK-GNSS and a Leica Geosystems total station"; "GrandTour represents the
  // largest open-access legged-robotics dataset to date".
  {
    id: 'grandtour-2026',
    title: 'GrandTour: A Legged Robotics Dataset in the Wild for Multi-Modal Perception and State Estimation',
    authors: ['Turcan Tuna', 'Jonas Frey', 'Frank Fu', 'Katharine Patterson', 'Tianao Xu', 'Maurice Fallon', 'Cesar Cadena', 'Marco Hutter'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2602.18164',
    url: 'https://arxiv.org/abs/2602.18164',
    type: 'paper',
  },
  // eyerobot-2-2026: domain pass 2026-10-06, KOL intake note of Ken Goldberg, from drafts/classical/perception.citations.ts.
  // Refresh 2026-10-06 against mission HEAD 8c34ffbb, KOL intake note of Ken Goldberg.
  // Title, authors and abstract read on the arXiv abstract page on 2026-10-06 (v1 2 Oct 2026).
  {
    id: 'eyerobot-2-2026',
    title: 'EyeRobot 2.0: Active Gaze for Precise Manipulation without Wrist Cameras',
    authors: ['Kush Hari', 'Justin Kerr', 'Nidhya Shivakumar', 'Samarth Mahapatra', 'Carmelo Sferrazza', 'Jiahui Lei', 'Jitendra Malik', 'C. Karen Liu', 'Ken Goldberg', 'Angjoo Kanazawa'],
    year: 2026,
    arxiv: '2610.03710',
    url: 'https://arxiv.org/abs/2610.03710',
    type: 'paper',
  },
  // forcetwin-2026: domain pass 2026-10-06, KOL intake note of Marco Hutter.
  // KOL backlog step of 2026-10-07: abstract page and PDF first page fetched 2026-10-07; v1 submitted
  // 18 September 2026. ETH Zurich, NVIDIA, Microsoft and University of Bonn.
  {
    id: 'forcetwin-2026',
    title: 'ForceTwin: Physics-informed Digital Twins for Robotic Manipulation from Instrumented Human Interaction',
    authors: ['Tim Engelbracht', 'René Zurbrügg', 'Mayank Mittal', 'Marco Hutter', 'Marc Pollefeys', 'Hermann Blum', 'Zuria Bauer'],
    year: 2026,
    arxiv: '2609.21751',
    url: 'https://arxiv.org/abs/2609.21751',
    type: 'paper',
  },
  // particlesplat-2026: domain pass 2026-10-06, KOL intake note of Deepak Pathak.
  // KOL backlog step of 2026-10-07: abstract page and PDF first page fetched 2026-10-07; v1 submitted
  // 16 September 2026. Robotics Institute, Carnegie Mellon University.
  {
    id: 'particlesplat-2026',
    title: 'ParticleSplat: Self-supervised Object-centric Latent Particle Splatting',
    authors: ['Lyuxing He', 'Daniel Guo', 'Elizabeth Terveen', 'Deepak Pathak', 'David Held', 'Tal Daniel'],
    year: 2026,
    arxiv: '2609.19463',
    url: 'https://arxiv.org/abs/2609.19463',
    type: 'paper',
  },
  // scenelm-2026: domain pass 2026-10-06, KOL intake note of Jitendra Malik.
  // KOL backlog step of 2026-10-07: abstract page and PDF first page fetched 2026-10-07; v1 submitted
  // 18 September 2026. Chalmers, Zenseact, Stanford, UC Berkeley and NVIDIA.
  {
    id: 'scenelm-2026',
    title: 'A Scene Language Model for Open-Vocabulary Scene Mapping',
    authors: ['Adam Lilja', 'Fabio Hübel', 'Siming He', 'Junsheng Fu', 'Claire Tomlin', 'Lars Hammarstrand', 'Jitendra Malik', 'Jonas Frey', 'Marco Pavone'],
    year: 2026,
    arxiv: '2609.21400',
    url: 'https://arxiv.org/abs/2609.21400',
    type: 'paper',
  },
  // tacdyn-wam-2026: domain pass 2026-10-06, KOL intake note of Cheng Chi.
  // KOL backlog step of 2026-10-07: abstract page, HTML and PDF first page fetched 2026-10-07; v1 submitted
  // 30 September 2026. The paper places its Cheng Chi at Renmin University's School of Information; the
  // sentence credits the first and corresponding authors, both at Tsinghua University's AIR.
  {
    id: 'tacdyn-wam-2026',
    title: 'TacDyn-WAM: Learning Implicit Tactile Dynamics in a Heterogeneous Visuo-Tactile World Action Model',
    authors: [
      'Enyi Wang', 'Mingxin Wang', 'Quan Shi', 'Hetian Guo', 'Hongyu Wang', 'Xi Wang', 'Bin Qian', 'Yupeng Zheng',
      'Wenxuan Song', 'Houde Liu', 'Yong Xu', 'Cheng Chi', 'Wenchao Ding', 'Yilun Chen', 'Yan Wang',
    ],
    year: 2026,
    arxiv: '2610.00638',
    url: 'https://arxiv.org/abs/2610.00638',
    type: 'paper',
  },
  // amb3r-slam-2026: domain pass 2026-10-06, owner sweep item SR.R3 (also SE.R2), added 2026-10-08.
  // Abstract page fetched 2026-10-08; v1 submitted 17 September 2026.
  {
    id: 'amb3r-slam-2026',
    title: 'AMB3R-SLAM: Kilometer-scale SLAM with Hierarchical Backend',
    authors: ['Hengyi Wang', 'Lourdes Agapito'],
    year: 2026,
    arxiv: '2609.19518',
    url: 'https://arxiv.org/abs/2609.19518',
    type: 'paper',
  },
  // azure-kinect-sdk-retirement-2024: domain pass 2026-10-06, owner sweep item P.R5, added 2026-10-08.
  // The SDK repository's support page, pinned to commit 3c79d56 of 21 June 2024 ("Adding retirement
  // date for Azure Kinect DK Sensor SDK"), the commit that added the retirement section; read
  // 2026-10-08. Microsoft's linked end-of-production announcement sits behind a sign-in.
  {
    id: 'azure-kinect-sdk-retirement-2024',
    title: 'Microsoft Support for Azure Kinect DK Sensor SDK',
    authors: ['Microsoft'],
    year: 2024,
    venue: 'Azure Kinect Sensor SDK repository, GitHub',
    url: 'https://github.com/microsoft/Azure-Kinect-Sensor-SDK/blob/3c79d56c2aa082d62ebae6ccf217191e6d4e2cfa/microsoft-support.md',
    type: 'docs',
  },
  // genesis-handover-2026: domain pass 2026-10-06, KOL intake note of Marco Hutter, added 2026-10-08.
  // Abstract page and HTML full text fetched 2026-10-08; v1 submitted 6 October 2026, accepted to
  // CoRL 2026. ETH Zurich, Robotic Systems Lab.
  {
    id: 'genesis-handover-2026',
    title: 'Reactive Task-Oriented Robot-Human Handovers via Generative Hypothesis Selection',
    authors: ['Carmen Scheidemann', 'Andreea Tulbure', 'Pascal Burkhardt', 'Marco Hutter'],
    year: 2026,
    arxiv: '2610.08003',
    url: 'https://arxiv.org/abs/2610.08003',
    type: 'paper',
  },
  // graspgen-x-2026: domain pass 2026-10-06, owner sweep item G.R2, added 2026-10-08.
  // Abstract page fetched 2026-10-08; v1 submitted 31 May 2026.
  {
    id: 'graspgen-x-2026',
    title: 'GraspGen-X: Cross-Embodiment 6-DOF Diffusion-based Grasping',
    authors: [
      'Beining Han', 'Yu-Wei Chao', 'Erwin Coumans', 'Clemens Eppner', 'Balakumar Sundaralingam', 'Jia Deng',
      'Stan Birchfield', 'Adithyavairavan Murali',
    ],
    year: 2026,
    arxiv: '2606.00998',
    url: 'https://arxiv.org/abs/2606.00998',
    type: 'paper',
  },
  // intrinsic-ai-for-industry-challenge-2026: domain pass 2026-10-06, owner sweep item C.R3, added 2026-10-08.
  // Intrinsic's recap of its own challenge, dated 22 September 2026, read 2026-10-08. The post names no
  // individual author, so the organisation stands as author.
  {
    id: 'intrinsic-ai-for-industry-challenge-2026',
    title: 'Robotics is hard - it’s much easier when 5,000 developers get involved',
    authors: ['Intrinsic'],
    year: 2026,
    url: 'https://www.intrinsic.ai/blog/posts/ai-for-industry-challenge',
    type: 'blog',
  },
  // neural-motion-planner-survey-2026: domain pass 2026-10-06, owner sweep item MP.R4, added 2026-10-08.
  // Abstract page fetched 2026-10-08; v1 submitted 25 March 2026. The venue is the arXiv journal
  // reference: IEEE Transactions on Automation Science and Engineering, vol. 23, pp. 4488-4531, 2026.
  {
    id: 'neural-motion-planner-survey-2026',
    title: 'Toward Generalist Neural Motion Planners for Robotic Manipulators: Challenges and Opportunities',
    authors: ['Davood Soleymanzadeh', 'Ivan Lopez-Sanchez', 'Hao Su', 'Yunzhu Li', 'Xiao Liang', 'Minghui Zheng'],
    year: 2026,
    venue: 'IEEE Transactions on Automation Science and Engineering',
    arxiv: '2603.24318',
    url: 'https://arxiv.org/abs/2603.24318',
    type: 'paper',
  },
  // bd-atlas-hand-2026: domain pass 2026-10-06, KOL intake note of Boston Dynamics, added 2026-10-09.
  // Boston Dynamics blog post, datePublished 2026-10-01T13:10:02Z in the page's JSON-LD, read
  // 2026-10-09. The byline is a site account, so the company stands as author.
  {
    id: 'bd-atlas-hand-2026',
    title: 'Robot Hands for Modern AI and Real Work',
    authors: ['Boston Dynamics'],
    year: 2026,
    url: 'https://bostondynamics.com/blog/robot-hands-for-modern-ai-and-real-work/',
    type: 'blog',
  },
  // runway-gwm-robotics-eval-2026: domain pass 2026-10-06, KOL intake note of The Robot Report on
  // Praxis-1, added 2026-10-09; the id is the one the owner's world-models evaluation draft uses.
  // Runway Research post dated 27 February 2026 on the page (datePublished 2026-02-27 in its JSON-LD),
  // byline Runway Robotics (Andy Chen, Lucas Eager Leavitt, Rik Heijdens, Robin Kahlow), read 2026-10-09.
  {
    id: 'runway-gwm-robotics-eval-2026',
    title: 'Accelerating Robot Policy Evaluation with General World Models',
    authors: ['Andy Chen', 'Lucas Eager Leavitt', 'Rik Heijdens', 'Robin Kahlow'],
    year: 2026,
    venue: 'Runway Research',
    url: 'https://runway.com/research/accelerating-robot-policy-evaluation',
    type: 'blog',
  },
  // runway-praxis-1-2026: domain pass 2026-10-06, KOL intake note of The Robot Report on Praxis-1,
  // added 2026-10-09. Runway Research post headed "Research · September 2026" (datePublished
  // 2026-09-30T17:00Z in its JSON-LD), no named author, read 2026-10-09.
  {
    id: 'runway-praxis-1-2026',
    title: 'Introducing Praxis-1',
    authors: ['Runway'],
    year: 2026,
    venue: 'Runway Research',
    url: 'https://runway.com/research/introducing-praxis-1',
    type: 'blog',
  },
  // omniretarget-2025: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2509.26633 (v1 2025-09-30). Abstract: "A dominant paradigm for teaching humanoid robots
  // complex skills is to retarget human motions as kinematic references to train reinforcement
  // learning (RL) policies."
  {
    id: 'omniretarget-2025',
    title: 'OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation and Scene Interaction',
    authors: ['Lujie Yang', 'Xiaoyu Huang', 'Zhen Wu', 'Angjoo Kanazawa', 'Pieter Abbeel', 'Carmelo Sferrazza', 'C. Karen Liu', 'Rocky Duan', 'Guanya Shi'],
    year: 2025,
    arxiv: '2509.26633',
    url: 'https://arxiv.org/abs/2509.26633',
    type: 'paper',
  },
  // deepmimic-2018: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 1804.02717 (v1 2018-04-08). Abstract: "We show that well-known reinforcement learning (RL)
  // methods can be adapted to learn robust control policies capable of imitating a broad range of
  // example motion clips", "Our method handles keyframed motions, highly-dynamic actions such as
  // motion-captured flips and spins, and retargeted motions" and "We demonstrate results using
  // multiple characters (human, Atlas robot, bipedal dinosaur, dragon)".
  {
    id: 'deepmimic-2018',
    title: 'DeepMimic: Example-Guided Deep Reinforcement Learning of Physics-Based Character Skills',
    authors: ['Xue Bin Peng', 'Pieter Abbeel', 'Sergey Levine', 'Michiel van de Panne'],
    year: 2018,
    arxiv: '1804.02717',
    url: 'https://arxiv.org/abs/1804.02717',
    type: 'paper',
  },
  // amass-2019: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 1904.03278 (v1 2019-04-05). Abstract: "AMASS, a large and varied database of human motion
  // that unifies 15 different optical marker-based mocap datasets by representing them within a
  // common framework and parameterization" and "having more than 40 hours of motion data, spanning
  // over 300 subjects, more than 11,000 motions".
  {
    id: 'amass-2019',
    title: 'AMASS: Archive of Motion Capture as Surface Shapes',
    authors: ['Naureen Mahmood', 'Nima Ghorbani', 'Nikolaus F. Troje', 'Gerard Pons-Moll', 'Michael J. Black'],
    year: 2019,
    arxiv: '1904.03278',
    url: 'https://arxiv.org/abs/1904.03278',
    type: 'paper',
  },
  // pulse-2023: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2310.04582 (v1 2023-10-06; ICLR 2024 Spotlight). Abstract: "we first learn a motion
  // imitator that can imitate all of human motion from a large, unstructured motion dataset. We then
  // create our motion representation by distilling skills directly from the imitator."
  {
    id: 'pulse-2023',
    title: 'Universal Humanoid Motion Representations for Physics-Based Control',
    authors: ['Zhengyi Luo', 'Jinkun Cao', 'Josh Merel', 'Alexander Winkler', 'Jing Huang', 'Kris Kitani', 'Weipeng Xu'],
    year: 2023,
    venue: 'arXiv preprint (ICLR 2024)',
    arxiv: '2310.04582',
    url: 'https://arxiv.org/abs/2310.04582',
    type: 'paper',
  },
  // twist-2025: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2505.02833 (v1 2025-05-05). Abstract: "We first generate reference motion clips by
  // retargeting human motion capture data to the humanoid robot. We then develop a robust, adaptive,
  // and responsive whole-body controller using a combination of reinforcement learning and behavior
  // cloning (RL+BC)." and "spanning whole-body manipulation, legged manipulation, locomotion, and
  // expressive movement--using a single unified neural network controller".
  {
    id: 'twist-2025',
    title: 'TWIST: Teleoperated Whole-Body Imitation System',
    authors: ['Yanjie Ze', 'Zixuan Chen', 'João Pedro Araújo', 'Zi-ang Cao', 'Xue Bin Peng', 'Jiajun Wu', 'C. Karen Liu'],
    year: 2025,
    arxiv: '2505.02833',
    url: 'https://arxiv.org/abs/2505.02833',
    type: 'paper',
  },
  // exbody-2024: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2402.16796 (v1 2024-02-26). Abstract: "encouraging the upper humanoid body to imitate a
  // reference motion, while relaxing the imitation constraint on its two legs and only requiring
  // them to follow a given velocity robustly".
  {
    id: 'exbody-2024',
    title: 'Expressive Whole-Body Control for Humanoid Robots',
    authors: ['Xuxin Cheng', 'Yandong Ji', 'Junming Chen', 'Ruihan Yang', 'Ge Yang', 'Xiaolong Wang'],
    year: 2024,
    arxiv: '2402.16796',
    url: 'https://arxiv.org/abs/2402.16796',
    type: 'paper',
  },
  // kungfubot2-2025: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2509.16638 (v1 2025-09-20). Abstract: "we present VMS, a unified whole-body controller
  // that enables humanoid robots to learn diverse and dynamic behaviors within a single policy", "an
  // Orthogonal Mixture-of-Experts (OMoE) architecture" and "stable performance over minute-long
  // sequences".
  {
    id: 'kungfubot2-2025',
    title: 'KungfuBot2: Learning Versatile Motion Skills for Humanoid Whole-Body Control',
    authors: ['Jinrui Han', 'Weiji Xie', 'Jiakun Zheng', 'Jiyuan Shi', 'Weinan Zhang', 'Ting Xiao', 'Chenjia Bai'],
    year: 2025,
    arxiv: '2509.16638',
    url: 'https://arxiv.org/abs/2509.16638',
    type: 'paper',
  },
  // humanup-2025: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2502.12152 (v1 2025-02-17; RSS 2025). Abstract: "enable a real-world G1 humanoid robot to
  // get up from two main situations that we considered: a) lying face up and b) lying face down".
  {
    id: 'humanup-2025',
    title: 'Learning Getting-Up Policies for Real-World Humanoid Robots',
    authors: ['Xialin He', 'Runpei Dong', 'Zixuan Chen', 'Saurabh Gupta'],
    year: 2025,
    venue: 'Robotics: Science and Systems (RSS) 2025',
    arxiv: '2502.12152',
    url: 'https://arxiv.org/abs/2502.12152',
    type: 'paper',
  },
  // beyondmimic-2025: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts; also drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2508.08241 (v1 2025-08-11). Abstract: "mastering a wide range of radically agile
  // behaviors, including aerial cartwheels, spin-kicks, flip-kicks, and sprinting, with a single
  // setup and shared hyperparameters", "a unified latent diffusion model", "Leveraging classifier
  // guidance" and "transfers these skills zero-shot to real hardware".
  {
    id: 'beyondmimic-2025',
    title: 'BeyondMimic: From Motion Tracking to Versatile Humanoid Control via Guided Diffusion',
    authors: ['Qiayuan Liao', 'Takara E. Truong', 'Xiaoyu Huang', 'Yuman Gao', 'Guy Tevet', 'Koushil Sreenath', 'C. Karen Liu'],
    year: 2025,
    arxiv: '2508.08241',
    url: 'https://arxiv.org/abs/2508.08241',
    type: 'paper',
  },
  // hover-2024: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2410.21229 (v1 2024-10-28; ICRA 2025). Abstract: "We present the key insight that
  // full-body kinematic motion imitation can serve as a common abstraction for all these tasks" and
  // "a multi-mode policy distillation framework that consolidates diverse control modes into a
  // unified policy".
  {
    id: 'hover-2024',
    title: 'HOVER: Versatile Neural Whole-Body Controller for Humanoid Robots',
    authors: ['Tairan He', 'Wenli Xiao', 'Toru Lin', 'Zhengyi Luo', 'Zhenjia Xu', 'Zhenyu Jiang', 'Jan Kautz', 'Changliu Liu', 'Guanya Shi', 'Xiaolong Wang', 'Linxi Fan', 'Yuke Zhu'],
    year: 2024,
    venue: 'arXiv preprint (ICRA 2025)',
    arxiv: '2410.21229',
    url: 'https://arxiv.org/abs/2410.21229',
    type: 'paper',
  },
  // figure-s0-2026: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts; also drafts/rl-sim2real/legged-locomotion.citations.ts.
  // Figure AI news post dated April 29, 2026 (no personal byline). "Helix's System 0 (S0), an AI
  // model for human-like whole-body control", "S0 now has a new capability: it is conditioned on
  // camera perception." and "The policy is trained end-to-end with reinforcement learning in
  // simulation, across thousands of randomized terrains, and the same network weights that learn to
  // climb procedurally generated staircases in sim now traverse real-world stairs on the robot."
  // (company's own account) This draft relies on: "Until now, S0 reasoned only about the robot's own
  // body - joint state, base motion, and proprioception."
  {
    id: 'figure-s0-2026',
    title: 'Ramping Figure 03 Production',
    authors: ['Figure AI'],
    year: 2026,
    venue: 'Figure AI news',
    url: 'https://www.figure.ai/news/ramping-figure-03-production',
    type: 'blog',
  },
  // sonic-2025: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2511.07820 (v1 2025-11-11); arXiv journal reference "Science Robotics 11 (117), eaed4592
  // (2026)" (DOI 10.1126/scirobotics.aed4592). Abstract: "network size (1.2M to 42M parameters),
  // dataset volume (100M+ frames from 700 hours of motion capture), and compute (21k GPU hours)" and
  // "a unified token space that supports virtual reality (VR) teleoperation and
  // vision-language-action (VLA) models with a single policy".
  {
    id: 'sonic-2025',
    title: 'SONIC: Supersizing Motion Tracking for Natural Humanoid Whole-Body Control',
    authors: ['Zhengyi Luo', 'Ye Yuan', 'Tingwu Wang', 'Chenran Li', 'Fernando Castañeda', 'Sirui Chen', 'Zi-Ang Cao', 'Jiefeng Li', 'David Minor', 'Qingwei Ben', 'Jinhyung Park', 'David Sami', 'Zi Wang', 'Xingye Da', 'Runyu Ding', 'Cyrus Hogg', 'Lina Song', 'Edy Lim', 'Eugene Jeong', 'Tairan He', 'Haoru Xue', 'Wenli Xiao', 'Simon Yuen', 'Jan Kautz', 'Yan Chang', 'Umar Iqbal', 'Linxi "Jim" Fan', 'Yuke Zhu'],
    year: 2025,
    venue: 'arXiv preprint (Science Robotics 11(117), 2026)',
    arxiv: '2511.07820',
    url: 'https://arxiv.org/abs/2511.07820',
    type: 'paper',
  },
  // humanoidbench-2024: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts; also drafts/world-models/latent-dynamics.citations.ts.
  // arXiv API check 2026-10-04: first submitted 2024-03-15, 5 authors. This draft relies on
  // (abstract, re-read 2026-10-04): "we present a high-dimensional, simulated robot learning
  // benchmark, HumanoidBench" and "state-of-the-art reinforcement learning algorithms struggle with
  // most tasks, whereas a hierarchical learning approach achieves superior performance when
  // supported by robust low-level policies, such as walking or reaching".
  {
    id: 'humanoidbench-2024',
    title: 'HumanoidBench: Simulated Humanoid Benchmark for Whole-Body Locomotion and Manipulation',
    authors: ['Carmelo Sferrazza', 'Dun-Ming Huang', 'Xingyu Lin', 'Youngwoon Lee', 'Pieter Abbeel'],
    year: 2024,
    arxiv: '2403.10506',
    url: 'https://arxiv.org/abs/2403.10506',
    type: 'paper',
  },
  // wbc-motion-gen-2026: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2604.17335 (v1 2026-04-19). Abstract: "We first train a diffusion model on retargeted
  // human motions for real-time prediction of terrain-aware reference motions", "we further
  // fine-tune the tracker with a frozen motion generator in a closed-loop setting" (to "improve
  // robustness under imperfectly generated references") and "The hardware experiments demonstrate
  // successful traversal over boxes, hurdles, stairs, and mixed terrain combinations" on "a Unitree
  // G1 humanoid robot".
  {
    id: 'wbc-motion-gen-2026',
    title: 'Learning Whole-Body Humanoid Locomotion via Motion Generation and Motion Tracking',
    authors: ['Zewei Zhang', 'Kehan Wen', 'Michael Xu', 'Junzhe He', 'Chenhao Li', 'Takahiro Miki', 'Clemens Schwarke', 'Chong Zhang', 'Xue Bin Peng', 'Marco Hutter'],
    year: 2026,
    arxiv: '2604.17335',
    url: 'https://arxiv.org/abs/2604.17335',
    type: 'paper',
  },
  // hdmi-2025: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // arXiv 2509.16757 (v1 2025-09-20). Abstract: "learns whole-body humanoid-object interaction
  // skills directly from monocular RGB videos", "trains a reinforcement learning (RL) policy to
  // co-track robot and object states" and "HDMI achieves 67 consecutive door traversals and
  // successfully performs 6 distinct loco-manipulation tasks in the real world and 14 tasks in
  // simulation".
  {
    id: 'hdmi-2025',
    title: 'HDMI: Learning Interactive Humanoid Whole-Body Control from Human Videos',
    authors: ['Haoyang Weng', 'Yitang Li', 'Nikhil Sobanbabu', 'Zihan Wang', 'Zhengyi Luo', 'Tairan He', 'Deva Ramanan', 'Guanya Shi'],
    year: 2025,
    arxiv: '2509.16757',
    url: 'https://arxiv.org/abs/2509.16757',
    type: 'paper',
  },
  // bd-atlas-hard-work-2026: domain pass 2026-10-06, from drafts/rl-sim2real/humanoid-wbc.citations.ts; also drafts/rl-sim2real/legged-locomotion.citations.ts, drafts/rl-sim2real/reward-design-mpc.citations.ts, drafts/rl-sim2real/sim2real-transfer.citations.ts, drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // Boston Dynamics blog, datePublished 2026-05-18. Byline on the page (re-read 2026-10-04): "This
  // article was written by Alberto Rodriguez, Director of Robot Behavior for Atlas, Shane
  // Rozen-Levy, Research Engineer, and Vinay Kamidi, Research Engineer." "All are rotary actuators
  // that are much easier to represent well in simulation, key to the high performance RL work with
  // proprioceptive feedback discussed above." and "Atlas uses reinforcement learning (RL) to learn
  // how to lift a fridge ... This is a combined control and perception problem, where perception is
  // done implicitly from body proprioception." (company's own account) This draft relies on: "For
  // the fridge move, we started with a simple animation" and "the policy for moving the fridge was
  // trained for 50-70 pound loads, but the robot successfully moved a loaded fridge with a total
  // weight of more than 100 pounds".
  {
    id: 'bd-atlas-hard-work-2026',
    title: 'Training a Humanoid Robot for Hard Work',
    authors: ['Alberto Rodriguez', 'Shane Rozen-Levy', 'Vinay Kamidi'],
    year: 2026,
    venue: 'Boston Dynamics blog',
    url: 'https://bostondynamics.com/blog/training-a-humanoid-robot-for-hard-work/',
    type: 'blog',
  },
  // anymal-parkour-2023: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts.
  // arXiv 2306.14874 (v1 2023-06-26; Science Robotics 9(88), 2024). Abstract: "training advanced
  // locomotion skills for several types of obstacles, such as walking, jumping, climbing, and
  // crouching, and then using a high-level policy to select and control those skills across the
  // terrain" and "the robot navigates and crosses consecutive challenging obstacles with speeds of
  // up to two meters per second".
  {
    id: 'anymal-parkour-2023',
    title: 'ANYmal Parkour: Learning Agile Navigation for Quadrupedal Robots',
    authors: ['David Hoeller', 'Nikita Rudin', 'Dhionis Sako', 'Marco Hutter'],
    year: 2023,
    venue: 'arXiv preprint (Science Robotics 2024)',
    arxiv: '2306.14874',
    url: 'https://arxiv.org/abs/2306.14874',
    type: 'paper',
  },
  // agarwal-vision-2022: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts; also drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2211.07638 (CoRL 2022 oral) abstract: "first, we train a policy using reinforcement
  // learning with a cheap-to-compute variant of depth image and then in phase 2 distill it into the
  // final policy that uses depth using supervised learning". This draft relies on (re-read
  // 2026-10-04): "we present the first end-to-end locomotion system capable of traversing stairs,
  // curbs, stepping stones, and gaps. We show this result on a medium-sized quadruped robot using a
  // single front-facing depth camera."
  {
    id: 'agarwal-vision-2022',
    title: 'Legged Locomotion in Challenging Terrains using Egocentric Vision',
    authors: ['Ananye Agarwal', 'Ashish Kumar', 'Jitendra Malik', 'Deepak Pathak'],
    year: 2022,
    venue: 'CoRL 2022',
    arxiv: '2211.07638',
    url: 'https://arxiv.org/abs/2211.07638',
    type: 'paper',
  },
  // walk-these-ways-2022: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts; also drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2212.03238 (v1 2022-12-06; CoRL 2022 oral). PDF body (v1, Sec. 3): "θcmd = (θcmd1, θcmd2,
  // θcmd3) are the timing offsets between pairs of feet. These express gaits including pronking
  // (θcmd = (0.0, 0, 0)), trotting (θcmd = (0.5, 0, 0)), bounding, (θcmd = (0, 0.5, 0))" and "fcmd
  // is the stepping frequency expressed in Hz". Abstract: "can execute diverse gaits with variable
  // footswing, posture, and speed".
  {
    id: 'walk-these-ways-2022',
    title: 'Walk These Ways: Tuning Robot Control for Generalization with Multiplicity of Behavior',
    authors: ['Gabriel B. Margolis', 'Pulkit Agrawal'],
    year: 2022,
    venue: 'Conference on Robot Learning (CoRL) 2022',
    arxiv: '2212.03238',
    url: 'https://arxiv.org/abs/2212.03238',
    type: 'paper',
  },
  // alexander-1984: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts.
  // Crossref 10.1177/027836498400300205 (IJRR 3(2):49-59, June 1984). Crossref abstract: "It is
  // shown that mammals of different sizes tend to move in dy namically similar fashion whenever
  // their Froude numbers u^2/gh are equal: here u is speed, g is the acceleration of free fall, and
  // h is the height of the hip joint from the ground." ("dy namically" as printed; superscript
  // rendered as ^2.) The publisher page is paywalled; the quote is the Crossref abstract.
  {
    id: 'alexander-1984',
    title: 'The Gaits of Bipedal and Quadrupedal Animals',
    authors: ['R. McN. Alexander'],
    year: 1984,
    venue: 'International Journal of Robotics Research 3(2)',
    url: 'https://doi.org/10.1177/027836498400300205',
    type: 'paper',
  },
  // margolis-rapid-2022: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts; also drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2205.02824 (v1 2022-05-05; RSS 2022). Abstract: "We present an end-to-end learned
  // controller that achieves record agility for the MIT Mini Cheetah, sustaining speeds up to 3.9
  // m/s." (authors' own claim)
  {
    id: 'margolis-rapid-2022',
    title: 'Rapid Locomotion via Reinforcement Learning',
    authors: ['Gabriel B. Margolis', 'Ge Yang', 'Kartik Paigwar', 'Tao Chen', 'Pulkit Agrawal'],
    year: 2022,
    venue: 'Robotics: Science and Systems (RSS) 2022',
    arxiv: '2205.02824',
    url: 'https://arxiv.org/abs/2205.02824',
    type: 'paper',
  },
  // siekmann-2020: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts.
  // arXiv 2011.01387 (v1 2020-11-02; ICRA 2021). Abstract: "a parametric reward function with
  // intuitive settings for all common bipedal gaits - standing, walking, hopping, running, and
  // skipping. Using this function we demonstrate successful sim-to-real transfer of the learned
  // gaits to the bipedal robot Cassie".
  {
    id: 'siekmann-2020',
    title: 'Sim-to-Real Learning of All Common Bipedal Gaits via Periodic Reward Composition',
    authors: ['Jonah Siekmann', 'Yesh Godse', 'Alan Fern', 'Jonathan Hurst'],
    year: 2020,
    venue: 'arXiv preprint (ICRA 2021)',
    arxiv: '2011.01387',
    url: 'https://arxiv.org/abs/2011.01387',
    type: 'paper',
  },
  // radosavovic-2023: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts; also drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2303.03381 (v1 2023-03-06; Science Robotics 2024). Abstract: "Our controller is a causal
  // transformer that takes the history of proprioceptive observations and actions as input and
  // predicts the next action." and "deploy it to the real world zero-shot". This draft also relies
  // on: "we present a fully learning-based approach for real-world humanoid locomotion".
  {
    id: 'radosavovic-2023',
    title: 'Real-World Humanoid Locomotion with Reinforcement Learning',
    authors: ['Ilija Radosavovic', 'Tete Xiao', 'Bike Zhang', 'Trevor Darrell', 'Jitendra Malik', 'Koushil Sreenath'],
    year: 2023,
    venue: 'arXiv preprint (Science Robotics 2024)',
    arxiv: '2303.03381',
    url: 'https://arxiv.org/abs/2303.03381',
    type: 'paper',
  },
  // li-cassie-2024: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts.
  // arXiv 2401.16889 (v1 2024-01-30; IJRR 2024). Abstract: "Our RL-based controller incorporates a
  // novel dual-history architecture", "The resulting control policies can be successfully deployed
  // on Cassie" and "fast running with a demonstration of a 400-meter dash".
  {
    id: 'li-cassie-2024',
    title: 'Reinforcement Learning for Versatile, Dynamic, and Robust Bipedal Locomotion Control',
    authors: ['Zhongyu Li', 'Xue Bin Peng', 'Pieter Abbeel', 'Sergey Levine', 'Glen Berseth', 'Koushil Sreenath'],
    year: 2024,
    venue: 'International Journal of Robotics Research',
    arxiv: '2401.16889',
    url: 'https://arxiv.org/abs/2401.16889',
    type: 'paper',
  },
  // haarnoja-soccer-2023: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts; also drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2304.13653 (v1 2023-04-26; Science Robotics 2024) abstract: "We found that a combination
  // of sufficiently high-frequency control, targeted dynamics randomization, and perturbations
  // during training in simulation enabled good-quality transfer." This draft relies on (re-read
  // 2026-10-04): "a low-cost, miniature humanoid robot" and "they walked 181% faster, turned 302%
  // faster, took 63% less time to get up, and kicked a ball 34% faster than a scripted baseline".
  {
    id: 'haarnoja-soccer-2023',
    title: 'Learning Agile Soccer Skills for a Bipedal Robot with Deep Reinforcement Learning',
    authors: ['Tuomas Haarnoja', 'Ben Moran', 'Guy Lever', 'Sandy H. Huang', 'Dhruva Tirumala', 'Jan Humplik', 'Markus Wulfmeier', 'Saran Tunyasuvunakool', 'Noah Y. Siegel', 'Roland Hafner', 'Michael Bloesch', 'Kristian Hartikainen', 'Arunkumar Byravan', 'Leonard Hasenclever', 'Yuval Tassa', 'Fereshteh Sadeghi', 'Nathan Batchelor', 'Federico Casarini', 'Stefano Saliceti', 'Charles Game', 'Neil Sreendra', 'Kushal Patel', 'Marlon Gwira', 'Andrea Huber', 'Nicole Hurley', 'Francesco Nori', 'Raia Hadsell', 'Nicolas Heess'],
    year: 2023,
    venue: 'arXiv preprint (Science Robotics 2024)',
    arxiv: '2304.13653',
    url: 'https://arxiv.org/abs/2304.13653',
    type: 'paper',
  },
  // humanoid-parkour-2024: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts.
  // arXiv 2406.10759 (v1 2024-06-15; CoRL 2024). Abstract: "an end-to-end vision-based
  // whole-body-control parkour policy for humanoid robots that overcomes multiple parkour skills
  // without any motion prior" and "the humanoid robot can jump on a 0.42m platform, leap over
  // hurdles, 0.8m gaps, and much more".
  {
    id: 'humanoid-parkour-2024',
    title: 'Humanoid Parkour Learning',
    authors: ['Ziwen Zhuang', 'Shenzhe Yao', 'Hang Zhao'],
    year: 2024,
    venue: 'Conference on Robot Learning (CoRL) 2024',
    arxiv: '2406.10759',
    url: 'https://arxiv.org/abs/2406.10759',
    type: 'paper',
  },
  // hiking-wild-2026: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts.
  // arXiv 2601.07718 (v1 2026-01-12). Abstract: "mapping raw depth inputs and proprioception
  // directly to joint actions, without relying on external state estimation" and "our policy enables
  // robust traversal of complex terrains at speeds up to 2.5 m/s".
  {
    id: 'hiking-wild-2026',
    title: 'Hiking in the Wild: A Scalable Perceptive Parkour Framework for Humanoids',
    authors: ['Shaoting Zhu', 'Ziwen Zhuang', 'Mengjie Zhao', 'Kun-Ying Lee', 'Hang Zhao'],
    year: 2026,
    arxiv: '2601.07718',
    url: 'https://arxiv.org/abs/2601.07718',
    type: 'paper',
  },
  // agility-wbc-2025: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts.
  // Agility Robotics blog, "Published August 28, 2025" (no personal byline). "we've developed a
  // whole-body control foundation model for our humanoid robot, Digit", "This model is a relatively
  // small LSTM neural network with fewer than one million parameters, which is trained in NVIDIA's
  // Isaac Sim physics simulator for decades of simulated time over three or four days." and "Digit's
  // motor cortex is learned purely in simulation and transfers zero-shot to the real world."
  // (company's own account)
  {
    id: 'agility-wbc-2025',
    title: 'Training a Whole-Body Control Foundation Model',
    authors: ['Agility Robotics'],
    year: 2025,
    venue: 'Agility Robotics blog',
    url: 'https://www.agilityrobotics.com/content/training-a-whole-body-control-foundation-model',
    type: 'blog',
  },
  // acosta-2021: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts; also drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2110.00541 abstract: "Handling dynamic contact is the computational bottleneck for most
  // simulations" and "simulators capture inelastic impacts well while failing to capture elastic
  // impacts".
  {
    id: 'acosta-2021',
    title: 'Validating Robotics Simulators on Real-World Impacts',
    authors: ['Brian Acosta', 'William Yang', 'Michael Posa'],
    year: 2021,
    venue: 'arXiv preprint (IEEE RA-L / IROS 2022)',
    arxiv: '2110.00541',
    url: 'https://arxiv.org/abs/2110.00541',
    type: 'paper',
  },
  // dreureka-2024: domain pass 2026-10-06, from drafts/rl-sim2real/legged-locomotion.citations.ts; also drafts/rl-sim2real/reward-design-mpc.citations.ts, drafts/world-models/generative-sim.citations.ts.
  // arXiv API check 2026-10-04: first submitted 2024-06-04, 8 authors. This draft relies on
  // (abstract, re-read 2026-10-04): "automatically constructs suitable reward functions and domain
  // randomization distributions to support real-world transfer" and "quadruped balancing and walking
  // atop a yoga ball".
  {
    id: 'dreureka-2024',
    title: 'DrEureka: Language Model Guided Sim-To-Real Transfer',
    authors: ['Yecheng Jason Ma', 'William Liang', 'Hung-Ju Wang', 'Sam Wang', 'Yuke Zhu', 'Linxi Fan', 'Osbert Bastani', 'Dinesh Jayaraman'],
    year: 2024,
    venue: 'RSS 2024',
    arxiv: '2406.01967',
    url: 'https://arxiv.org/abs/2406.01967',
    type: 'paper',
  },
  // bear-2019: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 1906.00949 abstract: "Bootstrapping error is due to bootstrapping from actions that lie
  // outside of the training data distribution, and it accumulates via the Bellman backup operator."
  {
    id: 'bear-2019',
    title: 'Stabilizing Off-Policy Q-Learning via Bootstrapping Error Reduction',
    authors: ['Aviral Kumar', 'Justin Fu', 'George Tucker', 'Sergey Levine'],
    year: 2019,
    venue: 'arXiv preprint (NeurIPS 2019)',
    arxiv: '1906.00949',
    url: 'https://arxiv.org/abs/1906.00949',
    type: 'paper',
  },
  // real-orl-2022: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2210.06479 abstract: "6500+ trajectories collected over 800+ robot hours and 270+ human
  // labor hour" and "ORL and imitation learning prefer different action spaces, and that ORL
  // algorithms can generalize from leveraging offline heterogeneous data sources and outperform
  // imitation learning".
  {
    id: 'real-orl-2022',
    title: 'Real World Offline Reinforcement Learning with Realistic Data Source',
    authors: ['Gaoyue Zhou', 'Liyiming Ke', 'Siddhartha Srinivasa', 'Abhinav Gupta', 'Aravind Rajeswaran', 'Vikash Kumar'],
    year: 2022,
    arxiv: '2210.06479',
    url: 'https://arxiv.org/abs/2210.06479',
    type: 'paper',
  },
  // d4rl-2020: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2004.07219 abstract: "datasets generated via hand-designed controllers and human
  // demonstrators, multitask datasets where an agent performs different tasks in the same
  // environment, and datasets collected with mixtures of policies".
  {
    id: 'd4rl-2020',
    title: 'D4RL: Datasets for Deep Data-Driven Reinforcement Learning',
    authors: ['Justin Fu', 'Aviral Kumar', 'Ofir Nachum', 'George Tucker', 'Sergey Levine'],
    year: 2020,
    arxiv: '2004.07219',
    url: 'https://arxiv.org/abs/2004.07219',
    type: 'paper',
  },
  // cog-2020: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2010.14500 abstract: "even when the prior data does not actually succeed at solving the
  // new task, it can still be utilized for learning a better policy" and "composing four robotic
  // skills in a row: picking, placing, drawer opening, and grasping, where a +1/0 sparse reward is
  // provided only on task completion".
  {
    id: 'cog-2020',
    title: 'COG: Connecting New Skills to Past Experience with Offline Reinforcement Learning',
    authors: ['Avi Singh', 'Albert Yu', 'Jonathan Yang', 'Jesse Zhang', 'Aviral Kumar', 'Sergey Levine'],
    year: 2020,
    venue: 'arXiv preprint (CoRL 2020)',
    arxiv: '2010.14500',
    url: 'https://arxiv.org/abs/2010.14500',
    type: 'paper',
  },
  // time-limits-2017: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 1712.00378 (ICML 2018, PMLR 80) abstract: "explain why not doing so can cause state
  // aliasing and invalidation of experience replay" and, for time limits used only to aid training,
  // "bootstrapping from the value of the state at the end of each partial episode".
  {
    id: 'time-limits-2017',
    title: 'Time Limits in Reinforcement Learning',
    authors: ['Fabio Pardo', 'Arash Tavakoli', 'Vitaly Levdik', 'Petar Kormushev'],
    year: 2017,
    venue: 'arXiv preprint (ICML 2018)',
    arxiv: '1712.00378',
    url: 'https://arxiv.org/abs/1712.00378',
    type: 'paper',
  },
  // ptr-2022: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts; also drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // arXiv 2210.05178 abstract: "PTR is the first RL method that succeeds at learning new tasks in a
  // new domain on a real WidowX robot with as few as 10 task demonstrations".
  {
    id: 'ptr-2022',
    title: 'Pre-Training for Robots: Offline RL Enables Learning New Tasks from a Handful of Trials',
    authors: ['Aviral Kumar', 'Anikait Singh', 'Frederik Ebert', 'Mitsuhiko Nakamoto', 'Yanlai Yang', 'Chelsea Finn', 'Sergey Levine'],
    year: 2022,
    arxiv: '2210.05178',
    url: 'https://arxiv.org/abs/2210.05178',
    type: 'paper',
  },
  // park-bottleneck-2024: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2406.09329 (NeurIPS 2024) abstract: "the choice of a policy extraction algorithm
  // significantly affects the performance and scalability of offline RL, often more so than the
  // value learning objective" and "a big barrier to improving offline RL performance is often
  // imperfect policy generalization on test-time states out of the support of the training data".
  {
    id: 'park-bottleneck-2024',
    title: 'Is Value Learning Really the Main Bottleneck in Offline RL?',
    authors: ['Seohong Park', 'Kevin Frans', 'Sergey Levine', 'Aviral Kumar'],
    year: 2024,
    venue: 'arXiv preprint (NeurIPS 2024)',
    arxiv: '2406.09329',
    url: 'https://arxiv.org/abs/2406.09329',
    type: 'paper',
  },
  // rankq-2026: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2605.11151 abstract: "this essentially acts as a behavior cloning anchor and can hinder
  // downstream online policy improvement when dataset actions are suboptimal", "a self-supervised
  // multi-term ranking loss" and "increasing real-world cube stacking success from 43.1% to 88.9%
  // relative to the VLA's initial performance".
  {
    id: 'rankq-2026',
    title: 'RankQ: Offline-to-Online Reinforcement Learning via Self-Supervised Action Ranking',
    authors: ['Andrew Choi', 'Wei Xu'],
    year: 2026,
    arxiv: '2605.11151',
    url: 'https://arxiv.org/abs/2605.11151',
    type: 'paper',
  },
  // flow-q-learning-2025: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2502.02538 (ICML 2025) abstract: "training an expressive one-step policy with RL, rather
  // than directly guiding an iterative flow policy to maximize values" and "strong performance
  // across 73 challenging state- and pixel-based OGBench and D4RL tasks".
  {
    id: 'flow-q-learning-2025',
    title: 'Flow Q-Learning',
    authors: ['Seohong Park', 'Qiyang Li', 'Sergey Levine'],
    year: 2025,
    venue: 'arXiv preprint (ICML 2025)',
    arxiv: '2502.02538',
    url: 'https://arxiv.org/abs/2502.02538',
    type: 'paper',
  },
  // horizon-reduction-2025: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2506.04168 (NeurIPS 2025) abstract: "using datasets up to 1000x larger than typical
  // offline RL datasets", "many existing offline RL algorithms exhibit poor scaling behavior,
  // saturating well below the maximum performance" and "long horizons indeed present a fundamental
  // barrier to scaling up offline RL".
  {
    id: 'horizon-reduction-2025',
    title: 'Horizon Reduction Makes RL Scalable',
    authors: ['Seohong Park', 'Kevin Frans', 'Deepinder Mann', 'Benjamin Eysenbach', 'Aviral Kumar', 'Sergey Levine'],
    year: 2025,
    venue: 'arXiv preprint (NeurIPS 2025)',
    arxiv: '2506.04168',
    url: 'https://arxiv.org/abs/2506.04168',
    type: 'paper',
  },
  // robo-valuerl-2026: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2607.09866 abstract: "Across 240 hours of offline demonstrations and over 3,000 online
  // rollout trajectories, our extensive experiments show that downstream performance is strongly
  // associated with value reliability.", "allowing value-guided offline RL to scale more effectively
  // than quality-agnostic behavior cloning" and "86% success on millimeter-level precise chip
  // insertion".
  {
    id: 'robo-valuerl-2026',
    title: 'Robo-ValueRL: Reliable Value Estimation for Offline-to-Online Reinforcement Learning',
    authors: ['Wenke Xia', 'Pei Ren', 'Wenbo Yu', 'Yizhuo Zhang', 'Jifan Li', 'Yixue Zhang', 'Yinuo Zhao', 'Qingyang Gao', 'Jianlong Fu', 'Jian Tang', 'Ji-Rong Wen', 'Zhengping Che', 'Di Hu'],
    year: 2026,
    arxiv: '2607.09866',
    url: 'https://arxiv.org/abs/2607.09866',
    type: 'paper',
  },
  // co-rft-2025: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2508.02219 abstract: "fine-tuning VLA models using a limited set of demonstrations (30 to
  // 60 samples)" and "CO-RFT outperforms previous supervised methods, achieving a 57% improvement in
  // success rate and a 22.3% reduction in cycle time".
  {
    id: 'co-rft-2025',
    title: 'CO-RFT: Efficient Fine-Tuning of Vision-Language-Action Models through Chunked Offline Reinforcement Learning',
    authors: ['Dongchi Huang', 'Zhirui Fang', 'Tianle Zhang', 'Yihang Li', 'Lin Zhao', 'Chunhe Xia'],
    year: 2025,
    arxiv: '2508.02219',
    url: 'https://arxiv.org/abs/2508.02219',
    type: 'paper',
  },
  // paine-hparam-2020: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2007.09055 abstract: "1) offline RL algorithms are not robust to hyperparameter choices,
  // 2) factors such as the offline RL algorithm and method for estimating Q values can have a big
  // impact on hyperparameter selection, and 3) when we control those factors carefully, we can
  // reliably rank policies across hyperparameter choices".
  {
    id: 'paine-hparam-2020',
    title: 'Hyperparameter Selection for Offline Reinforcement Learning',
    authors: ['Tom Le Paine', 'Cosmin Paduraru', 'Andrea Michi', 'Caglar Gulcehre', 'Konrad Zolna', 'Alexander Novikov', 'Ziyu Wang', 'Nando de Freitas'],
    year: 2020,
    arxiv: '2007.09055',
    url: 'https://arxiv.org/abs/2007.09055',
    type: 'paper',
  },
  // offline-rl-workflow-2021: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2109.10813 (CoRL 2021) abstract: "Our workflow is derived from a conceptual understanding
  // of the behavior of conservative offline RL algorithms and cross-validation in supervised
  // learning", "producing effective policies without any online tuning" and "for three tasks on two
  // distinct real robots".
  {
    id: 'offline-rl-workflow-2021',
    title: 'A Workflow for Offline Model-Free Robotic Reinforcement Learning',
    authors: ['Aviral Kumar', 'Anikait Singh', 'Stephen Tian', 'Chelsea Finn', 'Sergey Levine'],
    year: 2021,
    venue: 'arXiv preprint (CoRL 2021)',
    arxiv: '2109.10813',
    url: 'https://arxiv.org/abs/2109.10813',
    type: 'paper',
  },
  // rvs-2021: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2112.10751 abstract: "simply maximizing likelihood with a two-layer feedforward MLP is
  // competitive with state-of-the-art results of substantially more complex methods based on TD
  // learning or sequence modeling with Transformers", "choosing which information to condition on
  // (e.g., goals or rewards) are critical" and "comparatively weak on random data".
  {
    id: 'rvs-2021',
    title: 'RvS: What is Essential for Offline RL via Supervised Learning?',
    authors: ['Scott Emmons', 'Benjamin Eysenbach', 'Ilya Kostrikov', 'Sergey Levine'],
    year: 2021,
    arxiv: '2112.10751',
    url: 'https://arxiv.org/abs/2112.10751',
    type: 'paper',
  },
  // edac-2021: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2110.01548 (NeurIPS 2021) abstract: "the clipped Q-learning, a technique widely used in
  // online RL, can be leveraged to successfully penalize OOD data points with high prediction
  // uncertainties".
  {
    id: 'edac-2021',
    title: 'Uncertainty-Based Offline Reinforcement Learning with Diversified Q-Ensemble',
    authors: ['Gaon An', 'Seungyong Moon', 'Jang-Hyun Kim', 'Hyun Oh Song'],
    year: 2021,
    venue: 'arXiv preprint (NeurIPS 2021)',
    arxiv: '2110.01548',
    url: 'https://arxiv.org/abs/2110.01548',
    type: 'paper',
  },
  // score-2026: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2606.27475 abstract: "constrains RL in simulation to the support of a generative policy
  // pretrained on real data" and "Across eight real-world dexterous multi-fingered robotic
  // manipulation tasks, SCORE improves average success rate from 37.8% to 89.9%, compared to 59.5%
  // for the best baseline".
  {
    id: 'score-2026',
    title: 'Support-Constrained RL Enables Real-World Policy Improvement without Real-World Experience',
    authors: ['Raymond Yu', 'William Huey', 'Mustafa Mukadam', 'Anusha Nagabandi', 'Abhishek Gupta'],
    year: 2026,
    arxiv: '2606.27475',
    url: 'https://arxiv.org/abs/2606.27475',
    type: 'paper',
  },
  // trifinger-offline-2023: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2307.15690 (ICLR 2023) abstract: "the option to execute learned policies on a real-world
  // robotic system and a simulation for efficient debugging" and "provide a reproducible
  // experimental setup for offline reinforcement learning on real systems".
  {
    id: 'trifinger-offline-2023',
    title: 'Benchmarking Offline Reinforcement Learning on Real-Robot Hardware',
    authors: ['Nico Gürtler', 'Sebastian Blaes', 'Pavel Kolev', 'Felix Widmaier', 'Manuel Wüthrich', 'Stefan Bauer', 'Bernhard Schölkopf', 'Georg Martius'],
    year: 2023,
    venue: 'ICLR 2023',
    arxiv: '2307.15690',
    url: 'https://arxiv.org/abs/2307.15690',
    type: 'paper',
  },
  // cal-ql-2023: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts; also drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // arXiv 2303.05479 (NeurIPS 2023) abstract: "existing offline RL methods tend to behave poorly
  // during fine-tuning", "Cal-QL can be implemented on top of the conservative Q learning (CQL) for
  // offline RL within a one-line code change" and "outperforms state-of-the-art methods on 9/11
  // fine-tuning benchmark tasks".
  {
    id: 'cal-ql-2023',
    title: 'Cal-QL: Calibrated Offline RL Pre-Training for Efficient Online Fine-Tuning',
    authors: ['Mitsuhiko Nakamoto', 'Yuexiang Zhai', 'Anikait Singh', 'Max Sobol Mark', 'Yi Ma', 'Chelsea Finn', 'Aviral Kumar', 'Sergey Levine'],
    year: 2023,
    venue: 'arXiv preprint (NeurIPS 2023)',
    arxiv: '2303.05479',
    url: 'https://arxiv.org/abs/2303.05479',
    type: 'paper',
  },
  // wsrl-2024: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2412.07762 (ICLR 2025) abstract: "we show that retaining offline data is unnecessary as
  // long as we use a properly-designed online RL approach for fine-tuning offline RL
  // initializations" and "continued training on offline data is mostly useful for preventing a
  // sudden divergence in the value function at the onset of fine-tuning".
  {
    id: 'wsrl-2024',
    title: 'Efficient Online Reinforcement Learning Fine-Tuning Need Not Retain Offline Data',
    authors: ['Zhiyuan Zhou', 'Andy Peng', 'Qiyang Li', 'Sergey Levine', 'Aviral Kumar'],
    year: 2024,
    venue: 'arXiv preprint (ICLR 2025)',
    arxiv: '2412.07762',
    url: 'https://arxiv.org/abs/2412.07762',
    type: 'paper',
  },
  // dong-q-pretrain-2026: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2607.27203 abstract: "naive Q-function pretraining often provides little benefit over
  // random initialization" and "the Q-function learned during pretraining targets the pretrained
  // policy's Q-function, not the Q-function that online fine-tuning converges to".
  {
    id: 'dong-q-pretrain-2026',
    title: 'Do You Really Need to Pretrain Q-Functions for Online RL Fine-Tuning?',
    authors: ['Perry Dong', 'Ron Polonsky', 'Dorsa Sadigh', 'Chelsea Finn'],
    year: 2026,
    arxiv: '2607.27203',
    url: 'https://arxiv.org/abs/2607.27203',
    type: 'paper',
  },
  // bora-2026: domain pass 2026-10-06, from drafts/rl-sim2real/offline-rl.citations.ts.
  // arXiv 2605.30226 abstract: "reuses the learned critic for frozen-base residual adaptation",
  // "Online robot rollouts and human corrections are mixed with offline data to update only a
  // lightweight residual actor, avoiding full-model fine-tuning." and "With only 20 online
  // trajectories per task, BORA improves average success from 60.8% to 82.5% on standard objects".
  {
    id: 'bora-2026',
    title: 'BORA: Bridging Offline Reinforcement Learning and Online Residual Adaptation for Real-World Dexterous VLA Models',
    authors: ['Zhongxi Chen', 'Yifan Han', 'Bin Qiu', 'Zhangliang Gao', 'Yanming Shao', 'Huanming Liu', 'Congsheng Xu', 'Xiaoyu Chen', 'Xingyu Ye', 'Yao Mu', 'Wenzhao Lian'],
    year: 2026,
    arxiv: '2605.30226',
    url: 'https://arxiv.org/abs/2605.30226',
    type: 'paper',
  },
  // mujoco-overview-docs-2026: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // MuJoCo documentation, Overview page, fetched 2026-10-04: "Initially developed by Roboti LLC, it
  // was acquired and made freely available by Google DeepMind in October 2021, and open sourced in
  // May 2022."
  {
    id: 'mujoco-overview-docs-2026',
    title: 'Overview',
    authors: ['Google DeepMind'],
    year: 2026,
    venue: 'MuJoCo Documentation, as of 2026-10-04',
    url: 'https://mujoco.readthedocs.io/en/stable/overview.html',
    type: 'docs',
  },
  // mjx-docs-2026: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // MuJoCo documentation, MJX page, fetched 2026-10-04: "MJX-JAX runs on: Nvidia and AMD GPUs, Apple
  // Silicon, and Google Cloud TPUs. A Warp implementation of MuJoCo (MJX-Warp) optimizes performance
  // specifically for NVIDIA GPUs" and "MJX-Warp resolves key performance bottlenecks exhibited in
  // MJX-JAX around contacts and constraints. Note that unlike MJX-JAX, MJX-Warp does not support
  // automatic differentiation".
  {
    id: 'mjx-docs-2026',
    title: 'MuJoCo XLA (MJX)',
    authors: ['Google DeepMind'],
    year: 2026,
    venue: 'MuJoCo Documentation, as of 2026-10-04',
    url: 'https://mujoco.readthedocs.io/en/stable/mjx.html',
    type: 'docs',
  },
  // mjlab-2026: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // arXiv 2601.22074 abstract: "mjlab adopts the manager-based API introduced by Isaac Lab, where
  // users compose modular building blocks for observations, rewards, and events, and pairs it with
  // MuJoCo Warp for GPU-accelerated physics".
  {
    id: 'mjlab-2026',
    title: 'mjlab: A Lightweight Framework for GPU-Accelerated Robot Learning',
    authors: ['Kevin Zakka', 'Qiayuan Liao', 'Brent Yi', 'Louis Le Lay', 'Koushil Sreenath', 'Pieter Abbeel'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2601.22074',
    url: 'https://arxiv.org/abs/2601.22074',
    type: 'paper',
  },
  // sapg-2024: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // arXiv 2407.20230 (ICML 2024 oral) abstract: "we show that current RL methods, e.g. PPO, fail to
  // ingest the benefit of parallelized environments beyond a certain point and their performance
  // saturates".
  {
    id: 'sapg-2024',
    title: 'SAPG: Split and Aggregate Policy Gradients',
    authors: ['Jayesh Singla', 'Ananye Agarwal', 'Deepak Pathak'],
    year: 2024,
    venue: 'ICML 2024',
    arxiv: '2407.20230',
    url: 'https://arxiv.org/abs/2407.20230',
    type: 'paper',
  },
  // beukman-2026: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // arXiv 2603.06009 (accepted to RLC 2026) abstract: "increasing the number of parallel
  // environments is a simple way to avoid these plateaus by simultaneously altering both these
  // factors" and "scaling PPO to more than 1M parallel environments enables monotonic performance
  // improvement up to one trillion transitions".
  {
    id: 'beukman-2026',
    title: 'Preventing Learning Stagnation in PPO by Scaling to 1 Million Parallel Environments',
    authors: ['Michael Beukman', 'Khimya Khetarpal', 'Zeyu Zheng', 'Will Dabney', 'Jakob Foerster', 'Michael Dennis', 'Clare Lyle'],
    year: 2026,
    venue: 'RLC 2026',
    arxiv: '2603.06009',
    url: 'https://arxiv.org/abs/2603.06009',
    type: 'paper',
  },
  // pql-2023: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts; also drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // arXiv 2307.12983 (ICML 2023) abstract: "a Parallel $Q$-Learning (PQL) scheme that outperforms
  // PPO in wall-clock time while maintaining superior sample efficiency of off-policy learning" and
  // "$Q$-learning can be scaled to \textit{tens of thousands of parallel environments}".
  {
    id: 'pql-2023',
    title: 'Parallel Q-Learning: Scaling Off-policy Reinforcement Learning under Massively Parallel Simulation',
    authors: ['Zechu Li', 'Tao Chen', 'Zhang-Wei Hong', 'Anurag Ajay', 'Pulkit Agrawal'],
    year: 2023,
    venue: 'ICML 2023',
    arxiv: '2307.12983',
    url: 'https://arxiv.org/abs/2307.12983',
    type: 'paper',
  },
  // fasttd3-2025: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts; also drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // arXiv 2505.22642 abstract: "FastTD3 solves a range of HumanoidBench tasks in under 3 hours on a
  // single A100 GPU, while remaining stable during training."
  {
    id: 'fasttd3-2025',
    title: 'FastTD3: Simple, Fast, and Capable Reinforcement Learning for Humanoid Control',
    authors: ['Younggyo Seo', 'Carmelo Sferrazza', 'Haoran Geng', 'Michal Nauman', 'Zhao-Heng Yin', 'Pieter Abbeel'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2505.22642',
    url: 'https://arxiv.org/abs/2505.22642',
    type: 'paper',
  },
  // orbit-2023: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // arXiv 2301.04195 (v1 2023-01-10; IEEE RA-L 8(6), 2023). Abstract: "We present Orbit, a unified
  // and modular framework for robot learning powered by NVIDIA Isaac Sim." Isaac Lab (arXiv
  // 2511.04831v1, Acknowledgments): "The development of Isaac Lab initiated from the Orbit framework
  // (Mittal et al., 2023)."
  {
    id: 'orbit-2023',
    title: 'Orbit: A Unified Simulation Framework for Interactive Robot Learning Environments',
    authors: ['Mayank Mittal', 'Calvin Yu', 'Qinxi Yu', 'Jingzhou Liu', 'Nikita Rudin', 'David Hoeller', 'Jia Lin Yuan', 'Ritvik Singh', 'Yunrong Guo', 'Hammad Mazhar', 'Ajay Mandlekar', 'Buck Babich', 'Gavriel State', 'Marco Hutter', 'Animesh Garg'],
    year: 2023,
    venue: 'IEEE Robotics and Automation Letters 8(6)',
    arxiv: '2301.04195',
    url: 'https://arxiv.org/abs/2301.04195',
    type: 'paper',
  },
  // dextrah-g-2024: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // arXiv 2407.02274 abstract: "a depth-based dexterous grasping policy trained entirely in
  // simulation that combines reinforcement learning, geometric fabrics, and teacher-student
  // distillation" and "enables a 23 motor arm-hand robot". Isaac Lab (arXiv 2511.04831v1, Sec.
  // 4.1.1) benchmarks "the DextrAH (Lum et al., 2024b) task to grasp and lift an object", and its
  // reference [49] is this paper.
  {
    id: 'dextrah-g-2024',
    title: 'DextrAH-G: Pixels-to-Action Dexterous Arm-Hand Grasping with Geometric Fabrics',
    authors: ['Tyler Ga Wei Lum', 'Martin Matak', 'Viktor Makoviychuk', 'Ankur Handa', 'Arthur Allshire', 'Tucker Hermans', 'Nathan D. Ratliff', 'Karl Van Wyk'],
    year: 2024,
    venue: 'arXiv preprint',
    arxiv: '2407.02274',
    url: 'https://arxiv.org/abs/2407.02274',
    type: 'paper',
  },
  // isaac-lab-3-ea-2026: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // GitHub release v3.0.0-EA, published 2026-09-16T22:34:03Z, fetched 2026-10-04: "This release is
  // built for Isaac Sim 6.1, Python 3.12, PyTorch 2.11, NVIDIA Warp 1.16, and Newton 1.5.2." and
  // "General Availability is targeted toward the end of October 2026."
  {
    id: 'isaac-lab-3-ea-2026',
    title: 'Isaac Lab 3.0 Early Access',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'GitHub release v3.0.0-EA, isaac-sim/IsaacLab',
    url: 'https://github.com/isaac-sim/IsaacLab/releases/tag/v3.0.0-EA',
    type: 'docs',
  },
  // newton-lf-2025: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts; also drafts/world-models/world-models-vs-simulators.citations.ts.
  // Linux Foundation press release fetched 2026-10-04: dated 29 September 2025 (SAN JOSE, Calif.,
  // Sept. 29, 2025); "Built on NVIDIA Warp and OpenUSD, Newton delivers GPU-accelerated simulation
  // with a flexible, extensible architecture that supports multiple physics solvers. This enables
  // complex, contact-rich robot behaviors". This draft also relies on: "today welcomed Newton, an
  // open source, GPU-accelerated, extensible physics engine" and "Co-developed by Disney Research,
  // Google DeepMind, and NVIDIA".
  {
    id: 'newton-lf-2025',
    title: 'Linux Foundation Announces Contribution of Newton by Disney Research, Google DeepMind and NVIDIA to Accelerate Open Robot Learning',
    authors: ['The Linux Foundation'],
    year: 2025,
    venue: 'Linux Foundation press release',
    url: 'https://www.linuxfoundation.org/press/linux-foundation-announces-contribution-of-newton-by-disney-research-google-deepmind-and-nvidia-to-accelerate-open-robot-learning',
    type: 'press',
  },
  // nvidia-warp-repo-2026: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // NVIDIA/warp README (H1 "NVIDIA Warp"), fetched 2026-10-04: "Warp is a Python framework for
  // GPU-accelerated simulation, robotics, and machine learning."
  {
    id: 'nvidia-warp-repo-2026',
    title: 'NVIDIA Warp',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'GitHub repository NVIDIA/warp, README as of 2026-10-04',
    url: 'https://github.com/NVIDIA/warp',
    type: 'docs',
  },
  // newton-repo-2026: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // newton-physics/newton README (H1 "Newton"), fetched 2026-10-04: "Newton extends and generalizes
  // Warp's (deprecated) warp.sim module, and integrates MuJoCo Warp as its primary backend. Newton
  // emphasizes GPU-based computation, OpenUSD support, differentiability, and user-defined
  // extensibility". Licence badge: Apache-2.0.
  {
    id: 'newton-repo-2026',
    title: 'Newton',
    authors: ['Newton project (Linux Foundation)'],
    year: 2026,
    venue: 'GitHub repository newton-physics/newton, README as of 2026-10-04',
    url: 'https://github.com/newton-physics/newton',
    type: 'docs',
  },
  // isaac-sim-v6-1-0-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/parallel-sim-rl framework status
  // (first-party replacement for the forum announcement isaac-sim-6-1-ga-2026). GitHub release v6.1.0,
  // published 2026-09-10T02:27:28Z, fetched 2026-10-07: "Isaac Sim 6.1.0 GA".
  {
    id: 'isaac-sim-v6-1-0-2026',
    title: 'Isaac Sim 6.1.0 GA',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'GitHub release v6.1.0, isaac-sim/IsaacSim',
    url: 'https://github.com/isaac-sim/IsaacSim/releases/tag/v6.1.0',
    type: 'docs',
  },
  // isaac-sim-6-1-release-notes-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/parallel-sim-rl framework
  // status (first-party replacement for the forum announcement isaac-sim-6-1-ga-2026). Release notes, section
  // "6.1.0 GA", fetched 2026-10-07: "Updated the experimental Newton integration to Newton 1.5.0." and "Added
  // support for hydroelastic contacts."; "Added beta System Identification tools for headless and interactive
  // optimization of robot simulation parameters."
  {
    id: 'isaac-sim-6-1-release-notes-2026',
    title: 'Isaac Sim 6.1.0 Release Notes',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'Isaac Sim documentation',
    url: 'https://docs.isaacsim.omniverse.nvidia.com/6.1.0/overview/release_notes.html',
    type: 'docs',
  },
  // newton-v1-6-0-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/parallel-sim-rl Newton row (README §7
  // Newton 1.6). GitHub release v1.6.0, published 2026-09-10T14:37:28Z, fetched 2026-10-07: "Newton v1.6.0 is a
  // feature release following v1.5.1."; "CUDA collision work is faster across broad-phase, narrow-phase, and
  // deterministic contact processing."; "Experimental: graph-friendly robot control."; "An opt-in compliant ALM
  // mode for `SolverVBD` covers contacts, structural joints, drives, and limits."
  {
    id: 'newton-v1-6-0-2026',
    title: 'Newton v1.6.0',
    authors: ['Newton project (Linux Foundation)'],
    year: 2026,
    venue: 'GitHub release v1.6.0, newton-physics/newton',
    url: 'https://github.com/newton-physics/newton/releases/tag/v1.6.0',
    type: 'docs',
  },
  // vbd-2024: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // arXiv 2403.06321 abstract: "We introduce vertex block descent, a block coordinate descent
  // solution for the variational form of implicit Euler through vertex-level Gauss-Seidel
  // iterations." and "This forms a physics solver that can achieve numerical convergence with
  // unconditional stability".
  {
    id: 'vbd-2024',
    title: 'Vertex Block Descent',
    authors: ['Anka He Chen', 'Ziheng Liu', 'Yin Yang', 'Cem Yuksel'],
    year: 2024,
    venue: 'arXiv preprint',
    arxiv: '2403.06321',
    url: 'https://arxiv.org/abs/2403.06321',
    type: 'paper',
  },
  // elandt-2019: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // arXiv 1904.11433 (IROS 2019 camera-ready revision) abstract: "The model combines and generalizes
  // two ideas: a bed of springs (an "elastic foundation") and hydrostatic pressure." and "When two
  // objects nominally overlap, a contact surface is defined where the two pressure fields are
  // equal." Drake's hydroelastic contact user guide
  // (drake.mit.edu/doxygen_cxx/group__hydroelastic__user__guide.html, fetched 2026-10-04) lists
  // "[Elandt 2019]" as its source.
  {
    id: 'elandt-2019',
    title: 'A pressure field model for fast, robust approximation of net contact force and moment between nominally rigid objects',
    authors: ['Ryan Elandt', 'Evan Drumwright', 'Michael Sherman', 'Andy Ruina'],
    year: 2019,
    venue: 'IROS 2019',
    arxiv: '1904.11433',
    url: 'https://arxiv.org/abs/1904.11433',
    type: 'paper',
  },
  // mjwarp-docs-2026: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // MuJoCo documentation, MJWarp page, fetched 2026-10-04: "MJWarp is optimized for throughput: the
  // total number of simulation steps per unit time whereas MuJoCo is optimized for latency: time for
  // one simulation step." Authors follow the mujoco_warp README ("maintained by Google DeepMind and
  // NVIDIA").
  {
    id: 'mjwarp-docs-2026',
    title: 'MuJoCo Warp (MJWarp)',
    authors: ['Google DeepMind', 'NVIDIA'],
    year: 2026,
    venue: 'MuJoCo Documentation, as of 2026-10-04',
    url: 'https://mujoco.readthedocs.io/en/latest/mjwarp/',
    type: 'docs',
  },
  // gpusimbench-2026: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // arXiv 2607.13059 (accepted by IROS 2026) abstract: "mainstream GPU-based robotic simulators
  // (e.g., Isaac Lab, Genesis)" and "we unveil and quantify the inherent non-determinism introduced
  // by GPU-batched execution, characterized by significant run-to-run and inter-environment
  // variability even under identical initial conditions".
  {
    id: 'gpusimbench-2026',
    title: 'GPUSimBench: Towards Scalable and Reliable GPU-Accelerated Simulators in Embodied AI',
    authors: ['Huzhenyu Zhang', 'Shenghai Yuan', 'Wenrui Yan', 'Li Ma', 'Hengjie Li', 'Jingcheng Pang', 'Dmitry Yudin'],
    year: 2026,
    venue: 'IROS 2026',
    arxiv: '2607.13059',
    url: 'https://arxiv.org/abs/2607.13059',
    type: 'paper',
  },
  // mujoco-warp-repo-2026: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // google-deepmind/mujoco_warp README (H1 "MuJoCo Warp (MJWarp)"), fetched 2026-10-04: "MJWarp is
  // maintained by Google DeepMind and NVIDIA as part of the Newton project." and "Differentiability
  // via Warp is not yet available."
  {
    id: 'mujoco-warp-repo-2026',
    title: 'MuJoCo Warp (MJWarp)',
    authors: ['Google DeepMind', 'NVIDIA'],
    year: 2026,
    venue: 'GitHub repository google-deepmind/mujoco_warp, README as of 2026-10-04',
    url: 'https://github.com/google-deepmind/mujoco_warp',
    type: 'docs',
  },
  // shac-2022: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts.
  // arXiv 2204.07137 (ICLR 2022) abstract: "applying it to the challenging high-dimensional problem
  // of muscle-actuated locomotion with a large action space, achieving a greater than 17x reduction
  // in training time over the best-performing established RL algorithm".
  {
    id: 'shac-2022',
    title: 'Accelerated Policy Learning with Parallel Differentiable Simulation',
    authors: ['Jie Xu', 'Viktor Makoviychuk', 'Yashraj Narang', 'Fabio Ramos', 'Wojciech Matusik', 'Animesh Garg', 'Miles Macklin'],
    year: 2022,
    venue: 'ICLR 2022',
    arxiv: '2204.07137',
    url: 'https://arxiv.org/abs/2204.07137',
    type: 'paper',
  },
  // schwarke-2024: domain pass 2026-10-06, from drafts/rl-sim2real/parallel-sim-rl.citations.ts; also drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2404.02887 (v1 2024-04-03; CoRL 2025) abstract: "we propose a differentiable contact model
  // designed to provide informative gradients while maintaining high physical fidelity" and "this
  // represents the first successful sim-to-real transfer of a legged locomotion policy learned
  // entirely within a differentiable simulator".
  {
    id: 'schwarke-2024',
    title: 'Learning Deployable Locomotion Control via Differentiable Simulation',
    authors: ['Clemens Schwarke', 'Victor Klemm', 'Joshua Bagajo', 'Jean-Pierre Sleiman', 'Ignat Georgiev', 'Jesus Tordesillas', 'Marco Hutter'],
    year: 2024,
    venue: 'arXiv preprint (CoRL 2025)',
    arxiv: '2404.02887',
    url: 'https://arxiv.org/abs/2404.02887',
    type: 'paper',
  },
  // specification-gaming-2020: domain pass 2026-10-06, from drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // Google DeepMind blog dated April 21, 2020; byline "Victoria Krakovna, Jonathan Uesato, Vladimir
  // Mikulik, Matthew Rahtz, Tom Everitt, Ramana Kumar, Zac Kenton, Jan Leike, Shane Legg".
  // "Specification gaming is a behaviour that satisfies the literal specification of an objective
  // without achieving the intended outcome." and "we have collected around 60 examples so far".
  {
    id: 'specification-gaming-2020',
    title: 'Specification gaming: the flip side of AI ingenuity',
    authors: ['Victoria Krakovna', 'Jonathan Uesato', 'Vladimir Mikulik', 'Matthew Rahtz', 'Tom Everitt', 'Ramana Kumar', 'Zac Kenton', 'Jan Leike', 'Shane Legg'],
    year: 2020,
    venue: 'Google DeepMind blog',
    url: 'https://deepmind.google/blog/specification-gaming-the-flip-side-of-ai-ingenuity/',
    type: 'blog',
  },
  // fey-athletic-2025: domain pass 2026-10-06, from drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2502.10894 (v1 2025-02-15). Abstract: "training solely with task rewards introduces two
  // major challenges: these rewards are prone to exploitation (reward hacking)", "the Unsupervised
  // Actuator Net (UAN), which leverages real-world data to bridge the sim-to-real gap for complex
  // actuation mechanisms" and "UAN mitigates reward hacking".
  {
    id: 'fey-athletic-2025',
    title: 'Bridging the Sim-to-Real Gap for Athletic Loco-Manipulation',
    authors: ['Nolan Fey', 'Gabriel B. Margolis', 'Martin Peticco', 'Pulkit Agrawal'],
    year: 2025,
    arxiv: '2502.10894',
    url: 'https://arxiv.org/abs/2502.10894',
    type: 'paper',
  },
  // mapl-2026: domain pass 2026-10-06, from drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2606.25398 (v1 2026-06-24). Abstract: "MAPL prompts a large language model to compare
  // trajectories independently along semantically meaningful criteria" and "Across four quadruped
  // locomotion environments, MAPL trains policies using only LLM-generated preferences and achieves
  // performance comparable to or better than expert-designed rewards".
  {
    id: 'mapl-2026',
    title: 'MAPL: Multi-Objective Preference Learning for Robot Locomotion',
    authors: ['Xiyue Chen', 'Muhan Lin', 'Shuyang Shi', 'Joseph Campbell'],
    year: 2026,
    arxiv: '2606.25398',
    url: 'https://arxiv.org/abs/2606.25398',
    type: 'paper',
  },
  // eurekaverse-2024: domain pass 2026-10-06, from drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2411.01775 (v1 2024-11-04; CoRL 2024). Abstract: "environments are often naturally
  // represented as code", "uses LLMs to sample progressively more challenging, diverse, and
  // learnable environments for skill training" and "can successfully transfer to the real-world,
  // outperforming manual training courses designed by humans" (quadrupedal parkour).
  {
    id: 'eurekaverse-2024',
    title: 'Eurekaverse: Environment Curriculum Generation via Large Language Models',
    authors: ['William Liang', 'Sam Wang', 'Hung-Ju Wang', 'Osbert Bastani', 'Dinesh Jayaraman', 'Yecheng Jason Ma'],
    year: 2024,
    venue: 'Conference on Robot Learning (CoRL) 2024',
    arxiv: '2411.01775',
    url: 'https://arxiv.org/abs/2411.01775',
    type: 'paper',
  },
  // mppi-whole-body-2024: domain pass 2026-10-06, from drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2409.10469 (v1 2024-09-16). Abstract: "climbing over a box whose height is comparable to
  // the robot" and "To our knowledge, this is the first successful deployment of whole-body
  // sampling-based MPC on real-world legged robot hardware." (authors' own claim)
  {
    id: 'mppi-whole-body-2024',
    title: 'Real-Time Whole-Body Control of Legged Robots with Model-Predictive Path Integral Control',
    authors: ['Juan Alvarez-Padilla', 'John Z. Zhang', 'Sofia Kwok', 'John M. Dolan', 'Zachary Manchester'],
    year: 2024,
    arxiv: '2409.10469',
    url: 'https://arxiv.org/abs/2409.10469',
    type: 'paper',
  },
  // miller-spot-2025: domain pass 2026-10-06, from drafts/rl-sim2real/reward-design-mpc.citations.ts; also drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2504.17857 abstract: "We utilize Wasserstein Distance and Maximum Mean Discrepancy to
  // quantify the distributional dissimilarity of data collected on hardware and in simulation to
  // measure our sim2real gap. We use these measures as a scoring function for the Covariance Matrix
  // Adaptation Evolution Strategy to optimize simulated parameters that are unknown or difficult to
  // measure from Spot." This draft relies on (abstract): "We deploy policies capable of over 5.2ms
  // locomotion, more than triple Spots default controller maximum speed" ("5.2ms" as printed; the
  // draft writes 5.2 m/s and attributes the claim to the authors).
  {
    id: 'miller-spot-2025',
    title: 'High-Performance Reinforcement Learning on Spot: Optimizing Simulation Parameters with Distributional Measures',
    authors: ['AJ Miller', 'Fangzhou Yu', 'Michael Brauckmann', 'Farbod Farshidian'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2504.17857',
    url: 'https://arxiv.org/abs/2504.17857',
    type: 'paper',
  },
  // grandia-2022: domain pass 2026-10-06, from drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2208.08373 (v1 2022-08-17). Abstract: "a complete perception, planning, and control
  // pipeline, that can optimize motions for all degrees of freedom of the robot in real-time", "a
  // sequence of convex inequality constraints is extracted as local approximations of foothold
  // feasibility and embedded into an online model predictive controller", "precomputed per elevation
  // map" and "experimentally on the ANYmal quadruped platform".
  {
    id: 'grandia-2022',
    title: 'Perceptive Locomotion through Nonlinear Model Predictive Control',
    authors: ['Ruben Grandia', 'Fabian Jenelten', 'Shaohui Yang', 'Farbod Farshidian', 'Marco Hutter'],
    year: 2022,
    arxiv: '2208.08373',
    url: 'https://arxiv.org/abs/2208.08373',
    type: 'paper',
  },
  // schramm-2025: domain pass 2026-10-06, from drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2511.19204 (v1 2025-11-24; ICRA 2026). Abstract: "enables emergent locomotion without
  // relying on handcrafted gait patterns or predefined contact sequences", "discovers diverse motion
  // patterns, ranging from trotting to galloping" and "This sample efficiency enables real-time
  // control on standard CPU hardware".
  {
    id: 'schramm-2025',
    title: 'Reference-Free Sampling-Based Model Predictive Control',
    authors: ['Fabian Schramm', 'Pierre Fabre', 'Nicolas Perrin-Gilbert', 'Justin Carpentier'],
    year: 2025,
    venue: 'arXiv preprint (ICRA 2026)',
    arxiv: '2511.19204',
    url: 'https://arxiv.org/abs/2511.19204',
    type: 'paper',
  },
  // mpc-gps-2015: domain pass 2026-10-06, from drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 1509.06791 (v1 2015-09-22). Abstract: "MPC is used to generate data at training time,
  // under full state observations provided by an instrumented training environment", "at a fraction
  // of the computational cost of MPC" and "learning obstacle avoidance policies for a simulated
  // quadrotor".
  {
    id: 'mpc-gps-2015',
    title: 'Learning Deep Control Policies for Autonomous Aerial Vehicles with MPC-Guided Policy Search',
    authors: ['Tianhao Zhang', 'Gregory Kahn', 'Sergey Levine', 'Pieter Abbeel'],
    year: 2015,
    arxiv: '1509.06791',
    url: 'https://arxiv.org/abs/1509.06791',
    type: 'paper',
  },
  // dtc-2023: domain pass 2026-10-06, from drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // arXiv 2309.15462 (v1 2023-09-27). Abstract: "Our approach utilizes a model-based planner to roll
  // out a reference motion during training. A deep neural network policy is trained in simulation,
  // aiming to track the optimized footholds." and "we demonstrate superior robustness in the
  // presence of slippery or deformable ground when compared to model-based counterparts".
  {
    id: 'dtc-2023',
    title: 'DTC: Deep Tracking Control',
    authors: ['Fabian Jenelten', 'Junzhe He', 'Farbod Farshidian', 'Marco Hutter'],
    year: 2023,
    arxiv: '2309.15462',
    url: 'https://arxiv.org/abs/2309.15462',
    type: 'paper',
  },
  // ibarz-2021: domain pass 2026-10-06, from drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // arXiv 2102.02915 (v1 2021-02-04; journal reference "International Journal of Robotics Research
  // (IJRR), February 2021"). Abstract: "we present a number of case studies involving robotic deep
  // RL" and "an overview of other outstanding challenges, many of which are unique to the real-world
  // robotics setting and are not often the focus of mainstream RL research"; "a large portion of
  // deep RL research has focused on applications in video games and simulated control".
  {
    id: 'ibarz-2021',
    title: 'How to Train Your Robot with Deep Reinforcement Learning; Lessons We\'ve Learned',
    authors: ['Julian Ibarz', 'Jie Tan', 'Chelsea Finn', 'Mrinal Kalakrishnan', 'Peter Pastor', 'Sergey Levine'],
    year: 2021,
    venue: 'International Journal of Robotics Research',
    arxiv: '2102.02915',
    url: 'https://arxiv.org/abs/2102.02915',
    type: 'paper',
  },
  // tang-drl-survey-2025: domain pass 2026-10-06, from drafts/rl-sim2real/rl-for-robotics.citations.ts; also drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // Crossref 10.1146/annurev-control-030323-022510 (Annual Review of Control, Robotics, and
  // Autonomous Systems 8, 2025). annualreviews.org returned 403 to automated fetches; the quote was
  // matched in the abstract of the arXiv version (2408.03539) on 2026-10-04: "Robotics problems,
  // however, pose fundamental difficulties for the application of RL, stemming from the complexity
  // and cost of interacting with the physical world." This draft relies on (arXiv 2408.03539
  // abstract): "emphasizing the need for stable and sample-efficient real-world RL paradigms".
  {
    id: 'tang-drl-survey-2025',
    title: 'Deep Reinforcement Learning for Robotics: A Survey of Real-World Successes',
    authors: ['Chen Tang', 'Ben Abbatematteo', 'Jiaheng Hu', 'Rohan Chandra', 'Roberto Martín-Martín', 'Peter Stone'],
    year: 2025,
    venue: 'Annual Review of Control, Robotics, and Autonomous Systems',
    url: 'https://doi.org/10.1146/annurev-control-030323-022510',
    type: 'paper',
  },
  // seo-2025: domain pass 2026-10-06, from drafts/rl-sim2real/rl-for-robotics.citations.ts; also drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2512.01996 abstract: "enables rapid training of humanoid locomotion policies in just 15
  // minutes with a single RTX 4090 GPU" and "a simple and practical recipe based on off-policy RL
  // algorithms". This draft also relies on: "We demonstrate rapid end-to-end learning of humanoid
  // locomotion controllers on Unitree G1 and Booster T1 robots under strong domain randomization".
  {
    id: 'seo-2025',
    title: 'Learning Sim-to-Real Humanoid Locomotion in 15 Minutes',
    authors: ['Younggyo Seo', 'Carmelo Sferrazza', 'Juyue Chen', 'Guanya Shi', 'Rocky Duan', 'Pieter Abbeel'],
    year: 2025,
    arxiv: '2512.01996',
    url: 'https://arxiv.org/abs/2512.01996',
    type: 'paper',
  },
  // walk-in-the-park-2022: domain pass 2026-10-06, from drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // arXiv 2208.07860 (v1 2022-08-16). Abstract: "lead to learning quadruped locomotion in only 20
  // minutes in the real world" (model-free RL, per the title).
  {
    id: 'walk-in-the-park-2022',
    title: 'A Walk in the Park: Learning to Walk in 20 Minutes With Model-Free Reinforcement Learning',
    authors: ['Laura Smith', 'Ilya Kostrikov', 'Sergey Levine'],
    year: 2022,
    arxiv: '2208.07860',
    url: 'https://arxiv.org/abs/2208.07860',
    type: 'paper',
  },
  // bcq-2018: domain pass 2026-10-06, from drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // arXiv 1812.02900 (v1 2018-12-07; ICML 2019). Abstract: "due to errors introduced by
  // extrapolation, standard off-policy deep reinforcement learning algorithms, such as DQN and DDPG,
  // are incapable of learning with data uncorrelated to the distribution under the current policy,
  // making them ineffective for this fixed batch setting".
  {
    id: 'bcq-2018',
    title: 'Off-Policy Deep Reinforcement Learning without Exploration',
    authors: ['Scott Fujimoto', 'David Meger', 'Doina Precup'],
    year: 2018,
    venue: 'arXiv preprint (ICML 2019)',
    arxiv: '1812.02900',
    url: 'https://arxiv.org/abs/1812.02900',
    type: 'paper',
  },
  // leave-no-trace-2017: domain pass 2026-10-06, from drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // arXiv 1711.06782 (v1 2017-11-18). Abstract: "simultaneously learns a forward and reset policy,
  // with the reset policy resetting the environment for a subsequent attempt", "By learning a value
  // function for the reset policy, we can automatically determine when the forward policy is about
  // to enter a non-reversible state, providing for uncertainty-aware safety aborts" and "can greatly
  // reduce the number of manual resets required to learn a task".
  {
    id: 'leave-no-trace-2017',
    title: 'Leave no Trace: Learning to Reset for Safe and Autonomous Reinforcement Learning',
    authors: ['Benjamin Eysenbach', 'Shixiang Gu', 'Julian Ibarz', 'Sergey Levine'],
    year: 2017,
    arxiv: '1711.06782',
    url: 'https://arxiv.org/abs/1711.06782',
    type: 'paper',
  },
  // vaprl-2021: domain pass 2026-10-06, from drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // arXiv 2107.12931 (v1 2021-07-27). Abstract: "We observe that VaPRL reduces the interventions
  // required by three orders of magnitude compared to episodic RL" and "on a variety of simulated
  // robotics problems". Same group as autonomous-rl-2022 (Sharma, Gupta, Levine, Hausman, Finn).
  {
    id: 'vaprl-2021',
    title: 'Autonomous Reinforcement Learning via Subgoal Curricula',
    authors: ['Archit Sharma', 'Abhishek Gupta', 'Sergey Levine', 'Karol Hausman', 'Chelsea Finn'],
    year: 2021,
    arxiv: '2107.12931',
    url: 'https://arxiv.org/abs/2107.12931',
    type: 'paper',
  },
  // ref-hil-2026: domain pass 2026-10-06, from drafts/rl-sim2real/rl-for-robotics.citations.ts.
  // arXiv 2609.37131 (v1 2026-09-29). Abstract: "ReF-HIL reaches 90% autonomous success in only
  // 18-63 minutes of active training and achieves final success rates of 91.7-100%." (authors' own
  // figures)
  {
    id: 'ref-hil-2026',
    title: 'ReF-HIL: Shaping the Critic around Human Action Neighborhoods for Efficient Human-in-the-Loop Reinforcement Learning',
    authors: ['Shaoyin Luo', 'Song Wang', 'Shibo Xia', 'Tianle Zhang', 'Zhaowei Liang', 'Guanghui Shen', 'Bin Wang', 'Dan Wu'],
    year: 2026,
    arxiv: '2609.37131',
    url: 'https://arxiv.org/abs/2609.37131',
    type: 'paper',
  },
  // jakobi-1995: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // Springer chapter page (doi 10.1007/3-540-59496-5_337) fetched 2026-10-04, abstract: "The level
  // of correspondence varied according to how much noise was used in the simulation, with very good
  // results achieved when realistic quantities were applied." Crossref: LNCS, pp. 704-720, 1995
  // (Advances in Artificial Life, ECAL 1995).
  {
    id: 'jakobi-1995',
    title: 'Noise and the reality gap: The use of simulation in evolutionary robotics',
    authors: ['Nick Jakobi', 'Phil Husbands', 'Inman Harvey'],
    year: 1995,
    venue: 'Advances in Artificial Life (ECAL 1995), Lecture Notes in Computer Science, pp. 704-720',
    url: 'https://doi.org/10.1007/3-540-59496-5_337',
    type: 'paper',
  },
  // openai-dactyl-2018: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts; also drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 1808.00177 abstract: "Our method does not rely on any human demonstrations, but many
  // behaviors found in human manipulation emerge naturally, including finger gaiting, multi-finger
  // coordination, and the controlled use of gravity." arXiv lists OpenAI as first author. This draft
  // relies on: "we randomize many of the physical properties of the system like friction
  // coefficients and an object's appearance. Our policies transfer to the physical robot despite
  // being trained entirely in simulation."
  {
    id: 'openai-dactyl-2018',
    title: 'Learning Dexterous In-Hand Manipulation',
    authors: ['OpenAI', 'Marcin Andrychowicz', 'Bowen Baker', 'Maciek Chociej', 'Rafal Jozefowicz', 'Bob McGrew', 'Jakub Pachocki', 'Arthur Petron', 'Matthias Plappert', 'Glenn Powell', 'Alex Ray', 'Jonas Schneider', 'Szymon Sidor', 'Josh Tobin', 'Peter Welinder', 'Lilian Weng', 'Wojciech Zaremba'],
    year: 2018,
    arxiv: '1808.00177',
    url: 'https://arxiv.org/abs/1808.00177',
    type: 'paper',
  },
  // chen-dr-theory-2021: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2110.03239 abstract: "We provide sharp bounds on the sim-to-real gap -- the difference
  // between the value of policy returned by domain randomization and the value of an optimal policy
  // for the real world." and "Our theory also highlights the importance of using memory (i.e.,
  // history-dependent policies) in domain randomization."
  {
    id: 'chen-dr-theory-2021',
    title: 'Understanding Domain Randomization for Sim-to-real Transfer',
    authors: ['Xiaoyu Chen', 'Jiachen Hu', 'Chi Jin', 'Lihong Li', 'Liwei Wang'],
    year: 2021,
    venue: 'arXiv preprint',
    arxiv: '2110.03239',
    url: 'https://arxiv.org/abs/2110.03239',
    type: 'paper',
  },
  // learning-by-cheating-2019: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 1912.12294 (CoRL 2019) abstract: "We first train an agent that has access to privileged
  // information." and "In the second stage, the privileged agent acts as a teacher that trains a
  // purely vision-based sensorimotor agent."
  {
    id: 'learning-by-cheating-2019',
    title: 'Learning by Cheating',
    authors: ['Dian Chen', 'Brady Zhou', 'Vladlen Koltun', 'Philipp Krähenbühl'],
    year: 2019,
    venue: 'CoRL 2019',
    arxiv: '1912.12294',
    url: 'https://arxiv.org/abs/1912.12294',
    type: 'paper',
  },
  // asymmetric-ac-2017: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 1710.06542 abstract: "employing an actor-critic training algorithm in which the critic is
  // trained on full states while the actor (or policy) gets rendered images as input".
  {
    id: 'asymmetric-ac-2017',
    title: 'Asymmetric Actor Critic for Image-Based Robot Learning',
    authors: ['Lerrel Pinto', 'Marcin Andrychowicz', 'Peter Welinder', 'Wojciech Zaremba', 'Pieter Abbeel'],
    year: 2017,
    venue: 'arXiv preprint',
    arxiv: '1710.06542',
    url: 'https://arxiv.org/abs/1710.06542',
    type: 'paper',
  },
  // viral-2025: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2511.15200 abstract: "scaling simulation to tens of GPUs (up to 64) makes both teacher and
  // student training reliable, while low-compute regimes often fail" and "the resulting RGB-based
  // policy performs continuous loco-manipulation for up to 54 cycles".
  {
    id: 'viral-2025',
    title: 'VIRAL: Visual Sim-to-Real at Scale for Humanoid Loco-Manipulation',
    authors: ['Tairan He', 'Zi Wang', 'Haoru Xue', 'Qingwei Ben', 'Zhengyi Luo', 'Wenli Xiao', 'Ye Yuan', 'Xingye Da', 'Fernando Castañeda', 'Shankar Sastry', 'Changliu Liu', 'Guanya Shi', 'Linxi Fan', 'Yuke Zhu'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2511.15200',
    url: 'https://arxiv.org/abs/2511.15200',
    type: 'paper',
  },
  // up-osi-2017: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 1702.02453 (RSS 2017) abstract: "uses the recent state and action history of the system to
  // predict the dynamics model parameters mu. The value of mu from the Online System Identification
  // is then provided as input to the control policy".
  {
    id: 'up-osi-2017',
    title: 'Preparing for the Unknown: Learning a Universal Policy with Online System Identification',
    authors: ['Wenhao Yu', 'Jie Tan', 'C. Karen Liu', 'Greg Turk'],
    year: 2017,
    venue: 'RSS 2017',
    arxiv: '1702.02453',
    url: 'https://arxiv.org/abs/1702.02453',
    type: 'paper',
  },
  // tan-quadruped-2018: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 1804.10332 abstract: "We improve the simulation using system identification, developing an
  // accurate actuator model and simulating latency. We learn robust controllers by randomizing the
  // physical environments, adding perturbations and designing a compact observation space."
  {
    id: 'tan-quadruped-2018',
    title: 'Sim-to-Real: Learning Agile Locomotion For Quadruped Robots',
    authors: ['Jie Tan', 'Tingnan Zhang', 'Erwin Coumans', 'Atil Iscen', 'Yunfei Bai', 'Danijar Hafner', 'Steven Bohez', 'Vincent Vanhoucke'],
    year: 2018,
    venue: 'arXiv preprint',
    arxiv: '1804.10332',
    url: 'https://arxiv.org/abs/1804.10332',
    type: 'paper',
  },
  // rialto-2024: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts; also drafts/world-models/generative-sim.citations.ts.
  // arXiv API check 2026-10-04: first submitted 2024-03-06, 7 authors. This draft relies on
  // (abstract): "robustifying real-world imitation learning policies via reinforcement learning in
  // "digital twin" simulation environments constructed on the fly from small amounts of real-world
  // data" and "RialTo increases (over 67%) in policy robustness".
  {
    id: 'rialto-2024',
    title: 'Reconciling Reality through Simulation: A Real-to-Sim-to-Real Approach for Robust Manipulation',
    authors: ['Marcel Torne', 'Anthony Simeonov', 'Zechu Li', 'April Chan', 'Tao Chen', 'Abhishek Gupta', 'Pulkit Agrawal'],
    year: 2024,
    arxiv: '2403.03949',
    url: 'https://arxiv.org/abs/2403.03949',
    type: 'paper',
  },
  // softbody-splat-eval-2025: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2511.04665 abstract: "constructs soft-body digital twins from real-world videos and
  // renders robots, objects, and environments with photorealistic fidelity using 3D Gaussian
  // Splatting" and "demonstrating that simulated rollouts correlate strongly with real-world
  // execution performance".
  {
    id: 'softbody-splat-eval-2025',
    title: 'Real-to-Sim Robot Policy Evaluation with Gaussian Splatting Simulation of Soft-Body Interactions',
    authors: ['Kaifeng Zhang', 'Shuo Sha', 'Hanxiao Jiang', 'Matthew Loper', 'Hyunjong Song', 'Guangyan Cai', 'Zhuo Xu', 'Xiaochen Hu', 'Changxi Zheng', 'Yunzhu Li'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2511.04665',
    url: 'https://arxiv.org/abs/2511.04665',
    type: 'paper',
  },
  // polaris-2025: domain pass 2026-10-06, from drafts/data-hardware/robot-learning-stack.citations.ts; also drafts/rl-sim2real/sim2real-transfer.citations.ts, drafts/world-models/evaluation.citations.ts.
  {
    id: 'polaris-2025',
    title: 'PolaRiS: Scalable Real-to-Sim Evaluations for Generalist Robot Policies',
    authors: ['Arhan Jain', 'Mingtong Zhang', 'Kanav Arora', 'William Chen', 'Marcel Torne', 'Muhammad Zubair Irshad', 'Sergey Zakharov', 'Yue Wang', 'Sergey Levine', 'Chelsea Finn', 'Wei-Chiu Ma', 'Dhruv Shah', 'Abhishek Gupta', 'Karl Pertsch'],
    year: 2025,
    arxiv: '2512.16881',
    url: 'https://arxiv.org/abs/2512.16881',
    type: 'paper',
  },
  // kadian-2019: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 1912.06321 (IEEE RA-L 2020) abstract: "We find that SRCC for Habitat as used for the
  // CVPR19 challenge is low (0.18 for the success metric)"; "AI agents learning to exploit simulator
  // imperfections, abusing collision dynamics to 'slide' along walls"; "improving $SRCC_{Succ}$ from
  // 0.18 to 0.844"; "We 3D-scan a physical lab space to create a virtualized replica".
  {
    id: 'kadian-2019',
    title: 'Sim2Real Predictivity: Does Evaluation in Simulation Predict Real-World Performance?',
    authors: ['Abhishek Kadian', 'Joanne Truong', 'Aaron Gokaslan', 'Alexander Clegg', 'Erik Wijmans', 'Stefan Lee', 'Manolis Savva', 'Sonia Chernova', 'Dhruv Batra'],
    year: 2019,
    venue: 'IEEE Robotics and Automation Letters 2020',
    arxiv: '1912.06321',
    url: 'https://arxiv.org/abs/1912.06321',
    type: 'paper',
  },
  // sim-real-cotraining-2025: domain pass 2026-10-06, from drafts/data-hardware/robot-learning-stack.citations.ts; also drafts/rl-sim2real/sim2real-transfer.citations.ts.
  {
    id: 'sim-real-cotraining-2025',
    title: 'Sim-and-Real Co-Training: A Simple Recipe for Vision-Based Robotic Manipulation',
    authors: ['Abhiram Maddukuri', 'Zhenyu Jiang', 'Lawrence Yunliang Chen', 'Soroush Nasiriany', 'Yuqi Xie', 'Yu Fang', 'Wenqi Huang', 'Zu Wang', 'Zhenjia Xu', 'Nikita Chernyadev', 'Scott Reed', 'Ken Goldberg', 'Ajay Mandlekar', 'Linxi Fan', 'Yuke Zhu'],
    year: 2025,
    arxiv: '2503.24361',
    url: 'https://arxiv.org/abs/2503.24361',
    type: 'paper',
  },
  // lei-cotraining-2026: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2604.13645 abstract: "We investigate the mechanism of sim-and-real co-training through
  // theoretical analysis and empirical study, and identify two intrinsic effects governing
  // performance. The first, "structured representation alignment", ... plays a primary role in
  // downstream performance."
  {
    id: 'lei-cotraining-2026',
    title: 'A Mechanistic Analysis of Sim-and-Real Co-Training in Generative Robot Policies',
    authors: ['Yu Lei', 'Minghuan Liu', 'Abhiram Maddukuri', 'Zhenyu Jiang', 'Yuke Zhu'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2604.13645',
    url: 'https://arxiv.org/abs/2604.13645',
    type: 'paper',
  },
  // industreal-2023: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2305.17110 (RSS 2023) abstract: "we propose 1) simulation-aware policy updates, 2)
  // signed-distance-field rewards, and 3) sampling-based curricula" and "We then propose 4) a
  // policy-level action integrator to minimize error at policy deployment time."
  {
    id: 'industreal-2023',
    title: 'IndustReal: Transferring Contact-Rich Assembly Tasks from Simulation to Reality',
    authors: ['Bingjie Tang', 'Michael A. Lin', 'Iretiayo Akinola', 'Ankur Handa', 'Gaurav S. Sukhatme', 'Fabio Ramos', 'Dieter Fox', 'Yashraj Narang'],
    year: 2023,
    venue: 'RSS 2023',
    arxiv: '2305.17110',
    url: 'https://arxiv.org/abs/2305.17110',
    type: 'paper',
  },
  // actuator-reality-shaping-2026: domain pass 2026-10-06, from drafts/rl-sim2real/sim2real-transfer.citations.ts.
  // arXiv 2607.02205 abstract: "Instead of modifying the simulator to match the real world, our
  // method shapes the closed-loop behavior of physical actuators to match the idealized second-order
  // reference dynamics used in simulation."
  {
    id: 'actuator-reality-shaping-2026',
    title: 'Actuator Reality Shaping for Zero-Shot Sim-to-Real Robot Learning',
    authors: ['Satoshi Yamamori', 'Koji Ishihara', 'Kenjiro Minamikawa', 'Ryosei Ohmori', 'Taiyo Yasaki', 'Norikazu Sugimoto', 'Jun Morimoto'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2607.02205',
    url: 'https://arxiv.org/abs/2607.02205',
    type: 'paper',
  },
  // nvidia-simready-2026: domain pass 2026-10-06, from drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // NVIDIA Glossary page (undated; read 2026-10-04): "These include physics properties such as mass,
  // friction, inertia tensors, collision, and geometry; semantic labels such as object class,
  // function, and material type; and behavioral metadata such as articulation limits, actuator
  // properties, and state-machine definitions where required by the use case."
  {
    id: 'nvidia-simready-2026',
    title: 'What Is SimReady?',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'NVIDIA Glossary, as of 2026-10-04',
    url: 'https://www.nvidia.com/en-us/glossary/simready/',
    type: 'docs',
  },
  // fazeli-2017: domain pass 2026-10-06, from drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 1710.04979 abstract: "establish a task specific upper bound on the performance of the
  // models and the rigid-body contact model paradigm" and "the care that should be taken in
  // parameter selection, which are ultimately difficult to give a physical interpretation".
  {
    id: 'fazeli-2017',
    title: 'Fundamental Limitations in Performance and Interpretability of Common Planar Rigid-Body Contact Models',
    authors: ['Nima Fazeli', 'Samuel Zapolsky', 'Evan Drumwright', 'Alberto Rodriguez'],
    year: 2017,
    arxiv: '1710.04979',
    url: 'https://arxiv.org/abs/1710.04979',
    type: 'paper',
  },
  // factory-2022: domain pass 2026-10-06, from drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2205.03532 abstract: "accurately, efficiently, and robustly simulating the range of
  // contact-rich interactions in assembly remains a longstanding challenge" and "including
  // simultaneous simulation of 1000 nut-and-bolt interactions".
  {
    id: 'factory-2022',
    title: 'Factory: Fast Contact for Robotic Assembly',
    authors: ['Yashraj Narang', 'Kier Storey', 'Iretiayo Akinola', 'Miles Macklin', 'Philipp Reist', 'Lukasz Wawrzyniak', 'Yunrong Guo', 'Adam Moravanszky', 'Gavriel State', 'Michelle Lu', 'Ankur Handa', 'Dieter Fox'],
    year: 2022,
    venue: 'Robotics: Science and Systems (RSS) 2022',
    arxiv: '2205.03532',
    url: 'https://arxiv.org/abs/2205.03532',
    type: 'paper',
  },
  // visual-dexterity-2022: domain pass 2026-10-06, from drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2211.11744 (v1 2022-11-21; Science Robotics 8(84), 2023). Abstract: "with the median
  // reorientation time being close to seven seconds" and "Our hardware platform only uses
  // open-source components that cost less than five thousand dollars."
  {
    id: 'visual-dexterity-2022',
    title: 'Visual Dexterity: In-Hand Reorientation of Novel and Complex Object Shapes',
    authors: ['Tao Chen', 'Megha Tippur', 'Siyang Wu', 'Vikash Kumar', 'Edward Adelson', 'Pulkit Agrawal'],
    year: 2022,
    venue: 'arXiv preprint (Science Robotics 2023)',
    arxiv: '2211.11744',
    url: 'https://arxiv.org/abs/2211.11744',
    type: 'paper',
  },
  // dextrah-rgb-2024: domain pass 2026-10-06, from drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2412.01791 abstract: "To our knowledge, this is the first work that is able to demonstrate
  // robust sim2real transfer of an end2end RGB-based policy for complex, dynamic, contact-rich tasks
  // such as dexterous grasping."
  {
    id: 'dextrah-rgb-2024',
    title: 'DextrAH-RGB: Visuomotor Policies to Grasp Anything with Dexterous Hands',
    authors: ['Ritvik Singh', 'Arthur Allshire', 'Ankur Handa', 'Nathan Ratliff', 'Karl Van Wyk'],
    year: 2024,
    arxiv: '2412.01791',
    url: 'https://arxiv.org/abs/2412.01791',
    type: 'paper',
  },
  // automate-2024: domain pass 2026-10-06, from drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2407.08028 abstract: "a generalist policy that jointly solves 20 assemblies with an 80%+
  // success rate" and "zero-shot sim-to-real transfer that achieves similar (or better) performance
  // than simulation".
  {
    id: 'automate-2024',
    title: 'AutoMate: Specialist and Generalist Assembly Policies over Diverse Geometries',
    authors: ['Bingjie Tang', 'Iretiayo Akinola', 'Jie Xu', 'Bowen Wen', 'Ankur Handa', 'Karl Van Wyk', 'Dieter Fox', 'Gaurav S. Sukhatme', 'Fabio Ramos', 'Yashraj Narang'],
    year: 2024,
    arxiv: '2407.08028',
    url: 'https://arxiv.org/abs/2407.08028',
    type: 'paper',
  },
  // sparr-2026: domain pass 2026-10-06, from drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2602.23253 abstract: "Compared to the state-of-the-art zero-shot sim-to-real methods,
  // SPARR improves success rates by 38.4% while reducing cycle time by 29.7%."
  {
    id: 'sparr-2026',
    title: 'SPARR: Simulation-based Policies with Asymmetric Real-world Residuals for Assembly',
    authors: ['Yijie Guo', 'Iretiayo Akinola', 'Lars Johannsmeier', 'Hugo Hadfield', 'Abhishek Gupta', 'Yashraj Narang'],
    year: 2026,
    arxiv: '2602.23253',
    url: 'https://arxiv.org/abs/2602.23253',
    type: 'paper',
  },
  // zhao-force-grasp-2026: domain pass 2026-10-06, from drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2601.02778 abstract: "a computationally fast tactile simulation", "a current-to-torque
  // calibration", "actuator dynamics modeling" and "the first demonstration of controllable grasping
  // on a multi-finger dexterous hand trained entirely in simulation and transferred zero-shot on
  // real hardware".
  {
    id: 'zhao-force-grasp-2026',
    title: 'Closing the Reality Gap: Zero-Shot Sim-to-Real Deployment for Dexterous Force-Based Grasping and Manipulation',
    authors: ['Zhe Zhao', 'Haoyu Dong', 'Zhengmao He', 'Yang Li', 'Xinyu Yi', 'Zhibin Li'],
    year: 2026,
    arxiv: '2601.02778',
    url: 'https://arxiv.org/abs/2601.02778',
    type: 'paper',
  },
  // simtoolreal-2026: domain pass 2026-10-06, from drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2602.16863 abstract: "prior approaches typically require substantial engineering effort to
  // model objects and tune reward functions for each task", "train a single RL policy", "matching
  // the performance of specialist RL policies trained on specific target objects and tasks" and
  // "strong zero-shot performance over 120 real-world rollouts spanning 24 tasks".
  {
    id: 'simtoolreal-2026',
    title: 'SimToolReal: An Object-Centric Policy for Zero-Shot Dexterous Tool Manipulation',
    authors: ['Kushal Kedia', 'Tyler Ga Wei Lum', 'Jeannette Bohg', 'C. Karen Liu'],
    year: 2026,
    arxiv: '2602.16863',
    url: 'https://arxiv.org/abs/2602.16863',
    type: 'paper',
  },
  // doorman-2025: domain pass 2026-10-06, from drafts/rl-sim2real/why-rl-locomotion.citations.ts.
  // arXiv 2512.01061 (v1 2025-11-30; CVPR 2026). Abstract: "achieves robust zero-shot performance
  // across diverse door types and outperforms human teleoperators by up to 31.7% in task completion
  // time" and "using pure RGB perception".
  {
    id: 'doorman-2025',
    title: 'Opening the Sim-to-Real Door for Humanoid Pixel-to-Action Policy Transfer',
    authors: ['Haoru Xue', 'Tairan He', 'Zi Wang', 'Qingwei Ben', 'Wenli Xiao', 'Zhengyi Luo', 'Xingye Da', 'Fernando Castañeda', 'Guanya Shi', 'Shankar Sastry', 'Linxi "Jim" Fan', 'Yuke Zhu'],
    year: 2025,
    venue: 'arXiv preprint (CVPR 2026)',
    arxiv: '2512.01061',
    url: 'https://arxiv.org/abs/2512.01061',
    type: 'paper',
  },
  // needlework-2026: domain pass 2026-10-06, KOL intake note of Shuran Song, from drafts/rl-sim2real/offline-rl.citations.ts.
  // Refresh 2026-10-06 against mission HEAD 8c34ffbb, KOL intake note of Shuran Song.
  // Title, authors and abstract read on the arXiv abstract page on 2026-10-06 (v1 1 Oct 2026). Comment: submitted to ICLR 2027.
  {
    id: 'needlework-2026',
    title: 'NEEDLEWORK: Offline Rewriting of Robot Data with Verified Local Stitches',
    authors: ['Juntao Ren', 'Yifan Hou', 'Shuran Song'],
    year: 2026,
    arxiv: '2610.02339',
    url: 'https://arxiv.org/abs/2610.02339',
    type: 'paper',
  },
  // bver-2026: domain pass 2026-10-06, KOL intake note of Marco Hutter, from drafts/rl-sim2real/reward-design-mpc.citations.ts.
  // Refresh 2026-10-06 against mission HEAD 8c34ffbb, KOL intake note of Marco Hutter.
  // Title, authors and abstract read on the arXiv abstract page on 2026-10-06 (v1 2 Oct 2026).
  {
    id: 'bver-2026',
    title: 'Bidirectional Voronoi-biased Exploration Curriculum for Reinforcement Learning',
    authors: ['Juri Pfammatter', 'Kaixian Qu', 'Clemens Schwarke', 'Victor Klemm', 'Marco Hutter'],
    year: 2026,
    arxiv: '2610.03395',
    url: 'https://arxiv.org/abs/2610.03395',
    type: 'paper',
  },
  // hitter-2025: domain pass 2026-10-06, KOL intake note of Chris Paxton, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // Refresh 2026-10-06, primary source named in the KOL intake note of Chris Paxton.
  // arXiv abstract page read 2026-10-06 (v1 28 Aug 2025, v2 4 Sep 2025): "up to 106 consecutive shots with a human opponent".
  {
    id: 'hitter-2025',
    title: 'HITTER: A HumanoId Table TEnnis Robot via Hierarchical Planning and Learning',
    authors: ['Zhi Su', 'Bike Zhang', 'Nima Rahmanian', 'Yuman Gao', 'Qiayuan Liao', 'Caitlin Regan', 'Koushil Sreenath', 'S. Shankar Sastry'],
    year: 2025,
    arxiv: '2508.21043',
    url: 'https://arxiv.org/abs/2508.21043',
    type: 'paper',
  },
  // latent-tennis-2026: domain pass 2026-10-06, KOL intake note of Chris Paxton, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // Refresh 2026-10-06, primary source named in the KOL intake note of Chris Paxton.
  // arXiv abstract page read 2026-10-06 (v1 13 Mar 2026): LATENT, deployed on the Unitree G1, "stably sustain multi-shot rallies with human players".
  {
    id: 'latent-tennis-2026',
    title: 'Learning Athletic Humanoid Tennis Skills from Imperfect Human Motion Data',
    authors: ['Zhikai Zhang', 'Haofei Lu', 'Yunrui Lian', 'Ziqing Chen', 'Yun Liu', 'Chenghuai Lin', 'Han Xue', 'Zicheng Zeng', 'Zekun Qi', 'Shaolin Zheng', 'Qing Luan', 'Jingbo Wang', 'Junliang Xing', 'He Wang', 'Li Yi'],
    year: 2026,
    arxiv: '2603.12686',
    url: 'https://arxiv.org/abs/2603.12686',
    type: 'paper',
  },
  // paxton-robot-sports-2026: domain pass 2026-10-06, KOL intake note of Chris Paxton, from drafts/rl-sim2real/humanoid-wbc.citations.ts.
  // Refresh 2026-10-06, KOL intake note of Chris Paxton. Newsletter post dated 3 October 2026,
  // fetched 2026-10-06: "many of these systems still use external motion trackers to perceive the ball".
  // Same venue string as paxton-autonomous-trucks-2026.
  {
    id: 'paxton-robot-sports-2026',
    title: 'What Do Robot Sports Teach Us?',
    authors: ['Chris Paxton'],
    year: 2026,
    venue: 'It Can Think!',
    url: 'https://itcanthink.substack.com/p/what-do-robot-sports-teach-us',
    type: 'blog',
  },
  // gr00t-n1-7-release-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/humanoid-wbc dates (GR00T N1.7).
  // GitHub release "n1.7 release" (tag n1.7-release), published 2026-04-18T14:45:14Z, fetched 2026-10-07:
  // "Early Access n1.7 release".
  {
    id: 'gr00t-n1-7-release-2026',
    title: 'n1.7 release',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'GitHub release n1.7-release, NVIDIA/Isaac-GR00T',
    url: 'https://github.com/NVIDIA/Isaac-GR00T/releases/tag/n1.7-release',
    type: 'docs',
  },
  // q2rl-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/rl-for-robotics and rl-sim2real/offline-rl (Q2RL, 2026-10-08).
  // arXiv 2605.05172 abstract (v3 27 Jun 2026; comments: "Robotics: Science and Systems, 2026"): "Q-Estimation
  // extracts a Q-function from a BC policy using a few interaction steps with the environment, followed by online RL
  // with (2) Q-Gating, which switches between BC and RL policy actions based on their respective Q-values" and
  // "learning robust policies for contact-rich and high precision manipulation tasks such as pipe assembly and
  // kitting, in 1-2 hours of online interaction".
  {
    id: 'q2rl-2026',
    title: 'When Life Gives You BC, Make Q-functions: Extracting Q-values from Behavior Cloning for On-Robot Reinforcement Learning',
    authors: ['Lakshita Dodeja', 'Ondrej Biza', 'Shivam Vats', 'Stephen Hart', 'Stefanie Tellex', 'Robin Walters', 'Karl Schmeckpeper', 'Thomas Weng'],
    year: 2026,
    venue: 'RSS 2026',
    arxiv: '2605.05172',
    url: 'https://arxiv.org/abs/2605.05172',
    type: 'paper',
  },
  // insertanything-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/why-rl-locomotion (InsertAnything, 2026-10-08).
  // arXiv 2609.24511 abstract (v1 21 Sep 2026): "A single policy trained only on a simulated hexagonal insertion task
  // achieved an overall success rate of 95.0% across eight unseen real-world insertion tasks."
  {
    id: 'insertanything-2026',
    title: 'InsertAnything: Generalizable Contact-Rich Precision Insertion from Simulation to Reality',
    authors: ['Zhenghua Ma', 'Xinpan Meng', 'Zeyu Liu', 'Muyuan Ma', 'Hengdi Zhang', 'Houcheng Li', 'Long Cheng'],
    year: 2026,
    arxiv: '2609.24511',
    url: 'https://arxiv.org/abs/2609.24511',
    type: 'paper',
  },
  // zest-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/sim2real-transfer, legged-locomotion, humanoid-wbc and reward-design-mpc (ZEST, 2026-10-08).
  // arXiv 2602.00401 abstract (v1 30 Jan 2026): "trains policies via reinforcement learning from diverse sources --
  // high-fidelity motion capture, noisy monocular video, and non-physics-constrained animation -- and deploys them to
  // hardware zero-shot", "avoiding contact labels, reference or observation windows, state estimators, and extensive
  // reward shaping", "an automatic curriculum using a model-based assistive wrench", "a procedure for selecting
  // joint-level gains from approximate analytical armature values for closed-chain actuators, along with a refined
  // model of actuators", "Trained entirely in simulation", "On Boston Dynamics' Atlas humanoid, ZEST learns dynamic,
  // multi-contact skills (e.g., army crawl, breakdancing) from motion capture" and "to Atlas and the Unitree G1" and
  // "to the Spot quadruped".
  {
    id: 'zest-2026',
    title: 'ZEST: Zero-shot Embodied Skill Transfer for Athletic Robot Control',
    authors: [
      'Jean Pierre Sleiman', 'He Li', 'Alphonsus Adu-Bredu', 'Robin Deits', 'Arun Kumar', 'Kevin Bergamin', 'Mohak Bhardwaj',
      'Scott Biddlestone', 'Nicola Burger', 'Matthew A. Estrada', 'Francesco Iacobelli', 'Twan Koolen', 'Alexander Lambert',
      'Erica Lin', 'M. Eva Mungai', 'Zach Nobles', 'Shane Rozen-Levy', 'Yuyao Shi', 'Jiashun Wang', 'Jakob Welner',
      'Fangzhou Yu', 'Mike Zhang', 'Alfred Rizzi', 'Jessica Hodgins', 'Sylvain Bertrand', 'Yeuhi Abe', 'Scott Kuindersma',
      'Farbod Farshidian',
    ],
    year: 2026,
    arxiv: '2602.00401',
    url: 'https://arxiv.org/abs/2602.00401',
    type: 'paper',
  },
  // fetchman-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/humanoid-wbc (FetchMan, 2026-10-08).
  // arXiv 2608.17027 abstract (v2 29 Aug 2026): "deploy it zero-shot on a real Unitree G1, where our single-object
  // reach-and-pick policy walks to and grasps a target across unseen scenes at 73.3% success".
  {
    id: 'fetchman-2026',
    title: 'FetchMan: Learning Visual Humanoid Loco-Manipulation Policies from Simulated Experiences',
    authors: ['Omar Rayyan', 'Zhi Li', 'Max Argus', 'Yuxin Jiang', 'Chang Yu', 'Chenfanfu Jiang', 'Yuchen Cui'],
    year: 2026,
    arxiv: '2608.17027',
    url: 'https://arxiv.org/abs/2608.17027',
    type: 'paper',
  },
  // sleiman-wbmpc-2021: domain pass 2026-10-06, owner sweep item rl-sim2real/reward-design-mpc (Sleiman 2021, 2026-10-08).
  // arXiv 2103.00946 abstract (v1 1 Mar 2021; comments: RA-L and ICRA 2021): "unifies dynamic locomotion and
  // manipulation tasks by formulating a single multi-contact optimal control problem", "could be solved on the robot's
  // onboard computer in real-time within a model predictive control scheme" and "while pushing/pulling a heavy
  // resistive door".
  {
    id: 'sleiman-wbmpc-2021',
    title: 'A Unified MPC Framework for Whole-Body Dynamic Locomotion and Manipulation',
    authors: ['Jean-Pierre Sleiman', 'Farbod Farshidian', 'Maria Vittoria Minniti', 'Marco Hutter'],
    year: 2021,
    venue: 'IEEE Robotics and Automation Letters',
    arxiv: '2103.00946',
    url: 'https://arxiv.org/abs/2103.00946',
    type: 'paper',
  },
  // rai-iros-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/reward-design-mpc (RAI IROS 2026 whole-body MPC, 2026-10-08).
  // RAI Institute blog, datePublished 2026-09-25, fetched 2026-10-08 (HTTP 200), entry "Whole-Body Model Predictive
  // Control for Spin-Aware Quadrupedal Table Tennis": "a novel continuous-time model predictive controller (MPC) for
  // agile full-body control of a quadrupedal robot equipped with an arm", "We demonstrate the system on hardware with a
  // Spot quadruped" and "aim and return balls with varying spin types" and "the system is able to rally with human
  // players". The KOL queue note of 2026-09-25 on the same round-up is consumed by this entry.
  {
    id: 'rai-iros-2026',
    title: 'IROS 2026 Publication Round-Up',
    authors: ['Robotics and AI Institute'],
    year: 2026,
    venue: 'RAI Institute blog',
    url: 'https://rai-inst.com/resources/blog/iros-2026-publication-round-up/',
    type: 'blog',
  },
  // bd-atlas-ces-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/legged-locomotion (Atlas product launch, 2026-10-08).
  // Boston Dynamics news post, datePublished 2026-01-05, fetched 2026-10-08 (HTTP 200): "LAS VEGAS (Jan. 5, 2026) –
  // Boston Dynamics, the global leader in mobile robotics, unveiled the product version of its new Atlas robot at the
  // Consumer Electronics Show in Las Vegas today", "The company will begin production of the new Atlas robots at its
  // Boston headquarters immediately" and "All Atlas deployments are already fully committed for 2026, with fleets
  // scheduled to ship to Hyundai's Robotics Metaplant Application Center (RMAC) and Google DeepMind".
  {
    id: 'bd-atlas-ces-2026',
    title: 'Boston Dynamics Unveils New Atlas Robot to Revolutionize Industry',
    authors: ['Boston Dynamics'],
    year: 2026,
    url: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
    type: 'press',
  },
  // gu-humanoid-review-2026: domain pass 2026-10-06, owner sweep item rl-sim2real/legged-locomotion (Science Robotics review, 2026-10-08).
  // Crossref 10.1126/scirobotics.aed3973, read 2026-10-08: "Evolution of humanoid locomotion control", Science
  // Robotics 11(117), published 19 Aug 2026, 13 authors from Yan Gu to Koushil Sreenath. Abstract: "The locomotion
  // control of humanoids has evolved from classical model–based methods to reinforcement learning powered by
  // large-scale simulation and now to generative models that produce adaptive, whole-body behaviors".
  {
    id: 'gu-humanoid-review-2026',
    title: 'Evolution of Humanoid Locomotion Control',
    authors: [
      'Yan Gu', 'Guanya Shi', 'Fan Shi', 'I-Chia Chang', 'Yen-Jen Wang', 'Qilong Cheng', 'Zachary Olkin',
      'Ivan Lopez-Sanchez', 'Yunchu Feng', 'Jian Zhang', 'Aaron D. Ames', 'Hao Su', 'Koushil Sreenath',
    ],
    year: 2026,
    venue: 'Science Robotics',
    url: 'https://doi.org/10.1126/scirobotics.aed3973',
    type: 'paper',
  },
  // resgac-2026: domain pass 2026-10-06, KOL intake note of Guanya Shi (rl-sim2real/humanoid-wbc, ResGAC; disposition of 2026-10-08).
  // arXiv 2610.09479 abstract (v1 7 Oct 2026): "combines geometric admittance control (GAC) with residual
  // reinforcement learning", "ResGAC is validated on a real Unitree G1 humanoid" and "ResGAC achieves 90% success in
  // a standing peg-in-hole task compared with 50% for SONIC". PDF author block: Guanya Shi, Amazon FAR and Carnegie
  // Mellon University.
  {
    id: 'resgac-2026',
    title: 'Precise SE(3) End-Effector Tracking in Whole-Body Humanoid Control',
    authors: ['Joohwan Seo', 'Xiaofeng Guo', 'Jinkun Cao', 'Roberto Horowitz', 'Rocky Duan', 'Guanya Shi', 'Koushil Sreenath'],
    year: 2026,
    arxiv: '2610.09479',
    url: 'https://arxiv.org/abs/2610.09479',
    type: 'paper',
  },
  // roborender-2026: domain pass 2026-10-06, KOL intake note of Jiajun Wu (rl-sim2real/sim2real-transfer, RoboRender; disposition of 2026-10-08).
  // arXiv 2610.09254 abstract (v1 7 Oct 2026): "a framework that converts simulated trajectories into photorealistic
  // RGB videos for policy learning" and "policies trained on RoboRender-generated data achieve a 71% average success
  // rate, outperforming raw simulation renderings and conventional visual domain randomization by approximately 7.1x
  // and 3.6x, respectively". PDF author block: Li Fei-Fei and Jiajun Wu, Stanford University.
  {
    id: 'roborender-2026',
    title: 'RoboRender: Robot-Oriented Video Generation for Visual Sim-to-Real Transfer',
    authors: ['Huang Huang', 'Wensi Ai', 'Ziyu Chen', 'Youhui Wang', 'Zijian Du', 'Yang Liu', 'Jiaolong Yang', 'Li Fei-Fei', 'Jiajun Wu'],
    year: 2026,
    arxiv: '2610.09254',
    url: 'https://arxiv.org/abs/2610.09254',
    type: 'paper',
  },
  // workhorse-2026: domain pass 2026-10-06, KOL intake note of Pieter Abbeel (rl-sim2real/humanoid-wbc, Workhorse; disposition of 2026-10-08).
  // arXiv 2610.09117 abstract (v1 6 Oct 2026): "A visual planner predicts five-link targets", "A reinforcement-learning
  // whole-body tracker follows them on the robot", "Both policies train separately on the same recorded human poses,
  // without retargeting" and "In a simulated copy of the demonstration room, the system completes box sorting in 77 %
  // of episodes, and in 64 % under 40 N·s pushes". PDF author block: all authors, University of California, Berkeley.
  {
    id: 'workhorse-2026',
    title: 'Workhorse: Learning Robust Whole-Body Humanoid Loco-Manipulation from Human Data',
    authors: ['Songbo Hu', 'Qiayuan Liao', 'Yufeng Chi', 'Kevin Zakka', 'Yakun Sophia Shao', 'Pieter Abbeel', 'Koushil Sreenath'],
    year: 2026,
    arxiv: '2610.09117',
    url: 'https://arxiv.org/abs/2610.09117',
    type: 'paper',
  },
];

const BY_ID = new Map(CITATIONS.map((c) => [c.id, c]));

export function getCitation(id: string): Citation | undefined {
  return BY_ID.get(id);
}

/**
 * Organisation bylines, keyed by the name the registry records, and the name
 * their chips print: the full name, or the short name the organisation
 * itself uses ("OSHA", "Tesla"). A byline missing here is read as a person,
 * whose chip prints the surname, so every organisation with a name of more
 * than one word has to be listed, or its chip would print a trailing
 * fragment such as "Dynamics 2024". tests/unit/citations.test.ts fails on
 * an unlisted organisation byline.
 */
export const ORGANIZATION_CHIP_NAMES: ReadonlyMap<string, string> = new Map([
  ['1X Technologies', '1X Technologies'],
  ['Agility Robotics', 'Agility Robotics'],
  ['Association for Advancing Automation', 'A3'],
  ['Astroscale Japan', 'Astroscale'],
  ['Boston Dynamics', 'Boston Dynamics'],
  ['Canadian Space Agency', 'Canadian Space Agency'],
  ['CMR Surgical', 'CMR Surgical'],
  ['Creative Commons', 'Creative Commons'],
  ['EVST Engineering Team', 'EVST Engineering Team'],
  ['Figure AI', 'Figure AI'],
  ['Franka Robotics', 'Franka Robotics'],
  ['GEAR Team', 'GEAR Team'],
  ['Gemini Robotics Team', 'Gemini Robotics Team'],
  ['Gemma Team', 'Gemma Team'],
  ['Generalist Team', 'Generalist Team'],
  ['Google DeepMind', 'Google DeepMind'],
  ['Hugging Face', 'Hugging Face'],
  ['IEEE Standards Association', 'IEEE Standards Association'],
  ['International Federation of Robotics', 'International Federation of Robotics'],
  ['Intuitive Surgical', 'Intuitive Surgical'],
  ['Lean Enterprise Institute', 'Lean Enterprise Institute'],
  ['Meta AI', 'Meta AI'],
  ['Moon Surgical', 'Moon Surgical'],
  ['MoveIt Maintainers', 'MoveIt Maintainers'],
  ['NASA Jet Propulsion Laboratory', 'NASA Jet Propulsion Laboratory'],
  ['Nav2 Project', 'Nav2 Project'],
  ['Northrop Grumman', 'Northrop Grumman'],
  ['Occupational Safety and Health Administration', 'OSHA'],
  ['Ocado Group', 'Ocado Group'],
  ['Octo Model Team', 'Octo Model Team'],
  ['Open X-Embodiment Collaboration', 'Open X-Embodiment Collaboration'],
  ['Physical Intelligence', 'Physical Intelligence'],
  ['PickNik Robotics', 'PickNik Robotics'],
  ['Robotics and AI Institute', 'RAI Institute'],
  ['Rocking Robots', 'Rocking Robots'],
  ['ROS 2 Project', 'ROS 2 Project'],
  ['SAM 3D Team', 'SAM 3D Team'],
  ['Sanctuary AI', 'Sanctuary AI'],
  ['SCSC Assurance Case Working Group', 'SCSC'],
  ['Seeed Studio', 'Seeed Studio'],
  ['Shadow Robot', 'Shadow Robot'],
  ['Skild AI Team', 'Skild AI Team'],
  ['Skild Team', 'Skild Team'],
  ['Symbotic Inc.', 'Symbotic'],
  ['Tesla, Inc.', 'Tesla'],
  ['The Linux Foundation', 'The Linux Foundation'],
  ['The Robot Report', 'The Robot Report'],
  ['TRI LBM Team', 'TRI LBM Team'],
  ['Trossen Robotics', 'Trossen Robotics'],
  ['U.S. Food and Drug Administration', 'FDA'],
  ['UL Standards & Engagement', 'UL Standards & Engagement'],
  ['Unitree Robotics', 'Unitree Robotics'],
  ['Universal Robots', 'Universal Robots'],
  ['Xiaomi Robotics Team', 'Xiaomi Robotics Team'],
]);

/**
 * Person bylines whose surname is more than the last word. A particle
 * heuristic is unsafe: "Jared Di Carlo" is "Di Carlo", but "Di Huang" is
 * "Huang".
 */
const SURNAME_OVERRIDES: ReadonlyMap<string, string> = new Map([
  ['Jared Di Carlo', 'Di Carlo'],
  ['Johnny Nuñez Cano', 'Nuñez Cano'],
  ['Ruben D. Salas Parra', 'Salas Parra'],
]);

/** The name a chip prints for the first author: an organisation or a surname. */
export function citationAuthorName(citation: Pick<Citation, 'authors'>): string {
  const firstAuthor = citation.authors[0];
  return (
    ORGANIZATION_CHIP_NAMES.get(firstAuthor) ??
    SURNAME_OVERRIDES.get(firstAuthor) ??
    firstAuthor.split(' ').at(-1) ??
    firstAuthor
  );
}

/**
 * The citation label every chip and source list prints, the one place it is
 * derived: the first author's surname, with "et al." when the source has
 * more authors, or the organisation's name, then the year. "Zhao et al.
 * 2023", "Kalman 1960", "Boston Dynamics 2024".
 */
export function citationLabel(citation: Pick<Citation, 'authors' | 'year'>): string {
  const more = citation.authors.length > 1 ? ' et al.' : '';
  return `${citationAuthorName(citation)}${more} ${citation.year}`;
}

/**
 * True when the venue string already states the entry's year ("RSS 2023"
 * with year 2023). Renderers use this to print the year once instead of
 * duplicating it ("..., RSS 2023." rather than "..., RSS 2023, 2023.").
 * A venue whose year differs from the entry year ("RSS 2025" with year
 * 2024, a paper published at a later venue) renders both, which is
 * informative, and a venue without a year keeps the trailing year.
 */
export function venueStatesYear(citation: Citation): boolean {
  return typeof citation.year === 'number' && (citation.venue?.includes(String(citation.year)) ?? false);
}

/** Tooltip metadata line: up to three authors, then venue and year. */
export function citationMeta(citation: Citation): string {
  const shown = citation.authors.slice(0, 3);
  const suffix = citation.authors.length > 3 ? ' et al.' : '';
  const where = citation.venue ? `, ${citation.venue}` : '';
  const when = venueStatesYear(citation) ? '' : `, ${citation.year}${citation.year === 'n.d.' ? `; accessed ${citation.accessedOn}` : ''}`;
  return `${shown.join(', ')}${suffix}${where}${when}`;
}
