/**
 * Market-map company data. Generated from
 * research/04-market-map-companies.json by scripts/generate-companies.ts.
 *
 * Do not edit by hand. Regenerate with `npm run generate:companies`.
 *
 * `aka` is carried through from the research source (expanded cards
 * need it). `website` is the official homepage when known, else null.
 * `logo` is an image-registry id or null. Unknown funding stays null;
 * never invent a number. Conflicting tracker figures stay as the snapshot
 * value plus their sources, rather than being averaged or silently
 * replaced.
 *
 * The rows are typed against the Zod schema's inferred type; the schema
 * parses them at build time on the server (lib/registry-validation.ts, run
 * while the article routes prerender), so an invalid row fails
 * `next build`. Structured search imports these rows into the browser,
 * so a module-scope parse here would ship zod with them.
 */
import type { Company } from './schemas/company.ts';

export type { Company } from './schemas/company.ts';

const ROWS: Company[] = [
  {
    id: 'physical-intelligence',
    name: 'Physical Intelligence',
    aka: [
      'π',
    ],
    website: 'https://www.pi.website',
    logo: 'physical-intelligence-logo',
    hq: {
      city: 'San Francisco',
      country: 'US',
    },
    founded: 2024,
    segment: 'foundation-models',
    subSegment: 'generalist-manipulation-policies',
    description: 'Builds vision-language-action models for robots in its π0 series, and open-sourced the code and weights of π0.',
    approach: [
      'vla',
      'flow-matching-action-expert',
      'cross-embodiment',
      'real-world-rl',
    ],
    totalRaisedUsd: 1100000000,
    latestRound: {
      type: 'Series B',
      amountUsd: 600000000,
      date: null,
      valuationUsd: 5600000000,
      leadInvestors: [
        'CapitalG',
        'Lux Capital',
      ],
    },
    status: 'private',
    deployments: [],
    openSource: [
      'π0 and π0-FAST (weights and code)',
    ],
    sources: [
      {
        url: 'https://www.therobotreport.com/physical-intelligence-raises-600m-advance-robot-foundation-models/',
        title: 'Physical Intelligence raises $600M to advance robot foundation models',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.pi.website/blog/pistar06',
        title: 'π*0.6: A VLA That Learns from Experience',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'skild-ai',
    name: 'Skild AI',
    aka: [],
    website: 'https://www.skild.ai',
    logo: 'skild-ai-logo',
    hq: {
      city: null,
      country: 'US',
    },
    founded: 2023,
    segment: 'foundation-models',
    subSegment: 'generalist-manipulation-policies',
    description: 'Builds the Skild Brain: general-purpose robot foundation models meant to be retrofitted to many different robots and tasks.',
    approach: [
      'vla',
      'omni-bodied-intelligence',
      'large-scale-data',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: 1400000000,
      date: '2026-01-14',
      valuationUsd: null,
      leadInvestors: [
        'SoftBank',
      ],
      caveat: {
        text: 'TechCrunch, citing Bloomberg, puts the valuation at more than $14 billion; no exact figure is given.',
        sourceUrls: [
          'https://techcrunch.com/2026/01/14/robotic-software-maker-skild-ai-hits-14b-valuation/',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Foxconn Blackwell assembly lines (with Nvidia)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://techcrunch.com/2026/01/14/robotic-software-maker-skild-ai-hits-14b-valuation/',
        title: 'Skild AI hits $14B valuation',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.businesswire.com/news/home/20260114335623/en/Skild-AI-Raises-$1.4B',
        title: 'Skild AI Raises $1.4B, Now Valued Over $14B',
        asOf: '2026-08-18',
      },
      {
        url: 'https://money.usnews.com/investing/news/articles/2026-03-16/skild-ai-nvidia-deploy-robot-brain-on-blackwell-assembly-lines',
        title: 'Skild AI, Nvidia deploy robot brain on Blackwell assembly lines (US News, Reuters wire, 2026-03-16)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'hq.city': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Skild AI and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'generalist-ai',
    name: 'Generalist AI',
    aka: [],
    website: 'https://generalistai.com',
    logo: 'generalist-ai-logo',
    hq: {
      city: null,
      country: 'US',
    },
    founded: null,
    segment: 'foundation-models',
    subSegment: 'generalist-manipulation-policies',
    description: 'Builds embodied foundation models for robots, GEN-1 and GEN-1.5, trained on more than half a million hours of real-world data gathered with its hand-mimicking grippers.',
    approach: [
      'robot-foundation-models',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: 400000000,
      date: '2026-06-04',
      valuationUsd: 2000000000,
      leadInvestors: [
        'Radical Ventures',
      ],
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://generalistai.com/blog/accelerating-the-next-phase-of-physical-ai',
        title: 'Accelerating the Next Phase of Physical AI',
        asOf: '2026-08-18',
      },
      {
        url: 'https://qz.com/generalist-ai-funding-robotics-nvidia-bezos-060526',
        title: 'Generalist AI raises $400M at $2B valuation, backed by Nvidia',
        asOf: '2026-08-18',
      },
      {
        url: 'https://generalistai.com/careers',
        title: 'Careers / Generalist',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'hq.city': {
        state: 'not-disclosed',
      },
      'founded': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Generalist AI and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'dyna-robotics',
    name: 'Dyna Robotics',
    aka: [
      'DYNA',
    ],
    website: 'https://www.dyna.co',
    logo: 'dyna-robotics-logo',
    hq: {
      city: 'Redwood City',
      country: 'US',
    },
    founded: null,
    segment: 'foundation-models',
    subSegment: 'generalist-manipulation-policies',
    description: 'Builds robots and the foundation models that run them, from DYNA-1 to Dyna-2.1, which it calls a general-purpose physical agent for long, dexterous workflows.',
    approach: [
      'robot-foundation-models',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series A',
      amountUsd: 120000000,
      date: '2025-09-15',
      valuationUsd: null,
      leadInvestors: [
        'RoboStrategy',
        'CRV',
        'First Round Capital',
      ],
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/dyna-robotics-closes-120m-funding-round-to-scale-robotics-foundation-model/',
        title: 'Dyna Robotics closes $120M funding round to scale robotics foundation model',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.dyna.co/careers',
        title: 'Careers — DYNA',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'founded': {
        state: 'not-disclosed',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'sunday-robotics',
    name: 'Sunday Robotics',
    aka: [
      'Sunday',
    ],
    website: 'https://www.sunday.ai',
    logo: 'sunday-robotics-logo',
    hq: {
      city: 'Mountain View',
      country: 'US',
    },
    founded: null,
    segment: 'foundation-models',
    subSegment: 'home-robot-policies',
    description: 'Builds Memo, an autonomous home robot that clears tables and loads the dishwasher, trained with data from its Skill Capture Glove.',
    approach: [
      'vla',
      'skill-capture-glove',
      'real-world-episodes',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series B',
      amountUsd: 165000000,
      date: '2026-03-12',
      valuationUsd: 1150000000,
      leadInvestors: [
        'Coatue',
      ],
    },
    status: 'private',
    deployments: [
      'Beta deployments planned for fall 2026',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.globenewswire.com/news-release/2026/03/12/3254877/0/en/Sunday-Raises-165M-to-Launch-First-Autonomous-Robots-by-Thanksgiving.html',
        title: 'Sunday Raises $165M at $1.15B valuation, led by Coatue (first-party)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.techbuzz.ai/articles/sunday-robotics-hits-1-15b-valuation-on-household-robot-push',
        title: 'Sunday Robotics Hits $1.15B Valuation on Household Bot Push (TechBuzz, 2026-03-12)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.bloomberg.com/news/articles/2026-03-12/dishwashing-home-robot-maker-sunday-hits-1-15-billion-valuation',
        title: 'Sunday Hits $1.15 Billion Valuation',
        asOf: '2026-08-06',
      },
    ],
    confidence: 'high',
    absent: {
      'founded': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'field-ai',
    name: 'Field AI',
    aka: [
      'FieldAI',
    ],
    website: 'https://www.fieldai.com',
    logo: 'field-ai-logo',
    hq: {
      city: 'Irvine',
      country: 'US',
    },
    founded: 2023,
    segment: 'foundation-models',
    subSegment: 'navigation-mobility',
    description: 'Builds field foundation models enabling robots across diverse embodiments to operate safely in unstructured real-world environments like construction sites.',
    approach: [
      'field-foundation-models',
      'cross-embodiment',
      'unstructured-environments',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: 405000000,
      date: '2025-08-20',
      valuationUsd: 2000000000,
      leadInvestors: [],
      caveat: {
        text: 'The $405M is two funding rounds announced together; the sources do not give the latest round on its own.',
        sourceUrls: [
          'https://www.cnbc.com/2025/08/20/gates-nvidia-fieldai-robotics.html',
        ],
      },
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.cnbc.com/2025/08/20/gates-nvidia-fieldai-robotics.html',
        title: 'Gates, Nvidia-backed robotics firm Field AI hits $2 billion valuation after recent raise',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/fieldai-raises-405m-scales-physics-first-foundation-models/',
        title: 'FieldAI raises $405M to scale physics-first foundation models (The Robot Report)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'covariant',
    name: 'Covariant',
    aka: [],
    website: 'https://covariant.ai',
    logo: 'covariant-logo',
    hq: {
      city: null,
      country: 'US',
    },
    founded: null,
    segment: 'foundation-models',
    subSegment: 'generalist-manipulation-policies',
    description: 'Built robotic foundation models for warehouse robot arms; in 2024 Amazon hired its founders and about a quarter of its staff and took a non-exclusive license to the models.',
    approach: [
      'robot-foundation-models',
      'rfm',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Hiring and licensing deal',
      amountUsd: null,
      date: '2024-08-30',
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [
      'Amazon\'s robot fleet, under a non-exclusive model license',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.aboutamazon.com/news/company-news/amazon-covariant-ai-robots',
        title: 'Amazon hires Covariant founders and ~25% of staff, licenses Covariant RFMs (first-party, 2024-08-31)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://techcrunch.com/2024/08/31/amazon-hires-the-founders-of-robotics-ai-startup-covariant/',
        title: 'Amazon hires the founders of AI robotics startup Covariant',
        asOf: '2026-08-06',
      },
    ],
    confidence: 'high',
    absent: {
      'hq.city': {
        state: 'not-disclosed',
      },
      'founded': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources call it Covariant and give no other name (its website returned no readable body).',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources (its website returned no readable body).',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'A hiring and licensing deal, neither a financing round nor a sale, so it puts no value on the company.',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'A hiring and licensing deal, not a financing round: Amazon hired staff and licensed the models, and neither source names an investor.',
      },
    },
  },
  {
    id: 'genesis-ai',
    name: 'Genesis AI',
    aka: [],
    website: 'https://www.genesis.ai',
    logo: 'genesis-ai-logo',
    hq: {
      city: 'Paris',
      country: 'FR',
    },
    founded: null,
    segment: 'foundation-models',
    subSegment: 'generalist-manipulation-policies',
    description: 'Builds general-purpose robotics foundation models trained on synthetic data from a proprietary physics simulation engine; unveiled GENE-26.5 model and Eno robot.',
    approach: [
      'synthetic-data',
      'physics-simulation',
      'vla',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Seed',
      amountUsd: 105000000,
      date: '2025-07-01',
      valuationUsd: null,
      leadInvestors: [
        'Eclipse Ventures',
        'Khosla Ventures',
      ],
    },
    status: 'private',
    deployments: [
      'Targeted customer deployments planned by the end of 2026',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://techfundingnews.com/genesis-ai-105m-seed-funding/',
        title: 'Genesis AI emerges from stealth with $105M seed funding (TechFundingNews, 2025-07-02)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.genesis.ai/press',
        title: 'Genesis AI press page (first-party; GENE-26.5 full-stack demo, May 2026)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'founded': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Genesis AI and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'rhoda-ai',
    name: 'Rhoda AI',
    aka: [],
    website: 'https://www.rhoda.ai',
    logo: 'rhoda-ai-logo',
    hq: {
      city: 'Palo Alto',
      country: 'US',
    },
    founded: null,
    segment: 'foundation-models',
    subSegment: 'video-prediction-world-models',
    description: 'Builds FutureVision, robot AI whose Direct Video Action model is pre-trained on hundreds of millions of videos, for industrial work in manufacturing and logistics.',
    approach: [
      'video-predictive-control',
      'direct-video-action',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series A',
      amountUsd: 450000000,
      date: '2026-03-10',
      valuationUsd: 1700000000,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://finance.yahoo.com/news/rhoda-ai-raises-450-million-160945418.html',
        title: 'Rhoda AI raises $450 million at $1.7 billion valuation (Reuters)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://techfundingnews.com/rhoda-ai-450m-series-a-stealth-exit-robotics/',
        title: 'Khosla-backed Rhoda raises $450M at $1.7B valuation for video-trained AI',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'founded': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Rhoda AI and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'mind-robotics',
    name: 'Mind Robotics',
    aka: [],
    website: 'https://www.mindrobotics.com',
    logo: 'mind-robotics-logo',
    hq: {
      city: 'Palo Alto',
      country: 'US',
    },
    founded: 2025,
    segment: 'foundation-models',
    subSegment: 'industrial-robotics',
    description: 'Rivian spinoff developing industrial robots to further automate factory operations; it collects video of live work on factory lines, starting with automotive manufacturing.',
    approach: [
      'ai-industrial-robotics',
      'factory-data',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: 400000000,
      date: '2026-05-13',
      valuationUsd: 3400000000,
      leadInvestors: [
        'Kleiner Perkins',
      ],
    },
    status: 'private',
    deployments: [
      'Rivian, its first customer',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://techcrunch.com/2026/05/13/rivian-spinoff-mind-robotics-raises-another-400m/',
        title: 'Rivian spinoff Mind Robotics raises another $400M (TechCrunch; total >$1B at $3.4B valuation)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/mind-robotics-raises-400m-scale-ai-powered-robots/',
        title: 'Mind Robotics raises $400M to scale AI-powered robots (The Robot Report)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://news.crunchbase.com/robotics/startup-venture-funding-surges-2026-data/',
        title: 'Sector Snapshot: Robotics Startups On Fire As Venture Funding Surges',
        asOf: '2026-08-18',
      },
      {
        url: 'https://finance.yahoo.com/news/rivian-spinout-mind-robotics-valued-154827510.html',
        title: 'Rivian spinout Mind Robotics valued at $3.4 billion in new funding round (Reuters; valuation source of record)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Mind Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'nvidia-robotics',
    name: 'NVIDIA',
    aka: [],
    website: 'https://www.nvidia.com',
    logo: 'nvidia-logo',
    hq: {
      city: 'Santa Clara',
      country: 'US',
    },
    founded: 1993,
    segment: 'simulation-tooling',
    subSegment: 'simulation-platforms',
    description: 'Provides the full-stack robotics platform: Isaac Sim/Lab simulation, GR00T foundation models, Jetson Thor edge compute, and Cosmos world models for physical AI.',
    approach: [
      'simulation-first',
      'edge-compute',
      'foundation-models',
      'reference-designs',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [
      'Isaac GR00T reference humanoid, to be used by Ai2, ETH Zurich, Stanford and UC San Diego labs',
    ],
    openSource: [
      'Isaac GR00T N1.6 and Cosmos open models (on Hugging Face)',
      'Isaac Lab-Arena (simulation framework)',
      'OSMO (workflow command center)',
    ],
    sources: [
      {
        url: 'https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design',
        title: 'NVIDIA Announces Isaac GR00T Reference Humanoid Robot',
        asOf: '2026-08-06',
      },
      {
        url: 'https://techcrunch.com/2026/01/05/nvidia-wants-to-be-the-android-of-generalist-robotics/',
        title: 'Nvidia wants to be the Android of generalist robotics',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.nvidia.com/en-us/about-nvidia/corporate-timeline/',
        title: 'Our History: Innovations Over the Years | NVIDIA',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it NVIDIA and give no other name.',
      },
      'totalRaisedUsd': {
        state: 'not-applicable',
        basis: 'NVIDIA\'s robotics business, funded by NVIDIA: it has no venture total of its own.',
      },
      'round.type': {
        state: 'not-applicable',
        basis: 'NVIDIA\'s robotics business, funded by NVIDIA: it raises no rounds of its own.',
      },
      'round.amountUsd': {
        state: 'not-applicable',
        basis: 'NVIDIA\'s robotics business, funded by NVIDIA: it raises no rounds of its own.',
      },
      'round.date': {
        state: 'not-applicable',
        basis: 'NVIDIA\'s robotics business, funded by NVIDIA: it raises no rounds of its own.',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'NVIDIA\'s robotics business, funded by NVIDIA: it raises no rounds of its own.',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'NVIDIA\'s robotics business, funded by NVIDIA: it raises no rounds of its own.',
      },
    },
  },
  {
    id: 'google-deepmind-robotics',
    name: 'Google DeepMind (Robotics)',
    aka: [],
    website: 'https://deepmind.google',
    logo: 'google-deepmind-robotics-logo',
    hq: {
      city: 'London',
      country: 'UK',
    },
    founded: 2010,
    segment: 'simulation-tooling',
    subSegment: 'foundation-models',
    description: 'Builds Gemini Robotics VLA models (1.5, 2, On-Device) for whole-body humanoid control, multi-finger dexterity, and multi-robot collaboration.',
    approach: [
      'vla',
      'whole-body-control',
      'on-device-inference',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [
      'Demonstrated on Apptronik Apollo 2',
      'Partner robots from Boston Dynamics and Agile Robots',
    ],
    openSource: [
      'MuJoCo (physics simulator)',
    ],
    sources: [
      {
        url: 'https://www.theverge.com/tech/973276/google-deepmind-gemini-robotics-2-whole-body-control-ai',
        title: 'Google DeepMind\'s Gemini Robotics 2 can control a robot\'s entire body (The Verge)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
        title: 'Gemini Robotics 2 brings whole body intelligence to robots',
        asOf: '2026-08-06',
      },
      {
        url: 'https://deepmind.google/about/',
        title: 'About Google DeepMind',
        asOf: '2026-10-19',
      },
      {
        url: 'https://find-and-update.company-information.service.gov.uk/company/07386350',
        title: 'DEEPMIND TECHNOLOGIES LIMITED, Companies House',
        asOf: '2026-10-19',
      },
      {
        url: 'https://github.com/google-deepmind/mujoco',
        title: 'google-deepmind/mujoco: a general purpose physics simulator (GitHub)',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Google DeepMind and give no other name.',
      },
      'totalRaisedUsd': {
        state: 'not-applicable',
        basis: 'Google DeepMind\'s robotics work, funded by Google: it has no venture total of its own.',
      },
      'round.type': {
        state: 'not-applicable',
        basis: 'Google DeepMind\'s robotics work, funded by Google: it raises no rounds of its own.',
      },
      'round.amountUsd': {
        state: 'not-applicable',
        basis: 'Google DeepMind\'s robotics work, funded by Google: it raises no rounds of its own.',
      },
      'round.date': {
        state: 'not-applicable',
        basis: 'Google DeepMind\'s robotics work, funded by Google: it raises no rounds of its own.',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'Google DeepMind\'s robotics work, funded by Google: it raises no rounds of its own.',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'Google DeepMind\'s robotics work, funded by Google: it raises no rounds of its own.',
      },
    },
  },
  {
    id: 'hugging-face-lerobot',
    name: 'Hugging Face (LeRobot)',
    aka: [
      'LeRobot',
    ],
    website: 'https://huggingface.co',
    logo: 'hugging-face-logo',
    hq: {
      city: 'New York',
      country: 'US',
    },
    founded: 2016,
    segment: 'simulation-tooling',
    subSegment: 'open-source-frameworks',
    description: 'Develops LeRobot, an open-source library of data-collection, training and visualization tools for robot learning, and Reachy Mini, a desktop-sized open-source robot.',
    approach: [
      'open-source',
      'community-driven',
      'democratization',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [],
    openSource: [
      'LeRobot',
      'Reachy Mini',
    ],
    sources: [
      {
        url: 'https://huggingface.co/blog/reachy-mini',
        title: 'Reachy Mini - Open-Source Robot',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.startuphub.ai/ai-news/robotics/2026/hugging-face-s-reachy-mini-the-300-open-source-robot',
        title: 'Hugging Face\'s Reachy Mini: The $300 Open Source Robot',
        asOf: '2026-08-06',
      },
      {
        url: 'https://techcrunch.com/2023/08/24/hugging-face-raises-235m-from-investors-including-salesforce-and-nvidia/',
        title: 'Hugging Face raises $235M from investors, including Salesforce and Nvidia',
        asOf: '2026-10-19',
      },
      {
        url: 'https://github.com/huggingface/lerobot',
        title: 'huggingface/lerobot: Making AI for Robotics more accessible (GitHub)',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'totalRaisedUsd': {
        state: 'not-applicable',
        basis: 'Hugging Face\'s robotics work (LeRobot), funded by Hugging Face: it has no venture total of its own.',
      },
      'round.type': {
        state: 'not-applicable',
        basis: 'Hugging Face\'s robotics work (LeRobot), funded by Hugging Face: it raises no rounds of its own.',
      },
      'round.amountUsd': {
        state: 'not-applicable',
        basis: 'Hugging Face\'s robotics work (LeRobot), funded by Hugging Face: it raises no rounds of its own.',
      },
      'round.date': {
        state: 'not-applicable',
        basis: 'Hugging Face\'s robotics work (LeRobot), funded by Hugging Face: it raises no rounds of its own.',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'Hugging Face\'s robotics work (LeRobot), funded by Hugging Face: it raises no rounds of its own.',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'Hugging Face\'s robotics work (LeRobot), funded by Hugging Face: it raises no rounds of its own.',
      },
    },
  },
  {
    id: 'applied-intuition',
    name: 'Applied Intuition',
    aka: [],
    website: 'https://www.appliedintuition.com',
    logo: 'applied-intuition-logo',
    hq: {
      city: 'Sunnyvale',
      country: 'US',
    },
    founded: 2017,
    segment: 'simulation-tooling',
    subSegment: 'simulation-platforms',
    description: 'Builds vehicle software, simulation, validation, and autonomy AI stacks for automotive and defense; expanding into robotics with Dana natural-language service.',
    approach: [
      'simulation',
      'validation',
      'autonomy-stack',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series F',
      amountUsd: 600000000,
      date: '2025-06-17',
      valuationUsd: 15000000000,
      leadInvestors: [
        'BlackRock',
        'Kleiner Perkins',
      ],
      caveat: {
        text: 'The $600M covers the Series F and a tender offer together; the company does not say how much is new money.',
        sourceUrls: [
          'https://www.appliedintuition.com/press-releases/series-f',
        ],
      },
    },
    status: 'private',
    deployments: [
      '18 of top 20 automakers',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.appliedintuition.com/blog/series-f',
        title: 'Series F funding drives $15B valuation (first-party; BlackRock and Kleiner Perkins led)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.semafor.com/article/07/20/2026/applied-intuition-wants-to-turn-robotics-into-childs-play',
        title: 'Exclusive: Applied Intuition wants to turn robotics into child\'s play (Semafor; original of the syndicated Yahoo Tech piece)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.appliedintuition.com/press-releases/series-f',
        title: 'Applied Intuition Closes $600M Series F at $15B Valuation',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Applied Intuition and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'xdof',
    name: 'XDOF',
    aka: [],
    website: 'https://www.xdof.ai',
    logo: 'xdof-logo',
    hq: {
      city: null,
      country: 'US',
    },
    founded: null,
    segment: 'simulation-tooling',
    subSegment: 'data-collection',
    description: 'Builds infrastructure for robot foundation model training through robotic teleoperation and real-world data collection at scale.',
    approach: [
      'teleoperation',
      'data-collection',
      'robotics-infrastructure',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: 70000000,
      date: '2026-06-17',
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [],
    openSource: [
      'ABC-130K teleoperation dataset',
    ],
    sources: [
      {
        url: 'https://techcrunch.com/2026/06/17/collecting-robot-training-data-is-dirty-unglamorous-work-some-ai-labs-are-already-paying-xdof-to-do-it/',
        title: 'XDOF exits stealth with $70M (Thrive Capital, Spark Capital, a16z, Lux, WndrCo)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://theaiinsider.tech/2026/06/18/robotics-infrastructure-startup-xdof-emerges-from-stealth-with-70m/',
        title: 'XDOF Emerges from Stealth with $70M',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.xdof.ai/careers',
        title: 'Careers | XDOF',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'hq.city': {
        state: 'not-disclosed',
      },
      'founded': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it XDOF and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'encord',
    name: 'Encord',
    aka: [],
    website: 'https://encord.com',
    logo: 'encord-logo',
    hq: {
      city: 'London',
      country: 'UK',
    },
    founded: null,
    segment: 'simulation-tooling',
    subSegment: 'data-collection',
    description: 'Provides multimodal data management, annotation, and collection platform for physical AI, including real-world egocentric and sensor data for robotics.',
    approach: [
      'data-annotation',
      'data-curation',
      'robotics-data',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series B',
      amountUsd: 30000000,
      date: '2024-08-13',
      valuationUsd: null,
      leadInvestors: [
        'Next47',
      ],
    },
    status: 'private',
    deployments: [
      'Woven by Toyota',
      '300+ AI teams',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://encord.com/blog/encord-announces-30-million-series-b/',
        title: 'Announcing Encord\'s $30 million Series B funding, led by Next47 (first-party)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://encord.com/data-collection-services/',
        title: 'Real-world training data collection for Physical AI',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.technologyreview.com/2026/04/01/1134863/',
        title: 'The gig workers who are training humanoid robots at home (MIT Technology Review; Encord and Micro1 paying people to film chores)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://find-and-update.company-information.service.gov.uk/company/12330483',
        title: 'CORD TECHNOLOGIES LIMITED, Companies House',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'medium',
    absent: {
      'founded': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Encord and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'micro1',
    name: 'Micro1',
    aka: [],
    website: 'https://www.micro1.ai',
    logo: 'micro1-logo',
    hq: {
      city: 'Palo Alto',
      country: 'US',
    },
    founded: null,
    segment: 'simulation-tooling',
    subSegment: 'data-collection',
    description: 'Provides expert-demonstrated data to frontier robotics labs: first-person and third-person recordings of domain experts doing real-world tasks.',
    approach: [
      'teleoperation',
      'expert-demonstrations',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.micro1.ai/data-engine/robotics',
        title: 'High quality expert-demonstrated data for frontier robotics labs',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.latimes.com/business/story/2026-02-07/how-la-garage-sales-launched-ais-latest-20-something-billionaire',
        title: 'How L.A. garage sales launched AI\'s latest 20-something billionaire (Los Angeles Times)',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'medium',
    absent: {
      'founded': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Micro1 and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'figure-ai',
    name: 'Figure AI',
    aka: [
      'Figure',
    ],
    website: 'https://www.figure.ai',
    logo: 'figure-ai-logo',
    hq: {
      city: 'San Jose',
      country: 'US',
    },
    founded: 2022,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds general-purpose humanoid robots (Figure 01-03) controlled by in-house Helix VLA models for warehouse and manufacturing tasks.',
    approach: [
      'vla',
      'helix',
      'full-stack',
      'in-house-models',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: null,
      date: '2025-09-16',
      valuationUsd: 39000000000,
      leadInvestors: [
        'Parkway Venture Capital',
      ],
      caveat: {
        text: 'Figure says the Series C exceeded $1B; it gives no exact amount.',
        sourceUrls: [
          'https://www.figure.ai/news/series-c',
        ],
      },
    },
    status: 'private',
    deployments: [
      'BMW manufacturing partnership (announced Jan 2024)',
      '~740 robots operating internally as of Jun 2026',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.figure.ai/news/series-c',
        title: 'Figure Exceeds $1B in Series C Funding at $39B Post-Money Valuation',
        asOf: '2026-08-18',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Figure_AI',
        title: 'Figure AI - Wikipedia',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.thedailystar.net/news/tech-startup/news/figure-ai-now-employs-more-robots-humans-founder-says-4205101',
        title: 'Figure AI now employs more robots than humans',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: '1x-technologies',
    name: '1X Technologies',
    aka: [
      '1X',
      'Halodi Robotics',
    ],
    website: 'https://www.1x.tech',
    logo: '1x-technologies-logo',
    hq: {
      city: 'Palo Alto',
      country: 'US',
    },
    founded: 2014,
    segment: 'humanoids',
    subSegment: 'home-humanoids',
    description: 'Builds NEO, a bipedal humanoid robot for chores at home, on pre-order at $20,000 for early adopters.',
    approach: [
      'home-humanoid',
      'passive-stability',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series B',
      amountUsd: 100000000,
      date: '2024-01-11',
      valuationUsd: null,
      leadInvestors: [
        'EQT Ventures',
      ],
    },
    status: 'private',
    deployments: [
      'NEO home robot pre-orders (opened Oct 2025)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://en.wikipedia.org/wiki/1X_Technologies',
        title: '1X Technologies (funding history: $23.5M A2 led OpenAI Startup Fund 2023; $100M Series B led EQT Ventures 2024-01; Sept 2025 reported *seeking* $1B, not closed)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.1x.tech/discover/1x-secures-100m-in-series-b-funding',
        title: '1X Secures $100M in Series B Funding',
        asOf: '2026-08-06',
      },
      {
        url: 'https://techstartups.com/2025/09/24/norways-1x-raising-1b-at-10b-valuation/',
        title: 'Norway\'s 1X raising $1B at $10B valuation',
        asOf: '2026-08-06',
      },
      {
        url: 'https://humanoidroboticstechnology.com/industry-news/1x-announces-strategic-partnership-with-eqt/',
        title: '1X Announces Strategic Partnership with EQT (up to 10,000 humanoids across EQT portfolio companies, 2026-2030)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'medium',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'agility-robotics',
    name: 'Agility Robotics',
    aka: [],
    website: 'https://www.agilityrobotics.com',
    logo: 'agility-robotics-logo',
    hq: {
      city: 'Salem',
      country: 'US',
    },
    founded: 2015,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds Digit, a bipedal robot working in manufacturing, distribution and logistics; going public through a merger with the SPAC Churchill Capital Corp XI.',
    approach: [
      'bipedal-locomotion',
      'warehouse-automation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'SPAC',
      amountUsd: null,
      date: '2026-06-24',
      valuationUsd: 2500000000,
      leadInvestors: [
        'Churchill Capital Corp XI',
      ],
    },
    status: 'private',
    deployments: [
      'GXO Logistics',
      'Schaeffler',
      'Toyota Motor Manufacturing Canada',
      'Mercado Libre',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.agilityrobotics.com/content/agility-robotics-to-go-public-through-merger-with-churchill-capital-corp-xi',
        title: 'Agility Robotics to Go Public Through Merger with Churchill Capital Corp XI (first-party; $2.5B; ticker AGLT)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://techcrunch.com/2026/06/24/agility-robotics-plans-to-go-public-via-spac-in-a-2-5b-deal/',
        title: 'Agility Robotics plans to go public via SPAC',
        asOf: '2026-08-06',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Agility Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'apptronik',
    name: 'Apptronik',
    aka: [],
    website: 'https://apptronik.com',
    logo: 'apptronik-logo',
    hq: {
      city: 'Austin',
      country: 'US',
    },
    founded: 2016,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds Apollo humanoid robots for manufacturing, warehouses and retail, and is working with Google DeepMind on a next generation powered by Gemini Robotics.',
    approach: [
      'humanoid',
      'gemini-robotics-integration',
      'data-collection-at-scale',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series A extension',
      amountUsd: 520000000,
      date: '2026-02-11',
      valuationUsd: 5000000000,
      leadInvestors: [
        'B Capital',
        'Google',
      ],
    },
    status: 'private',
    deployments: [
      'Mercedes-Benz',
      'GXO Logistics',
      'Jabil',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
        title: 'Apptronik raises $520 million at $5 billion valuation',
        asOf: '2026-08-18',
      },
      {
        url: 'https://apptronik.com/news-collection/apptronik-closes-over-935-million-series-a',
        title: 'Apptronik Closes Over $935 Million Series A',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Apptronik and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'tesla-optimus',
    name: 'Tesla (Optimus)',
    aka: [
      'Optimus',
      'Tesla Bot',
    ],
    website: 'https://www.tesla.com',
    logo: 'tesla-logo',
    hq: {
      city: 'Austin',
      country: 'US',
    },
    founded: 2003,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Develops the Optimus humanoid robot, first for simple factory tasks and later for everyday tasks in and outside the home.',
    approach: [
      'full-stack',
      'in-house-actuators',
      'end-to-end-neural',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [
      'Production to start at Fremont in late July or August 2026',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
        title: 'Tesla pushes Optimus V3 reveal later this year',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Tesla,_Inc.',
        title: 'Tesla, Inc. - Wikipedia',
        asOf: '2026-10-19',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Optimus_(robot)',
        title: 'Optimus (robot) - Wikipedia',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'medium',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources (its website returned no readable body).',
      },
      'totalRaisedUsd': {
        state: 'not-applicable',
        basis: 'Tesla\'s humanoid programme, funded by Tesla: it has no venture total of its own.',
      },
      'round.type': {
        state: 'not-applicable',
        basis: 'Tesla\'s humanoid programme, funded by Tesla: it raises no rounds of its own.',
      },
      'round.amountUsd': {
        state: 'not-applicable',
        basis: 'Tesla\'s humanoid programme, funded by Tesla: it raises no rounds of its own.',
      },
      'round.date': {
        state: 'not-applicable',
        basis: 'Tesla\'s humanoid programme, funded by Tesla: it raises no rounds of its own.',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'Tesla\'s humanoid programme, funded by Tesla: it raises no rounds of its own.',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'Tesla\'s humanoid programme, funded by Tesla: it raises no rounds of its own.',
      },
    },
  },
  {
    id: 'boston-dynamics',
    name: 'Boston Dynamics',
    aka: [],
    website: 'https://bostondynamics.com',
    logo: 'boston-dynamics-logo',
    hq: {
      city: 'Waltham',
      country: 'US',
    },
    founded: 1992,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds the fully electric Atlas humanoid for industrial work, with first deployments at Hyundai and Google DeepMind; a Hyundai Motor Group subsidiary.',
    approach: [
      'electric-atlas',
      'whole-body-control',
      'deepmind-partnership',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: null,
      date: '2021-06-21',
      valuationUsd: 1100000000,
      leadInvestors: [
        'Hyundai Motor Group',
      ],
      sourceUrl: 'https://bostondynamics.com/news/hyundai-motor-group-completes-acquisition-of-boston-dynamics-from-softbank/',
    },
    status: 'acquired',
    deployments: [
      'Hyundai Motor Group Metaplant America, Savannah (first Atlas site, from 2028)',
      'Hyundai plans more than 25,000 Atlas robots across Hyundai and Kia plants',
      'Atlas product unveiled Jan 2026; all 2026 deployments committed to Hyundai and Google DeepMind',
      'Hyundai preparing tens of thousands of robots; new US robotics factory planned at 30,000 robots/yr',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
        title: 'Boston Dynamics unveils product Atlas at CES Jan 2026; Hyundai majority shareholder; 2026 fleets committed to Hyundai and Google DeepMind',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.techtimes.com/articles/317005/20260522/hyundai-commits-25000-atlas-robots-own-factories.htm',
        title: 'Hyundai Commits 25,000 Atlas Robots to Own Factories',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Boston_Dynamics',
        title: 'Boston Dynamics - Wikipedia',
        asOf: '2026-10-19',
      },
      {
        url: 'https://bostondynamics.com/news/hyundai-motor-group-completes-acquisition-of-boston-dynamics-from-softbank/',
        title: 'Hyundai Motor Group Completes Acquisition of Boston Dynamics from SoftBank',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Boston Dynamics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'unitree-robotics',
    name: 'Unitree Robotics',
    aka: [
      'Yushu Technology',
    ],
    website: 'https://www.unitree.com',
    logo: 'unitree-logo',
    hq: {
      city: 'Hangzhou',
      country: 'CN',
    },
    founded: 2016,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds G1/H1 humanoids and quadruped robots; 2025 humanoid shipment volume not verified from an inspected Unitree company body; priced its Shanghai STAR Market IPO in Aug 2026 at a $9.04B valuation.',
    approach: [
      'vertical-integration',
      'self-developed-components',
      'cost-leadership',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'IPO',
      amountUsd: 904000000,
      date: '2026-08-06',
      valuationUsd: 9040000000,
      leadInvestors: [],
      sourceUrl: 'https://www.cnbc.com/2026/08/06/chinese-humanoid-robot-maker-unitree-prices-ipo-at-9-billion-valuation.html',
    },
    status: 'public',
    deployments: [
      '2025 humanoid shipments, cumulative quadruped shipments, and global sales-share rank not verified from an inspected Unitree company body',
    ],
    openSource: [
      'UnifoLM-VLA-0 model',
      'G1 and Z1 manipulation datasets',
      'unitree_IL_lerobot',
    ],
    sources: [
      {
        url: 'https://restofworld.org/2026/unitree-china-humanoid-robot-shanghai-ipo/',
        title: 'China robot maker Unitree files for $610 million Shanghai IPO',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.cnbc.com/2026/08/06/chinese-humanoid-robot-maker-unitree-prices-ipo-at-9-billion-valuation.html',
        title: 'Chinese humanoid robot maker Unitree prices IPO at $9 billion valuation',
        asOf: '2026-08-18',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Unitree_Robotics',
        title: 'Unitree Robotics - Wikipedia',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.unitree.com/opensource',
        title: 'Official Open Source - Unitree Robotics',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'medium',
    absent: {
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'ubtech-robotics',
    name: 'UBTECH Robotics',
    aka: [
      'UBTech',
    ],
    website: 'https://www.ubtrobot.com',
    logo: 'ubtech-logo',
    hq: {
      city: 'Shenzhen',
      country: 'CN',
    },
    founded: 2012,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds Walker S2 industrial humanoid robots; began mass production and delivery in November 2025 and rolled its 1,000th Walker S2 off the line in December 2025.',
    approach: [
      'industrial-humanoid',
      'mass-production',
      'battery-swapping',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Share placement',
      amountUsd: 399600000,
      date: '2025-11-25',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://finance.yahoo.com/news/chinas-ubtech-robotics-eyes-us-093000717.html',
    },
    status: 'public',
    deployments: [
      'Airbus manufacturing deal',
      'Border crossings in Guangxi, near Vietnam ($37M contract)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.yahoo.com/tech/future-made-china-ubtech-robotics-093000541.html',
        title: 'UBTech Robotics deploys first humanoid "team" in an EV factory (dozens of robots, March 2025)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.chinadailyhk.com/hk/article/369019',
        title: 'UBTech makes HK trading debut amid gloomy market (China Daily HK; 2023-12-29)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.bastillepost.com/global/article/5377164-ubtech-humanoid-robot-walker-s2-begins-mass-production-and-delivery',
        title: 'UBTECH Humanoid Robot Walker S2 Begins Mass Production and Delivery (Bastille Post, PRN wire, 2025-11-17)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://kelo.com/2026/01/21/ubtech-agrees-airbus-deal-to-expand-robot-use-in-aviation-manufacturing/',
        title: 'UBTech agrees Airbus deal',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/UBtech_Robotics',
        title: 'UBtech Robotics - Wikipedia',
        asOf: '2026-10-19',
      },
      {
        url: 'https://www.globaltimes.cn/page/202512/1351863.shtml',
        title: '1,000th industrial humanoid robot rolls off production line at UBTECH in Liuzhou (Global Times, press release, 2025-12-30)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://interestingengineering.com/innovation/ubtech-secures-us37-million-deal',
        title: 'China to deploy battery-swapping humanoid robots for patrols along Vietnam border (Interesting Engineering)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://finance.yahoo.com/news/chinas-ubtech-robotics-eyes-us-093000717.html',
        title: 'China\'s UBTech Robotics eyes US$400 million in Hong Kong share placement (South China Morning Post, 2025-11-25)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://www.ubtrobot.com/en/announce',
        title: 'Latest Announcements (UBTECH Robotics; the placing of new H shares of 25 November 2025, completed on 2 December 2025)',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'A placement of new shares by a listed company: it is priced per share against the market price and sets no valuation of its own.',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'A placement of new shares by a listed company, sold to professional investors through placing agents: it has no lead investor.',
      },
    },
  },
  {
    id: 'fourier-intelligence',
    name: 'Fourier',
    aka: [
      'Fourier Intelligence',
    ],
    website: 'https://www.fftai.com',
    logo: 'fourier-intelligence-logo',
    hq: {
      city: 'Shanghai',
      country: 'CN',
    },
    founded: 2015,
    segment: 'humanoids',
    subSegment: 'care-companion-humanoids',
    description: 'Began in rehabilitation robotics, including exoskeletons, and now builds the GR series of humanoid robots; it showed its GR-3 care robot at CES 2026.',
    approach: [
      'rehabilitation-heritage',
      'vision-only-navigation',
      'care-companion',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series E',
      amountUsd: null,
      date: '2025-01-07',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.sixthtone.com/news/1016947',
      caveat: {
        text: 'Fourier\'s Series E was reported as nearly 800 million yuan, about $109M; no exact amount is given.',
        sourceUrls: [
          'https://www.sixthtone.com/news/1016947',
          'https://humanoidroboticstechnology.com/articles/humanoid-funding-rounds-in-2025/',
        ],
      },
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/fourier-intelligence-raises-62m-healthcare-robotics/',
        title: 'Fourier Intelligence raises $62M (led by SoftBank Vision Fund 2, with Prosperity7 and Yuanjing Vision Plus Capital)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://interestingengineering.com/ai-robotics/fouriers-gr-3-humanoid-at-ces-2026',
        title: 'Fourier\'s GR-3 humanoid at CES 2026',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Fourier_Intelligence',
        title: 'Fourier (company) - Wikipedia',
        asOf: '2026-10-19',
      },
      {
        url: 'https://www.sixthtone.com/news/1016947',
        title: 'Humanoid Robots Are Poised to March Into the Real World (Sixth Tone, 2025-04-11)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://humanoidroboticstechnology.com/articles/humanoid-funding-rounds-in-2025/',
        title: 'Humanoid Funding Rounds in 2025 (Humanoid Robotics Technology, 2025-07-04)',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'medium',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources (its website returned no readable body).',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'galbot',
    name: 'Galbot',
    aka: [
      'Galaxy General Robot',
    ],
    website: 'https://www.galbot.com',
    logo: 'galbot-logo',
    hq: {
      city: 'Beijing',
      country: 'CN',
    },
    founded: 2023,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Develops embodied AI models and the G1 and S1 humanoid robots; the S1 works on CATL\'s battery lines and the G1 runs its Galbot Store shops in over 30 Chinese cities.',
    approach: [
      'embodied-multimodal-large-model',
      'three-layer-architecture',
    ],
    totalRaisedUsd: 800000000,
    latestRound: {
      type: null,
      amountUsd: null,
      date: '2025-12-19',
      valuationUsd: 3000000000,
      leadInvestors: [],
      sourceUrl: 'https://finance.yahoo.com/news/galbot-secures-over-300-million-190800748.html',
      caveat: {
        text: 'Galbot says the round exceeded $300 million; it gives no exact amount.',
        sourceUrls: [
          'https://finance.yahoo.com/news/galbot-secures-over-300-million-190800748.html',
          'https://www.therobotreport.com/galbot-brings-in-300m-to-scale-mobile-manipulator-deployments/',
        ],
      },
    },
    status: 'private',
    deployments: [
      'CATL battery production line',
      'Manufacturing partners Bosch, Toyota and Hyundai',
      'Galbot Store autonomous retail shops in over 30 cities',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.theaiinsider.tech/2025/12/20/galbot-secures-over-300-million-in-new-funding/',
        title: 'Galbot Secures Over $300M in New Funding, $3B Valuation (The AI Insider, 2025-12-20)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://finance.yahoo.com/news/galbot-secures-over-300-million-190800748.html',
        title: 'Galbot Secures Over $300 Million in New Funding',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.catl.com/en/news/6881.html',
        title: 'First Heavy-Duty Humanoid Robot Powered by CATL Batteries Goes Global (CATL first-party, 2026-06-24)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/galbot-brings-in-300m-to-scale-mobile-manipulator-deployments/',
        title: 'Galbot brings in $300M to scale mobile manipulator deployments (The Robot Report, 2025-12-23)',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'agibot',
    name: 'AgiBot',
    aka: [
      'Zhiyuan Robotics',
    ],
    website: 'https://www.agibot.com',
    logo: 'agibot-logo',
    hq: {
      city: 'Shanghai',
      country: 'CN',
    },
    founded: 2023,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds the Yuanzheng (A2) and Lingxi humanoid robot series; agreed in July 2025 to take control of listed Swancor Advanced Materials, and Omdia ranked it No.1 worldwide in 2025 humanoid shipments.',
    approach: [
      'embodied-ai',
      'mass-production',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Strategic',
      amountUsd: null,
      date: '2025-08-01',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://finance.yahoo.com/news/chinese-robot-maker-agibot-completes-104808083.html',
    },
    status: 'private',
    deployments: [
      'Fulin Precision Engineering: nearly 100 Yuanzheng robots for its factories',
      'ASD: 100 X2 humanoid robots across 100 retail stores',
    ],
    openSource: [
      'AgiBot World dataset',
      'AgiBot X1 (hardware design, training and inference code)',
      'AimRT framework',
    ],
    sources: [
      {
        url: 'https://www.prnewswire.com/news/AgiBot/',
        title: 'AgiBot news and press releases (PR Newswire newsroom)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://finance.yahoo.com/news/chinese-robot-maker-agibot-completes-104808083.html',
        title: 'Chinese robot maker AGIBot completes new round of financing (Reuters; strategic round with LG Electronics and Mirae Asset, size undisclosed)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://en.tmtpost.com/post/7620691',
        title: 'AgiBot Robotics to Take Over Swancor in $290 Million Deal (TMTPost; 2.1B yuan for at least 63.62%, \'not a backdoor listing\')',
        asOf: '2026-08-18',
      },
      {
        url: 'https://futurism.com/robots-and-machines/robot-agibot-humanoid-walking',
        title: 'AgiBot A2 robot walks 66 miles from Suzhou to Shanghai, Guinness world record (Futurism)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://finance.yahoo.com/news/exclusive-chinese-robot-maker-agibot-092020928.html',
        title: 'AgiBot plans Hong Kong IPO next year (Reuters; Shanghai-based, Tencent and HongShan backers, PitchBook $2.07B valuation)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.prnewswire.com/news-releases/omdia-ranks-agibot-no1-worldwide-in-humanoid-robot-shipments-in-2025-302656788.html',
        title: 'Omdia Ranks AGIBOT No.1 Worldwide in Humanoid Robot Shipments in 2025 (first-party)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://en.wikipedia.org/wiki/AgiBot',
        title: 'AgiBot - Wikipedia',
        asOf: '2026-10-19',
      },
      {
        url: 'https://github.com/AgibotTech',
        title: 'AgibotTech on GitHub (the company\'s open-source organisation)',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'sanctuary-ai',
    name: 'Sanctuary AI',
    aka: [
      'Sanctuary Cognitive Systems Corporation',
    ],
    website: 'https://www.sanctuary.ai',
    logo: 'sanctuary-ai-logo',
    hq: {
      city: 'Vancouver',
      country: 'CA',
    },
    founded: 2018,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Built the Phoenix general-purpose humanoid robots; since June 2026 it deploys its Physical AI software on existing industrial robots while it develops hydraulic robotic hands.',
    approach: [
      'ai-software-pivot',
      'hydraulic-hands',
      'cognitive-ai',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: '2026-05-26',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.zeon.co.jp/en/news/assets/pdf/260526.pdf',
    },
    status: 'private',
    deployments: [
      'Global Tier 1 automotive supplier: a paid deployment, its first commercial purchase order (2026)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.sanctuary.ai/about-us',
        title: 'About Sanctuary AI',
        asOf: '2026-10-19',
      },
      {
        url: 'https://www.sanctuary.ai/milestones',
        title: 'Milestones (Sanctuary AI)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://sanctuary.ai/news/sanctuary-ai-expands-physical-ai-strategy-to-industrial-robotics-demonstrating-production-ready-ai-performance/',
        title: 'Sanctuary AI Expands Physical AI Strategy to Industrial Robotics (company release, 2026-06-17)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://sanctuary.ai/news/sanctuary-ai-unveils-the-next-generation-of-ai-robotics/',
        title: 'Sanctuary AI Unveils the Next Generation of AI Robotics (company release on Phoenix generation 7, 2024-04-26)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://sanctuary.ai/news/sanctuary-ai-announces-strategic-financing-from-bdc-capital-and-inbc/',
        title: 'Sanctuary AI Announces Strategic Financing From BDC Capital and InBC (company release, 2024-07-03)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://www.zeon.co.jp/en/news/assets/pdf/260526.pdf',
        title: 'Zeon invests in Sanctuary AI and partners to advance specialized materials for dexterous robotics (Zeon press release, 2026-05-26)',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'medium',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'neura-robotics',
    name: 'NEURA Robotics',
    aka: [
      'Han\'s Robot Germany GmbH',
    ],
    website: 'https://www.neura-robotics.com',
    logo: 'neura-robotics-logo',
    hq: {
      city: 'Metzingen',
      country: 'DE',
    },
    founded: 2019,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds the 4NE1 humanoid and the MAiRA and LARA robot arms; its Neuraverse platform lets its robots share learned skills.',
    approach: [
      'cognitive-robotics',
      'full-stack',
      'edge-ai',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: null,
      date: '2026-06-10',
      valuationUsd: 7000000000,
      leadInvestors: [
        'Tether',
      ],
      sourceUrl: 'https://neura-robotics.com/record-series-c/',
      caveat: {
        text: 'NEURA gives its Series C as up to $1.4 billion; no closed amount is given.',
        sourceUrls: [
          'https://neura-robotics.com/record-series-c/',
          'https://www.cnbc.com/2026/06/10/neura-robotics-funding-ai-humanoid-robots.html',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Schaeffler: plans to put a mid-four-digit number of NEURA humanoids in its plants by 2035',
      'Kawasaki Robotics CL Series cobots, built on NEURA\'s robot platform (2023)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.coindesk.com/business/2026/06/11/tether-leads-usd1-4-billion-funding-round-in-german-robotics-company-neura/',
        title: 'Tether leads $1.4 billion round in NEURA Robotics (CoinDesk)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://neura-robotics.com/record-series-c/',
        title: 'NEURA Robotics Announces Record Series C of up to $1.4B (first-party; amount kept as a bound, not promoted)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.cnbc.com/2026/06/10/neura-robotics-funding-ai-humanoid-robots.html',
        title: 'NEURA Robotics raises up to $1.4B from Nvidia, Amazon',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Neura_Robotics',
        title: 'Neura Robotics - Wikipedia',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'humanoid-uk',
    name: 'Humanoid',
    aka: [
      'SKL Robotics Ltd',
    ],
    website: 'https://thehumanoid.ai',
    logo: 'humanoid-uk-logo',
    hq: {
      city: 'London',
      country: 'UK',
    },
    founded: 2024,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds the HMND 01 Alpha, a wheeled bimanual industrial humanoid run by its own KinetIQ AI; Schaeffler signed to deploy thousands of its robots in manufacturing.',
    approach: [
      'industrial-humanoid',
    ],
    totalRaisedUsd: 270000000,
    latestRound: {
      type: 'Series A',
      amountUsd: 152000000,
      date: '2026-07-21',
      valuationUsd: 1350000000,
      leadInvestors: [
        'Prime Movers Lab',
      ],
      sourceUrl: 'https://thehumanoid.ai/humanoid-raises-152-million-at-1-35-billion-post-money-valuation',
    },
    status: 'private',
    deployments: [
      'Schaeffler: an agreement to deploy thousands of humanoid robots in its plants',
      'Siemens: humanoids in industrial operations, with NVIDIA',
      'SAP and Martur Fompak: an automotive manufacturing logistics proof of concept',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://thehumanoid.ai/humanoid-raises-152-million-at-1-35-billion-post-money-valuation',
        title: 'Humanoid Raises $152 Million at $1.35 Billion Post-Money Valuation (first-party)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/uk-based-humanoid-secures-152m-in-series-a-funding/',
        title: 'U.K.-based Humanoid secures $152M in Series A funding (The Robot Report)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
    },
  },
  {
    id: 'spirit-ai',
    name: 'Spirit AI',
    aka: [
      '千寻智能',
    ],
    website: 'https://www.spirit-ai.com',
    logo: 'spirit-ai-logo',
    hq: {
      city: 'Beijing',
      country: 'CN',
    },
    founded: 2024,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds a \'universal brain\' for robots using embodied AI foundation models.',
    approach: [
      'universal-brain',
      'embodied-ai',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series A+',
      amountUsd: 222000000,
      date: '2026-06-03',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://thenextweb.com/news/spirit-ai-beats-nvidia-roboarena-physical-ai',
      caveat: {
        text: 'This A+ round is Spirit AI\'s fourth in three months. For the February round, Crunchbase News gives a $290 million Series A, followed by a $145 million extension in April, while the company\'s release gives $280 million.',
        sourceUrls: [
          'https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/',
          'https://www.prnewswire.com/news-releases/spirit-ai-lands-280m-to-scale-embodied-ai-through-dirty-data-302697085.html',
          'https://news.pedaily.cn/202606/564786.shtml',
        ],
      },
    },
    status: 'private',
    deployments: [
      'CATL: Moz robots on its battery production lines',
      'JD MALL stores: its Moz robot',
    ],
    openSource: [
      'Spirit v1.5 VLA model (weights and evaluation code)',
    ],
    sources: [
      {
        url: 'https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/',
        title: 'Embodied AI Fuels Record Robotics Funding In China As IPO Momentum Builds (Crunchbase News, 2026-05-20; the February Series A and its April extension)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.prnewswire.com/news-releases/spirit-ai-lands-280m-to-scale-embodied-ai-through-dirty-data-302697085.html',
        title: 'Spirit AI Lands $280M to Scale Embodied AI Through "Dirty Data" (company release)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://news.pedaily.cn/202606/564786.shtml',
        title: '千寻智能完成15亿元A+轮融资 (PEdaily; A+ round announced 2026-06-03)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://thenextweb.com/news/spirit-ai-beats-nvidia-roboarena-physical-ai',
        title: 'A Chinese startup just dethroned Nvidia on the benchmark Nvidia helped build (TNW, 2026-06-05; the 1.5B yuan / $222M round announced 3 June)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://www.prnewswire.com/news-releases/robochallenges-top-ranked-embodied-ai-model-goes-open-source-challenging-clean-data-collection-paradigm-302658247.html',
        title: 'RoboChallenge\'s Top-Ranked Embodied AI Model Goes Open Source (company release, 2026-01-12)',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'medium',
    absent: {
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'galaxea-ai',
    name: 'Galaxea AI',
    aka: [
      '星海图',
    ],
    website: 'https://www.galaxea-ai.com',
    logo: 'galaxea-ai-logo',
    hq: {
      city: 'Beijing',
      country: 'CN',
    },
    founded: 2023,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Develops Vision-Language-Action models, including G0 and G0 Plus, and the R1 series of robots for manufacturing, logistics and commercial services.',
    approach: [
      'embodied-intelligence',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series B+',
      amountUsd: 290000000,
      date: '2026-04-02',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.cxodigitalpulse.com/chinas-galaxea-ai-raises-290-4-million-in-series-b-round-to-accelerate-robotics-push/',
      caveat: {
        text: 'The AI Insider, citing Yicai Global, puts the valuation at roughly $29 billion, while The Paper reports more than 20 billion yuan; the card gives no valuation.',
        sourceUrls: [
          'https://theaiinsider.tech/2026/04/04/chinese-robotics-startup-galaxea-ai-raises-290m-usd-in-series-b-funding-valued-at-29b-usd/',
          'https://m.thepaper.cn/newsDetail_forward_32878036',
        ],
      },
    },
    status: 'private',
    deployments: [],
    openSource: [
      'GalaxeaVLA (open-source VLA models)',
      'GalaxeaDP diffusion policy',
    ],
    sources: [
      {
        url: 'https://www.cxodigitalpulse.com/chinas-galaxea-ai-raises-290-4-million-in-series-b-round-to-accelerate-robotics-push/',
        title: 'China\'s Galaxea AI Raises $290.4 Million in Series B+ Round (CXO Digitalpulse)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://theaiinsider.tech/2026/04/04/chinese-robotics-startup-galaxea-ai-raises-290m-usd-in-series-b-funding-valued-at-29b-usd/',
        title: 'Chinese Robotics Startup Galaxea AI Raises $290M USD in Series B+ Funding (The AI Insider, citing Yicai Global)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://m.thepaper.cn/newsDetail_forward_32878036',
        title: '星海图完成近20亿元B+轮融资，估值超200亿元 (The Paper, 2026-04-02)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://github.com/OpenGalaxea',
        title: 'Galaxea (OpenGalaxea) on GitHub',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'medium',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'engineai',
    name: 'EngineAI',
    aka: [
      'Shenzhen EngineAI Robotics Technology Co., Ltd.',
    ],
    website: 'https://www.engineai.com.cn',
    logo: 'engineai-logo',
    hq: {
      city: 'Shenzhen',
      country: 'CN',
    },
    founded: 2023,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds humanoid and quadruped robots for traffic management, security patrols, retail service and industrial work; it has filed confidentially for a Hong Kong IPO.',
    approach: [
      'humanoid',
      'quadruped',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series B',
      amountUsd: 200000000,
      date: '2026-04-09',
      valuationUsd: 1500000000,
      leadInvestors: [
        'Henan CICC Huirong Fund Management',
        'Luxshare-ICT',
      ],
      sourceUrl: 'https://cryptobriefing.com/engineai-hong-kong-ipo-filing/',
      caveat: {
        text: 'Blue Whale Finance reported on 6 May 2026, citing a person familiar with the deal, that a Series B+ round had closed; its size and investors were not published.',
        sourceUrls: [
          'https://www.lanjinger.com/d/1778055085697120105',
        ],
      },
    },
    status: 'private',
    deployments: [],
    openSource: [
      'PM01 humanoid (open-source)',
    ],
    sources: [
      {
        url: 'https://www.lanjinger.com/d/1778055085697120105',
        title: '蓝鲸独家｜众擎机器人完成B+轮融资 (Blue Whale Finance; Series B closed 2026-04-09, co-led by Henan Huirong + Luxshare, B+ in May)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://cryptobriefing.com/engineai-hong-kong-ipo-filing/',
        title: 'EngineAI files confidentially for Hong Kong IPO (Crypto Briefing; $200M Series B at $1.5B)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://en.wikipedia.org/wiki/EngineAI',
        title: 'EngineAI - Wikipedia',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'medium',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'robot-era',
    name: 'RobotEra',
    aka: [
      '星动纪元',
    ],
    website: 'https://www.robotera.com',
    logo: 'robot-era-logo',
    hq: {
      city: 'Beijing',
      country: 'CN',
    },
    founded: null,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Develops humanoid robots and embodied intelligence systems.',
    approach: [
      'embodied-intelligence',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [
        'SF Group',
      ],
      sourceUrl: 'https://www.frontier-enterprise.com/robotera-raises-over-us200-million-in-latest-funding-round/',
      caveat: {
        text: 'RobotEra says the round raised more than $200 million; it gives no exact amount or round name.',
        sourceUrls: [
          'https://www.frontier-enterprise.com/robotera-raises-over-us200-million-in-latest-funding-round/',
          'https://pulse2.com/robotera-raises-over-200-million-to-scale-humanoid-robotics-commercialization/',
        ],
      },
    },
    status: 'private',
    deployments: [
      'China Post and SF Group: robots in more than ten logistics centres',
      'Boston Dynamics, NVIDIA and Apple: use its robot hardware (company statement)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://pulse2.com/robotera-raises-over-200-million-to-scale-humanoid-robotics-commercialization/',
        title: 'ROBOTERA Raises Over $200 Million To Scale Humanoid Robotics Commercialization (Pulse 2.0; round led by SF Group)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.frontier-enterprise.com/robotera-raises-over-us200-million-in-latest-funding-round/',
        title: 'RobotEra raises over US$200M in latest funding round (Frontier Enterprise; led by SF Group after RMB 1B March round)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'medium',
    absent: {
      'founded': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources (its website returned no readable body).',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'tars-robotics',
    name: 'TARS Robotics',
    aka: [
      'TARS',
    ],
    website: null,
    logo: 'tars-robotics-logo',
    hq: {
      city: 'Shanghai',
      country: 'CN',
    },
    founded: 2025,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Embodied AI company specializing in humanoid robots for ultra-fine manipulation tasks.',
    approach: [
      'embodied-ai',
      'ultra-fine-manipulation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Pre-A',
      amountUsd: 455000000,
      date: '2026-04-16',
      valuationUsd: null,
      leadInvestors: [
        'Hillhouse Ventures',
        'HSG',
        'Meituan Strategic Investment',
      ],
      sourceUrl: 'https://pandaily.com/tars-raises-455-m-pre-a-round-setting-record-in-china-s-embodied-ai-sector',
      caveat: {
        text: 'Crunchbase News reports this round as a $513 million seed round at a $1.9 billion valuation; the company\'s announcement, as Pandaily and Xinhua report it, gives $455 million in a Pre-A round and no valuation.',
        sourceUrls: [
          'https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/',
          'https://pandaily.com/tars-raises-455-m-pre-a-round-setting-record-in-china-s-embodied-ai-sector',
          'https://www.news.cn/tech/20260417/aa7c5116da7648fc99470a6b4a56ef35/c.html',
        ],
      },
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/',
        title: 'Embodied AI Fuels Record Robotics Funding In China As IPO Momentum Builds (Crunchbase News, 2026-05-20; reports the round as a $513M seed)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://pandaily.com/tars-raises-455-m-pre-a-round-setting-record-in-china-s-embodied-ai-sector',
        title: 'TARS Raises $455M Pre-A Round, Setting Record in China\'s Embodied AI Sector (Pandaily; announced 2026-04-16)',
        asOf: '2026-08-25',
      },
      {
        url: 'https://www.prnewswire.com/news-releases/tars-demonstrates-a-robot-that-can-perform-hand-embroidery-breaking-through-a-key-automation-bottleneck-in-flexible-manufacturing-302648045.html',
        title: 'TARS Demonstrates a Robot That Can Perform Hand Embroidery (company release, 2025-12-22)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://www.news.cn/tech/20260417/aa7c5116da7648fc99470a6b4a56ef35/c.html',
        title: '高瓴红杉美团联合领投 它石智航完成4.55亿美金创纪录Pre-A轮融资 (Xinhua, 2026-04-17)',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'medium',
    absent: {
      'website': {
        state: 'not-disclosed',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources (its website returned no readable body).',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'x-square-robot',
    name: 'X Square Robot',
    aka: [
      'X Square',
      '自变量机器人',
    ],
    website: 'https://x2robot.com',
    logo: 'x-square-robot-logo',
    hq: {
      city: 'Shenzhen',
      country: 'CN',
    },
    founded: 2023,
    segment: 'humanoids',
    subSegment: 'home-humanoids',
    description: 'Develops the WALL embodied AI foundation models and QUANTA robots for household, industrial and logistics work; it runs a home-cleaning service with 58.com in Shenzhen and Beijing.',
    approach: [
      'embodied-intelligence',
      'large-operating-model',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: null,
      date: '2026-06-30',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.therobotreport.com/x-square-robot-brings-valuation-2-8b-four-consecutive-funding-rounds/',
      caveat: {
        text: 'X Square says the four rounds that ended with the Series C value it at more than $2.8 billion; it gives no amount for the round and no exact valuation.',
        sourceUrls: [
          'https://www.therobotreport.com/x-square-robot-brings-valuation-2-8b-four-consecutive-funding-rounds/',
          'https://en.wikipedia.org/wiki/X_Square_Robot',
        ],
      },
    },
    status: 'private',
    deployments: [
      '58.com: AI-powered home-cleaning service in Shenzhen and Beijing',
      'X Family Member Program: robots live with users\' families for up to one month',
    ],
    openSource: [
      'WALL-OSS',
      'WALL-OSS-0.5 and WALL-WM',
      'XRZero-G0 and the G0-Dataset',
    ],
    sources: [
      {
        url: 'https://www.cnbc.com/2025/09/08/alibaba-leads-100-million-investment-in-chinese-humanoid-robot-startup.html',
        title: 'Alibaba leads ~$100M round in X Square Robot (CNBC; eighth round since founding)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://news.crunchbase.com/robotics/embodied-ai-fuels-record-funding-china-ipo-momentum-builds/',
        title: 'Embodied AI Fuels Record Robotics Funding In China',
        asOf: '2026-08-18',
      },
      {
        url: 'https://kr-asia.com/xiaomi-hongshan-back-x-square-robot-in-series-b-round',
        title: 'Xiaomi, HongShan back X Square Robot in Series B round (KrASIA; nearly RMB 2B / USD 292.8M, co-led)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://theaiinsider.tech/2026/04/22/x-square-robot-raises-276m-in-series-b-funding-for-household-robots/',
        title: 'X Square Robot Raises $276M in Series B Funding (The AI Insider, citing China Daily; nearly $276M led by Xiaomi arm)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/x-square-robot-brings-valuation-2-8b-four-consecutive-funding-rounds/',
        title: 'X Square Robot brings its valuation to $2.8B with four consecutive funding rounds (The Robot Report, 2026-06-30)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://en.wikipedia.org/wiki/X_Square_Robot',
        title: 'X Square Robot - Wikipedia',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'deep-robotics',
    name: 'Deep Robotics',
    aka: [
      '云深处科技',
    ],
    website: 'https://www.deeprobotics.cn',
    logo: 'deep-robotics-logo',
    hq: {
      city: 'Hangzhou',
      country: 'CN',
    },
    founded: 2017,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds Jueying and Lynx quadruped robots, used in power utility, tunnel and hazard-rescue work, and the DR01 and DR02 humanoid robots.',
    approach: [
      'quadruped-first',
      'all-weather-humanoid',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: 70000000,
      date: '2025-12-09',
      valuationUsd: null,
      leadInvestors: [
        'CMB International',
        'China Asset Management',
        'China Telecom and China Unicom funds',
      ],
      caveat: {
        text: 'Deep Robotics calls the round over 500 million yuan; the South China Morning Post reports 500 million yuan (US$70 million).',
        sourceUrls: [
          'https://finance.yahoo.com/news/chinas-deep-robotics-raises-us-093000532.html',
          'https://www.deeprobotics.cn/en',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Power utility: fully autonomous substation inspection in China',
      'Singapore Power Group: X30 inspecting its power tunnels',
      'Hazard rescue',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://finance.yahoo.com/news/chinas-deep-robotics-raises-us-093000532.html',
        title: 'China\'s Deep Robotics raises US$70 million (500M yuan Series C; SCMP via Yahoo)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.deeprobotics.cn/en',
        title: 'Deep Robotics - Global Quadruped Robot Leader',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Deep_Robotics',
        title: 'Deep Robotics - Wikipedia',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'kepler-robot',
    name: 'Kepler Robot',
    aka: [
      'Kepler Robotics',
      '上海开普勒机器人有限公司',
    ],
    website: 'https://gotokepler.com',
    logo: 'kepler-robot-logo',
    hq: {
      city: 'Shanghai',
      country: 'CN',
    },
    founded: 2023,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds full-size industrial humanoid robots, including the K2, for smart manufacturing and warehouse logistics; Kelin Electric agreed in May 2026 to take a 51% controlling stake.',
    approach: [
      'humanoid',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition (controlling stake)',
      amountUsd: null,
      date: '2026-05-19',
      valuationUsd: null,
      leadInvestors: [
        'Kelin Electric',
      ],
      sourceUrl: 'https://english.sse.com.cn/news/newsrelease/voice/c/c_20260521_10819176.shtml',
      caveat: {
        text: 'Kelin Electric will pay up to 300 million yuan (US$44.1 million) for 41.6% of Kepler; Blue Whale News works this out as a valuation of about 722 million yuan. No exact price is given.',
        sourceUrls: [
          'https://english.sse.com.cn/news/newsrelease/voice/c/c_20260521_10819176.shtml',
          'https://www.lanjinger.com/d/1779274842637520212',
        ],
      },
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://english.sse.com.cn/news/newsrelease/voice/c/c_20260521_10819176.shtml',
        title: 'YICAI: Kelin Electric to buy controlling stake in Kepler (up to USD 44.1M)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.lanjinger.com/d/1779274842637520212',
        title: 'Hangzhou Kelin takes control of Kepler Robot at a valuation of about 700 million yuan (Blue Whale News, in Chinese, May 2026)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://m.bjnews.com.cn/detail/1779279357129638.html',
        title: 'After its CEO left, Kepler Robot is sold to a listed company (Beijing News, in Chinese, 2026-05-20)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'limx-dynamics',
    name: 'LimX Dynamics',
    aka: [
      '逐际动力',
    ],
    website: 'https://www.limxdynamics.com',
    logo: 'limx-dynamics-logo',
    hq: {
      city: 'Shenzhen',
      country: 'CN',
    },
    founded: 2022,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds the Oli and Luna humanoid robots and the modular TRON robots, and open-sources robot-learning software such as its FluxVLA Engine.',
    approach: [
      'humanoid',
      'motion-control',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Pre-IPO',
      amountUsd: 200000000,
      date: '2026-07-14',
      valuationUsd: 2210000000,
      leadInvestors: [
        'IDG Capital',
        'Lens Technology',
        'Stone Venture',
      ],
      sourceUrl: 'https://eu.36kr.com/en/p/3893976502287618',
    },
    status: 'private',
    deployments: [
      'Luna humanoids delivered to customers in South Korea',
    ],
    openSource: [
      'FluxVLA Engine',
      'Isaac Lab locomotion-training code for TRON 1, TRON 2 and Oli',
      'MuJoCo simulators and the LimX SDK (limxsdk-lowlevel)',
    ],
    sources: [
      {
        url: 'https://technode.com/2026/02/03/limx-dynamics-raises-200-million-in-series-b-to-scale-humanoid-robotics/',
        title: 'LimX Dynamics raises $200 million in Series B (Feb 2026 round)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://eu.36kr.com/en/p/3893976502287618',
        title: 'LimX Dynamics $200M Pre-IPO Financing | 15B Yuan Post-Money Valuation (36Kr)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.cnbc.com/2026/07/13/chinese-humanoid-startups-ipo-limx-unitree.html',
        title: 'Chinese humanoid startups are rushing to list (CNBC, 2026-07-13)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://thenextweb.com/news/limx-dynamics-2-2-billion-humanoid-pre-ipo',
        title: 'Listing is a must: China\'s LimX raises $200m as the humanoid IPO race heats up (TNW, 2026-07-14)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.limxdynamics.com/en/about',
        title: 'About Us | LimX Dynamics Official Website',
        asOf: '2026-10-20',
      },
      {
        url: 'https://github.com/limxdynamics',
        title: 'limxdynamics (LimX Dynamics) on GitHub',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'wandercraft',
    name: 'Wandercraft',
    aka: [],
    website: 'https://www.wandercraft.eu',
    logo: 'wandercraft-logo',
    hq: {
      city: 'Paris',
      country: 'FR',
    },
    founded: 2012,
    segment: 'humanoids',
    subSegment: 'exoskeleton-mobility',
    description: 'Builds self-balancing exoskeletons, Atalante X for rehabilitation and Eve for home use, and the Calvin-40 humanoid, which works on Renault\'s Douai line; it acquired Ekso Bionics in October 2026.',
    approach: [
      'self-balancing-exoskeleton',
      'rehabilitation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series D',
      amountUsd: 75000000,
      date: '2025-06-11',
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [
      'Renault Group: Calvin-40 on the line at its Douai plant, 350 robots committed by 2027',
      'Atalante X at more than 150 clinical and research sites',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.globenewswire.com/news-release/2025/06/11/3097632/0/en/wandercraft-announces-Series-D-Round-bringing-75M-in-total-funding.html',
        title: 'Wandercraft announces Series D Round (first-party)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.wandercraft.eu/about-us',
        title: 'About us | Wandercraft',
        asOf: '2026-10-19',
      },
      {
        url: 'https://fr.wikipedia.org/wiki/Wandercraft',
        title: 'Wandercraft - Wikipédia',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Wandercraft and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'clone-robotics',
    name: 'Clone Robotics',
    aka: [],
    website: 'https://www.clonerobotics.com',
    logo: 'clone-robotics-logo',
    hq: {
      city: null,
      country: 'PL',
    },
    founded: 2021,
    segment: 'humanoids',
    subSegment: 'research-humanoids',
    description: 'Develops biomimetic, musculoskeletal androids moved by its Myofiber artificial muscles; it takes reservations for the first 279 Clone Alpha units.',
    approach: [
      'biomimetic',
      'musculoskeletal',
      'artificial-muscles',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
      caveat: {
        text: 'The Rundown (9 April 2026) mentions a reported $50M raise but gives no date, round type or source for it; no cited source states a round or a total raised, so the card gives neither.',
        sourceUrls: [
          'https://robotnews.therundown.ai/p/clone-20k-synthetic-human',
        ],
      },
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://interestingengineering.com/innovation/clone-robotics-technology-revealed',
        title: 'Technology behind ghostly water-powered humanoid robot revealed (Interesting Engineering, 2025-09-15)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.yahoo.com/news/alpha-water-powered-humanoid-robot-134132242.html',
        title: 'Alpha: Water-powered humanoid robot with synthetic organs, muscles unveiled (Interesting Engineering via Yahoo News, 2024-12-06)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.clonerobotics.com/android',
        title: 'Android - Clone (the company\'s product page)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://robotnews.therundown.ai/p/clone-20k-synthetic-human',
        title: 'Clone\'s $20K synthetic human (The Rundown Robotics, 2026-04-09)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'hq.city': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Clone Robotics and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'mentee-robotics',
    name: 'Mentee Robotics',
    aka: [
      'Mentee by Mobileye',
    ],
    website: 'https://www.menteebot.com',
    logo: 'mentee-robotics-logo',
    hq: {
      city: null,
      country: 'IL',
    },
    founded: 2022,
    segment: 'humanoids',
    subSegment: 'research-humanoids',
    description: 'Israeli humanoid robotics company co-founded by Mobileye CEO Amnon Shashua; acquired by Mobileye.',
    approach: [
      'humanoid',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: null,
      date: '2026-02-03',
      valuationUsd: 900000000,
      leadInvestors: [
        'Mobileye',
      ],
    },
    status: 'acquired',
    deployments: [
      'Customer proof-of-concept deployments expected in 2026; series production targeted for 2028',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://ir.mobileye.com/news-releases/news-release-details/mobileye-acquire-mentee-robotics-accelerate-physical-ai',
        title: 'Mobileye To Acquire Mentee Robotics to Accelerate Physical AI Leadership (first-party, 2026-01-06)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.sec.gov/Archives/edgar/data/1910139/000110465926010947/tm265388d1_8k.htm',
        title: 'Mobileye Form 8-K: acquisition completed Feb 3, 2026 for $900,000,000 ($611,914,666 cash + 26,279,824 Class A shares)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://web.archive.org/web/20250724144907/https://www.startuphub.ai/mentee-robotics-raised-17-million-for-their-humanoid-robot-menteebot/',
        title: 'Mentee Robotics Raised $17 million for their Humanoid Robot, MenteeBot (Startup Hub AI; archived capture of 2025-07-24, the live page is gone)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'hq.city': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'persona-ai',
    name: 'Persona AI',
    aka: [],
    website: 'https://persona.ai',
    logo: 'persona-ai-logo',
    hq: {
      city: 'Houston',
      country: 'US',
    },
    founded: 2024,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds industrial humanoid robots that weld, fit and fabricate in shipyards, steel shops and energy sites; its founders came from NASA, Nauticus Robotics and Figure AI.',
    approach: [
      'purpose-built-humanoid',
      'heavy-duty',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: '2026-10-02',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://prtimes.jp/main/html/rd/p/000000087.000097774.html',
    },
    status: 'private',
    deployments: [
      'HD Hyundai shipyard agreement',
      'POSCO Group: joint development and planned pilot deployments at its sites',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://theaiinsider.tech/2025/05/15/persona-ai-raises-27m-oversubscribed-pre-seed/',
        title: 'Persona AI Raises $27M Oversubscribed Pre-Seed (The AI Insider, 2025-05-15)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/persona-ai-raises-27m-develops-purpose-built-humanoid-robots/',
        title: 'Persona AI raises $27M for humanoid robots',
        asOf: '2026-08-06',
      },
      {
        url: 'https://spectrum.ieee.org/persona-ai-radford-pratt/particle-1',
        title: 'Robotics Experts Found Persona AI Startup',
        asOf: '2026-08-06',
      },
      {
        url: 'https://prtimes.jp/main/html/rd/p/000000087.000097774.html',
        title: 'Daiwa House Group Growth Fund invests in industrial humanoid maker Persona AI (Ignition Point Venture Partners release on PR Times, in Japanese, 2026-10-02)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://theaiinsider.tech/2025/12/29/posco-group-invests-3m-in-persona-ai-for-industrial-humanoid-robot-development/',
        title: 'POSCO Group Invests $3M in Persona AI for Industrial Humanoid Robot Development (The AI Insider, 2025-12-29)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Persona AI and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'rainbow-robotics',
    name: 'Rainbow Robotics',
    aka: [
      '레인보우로보틱스',
    ],
    website: 'https://www.rainbow-robotics.com',
    logo: 'rainbow-robotics-logo',
    hq: {
      city: 'Daejeon',
      country: 'KR',
    },
    founded: 2011,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds collaborative, mobile and humanoid robots and grew out of KAIST\'s HUBO lab; Samsung Electronics raised its stake to 35% in March 2025 and made it a subsidiary.',
    approach: [
      'cobot',
      'humanoid',
      'samsung-subsidiary',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition (controlling stake)',
      amountUsd: 181000000,
      date: '2024-12-31',
      valuationUsd: null,
      leadInvestors: [
        'Samsung Electronics',
      ],
    },
    status: 'public',
    deployments: [
      'Samsung Electronics: collaborative, dual-arm and autonomous mobile robots in its production and logistics operations',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://news.samsung.com/global/samsung-electronics-to-become-largest-shareholder-in-rainbow-robotics',
        title: 'Samsung To Become Largest Shareholder in Rainbow Robotics',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.techtimes.com/articles/317465/20260531/samsung-lg-robotics-investment-drives-117-revenue-surge.htm',
        title: 'Samsung LG robotics investment drives 117% revenue surge',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Rainbow_Robotics',
        title: 'Rainbow Robotics - Wikipedia',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'A purchase of shares in a listed company, which Samsung paid for per share: the deal sets no valuation of the company.',
      },
    },
  },
  {
    id: 'symbotic',
    name: 'Symbotic',
    aka: [
      'CasePick Systems',
    ],
    website: 'https://www.symbotic.com',
    logo: 'symbotic-logo',
    hq: {
      city: 'Wilmington',
      country: 'US',
    },
    founded: 2007,
    segment: 'industrial-logistics',
    subSegment: 'warehouse-automation',
    description: 'Builds AI-driven warehouse automation systems in which autonomous robots store and retrieve cases; it bought the autonomous-forklift maker Fox Robotics in 2026.',
    approach: [
      'warehouse-automation',
      'mobile-robots',
      'ai-palletization',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Public offering',
      amountUsd: null,
      date: '2025-12-04',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.globenewswire.com/news-release/2025/12/05/3200430/0/en/Symbotic-Announces-Pricing-of-Primary-and-Secondary-Offering-of-Class-A-Common-Stock.html',
      caveat: {
        text: 'Symbotic sold 6.5 million new shares at $55.00 each and a SoftBank affiliate sold 3.5 million of its own; the release gives no total for the raise.',
        sourceUrls: [
          'https://www.globenewswire.com/news-release/2025/12/05/3200430/0/en/Symbotic-Announces-Pricing-of-Primary-and-Secondary-Offering-of-Class-A-Common-Stock.html',
        ],
      },
    },
    status: 'public',
    deployments: [
      'Walmart',
      'Target',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/symbotic-acquires-autonomous-forklift-maker-fox-robotics/',
        title: 'Symbotic acquires Fox Robotics',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Symbotic',
        title: 'Symbotic - Wikipedia',
        asOf: '2026-10-19',
      },
      {
        url: 'https://www.globenewswire.com/news-release/2025/12/05/3200430/0/en/Symbotic-Announces-Pricing-of-Primary-and-Secondary-Offering-of-Class-A-Common-Stock.html',
        title: 'Symbotic Announces Pricing of Primary and Secondary Offering of Class A Common Stock (GlobeNewswire, 2025-12-04)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'A public offering by a listed company: it is priced per share against the market price and sets no valuation of its own.',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'An underwritten public offering, sold through Goldman Sachs and Citigroup as lead book-running managers: it has no lead investor.',
      },
    },
  },
  {
    id: 'dexterity',
    name: 'Dexterity',
    aka: [
      'Dexterity AI',
    ],
    website: 'https://www.dexterity.ai',
    logo: 'dexterity-logo',
    hq: {
      city: 'Redwood City',
      country: 'US',
    },
    founded: 2017,
    segment: 'industrial-logistics',
    subSegment: 'truck-loading',
    description: 'Builds AI-powered robotic systems (Mech) for truck loading and unloading in logistics and supply chain operations.',
    approach: [
      'ai-robotic-loading',
      'truck-loading',
    ],
    totalRaisedUsd: 291000000,
    latestRound: {
      type: null,
      amountUsd: 95000000,
      date: '2025-03-11',
      valuationUsd: 1650000000,
      leadInvestors: [
        'Lightspeed Venture Partners',
        'Sumitomo Corp.',
      ],
    },
    status: 'private',
    deployments: [
      'FedEx, Sagawa Express and GXO Logistics: testing DexR',
      'Sumitomo: 1,500 robots for Japanese warehouses by 2026 (2022 contract)',
      'UPS (customer)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://finance.yahoo.com/news/dexterity-secures-95m-reaching-1-110002439.html',
        title: 'Dexterity secures $95m, reaching $1.65bn valuation (total funding nearly $300m)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/dexterity-picks-up-95m-funding-container-unloading-robots/',
        title: 'Dexterity picks up $95M in funding',
        asOf: '2026-08-06',
      },
      {
        url: 'https://finance.yahoo.com/news/yet-another-ai-robotics-firm-175717685.html',
        title: 'Yet another AI robotics firm lands major funding, as Dexterity closes latest round (TechCrunch via Yahoo Finance, 2025-03-11)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'round.type': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'berkshire-grey',
    name: 'Berkshire Grey',
    aka: [],
    website: 'https://www.berkshiregrey.com',
    logo: 'berkshire-grey-logo',
    hq: {
      city: 'Bedford',
      country: 'US',
    },
    founded: 2013,
    segment: 'industrial-logistics',
    subSegment: 'warehouse-automation',
    description: 'Builds robotic picking, sorting and trailer-unloading systems for warehouses, including the Scoop unloader; SoftBank agreed in 2023 to take it private and now owns it.',
    approach: [
      'warehouse-automation',
      'mobile-manipulation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: null,
      date: '2023-03-24',
      valuationUsd: 375000000,
      leadInvestors: [
        'SoftBank Group',
      ],
    },
    status: 'acquired',
    deployments: [
      'FedEx: Scoop bulk unloaders, rolling out to its warehouses in a pilot program',
      'Walmart and Target (customers)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.berkshiregrey.com/resources/press-release/berkshire-grey-enters-into-definitive-merger-agreement-with-softbank',
        title: 'Berkshire Grey Enters into Definitive Merger Agreement with SoftBank',
        asOf: '2026-08-06',
      },
      {
        url: 'https://techcrunch.com/2026/03/31/fedex-chooses-partnerships-over-proprietary-tech-for-its-automation-strategy/',
        title: 'FedEx chooses partnerships, including Berkshire Grey',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Berkshire_Grey',
        title: 'Berkshire Grey - Wikipedia',
        asOf: '2026-10-19',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Berkshire Grey and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'amazon-robotics',
    name: 'Amazon Robotics',
    aka: [
      'Kiva Systems',
    ],
    website: 'https://amazon.jobs/amazon-robotics',
    logo: 'amazon-robotics-logo',
    hq: {
      city: 'North Reading',
      country: 'US',
    },
    founded: 2003,
    segment: 'industrial-logistics',
    subSegment: 'warehouse-automation',
    description: 'Amazon\'s robotics business, formerly Kiva Systems: it designs and builds the robots in Amazon\'s fulfillment network, which passed one million robots in July 2025, and pilots the Project Eluna agentic AI for operations.',
    approach: [
      'warehouse-automation',
      'agentic-ai',
      'fleet-at-scale',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [
      'More than 1 million robots deployed across Amazon\'s operations since 2012',
      'Project Eluna agentic AI: pilot at a Tennessee fulfillment center',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.aboutamazon.com/news/operations/new-robots-amazon-fulfillment-agentic-ai',
        title: 'Introducing Blue Jay and Project Eluna',
        asOf: '2026-08-06',
      },
      {
        url: 'https://awsinsider.net/articles/2025/11/05/the-rise-of-amazon-ai-robots.aspx',
        title: 'The Rise of Amazon AI Robots',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Amazon_Robotics',
        title: 'Amazon Robotics - Wikipedia',
        asOf: '2026-10-20',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Amazon_(company)',
        title: 'Amazon (company) - Wikipedia',
        asOf: '2026-10-20',
      },
      {
        url: 'https://amazon.jobs/amazon-robotics',
        title: 'Amazon Robotics (Amazon Jobs)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.businessinsider.com/amazon-robotics-facilities-show-modern-us-manufacturing-2025-5',
        title: 'Amazon\'s sprawling warehouse robot factories offer a glimpse into modern US manufacturing (Business Insider, 2025-05-27)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-applicable',
        basis: 'Amazon\'s robotics business, funded by Amazon: it has no venture total of its own.',
      },
      'round.type': {
        state: 'not-applicable',
        basis: 'Amazon\'s robotics business, funded by Amazon: it raises no rounds of its own.',
      },
      'round.amountUsd': {
        state: 'not-applicable',
        basis: 'Amazon\'s robotics business, funded by Amazon: it raises no rounds of its own.',
      },
      'round.date': {
        state: 'not-applicable',
        basis: 'Amazon\'s robotics business, funded by Amazon: it raises no rounds of its own.',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'Amazon\'s robotics business, funded by Amazon: it raises no rounds of its own.',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'Amazon\'s robotics business, funded by Amazon: it raises no rounds of its own.',
      },
    },
  },
  {
    id: 'nimble-robotics',
    name: 'Nimble',
    aka: [
      'Nimble Robotics',
    ],
    website: 'https://www.nimble.ai',
    logo: 'nimble-robotics-logo',
    hq: {
      city: 'San Francisco',
      country: 'US',
    },
    founded: 2017,
    segment: 'industrial-logistics',
    subSegment: 'warehouse-automation',
    description: 'Builds AI robots that run fully autonomous fulfillment centers, sold as a robotic third-party logistics (3PL) service; FedEx led its 2024 Series C and uses it to scale FedEx Fulfillment.',
    approach: [
      'autonomous-fulfillment',
      'robotic-3pl',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: 106000000,
      date: '2024-10-23',
      valuationUsd: 1000000000,
      leadInvestors: [
        'FedEx',
        'Cedar Pine',
      ],
      sourceUrl: 'https://nimble.ai/news/nimble-closes-106-million-series-c-funding-round-at-1b-valuation-scales-fully-autonomous-fulfillment-with-fedex',
    },
    status: 'private',
    deployments: [
      'FedEx Fulfillment: Nimble\'s autonomous 3PL model, scaling across North America',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://newsroom.fedex.com/newsroom/global-english/fedex-announces-expansion-of-fedex-fulfillment-with-nimble-alliance',
        title: 'FedEx Announces Expansion of FedEx Fulfillment With Nimble Alliance (first-party, 2024-09-05)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/nimble-picks-up-106m-scale-general-purpose-fulfillment-robot/',
        title: 'Nimble picks up $106M to scale general purpose fulfillment robot (The Robot Report, 2024-10-25)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://pulse2.com/nimble-ai-based-robotics-company-raises-106-million-series-c/',
        title: 'Nimble: AI-Based Robotics Company Raises $106 Million Series C (Pulse2, 2024-10-25)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://nimble.ai/news/nimble-closes-106-million-series-c-funding-round-at-1b-valuation-scales-fully-autonomous-fulfillment-with-fedex',
        title: 'Nimble Closes $106 Million Series C at $1B Valuation, Scales Fully Autonomous Fulfillment with FedEx (first-party, 2024-10-23)',
        asOf: '2026-08-24',
      },
      {
        url: 'https://techcrunch.com/2021/03/11/nimble-robotics-scores-50m-for-its-fulfillment-automation-tech/',
        title: 'Nimble Robotics scores $50M for its fulfillment automation tech (TechCrunch, 2021-03-11)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'locus-robotics',
    name: 'Locus Robotics',
    aka: [],
    website: 'https://www.locusrobotics.com',
    logo: 'locus-robotics-logo',
    hq: {
      city: 'Wilmington',
      country: 'US',
    },
    founded: 2014,
    segment: 'industrial-logistics',
    subSegment: 'mobile-robots',
    description: 'Builds autonomous mobile robots for warehouse fulfillment and, since April 2026, the Locus Array robots-to-goods system; it bought the gripper maker Nexera Robotics in May 2026.',
    approach: [
      'amr',
      'warehouse-fulfillment',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series G',
      amountUsd: 41600000,
      date: '2026-09-01',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.supplychain247.com/article/locus-robotics-41-million-series-g-funding',
      caveat: {
        text: 'The Series G is still open: Locus has raised $41.6 million from existing investors so far, and its Form D reports $41,599,804 sold.',
        sourceUrls: [
          'https://www.supplychain247.com/article/locus-robotics-41-million-series-g-funding',
          'https://www.sec.gov/Archives/edgar/data/1676668/000167666826000004/xslFormDX01/primary_doc.xml',
        ],
      },
    },
    status: 'private',
    deployments: [
      'More than 22,000 robots deployed at more than 360 sites worldwide',
      'DHL Supply Chain: committed to deploying 5,000 Locus robots in its warehouses worldwide',
      'GEODIS, CEVA Logistics, FedEx and Cardinal Health (customers)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.dcvelocity.com/editorial/featured/locus-robotics-acquires-nexera-robotics/',
        title: 'Locus Robotics acquires Nexera Robotics',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.supplychain247.com/article/locus-robotics-41-million-series-g-funding',
        title: 'Locus Robotics Raises $41.6 Million in Series G Funding (Supply Chain 24/7, 2026-09-01)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.sec.gov/Archives/edgar/data/1676668/000167666826000004/xslFormDX01/primary_doc.xml',
        title: 'Locus Robotics Corp. Form D notice of an exempt offering (SEC EDGAR, first sale 2026-08-10)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://locusrobotics.com/company/about-us/',
        title: 'About Us - Locus Robotics',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Locus Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'mujin',
    name: 'Mujin',
    aka: [],
    website: 'https://www.mujin-corp.com',
    logo: 'mujin-logo',
    hq: {
      city: 'Tokyo',
      country: 'JP',
    },
    founded: 2011,
    segment: 'industrial-logistics',
    subSegment: 'warehouse-automation',
    description: 'Builds MujinOS, software that runs industrial robots loading, unloading and moving goods in factories and warehouses; it plans to go public by 2030.',
    approach: [
      'robot-software',
      'factory-automation',
    ],
    totalRaisedUsd: 411000000,
    latestRound: {
      type: 'Series D',
      amountUsd: 233000000,
      date: '2025-12-02',
      valuationUsd: null,
      leadInvestors: [
        'NTT Group',
        'Qatar Investment Authority',
      ],
      sourceUrl: 'https://mujin-corp.com/resources/news/seriesd-announcement-advancing-industrial-automation-intelligent-robotics',
      caveat: {
        text: 'The US$233 million first close is $133 million of equity and $100 million of debt; in June 2026 Mujin\'s CEO said an extension values it at more than $1 billion.',
        sourceUrls: [
          'https://finance.yahoo.com/news/mujin-raises-us-233-million-140000051.html',
          'https://www.ttnews.com/articles/mujin-robot-software-warehouse',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Toyota Motor Corp. and Fast Retailing (Uniqlo): robots run on Mujin\'s operating systems',
      'Accenture: joint venture for AI and robotics in manufacturing and logistics (January 2024)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.ttnews.com/articles/mujin-robot-software-warehouse',
        title: 'Mujin Develops Robot Software for Warehouses and Factories (Transport Topics, Bloomberg wire; IPO by 2030)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://pulse2.com/mujin-233-million-funding/',
        title: 'Mujin: $233 Million Closed To Scale Its Intelligent Robotics Platform (Pulse2)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://mujin-corp.com/resources/news/seriesd-announcement-advancing-industrial-automation-intelligent-robotics',
        title: 'Mujin Raises US$233 Million to Accelerate Global Growth and Drive Industrial Autonomy (Mujin, 2025-12-02)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://finance.yahoo.com/news/mujin-raises-us-233-million-140000051.html',
        title: 'Mujin Raises US$233 Million to Accelerate Global Growth and Drive Industrial Autonomy (Business Wire via Yahoo Finance, 2025-12-02)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://mujin-corp.com/resources/news',
        title: 'News - Mujin',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Mujin and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'righthand-robotics',
    name: 'RightHand Robotics',
    aka: [],
    website: 'https://www.righthandrobotics.com',
    logo: 'righthand-robotics-logo',
    hq: {
      city: 'Boston',
      country: 'US',
    },
    founded: 2015,
    segment: 'industrial-logistics',
    subSegment: 'piece-picking',
    description: 'Builds RightPick, an AI-driven robotic piece-picking system for warehouse order fulfillment; Rockwell Automation made a strategic investment in it in March 2025.',
    approach: [
      'piece-picking',
      'ai-grasping',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Strategic investment',
      amountUsd: null,
      date: '2025-03-06',
      valuationUsd: null,
      leadInvestors: [
        'Rockwell Automation',
      ],
    },
    status: 'private',
    deployments: [
      'Apotea, PALTAC and Staples (RightPick 4 customers)',
      'Fleets picking millions of items a month across North America and Eastern Europe',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/righthand-robotics-receives-investment-from-rockwell-automation/',
        title: 'RightHand Robotics receives strategic investment from Rockwell Automation (2025-03-06)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://righthandrobotics.com/about-us',
        title: 'RightHand Robotics | About Us',
        asOf: '2026-10-20',
      },
      {
        url: 'https://righthandrobotics.com/contact-us',
        title: 'RightHand Robotics | Contact Us',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it RightHand Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'ambirobotics',
    name: 'Ambi Robotics',
    aka: [
      'Ambidextrous Laboratories',
    ],
    website: 'https://www.ambirobotics.com',
    logo: 'ambirobotics-logo',
    hq: {
      city: 'Berkeley',
      country: 'US',
    },
    founded: 2019,
    segment: 'industrial-logistics',
    subSegment: 'piece-picking',
    description: 'Builds AI-powered AmbiSort parcel-sorting and AmbiStack package-stacking robots, run on its AmbiOS software; Pitney Bowes is a customer and an investor.',
    approach: [
      'piece-picking',
      'parcel-sorting',
    ],
    totalRaisedUsd: 67000000,
    latestRound: {
      type: null,
      amountUsd: 32000000,
      date: '2022-10-17',
      valuationUsd: null,
      leadInvestors: [
        'Tiger Global',
        'Bow Capital',
      ],
    },
    status: 'private',
    deployments: [
      'Pitney Bowes: more than 80 AmbiSort A-Series systems across the U.S. ($23 million deal, 2022)',
      'OSM Worldwide (partnership, 2023)',
      'More than 100 million packages sorted in commercial operations (2024)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.ambirobotics.com/media/ambi-robotics-secures-32m-infusion-to-deploy-its-item-sorting-robots/',
        title: 'Ambi Robotics secures $32M infusion (first-party, 2022-10-17)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/ambi-robotics-32m-sorting-robots/',
        title: 'Ambi Robotics raises $32M for sorting robots (The Robot Report)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.ambirobotics.com/about/',
        title: 'About | Ambi Robotics Inc.',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.ambirobotics.com/contact/',
        title: 'Contact | Ambi Robotics Inc.',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'plus-one-robotics',
    name: 'Plus One Robotics',
    aka: [],
    website: 'https://www.plusonerobotics.com',
    logo: 'plus-one-robotics-logo',
    hq: {
      city: 'San Antonio',
      country: 'US',
    },
    founded: 2016,
    segment: 'industrial-logistics',
    subSegment: 'piece-picking',
    description: 'Builds vision-guided robots that pick, induct, depalletize and palletize parcels, with its Yonder platform letting remote people resolve edge cases.',
    approach: [
      'piece-picking',
      'human-in-the-loop',
    ],
    totalRaisedUsd: 94000000,
    latestRound: {
      type: 'Series C',
      amountUsd: 50000000,
      date: '2023-03-07',
      valuationUsd: null,
      leadInvestors: [
        'Scale Venture Partners',
      ],
    },
    status: 'private',
    deployments: [
      'FedEx and DHL (clients)',
      'Pitney Bowes (customer, 2023)',
      'Over 1.5 billion picks across 15 countries',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://techcrunch.com/2023/03/07/plusone-raises-50m-for-its-parcel-robotics-vision-systems/',
        title: 'Plus One raises $50M for its parcel robotics vision systems (TechCrunch, 2023-03-07)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.plusonerobotics.com/about',
        title: 'About Us | Plus One Robotics',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Plus One Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'carbon-robotics',
    name: 'Carbon Robotics',
    aka: [],
    website: 'https://carbonrobotics.com',
    logo: 'carbon-robotics-logo',
    hq: {
      city: 'Seattle',
      country: 'US',
    },
    founded: 2018,
    segment: 'vertical-applications',
    subSegment: 'agriculture',
    description: 'Builds the LaserWeeder, which finds weeds with computer vision and kills them with lasers instead of herbicides, and Carbon Autonomy kits that let existing tractors drive themselves.',
    approach: [
      'laser-weeding',
      'computer-vision',
      'autonomous-farming',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series D-2 extension',
      amountUsd: 20000000,
      date: '2025-10-23',
      valuationUsd: null,
      leadInvestors: [
        'Giant Ventures',
      ],
      sourceUrl: 'https://www.geekwire.com/2025/carbon-robotics-raises-20m-as-laserweeder-maker-plans-secretive-new-ai-robot-for-farms/',
    },
    status: 'private',
    deployments: [
      'LaserWeeder and Carbon Autonomy: more than 200 growers in 15 countries',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.businesswire.com/news/home/20241021330997/en/Carbon-Robotics-Raises-70-Million-Series-D-Investment-Round',
        title: 'Carbon Robotics Raises $70 Million Series D (first-party, 2024-10-21)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.geekwire.com/2025/carbon-robotics-raises-20m-as-laserweeder-maker-plans-secretive-new-ai-robot-for-farms/',
        title: 'Carbon Robotics raises $20M as LaserWeeder maker plans secretive new \'AI robot\' for farms (GeekWire, 2025-10-23; Series D-2 extension led by Giant Ventures)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/carbon-robotics-brings-in-70m-to-scale-laserweeder/',
        title: 'Carbon Robotics brings in $70M to scale LaserWeeder (The Robot Report, 2024-10-21)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://carbonrobotics.com/news',
        title: 'News | Discover Our Latest Updates - Carbon Robotics',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Carbon Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'monarch-tractor',
    name: 'Monarch Tractor',
    aka: [],
    website: null,
    logo: 'monarch-tractor-logo',
    hq: {
      city: 'Livermore',
      country: 'US',
    },
    founded: 2018,
    segment: 'vertical-applications',
    subSegment: 'agriculture',
    description: 'Built the MK-V, a fully electric, driver-optional tractor for farms; after layoffs and dealer lawsuits, Caterpillar acquired its assets in April 2026.',
    approach: [
      'electric-autonomous-tractor',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: null,
      date: '2026-04-14',
      valuationUsd: null,
      leadInvestors: [
        'Caterpillar',
      ],
    },
    status: 'acquired',
    deployments: [
      'Commercial operations across 12 U.S. states at its peak',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://techcrunch.com/2026/04/15/monarch-tractors-collapse-ends-in-with-an-acquisition-by-caterpillar/',
        title: 'Monarch Tractor\'s collapse ends with an acquisition by Caterpillar (TechCrunch, 2026-04-15)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://igrownews.com/monarch-tractor-news/',
        title: 'Monarch Tractor\'s Future in Doubt After Mass Layoffs',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.ttnews.com/articles/caterpillar-acquires-monarch',
        title: 'Caterpillar Buys Autonomous Electric Tractor Firm Monarch',
        asOf: '2026-08-06',
      },
    ],
    confidence: 'medium',
    absent: {
      'website': {
        state: 'not-applicable',
        basis: 'The company no longer runs a website: after Caterpillar bought its assets, monarchtractor.com serves only "This page is unavailable" (fetched 20 October 2026).',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources call it Monarch Tractor and give no other name (its website returned no readable body).',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources (its website returned no readable body).',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'farm-ng',
    name: 'Farm-ng',
    aka: [],
    website: 'https://farm-ng.com',
    logo: 'farm-ng-logo',
    hq: {
      city: 'Watsonville',
      country: 'US',
    },
    founded: 2020,
    segment: 'vertical-applications',
    subSegment: 'agriculture',
    description: 'Built the Amiga, a modular electric farm robot for small and mid-sized farms; acquired by Bonsai Robotics in July 2025.',
    approach: [
      'modular-autonomous-farm-robot',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: null,
      date: '2025-07-24',
      valuationUsd: null,
      leadInvestors: [
        'Bonsai Robotics',
      ],
      sourceUrl: 'https://bonsairobotics.ai/news/bonsai-robotics-acquires-farm-ng-to-lead-the-future-of-autonomous-farming/',
    },
    status: 'acquired',
    deployments: [
      'Axis Ag, Yuma, Arizona: Amiga data-capture platform characterising lettuce',
    ],
    openSource: [
      'farm-ng-core: C++ and Python library for the farm-ng logging format',
      'Amiga development kits (amiga-dev-kit, farm-ng-amiga) and an Amiga ROS bridge',
    ],
    sources: [
      {
        url: 'https://farm-ng.com/',
        title: 'Farm-ng - Autonomous Farm Robots',
        asOf: '2026-08-06',
      },
      {
        url: 'https://bonsairobotics.ai/news/bonsai-robotics-acquires-farm-ng-to-lead-the-future-of-autonomous-farming/',
        title: 'Bonsai Robotics Acquires farm-ng to Lead the Future of Autonomous Farming (Bonsai Robotics, first-party, 2025-07-24; financial terms undisclosed)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://www.therobotreport.com/bonsai-robotics-and-farm-ng-unite-for-intelligent-farming-solutions/',
        title: 'Bonsai Robotics and farm-ng unite for intelligent farming solutions (The Robot Report, 2025-07-24)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://agfundernews.com/bonsai-robotics-acquires-farm-ng-to-herald-new-era-of-ai-first-machines-that-will-transform-crop-management',
        title: 'Bonsai Robotics acquires farm-ng to herald new era of ag robotics (AgFunderNews, 2025-07-24; Watsonville-based, founded 2020)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://github.com/farm-ng',
        title: 'farm-ng on GitHub',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.hortidaily.com/article/9508057/robot-amiga-assists-farms-of-all-sizes/',
        title: 'Robot Amiga assists farms of all sizes (HortiDaily)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Farm-ng and give no other name.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'bedrock-robotics',
    name: 'Bedrock Robotics',
    aka: [],
    website: 'https://www.bedrockrobotics.com',
    logo: 'bedrock-robotics-logo',
    hq: {
      city: 'San Francisco',
      country: 'US',
    },
    founded: 2024,
    segment: 'vertical-applications',
    subSegment: 'construction',
    description: 'Builds autonomy that retrofits existing heavy equipment, starting with excavators, for construction sites; its founders came from Waymo.',
    approach: [
      'autonomous-heavy-equipment',
      'waymo-veterans',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series B',
      amountUsd: 270000000,
      date: '2026-02-04',
      valuationUsd: 1750000000,
      leadInvestors: [
        'CapitalG',
        'Valor Atreides AI Fund',
      ],
      sourceUrl: 'https://finance.yahoo.com/news/bedrock-robotics-raises-270-million-140000467.html',
      caveat: {
        text: 'Bedrock says the Series B brings its total funding to over $350 million; it gives no exact total.',
        sourceUrls: [
          'https://finance.yahoo.com/news/bedrock-robotics-raises-270-million-140000467.html',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Sundt Construction: supervised-autonomy mass excavation on a 130-acre manufacturing site (November 2025)',
      'Champion Site Prep: Bedrock Operator on a manufacturing campus in central Texas',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://finance.yahoo.com/news/bedrock-robotics-raises-270m-red-131800649.html',
        title: 'Bedrock Robotics raises $270M in red-hot AI sector (Construction Dive via Yahoo; co-led by CapitalG and Valor Atreides AI Fund)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://techfundingnews.com/bedrock-robotics-270m-series-b-autonomous-construction/',
        title: 'Bedrock Robotics raises $270M Series B (TechFundingNews; ex-Waymo founders, CapitalG and Valor Atreides co-lead)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://finance.yahoo.com/news/bedrock-robotics-raises-270-million-140000467.html',
        title: 'Bedrock Robotics Raises $270 Million Series B (PR Newswire via Yahoo Finance, 2026-02-04)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://bedrockrobotics.com/about',
        title: 'About - Bedrock Robotics',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Bedrock Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'chef-robotics',
    name: 'Chef Robotics',
    aka: [],
    website: 'https://www.chefrobotics.ai',
    logo: 'chef-robotics-logo',
    hq: {
      city: 'San Francisco',
      country: 'US',
    },
    founded: 2019,
    segment: 'vertical-applications',
    subSegment: 'food-kitchen',
    description: 'Builds AI-powered robots that assemble meals on high-volume, high-mix food production lines, leased to food manufacturers as robotics-as-a-service.',
    approach: [
      'food-assembly',
      'raas',
      'ai-manipulation',
    ],
    totalRaisedUsd: 65600000,
    latestRound: {
      type: 'Series A',
      amountUsd: 43100000,
      date: '2025-03-31',
      valuationUsd: null,
      leadInvestors: [
        'Avataar Ventures',
      ],
    },
    status: 'private',
    deployments: [
      'Amy\'s Kitchen',
      'Sunbasket',
      'Chef Bombay',
      'Cafe Spice',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/chef-robotics-brings-in-43m-to-deploy-more-food-assembly-robots/',
        title: 'Chef Robotics brings in $43M (Series A: $20.6M equity + $22.5M debt; total capital $65.6M)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Chef Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'simbe-robotics',
    name: 'Simbe Robotics',
    aka: [],
    website: 'https://www.simberobotics.com',
    logo: 'simbe-robotics-logo',
    hq: {
      city: 'Burlingame',
      country: 'US',
    },
    founded: 2014,
    segment: 'vertical-applications',
    subSegment: 'retail',
    description: 'Builds Tally, an autonomous shelf-scanning robot, plus fixed and RFID sensors that track inventory, pricing and product location in retail stores.',
    approach: [
      'shelf-auditing',
      'inventory-analytics',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: 50000000,
      date: '2024-10-24',
      valuationUsd: null,
      leadInvestors: [
        'Growth Equity at Goldman Sachs Alternatives',
      ],
      caveat: {
        text: 'The Series C took Simbe\'s total raised to over $100 million; it has published no exact total.',
        sourceUrls: [
          'https://www.globenewswire.com/news-release/2024/10/24/2968475/0/en/Simbe-Raises-50-Million-in-Series-C-Funding-Led-by-Growth-Equity-at-Goldman-Sachs-Alternatives.html',
          'https://www.grocerydive.com/news/simbe-raises-50-million-series-c/731116/',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Hundreds of Tally robots in chains including Schnuck Markets, BJ\'s Wholesale Club and Albertsons (2024)',
      'Wakefern Food Corp. (ShopRite): more than 90 stores',
      'Tally in stores of 29 retail brands, more than half past the pilot stage (2024)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.globenewswire.com/news-release/2024/10/24/2968475/0/en/Simbe-Raises-50-Million-in-Series-C-Funding-Led-by-Growth-Equity-at-Goldman-Sachs-Alternatives.html',
        title: 'Simbe Raises $50 Million in Series C (GlobeNewswire, first-party, 2024-10-24)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6',
        title: 'Investors to know in robotics and physical AI (Business Insider, 2026-06-15; Eclipse\'s Aidan Madigan-Curtis invested in Simbe)',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.simberobotics.com/about/who-we-are',
        title: 'Who We Are | Simbe',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.simberobotics.com/about/contact-us',
        title: 'Contact Us | Simbe',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.therobotreport.com/simbe-robotics-raises-26m-series-a-for-tally-retail-robot/',
        title: 'Simbe Robotics raises $26M Series A for Tally retail robot (The Robot Report, 2019)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://finance.yahoo.com/news/goldman-sachs-backed-simbe-raises-100000154.html',
        title: 'Goldman Sachs-backed Simbe raises $50M in Series C funding to bolster retail robot business (Fortune via Yahoo Finance, 2024)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.grocerydive.com/news/simbe-raises-50-million-series-c/731116/',
        title: 'Simbe raises $50M in latest funding round (Grocery Dive, 2024-10-25)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Simbe Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'intuitive-surgical',
    name: 'Intuitive Surgical',
    aka: [
      'Intuitive',
    ],
    website: 'https://www.intuitive.com',
    logo: 'intuitive-surgical-logo',
    hq: {
      city: 'Sunnyvale',
      country: 'US',
    },
    founded: 1995,
    segment: 'vertical-applications',
    subSegment: 'surgical',
    description: 'Builds the da Vinci robotic systems for minimally invasive surgery and the Ion endoluminal system; it has led the robotic-surgery market for more than two decades.',
    approach: [
      'surgical-robotics',
      'minimally-invasive',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [
      '11,710 da Vinci surgical systems installed (June 30, 2026)',
      '1,096 Ion endoluminal systems installed (June 30, 2026)',
      '468 da Vinci systems placed in the second quarter of 2026, 246 of them da Vinci 5',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.medtechdive.com/news/5-robotic-surgery-trends-to-watch-2026/810577/',
        title: '5 robotic surgery trends to watch in 2026',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Intuitive_Surgical',
        title: 'Intuitive Surgical - Wikipedia',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.nasdaq.com/press-release/intuitive-announces-second-quarter-earnings-2026-07-16',
        title: 'Intuitive Announces Second Quarter Earnings (GlobeNewswire via Nasdaq, 2026-07-16)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
        basis: 'A Nasdaq-listed company since a $46 million initial public offering in 2000; no fetched source states its total capital raised.',
      },
      'round.type': {
        state: 'not-disclosed',
        basis: 'A Nasdaq-listed company since a $46 million initial public offering in 2000; no fetched source states a later financing.',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
        basis: 'A Nasdaq-listed company since a $46 million initial public offering in 2000; no fetched source states a later financing.',
      },
      'round.date': {
        state: 'not-disclosed',
        basis: 'A Nasdaq-listed company since a $46 million initial public offering in 2000; no fetched source states a later financing.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
        basis: 'A Nasdaq-listed company since a $46 million initial public offering in 2000; no fetched source states a later financing.',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
        basis: 'A Nasdaq-listed company since a $46 million initial public offering in 2000; no fetched source states a later financing.',
      },
    },
  },
  {
    id: 'cmr-surgical',
    name: 'CMR Surgical',
    aka: [
      'Cambridge Medical Robotics',
    ],
    website: 'https://cmrsurgical.com',
    logo: 'cmr-surgical-logo',
    hq: {
      city: 'Cambridge',
      country: 'UK',
    },
    founded: 2014,
    segment: 'vertical-applications',
    subSegment: 'surgical',
    description: 'Builds Versius, a surgical robot with independent modular arms for keyhole soft-tissue surgery; in October 2026 Stryker agreed to invest about $400 million with an option to buy the company.',
    approach: [
      'surgical-robotics',
      'minimal-access',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Strategic investment',
      amountUsd: 400000000,
      date: '2026-10-12',
      valuationUsd: null,
      leadInvestors: [
        'Stryker',
      ],
      sourceUrl: 'https://cmrsurgical.com/news/stryker-and-cmr-surgical-announce-strategic-alliance-to-advance-robotic-assisted-surgery',
      caveat: {
        text: 'Stryker\'s investment of about $400 million (£300 million) is preferred equity, subject to closing conditions and regulatory approvals, and gives Stryker an exclusive option to buy all of CMR Surgical.',
        sourceUrls: [
          'https://cmrsurgical.com/news/stryker-and-cmr-surgical-announce-strategic-alliance-to-advance-robotic-assisted-surgery',
          'https://www.therobotreport.com/stryker-invests-400m-into-cmr-surgical/',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Versius: adopted in hospitals in more than 30 countries and used in 45,000 cases',
      '20 NHS hospital partnerships in the UK (October 2023)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://cmrsurgical.com/',
        title: 'CMR Surgical (company site; Versius surgical robot)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://en.wikipedia.org/wiki/CMR_Surgical',
        title: 'CMR Surgical - Wikipedia',
        asOf: '2026-10-20',
      },
      {
        url: 'https://cmrsurgical.com/news/stryker-and-cmr-surgical-announce-strategic-alliance-to-advance-robotic-assisted-surgery',
        title: 'Stryker and CMR Surgical announce strategic alliance to advance robotic-assisted surgery (CMR Surgical, 2026-10-12)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.therobotreport.com/stryker-invests-400m-into-cmr-surgical/',
        title: 'Stryker invests $400M into CMR Surgical (The Robot Report, 2026-10-15)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'moon-surgical',
    name: 'Moon Surgical',
    aka: [
      'MastOR',
    ],
    website: 'https://www.moonsurgical.com',
    logo: 'moon-surgical-logo',
    hq: {
      city: 'Paris',
      country: 'FR',
    },
    founded: 2019,
    segment: 'vertical-applications',
    subSegment: 'surgical',
    description: 'Builds Maestro, a robotic system that assists surgeons in laparoscopic surgery; the FDA cleared its ScoPilot AI capability in March 2025.',
    approach: [
      'surgical-assistant',
      'laparoscopic',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series B',
      amountUsd: 55400000,
      date: '2023-05-17',
      valuationUsd: null,
      leadInvestors: [
        'Sofinnova Partners',
        'NVentures (NVIDIA)',
      ],
      sourceUrl: 'https://sofinnovapartners.com/news/moon-surgical-appoints-fred-moll-md-board-chair-raises-usd55-4-million',
    },
    status: 'private',
    deployments: [
      'Lee Health\'s Gulf Coast Medical Center, Florida: over 100 procedures (July 2025)',
      'Over 1,600 Maestro procedures worldwide across 60 types of surgery (July 2025)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://moonsurgical.com/company',
        title: 'Company | Moon Surgical',
        asOf: '2026-10-20',
      },
      {
        url: 'https://sofinnovapartners.com/portfolio/moon-surgical',
        title: 'Moon Surgical (Sofinnova Partners portfolio)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://sofinnovapartners.com/news/mastor-secures-seed-funding-from-sofinnova-partners-to-develop-its-laparoscopy-assistance-platform',
        title: 'MastOR secures seed funding from Sofinnova Partners to develop its laparoscopy assistance platform (Sofinnova Partners, 2020)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://sofinnovapartners.com/news/moon-surgical-appoints-fred-moll-md-board-chair-raises-usd55-4-million',
        title: 'Moon Surgical appoints Fred Moll, MD, as Board Chair and raises additional $55.4 million (Sofinnova Partners, 2023-05-17)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.prnewswire.com/news-releases/moon-surgical-launches-maestro-platform-at-lee-health-302505548.html',
        title: 'Moon Surgical Launches Maestro Platform at Lee Health (PR Newswire, 2025-07-15)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'nuro',
    name: 'Nuro',
    aka: [],
    website: 'https://www.nuro.ai',
    logo: 'nuro-logo',
    hq: {
      city: 'Mountain View',
      country: 'US',
    },
    founded: 2016,
    segment: 'vertical-applications',
    subSegment: 'delivery',
    description: 'Develops the Nuro Driver, an autonomous driving system it licenses to automakers and mobility providers; it began by testing driverless food delivery and is building a robotaxi service with Uber and Lucid.',
    approach: [
      'autonomous-driving',
      'licensing',
      'last-mile-delivery',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series E',
      amountUsd: 203000000,
      date: '2025-08-21',
      valuationUsd: 6000000000,
      leadInvestors: [],
      sourceUrl: 'https://finance.yahoo.com/news/nuro-closes-203-million-series-123000194.html',
      caveat: {
        text: 'The $203 million Series E closed in two tranches: $106 million announced in April 2025 and $97 million in August 2025.',
        sourceUrls: [
          'https://finance.yahoo.com/news/nuro-closes-203-million-series-123000194.html',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Uber and Lucid robotaxi partnership: 20,000 or more Lucid vehicles with the Nuro Driver planned',
      'Houston: second planned market for the Uber and Lucid robotaxi service, expected mid-2027',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.builtinsf.com/articles/nuro-secures-203m-6b-valuation-20250825',
        title: 'Nuro Secures $203M at $6B Valuation to Scale Global Robotaxis (Built In SF, 2025-08-25)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://tech.yahoo.com/articles/nuro-valued-6-billion-latest-131300388.html',
        title: 'Nuro secures $6 billion valuation in latest funding round (Yahoo Tech, 2025-04-09; the $106M licensing-shift round)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://finance.yahoo.com/news/nuro-closes-203-million-series-123000194.html',
        title: 'Nuro Closes $203 Million Series E Financing to Advance Its AI-First Autonomy Platform (Business Wire via Yahoo Finance, 2025-08-21)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.nuro.ai/blog/uber-nuro-and-lucid-to-bring-robotaxi-service-to-houston-in-2027',
        title: 'Uber, Nuro, and Lucid to Bring Robotaxi Service to Houston in 2027 (Nuro, 2026-06-17)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Nuro and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'serve-robotics',
    name: 'Serve Robotics',
    aka: [],
    website: 'https://www.serverobotics.com',
    logo: 'serve-robotics-logo',
    hq: {
      city: 'San Carlos',
      country: 'US',
    },
    founded: 2017,
    segment: 'vertical-applications',
    subSegment: 'delivery',
    description: 'Builds and operates autonomous sidewalk robots that deliver food in US cities for DoorDash and Grubhub; it bought the hospital-robot maker Diligent Robotics in 2026, the year Uber sold its stake.',
    approach: [
      'sidewalk-delivery',
      'hospital-logistics',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [
      'DoorDash: robot deliveries in Chicago, Los Angeles and Miami, expanding to Washington and San Jose (August 2026)',
      'Diligent Robotics\' Moxi robots in more than 25 hospitals (acquired January 2026)',
      'About 2,000 sidewalk robots; 792 in daily use on average in the second quarter of 2026',
      'Grubhub (Wonder): robot deliveries in Los Angeles, Chicago and Alexandria, Virginia (from August 2026)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://techcrunch.com/2026/08/11/uber-surprised-robotics-company-serve-by-selling-its-entire-stake/',
        title: 'Uber sells entire Serve Robotics stake; Serve pivots to Grubhub/DoorDash (TechCrunch, 2026-08-11)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/serve-robotics-acquires-diligent-robotics/',
        title: 'Serve Robotics acquires Diligent Robotics (The Robot Report, 2026-01-20)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Serve_Robotics',
        title: 'Serve Robotics - Wikipedia',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.spokesman.com/stories/2026/aug/17/serve-robotics-expands-doordash-deal-adds-grubhub-/',
        title: 'Serve Robotics expands DoorDash deal, adds Grubhub post-Uber split (Bloomberg via The Spokesman-Review, 2026-08-17)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Serve Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'gecko-robotics',
    name: 'Gecko Robotics',
    aka: [],
    website: 'https://www.geckorobotics.com',
    logo: 'gecko-robotics-logo',
    hq: {
      city: 'Pittsburgh',
      country: 'US',
    },
    founded: 2013,
    segment: 'vertical-applications',
    subSegment: 'inspection',
    description: 'Builds robots that climb, fly and swim to inspect critical infrastructure such as Navy warships and power plants, and feeds their data to its Cantilever AI platform.',
    approach: [
      'infrastructure-inspection',
      'climbing-robots',
    ],
    totalRaisedUsd: 347000000,
    latestRound: {
      type: 'Series D',
      amountUsd: 125000000,
      date: '2025-06-12',
      valuationUsd: 1250000000,
      leadInvestors: [
        'Cox Enterprises',
      ],
    },
    status: 'private',
    deployments: [
      'U.S. Navy: five-year contract with a $71 million ceiling, starting with 18 Pacific Fleet ships (March 2026)',
      'NAES, the largest US independent power operator: power plant modernization',
      'Abu Dhabi National Oil Company: robots inspect gas facilities and tanks',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.geckorobotics.com/news/gecko-reaches-unicorn-status',
        title: 'Gecko Reaches Unicorn Status (first-party; Series D led by Cox Enterprises)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.cnbc.com/2025/06/12/gecko-robotics-raises-125-million-surpassing-billion-dollar-valuation.html',
        title: 'Gecko Robotics raises $125 million, valuation $1.25 billion (CNBC)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.geckorobotics.com/about-us',
        title: 'About Us | Gecko Robotics',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.geckorobotics.com/news/navy-idiq',
        title: 'Gecko Robotics Announces $71M Deal to Slash U.S. Navy Maintenance Delays and Increase Readiness (Gecko Robotics, 2026-03-17)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Gecko Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
    },
  },
  {
    id: 'standard-bots',
    name: 'Standard Bots',
    aka: [],
    website: 'https://standardbots.com',
    logo: 'standard-bots-logo',
    hq: {
      city: 'Glen Cove',
      country: 'US',
    },
    founded: null,
    segment: 'vertical-applications',
    subSegment: 'industrial-cobots',
    description: 'Designs and assembles AI-native industrial robot arms, including the RO1 collaborative arm, and industrial humanoids in Glen Cove, New York; its June 2026 Series C valued it at $1 billion.',
    approach: [
      'cobot',
      'ease-of-deployment',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: 200000000,
      date: '2026-06-09',
      valuationUsd: 1000000000,
      leadInvestors: [
        'RoboStrategy',
        'General Catalyst',
      ],
      sourceUrl: 'https://www.therobotreport.com/standard-bots-raises-200m-expand-u-s-manufacturing-footprint/',
    },
    status: 'private',
    deployments: [
      'Users include Sunoco, Lockheed Martin, Amazon, NASA and the U.S. Army',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://standardbots.com/blog/standard-bots-raises-63m-to-accelerate-ai-in-robotics/',
        title: 'Standard Bots raises $63M (first-party; Series B led by General Catalyst)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.robotics247.com/article/standard-bots-raises-200-million-series-c-at-1-billion-valuation',
        title: 'Standard Bots raises $200 million Series C at $1 billion valuation (Robotics 24/7, 2026-06-09)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/standard-bots-raises-63m-to-bring-cobot-arms-to-market/',
        title: 'Standard Bots raises $63M',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.therobotreport.com/standard-bots-raises-200m-expand-u-s-manufacturing-footprint/',
        title: 'Standard Bots raises $200M to expand U.S. manufacturing footprint (The Robot Report, 2026-06-09)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://pulse2.com/standard-bots-raises-200-million-series-c-at-1-billion-valuation-to-scale-ai-native-american-robotics/',
        title: 'Standard Bots Raises $200 Million Series C At $1 Billion Valuation To Scale AI-Native American Robotics (Pulse 2.0, 2026-06-11)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'founded': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Standard Bots and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'collaborative-robotics',
    name: 'Collaborative Robotics',
    aka: [
      'Cobot',
    ],
    website: 'https://www.co.bot',
    logo: 'collaborative-robotics-logo',
    hq: {
      city: 'Santa Clara',
      country: 'US',
    },
    founded: 2022,
    segment: 'vertical-applications',
    subSegment: 'industrial-cobots',
    description: 'Builds Proxie, a wheeled mobile manipulator designed to work alongside people in manufacturing, supply-chain and healthcare settings.',
    approach: [
      'cobot',
      'human-robot-interaction',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series B',
      amountUsd: 100000000,
      date: '2024-04-10',
      valuationUsd: null,
      leadInvestors: [
        'General Catalyst',
      ],
    },
    status: 'private',
    deployments: [
      'Pilot customers including Moderna, Mayo Clinic, Owens & Minor and Tampa General Hospital (November 2024)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/collaborative-robotics-raises-100m-series-b-funding/',
        title: 'Collaborative Robotics raises $100M in Series B funding (The Robot Report, 2024-04-10)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.co.bot/news/robots-come-to-life',
        title: 'Our Robot Comes to Life and Gets Right to Work (Cobot first-party)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/collaborative-robotics-unveils-proxie-mobile-manipulator/',
        title: 'Collaborative Robotics unveils Proxie mobile manipulator (The Robot Report, 2024-11-20)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'the-bot-company',
    name: 'The Bot Company',
    aka: [],
    website: 'https://www.bot.co',
    logo: 'the-bot-company-logo',
    hq: {
      city: 'San Francisco',
      country: 'US',
    },
    founded: 2024,
    segment: 'vertical-applications',
    subSegment: 'consumer-home',
    description: 'Builds robots to do household chores; Cruise founder Kyle Vogt started it in 2024, and it had not shown a prototype publicly as of 2025.',
    approach: [
      'wheeled-home-robot',
      'consumer',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: 250000000,
      date: '2025-10-28',
      valuationUsd: null,
      leadInvestors: [
        'Eclipse',
      ],
      sourceUrl: 'https://news.bloomberglaw.com/private-equity/cruise-founders-robot-startup-is-in-talks-for-4-billion-value',
      caveat: {
        text: 'Bloomberg reported in October 2025 that the round was set to raise $250 million at a valuation of more than $4 billion, citing people familiar; no close has been announced. Its March 2025 round raised $150 million.',
        sourceUrls: [
          'https://news.bloomberglaw.com/private-equity/cruise-founders-robot-startup-is-in-talks-for-4-billion-value',
          'https://www.therobotreport.com/the-bot-company-led-by-kyle-vogt-brings-in-another-150m/',
        ],
      },
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/the-bot-company-led-by-kyle-vogt-brings-in-another-150m/',
        title: 'The Bot Company brings in another $150M',
        asOf: '2026-08-18',
      },
      {
        url: 'https://news.bloomberglaw.com/private-equity/cruise-founders-robot-startup-is-in-talks-for-4-billion-value',
        title: 'Cruise Founder\'s Robot Startup Is in Talks for $4 Billion Value (Bloomberg News via Bloomberg Law, 2025-10-28)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it The Bot Company and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'weave-robotics',
    name: 'Weave Robotics',
    aka: [],
    website: 'https://www.weaverobotics.com',
    logo: 'weave-robotics-logo',
    hq: {
      city: 'San Francisco',
      country: 'US',
    },
    founded: 2024,
    segment: 'vertical-applications',
    subSegment: 'consumer-home',
    description: 'Builds home robots: Isaac 0, a stationary laundry-folding robot shipping in California, and Isaac 1, a mobile robot for laundry and tidying, on preorder at $7,999 with first shipments planned for fall 2026.',
    approach: [
      'home-robot',
      'consumer',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [
      'Isaac 0 laundry-folding robot: shipping to homes across California',
      'Isaac 1: preorders at $7,999 or $449 a month; first shipments planned for fall 2026',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.businessinsider.com/weave-robotics-isaac-1-8000-home-robot-chores-2026-7',
        title: 'A $7,999 Home Robot Joins the Race',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.ycombinator.com/companies/weave-robotics',
        title: 'Weave Robotics (Y Combinator company page)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Weave Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'irobot',
    name: 'iRobot',
    aka: [],
    website: 'https://www.irobot.com',
    logo: 'irobot-logo',
    hq: {
      city: 'Bedford',
      country: 'US',
    },
    founded: 1990,
    segment: 'vertical-applications',
    subSegment: 'consumer-home',
    description: 'Maker of the Roomba robot vacuum, launched in 2002; after a Chapter 11 filing in December 2025, its contract manufacturer Shenzhen Picea Robotics acquired it in January 2026.',
    approach: [
      'consumer-vacuum',
      'home-cleaning',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: null,
      date: '2026-01-23',
      valuationUsd: null,
      leadInvestors: [
        'Picea Robotics',
      ],
      sourceUrl: 'https://media.irobot.com/2026-01-23-iRobot-Completes-Court-Supervised-Transaction-with-Picea,-Enabling-the-Next-Chapter-of-Growth',
    },
    status: 'acquired',
    deployments: [
      'Roomba: about 42% of the US and 65% of the Japanese robot-vacuum market (December 2025)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.bbc.com/news/articles/c1lr75lp239o',
        title: 'Roomba vacuum cleaner firm files for bankruptcy',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.wbur.org/hereandnow/2026/03/17/irobot-bankruptcy',
        title: 'Why iRobot went bankrupt',
        asOf: '2026-08-18',
      },
      {
        url: 'https://en.wikipedia.org/wiki/IRobot',
        title: 'iRobot - Wikipedia',
        asOf: '2026-10-20',
      },
      {
        url: 'https://media.irobot.com/2025-12-14-iRobot-Announces-Strategic-Transaction-to-Drive-Long-Term-Growth-Plan',
        title: 'iRobot Announces Strategic Transaction to Drive Long-Term Growth Plan (iRobot, 2025-12-14)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://media.irobot.com/2026-01-23-iRobot-Completes-Court-Supervised-Transaction-with-Picea,-Enabling-the-Next-Chapter-of-Growth',
        title: 'iRobot Completes Court-Supervised Transaction with Picea (iRobot, 2026-01-23)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it iRobot and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'k-scale-labs',
    name: 'K-Scale Labs',
    aka: [],
    website: null,
    logo: 'k-scale-labs-logo',
    hq: {
      city: 'Palo Alto',
      country: 'US',
    },
    founded: 2024,
    segment: 'vertical-applications',
    subSegment: 'consumer-home',
    description: 'Built K-Bot, an open-source humanoid robot priced from under $10,000; it shut down in November 2025 after failing to raise enough money, refunding K-Bot deposits and open-sourcing its technology.',
    approach: [
      'open-source-humanoid',
      'low-cost',
    ],
    totalRaisedUsd: 6250000,
    latestRound: {
      type: 'Strategic investment',
      amountUsd: 2000000,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://eu.36kr.com/en/p/3558501366315912',
    },
    status: 'dead',
    deployments: [
      'At least two K-Bot humanoids shipped before the shutdown; the first preorder batch was limited to 100 units',
    ],
    openSource: [
      'K-Bot humanoid design and the rest of its technology, open-sourced at the November 2025 shutdown',
    ],
    sources: [
      {
        url: 'https://newsletter.failory.com/p/the-open-source-robot',
        title: 'How K-Scale Labs tried to democratize humanoid robots but ran out of runway (Nov 2025)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://mikekalil.com/blog/k-scale-labs-shuts-down/',
        title: 'Palo Alto Humanoid Startup K-Scale Labs Shuts Down',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.ycombinator.com/companies/k-scale-labs',
        title: 'K-Scale Labs (Y Combinator company page)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://eu.36kr.com/en/p/3558501366315912',
        title: 'The First Humanoid Robot Company Collapses During Mass Production (36Kr)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'website': {
        state: 'not-applicable',
        basis: 'It shut down in November 2025; kscale.dev, the website its investor Y Combinator lists, no longer resolves (checked 20 October 2026).',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: its cited sources call it K-Scale Labs; 36Kr\'s KSL is that outlet\'s abbreviation, not a name the company used.',
      },
      'round.date': {
        state: 'not-disclosed',
        basis: '36Kr dates the strategic investment only to June 2025.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
        basis: '36Kr names the investor only as a subsidiary of Zhejiang Taotao Vehicle Industry.',
      },
    },
  },
  {
    id: 'automata',
    name: 'Automata',
    aka: [
      'Automata Technologies',
    ],
    website: 'https://www.automata.tech',
    logo: 'automata-logo',
    hq: {
      city: 'London',
      country: 'UK',
    },
    founded: 2015,
    segment: 'vertical-applications',
    subSegment: 'lab-automation',
    description: 'Builds LINQ, a fully integrated, AI-ready lab automation platform of benches and orchestration software for pharma, biotech and research labs; Danaher joined its January 2026 Series C as a strategic partner.',
    approach: [
      'lab-automation',
      'ai-ready',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: 45000000,
      date: '2026-01-29',
      valuationUsd: null,
      leadInvestors: [
        'Dimension',
      ],
      sourceUrl: 'https://www.automata.tech/company-news/automata-raises-45m-series-c-funding',
    },
    status: 'private',
    deployments: [
      'Five top pharma companies among its customers, with repeat deployments (January 2026)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.automata.tech/company-news/automata-raises-45m-series-c-funding',
        title: 'Automata Secures $45M Series C',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.automata.tech/about-us',
        title: 'About Us - Automata',
        asOf: '2026-10-20',
      },
      {
        url: 'https://find-and-update.company-information.service.gov.uk/company/09384597',
        title: 'AUTOMATA TECHNOLOGIES LIMITED (Companies House)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'lila-sciences',
    name: 'Lila Sciences',
    aka: [],
    website: 'https://www.lila.ai',
    logo: 'lila-sciences-logo',
    hq: {
      city: 'Cambridge',
      country: 'US',
    },
    founded: 2023,
    segment: 'vertical-applications',
    subSegment: 'lab-automation',
    description: 'Builds what it calls scientific superintelligence: AI models that run autonomous labs, its AI Science Factories, for life, chemical and materials science; Flagship Pioneering founded it in 2023.',
    approach: [
      'autonomous-labs',
      'scientific-ai',
    ],
    totalRaisedUsd: 550000000,
    latestRound: {
      type: 'Series A',
      amountUsd: 350000000,
      date: '2025-10-10',
      valuationUsd: null,
      leadInvestors: [
        'Braidwell',
        'Collective Global',
      ],
      sourceUrl: 'https://www.lila.ai/news/announcing-the-close-of-our-series-a',
      caveat: {
        text: 'Reuters reported in October 2025 that new Nvidia backing valued Lila at more than $1.3 billion; Lila has not published a valuation.',
        sourceUrls: [
          'https://www.lila.ai/news/exclusive-ai-lab-lila-sciences-tops-1-3-billion-valuation-with-new-nvidia-backing',
          'https://www.lila.ai/news/announcing-the-close-of-our-series-a',
        ],
      },
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.lila.ai/news/exclusive-ai-lab-lila-sciences-tops-1-3-billion-valuation-with-new-nvidia-backing',
        title: 'Exclusive: AI lab Lila Sciences tops $1.3 billion valuation with new Nvidia backing (lila.ai, Reuters wire, 2025-10-14)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.lila.ai/news/announcing-the-close-of-our-series-a',
        title: 'Announcing Lila\'s $350M Series A (first-party; total funding to $550M)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.lila.ai/about',
        title: 'About Lila Sciences (LILA)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.lila.ai/contact',
        title: 'Contact (LILA)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.flagshippioneering.com/news/press-release/flagship-pioneering-unveils-lila-sciences-to-build-superintelligence-in-science',
        title: 'Flagship Pioneering Unveils Lila Sciences to Build Superintelligence in Science (Flagship Pioneering, 2025-03-10)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Lila Sciences and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'avidbots',
    name: 'Avidbots',
    aka: [],
    website: 'https://avidbots.com',
    logo: 'avidbots-logo',
    hq: {
      city: 'Kitchener',
      country: 'CA',
    },
    founded: 2014,
    segment: 'vertical-applications',
    subSegment: 'cleaning',
    description: 'Builds Neo, Neo 2W and Kas, autonomous floor-scrubbing robots for commercial spaces such as airports, warehouses and shopping malls.',
    approach: [
      'autonomous-cleaning',
      'commercial',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: 70000000,
      date: '2022-09-27',
      valuationUsd: null,
      leadInvestors: [
        'Jeneration Capital',
      ],
      caveat: {
        text: 'Avidbots said the Series C took its total raised to more than $107 million; it has published no exact total.',
        sourceUrls: [
          'https://avidbots.com/news/avidbots-raises-70m-in-series-c-funding/',
        ],
      },
    },
    status: 'private',
    deployments: [
      'More than 1,000 robots deployed across North America, Asia, Europe, the Middle East and Australia (September 2022)',
      'Neo 2 at the Huntsville and Cincinnati/Northern Kentucky airports and with Singapore rail operator SMRT Trains (2022)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://avidbots.com/news/avidbots-raises-70m-in-series-c-funding/',
        title: 'Avidbots raises $70M in Series C funding, led by Jeneration Capital (first-party)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://techcrunch.com/2022/09/27/avidbots-maker-of-autonomous-industrial-cleaning-robots-nabs-70m/',
        title: 'Avidbots, maker of autonomous industrial cleaning robots, nabs $70M (TechCrunch)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Avidbots and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'harmonic-drive-systems',
    name: 'Harmonic Drive Systems',
    aka: [
      'HDSI',
    ],
    website: 'https://www.hds.co.jp/english/',
    logo: 'harmonic-drive-logo',
    hq: {
      city: 'Tokyo',
      country: 'JP',
    },
    founded: 1970,
    segment: 'components-hardware',
    subSegment: 'actuators-reducers',
    description: 'Makes HarmonicDrive strain wave gears and other precision speed reducers, plus actuators and motors, for industrial robots, semiconductor manufacturing equipment and other systems.',
    approach: [
      'strain-wave-gearing',
      'precision-motion',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.hds.co.jp/english/company/about/',
        title: 'Corporate Information (Harmonic Drive Systems)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.hds.co.jp/english/ir/stock/information/',
        title: 'General Stock Information (Harmonic Drive Systems)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.hds.co.jp/english/company/establishment/',
        title: 'Company Sites (Harmonic Drive Systems)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'deployments': {
        state: 'not-disclosed',
        basis: 'Its corporate pages name no customers; they say its speed reducers go into industrial robots, semiconductor manufacturing equipment and other systems.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
        basis: 'Listed on the Prime Market of the Tokyo Stock Exchange; no fetched source states its total capital raised.',
      },
      'round.type': {
        state: 'not-disclosed',
        basis: 'Listed on the Prime Market of the Tokyo Stock Exchange; no fetched source states a financing round.',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
        basis: 'Listed on the Prime Market of the Tokyo Stock Exchange; no fetched source states a financing round.',
      },
      'round.date': {
        state: 'not-disclosed',
        basis: 'Listed on the Prime Market of the Tokyo Stock Exchange; no fetched source states a financing round.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
        basis: 'Listed on the Prime Market of the Tokyo Stock Exchange; no fetched source states a financing round.',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
        basis: 'Listed on the Prime Market of the Tokyo Stock Exchange; no fetched source states a financing round.',
      },
    },
  },
  {
    id: 'nabtesco',
    name: 'Nabtesco',
    aka: [],
    website: 'https://www.nabtesco.com',
    logo: 'nabtesco-logo',
    hq: {
      city: 'Tokyo',
      country: 'JP',
    },
    founded: 2003,
    segment: 'components-hardware',
    subSegment: 'actuators-reducers',
    description: 'Makes precision reduction gears, including its RV line, for the joints of industrial robots, alongside railway, aircraft, marine and commercial-vehicle equipment and automatic doors.',
    approach: [
      'cycloidal-reducers',
      'precision-motion',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [
      'Precision reduction gears in the joints of industrial robots from Japanese and overseas makers: about 60% of the global market for medium-size to large robot joints (Nabtesco\'s estimate)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://en.wikipedia.org/wiki/Nabtesco',
        title: 'Nabtesco - Wikipedia',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.nabtesco.com/en/about/company/overview/',
        title: 'Company Overview (Nabtesco)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.nabtesco.com/en/products/robot/',
        title: 'Precision Reduction Gears (Nabtesco)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Nabtesco and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
        basis: 'Listed on the Tokyo Stock Exchange (6268); no fetched source states its total capital raised.',
      },
      'round.type': {
        state: 'not-disclosed',
        basis: 'Listed on the Tokyo Stock Exchange (6268); no fetched source states a financing round.',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
        basis: 'Listed on the Tokyo Stock Exchange (6268); no fetched source states a financing round.',
      },
      'round.date': {
        state: 'not-disclosed',
        basis: 'Listed on the Tokyo Stock Exchange (6268); no fetched source states a financing round.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
        basis: 'Listed on the Tokyo Stock Exchange (6268); no fetched source states a financing round.',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
        basis: 'Listed on the Tokyo Stock Exchange (6268); no fetched source states a financing round.',
      },
    },
  },
  {
    id: 'leaderdrive',
    name: 'Leaderdrive',
    aka: [
      'Leader Harmonious Drive Systems',
    ],
    website: 'https://www.leaderdrive.com',
    logo: 'leaderdrive-logo',
    hq: {
      city: 'Suzhou',
      country: 'CN',
    },
    founded: null,
    segment: 'components-hardware',
    subSegment: 'actuators-reducers',
    description: 'Makes strain wave gears, rotary actuators, frameless torque motors and rotary tables for robots and automation; it claims more than 60% of China\'s market for its reducers and showed humanoid solutions at iREX 2025.',
    approach: [
      'harmonic-reducers',
      'domestic-substitution',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [
      'More than 300,000 strain wave reducers sold in 2025, across 21 series',
      'More than 1,800 clients worldwide',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.leaderdrive.com/about/profile.html',
        title: 'Company Profile (Leaderdrive)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.leaderdrive.com/contact.html',
        title: 'Contact Us (Leaderdrive)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'founded': {
        state: 'not-disclosed',
        basis: 'Its site says only that the company has been established for more than 22 years and dates its first strain wave gear development to 2003.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
        basis: 'Listed on China\'s Sci-Tech Innovation Board since 2020; no fetched source states its total capital raised.',
      },
      'round.type': {
        state: 'not-disclosed',
        basis: 'Listed on China\'s Sci-Tech Innovation Board since 2020; no fetched source states a later financing round.',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
        basis: 'Listed on China\'s Sci-Tech Innovation Board since 2020; no fetched source states a later financing round.',
      },
      'round.date': {
        state: 'not-disclosed',
        basis: 'Listed on China\'s Sci-Tech Innovation Board since 2020; no fetched source states a later financing round.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
        basis: 'Listed on China\'s Sci-Tech Innovation Board since 2020; no fetched source states a later financing round.',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
        basis: 'Listed on China\'s Sci-Tech Innovation Board since 2020; no fetched source states a later financing round.',
      },
    },
  },
  {
    id: 'sanhua',
    name: 'Sanhua',
    aka: [
      'Sanhua Intelligent Controls',
      'Sanhua Holding Group',
    ],
    website: 'https://www.sanhuagroup.com',
    logo: 'sanhua-logo',
    hq: {
      city: null,
      country: 'CN',
    },
    founded: 1984,
    segment: 'components-hardware',
    subSegment: 'actuators-components',
    description: 'Makes refrigeration and air-conditioning control components and automotive thermal-management parts, supplying Tesla\'s cars, and is developing electromechanical actuators for robots.',
    approach: [
      'thermal-management',
      'actuator-components',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
      caveat: {
        text: 'Reports in October 2025 said Tesla had ordered Optimus actuators from Sanhua worth about $685 million (over 5 billion yuan); the company declined to comment on market rumors and has never confirmed it supplies Optimus.',
        sourceUrls: [
          'https://eu.36kr.com/en/p/3510288514980998',
          'https://news.metal.com/newscontent/103570985-sanhua-intelligent-control-lands-over-5-billion-yuan-tesla-humanoid-robot-order',
        ],
      },
    },
    status: 'public',
    deployments: [
      'Thermal-management components for Tesla\'s electric cars, as a Tier 1 supplier',
      'Tier 1 supplier to Mercedes-Benz, BMW, Audi, BYD, Geely, Li Auto and NIO',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://eu.36kr.com/en/p/3510288514980998',
        title: 'Elon Musk throws a $685 million order to Sanhua, and China becomes an important supplier for Optimus (Zinc Finance via 36Kr, 2025-10-15)',
        asOf: '2026-08-06',
      },
      {
        url: 'https://news.metal.com/newscontent/103570985-sanhua-intelligent-control-lands-over-5-billion-yuan-tesla-humanoid-robot-order',
        title: 'Recent reports indicate that Sanhua Intelligent Control has secured a large order from Tesla for humanoid robots (Shanghai Metals Market, 2025-10-16)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://eu.36kr.com/en/p/3234007375625857',
        title: 'Sanhua Intelligent Controls: From a Small Factory in Zhejiang to a Giant Worth Hundreds of Billions (36Kr, 2025-04-03)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.sanhuagroup.com/about.html',
        title: 'Company introduction (Sanhua Holding Group)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.sanhuagroup.com/en/cy.html',
        title: 'Zhejiang Sanhua Intelligent Controls (Sanhua Holding Group)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'hq.city': {
        state: 'not-disclosed',
        basis: 'No fetched source names its headquarters city; its group site lists production bases and R&D centres in Xinchang and Hangzhou.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
        basis: 'Its listed arm has traded on the Shenzhen Stock Exchange since 2005; no fetched source states its total capital raised.',
      },
      'round.type': {
        state: 'not-disclosed',
        basis: 'Its listed arm has traded on the Shenzhen Stock Exchange since 2005; no fetched source states a later financing round.',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
        basis: 'Its listed arm has traded on the Shenzhen Stock Exchange since 2005; no fetched source states a later financing round.',
      },
      'round.date': {
        state: 'not-disclosed',
        basis: 'Its listed arm has traded on the Shenzhen Stock Exchange since 2005; no fetched source states a later financing round.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
        basis: 'Its listed arm has traded on the Shenzhen Stock Exchange since 2005; no fetched source states a later financing round.',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
        basis: 'Its listed arm has traded on the Shenzhen Stock Exchange since 2005; no fetched source states a later financing round.',
      },
    },
  },
  {
    id: 'shadow-robot',
    name: 'Shadow Robot',
    aka: [
      'Shadow Robot Company',
    ],
    website: 'https://www.shadowrobot.com',
    logo: 'shadow-robot-logo',
    hq: {
      city: 'London',
      country: 'UK',
    },
    founded: 1997,
    segment: 'components-hardware',
    subSegment: 'dexterous-hands',
    description: 'Builds dexterous robot hands, including the Shadow Dexterous Hand and the DEX-EE hands developed with Google DeepMind, and teleoperated robots for research and mission-critical work.',
    approach: [
      'dexterous-hands',
      'teleoperation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [
      'OpenAI used the Shadow Dexterous Hand to study learning dexterity',
      'DEX-EE hands built with and for Google DeepMind\'s machine-learning research',
      'Clients including NASA, GSK, Siemens, Google Brain, Honda, MIT and Qualcomm',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://shadowrobot.com/',
        title: 'Shadow Robot - Dexterous Robotic Hands',
        asOf: '2026-08-06',
      },
      {
        url: 'https://shadowrobot.com/our-story/',
        title: 'Our Story (Shadow Robot)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://shadowrobot.com/contact-us-2/',
        title: 'Contact Us (Shadow Robot)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://shadowrobot.com/dex-ee_series/',
        title: 'DEX-EE Series (Shadow Robot)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://find-and-update.company-information.service.gov.uk/company/03308007',
        title: 'THE SHADOW ROBOT COMPANY LIMITED (Companies House)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'sharpa',
    name: 'Sharpa',
    aka: [],
    website: 'https://www.sharpa.com',
    logo: 'sharpa-logo',
    hq: {
      city: 'Singapore',
      country: 'SG',
    },
    founded: 2024,
    segment: 'components-hardware',
    subSegment: 'dexterous-hands',
    description: 'Builds tactile dexterous robot hands, including the 22-degree-of-freedom Wave, in mass production since October 2025, plus dexterous robots and the CraftNet manipulation model; its own release calls it a unicorn.',
    approach: [
      'dexterous-hands',
      'tactile-sensing',
      'mass-production',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [
      'Wave hands on the NVIDIA Isaac GR00T Reference Humanoid Robot, used by research labs including Ai2, ETH Zurich, Stanford Robotics Center and UC San Diego (2026)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.sharpa.com/',
        title: 'Sharpa company site (first-party)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.prnewswire.com/news-releases/sharpa-brings-dexterous-tactile-manipulation-to-the-nvidia-isaac-gr00t-reference-humanoid-robot-302787201.html',
        title: 'Sharpa Brings Dexterous, Tactile Manipulation to the NVIDIA Isaac GR00T Reference Humanoid Robot (PR Newswire)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design',
        title: 'NVIDIA Announces NVIDIA Isaac GR00T Reference Humanoid Robot for Academic Research (NVIDIA Newsroom)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://roboticsandautomationnews.com/2026/01/31/sharpa-showcases-autonomous-fine-manipulation-robot-and-new-ai-model-at-ces-2026/',
        title: 'Sharpa showcases autonomous fine-manipulation robot and new AI model at CES 2026 (Robotics & Automation News)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Sharpa and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
        basis: 'Its own release calls it a unicorn, a valuation of at least $1 billion; no fetched source states a figure or the round behind it.',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'wonik-robotics',
    name: 'Wonik Robotics',
    aka: [
      'SimLab',
    ],
    website: 'https://wonikrobotics.com',
    logo: 'wonik-logo',
    hq: {
      city: 'Seongnam',
      country: 'KR',
    },
    founded: 2004,
    segment: 'components-hardware',
    subSegment: 'dexterous-hands',
    description: 'Makes the Allegro Hand robotic hand for manipulation research and humanoid development, plus autonomous mobile robots and mobile manipulators for factory automation; it joined the WONIK Group in 2016.',
    approach: [
      'dexterous-hands',
      'research-automation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [
      'Allegro Hand with Meta FAIR\'s Digit Plexus tactile platform, which Wonik manufactures and distributes (announced November 2024)',
      'Airporter cart robots at Incheon International Airport (2019)',
      'Allegro Dog quadruped supplied to the U.S. Naval Research Laboratory (2013)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.allegrohand.com/',
        title: 'Allegro Hand - Wonik Robotics',
        asOf: '2026-08-06',
      },
      {
        url: 'https://wonikrobotics.com/index.php',
        title: 'Wonik Robotics (corporate site: Allegro Hand maker)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.therobotreport.com/gelsight-meta-ai-release-digit-360-tactile-sensor-for-robotic-fingers/',
        title: 'GelSight, Meta AI release Digit 360 tactile sensor for robotic fingers (The Robot Report)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://wonikrobotics.com/en/',
        title: 'Wonik Robotics (English site)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://wonikrobotics.com/en/sub/company/overview.php',
        title: 'Company Overview (Wonik Robotics)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://wonikrobotics.com/en/sub/company/history.php',
        title: 'Company History (Wonik Robotics)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://wonikrobotics.com/en/sub/company/location.php',
        title: 'Directions (Wonik Robotics)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'xela-robotics',
    name: 'XELA Robotics',
    aka: [],
    website: 'https://www.xelarobotics.com',
    logo: 'xela-robotics-logo',
    hq: {
      city: 'Tokyo',
      country: 'JP',
    },
    founded: 2018,
    segment: 'components-hardware',
    subSegment: 'tactile-sensors',
    description: 'Builds uSkin 3D tactile sensors and uAi software that give robot hands and grippers a sense of touch, for humanoid and industrial robots; a 2018 spin-out of Waseda University.',
    approach: [
      '3d-tactile-sensors',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Strategic investment',
      amountUsd: null,
      date: '2026-04-29',
      valuationUsd: null,
      leadInvestors: [
        'Plug and Play',
      ],
      sourceUrl: 'https://sg.finance.yahoo.com/news/xela-robotics-deepens-u-market-123000348.html',
    },
    status: 'private',
    deployments: [
      'More than 170 clients (2026)',
      'uSkin integrations for robot hands and grippers from Wonik Robotics, Sake Robotics, Weiss Robotics and Robotiq',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://xelarobotics.com/press-release/xela-robotics-unlocks-enhanced-automation-for-humanoid-and-industrial',
        title: 'XELA Robotics Unlocks Enhanced Automation',
        asOf: '2026-08-06',
      },
      {
        url: 'https://xelarobotics.com/about/',
        title: 'About Us (XELA Robotics)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://sg.finance.yahoo.com/news/xela-robotics-deepens-u-market-123000348.html',
        title: 'XELA Robotics Deepens U.S. Market Commitment with Plug and Play Investment (PR Newswire via Yahoo Finance, 2026-04-29)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it XELA Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
        basis: 'Plug and Play did not disclose the amount of its investment.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'openai-robotics',
    name: 'OpenAI (Robotics)',
    aka: [],
    website: 'https://openai.com',
    logo: 'openai-logo',
    hq: {
      city: 'San Francisco',
      country: 'US',
    },
    founded: 2015,
    segment: 'simulation-tooling',
    subSegment: 'foundation-models',
    description: 'Shut its first robotics effort in 2021 and is building a new robotics team: it has hired researchers who work on AI for humanoid and other robots, and its job listings seek teleoperation, simulation and robot-hardware skills.',
    approach: [
      'robotics-foundation-models',
      'hardware',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.wired.com/story/openai-ramps-up-robotics-work-in-race-toward-agi/',
        title: 'OpenAI Ramps Up Robotics Work',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/OpenAI',
        title: 'OpenAI - Wikipedia',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it OpenAI and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-applicable',
        basis: 'OpenAI\'s robotics team, funded by OpenAI: it has no venture total of its own.',
      },
      'round.type': {
        state: 'not-applicable',
        basis: 'OpenAI\'s robotics team, funded by OpenAI: it raises no rounds of its own.',
      },
      'round.amountUsd': {
        state: 'not-applicable',
        basis: 'OpenAI\'s robotics team, funded by OpenAI: it raises no rounds of its own.',
      },
      'round.date': {
        state: 'not-applicable',
        basis: 'OpenAI\'s robotics team, funded by OpenAI: it raises no rounds of its own.',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'OpenAI\'s robotics team, funded by OpenAI: it raises no rounds of its own.',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'OpenAI\'s robotics team, funded by OpenAI: it raises no rounds of its own.',
      },
    },
  },
  {
    id: 'meta-robotics',
    name: 'Meta (Robotics)',
    aka: [
      'Meta Platforms',
      'Facebook',
    ],
    website: 'https://www.meta.com',
    logo: 'meta-logo',
    hq: {
      city: 'Menlo Park',
      country: 'US',
    },
    founded: 2004,
    segment: 'simulation-tooling',
    subSegment: 'foundation-models',
    description: 'Bought the humanoid-robot AI startup Assured Robot Intelligence in May 2026 to build up its AI models for robots; ARI\'s team joined Meta\'s Superintelligence Labs.',
    approach: [
      'physical-ai-models',
      'acqui-hire',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: null,
      date: '2026-05-01',
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://techcrunch.com/2026/05/01/meta-buys-robotics-startup-to-bolster-its-humanoid-ai-ambitions/',
        title: 'Meta buys robotics startup for humanoid AI',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Meta_Platforms',
        title: 'Meta Platforms - Wikipedia',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-applicable',
        basis: 'Meta\'s robotics work, funded by Meta: it has no venture total of its own.',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'The latest event is a purchase by Meta, which has a buyer and no lead investors.',
      },
    },
  },
  {
    id: 'assured-robot-intelligence',
    name: 'Assured Robot Intelligence',
    aka: [
      'ARI',
    ],
    website: null,
    logo: 'assured-robot-intelligence-logo',
    hq: {
      city: 'San Diego',
      country: 'US',
    },
    founded: null,
    segment: 'foundation-models',
    subSegment: 'generalist-manipulation-policies',
    description: 'Built foundation models for humanoid robots to do physical labor such as household chores; Meta bought it in May 2026 and its team joined Meta\'s Superintelligence Labs.',
    approach: [
      'robot-ai-models',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: null,
      date: '2026-05-01',
      valuationUsd: null,
      leadInvestors: [
        'Meta',
      ],
    },
    status: 'acquired',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://techcrunch.com/2026/05/01/meta-buys-robotics-startup-to-bolster-its-humanoid-ai-ambitions/',
        title: 'Meta buys Assured Robot Intelligence',
        asOf: '2026-08-06',
      },
      {
        url: 'https://web.archive.org/web/20260505070600/https://www.arirobots.com/',
        title: 'ARI - Frontier AI for Robots (the company\'s own site, arirobots.com, in the Wayback Machine capture of 2026-05-05; the domain no longer resolves)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://siliconangle.com/2026/05/01/meta-acquires-robot-software-startup-assured-robot-intelligence/',
        title: 'Meta acquires robot software startup Assured Robot Intelligence (SiliconANGLE, 2026-05-01)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'founded': {
        state: 'not-disclosed',
      },
      'website': {
        state: 'not-applicable',
        basis: 'Meta bought it in May 2026; arirobots.com, its own site in the Wayback Machine capture of 5 May 2026, no longer resolves (checked 20 October 2026).',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources (its website returned no readable body).',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'saronic',
    name: 'Saronic',
    aka: [],
    website: 'https://www.saronic.com',
    logo: 'saronic-logo',
    hq: {
      city: 'Austin',
      country: 'US',
    },
    founded: 2022,
    segment: 'vertical-applications',
    subSegment: 'defense',
    description: 'Designs and builds autonomous surface vessels for defense and commercial use, from the 24-foot Corsair to the 180-foot Marauder, in its own shipyards.',
    approach: [
      'autonomous-maritime',
      'defense',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series D',
      amountUsd: 1750000000,
      date: '2026-03-31',
      valuationUsd: 9250000000,
      leadInvestors: [
        'Kleiner Perkins',
      ],
      sourceUrl: 'https://www.prnewswire.com/news-releases/saronic-closes-1-75b-series-d-at-9-25b-valuation-to-accelerate-a-new-era-of-maritime-autonomy-302729238.html',
    },
    status: 'private',
    deployments: [
      'U.S. Navy production contract for its vessels, worth $392 million (2025)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.govconwire.com/articles/saronic-1-75b-series-d-maritime-autonomy',
        title: 'Saronic Raises $1.75B in Series D Funding Round (GovConWire, 2026-04-01; Kleiner Perkins-led)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.prnewswire.com/news-releases/saronic-closes-1-75b-series-d-at-9-25b-valuation-to-accelerate-a-new-era-of-maritime-autonomy-302729238.html',
        title: 'Saronic Closes $1.75B Series D at $9.25B Valuation to Accelerate a New Era of Maritime Autonomy (PR Newswire, 2026-03-31)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.opulentia.vc/portfolio/saronic/',
        title: 'Saronic (Opulentia portfolio page)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Saronic and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'eka-robotics',
    name: 'Eka Robotics',
    aka: [],
    website: 'https://www.ekarobotics.com',
    logo: 'eka-robotics-logo',
    hq: {
      city: 'Cambridge',
      country: 'US',
    },
    founded: null,
    segment: 'foundation-models',
    subSegment: 'dexterous-manipulation',
    description: 'Teaches robots dexterous manipulation by having them practise in simulation and carry the skill to real robots; co-founded by MIT professor Pulkit Agrawal and former Google DeepMind researcher Tuomas Haarnoja.',
    approach: [
      'dexterous-manipulation',
      'research-to-commercial',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6',
        title: 'Obvious Ventures backed Eka Robotics',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.wired.me/story/ive-covered-robots-for-years-this-one-is-different',
        title: 'I\'ve Covered Robots for Years. This One Is Different (WIRED Middle East, 2026-04-30)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'founded': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Eka Robotics and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'foundry-robotics',
    name: 'Foundry Robotics',
    aka: [],
    website: 'https://foundryrobotics.ai',
    logo: 'foundry-robotics-logo',
    hq: {
      city: null,
      country: 'US',
    },
    founded: null,
    segment: 'vertical-applications',
    subSegment: 'industrial-cobots',
    description: 'Develops robots to automate factory assembly tasks.',
    approach: [
      'factory-assembly-automation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Seed',
      amountUsd: 19000000,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.remixreality.com/foundry-robotics-raises-19-million-to-build-ai-first-robotics-for-manufacturing/',
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6',
        title: 'Red Glass Ventures backed Foundry Robotics',
        asOf: '2026-08-06',
      },
      {
        url: 'https://foundryrobotics.ai/',
        title: 'Foundry Robotics (company site: AI-first, assembly-focused robotics for American manufacturing)',
        asOf: '2026-10-19',
      },
      {
        url: 'https://www.remixreality.com/foundry-robotics-raises-19-million-to-build-ai-first-robotics-for-manufacturing/',
        title: 'Foundry Robotics Raises $19 Million to Build AI-First Robotics for Manufacturing (Remix Reality, 2026-04-10)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://garuda.substack.com/p/foundry',
        title: 'Foundry Robotics: Powering American Manufacturing for the Next Century (Garuda Ventures, 2026-03-10)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'hq.city': {
        state: 'not-disclosed',
      },
      'founded': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Foundry Robotics and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'mytra',
    name: 'Mytra',
    aka: [],
    website: 'https://mytra.ai',
    logo: 'mytra-logo',
    hq: {
      city: 'Brisbane',
      country: 'US',
    },
    founded: 2022,
    segment: 'industrial-logistics',
    subSegment: 'warehouse-automation',
    description: 'Builds software-defined warehouse automation: a pallet-size robot that moves goods through a matrix of three-dimensional storage cells.',
    approach: [
      'modular-3d-storage',
      'warehouse-automation',
    ],
    totalRaisedUsd: 200000000,
    latestRound: {
      type: 'Series C',
      amountUsd: 120000000,
      date: '2026-01-15',
      valuationUsd: null,
      leadInvestors: [
        'Avenir Growth',
      ],
      sourceUrl: 'https://mytra.ai/news/mytra-raises-120m-series-c',
    },
    status: 'private',
    deployments: [
      'Customers include a Fortune 100 food company and a Fortune 500 industrial-supply distributor (January 2026)',
      'Albertsons Companies, among the grocers and retailers it serves',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://mytra.ai/news/mytra-raises-120m-series-c',
        title: 'Mytra Raises $120M Series C led by Avenir Growth (first-party)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.prnewswire.com/news-releases/mytra-raises-120m-series-c-to-scale-operating-system-for-supply-chain-302661685.html',
        title: 'Mytra Raises $120M Series C to Scale Operating System for Supply Chain (PR Newswire)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://mytra.ai/company/',
        title: 'Company (Mytra)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://mytra.ai/news/mytra-announces-expansion-and-new-headquarters-with-brisbane-california-campus',
        title: 'Mytra Announces Expansion and New Headquarters with Brisbane, California Campus (Mytra, 2025-06-26)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Mytra and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'formic',
    name: 'Formic',
    aka: [],
    website: 'https://formic.co',
    logo: 'formic-logo',
    hq: {
      city: 'Chicago',
      country: 'US',
    },
    founded: 2020,
    segment: 'vertical-applications',
    subSegment: 'industrial-cobots',
    description: 'Provides robotics-as-a-service for manufacturers to deploy automation without upfront equipment costs.',
    approach: [
      'raas',
      'manufacturing-automation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series A extension',
      amountUsd: 27400000,
      date: '2024-06-25',
      valuationUsd: null,
      leadInvestors: [
        'Blackhorn Ventures',
      ],
      sourceUrl: 'https://www.therobotreport.com/formic-brings-in-27-4m-to-expand-its-global-fleet-increase-support-network/',
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6',
        title: 'Lux Capital backed Formic',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.therobotreport.com/formic-brings-in-27-4m-to-expand-its-global-fleet-increase-support-network/',
        title: 'Formic brings in $27.4M to expand its global fleet, increase support network (The Robot Report, 2024-06-25)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://formic.co/about',
        title: 'About (Formic)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Formic and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'astribot',
    name: 'Astribot',
    aka: [
      '星尘智能',
    ],
    website: 'https://www.astribot.com',
    logo: 'astribot-logo',
    hq: {
      city: 'Shenzhen',
      country: 'CN',
    },
    founded: 2022,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds cable-driven humanoid robots, the Astribot S1 and T1, which run its own Lumo AI foundation model.',
    approach: [
      'cable-driven',
      'humanoid',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series B',
      amountUsd: null,
      date: '2026-06-03',
      valuationUsd: null,
      leadInvestors: [],
      caveat: {
        text: 'Pandaily reports that the Series B pushed Astribot\'s valuation past 10 billion yuan (about $1.4 billion) and that its three rounds in three months raised over 1 billion yuan; no exact amount or valuation is given.',
        sourceUrls: [
          'https://pandaily.com/astribot-billion-dollar-valuation-series-b-jun2026/',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Deliveries in the thousands by the end of 2025',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://pandaily.com/astribot-billion-dollar-valuation-series-b-jun2026/',
        title: 'Astribot closes Series B over 1 billion RMB (~$138M) at a valuation north of 10B RMB (~$1.38B)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'medium',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'booster-robotics',
    name: 'Booster Robotics',
    aka: [],
    website: 'https://www.booster.tech',
    logo: 'booster-robotics-logo',
    hq: {
      city: null,
      country: 'CN',
    },
    founded: 2023,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds humanoid robots, the K1 and T2 among them, for developers, schools, research labs and robot-soccer teams; teams using its robots won RoboCup humanoid titles in 2025 and 2026.',
    approach: [
      'humanoid',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: '2026-04-17',
      valuationUsd: null,
      leadInvestors: [
        'Beijing High-Tech Industries Investment Fund',
        'Jingguosheng Fund',
        'Huakong Fund',
      ],
      sourceUrl: 'https://www.booster.tech/about-us?target=en',
      caveat: {
        text: 'Booster says its April 2026 round raised nearly $150 million; it gives no exact amount.',
        sourceUrls: [
          'https://www.booster.tech/about-us?target=en',
        ],
      },
    },
    status: 'private',
    deployments: [
      'More than 700 humanoid robots delivered to more than 200 customers, over half of them outside China (November 2025)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.sohu.com/a/975073436_116132',
        title: 'TMTPost: Booster Robotics raises over $14M led by IDG Capital',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.booster.tech/about-us?target=en',
        title: 'About Us (Booster Robotics)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.booster.tech/news?target=en',
        title: 'News Center (Booster Robotics)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'hq.city': {
        state: 'not-disclosed',
      },
      'aka': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'leju-robotics',
    name: 'Leju Robotics',
    aka: [
      'Leju (Shenzhen) Robotics Co., Ltd.',
    ],
    website: 'https://www.lejurobot.com',
    logo: 'leju-robotics-logo',
    hq: {
      city: 'Shenzhen',
      country: 'CN',
    },
    founded: 2016,
    segment: 'humanoids',
    subSegment: 'research-humanoids',
    description: 'Builds humanoid robots, from the small AELOS and ROBAN models to the full-size KUAVO, as well as robots for education; it was spun out of the Harbin Institute of Technology in 2016.',
    approach: [
      'educational-humanoid',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: 200000000,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.therobotreport.com/leju-raises-200m-humanoid-production-unitree-unveils-h2/',
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/leju-raises-200m-humanoid-production-unitree-unveils-h2/',
        title: 'Leju raises $200M for humanoid production',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'medium',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'switchbot',
    name: 'SwitchBot',
    aka: [
      'OneRobotics (Shenzhen) Co., Ltd.',
    ],
    website: 'https://www.switch-bot.com',
    logo: 'switchbot-logo',
    hq: {
      city: 'Shenzhen',
      country: 'CN',
    },
    founded: 2015,
    segment: 'vertical-applications',
    subSegment: 'consumer-home',
    description: 'Makes the SwitchBot line of home-automation gadgets, such as curtain openers and door locks, and has added AI home robots, among them a wheeled humanoid for household tasks.',
    approach: [
      'smart-home',
      'consumer-robotics',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'IPO',
      amountUsd: 206000000,
      date: '2025-12-30',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.caixinglobal.com/2025-12-31/smart-home-startup-onerobotics-lands-206-million-in-hk-ipo-bets-big-on-ai-bots-102398920.html',
    },
    status: 'public',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.caixinglobal.com/2025-12-31/smart-home-startup-onerobotics-lands-206-million-in-hk-ipo-bets-big-on-ai-bots-102398920.html',
        title: 'Smart-Home Startup OneRobotics Lands $206 Million in HK IPO',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'medium',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'hanson-robotics',
    name: 'Hanson Robotics',
    aka: [],
    website: 'https://www.hansonrobotics.com',
    logo: 'hanson-robotics-logo',
    hq: {
      city: 'Hong Kong',
      country: 'HK',
    },
    founded: 2007,
    segment: 'humanoids',
    subSegment: 'research-humanoids',
    description: 'Builds expressive humanoid robots for research, demonstrations and public engagement with AI; its best-known robot is Sophia.',
    approach: [
      'expressive-humanoid',
      'social-robotics',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://en.wikipedia.org/wiki/Hanson_Robotics',
        title: 'Hanson Robotics (Wikipedia)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Hanson Robotics and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'paxini',
    name: 'PaXini',
    aka: [
      'PaXini Tech',
      '帕西尼感知科技',
    ],
    website: 'https://www.paxini.com',
    logo: 'paxini-logo',
    hq: {
      city: 'Shenzhen',
      country: 'CN',
    },
    founded: 2021,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Builds tactile-sensing chips, dexterous hands, and the TORA humanoid robot.',
    approach: [
      'tactile-sensing',
      'humanoid',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Strategic',
      amountUsd: null,
      date: '2026-08-03',
      valuationUsd: null,
      leadInvestors: [
        'BOC International Investment',
        'Kunpeng Fund',
        'Hexin Fangce',
      ],
      sourceUrl: 'https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/',
      caveat: {
        text: 'PaXini says its August 2026 strategic round raised RMB1 billion, taking its total to RMB3.5 billion, and that an unnamed consumer-electronics and semiconductor group co-led it; no dollar figures are given.',
        sourceUrls: [
          'https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Nearly 1 million tactile-sensing chips shipped in the year to August 2026',
      'Tora-One humanoid deployed at Geely\'s Qiantang plant on wiring-harness assembly (2026)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://equalocean.com/news/2026030921782-pacini-completes-rmb-1-billion-series-b-financing',
        title: 'PaXini completes RMB 1B+ Series B at over RMB 10B valuation',
        asOf: '2026-08-18',
      },
      {
        url: 'https://technode.com/2026/08/04/embodied-ai-startup-paxini-raises-rmb1-billion-to-scale-tactile-sensing-technology/',
        title: 'PaXini raises RMB1B strategic round; cumulative RMB3.5B',
        asOf: '2026-08-18',
      },
      {
        url: 'https://cnevpost.com/2026/06/03/robotics-firm-paxini-weighs-hk-ipo/',
        title: 'BYD-backed PaXini weighs HK IPO ($148M March round)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'medium',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'miso-robotics',
    name: 'Miso Robotics',
    aka: [],
    website: 'https://misorobotics.com',
    logo: 'miso-robotics-logo',
    hq: {
      city: 'Los Angeles',
      country: 'US',
    },
    founded: 2016,
    segment: 'vertical-applications',
    subSegment: 'food-kitchen',
    description: 'Makes Flippy, an AI-powered robotic arm that cooks fried food in fast-food kitchens, and Zippy, a restaurant operations dashboard built from Zignyl, which it bought in 2026.',
    approach: [
      'autonomous-kitchen',
      'fast-food-automation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [
      'Flippy working in seven US states after about a dozen installations in a year (February 2026)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.restaurantbusinessonline.com/technology/flippy-maker-miso-robotics-acquires-operations-app-zignyl',
        title: 'Flippy maker Miso Robotics acquires operations app Zignyl (Restaurant Business, 2026-02-26)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Miso Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'starship-technologies',
    name: 'Starship Technologies',
    aka: [],
    website: 'https://www.starship.xyz',
    logo: 'starship-logo',
    hq: {
      city: 'San Francisco',
      country: 'US',
    },
    founded: 2014,
    segment: 'vertical-applications',
    subSegment: 'delivery',
    description: 'Builds and runs sidewalk robots for last-mile delivery of food and groceries; Skype co-founders Ahti Heinla and Janus Friis founded it in Tallinn in 2014.',
    approach: [
      'sidewalk-delivery',
      'autonomous',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series C',
      amountUsd: 50000000,
      date: '2025-10-15',
      valuationUsd: null,
      leadInvestors: [
        'Plural',
      ],
      sourceUrl: 'https://finance.yahoo.com/news/starship-technologies-raises-50m-series-130500240.html',
      caveat: {
        text: 'Starship says it has raised more than $280 million in total; it gives no exact figure.',
        sourceUrls: [
          'https://finance.yahoo.com/news/starship-technologies-raises-50m-series-130500240.html',
        ],
      },
    },
    status: 'private',
    deployments: [
      'More than 2,700 robots at more than 270 locations in seven countries, with over 9 million deliveries (October 2025)',
      'Delivery partnerships with Grubhub in the US and with Bolt, Wolt and Foodora in Europe',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.starship.xyz/',
        title: 'Starship Technologies - Autonomous Delivery Robots',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Starship_Technologies',
        title: 'Starship Technologies (Wikipedia)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://finance.yahoo.com/news/starship-technologies-raises-50m-series-130500240.html',
        title: 'Starship Technologies Raises $50M Series C to Scale Autonomous Delivery Across U.S. Cities (its Business Wire release, via Yahoo Finance, 2025-10-15)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Starship Technologies and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'coco-robotics',
    name: 'Coco',
    aka: [
      'Coco Robotics',
    ],
    website: 'https://www.cocodelivery.com',
    logo: 'coco-robotics-logo',
    hq: {
      city: 'Santa Monica',
      country: 'US',
    },
    founded: 2020,
    segment: 'vertical-applications',
    subSegment: 'delivery',
    description: 'Runs a fleet of sidewalk delivery robots that drive themselves under remote human supervision, carrying orders for platforms such as Uber and DoorDash.',
    approach: [
      'autonomous-delivery',
      'last-mile',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Strategic',
      amountUsd: 80000000,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.therobotreport.com/coco-robotics-raises-80m-to-scale-sidewalk-delivery-robots/',
    },
    status: 'private',
    deployments: [
      'More than 500,000 deliveries in Los Angeles, Chicago, Miami and Helsinki (June 2025)',
      'Its robots take DoorDash orders in Los Angeles and Chicago (2025)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/coco-robotics-raises-80m-to-scale-sidewalk-delivery-robots/',
        title: 'Coco Robotics raises $80M to scale sidewalk delivery robots',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.cocodelivery.com/',
        title: 'Coco Robotics - Home (first-party; the company\'s current domain)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'medium',
    absent: {
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'knightscope',
    name: 'Knightscope',
    aka: [],
    website: 'https://www.knightscope.com',
    logo: 'knightscope-logo',
    hq: {
      city: 'Mountain View',
      country: 'US',
    },
    founded: 2013,
    segment: 'vertical-applications',
    subSegment: 'security',
    description: 'Builds autonomous security robots, such as the K5, and runs them with software and human agents to patrol sites such as retail lots, hospital campuses and casinos.',
    approach: [
      'autonomous-security',
      'patrol-robots',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [
      'Deployed in 42 U.S. states',
      'Sites include retail lots, hospital campuses, residential communities, casinos and utility sites',
      'Clients have included Microsoft, Uber, Juniper Networks, the Sacramento Kings, LaGuardia Airport and NBC Universal (as of 2017)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.knightscope.com/',
        title: 'Knightscope - Autonomous Security Robots',
        asOf: '2026-08-06',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Knightscope',
        title: 'Knightscope (Wikipedia)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Knightscope and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'brain-corp',
    name: 'Brain Corp',
    aka: [],
    website: 'https://www.braincorp.com',
    logo: 'brain-corp-logo',
    hq: {
      city: 'San Diego',
      country: 'US',
    },
    founded: 2009,
    segment: 'vertical-applications',
    subSegment: 'cleaning',
    description: 'Makes BrainOS, autonomy software that robot makers such as Tennant and Nilfisk license to build floor-cleaning, inventory-scanning and other autonomous robots.',
    approach: [
      'ai-cleaning-platform',
      'autonomous-floor-care',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'private',
    deployments: [
      'More than 50,000 BrainOS-powered robots worldwide (2026)',
      'Customers include Walmart and Kroger (2020)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.braincorp.com/',
        title: 'Brain Corp - AI for Autonomous Floor Care',
        asOf: '2026-08-06',
      },
      {
        url: 'https://vcnewsdaily.com/brain-corp/venture-capital-funding/klcvvqtpvz',
        title: 'Brain Corp Raises $36M in Series D, led by SoftBank Vision Fund 1 with Qualcomm Ventures (VC News Daily)',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Brain Corp and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.type': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'pollen-robotics',
    name: 'Pollen Robotics',
    aka: [],
    website: 'https://www.pollen-robotics.com',
    logo: 'pollen-robotics-logo',
    hq: {
      city: 'Bordeaux',
      country: 'FR',
    },
    founded: 2016,
    segment: 'simulation-tooling',
    subSegment: 'open-source-frameworks',
    description: 'Builds open-source expressive robots, among them the Reachy 2 humanoid, the Reachy Mini companion robot and the Microduck biped; Hugging Face bought it in 2025.',
    approach: [
      'open-source',
      'research-education',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: null,
      date: '2025-04-14',
      valuationUsd: null,
      leadInvestors: [
        'Hugging Face',
      ],
      sourceUrl: 'https://huggingface.co/blog/hugging-face-pollen-robotics-acquisition',
    },
    status: 'acquired',
    deployments: [
      'More than 10,000 robots shipped worldwide, by its own count (2026)',
      'Reachy 2 in use in labs such as Cornell and Carnegie Mellon (2025)',
    ],
    openSource: [
      'Reachy 2',
      'Reachy Mini',
    ],
    sources: [
      {
        url: 'https://pollen-robotics.com/reachy-mini/',
        title: 'Reachy Mini - Open source companion robot',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.pollen-robotics.com/about-us/',
        title: 'About us (Pollen Robotics)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://huggingface.co/blog/hugging-face-pollen-robotics-acquisition',
        title: 'Hugging Face to sell open-source robots thanks to Pollen Robotics acquisition (Hugging Face blog, 2025-04-14)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Pollen Robotics and give no other name.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'diligent-robotics',
    name: 'Diligent Robotics',
    aka: [],
    website: 'https://www.diligentrobots.com',
    logo: 'diligent-robotics-logo',
    hq: {
      city: 'Austin',
      country: 'US',
    },
    founded: 2017,
    segment: 'vertical-applications',
    subSegment: 'healthcare',
    description: 'Builds Moxi, a hospital service robot for non-patient-facing tasks like delivering supplies and lab samples; acquired by Serve Robotics.',
    approach: [
      'hospital-service-robot',
      'mobile-manipulation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: 29000000,
      date: '2026-01-20',
      valuationUsd: null,
      leadInvestors: [
        'Serve Robotics',
      ],
      sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1832483/000121390026009480/ea0274698-8k_serve.htm',
      caveat: {
        text: 'Serve\'s filing says the $29.0 million it paid in stock includes a potential $5.3 million earnout and is subject to adjustments; The Robot Report described the earnout as coming on top of the $29 million.',
        sourceUrls: [
          'https://www.sec.gov/Archives/edgar/data/1832483/000121390026009480/ea0274698-8k_serve.htm',
          'https://www.therobotreport.com/serve-robotics-acquires-diligent-robotics/',
        ],
      },
    },
    status: 'acquired',
    deployments: [
      'Nearly 100 Moxi robots in more than 25 hospitals, with over 1.25 million deliveries (January 2026)',
      'Customers include Northwestern Medicine, ChristianaCare and Rochester General Hospital',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/serve-robotics-acquires-diligent-robotics/',
        title: 'Serve Robotics acquires Diligent Robotics (The Robot Report, 2026-01-20)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.diligentrobots.com/moxi',
        title: 'Moxi - Diligent Robotics',
        asOf: '2026-08-06',
      },
      {
        url: 'https://www.sec.gov/Archives/edgar/data/1832483/000121390026005920/ea027345401ex99-1_serve.htm',
        title: 'Serve Robotics to Acquire Diligent Robotics (Serve\'s release of 20 January 2026, exhibit 99.1 to its Form 8-K)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://www.sec.gov/Archives/edgar/data/1832483/000121390026009480/ea0274698-8k_serve.htm',
        title: 'Serve Robotics Form 8-K on completing the Diligent Robotics acquisition (filed 29 January 2026)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Diligent Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'fox-robotics',
    name: 'Fox Robotics',
    aka: [],
    website: 'https://www.foxrobotics.com',
    logo: 'fox-robotics-logo',
    hq: {
      city: 'Austin',
      country: 'US',
    },
    founded: 2017,
    segment: 'industrial-logistics',
    subSegment: 'mobile-robots',
    description: 'Builds the FoxBot, an autonomous forklift that loads and unloads trailers at warehouse docks; Symbotic bought it in 2026.',
    approach: [
      'autonomous-forklifts',
      'dock-operations',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [
        'Symbotic',
      ],
    },
    status: 'acquired',
    deployments: [
      'More than 100 FoxBot forklifts at 54 customer sites in the US and Canada, by its own count; Symbotic\'s CEO put it at 25 customers, mostly pilots (February 2026)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.therobotreport.com/symbotic-acquires-autonomous-forklift-maker-fox-robotics/',
        title: 'Symbotic acquires Fox Robotics',
        asOf: '2026-08-06',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Fox Robotics and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.date': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'zebra-robotics-automation',
    name: 'Zebra Technologies (Robotics Automation)',
    aka: [],
    website: 'https://www.zebra.com',
    logo: 'zebra-robotics-automation-logo',
    hq: {
      city: 'Lincolnshire',
      country: 'US',
    },
    founded: 1969,
    segment: 'industrial-logistics',
    subSegment: 'warehouse-automation',
    description: 'Zebra\'s robotics automation business, whose Symmetry Fulfillment platform coordinates tasks between robots and frontline workers using Zebra wearable devices; Skild AI bought it in April 2026.',
    approach: [
      'warehouse-orchestration',
      'fulfillment',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Divestiture',
      amountUsd: null,
      date: '2026-04-15',
      valuationUsd: null,
      leadInvestors: [
        'Skild AI',
      ],
    },
    status: 'acquired',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.zebra.com/us/en/about-zebra/newsroom/press-releases/2026/skild-ai-acquires-zebra-technologies--robotics-automation-busine.html',
        title: 'Skild AI Acquires Zebra Technologies\' Robotics Automation Business',
        asOf: '2026-08-18',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Zebra Technologies and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.amountUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'anduril',
    name: 'Anduril',
    aka: [],
    website: 'https://www.anduril.com',
    logo: 'anduril-logo',
    hq: {
      city: 'Costa Mesa',
      country: 'US',
    },
    founded: 2017,
    segment: 'vertical-applications',
    subSegment: 'defense',
    description: 'Builds autonomous systems for the U.S. and allied militaries, such as drones, autonomous submarines and sentry towers, run by its Lattice software.',
    approach: [
      'defense-autonomy',
      'ai-military-systems',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Series H',
      amountUsd: 5000000000,
      date: '2026-05-13',
      valuationUsd: 61000000000,
      leadInvestors: [
        'Thrive Capital',
        'Andreessen Horowitz',
      ],
      sourceUrl: 'https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/',
      caveat: {
        text: 'TechCrunch reports that Anduril has raised more than $11 billion in total; it gives no exact figure.',
        sourceUrls: [
          'https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/',
        ],
      },
    },
    status: 'private',
    deployments: [
      'Its president has said it is a heavy participant in the Middle East conflict (2026)',
      'A U.S. Army contract for Lattice battle-manager software and a Dutch Ministry of Defence contract (May 2026)',
    ],
    openSource: [],
    sources: [
      {
        url: 'https://www.businessinsider.com/investors-to-know-in-robotics-and-physical-ai-2026-6',
        title: 'Meet the 22 investors to know in robotics and physical AI (Business Insider, June 2026)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/',
        title: 'Anduril raises $5B, doubles valuation to $61B (TechCrunch, 2026-05-13)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Anduril_Industries',
        title: 'Anduril Industries (Wikipedia)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Anduril and give no other name.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'robotphoenix',
    name: 'Robotphoenix',
    aka: [
      'Robotphoenix Intelligent Technology Co., Ltd.',
      '浙江翼菲智能科技股份有限公司',
    ],
    website: 'https://www.robotphoenix.com',
    logo: 'robotphoenix-logo',
    hq: {
      city: 'Yuhuan',
      country: 'CN',
    },
    founded: 2012,
    segment: 'industrial-logistics',
    subSegment: 'industrial-robots',
    description: 'Makes industrial robots, among them delta, SCARA and six-axis models, and robotics systems for light-industry production lines; it listed in Hong Kong in May 2026.',
    approach: [
      'lightweight-industrial-robots',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'IPO',
      amountUsd: 96000000,
      date: '2026-05-18',
      valuationUsd: null,
      leadInvestors: [],
      sourceUrl: 'https://www.bakermckenzie.com/en/newsroom/2026/05/robotphoenix-hk-ipo',
    },
    status: 'public',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.bakermckenzie.com/en/newsroom/2026/05/robotphoenix-hk-ipo',
        title: 'Baker McKenzie Advises Robotphoenix Intelligent Technology on Hong Kong Main Board Listing (Baker McKenzie, 2026-05-20)',
        asOf: '2026-10-20',
      },
      {
        url: 'https://news.pedaily.cn/202605/563989.shtml',
        title: '翼菲科技：从自动化到工业机器人，十年耕耘迎来港股 IPO 的硬核玩家 (PEdaily, 2026-05-18)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
      'round.leadInvestors': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'abb-robotics',
    name: 'ABB Robotics',
    aka: [],
    website: 'https://www.abb.com',
    logo: 'abb-logo',
    hq: {
      city: 'Zurich',
      country: 'CH',
    },
    founded: 1988,
    segment: 'industrial-logistics',
    subSegment: 'industrial-robots',
    description: 'Makes industrial and collaborative robots, autonomous mobile robots and controllers; SoftBank agreed in October 2025 to buy the business from ABB for $5.375 billion.',
    approach: [
      'industrial-robots',
      'automation',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Acquisition',
      amountUsd: 5375000000,
      date: '2025-10-08',
      valuationUsd: null,
      leadInvestors: [
        'SoftBank Group',
      ],
      caveat: {
        text: 'SoftBank agreed on 8 October 2025 to buy ABB\'s robotics business; both companies expected the deal to close in mid-to-late 2026, and no fetched source reports that it has closed.',
        sourceUrls: [
          'https://group.softbank/en/news/press/20251008',
          'https://www.abb.com/global/en/news/129685/abb-to-divest-robotics-division-to-softbank-group',
        ],
      },
    },
    status: 'public',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://group.softbank/en/news/press/20251008',
        title: 'Acquisition of ABB Ltd\'s Robotics Business (SoftBank Group press release, 2025-10-08)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.abb.com/global/en/news/129685/abb-to-divest-robotics-division-to-softbank-group',
        title: 'ABB to divest Robotics division to SoftBank Group (ABB, 2025-10-08)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'high',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it ABB Robotics and give no other name.',
      },
      'deployments': {
        state: 'not-disclosed',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-disclosed',
      },
      'round.valuationUsd': {
        state: 'not-disclosed',
      },
    },
  },
  {
    id: 'mitsubishi-robotics',
    name: 'Mitsubishi Motors',
    aka: [],
    website: 'https://www.mitsubishi-motors.com/en/',
    logo: 'mitsubishi-logo',
    hq: {
      city: 'Tokyo',
      country: 'JP',
    },
    founded: 1970,
    segment: 'humanoids',
    subSegment: 'industrial-humanoids',
    description: 'Mitsubishi Motors plans to mass-produce AI humanoid robots designed by the Tokyo startup Highlanders on an unused engine line at its Kyoto plant from the first half of 2027, up to 1,000 a month.',
    approach: [
      'mass-production',
      'factory-conversion',
    ],
    totalRaisedUsd: null,
    latestRound: {
      type: null,
      amountUsd: null,
      date: null,
      valuationUsd: null,
      leadInvestors: [],
    },
    status: 'public',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://www.assemblymag.com/articles/100290-mitsubishi-to-mass-produce-humanoid-robots-at-former-engine-plant',
        title: 'Mitsubishi to Mass-Produce Humanoid Robots at Former Engine Plant (1,000/month target, H1 2027, with startup Highlanders)',
        asOf: '2026-08-18',
      },
      {
        url: 'https://www.mitsubishi-motors.com/en/',
        title: 'Mitsubishi Motors global website',
        asOf: '2026-10-20',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Mitsubishi_Motors',
        title: 'Mitsubishi Motors (Wikipedia)',
        asOf: '2026-10-20',
      },
    ],
    confidence: 'medium',
    absent: {
      'aka': {
        state: 'not-applicable',
        basis: 'One name: the fetched bodies of its cited sources and its website call it Mitsubishi Motors and give no other name.',
      },
      'deployments': {
        state: 'not-applicable',
        basis: 'Mitsubishi Motors plans to start building the robots in the first half of 2027 (Assembly Magazine); none is deployed yet.',
      },
      'openSource': {
        state: 'not-applicable',
        basis: 'No open-source release of its own: none is named in the fetched bodies of its cited sources or on its website.',
      },
      'totalRaisedUsd': {
        state: 'not-applicable',
        basis: 'A production plan of Mitsubishi Motors, a listed carmaker (TYO: 7211): it has no venture total of its own.',
      },
      'round.type': {
        state: 'not-applicable',
        basis: 'A production plan of Mitsubishi Motors, a listed carmaker (TYO: 7211): it raises no rounds of its own.',
      },
      'round.amountUsd': {
        state: 'not-applicable',
        basis: 'A production plan of Mitsubishi Motors, a listed carmaker (TYO: 7211): it raises no rounds of its own.',
      },
      'round.date': {
        state: 'not-applicable',
        basis: 'A production plan of Mitsubishi Motors, a listed carmaker (TYO: 7211): it raises no rounds of its own.',
      },
      'round.valuationUsd': {
        state: 'not-applicable',
        basis: 'A production plan of Mitsubishi Motors, a listed carmaker (TYO: 7211): it raises no rounds of its own.',
      },
      'round.leadInvestors': {
        state: 'not-applicable',
        basis: 'A production plan of Mitsubishi Motors, a listed carmaker (TYO: 7211): it raises no rounds of its own.',
      },
    },
  },
];

/** Schema-validated at build time by lib/registry-validation.ts. */
export const COMPANIES: Company[] = ROWS;
