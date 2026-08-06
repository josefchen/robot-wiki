# Learned Manipulation Policy Lineage
_Research snapshot: 2026-08-06_

Scope: the intellectual lineage of learned manipulation policies, from naive behavior cloning through 2026 frontier generalist policies. Every architectural claim below is traced to a primary source (arXiv paper, official lab blog, model card, or repo README). Claims I could not verify are marked `[UNVERIFIED]`.

---

## Executive summary

- **The field's central problem is not "can a network map pixels to actions" — it is compounding error under closed-loop distribution shift.** Behavior cloning trained i.i.d. on expert data incurs regret that grows *quadratically* in episode length, because every small error moves the robot into states the expert never visited (DAgger, arXiv:1011.0686). Nearly every architectural innovation since 2023 is a partial answer to this one problem.

- **Three orthogonal fixes emerged, and modern systems use all three at once**: (1) *action chunking* — predict a whole sequence per inference, shrinking effective horizon by k (ACT, 2023); (2) *expressive generative action heads* — diffusion/flow instead of unimodal regression, so multimodal demonstrations don't get averaged into invalid actions (Diffusion Policy, 2023); (3) *learning from on-policy experience* — corrections and RL on the states the policy actually visits (Recap / π*0.6, 2025; RL Tokens, 2026).

- **Action representation has cycled and then hybridized.** Discrete binned tokens (RT-1, RT-2, OpenVLA) → continuous diffusion/flow experts (π0, GR00T) → *both simultaneously* (Knowledge Insulation, π0.5+KI onward): the VLM backbone is supervised with discrete FAST action tokens (stable cross-entropy, preserves pretrained knowledge) while a separate flow-matching action expert produces the continuous actions actually executed, **with gradients from the expert stopped at the backbone boundary** (arXiv:2505.23705). This is now the default recipe.

- **Naive per-dimension per-timestep binning fails specifically at high control frequency.** At 50 Hz consecutive actions are nearly identical, so next-token prediction becomes trivially easy and learns nothing useful. FAST fixes this by DCT-transforming the action chunk and byte-pair-encoding the quantized frequency coefficients, giving ~5x faster training than π0 flow matching for autoregressive VLAs (arXiv:2501.09747).

- **Chunk size is a real bias/variance dial, not a hyperparameter footnote.** ACT measured 1% success at k=1 vs 44% at k=100, with a slight decline at k=200/400 as the policy becomes effectively open-loop (arXiv:2304.13705). π0-family models fix chunk H=50 (≈1 s at 50 Hz) but execute only Ĥ ∈ {15, 25} of those steps before re-inferring (π0.7 paper).

- **Real-time execution is a first-class architectural problem, not an engineering detail.** Synchronous chunk execution creates pauses that are off-distribution. Naive smoothing (ACT-style temporal ensembling) *catastrophically fails* at ≥100 ms latency. Real-Time Chunking (RTC) reframes chunk hand-off as an inpainting problem on the flow/diffusion trajectory — freeze the actions that will already have executed, partially attend to the overlapping middle, generate the rest — and holds throughput flat out to +200 ms injected delay with no training-time change (arXiv:2506.07339).

- **Physical Intelligence is now four generations past the openpi release.** Open weights stop at π0, π0-FAST, π0.5 (github.com/Physical-Intelligence/openpi). π0.6 (Nov 2025, Gemma3-4B backbone + 860M action expert), π*0.6 (RL via Recap), π0.6-MEM (memory), and π0.7 (Apr 2026) are **closed**. Any "current SOTA" claim built on openpi is one to four generations stale.

- **RL on top of imitation is the biggest 2025→2026 delta.** Recap (π*0.6) trains a value function, computes advantages, and *conditions the VLA on binarized advantage* — keeping all data in training (good and bad) and telling the model which is which, then asking for high-advantage actions at test time. On espresso-making this more than doubled both throughput and success rate (pi.website/blog/pistar06).

- **π0.7 (Apr 2026) reframes generalization as a prompting problem.** Same 5B VLA skeleton, but trained with *diverse multimodal context*: subtask language, episode metadata (speed/quality/mistake flags), control-modality labels, and generated visual subgoals. This lets suboptimal and autonomous data be included without degrading the policy, and produced the first credible *compositional* generalization in a VLA (zero-shot laundry folding transfer to a bimanual UR5e with no UR5e laundry data). It also distilled the Recap specialists back into one generalist at equal or better throughput.

- **Hierarchy has quietly become universal and internal.** SayCan-style "LLM plans, separate policy executes" is largely obsolete as a system design; the hierarchy is now inside the model — π0.5/π0.6/π0.7 predict a language subtask at low frequency and actions at high frequency in the same network; Gemini Robotics 1.5 interleaves natural-language "thinking" traces with actions; GO-2 uses "action chain-of-thought" with an asynchronous low-freq planner / high-freq follower. The keypoint/affordance intermediate-representation line (MOKA, ReKep, RoboPoint) survives mainly as *co-training data* (π0.5 co-trains on bounding-box and keypoint prediction) rather than as a runtime pipeline.

- **Memory is the 2026 frontier for long-horizon.** MEM (Mar 2026) gives π0.6 a two-scale memory: an interleaved spatial/causal-temporal ViT video encoder for short-term raw-observation history, plus model-authored natural-language "notes" for long-term state. Enables ~15-minute tasks and in-context failure adaptation (retry a grasp *differently*).

- **Whole-body control landed in 2026 across all three frontier labs, via three different decompositions.** Figure Helix 02 (Jan 2026): S2 semantic latents → S1 visuomotor transformer at 200 Hz → S0, a 10M-param learned whole-body controller at 1 kHz trained on 1,000+ h of retargeted human motion. Gemini Robotics 2 (Jul 2026): one VLA controlling Apollo 2 feet-to-fingertips including 22-DoF hands. NVIDIA GR00T N1.7 + GEAR-SONIC: VLA emits compact *latent action tokens* that a learned WBC decodes into full-body joint commands.

- **A second representation bet emerged in 2026: World-Action Models (WAMs)**, which start from a pretrained *video/world-model* backbone instead of a VLM. Rationale: video models already encode language→visual-change grounding, so the remaining video→action gap may be smaller than the language→action gap. Public examples: NVIDIA DreamZero, Cosmos Policy, Ant LingBot-VA, Sereact Cortex 2.0, mimic-video, Fast-WAM. Cost: roughly 3–4x slower inference (590–800 ms/chunk vs ~190 ms for π0.5) and ~7x higher training compute for a Wan-14B-scale stack (NVIDIA dev blog, Jun 2026).

- **The single most useful public leaderboard for zero-shot generalist policies is RoboArena** (real-world, distributed, independent operators), because sim benchmarks are saturated. Reported Elo snapshot: π0 1475, π0-FAST 1592, π0.5 1622, DreamZero 1750 (NVIDIA dev blog, Jun 2026).

- **LIBERO and CALVIN are effectively solved and should not be used to rank frontier models.** Rule of thumb from an ICLR-2026 submission survey: >95% on LIBERO Spatial/Goal/Object is *expected*; a well-tuned Diffusion Policy reaches it without any VLM pretraining.

- **Open vs closed is a hard split at the frontier.** Genuinely open-weight: OpenVLA, Octo, Diffusion Policy, ACT, π0/π0-FAST/π0.5, GR00T N1.x (Apache-2.0 code, NVIDIA Open Model License weights), AgiBot GO-1. Closed: everything from Gemini Robotics, Figure Helix, Skild, π0.6+, GO-2. The open/closed gap is invisible on sim benchmarks and large on zero-shot open-world behavior.

- **Cross-embodiment is handled three incompatible ways, and this is a live disagreement.** (a) Shared padded action vector + per-embodiment normalization (π-family, Octo). (b) Explicit "motion transfer" training recipe over heterogeneous embodiments (Gemini Robotics 1.5). (c) A *shared relative end-effector action space* across robot *and human* data (GR00T N1.7), which is what lets 20K hours of egocentric human video enter pretraining directly. Physical Intelligence's competing finding: cross-embodiment/human transfer *emerges* from scale without any alignment mechanism (Dec 2025).

- **The "action expert" is now the standard architectural unit and it is a Mixture-of-Transformers, not a head.** In π0 and successors it is a second full set of transformer weights that attends into the VLM backbone's activations at every layer via shared attention — not an MLP on the final hidden state. This distinction matters for anyone implementing one.

- **Inference-time compute in robotics is bounded by physics, not budget.** π0 used 10 Euler integration steps; π0.6 uses 5 (63 ms/chunk on one H100 with 3 cameras); π0.7 uses 5. The whole consistency/one-step-distillation research line exists because you cannot spend 50 denoising steps at 50 Hz.

---

## Timeline

| Year | Method | One-line contribution | Open weights? | Citation |
|---|---|---|---|---|
| 1988 | ALVINN | First end-to-end neural visuomotor policy (road following); origin of BC for robots | n/a | Pomerleau, NeurIPS 1988 |
| 2010–11 | DAgger | Formalized covariate shift; naive BC regret is quadratic in horizon; iterative on-policy expert relabeling fixes it | n/a (algorithm) | arXiv:1011.0686 |
| 2022 | SayCan | LLM proposes skills, learned affordance value function grounds them in what's feasible now | Partially | arXiv:2204.01691 |
| 2022 | Code as Policies | LLM writes executable policy code calling perception/control APIs | Yes (code) | arXiv:2209.07753 |
| 2022 | RT-1 | Scaled multi-task BC transformer; actions as 256-way discretized bins; 3 Hz | Yes | arXiv:2212.06817 |
| 2023 | ACT / ALOHA | Action chunking + CVAE transformer + temporal ensembling on $20k bimanual hardware | Yes | arXiv:2304.13705 |
| 2023 | Diffusion Policy | Visuomotor policy as conditional DDPM over action sequences; receding-horizon control | Yes | arXiv:2303.04137 |
| 2023 | RT-2 | Co-fine-tune a web-scale VLM on robot data with actions emitted as text tokens | No | arXiv:2307.15818 |
| 2023 | Open X-Embodiment / RT-X | 1M+ episodes, 22 embodiments, 527 skills; demonstrated positive cross-robot transfer | Yes (data) | arXiv:2310.08864 |
| 2024 | Mobile ALOHA | Whole-body mobile bimanual teleop; co-training static + mobile data | Yes | arXiv:2401.02117 |
| 2024 | Octo | Open generalist transformer with diffusion action head; 800k OXE trajectories | Yes | arXiv:2405.12213 |
| 2024 | OpenVLA | Open 7B VLA (Prismatic backbone), discrete action tokens, 970k OXE episodes | Yes | arXiv:2406.09246 |
| 2024 | Consistency Policy | Consistency distillation of a diffusion policy to 1–3 step inference for edge GPUs | Yes | arXiv:2405.07503 |
| 2024 | MOKA / ReKep / RoboPoint | VLM emits keypoints / relational constraints / affordance points as the interface to control | Yes | arXiv:2403.03174, 2409.01652, 2406.10721 |
| 2024 | π0 | Flow-matching action expert grafted onto PaliGemma; 50-step chunks at 50 Hz | Yes | arXiv:2410.24164 |
| 2025 | FAST / π0-FAST | DCT + BPE action tokenization; makes autoregressive VLAs viable at high frequency | Yes | arXiv:2501.09747 |
| 2025 | OpenVLA-OFT | Parallel decoding + action chunking + L1 regression head: 26x throughput, 76.5→97.1% LIBERO | Yes | arXiv:2502.19645 |
| 2025 | Hi Robot | Explicit hierarchical VLA: high-level VLM emits language subtasks to a low-level VLA | No | arXiv:2502.19417 |
| 2025 | Gemini Robotics / ER | Gemini-2.0-based VLA + embodied-reasoning VLM | No (ER via API) | arXiv:2503.20020 |
| 2025 | GR00T N1 | Open humanoid foundation model; VLM backbone + flow-matching DiT action head | Yes | arXiv:2503.14734 |
| 2025 | AgiBot GO-1 | ViLLA: vision-language-*latent*-action, latent action tokens bridge video and control | Yes | arXiv:2503.06669 |
| 2025 | π0.5 | Co-training on heterogeneous data (web VQA, subtask prediction, detections, actions) → open-world generalization in unseen homes | Yes | arXiv:2504.16054 |
| 2025 | Knowledge Insulation | Stop-gradient between action expert and VLM + FAST-token supervision of the backbone: 7.5x faster training, better language following | Yes (in π0.5) | arXiv:2505.23705 |
| 2025 | Real-Time Chunking | Chunk hand-off as inpainting on the flow trajectory; latency-robust to +200 ms | Yes (algorithm) | arXiv:2506.07339 |
| 2025 | Gemini Robotics 1.5 / ER 1.5 | Motion Transfer across embodiments + interleaved natural-language "thinking" before acting | No (ER via API) | arXiv:2510.03342 |
| 2025 | π*0.6 / Recap | Offline+online RL for VLAs via advantage-conditioned policies; >2x throughput on hard tasks | No | pi.website/blog/pistar06 |
| 2025 | Human→robot transfer | Cross-domain transfer from egocentric human video *emerges* with robot-pretraining scale | No | pi.website/research/human_to_robot |
| 2026 | Figure Helix 02 | S0/S1/S2 stack; 1 kHz learned whole-body controller from human motion; pixels-to-torque | No | figure.ai/news/helix-02 |
| 2026 | MEM (π0.6-MEM) | Multi-scale memory: video encoder for short-term, model-authored language notes for long-term; 15-min tasks | No | pi.website/research/memory |
| 2026 | RL Tokens | Bottlenecked "RL token" from the VLA feeds a tiny actor/critic trained online in ~15 min of robot data | No | pi.website/research/rlt |
| 2026 | GR00T N1.7 | Cosmos-Reason2-2B (Qwen3-VL) backbone, relative-EEF action space, 20K h human video, horizon 40 | Yes | github.com/NVIDIA/Isaac-GR00T |
| 2026 | AgiBot GO-2 | Action chain-of-thought + asynchronous dual-system (low-freq planner, high-freq follower) | No | agibot.com / therobotreport |
| 2026 | π0.7 | Diverse multimodal prompting (metadata, control mode, generated visual subgoals) → compositional generalization | No | pi.website/download/pi07.pdf |
| 2026 | WAMs (DreamZero, Cosmos Policy, Fast-WAM, LingBot-VA) | Start from a video/world-model backbone instead of a VLM | Mixed | NVIDIA dev blog, Jun 2026 |
| 2026 | Gemini Robotics 2 / ER 2 / On-Device 2 | Whole-body humanoid control, 22-DoF hands, multi-robot collaboration, few-hour embodiment adaptation | No (ER 2 via API) | deepmind.google blog, Jul 2026 |

---

## Comparison matrix

| Method | Action representation | Chunk H / executed Ĥ | Control freq | Backbone | Conditioning | Cross-embodiment | Hierarchical? | Inference compute | Open |
|---|---|---|---|---|---|---|---|---|---|
| Naive BC | Continuous regression (MSE), 1 step | 1 / 1 | task-dep. | from scratch | none/goal | no | no | 1 fwd pass | n/a |
| DAgger | any | 1 / 1 | task-dep. | any | none | no | no | 1 fwd pass + expert queries | n/a |
| ACT (2023) | CVAE decoder, deterministic at test (z=0), k×14 continuous | k=100 / 1 (with temporal ensembling) | 50 Hz | ResNet18 ×4 + transformer enc/dec, ~80M | 4 RGB + joints | no | no | 1 fwd pass (~0.01 s) | Yes |
| Diffusion Policy (2023) | DDPM/DDIM over action sequence | Tp≈16 / Ta≈8 | 10 Hz (interp. to 125 Hz) | ResNet-18 (GroupNorm) + 1D CNN-UNet or DiT | To=2 obs frames | no | no | 10 DDIM steps, ~0.1 s on RTX 3080 | Yes |
| RT-1 (2022) | 256 uniform bins per dim, 11 dims, autoregressive | 1 / 1 | 3 Hz | FiLM-EfficientNet + TokenLearner + 19M decoder-only TF (35M total) | language + 6-frame image history | limited | no | 1 AR decode of 11 tokens | Yes |
| RT-2 (2023) | Actions as text tokens in the VLM vocabulary | 1 / 1 | 1–5 Hz `[UNVERIFIED exact]` | PaLI-X / PaLM-E (up to 55B) | language + image | no | no | full VLM AR decode | No |
| Octo (2024) | Diffusion action head on readout tokens | chunked | varies | transformer 27M / 93M from scratch | language *or* goal image, block-wise attn | yes (OXE) | no | diffusion steps | Yes |
| OpenVLA (2024) | 256 bins over 7 dims, overwriting least-used LLaMA tokens | 1 / 1 | ~6 Hz `[UNVERIFIED exact]` | Prismatic-7B (LLaMA-2-7B + DINOv2+SigLIP) | language + 1 image | yes (OXE 970k) | no | 7 AR token decodes | Yes |
| OpenVLA-OFT (2025) | Continuous, L1 regression, parallel-decoded chunk | chunk | 25–50 Hz class | same | + proprio, FiLM language | yes | no | 1 fwd pass, 26x OpenVLA throughput | Yes |
| π0 (2024) | Flow matching (rectified/OT path), continuous | H=50 / synchronous | up to 50 Hz | PaliGemma 3B + 300M action expert = 3.3B | 2–3 RGB + language + proprio | yes (padded joint space) | no | 10 Euler steps, KV-cached prefix | Yes |
| π0-FAST (2025) | DCT → quantize → BPE discrete tokens, autoregressive | H=50 | 50 Hz nominal, slow in practice | PaliGemma 3B | same | yes (FAST+ universal tokenizer) | no | AR decode of ~30–60 tokens (≈2x slower end-to-end) | Yes |
| π0.5 (2025) | Flow matching + discrete FAST supervision (KI) | H=50 | 50 Hz | PaliGemma-class 3B + 300M expert | + web VQA, detections, subtask prediction | yes | yes (internal subtask prediction) | 10 steps | Yes |
| π0.6 (2025) | Flow matching + FAST tokens (KI), advantage-conditionable | H=50 | 50 Hz | SigLIP 400M + Gemma3 4B + 860M expert (~5B) | up to 4×448² images, language, metadata | yes | yes | 5 denoising steps, 63 ms/chunk on H100 | No |
| π*0.6 (2025) | Same + binarized-advantage conditioning token | H=50 | 50 Hz | π0.6 | + advantage indicator | yes | yes | same | No |
| π0.6-MEM (2026) | Same + video-history encoder + language memory | H=50 | 50 Hz | π0.6 + MEM ViT | + short-term video, long-term text notes | yes | yes | same class | No |
| π0.7 (2026) | Flow matching, adaRMSNorm timestep injection | H=50 / Ĥ ∈ {15,25} | 50 Hz (20 Hz on some) | Gemma3 4B (incl. 400M vision enc.) + 860M expert ≈ 5B | language, subtask, metadata (speed/quality/mistake), control-mode label, multi-view subgoal images, memory | yes (zero-shot to UR5e) | yes (high-level policy + BAGEL world model) | 5 steps + training-time RTC to 240 ms latency | No |
| Gemini Robotics 1.5 (2025) | not disclosed | not disclosed | not disclosed | Gemini | language, interleaved thinking traces | yes ("Motion Transfer") | yes (ER 1.5 orchestrator) | thinking budget is tunable on ER | No |
| Gemini Robotics 2 (2026) | not disclosed | not disclosed | not disclosed | Gemini | language, ER 2 tool calls | yes, incl. full humanoid + 22-DoF hands | yes (ER 2 + VLA + On-Device 2) | on-device variant exists | No |
| GR00T N1.7 (2026) | Flow-matching DiT head, 16 diffusion layers; relative-EEF action space | action_horizon 40 | embodiment-dep. | Cosmos-Reason2-2B (Qwen3-VL), 3B total | language + images + state (dim 132) | yes (EmbodimentTag system, human video shares action space) | via SONIC latent-action WBC | ONNX/TensorRT export path | Yes |
| Figure Helix 02 (2026) | S1 → full-body joint targets; S0 → joint-level actuator commands | not disclosed | S1 200 Hz, S0 1 kHz | S2 VLM + S1 transformer + S0 10M MLP-class net | head + palm cameras, fingertip tactile, full proprio | fleet-wide via S0 | yes (S0/S1/S2) | on-board | No |
| AgiBot GO-2 (2026) | Action chain-of-thought → high-freq residual follower | not disclosed | asynchronous dual-rate | not disclosed | language | yes | yes (explicit) | not disclosed | No |
| WAMs (2026) | video latents + action tokens, joint or inverse-dynamics | varies | slow | Wan / Cosmos video diffusion | language + reference frame | varies | often | 590–800 ms/chunk | Mixed |

---

## Methods

### Naive behavior cloning and the covariate-shift problem

**Core idea:** Treat control as supervised learning. Collect expert state-action pairs, fit π(a|s) by maximum likelihood (or MSE regression), deploy.

**Problem it solved:** Avoids specifying a reward function or doing exploration. Origin point: ALVINN (Pomerleau, 1988) trained a 3-layer network to steer a van from camera pixels.

**Architecture:** Any encoder → action head. The canonical failure mode is a unimodal Gaussian / MSE head, which regresses to the *mean* of the demonstration distribution. If half the demonstrators go left around an obstacle and half go right, the MSE-optimal action is straight into it.

**Why it fails for robots — the precise statement:** Training data is drawn from the *expert's* state distribution d_π*; at test time the robot visits d_π. These differ, and the gap compounds: a policy with per-step 0/1 classification error ε on the expert distribution can incur total cost growing as O(ε T²) over a T-step episode, versus O(εT) if the errors did not compound. Ross, Gordon & Bagnell make this reduction precise and give the matching lower bound (arXiv:1011.0686, §2). Physical Intelligence restates the same argument in operational terms in 2025: "it's relatively easy to get VLAs to succeed at a task *some* of the time, but quite hard to make them succeed *reliably*" (pi.website/blog/pistar06).

**Training data:** Human teleoperation demonstrations.

**Limitations:** (1) quadratic compounding error; (2) multimodality of human demonstrations is destroyed by unimodal heads; (3) temporally correlated confounders — pauses and idle segments in demos are unpredictable from a Markovian single-step policy and cause the robot to freeze (documented empirically in Diffusion Policy §4 and ACT §III); (4) performance is upper-bounded by demonstration quality.

**Primary source:** *A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning*, Stéphane Ross, Geoffrey J. Gordon, J. Andrew Bagnell, 2010/2011. arXiv:1011.0686. https://arxiv.org/abs/1011.0686
**Secondary sources:** https://www.pi.website/blog/pistar06 (2025 restatement); Pomerleau, *ALVINN: An Autonomous Land Vehicle in a Neural Network*, NeurIPS 1988.
**Confidence:** high.

---

### DAgger (2011)

**Core idea:** Iteratively fix covariate shift by rolling out the *current* policy, querying the expert for the correct action at every state actually visited, aggregating that into the dataset, and retraining. Reduces imitation learning to no-regret online learning, giving O(εT) rather than O(εT²).

**Problem it solved:** The compounding-error bound of naive BC.

**Architecture:** Algorithm, not architecture. At iteration i, execute a mixture β_i π* + (1−β_i) π̂_i, label all visited states with π*, append to D, retrain on all of D.

**Training data:** Requires an interactive expert that can be queried at arbitrary states.

**Limitations:** The interactive-expert requirement is the killer for real robots — a human teleoperator cannot easily say "what would you do from *this* awkward state you've never seen." In practice, robotics uses the weaker *intervention* variant (HG-DAgger / interactive corrections): the operator takes over only when the robot is failing. This is exactly what Recap's "coaching" stage is, 14 years later.

**Primary source:** arXiv:1011.0686. https://arxiv.org/abs/1011.0686
**Confidence:** high.

---

### ACT / ALOHA (2023)

**Core idea:** Predict a *chunk* of k future actions from one observation, and train the chunk predictor as a conditional VAE so it can represent the variability of human demonstrations.

**Problem it solved:** Compounding error (k-fold horizon reduction), multimodality/non-stationarity of human demos, and temporally correlated confounders such as demonstration pauses — all with cheap, imprecise hardware.

**Architecture (verified from the paper):**
- Inputs: 4 RGB cameras at 480×640 (two wrist-mounted, two static) + 14-D joint positions (2 × ViperX 6-DoF arm + gripper).
- Each image → ResNet-18 → 15×20×512 feature map → flattened to 300×512, plus 2D sinusoidal position embedding. Four images → 1200×512 sequence, then joint positions and the style variable z are appended.
- Transformer encoder over that sequence; transformer decoder cross-attends into it with a fixed k×512 learned position-embedding query sequence → k×512 → linear → **k×14** tensor of absolute target joint positions.
- **CVAE structure:** a *separate* encoder q_φ(z | a_{t:t+k}, ō_t) — a transformer over the ground-truth action sequence plus joint state (no images) — compresses the demonstration into a "style variable" z. The decoder (the actual policy) is π_θ(â_{t:t+k} | o_t, z). At test time the encoder is **discarded** and z is set to the prior mean (zero), making the deployed policy deterministic.
- Loss: L = L_reconst (L1 on the action chunk) + β·L_reg (KL of q_φ to N(0,I)).
- ~80M parameters, trained from scratch per task, ~5 h on a single RTX 2080 Ti.

**Temporal ensembling:** Rather than executing a chunk open-loop for k steps, query the policy at *every* timestep. At time t there are then up to k overlapping predictions for a_t from chunks issued at t, t−1, …, t−k+1. Average them with exponential weights w_i = exp(−m·i) (i = 0 is the oldest prediction; m controls how fast newer observations dominate). Costs extra inference, no extra training. ACT's ablation shows both chunking and ensembling are needed for smooth, precise motion.

**Why chunking fixes both problems at once:** (a) Compounding error — with chunk size k the number of closed-loop decisions per episode drops k-fold, so the error compounds over T/k steps instead of T. (b) Multimodality — the *strategy* choice (left vs. right around the obstacle) is made once per chunk and committed to for k steps, rather than being re-sampled every timestep and producing incoherent chatter.

**Chunk-size ablation (the number worth showing in the app):** with temporal ensembling disabled and separate policies trained per k, average success rose from **1% at k=1 to 44% at k=100**, then tapered slightly at k=200 and k=400 — attributed to loss of reactivity and the difficulty of modeling very long action sequences.

**Training data:** ~50 demonstrations (≈10 minutes) per real task, teleoperated with the ALOHA leader-follower rig. 6 real tasks (opening a translucent condiment cup, slotting a battery, etc.) at 80–90% success.

**Control frequency / action horizon:** 50 Hz control, k=100 (2 s of actions).

**Limitations:** Single-task, trained from scratch, no language conditioning, no internet pretraining, no generalization to new objects/scenes. Temporal ensembling is *unsafe at high inference latency* — averaging two disagreeing chunks can produce actions in neither mode; Physical Intelligence documents catastrophic failures at +100 ms and +200 ms delay (pi.website/research/real_time_chunking).

**Primary source:** *Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware*, Tony Z. Zhao, Vikash Kumar, Sergey Levine, Chelsea Finn, 2023. arXiv:2304.13705. https://arxiv.org/abs/2304.13705
**Secondary sources:** https://tonyzhaozh.github.io/aloha/ ; ALOHA 2 (2024) https://aloha-2.github.io/ (improved hardware: better grippers, gravity compensation, low-cost frame, MuJoCo sim model); Mobile ALOHA, arXiv:2401.02117 (adds a wheeled base with whole-body teleoperation and shows co-training on the static ALOHA dataset lifts mobile-manipulation success by up to 90% with 50 demos).
**Confidence:** high (architecture and ablation numbers read directly from the paper text).

---

### Diffusion Policy (2023)

**Core idea:** Represent the visuomotor policy as a *conditional denoising diffusion process over the action sequence*, p(A_t | O_t). Instead of outputting an action, output the gradient field of the action-distribution score and iteratively refine noise into an action chunk.

**Problem it solved:** Multimodal action distributions (which mode-collapse under MSE and are unstable under energy-based IBC), high-dimensional action spaces, and training instability. Reported +46.9% average over prior SOTA across 15 tasks / 4 benchmarks.

**Architecture (verified from the paper):**
- Inputs: last T_o observation steps (T_o = 2 in the standard config). Visual encoder is a ResNet-18 with **GroupNorm replacing BatchNorm** (BatchNorm interacts badly with the EMA weights that DDPMs require), trained end-to-end with the diffusion head.
- Predicts T_p future actions; executes T_a of them before replanning. This is **receding-horizon control**: commit to a plan for a fixed duration, then re-plan, warm-starting from the previous prediction. Standard values are T_p = 16, T_a = 8.
- Two backbone variants: (a) **CNN-based** — 1D temporal convolutional U-Net over the action sequence, observations injected via **FiLM** conditioning. Better default; more robust to hyperparameters. (b) **Transformer-based** — time-series Diffusion Transformer, observation embedding enters via multi-head **cross-attention**. Better for high-frequency action changes or when the CNN's inductive bias over-smooths, but needs more tuning; increasing depth sometimes *hurt*.
- Noise schedule: square-cosine (iDDPM).
- Loss: standard ε-prediction MSE. Train with 100 DDPM steps; sample with **DDIM at 10 inference steps**, giving 0.1 s latency on an RTX 3080.

**Why receding horizon matters:** T_a trades off temporal action consistency (large T_a → smooth, committed, less reactive) against responsiveness (small T_a → reactive but jittery and prone to re-sampling a different mode mid-motion). This is exactly the same dial as ACT's chunk size, just named differently, and it recurs in every later system (π0.7's Ĥ ∈ {15,25} out of H=50).

**Training data:** 12–15 tasks across 4 benchmarks (Robomimic, Push-T, Multimodal Block Pushing, Franka Kitchen) plus real-robot UR5 and Franka stations, and in the extended journal version three bimanual tasks (egg beater, mat unrolling, shirt folding).

**Control frequency / action horizon:** 10 Hz policy commands, linearly interpolated to 125 Hz for the UR5. T_p = 16, T_a = 8.

**Limitations:** Iterative sampling is slow (this spawned the whole distillation line). No language conditioning, no internet pretraining, single-task/single-embodiment. Reactivity is bounded by T_a.

**Primary source:** *Diffusion Policy: Visuomotor Policy Learning via Action Diffusion*, Cheng Chi, Zhenjia Xu, Siyuan Feng, Eric Cousineau, Yilun Du, Benjamin Burchfiel, Russ Tedrake, Shuran Song, 2023 (RSS 2023; extended IJRR version 2025). arXiv:2303.04137. https://arxiv.org/abs/2303.04137
**Secondary sources:** http://diffusion-policy.cs.columbia.edu/
**Confidence:** high.

---

### Consistency Policy, one-step flow, and the sampling-speed line (2024–2026)

**Core idea:** Diffusion/flow action heads need many network evaluations per action chunk. Distill or reformulate them so one (or a few) evaluations suffice, without losing multimodality.

**Consistency Policy (2024):** Distills a pretrained Diffusion Policy teacher into a *consistency model* student that can be queried in 1 or 3 steps. Targets robots without high-end GPUs (mobile manipulators, quadrotors). Reported robust to teacher quality, which is practically important — you do not need an extensively tuned teacher. arXiv:2405.07503.

**One-Step Diffusion Policy (2024):** Distills multi-step diffusion into a one-step action generator, reported up to 62 Hz. arXiv:2410.21257.

**Flow matching as the successor formulation:** π0 replaced the diffusion framing with **conditional flow matching** on a straight (rectified/optimal-transport) path. Concretely (π0 §III, verified): sample ε ~ N(0, I), form the noisy chunk A_t^τ = τ·A_t + (1 − τ)·ε, and train v_θ(A_t^τ, o_t) to match the target vector field u(A_t^τ | A_t) = A_t − ε. Timestep τ is sampled from a **beta distribution weighted toward low (noisier) τ**. At inference, integrate from τ=0 to τ=1 with forward Euler, δ = 0.1 (10 steps). This is simpler than DDPM (no noise schedule to tune, straight-line paths) and empirically needs fewer steps — π0.6 and π0.7 run **5 steps**.

**2026 state:** *One-Step Flow Policy* (OFP, arXiv:2603.12480, Mar 2026) removes the need for a pretrained teacher entirely — from-scratch self-distillation combining a self-consistency loss (coherent transport across time intervals) with self-guided regularization toward high-density expert modes, plus a warm-start that exploits temporal action correlation to shorten the generative transport distance. Evaluated on 56 simulated manipulation tasks. Separately, *Flow Policy Gradients* (arXiv:2602.02481, Feb 2026) makes flow-matching policy gradients work for RL without likelihood computation, validated on legged locomotion, humanoid motion tracking, and manipulation with sim-to-real on two humanoids.

**The honest caveat:** frontier labs did not adopt one-step distillation. They instead reduced steps (10 → 5) and attacked *latency* rather than *step count*, via Real-Time Chunking. Distillation matters most for on-robot edge deployment, not for cloud-served frontier policies.

**Primary sources:** *Consistency Policy: Accelerated Visuomotor Policies via Consistency Distillation*, Aaditya Prasad, Kevin Lin, Jimmy Wu, Linqi Zhou, Jeannette Bohg, 2024. arXiv:2405.07503. https://arxiv.org/abs/2405.07503 · *One-Step Flow Policy: Self-Distillation for Fast Visuomotor Policies*, 2026. arXiv:2603.12480. https://arxiv.org/abs/2603.12480 · *Flow Policy Gradients for Robot Control*, 2026. arXiv:2602.02481. https://arxiv.org/abs/2602.02481
**Confidence:** high for the π0 flow-matching mechanics (read from the paper); medium for the relative importance of the distillation line in 2026 practice (inference from what frontier labs shipped, not a stated claim).

---

### RT-1 (2022)

**Core idea:** Scale multi-task behavior cloning with a transformer over a fixed-size dataset of real robot demonstrations, and make the action space discrete so the model can be trained as a next-token predictor.

**Problem it solved:** Prior multi-task robot models either had narrow task breadth (Gato) or did not generalize to new tasks. RT-1 showed that data *diversity* buys generalization, and that a transformer can be made fast enough for real-time control.

**Architecture (verified from the paper):**
- Inputs: 6-frame image history + natural-language instruction.
- **FiLM-conditioned EfficientNet** (language embedding modulates the vision backbone via FiLM) → 81 visual tokens per image → **TokenLearner** soft-selects them down to **8 tokens per image** → 48 tokens total across the 6-frame history.
- **Decoder-only transformer, 8 self-attention layers, 19M parameters** (35M total system) → action tokens.
- **Action tokenization:** each dimension discretized into **256 uniform bins**. 11 dimensions total: 7 for the arm (x, y, z, roll, pitch, yaw, gripper opening), 3 for the base (x, y, yaw), and 1 discrete mode variable (control arm / control base / terminate).

**Training data:** ~130k episodes, 700+ tasks, collected over 17 months with a fleet of 13 Everyday Robots mobile manipulators. Evaluated with 3,000 real-world trials.

**Control frequency / action horizon:** 3 Hz, single-step actions (no chunking).

**Limitations:** 3 Hz is far too slow for dexterous or contact-rich work. No internet-scale semantic knowledge. Single-step actions → full compounding-error exposure. 256-bin uniform quantization is coarse.

**Primary source:** *RT-1: Robotics Transformer for Real-World Control at Scale*, Anthony Brohan et al., 2022. arXiv:2212.06817. https://arxiv.org/abs/2212.06817
**Confidence:** high.

---

### RT-2 (2023)

**Core idea:** Don't bolt a robot head onto a VLM — express robot actions *as text* in the VLM's existing vocabulary, and co-fine-tune the VLM on a mixture of web VQA data and robot trajectories. The action becomes just another string the model can emit.

**Problem it solved:** RT-1 had no semantic knowledge from the web. RT-2 demonstrated *emergent* capabilities absent from robot data: generalization to novel objects, interpretation of commands never seen in robot training, and rudimentary chain-of-thought reasoning ("pick the object that could be used as a hammer").

**Architecture:** PaLI-X or PaLM-E backbone (up to 55B params). Actions are discretized and serialized into the text token stream, reusing rarely-used tokens as the action vocabulary. Loss is standard next-token cross-entropy. Co-fine-tuning (robot data mixed with the original web data, rather than fine-tuning only on robot data) is essential to retaining web knowledge — this is the ancestor of every "co-training" recipe since.

**Training data:** RT-1's robot dataset + web-scale vision-language data.

**Control frequency:** slow; large-model autoregressive decoding per action. `[UNVERIFIED exact Hz]`

**Limitations:** Throughput. Emitting each action as several autoregressively decoded text tokens, at every control step, from a multi-billion-parameter VLM, caps the control rate in the low single-digit Hz. Physical Intelligence's later verdict: this representation "is not suitable for high-frequency, precise, or fluent motions … it's a bit like controlling your arm by verbally saying which muscles should contract" (pi.website/research/knowledge_insulation). Closed weights.

**Primary source:** *RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control*, Anthony Brohan et al., 2023. arXiv:2307.15818. https://arxiv.org/abs/2307.15818
**Confidence:** high on the mechanism; medium on control frequency (not clearly stated).

---

### Open X-Embodiment / RT-X (2023)

**Core idea:** Pool robot datasets across labs into one standardized format (RLDS) and check whether a single model trained on all of it transfers positively across robots.

**Problem it solved:** Every robot lab had its own small dataset in its own format; nobody could test the "one model, many embodiments" hypothesis.

**Contents:** 1M+ real robot trajectories, **22 embodiments**, 21 institutions, **527 skills (160,266 tasks)**. RT-1-X and RT-2-X trained on the pool outperformed the corresponding single-embodiment models.

**Limitations:** Data quality is heterogeneous and, by 2026 consensus, largely low. The action spaces and control frequencies vary wildly across constituent datasets, so cross-embodiment "transfer" is partly an artifact of the normalization scheme. A 2026 critique from the ICLR-2026 VLA survey: "it's an open secret that OXE is mostly low-quality data, yet we still lack good methods to quantify data quality in imitation learning."

**Primary source:** *Open X-Embodiment: Robotic Learning Datasets and RT-X Models*, Open X-Embodiment Collaboration, 2023. arXiv:2310.08864. https://arxiv.org/abs/2310.08864
**Secondary sources:** https://robotics-transformer-x.github.io/ ; https://mbreuss.github.io/blog_post_iclr_26_vla.html
**Confidence:** high on dataset stats; the data-quality critique is one credible researcher's opinion, flagged as such.

---

### Octo (2024)

**Core idea:** An *open-source* generalist policy designed to be easy to fine-tune to new observation and action spaces — with a **diffusion** action head rather than discrete tokens.

**Architecture:** Transformer trained from scratch (27M "Octo-Small" and 93M "Octo-Base"). Observation tokens and task tokens (language *or* goal image) feed a block-wise-masked transformer; learned **readout tokens** attend to the sequence and feed a small diffusion head that produces the action chunk. The block-wise masking is what makes the model composable: new observation modalities or new task specifications can be added by inserting new token blocks without retraining the whole architecture.

**Training data:** 800k trajectories from Open X-Embodiment.

**Limitations:** No internet-scale vision-language pretraining (trained from scratch), so it is a *large behavior model* rather than a VLA under the stricter definition. Small by 2026 standards. Language following is weak relative to VLM-initialized models.

**Primary source:** *Octo: An Open-Source Generalist Robot Policy*, Octo Model Team (Dibya Ghosh, Homer Walke, Karl Pertsch, Kevin Black, Oier Mees, et al.), 2024. arXiv:2405.12213. https://arxiv.org/abs/2405.12213
**Secondary sources:** https://octo-models.github.io/
**Confidence:** high on architecture family; medium on exact head details (read from project page abstract, not full paper).

---

### OpenVLA (2024) and OpenVLA-OFT (2025)

**OpenVLA core idea:** An open 7B VLA replicating the RT-2 recipe on public data. Backbone is Prismatic-7B: LLaMA-2-7B with a *fused* DINOv2 + SigLIP vision encoder (the dual encoder is a deliberate choice — DINOv2 supplies spatial/geometric features, SigLIP supplies semantics). Actions are 7-dim (6-DoF delta EEF + gripper), each dim discretized into 256 bins, mapped onto the 256 least-frequently-used tokens of the LLaMA tokenizer, and emitted autoregressively.

**Training data:** 970k real robot episodes from Open X-Embodiment. Reported to beat the 55B RT-2-X by 16.5% absolute on 29 tasks with 7x fewer parameters.

**Its throughput problem, precisely:** every control step requires 7 sequential autoregressive decode passes through a 7B model. Practical control rates are in the single-digit Hz. This is the concrete form of "the discrete-action-token throughput problem."

**OpenVLA-OFT (2025) — the fix:** an optimized fine-tuning recipe with three components: (1) **parallel decoding** — replace autoregressive generation with a single forward pass producing all action tokens at once, using bidirectional attention over the action positions; (2) **action chunking** — predict multiple future timesteps per call; (3) **continuous actions with an L1 regression head** instead of discrete tokens. Plus FiLM language conditioning for better instruction following on bimanual setups. Result: LIBERO average 76.5% → **97.1%**, and **26x** higher action generation throughput. Deployed on a bimanual ALOHA for dexterous high-frequency tasks.

**Why OFT matters conceptually:** it isolates the three variables (parallel vs. autoregressive, chunked vs. single-step, continuous vs. discrete) that everything else conflates. Notably, plain L1 regression was competitive with a diffusion head *once chunking and parallel decoding were in place* — evidence that much of diffusion's advantage in prior comparisons came from the chunking it happened to be bundled with.

**Limitations:** OpenVLA base is single-image, no proprioception, no chunking. OFT is a fine-tuning recipe, not a new pretrained model.

**Primary sources:** *OpenVLA: An Open-Source Vision-Language-Action Model*, Moo Jin Kim, Karl Pertsch, Siddharth Karamcheti, Ted Xiao, et al., 2024. arXiv:2406.09246. https://arxiv.org/abs/2406.09246 · *Fine-Tuning Vision-Language-Action Models: Optimizing Speed and Success*, Moo Jin Kim, Chelsea Finn, Percy Liang, 2025. arXiv:2502.19645. https://arxiv.org/abs/2502.19645
**Secondary sources:** https://openvla.github.io/ ; https://openvla-oft.github.io/
**Confidence:** high on OFT numbers (from the abstract); medium on OpenVLA's exact deployed Hz.

---

### FAST / π0-FAST (2025)

**Core idea:** Tokenize action *chunks* in the frequency domain instead of per-dimension per-timestep.

**Problem it solved:** Naive binning is catastrophic at high control frequency. At 50 Hz, a_t and a_{t+1} are nearly identical, so the next-token objective is dominated by trivially predictable tokens and provides almost no learning signal for the parts that matter. The paper reports standard discretization "fails completely" on high-frequency dexterous data.

**Architecture / algorithm:**
1. Take the action chunk (H × action_dim matrix).
2. Apply a **discrete cosine transform** along the time axis, per dimension.
3. Quantize the DCT coefficients (most energy is in low frequencies; high-frequency coefficients quantize to zero).
4. Flatten and compress the resulting sparse integer sequence with **byte-pair encoding**.
The result is a short, information-dense token sequence that an autoregressive VLM can predict with an ordinary cross-entropy loss.

**FAST+:** a released *universal* tokenizer trained on 1M real robot action trajectories, usable as a black box across action spaces and control frequencies.

**Result:** combined with π0, matches diffusion-VLA performance on 10k hours of robot data while reducing **training time by up to 5x**.

**Limitations:** Inference is still autoregressive, so π0-FAST is roughly **2x slower to complete tasks** than the flow-matching π0 in head-to-head real-robot comparison (knowledge-insulation blog, "bussing" task). FAST's lasting importance turned out to be as a *training-time representation-learning objective* inside Knowledge Insulation, not as the deployed action decoder.

**Primary source:** *FAST: Efficient Action Tokenization for Vision-Language-Action Models*, Karl Pertsch, Kyle Stachowicz, Brian Ichter, Danny Driess, Suraj Nair, Quan Vuong, Oier Mees, Chelsea Finn, Sergey Levine, 2025 (RSS 2025). arXiv:2501.09747. https://arxiv.org/abs/2501.09747
**Secondary sources:** https://www.pi.website/research/fast ; https://www.pi.website/research/knowledge_insulation
**Confidence:** high.

---

### π0 (2024)

**Core idea:** Attach a **flow-matching action expert** to a pretrained VLM so the model inherits internet-scale semantics while producing continuous, high-frequency action chunks.

**Architecture (verified from arXiv:2410.24164v4 §III and §IV):**
- **Two sets of transformer weights in one model.** The first handles image and text tokens and is initialized from **PaliGemma (3B)**. The second, the **action expert**, is initialized from scratch and adds **300M parameters** — total 3.3B. This is a Mixture-of-Transformers, not an MLP head: the action expert is a full transformer whose tokens attend into the backbone's activations through shared attention.
- Observation o_t = [I¹_t, …, Iⁿ_t, ℓ_t, q_t]: 2 or 3 RGB images per robot, tokenized language, and proprioceptive state.
- Output A_t = [a_t, …, a_{t+H−1}] with **H = 50**.
- **Flow matching objective:** sample ε ~ N(0, I); form A_t^τ = τ·A_t + (1 − τ)·ε; regress v_θ(A_t^τ, o_t) onto the target field u = A_t − ε. Training timestep τ is sampled from a **beta distribution emphasizing low (noisier) τ**.
- Attention: the action expert uses a **full bidirectional mask** so all 50 action tokens attend to each other.
- Inference: forward Euler from τ=0 to τ=1, **10 integration steps** (δ = 0.1). The prefix (images/text/state) KV cache is computed once and only the action-token suffix is recomputed each step — this is why 10 steps is affordable.
- Ablation baseline: π0-small, 470M, no VLM initialization.

**Cross-embodiment handling:** a single padded action/state vector large enough for the widest robot; narrower robots zero-pad. Per-embodiment normalization statistics.

**Training data:** ~10,000 hours across 7+ robot configurations and 68 tasks (single-arm, dual-arm, mobile manipulators), plus the OXE mixture. Pre-training / post-training split mirrors LLM practice: broad pre-training then task-specific fine-tuning on curated high-quality data.

**Control frequency / action horizon:** up to **50 Hz**; H = 50 ≈ 1 second of actions; executed **synchronously** in the original release (finish the chunk, pause for inference, start the next) — which introduces off-distribution pauses that RTC later removed.

**Limitations:** Synchronous execution pauses. Language following is mediocre (the action-expert gradients degrade the backbone's language processing — the problem Knowledge Insulation diagnoses). Requires post-training fine-tuning for hard tasks; out-of-the-box laundry folding and box assembly were near-zero success until π0.6.

**Primary source:** *π0: A Vision-Language-Action Flow Model for General Robot Control*, Kevin Black, Noah Brown, Danny Driess, Adnan Esmail, Michael Equi, Chelsea Finn, Niccolo Fusai, Lachy Groom, Karol Hausman, Brian Ichter, Szymon Jakubczak, Tim Jones, Liyiming Ke, Sergey Levine, Adrian Li-Bell, Mohith Mothukuri, Suraj Nair, Karl Pertsch, Lucy Xiaoyang Shi, James Tanner, Quan Vuong, Anna Walling, Haohuan Wang, Ury Zhilinsky, 2024 (RSS 2025). arXiv:2410.24164. https://arxiv.org/abs/2410.24164
**Secondary sources:** https://www.pi.website/blog/pi0 ; https://github.com/Physical-Intelligence/openpi
**Confidence:** high (architecture details extracted directly from paper text).

---

### π0.5 (2025)

**Core idea:** Open-world generalization comes from **co-training on heterogeneous task types**, not from more robot data of the same kind.

**Problem it solved:** π0 was strong on tasks and scenes resembling its training data. π0.5 was the first end-to-end system shown to clean an entirely new kitchen or bedroom it had never seen.

**Architecture:** π0 skeleton (VLM backbone + flow-matching action expert), but the training mixture contains **hybrid multimodal examples** that interleave, in one sequence: image observations, language commands, object detections (bounding boxes), **semantic subtask prediction**, and low-level actions. The subtask prediction is what makes the model *internally hierarchical*: at inference, the model first predicts a high-level language subtask at low frequency ("pick up the plate"), then conditions the action expert on that subtask at high frequency. There is no separate planner model.

**Training data:** cross-embodiment in-house data, mobile and static data from real homes, high-level subtask prediction labels, and multimodal web data (VQA, bounding-box prediction, keypoint prediction). The ablation in the paper shows knowledge transfer from the non-action data is *essential* for the generalization result, not incremental.

**Control frequency / action horizon:** 50 Hz, H = 50.

**Limitations:** Still synchronous inference in the original release. Slower training convergence than π0-FAST until Knowledge Insulation was added. Weaker out-of-the-box dexterity than π0.6 (needed task-specific fine-tuning for laundry folding and box assembly to get above zero).

**Primary source:** *π0.5: a Vision-Language-Action Model with Open-World Generalization*, Physical Intelligence (Kevin Black, Noah Brown, James Darpinian, Karan Dhabalia, Danny Driess, Adnan Esmail, Michael Equi, Chelsea Finn, Niccolo Fusai, Manuel Y. Galliker, Dibya Ghosh, Lachy Groom, Karol Hausman, Brian Ichter, Szymon Jakubczak, Tim Jones, Liyiming Ke, Devin LeBlanc, Sergey Levine, Adrian Li-Bell, Mohith Mothukuri, Suraj Nair, Karl Pertsch, Allen Z. Ren, Lucy Xiaoyang Shi, Laura Smith, Jost Tobias Springenberg, Kyle Stachowicz, James Tanner, Quan Vuong, Homer Walke, Anna Walling, Haohuan Wang, Lili Yu, Ury Zhilinsky), 2025 (CoRL 2025). arXiv:2504.16054. https://arxiv.org/abs/2504.16054
**Secondary sources:** https://www.pi.website/blog/pi05
**Confidence:** high.

---

### Knowledge Insulation (2025) — the most load-bearing training trick in the modern recipe

**Core idea:** Train the VLM backbone with **discrete FAST action tokens** (cross-entropy) for representation learning, train the **action expert** with flow matching for the actions you actually execute, and **stop the action expert's gradients from flowing into the backbone**.

**Problem it solved:** Gradients from a from-scratch continuous-generative action expert corrupt the pretrained VLM's representations. Observable symptom: the robot stops attending to language. The paper's example — instructed to put a spoon in the dish container, the naive joint-trained model grabs the trash instead. Hypothesis: the VLM's language pathway is disrupted early in training, so the model latches onto easier visual correlations first and never recovers.

**Architecture:** VLM backbone (3B) + action expert (300M) with a **stop-gradient** at the interface. The action expert still *attends to* backbone activations in the forward pass; only the backward pass is severed. The backbone is supervised by (a) π0-FAST tokenized actions, (b) general web vision-language data, (c) robot planning / high-level subtask data.

**Why the FAST-token supervision is necessary:** the ablation shows that stop-gradient *alone* is not enough — with a fully frozen or fully insulated backbone that never sees robot data, the representations aren't adapted for motor control and the action expert cannot use them (the shirt-folding task is unsolvable in that configuration). The discrete action-token objective adapts the backbone for control *using a loss the backbone likes* (cross-entropy, matching its pretraining objective) instead of one it doesn't (continuous denoising).

**Results:** π0.5+KI reaches a given performance level on the bussing task in **7.5x fewer training steps** than π0, while retaining π0's fast flow-matching inference and beating both π0 and π0-FAST on in-distribution and OOD language following. Co-training on web data gives the largest single boost to object generalization.

**Why this matters for the app's taxonomy:** "discrete tokens vs. continuous actions" stopped being a fork in 2025. The modern answer is *both, in different places, with a gradient barrier between them*. Any comparison matrix that forces a binary choice on this axis will misrepresent every frontier model from π0.5 onward.

**Primary source:** *Knowledge Insulating Vision-Language-Action Models: Train Fast, Run Fast, Generalize Better*, Danny Driess, Jost Tobias Springenberg, Brian Ichter, Lili Yu, Adrian Li-Bell, Karl Pertsch, Allen Z. Ren, Homer Walke, Quan Vuong, Lucy Xiaoyang Shi, Sergey Levine, 2025 (NeurIPS 2025). arXiv:2505.23705. https://arxiv.org/abs/2505.23705
**Secondary sources:** https://www.pi.website/research/knowledge_insulation
**Confidence:** high.

---

### Real-Time Chunking / RTC (2025) and training-time RTC (2025)

**Core idea:** Treat the transition between consecutive action chunks as an **inpainting** problem on the flow/diffusion trajectory.

**Problem it solved:** With action chunking there are only two bad options. *Synchronous* execution: finish the chunk, stop, infer, start the next — introducing pauses that are absent from training data, look wrong, slow the robot down, and discourage scaling the model. *Naive asynchronous* execution with temporal-ensemble smoothing: catastrophic, because averaging two chunks sampled from different modes of the action distribution yields an action in neither mode. PI documents this failing outright at +100 ms and +200 ms.

**Algorithm:** Suppose inference takes d controller timesteps. The first d actions of the new chunk can never be executed (that time will already have passed), so **freeze** them to the values from the previous chunk that *will* have been executed. Then, for the remaining overlap between the old and new chunk, apply **partial attention** — softly bias the new chunk toward the old one, more strongly for earlier timesteps — and let the model generate the rest freely. Diffusion and flow models are natively good at inpainting, so **no training-time changes are required**; RTC drops onto π0 and π0.5 as-is.

**Results:** RTC throughput is **flat from +0 ms to +200 ms** injected delay, while synchronous execution degrades and temporal ensembling collapses entirely. On a mobile manipulator, typical measured total latency was 139 ms (97 ms model, 21 ms network, 11 ms image resize, 9.7 ms other); on a static robot 108 ms. RTC completed precise dynamic tasks (striking a match, plugging in Ethernet) at >300 ms delay. Beyond speed, RTC also improved *precision*, because the synchronous pauses change the robot's dynamics in a way the model does not model.

**Follow-up:** a training-time version (arXiv:2512.05964, Dec 2025) that conditions on the in-flight actions during training. π0.7 uses this, simulating delays of 0–12 timesteps, i.e. a maximum tolerated inference latency of **240 ms on a 50 Hz robot**.

**Primary sources:** *Real-Time Execution of Action Chunking Flow Policies*, Kevin Black, Manuel Y. Galliker, Sergey Levine, 2025. arXiv:2506.07339. https://arxiv.org/abs/2506.07339 · *Training-Time Action Conditioning for Efficient Real-Time Chunking*, 2025. arXiv:2512.05964. https://arxiv.org/abs/2512.05964
**Secondary sources:** https://www.pi.website/research/real_time_chunking
**Confidence:** high.

---

### π0.6 (Nov 2025) and π*0.6 / Recap

**π0.6 architecture (verified from the official model card PDF):**
- Vision-language backbone initialized from **Gemma3 4B**, with a **SigLIP 400M** vision encoder.
- **Action expert with the same number of layers as the backbone, ~860M parameters.**
- Up to **four 448×448 images** per step (base camera, up to two wrist cameras, optional rear camera for mobile manipulators).
- Image tokens ‖ tokenized language prompt ‖ tokenized proprioceptive state.
- **Attention pattern:** bidirectional among all image tokens; **causal** among text tokens; bidirectional among action tokens in the expert.
- Trained with **Knowledge Insulation**: backbone predicts FAST action tokens and co-training examples (multimodal web data); action expert predicts continuous actions; **no gradient flows from expert to backbone**.
- Optional **conditioning metadata** in the prompt modulating *how* the task is performed.
- **Inference: 5 denoising steps, 3 cameras → 63 ms per action chunk on a single H100.**
- Preserves π0.5's hierarchical design: low-frequency subtask prediction, high-frequency action generation.

**π0.6 headline result:** removes the need for task-specific post-training on several tasks. Out of the box (no fine-tuning) it folds laundry reliably and fully assembles a box 20% of the time — both were near-zero for π0.5 without fine-tuning.

**Recap (π*0.6) core idea:** three-stage learning mirroring how a person learns a manual skill — **demonstrations** (define the behavior), **coaching** (expert teleoperator takes over mid-rollout to correct the mistakes the policy actually makes), and **practice** (RL from autonomous experience).

**Recap mechanism:**
1. **Offline-RL pretraining** of the base model — replaces the supervised pretraining used for π0.5/π0.6.
2. **Value function.** Train a language-conditioned distributional value function predicting (negative) steps-to-completion. This solves the *credit assignment* problem that motivates the whole method: if a portafilter is grasped at a bad angle and the insertion fails 20 seconds later, the mistake was the grasp, and only a value function can attribute it there.
3. **Advantage-conditioned policy extraction.** Rather than a policy-gradient update, Recap computes the advantage (n-step change in value), **binarizes it**, and feeds it to the VLA as a conditioning input in the prefix. All data — good and bad — stays in training; the model is simply told which is which. At execution time you condition on "high advantage." The theoretical basis is the KL-regularized RL solution π̂(a|o) ∝ π_ref(a|o)·exp(A(o,a)/β), realized as conditioning rather than reweighting. This is what makes RL scalable to a 5B flow-matching VLA.
4. **Fine-tune per task** on demonstrations, then continue with on-robot corrections and autonomous rollouts.

**Results:** espresso-making throughput and success rate both **more than doubled**; failure rates cut by 2x or more on the hardest tasks; >90% success on all three applications. Demonstrated continuous operation: espresso 5:30am–11:30pm, 50 novel laundry items in a new home, 59 real packaging boxes in a factory.

**Limitations:** Closed weights. Requires a fleet, real reward labeling, and human interveners. Recap targets long-horizon throughput; it is *not* the right tool for improving a single millisecond-scale contact-rich phase (that's RL Tokens).

**Primary sources:** *π0.6 Model Card*, Physical Intelligence, November 17, 2025. https://website.pi-asset.com/pi06star/PI06_model_card.pdf · *π*0.6: a VLA that Learns from Experience*, Physical Intelligence team, 2025. https://www.pi.website/download/pistar06.pdf
**Secondary sources:** https://www.pi.website/blog/pistar06
**Confidence:** high (architecture read verbatim from the model card).

---

### MEM — Multi-scale Embodied Memory (Mar 2026)

**Core idea:** Give a VLA two memory systems at two timescales and two levels of abstraction, and let the model decide what to write down.

**Problem it solved:** Long tasks need state that isn't visible in the current frame — which cabinet you already cleaned, how long the sandwich has been grilling, where you put the lid. Keeping full raw observation history in context is infeasible at control rates; discarding it produces nonsensical behavior. Worse, naive memory *hurts*: it amplifies **causal confusion**, where the policy learns to predict the next action from its own action history rather than from the scene (the classic pathology of history-conditioned BC, cited in the post as arXiv:1905.11979).

**Architecture:**
- **Short-term memory:** an efficient video encoder that extends a standard ViT by **interleaving sparse spatial attention with causal temporal attention** — roughly every 4th layer, temporal attention connects the same spatial positions across timesteps. History tokens are **dropped in the upper layers** of the ViT to compress the sequence before it reaches the VLA backbone. Fixed token budget regardless of history length.
- **Long-term memory:** natural-language notes authored by the model itself. MEM extends π0.5's chain-of-thought-like high-level subtask inference so that the same low-frequency step also emits a **textual memory update**, which becomes input at future steps. The model learns to *summarize* ("pick up the yellow plate" then "pick up the green plate" collapses to "I picked up the plates") and to choose the right granularity, keeping context bounded.

**Results:** Tasks requiring up to **15 minutes** of memory (grilled cheese from scratch, taking out recipe ingredients, cleaning a whole kitchen). Ablations show text-only and video-only memory each underperform the combination, and naive text+video underperforms MEM. Emergent **in-context adaptation**: without memory, a failed chopstick grasp is retried identically forever; with memory, the model changes strategy after observing its own failure. Same for discovering which way a fridge door opens.

**Limitations:** Closed. Built on π0.6.

**Primary source:** *VLAs with Long and Short-Term Memory* (MEM), Marcel Torne, Karl Pertsch, Homer Walke, Kyle Vedder, Suraj Nair, Brian Ichter, Allen Ren, Haohuan Wang, Jiaming Tang, Kyle Stachowicz, Karan Dhabalia, Michael Equi, Quan Vuong, Jost Tobias Springenberg, Sergey Levine, Chelsea Finn, Danny Driess, March 3, 2026. https://www.pi.website/download/Mem.pdf
**Secondary sources:** https://www.pi.website/research/memory
**Confidence:** high (blog is detailed and primary); no arXiv ID found as of 2026-08-06.

---

### RL Tokens / RLT (Mar 2026)

**Core idea:** Instead of RL-fine-tuning the whole VLA, train the VLA to emit a compact **RL token** summarizing its internal state, and run a tiny actor-critic on that token — small enough to train **on-robot in real time**.

**Problem it solved:** Recap improves long-horizon throughput with fleet-scale data. But the hardest parts of manipulation are short, contact-rich, sub-millimeter phases (aligning a screwdriver tip with an M3 screw, inserting Ethernet). You want to fix *just that phase*, from minutes of data, possibly during deployment. Full-model RL is too slow.

**Architecture:**
- Add an **encoder-decoder transformer** to the VLA trained with a **reconstruction loss**: the encoder compresses the VLA's internal embeddings to a single RL token; the decoder must reconstruct the original embeddings from it. The bottleneck forces the token to retain the control-relevant information. Frozen after training.
- A small **actor and critic** consume the RL token and are trained with sample-efficient off-policy RL, at **hundreds of updates per second** directly on the robot.
- Four design choices make it work: (1) the RL policy predicts **action chunks**, matching the VLA's action structure rather than acting per control step; (2) the actor receives the **VLA's predicted action as input** so it learns to *edit* rather than replace; (3) the update is **regularized toward that reference action**, so exploration stays near the VLA prior and deviates only where the critic sees gain; (4) **reference-action dropout** prevents the actor from degenerating into a copy of the VLA. Human interventions can optionally be folded into the RL update.

**Results:** Up to **3x** speedup on the most precise phase across four tasks (M3 screw driving with an electric screwdriver, zip-tie fastening, Ethernet insertion, power-cord insertion). Ethernet insertion: base model median 228 timesteps, human teleop median 146, RLT median **66** — half of RLT trials were faster than *any* teleoperated demonstration in the dataset. Trained from **15 minutes of robot data** (2 hours wall-clock including resets).

**Limitations:** Closed. Improves a targeted phase, not the whole task. Requires a reward signal for that phase.

**Primary source:** *Precise Manipulation with Efficient Online RL* (RL Tokens), Charles Xu, Jost Tobias Springenberg, Michael Equi, Ali Amin, Adnan Esmail, Sergey Levine, Liyiming Ke, March 19, 2026. https://www.pi.website/download/rlt.pdf
**Secondary sources:** https://www.pi.website/research/rlt
**Confidence:** high; no arXiv ID found.

---

### π0.7 (Apr 2026) — current Physical Intelligence frontier

**Core idea:** Generalization is limited by *underspecified prompts*, not by model capacity. Train the model with rich, diverse, multimodal context describing not just *what* to do but *how*, and heterogeneous/suboptimal data becomes usable instead of harmful.

**Architecture (verified from the π0.7 PDF, §IV and §VI-B):**
- **~5B total parameters**: Gemma3 4B VLM backbone (including a 400M vision encoder) + **860M flow-matching action expert**.
- Builds directly on the **π0.6 + MEM** architecture. The vision encoder follows the MEM video-history design (interleaved temporal and spatial compression, fixed token count regardless of history length).
- **State encoding change from π0.6:** π0.6 discretized proprioceptive state into text tokens; π0.7 follows MEM and embeds state with a **linear projection** into the backbone dimension. Each history state is its own token, masked out if the corresponding frame is dropped.
- **Action expert:** 860M transformer, flow matching, **adaptive RMSNorm** to inject the flow timestep. **50 action tokens**, bidirectional among themselves, also attending to the VLM backbone activations.
- Trained with **Knowledge Insulation** (backbone supervised with FAST tokens, gradients from the expert stopped).
- **Training-time RTC** with simulated delays of 0–12 timesteps → tolerates up to **240 ms** inference latency on a 50 Hz robot.
- **Inference: 5 denoising steps for the 50-step chunk, execute Ĥ ∈ {15, 25} steps.** Most robots at 50 Hz, some at 20 Hz. Optional classifier-free guidance on the context.

**The prompt/context C_t — this is the actual contribution.** Every training example carries a context, with each component randomly dropped out so any subset works at test time:
1. **Task instruction ℓ** ("clean the kitchen") and **subtask instruction ℓ̂** ("open the fridge door"), the latter produced at test time by a learned high-level policy or by a human coaching live.
2. **Episode metadata:** execution quality score, speed, mistake flag, desired episode length. At test time these are set to the ideal values (quality 5, mistake false). This is what makes suboptimal autonomous data safe to train on — label it as low quality and the model learns it as the "low quality" mode rather than as the target behavior.
3. **Control modality label:** joint vs. end-effector control.
4. **Multi-view subgoal images** g_t = [G¹_t, …, Gⁿ_t]: the desired near-future image for each camera. Base-view subgoals specify environment/object outcomes; wrist-view subgoals specify arm/gripper outcomes. At runtime these are generated by a **lightweight world model** initialized from the **BAGEL** image-generation model, refreshed when the semantic intent changes or after Δ = 4 s, whichever comes first, in an **asynchronous** thread so VLA inference never blocks on it.

**Headline results:**
- **Compositional generalization.** Operating kitchen appliances never demonstrated. Zero-shot prompted, the model makes a partial attempt at loading a sweet potato into an air fryer; with step-by-step **language coaching** it succeeds; the coaching transcripts are then used to fine-tune a high-level policy that generates the subtasks autonomously — the robot has *learned the task from language*, with **zero additional teleoperation**. The authors traced the nearest training data to two episodes of a robot *closing* an air fryer plus generic DROID Franka data.
- **Cross-embodiment transfer.** Trained on laundry folding with a static bimanual robot, evaluated zero-shot on a **bimanual UR5e** with Robotiq grippers (heavy, high-inertia, imprecise, and among the most underrepresented embodiments in training). Success rate **matched the zero-shot success rate of expert human teleoperators** (mean 375 hours of experience) attempting the task on the UR5e for the first time.
- **Specialist distillation.** By training on the autonomous data produced during Recap training, annotated with strategy metadata, the *single* π0.7 model matches or exceeds the task-specific RL-trained π*0.6 specialists on laundry, espresso, and box building — in both success rate and throughput.

**Limitations:** Closed weights. Requires a world model and a high-level policy at runtime. Compositional generalization is described by the authors as "initial signs" / "first signs," not a solved capability — the zero-shot air fryer attempt fails without coaching.

**Primary source:** *π0.7: a Steerable Model with Emergent Capabilities*, Physical Intelligence (Bo Ai, Ali Amin, … Sergey Levine, Chelsea Finn, Karol Hausman, Danny Driess, et al. — ~80 authors), April 16, 2026. https://www.pi.website/download/pi07.pdf
**Secondary sources:** https://www.pi.website/blog/pi07
**Confidence:** high (architecture read directly from the PDF); no arXiv ID as of 2026-08-06.

---

### Gemini Robotics 1.0 / 1.5 / 2 (2025–2026)

**Gemini Robotics 1.0 (Mar 2025):** Gemini 2.0-based VLA plus **Gemini Robotics-ER**, an embodied-reasoning VLM specialized for spatial understanding, pointing, grasp proposal, and trajectory prediction. arXiv:2503.20020.

**Gemini Robotics 1.5 (Oct 2025) — three claimed innovations:**
1. **Motion Transfer (MT)** — a new architecture and training recipe letting one model learn from heterogeneous multi-embodiment data and transfer motion knowledge between very different robots. Ablations show single-embodiment and multi-embodiment-without-MT both underperform MT.
2. **Interleaved thinking.** The VLA emits a natural-language "thinking" trace *between* action chunks. The paper's explanation of why this helps: it decomposes the hard cross-modal translation (multi-step instruction → low-level actions) into two easier stages — (a) instruction → short-horizon language commands ("move gripper to the left so that it is closer to the clothes"), which leverages the VLM backbone's visual-linguistic strength, and (b) short-horizon language → actions, a simpler mapping. Measured gains are largest on multi-step tasks (e.g. sorting clothes by color). Secondary benefit: interpretability — you can read what the robot intends to do next.
3. **Gemini Robotics-ER 1.5** — SOTA embodied reasoning with a tunable *thinking budget*, used as the high-level orchestrator.

**Robot data:** ALOHA 2, bi-arm Franka, and Apptronik Apollo humanoid, plus public text/image/video. Notably, **>90% of evaluation episodes during development were run in MuJoCo simulation**, with the team validating rank-consistency between sim and real; this is a significant methodological point that other labs do not report.

**Gemini Robotics 2 (Jul 30, 2026) — three models:**
- **Gemini Robotics 2** (VLA): first Gemini model to control a **full humanoid from feet to fingertips**, dynamically managing center of gravity so the robot can step, squat, and bend rather than reaching from a static base. Also drives the **22-DoF five-fingered SharpaWave hand** on Apptronik Apollo 2 and standard parallel grippers on a Franka Duo. **Same checkpoint** across Apollo 2 + SharpaWave, Apollo 2 + Inspire hands, and Franka Duo + Robotiq.
- **Gemini Robotics ER 2**: high-level agent — plans multi-minute, hundreds-of-decision tasks, tracks progress, detects task start/end and key event moments, self-corrects, and coordinates **multiple heterogeneous robots**. Available in Google AI Studio and Gemini Enterprise Agent Platform (private preview).
- **Gemini Robotics On-Device 2**: runs locally; natively multi-embodiment; inherits Motion Transfer; adapts to a **new bi-arm embodiment in a few hours with typically <200 examples**, even across drastically different shapes, sensors, and DoF (demonstrated on Dexmate, SO-101, Trossen).

**Reported success rates (Gemini Robotics 2, worth quoting honestly):** whole-body manipulation on Apollo + Inspire — pick from table 68.4%, from floor 45.7%, from shelf 76.3%. Multi-finger dexterity on Apollo + Sharpa — unscrew bulb 92%, tie trash bag 44%, ziplock 40%, dustpan 32%, screw bulb 36%. Gripper dexterity on Franka Duo — general pick-and-place 74.2%, diverse tool kitting 78.9%, precise insertion 89.6%. DeepMind's own framing: "multi-finger dexterous manipulation remains challenging."

**Safety:** new **ASIMOV-Agentic** benchmark for agentic safety orchestration — measures whether the ER agent refuses unsafe tool calls from the VLA, predicts task feasibility, and proactively asks for human help when uncertain. A separate safety technical report is published.

**Limitations:** **No published architecture.** Neither the 1.5 report nor the 2 blog discloses action representation, chunk size, control frequency, action head type, or parameter counts. Motion Transfer is named but not specified. Weights closed; ER available via API, VLA and On-Device by early-access partnership only. No arXiv report for Gemini Robotics 2 as of 2026-08-06 (blog + safety PDF only).

**Primary sources:** *Gemini Robotics: Bringing AI into the Physical World*, Gemini Robotics Team, 2025. arXiv:2503.20020. https://arxiv.org/abs/2503.20020 · *Gemini Robotics 1.5: Pushing the Frontier of Generalist Robots with Advanced Embodied Reasoning, Thinking, and Motion Transfer*, Gemini Robotics Team, 2025 (v3, 28 Nov 2025). arXiv:2510.03342. https://arxiv.org/abs/2510.03342 · *Gemini Robotics 2 brings whole body intelligence to robots*, Carolina Parada, Google DeepMind, July 30, 2026. https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/
**Secondary sources:** https://deepmind.google/models/gemini-robotics/vla/ ; https://storage.googleapis.com/deepmind-media/gemini-robotics/Gemini-Robotics-2-Safety.pdf ; https://huggingface.co/datasets/google/asimov_agentic ; https://ai.google.dev/gemini-api/docs/robotics-overview
**Confidence:** high on capabilities and success rates (from official sources); **low on architecture** — deliberately undisclosed.

---

### NVIDIA Isaac GR00T N1 → N1.7 (2025–2026)

**GR00T N1 (Mar 2025) core idea:** An **open** foundation model for generalist humanoid robots with a dual-system design: a VLM backbone for perception/language and a **flow-matching diffusion-transformer (DiT) action head** that denoises continuous actions, coupled by cross-attention.

**GR00T N1.7 (Apr 2026 release, GA; current as of Aug 2026) — verified from the repo README:**
- **VLM backbone: `nvidia/Cosmos-Reason2-2B`** (Qwen3-VL architecture), replacing the Eagle backbone used in N1.6. Supports flexible resolution and encodes images in native aspect ratio without padding. Gated model on Hugging Face.
- **Action head: flow-matching DiT**, reduced from 32 to **16 diffusion layers** vs. N1.6.
- **State/action dimensions expanded from 29 to 132**; **`action_horizon` expanded from 16 to 40**.
- **Relative end-effector action space** shared across robot *and human* embodiments — deltas from the current pose rather than absolute targets. The README calls this "a key factor in the model's cross-embodiment performance."
- **Pretrained on 20,000 hours of EgoScale human video** alongside diverse robot demonstrations. The shared relative-EEF representation is what makes this direct rather than requiring a domain-adaptation trick.
- Base checkpoint `nvidia/GR00T-N1.7-3B`, **3B parameters**; inference needs a single 16 GB+ GPU (RTX 4090, L40, H100, Jetson AGX Thor/Orin, DGX Spark).
- **`EmbodimentTag`** system handles cross-embodiment; data uses a GR00T flavor of the **LeRobot v2** format with a `meta/modality.json` describing state/action/video structure.
- CLI distinguishes `--action-horizon` (predicted) from **`--execution-horizon`** (executed per policy call) — the ACT/Diffusion-Policy T_a dial, made explicit.
- **Whole-body control** via the `UNITREE_G1_SONIC` embodiment tag and the GEAR-SONIC controller: **the VLA predicts compact latent action tokens that a learned whole-body controller decodes into full-body joint commands** (legs, arms, hands). A single language-conditioned policy produces coordinated manipulation and locomotion.
- Full ONNX + TensorRT export path for deployment.
- Also available through Hugging Face LeRobot as the `groot` policy type.

**Licensing:** Code **Apache 2.0**; **weights under the NVIDIA Open Model License**. The README states N1.7 is "fully commercially licensable under Apache 2.0."

**Also released:** the **NVIDIA Isaac GR00T Reference Humanoid Robot** (May 31, 2026) — an open humanoid reference design combining a Unitree H2 Plus, Sharpa five-fingered hands, and Jetson Thor.

**Limitations:** Only GR00T N1 has a paper; N1.5/N1.6/N1.7 are documented via repo README and release notes, so architectural provenance is thinner than for the π-family. The README says N1.7 delivers "comparable performance to N1.6" with improved generalization and language following — i.e. the backbone swap was not a capability jump.

**Primary sources:** *GR00T N1: An Open Foundation Model for Generalist Humanoid Robots*, NVIDIA et al. (Johan Bjorck, …, Yuke Zhu), 2025. arXiv:2503.14734. https://arxiv.org/abs/2503.14734 · https://github.com/NVIDIA/Isaac-GR00T (N1.7 README, retrieved 2026-08-06)
**Secondary sources:** https://developer.nvidia.com/isaac/gr00t ; https://github.com/NVlabs/GR00T-WholeBodyControl ; https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design
**Confidence:** high for N1.7 specifics (read from the repo README); high for N1 paper.

---

### Figure Helix and Helix 02 (2025–2026)

**Helix (Feb 2025):** "System 1 / System 2" VLA for humanoid upper-body control from pixels. S2 is a VLM doing slow semantic reasoning and emitting latent goal vectors; S1 is a fast visuomotor transformer conditioned on those latents producing upper-body joint targets. figure.ai/news/helix.

**Helix 02 (Jan 27, 2026) — adds System 0:**
- **S2** — semantic reasoning layer. Interprets scenes, understands language, sequences behaviors, emits latent goals. Scope expanded from "pick up the ketchup" to "walk to the dishwasher and open it."
- **S1** — visuomotor policy, a transformer conditioned on S2 latents, running at **200 Hz**. Now **"all sensors in, all joints out"**: inputs are head cameras, **palm cameras**, **fingertip tactile sensors**, and full-body proprioception; outputs are **complete joint-level targets for the entire robot** — legs, torso, head, arms, wrists, individual fingers.
- **S0** — a foundation model for human-like whole-body control, running at **1 kHz**. **10M parameters**; takes full-body joint state and base motion, outputs joint-level actuator commands. Trained on **over 1,000 hours of joint-level retargeted human motion data** plus sim-to-real RL across **200,000+ parallel simulation environments** with heavy domain randomization. Figure states S0 **replaced 109,504 lines of hand-engineered C++**.

**Why the S0 idea is interesting architecturally:** rather than engineering separate reward functions for walking, turning, crouching, and reaching, S0 learns a single prior over *how humans move while balancing* by tracking retargeted human motion. Higher layers then never have to reason about balance or footsteps.

**Headline result:** a **4-minute continuous autonomous** dishwasher load/unload across a full-sized kitchen — **61 loco-manipulation actions** in order, with implicit error recovery, no resets and no human intervention. Uses the whole body as a tool: closes a drawer with its hip, lifts the dishwasher door with its foot when hands are occupied. Tactile sensors detect forces as small as 3 grams.

**Limitations:** No paper, no weights, no quantitative success rates published, no baselines. Everything is from a company blog post with videos. Treat all claims as vendor-reported. Figure separately ran an 8-hour autonomous factory-shift livestream (May 2026), reported by third parties.

**Primary source:** *Introducing Helix 02: Full-Body Autonomy*, Figure AI, January 27, 2026. https://www.figure.ai/news/helix-02
**Secondary sources:** https://www.figure.ai/news/helix ; https://en.wikipedia.org/wiki/Figure_AI
**Confidence:** medium — architecture description is specific and plausible, but there is no paper, no external replication, and no reported success rates.

---

### AgiBot GO-1 (2025) and GO-2 (2026)

**GO-1 (Mar 2025) core idea:** **ViLLA** — Vision-Language-**Latent**-Action. Insert a **latent action token** between the VLM and the low-level action head. Because latent actions can be inferred from *unlabeled* video (human or robot), this lets the model absorb video data that has no action labels. Open-sourced. Associated dataset/platform: AgiBot World Colosseo (arXiv:2503.06669).

**GO-2 (Apr 2026) core idea:** Close the "semantic-actuation gap" — the observation that in standard VLAs, high-level reasoning signals and motor commands are disconnected, so control modules bypass the reasoning and errors accumulate over long horizons. Two mechanisms:
1. **Action chain-of-thought.** Instead of mapping instructions directly to raw motor commands, GO-2 first generates a high-level sequence of *action intents* as a macro plan, then executes it stage by stage.
2. **Asynchronous dual-system.** A **low-frequency semantic planning module** ("general commander") emits structured high-level action sequences with progressive refinement, providing "stable geometric anchors" for control. A **high-frequency action-following module** ("agile executor") receives those intents, combines them with real-time observations, and performs **residual refinement** against environmental noise. During training a **teacher-forcing** mechanism makes the executor robust to "approximately correct but imperfect" reasoning.

**Reported results (vendor):** LIBERO average 98.5% (first across spatial/object/goal/long); LIBERO-Plus 86.6% zero-shot under disturbances; VLABench average 47.4; Genie Sim 3.0 sim-to-real 82.9% real-world success trained on simulation data only. Claimed to outperform π0.5 and GR00T.

**Also:** the OpenClaw / RoboClaw memory-and-agentic-framework line (arXiv:2603.11558, Mar 2026) — a VLM-driven agent unifying data collection, policy learning, and execution, with "Entangled Action Pairs" coupling forward behaviors with inverse recovery actions to form self-resetting loops for autonomous data collection.

**Limitations:** GO-2 weights are not open (GO-1 was). No architecture paper for GO-2. LIBERO at 98.5% is not meaningful evidence of frontier capability given benchmark saturation.

**Primary sources:** *AgiBot World Colosseo: A Large-scale Manipulation Platform for Scalable and Intelligent Embodied Systems*, 2025. arXiv:2503.06669. https://arxiv.org/abs/2503.06669 · https://agibot-world.com/blog/go1 · https://www.agibot.com/article/231/detail/56.html
**Secondary sources:** https://www.therobotreport.com/agibot-releases-go-2-foundation-model-embodied-ai/ ; arXiv:2603.11558
**Confidence:** medium for GO-1 (open, documented); **low-medium for GO-2** — all technical description is from vendor press material with no paper and no independent evaluation.

---

### Skild AI (2025–2026)

**Claimed idea:** an "omni-bodied" general-purpose robot brain — one foundation model unifying perception, planning, and control across arbitrary robot bodies, with real-time adaptability. Raised ~$1.4B (Jan 2026, led by SoftBank, with NVIDIA and Bezos Expeditions) at a >$14B valuation.

**What is publicly verifiable:** essentially nothing technical. No paper, no weights, no benchmark results, no architecture disclosure. The public material is company blog and press coverage.

**Primary source:** https://www.skild.ai/blogs/building-the-general-purpose-robotic-brain
**Secondary sources:** https://www.businesswire.com/news/home/20260114335623/en/ ; https://www.therobotreport.com/skild-ai-raises-1-4b-building-omni-bodied-robot-brain/
**Confidence:** low. Include in the atlas only as a market/landscape entry, not as a technical method. `[UNVERIFIED architecture]`

---

### World-Action Models (WAMs) — the 2026 second bet

**Core idea:** Instead of initializing a policy from a **VLM**, initialize it from a pretrained **video generation / world model**. The hypothesis: video models are trained to map text descriptions to *visual change over time*, which is much closer to what a policy needs than static image-text alignment. If so, the remaining **video→action** gap is smaller than the **language→action grounding** gap that VLAs must close from scarce robot data.

**Design space (three axes, from the NVIDIA taxonomy):**
1. **Paradigm** — what is predicted and how actions are derived:
   - *Inverse dynamics*: generate future frames/latents, then infer the actions that produce that transition. (UniPi 2023, VPP, mimic-video, LingBot-VA)
   - *Joint prediction*: emit video and actions together from one model. (DreamZero, Cosmos Policy)
   - *Representation-only*: use the video backbone purely as a feature extractor and skip video generation at inference. (Fast-WAM)
2. **Action integration** — default action tokens / action-as-image (image-shaped targets the video model natively denoises, e.g. GENIMA, Cosmos Policy) / latent actions and plans (Play-LMP, LAPA, Being-H0.7).
3. **Architecture** — monolithic DiT / Mixture-of-Transformers with modality-specific experts sharing attention / hierarchical video-module-then-action-module.

**Selected 2026 models:** DreamZero (joint prediction, monolithic DiT on Wan-14B, NVIDIA, arXiv:2602.15922), Cosmos Policy (joint prediction, action-as-image, Cosmos backbone, arXiv:2601.16163), LingBot-VA (inverse dynamics, MoT, Wan 2.2-5B, Ant Group, arXiv:2601.21998), Fast-WAM (representation-only, MoT, Wan 5.5B, arXiv:2603.16666), Being-H0.7 (latent joint prediction, MoT from scratch on 200k+15k hours, arXiv:2605.00078), Sereact Cortex 2.0 (arXiv:2604.20246), mimic-video (arXiv:2512.15692).

**The costs, quantified:**
- **Inference:** two common WAM modes (joint prediction and inverse dynamics with full video generation) take **590–800 ms per action chunk**, versus roughly **190 ms for π0.5** — a **3–4x slowdown**. Fast-WAM's answer is to skip video generation entirely at inference.
- **Training:** video token sequences are ~10x longer than VLA sequences. Rough dense-core estimates: DreamZero-style action tuning ≈ 9 ZFLOPs; an illustrative full Wan-14B video-pretraining + WAM stack ≈ **51 ZFLOPs**, versus **6.9 ZFLOPs** for an efficient full VLA recipe (VLA Foundry) — a ~7.4x gap. Treat these as order-of-magnitude, not budgets.
- **Data quality:** DreamZero argues stronger video generation directly translates to stronger policy performance, so WAMs inherit video-data curation, captioning, and filtering as part of the policy recipe. VLAs show no such clean link — VLM4VLA (arXiv:2601.03309) finds generic VLM benchmark performance is a *poor predictor* of downstream VLA performance.

**Evidence it might be working:** DreamZero reported **1750 Elo on RoboArena**, above π0.5 at 1622. The π-family's own results point the same direction from the other side: π0.7 finds that conditioning on generated **visual subgoals** improves language following and speeds convergence, which is the WAM hypothesis expressed inside a VLA.

**Honest framing for the app:** the taxonomy is genuinely unsettled. The blog author's own position — "the winner is neither pure VLA nor pure WAM, but a hybrid of both." Treat WAM vs VLA as an *open contest*, not a resolved succession.

**Primary source:** *Pretrained to Imagine, Fine-Tuned to Act: The Rise of World-Action Models*, Moritz Reuss (Seattle Robotics Lab, NVIDIA), June 15, 2026. https://developer.nvidia.com/blog/pretrained-to-imagine-fine-tuned-to-act-the-rise-of-world-action-models/
**Secondary sources:** *World Model for Robot Learning: A Comprehensive Survey* (NTU), arXiv:2605.00080, https://ntumars.github.io/wm-robot-survey/ ; UniPi (NeurIPS 2023) ; Video Prediction Policy arXiv:2412.14803 ; LAPA arXiv:2410.11758
**Confidence:** high for the taxonomy and the quantitative comparisons (they come from a named, detailed technical post by a domain researcher, published by NVIDIA); medium for individual 2026 model claims, which I have not verified paper-by-paper.

---

### Hierarchical and long-horizon approaches: 2022 → 2026

**SayCan (2022).** An LLM scores which of a fixed library of skills is *useful* for the instruction; a learned **affordance value function** scores which is *currently possible*; multiply and pick the argmax; execute; repeat. The value function is what grounds the LLM — it prevents "get me a sponge" from producing a plan that requires a sponge that isn't there. arXiv:2204.01691.

**Code as Policies (2022).** The LLM writes *executable Python* that calls perception and control APIs, with recursive definition of undefined functions. Gains: loops, conditionals, arithmetic on spatial quantities, and composition — expressiveness a flat skill-selector cannot reach. arXiv:2209.07753.

**The affordance/keypoint intermediate-representation line (2024).** All three replace "LLM picks a skill" with "VLM outputs a geometric quantity that a classical controller consumes":
- **MOKA** (arXiv:2403.03174): *mark-based visual prompting*. Annotate the image with candidate marks, ask the VLM to select grasp keypoints, function keypoints, and target keypoints, then convert the selected point set into a motion. Turns free-form open-world manipulation into a VQA problem the VLM is already good at.
- **ReKep** (arXiv:2409.01652): *relational keypoint constraints*. A VLM writes Python functions over sets of semantic keypoints that evaluate to a cost; a solver then optimizes robot actions subject to those constraints, spatio-temporally. This is the most "classical robotics" of the three — the VLM specifies the optimization problem, not the motion.
- **RoboPoint** (arXiv:2406.10721): fine-tunes a VLM specifically to *predict spatial affordance points* ("where should the gripper go"), trained on synthetic point-annotation data.

**ECoT (Embodied Chain-of-Thought, CoRL 2024, arXiv:2407.08693).** Interleave reasoning — subtask decomposition, bounding boxes for task-relevant objects, 2D motion traces — with action prediction inside the VLA. Improves generalization and interpretability. Its limitation is that autoregressive reasoning tokens are slow, which is the main thing 2026 work tries to fix (discrete-diffusion VLAs generate reasoning and actions in parallel).

**Where this stands in 2026 — the important structural claim:** the *separate-planner* system architecture has largely lost to *internalized hierarchy*.
- π0.5 / π0.6 / π0.7 predict the language subtask themselves, at low frequency, in the same network that emits actions — and π0.5 co-trains on bounding-box and keypoint prediction, i.e. **the MOKA/RoboPoint idea survives as an auxiliary training objective rather than as a runtime pipeline**.
- Gemini Robotics 1.5 interleaves language thinking traces with actions inside the VLA; ER 1.5/ER 2 exists as a *separate orchestrator*, so Google runs both patterns simultaneously.
- Hi Robot (arXiv:2502.19417) is the explicit two-model version from PI: a high-level VLM emits language subtasks to a low-level VLA, and handles open-ended instructions and human-in-the-loop feedback.
- GO-2 uses action chain-of-thought with an asynchronous low-freq planner / high-freq residual follower.
- π0.7 adds a third layer: a **world model** generating visual subgoals as an intermediate representation between language and action — arguably the successor to the keypoint line, with generated images replacing hand-specified geometry.
- MEM adds memory as a fourth axis, with the high-level inference step now emitting both the next subtask *and* a memory update.

**Confidence:** high on the primary citations; medium-high on the "internalized hierarchy won" synthesis — it is my reading across π0.5/π0.6/π0.7/GR1.5/GO-2, consistent with all of them, but not a claim any single source states.

---

## What an interactive explainer should show

One mechanism per module. Each of these is implementable in 2D with a slider or a small simulation.

1. **Compounding error (BC vs. DAgger).** A 2D point-robot following a demonstrated path. Slider: per-step error ε. Show two traces side by side — expert distribution vs. rollout distribution — with a running counter of accumulated deviation. Overlay the O(εT) vs. O(εT²) curves. Add a DAgger toggle that shows the expert relabeling the *visited* states and the rollout distribution collapsing back onto the expert's.

2. **Multimodality collapse.** An obstacle with two valid paths around it. Three heads on the same data: MSE (drives straight into the obstacle — the mean of two valid modes is invalid), Gaussian mixture (works but you must pick K), diffusion/flow (samples a mode). Let the user drag the two demonstration modes closer together and watch when MSE stops failing.

3. **Action chunking, with the real ablation curve.** Slider for chunk size k from 1 to 400. Show: (a) number of closed-loop decisions per episode, (b) a live rollout with per-step vs. chunked prediction, (c) the actual ACT numbers overlaid — 1% at k=1, 44% at k=100, taper at k=200/400. The taper is the pedagogically valuable part: chunking is a *bias/variance* tradeoff, not free.

4. **Temporal ensembling and why it breaks.** Show k overlapping chunks stacked in time, the exponential weights w_i = exp(−m·i), and the averaged output. Then add a latency slider. At 0 ms the average is smooth; at 100–200 ms, the overlapping chunks disagree (different modes) and the average lands between them — visualize the resulting action leaving the valid set. This directly motivates module 5.

5. **RTC as inpainting.** Timeline of controller ticks. Old chunk in green, new chunk in red. Slider for inference delay d. Show the first d actions **frozen** to the old chunk's values, the middle overlap shown with a partial-attention gradient (strong → weak), and the tail free. Contrast three modes: synchronous (visible pause, robot stops), naive switch (discontinuity spike in the velocity plot), RTC (continuous). Show a velocity/acceleration trace under each — the discontinuity is the whole point.

6. **Flow matching in action space.** Live 2D action-space view (say, the first two dims of a chunk). Start from Gaussian noise; step the Euler integrator with a slider for number of steps (1 → 10 → 50). Show the vector field v_θ and the sample path. Two toggles worth having: the **beta timestep distribution** (show which τ values training emphasizes and why — the noisy end is where the field is hardest), and a comparison of the same target distribution under DDPM (curved paths, more steps) vs. rectified flow (straight paths, fewer steps).

7. **The tokenization problem at high frequency.** Plot a real 50 Hz joint trajectory. Panel A: naive per-timestep binning — show the token sequence, and show that predicting a_{t+1} from a_t is nearly free (compute and display the entropy per token). Panel B: apply the DCT, show the coefficient spectrum collapsing to a few low-frequency terms, quantize, BPE, and show the token count drop. Add a slider for control frequency (5 Hz → 50 Hz) and watch naive binning's per-token entropy go to zero while FAST's stays flat. This is the single clearest "why FAST exists" visual.

8. **Action expert as Mixture-of-Transformers.** Layer-by-layer diagram of a π0-style model. Two weight stacks side by side. Animate a forward pass: image + text tokens flow up the backbone; action tokens flow up the expert, attending *sideways* into backbone activations at every layer. Then animate the backward pass with a **stop-gradient barrier** that the user can toggle — with it off, show gradient arrows reaching into the backbone and a "language following" meter dropping; with it on, show the FAST-token cross-entropy loss taking over as the backbone's supervision. Include the 7.5x training-step number.

9. **Receding horizon / execution horizon.** One slider for H (predicted) and one for Ĥ (executed). Show a rolling plan: the predicted chunk in light, the committed portion in solid, and a "replan rate" and "reactivity" readout. Preload the real configurations: Diffusion Policy (Tp=16, Ta=8), π0 (H=50, synchronous), π0.7 (H=50, Ĥ=15 or 25). Make it obvious these are the same dial.

10. **Advantage conditioning (Recap).** A short episode with a value-function trace along the bottom (this is exactly the interactive PI already built — reproduce the idea, not the asset). Scrub through the episode; where the value *rises*, mark the action high-advantage; where it *falls*, low-advantage. Then show the training-time picture: all data stays, each transition gets a binarized advantage tag, and at test time you condition on "high." The credit-assignment point lands best on the portafilter example — failure at insertion, blame at the grasp 20 s earlier.

11. **Hierarchy and timescales.** A single horizontal timeline with four lanes running at different rates: task instruction (once), subtask / thinking (~1 Hz), action chunk inference (~1–3 Hz), controller (50 Hz — and for Helix 02, 200 Hz S1 and 1 kHz S0). Let the user scrub and see which lane updates. Overlay different systems' actual lane structures (π0.5, Gemini Robotics 1.5, Helix 02, GO-2) so the reader sees the same pattern instantiated four ways.

12. **Memory (MEM).** Split view. Left: raw observation history with a token-budget meter that overflows if you keep everything. Middle: the interleaved spatial/temporal ViT compressing it, with upper-layer token dropping shown as tokens disappearing. Right: the growing language memory string, with a "summarize" event collapsing "picked up the yellow plate" + "picked up the green plate" → "I picked up the plates." Then the payoff: a two-attempt chopstick grasp where the second attempt differs *because* the first is in memory.

13. **Cross-embodiment, three ways.** Same task, three robots (7-DoF arm, bimanual, humanoid). Toggle between: (a) padded shared action vector + per-embodiment normalization (π-family), (b) motion transfer (Gemini 1.5 — show it as a shared motion latent, flagged as under-specified publicly), (c) shared *relative end-effector* space that a human hand also lives in (GR00T N1.7) — and then show human video entering the same space, which is the whole reason 20K hours of EgoScale is usable.

14. **The open/closed and generation map.** An interactive version of the timeline table, filtered by open-weight, lab, and action representation. Critically: a "generations behind" indicator on openpi, showing that the newest open PI checkpoint is π0.5 while the lab is on π0.7. This is the single most practically useful thing for an ML engineer entering robotics.

15. **VLA vs. WAM.** Two pipelines side by side from the same initial frame. VLA: image + text → backbone → action expert → chunk. WAM: image + text → video backbone → predicted future frames → (inverse dynamics | joint decode) → chunk. Show the token-count and latency meters (190 ms vs. 590–800 ms) and the training-compute bars (6.9 vs ~51 ZFLOPs). End on the hybrid: π0.7's generated subgoal image feeding a VLA — the same idea, cheaper.

---

## Open questions / contested claims

- **Is discrete or continuous the right action representation?** Unresolved and the evidence cuts both ways. RoboArena Elo: π0-FAST (discrete) 1592 > π0 (flow) 1475 — the discrete recipe preserved more pretrained capability. But π0.5 (flow + KI) 1622 beats both, and π0-FAST is ~2x slower to complete tasks in real-robot comparison. The current answer is "discrete for supervising the backbone, continuous for the executed actions" — but nobody has shown that's optimal, only that it's better than either alone. Also relevant: OpenVLA-OFT found plain **L1 regression** competitive with diffusion once chunking and parallel decoding were present, suggesting some of diffusion's reported advantage was chunking in disguise.

- **Does VLM quality predict VLA quality?** VLM4VLA (arXiv:2601.03309) says **no** — downstream VLA performance is uncorrelated with the backbone VLM's standard benchmark scores, and spatial objectives matter far more than general vision capability. This is important and counterintuitive, and it is a single paper with sim-only evaluation. Contrast with WAMs, where DreamZero claims video-generation quality *does* directly predict policy quality. `[both single-source]`

- **Will WAMs displace VLM-based VLAs?** Genuinely open. The strongest pro-WAM datapoint is DreamZero's 1750 RoboArena Elo. The strongest anti-WAM datapoints are 3–4x inference slowdown and ~7x training compute. Even the NVIDIA post's author, who is enthusiastic, predicts a hybrid rather than a winner.

- **Does human video transfer require an alignment mechanism?** Direct disagreement. **GR00T N1.7** builds an explicit shared relative-EEF action space so human and robot data live in the same representation. **Physical Intelligence** (Dec 2025) reports that with enough robot pretraining diversity, transfer from egocentric human video **emerges with no transfer mechanism at all** — they simply treated human video as another embodiment with 3D hand positions as actions and got ~2x improvement, with t-SNE showing human and robot features aligning only at high pretraining scale. Both may be true (an explicit alignment might just be a cheaper route to the same thing), but no head-to-head exists.

- **How much of π0.7's "compositional generalization" is real?** The air fryer result is genuinely striking, but the honest reading is: **zero-shot fails**, coaching succeeds, and coaching data then fine-tunes a high-level policy. That is impressive interactive learning, and PI describes it as "initial signs" and "first signs" of compositionality. The UR5e laundry transfer is the cleaner result. `[my assessment, not a contested source claim]`

- **Gemini Robotics architecture is a black box.** Motion Transfer is named across two releases with no specification. Action representation, chunk size, control frequency, and parameter counts are all undisclosed for GR 1.5 and GR 2. Any comparison matrix entry for Gemini must be marked "not disclosed" rather than guessed.

- **Vendor-reported results with no paper.** Figure Helix 02 (4-minute dishwasher task, 61 actions, S0 replacing 109,504 lines of C++), AgiBot GO-2 (LIBERO 98.5%, sim-to-real 82.9%), and all of Skild are company communications with no external verification, no baselines, and in Figure's case no success rates at all. The app should visually distinguish "peer-reviewed / paper" from "lab blog with detail" from "press release."

- **Benchmark validity.** LIBERO and CALVIN are saturated; a well-tuned Diffusion Policy without any VLM pretraining reaches near-ceiling. Reported deltas of +0.5% on these are not evidence. The gap that matters — zero-shot open-world behavior after pretraining — is measured almost nowhere public except RoboArena, where non-π models were scarcely represented as of late 2025.

- **RT-2's actual control frequency.** I could not find a clearly stated number in the paper or on the project page. Marked `[UNVERIFIED]` in the matrix.

- **OpenVLA's deployed control rate.** Commonly cited as ~6 Hz on an A100; I did not verify this against the paper text. Marked `[UNVERIFIED exact]`.

- **π0.6 / π0.7 / MEM / RLT have no arXiv IDs** as of 2026-08-06 — they exist as lab PDFs and model cards only. Citations point to `pi.website` download URLs, which may move.

---

## Source list

**Primary papers (arXiv, verified titles and dates)**
- https://arxiv.org/abs/1011.0686 — DAgger; covariate shift, quadratic-in-horizon BC regret.
- https://arxiv.org/abs/2204.01691 — SayCan; LLM + affordance value function grounding.
- https://arxiv.org/abs/2209.07753 — Code as Policies; LLM-written policy programs.
- https://arxiv.org/abs/2212.06817 — RT-1; 256-bin discretization, FiLM-EfficientNet + TokenLearner + 19M transformer, 35M total, 3 Hz, 130k episodes, 700+ tasks, 8 tokens/image, 48 total tokens, 11 action dims.
- https://arxiv.org/abs/2303.04137 — Diffusion Policy; receding horizon (T_o/T_p/T_a), CNN-UNet+FiLM vs. DiT+cross-attention, GroupNorm ResNet-18, square-cosine schedule, DDIM 100 train / 10 inference steps, 0.1 s on RTX 3080, 10 Hz → 125 Hz interpolation.
- https://arxiv.org/abs/2304.13705 — ACT/ALOHA; CVAE style variable z, k×14 output, ResNet-18 ×4 → 1200×512, ~80M params, temporal ensembling, k=1→1% / k=100→44% ablation, L1 + β·KL loss, 50 Hz.
- https://arxiv.org/abs/2307.15818 — RT-2; actions as text tokens, co-fine-tuning, emergent capabilities.
- https://arxiv.org/abs/2310.08864 — Open X-Embodiment; 1M+ trajectories, 22 embodiments, 527 skills / 160,266 tasks, RT-X positive transfer.
- https://arxiv.org/abs/2401.02117 — Mobile ALOHA; whole-body teleop, static+mobile co-training.
- https://arxiv.org/abs/2403.03174 — MOKA; mark-based visual prompting, grasp/function/target keypoints.
- https://arxiv.org/abs/2405.07503 — Consistency Policy; consistency distillation to 1–3 step inference.
- https://arxiv.org/abs/2405.12213 — Octo; 800k OXE trajectories, diffusion head, block-wise attention, 27M/93M.
- https://arxiv.org/abs/2406.09246 — OpenVLA; 7B Prismatic backbone, 970k OXE episodes, beats 55B RT-2-X by 16.5% on 29 tasks.
- https://arxiv.org/abs/2406.10721 — RoboPoint; VLM fine-tuned for spatial affordance point prediction.
- https://arxiv.org/abs/2409.01652 — ReKep; VLM-written relational keypoint constraint functions + solver.
- https://arxiv.org/abs/2410.24164 — π0; PaliGemma 3B + 300M action expert, H=50, flow matching with beta-distributed τ, bidirectional action attention, 10 Euler steps, 50 Hz, KV-cached prefix, π0-small 470M ablation.
- https://arxiv.org/abs/2410.21257 — One-Step Diffusion Policy; distillation to one step, up to 62 Hz.
- https://arxiv.org/abs/2501.09747 — FAST; DCT + quantization + BPE, FAST+ trained on 1M trajectories, 5x training speedup, "standard discretization fails completely" at high frequency.
- https://arxiv.org/abs/2502.19417 — Hi Robot; explicit hierarchical VLA with human-in-the-loop feedback.
- https://arxiv.org/abs/2502.19645 — OpenVLA-OFT; parallel decoding + chunking + L1 head, LIBERO 76.5→97.1%, 26x throughput.
- https://arxiv.org/abs/2503.06669 — AgiBot World Colosseo / GO-1 platform.
- https://arxiv.org/abs/2503.14734 — GR00T N1; open humanoid foundation model, VLM + flow-matching DiT.
- https://arxiv.org/abs/2503.20020 — Gemini Robotics 1.0 / ER.
- https://arxiv.org/abs/2504.16054 — π0.5; heterogeneous co-training, hybrid multimodal examples, open-world generalization in unseen homes.
- https://arxiv.org/abs/2505.23705 — Knowledge Insulation; stop-gradient + FAST-token backbone supervision, 7.5x fewer training steps.
- https://arxiv.org/abs/2506.07339 — Real-Time Chunking; inpainting formulation, latency table (139 ms mobile / 108 ms static), flat throughput to +200 ms.
- https://arxiv.org/abs/2510.03342 — Gemini Robotics 1.5; Motion Transfer, interleaved thinking, ALOHA-2/bi-arm Franka/Apollo data, >90% of dev evals in MuJoCo.
- https://arxiv.org/abs/2512.05964 — Training-Time Action Conditioning for Efficient Real-Time Chunking.
- https://arxiv.org/abs/2602.02481 — Flow Policy Gradients for Robot Control (Feb 2026).
- https://arxiv.org/abs/2603.12480 — One-Step Flow Policy: Self-Distillation for Fast Visuomotor Policies (Mar 2026); 56 simulated tasks.
- https://arxiv.org/abs/2603.11558 — RoboClaw: agentic framework, Entangled Action Pairs, self-resetting data collection (Mar 2026).
- https://arxiv.org/abs/2605.00080 — World Model for Robot Learning: A Comprehensive Survey (NTU, Apr 2026).
- Referenced via the NVIDIA WAM post, not individually verified: arXiv:2602.15922 (DreamZero), 2601.16163 (Cosmos Policy), 2601.21998 (LingBot-VA), 2603.16666 (Fast-WAM), 2605.00078 (Being-H0.7), 2604.20246 (Cortex 2.0), 2512.15692 (mimic-video), 2601.03309 (VLM4VLA), 2412.14803 (VPP), 2410.11758 (LAPA), 2506.06072 (BEAST), 2506.18123 (RoboArena), 2604.09860 (RoboLab), 2403.12945 (DROID), 2407.08693 (ECoT).

**Lab pages, model cards, and repos**
- https://www.pi.website/blog — Physical Intelligence research index; used to establish the full π timeline through April 2026.
- https://www.pi.website/blog/pi0 · /blog/pi05 · /research/fast · /research/knowledge_insulation · /research/real_time_chunking — π-family blogs; source for chunk size 50 = 1 s, "first-generation vs second-generation VLA" framing, latency tables, KI ablations.
- https://website.pi-asset.com/pi06star/PI06_model_card.pdf — π0.6 model card; **Gemma3 4B + SigLIP 400M + 860M action expert, 4×448² images, bidirectional-image/causal-text/bidirectional-action attention, KI training, 5 denoising steps → 63 ms/chunk on H100.**
- https://www.pi.website/blog/pistar06 and /download/pistar06.pdf — Recap / π*0.6; value function, binarized advantage conditioning, KL-regularized RL derivation, coaching vs. practice, >2x espresso throughput.
- https://www.pi.website/research/memory and /download/Mem.pdf — MEM; interleaved spatial/temporal ViT, upper-layer token dropping, language memory with summarization, 15-minute tasks, in-context adaptation.
- https://www.pi.website/research/rlt and /download/rlt.pdf — RL Tokens; encoder-decoder reconstruction bottleneck, chunk-level actor, reference-action input + dropout, Ethernet median 66 vs teleop 146 vs base 228 timesteps, 15 min of data.
- https://www.pi.website/blog/pi07 and /download/pi07.pdf — π0.7; **5B total (Gemma3 4B incl. 400M vision enc. + 860M expert), MEM video encoder, linear state projection, adaRMSNorm, 50 action tokens, 5 denoising steps, Ĥ ∈ {15,25}, training-time RTC to 240 ms at 50 Hz, BAGEL world model for subgoals refreshed every 4 s async, UR5e zero-shot laundry transfer, Recap distillation.**
- https://www.pi.website/research/human_to_robot — emergent human→robot transfer; ~2x on generalization tasks, t-SNE feature alignment only at high pretraining scale.
- https://github.com/Physical-Intelligence/openpi — open checkpoints: π0, π0-FAST, π0.5 base + DROID/ALOHA/LIBERO fine-tunes. Apache-2.0. PyTorch support Sept 2025. **Nothing past π0.5.**
- https://github.com/NVIDIA/Isaac-GR00T — GR00T N1.7 README; **Cosmos-Reason2-2B (Qwen3-VL) backbone, flow-matching DiT with 16 layers, state/action dim 132, action_horizon 40, relative-EEF action space, 20K h EgoScale human video, 3B params, `--execution-horizon` flag, UNITREE_G1_SONIC latent-action WBC, Apache-2.0 code / NVIDIA Open Model License weights.**
- https://github.com/NVlabs/GR00T-WholeBodyControl — GEAR-SONIC whole-body controller workflow.
- https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design — Isaac GR00T Reference Humanoid (May 2026).
- https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/ — Gemini Robotics 2, ER 2, On-Device 2; per-task success rates, 22-DoF SharpaWave hand, same-checkpoint multi-embodiment, <200 examples / few hours for new bi-arm embodiments, ASIMOV-Agentic.
- https://deepmind.google/models/gemini-robotics/vla/ — Gemini Robotics 2 model card page (private preview; inputs text+image, outputs actions).
- https://deepmind.google/blog/gemini-robotics-15-brings-ai-agents-into-the-physical-world/ — Gemini Robotics 1.5 announcement.
- https://ai.google.dev/gemini-api/docs/robotics-overview — Gemini Robotics ER API docs.
- https://www.figure.ai/news/helix-02 — Helix 02; S0 (10M params, 1 kHz, 1,000+ h retargeted human motion, 200k parallel sim envs, replaces 109,504 lines of C++), S1 (200 Hz, all sensors in / all joints out, palm cameras + fingertip tactile at 3 g sensitivity), S2 (semantic latents), 4-minute / 61-action dishwasher task.
- https://www.figure.ai/news/helix — original Helix (Feb 2025).
- https://agibot-world.com/blog/go1 — GO-1 / ViLLA.
- https://www.agibot.com/article/231/detail/56.html — AgiBot GO-2 announcement.
- https://www.therobotreport.com/agibot-releases-go-2-foundation-model-embodied-ai/ — GO-2 technical summary: action chain-of-thought, asynchronous dual-system, teacher forcing, LIBERO 98.5% / LIBERO-Plus 86.6% / VLABench 47.4 / Genie Sim 3.0 sim-to-real 82.9%.
- https://www.skild.ai/blogs/building-the-general-purpose-robotic-brain and https://www.therobotreport.com/skild-ai-raises-1-4b-building-omni-bodied-robot-brain/ — Skild landscape entry only; no technical content.
- https://octo-models.github.io/ · https://openvla.github.io/ · https://openvla-oft.github.io/ · https://tonyzhaozh.github.io/aloha/ · https://aloha-2.github.io/ · http://diffusion-policy.cs.columbia.edu/ · https://rekep-robot.github.io/ · https://moka-manipulation.github.io/ — project pages.

**Analysis / survey sources (used for landscape framing, flagged as secondary)**
- https://developer.nvidia.com/blog/pretrained-to-imagine-fine-tuned-to-act-the-rise-of-world-action-models/ — Moritz Reuss, NVIDIA, June 2026. WAM taxonomy (paradigm / action integration / architecture), model comparison table, **inference 590–800 ms WAM vs ~190 ms π0.5**, **training compute 6.9 vs ~51 ZFLOPs**, **RoboArena Elo: π0 1475, π0-FAST 1592, π0.5 1622, DreamZero 1750**, "MoT recipe from Transfusion, popularized in robotics by π0."
- https://mbreuss.github.io/blog_post_iclr_26_vla.html — Moritz Reuss, Oct 2025. ICLR 2026 VLA submission analysis: 164 submissions (18x YoY), discrete diffusion VLA trend, benchmark-reading guide (LIBERO >95% expected, CALVIN ABC >4 standard), open vs. closed zero-shot gap, VLA vs. LBM taxonomy, OXE data-quality critique.
- https://en.wikipedia.org/wiki/Gemini_Robotics · https://en.wikipedia.org/wiki/Figure_AI · https://en.wikipedia.org/wiki/Vision-language-action_model — used only for date and release-sequence corroboration.
