/**
 * Robotics now: where the field stands this week and which way it is moving.
 *
 * Three exports, each read by /now/ and its figure:
 *   - TRAJECTORIES: ten measures, each with two dated ends. A stated end
 *     carries the page's own number; a computed end carries the stated
 *     inputs, and lib/now.ts derives its value. No derived number is typed
 *     here. The rows do not share an axis and are not ranked.
 *   - DEVELOPMENTS: what changed between 15 October and NOW_AS_OF, one
 *     sentence each, with what it means and what it does not mean.
 *   - DELIVERY_GAPS: a promise or an announced figure against what has been
 *     delivered, each number labeled with what it counts.
 *
 * Every page here was opened on NOW_AS_OF and `wording` quotes it. A
 * `reported` source is a report of the measurer's figure, not the measurer's
 * own page. In a quoted list where the page puts a dash between a label and
 * its number, the quote writes a colon.
 *
 * The rows are typed against data/schemas/now.ts and parsed by the unit
 * suite (tests/unit/now.test.ts); the type-only import keeps zod out of any
 * page that reads this file.
 */
import type { Cited, DeliveryGap, Development, Trajectory } from './schemas/now.ts';

export type {
  Cited,
  CountKind,
  DeliveryGap,
  Development,
  DevelopmentArea,
  SourceType,
  Trajectory,
  TrajectoryEnd,
  TrajectoryUnit,
} from './schemas/now.ts';

export const NOW_AS_OF = '2026-11-14';

/** The first day the developments list covers. */
export const DEVELOPMENTS_FROM = '2026-10-15';

type Source = Omit<Cited, 'wording'>;

const SAG: Source = {
  sourceUrl: 'https://smartanalyticsglobal.com/global-humanoid-robot-shipments-q3-2026-agibot-ubtech-unitree/',
  sourceTitle: 'SAG: Global Humanoid Robot Shipments Surge 347% YoY in Q3 2026 (Smart Analytics Global, 8 Nov 2026)',
  sourceType: 'reported',
};
const PI0_PAPER: Source = {
  sourceUrl: 'https://arxiv.org/html/2410.24164v1',
  sourceTitle: 'π0: A Vision-Language-Action Flow Model for General Robot Control (arXiv 2410.24164v1)',
  sourceType: 'primary',
};
const PI0_ABSTRACT: Source = {
  sourceUrl: 'https://arxiv.org/abs/2410.24164',
  sourceTitle: 'π0 on arXiv, 2410.24164 (abstract page)',
  sourceType: 'primary',
};
const GR00T_2: Source = {
  sourceUrl: 'https://research.nvidia.com/labs/gear/gr00t-2/',
  sourceTitle: 'GR00T 2: Scaling robot foundation models for generalization, dexterity, and adaptation (NVIDIA GEAR, November 2026)',
  sourceType: 'primary',
};
const GR00T_2_POST: Source = {
  sourceUrl: 'https://x.com/DrJimFan/status/2120186651741655428',
  sourceTitle: 'Jim Fan (NVIDIA) on X, 10 Nov 2026',
  sourceType: 'primary',
};
const GEMINI_1_5: Source = {
  sourceUrl: 'https://deepmind.google/discover/blog/gemini-robotics-15-brings-ai-agents-into-the-physical-world/',
  sourceTitle: 'Gemini Robotics 1.5 brings AI agents into the physical world (Google DeepMind, 25 Sep 2025)',
  sourceType: 'primary',
};
const GEMINI_2: Source = {
  sourceUrl: 'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
  sourceTitle: 'Gemini Robotics 2 brings whole body intelligence to robots (Google DeepMind, 30 Jul 2026)',
  sourceType: 'primary',
};
const GEMINI_2_5: Source = {
  sourceUrl: 'https://deepmind.google/blog/gemini-robotics-2-5-accelerates-real-world-physical-intelligence/',
  sourceTitle: 'Gemini Robotics 2.5 accelerates real-world general dexterity (Google DeepMind, 10 Nov 2026)',
  sourceType: 'primary',
};
const SUPERMIMIC_PAGE: Source = {
  sourceUrl: 'https://supermimic.github.io',
  sourceTitle: 'SuperMimic project page',
  sourceType: 'primary',
};
const SUPERMIMIC_PAPER: Source = {
  sourceUrl: 'https://arxiv.org/abs/2610.28480',
  sourceTitle: 'SuperMimic: Scaling Humanoid Whole-Body Control with One Differentiable World Model (arXiv 2610.28480)',
  sourceType: 'primary',
};
const SONIC_PAPER: Source = {
  sourceUrl: 'https://arxiv.org/abs/2511.07820',
  sourceTitle: 'SONIC: Supersizing Motion Tracking for Natural Humanoid Whole-Body Control (arXiv 2511.07820)',
  sourceType: 'primary',
};
const ROBOLAB: Source = {
  sourceUrl: 'https://research.nvidia.com/labs/srl/projects/robolab/leaderboard.html',
  sourceTitle: 'RoboLab Leaderboard, RoboLab-120 (NVIDIA Seattle Robotics Lab), read 14 Nov 2026',
  sourceType: 'primary',
};
const AMP1_PAPER: Source = {
  sourceUrl: 'https://arxiv.org/abs/2611.09892',
  sourceTitle: 'On Agentic Manipulation Policies (arXiv 2611.09892)',
  sourceType: 'primary',
};
const CRUNCHBASE: Source = {
  sourceUrl: 'https://news.crunchbase.com/venture/q3-2026-us-china-robotics-startup-funding-jumps-physical-ai-push',
  sourceTitle: 'Crunchbase Data Shows Q3 Robotics Startup Funding Jumps 185% As US And China Lead Physical AI Push (Crunchbase News, 27 Oct 2026)',
  sourceType: 'reported',
};
const ALPHABET_Q1_2025: Source = {
  sourceUrl: 'https://blog.google/inside-google/message-ceo/alphabet-earnings-q1-2025/',
  sourceTitle: 'Q1 2025 earnings call: CEO’s remarks (Alphabet, 24 Apr 2025)',
  sourceType: 'primary',
};
const ALPHABET_Q1_2026: Source = {
  sourceUrl: 'https://blog.google/company-news/inside-google/message-ceo/alphabet-earnings-q1-2026/',
  sourceTitle: 'Q1 2026 earnings call: Remarks from our CEO (Alphabet, 29 Apr 2026)',
  sourceType: 'primary',
};
const ALPHABET_Q3_2026: Source = {
  sourceUrl: 'https://blog.google/company-news/inside-google/message-ceo/alphabet-earnings-q3-2026/',
  sourceTitle: 'Q3 2026 earnings call: Remarks from our CEO (Alphabet, 28 Oct 2026)',
  sourceType: 'primary',
};
const UKRINFORM: Source = {
  sourceUrl: 'https://www.ukrinform.net/rubric-ato/4182313-ground-robotic-systems-complete-record-31398-logistics-and-evacuation-missions-in-october.html',
  sourceTitle: 'Ground robotic systems complete record 31,398 logistics and evacuation missions in October (Ukrinform, citing the Ministry of Defense, 7 Nov 2026)',
  sourceType: 'reported',
};
const INTUITIVE_Q3: Source = {
  sourceUrl: 'https://globenewswire.com/news-release/2026/10/20/3384942/7637/en/intuitive-announces-third-quarter-earnings.html',
  sourceTitle: 'Intuitive Announces Third Quarter Earnings (GlobeNewswire, 20 Oct 2026)',
  sourceType: 'primary',
};
const RUNWAY: Source = {
  sourceUrl: 'https://runway.com/news/company-news/praxis-1-is-now-available',
  sourceTitle: 'Praxis-1 Is Now Available (Runway, 11 Nov 2026)',
  sourceType: 'primary',
};
const GXO: Source = {
  sourceUrl: 'https://finance.yahoo.com/technology/ai/articles/gxo-apptronik-expand-partnership-scale-120000586.html',
  sourceTitle: 'GXO and Apptronik Expand Partnership to Scale Humanoid Deployment (GXO release via GlobeNewswire, 12 Nov 2026)',
  sourceType: 'primary',
};
const CENTCOM: Source = {
  sourceUrl: 'https://www.war.gov/News/Releases/Release/Article/4641098/drpm-uxs-deliver-over-25000-autonomous-and-counter-unmanned-systems-to-centcom/',
  sourceTitle: 'DRPM-UxS Deliver Over 25,000 Autonomous and Counter-Unmanned Systems to CENTCOM AOR (US Department of War, 4 Nov 2026)',
  sourceType: 'primary',
};
const KODIAK_DTL: Source = {
  sourceUrl: 'https://finance.yahoo.com/technology/ai/articles/kodiak-ai-dtl-transport-reach-130000642.html',
  sourceTitle: 'Kodiak AI and DTL Transport Reach Historic Agreement To Deploy 75 Driverless Trucks (Kodiak release via GlobeNewswire, 28 Oct 2026)',
  sourceType: 'primary',
};
const TESLA_Q3_2026: Source = {
  sourceUrl: 'https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q3-2026-Update.pdf',
  sourceTitle: 'Tesla Q3 2026 Update (21 Oct 2026)',
  sourceType: 'primary',
};
const TESLA_Q4_2025: Source = {
  sourceUrl: 'https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q4-2025-Update.pdf',
  sourceTitle: 'Tesla Q4 2025 Update (28 Jan 2026)',
  sourceType: 'primary',
};
const ISO_13482: Source = {
  sourceUrl: 'https://www.iso.org/standard/83498.html',
  sourceTitle: 'ISO 13482 Robotics: Safety requirements for service robots, edition 2 (ISO catalogue)',
  sourceType: 'primary',
};
const MOFCOM_2026_58: Source = {
  sourceUrl: 'https://www.mofcom.gov.cn/zwgk/zcfb/art/2026/art_91466027f465467985942a639a9485f4.html',
  sourceTitle: '商务部、海关总署公告2026年第58号 (MOFCOM and General Administration of Customs, 9 Nov 2026)',
  sourceType: 'primary',
};
const MOFCOM_2025_INDEX: Source = {
  sourceUrl: 'https://www.mofcom.gov.cn/zcfb/blgg/gg/2025/index.html',
  sourceTitle: 'MOFCOM announcements, 2025 (index of titles)',
  sourceType: 'primary',
};
const FCC_DA_26_1203: Source = {
  sourceUrl: 'https://docs.fcc.gov/public/attachments/DA-26-1203A1.pdf',
  sourceTitle: 'DA 26-1203, Conditional Approval and Exemption of Certain UAS, Routers, Advanced Robotic Devices, and Power Inverters from FCC Covered List (FCC, 6 Nov 2026)',
  sourceType: 'primary',
};
const FCC_FAQ: Source = {
  sourceUrl: 'https://www.fcc.gov/covered-list-faqs-robots-inverters',
  sourceTitle: 'FAQs on Recent Updates to FCC Covered List Regarding Foreign-Produced Advanced Robotic Devices and Power Inverters (FCC)',
  sourceType: 'primary',
};
const NHTSA_RQ26006: Source = {
  sourceUrl: 'https://static.nhtsa.gov/odi/inv/2026/INOA-RQ26006-19477.pdf',
  sourceTitle: 'ODI Resume, Investigation RQ26006: Effectiveness of recall remedy for Waymo AVs passing stopped school buses (NHTSA, 6 Nov 2026)',
  sourceType: 'primary',
};
const PROCLAMATION_11077: Source = {
  sourceUrl: 'https://www.federalregister.gov/documents/2026/11/02/2026-22385/adjusting-imports-of-robotics-industrial-machinery-and-their-parts-and-components-into-the-united',
  sourceTitle: 'Proclamation 11077 of October 28, 2026: Adjusting Imports of Robotics, Industrial Machinery, and Their Parts and Components (91 FR 69199)',
  sourceType: 'primary',
};
const AGILITY_LISTING: Source = {
  sourceUrl: 'https://investors.agilityrobotics.com/news-releases/news-release-details/agility-becomes-first-us-publicly-listed-pure-play-humanoid',
  sourceTitle: 'Agility Becomes First U.S. Publicly Listed Pure-Play Humanoid Robotics Company, Begins Trading Today on Nasdaq as AGLT (Agility, 5 Nov 2026)',
  sourceType: 'primary',
};
const ADCOCK_PATH: Source = {
  sourceUrl: 'https://x.com/adcock_brett/status/1885070495185592359',
  sourceTitle: 'Brett Adcock (Figure) on X, 30 Jan 2025',
  sourceType: 'primary',
};
const ADCOCK_1000: Source = {
  sourceUrl: 'https://x.com/adcock_brett/status/2080319785402052619',
  sourceTitle: 'Brett Adcock (Figure) on X, 23 Jul 2026',
  sourceType: 'primary',
};
const ONEX_FACTORY: Source = {
  sourceUrl: 'https://www.1x.tech/discover/neo-factory',
  sourceTitle: 'NEO Factory: Building Your NEO (1X, 30 Apr 2026)',
  sourceType: 'primary',
};
const ONEX_DISCOVER: Source = {
  sourceUrl: 'https://www.1x.tech/discover',
  sourceTitle: '1X Discover, the company’s news index, read 14 Nov 2026',
  sourceType: 'primary',
};
const UBTECH_TARGET: Source = {
  sourceUrl: 'https://www.roboticstomorrow.com/story/2025/11/ubtech-humanoid-robot-walker-s2-begins-mass-production-and-delivery-with-orders-exceeding-800-million-yuan/25810/',
  sourceTitle: 'UBTECH Humanoid Robot Walker S2 Begins Mass Production and Delivery (UBTECH release republished by RoboticsTomorrow, 17 Nov 2025)',
  sourceType: 'reported',
};
const UBTECH_2025_RESULTS: Source = {
  sourceUrl: 'https://www.hkexnews.hk/listedco/listconews/sehk/2026/0331/2026033102607.pdf',
  sourceTitle: 'UBTECH Robotics annual results announcement for 2025 (HKEX, 31 Mar 2026)',
  sourceType: 'primary',
};
const XPENG_IRON: Source = {
  sourceUrl: 'https://www.xpeng.com/news/01a080371029a057bc8e8a02a2c6012b',
  sourceTitle: 'XPENG IRON Humanoid Robot Now Walks Off the Production Line (XPeng, 8 Sep 2026)',
  sourceType: 'primary',
};
const SERVE_Q3: Source = {
  sourceUrl: 'https://globenewswire.com/news-release/2026/11/05/3397043/0/en/serve-robotics-announces-third-quarter-2026-results.html',
  sourceTitle: 'Serve Robotics Announces Third Quarter 2026 Results (GlobeNewswire, 5 Nov 2026)',
  sourceType: 'primary',
};
const AURORA_Q3: Source = {
  sourceUrl: 'https://ir.aurora.tech/_assets/_b43b1c20802e72db7dcf51238ac7febe/aurora/db/956/10062/shareholder_letter/26Q3_Shareholder_Letter.pdf',
  sourceTitle: 'Aurora Third Quarter 2026 Shareholder Letter (28 Oct 2026)',
  sourceType: 'primary',
};
const MAY_MOBILITY: Source = {
  sourceUrl: 'https://www.prnewswire.com/news-releases/may-mobility-plans-to-bring-autonomous-volkswagen-id-buzz-vehicles-to-global-robotaxi-platforms-302936992.html',
  sourceTitle: 'May Mobility Plans to Bring Autonomous Volkswagen ID. Buzz Vehicles to Global Robotaxi Platforms (May Mobility, 12 Nov 2026)',
  sourceType: 'primary',
};
const TEXAS_TRACKER: Source = {
  sourceUrl: 'https://texasavtracker.com/',
  sourceTitle: 'Texas Autonomous Vehicle Fleet Tracker, reading the TxDMV Automated Vehicle Registry, read 14 Nov 2026',
  sourceType: 'reported',
};
const AGIBOT_20000: Source = {
  sourceUrl: 'https://x.com/AGIBOTofficial/status/2103079050826948753',
  sourceTitle: 'AGIBOT on X, 24 Sep 2026',
  sourceType: 'primary',
};

const SAG_WORDING =
  'global humanoid robot shipments surged 347% year over year (YoY) to 16,500 units in Q3 2026';
const GR00T_2_MIX_WORDING =
  'GR00T 2 is pretrained on one mixture of three kinds of data: 402,730 hours of egocentric video of people at work, 10,184 hours of demonstrations with a handheld UMI gripper across 2,897 tasks, and 23,500 hours of robot teleoperation.';
const PI0_MIX_WORDING =
  'Our pre-training mixture consists of 10,000 hours of dexterous manipulation data from 7 different robot configurations and 68 tasks, in addition to large amounts of previously collected robot manipulation data from OXE';
const GR00T_2_DATE: Cited = {
  ...GR00T_2_POST,
  wording: '16:07 · 10 Nov 2026',
};
const PI0_DATE: Cited = { ...PI0_ABSTRACT, wording: 'Submitted on 31 Oct 2024 (v1)' };
const SONIC_TRAINING_WORDING = 'SONIC trained 7 days on 128 GPUs.';
const INTUITIVE_WORDING =
  'The Company grew its da Vinci surgical system installed base to 12,094 systems as of September 30, 2026, an increase of 12% compared with 10,763 as of September 30, 2025.';
const CRUNCHBASE_WORDING =
  'All told, global venture funding to robotics startups totaled $9.9 billion in Q3, more than double the $4.3 billion invested in Q3 2025, per Crunchbase data';

export const TRAJECTORIES: readonly Trajectory[] = [
  {
    id: 'humanoid-shipments',
    title: 'Humanoids shipped per quarter, worldwide',
    unit: 'humanoids per quarter',
    measuredBy: 'Smart Analytics Global, an analyst firm',
    caveat: "An analyst estimate whose earlier end is implied by SAG's growth figure, not stated",
    earlier: {
      basis: 'computed',
      date: '2025-09-30',
      period: 'Q3 2025',
      label: "Implied by SAG's 347% growth",
      computation: {
        kind: 'implied-by-growth',
        later: { label: 'Q3 2026 shipments', value: 16_500, ...SAG, wording: SAG_WORDING },
        growthPercent: { label: 'Growth year over year', value: 347, ...SAG, wording: SAG_WORDING },
      },
    },
    later: {
      basis: 'stated',
      date: '2026-09-30',
      period: 'Q3 2026',
      label: 'SAG estimate',
      value: 16_500,
      ...SAG,
      wording: SAG_WORDING,
    },
  },
  {
    id: 'pretraining-hours',
    title: "Hours of data in a robot model's pretraining",
    unit: 'hours',
    measuredBy: "The model makers' own paper and project page",
    caveat: "Two labs' models; π0's count leaves out its open robot datasets, and GR00T 2's is mostly human video",
    earlier: {
      basis: 'stated',
      date: '2024-10-31',
      period: 'π0, October 2024',
      label: 'π0 robot demonstrations, before OXE, DROID and Bridge',
      value: 10_000,
      ...PI0_PAPER,
      wording: PI0_MIX_WORDING,
      dateSource: PI0_DATE,
    },
    later: {
      basis: 'computed',
      date: '2026-11-10',
      period: 'GR00T 2, November 2026',
      label: 'GR00T 2, the sum of three stated parts',
      computation: {
        kind: 'sum',
        parts: [
          { label: 'Egocentric human video', value: 402_730, ...GR00T_2, wording: GR00T_2_MIX_WORDING },
          { label: 'Handheld UMI gripper demonstrations', value: 10_184, ...GR00T_2, wording: GR00T_2_MIX_WORDING },
          { label: 'Robot teleoperation', value: 23_500, ...GR00T_2, wording: GR00T_2_MIX_WORDING },
        ],
      },
      dateSource: GR00T_2_DATE,
    },
  },
  {
    id: 'robot-share-of-pretraining',
    title: 'Robot teleoperation share of pretraining data',
    unit: 'percent of hours',
    measuredBy: "Computed from the model makers' stated hours",
    caveat: 'π0 also starts from a vision language model pretrained on web data, which no hours figure counts',
    earlier: {
      basis: 'computed',
      date: '2024-10-31',
      period: 'π0, October 2024',
      label: 'π0: all of its action data came from robots',
      computation: {
        kind: 'robot-share',
        parts: [
          { label: 'π0 robot demonstrations', hours: 10_000, robot: true, ...PI0_PAPER, wording: PI0_MIX_WORDING },
          {
            label: 'OXE, DROID and Bridge robot datasets',
            hours: null,
            robot: true,
            ...PI0_PAPER,
            wording: 'previously collected robot manipulation data from OXE',
          },
        ],
      },
      dateSource: PI0_DATE,
    },
    later: {
      basis: 'computed',
      date: '2026-11-10',
      period: 'GR00T 2, November 2026',
      label: "GR00T 2's robot teleoperation hours over all three parts",
      computation: {
        kind: 'robot-share',
        parts: [
          { label: 'Egocentric human video', hours: 402_730, robot: false, ...GR00T_2, wording: GR00T_2_MIX_WORDING },
          { label: 'Handheld UMI gripper demonstrations', hours: 10_184, robot: false, ...GR00T_2, wording: GR00T_2_MIX_WORDING },
          { label: 'Robot teleoperation', hours: 23_500, robot: true, ...GR00T_2, wording: GR00T_2_MIX_WORDING },
        ],
      },
      dateSource: GR00T_2_DATE,
    },
  },
  {
    id: 'gemini-robotics-release-gap',
    title: 'Days between Gemini Robotics releases',
    unit: 'days',
    measuredBy: "Google DeepMind's own post dates",
    caveat: 'Two intervals between three announcements, not a trend line',
    earlier: {
      basis: 'computed',
      date: '2026-07-30',
      period: 'Gemini Robotics 1.5 to 2',
      label: 'Gemini Robotics 1.5 to 2',
      computation: {
        kind: 'days-between',
        from: { label: 'Gemini Robotics 1.5 post', date: '2025-09-25', ...GEMINI_1_5, wording: 'September 25, 2025 Models Gemini Robotics 1.5 brings AI agents into the physical world' },
        to: { label: 'Gemini Robotics 2 post', date: '2026-07-30', ...GEMINI_2, wording: 'July 30, 2026 Models Gemini Robotics 2 brings whole body intelligence to robots' },
      },
    },
    later: {
      basis: 'computed',
      date: '2026-11-10',
      period: 'Gemini Robotics 2 to 2.5',
      label: 'Gemini Robotics 2 to 2.5',
      computation: {
        kind: 'days-between',
        from: { label: 'Gemini Robotics 2 post', date: '2026-07-30', ...GEMINI_2, wording: 'July 30, 2026 Models Gemini Robotics 2 brings whole body intelligence to robots' },
        to: { label: 'Gemini Robotics 2.5 post', date: '2026-11-10', ...GEMINI_2_5, wording: 'November 10, 2026 Models Gemini Robotics 2.5 accelerates real-world general dexterity' },
      },
    },
  },
  {
    id: 'humanoid-control-gpu-hours',
    title: 'GPU-hours to train humanoid whole-body control',
    unit: 'GPU-hours',
    measuredBy: 'The SuperMimic paper and project page',
    caveat: "SONIC's figure is a full training run on 128 L40 GPUs; SuperMimic's is the time to pass SONIC's return on one H100",
    earlier: {
      basis: 'computed',
      date: '2025-11-11',
      period: 'SONIC, November 2025',
      label: 'SONIC, 7 days on 128 GPUs',
      computation: {
        kind: 'gpu-hours',
        gpus: { label: 'GPUs', value: 128, ...SUPERMIMIC_PAGE, wording: SONIC_TRAINING_WORDING },
        days: { label: 'Days of training', value: 7, ...SUPERMIMIC_PAGE, wording: SONIC_TRAINING_WORDING },
      },
      dateSource: { ...SONIC_PAPER, wording: 'Submitted on 11 Nov 2025 (v1)' },
    },
    later: {
      basis: 'stated',
      date: '2026-10-20',
      period: 'SuperMimic, October 2026',
      label: 'SuperMimic, 3 hours on one GPU',
      value: 3,
      ...SUPERMIMIC_PAPER,
      wording:
        'In 3 hours on a single GPU, SuperMimic surpasses the return of a state-of-the-art motion tracker baseline trained for 7 days on 128 GPUs.',
    },
    ratio: {
      text: "more than 1000x fewer GPU-hours, in the paper's words",
      ...SUPERMIMIC_PAPER,
      wording: 'It reduces GPU-hours by more than $1000\\times$',
    },
  },
  {
    id: 'robolab-120-success',
    title: 'Success on RoboLab-120, in simulation',
    unit: 'percent success',
    measuredBy: "NVIDIA's RoboLab-120 leaderboard, read 14 November 2026",
    caveat: 'Simulation only, with every entry on the same harness at 10 or 25 episodes per task',
    simulation: true,
    earlier: {
      basis: 'stated',
      date: '2024-10-31',
      period: 'π0, October 2024',
      label: 'π0',
      value: 5.0,
      episodes: { successes: 60, total: 1_200 },
      ...ROBOLAB,
      wording: '16 π0 VLA 60 / 1200 10 eps/task 5.0 %',
      dateSource: PI0_DATE,
    },
    alongside: [
      {
        basis: 'stated',
        date: '2026-11-14',
        period: 'Leaderboard, 14 November 2026',
        label: 'Best non-agentic policy (Lakeside)',
        value: 51.0,
        episodes: { successes: 1_531, total: 3_000 },
        ...ROBOLAB,
        wording:
          'Approach: Agentic Non-Agentic | 1 AMP1 Agentic LM | 2 SenseNova-RoboRSI Agentic LM | 3 Lakeside LWM 1531 / 3000 25 eps/task 51.0 %',
      },
    ],
    later: {
      basis: 'stated',
      date: '2026-11-06',
      period: 'AMP1, November 2026',
      label: 'AMP1, a general AI model commanding the arm',
      value: 86.0,
      episodes: { successes: 2_579, total: 3_000 },
      ...ROBOLAB,
      wording: '1 AMP1 Agentic LM 2579 / 3000 25 eps/task 86.0 %',
      dateSource: { ...AMP1_PAPER, wording: 'Submitted on 6 Nov 2026' },
      note: {
        text: 'Dated by the paper; the leaderboard entry was submitted on 15 October 2026',
        ...ROBOLAB,
        wording: 'AMP1 Submission Submitted Oct 15, 2026 Frontier model agent as zero-shot manipulation policy',
      },
    },
    note: {
      text: 'The AMP1 paper itself reports 85.6%',
      ...AMP1_PAPER,
      wording: 'On RoboLab-120, AMP1 reaches an 85.6\\% success rate zero-shot',
    },
  },
  {
    id: 'robotics-venture-funding',
    title: 'Venture funding to robotics startups per quarter',
    unit: 'USD billions per quarter',
    measuredBy: 'Crunchbase data, reported by Crunchbase News',
    caveat: "Crunchbase's own definition of a robotics startup, worldwide",
    earlier: {
      basis: 'stated',
      date: '2025-09-30',
      period: 'Q3 2025',
      label: 'Q3 2025',
      value: 4.3,
      ...CRUNCHBASE,
      wording: CRUNCHBASE_WORDING,
    },
    later: {
      basis: 'stated',
      date: '2026-09-30',
      period: 'Q3 2026',
      label: 'Q3 2026',
      value: 9.9,
      ...CRUNCHBASE,
      wording: CRUNCHBASE_WORDING,
    },
  },
  {
    id: 'waymo-weekly-rides',
    title: 'Waymo rides per week',
    unit: 'rides per week',
    measuredBy: "Alphabet's CEO on its earnings calls",
    caveat: 'The 2025 figure counts paid passenger trips and the 2026 figure fully autonomous rides',
    earlier: {
      basis: 'stated',
      date: '2025-04-24',
      period: 'April 2025',
      label: 'Paid passenger trips',
      value: 250_000,
      qualifier: 'more than',
      ...ALPHABET_Q1_2025,
      wording: 'Waymo is now safely serving over a quarter of a million paid passenger trips each week.',
    },
    later: {
      basis: 'stated',
      date: '2026-04-29',
      period: 'April 2026',
      label: 'Fully autonomous rides',
      value: 500_000,
      qualifier: 'more than',
      ...ALPHABET_Q1_2026,
      wording: 'Waymo also surpassed 500,000 fully autonomous rides per week, doubling in less than a year.',
    },
    note: {
      text: 'No newer weekly figure: the 28 October 2026 remarks give miles and cities, not rides per week',
      ...ALPHABET_Q3_2026,
      wording:
        'We’ve now driven more than 300 million fully autonomous miles. Waymo now operates in 15 major U.S. cities',
    },
  },
  {
    id: 'ukraine-ground-robot-missions',
    title: 'Ukrainian ground robot missions per month',
    unit: 'missions per month',
    measuredBy: "Ukraine's Ministry of Defense, reported by Ukrinform",
    caveat: 'The figure counts logistics and evacuation missions, not robots or strike missions',
    earlier: {
      basis: 'stated',
      date: '2026-01-31',
      period: 'January 2026',
      label: 'January 2026',
      value: 7_511,
      ...UKRINFORM,
      wording: 'the number of ground drone missions has increased every month since the beginning of the year: January: 7,511',
    },
    later: {
      basis: 'stated',
      date: '2026-10-31',
      period: 'October 2026',
      label: 'October 2026, a record',
      value: 31_398,
      ...UKRINFORM,
      wording:
        "In October 2026, units of Ukraine's Defense Forces carried out a record 31,398 logistics and evacuation missions using ground robotic systems",
    },
  },
  {
    id: 'da-vinci-installed-base',
    title: 'Intuitive da Vinci systems installed',
    unit: 'systems installed',
    measuredBy: "Intuitive's third quarter 2026 release",
    caveat: 'Surgeons operate every system, so the count says nothing about autonomy',
    earlier: {
      basis: 'stated',
      date: '2025-09-30',
      period: '30 September 2025',
      label: 'Installed base',
      value: 10_763,
      ...INTUITIVE_Q3,
      wording: INTUITIVE_WORDING,
    },
    later: {
      basis: 'stated',
      date: '2026-09-30',
      period: '30 September 2026',
      label: 'Installed base',
      value: 12_094,
      ...INTUITIVE_Q3,
      wording: INTUITIVE_WORDING,
    },
  },
];

export const DEVELOPMENTS: readonly Development[] = [
  {
    id: 'gxo-apptronik-letter-of-intent',
    date: '2026-11-12',
    area: 'deployments',
    what: 'GXO and Apptronik signed a letter of intent to expand trials of Apollo humanoids in GXO warehouses.',
    means: 'Trials in live warehouse operations begin in 2027',
    doesNotMean: 'An order for 1,000 robots; that ceiling depends on agreed KPIs being met',
    ...GXO,
    wording:
      'Beginning in 2027, the trials will validate the safety, security and technical requirements for scaled deployment | Subject to the success of the deployments and the ability to meet agreed performance, safety and operational KPIs, the companies intend to progress toward global rollout of up to 1,000 Apollo humanoid robots over the next four years',
  },
  {
    id: 'praxis-1-open-weights',
    date: '2026-11-11',
    area: 'models',
    what: 'Runway released Praxis-1, a 27B parameter world action model, with open weights under Apache 2.0.',
    means: 'Runway puts it first among world action models on RoboLab-120, at 46.2% in simulation',
    doesNotMean: 'A real robot result; RoboLab-120 runs in a simulator',
    ...RUNWAY,
    wording:
      'Praxis-1 is a 27B-parameter mixture-of-experts diffusion transformer that predicts video and actions together. It is the top-performing world action model on NVIDIA’s RoboLab-120 leaderboard | On RoboLab-120, Praxis-1 reaches 46.2% success across 1,200 episodes',
  },
  {
    id: 'iso-13482-final-vote',
    date: '2026-11-11',
    area: 'policy',
    what: 'ISO 13482, the safety standard for service robots, closed its final vote and is under publication.',
    means: 'Edition 2 will replace ISO 13482:2014',
    doesNotMean: 'A published standard yet; ISO lists up to seven weeks of final production steps',
    ...ISO_13482,
    wording:
      '50.60 2026-11-11 Close of voting. Proof returned by secretariat | 60.00 2026-11-11 International Standard under publication | Final production steps (up to seven weeks). Will replace ISO 13482:2014',
  },
  {
    id: 'gemini-robotics-2-5',
    date: '2026-11-10',
    area: 'models',
    what: 'Google DeepMind released Gemini Robotics 2.5 to its robotics partners.',
    means: 'DeepMind reports 30% to 100% higher success than previous baselines, by task type',
    doesNotMean: 'A Mercedes-Benz deployment; its 96% success rate came from a proof of concept with no trial count',
    ...GEMINI_2_5,
    wording:
      'Gemini Robotics 2.5 is rolling out to our robotics partners. | Compared to previous baselines, Gemini Robotics 2.5 achieves a 30% to 100% higher success rate depending on the type of task | During a real-world proof-of-concept on Mercedes-Benz production lines, our models helped Apptronik’s Apollo 2 humanoid pick and pack automotive parts with a 96% success rate.',
  },
  {
    id: 'gr00t-2-release',
    date: '2026-11-10',
    area: 'models',
    what: "NVIDIA released GR00T 2's tools and 100K hours of training data, with model weights due in December.",
    means: 'The framework, simulation engine, annotation engine and hardware design are out now',
    doesNotMean: 'Open weights today; the weights and X-Adapt recipes come in December',
    ...GR00T_2_POST,
    wording:
      'We are releasing not only the model weights and X-Adapt recipes (coming December), but also our agentic framework, simulation engine, annotation engine, hardware design, and even training data (100K hours, that’s ~11 yrs of experience), all available today!',
  },
  {
    id: 'mofcom-2026-58-pause',
    date: '2026-11-09',
    area: 'policy',
    what: 'China extended its pause on six export control announcements of 9 October 2025 to 10 January 2027.',
    means: 'Announcements Nos. 55 to 58, 61 and 62 stay suspended from 11 November',
    doesNotMean: 'Their repeal, or a pause on other controls; only the October 2025 announcements are paused',
    ...MOFCOM_2026_58,
    wording:
      '经批准，自2026年11月11日起至2027年1月10日，商务部、海关总署公告2025年第55号、56号、57号、58号，及商务部公告2025年第61号、62号继续暂停实施。',
    alsoCited: [
      {
        ...MOFCOM_2025_INDEX,
        wording:
          '商务部公告2025第62号 公布对稀土相关技术实施出口管制的决定 2025-10-09 | 商务部公告2025第61号 公布对境外相关稀土物项实施出口管制的决定 2025-10-09 | 商务部 海关总署公告2025年第58号 公布对锂电池和人造石墨负极材料相关物项实施出口管制的决定 2025-10-09 | 商务部 海关总署公告2025年第57号 公布对部分中重稀土相关物项实施出口管制的决定 2025-10-09 | 商务部 海关总署公告2025年第56号 公布对部分稀土设备和原辅料相关物项实施出口管制的决定 2025-10-09 | 商务部 海关总署公告2025年第55号 公布对超硬材料相关物项实施出口管制的决定 2025-10-09',
      },
    ],
  },
  {
    id: 'ukraine-ground-robot-record',
    date: '2026-11-07',
    area: 'deployments',
    what: "Ukraine's defense ministry reported a record 31,398 ground robot missions in October.",
    means: 'Logistics and evacuation runs, recorded in DELTA and verified by Brave1',
    doesNotMean: 'A count of robots, or of strike missions',
    ...UKRINFORM,
    wording:
      "In October 2026, units of Ukraine's Defense Forces carried out a record 31,398 logistics and evacuation missions using ground robotic systems for the first time. | All ground robotic system missions are recorded in the DELTA combat system and verified by Brave1 specialists.",
  },
  {
    id: 'fcc-abb-pantograph-exemptions',
    date: '2026-11-06',
    area: 'policy',
    what: 'The FCC exempted ABB and Pantograph mobile robots from its Covered List for foreign-produced robots.',
    means: 'Exempt models can still get FCC authorization, which covered new models cannot',
    doesNotMean: 'A lasting clearance; it holds only while each company follows its onshoring plan',
    ...FCC_DA_26_1203,
    wording:
      'ABB Robotics, LLC’s Autonomous Mobile Manipulators, Model Nos. AMMR G0540 and AMMR G1240, and its Autonomous Mobile Robot, Model No. P204V • Pantograph Industries, PBC’s Pandroid Robot Hardware | these exemptions from the FCC’s Covered List are subject to the companies’ continuing “compliance with the onshoring plan[s] outlined in [their] conditional approval application[s] and pursuant to updated vetting of [their] products.”',
    alsoCited: [
      {
        ...FCC_FAQ,
        wording:
          'New models of devices on the Covered List are prohibited from receiving FCC authorization and are therefore prohibited from being imported or sold in the United States.',
      },
    ],
  },
  {
    id: 'nhtsa-rq26006-waymo',
    date: '2026-11-06',
    area: 'policy',
    what: "NHTSA opened a recall query into whether Waymo's school bus recall remedy worked.",
    means: 'Most incidents in its earlier probe came after the November 2025 software remedy',
    doesNotMean: 'A new recall or a defect finding; 2,895 is the population NHTSA lists',
    ...NHTSA_RQ26006,
    wording:
      'Date Opened: 11/06/2026 | Population: 2,895 | Of the total reported incidents identified during PE25013, a majority of the incidents occurred after the November 17, 2025 remedy date. ODI is opening this Recall Query (RQ) to assess the adequacy of the remedy for Recall 25E084',
  },
  {
    id: 'amp1-robolab-120',
    date: '2026-11-06',
    area: 'models',
    what: 'In AMP1, a generalist AI model drives the robot arm; it scored 85.6% on RoboLab-120 in simulation.',
    means: 'The authors also report 104 of 108 real-world trials succeeded zero-shot',
    doesNotMean: 'A result measured by anyone other than the authors',
    ...AMP1_PAPER,
    wording:
      'agentic manipulation policies (AMPs), in which a generalist AI model commands the manipulator directly | On RoboLab-120, AMP1 reaches an 85.6\\% success rate zero-shot | The agent succeeds zero-shot in 104 of 108 real-world trials spanning twelve tasks and three robot instances',
  },
  {
    id: 'agility-nasdaq-listing',
    date: '2026-11-05',
    area: 'money',
    what: 'Agility Robotics began trading on Nasdaq as AGLT, citing more than $300 million of Digit 5 orders.',
    means: 'About $465 million of gross capital from the merger and related financings',
    doesNotMean: 'Digit 5 robots shipped; early customer access starts in the first half of 2027',
    ...AGILITY_LISTING,
    wording:
      'More Than $300 Million in Multi-Year Digit 5 Orders | Business Combination and Related Financings Provide Approximately $465 Million in Gross Capital | Early customer access is expected to begin in the first half of 2027, with general availability targeted for the end of 2027.',
  },
  {
    id: 'centcom-unmanned-systems',
    date: '2026-11-04',
    area: 'deployments',
    what: 'The War Department said it fielded over 25,000 unmanned and counter-drone systems to CENTCOM this year.',
    means: 'About $782 million this year, including over 1,300 one-way attack drones',
    doesNotMean: '25,000 drones; more than 24,000 are counter-drone systems',
    ...CENTCOM,
    wording:
      'Through an investment of approximately $782 million this year, DRPM-UxS has fielded: Over 1,300 One-Way Attack (OWA) Unmanned Aerial Vehicles (UAVs) | More than 24,000 Counter-Unmanned Aerial Systems (C-UAS)',
  },
  {
    id: 'proclamation-11077',
    date: '2026-10-28',
    area: 'policy',
    what: 'Proclamation 11077 found robot and machinery imports threaten US security and ordered trade talks.',
    means: 'Commerce and USTR must report on the talks within 180 days',
    doesNotMean: 'A tariff; tariffs, quotas and fees remain possible later',
    ...PROCLAMATION_11077,
    wording:
      'I determine that it is necessary and appropriate to enter into negotiations with trading partners to adjust imports of robotics, industrial machinery, and their components | The Secretary and the Trade Representative shall provide one of these updates within 180 days of the date of this proclamation. | I may consider alternative remedies in the future, including imposing or modifying tariffs, duties, quotas, and fees',
  },
  {
    id: 'kodiak-dtl-binding-deal',
    date: '2026-10-28',
    area: 'deployments',
    what: 'DTL Transport signed a binding deal to run the Kodiak Driver in 75 driverless trucks that it owns.',
    means: 'Kodiak calls it the first binding commitment by a long-haul carrier',
    doesNotMean: 'Trucks running driverless now; the release gives no start date',
    ...KODIAK_DTL,
    wording:
      'Kodiak signs historic agreement with DTL Transport Inc. to deploy the Kodiak Driver, Kodiak’s autonomous driving system, in 75 driverless trucks owned and operated by DTL. Deal marks first-ever binding commitment by a long-haul trucking carrier to commercially operate driverless trucks within their own fleet',
  },
  {
    id: 'optimus-production-fremont',
    date: '2026-10-21',
    area: 'deployments',
    what: 'Tesla said Optimus production began on its high-volume lines in Fremont.',
    means: 'Tesla calls these its first production-quality bots; California capacity is at Early Ramp',
    doesNotMean: 'Robots working for customers; Tesla gives no unit count',
    ...TESLA_Q3_2026,
    wording:
      'Optimus production began in Fremont on our high-volume lines. The bots coming off this line are the first production-quality bots that we have manufactured. | California Optimus - Early Ramp',
  },
  {
    id: 'supermimic-compute',
    date: '2026-10-20',
    area: 'models',
    what: 'SuperMimic passed the return of a 128-GPU motion tracker after 3 hours of training on one GPU.',
    means: 'The paper reports more than 1000x fewer GPU-hours; it is a CoRL 2026 oral',
    doesNotMean: 'Training without a simulator; its world model is fit from simulator logs',
    ...SUPERMIMIC_PAPER,
    wording:
      'In 3 hours on a single GPU, SuperMimic surpasses the return of a state-of-the-art motion tracker baseline trained for 7 days on 128 GPUs. It reduces GPU-hours by more than $1000\\times$ | one differentiable world model of their shared dynamics, fit from logged transitions of a standard rigid-body simulator | Comments: Accepted at CoRL 2026 (Oral).',
  },
];

export const DELIVERY_GAPS: readonly DeliveryGap[] = [
  {
    id: 'tesla-optimus',
    who: 'Tesla Optimus',
    unit: 'milestones',
    promised: {
      said: '2026-01-28',
      what: 'Unveil Gen 3 in Q1 2026 and start production before the end of 2026',
      value: null,
      countKind: 'milestone',
      ...TESLA_Q4_2025,
      wording:
        'In Q1 of this year, we plan to unveil the Gen 3 version of Optimus | Preparations are underway for the first production line, including supply chain readiness, with start of production planned before the end of 2026',
    },
    delivered: {
      asOf: '2026-10-21',
      what: 'Production began in Fremont; the update gives no unit count and does not mention a Gen 3 unveiling',
      value: null,
      countKind: 'produced',
      ...TESLA_Q3_2026,
      wording: 'Optimus production began in Fremont on our high-volume lines.',
    },
  },
  {
    id: 'figure-100000',
    who: 'Figure',
    unit: 'humanoid robots',
    promised: {
      said: '2025-01-30',
      what: 'Believes there is a path to 100,000 robots over four years with its two customers',
      value: 100_000,
      countKind: 'projected',
      ...ADCOCK_PATH,
      wording: 'Between both customers, we believe there is a path to 100,000 robots over the next four years',
    },
    delivered: {
      asOf: '2026-07-23',
      what: 'The 1,000th Figure 03 manufactured; Figure gives no count delivered to customers',
      value: 1_000,
      countKind: 'built',
      ...ADCOCK_1000,
      wording: 'Proud to share BotQ has manufactured our 1,000th humanoid robot for F.03',
    },
  },
  {
    id: '1x-neo',
    who: '1X NEO',
    unit: 'NEOs shipped to customers',
    promised: {
      said: '2026-04-30',
      what: 'First NEOs to ship to customers in 2026',
      value: null,
      countKind: 'milestone',
      ...ONEX_FACTORY,
      wording:
        'We promised the first NEOs would ship in 2026, and we’re keeping that promise. | package it up to ship to customers that paid good money for a life-changing experience',
    },
    delivered: {
      asOf: NOW_AS_OF,
      what: 'No customer delivery announced; the newest post in 1X’s news index is dated 9 July 2026',
      value: null,
      countKind: 'delivered',
      ...ONEX_DISCOVER,
      wording: "NEO’s Hands | An API to the Physical World | JUL 09 '26",
    },
  },
  {
    id: 'ubtech-walker-s2',
    who: 'UBTECH',
    unit: 'units',
    promised: {
      said: '2025-11-17',
      what: 'Deliver 500 Walker S2 robots within 2025',
      value: 500,
      countKind: 'target',
      ...UBTECH_TARGET,
      wording:
        'UBTECH Humanoid Robot Walker S2 Begins Mass Production and Delivery | This milestone moves the company toward its target of delivering 500 units within the year',
    },
    delivered: {
      asOf: '2025-12-31',
      what: '1,079 units sold in 2025 across all full-size humanoid products, against a target for Walker S2 deliveries alone; the filing puts Walker S2 delivery at the 1,000-unit level',
      value: 1_079,
      countKind: 'sold',
      ...UBTECH_2025_RESULTS,
      wording:
        'In 2025, full-size embodied intelligent humanoid robot products and services for all scenarios achieved revenue of approximately RMB820 million | and achieved sales volume of 1,079 units | The 1,000-unit-level small-scale mass production and delivery of the Walker S2 marks the maturity and stability of our manufacturing process.',
    },
  },
  {
    id: 'xpeng-iron',
    who: 'XPeng IRON',
    unit: 'milestones',
    promised: {
      said: '2026-09-08',
      what: 'Mass production by the end of 2026, with market launch and delivery in 2027',
      value: null,
      countKind: 'milestone',
      ...XPENG_IRON,
      wording:
        'XPENG robots are scheduled to enter mass production by the end of this year | Official market launch and delivery in China and overseas markets are planned for 2027.',
    },
    delivered: {
      asOf: '2026-09-08',
      what: 'Production lines in operation, with no unit count given',
      value: null,
      countKind: 'produced',
      ...XPENG_IRON,
      wording: 'today announced that its humanoid robot production lines into operation',
    },
  },
  {
    id: 'serve-robots',
    who: 'Serve Robotics',
    unit: 'robots',
    promised: {
      said: '2026-11-05',
      what: 'Has deployed more than 2,000 robots since 2021',
      value: 2_000,
      qualifier: 'more than',
      countKind: 'deployed (cumulative)',
      ...SERVE_Q3,
      wording: 'Since spinning off from Uber in 2021, Serve has deployed more than 2,000 robots across the U.S.',
    },
    delivered: {
      asOf: '2026-09-30',
      what: 'An average of 917 robots, outdoor and indoor, made deliveries each day in Q3 2026',
      value: 917,
      countKind: 'daily active',
      ...SERVE_Q3,
      wording:
        'Daily Active Robots (1) (3) 917 | The Company defines daily active robots as the average number of robots performing deliveries during the period. | The key metrics reported for the periods ended September 30, 2026 and June 30, 2026 are inclusive of the outdoor and indoor robot fleet.',
    },
  },
  {
    id: 'agility-digit-5',
    who: 'Agility Digit 5',
    unit: 'USD in committed multi-year Digit 5 orders',
    promised: {
      said: '2026-11-05',
      what: 'More than $300 million in committed multi-year orders for Digit 5, subject to contractual milestones, product features and specifications',
      value: 300_000_000,
      qualifier: 'more than',
      countKind: 'ordered (committed)',
      ...AGILITY_LISTING,
      wording:
        'The company has secured more than $300 million in committed multi-year orders for Digit® 5, its next-generation humanoid robot, subject to contractual milestones, product features and specifications.',
    },
    delivered: {
      asOf: '2026-11-05',
      what: 'Early customer access is expected in the first half of 2027, with general availability targeted for the end of 2027',
      value: null,
      countKind: 'delivered',
      ...AGILITY_LISTING,
      wording: 'Early customer access is expected to begin in the first half of 2027, with general availability targeted for the end of 2027.',
    },
  },
  {
    id: 'gxo-apptronik-apollo',
    who: 'GXO and Apptronik',
    unit: 'Apollo humanoid robots over four years (conditional LOI)',
    promised: {
      said: '2026-11-12',
      what: 'Up to 1,000 Apollo robots over four years, if agreed KPIs are met',
      value: 1_000,
      qualifier: 'up to',
      countKind: 'target',
      ...GXO,
      wording:
        'today announced that it has signed a Letter of Intent (LOI) with AI-powered robotics company | Subject to the success of the deployments and the ability to meet agreed performance, safety and operational KPIs, the companies intend to progress toward global rollout of up to 1,000 Apollo humanoid robots over the next four years',
    },
    delivered: {
      asOf: '2026-11-12',
      what: 'Trials begin in 2027, with initial deployment in North America in late 2027',
      value: null,
      countKind: 'in service',
      ...GXO,
      wording:
        'Beginning in 2027, the trials will validate the safety, security and technical requirements for scaled deployment | with initial deployment in North America in late 2027',
    },
  },
  {
    id: 'charger-aurora-trucks',
    who: 'Charger Logistics and Aurora',
    unit: 'Aurora Driver-powered trucks (non-binding MOU)',
    promised: {
      said: '2026-10-28',
      what: 'Intends to own and operate 500 Aurora Driver-powered trucks, under a non-binding MOU',
      value: 500,
      countKind: 'ordered (non-binding)',
      ...AURORA_Q3,
      wording:
        'Statements in this investor letter about Charger Logistics’ intent to own and operate 500 Aurora Driver-powered trucks reflect current plans and discussions, as reflected in the non-binding MOU',
    },
    delivered: {
      asOf: '2026-10-28',
      what: 'Truck delivery is expected in 2027 and 2028',
      value: null,
      countKind: 'delivered',
      ...AURORA_Q3,
      wording: 'With truck delivery expected in 2027 and 2028',
    },
  },
  {
    id: 'may-mobility-id-buzz',
    who: 'May Mobility',
    unit: 'autonomous ID. Buzz vehicles',
    promised: {
      said: '2026-11-12',
      what: 'More than 10,000 autonomous ID. Buzz vehicles deployed through 2031',
      value: 10_000,
      qualifier: 'more than',
      countKind: 'target',
      ...MAY_MOBILITY,
      wording: 'May Mobility targets deployment of more than 10,000 autonomous ID. Buzz vehicles through 2031.',
    },
    delivered: {
      asOf: '2026-11-12',
      what: 'First production vehicles are targeted for delivery in 2028',
      value: null,
      countKind: 'delivered',
      ...MAY_MOBILITY,
      wording: 'with the first production vehicles targeted for delivery in 2028',
    },
  },
  {
    id: 'tesla-robotaxi-texas',
    who: 'Tesla Robotaxi in Texas',
    unit: 'Tesla Robotaxi vehicles registered in Texas',
    promised: {
      said: NOW_AS_OF,
      what: '1,303 Tesla vehicles in the Texas automated vehicle registry',
      value: 1_303,
      countKind: 'registered',
      ...TEXAS_TRACKER,
      wording: 'Tesla Robotaxi Tesla Model Y and Cybercab 1,303 Registered in Texas | Source: TxDMV Automated Vehicle Registry',
    },
    delivered: {
      asOf: '2026-09-30',
      what: 'Tesla gives no fleet size or ride count, only nearly two million cumulative unsupervised miles',
      value: null,
      countKind: 'in service',
      ...TESLA_Q3_2026,
      wording: 'We reached nearly two million cumulative unsupervised miles for our Robotaxi service as of the end of the quarter.',
    },
  },
  {
    id: 'agibot-20000',
    who: 'AgiBot',
    unit: 'robots produced (cumulative)',
    promised: {
      said: '2026-09-24',
      what: 'Its 20,000th robot rolled off the production line',
      value: 20_000,
      countKind: 'produced',
      ...AGIBOT_20000,
      wording: 'AGIBOT’s 20,000th robot officially rolled off the production line.',
    },
    delivered: {
      asOf: '2026-09-24',
      what: 'The post gives no count of robots sold or in service',
      value: null,
      countKind: 'in service',
      ...AGIBOT_20000,
      wording:
        'From 15,000 to 20,000 units, AGIBOT continues to scale production while expanding the deployment of humanoid robots across real-world scenarios.',
    },
  },
  {
    id: 'gr00t-2-weights',
    who: 'NVIDIA GR00T 2',
    unit: 'release of weights and code',
    promised: {
      said: '2026-11-10',
      what: 'Model weights and X-Adapt recipes in December',
      value: null,
      countKind: 'milestone',
      ...GR00T_2_POST,
      wording: 'We are releasing not only the model weights and X-Adapt recipes (coming December)',
    },
    delivered: {
      asOf: NOW_AS_OF,
      what: 'The project page still reads Code Available in December',
      value: null,
      countKind: 'milestone',
      ...GR00T_2,
      wording: 'Code Available in December',
    },
  },
];
