# RL, sim-to-real and locomotion content-integrity audit

Date of audit: 2026-08-17. Scope: the six published `rl-sim2real` articles
(why-rl-locomotion, parallel-sim-rl, sim2real-transfer, legged-locomotion,
humanoid-wbc, reward-design-mpc) against their cited primary sources, fetched
and read during this audit (arXiv abs pages and HTML full texts, the Sage IJRR
full text of Park et al. 2017, the legged_gym reference source on GitHub, the
NVIDIA Isaac-GR00T and GR00T-WholeBodyControl repos, and the Figure, Boston
Dynamics, RAI Institute, and Google DeepMind primary pages). Claims
VAL-AUDIT-002.

Method: every checkable claim (numbers, dates, names, benchmark results and
protocol context, attributions, quoted phrases) was extracted per article and
checked against the source the article cites for it, by fetching that source.
The verdicts below record the source actually read and the passage that
settles the claim. Interactive panels were checked for honest-unknown labeling
(illustrative/scripted callouts) and for consistency with the corrected prose.

## Summary

Counting unit: ledger rows, one claim per row, counted from the tables
below. Recomputed by the 2026-08-18 reconciliation sweep; an earlier
version of this header said "81 checked / 75 verified / 5 corrected",
which a reader cannot reproduce from the tables.

- Claims checked: 115 rows (why-rl-locomotion 12, parallel-sim-rl 18,
  sim2real-transfer 24, legged-locomotion 18, humanoid-wbc 20,
  reward-design-mpc 23)
- Verified: 108 (106 plain `verified` rows, 1 "verified (+ citation added)"
  row whose claim verified but needed a registry entry for traceability,
  and 1 verified-by-convention row recorded as the article's own framing)
- Corrected: 7 rows covering 6 defects (the 5 numbered corrections below
  plus the Lin-et-al. quote-fidelity micro-fix; the Rudin reward
  enumeration spans 2 rows: the prose correction and the interactive's
  wording)
- Cut: 0
- Unresolved: 0

Arithmetic: 108 + 7 = 115 rows.

### 2026-09-06 reseal addendum

The registry published `rl-for-robotics` on 2026-08-22, after the sweep
above, so this ledger stopped covering its domain the day that article
shipped. It was audited on 2026-09-06 under the same conventions, and
`npm run check:audit-coverage` now derives both sides of that comparison
so the gap cannot reopen silently.

- Claims checked: 52 rows (rl-for-robotics)
- Verified: 43
- Corrected: 8
- Cut: 0
- Unresolved: 1 (an uncited on-policy-versus-off-policy stability
  comparison; left as written rather than given manufactured support,
  and recorded in its row)

Arithmetic: 43 + 8 + 0 + 1 = 52 rows. Domain total after the addendum:
167 rows over 7 of 7 published articles.

Glossary correction applied in the same pass (the same P3 defect the
`rl-for-robotics.mdx` prose carried): the `reset-free-learning`
definition said Sharma and colleagues evaluate the agent "on how much
human intervention it needs rather than only on final performance".
Intervention in that paper is a bounded budget with a per-step cost, not
a metric; the metrics are deployed-policy evaluation (summed regret) and
continuing-policy evaluation. The definition now states the budget and
the lifetime scoring.

Corrections:

1. `sim2real-transfer.mdx` attributed a coined phrase to the Isaac Lab paper:
   "Isaac Lab calls it an information-capacity mismatch". The paper's actual
   term is "an information gap due to input mismatch" (Sec. 5.1.2). The coined
   phrase originated in this repo's own research notes
   (`research/02-rl-sim2real-world-models.md`). Corrected to the paper's
   wording; matching comments fixed in `lib/sim2real.ts` and
   `components/interactive/teacher-student.tsx`.
2. `sim2real-transfer.mdx` claimed the reality-gap survey "calls the
   abstraction choice one of the highest-leverage and least-discussed levers
   in the field". No such characterization exists in the survey; it says "The
   action space plays a crucial role in reducing the sim-to-real gap as
   demonstrated across robotics domains including navigation, locomotion, and
   manipulation". Rewritten to the survey's actual emphasis. The
   "highest-leverage, least-discussed" gloss also traces to
   `research/02-rl-sim2real-world-models.md`.
3. `reward-design-mpc.mdx` cited Rudin et al. 2021 for a "dozen-plus"
   locomotion reward enumeration (incl. foot air-time, base height, joint
   limits, foot slip, termination). Rudin's Table 2 reward has nine terms, no
   gait-dependent elements ("neither the reward function nor the action space
   has any gait-dependent elements"), and no foot-slip or air-time term. The
   enumeration matches the open-source `legged_gym` configuration released
   with the paper (15 default reward scales, 19 reward functions). Reframed to
   name the code explicitly, citation moved to a new registry entry
   `legged-gym-repo-2021`, "foot-slip" replaced by the code's actual
   `feet_stumble` term (penalizes feet hitting vertical surfaces), and the
   RewardShaping interactive's slider renamed from "Foot slip penalty" to
   "Foot stumble penalty" to match ("mounts the full term set" became "mounts
   twelve of these terms", the interactive having 12 sliders).
4. `reward-design-mpc.mdx` attributed a design motive to Rudin et al.: the
   KL-adaptive learning rate "exists partly to absorb reward retuning". The
   paper states the mechanism (adapting the learning rate to a KL-divergence
   target) without that motive. Rewritten so the mechanism is sourced and the
   retuning connection is the article's own inference.
5. `legged-locomotion.mdx` claimed Jeon et al. 2023 showed "the shaping of the
   reward, not the choice of RL algorithm, decides whether training converges
   to a usable gait". The paper benchmarks reward formulations only; it trains
   everything with PPO-Clip at fixed hyperparameters (Sec. III-D) and never
   compares RL algorithms. Rewritten to the paper's actual finding:
   potential-based terms are significantly more robust to reward scaling than
   direct shaping, and therefore easier to tune.
6. Quote-fidelity micro-fix in `why-rl-locomotion.mdx`: the Lin et al. quote
   read "much more laborious real-to-sim engineering effort"; the paper's v1
   wording is "much more laborious real-to-sim engineering efforts". Fixed.
   Note: the sentence exists in arXiv v1 and was removed in v2; the registry
   abs URL is standard, and the quote is genuine to the cited document's v1.

Traceability fix: `humanoid-wbc.mdx` named WholeBodyVLA with a specific claim
("learns latent actions from action-free egocentric video for
loco-manipulation") but no citation. The claim verifies against the paper
(arXiv:2512.11047: "enables Vision-Language-Action (VLA) system to learn from
low-cost action-free egocentric videos ... unified framework for humanoid
loco-manipulation"), so a registry entry `wholebodyvla-2025` was added and the
sentence now cites it.

Hardware-context sweep (milestone rule: every throughput, training-time or
sample-count figure carries hardware and simulator context or is cut): all
such figures pass. Rudin wall-clock numbers carry "single workstation GPU"
(the paper names i9-11900K + RTX A6000); Isaac Lab FPS figures carry
8 GPUs / 16,384 environments; Newton 252x/475x carries RTX PRO 6000 Blackwell
plus a vendor-reported flag; DexPBT's ~16 h carries 8 workers on 1-2 OVX L40
GPUs; Helix 02's 200,000+ environments and 1,000+ hours are flagged
vendor-reported; RAI's ~150M runs names the simulator pipeline. No figure was
cut.

## rl-for-robotics.mdx

Audited 2026-09-06 (brand-v2 editorial reseal, `brand-v2-article-truth-and-audit-reseal`).
Method: properties P1-P5, every cited source fetched live and read; verdicts follow
this ledger's conventions.

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| "formalized as a Markov decision process: states, actions, a transition rule, a reward" | Sutton & Barto, *Reinforcement Learning: An Introduction*, 2nd ed., registry URL (web.archive capture 20260818231355) resolves HTTP 200 | verified | Textbook definition of the finite MDP (Ch. 3). Registry title/authors/year/edition match the cited landing page. |
| "there are four thousand of them happening at once" (parallel environments in a GPU simulator) | Rudin et al., arXiv 2109.11978, ar5iv HTML, Sec. 4.2 | verified | "we use a policy trained with 4096 robots and a batch size of 98304". |
| "In a GPU simulator, a step is a fraction of a microsecond" | Rudin et al., arXiv 2109.11978, Sec. 4.2 + Appendix A.1 | **corrected** | Rudin states no per-step time in prose (Fig. 8 is a plot, no numbers in text). The only derivable figure is amortized: 98,304 x 1,500 = 147,456,000 steps in under 1,200 s, i.e. under 8.2 microseconds per environment step, roughly an order of magnitude above "a fraction of a microsecond". Rewritten to "a step costs under ten microseconds of wall clock, amortized across the four thousand robots taking one at once", which the stated batch/update/time figures support as an upper bound. |
| PPO "alternating between sampling interaction data and optimizing a surrogate objective ... buys several minibatch epochs from one batch instead of the single gradient step plain policy gradient allows" | Schulman et al., arXiv 1707.06347, abstract | verified | "alternate between sampling data through interaction with the environment, and optimizing a 'surrogate' objective function"; "Whereas standard policy gradient methods perform one gradient update per data sample, we propose a novel objective function that enables multiple epochs of minibatch updates". |
| Q-learning: "fit the value of a state-action pair, and bootstrap from the best available next action rather than the one that was taken" | Sutton & Barto 2018, Ch. 6.5 (off-policy TD control) | verified | Standard textbook statement of the Q-learning target; the article cites the textbook, not a paper, for it. |
| "DDPG adapted deterministic policy gradients to deep function approximators and learned pixel-to-torque policies off-policy" | Lillicrap et al., arXiv 1509.02971, ar5iv HTML, abstract + Sec. 3 + Sec. 5 | verified | "a model-free, off-policy actor-critic algorithm using deep function approximators"; "Our work is based on the deterministic policy gradient (DPG) algorithm"; "the algorithm can learn policies 'end-to-end': directly from raw pixel inputs"; "In all domains but cheetah the actions were torques applied to the actuated joints". |
| "TD3 diagnosed the overestimation bias that made DDPG unstable and fixed it with clipped double critics, delayed policy updates and target smoothing" | Fujimoto, van Hoof & Meger, arXiv 1802.09477, ar5iv HTML, abstract + Secs. 4, 5.2, 5.3 | verified | Abstract: overestimated value estimates persist "in an actor-critic setting", "taking the minimum value between a pair of critics", "delaying policy updates"; Sec. 5.3 is Target Policy Smoothing Regularization ("adding a small amount of random noise to the target policy and averaging over mini-batches"). |
| SAC's "target was sample complexity, the thing standing between model-free deep RL and real robots" | Haarnoja et al., arXiv 1801.01290, abstract | **corrected** | The paper names two challenges, not one: "very high sample complexity and brittle convergence properties, which necessitate meticulous hyperparameter tuning. Both of these challenges severely limit the applicability of such methods to complex, real-world domains." The definite article and the narrowing to "real robots" both overstate. Rewritten to "one of the two challenges they named as keeping model-free deep RL out of complex real-world domains". |
| "On-policy updates are the more stable and less hyperparameter-sensitive of the two" | Haarnoja et al., arXiv 1801.01290, ar5iv HTML, §1 (fetched) | **corrected** | No source cited in this article states an on-policy-versus-off-policy stability or hyperparameter-sensitivity comparison. sac-2018's "in contrast to other off-policy algorithms, our approach is very stable" compares SAC with other off-policy methods, and ppo-2017 claims an advantage over TRPO, not over off-policy methods; the hyperparameter-sensitivity half had no support at all. What §1 of sac-2018 does state is one-sided: "the combination of off-policy learning and high-dimensional, nonlinear function approximation with neural networks presents a major challenge for stability and convergence". Rewritten to that quoted one-sided statement, attributed and cited, and the hyperparameter comparison dropped. |
| "Rudin and colleagues trained ANYmal with 4,096 parallel robots at 98,304 steps per policy update, 1,500 updates in under twenty minutes on one workstation GPU" | Rudin et al., arXiv 2109.11978, Sec. 4.2 + Table 3 | verified | "we use a policy trained with 4096 robots and a batch size of 98304, which we train for 1500 policy updates in under 20 minutes ... Trained on: i9-11900k CPU, NVIDIA RTX A6000 GPU"; Table 3: "Batch size 98304 (4096x24)". |
| "Discarding every one of those 147 million transitions after a single update" | Rudin et al., arXiv 2109.11978, Sec. 4.2 + Table 3 | verified | 98,304 x 1,500 = 147,456,000. "Single update" = one policy update, which Table 3 shows spans 5 epochs of minibatch updates, consistent with the article's own PPO description. |
| "nearly free at 123,000 steps per second" | Rudin et al., arXiv 2109.11978, Sec. 4.2 (derived) | verified | 147,456,000 / 1,200 s = 122,880 steps/s. Derived arithmetic from Rudin's stated batch size, update count and wall clock, not a figure the paper prints; the same derivation is written out in `lib/sample-efficiency.ts`. |
| "is indefensible at twenty" (single-robot step rate) | Haarnoja et al., arXiv 1812.11103, Sec. VII-B (derived) | **corrected** | 160,000 control steps / 7,200 s = 22.2 steps/s. "Twenty" understates by 10% while the companion figure in the same sentence is rounded to 0.1%. Changed to "twenty-two". |
| "no serious real-robot training result uses an on-policy method to learn from scratch" | Uncited universal; checked against every hardware result the article cites | **corrected** | Unfalsifiable as written and unsupported by any cited source. Narrowed to the article's own evidence: "every from-scratch hardware result below learns off-policy or through a model rather than on-policy", which holds for Minitaur/SAC (off-policy), DayDreamer (learned world model), QT-Opt (off-policy), and HIL-SERL (RLPD, off-policy). |
| Stat: "Minitaur walking / 160k steps / about two hours of real-world time, SAC" | Haarnoja et al., arXiv 1812.11103, ar5iv HTML, Sec. VII-B | verified | "Our method successfully learns to walk from 160k control steps, or approximately 400 rollouts ... The whole training process takes about two hours." Algorithm is SAC with learned temperature (Fig. 7 caption). |
| Stat: "A1 walking / 1 h / DayDreamer, no simulator and no resets" | Wu et al., arXiv 2206.14176, ar5iv HTML, abstract + Sec. 3.1 | verified | "Dreamer trains a quadruped robot to roll off its back, stand up, and walk from scratch and without resets in only 1 hour"; "We use the Unitree A1 robot"; "without simulators or resets". |
| Stat: "QT-Opt grasping / 580k grasps / about 800 robot hours across 7 robots" | Kalashnikov et al., arXiv 1806.10293, ar5iv HTML, Sec. 7 | verified | "we collected 580k grasp attempts across 7 robots with a total of about 800 robot hours". |
| Stat: "hand-eye grasping / 800k grasps / two months on between 6 and 14 arms" | Levine et al., IJRR 37(4-5), doi:10.1177/0278364917710318; text read from the arXiv 1603.02199 full text, Sec. 5.2 | verified | "We collected about 800,000 grasp attempts over the course of two months, using between 6 and 14 robots at any given point in time." |
| "learned Minitaur locomotion from 160,000 control steps, roughly 400 rollouts, in about two hours of real-world time, and that figure is end to end" | Haarnoja et al., arXiv 1812.11103, Sec. VII-B | verified | "160k control steps, or approximately 400 rollouts"; "The whole training process takes about two hours". |
| "it sits far below the control rate the rollouts ran at" | Haarnoja et al., arXiv 1812.11103, Sec. VII-B | verified | "Each rollout has the maximum length of 500 steps (equivalent to 10 seconds)", i.e. 50 Hz, against the 22.2 steps/s end-to-end rate. |
| "DayDreamer ... trained a quadruped to roll over, stand and walk in one hour without a simulator, then found the policy adapting to being pushed within ten minutes" | Wu et al., arXiv 2206.14176, abstract + Sec. 3.1 | verified | "We then push the robot and find that Dreamer adapts within 10 minutes to withstand perturbations or quickly roll over and stand back up." |
| "QT-Opt collected over 580,000 grasp attempts across seven robots in about 800 robot hours" | Kalashnikov et al., arXiv 1806.10293, abstract + Sec. 7 | verified | Abstract: "over 580k real-world grasp attempts"; Sec. 7: "across 7 robots with a total of about 800 robot hours". |
| "the earlier hand-eye coordination work collected around 800,000 grasps over two months using between 6 and 14 arms at a time" | Levine et al. 2018 (IJRR), full text Sec. 5.2 | verified | Verbatim match on all three quantities. |
| Offline RL "learns a policy from a fixed dataset of transitions with no further environment interaction" | Levine, Kumar, Tucker & Fu, arXiv 2005.01643, abstract | verified | "reinforcement learning algorithms that utilize previously collected data, without additional online data collection". |
| "Levine, Kumar, Tucker and Fu's tutorial names distributional shift as the central problem" | Levine et al., arXiv 2005.01643, ar5iv HTML, Sec. 4 | verified | "The fundamental challenge with making such counterfactual queries is distributional shift". Registry author order and year match the arXiv byline. |
| "the error is self-reinforcing, because the inflated value becomes the bootstrap target for the next update" | Levine et al., arXiv 2005.01643, Sec. 4.2 | verified | "this discrepancy can result in highly erroneous target Q-values. This issue is further exacerbated by the fact that [the policy] is explicitly optimized to maximize" the expected Q-value. |
| "CQL learns a lower bound on the policy's value by penalizing Q-values on out-of-distribution actions while leaving the in-distribution ones alone" | Kumar et al., arXiv 2006.04779, ar5iv HTML, Sec. 3.1 (Eqs. 1-2) | **corrected** | CQL does not leave in-distribution actions alone. Eq. 2, the variant CQL actually uses, adds a maximization term: "we can improve the bound by introducing an additional Q-value maximization term under the data distribution". Rewritten to "penalizing Q-values on out-of-distribution actions and maximizing them under the data distribution, which is the term that tightens the bound". |
| "IQL never evaluates an unseen action: it fits an expectile of the value distribution over the actions the dataset does contain ... and extracts the policy by advantage-weighted regression" | Kostrikov, Nair & Levine, arXiv 2110.06169, abstract | verified | "an offline RL method that never needs to evaluate actions outside of the dataset"; "taking a state conditional upper expectile of this random variable"; "we extract the policy via advantage-weighted behavioral cloning". |
| "TD3+BC adds a behavior-cloning term to a standard off-policy actor-critic and normalizes the states ... matches the performance of far more elaborate offline methods" | Fujimoto & Gu, arXiv 2106.06860, ar5iv HTML, abstract + Sec. 4 (Eqs. 3-4) | verified | "we can match the performance of state-of-the-art offline RL algorithms by simply adding a behavior cloning term to the policy update of an online RL algorithm and normalizing the data"; Sec. 4: "we normalize the features of every state in the provided dataset". |
| "Q-Transformer treats each action dimension as a token and learns Q-values autoregressively with a transformer, so offline RL can absorb large mixed-quality robot datasets" | Chebotar et al., arXiv 2309.10150, abstract | verified | "By discretizing each action dimension and representing the Q-value of each action dimension as separate tokens"; "training multi-task policies from large offline datasets that can leverage both human demonstrations and autonomously collected data". |
| "Mandlekar and colleagues ... reported that batch RL methods perform poorly there" (human demonstration data) | Mandlekar et al., arXiv 2108.03298, ar5iv HTML, Sec. 4.2 | verified | Result heading: "Batch RL algorithms perform poorly on Human Datasets." |
| "BCQ and CQL both worked well on agent-generated data of mixed quality" | Mandlekar et al., arXiv 2108.03298, Sec. 4.2 + Table 1 | **corrected** | The paper singles out BCQ: "BCQ in particular performs strongly on our agent-generated MG datasets". CQL does not work well there: Table 1, Can (MG), CQL scores 1.3 +/- 0.9 against BCQ's 75.3 +/- 0.9. Rewritten to "BCQ in particular performed strongly on agent-generated data of mixed quality, neither BCQ nor CQL performed particularly well on the human-generated datasets". |
| "a recurrent behavior-cloning baseline was consistently strong" | Mandlekar et al., arXiv 2108.03298, Table 1 caption | verified | "methods that model temporal correlations (BC-RNN, HBC, IRIS) exhibit strong performance on human datasets"; BC-RNN is the bolded best on most human-data rows. |
| "human data is multimodal and non-Markovian in ways these algorithms were not built for" | Mandlekar et al., arXiv 2108.03298, Sec. 2 (C1) + Sec. 4.2 | verified | "due to a non-Markovian decision process, since humans may not act purely based on the current observation"; "This most likely stems from the presence of suboptimal and multimodal data in the MH datasets". |
| "it wins under specific but common conditions, notably sparse rewards and noisy or suboptimal data" | Kumar, Hong, Singh & Levine, arXiv 2204.05618, abstract | verified | "under specific but common conditions such as sparse rewards or noisy data sources, modern offline RL methods can significantly outperform BC". |
| "on long-horizon problems a policy trained on sufficiently noisy suboptimal data can beat behavior cloning trained on expert data" | Kumar et al., arXiv 2204.05618, abstract | verified | "policies trained on sufficiently noisy suboptimal data can attain better performance than even BC algorithms with expert data, especially on long-horizon problems". |
| "On short-horizon tasks with clean expert demonstrations ... they agree cloning is the reasonable choice" | Kumar et al., arXiv 2204.05618, ar5iv HTML, Sec. 6 | **corrected** | The paper never endorses BC. Its own summary is "both approaches attain similar performance on expert data, additional assumptions on the environment can provide certain offline RL methods with an advantage". Rewritten to "Absent those conditions, on clean expert data, they report the two attaining similar performance, which leaves cloning the simpler tool for a teleoperation dataset", marking the practitioner conclusion as the article's, not the authors'. |
| "RLPD initializes online off-policy training from a buffer already holding offline data, with no pretraining phase and no explicit conservatism" | Ball, Smith, Kostrikov & Levine, arXiv 2302.02948, ar5iv HTML, Sec. 2 + Sec. 4.1 | verified | "we do not perform any offline pre-training but run online RL from scratch with offline data included in a replay buffer"; "whilst maintaining the freedom of an unconstrained off-policy method"; "we do not restrict the policy using a behavior cloning term". Symmetric 50/50 sampling is the mechanism, and the paper's own summary sentence is the phrasing the article follows. |
| "That recipe is the direct ancestor of the human-in-the-loop systems" | Luo, Xu, Wu & Levine, arXiv 2410.21845 PDF, Sec. 4 | verified | "the core underlying RL algorithm that we build on is RLPD (Ball et al., 2023) ... At each training step, RLPD samples equally between prior data and on-policy data". |
| "human-in-the-loop off-policy RL reaching near-perfect success in one to two and a half hours of real-world training" | Luo et al., arXiv 2410.21845, abstract + Table 1 | verified | "near-perfect success rates and fast cycle times within just 1 to 2.5 hours of training"; "HIL-SERL achieved a success rate of 100% within 1 to 2.5 hours of real-world training on nearly all the tasks". |
| "Hindsight experience replay relabels a failed episode with the goal it actually reached" | Andrychowicz et al., NeurIPS 2017 PDF (arXiv 1707.01495), Sec. 1 + Sec. 3 | verified | "The pivotal idea behind HER is to replay each episode with a different goal than the one the agent was trying to achieve, e.g. one of the goals which was achieved in the episode." |
| "showed this learning from binary sparse rewards without any shaping, solving manipulation tasks the same algorithm could not otherwise touch" | Andrychowicz et al., arXiv 1707.01495, abstract + Sec. 4 | verified | "sample-efficient learning from rewards which are sparse and binary and therefore avoid the need for complicated reward engineering"; "Our ablation studies show that Hindsight Experience Replay is a crucial ingredient which makes training possible in these challenging environments." |
| "The technique needs goal-conditioning to work" | Andrychowicz et al., arXiv 1707.01495, Secs. 1 and 2.4 | verified | "training universal policies (Schaul et al., 2015a) which take as input not only the current state, but also a goal state"; "It is applicable whenever there are multiple goals which can be achieved". |
| "Zhu and colleagues ... found the missing pieces are mostly not the learning algorithm: reward specification without instrumentation, and resets" | Zhu et al., arXiv 2004.12570, ar5iv HTML, abstract + Sec. 1 | verified | Three required capabilities: "(1) learn from their own raw sensory inputs, (2) assign rewards to their own trials without hand-designed perception systems or instrumentation, and (3) learn continuously in non-episodic settings without requiring human intervention to manually reset the environment". The article names two of the three, hedged by "mostly". |
| "autonomous reinforcement learning, where the agent interacts continually and is measured on how much human intervention it required, not only on final performance" | Sharma et al., arXiv 2112.09605, ar5iv HTML, Sec. 4.1.1 (Def. 1), Sec. 4.1.2 (Def. 2), Appendix A.2 | **corrected** | Intervention count is not an evaluation metric. The two metrics are deployed policy evaluation, a sum of regret over the whole training run, and continuing policy evaluation, an average lifetime reward; interventions enter as a bounded budget `h` decremented by a cost `c(s,a)`, with training terminated when it runs out. Rewritten to "interacts continually under a bounded intervention budget and is scored across its whole training lifetime, not only on the final policy". |
| "Gupta and colleagues learn a collection of related dexterous manipulation tasks whose members reset each other ... the system trains without human intervention" | Gupta et al., arXiv 2104.11203, abstract | verified | "solving a multi-task problem can directly solve the reset-free problem since different combinations of tasks can serve to perform resets for other tasks"; "learn dexterous manipulation behaviors in the real world with RL without any human intervention". |
| "online flow-matching fine-tuning" attributed to pi-RL | Chen et al., arXiv 2510.25889 abs page (title and abstract verified live) | verified | Title: "pi_RL: Online RL Fine-tuning for Flow-based Vision-Language-Action Models"; abstract addresses "intractable action log-likelihoods raised from flow matching". |
| "residual policies generating their own training data" attributed to PLD | Xiao et al., arXiv 2511.00091 abs page (title and abstract verified live) | verified | Title: "Self-Improving Vision-Language-Action Models with Data Generation via Residual RL"; abstract: "improves VLAs through residual reinforcement learning (RL) and distribution-aware data collection". |
| "DROID and Open X-Embodiment are the corpora" | arXiv 2403.12945 and arXiv 2310.08864 abs pages, verified live | verified | Both ids resolve to the titles the registry records; both are large-scale robot manipulation dataset papers, which is all the article asserts of them here. |
| P1 sweep: all 27 frontmatter citation ids resolve to documents whose title, author list and year match the registry | Each id fetched during this audit (arXiv abs pages, one DOI record, one web.archive capture) | verified | No title, byline-prefix, year or venue mismatch found in `data/citations.ts` for any id this article cites. Truncated author lists carry the house four-author convention with an in-file comment recording the true count. |
| SampleEfficiencyLedger caption anchors: ANYmal under four minutes / twenty minutes at 4,096 envs; A1 one hour; Minitaur 160,000 steps; QT-Opt 580,000 grasps across seven robots in ~800 robot hours; 800,000 grasps over two months on 6-14 arms | Rudin abstract; DayDreamer abstract; Haarnoja Sec. VII-B; QT-Opt Sec. 7; Levine Sec. 5.2 | verified | Every anchor matches the source read above. Rudin abstract: "training policies for flat terrain in under four minutes, and in twenty minutes for uneven terrain". |
| SampleEfficiencyLedger honest-unknown labelling: lanes labelled "modelled conversions at a constant rate, not measured", anchors labelled "measured runs, from the papers", verdict boundaries labelled editorial | `components/interactive/sample-efficiency-ledger.tsx` and `lib/sample-efficiency.ts` | verified | The instrument discloses that fleet scaling is linear-model optimism and prints the measured QT-Opt per-robot rate (4.0 steps/robot-second) against the 22.2 steps/s single-robot lane. P4-conformant: no modelled value is presented as measured. |

## why-rl-locomotion.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| "In 2021, Rudin and colleagues trained an ANYmal quadruped to walk on flat ground in under four minutes, and on uneven terrain in twenty minutes, on a single workstation GPU" | Rudin et al., arXiv 2109.11978v2 HTML, Sec. 4.1 | verified | "It takes less than 4 minutes to train the policy on flat terrain and 20 minutes on rough terrain"; "Trained on: i9-11900k CPU, NVIDIA RTX A6000 GPU". Hardware context present in the article and both Stat boxes. |
| "the manipulation MDP is not cheaply simulatable" (survey framing) | Reality-gap survey, arXiv 2510.20808 HTML | verified | Survey documents dynamics/contact gaps as "particularly problematic in contact-rich tasks like robotic manipulation"; the MDP-asymmetry framing is the article's synthesis of it. |
| Isaac Lab on dexterous manipulation: "remains challenging compared to standard parallel-jaw grasping due to the high-dimensional action space and fine-grained control required" | Isaac Lab paper, arXiv 2511.04831v1 HTML, Sec. 5.1.1 | verified | Verbatim quote; the paper's answer for DextrAH is SDF collision, accurate contact modeling, and domain randomization, as the article states. |
| Lin et al.: dexterous manipulation successes involve "much more laborious real-to-sim engineering efforts" | Lin et al., arXiv 2502.20396 v1 HTML | **corrected** | v1: "previous successes in dexterous manipulation involve much more laborious real-to-sim engineering efforts that are task-specific or hardware-specific". Article had singular "effort"; fixed, and the sentence now carries the paper's task-/hardware-specific qualifier. The sentence was removed in v2; the quote is genuine to v1 of the cited document. |
| "OpenAI solved a Rubik's cube with a five-fingered hand in 2019, trained entirely in simulation with automatic domain randomization" | OpenAI Rubik's cube paper, arXiv 1910.07113 abstract | verified | "trained entirely in simulation" + Automatic Domain Randomization; 2019. |
| "DextrAH-RGB ... the first system to map stereo images directly to dexterous grasping end to end" | Isaac Lab paper, Sec. 5.1.2 | verified | The authors' own first-system claim for DextrAH-RGB; attributed as such. |
| "Play2Perfect trains CAD-derived sparse-reward assembly tasks and transfers zero-shot, including 60% success on insertions with 0.5 mm clearance" | Play2Perfect paper | verified | 60% at 0.5 mm clearance; CAD-derived sparse rewards; zero-shot transfer. |
| "The Rubik's cube run consumed a custom robot platform and a randomization curriculum tuned for that task" | OpenAI paper (custom Shadow-hand platform, task-tuned ADR ranges) | verified | Article's framing of per-task engineering cost, supported by the paper's setup. |
| GR2: "multi-finger household tasks spanning 32% (dustpan) to 92% (unscrewing a bulb), 89.6% on gripper-based precise insertion, and whole-body pick success of 68.4% from a table, 45.7% from the floor, and 76.3% from a shelf" | Gemini Robotics 2 announcement (deepmind.google), fetched 2026-08-17 | verified | Every figure matches the vendor's published per-task table; Stat box "32-92%" mirrors it. |
| "In 2026 there is still no manipulation equivalent of the four-minute walking run" | Survey + Isaac Lab + Lin evidence above | verified | Honest-unknown framing, consistent with every source read; Stat "none" states it as absence, not measurement. |
| MdpComparison table (six MDP properties) + ContactGeometry interactive (2 mm / 20 mm tolerance figures) | Callout in article; lib/contact-geometry.ts header | verified | Both are labeled illustrative models; the sourced anchors (Rudin wall-clock, GR2 rates, Play2Perfect clearance) are named in the callout. P4-conformant. |
| Frontmatter citations resolve to the intended documents (rudin-2021, reality-gap-survey-2026, isaac-lab-2025, lin-humanoid-sim2real-2025, openai-rubiks-cube-2019, play2perfect-2026, gemini-robotics-2-2026) | Each fetched during this audit | verified | Titles, authors, years, venues match the live documents. |

## parallel-sim-rl.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| "Isaac Gym was the first demonstration of end-to-end RL for complex robot tasks running entirely on one GPU ... two to three orders of magnitude improvement" | Isaac Gym paper, arXiv 2108.10470 abstract | verified | "2-3 orders of magnitude improvements in training times"; simulation state exposed as GPU-resident PyTorch tensors. |
| "Four thousand parallel ANYmal instances, a game-inspired terrain curriculum ... flat terrain in under four minutes, uneven terrain in twenty, on a single workstation GPU" | Rudin et al., arXiv 2109.11978v2, Sec. 3-4 | verified | 4,096 robots; promote/demote curriculum; times and hardware as above. |
| "The open-sourced code, legged_gym, is still the reference lineage for the RSL-RL training stack" | legged_gym repo (github.com/leggedrobotics/legged_gym, master) + RSL-RL lineage in Isaac Lab paper | verified | Repo is Rudin/Hoeller/Hutter; Isaac Lab lists RSL-RL as a first-class hook. |
| "Rollouts are short (a few dozen steps per environment per iteration ...), batches are enormous (on the order of 100k transitions), and the learning rate adapts to a KL-divergence target" | Rudin et al., Sec. 3.2 + supplementary | verified | 24 steps x 4,096 envs ~= 98k transitions per iteration; adaptive LR on a KL target. |
| "Brax, from Google in 2021, wrote the physics and the learning algorithms in JAX ... training performant policies on MuJoCo-like tasks in minutes" | Brax paper, arXiv 2106.13281 abstract | verified | "physics and learning algorithms ... in JAX", "minutes" on accelerators. |
| "MuJoCo XLA (MJX) ... MuJoCo Playground (2025) packaged it as an open robot-learning framework spanning locomotion and manipulation, with sim-to-real transfer as a stated goal" | MuJoCo Playground paper, arXiv 2502.08844 abstract | verified | "A unified framework for robot learning built on MJX ... locomotion and manipulation ... sim-to-real". |
| "Brax remains the JAX-native differentiable option among current engines" | State of Simulation 2026 (primary page) | verified | Solver/engine survey lists Brax as the JAX-native differentiable engine. |
| Isaac Lab feature inventory (OpenUSD scene layer, PhysX, RTX, tiled camera rendering, Warp raycast sensors, non-linear actuator models, manager-based API, RSL-RL/RL-Games/SKRL/SB3/Ray hooks) | Isaac Lab paper, arXiv 2511.04831v1 HTML, Sec. 3-4 | verified | Each named feature appears in the framework sections. |
| "over 900,000 frames per second on the state-based DextrAH teacher task and over 1.6 million frames per second on Franka cabinet-opening, both at 8 GPUs and 16,384 environments", scaling "almost perfectly linearly" | Isaac Lab paper, Sec. 6 benchmark tables | verified | >900k and >1.6M FPS at 8 GPUs / 16,384 envs; "almost perfectly linearly" is the paper's phrase. Hardware/env context present in Stat boxes and prose. |
| "a single-GPU RTX 5090 workstation approaches a 2x RTX PRO 6000 server, because parts of the PhysX pipeline and the main training loop are bound by single-core CPU performance" | Isaac Lab paper, Sec. 6 systems analysis | verified | Paper's own single-core-CPU-bottleneck finding; RTX 5090 vs 2x RTX PRO 6000 on Franka (25% faster on DextrAH). |
| "Isaac Lab 3.0 (2026) ... backend-specific code is separated from the core API ... headless on Newton ... photoreal sensors ... through the standalone OVRTX renderer" | State of Simulation 2026 | verified | 3.0 decoupling and OVRTX reattachment as described. |
| "Newton, which hit 1.0 GA at GTC in March 2026 ... built on NVIDIA Warp and OpenUSD, founded by NVIDIA, Google DeepMind, and Disney Research and governed under the Linux Foundation" | Newton manipulation blog (NVIDIA developer), fetched 2026-08-17 | verified | All four facts stated in the announcement. |
| Solver inventory (MuJoCo Warp, Featherstone, Kamino, VBD, implicit MPM) + "SDF-based collision ... plus-or-minus 10 mm narrow band" + "hydroelastic contacts ... explicitly borrowed from Drake's contact model" | Newton blog | verified | Solver list, +-10 mm SDF narrow band, and the Drake hydroelastic borrowing all stated. |
| "Skild ... GPU-rack connector insertion, and Samsung with Lightwheel for refrigerator hose insertion with the VBD cable solver" | Newton blog | verified | Both customer uses named as in the article. |
| "MuJoCo Warp runs 252x faster than MJX on locomotion and 475x on manipulation, measured on an RTX PRO 6000 Blackwell" | Newton blog benchmark section | verified | Numbers and hardware named; article flags vendor-reported, unreplicated. |
| "domain randomization still writes physics parameters (masses, frictions, contact offsets) through PhysX CPU APIs, which is why randomization happens on episode reset rather than continuously" | Isaac Lab paper, Sec. 4 (domain randomization) | verified | Parameter writes go through the PhysX CPU API; mesh scale/collider type fixed before sim start. |
| "Drake keeps its niche: contact-implicit trajectory optimization and rigorous numerics, not throughput" | State of Simulation 2026 | verified | Drake's positioning as stated in the survey article. |
| TrainingTimeChart economics (fixed vs scaling per-iteration cost; hours-to-minutes curve) | Callout in article; lib/parallel-sim.ts header | verified | Labeled illustrative fixed-transitions model; measured anchors are the Rudin diamonds and Isaac Lab FPS figures. |

## sim2real-transfer.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| "The 2026 reality-gap survey organizes the field into nearly these same buckets, adding sim-real co-training and state/action abstraction as cross-cutting levers" | Reality-gap survey, arXiv 2510.20808 HTML, abstract + Sec. 4 | verified | Taxonomy: domain randomization, real-to-sim transfer, state and action abstractions, sim-real co-training. |
| Stat: "DR parameter writes CPU-bound ... mass, friction via PhysX CPU API" | Isaac Lab paper, Sec. 4 | verified | As in parallel-sim row above. |
| Stat: "RMA adaptation < 1 s ... latent extrinsics, online at control rate" | RMA paper, arXiv 2107.04034 abstract | verified | "online adaptation ... in fractions of a second" via the learned adaptation module over recent proprioception. |
| Stat: "SplatSim zero-shot 86.25% ... vs 97.5% for real-data-trained policies" | SplatSim paper, arXiv 2409.09961 abstract | verified | "86.25% average success rate, compared to 97.5% ... trained on real-world data". |
| "Tobin and colleagues randomized rendering ... could localize objects to 1.5 cm on a real arm" + "just another variation" | Tobin et al., arXiv 1710.06537 abstract | verified | "accuracy of about 1.5 cm"; "the real world may appear to the model as just another variation". |
| "Peng and colleagues randomized dynamics instead (mass, inertia, friction) and transferred a pushing policy to hardware with no real-world training" | Peng et al., arXiv 1703.06907 abstract | verified | Dynamics randomization; sim-only training; real pushing with calibration error tolerance. |
| "automatic domain randomization widens the randomization range as the agent succeeds" + "Isaac Lab ships ADR as a configurable curriculum" | OpenAI paper (ADR) + Isaac Lab paper, Sec. 5 (ADR workflow) | verified | ADR mechanism per OpenAI; Isaac Lab's ADR curriculum with reference dexterous configs per the paper. |
| "simulation parameters (masses, frictions, contact offsets, joint armature) must still be written through PhysX CPU APIs, and mesh scale or collider type can only change before the simulator starts" | Isaac Lab paper, Sec. 4 | verified | Both plumbing facts stated in the paper's DR section. |
| "DR buys a wider basin of transfer at the price of peak performance, and papers almost never quantify the price" | DR literature pattern; honest-unknown framing | verified | Article presents it as an unquantified cost; no source overclaimed. |
| "Lee and colleagues' ANYmal controller: a privileged teacher distilled into a temporal convolutional network over proprioceptive history, trained in simple simulated domains and deployed blind on mud, snow, rubble, and vegetation" | Lee et al., Science Robotics 2020, arXiv 2010.11251 | verified | Teacher-student with TCN student; zero-shot deployment on those terrains. |
| "RMA factorized the same idea into a base policy conditioned on a latent extrinsics vector plus an adaptation module that regresses those extrinsics online" | RMA paper, arXiv 2107.04034 | verified | Base policy + adaptation module architecture; online latent extrinsics. |
| "DextrAH-RGB distills a state-privileged RL teacher into a stereo-RGB student, which the authors describe as the first system to map stereo images directly to dexterous grasping end to end" | Isaac Lab paper, Sec. 5.1.2 | verified | First-system claim attributed to the authors. |
| "Isaac Lab calls it an information-capacity mismatch" | Isaac Lab paper, Sec. 5.1.2 | **corrected** | Paper: "imitation-based distillation introduces an information gap due to input mismatch: the teacher observes privileged state information, while the student sees only partial observations ... particularly pronounced under high camera occlusions". The "information-capacity mismatch" coinage came from `research/02-rl-sim2real-world-models.md`, not the paper. Rewritten to the paper's term and wording; code comments in `lib/sim2real.ts` and `components/interactive/teacher-student.tsx` updated to match. |
| "Hwangbo and colleagues' actuator network: a learned map from joint-command history to realized torque, replacing the analytic actuator model whose miscalibration had been the dominant sim-to-real error source on ANYmal" | Hwangbo et al., Science Robotics 2019, arXiv 1804.10332 | verified | Actuator net trained on real data; dominant error source; agile skills incl. fall recovery. |
| ASAP pipeline (pre-train tracking policy on retargeted human motion, real G1 rollout, delta action model mapping sim state + action to residual, insert into simulator, fine-tune) | ASAP paper, arXiv 2502.13143 | verified | All stages as described; Unitree G1 hardware. |
| "ASAP evaluates it across IsaacGym-to-IsaacSim, IsaacGym-to-Genesis, and IsaacGym-to-hardware transfers, reducing tracking error against SysID, DR, and delta-dynamics baselines" | ASAP paper | verified | Three transfer scenarios and the baseline set as stated. |
| "the delta model is learned on the state distribution the pre-trained policy visits, so it is only valid near that distribution" | ASAP paper, limitations | verified | The paper's own validity caveat. |
| "SplatSim replaces the simulator's mesh renderer with a 3D Gaussian Splatting reconstruction ... 86.25% ... against 97.5%" | SplatSim paper | verified | As Stat row above. |
| "RoboGSim packages the same loop as a real2sim2real simulator: reconstruct the scene as splats, compose novel views, objects, and trajectories, and evaluate policies online against the twin" | RoboGSim paper, arXiv 2411.11839 | verified | Real2Sim2Real pipeline as described. |
| "Newton 1.0's tiled camera sensor accepts Gaussian splats as a native scene representation" | Newton blog | verified | Splat-native tiled camera stated in the announcement. |
| "the splat supplies appearance, and a conventional physics engine still supplies dynamics ... it reconstructs a static scene" | SplatSim/RoboGSim architectures | verified | Division of labor as described; article's static-scene caveat matches both papers' scopes. |
| "The survey calls the abstraction choice one of the highest-leverage and least-discussed levers in the field" | Reality-gap survey, arXiv 2510.20808 HTML, Sec. 4.2 | **corrected** | Survey says "The action space plays a crucial role in reducing the sim-to-real gap as demonstrated across robotics domains including navigation, locomotion, and manipulation" — no "highest-leverage" or "least-discussed" characterization anywhere. Rewritten to the survey's own emphasis. |
| FrictionTransfer interactive (specialist spike vs generalist plateau) | Callout in article; lib/sim2real.ts header | verified | Labeled illustrative; sourced anchors are the Tobin/Peng framing, ADR, and the CPU-API constraint. |
| TeacherStudent interactive (degradation slider, reconstruction blur, action divergence) | lib/sim2real.ts header (updated) | verified | Deterministic illustrative model; comment now names the paper's actual term. |

## legged-locomotion.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| Stats: "< 4 min" flat / "20 min" uneven, one workstation GPU; "1 h" alpine hike; "3.03 m/s" sand running | Rudin 2021; Miki 2022; Choi 2023 | verified | Hardware context present on the Rudin stats; Miki/Choi stats name paper and setting. |
| "Hwangbo and colleagues replaced the analytic model with a learned actuator network ... policies trained in simulation produced agile dynamic skills on ANYmal, including recovery from a fall and self-righting" | Hwangbo et al., arXiv 1804.10332 | verified | Actuator net from joint-command history to torque; recovery and self-righting demonstrated. |
| "A privileged teacher policy ... distilled into a student that sees only a short history of proprioception through a temporal convolutional network. Trained in simple simulated domains, the student hiked mud, snow, rubble, and vegetation" | Lee et al., arXiv 2010.11251 | verified | As in sim2real row. |
| "Their controller feeds the scan through an attention-based recurrent encoder that learns a belief over the terrain, integrating proprioception ... completed an hour-long hike in the Alps in the time recommended for human hikers" | Miki et al., Science Robotics 2022, arXiv 2201.08101 | verified | Belief encoder integrating proprioception when the map lies; 1 h hike at guidebook pace. |
| "Massive GPU parallelism plus a game-inspired terrain curriculum ... trained ANYmal to walk on flat ground in under four minutes and on uneven terrain in twenty, on a single workstation GPU" + legged_gym reference-implementation claim | Rudin et al. + legged_gym repo | verified | As above. |
| "they put a computationally cheap granular-media model inside the training loop and paired it with a controller that identifies terrain properties from feel ... Raibo quadruped ran on soft beach sand at 3.03 m/s with its feet fully buried during stance" | Choi et al., Science Robotics 2023 (science.org abstract + body) | verified | Granular-media model + proprioceptive terrain identification; 3.03 m/s, feet fully buried in stance. |
| "The bound alternates the front pair against the hind pair with a suspension interval in between; the MIT Cheetah line made high-speed bounding practical by scaling the duty cycle with speed" | Park, Wensing & Kim, IJRR 2017, DOI 10.1177/0278364917694244, Sec. 4.3 | verified | Sec. 4.3 is literally "Duty cycle modulation via vertical impulse scaling"; stance time T_st = L/v_d scales inversely with speed; 6.4 m/s and CoT 0.47 verified from abstract. |
| "The duty factors shown here are canonical nominal values; real controllers, classical and learned alike, modulate duty factor continuously with speed" | Park et al. 2017 (classical instance) | verified | Canonical-value disclaimer present; classical modulation per Park; learned-side induction covered by the air-time reward discussion. |
| "H2O turned retargeted human keypoints into real-time whole-body teleoperation on the H1, with RL supplying the physical feasibility that raw retargeting destroys" | H2O paper, arXiv 2403.04436 abstract | verified | Real-time whole-body teleoperation of a full-sized humanoid (Unitree H1) from a single RGB camera; RL motion imitator filters infeasible retargeted motions. |
| "ASAP added a delta-action correction stage ... and produced jumps and sports-style motions on the G1" | ASAP paper | verified | As in sim2real rows. |
| "Jeon and colleagues benchmarked potential-based reward formulations for learned locomotion, showing systematically how the shaping of the reward, not the choice of RL algorithm, decides whether training converges" | Jeon et al., arXiv 2307.10142v1 HTML, abstract + Sec. III | **corrected** | The paper benchmarks DRS vs PBRS reward terms on the MIT Humanoid (18-DoF, arms fixed) using PPO-Clip only (Sec. III-D, fixed hyperparameters, i9-10850K + RTX 3060, Isaac Gym). No RL-algorithm comparison exists; the article's "not the choice of RL algorithm" contrast was unsupported. Rewritten to the paper's finding: "PBRS reward terms are significantly more robust to scaling than typical reward shaping approaches, and thus easier to tune". Follow-on sentence now notes everything trained with one off-the-shelf PPO configuration, which the paper's setup supports. |
| "Spot's production locomotion controller was MPC-based: dozens of predictive controllers evaluated in parallel and scored every step" | Boston Dynamics, "Starting on the Right Foot with Reinforcement Learning" (2024), fetched 2026-08-17 | verified | "Spot evaluates dozens of individual predictive horizons ... a system that can 'score' the output of each of these controllers". |
| "In 2024 the company integrated a learned policy ... reduced onboard compute (no more parallel MPC instances), cut fall rates on slick and irregular surfaces, and, freed from periodic-gait assumptions, climbs boxes over 70 cm" | Same blog | verified | Compute reduction ("removing the need to run multiple MPC instances in parallel"); "less likely to fall — even on extremely slick or irregular surfaces"; ">70cm" box climbing "not limited to the periodic gait assumptions". |
| "policies are vetted on a 24/7 robustness fleet logging over 2,000 hours a week ... reproducible falls are recreated in simulation and folded back into training" | Same blog | verified | "operate 24/7 for a cumulative runtime of over 2,000 hours a week"; falls "recreated in simulation where they become either part of the training or evaluation set". |
| "In early 2025 Boston Dynamics and the RAI Institute showed RL policies on the new electric Atlas that track retargeted human motion, each maneuver distilled from roughly 150 million simulator runs and transferred zero-shot to hardware" | RAI Institute page (Mar 19, 2025), fetched 2026-08-17 | verified | "The control policy tracks and controls retargeted human motion data. Each maneuver is created with data from about 150 million runs of the simulator and transferred zero-shot to the hardware." |
| "By August 2025 the collaboration with Toyota Research Institute had shifted Atlas's manipulation behaviors to Large Behavior Models: a 450M-parameter diffusion transformer with a flow-matching objective, language-conditioned, controlling the full robot at 30 Hz from teleoperated demonstrations" | Boston Dynamics/TRI LBM blog (Aug 2025), fetched 2026-08-17 | verified | "450M parameter Diffusion Transformer-based architecture together with a flow-matching objective"; language-conditioned; "control the full Atlas robot at 30Hz"; teleoperation data pipeline; MPC-based teleop stack ("Atlas's teleoperation system is built on its MPC" also verified). |
| GaitDiagram interactive (walk/trot/bound/pronk duty factors and phase offsets) | Textbook gait definitions; article disclaimer | verified | Values presented as canonical nominal; the disclaimer sentence (verified above) carries the honest-unknown framing. |
| Frontmatter citations resolve to the intended documents (12 ids) | Each fetched during this audit | verified | Titles/authors/years match. |

## humanoid-wbc.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| Stats: "Helix 02 S0 1 kHz, 10M parameters"; "200,000+ parallel sim environments"; "3 embodiments, one checkpoint"; "22 DoF SharpaWave" | Figure Helix 02 post + Gemini Robotics 2 post, fetched 2026-08-17 | verified | All four match the vendor posts; vendor-reported callout present on the page. |
| "PHC ... track large motion libraries perpetually, recovering from falls and absorbing noisy pose input from video or language generators, by progressively adding network capacity as the motion set grew" | PHC paper, arXiv 2305.06456 abstract | verified | "ten thousand motion clips ... fault-tolerant ... noisy input (e.g. pose estimates from video or generated from language)"; PMCP "dynamically allocates new network capacity". Simulation-only, as the article says. |
| "H2O moved the template onto hardware ... real-time whole-body teleoperation interface on the Unitree H1" | H2O paper, arXiv 2403.04436 abstract | verified | Real-time whole-body teleop of a full-sized humanoid (H1) from RGB; RL policy for dynamic feasibility. |
| "OmniH2O ... kinematic pose as a universal control abstraction ... VR teleoperation, RGB video, verbal instruction, or a frontier model ... teleoperation and autonomous skill learning from teleoperated demonstrations" | OmniH2O paper, arXiv 2406.08858 abstract | verified | "Using kinematic pose as a universal control interface ... VR headset, verbal instruction, and RGB camera ... integrating with frontier models such as GPT-4 ... learning from teleoperated demonstrations". |
| "HumanPlus ... A low-level RL shadowing policy lets the humanoid mirror a human in real time from a single RGB camera; operators then teleoperate through shadowing ... behavior cloning on that data produces autonomous skills" | HumanPlus paper, arXiv 2406.10454 abstract | verified | Low-level RL policy, real-time shadowing from one RGB camera, teleop-through-shadowing data collection, supervised BC to autonomous skills. |
| "ExBody2 decouples velocity tracking from landmark tracking and filters infeasible references through a teacher policy, producing controllers that walk, crouch, and dance on hardware" | ExBody2 paper, arXiv 2412.13196 abstract | verified | "decoupling the velocity tracking of the entire body from tracking body landmarks ... teacher policy ... automatically filter away infeasible whole-body motions ... walk, crouch, and dance". The failure-cascade diagnosis is the article's framing of the decoupling motivation. |
| "KungfuBot pushed tracking to highly dynamic motions with adaptive tolerance curricula" | KungfuBot paper, arXiv 2506.12851 abstract | verified | "highly-dynamic human behaviors such as Kungfu and dancing ... bi-level optimization ... dynamically adjust the tracking accuracy tolerance ... adaptive curriculum mechanism"; G1 deployment. |
| "GMT merged the per-skill policies into a single unified policy ... adaptive sampling over easy and hard clips and a motion mixture-of-experts" | GMT paper, arXiv 2506.14770 abstract | verified | "single unified policy ... Adaptive Sampling automatically balances easy and difficult motions ... Motion Mixture-of-Experts"; real-world tracking. |
| "references that arrive noisy or locally infeasible ... get selectively aggregated through a dynamics-conditioned command encoder, with a fall-recovery curriculum" | Robust tracking paper, arXiv 2601.23080 abstract | verified | "noise and inconsistencies after being transferred to the robot domain ... dynamics-conditioned command aggregation ... multi-head cross-attention command encoder to selectively aggregate ... fall recovery curriculum with random unstable initialization and an annealed upward assistance force". |
| Helix 02 architecture and numbers: S2 semantic latents; S1 visuomotor transformer at 200 Hz, all sensors in, full joint targets out; S0 10M-parameter, 1 kHz, joint state + base motion to actuator commands; trained on 1,000+ h joint-level retargeted human motion + sim-to-real RL across 200,000+ parallel environments; replaced 109,504 lines of hand-engineered C++; 4-minute dishwasher task of 61 loco-manipulation actions | Figure, figure.ai/news/helix-02, fetched 2026-08-17 | verified | Every number and the three-layer division match the post verbatim; article flags the demo as vendor-reported with no paper and no success rates. |
| "GR00T N1.7, a 3B-parameter VLA with a Cosmos-Reason2 backbone and a flow-matching action head, predicts compact latent action tokens; the GEAR-SONIC whole-body controller, exposed as the UNITREE_G1_SONIC embodiment, decodes those tokens into full-body joint commands for legs, arms, and hands" | Isaac-GR00T repo README + GR00T-WholeBodyControl repo README (fetched 2026-08-17) | verified | "nvidia/GR00T-N1.7-3B"; "Cosmos-Reason2-2B" backbone; "Action head remains flow-matching DiT"; "the VLA predicts compact latent action tokens that a learned whole-body controller decodes into full-body joint commands — including legs, arms, and hands"; UNITREE_G1_SONIC tag. |
| "LeVERB learns a latent vision-language verb vocabulary from rendered kinematic demonstrations and hands it to an RL whole-body controller" | LeVERB paper, arXiv 2506.13751 abstract | verified | "a vision-language policy learns a latent action vocabulary from synthetically rendered kinematic demonstrations; ... a reinforcement-learned WBC policy consumes these latent verbs". |
| "WholeBodyVLA learns latent actions from action-free egocentric video for loco-manipulation" | WholeBodyVLA paper, arXiv 2512.11047 abstract | verified (+ citation added) | "unified latent learning framework that enables Vision-Language-Action (VLA) system to learn from low-cost action-free egocentric videos ... unified framework for humanoid loco-manipulation". Claim held; the sentence previously carried no citation, so `wholebodyvla-2025` was registered and cited. |
| "the only one of the three stacks with public code (Apache-2.0) and released weights" | Isaac-GR00T + GR00T-WholeBodyControl repos | verified | Code Apache-2.0 in both repos; weights released on Hugging Face (NVIDIA Open Model License). Helix 02 and GR2 publish no code or weights. |
| GR2 numbers paragraph: "76.3% from a shelf, 68.4% from a table, 45.7% from the floor ... 89.6% gripper-based precise insertion ... 92% (unscrewing a bulb) down to 32% (sweeping with a dustpan)" | Gemini Robotics 2 post | verified | All figures match the vendor table; 60-point spread is arithmetic on sourced values. |
| "the On-Device variant adapts to a new bi-arm embodiment in a few hours, typically with under 200 examples" | Gemini Robotics 2 post | verified | As stated in the post. |
| "The trade-off is opacity: the action representation, control frequency, and parameter counts are all undisclosed" | Gemini Robotics 2 post | verified | The post indeed discloses none of the three; honest-unknown stated as such. |
| Gr2ResultsTable + WbcDecomposition panel data | lib/wbc-decomposition.ts vs both vendor posts | verified | All eleven table rows and the three-decomposition panel numbers match the posts; vendor-reported Callout present. |
| "whether balance and contact belong inside the foundation model or beneath it. Figure and NVIDIA both say beneath it ... DeepMind says inside it ... whole-body tasks succeed at 45.7 to 76.3% where specialized gripper insertion reaches 89.6%" | The three primary posts | verified | Architectural positions as each vendor describes; the number contrast is arithmetic on sourced vendor figures, flagged as the open empirical question (P5-conformant disagreement representation). |
| Frontmatter citations resolve to the intended documents (now 16 ids, incl. wholebodyvla-2025) | Each fetched during this audit | verified | Titles/authors/years match. |

## reward-design-mpc.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| Stats: "reward terms 12+ in a typical locomotion objective"; "Eureka wins 83% of 29 tasks"; "iLQR MPC real-time, whole-body, on hardware"; "MPC task data 0" | legged_gym repo; Eureka paper; Zhang et al. iLQR paper | verified | "12+" now anchored to the legged_gym default config (15 scales + soft-limit/contact-force penalties); Eureka 83%/29 verified below; iLQR real-time hardware MPC verified below; "0 demonstrations" is the MPC framing, stated as such. |
| "a production locomotion reward is a weighted sum of a dozen-plus hand-tuned terms ... A canonical legged_gym-family objective contains ... a foot-slip penalty ... <Cite rudin-2021>" | Rudin et al. arXiv 2109.11978v2 (Sec. 3.3: "a weighted sum of nine terms") + legged_gym repo (legged_robot_config.py scales, legged_robot.py reward functions) | **corrected** | The enumeration (tracking lin/ang vel, z-vel and roll/pitch penalties, torque, dof_acc, action rate, joint limits, collision, base height, feet air time, stumble, termination) matches the code, not the paper; the paper's nine-term reward explicitly has no gait-dependent elements and no air-time/slip term. Citation moved to the new `legged-gym-repo-2021` entry; prose now says the enumeration "is not in any paper; it is in the code" and names the fifteen default scales; "foot-slip" replaced by the code's actual feet_stumble term ("Penalize feet hitting vertical surfaces"); "a foot air-time reward that induces an actual gait instead of shuffling" matches the code's "Reward long steps". The upstream research note had this list marked [UNVERIFIED] against a specific paper; it is now verified against the code. |
| "The KL-adaptive learning rate in the standard PPO configuration exists partly to absorb reward retuning without destabilizing training" | Rudin et al., Sec. 3.2 | **corrected** | The paper states the mechanism (learning rate adapted to a KL-divergence target) without the retuning motive. Rewritten: mechanism cited to the paper, the retuning connection stated as the article's inference. |
| "The interactive below mounts the full term set on a behavior preview" | RewardShaping component (12 sliders) | **corrected** | Changed to "mounts twelve of these terms"; the interactive's "Foot slip penalty" slider was renamed "Foot stumble penalty" (blurb: "Penalizes feet catching vertical surfaces mid-stride") to match the corrected enumeration and the code. Tests updated accordingly. |
| The three failure attractors (freeze, prance, chatter) | Article prose + lib/reward-shaping.ts header | verified | Explicitly labeled an illustrative classification; the attractors are described as literature/lab-lore patterns, not measured output. |
| "Kim et al. trained locomotion controllers across several legged platforms with, in their reporting, a single reward coefficient to tune, because the rest of the intent lived in the constraints" | Kim et al., arXiv 2308.12517 abstract | verified | "locomotion controllers for several legged robots ... trained with significantly less reward engineering, by tuning only a single reward coefficient"; the "in their reporting" hedge is retained. |
| "A constrained multi-objective variant takes the same idea to acrobatics, segmenting a task into stages with per-stage rewards and costs" | Stage-wise CMORL paper, arXiv 2409.15755 abstract | verified | "segment the task into distinct stages and define multiple rewards and costs for each stage ... acrobatic tasks in both simulation and real-world environments". |
| "ROGER adapts reward gains online from the penalties received during training, arguing that any fixed offline choice cannot guarantee constraint satisfaction while the policy is still changing" | ROGER paper, arXiv 2510.10759 abstract | verified | "adapts reward-weighting gains online based on penalties received throughout the embodied interaction process"; "offline selection ... cannot guarantee constraint satisfaction ... during training". |
| Eureka mechanism: "GPT-4 is given the environment source code as context and asked to write the reward function in Python. Candidate rewards train policies in Isaac Gym, candidates are selected on a task fitness function, and the LLM is then shown per-component reward statistics from training and asked to reflect and mutate its own code" | Eureka paper, arXiv 2310.12931v2 HTML, Sec. 3 | verified | "takes unmodified environment source code ... zero-shot generate executable reward functions"; "evaluates intermediate rewards using GPU-accelerated distributed reinforcement learning on IsaacGym"; reward reflection on training statistics; fitness function F. |
| "Across a 29-task suite spanning 10 robot morphologies, Eureka's rewards outperformed human-expert rewards on 83% of tasks with an average normalized improvement of 52%" | Eureka paper abstract | verified | Verbatim figures. |
| EurekaLoop panel (walking-task replay: sprint-and-fall, stand-still, then tracking) | components/interactive/eureka-loop.tsx caption | verified | Labeled "Scripted replay of the Eureka loop" in the UI; dramatization disclosed. |
| "The 2026 Reward Design Agent work restates the Eureka loop as the baseline and adds visual trajectory evaluation to catch instruction misalignment that scalar fitness misses" | RDA paper, arXiv 2606.01672 abstract | verified | "Recent work, such as Eureka ... rely on coarse feedback signals such as success rate ... RDA ... visually evaluates trajectories, summarizes failure modes, and iteratively revises reward code". |
| "Terrain curriculum is the game-inspired scheme ... robots that succeed on a terrain tile get promoted to a harder one, robots that fail get demoted" | Rudin et al., Sec. 3.1 | verified | The game-inspired promote/demote curriculum. |
| "Automatic Domain Randomization widens the randomization distribution itself as success crosses a threshold ... now ships in Isaac Lab as a configurable curriculum" | OpenAI paper + Isaac Lab paper Sec. 5 | verified | As in sim2real rows. |
| "DexPBT evolves hyperparameters and reward weights across a population of learners, and Isaac Lab reproduces its 6D reposing result with 8 workers on one to two GPUs each, converging in about 16 hours on NVIDIA OVX L40 hardware" | Isaac Lab paper, Sec. 5.2 | verified | 8 workers, 1-2 GPUs each, ~16 h, OVX L40 — hardware and simulator context present. |
| "an MPC layer optimizing a reduced-order model over a half-second to one-second horizon at 20 to 100 Hz, and a whole-body QP ... at 500 to 1000 Hz" | (uncited canonical background) | verified-by-convention | Standard textbook rates for the three-layer legged stack; presented as generic architecture, not as a specific system's measurement. Noted here for completeness; no source is claimed. |
| "Zhang et al., presented at ICRA 2026: plain iLQR with MuJoCo dynamics and finite-difference-approximated derivatives achieves real-time whole-body MPC on hardware, across dynamic quadruped locomotion, a quadruped walking on two legs, and full-sized humanoid bipedal locomotion ... with few sim-to-real considerations" | Zhang et al., arXiv 2503.04613v3 abstract | verified | Verbatim-level match incl. "few sim-to-real considerations", "easy-to-reproduce hardware baseline", "to appear at ICRA 2026". |
| "Boston Dynamics added RL to Spot's MPC-based locomotion to handle variability rather than replacing the stack" + "Atlas's move to Large Behavior Models covers manipulation behavior with the controls stack underneath" | BD Spot-RL blog + BD/TRI LBM blog | verified | Both verified as in the legged-locomotion rows. |
| "locomotion is settled, and sim-RL controllers handle terrain, pushes, and hardware variation that hand-designed stacks never achieved, at the cost of one forward pass at deploy time" | Lee 2020 + Miki 2022 | verified | Framed as the steelmanned case; anchored to the two cited controllers. |
| "Gemini Robotics 2 controls three embodiments from one checkpoint, and no model-based stack does anything comparable" | GR2 post | verified | Three-embodiment one-checkpoint claim verified; the model-based contrast is the article's steelman, accurately scoped. |
| "the learning stack spent 2025 and 2026 importing model-based contact research, hydroelastic pressure fields and contact-implicit optimization, into its simulators" | State of Simulation 2026 + Newton blog | verified | Newton's hydroelastic-from-Drake and contact-implicit positioning verified. |
| MpcComparison table + MpcVsRl interactive | lib/mpc-vs-rl.ts header | verified | Axes table states each side's sourced properties; interactive labeled as illustrative model of the difference. |
| Frontmatter citations resolve to the intended documents (now 16 ids, incl. legged-gym-repo-2021) | Each fetched during this audit | verified | Titles/authors/years match; new entries point at the live repo and abs page. |

## Notes for future audits

- Two of the five substantive corrections trace back to phrases coined in
  `research/02-rl-sim2real-world-models.md` ("information-capacity mismatch",
  "highest-leverage and least-discussed") that were then attributed to
  sources in the published articles. The research notes are working documents
  and were left as-is; treat any named-characterization claims in research
  files as hypotheses to re-verify at article time.
- The Lin et al. quote survives only in arXiv v1 (2502.20396v1); v2 dropped
  the sentence. The registry cites the abs page (latest version), so a reader
  landing on v2 will not find the quote. Recorded here rather than changing
  the registry, since abs-page links are the house convention.
- `legged_gym` reward term semantics worth reusing: `feet_stumble` fires on
  horizontal-dominant foot contact forces (catching vertical surfaces);
  `feet_air_time` rewards swing time above 0.5 s at first contact ("Reward
  long steps"). The Rudin 2021 paper's Table 2 has nine terms and states
  "neither the reward function nor the action space has any gait-dependent
  elements", so gait-inducing terms must be cited to the code, not the paper.
- Jeon et al. (arXiv 2307.10142) is a reward-formulation benchmark only:
  PPO-Clip exclusively, MIT Humanoid with fixed arms, i9-10850K + RTX 3060.
  Do not cite it for RL-algorithm comparisons.
