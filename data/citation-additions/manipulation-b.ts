/**
 * Sources added to the manipulation-b articles in the November 2026 review.
 * Same schema and author-field policy as data/citations.ts: every entry was
 * opened and checked against the page it names.
 */
import type { Citation } from '../schemas/citation.ts';

export const ADDITIONS: Citation[] = [
  // rl-finetuning also cites gr00t-2-2026, registered in world-models.ts (project page re-read 2026-11-12).
  // rl-finetuning, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 2 Nov 2026).
  {
    id: 'repair-vla-distill-2026',
    title: 'Beyond Policy Patches: Distilling RL Specialists into Vision-Language-Action Policies',
    authors: [
      'Zhennan Jiang', 'Tingying Xie', 'Shilong Ji', "Shu'ang Yu", 'Tianxing Zhou', 'Yuhui Chen', 'Jiahuan Gao',
      'Kaizhi Xie', 'Yuanfan Xu', 'Feng Gao', 'Yu Wang', 'Haoran Li', 'Dongbin Zhao', 'Chao Yu',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.02777',
    url: 'https://arxiv.org/abs/2611.02777',
    type: 'paper',
  },
  // rl-finetuning, 2026-11-12. arXiv Atom API and HTML read 2026-11-12 (v1 4 Nov 2026).
  {
    id: 'generalist-rl-improvement-2026',
    title: 'Reinforcement Learning Enables Scaling Generalist Robot Policy Improvement',
    authors: [
      'Michal Korniak', 'Marco Bagatella', 'Ralf Römer', 'Michal Nauman', 'Yarden As', 'Pranav Vignesh', 'Manan Agarwal',
      'Leander Diaz-Bone', 'Piotr Zalewski', 'Mikołaj Czarnecki', 'Lenart Treven', 'Shashwat Saxena',
      'Sreyas Venkataraman', 'Sarvesh Patil', 'Zhiyuan Zhou', 'Daniel Marta', 'Oier Mees',
      'Nur Muhammad Mahi Shafiullah', 'Carmelo Sferrazza', 'Bhavya Sukhija', 'Angela P. Schoellig', 'Andreas Krause',
      'Max Simchowitz', 'Andrew Wagenmaker',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.06905',
    url: 'https://arxiv.org/abs/2611.06905',
    type: 'paper',
  },
  // rl-finetuning, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 13 Oct 2026).
  {
    id: 'accrue-2026',
    title: 'ACCRUE: Continual Off-Policy Reinforcement Learning for Robot Foundation Models',
    authors: ['Changyeon Kim', 'Kimin Lee', 'Yashraj Narang', 'Yijie Guo'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.18596',
    url: 'https://arxiv.org/abs/2610.18596',
    type: 'paper',
  },
  // rl-finetuning, 2026-11-12. arXiv Atom API read 2026-11-12 (v3; v1 19 Oct 2026).
  {
    id: 'collective-experience-learning-2026',
    title: 'Learning from Fleet Experience: Collective Experience Learning Across 96 Robots',
    authors: [
      'Chao Yu', "Shu'ang Yu", 'Hao Lin', 'Hongzhi Zang', 'Yuxiang Yan', 'Chenxi Jiang', 'Zhen Guo', 'Chuankang Li',
      'Yihao Chen', 'Xin Xu', 'Xu Fu', 'Jiakai Zhou', 'Liangzhi Shi', 'Hongyi Ren', 'Yiwei Liu', 'Jing Wu',
      'Yuanqing Wang', 'Chen Wu', 'Bo Dai', 'Chunyu Yang', 'Hongliang Huang', 'Shuoyu Yue', 'Weiqi Yin', 'Yinuo Chen',
      'Ruihua Chen', 'Chunyang Zhu', 'Han Xiao', 'Yanghao Li', 'Ruipu Wu', 'Zhikai Cai', 'Xiu Chen', 'Xu Tan', 'Si Liu',
      'Yuchen Yan', 'Jialin Zhang', 'Wen Zeng', 'Yiming Zhou', 'Zixiao Huang', 'Xinlei Chen', 'Guanghui Ren',
      'Quanlu Zhang', 'Boxun Li', 'Maoqing Yao', 'Yu Wang',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.25736',
    url: 'https://arxiv.org/abs/2610.25736',
    type: 'paper',
  },
  // rl-finetuning, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 3 Nov 2026).
  {
    id: 'cronos-2026',
    title: 'CRONOS: Benchmarking Non-Episodic Reinforcement Learning for Robotic Manipulation',
    authors: ['Po-Yi Wu', 'Djengo Cyun-Jyun Fang', 'Dian Cheng', 'Tsung-Wei Ke'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.05080',
    url: 'https://arxiv.org/abs/2611.05080',
    type: 'paper',
  },
  // realtime-execution, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 2 Nov 2026).
  {
    id: 'vla-lagbench-2026',
    title: 'VLALagBench: Understanding When and Why VLA Inference Latency Matters',
    authors: [
      'Qi Wen', 'Borui Xu', 'Hussein Amro', 'Hongshi Tan', 'Hanmin Lin', 'Chaoyi Ruan', 'Shanghao Liu', 'Gang Yang',
      'Yuejiang Liu', 'Jiafei Duan', 'Bingsheng He', 'Jason Clemons', 'Christos Kozyrakis', 'Wenqi Jiang',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.03103',
    url: 'https://arxiv.org/abs/2611.03103',
    type: 'paper',
  },
  // realtime-execution, 2026-11-12. arXiv Atom API read 2026-11-12 (v2 26 Oct 2026).
  {
    id: 'vla-hwbench-2026',
    title: 'VLA-HWBench: Where the Time Goes When VLA Models Run on Edge Hardware',
    authors: ['Borui Xu', 'Hongshi Tan', 'Wenqi Jiang', 'Bingsheng He', 'Ming Wu', 'Jason Zeng', 'Michael Heinrich'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.34717',
    url: 'https://arxiv.org/abs/2610.34717',
    type: 'paper',
  },
  // realtime-execution, 2026-11-12. arXiv Atom API and abstract page read 2026-11-12 (v1 17 Oct 2026).
  {
    id: 'flashrt-pai-2026',
    title: 'FlashRT-PAI: Fast Kernels Are Not Fast Pipelines for Physical AI Inference',
    authors: ['Liang Su', 'David Chen', 'Jason Li', 'Kevin Guo', 'Teresa Lv'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.24349',
    url: 'https://arxiv.org/abs/2610.24349',
    type: 'paper',
  },
  // realtime-execution, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 17 Oct 2026).
  {
    id: 'libero-dynamic-2026',
    title: 'LIBERO-Dynamic: Benchmarking Robotic Manipulation in Dynamic Environments',
    authors: ['Shaojie Ren', 'Jingwen Sun', 'Zezhi Liu', 'Hongjin Chen', 'Xin Jin', 'Wei Zou', 'Zhibo Chen'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.24579',
    url: 'https://arxiv.org/abs/2610.24579',
    type: 'paper',
  },
  // realtime-execution, 2026-11-12. Blog post read 2026-11-12 (published 13 October 2026).
  {
    id: 'pi-api-beta-2026',
    title: 'Frontier Models for Every Robot: Announcing our API beta',
    authors: ['Physical Intelligence'],
    year: 2026,
    venue: 'Physical Intelligence blog',
    url: 'https://www.pi.website/blog/api-beta',
    type: 'blog',
  },
  // cross-embodiment, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 10 Nov 2026).
  {
    id: 'ciallo-2026',
    title: 'CIALLO: Learning Shared Intent Representations for Cross-Embodiment Manipulation',
    authors: [
      'Choo Sin Wai', 'Dake Zhong', 'Jingye Zhang', 'Zhifang Liu', 'Siyao Xiao', 'Zirong Ding', 'Yuhong Zhang',
      'Kangjie Chen', 'Dongbin Zhang', 'Guorui Song', 'Guocun Wang', 'Peng Jiao', 'Haoqian Wang',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.13732',
    url: 'https://arxiv.org/abs/2611.13732',
    type: 'paper',
  },
  // cross-embodiment, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 20 Oct 2026).
  {
    id: 'multiview-lam-2026',
    title: 'Multi-View Latent Action Pretraining for Cross-Embodiment Robot Learning from Videos',
    authors: [
      'Oliver Hausdörfer', 'Felix Minzenmay', 'Mani Majd', 'Maximilian P. Christof', 'Shiyuan Zhang',
      'Angela P. Schoellig',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.27794',
    url: 'https://arxiv.org/abs/2610.27794',
    type: 'paper',
  },
  // cross-embodiment, 2026-11-12. Skild AI blog read 2026-11-12 (dated "Nov 2026"; byline "Skild Team in
  // collaboration with NVIDIA").
  {
    id: 'skild-steel-2026',
    title: 'Steel: Scaling Simulation Across Robots, Tasks, and Worlds',
    authors: ['Skild Team'],
    year: 2026,
    venue: 'Skild AI blog',
    url: 'https://skild.ai/blogs/steel',
    type: 'blog',
  },
  // knowledge-insulation, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 3 Nov 2026).
  {
    id: 'gradient-routing-mot-vla-2026',
    title: 'Should the Action Expert Train the VLM? Action-Token Supervision and Gradient Routing in Mixture-of-Transformer VLAs',
    authors: [
      'Asher James Hancock', 'Boyi Li', 'Yuxiao Chen', 'Shuhan Tan', 'Wenhao Ding', 'Thomas Tian', 'Yan Wang',
      'Boris Ivanovic', 'Marco Pavone',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.05249',
    url: 'https://arxiv.org/abs/2611.05249',
    type: 'paper',
  },
  // knowledge-insulation, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 12 Aug 2026).
  {
    id: 'g0-5-2026',
    title: 'G0.5: One Autoregressive Stream for Robot Reasoning and Action',
    authors: [
      'Yicheng Liu', 'Zibin Dong', 'Baijun Ye', 'Tianyuan Yuan', 'Tao Jiang', 'Anqi Yang', 'Shicheng Cao', 'Haonan Liu',
      'Yue Sun', 'Zihan Guo', 'Xiao Liu', 'Dong Ke', 'Changxun Pan', 'Chenru Wu', 'Tailai Cheng', 'Xiaoshu Ren',
      'Xinlei Zhang', 'Jianning Cui', 'Zijie Zhao', 'Haoyu Zhang', 'Kaiming Xu', 'Haodong Yang', 'Bowen Zhang',
      'Jiahui Niu', 'Shaoting Zhu', 'Shiduo Zhang', 'Hang Zhao',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2608.11739',
    url: 'https://arxiv.org/abs/2608.11739',
    type: 'paper',
  },
  // knowledge-insulation, 2026-11-12. arXiv Atom API and HTML read 2026-11-12 (v1 15 Oct 2026; Kyutai).
  {
    id: 'reki-2026',
    title: 'REKI: Registering Knowledge in VLAs',
    authors: ['Juliette Marrie', 'Paul Pacaud', 'Adrien Ramanana Rahary', 'Shizhe Chen', 'Moritz Böhle'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.22178',
    url: 'https://arxiv.org/abs/2610.22178',
    type: 'paper',
  },
  // robot-learning-roadmap, 2026-11-12. Hugging Face blog read 2026-11-12 (published 5 November 2026).
  {
    id: 'lerobot-v0-7-2026',
    title: 'LeRobot v0.7.0: From Terabytes to Prompting Robots',
    authors: ['LeRobot'],
    year: 2026,
    venue: 'Hugging Face blog',
    url: 'https://huggingface.co/blog/lerobot/lerobot-release-v070',
    type: 'blog',
  },
  // action-spaces, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 28 Oct 2026).
  {
    id: 'same-label-interface-2026',
    title: 'Same Label, Different Interface: Beyond Action-Space Labels in Robot Learning',
    authors: ['Arshia Sangwan', 'Zhongyang Zhang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.38104',
    url: 'https://arxiv.org/abs/2610.38104',
    type: 'paper',
  },
  // action-spaces, 2026-11-12. arXiv Atom API read 2026-11-12 (v1 1 Nov 2026).
  {
    id: 'ode-policy-2026',
    title: 'ODE Policy: Robot Learning via Action Dynamics, Not Actions',
    authors: [
      'Jindou Jia', 'Jingliang Li', 'Kuangji Zuo', 'Tuo An', 'Yuxuan Hu', 'Mengfei Zhao', 'Bofan Lyu', 'Jiaqi Bai',
      'Daoyuan Zhu', 'Hengyu Dai', 'Junpeng Zhang', 'Jianfei Yang',
    ],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2611.01729',
    url: 'https://arxiv.org/abs/2611.01729',
    type: 'paper',
  },
  // action-spaces, 2026-11-12. arXiv Atom API read 2026-11-12 (v2; v1 9 Oct 2026).
  {
    id: 'reat-2026',
    title: 'ReAT: Residual Action Tokenization for Autoregressive Robot Policies',
    authors: ['Dijia Zhan', 'Zhuo Li', 'Xuemiao Xu', 'Sun Zheng', 'Jinyi Li', 'Wenjun Wang', 'Jie Tang'],
    year: 2026,
    venue: 'arXiv preprint',
    arxiv: '2610.13093',
    url: 'https://arxiv.org/abs/2610.13093',
    type: 'paper',
  },
  // foundation-models, 2026-11-12. Dyna Robotics research post read 2026-11-12 (dated "August 2026"; author
  // "Dyna Robotics").
  {
    id: 'dyna-2-2026',
    title: 'Dyna-2: A 1-Million-Hour Scaling Law for World-Action Models',
    authors: ['Dyna Robotics'],
    year: 2026,
    venue: 'Dyna Robotics research',
    url: 'https://www.dyna.co/dyna-2',
    type: 'blog',
  },
  // rl-finetuning methods table, 2026-11-14. Project page read 2026-11-14: links "Code (Robomimic/Gym/WidowX)"
  // to github.com/ajwagen/dsrl and "Code (π0)" to github.com/nakamotoo/dsrl_pi0; same eight authors as dsrl-2025.
  {
    id: 'dsrl-site-2025',
    title: 'Steering Your Diffusion Policy with Latent Space Reinforcement Learning: project page',
    authors: [
      'Andrew Wagenmaker', 'Mitsuhiko Nakamoto', 'Yunchu Zhang', 'Seohong Park', 'Waleed Yagoub',
      'Anusha Nagabandi', 'Abhishek Gupta', 'Sergey Levine',
    ],
    year: 2025,
    url: 'https://diffusion-steering.github.io/',
    type: 'docs',
  },
  // rl-finetuning methods table, 2026-11-14. GitHub API read 2026-11-14: one commit, 8d21b9c (5 Aug 2025),
  // license null. README links the base diffusion-policy checkpoints for the Robomimic and Gym experiments.
  {
    id: 'dsrl-repo-2025',
    title: 'DSRL official implementation (8d21b9c)',
    authors: ['ajwagen'],
    year: 2025,
    url: 'https://github.com/ajwagen/dsrl/tree/8d21b9cf55459f022c0e769bca1343edd9d30e5a',
    type: 'docs',
  },
];
