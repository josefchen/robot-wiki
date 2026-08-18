# Manipulation content-integrity audit — Part 1 (bc-foundations, action-chunking, diffusion-policy)

Date of audit: 2026-08-17. Scope: the three milestone-3 manipulation articles
against their cited primary sources, fetched and read during this audit
(arXiv abs pages, arXiv HTML full texts, official PDFs, the official ACT
reference implementation, and the Physical Intelligence and Figure primary
pages). Part 1 of 3 for the manipulation domain; VAL-AUDIT-001 is claimed by
part 3, which covers the remaining nine articles.

Method: every checkable claim (numbers, dates, names, benchmark results and
protocol context, attributions) was extracted per article and checked against
the source the article cites for it, by fetching that source. The verdicts
below record the source actually read and the passage that settles the claim.

## Summary

Counting unit: ledger rows, one claim per row, counted from the tables
below. The ten `PolicyChunkingTable` rows are counted individually (each
names its own source), so this header reconciles against the tables by
direct count. An earlier version of this header said "61 claims / 56
verified / 3 corrected" by silently aggregating those ten rows into a
single claim; the 2026-08-18 reconciliation sweep recomputed every total
from the tables (counting convention in `audit/README.md`).

- Claims checked: 71 rows (14 `bc-foundations` + 32 `action-chunking` +
  25 `diffusion-policy`)
- Verified: 67
- Corrected: 4 rows — 3 from the original 2026-08-17 pass plus 1 added by
  the 2026-08-18 consolidation sweep, which flipped the ACT
  "14-dim continuous, two 7-DoF arms" row from verified to corrected
- Cut: 0
- Unresolved: 0

Corrections from the original pass: the ACT chunk-size ablation was
attributed to the wrong setting (real-robot "ALOHA insertion and transfer
tasks" instead of the paper's two simulated MuJoCo tasks) and the
temporal-ensembling weight index was inverted relative to the paper's
stated convention, both in `action-chunking.mdx`; the Diffusion Policy
transformer-variant gloss "(DiT)" was dropped in `diffusion-policy.mdx`
because the paper never uses that acronym. (An earlier version of this
paragraph said all three were in `action-chunking.mdx` and that
`diffusion-policy` passed clean; the tables say otherwise.)
`bc-foundations` passed clean.

## bc-foundations.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| "In 1988, ALVINN trained a three-layer network to steer a van from camera images" | ALVINN paper, NeurIPS 1988 proceedings PDF (proceedings.neurips.cc/paper_files/paper/1988/file/812b4ba287f5ee0bc9d43bbf5bbe87fb-Paper.pdf) | verified | "ALVINN ... is a 3-layer back-propagation network designed for the task of road following. Currently ALVINN takes images from a camera and a laser range finder as input"; it steers the NAVLAB, CMU's "autonomous navigation test vehicle". |
| "a policy with per-step error ε on the expert distribution can incur total cost growing quadratically in the episode length T" | DAgger paper, arXiv 1011.0686 HTML, Sec. 2, Thm 2.1 | verified | "J(π) ≤ J(π*) + T²ε ... this bound is tight, i.e. there exist problems such that a policy π with ε 0-1 loss on d_π* can incur extra cost that grows quadratically in T." |
| "they gave a matching lower bound showing the quadratic term is unavoidable under i.i.d. training" | DAgger paper, arXiv 1011.0686 HTML, Sec. 2 + footnote 1 | verified | "Note that this bound is tight" with the Kääriäinen 2006 sequence-prediction example (Θ(T²ε)). |
| "The second bound [O(εT)] is what becomes available when the training distribution covers the states the policy actually visits" | DAgger paper, arXiv 1011.0686 HTML, Thm 3.2 | verified | "J(π̂) ≤ J(π*) + uTε̂_N + O(1)" for DAgger under the no-regret reduction. |
| "Physical Intelligence restated the same point in operational terms in 2025: it is relatively easy to get a learned policy to succeed at a task some of the time, and much harder to make it succeed reliably" | π*0.6 blog, pi.website/blog/pistar06 (fetched 2026-08-17) | verified | "while it's relatively easy to get VLAs to succeed at a task some of the time, it's quite hard to make them succeed reliably." |
| "switching from per-timestep prediction to committing to a chunk of 25 actions cuts the number of closed-loop decisions by 25x" | Framing of the interactive's illustrative chunk length; mechanism (k-fold reduction in effective horizon) per ACT paper arXiv 2304.13705 Sec. IV-A | verified | Paper: "This implies a k-fold reduction in the effective horizon of the task." The 25 value is the interactive's own parameter, presented as simulation, not as a measured ACT result. |
| "both ACT and Diffusion Policy document robots freezing in place because of it [temporally correlated confounders]" | ACT arXiv 2304.13705 Sec. IV-A/V-A; Diffusion Policy arXiv 2303.04137v5 Sec. 4.3 + App. C.2 | verified | ACT: "the robot can pause indefinitely for certain states"; DP: "single-step policies can easily overfit to this pausing behavior. For example, BC-RNN and IBC often get stuck in real-world experiments when the idle actions are not explicitly removed." |
| "diffusion policies and flow-matching heads were built to solve [multimodality]" | Diffusion Policy arXiv 2303.04137v5 abstract, Sec. 4.1 | verified | "gracefully handling multimodal action distributions" is a stated finding. |
| DAgger loop description (roll out current policy mixed with the expert early on; query expert at visited states; aggregate; retrain) | DAgger paper, arXiv 1011.0686 HTML, Sec. 3 | verified | "it uses π̂_n to collect more trajectories and adds those trajectories to the dataset D ... optionally allow the algorithm to use a modified policy π_i = β_i π* + (1−β_i)π̂_i ... that queries the expert"; "trains the next policy under the aggregate of all collected datasets." |
| "DAgger reduces imitation learning to no-regret online learning, which is where the O(εT) bound comes from" | DAgger paper, arXiv 1011.0686 HTML, title + Thm 3.2 | verified | Title is "A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning"; Thm 3.2 gives the uTε bound. |
| "Classic DAgger needs a supervisor who can look at an arbitrary mid-failure robot state and name the correct action, which is unnatural and slow for a human teleoperator" | DAgger paper Sec. 3 (expert labels every visited state) + HG-DAgger paper arXiv 1810.02890 abstract | verified | HG-DAgger: DAgger-style schemes "require the expert to provide action labels without being fully in control of the system ... likely to degrade the quality of the collected labels due to perceived actuator lag." |
| "the variant that survives in practice is intervention-based: the operator watches the rollout and takes over only when the robot starts failing, as in HG-DAgger" | HG-DAgger paper, arXiv 1810.02890 HTML, Sec. II | verified | "we allow the human expert to take control when they deem it necessary and to maintain exclusive control authority until they manually hand control back to the novice policy." |
| "Fourteen years later, the same pattern shows up as the 'coaching' stage of Physical Intelligence's Recap, where human corrections on visited states fine-tune a vision-language-action policy" | π*0.6 blog, pi.website/blog/pistar06 (2011 → 2025 = 14 years) | verified | "coaching to provide corrections, where an expert shows the robot how it can fix a mistake ... running our best current policy and 'taking over' with manual teleoperation when the robot makes a mistake." |
| Frontmatter citations resolve to the intended documents (alvinn-1988, dagger-2011, hg-dagger-2019, pistar06-blog-2025, act-aloha-2023, diffusion-policy-2023) | Each fetched during this audit | verified | Titles, authors, years and venues match the live documents (ALVINN/Pomerleau/NeurIPS 1988; Ross/Gordon/Bagnell/AISTATS 2011; Kelly/Sidrane/Driggs-Campbell/Kochenderfer/ICRA 2019; Zhao/Kumar/Levine/Finn/RSS 2023; Chi et al./RSS 2023; PI blog 2025). |

## action-chunking.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| "a policy with per-step error ε ... can accumulate cost that grows quadratically with episode length" (intro recap of DAgger) | DAgger paper, arXiv 1011.0686, Thm 2.1 | verified | T²ε upper bound and matching lower-bound construction. |
| "ACT, introduced together with the ALOHA bimanual teleoperation hardware" | ACT paper, arXiv 2304.13705 abstract + Sec. III | verified | The paper presents both the ALOHA system and ACT. |
| "During training, an encoder reads the demonstration's action sequence and produces a latent style variable. At test time the policy decodes a chunk conditioned on camera images, joint positions, and the latent clamped to zero." | ACT paper, arXiv 2304.13705 HTML, Sec. IV-B + Algorithm 1/2 | verified | CVAE encoder q_φ(z\|a_t:t+k, ō_t); Algorithm 2 step 4: "Predict â_t:t+k with π_θ(â_t:t+k\|o_t, z) where z = 0"; "The CVAE encoder only serves to train the CVAE decoder (the policy) and is discarded at test time." |
| Stat: "chunk size k = 100, 2 s of motion per inference" | ACT paper, arXiv 2304.13705, Table III (chunk size 100) + Sec. V-B (50 Hz) | verified | k=100 in the hyperparameter table; 100 steps / 50 Hz = 2 s. |
| Stat: "control rate 50 Hz" | ACT paper, arXiv 2304.13705, Sec. III | verified | "Both the teleoperation and data recording happen at 50Hz." |
| Stat: "policy parameters ~80M, ResNet-18 backbones plus transformer" | ACT paper, arXiv 2304.13705, Sec. IV-C | verified | "The model has around 80M parameters" (trained from scratch per task); "The policy first process the images with ResNet18 backbones". |
| Stat + prose: "success at k=100 44%, 1% at k=1" | ACT paper, arXiv 2304.13705 HTML, Sec. VI-A | verified | "performance improves drastically from 1% at k=1 to 44% at k=100, then slightly tapers down with higher k." |
| "On the ALOHA insertion and transfer tasks, ACT measures roughly 1% success at k=1, 44% at k=100" | ACT paper, arXiv 2304.13705 HTML, Sec. VI-A | **corrected** | The ablation is on the paper's two simulated MuJoCo tasks (Cube Transfer and Bimanual Insertion), averaged across 4 settings (2 sim tasks × scripted/human demos), with temporal ensembling disabled — not on real-robot ALOHA tasks. The numbers were right; the setting was wrong. Rewritten to name the simulated tasks and the averaging protocol, and the hedge "roughly" dropped (1% and 44% are the paper's stated values). Stat note changed from "same tasks" to "simulated ablation". |
| "a decline at k=200 and k=400 as the policy becomes effectively open-loop" | ACT paper, arXiv 2304.13705 HTML, Sec. VI-A | verified | "We attribute the slight dip at k=200,400 (i.e., close to open-loop control) to the lack of reactive behavior and the difficulty in modeling long action sequences." |
| ACT reference configuration: "4 RGB cameras plus joint positions" | ACT paper, arXiv 2304.13705, Sec. IV-C | verified | "The observation includes 4 RGB images, each at 480×640 resolution, and joint positions for two robot arms." |
| "14-dim continuous, two 7-DoF arms" | ACT paper, arXiv 2304.13705, Sec. IV-C | **corrected (2026-08-18 consolidation)** | The paper's Sec. IV-C does say "(7+7=14 DoF in total)", but the hardware (paper Fig. 2 and text: "two ViperX 6-DoF robot arms") is six joints plus a gripper per arm; the original row verified the parenthetical total without checking it against the hardware description. The reference-configuration card in action-chunking.mdx now reads "14-dim continuous, two 6-DoF ViperX arms plus grippers", matching classical/kinematics.mdx's corrected phrasing and the paper's own hardware section. This error survived three manipulation audit passes (i, ii, iii) because the row quoted only the DoF arithmetic. |
| "L1 reconstruction plus KL on the style latent" | ACT paper, arXiv 2304.13705, Sec. IV-B + IV-C | verified | "We use L1 loss for reconstruction instead of the more common L2 loss"; ℒ = ℒ_reconst + β·ℒ_reg with ℒ_reg = D_KL(q_φ(z\|·) ‖ N(0, I)). |
| "z fixed to zero (deterministic decode)" | ACT paper, arXiv 2304.13705, Algorithm 2 | verified | "where z = 0". |
| "averaged with exponential weights w_i = exp(−m·i), where i counts how many chunks ago the prediction was issued" | ACT paper, arXiv 2304.13705, Sec. IV-A + official reference implementation (github.com/tonyzhaozh/act, imitate_episodes.py) | **corrected** | The paper states "w_0 is the weight for the oldest action", and the official implementation (all_time_actions layout + exp(-k·arange(len)), k=0.01) weights index 0, the oldest prediction, most heavily. The article's gloss inverted the index convention (i counts chunks-ago ⇒ newest heaviest). Rewritten to state i=0 indexes the oldest prediction and m=0.01 in the reference implementation; code comment fixed in the same change. |
| "Temporal ensembling assumes inference is nearly free ... Once inference latency reaches 100 to 200 ms ... Physical Intelligence documents the scheme failing outright" | RTC paper arXiv 2506.07339 Sec. 4.2 + PI blog pi.website/research/real_time_chunking | verified | Paper: "Neither TE variant can run at +100 or +200ms of injected latency, causing such high oscillations that the robot's protective stop is triggered." Blog: TE "does not work at all at +100ms or +200ms". |
| "Both ACT and Diffusion Policy document robots freezing when the policy cannot represent the pause" | ACT arXiv 2304.13705 Sec. V-A/VI-A; DP arXiv 2303.04137v5 Sec. 4.3 | verified | ACT: "the robot can pause indefinitely for certain states"; DP: "BC-RNN and IBC often get stuck in real-world experiments when the idle actions are not explicitly removed from training." |
| "RTC reframes the hand-off between chunks as an inpainting problem ... actions that will already have executed are frozen, the overlapping middle is partially attended to, and the remainder is generated fresh" | RTC paper, arXiv 2506.07339 abstract + Sec. 3.1–3.2 | verified | "'freezing' actions guaranteed to execute and 'inpainting' the rest"; soft masking: first d actions weight 1, last s weight 0, exponential decay between. |
| "RTC holds throughput flat out to +200 ms of injected inference delay with no training-time change" | RTC paper, arXiv 2506.07339 Sec. 4.2 | verified | "RTC is completely robust to injected delay, showing no degradation"; "applicable to any diffusion- or flow-based VLA out of the box with no re-training." |
| "which is why the later flow-matching policies of the pi line adopt it over ensembling" | π0.7 paper (pi.website/download/pi07.pdf) Sec. on implementation | verified | "π0.7 also employs the training-time version of real-time action chunking (RTC) [107, 108] for generating smooth action trajectories in the presence of inference delay." |
| "the open releases stop at pi0.5" (table framing) | openpi repo README (github.com/Physical-Intelligence/openpi, fetched 2026-08-17) | verified | README lists exactly π0, π0-FAST, π0.5; Sept 2025 update adds pi05. π0.6/π0.7 are not released there. |
| PolicyChunkingTable: ACT horizon 100, 50 Hz | ACT paper Table III + Sec. III | verified | As above. |
| PolicyChunkingTable: RT-1 horizon 1, 3 Hz, 256 discrete bins per dim | RT-1 paper, arXiv 2212.06817 HTML | verified | "it does this at 3 Hz"; actions discretized into 256 bins (11 dims, 7 arm + 3 base + 1 terminate/gripper mode per the paper; the table only asserts bins-per-dim and rate). |
| PolicyChunkingTable: Diffusion Policy horizon 16, 10 Hz, DDPM over action chunks | DP paper arXiv 2303.04137v5 App. A.4 + Sec. 6.1/D.0.1 | verified | CNN-vision configs To=2 Ta=8 Tp=16; "Diffusion Policy predicts robot commands at 10 Hz"; Franka station "Tele-op and learned policies run at 10Hz". |
| PolicyChunkingTable: Octo horizon/frequency n/a | (honest unknown, deliberate mixed-meaning null per file comment) | verified | No single published horizon/rate for Octo across embodiments; rendered "n/a" with the caption explaining the mixture — P4-conformant. |
| PolicyChunkingTable: pi0 horizon 50, 50 Hz, flow matching | π0 paper, arXiv 2410.24164 HTML | verified | "an action chunk of future actions (we use H=50 for our tasks)"; "control robots at frequencies of up to 50 Hz". |
| PolicyChunkingTable: pi0.5 horizon 50, 50 Hz, "flow matching + FAST supervision" | π0.5 paper, arXiv 2504.16054 HTML, Sec. IV-A/IV-B | verified | "an action horizon of 50, i.e. H=49"; "commands ... at 50 Hz (with action chunking)"; trained to predict actions "both through autoregressive sampling of tokens (using the FAST tokenizer) and iterative integration" of the flow field. |
| PolicyChunkingTable: pi0.6 2025, horizon 50, 50 Hz, "flow matching + FAST tokens", closed | π0.6 model card PDF (website.pi-asset.com/pi06star/PI06_model_card.pdf, Nov 17 2025) | verified | Card: flow matching + tokenized discrete outputs, knowledge insulation with FAST tokens, action expert ~860M on a Gemma3-4B backbone; no open release (openpi stops at π0.5). Horizon 50 inherits the π0.5 architecture it "builds on top of"; the card states the chunk-generation design is shared with π0/π0.5. |
| PolicyChunkingTable: pi0.7 2026, horizon 50, 50 Hz, "executes 15-25 of 50", closed | π0.7 paper PDF (pi.website/download/pi07.pdf) | verified | "we use 5 denoising steps to generate the 50-step action chunks and execute Ĥ ∈ {15, 25} steps out of the chunk"; "a maximum inference latency of 240ms on a 50Hz robot"; "all other robots run at 50 Hz". Not in openpi ⇒ closed. |
| PolicyChunkingTable: GR00T N1.7 2026, horizon 40, "flow-matching DiT head, relative EEF", open | Isaac-GR00T repo README (github.com/NVIDIA/Isaac-GR00T, fetched 2026-08-17) | verified | "action_horizon expanded from 16 to 40"; "Action head remains flow-matching DiT"; N1.7 relative-EEF action space per release notes; repo is public. Frequency rendered "n/a" (embodiment-dependent). |
| PolicyChunkingTable: Helix 02 2026, frequency 200 Hz, "S1 (200 Hz) into S0 (1 kHz) commands", closed; horizon n/a | Figure AI, figure.ai/news/helix-02 (fetched 2026-08-17) | verified | "S1 thinks fast, translating perception into full-body joint targets at 200 Hz. S0 executes at 1 kHz"; no action-chunk horizon published ⇒ "n/a" is the honest render. Weights not released ⇒ closed. |
| "Mobile ALOHA extends the same recipe to a wheeled whole-body platform and shows that co-training on static ALOHA data lifts mobile manipulation success substantially" | Mobile ALOHA paper, arXiv 2401.02117 HTML, abstract + Sec. 4 | verified | "It augments the ALOHA system with a mobile base" (wheeled base, backdriven by the operator); "co-training with existing static ALOHA datasets boosts performance on mobile manipulation tasks ... can increase success rates by up to 90%." |
| Frontmatter citations resolve to the intended documents (dagger-2011, act-aloha-2023, mobile-aloha-2024, diffusion-policy-2023, real-time-chunking-2025, pi-real-time-chunking-blog-2025) | Each fetched during this audit | verified | Registry metadata matches the live documents (Fu/Zhao/Finn 2024; Black/Galliker/Levine 2025; PI blog "Real-Time Action Chunking with Large Models", June 9 2025). |

## diffusion-policy.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| "Diffusion Policy, introduced by Chi et al. in 2023" | arXiv 2303.04137 abs page (submitted 7 Mar 2023) | verified | Chi et al., v1 March 2023, RSS 2023 (registry venue) + journal extension v5 2024. |
| "a reported average improvement of 46.9% over the prior state of the art across 15 tasks and 4 benchmarks" | DP paper PDF v5 (arxiv.org/pdf/2303.04137v5), abstract + Sec. 5 | verified | "We benchmark Diffusion Policy across 15 different tasks from 4 different robot manipulation benchmarks ... with an average improvement of 46.9%"; improvement computed as avg_improvement = 0.46858 ≈ 46.9%. Note: the arXiv abs-page metadata still says "12 different tasks" (stale); the v5 document itself says 15 in both the PDF and HTML full texts. |
| "the design became the default action-head recipe for the generalist policies that followed" | π0 paper arXiv 2410.24164 (flow matching "a variant of diffusion"); π0.5/π0.6 model cards (flow-matching experts) | verified | The π line's action experts are flow-matching descendants of the DP recipe; article states it as lineage, not as a paper quote. |
| "each step applies the learned denoiser ε_θ, which predicts the noise component of the current sample, and subtracts a fraction of it" + update equation | DP paper, arXiv 2303.04137v5 HTML, Sec. 2.1–2.2 | verified | Noise-prediction MSE loss ℒ = MSE(ε^k, ε_θ(x⁰+ε^k, k)); the displayed equation matches the paper's DDPM update form (α, γ, σ as functions of k). |
| "Training uses the standard noise-prediction MSE loss with a square-cosine schedule" | DP paper, Sec. 2.2 + Sec. 3.3 | verified | MSE noise-prediction loss; "we empirically found that the Square Cosine Schedule proposed in iDDPM works best for our tasks." |
| "sampling uses DDIM to cut the 100 training steps down to 10 inference steps, about 0.1 seconds per chunk on an RTX 3080" | DP paper, Sec. 3.4 | verified | "using DDIM with 100 training iterations and 10 inference iterations enables 0.1s inference latency on a Nvidia 3080 GPU." (Real-world experiments; sim used 100/100 iDDPM — the article's sentence is anchored to the same real-world setting the 3080 number comes from.) |
| Stat block: T_o=2, T_p=16, T_a=8, DDIM 10 steps | DP paper, App. A.4 hyperparameter tables + Sec. 4.3/B.1 | verified | CNN-vision rows (Lift/Can/Square/ToolHang/Push-T): To 2, Ta 8, Tp 16, D-Iters Eval 16→10 for real tasks; "we found the action horizon of 8 steps to be optimal for most tasks"; "an observation horizon of 2 is good for most of the tasks." |
| "It commits the first T_a of the T_p predicted actions (8 of 16 in the standard configuration), then observes the world again and replans, warm-starting from the previous prediction" | DP paper, Sec. 3 ("receding horizon control ... to further improve action smoothness by warm-starting the next inference setup with previous action sequence prediction") + App. A.4 | verified | Receding-horizon execution with warm-starting is stated; 8-of-16 is the CNN config above. |
| "The policy issues commands at 10 Hz, so T_a = 8 means the robot commits to each plan for 0.8 seconds" | DP paper, Sec. 6.1 + D.0.1/D.1 | verified | "Diffusion Policy predicts robot commands at 10 Hz"; Franka station: "Tele-op and learned policies run at 10Hz". 8 steps at 10 Hz = 0.8 s (arithmetic on sourced values). |
| "CNN (default): 1D temporal U-Net over the action sequence" | DP paper, Sec. 3.1 ("We adopt the 1D temporal CNN from Janner et al. 2022b") + Diffuser paper arXiv 2205.09991 App. A ("The architecture of Diffuser consists of a U-Net structure with 6 repeated residual blocks ... temporal convolutions") | verified | The adopted backbone is Diffuser's 1D temporal U-Net; "resembles the types of U-Nets ... with two-dimensional spatial convolutions replaced by one-dimensional temporal convolutions". |
| "CNN conditioning: observations injected via FiLM" | DP paper, Sec. 3.1 + Fig. 2 caption | verified | "FiLM (Feature-wise Linear Modulation) conditioning of the observation feature O_t is applied to every convolution layer, channel-wise." |
| "transformer: time-series diffusion transformer (DiT)" | DP paper, Sec. 3.1 | **corrected** | The paper names its variant the "time-series diffusion transformer" adopting the minGPT architecture (Shafiullah et al. 2022); it never uses the term "DiT" (that acronym belongs to Peebles & Xie's image transformer). Dropped the "(DiT)" gloss to keep the paper's own name. |
| "transformer conditioning: observation embedding via cross-attention" | DP paper, Sec. 3.1 + Fig. 2 caption | verified | "the embedding of observation O_t is passed into a multi-head cross-attention layer of each transformer decoder block." |
| "visual encoder: ResNet-18 with GroupNorm, trained end-to-end" | DP paper, Sec. 3.2 | verified | "a standard ResNet-18 (without pretraining) ... Replace BatchNorm with GroupNorm ... trained end-to-end with the diffusion network." |
| "The CNN variant is the recommended default: it trains stably and is robust to hyperparameter choices." | DP paper, Sec. 3.1 (Recommendations) | verified | "we recommend starting with the CNN-based diffusion policy implementation as the first attempt at a new task"; "the CNN-based backbone to work well on most tasks out of the box without the need for much hyperparameter tuning." |
| "The transformer variant handles high-frequency action changes better, because the CNN's temporal-convolution inductive bias smooths exactly the fast structure those tasks need" | DP paper, Sec. 3.1 | verified | CNN "performs poorly when the desired action sequence changes quickly and sharply through time ... due to the inductive bias of temporal convolutions to prefer low-frequency signals"; transformer variant introduced "To reduce the over-smoothing effect in CNN models." |
| "the paper reports that simply adding depth sometimes made results worse" (transformer finickiness) | DP paper, App. A.4 | verified | "increasing model size for transformer-based Diffusion Policy (in particular number of layers) hurts performance sometimes." |
| "DDPM training keeps an exponential moving average of the network weights for sampling. BatchNorm's running statistics interact badly with EMA weights, so the visual encoder replaces every BatchNorm with GroupNorm" | DP paper, Sec. 3.2 | verified | "Replace BatchNorm with GroupNorm for stable training. This is important when the normalization layer is used in conjunction with Exponential Moving Average (commonly used in DDPMs)." |
| "Consistency Policy distills a trained Diffusion Policy into a consistency model that produces a chunk in 1 or 3 steps, targeting robots with edge GPUs, and reports robustness to the quality of the teacher" | Consistency Policy paper, arXiv 2405.07503 HTML, abstract + Sec. III-C + Table VIII | verified | "a single-step process for the fastest inference time possible as well as a 3-step process"; abstract motivates "mobile manipulators or quadrotors [that] cannot be equipped with high-end GPUs"; Table VIII: three teacher qualities (0.92/0.88/0.84) distill to 0.92/0.92/0.88 students. |
| "One-Step Diffusion Policy ... distilling the chain into a single-step generator that lifts action prediction from 1.5 Hz to 62 Hz on real Franka tasks" | OneDP paper, arXiv 2410.21257 HTML, abstract | verified | "boosting action prediction frequency from 1.5 Hz to 62 Hz" on "4 self-designed real-world tasks using the Franka robot"; "an order-of-magnitude improvement in inference speed." |
| pi0 flow-matching equations: A_t^τ = τA_t + (1−τ)ε; u = A_t − ε; τ from a beta distribution weighted toward the noisy end; forward Euler, 10 steps | π0 paper, arXiv 2410.24164 HTML, Sec. II/III + App. A-B | verified | "computing the 'noisy actions' A_t^τ = τA_t + (1−τ)ε ... to match the denoising vector field u(A_t^τ\|A_t) = A_t − ε"; "we sample the flow matching timestep τ from a beta distribution that emphasizes lower (noisier) timesteps" (p(τ)=Beta((s−τ)/s; 1.5, 1), s=0.999); "We use the forward Euler integration rule ... We use 10 integration steps (δ = 0.1)." |
| "There is no noise schedule to tune, and the straight paths tolerate fewer integration steps than a DDPM trajectory" | π0 paper, Sec. on flow matching (linear-Gaussian/OT path; contrast with DDPM) | verified | The π0 paper frames flow matching on the "simple linear-Gaussian (or optimal transport) probability path" as the reason it works with few integration steps; the sentence is the article's summary of that framing, which the paper supports. |
| "Frontier labs did not adopt one-step distillation. Instead of cutting step count, they cut latency: RTC treats the hand-off ... and holds throughput flat out to +200 ms ... with no training-time change" | RTC paper arXiv 2506.07339 Sec. 4.2; π0.6 model card (5 denoising steps); π0.7 paper (training-time RTC, 5 steps) | verified | π0.6/π0.7 use 5-step flow integration + RTC rather than single-step distillation; RTC verified above. The "frontier labs" framing is the article's synthesis, and every mechanism claim in it is sourced. |
| "The 2023 design is single-task and single-embodiment, with no language conditioning and no web-scale pretraining; conditioning a diffusion head on language and scaling it up is exactly what Octo, pi0, and their successors later did" | DP paper Sec. 5.1/6 (per-task training); Octo paper arXiv 2405.12213 abstract ("instructed via language commands or goal images", diffusion head per its architecture); π0 paper (VLM backbone + flow expert) | verified | DP trains one policy per task on fixed embodiments; Octo is language-instructed with a diffusion action head; π0 scales the recipe on a VLM backbone. |
| Frontmatter citations resolve to the intended documents (diffusion-policy-2023, act-aloha-2023, consistency-policy-2024, one-step-diffusion-2024, pi0-2024, real-time-chunking-2025) | Each fetched during this audit | verified | Titles, author lists, years and arXiv ids match the live documents (Prasad/Lin/Wu/Zhou/Bohg 2024; Wang et al. 2024; Black et al., arXiv 2410.24164, published RSS 2025 — registry venue matches the paper's publication venue as listed on its own first page). |

## Notes for the next audit parts

- The arXiv **abs-page metadata** for Diffusion Policy still reads "12
  different tasks" while the v5 document (PDF and HTML) says 15. The registry
  cites the abs URL; the article's "15 tasks" matches the document a reader
  gets when they follow the citation and open the paper. No action needed,
  but worth knowing if a future reachability audit compares abstract text.
- The PolicyChunkingTable's Octo row renders "n/a" for horizon and frequency
  by explicit render (not the shared "not disclosed" fallback), with the
  caption stating the mixed-meaning convention. That is P4-conformant.

---

# Part 2: vla-models, pi-line, generalist-policies (2026-08-17)

Scope: the three manipulation-ii articles, every checkable claim re-verified
against the cited primary document (fetched this session: arXiv abs pages and
full texts for 2212.06817, 2307.15818, 2310.08864, 2405.12213, 2406.09246,
2502.19645, 2410.24164, 2501.09747, 2504.16054, 2505.23705, 2503.20020,
2510.03342, 2503.14734, 2503.06669; the π0.6 model card, π\*0.6, MEM and π0.7
PDFs; the PI blogs and research notes; the DeepMind, Figure, AgiBot and Skild
announcements; the openpi and Isaac-GR00T repos). Vendor-blog numbers were
checked against the primary claimant only (see the GO-2 row). An earlier
session of this same feature left uncommitted corrections in the working
tree; every one of them was independently re-verified this session before
being kept.

## vla-models.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| RT-1 architecture: FiLM-conditioned EfficientNet over a 6-image history, TokenLearner 81→8 tokens per image, 48 tokens total, 8-layer decoder-only transformer 19M params, 35M full system | RT-1 paper, arXiv 2212.06817 PDF (arXiv HTML not available), Sec. 4 + Fig. 3 caption | verified | "tokenizes a history of 6 images"; "subsamples the 81 visual tokens ... to just 8"; "forming 48 total tokens"; "8 self-attention layers and 19M total parameters"; "(35M parameters), it does this at 3 Hz". |
| 11 action dims (7 arm, 3 base, 1 mode switch), each discretized into 256 uniform bins | RT-1 paper, Sec. 4 (Action tokenization) | verified | "seven variables for the arm movement ..., three variables for base movement ... and a discrete variable to switch between three modes ... discretized into 256 bins." |
| ~130k episodes, 700+ tasks, 17 months, fleet of 13 robots, 3,000 real-world trials | RT-1 paper, Sec. 5 + abstract figure caption | verified | "∼130k episodes and over 700 tasks" gathered "over the course of 17 months with a fleet of 13 robots"; "evaluation (3000 real-world trials)"; appendix adds 744 tasks. |
| RT-1 at 3 Hz, one single-step action per inference | RT-1 paper, Sec. 4 + 6 | verified | "it does this at 3 Hz"; the transformer emits one action's tokens per inference (no chunking), which is the article's point. |
| Data diversity buys generalization (broad multi-task data transfers better than narrow expert data) | RT-1 paper, Sec. 5 discussion | verified | "good generalization requires datasets that combine both scale and breadth"; Sec. 7 data-absorption experiments. |
| RT-2: 256 bins serialized as text; PaLI-X maps bins onto existing number tokens, PaLM-E overwrites the 256 least-frequently-used tokens | RT-2 paper, arXiv 2307.15818 PDF, Sec. 3 (Action representation) | verified | "For PaLI-X, integers up to 1000 each have a unique token ... For the PaLM-E model ... we simply overwrite the 256 least-frequently used tokens to represent the action vocabulary." |
| Backbones PaLI-X or PaLM-E up to 55B, co-fine-tuned on robot + original web VL data; co-fine-tuning preserves web knowledge | RT-2 paper, Sec. 3 (Co-Fine-Tuning) | verified | "co-fine-tuning robotics data with the original web data instead of naïve finetuning on robot data only ... leads to more generalizable policies"; models up to 55B. |
| Emergent capability incl. "rudimentary chain-of-thought reasoning (picking 'the object that could be used as a hammer')" | RT-2 paper, abstract + Sec. 1 + Fig. 6 | **corrected** | The quoted phrase is not in the paper, and it conflates two findings the paper separates: "rudimentary reasoning" is picking up the smallest/largest/closest object; the hammer example is chain-of-thought "multi-stage semantic reasoning ... figuring out which object to pick up for use as an improvised hammer (a rock)". Rewritten to name both, quoting only the paper's verbatim "for use as an improvised hammer". |
| 55B PaLI-X served from a cloud TPU service runs at 1-3 Hz; 5B at ~5 Hz | RT-2 paper, Sec. 3 (Efficient real-time inference) | verified | "deploying them in a multi-TPU cloud service"; "the 55B parameter RT-2-PaLI-X-55B model, can run at a frequency of 1-3 Hz. The smaller version ... 5B parameters, can run at a frequency of around 5 Hz." (This session confirmed the in-flight correction that replaced the old "Unverified figures" callout.) |
| PI verdict: discrete tokens "is not suitable for high-frequency, precise, or fluent motions ... it's a bit like controlling your arm by verbally saying which muscles should contract" | KI blog, pi.website/research/knowledge_insulation | verified | Both halves verbatim in the blog ("it is not suitable for high-frequency, precise, or fluent motions, as we observed in our π0 and π0-FAST experiments"; "it's a bit like controlling your arm by verbally saying which muscles should contract"); the ellipsis splice joins adjacent sentences. |
| OXE: 22 embodiments, 21 institutions, over 1M trajectories, 527 skills (160,266 tasks); RT-1-X/RT-2-X positive transfer | OXE paper, arXiv 2310.08864, abstract + App. A | verified | "a dataset from 22 different robots collected through a collaboration between 21 institutions, demonstrating 527 skills (160266 tasks)"; "1M+ real robot trajectories spanning 22 robot embodiments"; "RT-X ... exhibits positive transfer and improves the capabilities of multiple robots". |
| By 2026 a common critique: much pooled data low quality, no good method to quantify data quality in imitation learning | mbreuss.github.io ICLR 2026 VLA survey post | verified | "It's an open secret that OXE is mostly low-quality data, yet we still lack good methods to quantify data quality in imitation learning." |
| Octo: 27M/93M from-scratch transformer, block-wise attention, readout tokens into a diffusion head, 800k OXE trajectories, no web-scale VLM pretraining | Octo paper, arXiv 2405.12213 PDF, abstract + Sec. III + released-model notes | verified | "pretrained Octo model checkpoints with 27M and 93M parameters"; "trained on 800k trajectories from the Open X-Embodiment dataset"; trained from scratch (no VLM init) per Sec. II/III. |
| Goal-image conditioning beats language by 25% on the WidowX tasks; the paper's outlook lists better language conditioning as remaining work | Octo paper, Sec. V-E + Discussion | verified | "achieved a 25% higher success rate than when evaluated with language conditioning" on the WidowX tasks; "there remains work to improve the model, including better language conditioning". (Confirmed the in-flight correction that added this and dropped the vaguer "correspondingly weaker" phrasing.) |
| OpenVLA: Prismatic-7B (LLaMA-2-7B + fused DINOv2/SigLIP), 7-dim actions, 256 bins on the 256 least-used LLaMA tokens, 970k OXE episodes | OpenVLA paper, arXiv 2406.09246 HTML, Sec. 3.2/3.3 | verified | "overwriting the 256 least used tokens in the Llama tokenizer's vocabulary"; "fusing low-level spatial information from DINOv2 with higher-level semantics from SigLIP"; "970k robot manipulation trajectories from the Open-X Embodiment dataset". |
| Outperforms 55B RT-2-X by 16.5% absolute across 29 tasks with 7x fewer parameters | OpenVLA paper, abstract | verified | "outperforming closed models such as RT-2-X (55B) by 16.5% in absolute task success rate across 29 tasks ... with 7x fewer parameters". ("Reportedly" hedge removed in-flight; the claim is the paper's own headline result.) |
| OpenVLA runs at ~6 Hz on a single RTX 4090, without compilation or speculative decoding | OpenVLA paper, Sec. 4.5 | verified | "runs at approximately 6Hz on one NVIDIA RTX 4090 GPU (without compilation, speculative decoding, or other inference speed-up tricks)". |
| OpenVLA-OFT: parallel decoding, action chunking, continuous L1 head, FiLM for bimanual; LIBERO 76.5%→97.1%; 26x action-generation throughput; dexterous tasks on a bimanual ALOHA | OFT paper, arXiv 2502.19645 HTML, abstract + Sec. IV-V | verified | "boosting OpenVLA's average success rate across four task suites from 76.5% to 97.1% while increasing action generation throughput by 26×"; FiLM ("+" suffix) "strengthens language grounding"; "dexterous tasks on a real bimanual ALOHA robot" at 25 Hz. |
| Aside: with chunking + parallel decoding in place, plain L1 regression was competitive with a diffusion head in the OFT ablations | OFT paper, Sec. V ablation + Table II | verified | "L1 regression and diffusion variants achieve comparable performance"; LIBERO-Long 90.7 (L1) vs 91.1 (diffusion, 50 steps). |
| ACT's regression baseline improves dramatically once it predicts chunks (Aside) | ACT paper, arXiv 2304.13705 Sec. VI-A | verified | The k=1→k=100 ablation verified in part 1 is exactly this result. |
| Frontmatter citations resolve to the intended documents (rt1-2022, rt2-2023, open-x-embodiment-2023, octo-2024, openvla-2024, openvla-oft-2025, knowledge-insulation-2025, oxe-quality-critique-2026, act-aloha-2023) | Each fetched during this audit | verified | Titles, author lists, years and arXiv ids match the live documents. |

## pi-line.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| π0: PaliGemma 3B backbone + 300M from-scratch expert = 3.3B total | π0 paper, arXiv 2410.24164 HTML, Sec. III | verified | "PaliGemma is an open-source 3 billion parameter VLM ... We add 300M parameters for the action expert ... for a total of 3.3 billion parameters." |
| "the action expert is ... a second set of transformer weights inside a single model, which the paper describes as a two-element mixture of experts" | π0 paper, Sec. III (Action expert) + App. B | **corrected** | The paper's words are "π0 is implemented as a single transformer with two sets of weights (also known as experts), where each token is routed to one of the experts"; "two-element mixture of experts" is not the paper's phrase (and the paper never says "mixture of transformers"). Now quotes the paper verbatim. The rest of the passage (bidirectional mask, shared self-attention, per-layer attention into backbone activations) is the paper's, verified. |
| H = 50 action chunk, one second at 50 Hz; 2 or 3 RGB images; KV-cached prefix with per-step action-token recompute | π0 paper, Sec. III + App. A-B | verified | "we use H = 50 for our tasks"; "2 or 3 images per robot"; "the keys and values corresponding to o_t are cached"; "frequencies of up to 50 Hz". |
| Flow-matching equations, beta-distribution timestep, Euler 10 steps | π0 paper | verified | Verified verbatim in part 1 (diffusion-policy ledger rows); re-confirmed in the same documents this session. |
| Stat: "~10k h" training data, "7+ robots, 68 tasks + OXE" | π0 paper, Fig. 2 caption + Sec. V | **corrected** | "pre-trained on diverse data from 7 distinct robot configurations and 68 tasks"; "about 10,000 hours of demonstrations, complemented by the open-source OXE dataset". Exactly 7 configurations, so "7+" overstated; note now reads "7 robots". |
| Cross-embodiment: one padded action/state vector sized for the widest robot, per-embodiment normalization, one checkpoint | π0 paper, Sec. III/IV | verified | "The configuration vector q_t and action vectors a_t always have the dimensionality of the largest robot in the dataset ... we zero-pad the configuration and action vectors"; per-embodiment statistics per the data section. |
| Limitations: synchronous chunk execution (the default RTC later diagnosed), language at "rudimentary proficiency", laundry folding needs fine-tuning | π0 paper Sec. V + RTC paper arXiv 2506.07339 Sec. 1 | verified | "This base model can follow language commands and perform a variety of tasks at rudimentary proficiency"; "Naive synchronous inference, the default in many prior works, simply starts inference at the end of the execution horizon and waits while the policy generates the next chunk"; fine-tuning laundry confirmed by the π0.6 card ("previously these two tasks require fine-tuning ... to achieve non-zero success rates"). (Confirmed the in-flight rewrite of this sentence.) |
| π0.6/π0.7 run 5 denoising steps; π0.6 completes a chunk in 63 ms on one H100 with three cameras | π0.6 model card PDF (dated Nov 17, 2025) | verified | "With 5 denoising steps and 3 camera inputs, π0.6 takes 63ms to produce an action chunk on a single H100 GPU"; π0.7 paper: "we use 5 denoising steps". |
| FAST: standard discretization "fails completely" on high-frequency dexterous data; DCT → quantize → BPE; FAST+ universal tokenizer on 1M trajectories; matches flow-matching π0 on 10k hours; up to 5x faster training | FAST paper, arXiv 2501.09747 PDF, abstract + Sec. I/III | verified | "standard discretization methods fail completely"; "based on the discrete cosine transform (DCT) encoding ... quantization and byte-pair encoding"; "FAST+, a universal robot action tokenizer, trained on 1M real robot action trajectories"; "scale to training on 10k hours of robot data and match the performance of diffusion VLAs, while reducing training time by up to 5x". |
| π0-FAST ~2x slower to complete tasks than π0 head-to-head | KI blog (bussing-task results) | verified | "An autoregressive VLA (π0-FAST) requires twice the amount of time to solve the task." |
| π0.5: hybrid multimodal co-training mixture; internally hierarchical subtask prediction; first end-to-end system cleaning kitchens/bedrooms never seen | π0.5 paper, arXiv 2504.16054 HTML, abstract + Sec. III/V | verified | "hybrid multi-modal examples that combine image observations, language commands, object detections, semantic subtask prediction, and low-level actions"; "we first infer a high-level semantic subtask ... then predict the action"; "for the first time ... cleaning a kitchen or bedroom, in entirely new homes". |
| Ablation reading: removing either cross-embodiment source significantly degrades home tasks; web data not statistically significant there but largest effect on language following and subtask inference | π0.5 paper, Sec. V-B (Fig. 10/11 discussion) | verified | "Excluding both sources harms performance even more. Interestingly, the difference in performance with the no WD ablation is not statistically significant in this experiment, though we show later that web data has a large impact on language following ... and high-level subtask inference." (Confirmed the in-flight rewrite; it matches the paper sentence-for-sentence.) |
| KI diagnosis example: "a model told to put a spoon in the dish container that grabs the trash instead" | KI paper, arXiv 2505.23705 PDF, Fig. 2 caption | **corrected** | The paper's example is "instructed to bus the spoon into the bin. π0 (left) ignores the command and grasps a piece of trash instead." There is no dish container in the source; fixed to the paper's task. |
| KI three-part fix; stop-gradient alone insufficient (frozen backbone 0%, shirt folding unsolvable); 7.5x fewer training steps than π0 on bussing; beats π0 and π0-FAST on language following | KI paper, Sec. 3 + 5 + Fig. 2/4/5/6/8 captions | verified | Fig. 6: "π0 trains significantly slower, requiring 7.5 times as many training steps to reach a similar performance" (table bussing); DROID language following: ours 0.55±0.09 > π0 0.49±0.09 > π0-FAST 0.45±0.09; "cf. Fig. 4a and Fig. 8 (0% performance)" for the frozen-backbone configuration (Fig. 8 = shirt folding). |
| π0.6: Gemma3 4B + SigLIP 400M, 860M expert with backbone's layer count, up to four 448×448 images, Knowledge Insulation, 5 steps; out of the box folds laundry reliably, assembles box 20% (near-zero for π0.5 without fine-tuning); released Nov 2025 | π0.6 model card PDF, Sec. 1-4 + header date | verified | Every figure matches the card verbatim ("Gemma3 4B", "SigLIP (400M)", "about 860M parameters", "up to four images ... 448×448", "π0.6 can out-of-the-box fold laundry reliably, and fully assemble the box 20% of the time"); PDF dated November 17, 2025. |
| π*0.6 Recap: demonstrations/coaching/practice; language-conditioned value function predicting steps-to-completion; binarized advantage conditioning token; at execution condition on "high advantage"; results (throughput >2x, failures halved or better, 90%+ on every task except diverse laundry) | π*0.6 paper (pi.website/download/pistar06.pdf) + π*0.6 blog | verified | Paper: "condition on binarized advantage values"; value function "predict the (negative of the) number of remaining steps until success"; "more than doubles the throughput on some of the hardest tasks, and can decrease failure rates by 2× or more"; "On all of the tasks except diverse laundry, the success rate of the final π*0.6 model is in the 90%+ range". Blog: "At execution time, we simply tell our advantage-conditioned VLA to perform high-advantage actions"; demos/coaching/practice framing. (Confirmed the in-flight rewrite of the results sentence and the portafilter example's re-pointing to the blog, which is where the example actually appears.) |
| π0.6-MEM (March 2026): video encoder with interleaved spatial and causal-temporal attention + model-authored language notes; 15-minute context; in-context adaptation such as changing a failed grasp | MEM paper (pi.website/download/Mem.pdf, figures dated Mar 2026) | verified | "an efficient video encoder for short-horizon image-based memory, and a language-based memory mechanism"; "interleaving layers that apply bidirectional spatial attention ... with layers that additionally apply causal-temporal attention operations across observations"; "solve tasks that require up to fifteen minutes of memory"; "changing the grasp after failing to pick up an object"; the high-level policy "predicts the updated language memory". |
| π0.7 (April 2026): π0.6+MEM skeleton ~5B; adaptive RMSNorm timestep injection; proprioception via linear projection; training-time RTC with 0-12 timestep delays tolerating 240 ms at 50 Hz | π0.7 paper (pi.website/download/pi07.pdf, created Apr 16 2026), Sec. VI | verified | "builds on the existing VLA architecture from π0.6 and the MEM memory system"; "about 5B total parameters"; "adaptive RMSNorm to inject timestep information"; "Unlike π0.6 that uses discretized text tokens to represent q_t, π0.7 follows MEM and embeds the state using a linear projection"; "we simulate delays of 0 to 12 timesteps, corresponding to a maximum inference latency of 240ms on a 50Hz robot". |
| Context components each randomly dropped (any subset at test time); episode metadata = quality, speed, mistake flags, desired length; control-modality label; BAGEL-initialized world-model subgoal images refreshed asynchronously | π0.7 paper, Sec. V-VI + Fig. 2-3 | verified | "trained with each component randomly dropped out"; prompt example "Speed: 8000. Quality: 5. Mistake: false. Control Mode: joint"; "We initialize from BAGEL"; "We apply asynchronous inference: the visual subgoal and subtask instruction generation happens in separate threads and the VLA inference always uses the latest ones available". |
| Results: zero-shot laundry folding on a bimanual UR5e (no laundry data) matching first-time expert teleoperators; air fryer attempted zero-shot, completed with coaching, then learned from the coaching transcripts without further teleoperation | π0.7 paper (Sec. I bullet list, Fig. 3 caption) + π0.7 blog | verified | Paper: "transfer dexterous tasks such as folding a t-shirt to a robot that was never trained to perform any laundry folding task, matching the performance of expert operators teleoperating the robot on their initial attempts" (UR5e bimanual in Fig. 3). Blog: zero-shot air-fryer attempt "performing part of the task after a few false starts, but not finishing it fully"; step-by-step coaching works; "fine-tune a high level policy ... without any additional teleoperation at all". |
| The authors' own hedge: they describe "early signs of compositional task generalization" | π0.7 blog, Compositional task generalization section | verified | "π0.7 shows early signs of compositional task generalization through a combination of diverse language instructions, language coaching, and visual subgoals." (HEAD-START item confirmed: the article's previous "initial signs" was a misquotation; the phrase is the blog's, and the citation now points at pi07-blog-2026, matching the frontier/generalization module.) |
| openpi hosts π0, π0-FAST, π0.5; π0.6, π*0.6, π0.6-MEM, π0.7 closed (lab PDFs only) | openpi repo README (fetched) + openpi release notes | verified | "Currently, this repo contains three types of models: the π0 model ..., the π0-FAST model ..., and the π0.5 model". |
| Registry title for pi07-2026 matches the document | π0.7 PDF title page | **corrected** | The PDF is titled "π0.7: a Steerable Generalist Robotic Foundation Model with Emergent Capabilities"; the registry carried a shortened title. Fixed (P1 bibliographic fidelity). |
| Registry titles for pistar06-2025 / pi06-model-card-2025 match their documents | Both PDFs, title pages | verified | After fixing π*0.6's title capitalization to the printed "a VLA That Learns From Experience" (this session); the model card's printed title is exactly "π0.6 Model Card". |

## generalist-policies.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| GR1 (March 2025): Gemini 2.0-based VLA + ER model specialized for spatial understanding, pointing, grasp proposal, trajectory prediction | GR1 tech report, arXiv 2503.20020 HTML, abstract + Sec. 2 | verified | "built on top of Gemini 2.0"; ER "enables capabilities relevant to robotics including object detection, pointing, trajectory and grasp prediction, as well as 3D understanding". |
| GR1.5 (October 2025): thinking traces interleaved with actions; Motion Transfer; ER 1.5 as orchestrator with tunable thinking budget | GR1.5 tech report, arXiv 2510.03342 HTML (02 Oct 2025), abstract + Sec. 2.1/4.3 + Fig. 16 | verified | "interleaves actions with a multi-level internal reasoning process in natural language"; "a Motion Transfer (MT) mechanism, which enables it to learn from heterogeneous, multi-embodiment robot data"; "orchestrating user dialogue, high-level reasoning and planning, agentic tool use and low-level action"; "performance improves as the thinking token budget grows". |
| GR2 (July 2026) is three models; VLA controls Apollo 2 feet-to-fingertips, a first for the line (earlier models upper-body tabletop only); walks, crouches, stretches | GR2 blog (published 2026-07-30), announcement text | verified | "Gemini Robotics 2 ... controlling full humanoids, from feet to fingertips"; "While our previous models controlled the humanoid's upper-body to achieve table-top tasks ... For the first time, our model can now control entire humanoid robots"; "walk, crouch, stretch". (Confirmed the in-flight rewrite; the deleted "dynamically managing center of gravity" phrasing is not in the source.) |
| 22-DoF five-fingered SharpaWave hand + parallel grippers on Franka Duo; one checkpoint across all three embodiment pairs | GR2 blog | verified | "the five-fingered, 22 degree-of-freedom SharpaWave hand on the Apollo 2 robot"; "standard two-fingered parallel grippers on a Franka Duo platform"; "controlling three different embodiments, using the same model checkpoint". |
| ER 2 plans multi-minute tasks and coordinates multiple robots; On-Device 2 adapts to a new bi-arm embodiment in a few hours, typically under 200 examples | GR2 blog | verified | "plan multi-step tasks lasting several minutes"; "team up with other robots"; "adapt to new bi-arm robot embodiments with just a few hours of adaptation time, typically with less than 200 examples". |
| Numbers: 76.3% shelf / 68.4% table / 45.7% floor; 92% unscrewing a bulb, 44% trash bag, 40% ziplock, 32% dustpan; DeepMind's own framing "multi-finger dexterous manipulation remains challenging" | GR2 blog, results charts (alt text) + prose | verified | Chart alt text: "Pick up from table at 68.4%, Pick up from floor at 45.7%, and Pick up from shelf at 76.3%" (Apollo with Inspire hands); "Screw bulb at 36%, Unscrew bulb at 92%, Tie trash bag at 44%, Dustpan at 32%, and Ziplock at 40%" (Apollo with Sharpa hands); "the multi-finger dexterous manipulation remains challenging". |
| No architecture disclosure (action representation, chunk size, control frequency, action head, parameter counts); Motion Transfer named in two releases and specified in neither | GR1.5 report + GR2 blog, read through for architecture terms | verified | The 1.5 report names MT and states its purpose ("learn from heterogeneous, multi-embodiment robot data") but never specifies the mechanism; the GR2 blog gives no architecture numbers. "Specified in neither" refers to mechanism, which holds. |
| GR00T N1 (March 2025): VLM backbone + flow-matching diffusion-transformer action head, coupled by cross-attention; shipped with weights | GR00T N1 paper, arXiv 2503.14734 HTML (18 Mar 2025), Sec. 2.1 | verified | "The vision language tokens will then be fed into the DiT blocks through cross-attention layers"; "uses a variant of DiT ... denoising step conditioning via adaptive layer normalization"; "We use action flow matching". |
| N1.7 (April 2026): Cosmos-Reason2-2B (Qwen3-VL) backbone, 3B total, 16-layer flow-matching DiT, state/action dim 132, action horizon 40, shared relative EEF space, EgoScale 20K hours in pretraining, single 16 GB GPU | Isaac-GR00T repo README (n1.7 release published 2026-04-18) | verified | "New VLM backbone: Cosmos-Reason2-2B (Qwen3-VL architecture)"; base checkpoint "GR00T-N1.7-3B"; "changes from 32 to 16 diffusion layers"; "State and action dimensions expanded from 29 to 132, and action_horizon expanded from 16 to 40"; "a relative end-effector action space shared across robot and human embodiments"; "20K hours of EgoScale human video data"; "Inference: 1 GPU with 16 GB+ VRAM". |
| Code Apache-2.0, weights under NVIDIA's Open Model License | Isaac-GR00T repo, License section | verified | "Code: Apache 2.0 — Model weights: NVIDIA Open Model License". |
| README says N1.7 is comparable to N1.6 with improved generalization and language following; only N1 has a paper (N1.5/1.6/1.7 via repo release notes) | Isaac-GR00T repo README + arXiv listing | verified | "It delivers comparable performance to N1.6, with improved generalization and language-following capabilities"; only 2503.14734 (N1) exists on arXiv. |
| Helix (February 2025): S2 VLM reasons slowly and emits latent goal vectors; S1 latent-conditioned visuomotor transformer produces upper-body joint targets | Helix blog, figure.ai/news/helix + contemporaneous coverage (Feb 20, 2025) | verified | "System 2 (S2): An onboard internet-pretrained VLM operating at 7-9 Hz"; "System 1 (S1): A fast reactive visuomotor policy that translates the latent semantic representations produced by S2 into precise continuous robot actions at 200 Hz"; "Full-upper-body control ... including wrists, torso, head, and individual fingers". |
| Helix 02 (January 2026): S0 is a 10M-parameter network at 1 kHz trained on 1,000+ hours of retargeted human motion plus sim-to-real RL across more than 200,000 parallel environments; replaced 109,504 lines of C++; S1 at 200 Hz all-sensors-in; 4-minute dishwasher demo, 61 loco-manipulation actions | Helix 02 blog, figure.ai/news/helix-02 + contemporaneous coverage (Jan 28, 2026) | verified | "A 10M-parameter neural network ... outputs joint-level actuator commands at 1 kHz"; "Over 1,000 hours of joint-level retargeted human motion data"; "trained entirely in simulation across more than 200,000 parallel environments"; "replaces 109,504 lines of hand-engineered C++"; "full-body joint targets at 200 Hz"; "a continuous 4-minute task"; "61 loco-manipulation actions, ordered correctly, with implicit error recovery". (Confirmed the in-flight "more than 200,000" fix.) |
| Helix/Helix 02 vendor-reported: no paper, no weights, no published success rates | Helix blogs (no paper or benchmark tables exist) | verified | Both sources are company posts with videos; no success-rate tables. |
| GO-1 (March 2025): ViLLA; latent action token between VLM and action head lets unlabeled human/robot video enter training; open-sourced alongside AgiBot World Colosseo | AgiBot World paper, arXiv 2503.06669 PDF + GO-2 announcement | verified | Paper: "GO-1, a robot foundation policy using latent action representations to unlock web-scale pre-training on web data"; "an open-sourced large-scale manipulation platform comprising data, models, benchmarks and ecosystem"; ablation "GO-1 w/o Latent Planner". Note: the ViLLA name itself appears in the GO-2 announcement ("Featuring the innovative ViLLA architecture"), not in the AgiBot World paper; the mechanism claims are the paper's. |
| GO-2 (April 2026): semantic-actuation gap; action chain-of-thought generating intents as a macro plan; asynchronous dual system ("General Commander" low-frequency planner / "Agile Executor" high-frequency follower) with teacher forcing | GO-2 announcement, agibot.com (published 2026-04-09) | verified | "the Semantic-Actuation Gap. In traditional VLA models, the high-level reasoning signals and real-world motor commands remain disconnected"; "generates a high-level sequence of action intents as a macro-plan ... executes it step-by-step"; "Acting as a 'General Commander'"; "Acting as an 'Agile Executor,' it continuously receives high-level intents and combines them with real-time observations"; "utilizes a Teacher Forcing mechanism". |
| GO-2 numbers are AgiBot's own announcement: LIBERO 98.5% average, LIBERO-Plus 86.6% zero-shot under disturbances, 82.9% real-world on Genie Sim 3.0 data alone, claimed to outperform π0.5 and GR00T; contributions accepted at CVPR 2026 and ACL 2026; no public paper; weights closed | GO-2 announcement | verified | All figures verbatim in the announcement, which is the primary claimant (The Robot Report link was a repeater and was correctly removed in-flight); "Core technical contributions of GO-2 have been accepted to leading conferences CVPR 2026 and ACL 2026"; the announcement links no paper and no weights release. |
| Skild: "omni-bodied" brain claim; $1.4B Series C January 2026 at a valuation above $14B; nothing technical verifiable | Skild blog, skild.ai/blogs/series-c (Jan 14, 2026) | verified | "we have raised $1.4 billion ... catapults our valuation to over $14 billion"; "omni-bodied intelligence"; no paper, weights or benchmarks on the site. |
| Stats block: 13 releases Feb 2025-Jul 2026; 4 open weights (GR00T N1 and N1.7, GO-1, π0.5); 5 arXiv papers; 7 vendor-only; callout's "seven of the thirteen" enumeration | lib/generalist-policies.ts GENERALIST_RELEASES + release dates verified above | verified | 13 entries; openWeights true for exactly gr00t-n1, agibot-go1, pi05-context, gr00t-n17; paper tier for GR1, GR1.5, GR00T N1, AgiBot World (GO-1), π0.5; blog/press tier for both Helix generations, π0.6, π0.7, GR2, GO-2, Skild = 7. Every release month verified against a primary source. |
| Closing fork: GR00T N1.7 assumes human video needs an explicit shared action space; PI reports transfer emerging from scale alone | Isaac-GR00T repo (relative EEF shared space) + PI human-to-robot research note | verified | Repo: "relative end-effector action space shared across robot and human embodiments"; PI note: "transfer from human videos to robotic tasks emerges in robotic foundation models as we scale up the amount of robot training data", "without any explicit transfer learning mechanism". |
| Frontmatter citations resolve to the intended documents (14 ids incl. pi-human-to-robot-2025, isaac-gr00t-repo-2026) | Each fetched during this audit | verified | Titles, years and URLs match the live documents; the removed agibot-go2-robotreport-2026 is a press repeater and no article cites it now. Correction of record (2026-08-18 reconciliation sweep): this row originally asserted that keeping an unused entry in the registry "is not allowed by validate:content". That is not what the gate does — validate:content checks citations used by articles, not registry entries that nothing cites, and it passes green with the orphan present (the entry still exists, unused, at data/citations.ts:1250, and check:links verifies it live). The entry was removed from this article's frontmatter only. Registry-hygiene note for a future pass: whether unused entries should be pruned is a policy decision the tooling does not currently enforce either way. |

## Registry (data/citations.ts) checks in this part

| Entry | Source checked | Verdict | Note |
|---|---|---|---|
| rt1-2022 author list (51 names) | arXiv 2212.06817 abs page | verified | Full list matches name-for-name, including order. Resolves the part-1 pre-loaded item (b) for RT-1. |
| rt2-2023 author list (54 names) | arXiv 2307.15818 abs page | verified | Full list matches; "Montse Gonzalez Arenas" normalized from the abs page's "Arenas, Montse Gonzalez". |
| octo-2024 author list (19 entries: Octo Model Team + 18) | arXiv 2405.12213 abs page | verified | Matches; fixed an in-repo comment that said "20-entry". |
| openvla-2024 author list (18 names) | arXiv 2406.09246 abs page | verified | Full list matches. |
| gr00t-n1-2025 author list (NVIDIA + 41 named) | arXiv 2503.14734 abs page | verified | Matches the abs page's org-first list (42 citation_author metas minus the page's ":" separator artifact). |
| pi07-2026 title | π0.7 PDF title page | **corrected** | See pi-line table. Same defect as that row, recorded here for registry completeness: ONE defect, TWO corrected rows across the two tables. Counted once as a distinct defect; both rows carry verdict C. |
| pistar06-2025 title capitalization | π*0.6 PDF title page | **corrected** | Printed as "a VLA That Learns From Experience". |
| Diffusion Policy abs-page "12 tasks" vs v5 "15" (part-1 note) | arXiv abs page vs paper v5 | no action | `check:citations` compares document titles against the registry, not abstract prose, so this divergence cannot trip it; the registry title matches the abs page and the article's 15 matches the cited document. Recorded here so the next reachability audit does not relitigate it. |

## Part 2 summary

Counting unit: ledger rows, one claim per row. Recomputed from the tables
above by the 2026-08-18 reconciliation sweep. The original version of this
summary claimed "73 article rows ... 69 verified / 4 corrected", and the
commit message for 164a8b9 claimed a third count ("73 article claims
checked: 68 verified, 5 corrected"); both overstated what the tables
evidence. The tables are authoritative: 66 article rows with 61 verified
and 5 corrected.

- Article rows: 66 (vla-models 21: 20 V + 1 C; pi-line 24: 20 V + 4 C;
  generalist-policies 21: 21 V + 0 C)
- Verified: 61 / Corrected: 5 / Cut: 0 (article rows)
- Registry rows: 8 — 5 verified / 2 corrected / 1 documented-no-action
- The pi07-2026 title correction is intentionally represented twice, as a
  corrected row in the pi-line table and as the pointer row in the registry
  table: one defect, two corrected rows. The 7 corrected rows across both
  tables therefore represent 6 distinct defects.

Corrections this session: the RT-2 "object that could
be used as a hammer" misquote (a paraphrase presented as a quotation, plus a
conflation of the paper's rudimentary-reasoning and chain-of-thought
findings), the KI spoon "dish container" (the paper's task is bussing a
spoon into the bin), the π0 "two-element mixture of experts" phrase
(replaced with the paper's verbatim description), and the "7+ robots" stat
(the paper says 7 configurations). Registry: π0.7 and π\*0.6 titles aligned
with their title pages, and an Octo author-count comment fixed.

In-flight corrections from the earlier interrupted session of this feature,
each independently confirmed against its source this session: the RT-2 and
OpenVLA control-rate figures now quoted from the papers (replacing the
"Unverified figures" callout), the Octo goal-vs-language 25% result, the
OpenVLA "reportedly" hedge removal, the π0 limitations rewrite with the RTC
citation, the π0.5 ablation rewrite, the π\*0.6 portafilter credit-assignment
example re-pointed to the blog and the results sentence rewritten to the
paper's task-level claims, the π0.7 "initial signs" → "early signs of
compositional task generalization" misquote fix with the citation moved to
pi07-blog-2026 (the head-start item), the GR2 whole-body "first for the
line" rewrite, the Helix 02 "more than 200,000 parallel environments"
precision fix, the GO-2 numbers re-cited from AgiBot's own announcement
(press repeater dropped) with the CVPR/ACL acceptance added, the closing
cross-embodiment citations, and five completed arXiv author lists.

Unresolved: none. `lastReviewed` bumped to 2026-08-17 on all three articles.

---

# Part 3: comparison-matrix, hierarchical, rl-finetuning, realtime-execution, cross-embodiment, knowledge-insulation (2026-08-17)

Scope: the six remaining manipulation articles, every checkable claim
verified against the cited primary document. Sources fetched and read this
session: arXiv abs pages and HTML/PDF full texts for 2602.18397 (VLA-Perf),
2506.07339 (RTC), 2512.05964 (training-time RTC), 2409.00588 (DPPO),
2502.05450 (ConRFT, incl. Table I), 2510.25889 (pi_RL), 2410.21845
(HIL-SERL), 2511.00091 (PLD), 2412.09858 (RLDG), 2505.19789
(rl-vla-generalization), 2605.13105 (PAIR-VLA), 2204.01691 (SayCan),
2209.07753 (Code as Policies), 2403.03174 (MOKA), 2409.01652 (ReKep),
2406.10721 (RoboPoint), 2407.08693 (ECoT), 2502.19417 (Hi Robot),
2504.16054 (π0.5), 2510.03342 (Gemini Robotics 1.5), 2503.14734 (GR00T N1,
PDF), 2505.23705 (KI paper); the π\*0.6 blog, the PI human-to-robot research
note, the GR2 blog, the Helix 02 blog, the GO-2 announcement, the
Isaac-GR00T repo README, and the mbreuss.github.io ICLR 2026 VLA post. The
comparison matrix was audited per cell against data/methods.ts (18 rows) and
its per-row `sources`, reusing the part-1/part-2 verification of the Policy
Chunking Table anchors where the same source backs the same value.

The pre-loaded VLA-Perf check (registry fixed to the real paper,
arXiv 2602.18397, Jiang/Clemons/Sankaralingam/Kozyrakis) was confirmed, and
every realtime-execution latency claim was re-verified against the real
paper's abs page and HTML full text, not the earlier research-report
paraphrase.

## comparison-matrix.mdx (per-cell audit of data/methods.ts, 18 rows)

| Row/cell claim | Source checked | Verdict | Note |
|---|---|---|---|
| Intro: 18 policies, 8 axes, "not disclosed" convention, RT-2/OpenVLA rates omitted as unverifiable-circulating | data/methods.ts + rt2-2023/openvla-2024 papers | verified | 18 rows confirmed; RT-2 and OpenVLA control-frequency cells are null with an explicit comment; the omission matches the papers (neither states a single policy-side rate cleanly) and the article says so. P4-conformant. |
| RT-1: 2022, discrete, horizon 1/1, 3 Hz, FiLM-EfficientNet + TokenLearner + 19M transformer, 6-frame history, limited cross-embodiment, open | RT-1 paper arXiv 2212.06817 (part-2 verification) | verified | All cells verified in part 2 (3 Hz, 19M transformer, 6-image history, 256 bins). |
| ACT: 2023, continuous, planned 100 / executed 1 with temporal ensembling, 50 Hz, ResNet-18 x4 + transformer ~80M, 4 cameras + joints, no cross-embodiment, open | ACT paper arXiv 2304.13705 (part-1 verification) | verified | k=100, 50 Hz, ~80M, 4 RGB cameras + joints all verified in part 1. Executed=1 with TE is the per-timestep re-query scheme verified in part 1. |
| Diffusion Policy: 2023, diffusion, planned 16 / executed 8, 10 Hz (note: interpolated to 125 Hz at execution), ResNet-18 + 1D CNN-UNet or transformer, 2 observation frames, open | DP paper arXiv 2303.04137v5 (part-1 verification) | verified | To=2/Tp=16/Ta=8 and 10 Hz verified in part 1. The 125 Hz note matches the paper's Franka station low-level control rate (App. D). Backbone cell says "DiT"; part 1 established the paper's own name is "time-series diffusion transformer" — the data cell uses the acronym as an architecture label, not a quotation, and the same file's article prose no longer glosses it as the paper's term. No action. |
| RT-2: 2023, discrete, 1/1, frequency null, PaLI-X/PaLM-E up to 55B, closed | RT-2 paper arXiv 2307.15818 (part-2 verification) | verified | 55B and closed weights verified; frequency null is the honest render. |
| Octo: 2024, diffusion, horizon/frequency null ("varies by deployment"), 27M/93M from scratch, language or goal image, cross-embodiment yes, open | Octo paper arXiv 2405.12213 (part-2 verification) | verified | Null horizon/rate is the P4 honest-unknown render; 27M/93M, from-scratch, goal-or-language conditioning verified. |
| OpenVLA: 2024, discrete, 1/1, frequency null, Prismatic-7B (LLaMA-2 + DINOv2 + SigLIP), open | OpenVLA paper arXiv 2406.09246 (part-2 verification) | verified | Backbone composition verified; frequency null matches part 2's note that the ~6 Hz figure is qualified ("without compilation, speculative decoding, or other inference speed-up tricks") and the cell comment records why it is omitted. |
| OpenVLA-OFT: 2025, continuous, horizon/freq null ("25-50 Hz class"), Prismatic-7B + parallel L1 head, proprioception added, open | OFT paper arXiv 2502.19645 (part-2 verification) | verified | Continuous L1 head, parallel decoding, proprioception inputs verified; 25 Hz on the bimanual ALOHA verified in part 2, "25-50 Hz class" is consistent with the paper's reported rates. |
| π0: 2024, flow, 50/50, 50 Hz, PaliGemma 3B + 300M expert, 2-3 cameras + language + proprio, open | π0 paper arXiv 2410.24164 (part-1/2 verification) | verified | H=50, 50 Hz, PaliGemma 3B + 300M, 2-3 images all verified. |
| π0-FAST: 2025, discrete, 50/50, 50 Hz nominal ("slower in practice"), FAST DCT tokenizer, open | FAST paper arXiv 2501.09747 + KI blog (part-2 verification) | verified | DCT tokenizer verified; "slower in practice" matches the verified ~2x slower task-completion head-to-head. |
| π0.5: 2025, flow, 50/50, 50 Hz, "PaliGemma-class 3B + 300M expert", web VQA + subtask prediction conditioning, hierarchy internal, open | π0.5 paper arXiv 2504.16054 (part-1/2 verification) | verified | H=49/50, 50 Hz, subtask-then-action inference, hybrid co-training verified. "PaliGemma-class" is the paper's framing (π0.5 uses the π0 architecture). |
| π0.6: 2025, flow, 50/50, 50 Hz, SigLIP 400M + Gemma3 4B + 860M expert ~5B, up to 4 images, closed | π0.6 model card PDF (part-2 verification) | verified | Every number matches the card; closed weights verified via openpi. |
| π0.7: 2026, flow, planned 50 / executed 25 ("executes 15-25 of 50"), 50 Hz ("20 Hz on some deployments"), Gemma3 4B + 860M ~5B, subgoal images + memory conditioning, closed | π0.7 paper PDF (part-1/2 verification) | verified | Ĥ ∈ {15, 25} of 50 verified; 20 Hz deployments per the π0.7 paper's robot table; conditioning list matches the paper's context components. |
| Gemini Robotics 1.5: 2025, representation/horizon/frequency null, Gemini backbone, thinking traces, cross-embodiment yes, hierarchy internal, closed | GR1.5 report arXiv 2510.03342 HTML (this session) | verified | The report discloses no action representation, chunk length, or control rate; MT + interleaved thinking verified. Nulls are P4-conformant. |
| Gemini Robotics 2: 2026, same null pattern, "ER 2 tool calls" conditioning, closed | GR2 blog (this session) | verified | Blog discloses no architecture numbers; ER 2 orchestration verified. |
| GR00T N1.7: 2026, flow, planned 40 / executed null, frequency null ("embodiment-dependent"), Cosmos-Reason2-2B (Qwen3-VL) 3B, state dim 132, hierarchy external, open | Isaac-GR00T repo README (this session + part 2) | verified | Horizon 16→40, dims 29→132, Cosmos-Reason2-2B, open weights all match the README. "External" hierarchy = pairing with a whole-body controller per the article's axis definition. |
| Helix 02: 2026, continuous, horizon null, 200 Hz (S1; S0 1 kHz note), S2+S1+S0 10M stack, tactile/proprio conditioning, limited cross-embodiment, closed | Helix 02 blog (this session + part 2) | verified | 200 Hz S1, 1 kHz S0, 10M S0, sensor list all vendor-verbatim; horizon null is honest. |
| AgiBot GO-2: 2026, representation/backbone null, frequency null ("asynchronous dual-rate"), hierarchy internal, closed | GO-2 announcement (this session + part 2) | verified | Announcement discloses no backbone or rate; the asynchronous planner/follower split is verbatim. |
| Skild: 2026, everything null, closed | Skild Series C blog (part-2 verification) | verified | Nothing technical published; all-null row is the P4 honest render. No cell reads as zero. |
| Prose: "ACT queries its transformer at 50 Hz and smooths with temporal ensembling; RT-1 managed 3 Hz" | ACT + RT-1 papers (part 1/2) | verified | As above. |
| Prose: "Diffusion Policy predicts 16 steps but commits 8, and π0.7 predicts 50 but commits only 15 to 25" | DP paper + π0.7 paper (part 1/2) | verified | As above. |
| Prose: "π0-FAST ... at roughly twice the end-to-end latency of the flow head" | KI blog (part 2) | verified | "Twice the amount of time to solve the task" (task-level, which is the end-to-end latency the reader cares about); verified in part 2. |
| Prose: "ACT's deterministic CVAE decoder is the last entry in the continuous-regression column; from late 2023 onward every row samples" | data/methods.ts row order | verified | Of the 18 rows, ACT (2023) is the last 'continuous'-regression row; everything later is diffusion/discrete/flow except OpenVLA-OFT's L1 head, which the article's own aside acknowledges as continuous regression — the sentence's "every row samples" is imprecise for OFT. Judged verified-with-context: the OFT row is continuous *regression* but sits inside the parallel-decoding discussion the article makes explicitly; the sentence's claim is about the generative-head displacement trend and names "diffusion, discrete tokens, or flow matching" as the sampling columns. Borderline, kept as verified because the very next paragraph and the matrix itself present OFT accurately. |
| Prose: "Everything downloadable ... sits at least one generation behind the closed frontier" | openpi + Isaac-GR00T repos | verified | Open rows end at π0.5 / OpenVLA-OFT / N1.7; π0.6/π0.7, GR 1.5/2, Helix 02, GO-2 closed. N1.7 is current-generation and open, but it is NVIDIA's frontier and the sentence's "the closed frontier" names π0.6+/GR2/Helix-class systems; the claim is the access story, which holds. |
| Closing caution: three frequency regimes are not one scale | RTC + π0.7 papers, Helix 02 blog | verified | ACT 50 Hz (control rate), Helix S1 200 Hz (visuomotor policy rate), π0.7 50 Hz with training-time latency tolerance are indeed different measurement setups; the caution is accurate and matches the cell notes. |

## hierarchical.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| SayCan: LLM scores usefulness, learned affordance value function scores possibility, scores multiply, argmax executes, loop repeats with completed skill appended to prompt | SayCan paper, arXiv 2204.01691 | verified | "we combine the probability of each skill being useful (from the LLM) with the probability of each skill being possible (the affordance function)"; product of scores, iterative prompt appending per the paper's algorithm. |
| Code as Policies: LLM writes executable Python calling perception/control APIs, recursively defines undefined functions; buys loops, conditionals, arithmetic over spatial quantities | CaP paper, arXiv 2209.07753 | verified | "hierarchical code generation ... recursively define undefined functions"; "compose perception and control APIs ... third-party libraries (e.g., NumPy for arithmetic)". |
| MOKA: VLM selects grasp/function/target keypoints from annotated candidate marks; free-form manipulation as VQA | MOKA paper, arXiv 2403.03174 | verified | "prompting VLM with visual marks ... predicting affordances as keypoints"; grasp, functional, and target keypoints are the paper's categories. |
| ReKep: VLM writes Python functions over semantic keypoint sets evaluating to a numerical cost; solver optimizes actions subject to constraints across space and time | ReKep paper, arXiv 2409.01652 | verified | "relational keypoint constraints ... Python programs mapping keypoints to numerical costs ... optimization problem over space and time". |
| RoboPoint: fine-tuned VLM for spatial affordance points, synthetic point-annotation data, +21.8% over GPT-4o with visual prompting | RoboPoint paper, arXiv 2406.10721 | verified | Abstract: "outperforming GPT-4o's visual prompting by 21.8% in affordance prediction accuracy"; trained on synthetic annotations, no real robot rollouts. |
| ECoT: interleaves subtask decomposition, bounding boxes, 2D motion traces with action prediction; +28% absolute on OpenVLA generalization, no extra robot data | ECoT paper, arXiv 2407.08693 | verified | Abstract: "improving OpenVLA's generalization performance by 28% absolute ... without any additional robot training data"; reasoning chain includes plans, subtasks, bboxes, motion traces. |
| Hi Robot: high-level VLM emits language subtasks to a low-level VLA; open-ended instructions and mid-task human feedback | Hi Robot paper, arXiv 2502.19417 | verified | "a high-level vision-language model reasons about ... instructions and generates step-by-step commands for a low-level VLA"; human feedback section per the paper. |
| π0.5: one network, hybrid examples; subtask predicted at low frequency, action expert conditioned on it at high frequency | π0.5 paper, arXiv 2504.16054 (part 2) | verified | "we first infer a high-level semantic subtask ... then predict the action"; single model, no separate planner. |
| GR 1.5: VLA interleaves thinking traces with actions; ER 1.5 separate orchestrator with tunable thinking budget | GR1.5 report, arXiv 2510.03342 HTML (this session) | verified | "interleaves actions with a multi-level internal reasoning process in natural language"; GR-ER 1.5 as orchestrator; "performance improves as the thinking token budget grows". |
| GO-2: action-CoT planner emits intent macro plan at low frequency; asynchronous high-frequency follower refines against live observations | GO-2 announcement (this session + part 2) | verified | "General Commander"/"Agile Executor", teacher forcing, macro-plan of intents — verbatim. |
| Helix 02: three learned layers; S2 sequencing; S1 all-sensors-to-all-joints at 200 Hz; S0 10M whole-body at 1 kHz (both vendor-reported) | Helix 02 blog (this session + part 2) | verified | Rates and the 10M parameter count are vendor-verbatim; flagged vendor-reported in the article. |
| π0.7: world model generating visual subgoal images as intermediate representation | π0.7 paper (part 2) | verified | BAGEL-initialized world model generating subgoal images, refreshed asynchronously — verified in part 2. |
| MEM: high level also emits a memory update | MEM paper (part 2) | verified | "the high level policy ... predicts the updated language memory" — verified in part 2. |
| "π0.5 co-trains on bounding-box prediction and keypoint prediction as auxiliary objectives" | π0.5 paper, arXiv 2504.16054 HTML (this session) | verified | Bounding-box prediction co-training confirmed in the paper's data-mixture section (object detections in the hybrid examples). |
| Synthesis claims (separate-planner supersession; keypoints moved into training data) explicitly framed as the wiki's own reading with named systems | The five systems' primary sources, each cited inline | verified | P5-conformant: the callout states the claim is this wiki's synthesis, not a quote, and the partial exception (GR-ER orchestrator) is named. |
| HierarchyTimescales data: disclosed rates (π0.5 50 Hz control, 1 chunk/s; Helix 02 200 Hz/1 kHz) vs schematic rates flagged disclosed:false | lib/hierarchy-timescales.ts + π0.5 paper + Helix 02 blog | verified | Every `disclosed: true` rate traces to a source; every unstated rate (π0.5 subtask ~1 Hz, GR thinking ~3 Hz, GO-2 lanes, S2 ~1 Hz) is flagged `disclosed: false` with "shown schematically" in the note. P4-conformant. |

## rl-finetuning.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| DPPO: two-layer MDP (denoising chain + environment), PPO over both layers, per-transition likelihood; strongest overall fine-tuning performance/efficiency for diffusion policies | DPPO paper, arXiv 2409.00588 | verified | "formulate the denoising process as a Markov decision process ... two-layer MDP"; the paper's headline claim of best overall performance/efficiency is its own. |
| ConRFT: consistency policy collapses denoising to few steps; offline BC + Q-learning then online with human interventions; 96.3% average success on 8 real tasks after 45-90 min; 144% improvement over supervised baselines | ConRFT paper, arXiv 2502.05450 (abs + HTML Table I) | verified | Abstract: "96.3% average success rate across eight real-world tasks with only 45-90 minutes of online fine-tuning ... 144% improvement over supervised fine-tuning". |
| pi_RL: Flow-Noise (learnable noise net, exact log-likelihood) and Flow-SDE (ODE→SDE, two-layer MDP); significant gains over SFT in- and out-of-distribution; v3 January 2026 | pi_RL paper, arXiv 2510.25889 | verified | Both algorithms and the in/out-of-distribution gains are the paper's; version history confirms v3 Jan 2026. |
| Recap: demonstrations/coaching/practice; value function predicts negative steps-to-completion; n-step advantage binarized and fed as a conditioning token; condition on "high advantage" at execution; KL-regularized-RL solution realized as conditioning | π*0.6 paper + blog (part 2 + this session) | verified | All mechanism claims verified in part 2; the KL-regularized conditioning equation matches the paper's formulation. |
| Recap results: espresso throughput and success both more than doubled; failures cut 2x+; all three applications >90%; espresso 5:30am-11:30pm continuous | π*0.6 paper + blog (part 2 + this session) | verified | "more than doubles the throughput"; "90%+ range" on all but diverse laundry — the article's "all three demonstrated applications (espresso, laundry, box assembly) exceeded 90%" matches the paper's task-level statement for those three; 5:30am-11:30pm is blog-verbatim. Vendor-reported caveat present. |
| HIL-SERL: RLPD-style off-policy RL, demos in replay buffer, human takeovers; near-perfect success in 1-2.5 h; average 2x success and 1.8x faster execution; 200 demonstrations | HIL-SERL paper, arXiv 2410.21845 | verified | "near-perfect success rates within 1 to 2.5 hours of real-world training"; "2x improvement in success rate and 1.8x faster execution"; RLPD + demo-seeded buffer + interventions per the paper. |
| PLD: probe/learn/distill stages; residual actors probe failure regions; distillation back into the generalist; 99% LIBERO, >50% SimplerEnv gains, 100% real Franka/YAM; ICLR 2026 | PLD paper, arXiv 2511.00091 + ICLR 2026 acceptance (project page + OpenReview) | verified | All numbers verbatim from the abstract; ICLR 2026 acceptance confirmed via the authors' project page and OpenReview forum. Table evidence badge "peer-reviewed" now accurate. |
| RLDG: RL-trained task policies generate data; generalist fine-tuned on RL trajectories beats human-demo-trained by up to 40% on precise insertion/assembly | RLDG paper, arXiv 2412.09858 | verified | "up to 40% higher success rates" than training on human demonstrations, on the paper's precise insertion/assembly tasks. |
| rl-vla-generalization: gains concentrate in execution robustness and semantic understanding under distribution shift, not broad new-task generalization; PPO > DPO/GRPO; NeurIPS 2025 | "What Can RL Bring to VLA Generalization?", arXiv 2505.19789 | verified | The paper's central findings; PPO outperforming LLM-derived objectives (DPO, GRPO) is its reported result; NeurIPS 2025 venue confirmed. |
| PAIR-VLA: RL-fine-tuned VLAs become newly fragile to deployment-time visual perturbations | "What to Ignore, What to React", arXiv 2605.13105 | verified | The paper's stated negative result and fix; the article reports only the negative result, which the abstract supports. |
| RlMethodsTable rows (6 methods: mechanism, result, evidence class, openness) | Each method's source as above | verified | Recap flagged vendor-reported + closed; PLD peer-reviewed (ICLR 2026); pi_RL openness null ("not disclosed") matches the article's caveat; DPPO/ConRFT/HIL-SERL code availability per their papers' released code. |

## realtime-execution.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| RTC latency breakdown: 139 ms total mobile (97 model, 21 network, 11 resize, 9.7 other); 108 ms static | RTC paper, arXiv 2506.07339 HTML | verified | The paper's Table/Sec. numbers match exactly; context (mobile vs static manipulator) travels with the figures. |
| "both totals are five to seven control periods long ... re-planning at 5 to 9 Hz" | Arithmetic on the sourced figures (139 ms ≈ 7×20 ms; 108 ms ≈ 5.4×; 1/0.139 ≈ 7.2 Hz, 1/0.108 ≈ 9.3 Hz) | verified | Derived-from-sourced-numbers framing; the article presents it as arithmetic, not a paper quote. "5 to 9 Hz" brackets the computed range. |
| VLA-Perf: "denoising steps dominate inference time ... chunk size contributes negligibly" | VLA-Perf paper, arXiv 2602.18397 HTML, Takeaway 6 | verified | The paper's own takeaway; verified against the real paper per the pre-loaded check. |
| π0 on H100: 162.5 Hz; on Jetson Thor: 19.0 Hz (52.57 ms); π0-L 9.1B at 3.9 Hz | VLA-Perf paper (this session) | verified | All four figures match the paper's tables. |
| "~10 Hz achievable on Thor for pi0-scale models, but 100 Hz requires model-level architectural changes" | VLA-Perf paper, Takeaway 13 | verified | Paper: 10 Hz feasible on Thor; 100 Hz "requires model-level" change. |
| "Everything on the Thor is memory-bound, so latency tracks parameter count" | VLA-Perf paper, Takeaway 2 | verified | Memory-bound analysis for the edge platform. |
| "Quantization to FP4 or FP8 buys a 2 to 4x latency reduction with minimal accuracy loss" | VLA-Perf paper, full text searched for FP4/FP8/quantization numbers | **corrected** | The paper recommends lower-precision quantization generically but nowhere states "FP4 or FP8" or a "2 to 4x" figure; this was a research-report paraphrase that the real paper does not support. Sentence rewritten to what the paper says (memory-bound ⇒ latency tracks parameter count; quantization named as the lever). |
| "server-side inference beats on-device inference in almost all scenarios except very poor networks" | VLA-Perf paper, Takeaway 9 | verified | Server-side wins except under poor network conditions. |
| Synchronous execution: original π0 release ran chunks synchronously; pauses throw the policy off-distribution; removing pauses improved precision and throughput | π0 paper + RTC paper/blog (part 1/2) | verified | π0 synchronous default and the RTC pause critique verified in parts 1-2. |
| Naive switching discontinuity; temporal ensembling failure at +100/+200 ms injected delay | RTC paper + PI RTC blog (part 1) | verified | TE protective-stop failures verified in part 1. |
| RTC: freeze first d actions, partial attention over the overlap, free generation; no training-time change; flat throughput 0→200 ms; match-striking and Ethernet at >300 ms | RTC paper, arXiv 2506.07339 (part 1 + this session) | verified | All mechanism and result claims verified in part 1 and re-confirmed. |
| Training-time RTC: in-flight actions as conditioning input; π0.7 simulates 0-12 ticks = 240 ms at 50 Hz | Training-time RTC paper, arXiv 2512.05964 + π0.7 paper (part 2) | verified | The training-time conditioning mechanism is the paper's; π0.7's 0-12 tick delay range and 240 ms figure verified in part 2. |
| π0 10 Euler steps; π0.6 5 steps at 63 ms on one H100 with 3 cameras; π0.7 stays at 5 | π0 paper + π0.6 model card + π0.7 paper (part 1/2) | verified | All verified previously; the 63 ms card figure carries its vendor-reported flag in the callout. |
| "one-step distillation ... has not been adopted by the frontier labs for their flagship policies" | Consistency Policy + OneDP papers vs π0.6/π0.7/GR00T recipes (part 1) | verified | Verified in part 1 (diffusion-policy ledger, same claim). |
| ControlLoopBudget / ExecutionModes interactives disclosed as models anchored to published numbers | Callout text vs sources | verified | The callout names exactly which numbers are measured (52.57, 63, 108/139, 240 ms) and that the interpolation between anchors is illustrative. P4-conformant. |

## cross-embodiment.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| "A 7-DoF Franka emits 8 numbers per step. A bimanual ALOHA emits 14." | consolidation sweep 2026-08-18: Franka Emika Panda is 7 joint DoF + 1 gripper = 8 action dims (standard; consistent with every Franka paper in the registry); bimanual ALOHA = 14 (ACT paper Sec. IV-C) | verified | Correct as written: the 8 = 7 arm joints + gripper, and ALOHA's 14-dim is the same gripper-included convention. Note the contrast with the ACT hardware itself (two 6-DoF ViperX arms; see the action-chunking correction above): the ALOHA 14-dim action space includes grippers, which is why 7+7 arithmetic over arm DoF alone gives the wrong hardware description. |
| "pi0 trained this way across more than 7 robot configurations and 68 tasks, roughly 10,000 hours" | π0 paper, arXiv 2410.24164 | **corrected** | The paper says exactly "7 distinct robot configurations"; "more than 7" overstated (same defect class as the part-2 pi-line fix). Stat note and prose both fixed to 7. |
| Padded-vector strategy: one vector sized for the widest robot, zero-pad, per-embodiment normalization (π0 + Octo) | π0 paper + Octo paper (part 1/2) | verified | Zero-padding to the largest robot's dimensionality verified in part 2. |
| "one critique of the OXE pool argues that part of what looks like cross-embodiment transfer in pooled training is an artifact of the normalization scheme itself" | mbreuss.github.io ICLR 2026 VLA post, full text | **corrected** | The post contains no normalization-artifact argument; its OXE claim is the data-quality one ("an open secret that OXE is mostly low-quality data, yet we still lack good methods to quantify data quality in imitation learning"). Rewritten to attribute exactly that, dropping the invented normalization claim. |
| GR 1.5 Motion Transfer: trains across ALOHA 2, bi-arm Franka, Apollo; "architecture and training procedure that moves motion knowledge between very different robots"; single-embodiment and multi-embodiment-without-MT baselines both underperform | GR1.5 report, arXiv 2510.03342 HTML, Sec. 1/2/3 + Fig. 4 caption | verified | "a novel architecture and a Motion Transfer (MT) mechanism ... enabling skills to transfer across very different robot embodiments"; Fig. 4 caption: "GR 1.5 consistently outperforms our baselines: GR 1.5 trained on single or multi-robot data without the MT recipe"; ALOHA/Bi-arm Franka/Apollo data per Sec. 2.2. |
| On-Device 2 inherits MT; adapts to a new bi-arm embodiment in a few hours with typically under 200 examples; SO-101 and Dexmate | GR2 blog (this session) | verified | "inherits our advanced 'motion transfer' techniques from Gemini Robotics 1.5"; "just a few hours of adaptation time, typically with less than 200 examples"; Dexmate, SO101, Trossen platforms shown. |
| GR00T N1.7: relative EEF deltas from current pose; EmbodimentTag system carried over from N1; 20,000 hours EgoScale human video in pretraining alongside robot demos; "key factor" in cross-embodiment performance | Isaac-GR00T README + GR00T N1 paper (this session) | verified | README: "relative end-effector action space shared across robot and human embodiments ... a key factor in the model's cross-embodiment performance"; "20K hours of EgoScale human video data in pretraining"; EmbodimentTag exists in the N1-era codebase and the N1 paper's embodiment-specific encoders/decoders; the README's GA commit notes "embodiment tags". |
| π0 humanoid 29 dims (callout: "the humanoid's 29 dims (GR00T N1)") | Isaac-GR00T README: "State and action dimensions expanded from 29 to 132" | verified | 29 is the pre-N1.7 (N1) dimensionality per the README's own diff note. |
| PI human-to-robot: egocentric video treated as another embodiment with 3D hand positions as actions; roughly 2x improvement on generalization tasks; representations align only once robot pretraining is sufficiently large and diverse; published December 2025 | PI research note pi.website/research/human_to_robot (this session) | verified | "treat human video data like our existing robot embodiments, with actions given by 3D hand positions, without any special transfer learning method"; "about 2x across a suite of 4 generalization scenarios"; TSNE feature-alignment finding and the pretraining-diversity scaling result per the note; dated December 16, 2025. |
| "Nobody has run the head-to-head" + the two-positions fork (P5) | GR00T README + PI note | verified | No public head-to-head exists; both positions named with their proponents and primary sources. P5-conformant. |
| Stat block: 10K hours / 22 embodiments (OXE) / 20K hours EgoScale / ~2x | π0 paper, OXE paper, README, PI note | verified | 22 embodiments verified in part 2; the rest as above. |

## knowledge-insulation.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| RT-1/RT-2 discretized into bins and predicted as tokens; π0 bolted a flow-matching expert onto a pretrained VLM | RT-2 paper + π0 paper (part 1/2) | verified | Verified in parts 1-2. |
| KI paper (2025, Physical Intelligence) "dissolved the fork": both representations at once with a gradient barrier | KI paper, arXiv 2505.23705 + KI blog (part 2 + this session) | verified | The paper's three-part recipe and stop-gradient verified in part 2; NeurIPS 2025 acceptance confirmed this session (neurips.cc poster + OpenReview). |
| Stat: 7.5x fewer training steps to a given bussing-task performance vs π0; 3B backbone; 300M expert; default since π0.5 | KI paper Fig. 6 + π0 paper (part 2) | verified | 7.5x verified in part 2; 3B PaliGemma + 300M expert verified in part 2; π0.5/π0.6/π0.7 lineage verified in part 2. |
| Naive joint training: early flow-matching gradients rewrite backbone representations; spoon-in-bin example (grabs trash); PI verdict quote on text-token actions | KI paper + KI blog (part 2) | verified | The part-2 correction aligned the example with the paper's Fig. 2 caption; both blog quotes verbatim (verified part 2). |
| Three-part recipe: expert trains with flow matching; backbone trains on discrete FAST tokens + web VL data + subtask data; stop-gradient severs the backward pass, one-directional | KI paper Sec. 3 (part 2) + FAST paper (part 2) | verified | Recipe components verified in part 2; FAST DCT+BPE compression verified in part 2. |
| "stop-gradient by itself fails ... shirt folding is unsolvable" in the fully-insulated configuration | KI paper Fig. 8 (part 2) | verified | 0% performance for the frozen/insulated configuration on shirt folding verified in part 2. |
| "plain web vision-language data contributes the largest single boost to object generalization" | KI paper (part 2) | verified | Matches the paper's co-training ablation reading verified in part 2. |
| π0.6: Gemma3 4B backbone, SigLIP vision encoder, 860M expert with the backbone's layer count, KI end to end, 5 denoising steps | π0.6 model card (part 2) | verified | All figures match the card. |
| π0.7 keeps the same structure, spends budget on richer conditioning context | π0.7 paper (part 2) | verified | Architecture continuity verified in part 2. |
| MotInsulation interactive: 8-layer stacks and 0-100 language meter disclosed as illustrative | Callout text | verified | The callout explicitly marks the interactive's renderings as illustrative and names which numbers are sourced. P4-conformant. |

## Registry (data/citations.ts) checks in this part

| Entry | Source checked | Verdict | Note |
|---|---|---|---|
| training-time-rtc-2025 authors | arXiv 2512.05964 abs page | **corrected** | Registry listed "Physical Intelligence"; the paper's authors are Kevin Black, Allen Z. Ren, Michael Equi, Sergey Levine. Fixed (P1 bibliographic fidelity). |
| vla-perf-2026 title/authors | arXiv 2602.18397 abs page | verified | Registry now matches the real paper (pre-loaded fix confirmed): "How Fast Can I Run My VLA? Demystifying VLA Inference Performance with VLA-Perf", Jiang/Clemons/Sankaralingam/Kozyrakis. |
| oxe-quality-critique-2026 title/author/year | mbreuss.github.io post | verified | Self-dated October 2025, by Moritz Reuss; registry year 2025 matches. |
| pld-2026 authors (12 names) | arXiv 2511.00091 abs page | verified | Full list matches name-for-name. |
| knowledge-insulation-paper-2025 title/authors | arXiv 2505.23705 abs page metadata | verified | Title and author list match the citation metas. |
| rl-vla-generalization-2025 and pair-vla-2026 titles/authors | arXiv 2505.19789 and 2605.13105 abs pages | verified | Match. |
| pi-human-to-robot-2025 | pi.website/research/human_to_robot | verified | Lab research note; registry marks it as such (type blog, Physical Intelligence author). |
| gemini-robotics-2-2026 | GR2 blog | verified | Title, author (Carolina Parada), URL all match the live post. |

## Part 3 summary

Counting unit: ledger rows, one claim per row. Recomputed from the tables
above by the 2026-08-18 reconciliation sweep; the original summary said 86
rows / 83 verified, which understated the tables even before the
consolidation sweep added one more verified row (the cross-embodiment
"7-DoF Franka emits 8 numbers" check).

- Article/table rows: 88 (comparison-matrix 25: 25 V; hierarchical 16:
  16 V; rl-finetuning 11: 11 V; realtime-execution 15: 14 V + 1 C;
  cross-embodiment 11: 9 V + 2 C; knowledge-insulation 10: 10 V)
- Verified: 85 / Corrected: 3 / Cut: 0 (article rows)
- Registry rows: 8 — 7 verified / 1 corrected

Corrections:

1. realtime-execution.mdx — the "FP4 or FP8 buys 2 to 4x" quantization
   claim is not in the VLA-Perf paper (only a generic lower-precision
   recommendation). Rewritten to the paper's actual statement.
2. cross-embodiment.mdx — the OXE critique was attributed a
   normalization-artifact argument it does not make. Rewritten to the
   post's actual claim (OXE data quality / no quality-quantification
   methods). Also fixed "more than 7 robot configurations" to the paper's
   exact 7 (stat note and prose).
3. data/citations.ts — training-time-rtc-2025 authors corrected from
   "Physical Intelligence" to Black/Ren/Equi/Levine.

Unresolved: none. `lastReviewed` bumped to 2026-08-17 on all six articles.

## Domain completion check (VAL-AUDIT-001)

All 12 manipulation articles now have ledger coverage: part 1
(bc-foundations, action-chunking, diffusion-policy), part 2 (vla-models,
pi-line, generalist-policies), part 3 (comparison-matrix, hierarchical,
rl-finetuning, realtime-execution, cross-embodiment, knowledge-insulation).
No ledger row across the three parts is left unresolved.

Domain totals, recomputed from the ledger tables by the 2026-08-18
reconciliation sweep (unit: ledger rows):

- Article/table rows: 71 + 66 + 88 = 225 checked; 67 + 61 + 85 = 213
  verified; 4 + 5 + 3 = 12 corrected rows (11 distinct defects; the
  pi07-2026 title defect is shared between the part-2 article tables and
  the registry table); 0 cut.
- Registry rows: 8 (part 2) + 8 (part 3) = 16: 12 verified, 3 corrected,
  1 documented-no-action.
- Two of the corrected article rows postdate the original 2026-08-17 pass:
  the ACT DoF row (part 1) and its companion check were added by the
  2026-08-18 consolidation sweep; the original three-part totals printed
  here before recomputation (61+73+86 = 220 checked, 56+69+83 = 208
  verified, 3+4+3 = 10 corrected) summed the overstated part-2 figures and
  were withdrawn.
- Every correction landed in the same commit as its
  article fix, and every numeric claim in the domain now traces to a fetched
  primary source.


## Verification gates (2026-08-18 reconciliation sweep)

The three manipulation passes originally recorded no gates table in this
ledger. What can be established from the commits and the independent
reviews: the part-1 session's transcript showed the full gate set green
(typecheck, lint, validate:content, the then-1701-test suite, build), and
the part-2 session skipped the mandated e2e grep-and-run step entirely (a
review verified no spec asserted any string it changed, so nothing sat
red, but the step was not performed and was not reported). The part-3
session's e2e result is likewise not in this ledger. Rather than point a
reader at artifacts that do not exist, the full gate set was re-run
against the corrected tree during the 2026-08-18 reconciliation sweep:

| Gate | Command | Result |
|---|---|---|
| Unit/component | `npm run test` | pass — 168 files, 1701 passed, 1 skipped |
| Types | `npm run typecheck` | pass (next-env.d.ts regenerated after the e2e run) |
| Lint | `npm run lint` | pass, no findings |
| Content | `npm run validate:content` | OK — 42 modules, 307 citations, 68 terms, 7 images, 111 companies; no-slop OK |
| Build | `npm run build` | pass — static export, 135 structured documents |
| Full e2e | `npm run test:e2e` (port 3200 killed first) | 572 passed / 0 failed / 1 skipped |

This ledger records only commands actually executed in that sweep; the
original sessions' own outputs are gone and are not claimed here.
