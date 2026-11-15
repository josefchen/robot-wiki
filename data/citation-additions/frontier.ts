/**
 * Sources added to the frontier articles in the November 2026 review.
 * Same schema and author-field policy as data/citations.ts: every entry was
 * opened and checked against the page it names.
 */
import type { Citation } from '../schemas/citation.ts';

export const ADDITIONS: Citation[] = [
  // reliability-gap and industrial-deployment
  {
    // Dated 2026-09-30; gives no count of robots retired.
    id: 'figure-f02-decommission-2026',
    title: 'F.02 Decommission',
    authors: ['Figure AI'],
    year: 2026,
    url: 'https://www.figure.ai/news/f-02-decommission',
    type: 'blog',
  },
  // reliability-gap
  {
    id: 'tesla-q3-2026-update',
    title: 'Q3 2026 Update',
    authors: ['Tesla, Inc.'],
    year: 2026,
    url: 'https://assets-ir.tesla.com/tesla-contents/IR/TSLA-Q3-2026-Update.pdf',
    type: 'docs',
  },
  {
    id: 'forbes-adcock-figure-2026',
    title: "Figure's Brett Adcock Sold Investors A Humanoid Future. Now He Has To Build It.",
    authors: ['Anna Tong'],
    year: 2026,
    venue: 'Forbes, 2026-10-05',
    url: 'https://www.forbes.com/sites/annatong/2026/10/05/brett-adcock-sold-investors-a-humanoid-future-now-he-has-to-build-it/',
    type: 'press',
  },
  {
    id: 'fortune-figure-bmw-2025',
    title: "Is the CEO of the heavily funded humanoid robot startup Figure AI exaggerating his startup's work with BMW?",
    authors: ['Jason Del Rey'],
    year: 2025,
    venue: 'Fortune, 2025-04-06',
    url: 'https://fortune.com/2025/04/06/figure-ai-bmw-humanoid-robot-partnership-details-reality-exaggeration/',
    type: 'press',
  },
  {
    id: 'agility-nasdaq-listing-2026',
    title: 'Agility Becomes First U.S. Publicly Listed Pure-Play Humanoid Robotics Company, Begins Trading Today on Nasdaq as AGLT',
    authors: ['Agility Robotics'],
    year: 2026,
    venue: 'Agility Robotics press release, 2026-11-05',
    url: 'https://investors.agilityrobotics.com/news-releases/news-release-details/agility-becomes-first-us-publicly-listed-pure-play-humanoid',
    type: 'press',
  },
  {
    id: 'backtrack-vla-2026',
    title: "If at First You Don't Succeed, Backtrack: Lightweight Recovery for Frozen VLAs",
    authors: ['Thomas Landeg', 'Thierry Tambe'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.32941',
    url: 'https://arxiv.org/abs/2610.32941',
    type: 'paper',
  },
  {
    id: 'inspect-robots-2026',
    title: 'Inspect Robots: Evaluating the Capabilities and Safety of Embodied AI',
    authors: [
      'Christopher Leet', 'Achu Menon', 'Sravanthi Machcha', 'Sabrina Zou', 'Aayushya Patel',
      'Aditya Kumar Singh', 'Anish Kr Singh', 'Galaba Vamsi', 'Javin Ahuja', 'Sai Asish Yamani',
      'Tushar Anand', 'Vedang Alle', 'Zihan Jack Zhang', 'Tzu Kit Chan', 'Jay Chooi',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.06306',
    url: 'https://arxiv.org/abs/2610.06306',
    type: 'paper',
  },
  {
    id: 'carryon-harness-2026',
    title: 'CarryOn: A Dual-Loop Harness for Personalized and Reliable Robot Assistance',
    authors: [
      'Zixuan Wang', 'Yuqi Liu', 'Yuxin Chen', 'Sengqiao Yang', 'Jinhui Ye', 'Pengguang Chen',
      'Changsheng Lu', 'Shu Liu', 'Bei Yu', 'Jiaya Jia',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.21453',
    url: 'https://arxiv.org/abs/2610.21453',
    type: 'paper',
  },
  {
    id: 'implied-harm-vla-2026',
    title: 'What the Guard Misses, the Robot Executes: Implied Harm in VLA Instructions',
    authors: ['Sripad Karne', 'Arjun Balaji'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.05818',
    url: 'https://arxiv.org/abs/2610.05818',
    type: 'paper',
  },
  // dexterity
  {
    id: 'holson-pi-deep-dive-2026',
    title: 'Physical Intelligence Wins the Olympics: Deep Dive',
    authors: ['Benjie Holson'],
    year: 2026,
    venue: 'General Robots (Substack), 2026-01-22',
    url: 'https://generalrobots.substack.com/p/physical-intelligence-wins-the-olympics',
    type: 'blog',
  },
  {
    id: 'holson-olympics-part2-2026',
    title: "Benjie's Humanoid Olympics: Part II",
    authors: ['Benjie Holson'],
    year: 2026,
    venue: 'General Robots (Substack), 2026-01-27',
    url: 'https://generalrobots.substack.com/p/benjies-humanoid-olympics-part-ii',
    type: 'blog',
  },
  {
    id: 'tesla-q3-2026-call',
    title: 'Tesla (TSLA) Q3 2026 Earnings Call Transcript',
    authors: ['Motley Fool Transcribing'],
    year: 2026,
    venue: 'The Motley Fool, 2026-10-22',
    url: 'https://www.fool.com/earnings/call-transcripts/2026/10/22/tesla-tsla-q3-2026-earnings-call-transcript/',
    type: 'press',
  },
  {
    id: 'lingbot-touch-2026',
    title: 'Learning Heterogeneous Tactile Representation for General Dexterous Manipulation',
    authors: [
      'Bing Han', 'Yichuan Peng', 'Haoyu Dong', 'Yuanmeng Hu', 'Yongyi Jia', 'Fangjing Wang',
      'Kecheng Zheng', 'Yiming Zhang', 'Yanhong Zeng', 'Xiaoqing Zhang', 'Chen Song', 'Rundong Zou',
      'Anqi Dong', 'Yuan Guan', 'Ka Leong Cheng', 'Xing Zhu', 'Yujun Shen', 'Nan Xue', 'Wei Ning',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.12806',
    url: 'https://arxiv.org/abs/2611.12806',
    type: 'paper',
  },
  {
    id: 'lingbot-touch-release-2026',
    title: 'Robbyant Releases LingBot-Touch to Bring General-Purpose Touch Perception to Robots',
    authors: ['Robbyant'],
    year: 2026,
    venue: 'Business Wire release via FinancialContent, 2026-11-10',
    url: 'https://www.financialcontent.com/article/bizwire-2026-11-10-robbyant-releases-lingbot-touch-to-bring-general-purpose-touch-perception-to-robots',
    type: 'press',
  },
  {
    id: 'tactile-vs-wrist-camera-2026',
    title: 'Tactile Sensors Are an Effective Substitute for Wrist Cameras in Contact-Rich or Occluded Manipulation',
    authors: ['Aijia Yang', 'Arsh Tangri', 'Sergey Zakharov', 'Krishna Murthy Jatavallabhula'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.10490',
    url: 'https://arxiv.org/abs/2611.10490',
    type: 'paper',
  },
  {
    id: 'tactile-cues-study-2026',
    title: 'Which Physical Tactile Cues Matter for Contact-Rich Imitation Learning? A Controlled Real-Robot Study',
    authors: ['Xuhao Qin', 'Xiyan Huang', 'Haoyu Dong', 'Xi Zhang', 'Chenxi Xiao'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.06673',
    url: 'https://arxiv.org/abs/2611.06673',
    type: 'paper',
  },
  {
    // Verified against arXiv v1 (2026-11-14): eight UniVTAC and eleven
    // OpenViTac simulated tasks, 80 and 130 scene seeds per input setting;
    // 93.8% and 81.8% with tactile images, 76.3% and 80.6% vision-only;
    // strongest published specialists SimpleTouch 70.9%, OpenVTLA 68.7%.
    id: 'astra-visuotactile-2026',
    title: 'GPT-6 Astra Is a Native Visuo-Tactile Policy for Contact-Rich Manipulation',
    authors: ['Chen Yang', 'Linzhe Shi', 'Hang Zhang', 'Mu Xu', 'Jiansheng Fan', 'Chen Wang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.26846',
    url: 'https://arxiv.org/abs/2610.26846',
    type: 'paper',
  },
  {
    // Verified against arXiv v1 (2026-11-14): Table 4 and appendix G.1, Ego
    // Humanoid vision-only success 52.45% (Visual PT, touch discarded, same
    // RGB data and compute) to 71.72% (1000H); 27 seen and 66 unseen trials
    // per task. EgoVLA (arXiv 2507.12440) calls Ego Humanoid a simulation
    // benchmark.
    id: 'spark-0-2026',
    title: 'Spark-0: Scaling Spatially Aligned Tactile Pretraining for Robot Dexterous Manipulation',
    authors: [
      'Tianxing Chen', 'Wenwei Lin', 'Chuqiao Lyu', 'Peicheng Xiang', 'Junyuan Tang', 'Tian Nian',
      'Zijian Cai', 'Kehe Ye', 'Chenze Yu', 'Wenxuan Zhu', 'Eric J. Chen', 'Yan Qin', 'Yue Chen',
      'Tongyu Wu', 'Junhao Gong', 'Kai-Chong Lei', 'Jiahao Zhang', 'Kailun Su', 'Qiwei Liang',
      'Renjing Xu', 'Ping Luo', 'Wenbo Ding',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.22342',
    url: 'https://arxiv.org/abs/2610.22342',
    type: 'paper',
  },
  {
    // Verified against arXiv v3 (2026-11-14): N0-VTLA post-trained on 50
    // teleoperated demonstrations per task, with and without TouchScale
    // mid-training; four real contact-rich tasks, 20 trials each; average
    // success 22.5% without mid-training, 57.5% with it.
    id: 'touchscale-2026',
    title: 'TouchScale: 500 Hours of Human Vision and Touch for Visual-Tactile Learning',
    authors: [
      'Dayou Li', 'Hao Wang', 'Qianqian Yang', 'Zihao Zhu', 'Haoquan Fang', 'Ziyao Zeng', 'Yan Han',
      'Zihan Wang', 'Yan Wang', 'Baoru Huang', 'Dilin Wang', 'Kenji Shimada', 'Yiyue Luo',
      'Manling Li', 'Teresa Lv', 'Mustafa Mukadam', 'Rakesh Ranjan', 'Ruohan Zhang', 'Qi He',
      'Changliu Liu', 'Xu Chen', 'Marco Pavone', 'Bangya Liu', 'Jiachen Li', 'Masayoshi Tomizuka',
      'Zhiwen Fan',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.10288',
    url: 'https://arxiv.org/abs/2610.10288',
    type: 'paper',
  },
  {
    // Verified against arXiv v3 (2026-11-14): real Shadow Dexterous Hand
    // Lite, 16 binary contact channels plus joint encoders, no vision; one
    // continuous trial of 225 consecutive 180-degree rotations; over 10
    // hardware trials the C3 policy averages 34.75 full rotations, 5.00 with
    // tactile input switched off (C3-TacOff).
    id: 'blind-baoding-2026',
    title: 'No Eyes, No Problem: What Does Touch Contribute to Blind Baoding Ball Manipulation?',
    authors: ['Ayush Deshmukh', 'Nalin Agarwal', 'Elle Miller', 'Sethu Vijayakumar'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.23438',
    url: 'https://arxiv.org/abs/2610.23438',
    type: 'paper',
  },
  {
    // Verified against the live page (2026-11-14): "The STF contains 17
    // taxels each providing a 3D response, sensitive to both normal and
    // tangential forces from about 0.2N to 20N"; the comparison table lists
    // the STF as available on the Dexterous Hand Series.
    id: 'shadow-sensors-2026',
    title: 'Sensors',
    authors: ['Shadow Robot'],
    year: 2026,
    url: 'https://shadowrobot.com/sensors/',
    type: 'docs',
  },
  // generalization
  {
    id: 'behavior-challenge-2026-results',
    title: 'The results for the 2nd BEHAVIOR Challenge at CoRL 2026 are out',
    authors: ['Stanford Vision and Learning Lab'],
    year: 2026,
    venue: 'X post, 2026-11-09',
    url: 'https://x.com/StanfordSVL/status/2119892262134177927',
    type: 'press',
  },
  // competing-theses
  {
    id: 'fan-robotics-end-game-2026',
    title: "Robotics' End Game: Nvidia's Jim Fan",
    authors: ['Jim Fan'],
    year: 2026,
    venue: 'Sequoia Capital AI Ascent 2026, video published 2026-04-30',
    url: 'https://www.youtube.com/watch?v=3Y8aq_ofEVs',
    type: 'press',
  },
  {
    id: 'brooks-does-until-2026',
    title: "Does until it doesn't and doesn't until it does",
    authors: ['Rodney Brooks'],
    year: 2026,
    venue: 'rodneybrooks.com, 2026-11-08',
    url: 'https://rodneybrooks.com/does-until-it-doesnt-and-doesnt-until-it-does/',
    type: 'blog',
  },
  {
    id: 'brooks-four-time-scales-2026',
    title: 'Four Time Scales for Technology Development and Deployment',
    authors: ['Rodney Brooks'],
    year: 2026,
    venue: 'rodneybrooks.com, 2026-08-01',
    url: 'https://rodneybrooks.com/four-time-scales-for-technology-development-and-deployment/',
    type: 'blog',
  },
  {
    id: 'robojepa-2026',
    title: 'RoboJEPA: Scaling Robotic Latent World Models',
    authors: [
      'Artem Zholus', 'Nicolas Beltran-Velez', 'Jianhao Yuan', 'Sarath Chandar', 'Tushar Nagarajan',
      'Daniel Severo', 'Koustuv Sinha', 'Michal Drozdzal', 'Adriana Romero Soriano', 'Jeannette Bohg',
      'Nicolas Ballas', 'Mahmoud Assran',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.10515',
    url: 'https://arxiv.org/abs/2610.10515',
    type: 'paper',
  },
  // competing-theses, general-model section
  {
    id: 'fortune-openai-robotics-2026',
    title: 'Exclusive: OpenAI disbands its stand-alone robotics team as its general models start running robots',
    authors: ['Wen Shao'],
    year: 2026,
    venue: 'Fortune, 2026-11-13',
    url: 'https://fortune.com/2026/11/13/openai-disbands-robotics-team-as-its-general-models-start-running-robots/',
    type: 'press',
  },
  {
    id: 'nvidia-astranomy-2026',
    title: 'Astranomy: An Empirical Study of GPT-6 Astra as a native robot policy',
    authors: ['Jenai Xuning Yang', 'Ashna Khetan', 'Shun Zhang'],
    year: 2026,
    venue: 'NVIDIA Seattle Robotics Lab project page, CoRL 2026 LBR, 2026-10-14',
    url: 'https://research.nvidia.com/labs/srl/projects/astranomy/',
    type: 'paper',
  },
  {
    id: 'aa-robotics-2026',
    title: 'Welcome to the era of embodied AI: Introducing AA-Robotics v0.1',
    authors: ['Artificial Analysis'],
    year: 2026,
    venue: 'Artificial Analysis, 2026-10-14',
    url: 'https://artificialanalysis.ai/articles/aa-robotics',
    type: 'blog',
  },
  {
    id: 'robocolosseum-2026',
    title: 'RoboColosseum: Evaluating Physical Intelligence at Scale In-The-Wild',
    authors: [
      'Tan Sang Nguyen', 'Yi Ru Wang', 'Shailesh Shailesh', 'Gang Yang', 'Jiamo Hu', 'Jianuo Jiang', 'Haoquan Fang',
      'Zhongzheng Ren', 'Zhongyi Luo', 'Ian Chong', 'Aaron Tung', 'Santiago Pravisani', 'Minghui Lin', 'Yao Mo',
      'Ishneet Singh', 'Benjamin Tee', 'Harold Soh', 'Siddhartha Srinivasa', 'Dieter Fox', 'David Hsu', 'Haoming Song',
      'Maxime Ellerbach', 'Thomas Wolf', 'Pepijn Kooijmans', 'Ruijie He', 'Michael Cho', 'Jiafei Duan',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.02497',
    url: 'https://arxiv.org/abs/2611.02497',
    type: 'paper',
  },
  {
    id: 'sensenova-astra-2026',
    title: 'Has GPT-6-Astra Achieved Embodied Intelligence?',
    authors: [
      'SenseNova', 'Joint Research Team', 'Zhongang Cai', 'Ziang Cao', 'Tailai Chen', 'Han Chong Chua', 'Linjun Dai',
      'Hanming Deng', 'Hokin Deng', 'Haiwen Diao', 'Chenjing Ding', 'Weichen Fan', 'Xiao Fu', 'Zerui Gong',
      'Chenyang Gu', 'Zexin He', 'Zhi Hou', 'Bo Li', 'Qinyue Li', 'Quanzhou Li', 'Xiaowan Li', 'Zhichao Liao',
      'Dahua Lin', 'Zilong Lin', 'Bo Liu', 'Chunxiao Liu', 'Pengfei Liu', 'Tianqi Liu', 'Ziwei Liu', 'Chen Change Loy',
      'Lewei Lu', 'Jiapeng Luo', 'Yuexiao Ma', 'Liang Pan', 'Xingang Pan', 'Oscar Qian', 'Ziyi Shang', 'Yuyao Shao',
      'Dawei Su', 'Dacheng Tao', 'Qingyi Tao', 'Quan Wang', 'Ruisi Wang', 'Xiaogang Wang', 'Ziyi Wang', 'Beichen Wen',
      'Donghao Wu', 'Jiaxu Wu', 'Silei Wu', 'Xiaoming Wu', 'Zhonghua Wu', 'Hongcan Xiao', 'Weiye Xu',
      'Atsushi Yamashita', 'Lei Yang', 'Zhe Yang', 'Baiqiao Yin', 'Wanqi Yin', 'Hanfei Zhao', 'Tianbo Zhong',
      'Long Zhuo', 'Jing Zuo',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.22471',
    url: 'https://arxiv.org/abs/2610.22471',
    type: 'paper',
  },
  {
    id: 'zap-2026',
    title: 'Pretraining Knows What, Simulation Teaches How: Compositional Generalization for Agentic Robotics',
    authors: [
      'Benjamin Pikus', 'Daniel Saunders', 'Mircea Mironenco', 'Salman Mohammadi', 'Mathew Mathew', 'Sirou Zhu',
      'Divya Makkar', 'Xuhua Huang', 'Qinbo Li', 'Supreeth Narasimhaswamy', 'Siyuan Cen', 'Dejia Xu', 'Shyamal Buch',
      'Thomas Neff',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.35817',
    url: 'https://arxiv.org/abs/2610.35817',
    type: 'paper',
  },
  {
    id: 'justrua-2026',
    title: 'JustRUA: A Controlled Study of GPT-6 Robot-Use Agents',
    authors: [
      'Zefan Wang', 'Yufan Dang', 'Xuanwei Shi', 'Mingqi Gao', 'Cheng Yin', 'SikYuen Tam', 'Hanyu Liu', 'Yasheng Wang',
      'Yaxi Lu', 'Songyang Zhang', 'Xin Cong', 'Yuan Yao',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.16009',
    url: 'https://arxiv.org/abs/2611.16009',
    type: 'paper',
  },
  // bear-case
  {
    id: 'crunchbase-robotics-q3-2026',
    title: 'Crunchbase Data Shows Q3 Robotics Startup Funding Jumps 185% As US And China Lead Physical AI Push',
    authors: ['Gené Teare'],
    year: 2026,
    venue: 'Crunchbase News, 2026-10-27',
    url: 'https://news.crunchbase.com/venture/q3-2026-us-china-robotics-startup-funding-jumps-physical-ai-push/',
    type: 'press',
  },
  {
    id: 'bi-agility-ipo-2026',
    title: 'Agility Robotics is taking humanoid robots public in a first for Wall Street',
    authors: ['Rya Jetha'],
    year: 2026,
    venue: 'Business Insider, 2026-11-05',
    url: 'https://www.businessinsider.com/agility-robotics-heads-to-wall-street-tough-road-to-profit-2026-11',
    type: 'press',
  },
  {
    id: 'caixin-unitree-valuation-2026',
    title: 'Unitree Warns of Valuation Risks After Shares Surge More Than 65%',
    authors: ['Han Yuhang'],
    year: 2026,
    venue: 'Caixin Global, 2026-10-27',
    url: 'https://www.caixinglobal.com/2026-10-27/unitree-warns-of-valuation-risks-after-shares-surge-more-than-65-102497621.html',
    type: 'press',
  },
  // safety-and-assurance
  {
    // Catalogue page read 2026-11-12: second edition retitled "Robotics - Safety
    // requirements for service robots"; FDIS ballot 50.20 on 2026-09-15, closed
    // 50.60 on 2026-11-11, now stage 60.00 (under publication). Will replace ISO 13482:2014.
    id: 'iso-13482-revision-2026',
    title: 'ISO 13482, Robotics \u2014 Safety requirements for service robots',
    authors: ['ISO'],
    year: 2026,
    venue: 'ISO International Standard, stage 60.00 under publication (public catalogue entry)',
    url: 'https://www.iso.org/standard/83498.html',
    type: 'docs',
  },
  {
    id: 'iso-13482-2014',
    title: 'ISO 13482:2014, Robots and robotic devices \u2014 Safety requirements for personal care robots',
    authors: ['ISO'],
    year: 2014,
    venue: 'ISO International Standard (public catalogue entry)',
    url: 'https://www.iso.org/standard/53820.html',
    type: 'docs',
  },
  {
    id: 'eu-ai-omnibus-2026',
    title: 'Regulation (EU) 2026/1744 of the European Parliament and of the Council of 8 July 2026 amending Regulations (EU) 2024/1689, (EU) 2018/1139 and (EU) 2023/1230 as regards the simplification of the implementation of harmonised rules on artificial intelligence (Digital Omnibus on AI)',
    authors: ['European Parliament and Council of the European Union'],
    year: 2026,
    venue: 'Official Journal of the European Union L, 24.7.2026',
    url: 'https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng',
    type: 'docs',
  },
  {
    id: 'korea-humanoid-sandbox-2026',
    title: 'Korea Clears Safety Rules to Put 20 Humanoid Robots on Factory Floors',
    authors: ['Lee Jung-hoon'],
    year: 2026,
    venue: 'Seoul Economic Daily, 2026-10-14',
    url: 'https://en.sedaily.com/economy/2026/10/14/korea-clears-safety-rules-to-put-20-humanoid-robots-on',
    type: 'press',
  },
  {
    id: 'cnbc-figure-whistleblower-2025',
    title: "Figure AI sued by whistleblower who warned that startup's robots could 'fracture a human skull'",
    authors: ['Lora Kolodny'],
    year: 2025,
    venue: 'CNBC, 2025-11-21',
    url: 'https://www.cnbc.com/2025/11/21/figure-ai-sued.html',
    type: 'press',
  },
];
