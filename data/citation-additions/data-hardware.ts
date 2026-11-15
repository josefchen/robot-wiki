/**
 * Sources added to the data-hardware articles in the November 2026 review.
 * Same schema and author-field policy as data/citations.ts: every entry was
 * opened and checked against the page it names.
 */
import type { Citation } from '../schemas/citation.ts';

export const ADDITIONS: Citation[] = [
  // open-humanwam-2026: arXiv Atom API and abstract read 2026-11-12 (v1 4 Nov 2026; PKU, NUS, MIT, UCSB, NVIDIA).
  {
    id: 'open-humanwam-2026',
    title: 'Open-HumanWAM: An Open Recipe for Scaling Human and Robot Experience for Embodied Foundation Models',
    authors: ['Juncheng Ma', 'Jiaxin Li', 'Jiankai Tu', 'Bo Liang', 'Guodong Lv', 'Yufan Deng', 'Junzhe Tang', 'Liangzhu Yang', 'Chen Bian', 'Shukai Gong', 'Ye Huang', 'Yintianrun Zhang', 'Zicong Cao', 'Baohao Zhu', 'Jianxin Bi', 'Tengfei Yan', 'Yinyuan Zhang', 'Kewei Zhang', 'Xinglong Chen', 'Kaiqi Chen', 'Duomin Wang', 'Xiaotian Tang', 'Liang Tan', 'Li Li', 'Yuan Xu', 'Haosen Yang', 'Yuqi Wang', 'Jingfei Xia', 'Songyan Huang', 'Zhiyang Dou', 'Zhen Dong', 'Enze Xie', 'Wojciech Matusik', 'Tat-Seng Chua', 'Daquan Zhou'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.06817',
    url: 'https://arxiv.org/abs/2611.06817',
    type: 'paper',
  },
  // Sources for data-hardware/data-market (The Robot Data Market), opened and checked 2026-11-14.
  // pyrua-datafarm-2026: arXiv abstract and HTML read 2026-11-14 (v1 3 Nov 2026). "about $290 per usable
  // hour of data by our calculation ... ($190–520 across the assumptions ...), before any robot, venue, or
  // setup cost"; China "a quote we obtained ... about RMB 800 ($117) per hour"; generated data "$107 on
  // average ... each further hour costs $81".
  {
    id: 'pyrua-datafarm-2026',
    title: 'PyRUA-DataFarm: LLM Agent as a Cost-Efficient Teleoperator for Real-Ready Robot Data',
    authors: ['Kewei Zhang', 'Juncheng Ma', 'Guodong Lv', 'Duomin Wang', 'Feixiang Ruan', 'Ruiyang Si', 'Chuanrui Zhang', 'Yuxuan Chen', 'Hao Chen', 'Yichen Liu', 'Yintianrun Zhang', 'Yufan Deng', 'Enze Xie', 'Daquan Zhou'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.05320',
    url: 'https://arxiv.org/abs/2611.05320',
    type: 'paper',
  },
  // cls-data-price-investigation-2026: read 2026-11-14 (dated 2026-11-11). STAR Market Daily investigation,
  // source line Cailian Press; byline names no reporter. Real-robot list price up to RMB 1,000, raw monocular
  // data RMB 5 to 10 an hour (an industry veteran quoted under a pseudonym), collector pay about RMB 8; Lingyu CEO Jin Ge's reference prices; >70 training grounds
  // open and 40+ planned by June 2026; Shao Tianlan's September criticism.
  {
    id: 'cls-data-price-investigation-2026',
    title: '具身数据采集价格迷雾调查：千元报价，8元时薪，差价去哪了？',
    authors: ['Cailian Press'],
    year: 2026,
    venue: '21st Century Business Herald, from Cailian Press (STAR Market Daily), 2026-11-11',
    url: 'https://m.21jingji.com/article/20261111/herald/4fb59aec91c1d17ef8059497e7a2b001.html',
    type: 'press',
  },
  // beijing-daily-data-collectors-2026: read 2026-11-14 (dated 2026-09-04). Jiyuan Zhihang pays
  // "有效采集时薪为70元"; an agency-placed collector earned "每小时薪资15元". No reporter named.
  {
    id: 'beijing-daily-data-collectors-2026',
    title: '具身智能产业发展打开灵活就业新通道',
    authors: ['Beijing Daily'],
    year: 2026,
    venue: 'Xinhuanet, from Beijing Daily, 2026-09-04',
    url: 'https://www.news.cn/tech/20260904/8b947072714f4f3ebe72c7fb9a092c0f/c.html',
    type: 'press',
  },
  // techxingqiu-data-collectors-2026: read 2026-11-14 from m.36kr.com (published 2026-07-13). Byline 林京,
  // Tech Xingqiu, republished by 36Kr: collectors cost "时薪30元", resold at "300-500元/小时".
  {
    id: 'techxingqiu-data-collectors-2026',
    title: '我给机器人当“燃料”：叠衣服时薪30元，卖数据估值150亿',
    authors: ['Jing Lin'],
    year: 2026,
    venue: '36Kr, from Tech Xingqiu, 2026-07-13',
    url: 'https://36kr.com/p/3893319165360899',
    type: 'press',
  },
  // jiazi-data-collection-2026: read 2026-11-14 from m.36kr.com (published 2026-06-25). Byline 卫琳聪,
  // Jiazi Guangnian, republished by 36Kr. Beijing humanoid center data lead 夏华林: capacity "十几万小时" a
  // year, "一小时售价500到1000元", customers mainly leading robot firms and model companies, 120+ robots.
  {
    id: 'jiazi-data-collection-2026',
    title: '具身数据采集产业链调查：被机器人采集的人',
    authors: ['Lincong Wei'],
    year: 2026,
    venue: '36Kr, from Jiazi Guangnian, 2026-06-25',
    url: 'https://36kr.com/p/3868536772236297',
    type: 'press',
  },
  // nbd-galaxea-data-cost-2026: read 2026-11-14 (dated 2026-06-17). Byline 每经记者 可杨. Galaxea CEO:
  // human-centric collection RMB 50-100/h, robot-centric about RMB 250/h, industry average RMB 100-150/h.
  {
    id: 'nbd-galaxea-data-cost-2026',
    title: '具身智能“卷”数据：行业共识质量为先 多样性和流通性仍有不足',
    authors: ['Yang Ke'],
    year: 2026,
    venue: 'Sina Finance, from National Business Daily, 2026-06-17',
    url: 'https://finance.sina.com.cn/roll/2026-06-17/doc-inicrume5928552.shtml',
    type: 'press',
  },
  // yicai-mifeng-2026: read 2026-11-14 (dated 2026-04-17). Yicai report, no reporter named. Mifeng CEO Yao
  // Maoqing: real-robot data "每小时500元至1000元"; MEgo robot-free hardware; ten-million-hour ("千万小时级")
  // data capacity in 2026.
  {
    id: 'yicai-mifeng-2026',
    title: '智元生态再扩容，旗下觅蜂科技抢滩具身智能数据赛道',
    authors: ['Yicai'],
    year: 2026,
    venue: 'Sina Tech, from Yicai, 2026-04-17',
    url: 'https://finance.sina.com.cn/tech/roll/2026-04-17/doc-inhuuimk6582970.shtml',
    type: 'press',
  },
  // huxiu-collection-centers-2026: read 2026-11-14 (dated 2026-09-20). Byline 易玉琴. 106 publicly disclosed
  // centralized centers to August 2026, 84 operating without a stable business loop; real-robot data RMB
  // 500-1,000/h, UMI-style RMB 300-400, simulated synthetic RMB 200-500; few repeat buyers.
  {
    id: 'huxiu-collection-centers-2026',
    title: '遍地开花的数采中心，开始批量露馅',
    authors: ['Yuqin Yi'],
    year: 2026,
    venue: 'Huxiu, 2026-09-20',
    url: 'https://www.huxiu.com/article/4892109.html',
    type: 'press',
  },
  // cls-miit-data-cost-2026: read 2026-11-14 (dated 2026-11-08). Byline 付静, Cailian Press, republished by
  // Huxiu. Li Shuai, deputy director of the AI center at MIIT's Fifth Electronics Research Institute, at
  // Wuzhen: effective stock a million hours against demand of a hundred million; real-robot data costs RMB
  // 500-1,000 an hour.
  {
    id: 'cls-miit-data-cost-2026',
    title: '具身智能数据赛道“变天”',
    authors: ['Jing Fu'],
    year: 2026,
    venue: 'Huxiu, from Cailian Press, 2026-11-08',
    url: 'https://www.huxiu.com/article/4903954.html',
    type: 'press',
  },
  // npr-robot-data-workers-2026: read 2026-11-14 (dated 2026-10-14). Objectways pays hundreds across India;
  // one recorder earns "about $2.60 an hour".
  {
    id: 'npr-robot-data-workers-2026',
    title: 'These workers help train robots who could one day steal their jobs',
    authors: ['Diaa Hadid'],
    year: 2026,
    venue: 'NPR',
    url: 'https://www.npr.org/2026/10/14/g-s1-146907/these-workers-help-train-robots-who-could-one-day-steal-their-jobs',
    type: 'press',
  },
  // globe-gig-robot-data-2026: read 2026-11-14 (dated 2026-10-09). Atlas Capture US$2.86 and US$2.94 an hour
  // of approved footage; Human Motion Data 38,000 h from 3,900 contributors, US$3 per approved hour; XDOF
  // raised US$70-million this year, "arm farms" in Southeast Asia.
  {
    id: 'globe-gig-robot-data-2026',
    title: 'Startups are hiring low-paid gig workers to train robots on manual labour',
    authors: ['Joe Castaldo'],
    year: 2026,
    venue: 'The Globe and Mail',
    url: 'https://www.theglobeandmail.com/business/article-startups-are-hiring-low-paid-gig-workers-to-train-robots-on-manual/',
    type: 'press',
  },
  // mittr-micro1-gig-2026: read 2026-11-14 (dated 2026-04-01). A Micro1 recorder in Nigeria "is paid $15 an
  // hour".
  {
    id: 'mittr-micro1-gig-2026',
    title: 'The gig workers who are training humanoid robots at home',
    authors: ['Michelle Kim'],
    year: 2026,
    venue: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/2026/04/01/1134863/humanoid-data-training-gig-economy-2026-breakthrough-technology/',
    type: 'press',
  },
  // cnn-micro1-2026: read 2026-11-14 (dated 2026-04-04). Micro1: about 4,000 recorders in 71 countries
  // sending more than 160,000 hours of video a month.
  {
    id: 'cnn-micro1-2026',
    title: 'How filming your chores could train the android butlers of the future',
    authors: ['Stephanie Yang'],
    year: 2026,
    venue: 'CNN Business',
    url: 'https://www.cnn.com/2026/04/04/tech/humanoid-robot-training-jobs-intl-hnk-dst',
    type: 'press',
  },
  // bi-robot-data-labor-2026: read 2026-11-14 (dated 2026-10-15). Shift pays more than 35,000 people, "up to
  // $30 an hour", about $10 million paid out in 2026 (CEO Bercan Kilic).
  {
    id: 'bi-robot-data-labor-2026',
    title: 'Inside the global race to train robots on human work',
    authors: ['Rya Jetha'],
    year: 2026,
    venue: 'Business Insider',
    url: 'https://www.businessinsider.com/ai-companies-human-workers-robot-training-data-2026-10',
    type: 'press',
  },
  // scale-physical-ai-2025: read 2026-11-14 (dated 2025-09-24). "more than 100,000 production hours
  // completed at our prototyping laboratory in San Francisco"; customers Physical Intelligence, Generalist
  // AI, Cobot.
  {
    id: 'scale-physical-ai-2025',
    title: 'Expanding Our Data Engine for Physical AI',
    authors: ['Ben Levin'],
    year: 2025,
    venue: 'Scale AI blog',
    url: 'https://scale.com/blog/physical-ai',
    type: 'blog',
  },
  // mecka-series-b-2026: read 2026-11-14 (dated 2026-10-07; byline "Josh, Jason and the Mecka team"). Own
  // multi-sensor hardware; run-rate revenue over $100 million in June 2026; "multiple Mag 7 companies".
  {
    id: 'mecka-series-b-2026',
    title: 'Mecka raises $60M Series B led by Sequoia Capital',
    authors: ['Mecka'],
    year: 2026,
    venue: 'Mecka news',
    url: 'https://www.mecka.ai/news/series-b',
    type: 'press',
  },
  // technode-genrobot-2026: read 2026-11-14 (dated 2026-11-02). $100 million Series A+, disclosed 2 November;
  // recording systems for human demonstrations and the Matrix platform.
  {
    id: 'technode-genrobot-2026',
    title: 'Robot-training data startup GenRobot AI raises $100 million in Series A+ funding',
    authors: ['TechNode Feed'],
    year: 2026,
    venue: 'TechNode',
    url: 'https://technode.com/2026/11/02/robot-training-data-startup-genrobot-ai-raises-100-million-in-series-a-funding/',
    type: 'press',
  },
  // abc-130k-card-2026: Hugging Face card read 2026-11-14: 3,590.7 hours, 130,703 episodes on two-arm YAM
  // stations, "Released under the Apache License 2.0", gated by accepted conditions; "the largest open-source
  // robot teleoperation dataset".
  {
    id: 'abc-130k-card-2026',
    title: 'ABC-130k',
    authors: ['XDOF'],
    year: 2026,
    venue: 'Hugging Face dataset card',
    url: 'https://huggingface.co/datasets/XDOF/ABC-130k',
    type: 'docs',
  },
  // roboticscenter-marketplace: read 2026-11-14 (undated page; operator DeepAware, Inc., per the page's
  // structured data). 26 datasets priced per recorded hour, 10-hour minimum: egocentric $90-270,
  // teleoperation $450-1,200, handheld gripper $375-600, motion capture $250-900, hands and tactile
  // $225-1,800.
  {
    id: 'roboticscenter-marketplace',
    title: 'Robotics Data Marketplace: Buy Robot Training Data',
    authors: ['Robotics Center'],
    year: 'n.d.',
    accessedOn: '2026-11-14',
    venue: 'Robotics Center',
    url: 'https://www.roboticscenter.ai/marketplace',
    type: 'docs',
  },
  // restofworld-china-data-centers-2026: read 2026-11-14 (dated 2026-01-07). Citing Interact Analysis: by
  // December more than 40 state-owned centers announced, about two dozen operating.
  {
    id: 'restofworld-china-data-centers-2026',
    title: 'In Chinese data factories, workers teach humanoid robots boring tasks',
    authors: ['Viola Zhou'],
    year: 2026,
    venue: 'Rest of World',
    url: 'https://restofworld.org/2026/china-robots-training-centers-workers/',
    type: 'press',
  },
  // standard-umi-collectors-2026: read 2026-11-14 (dated 2026-08-19; no reporter named). UMI data
  // collectors offered "around 20 yuan (HK$22) an hour or 200 yuan a day"; at least 30 data-collection
  // facilities by the end of 2025.
  {
    id: 'standard-umi-collectors-2026',
    title: 'China’s embodied AI boom fuels demand for human-collected training data',
    authors: ['The Standard'],
    year: 2026,
    venue: 'The Standard (Hong Kong)',
    url: 'https://www.thestandard.com.hk/china/article/340377/Chinas-embodied-AI-boom-fuels-demand-for-human-collected-training-data',
    type: 'press',
  },
  // interact-analysis-centers-2026: read 2026-11-14 (dated 2026-05-27). At end-April 2026 at least 90
  // centers operating or planned, at least 64 of them operating; scope: state-backed centers plus larger
  // company centers, no university labs.
  {
    id: 'interact-analysis-centers-2026',
    title: '中国国内の90カ所超のヒューマノイドロボット向けデータ収集センターを総覧する',
    authors: ['Interact Analysis'],
    year: 2026,
    venue: 'Interact Analysis on note, 2026-05-27',
    url: 'https://note.com/interactanalysis/n/n0de3a347c001',
    type: 'blog',
  },
  // sedaily-kimm-data-factory-2026: read 2026-11-14 (dated 2026-11-03). Byline printed "Cho Yun-Jin",
  // recorded given name first so the chip prints the family name. KIMM operates 12 humanoids.
  {
    id: 'sedaily-kimm-data-factory-2026',
    title: 'Korea Opens First Data Factory to Train Humanoid Robots',
    authors: ['Yun-Jin Cho'],
    year: 2026,
    venue: 'Seoul Economic Daily',
    url: 'https://en.sedaily.com/business/2026/11/03/korea-opens-first-data-factory-to-train-humanoid-robots',
    type: 'press',
  },
  // latimes-encord-2026: read 2026-11-14 (dated 2026-05-31). "Encord charges clients up to $1,000 per hour
  // for training data"; clients Toyota Research Institute and Weave.
  {
    id: 'latimes-encord-2026',
    title: 'How Silicon Valley robot training and teleoperating startups are teaching humanoids to do everyday tasks',
    authors: ['Nilesh Christopher'],
    year: 2026,
    venue: 'Los Angeles Times',
    url: 'https://www.latimes.com/business/story/2026-05-31/how-silicon-valley-robot-training-teleoperating-startups-are-teaching-humanoids-to-do-everyday-tasks',
    type: 'press',
  },
  // unidata-datarade-egocentric: read 2026-11-14 (undated listing). "starts at USD30,000 per purchase" for
  // 4,050 hours; the per-hour figure in the article is the article's own division.
  {
    id: 'unidata-datarade-egocentric',
    title: 'Egocentric Video Dataset: 4,050 Hours of First-Person Videos for Physical AI, Robotics & Egocentric Vision',
    authors: ['Unidata'],
    year: 'n.d.',
    accessedOn: '2026-11-14',
    venue: 'Datarade',
    url: 'https://datarade.ai/data-products/egocentric-video-dataset-239-3-hours-for-egocentric-action-unidata',
    type: 'docs',
  },
  // pi-robot-operator-posting: read 2026-11-14 (live posting). "Compensation: $25/hour".
  {
    id: 'pi-robot-operator-posting',
    title: 'Robot Operator',
    authors: ['Physical Intelligence'],
    year: 'n.d.',
    accessedOn: '2026-11-14',
    venue: 'Physical Intelligence careers (Ashby)',
    url: 'https://jobs.ashbyhq.com/physicalintelligence/eb3ed968-630f-429a-9e44-5508b77d554b',
    type: 'docs',
  },
  // onex-senior-operator-posting: read 2026-11-14 (job-board copy; 1X's own page redirected). San Carlos,
  // CA, "36-46 Hourly".
  {
    id: 'onex-senior-operator-posting',
    title: 'Senior Operator - Data Collection (Day Shift)',
    authors: ['1X Technologies'],
    year: 'n.d.',
    accessedOn: '2026-11-14',
    venue: 'Built In San Francisco',
    url: 'https://www.builtinsf.com/job/senior-operator-data-collection-day-shift/9043676',
    type: 'docs',
  },
  // ay-robots-pricing: read 2026-11-14 (undated page). Operator pay: Beginner EUR 6-10, Skilled EUR 10-15,
  // Expert EUR 15-22 an hour; rates vary by region.
  {
    id: 'ay-robots-pricing',
    title: 'Pricing - Pay-Per-Hour Robot Teleoperation',
    authors: ['AY-Robots'],
    year: 'n.d.',
    accessedOn: '2026-11-14',
    venue: 'AY-Robots',
    url: 'https://www.ay-robots.com/en/pricing',
    type: 'docs',
  },
  // techcrunch-human-archive-2026: read 2026-11-14 (dated 2026-05-26). "base rate of $1 per hour"; more than
  // 1,000 active headsets; $8.2 million raised.
  {
    id: 'techcrunch-human-archive-2026',
    title: 'This startup is betting India’s gig economy can train the world’s robots',
    authors: ['Ivan Mehta'],
    year: 2026,
    venue: 'TechCrunch',
    url: 'https://techcrunch.com/2026/05/26/human-archive-taps-into-indias-services-startups-to-collect-data-for-physical-ai/',
    type: 'press',
  },
  // exylos-pricing-2026: read 2026-11-14 (dated 2026-09-18). "The published $30-$49 rates cover
  // customer-specific production with exclusive dataset rights", per accepted hour.
  {
    id: 'exylos-pricing-2026',
    title: 'EXYLOS VR Egocentric Dataset Pricing: Rates per Accepted Hour',
    authors: ['Vadym Lorens'],
    year: 2026,
    venue: 'EXYLOS blog',
    url: 'https://www.exylos.ai/blog/exylos-vr-egocentric-dataset-pricing/',
    type: 'blog',
  },
  // xperience-10m-card-2026: Hugging Face card read 2026-11-14 (creator Ropedia; card citation year 2026).
  // 10,000 hours; "released for research and other non-commercial uses"; access reviewed manually.
  {
    id: 'xperience-10m-card-2026',
    title: 'Xperience-10M',
    authors: ['Ropedia'],
    year: 2026,
    venue: 'Hugging Face dataset card',
    url: 'https://huggingface.co/datasets/ropedia-ai/xperience-10m',
    type: 'docs',
  },
  // open-humanwam-50k-card-2026: Hugging Face card read 2026-11-14. "This project's original contributions
  // are released under the Apache License 2.0. The underlying third-party datasets remain subject to their
  // original licenses and terms."
  {
    id: 'open-humanwam-50k-card-2026',
    title: 'Open-HumanWAM-50K',
    authors: ['DAGroup-PKU'],
    year: 2026,
    venue: 'Hugging Face dataset card',
    url: 'https://huggingface.co/datasets/DAGroup-PKU/Open-HumanWAM-50K',
    type: 'docs',
  },
  // egodex-repo: GitHub README read 2026-11-14 (github.com/apple/ml-egodex redirects here). 829 hours; "The
  // dataset is available under CC-by-NC-ND terms."
  {
    id: 'egodex-repo',
    title: 'EgoDex: Learning Dexterous Manipulation from Large-Scale Egocentric Video',
    authors: ['Apple'],
    year: 'n.d.',
    accessedOn: '2026-11-14',
    venue: 'GitHub repository apple-aiml-research/ml-egodex',
    url: 'https://github.com/apple-aiml-research/ml-egodex',
    type: 'docs',
  },
  // techtimes-tesla-optimus-data-2026: read 2026-11-14 (dated 2026-09-29). "According to The Information,
  // Tesla has accumulated more than 500,000 hours of Optimus training data ... from a person familiar with
  // the company's efforts rather than a public Tesla disclosure."
  {
    id: 'techtimes-tesla-optimus-data-2026',
    title: 'Tesla’s Robot Future Runs Into a Human Problem: Some Workers Pushed Back on Training Optimus',
    authors: ['Grace Hisona'],
    year: 2026,
    venue: 'TechTimes',
    url: 'https://www.techtimes.co.uk/tesla-workers-optimus-training-data-production-1808825',
    type: 'press',
  },
  // jd-data-center-2026: read 2026-11-14 (dated 2026-03-16, source Southern Finance). JD.com targets 5
  // million hours of real-scene human video within a year and over 10 million within two.
  {
    id: 'jd-data-center-2026',
    title: '京东将建成全球最大具身数据采集中心',
    authors: ['Southern Finance'],
    year: 2026,
    venue: 'Eastmoney, from Southern Finance, 2026-03-16',
    url: 'https://finance.eastmoney.com/a/202603163673254172.html',
    type: 'press',
  },
  // jiangsu-data-exchange-2026: read 2026-11-14 (dated 2026-01-06; reporter 万承源). Jiangsu Data Exchange's
  // "全国首例具身智能数据集场内交易", about 25,000 structured records; no price given.
  {
    id: 'jiangsu-data-exchange-2026',
    title: '全国首例具身智能数据集场内交易在江苏完成，可“培训”机器人保姆',
    authors: ['Chengyuan Wan'],
    year: 2026,
    venue: 'Yangtse Evening Post (yzwb.net), 2026-01-06',
    url: 'https://www.yzwb.net/news/jiangsu/202601/t20260106_308264.html',
    type: 'press',
  },
  // robopilots-providers-2026: read 2026-11-14 (dated 2026-11-11). RoboPilots' own guide: its operators at "a
  // starting price of $12 an hour".
  {
    id: 'robopilots-providers-2026',
    title: 'Teleoperation service providers compared (2026): managed operators, data labs and software',
    authors: ['RoboPilots'],
    year: 2026,
    venue: 'RoboPilots guides',
    url: 'https://www.robopilots.ai/guides/teleoperation-service-providers',
    type: 'blog',
  },
  // maxinsights-seed-2026: Business Wire release read 2026-11-14 on Yahoo Finance (corrected release dated
  // 2026-10-26; announced 22 Oct). $30 million seed led by PeakXV; MaxGlove. No hour count.
  {
    id: 'maxinsights-seed-2026',
    title: 'Waymo, Google and Microsoft Alums Raise $30M to Build the Data Layer for Physical AI',
    authors: ['Maxinsights'],
    year: 2026,
    venue: 'Business Wire, via Yahoo Finance',
    url: 'https://finance.yahoo.com/technology/ai/articles/waymo-google-microsoft-alums-raise-160000050.html',
    type: 'press',
  },
  // ecb-reference-rates-2026-11-13: read 2026-11-14 (rates of 13 November 2026: US dollar 1.1052, Chinese
  // yuan renminbi 7.3738 per euro, so RMB 1 = $0.1499).
  {
    id: 'ecb-reference-rates-2026-11-13',
    title: 'Euro foreign exchange reference rates',
    authors: ['European Central Bank'],
    year: 2026,
    venue: 'European Central Bank, rates of 13 November 2026',
    url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',
    type: 'docs',
  },
  // airoa-0-2026: AIRoA news release read 2026-11-12 (dated 2026-11-06).
  {
    id: 'airoa-0-2026',
    title: 'AIRoA Releases "AIRoA-0" Robot Foundation Model',
    authors: ['AI Robot Association (AIRoA)'],
    year: 2026,
    venue: 'AIRoA news',
    url: 'https://airoa.org/updates/20261106/832/',
    type: 'press',
  },
  // meituan-mr0-2026: arXiv Atom API and abstract read 2026-11-12 (v1 5 Nov 2026).
  {
    id: 'meituan-mr0-2026',
    title: 'Meituan-Robotics-0: A Vision-Language-Action Foundation Model for Desktop Manipulation',
    authors: ['Meituan Robotics Team', 'Caicheng Wang', 'Chen Zhao', 'Chengpeng Jin', 'Duo Xu', 'Fengjiao Chen', 'Guanglu Wan', 'Heqing Yang', 'Jia Wang', 'Jiacong Zhou', 'Jie Hu', 'Jiyuan Ru', 'Lingfeng Zhang', 'Linjiang Huang', 'Manyuan Zhang', 'Ningchu Liu', 'Shijie Zhou', 'Si Liu', 'Shuo Li', 'Tianyi Zhang', 'Xi Zhang', 'Xin Chen', 'Xuezhi Cao', 'Xunliang Cai', 'Yanbin Zeng', 'Yang Yang', 'Yang Yi', 'Yanli Tan', 'Yifu Xu', 'Yimeng Jia', 'Yuchen Tang', 'Yuchen Xie', 'Yuxiang Zheng', 'Zerwei Chng', 'Zilong Huang', 'Zipeng Ye', 'Ziyuan Qin', 'Ziqin Wang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.08577',
    url: 'https://arxiv.org/abs/2611.08577',
    type: 'paper',
  },
  // goldberg-agentic-robotics-2026: Berkeley News article read 2026-11-12 (dated 9 Nov 2026).
  {
    id: 'goldberg-agentic-robotics-2026',
    title: "Recent advances in AI are creating a 'paradigm shift' for robotics",
    authors: ['Jason Pohl'],
    year: 2026,
    venue: 'Berkeley News',
    url: 'https://news.berkeley.edu/2026/11/09/recent-advances-in-ai-are-creating-a-paradigm-shift-for-robotics/',
    type: 'press',
  },
  // lafan1-2021: arXiv Atom API read 2026-11-12; the paper that released the Ubisoft LaFAN1 dataset.
  {
    id: 'lafan1-2021',
    title: 'Robust Motion In-betweening',
    authors: ['Félix G. Harvey', 'Mike Yurick', 'Derek Nowrouzezahrai', 'Christopher Pal'],
    year: 2021,
    venue: 'arXiv preprint',
    arxiv: '2102.04942',
    url: 'https://arxiv.org/abs/2102.04942',
    type: 'paper',
  },
  // motion-x-plus-plus-2025: arXiv Atom API read 2026-11-12.
  {
    id: 'motion-x-plus-plus-2025',
    title: 'Motion-X++: A Large-Scale Multimodal 3D Whole-body Human Motion Dataset',
    authors: ['Yuhong Zhang', 'Jing Lin', 'Ailing Zeng', 'Guanlin Wu', 'Shunlin Lu', 'Yurong Fu', 'Yuanhao Cai', 'Ruimao Zhang', 'Haoqian Wang', 'Lei Zhang'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2501.05098',
    url: 'https://arxiv.org/abs/2501.05098',
    type: 'paper',
  },
  // oxe-auge-2025: arXiv Atom API and abstract read 2026-11-12 (v1 15 Dec 2025); ICML 2026 poster page
  // (icml.cc/virtual/2026/poster/64619) lists it.
  {
    id: 'oxe-auge-2025',
    title: 'OXE-AugE: A Large-Scale Robot Augmentation of OXE for Scaling Cross-Embodiment Policy Learning',
    authors: ['Guanhua Ji', 'Harsha Polavaram', 'Lawrence Yunliang Chen', 'Sandeep Bajamahal', 'Zehan Ma', 'Simeon Adebola', 'Chenfeng Xu', 'Ken Goldberg'],
    year: 2025,
    venue: 'ICML 2026',
    arxiv: '2512.13100',
    url: 'https://arxiv.org/abs/2512.13100',
    type: 'paper',
  },
  // human-1m-100k-2026: Hugging Face dataset card read 2026-11-12 (created 2026-11-04; license CC BY 4.0;
  // "100,000 hours / Open-source subset"; 3,405,573 episodes; 41,288 collector IDs).
  {
    id: 'human-1m-100k-2026',
    title: 'Human-1M: Scaling Physical AI through Human Experience (PhysicalAI-Human-1M-100K)',
    authors: ['NVIDIA'],
    year: 2026,
    venue: 'Hugging Face dataset card',
    url: 'https://huggingface.co/datasets/nvidia/PhysicalAI-Human-1M-100K',
    type: 'docs',
  },
  // egoverse-2026: arXiv Atom API and abstract read 2026-11-12 (v1 8 Apr 2026).
  {
    id: 'egoverse-2026',
    title: 'EgoVerse: An Egocentric Human Dataset for Robot Learning from Around the World',
    authors: ['Ryan Punamiya', 'Simar Kareer', 'Zeyi Liu', 'Josh Citron', 'Ri-Zhao Qiu', 'Xiongyi Cai', 'Alexey Gavryushin', 'Jiaqi Chen', 'Davide Liconti', 'Lawrence Y. Zhu', 'Patcharapong Aphiwetsa', 'Baoyu Li', 'Aniketh Cheluva', 'Pranav Kuppili', 'Yangcen Liu', 'Dhruv Patel', 'Aidan Gao', 'Hye-Young Chung', 'Ryan Co', 'Renee Zbizika', 'Jeff Liu', 'Xiaomeng Xu', 'Haoyu Xiong', 'Geng Chen', 'Sebastiano Oliani', 'Wenkai Xuan', 'Chenyu Yang', 'Xi Wang', 'James Fort', 'Richard Newcombe', 'Josh Gao', 'Jason Chong', 'Garrett Matsuda', 'Aseem Doriwala', 'Marc Pollefeys', 'Robert Katzschmann', 'Xiaolong Wang', 'Shuran Song', 'Judy Hoffman', 'Danfei Xu'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2604.07607',
    url: 'https://arxiv.org/abs/2604.07607',
    type: 'paper',
  },
  // tacclaw-infinity-2026: arXiv Atom API and abstract read 2026-11-12 (v1 14 Oct 2026; Daimon Robotics and others).
  {
    id: 'tacclaw-infinity-2026',
    title: 'TacClaw-Infinity: A Large-Scale Vision-Tactile-Language-Action Dataset for Dexterous Manipulation',
    authors: ['Fucai Zhu', 'Xidong Zhang', 'Yichi Zhang', 'Yipan Wang', 'Fubo Wang', 'Zibin Wu', 'Kaiqi Li', 'Jianhao Jiao', 'Shihan Lu', 'Di Hu', 'Mengdi Xu', 'Siyu Zhu', 'Xiaoxiao Long', 'Yao Yao', 'Xun Cao', 'Zhuo Xu', 'Koichi Hashimoto', 'Qifeng Chen', 'Zhe Li', 'Jianfei Yang', 'Haofei Lu', 'Danica Kragic', 'Shuicheng Yan', 'Jianghua Duan', 'Michael Yu Wang', 'Weihao Yuan'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.20320',
    url: 'https://arxiv.org/abs/2610.20320',
    type: 'paper',
  },
  // sharpadex-v1-2026: Hugging Face dataset card read 2026-11-12 (license CC BY-NC 4.0; 28,993 episodes,
  // 59 tasks, about 300.0 hours at 30 FPS; two 7-DoF arms, two 22-DoF hands, fingertip tactile sensors).
  {
    id: 'sharpadex-v1-2026',
    title: 'SharpaDex v1.0',
    authors: ['Sharpa Robotics'],
    year: 2026,
    venue: 'Hugging Face dataset card',
    url: 'https://huggingface.co/datasets/Sharpa-Robotics/SharpaDex-v1.0',
    type: 'docs',
  },
  // xr2-bimanual-2026: arXiv abstract and HTML v1 read 2026-11-15 (v1 3 Sep 2026). "we release 1,500 hours";
  // real-robot subset "32,518 trajectories, 57.4 million frames, and 531.7 hours" on the X2W, "a mobile
  // bimanual robotic platform"; "approximately 1,000 hours of in-the-wild bimanual UMI demonstrations".
  // The CC BY-SA 4.0 on the arXiv page is the paper's licence; the data licence is on the dataset card.
  {
    id: 'xr2-bimanual-2026',
    title: 'Scaling Bimanual Household Manipulation from 1,500 hours of Demonstrations to On-Policy Corrections',
    authors: ['Jiafeng Xu', 'Qi Li', 'Yan Shen', 'Yiyu Ren', 'Travis Davies', 'Shaowen He', 'Ze Wang', 'Yifan Yang', 'Ran Cheng', 'Hao Dong'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2609.03591',
    url: 'https://arxiv.org/abs/2609.03591',
    type: 'paper',
  },
  // xr2-dataset-card: Hugging Face card read 2026-11-15 (created 2026-08-06, last modified 2026-09-23).
  // license: cc-by-sa-4.0. Change log: "All 500+ hours of real robot data released open source" (2026-08-06);
  // UMI batches of 5, 100 and 100 hours (2026-08-10, 09-08, 09-23). Robot data: head and two wrist cameras,
  // 1280x720 at 30 FPS; UMI data: left and right wrist-mounted cameras, 960x960, plus IMU.
  {
    id: 'xr2-dataset-card',
    title: 'PrimeBot Household Bimanual Manipulation Challenge Dataset',
    authors: ['PrimeBot Research Institute'],
    year: 2026,
    accessedOn: '2026-11-15',
    venue: 'Hugging Face dataset card',
    url: 'https://huggingface.co/datasets/challenge-2026/challenge_data',
    type: 'docs',
  },
  // touchscale-dataset-card: Hugging Face card read 2026-11-15 (last modified 2026-10-23; gated). "currently
  // hosts 100 hours of the 500-hour TouchScale dataset: 15,324 episodes"; "released under CC BY-NC 4.0";
  // "you have to accept the conditions to access its files". Head RGB-D (Orbbec Gemini 345Lg), two wrist
  // cameras (Intel RealSense D405), tactile gloves with 880 taxels per hand.
  {
    id: 'touchscale-dataset-card',
    title: 'TouchScale (dataset card)',
    authors: ['2077AI'],
    year: 2026,
    accessedOn: '2026-11-15',
    venue: 'Hugging Face dataset card',
    url: 'https://huggingface.co/datasets/2077AIDataFoundation/TouchScale',
    type: 'docs',
  },
  // ff-nova-2026: FF EAI Robotics / Faraday Future release on PR Newswire read 2026-11-12 (dated 2026-10-16):
  // "The FF Nova device is priced at $2,490"; Phase One limited to 100 units by invitation.
  {
    id: 'ff-nova-2026',
    title: 'FF EAI Robotics (FFR) and FF Jointly Launch FF Nova, First Embodied AI Humanoid Robot Priced Below $2,500 in U.S., FF Nova Mini, Physical AI Spark Program Curriculum, Nova Reinforcement Learning Developer Program and Developer Community Recruitment',
    authors: ['FF EAI Robotics Ecosystem Inc.'],
    year: 2026,
    venue: 'PR Newswire',
    url: 'https://www.prnewswire.com/news-releases/ff-eai-robotics-ffr-and-ff-jointly-launch-ff-nova-first-embodied-ai-humanoid-robot-priced-below-2-500-in-us-ff-nova-mini-physical-ai-spark-program-curriculum-nova-reinforcement-learning-developer-program-and-developer-com-302910863.html',
    type: 'press',
  },
  // intel-robotics-platform: Intel product page read 2026-11-12 (undated page): "Intel Core Ultra Series 3
  // processors integrate CPU, GPU, and NPU on one platform, allowing control, perception, and Physical AI
  // policies to run together".
  {
    id: 'intel-robotics-platform',
    title: 'Intel Robotics Platform for Intelligent Robots',
    authors: ['Intel'],
    year: 'n.d.',
    accessedOn: '2026-11-12',
    venue: 'Intel',
    url: 'https://www.intel.com/content/www/us/en/products/details/robotics.html',
    type: 'docs',
  },
  // fcc-da-26-1130: FCC Public Notice DA 26-1130, released 21 Oct 2026, PDF read 2026-11-12.
  {
    id: 'fcc-da-26-1130',
    title: 'The Public Safety and Homeland Security Bureau Announces Conditional Approval and Exemption of Certain Routers and Advanced Robotic Devices from FCC Covered List',
    authors: ['Federal Communications Commission'],
    year: 2026,
    venue: 'FCC Public Notice DA 26-1130',
    url: 'https://docs.fcc.gov/public/attachments/DA-26-1130A1.pdf',
    type: 'docs',
  },
  // fcc-da-26-1181: FCC Public Notice DA 26-1181, released 30 Oct 2026, PDF read 2026-11-12 (lists ATI Motors'
  // Sherpa Mecha and OMRON's LD-150 and LD-300 among Department of War Conditional Approvals).
  {
    id: 'fcc-da-26-1181',
    title: 'The Public Safety and Homeland Security Bureau Announces Conditional Approval and Exemption of Certain Uncrewed Aircraft Systems, Advanced Robotic Devices, and Power Inverters from FCC Covered List',
    authors: ['Federal Communications Commission'],
    year: 2026,
    venue: 'FCC Public Notice DA 26-1181',
    url: 'https://docs.fcc.gov/public/attachments/DA-26-1181A1.pdf',
    type: 'docs',
  },
  // airoa-0-paper-2026: arXiv Atom API and abstract read 2026-11-12 (v1 2 Nov 2026).
  {
    id: 'airoa-0-paper-2026',
    title: 'AIRoA-0: Long-Horizon, Precise, Cross-Embodiment Manipulation from Handheld Data',
    authors: ['Yueh-Hua Wu', 'Kei Ota', 'Hanlong Li', 'Hayata Yuasa', 'Jason Wang', 'Kengo Ikeuchi', 'Kensuke Chiyoma', 'Makoto Sugiura', 'Masafumi Takahashi', 'Masatoshi Tateno', 'Naoaki Kanazawa', 'Nicola Scianca', 'Petr Khrapchenkov', 'Satoshi Otsubo', 'Takehiko Ohkawa', 'Takuya Okubo', 'Tatsuya Matsushima', 'Yuki Noguchi', 'Yuma Shin', 'Zixuan Zhong'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.03815',
    url: 'https://arxiv.org/abs/2611.03815',
    type: 'paper',
  },
  // umi-live-2026: arXiv Atom API and abstract read 2026-11-12 (v1 29 Oct 2026).
  {
    id: 'umi-live-2026',
    title: 'UMI-Live for In-The-Wild Bimanual Robotics Data Collection',
    authors: ['Govind Velamoor', 'Adrian Lin', 'Sam Jung', 'Spencer Mateega', 'Brandon Y. Yang', 'Amish Sethi'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.39385',
    url: 'https://arxiv.org/abs/2610.39385',
    type: 'paper',
  },
  // fomi-2026: arXiv Atom API and abstract read 2026-11-12 (v1 14 Oct 2026).
  {
    id: 'fomi-2026',
    title: 'FOMI: A Force-Feedback Manipulation Interface for Teaching Contact-Rich Manipulation',
    authors: ['Yishu Shen', 'Yiming Luo', 'Ruilin Wang', 'Bowen Yang', 'Shuai Yang', 'Fangyi Xu', 'Yujun Shen', 'Fu Zhang', 'Boyu Zhou', 'Yinghao Xu'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.19839',
    url: 'https://arxiv.org/abs/2610.19839',
    type: 'paper',
  },
  // head-camera-umi-glove-2026: arXiv Atom API and abstract read 2026-11-12 (v1 20 Oct 2026).
  {
    id: 'head-camera-umi-glove-2026',
    title: 'A Head Camera Is (Almost) All You Need: An Electronics-Free UMI Glove Labelled and Observed by One Moving Camera',
    authors: ['Yosub Shin', 'Yuan Liu', 'Igor Molybog'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.27622',
    url: 'https://arxiv.org/abs/2610.27622',
    type: 'paper',
  },
  // dexport-2026: arXiv Atom API and abstract read 2026-11-12 (v1 23 Oct 2026).
  {
    id: 'dexport-2026',
    title: 'DexPort: A Hand-Held Skill Interface for Dexterous Hand Data Collection',
    authors: ['Amber Xie', 'Jiawei Fu', 'Xiaofeng Guo', 'Carmelo Sferrazza', 'Guanya Shi', 'Haozhi Qi'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.32969',
    url: 'https://arxiv.org/abs/2610.32969',
    type: 'paper',
  },
  // meta-quest-3s-page-2026: Meta product page read 2026-11-12 ("$349.99 for 128GB, $449.99 for 256GB").
  {
    id: 'meta-quest-3s-page-2026',
    title: 'Meta Quest 3S: Next-Gen Virtual Reality Headset',
    authors: ['Meta'],
    year: 'n.d.',
    accessedOn: '2026-11-12',
    venue: 'Meta',
    url: 'https://www.meta.com/quest/quest-3s/',
    type: 'docs',
  },
  // behavior-2026-second-place: arXiv Atom API and abstract read 2026-11-12 (v1 10 Nov 2026); team report,
  // official private-test figures as the team states them.
  {
    id: 'behavior-2026-second-place',
    title: 'WAM is capable in BEHAVIOR-1K: the 2nd-place solution to the 2026 BEHAVIOR Challenge',
    authors: ['Yelin He', 'Jiaquan Ye', 'Xinming Wei', 'Wenjie Xiao', 'Gengming Zhang', 'Guoting Wei', 'Xianbiao Qi', 'Rong Xiao'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.13818',
    url: 'https://arxiv.org/abs/2611.13818',
    type: 'paper',
  },
  // molmospaces-commonsense-2026: arXiv Atom API and abstract read 2026-11-12 (v1 30 Oct 2026).
  {
    id: 'molmospaces-commonsense-2026',
    title: 'MolmoSpaces-CommonSense: Evaluating Commonsense in Robotic Manipulation Policies',
    authors: ['Arjun Guru', 'Max Argus', 'Jae Sung Park', 'Jiafei Duan', 'Ali Farhadi', 'Ranjay Krishna'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.41377',
    url: 'https://arxiv.org/abs/2610.41377',
    type: 'paper',
  },
  // stochastic-challenges-2026: arXiv Atom API and abstract read 2026-11-12 (v1 9 Nov 2026).
  {
    id: 'stochastic-challenges-2026',
    title: 'Benchmarking Real-World Robotic Manipulation through Stochastic Challenges',
    authors: ['Elias Gläßer', 'Gülhan Şikaroğlu', 'Pavlo Kupyn', 'Marc Pollefeys', 'Zuria Bauer', 'Hermann Blum'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.12804',
    url: 'https://arxiv.org/abs/2611.12804',
    type: 'paper',
  },
  // rollout-then-recycle-2026: arXiv Atom API and abstract read 2026-11-12 (v1 2 Nov 2026).
  {
    id: 'rollout-then-recycle-2026',
    title: 'Rollout then Recycle: 3,718 Labelled Real-Robot Episodes from Benchmarking 7 Policies on 12 Tasks',
    authors: ['Praveen Selvaraj', 'Lorenzo Uttini', 'Ville Kuosmanen'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.03168',
    url: 'https://arxiv.org/abs/2611.03168',
    type: 'paper',
  },
  // race-checkpoint-selection-2026: arXiv Atom API and abstract read 2026-11-12 (v1 4 Nov 2026).
  {
    id: 'race-checkpoint-selection-2026',
    title: 'RACE: Calibrated Cumulative Scoring for Rollout-Free Robot Policy Checkpoint Selection',
    authors: ['Changyeon Kim', 'Yekyung Nah', 'Kimin Lee'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.05838',
    url: 'https://arxiv.org/abs/2611.05838',
    type: 'paper',
  },
  // agility-s4a-2026: SEC Form S-4/A (filed 2026-09-30, file no. 333-298781), read 2026-11-12. Agility 2025 total
  // net sales $1,782 thousand ($1,132 thousand related parties); Digit 5 orders "as of May 2026 ... relates to
  // 1,000 Digit 5 robots with three-year term RaaS contract".
  {
    id: 'agility-s4a-2026',
    title: 'Churchill Capital Corp XI and Agility Robotics, Inc.: Amendment to Form S-4 Registration Statement',
    authors: ['Churchill Capital Corp XI', 'Agility Robotics, Inc.'],
    year: 2026,
    venue: 'U.S. Securities and Exchange Commission',
    url: 'https://www.sec.gov/Archives/edgar/data/2074973/000121390026105334/ea0297114-05.htm',
    type: 'docs',
  },
  // ubtech-interim-2026: HKEX interim results announcement dated 2026-08-28, PDF read 2026-11-12: full-size
  // humanoid revenue RMB590.3 million, 921 units sold in 1H 2026; annual production target of 10,000 units.
  {
    id: 'ubtech-interim-2026',
    title: 'UBTECH Robotics Corp Ltd Interim Results Announcement for the Six Months Ended June 30, 2026',
    authors: ['UBTECH Robotics Corp Ltd'],
    year: 2026,
    venue: 'HKEXnews',
    url: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0828/2026082801691.pdf',
    type: 'docs',
  },
  // sag-humanoid-shipments-q3-2026: Smart Analytics Global release dated 2026-11-08, read 2026-11-12. Single
  // analyst source: 16.5K units in Q3 2026; AGIBOT 4,900, UBTech 4,500, Unitree about 4,400; China 87%.
  {
    id: 'sag-humanoid-shipments-q3-2026',
    title: 'SAG: Global Humanoid Robot Shipments Surge 347% YoY in Q3 2026; AGIBOT Leads While UBTech Overtakes Unitree for No. 2',
    authors: ['Linda Sui'],
    year: 2026,
    venue: 'Smart Analytics Global',
    url: 'https://smartanalyticsglobal.com/global-humanoid-robot-shipments-q3-2026-agibot-ubtech-unitree/',
    type: 'press',
  },
  // symbotic-walmart-2026: Symbotic release on GlobeNewswire dated 2026-10-29, read 2026-11-12: 25 U.S. regional
  // distribution centers; "initial commitment of approximately $6 billion in spend".
  {
    id: 'symbotic-walmart-2026',
    title: 'Walmart and Symbotic Expand Commercial Agreement to Support Supply Chain Transformation',
    authors: ['Symbotic'],
    year: 2026,
    venue: 'GlobeNewswire',
    url: 'https://www.globenewswire.com/news-release/2026/10/29/3391812/0/en/walmart-and-symbotic-expand-commercial-agreement-to-support-supply-chain-transformation.html',
    type: 'press',
  },
  // loopwam-2026: arXiv Atom API and abstract read 2026-11-12 (v1 13 Oct 2026).
  {
    id: 'loopwam-2026',
    title: 'LoopWAM: Closed-Loop Generalist Policy Improvement from Deployment Rollouts',
    authors: ['Wenxuan Guo', 'Yingping Liang', 'Zhaoguo Wang', 'Ziyuan Li', 'Angyuan Ma', 'Zhenyu Wu', 'Chengkun Wang', 'Bingyao Yu', 'Ze Chen', 'Borui Zhang', 'Xiuwei Xu', 'Meng Zhang', 'Erjin Zhou', 'Jiwen Lu'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.18873',
    url: 'https://arxiv.org/abs/2610.18873',
    type: 'paper',
  },
  // wensing-cheetah-actuator-2017: author's proof PDF (mit.edu/~pwensing) read 2026-11-13; DOI printed on it.
  {
    id: 'wensing-cheetah-actuator-2017',
    title: 'Proprioceptive Actuator Design in the MIT Cheetah: Impact Mitigation and High-Bandwidth Physical Interaction for Dynamic Legged Robots',
    authors: ['Patrick M. Wensing', 'Albert Wang', 'Sangok Seok', 'David Otten', 'Jeffrey Lang', 'Sangbae Kim'],
    year: 2017,
    venue: 'IEEE Transactions on Robotics',
    url: 'https://doi.org/10.1109/TRO.2016.2640183',
    type: 'paper',
  },
  // agiloped-2025: arXiv Atom API and HTML read 2026-11-13 (v1 11 Sep 2025; IEEE ARM 2025).
  {
    id: 'agiloped-2025',
    title: 'AGILOped: Agile Open-Source Humanoid Robot for Research',
    authors: ['Grzegorz Ficht', 'Luis Denninger', 'Sven Behnke'],
    year: 2025,
    venue: 'arXiv preprint',
    arxiv: '2509.09364',
    url: 'https://arxiv.org/abs/2509.09364',
    type: 'paper',
  },
  // harmonic-drive-csf-catalog-2026: catalog PDF read 2026-11-13 (TI-26108 REV 1, "correct as of July 2026").
  {
    id: 'harmonic-drive-csf-catalog-2026',
    title: 'Speed Reducers for Precision Motion Control: Reducer Catalog, Component Sets CSG/CSF, Engineering Data',
    authors: ['Harmonic Drive LLC'],
    year: 2026,
    venue: 'Harmonic Drive LLC',
    url: 'https://www.harmonicdrive.net/_hd/content/documents1/CSG-CSF_Component.pdf',
    type: 'docs',
  },
];
