// Citation ids that the 2026-10-05 KOL backlog batch appended to the end of an
// article's frontmatter citation list, keyed by the article path under content/.
export const KOL_BACKLOG_20261005_CITATIONS: Readonly<Record<string, readonly string[]>> = {
  'world-models/jepa.mdx': ['ad-e2e-jepa-2026'],
  'manipulation/hierarchical.mdx': ['simex-2026', 'embodiedswe-2026', 'roboharn-evo-2026', 'asena-2026'],
  'manipulation/foundation-models.mdx': ['robottt-2026', 't2mem-2026'],
  'manipulation/realtime-execution.mdx': ['chunktrust-2026'],
  'manipulation/rl-finetuning.mdx': ['prefpi-2026'],
  'adjacent/surgical.mdx': ['agro-suvide-2026'],
  'frontier/dexterity.mdx': ['fingr-2026'],
  'frontier/safety-and-assurance.mdx': ['wcbf-hyper-redundant-2026'],
  'data-hardware/data-bottleneck.mdx': ['grail-2026', 'humanoidmimicgen-2026', 'prism-humanoid-2026', 'dexagent-2026'],
  'data-hardware/industrial-deployment.mdx': ['ifr-world-robotics-2026-release'],
  'classical/state-estimation.mdx': ['mesh-mcl-construction-2026'],
};

// Removes the batch's citation ids, and only when they are exactly the tail of
// the list, so any other frontmatter change still fails the caller's comparison.
export function withoutKolBacklog20261005Citations<T extends { citations?: unknown }>(path: string, data: T): T {
  const added = KOL_BACKLOG_20261005_CITATIONS[path.replace(/^content\//, '')] ?? [];
  const citations = data.citations;
  if (!added.length || !Array.isArray(citations)) return data;
  const tail = citations.slice(-added.length);
  if (tail.length !== added.length || tail.some((id, i) => id !== added[i])) return data;
  return { ...data, citations: citations.slice(0, -added.length) };
}

// Dated paragraphs that the 2026-10-05 KOL backlog batch added, keyed by the
// article path under content/. withoutKolBacklogParagraphs in
// kol-backlog-20261001.ts removes these after the 2026-10-01 paragraphs, so the
// token-continuity tests still fail on any other numeric or citation change.
export const KOL_BACKLOG_20261005_PARAGRAPHS: Readonly<Record<string, readonly string[]>> = {
  'world-models/jepa.mdx': [
    'In September 2026, Haoran Zhu, Wancong Zhang, Yann LeCun and Anna Choromanska tested JEPA world models as driving planners with no driving policy trained, using ground-truth future observations as goals. They report that earlier JEPA models were either accurate but slow or fast but too weak to plan, and that their AD-E2E-JEPA projector gives a 100-fold inference speedup while keeping planning performance, rolling out 256 candidate trajectories over 8 frames in 0.8 seconds <Cite id="ad-e2e-jepa-2026" />.',
  ],
  'adjacent/surgical.mdx': [
    'In September 2026, Shutong Jin, Ken Goldberg and colleagues reported AGRO-SUVIDE, a coding-agent framework that builds debridement skills from one expert demonstration and retries a skill when its checks fail. In 340 physical trials on the da Vinci Research Kit, it removed single fragments from a viscoelastic substrate with 85% average success and completed three consecutive removals 60% of the time, or 95% with one human intervention <Cite id="agro-suvide-2026" />.',
  ],
  'frontier/dexterity.mdx': [
    'In September 2026, Yutong Liang, Quanquan Peng, Matthew Kim and Xiaolong Wang reported FINGR, a flow policy that turns Rubik\'s Cube layers with a single real dexterous hand. It succeeded on 99.0% of 300 turn attempts, against 79.7% for the base flow policy, and with grasping and table-assisted regrasping added it solved all ten scrambled 2×2×2 cubes in about 137 seconds on average <Cite id="fingr-2026" />.',
  ],
  'frontier/safety-and-assurance.mdx': [
    'Barrier functions are also being adapted to bodies that rigid-arm controllers handle poorly. In September 2026, Zijian Cai, Daniela Rus, Cecilia Laschi and colleagues weighted the control barrier functions along a slender hyper-redundant robot to enforce obstacle constraints while correcting tracking errors from uneven loading. On a circular path-following task with obstacles, fixed weights cut the root-mean-square tracking error of the unweighted method by up to 59.6% in simulation and 87.7% in physical experiments <Cite id="wcbf-hyper-redundant-2026" />.',
  ],
  'data-hardware/data-bottleneck.mdx': [
    'Generated data is a third route, and several 2026 humanoid papers trained on it. GRAIL, from Tianyi Xie, Linxi Fan, Yuke Zhu, Ye Yuan and colleagues in June 2026, builds human-object interaction videos from 3D assets and video foundation models, reconstructs them in 4D and retargets them to a humanoid, giving more than 20,000 sequences; policies trained only on that data reached 84% pick-up success on a Unitree G1, averaged over five objects at ten trials each, and 90% on stair climbing <Cite id="grail-2026" />. HumanoidMimicGen, from Kevin Lin, Ajay Mandlekar, Linxi Fan, Yuke Zhu and colleagues in May 2026, adapts a handful of source demonstrations to new object poses with whole-body planning; on four real-world tasks, average success rose from 0.51 with real demonstrations alone to 0.71 when they were co-trained with its generated data <Cite id="humanoidmimicgen-2026" />. In September 2026, PRISM, from Zihan Wang, Guanya Shi, Angjoo Kanazawa and colleagues, turned a few real videos into hundreds of generated variants and deployed the resulting policy on a real humanoid with no real-world fine-tuning, picking up, carrying and dropping new instances of boxes, barrels, bins and balls <Cite id="prism-humanoid-2026" />. The same month, DexAgent, from Youhui Wang, Yunzhu Li, Li Fei-Fei, Jiajun Wu and Huang Huang, turned a single egocentric human video and a task prompt into simulated robot trajectories, and across eleven real tasks its policies reached 3.5 times the success rate of competing baselines <Cite id="dexagent-2026" />.',
  ],
  'data-hardware/industrial-deployment.mdx': [
    'IFR\'s release of World Robotics 2026 on September 24, 2026 carries the count one year forward. It reports a record operational stock of 5 million industrial robots in 2025, up 9%, and more than 600,000 installations that year, up 11%. China installed 354,000 units, 59% of global deployments, and the United States, with almost 38,500 installations, passed Japan to become the second-largest market <Cite id="ifr-world-robotics-2026-release" />.',
  ],
  'classical/state-estimation.mdx': [
    'A September 2026 paper from Linus Kramer, William Talbot, Olga Vysotska and Marco Hutter is an example. For robots on construction sites, they replace the observation model of a Monte Carlo localization particle filter with a network that matches LiDAR scans against the building mesh, trained only on scans simulated inside that mesh. On real-world datasets it outperformed diffusion-based and ScanContext++ baselines at 18 ms per call <Cite id="mesh-mcl-construction-2026" />.',
  ],
};
