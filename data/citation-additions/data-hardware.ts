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
