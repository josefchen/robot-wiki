# RL, Sim-to-Real, Locomotion, and World Models
_Research snapshot: 2026-08-06_

Scope note: this file is the source-of-truth research brief for the RL / sim-to-real / world-model modules of **robot-atlas**. Every substantive claim carries a citation. Claims I could not verify against a primary source in this research pass are tagged `[UNVERIFIED]`. arXiv IDs I recalled but could not confirm against arXiv in this pass are tagged `[ID unverified]` — verify before shipping into the app.

---

## Executive summary

1. **The locomotion win is real and cheap; the manipulation win is not.** Rudin et al. trained ANYmal flat-terrain walking in **under four minutes** and uneven-terrain walking in **twenty minutes** on a single workstation GPU (CoRL 2021, arXiv:2109.11978). No equivalent number exists for general contact-rich manipulation in 2026.
2. **The reason is not "RL is bad at manipulation," it is that the manipulation MDP is not cheaply simulatable.** Locomotion needs proprioception + terrain heightfields + a good actuator model; manipulation needs per-object geometry, friction, compliance, deformation, and mm-accurate multi-point contact, plus a visual pipeline for object state. The authoritative statement of this is the Annual Review of Control, Robotics, and Autonomous Systems 2026 reality-gap survey (arXiv:2510.20808).
3. **Sim infrastructure consolidated in 2025-2026 around GPU-native, Warp/OpenUSD-based stacks.** Isaac Gym → Isaac Lab (arXiv:2511.04831) → Isaac Lab 3.0 (backend-decoupled from Isaac Sim) → **Newton 1.0 GA (GTC 2026, March 2026)**, a Linux Foundation project by NVIDIA + Google DeepMind + Disney Research.
4. **Concrete throughput today:** Isaac Lab reports **>900k FPS** on a state-based dexterous-grasp teacher task and **>1.6M FPS** on Franka cabinet-opening with 8 GPUs / 16,384 envs (arXiv:2511.04831 §4.1.1). MuJoCo Warp inside Newton reports **252× over MJX for locomotion and 475× for manipulation** on an RTX PRO 6000 Blackwell (NVIDIA, Mar 2026).
5. **The 2026 contact-fidelity bet is SDF collision + hydroelastic (finite-area, distributed-pressure) contact**, borrowed from Drake/TRI and shipped in Newton 1.0. Skild AI uses this for GPU-rack connector insertion; Samsung/Lightwheel use two-way-coupled VBD cable solvers for refrigerator hose insertion (NVIDIA, Mar 2026). This is the industry's explicit answer to "why manipulation sim-to-real fails."
6. **Teacher-student privileged distillation is still the workhorse of legged sim-to-real** — Lee et al. Science Robotics 2020 (arXiv:2010.11251) and RMA (arXiv:2107.04034) — and it now dominates vision-based dexterous manipulation too (DextrAH-RGB in Isaac Lab). Isaac Lab documents the failure mode explicitly: an information-capacity mismatch where the student must reconstruct unobserved state from images, degrading badly under occlusion.
7. **Domain randomization is still bottlenecked by engine plumbing, not by theory.** In Isaac Lab, physics *state* is GPU-resident but physics *parameters* (mass, friction, contact offsets, joint armature) must still be written through PhysX CPU APIs (arXiv:2511.04831 §5.3). This is a concrete, teachable systems constraint.
8. **Real-to-sim is the fastest-moving sim-to-real sub-area.** Two distinct families: (a) dynamics alignment — ASAP's delta-action model trained on real rollouts and injected back into the simulator (arXiv:2502.01143, RSS 2025); (b) appearance alignment — 3D Gaussian Splatting digital twins (RoboGSim arXiv:2411.11839; GS + soft-body policy evaluation arXiv:2511.04665).
9. **Humanoid whole-body control is now a "single unified tracking policy" problem.** Lineage: PHC → H2O → OmniH2O (arXiv:2406.08858) → ExBody2 (arXiv:2412.13196) → ASAP (arXiv:2502.01143) → GMT (arXiv:2506.14770, one policy tracking diverse motions) → 2026 robustness work (arXiv:2601.23080).
10. **Gemini Robotics 2 (2026-07-30) is the first frontier VLA controlling a full humanoid feet-to-fingertips with one policy** — and its published numbers are the honest snapshot of the field: whole-body pick from table **68.4%**, floor **45.7%**, shelf **76.3%**; multi-finger tasks range **32% (dustpan) to 92% (unscrew bulb)**; gripper insertion **89.6%**.
11. **Eureka-style LLM reward synthesis works but did not eliminate reward engineering.** Eureka (ICLR 2024, arXiv:2310.12931) runs an evolutionary loop of GPT-generated reward *code*. The 2026 successor line (e.g. arXiv:2606.01672) is still framed as an open problem, and constrained-RL formulations that replace weighted reward sums with explicit constraints (arXiv:2510.10759) are a live competing answer.
12. **RL fine-tuning of VLA/diffusion policies is the most active frontier and it has genuinely converged on a few working recipes:** residual RL on top of a frozen generalist, human-in-the-loop online RL, RL-generated data distilled back into the generalist, and (new in late 2025/2026) direct policy-gradient RL through flow-matching action heads.
13. **The flow-matching log-likelihood problem was solved twice in 2026.** π_RL (arXiv:2510.25889, v3 Jan 2026) offers Flow-Noise (learnable noise net → exact log-likelihood over a discrete-time denoising MDP) and Flow-SDE (ODE→SDE conversion, two-layer MDP). This is the specific technical unlock for RL on π0/π0.5-class policies.
14. **Human-in-the-loop online real-robot RL (HIL-SERL, arXiv:2410.21845) remains the strongest *real-world* evidence that RL beats imitation on precision tasks** — it is also the least scalable, because it needs a human operator in the loop.
15. **Classical model-based control did not lose.** Zhang et al. (ICRA 2026, arXiv:2503.04613) show plain iLQR with MuJoCo dynamics and finite-difference derivatives achieves real-time whole-body MPC on quadruped dynamic locomotion, quadrupeds walking on two legs, and full-size humanoid bipedal locomotion, "with few sim-to-real considerations." Any honest 2026 explainer must show this baseline.
16. **"World model" means at least five different things.** Latent-dynamics-for-RL (Dreamer/TD-MPC2), action-conditioned generative video (Cosmos/Genie/IRASim), non-generative joint-embedding prediction (V-JEPA 2), unified world-action models (Cosmos Policy, DreamZero), and symbolic/structured transition models. The taxonomy table below is the crispest thing this document contributes.
17. **Cosmos 3 (2026-06-01, GTC Taipei) collapsed NVIDIA's world-model stack into one omni-model.** Mixture-of-Transformers with a shared representation space, split into an autoregressive (reasoning) subsequence and a diffusion (generation) subsequence with separate parameter sets that interact via joint attention. Nano 16B (8B reasoner + 8B generator), Super 64B. One model acts as VLM, video generator, forward-dynamics model, inverse-dynamics model, or policy.
18. **Genie 3's own published limitations are the best teaching material about what generative world models cannot yet do:** limited *agent* action space, poor multi-agent interaction, no geographic accuracy, unreliable text rendering, and only "a few minutes" of continuous interaction. Project Genie caps sessions at **60 seconds** purely because Genie 3 is autoregressive and compute-expensive.
19. **There is now real, non-trivial evidence that video world models work as simulators — for a narrow definition of "work."** Interactive World Simulator (arXiv:2603.08546): >10 minutes of stable interaction at 15 FPS on a single RTX 4090, and policies trained *only* on world-model-generated demonstrations match policies trained on the same amount of real data. RoboWorld (arXiv:2607.01060): Pearson **r = 0.989** between world-model evaluation and real-robot evaluation.
20. **But the field's own survey is blunt about the caveat:** "visual plausibility is only a weak proxy for control utility" (arXiv:2605.00080 §7.1.2). And LIBERO — the benchmark most world-model-VLA papers report — is saturated at ~98% average, so it no longer discriminates (survey Table 5).
21. **RL *inside* a learned world model is now beating both SFT and software simulators on some tasks** (World-Gymnast / WorldGym, per survey §4). WMPO (ICLR 2026), RehearseVLA (CVPR 2026), PlayWorld, RISE, and WoVR are the 2026 cluster. The emergent second-order idea is **world-model/policy co-evolution**: the simulator is known to be wrong, so you repair it with the policy's own failure rollouts (WoVR, World-VLA-Loop, VLAW).
22. **The LeCun position hardened into an institution.** LeCun left Meta (Nov 2025) and founded AMI Labs, which raised **$1.03B at a $3.5B valuation** (Mar 2026, TechCrunch/NYT). V-JEPA 2 (arXiv:2506.09985) is the strongest technical artifact of the argument: <62 hours of unlabeled robot video post-training gives zero-shot planning on new Franka arms. The strongest counterargument is that every currently *usable* interactive simulator is generative.
23. **Generative *task/scene* synthesis is quietly more useful than generative *dynamics* today.** RoboGen (arXiv:2311.01455), Holodeck (arXiv:2312.09067), RoboCasa (arXiv:2406.02523) and RoboCasa365 (ICLR 2026) all put generated content inside a *real physics engine*, which sidesteps the physical-consistency failure mode entirely.
24. **The 2026 bottleneck framing that most deserves a module:** the Motoniq/Stanford/ETH/TU-Darmstadt position paper (arXiv:2606.06556) argues the missing layer is not another policy architecture but four *interfaces* — data autolabelling, embodiment retargeting, physics-grounded world models, and reward grounding from video/language.
25. **Contested / uncertain:** Genesis's throughput claims remain independently unverified (community benchmark dispute, and no third-party evaluation of Genesis AI's 2026 models); Newton's 252×/475× figures are vendor-reported; and whether RL-in-world-model gains hold outside curated benchmarks is genuinely open.

---

## Part A: RL and sim-to-real

### A1. Why RL in sim won locomotion but not (yet) manipulation

**What it is:** An empirical asymmetry. Sim-trained RL policies are the default production approach for quadruped and (increasingly) biped locomotion, while general manipulation is dominated by imitation learning on real teleoperated data.

**Why it matters:** This is the single most important structural fact for an ML engineer entering robotics. It explains why the locomotion literature reads like "PPO + domain randomization + curriculum" and the manipulation literature reads like "collect 100k demonstrations and train a diffusion transformer."

**Concrete technical detail:** The asymmetry decomposes into six specific properties of the two MDPs.

| Property | Locomotion | Manipulation |
|---|---|---|
| Observation sufficiency | Proprioception (joint pos/vel, IMU) + optionally a terrain heightscan is nearly sufficient. Body state is directly measured. | Object pose, geometry, mass, friction, and deformability are *not* measured; they must be inferred from pixels. |
| Contact structure | Small number of near-point foot–ground contacts, mostly with a rigid, high-friction substrate. | Many simultaneous, geometrically intricate contacts between non-convex CAD-accurate parts at tight tolerance. |
| Sensitivity to contact-model error | High-bandwidth feedback (50–1000 Hz) plus a stable gait attractor absorbs modeling error. | Insertion/assembly failures are irreversible on a millimetre scale; the policy cannot "recover into the attractor." |
| Reward density | Dense (track a commanded body velocity). | Sparse (did the connector seat?). |
| Environment authoring cost | Terrain is procedurally generated heightfields — free. | Every task needs new assets with correct physics parameters, which is why "SimReady asset" pipelines exist as a commercial category. |
| Episode reset | Free in sim, cheap in real. | Real resets need a human or a second robot. |

The Isaac Lab team frames the manipulation problem in exactly these terms: dexterous manipulation "remains challenging compared to standard parallel-jaw grasping due to the high-dimensional action space and fine-grained control required," and the framework's answer is SDF collision, accurate contact modeling, and domain randomization (arXiv:2511.04831 §6.5). The sim-to-real RL humanoid-manipulation paper is blunter: "previous successes in dexterous manipulation involve much more laborious real-to-sim engineering effort" than locomotion successes (arXiv:2502.20396).

The strongest 2026 datapoint that manipulation is still the bottleneck comes from the *imitation* side, not the RL side: Gemini Robotics 2's published multi-finger success rates span 32–92% on household tasks, versus 89.6% on gripper-based precise insertion and 68.4/45.7/76.3% on whole-body pick-and-place (DeepMind, 2026-07-30). Even the strongest frontier system does not have manipulation "solved."

**Limitations of this framing:** It is a *tendency*, not a law. Sim-to-real RL has produced real dexterous results — OpenAI's Rubik's cube with ADR, DextrAH-G/DextrAH-RGB (KUKA + Allegro, privileged teacher distilled into a stereo-RGB student; per Isaac Lab, "the first system to have shown that an end-to-end network directly [maps stereo RGB to dexterous grasping]"), and 2026 work on CAD-derived sparse-reward assembly (Play2Perfect, arXiv:2606.26428). The correct statement is that manipulation sim-to-real requires per-task engineering that locomotion does not.

**Primary sources:**
- Aljalbout et al., *The Reality Gap in Robotics: Challenges, Solutions, and Best Practices*, 2025/2026. arXiv:2510.20808. Accepted, Annual Review of Control, Robotics, and Autonomous Systems 2026. https://arxiv.org/abs/2510.20808
- Lin et al., *Sim-to-Real Reinforcement Learning for Vision-Based Dexterous Manipulation on Humanoids*, 2025. arXiv:2502.20396. https://arxiv.org/abs/2502.20396
- NVIDIA, *Isaac Lab*, 2025. arXiv:2511.04831. https://arxiv.org/abs/2511.04831
- Google DeepMind, *Gemini Robotics 2 brings whole body intelligence to robots*, 2026-07-30. https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/

**Confidence:** high

---

### A2. Massively parallel simulation RL: the 2021 → 2026 arc

**What it is:** Running thousands of independent physics environments as batched GPU tensors so that the entire agent–environment loop, including the policy forward/backward pass, stays on-device.

**Why it matters:** This is the single change that made sim RL for robotics practical. Everything else in Part A is downstream of it.

**Concrete technical detail:**

*Isaac Gym (2021, arXiv:2108.10470)* — first demonstration of end-to-end RL for complex robot tasks entirely on one GPU. PhysX on GPU; simulation state exposed directly as PyTorch tensors; no CPU↔GPU transfer per step. Isaac Lab describes the effect as reducing "training times for complex robotic tasks... from days to hours."

*Rudin et al., "Learning to Walk in Minutes" (CoRL 2021, arXiv:2109.11978)* — the canonical result. Massive parallelism on a single workstation GPU plus a **game-inspired terrain curriculum** (robots that succeed get promoted to harder terrain tiles; robots that fail get demoted). Reported wall-clock: **ANYmal flat terrain in under four minutes, uneven terrain in twenty minutes** — "a speedup of multiple orders of magnitude compared to previous work." Code open-sourced as `legged_gym`, which is still the reference implementation lineage for RSL-RL.

*What PPO configuration actually works in the massively-parallel regime.* The regime inverts the usual PPO wisdom: you have enormous batch sizes and very short rollouts. The empirically-standard `legged_gym`/RSL-RL setup is roughly: 4096 parallel environments; **24 steps of rollout per environment per iteration** (so ~98k transitions per batch); 5 learning epochs; 4 minibatches; GAE λ ≈ 0.95, γ ≈ 0.99; adaptive learning rate driven by a **KL-divergence target (~0.01)** rather than a fixed schedule; entropy coefficient ~0.01; clip ratio 0.2; separate MLP actor and critic (e.g. [512, 256, 128], ELU). The critical, non-obvious pieces are (a) the short horizon relative to episode length — bootstrapping does the rest — and (b) the KL-adaptive LR, which is what makes the run stable across reward-weight changes. `[The specific hyperparameter values here are the widely-used legged_gym defaults; treat exact numbers as [UNVERIFIED] against the paper text and check legged_gym/RSL-RL configs before publishing.]`

*MuJoCo Playground (2025, arXiv:2502.08844)* — DeepMind's open MJX-based counterpart, spanning DM Control Suite, locomotion, and manipulation, explicitly targeted at GPU-accelerated robot learning *and* sim-to-real transfer.

*Isaac Lab (Nov 2025, arXiv:2511.04831)* — the successor. Built on Isaac Sim; OpenUSD as scene layer; PhysX for physics; RTX for rendering. Adds: non-linear actuator models, multi-frequency sensors, tiled rendering (batch many cameras into one render pass), Warp-based raycast LiDAR/height-scan/visuo-tactile sensors, a manager-based composable environment API, and out-of-the-box integration with RSL-RL, RL-Games, SKRL, SB3 and Ray.

Measured throughput (arXiv:2511.04831 §4): benchmarked headless on L40 48 GB, RTX PRO 6000 96 GB, and GeForce 5090 32 GB. Distributed training scales "almost perfectly linearly." With **8 GPUs and 16,384 environments**, the state-based DextrAH teacher task exceeds **900,000 FPS**; Franka cabinet-opening exceeds **1.6M FPS**. Notably, the single-GPU 5090 workstation approaches a 2×RTX-PRO-6000 server on the Franka task because the bottleneck is **single-core CPU performance** in parts of the PhysX pipeline and the main training loop — a real, citable systems caveat.

*Isaac Lab 3.0 (2026)* — architectural break: decoupled from Isaac Sim and Omniverse. Backend-specific code separated from the core API, so you choose Isaac Sim + PhysX + RTX for photoreal sensor-rich workflows, or headless **Newton** for high-throughput; photoreal sensors can be added via the standalone OVRTX renderer, or the Newton renderer for very-large-env-count vision RL (NVIDIA/HF, 2026-07-21).

*Newton (Newton 1.0 GA, GTC 2026, March 2026)* — open-source, GPU-accelerated, extensible, **differentiable** physics engine on NVIDIA Warp + OpenUSD, founded by NVIDIA, Google DeepMind and Disney Research, governed under the **Linux Foundation**. Architecture is a *multi-solver* framework rather than one engine:
- `SolverMuJoCo` (MuJoCo Warp / MJWarp — generalized coordinates, the accuracy reference) and `SolverFeatherstone` — generalized coordinates.
- `SolverKamino` (Disney Research) — maximal coordinates; handles closed-loop linkages and passive actuation, i.e. parallel-linkage legs and tendon-driven hands that standard articulation solvers cannot represent.
- `SolverVBD` (Vertex Block Descent) — cloth, cables, volumetric soft bodies; two-way coupled to MJWarp.
- `SolverImplicitMPM` — granular/continuum material (rough-terrain locomotion).
- `SolverXPBD`, `SolverStyle3D`.

Reported speedups: MuJoCo Warp accelerates **MJX by 252× for locomotion and 475× for manipulation** on RTX PRO 6000 Blackwell (NVIDIA blog, 2026-03-16). Contact modeling adds **SDF-based collision** (precomputed sparse signed-distance fields from CAD meshes, narrow-band ±10 mm, marching-cubes surface extraction at runtime) and **hydroelastic contacts** (continuous pressure distribution over a finite-area contact patch rather than point contacts) explicitly inspired by the Drake contact model. The tiled camera sensor is ray-tracing-based and supports **Gaussian splats** as a scene representation alongside triangle meshes.

*Other engines, positioned honestly (per NVIDIA/HF state-of-simulation, 2026-07-21):* PyBullet is a CPU prototyping baseline; DART and ODE remain Gazebo backends; **Drake is the gold standard for contact-implicit trajectory optimization and rigorous numerics rather than throughput**. Brax remains the JAX-native differentiable option `[Brax: Freeman et al., arXiv:2106.13281 — ID unverified]`.

**Limitations:**
- Vendor-reported speedups (252×/475×) have no independent replication.
- Genesis's throughput claims are contested. A widely-cited community benchmark (Stone Tao, 2025) disputed the original figures; the Genesis team published a revised report. As of 2026 there are also no independent third-party evaluations of Genesis AI's newer commercial models. Treat all Genesis performance numbers as `[UNVERIFIED]`.
- CPU single-core bottlenecks still cap Isaac Lab throughput; NVIDIA names this as a target for future releases.
- Differentiability in Newton is advertised but its practical use for policy learning (as opposed to system ID and design optimization) is still early.

**Primary sources:**
- Rudin, Hoeller, Reist, Hutter, *Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning*, CoRL 2021 (PMLR 164:91–100). arXiv:2109.11978. https://proceedings.mlr.press/v164/rudin22a.html
- Makoviychuk et al., *Isaac Gym*, 2021. arXiv:2108.10470. https://arxiv.org/abs/2108.10470
- Zakka et al., *MuJoCo Playground*, 2025. arXiv:2502.08844. https://arxiv.org/abs/2502.08844
- NVIDIA, *Isaac Lab: A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning*, 2025. arXiv:2511.04831. https://arxiv.org/abs/2511.04831
- Reist et al., *Newton Adds Contact-Rich Manipulation and Locomotion Capabilities for Industrial Robotics*, NVIDIA Technical Blog, 2026-03-16. https://developer.nvidia.com/blog/newton-adds-contact-rich-manipulation-and-locomotion-capabilities-for-industrial-robotics
- Nuñez Cano et al. (NVIDIA), *The State of Simulation for Physical AI: An Overview*, 2026-07-21. https://huggingface.co/blog/nvidia/state-of-simulation-for-physical-ai

**Confidence:** high (architecture and Isaac Lab numbers); medium (Newton speedups — vendor-reported); low (Genesis performance)

---

### A3. Sim-to-real transfer techniques

**What it is:** The family of methods that make a policy trained in an approximate simulator work on hardware.

**Why it matters:** This is where the actual engineering lives. The RL algorithm is usually the least interesting part of a successful sim-to-real system.

**Concrete technical detail:** Five mechanistically distinct families.

**(1) Domain randomization (DR).** Train over a distribution of simulators rather than one. Visual DR randomizes textures, lighting, camera pose, materials (Tobin et al. 2017, arXiv:1703.06907 `[ID unverified]`); dynamics DR randomizes mass, inertia, friction, actuator gains, latency, and observation noise (Peng et al. 2018, arXiv:1710.06537 `[ID unverified]`). **Automatic Domain Randomization (ADR)** widens the randomization range as the agent succeeds — introduced in OpenAI's Rubik's-cube work (arXiv:1910.07113 `[ID unverified]`) and shipped in Isaac Lab as a configurable curriculum with reference configs in the `dexsuite` examples (arXiv:2511.04831 §5.3).

The important, teachable systems detail: in Isaac Lab, only simulation *state* is directly GPU-accessible; simulation *parameters* — masses, friction, contact offsets, joint armature — "must be modified through the CPU API" because of PhysX design constraints, and mesh scale/collider type can only be randomized *before* the sim starts playing. Visual DR (materials, light intensity/position, background textures) also runs through CPU-based USD APIs. This is why DR schedules in practice randomize on episode reset rather than continuously.

The conceptual cost of DR is well known and worth making explicit in an explainer: DR buys robustness by making the policy **conservative**. Randomizing over a wide dynamics distribution produces a policy that is optimal for none of them — you trade peak performance for a wider basin of transfer.

**(2) Teacher–student privileged-information distillation (the RMA / ANYmal lineage).** Two-phase. Phase 1: train a *teacher* with privileged simulator-only observations (terrain geometry under the feet, friction coefficients, applied disturbances, object pose). Phase 2: train a *student* that sees only what the real robot sees (a history of proprioception, or raw images) to imitate the teacher's actions.
- Lee et al., *Learning quadrupedal locomotion over challenging terrain*, Science Robotics 5(47):eabc5986, 2020 (arXiv:2010.11251): privileged teacher + a **temporal convolutional network** over proprioceptive history as the student. Robust blind locomotion on natural terrain from training in "simple domains."
- Kumar et al., **RMA: Rapid Motor Adaptation for Legged Robots**, RSS 2021 (arXiv:2107.04034): factorizes into a *base policy* conditioned on a latent "extrinsics" vector and an *adaptation module* that regresses those extrinsics online from recent proprioceptive history — i.e. implicit online system identification in latent space, running on the robot at control rate.
- The same pattern now dominates vision-based dexterous manipulation: DextrAH-RGB trains a state-privileged RL teacher and distills into a stereo-RGB student (two ResNet-18 encoders → 128 tokens each → 2-layer cross-attention transformer with a learnable `[embed]` token → MLP), per Isaac Lab §5.1.1/§6.5.

Isaac Lab names the failure mode precisely: an **information-capacity mismatch** — "the teacher observes privileged state information, while the student sees only partial observations. This can lead to a performance drop, as the student must reconstruct unobserved states from images, a challenge that becomes particularly pronounced under high camera occlusions."

**(3) System identification / dynamics alignment.** Rather than randomize over your ignorance, measure the gap and correct it.
- **ASAP** (He et al., RSS 2025, arXiv:2502.01143) is the cleanest formulation: pre-train a motion-tracking policy in sim, roll it out on the real Unitree G1, then train a **delta action model** that maps (sim state, action) to the residual action that would have reproduced the observed real transition. Insert that delta model into the simulator and fine-tune the policy against the *corrected* simulator. This is sim→real→sim→real.
- Actuator networks (Hwangbo et al., Science Robotics 2019) are the ancestral version: learn a neural map from joint-command history to realized torque, replacing the analytic actuator model. `[Science Robotics 4(26):eaau5872 — venue/number UNVERIFIED]`

**(4) Real-to-sim reconstruction (3DGS / neural reconstruction into simulators).** Close the *visual* gap by reconstructing the actual deployment scene.
- SplatSim (CMU) — zero-shot sim2real transfer of RGB manipulation policies by replacing the renderer with a Gaussian-splat reconstruction.
- RoboGSim (arXiv:2411.11839) — a real2sim2real Gaussian-splatting robotic simulator.
- RL-GSBridge (arXiv:2409.20291) — 3DGS-based real2sim2real for manipulation RL.
- Zhang et al. (arXiv:2511.04665) — real-to-sim *policy evaluation* with Gaussian-splatting simulation of **soft-body** interactions, explicitly motivated by the fact that direct real-world policy evaluation is costly and irreproducible.
- Newton 1.0's tiled camera sensor natively supports Gaussian splats as a scene representation, which is the productization of this idea.

Note the division of labour: 3DGS supplies *appearance*; a conventional engine (or a separate soft-body solver) supplies *physics*. This is architecturally different from a video world model, which learns both jointly. That distinction is worth an app module on its own.

**(5) Sim-real co-training and domain adaptation.** Train on a mixture of simulated and real data so that the real data anchors the representation while sim supplies coverage; or learn an explicit alignment between sim and real feature distributions. The reality-gap survey (arXiv:2510.20808) organizes the field into exactly these buckets — domain randomization, real-to-sim transfer, state and action abstractions, and sim-real co-training — and notes that **state/action abstraction** (choosing an interface, e.g. commanding end-effector velocities or foot positions rather than raw torques, so the low-level controller absorbs the gap) is frequently the highest-leverage and least-discussed lever.

**Limitations:**
- DR's conservatism cost is real and rarely quantified in papers.
- Teacher-student assumes the student *can* infer the privileged variable; when it cannot (heavy occlusion, genuinely unobservable friction), the ceiling is set by partial observability, not by distillation quality.
- ASAP-style delta-action models are learned on the *distribution the pre-trained policy visits*; they can be invalid off-distribution, which limits how far the fine-tuned policy can move.
- 3DGS twins reconstruct a *static* scene; articulated and deformable objects, and any lighting change, require extra machinery.

**Primary sources:**
- Lee, Hwangbo, Wellhausen, Koltun, Hutter, *Learning quadrupedal locomotion over challenging terrain*, Science Robotics 5(47), 2020. arXiv:2010.11251. https://arxiv.org/abs/2010.11251
- Kumar, Fu, Pathak, Malik, *RMA: Rapid Motor Adaptation for Legged Robots*, RSS 2021. arXiv:2107.04034. https://arxiv.org/abs/2107.04034
- He et al., *ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid Whole-Body Skills*, RSS 2025. arXiv:2502.01143. https://arxiv.org/abs/2502.01143
- Zhang et al., *Real-to-Sim Robot Policy Evaluation with Gaussian Splatting Simulation of Soft-Body Interactions*, 2025. arXiv:2511.04665. https://arxiv.org/abs/2511.04665
- Aljalbout et al., arXiv:2510.20808 (as above).
- NVIDIA, arXiv:2511.04831 §5.1.1, §5.3.

**Confidence:** high

---

### A4. The legged-locomotion lineage, and humanoid whole-body control in 2026

**What it is:** The chain of results that turned legged locomotion from an optimal-control problem into a learning problem, and the extension of that chain to humanoids.

**Why it matters:** It is the field's one complete, well-documented success story, and it is the template every humanoid company is currently trying to replicate for manipulation.

**Concrete technical detail:**

*Quadrupeds (ETH/ANYbotics lineage):*
1. Hwangbo et al. 2019 — learned actuator network closes the actuator-model gap; agile dynamic skills including self-righting on ANYmal. `[Science Robotics 4(26) — UNVERIFIED]`
2. Lee et al. 2020 (arXiv:2010.11251) — privileged teacher + proprioceptive-history student; **blind** rough-terrain locomotion in the wild.
3. Miki et al. 2022 — adds exteroception (height scan) with a belief encoder that learns when to *distrust* the terrain map. `[Science Robotics 7(62):eabk2822 — UNVERIFIED]`
4. Rudin et al. 2021 (arXiv:2109.11978) — makes the whole thing take four minutes.
5. Choi et al. 2023 — deformable terrain (granular media) via a terrain-dynamics model. `[Science Robotics, "Learning quadrupedal locomotion on deformable terrain" — URL confirmed via science.org listing; details UNVERIFIED]`

*Industrial adoption:* Boston Dynamics integrated RL into Spot's locomotion controller specifically to handle real-world variability ("Starting on the Right Foot with Reinforcement Learning," 2024-06-27), alongside its existing MPC stack. Atlas's 2025 work moved to RL from retargeted human motion, then to Large Behavior Models with TRI ("Large Behavior Models and Atlas Find New Footing," 2025-08-20).

*Humanoid whole-body control (the human-motion-imitation lineage).* The organizing idea: treat "whole-body control" as **tracking a reference human motion**, retargeted onto the robot, with RL supplying the physical feasibility that kinematic retargeting destroys.
- **PHC** (Perpetual Humanoid Control) established scalable simulated-humanoid motion tracking.
- **H2O** (IROS 2024) — real-time human-to-humanoid teleoperation via retargeted keypoint tracking on Unitree H1.
- **OmniH2O** (CoRL 2024, arXiv:2406.08858) — kinematic pose as a *universal control interface*, supporting teleoperation and autonomy, and dexterous whole-body behaviours.
- **HumanPlus** — humanoid shadowing + imitation from human video.
- **ExBody / ExBody2** (arXiv:2412.13196) — explicitly diagnoses that H2O/OmniH2O's *global* keypoint tracking causes cascading failure when a single step is missed, and moves to expressive whole-body tracking with better decoupling.
- **ASAP** (arXiv:2502.01143) — adds the delta-action dynamics-alignment stage; enables agile skills (jumps, sports-style motions) on Unitree G1.
- **KungfuBot** (arXiv:2506.12851) — physics-based tracking of highly dynamic human skills.
- **GMT: General Motion Tracking for Humanoid Whole-Body Control** (arXiv:2506.14770) — the consolidation: **a single unified policy** tracking diverse motions in the real world, addressing the temporal/kinematic diversity that previously forced per-skill policies.
- 2026: *Robust and Generalized Humanoid Motion Tracking* (arXiv:2601.23080) targets the practical problem that retargeted reference motions are noisy and locally infeasible after transfer to the robot domain. *Learning Whole-Body Humanoid Locomotion via Motion Generation* (arXiv:2604.17335) couples a motion generator to the tracking controller.
- **LeVERB** (arXiv:2506.13751) — hierarchical: a latent vision-language "verb" vocabulary learned from rendered kinematic demonstrations, executed by an RL-trained whole-body controller. **WholeBodyVLA** (ICLR 2026) — unified latent VLA for loco-manipulation, learning latent actions from action-free egocentric video.

*The 2026 state of the art, honestly stated.* Gemini Robotics 2 (2026-07-30) is the first frontier model controlling a full humanoid (Apptronik Apollo 2) from feet to fingertips under one learned policy, including a 22-DoF five-fingered SharpaWave hand, and it runs the *same checkpoint* across Apollo-2/SharpaWave, Apollo-2/Inspire, and Franka Duo/Robotiq. Published success rates:

| Category | Task | Success |
|---|---|---|
| Whole-body manipulation (Apollo + Inspire) | pick from table | 68.4% |
| | pick from floor | 45.7% |
| | pick from shelf | 76.3% |
| Multi-finger dexterity (Apollo + Sharpa) | unscrew bulb | 92% |
| | tie trash bag | 44% |
| | ziplock | 40% |
| | screw bulb | 36% |
| | dustpan | 32% |
| Gripper dexterity (Franka Duo) | precise insertion | 89.6% |
| | diverse tool kitting | 78.9% |
| | general pick-and-place | 74.2% |

DeepMind's own gloss: "While Gemini Robotics 2 achieves a medium to high success rate for whole-body and gripper-based dexterous tasks, the multi-finger dexterous manipulation remains challenging." Gemini Robotics On-Device 2 adapts to new bi-arm embodiments "with just a few hours of adaptation time, typically with less than 200 examples."

**Limitations:**
- The motion-imitation lineage inherits whatever the human demonstrator did; it does not by itself produce goal-directed loco-manipulation.
- Retargeting is lossy: human kinematics ≠ robot kinematics, and morphologically infeasible references are a persistent source of tracking failure (the explicit motivation for arXiv:2601.23080).
- Gemini Robotics 2's numbers are vendor-reported with no external replication and no standardized humanoid benchmark to compare against. Speed is also explicitly flagged as unsolved ("our robots have more to advance in movement speed").

**Primary sources:**
- Lee et al., Science Robotics 2020. arXiv:2010.11251.
- He et al., *OmniH2O*, CoRL 2024. arXiv:2406.08858. https://arxiv.org/abs/2406.08858
- Ji et al., *ExBody2: Advanced Expressive Humanoid Whole-Body Control*, 2024. arXiv:2412.13196. https://arxiv.org/abs/2412.13196
- He et al., *ASAP*, RSS 2025. arXiv:2502.01143.
- Chen et al., *GMT: General Motion Tracking for Humanoid Whole-Body Control*, 2025. arXiv:2506.14770. https://arxiv.org/abs/2506.14770
- *Robust and Generalized Humanoid Motion Tracking*, 2026. arXiv:2601.23080. https://arxiv.org/abs/2601.23080
- Xue et al., *LeVERB*, 2025. arXiv:2506.13751.
- Boston Dynamics, *Starting on the Right Foot with Reinforcement Learning*, 2024-06-27. https://bostondynamics.com/blog/starting-on-the-right-foot-with-reinforcement-learning/
- Boston Dynamics, *Large Behavior Models and Atlas Find New Footing*, 2025-08-20. https://bostondynamics.com/blog/large-behavior-models-atlas-find-new-footing/
- Google DeepMind, *Gemini Robotics 2*, 2026-07-30.

**Confidence:** high (lineage and 2026 numbers); medium (pre-2021 Science Robotics citation details)

---

### A5. Reward design: shaping, LLM-generated rewards, curriculum

**What it is:** Specifying the objective. In practice the dominant cost of a locomotion RL project.

**Why it matters:** The public narrative is "RL learns from reward." The private reality is that a production locomotion reward is a weighted sum of a dozen-plus hand-tuned terms and the weights are the actual intellectual property.

**Concrete technical detail:**

*Hand-crafted shaping, realistically.* A canonical `legged_gym`-family locomotion reward contains terms of at least these kinds: linear-velocity tracking (x,y), angular-velocity tracking (yaw), penalties on vertical velocity and roll/pitch rates, joint-torque penalty, joint-acceleration penalty, action-rate penalty, joint-limit penalty, collision/undesired-contact penalty, base-height term, foot air-time reward (to induce a gait rather than shuffling), foot-slip penalty, and a termination penalty. Each has a weight; the weights interact; changing one usually requires retuning others. The KL-adaptive learning rate in the standard PPO config exists partly to absorb this. `[The specific term list is the standard legged_gym reward set; treat as [UNVERIFIED] against a specific paper.]`

The tuning burden is now itself a research topic. Representative 2024–2026 responses:
- **Constrained RL instead of weighted sums.** "Not Only Rewards But Also Constraints: Applications on Legged Robot Locomotion" replaces penalty terms with explicit constraints, removing weight tuning for the constrained quantities.
- **Adaptive reward gains.** "Gain Tuning Is Not What You Need: Reward Gain Adaptation for Locomotion" (arXiv:2510.10759) argues offline gain selection cannot guarantee constraint satisfaction during training and adapts gains online.
- **Stage-wise shaping** for acrobatic behaviours via a constrained-policy formulation (arXiv:2409.15755).

*LLM-generated rewards.* **Eureka** (Ma et al., ICLR 2024, arXiv:2310.12931) is the reference. Mechanism, precisely: an LLM (GPT-4) is given the *environment source code* as context and asked to write a reward **function in Python**; candidate rewards are used to train policies in Isaac Gym; the top candidates are selected on a task fitness function; the LLM is then shown per-component **reward statistics** from training and asked to reflect and mutate. This is evolutionary search over code with a learned mutation operator. It works because Isaac Gym makes each fitness evaluation cheap. Reported headline: outperforms human-expert-designed rewards on the large majority of a 29-task suite. `[The commonly-cited "83% of tasks / 52% average normalized improvement" figures were not re-verified against the abstract in this pass — UNVERIFIED, check before publishing.]`

2026 status: the line is active but not solved. "Reward Design Agent for Reinforcement Learning" (arXiv:2606.01672) restates the Eureka loop as the baseline and positions automated reward design as still open. The structural limitations are (a) it needs a *fitness function*, which is itself a reward-specification problem one level up; (b) it needs cheap massively-parallel training per candidate, so it inherits the locomotion/manipulation asymmetry; (c) LLM-written rewards are prone to specification gaming that only shows up on hardware.

*Curriculum learning.* Three distinct mechanisms worth separating in an explainer:
1. **Terrain curriculum** (Rudin et al. 2021) — the "game-inspired" promote/demote scheme over terrain difficulty tiles, which works because thousands of parallel robots give a dense estimate of the difficulty frontier.
2. **Automatic Domain Randomization** — widen the randomization distribution as success rate exceeds a threshold (OpenAI; shipped in Isaac Lab as a configurable curriculum with `dexsuite` reference configs).
3. **Population-Based Training / DexPBT** — evolve hyperparameters and reward weights across a population. Isaac Lab reproduces DexPBT's 6D reposing task with **8 workers, each with 1–2 GPUs, converging in ~16 hours on NVIDIA OVX L40 hardware** (arXiv:2511.04831 §5.2).

**Limitations:** Reward engineering is where sim-to-real quietly fails: a reward that produces beautiful sim behaviour can produce a policy that exploits contact-solver artefacts. No automated method currently detects this before hardware.

**Primary sources:**
- Ma et al., *Eureka: Human-Level Reward Design via Coding Large Language Models*, ICLR 2024. arXiv:2310.12931. https://arxiv.org/abs/2310.12931
- *Reward Design Agent for Reinforcement Learning*, 2026. arXiv:2606.01672. https://arxiv.org/html/2606.01672v1
- *Gain Tuning Is Not What You Need: Reward Gain Adaptation for Locomotion*, 2025. arXiv:2510.10759. https://arxiv.org/html/2510.10759v1
- Rudin et al., CoRL 2021 (game-inspired curriculum).
- NVIDIA, arXiv:2511.04831 §5.2–5.3 (PBT, ADR).

**Confidence:** high (mechanisms); medium (specific Eureka percentages)

---

### A6. Offline RL and RL fine-tuning of VLA / diffusion policies

**What it is:** Improving a policy from logged data (offline RL) or from limited new interaction on top of a pretrained imitation policy (RL fine-tuning). This is the frontier where robotics RL and foundation-model post-training meet.

**Why it matters:** Imitation gives you a policy that is good on-distribution and brittle off it. RL is the only mechanism that learns from *failure*. But naive online RL on a 3B-parameter VLA on real hardware is infeasible. Everything in this section is a way around that.

**Concrete technical detail:**

**(a) Classical offline RL, and why it under-delivered in robotics.**
- **CQL** (Conservative Q-Learning) penalizes Q-values on out-of-distribution actions, producing a lower bound on true value. `[Kumar et al., NeurIPS 2020, arXiv:2006.04779 — ID unverified]`
- **IQL** (Implicit Q-Learning) avoids querying out-of-distribution actions entirely by fitting an expectile of the Q-function over in-dataset actions, then extracting a policy by advantage-weighted regression. This is the pragmatic default because it never evaluates an action the dataset does not contain. `[Kostrikov et al., ICLR 2022, arXiv:2110.06169 — ID unverified]`
- **Q-Transformer** (Chen et al., CoRL 2023) scales offline RL to large transformer policies by **discretizing each action dimension and treating Q-learning autoregressively over dimensions**, with a conservative regularizer, trained on RT-1-scale mixed human-demo + autonomous data. `[arXiv:2309.10150 — ID unverified]` https://qtransformer.github.io/

Why this line did not become the default: offline RL's value estimates are only as good as the coverage of the logged data, and real robot datasets are overwhelmingly *successful* demonstrations with almost no failure or recovery coverage. The 2026 position paper puts it directly: "failure recovery, decision-sensitive variation, and dense physically grounded supervision remain much scarcer than large-scale successful demonstrations" (world-model survey, arXiv:2605.00080 §7.2).

**(b) Real-world online RL with a human in the loop.** **HIL-SERL** (Luo et al., arXiv:2410.21845) is the strongest existing evidence that RL can exceed imitation on real hardware for precise, dynamic, dual-arm tasks. Mechanism: sample-efficient off-policy RL (RLPD-style, with demonstrations in the replay buffer) plus a human who takes over during failures; the corrections enter the buffer as data and also implicitly reshape the state distribution. Baselines in the paper include Diffusion Policy, BC, IBRL, Residual RL, and DAPG, all initialized with 200 demonstrations. This is the method to cite when someone claims RL doesn't work on real robots. Its limitation is exactly the human. 2026 successors extend it: HiL-ResRL (arXiv:2606.22860, a model-agnostic residual fine-tuning adapter), preference-calibrated HIL-RL (arXiv:2606.03949), and RL from *suboptimal* interventions (arXiv:2512.24288).

**(c) Residual RL on top of a frozen generalist.** The dominant practical pattern in 2026. Freeze the pretrained VLA; learn a small residual policy that adds a correction to its action; train the residual with sample-efficient off-policy RL. Advantages: tiny trainable parameter count, the base policy's semantics are preserved, and exploration is naturally local. **PLD (Probe, Learn, Distill)** (ICLR 2026, arXiv:2511.00091) makes the loop explicit: probe the generalist to find where it fails, learn residual RL experts on those failures, then **distill the residual-generated successes back into the generalist** so the residual can be discarded. https://wenlixiao.com/self-improve-VLA-PLD

**(d) RL-generated data distilled into a generalist.** **RLDG** (Xu, Luo et al., arXiv:2412.09858) — train task-specific RL policies, use them as *data generators*, and fine-tune the generalist (e.g. OpenVLA, Octo) on RL-generated trajectories. The insight is that generalist performance "heavily depends on the quality of their training data," and RL produces higher-quality, more consistent trajectories than human teleoperation for precise tasks. https://arxiv.org/abs/2412.09858

**(e) RL through generative action heads — the 2025/2026 technical unlock.** Modern policies output actions via diffusion or flow matching, which breaks standard policy gradients because the action log-likelihood is intractable.
- **DPPO** (Ren et al., arXiv:2409.00588) — treats the *denoising chain* as an MDP and applies PPO over the two-layer (denoising × environment) MDP, with a set of best practices for diffusion-policy fine-tuning. https://diffusion-ppo.github.io/
- **ConRFT** (Chen et al., arXiv:2502.05450) — reinforced fine-tuning of VLAs via a **consistency policy**, which collapses the multi-step denoising chain into few-step generation and thereby makes RL tractable and real-time.
- **π_RL** (Chen et al., arXiv:2510.25889, v3 2026-01-29) — the most complete treatment for *flow-based* VLAs (π0, π0.5). Two mechanisms: **Flow-Noise** models denoising as a discrete-time MDP with a *learnable noise network*, giving exact log-likelihoods; **Flow-SDE** converts the sampling ODE to an SDE so that denoising and environment interaction form a two-layer MDP with genuine stochastic exploration. Reports gains in-distribution and out-of-distribution. https://arxiv.org/abs/2510.25889
- **ProphRL** (arXiv:2511.20633) — FA-GRPO and FlowScale, adapting GRPO-style RL to flow-based action heads (per world-model survey §4).
- **iRe-VLA** — alternates online RL stages with supervised stages to stabilize large-VLA RL. `[arXiv:2501.16664 — ID unverified]`

**(f) RL inside a learned world model.** Covered in Part B, but it belongs conceptually here: it is the attempt to get RL's failure-learning without real-world interaction. WMPO (ICLR 2026), World-Env, VLA-RFT, RehearseVLA (CVPR 2026), RISE, PlayWorld, WoVR.

**(g) What the empirical studies say RL actually buys.** "What Can RL Bring to VLA Generalization? An Empirical Study" (arXiv:2505.19789, revised Jan 2026) is the systematic answer: SFT limits generalization because of compounding errors on out-of-distribution states; RL's gains are concentrated in *execution robustness* rather than semantic/task generalization. A 2026 follow-up ("What to Ignore, What to React," arXiv:2605.13105) finds RL-fine-tuned VLAs are newly fragile to *deployment-time visual* perturbations — an important negative result.

**Limitations:**
- Almost all RL-fine-tuning results are on simulated benchmarks (LIBERO, SimplerEnv, RoboTwin) or a handful of real tasks. Cross-paper comparison is unreliable.
- Reward specification remains unsolved: most methods use a hand-written success detector or a VLM-based one, which is itself a source of reward hacking.
- The reward-grounding gap is named as one of the four missing interfaces in arXiv:2606.06556.

**Primary sources:**
- Luo et al., *Precise and Dexterous Robotic Manipulation via Human-in-the-Loop Reinforcement Learning*, 2024. arXiv:2410.21845. https://hil-serl.github.io/
- Xu, Luo et al., *RLDG: Robotic Generalist Policy Distillation via Reinforcement Learning*, 2024. arXiv:2412.09858. https://arxiv.org/abs/2412.09858
- Chen et al., *ConRFT: A Reinforced Fine-tuning Method for VLA Models via Consistency Policy*, 2025. arXiv:2502.05450.
- Ren et al., *Diffusion Policy Policy Optimization*, 2024. arXiv:2409.00588. https://arxiv.org/abs/2409.00588
- Chen et al., *π_RL: Online RL Fine-tuning for Flow-based Vision-Language-Action Models*, 2025/2026. arXiv:2510.25889. https://arxiv.org/abs/2510.25889
- Xiao et al., *Probe, Learn, Distill: Self-Improving VLA Models with Data Generation via Residual RL*, ICLR 2026. arXiv:2511.00091. https://arxiv.org/abs/2511.00091
- Liu et al., *What Can RL Bring to VLA Generalization? An Empirical Study*, 2025/2026. arXiv:2505.19789. https://arxiv.org/html/2505.19789v4
- *What to Ignore, What to React: Visually Robust RL Fine-Tuning of VLAs*, 2026. arXiv:2605.13105. https://arxiv.org/html/2605.13105v1

**Confidence:** high (mechanisms and existence of results); medium (relative rankings between methods)

---

### A7. Model-predictive control and the classical baselines

**What it is:** The optimization-based control stack that learned methods are measured against: model-predictive control (MPC) over a dynamics model, and whole-body quadratic-program / inverse-dynamics control that maps desired accelerations and contact forces into torques subject to friction-cone and torque-limit constraints.

**Why it matters:** Practically every claim of the form "learning beat classical control" is under-specified unless the classical baseline is named. And the strongest 2026 result in this area is that the classical baseline is *better than the field assumed*.

**Concrete technical detail:**

*The structure of a classical legged stack.* Typically three layers running at different rates: (1) a footstep/contact planner; (2) an MPC layer optimizing a reduced-order model (single rigid body, or centroidal dynamics) over a ~0.5–1 s horizon at 20–100 Hz to produce a CoM trajectory and contact forces; (3) a whole-body QP / inverse-dynamics controller at 500–1000 Hz that tracks the MPC output subject to the full rigid-body dynamics, friction cones, and actuator limits. The reduced-order model in layer 2 exists because full-order MPC was assumed to be too slow.

*The 2026 result that undercuts that assumption.* Zhang, Howell, Yi, Pan, Shi, Qu, Erez, Tassa, Manchester, **Whole-Body Model-Predictive Control of Legged Robots with MuJoCo** (ICRA 2026, arXiv:2503.04613): plain **iLQR with MuJoCo dynamics and finite-difference-approximated derivatives** achieves *real-time whole-body MPC* on hardware for (a) dynamic quadruped locomotion, (b) a quadruped walking on two legs, and (c) full-sized humanoid bipedal locomotion — and, crucially, the policies "generalize to the real world with few sim-to-real considerations." The paper is explicitly framed as an easy-to-reproduce hardware baseline. https://johnzhang3.github.io/mujoco_ilqr

This matters for the atlas because it inverts the usual sim-to-real story: MPC has *no* sim-to-real gap in the RL sense — it re-solves online against the current state, so model error is corrected by feedback every control step rather than being baked into policy weights.

*What Boston Dynamics actually ships.* Spot's locomotion is an MPC-based controller into which RL was *added* to handle variability, not a wholesale replacement (BD blog, 2024-06-27). Atlas's 2024–2025 behaviours combined perception, model-based mobility and manipulation; the 2025 shift is to Large Behavior Models with TRI for *manipulation* behaviour, with the controls stack underneath (BD blog, 2025-08-20). The accurate framing is hybrid, not either/or. `[Exact current composition of BD's shipping controllers is not publicly specified — UNVERIFIED.]`

*Drake and contact-implicit optimization.* Drake (TRI/MIT) remains the reference for contact-implicit trajectory optimization and rigorous numerics; NVIDIA's own 2026 survey describes it as "the gold standard if you need contact-implicit trajectory optimisation and rigorous numerics rather than throughput." Drake's **hydroelastic contact model** — continuous pressure over finite-area patches instead of point contacts — is the specific idea Newton 1.0 adopted, and TRI is now formally partnering with Newton on solver and contact modeling.

*Where each wins, as of 2026:*

| | Model-based (MPC/WBC) | Sim-RL policy |
|---|---|---|
| Model error | Corrected online by re-solving | Must be anticipated at training time (DR/system ID) |
| Constraints | Explicit and enforced (friction cone, torque limits) | Implicit, via reward penalties; no guarantees |
| Compute at deploy | High (online optimization) | Low (one network forward pass) |
| Contact-mode discovery | Hard (combinatorial); needs contact-implicit methods | Emergent from exploration |
| Rich exteroception | Awkward to include | Natural (end-to-end from images/heightscans) |
| Recovery from surprise | Limited to the model's assumptions | Learned recovery behaviours if trained for them |
| Development cost | Model derivation + gain tuning | Reward tuning + randomization tuning |

**Limitations:** MPC needs a model, and for manipulation with unknown objects that model does not exist. Whole-body QP guarantees are only as good as the model and the contact-mode schedule. And model-based control has no story for "understand the language instruction."

**Primary sources:**
- Zhang et al., *Whole-Body Model-Predictive Control of Legged Robots with MuJoCo*, ICRA 2026. arXiv:2503.04613. https://arxiv.org/abs/2503.04613
- Boston Dynamics blogs (2024-06-27, 2025-08-20), as above.
- NVIDIA/HF, *The State of Simulation for Physical AI*, 2026-07-21 (Drake positioning).
- NVIDIA, Newton 1.0 blog, 2026-03-16 (hydroelastic contact; TRI partnership).
- Gu et al., *Humanoid Locomotion and Manipulation: Current Progress and Challenges*, 2025. arXiv:2501.02116. https://arxiv.org/html/2501.02116v2

**Confidence:** high

---

## Part B: World models

### Taxonomy of "world model"

The term is used for at least six distinct things. They differ in *what is predicted*, *in what space*, and *what the prediction is for*. Conflating them is the single most common source of sloppy writing in this area. The 2026 robot-learning survey (arXiv:2605.00080 §2.1) makes the key functional cut: a model is a world model **only if its predictions change under the agent's action in a way that is useful for decision-making** — "a model does not qualify as a world model in our sense simply because it generates plausible future images or videos."

| Paradigm | What it predicts | In what space | Trained on | Primary use | Representative systems |
|---|---|---|---|---|---|
| **1. Latent-dynamics world model (Dreamer-style)** | Next latent state + reward + continuation flag | Learned compact latent (stochastic + deterministic), decoded to pixels during training | Agent's own interaction data | Policy optimization by imagined rollout ("dreaming"); sample-efficient RL | Dreamer / DreamerV3, DayDreamer, Robotic World Model |
| **2. Decoder-free latent model for planning (TD-MPC style)** | Next latent state + reward, **no reconstruction** | Implicit latent trained only for value/reward prediction | Interaction data | Latent-space trajectory optimization (MPPI/CEM) at every control step | TD-MPC, TD-MPC2, Dream-MPC, BMPC |
| **3. Action-conditioned generative video model ("neural simulator")** | Future *pixels* given current frame(s) + action/text | Pixel or VAE-latent video space | Internet video + robot trajectories | Data generation, policy evaluation, RL post-training, interactive worlds | UniSim, IRASim, Cosmos 3, Genie 3, Odyssey, Interactive World Simulator, RoboWorld, 1X World Model |
| **4. Non-generative joint-embedding predictor (JEPA)** | Future *representation*, never pixels | Learned embedding space; trained by predicting masked/future embeddings | Internet video (+ small action-labelled set) | Zero-shot planning by energy minimization over latent goals; representation transfer | V-JEPA, V-JEPA 2, V-JEPA 2-AC, VLA-JEPA, JEPA-VLA |
| **5. World-Action Model (unified WM+policy)** | Future frames **and** action chunks from one backbone | Shared backbone; parallel generative and action heads | Robot trajectories + video | Policy with world-modeling as auxiliary objective / implicit lookahead | Cosmos Policy, DreamZero, Unified Video Action, WorldVLA, LingBot-VA, DreamVLA, FLARE |
| **6. Symbolic / structured world model** | Transitions over predicates, object relations, affordances, occupancy | Discrete/relational or 3D-occupancy space | Curated or perception-grounded | Long-horizon task planning; avoids pixel-space error accumulation | OccWorld, symbolic-abstraction hybrids (survey §8.5) |

Two things that are frequently called world models but are architecturally different and should be kept separate in the app:

- **A physics engine is a world model** in the classical sense (an explicit, hand-specified state-transition model). MuJoCo *is* a world model; it is just not a learned one. TD-MPC and MPC differ only in whether the dynamics are learned.
- **A 3DGS digital twin is not a world model** — it is a learned *renderer* bolted onto an engine's dynamics. Appearance is learned, physics is not.

---

### B1. Latent-dynamics world models for control

**What it is:** Learn a compact recurrent latent state space in which dynamics, reward, and (optionally) observations are predicted; then optimize a policy entirely on imagined latent trajectories.

**Why it matters:** This is the only world-model paradigm with a decade of evidence that it improves *sample efficiency on control*, and it is the direct ancestor of everything else in Part B.

**Concrete technical detail:**

**Dreamer / DreamerV3** (Hafner et al., arXiv:2301.04104; published as *Mastering diverse control tasks through world models*, Nature, 2025). Architecture: a Recurrent State-Space Model with a deterministic recurrent state and a stochastic (categorical) latent; an encoder maps observations into the posterior; a decoder reconstructs observations; separate reward and continue heads. Actor and critic are trained *purely on imagined latent rollouts*, backpropagating value gradients through the learned dynamics. The DreamerV3 contribution is a set of normalization tricks — symlog transforms of rewards and returns, two-hot reward encoding, free-bits KL balancing, percentile return normalization — that make **one fixed hyperparameter set** work across 150+ tasks in 8 domains. Headline: first agent to collect diamonds in Minecraft from scratch without human data or curricula.

**TD-MPC2** (Hansen et al., ICLR 2024, arXiv:2310.16828). The important architectural difference: **no decoder**. The latent is trained only to support reward and value prediction, so the model never spends capacity on visually irrelevant detail. At every control step it runs local trajectory optimization (MPPI) in latent space, warm-started from a learned policy prior. Reported: a single 317M-parameter agent across 104 continuous-control tasks in 4 task domains, with consistent scaling behaviour. https://www.tdmpc2.com/

**DayDreamer** (Wu, Escontrela, Hafner, Goldberg, Abbeel, CoRL 2022, arXiv:2206.14176). The existence proof that this works on real hardware without a simulator: Dreamer applied online to four physical robots, including a quadruped that **learned to roll over, stand, and walk from scratch in about one hour of real-world experience**.

**2026 successors and variants:**
- *Robotic World Model: A Neural Network Simulator for Robust Policy Optimization in Robotics* (arXiv:2501.10100, rev. Dec 2025) — learned world models targeted at robust legged/robot control rather than benchmark RL.
- *Dream-MPC* (arXiv:2605.04568) — gradient-based MPC with latent world models, built on BMPC, and explicitly motivated by the observation that in TD-MPC2 "the performance gap between the policy network and the MPC procedure is quite large."
- *LeWorldModel* (Maes et al., 2026, per survey §8.2) — latent-space world models specifically to cut the training and inference cost of video world models.
- *Fast-WAM* (arXiv:2603.16666) — uses world modeling **only during training** to shape representations and drops it at inference, which is a notable philosophical retreat from imagination-at-deploy-time.

**Limitations:**
- Dreamer-style methods are trained on the agent's *own* data; they do not inherit internet-scale priors, so they generalize poorly to genuinely novel scenes.
- Latent imagination compounds error; horizons are typically 15–50 steps.
- TD-MPC2's per-step planning is expensive relative to a policy forward pass, which limits control rate.
- These methods have essentially no story for language conditioning or semantic generalization, which is why the field's attention shifted to video models.

**Primary sources:**
- Hafner, Pasukonis, Ba, Lillicrap, *Mastering Diverse Domains through World Models*, arXiv:2301.04104; *Mastering diverse control tasks through world models*, Nature, 2025. https://www.nature.com/articles/s41586-025-08744-2
- Hansen, Su, Wang, *TD-MPC2: Scalable, Robust World Models for Continuous Control*, ICLR 2024. arXiv:2310.16828. https://arxiv.org/abs/2310.16828
- Wu et al., *DayDreamer: World Models for Physical Robot Learning*, CoRL 2022. arXiv:2206.14176. https://arxiv.org/abs/2206.14176
- *Robotic World Model*, arXiv:2501.10100. https://arxiv.org/abs/2501.10100
- *Dream-MPC*, 2026. arXiv:2605.04568. https://arxiv.org/html/2605.04568

**Confidence:** high

---

### B2. Video-prediction / generative world models as neural simulators

**What it is:** Large generative video models conditioned on actions and/or text, used as a stand-in for the environment.

**Why it matters:** This is where the money and the hype are, and as of mid-2026 it is also where the first genuinely load-bearing results have appeared.

**Concrete technical detail:**

**NVIDIA Cosmos.** The 2025 generation split into Cosmos Predict (world generation), Cosmos Transfer (controlled generation, e.g. structural-condition → photoreal), Cosmos Reason (scene understanding VLM), and Cosmos Policy. **Cosmos 3** (launched 2026-06-01 at GTC Taipei) collapses all of these into one **omni-model**:
- Architecture: Mixture-of-Transformers. Each modality (text, image, video, audio, action) has a dedicated encoder — ViT for visual understanding, VAE for visual/audio generation, domain-aware vectors for actions — projected into a shared representation space. The input sequence splits into an **autoregressive subsequence** (reasoning/understanding, next-token prediction) and a **diffusion subsequence** (generation, iterative denoising). The two use **separate parameter sets within each transformer layer but interact through joint attention**. This is what lets one checkpoint act as VLM, video generator, forward-dynamics model, inverse-dynamics model, or policy without architectural change.
- Modality routing (verbatim from the release): Action+Image+Text → Video = *forward dynamics model*; Text+Video → Action = *inverse dynamics model*; Image+Text → Video & Action = *policy model*.
- Sizes: **Cosmos 3 Nano, 16B (8B reasoner + 8B generator)**, workstation-class (RTX PRO 6000); **Cosmos 3 Super, 64B (32B + 32B)** for large-scale SDG and research. Both on Hugging Face; Diffusers integration (`Cosmos3OmniPipeline`); post-training scripts and 5 open SDG datasets (robot sim, PhysX sim, synthetic human motion, driving, warehouse).
- **Cosmos 3 Edge** (SIGGRAPH, July 2026): a 4B open world model; NVIDIA reports its AV simulator dropping from 64 GB300 GPUs to a single workstation.
- **Cosmos-H-Dreams** (July 2026): a *real-time interactive* surgical world model produced by distilling a slower teacher via causal warmup + **self-forcing distillation**. Related: NVIDIA reports Isaac for Healthcare's medical physics simulation compressing surgical-robot policy training from **>5 hours to under 2 minutes**.
- On LIBERO, **Cosmos Policy** reports 98.1 / 100.0 / 98.2 / 97.6 (Spatial/Object/Goal/Long), avg **98.5** (world-model survey Table 5).

**Google DeepMind Genie.** Genie 1 (ICML 2024) generated 2D worlds at ~1 fps from video-game footage with *learned latent actions*. Genie 2 (Dec 2024) added 3D, 360p, 10–20 s horizons. **Genie 3** (Aug 2025): text-prompted, navigable in **real time at 24 fps, 720p, consistent for a few minutes**. Adds "promptable world events" — changing weather or introducing objects/characters mid-rollout, which DeepMind explicitly frames as generating **counterfactuals** for agents. Tested with the SIMA agent sending navigation actions to Genie 3 to pursue goals; Genie 3 is unaware of the goal and simply simulates consequences.

Genie 3's own published limitations (verbatim structure, DeepMind 2025-08-05) are the most useful honest list in this whole area:
1. **Limited action space** — promptable events are environmental interventions, *not* actions performed by the agent; the range of direct agent actions is constrained.
2. **Interaction and simulation of other agents** — multi-agent interaction is an open problem.
3. **Accurate representation of real-world locations** — no geographic accuracy.
4. **Text rendering** — legible text only when supplied in the prompt.
5. **Limited interaction duration** — a few minutes, not hours.

Deployment reality: **Project Genie** launched 2026-01-29 for Google AI Ultra subscribers via Google Labs, capped at **60 seconds per world** because Genie 3 is autoregressive and dedicated compute makes longer sessions too expensive to scale; DeepMind's stated position is that extending the limit adds little testing value relative to cost. Street View integration added May 2026. Reported parameter count ~11B `[secondary source, medium confidence]`.

The most consequential *industrial* Genie derivative is the **Waymo World Model** (Feb 2026), built on Genie 3, which outputs lidar 4× faster than Genie 3 and exposes three control channels: driving-action control, scene-layout control (road layout and other vehicles' behaviour), and language control (environmental conditions). Waymo uses it to simulate edge cases (tornadoes, elephants) and it supported expansion to 11 US cities. This is the clearest existing case of a generative world model being load-bearing in a shipped robotic system — though note it is autonomous driving, not manipulation.

**Robotics-specific video world models.** GR-1 (arXiv:2312.13139) established the pattern: large-scale *video generative* pre-training then fine-tune for visual robot manipulation. GR-2 (arXiv:2410.06158) pre-trains on internet video to capture world dynamics, then fine-tunes on robot trajectories for multi-task manipulation. UniPi (Du et al., *Learning Universal Policies via Text-Guided Video Generation*, NeurIPS 2023 `[arXiv:2302.00111 — ID unverified]`) is the original "generate a video plan, then extract actions with an inverse dynamics model" pipeline — worth showing precisely because the survey's LIBERO table records **UniPi at 0.0 on LIBERO-Long**, a stark illustration of how far the decoupled pipeline has come.

**Others:** IRASim (ICCV 2025) — fine-grained action-conditioned world model for manipulation. Genie Envisioner — a unified world foundation platform for robotic manipulation. 1X: released a World Model (2024), ran the **1X World Model Challenge** (arXiv:2510.07092), and launched a dedicated **World Model Lab** on 2026-06-10 led by Sam Sinha. Odyssey: Odyssey-2 (Oct 2025), then **Starchild-1** (real-time audio *and* video at 24 fps) and **Agora-1** (four-player shared simulation) in May 2026, plus an Odyssey API and Odyssey-2 Pro.

**Are they usable as simulators for policy learning yet? The evidence, both directions.**

*For:*
- **Interactive World Simulator** (Wang et al., arXiv:2603.08546, Mar 2026). Uses **consistency models for both image decoding and latent-space dynamics prediction**, which is the specific trick that makes it fast and stable. Results: interaction-consistent pixel-level prediction, **stable long-horizon interaction for >10 minutes at 15 FPS on a single RTX 4090**, and — the headline — policies trained *entirely on world-model-generated demonstrations* "perform comparably to those trained on the same amount of real-world data," across rigid objects, deformables, object piles and their interactions. Also reports strong correlation between in-world-model and real-world policy performance.
- **RoboWorld** (Jeon et al., arXiv:2607.01060, Jul 2026). Automated evaluation pipeline: fast autoregressive video world model + a task-progress-aware VLM scorer. Introduces **Step Forcing** (combining anchored and one-step self-forwarded contexts) to cut train/test mismatch in long autoregressive rollouts. Alignment with real-robot evaluation: **Pearson r = 0.989, Spearman ρ = 0.970**.
- **RL inside world models beating alternatives.** Per the survey: World-Gymnast/WorldGym "demonstrates that RL inside a video world model can outperform both supervised finetuning and software simulators"; **PlayWorld** (arXiv:2603.09030) learns world models from autonomous play and shows RL in the learned simulator **improves downstream real-world performance**; **WMPO** (ICLR 2026, arXiv:2511.09515) does pixel-space imagination with on-policy GRPO; **RehearseVLA** (CVPR 2026) adds an "instant reflector" for reward and termination; **DiWA** shows a *frozen* world model learned from play data suffices for fully offline diffusion-policy adaptation.
- The **co-evolution** idea is the honest engineering response to model error: World-VLA-Loop uses policy failure rollouts to refine the simulator; VLAW alternates real-data simulator repair with synthetic-data policy improvement; **WoVR** (arXiv:2602.13977) treats simulator reliability as the central bottleneck and introduces keyframe-initialized rollouts plus explicit world-model/policy co-evolution.

*Against:*
- The survey's own verdict on evaluation: "visual plausibility is only a weak proxy for control utility, whereas action-grounded consistency and controllability are much more reliable indicators of downstream embodied usefulness" (§7.1.2).
- **Weak action conditioning** is named as the top open challenge (§8.1): many world models are trained mostly from observation history and task intent, so their futures are "semantically plausible or intention-consistent, but not necessarily faithful to the physical consequences of the candidate action." That is precisely the property you need for closed-loop control.
- **Efficiency**: world-model-based policies are "far more computationally intensive than VLA models," with diffusion denoising latency as the specific culprit (§8.2).
- **Missing modalities**: vision + proprioception cannot capture friction, stiffness, or contact stability; tactile/force integration is called "indispensable" (§8.3).
- **Benchmark saturation**: LIBERO averages cluster at 92–98.5 across all architectural paradigms, and the survey notes "strong results are not limited to a single architectural paradigm," with the discriminating suites being Goal and especially Long. Results on RoboTwin/CALVIN/SIMPLER "are more fragmented, and strong performance on one benchmark does not necessarily transfer to another."
- Genie 3's own limitation list (above) — a limited *agent* action space is disqualifying for manipulation policy learning specifically.

**Net assessment for mid-2026:** generative world models are demonstrably useful today for (i) **policy evaluation** (RoboWorld, WorldEval, real2sim-eval), (ii) **synthetic demonstration generation** for imitation (Interactive World Simulator), and (iii) **RL post-training in narrow, in-distribution task families** (WMPO, RehearseVLA, PlayWorld). They are *not* yet a general replacement for a physics engine, and no one credible claims they are.

**Primary sources:**
- NVIDIA, *Cosmos 3: Omnimodal World Models for Physical AI* (technical report), 2026-06-22. https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf ; launch: https://nvidianews.nvidia.com/news/nvidia-launches-cosmos-3-the-open-frontier-foundation-model-for-physical-ai ; HF: https://huggingface.co/blog/nvidia/cosmos-3-for-physical-ai
- NVIDIA, *Cosmos-H-Dreams*, 2026-07-27. https://huggingface.co/blog/nvidia/cosmos-h-dreams
- Parker-Holder & Fruchter, *Genie 3: A new frontier for world models*, Google DeepMind, 2025-08-05. https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/
- Bruce et al., *Genie: Generative Interactive Environments*, ICML 2024 (PMLR 235:4603–4623).
- Wikipedia, *Genie (world model)* (for Project Genie / Waymo World Model timeline and constraints; secondary but well-sourced). https://en.wikipedia.org/wiki/Genie_(world_model)
- Wang et al., *Interactive World Simulator for Robot Policy Training and Evaluation*, 2026. arXiv:2603.08546. https://arxiv.org/abs/2603.08546
- Jeon et al., *RoboWorld: Fast and Reliable Neural Simulators for Generalist Robot Policy Evaluation*, 2026. arXiv:2607.01060. https://arxiv.org/abs/2607.01060
- Zhu et al., *WMPO: World Model-based Policy Optimization for VLA Models*, ICLR 2026. arXiv:2511.09515. https://arxiv.org/html/2511.09515v1
- Jiang et al., *WoVR: World Models as Reliable Simulators for Post-Training VLA*, 2026. arXiv:2602.13977. https://arxiv.org/html/2602.13977
- Hou et al., *World Model for Robot Learning: A Comprehensive Survey*, 2026. arXiv:2605.00080. https://arxiv.org/abs/2605.00080
- Wu et al., *GR-2*, 2024. arXiv:2410.06158. Wu et al., *GR-1*, 2023. arXiv:2312.13139.
- 1X, *1X Launches World Model Lab*, 2026-06-10. https://www.1x.tech/discover/1x-world-model-lab
- Odyssey, *Introducing Odyssey-2*, 2025-10-27. https://odyssey.ml/introducing-odyssey-2

**Confidence:** high (system descriptions, published numbers); medium (whether the positive results generalize)

---

### B3. Non-generative predictive models: V-JEPA and the LeCun argument

**What it is:** Predict the *representation* of the future rather than the future itself. Train an encoder and a predictor jointly such that the predictor, given the current embedding and an action, matches the embedding produced by a target encoder on the true future — with no pixel reconstruction anywhere.

**Why it matters:** It is the principal architectural alternative to generative world models, and as of 2026 it is backed by a $3.5B company.

**Concrete technical detail:**

**V-JEPA 2** (Meta, arXiv:2506.09985, June 2025). Two stages.
1. *Action-free pretraining*: self-supervised masked latent prediction on **over 1 million hours of internet video** (plus images), at ~1B parameters (ViT-g class), using mask denoising and 3D-RoPE. Reported: state-of-the-art motion understanding — **77.3 top-1 on Something-Something v2** — and strong human-action anticipation on Epic-Kitchens-100. Also used as a video encoder for a VLM to get competitive video QA.
2. *Action-conditioned post-training* → **V-JEPA 2-AC**: freeze (or lightly adapt) the encoder and train an action-conditioned predictor on **less than 62 hours of unlabeled robot video from the Droid dataset**, with no rewards, no task-specific demonstrations, and no per-environment tuning.
3. *Deployment*: zero-shot planning on Franka arms in labs never seen in training. Control is by **energy minimization / model-predictive control in latent space**: specify a goal image, encode it, and search action sequences whose predicted latent lands closest to the goal latent; execute the first action; replan. Reported tasks: reaching, grasping, and pick-and-place.

**V-JEPA 2.1** exists (2026, "Unlocking dense features in video self-supervised learning," cited in arXiv:2605.00080). JEPA-style latent world modeling has also entered VLAs: **VLA-JEPA** and **JEPA-VLA** report LIBERO averages of **97.2** and **96.4** respectively (survey Table 5).

**The argument, stated as strongly as I can make it.**
1. Most of the information in a video frame is irrelevant to control (leaf texture, exact noise). A generative objective forces the model to spend capacity modelling it.
2. The future is genuinely multi-modal and partly unpredictable. A pixel-space model must either average (blurry) or sample (committing to arbitrary detail). Predicting in representation space lets the model *discard* what it cannot predict — the target encoder's output for unpredictable detail is not something the predictor is penalized for missing in a semantically meaningful way.
3. Planning wants an abstract state, not an image. If you must decode to pixels and re-encode to plan, the decoder is pure overhead.
4. Empirically: 62 hours of robot video → zero-shot planning, versus the many thousands of hours behind generative robot world models.
5. Institutionally: LeCun left Meta in Nov 2025 and founded **AMI Labs** (Advanced Machine Intelligence), which raised **$1.03B at a ~$3.5B valuation** in March 2026 — one of the largest seed rounds on record — explicitly to build world models rather than LLMs. AMI CEO Alexandre LeBrun's own prediction, given to TechCrunch: "'world models' will be the next buzzword. In six months, every company will call itself a world model to raise funding."

**The counterarguments, stated fairly.**
1. **Every currently usable interactive simulator is generative.** Genie 3, Cosmos 3, Odyssey, Interactive World Simulator. Nobody has shipped an interactive, inspectable, action-controllable JEPA environment.
2. **Latent-only objectives are hard to validate.** Without a decoder you cannot see what the model believes. Eric Xing (MBZUAI) has argued publicly that abstract latent prediction without a generative validator is unverifiable — you cannot distinguish a good world model from a collapsed one by looking at the loss. `[Position reported via secondary source (kenhuangus Substack, 2026-05-03) — UNVERIFIED against a primary Xing publication.]`
3. **V-JEPA 2-AC's demonstrated tasks are short-horizon single-arm pick-and-place.** No contact-rich assembly, no deformables, no whole-body.
4. **It still needs action-conditioned post-training.** The "learn from observation alone" framing is doing rhetorical work; the AC stage is where the controllability comes from.
5. **Empirically the two are comparable, not one dominant.** Survey Table 5: latent-space WM VLAs (97.2, 96.4) sit alongside video-based ones (Cosmos Policy 98.5, LingBot-VA 98.5, Say-Dream-ACT 98.1). Nothing in the data adjudicates the architectural argument.
6. **The efficiency argument is partially conceded by the generative camp itself.** Survey §8.2 notes that latent-space models like LeWorldModel exist precisely to reduce the cost of full high-dimensional generation, and Fast-WAM drops world modelling at inference entirely. That is the JEPA argument arriving through the back door.

**Limitations of the JEPA line as currently instantiated:** no public large-scale interactive JEPA simulator; no demonstrated advantage on contact-rich tasks; and representation-collapse prevention relies on architectural asymmetries (EMA target encoder, stop-gradient) whose theory is still thin.

**Primary sources:**
- Assran et al. (Meta FAIR), *V-JEPA 2: Self-Supervised Video Models Enable Understanding, Prediction and Planning*, 2025. arXiv:2506.09985. https://arxiv.org/abs/2506.09985 ; https://ai.meta.com/research/vjepa/
- *Value-guided action planning with JEPA world models*, 2025/2026. arXiv:2601.00844. https://arxiv.org/abs/2601.00844
- TechCrunch, *Yann LeCun's AMI Labs raises $1.03B to build world models*, 2026-03-09. https://techcrunch.com/2026/03/09/yann-lecuns-ami-labs-raises-1-03-billion-to-build-world-models/
- NYT, *Former Meta A.I. Chief's Start-Up Is Valued at $3.5 Billion*, 2026-03-10.
- LeCun, *World Models: Enabling the next AI revolution*, ETH Zurich, June 2026. `[Talk exists per secondary reporting; primary recording/slides UNVERIFIED.]`
- Hou et al., arXiv:2605.00080, Table 5 and §8.2.

**Confidence:** high (V-JEPA 2 technical facts, AMI funding); medium (fair representation of the debate's current balance)

---

### B4. Generative simulation and scene synthesis

**What it is:** Using foundation models to *author the simulation* — tasks, scenes, assets, and reward functions — rather than to replace the physics.

**Why it matters:** It sidesteps the entire physical-consistency failure mode of generative world models, because the generated content is executed by a real solver. This is currently the more reliable use of generative models in robot learning, and it is under-covered relative to video world models.

**Concrete technical detail:**

**RoboGen** (Wang et al., ICML 2024, arXiv:2311.01455). A full **propose → generate → learn** loop: an LLM proposes a task given a robot and objects; generates the corresponding scene configuration (object list, poses, articulation states); retrieves or generates the assets; writes the **reward function or success predicate**; then dispatches to an appropriate learning algorithm (RL for locomotion/contact-rich tasks, gradient-based trajectory optimization for soft-body, motion planning for pick-place). "Infinite data via generative simulation."

**Holodeck** (Yang et al., CVPR 2024, arXiv:2312.09067). Language-guided generation of 3D embodied environments: an LLM lays out rooms, selects objects from Objaverse, and places them subject to spatial-relational constraints solved as a constraint-satisfaction problem. Targets the *diversity* bottleneck in Embodied AI benchmarks.

**RoboCasa** (Nasiriany et al., RSS 2024, arXiv:2406.02523). 120 kitchen scenes, thousands of 3D objects (many generated by text-to-3D), 100 tasks; combined with MimicGen-style automated demonstration synthesis to scale a handful of human demos to ~100k trajectories. **RoboCasa365** (ICLR 2026) extends this to a much larger task suite. https://robocasa.ai/

**GRS** (arXiv:2410.15536) — generating simulation tasks *from real-world images*, i.e. real-to-sim task authoring rather than open-ended synthesis.

**Isaac Lab Mimic** — the productized version of demonstration amplification: from as little as a single human demonstration, generate "an effectively unbounded number of synthetic demonstrations," with parallelized environment execution for throughput (arXiv:2511.04831 §5.4).

**NVIDIA SDG datasets** — with Cosmos 3, NVIDIA released five open synthetic-data-generation datasets (robot sim, PhysX physics sim, synthetic human motion, driving sim, warehouse), which is the same idea at the data layer.

**Limitations:**
- Generated scenes are only as physically correct as their asset parameters. This is why "SimReady assets" (Lightwheel, tuning solvers against real-world measurement) is a commercial category rather than a solved problem.
- LLM-authored reward functions inherit all of Eureka's specification-gaming risks.
- Diversity of *generated* scenes tends to reflect the generator's priors, not the real deployment distribution — an unquantified distribution-shift risk.

**Primary sources:**
- Wang et al., *RoboGen: Towards Unleashing Infinite Data for Automated Robot Learning via Generative Simulation*, ICML 2024. arXiv:2311.01455. https://robogen-ai.github.io/
- Yang et al., *Holodeck: Language Guided Generation of 3D Embodied AI Environments*, CVPR 2024. arXiv:2312.09067. https://arxiv.org/abs/2312.09067
- Nasiriany et al., *RoboCasa*, RSS 2024. arXiv:2406.02523. https://robocasa.ai/ ; *RoboCasa365*, ICLR 2026. https://robocasa.ai/assets/robocasa365_iclr26.pdf
- NVIDIA, arXiv:2511.04831 §5.4 (Isaac Lab Mimic).

**Confidence:** high

---

### B5. The honest state of play: are world models improving real robot performance?

**Short answer as of 2026-08:** Yes, in three specific and narrow roles, with published evidence. No, as a general replacement for physics engines or for real data.

**Where the evidence is strongest (with the evidence):**

1. **Policy evaluation.** RoboWorld reports Pearson r = 0.989 / Spearman ρ = 0.970 between world-model evaluation and real-robot evaluation (arXiv:2607.01060). Interactive World Simulator reports strong sim-real correlation across rigid, deformable, and pile tasks (arXiv:2603.08546). WorldEval frames the criterion correctly as *policy-ranking fidelity* rather than pixel accuracy. This is the highest-value near-term application because real evaluation is the actual bottleneck in robot-learning research throughput.

2. **Synthetic demonstration generation for imitation.** Interactive World Simulator: policies trained *only* on world-model rollouts match policies trained on the same amount of real data.

3. **RL post-training in-distribution.** World-Gymnast: RL inside a video world model outperforming both SFT and software simulators. PlayWorld: RL in a play-learned simulator improving *real-world* downstream performance. WMPO, RehearseVLA, RISE, GigaBrain-0.5M scaling the same recipe.

**Where the evidence is weak or negative:**

- The survey's synthesis: "visual plausibility is only a weak proxy for control utility." Closed-loop benchmarks (World-in-World, arXiv:2510.18135) exist precisely because open-loop video metrics did not predict downstream success.
- **Weak action conditioning** is the named top open problem: models trained on observation history + task intent can produce futures that are plausible but not causally tied to the pending action (survey §8.1).
- **No tactile/force**, so friction, stiffness and contact stability are unmodelled (§8.3) — exactly the variables that make manipulation hard.
- **Long-horizon error accumulation** in pixel space is the motivation for the symbolic-abstraction research direction (§8.5).
- **No standard metric.** The survey's §8.6 is an explicit admission that the field cannot yet compare systems: "current comparisons are still fragmented across benchmarks and protocols."
- **Benchmark saturation.** LIBERO averages of 92–98.5 across every architectural paradigm mean the benchmark no longer distinguishes approaches.
- Nothing published shows a generative world model improving *humanoid whole-body locomotion* or *contact-rich industrial assembly* on real hardware. Those remain physics-engine territory, and the industry's investment (Newton's SDF + hydroelastic contact, Kamino for closed-loop linkages) reflects that.

**The one industrial deployment that clearly counts:** Waymo's Genie-3-derived World Model for edge-case simulation, credited with supporting expansion to 11 US cities (Feb–May 2026). This is autonomous driving, where the action space is low-dimensional and contact is (hopefully) absent — the easiest possible case for a generative simulator.

**Confidence:** medium-high. The positive results are recent (Mar–Jul 2026), largely un-replicated, and mostly from the groups proposing the methods.

---

## The learning-vs-model-based debate in 2026

**Steelman for learning (sim-RL / large policies):**

- Locomotion is settled: sim-RL controllers handle terrain, disturbances, and hardware variation that hand-designed stacks could not, and they do it with a single network forward pass at deploy time (Lee et al. 2020; Miki et al. 2022; Rudin et al. 2021).
- Perception integrates naturally. There is no clean way to put an RGB image into a QP.
- Scaling works and costs nothing extra per environment: 16,384 parallel environments at >1.6M FPS (Isaac Lab), 252–475× throughput gains from MJWarp (Newton 1.0). The cost curve is falling faster than the modeling-effort curve.
- Learned methods discover contact schedules that model-based methods must be told. Contact-mode enumeration is combinatorial; exploration is not.
- Semantics only exists on the learned side. Gemini Robotics 2 controls three different embodiments from one checkpoint and adapts to new bi-arm robots with <200 examples in a few hours. No model-based stack does that.
- The industry vote: Boston Dynamics added RL to Spot and moved Atlas manipulation to Large Behavior Models; Skild and Samsung are training RL/VLA policies in Newton.

**Steelman for model-based control:**

- The strongest single 2026 result in legged control is *not* a learning result. Plain iLQR + MuJoCo + finite-difference derivatives gives real-time whole-body MPC on quadrupeds and full-size humanoids with "few sim-to-real considerations" (arXiv:2503.04613, ICRA 2026). If a first-year-graduate-implementable baseline does that, many "learning was necessary" claims are unfalsified.
- **MPC has no sim-to-real gap in the RL sense.** It re-solves against the measured state every step, so model error is rejected by feedback rather than baked into weights. Domain randomization is, from this view, an expensive workaround for not closing the loop on the model.
- Constraints are enforced, not penalized. Friction cones and torque limits are hard constraints in a QP; in RL they are reward terms with no guarantee.
- Data efficiency is infinite in the relevant sense: MPC needs zero task data.
- Verifiability. You can reason about stability. The survey itself flags "reconciling neural expressivity with formal control guarantees, such as Lyapunov stability or robust control" as a critical frontier (arXiv:2605.00080 §8.4).
- Contact fidelity is a *modeling* problem, and the field just spent 2025–2026 importing model-based contact research (Drake's hydroelastic contact, SDF collision, contact-implicit optimization) into the learning stack. The learning stack's progress on manipulation is currently gated by better *models*, not better *algorithms*.

**Where the debate has actually landed (my read):**
The field has stopped arguing about it and hybridized along a clean division:
- **Model-based** owns anything with a good analytic model, hard constraints, and a need for guarantees: whole-body torque control, force control, safety layers, and increasingly the *low-level* interface below a learned policy.
- **Learning** owns anything requiring perception, semantics, contact discovery, or generalization across embodiment.
- The interesting new position is **model-based methods as the training signal for learned ones**: differentiable simulation (Newton), MPC-as-teacher for distillation, and world models used as forward dynamics for planning (survey §8.4).

The genuinely contested question in 2026 is not "learning or models" but **"where does the learned model live?"** — in the weights of a policy (sim-RL), in a learned latent dynamics model (Dreamer/TD-MPC2), in a video generator (Cosmos/Genie), or nowhere at all because you re-solve online (iLQR MPC).

---

## What an interactive explainer should show

For each, the ONE mechanism that must click, plus a concrete implementable spec.

**M1 — Massively parallel RL: where the wall-clock goes.**
The click: throughput, not algorithmic cleverness, is what made this work.
Build: a horizontal bar that splits one training iteration into `simulation time` / `learning time` / `CPU–GPU transfer`. A slider over `num_envs` (64 → 16,384). At low env counts the bar is dominated by transfer and Python overhead; at high counts it is dominated by simulation, and total wall-clock-to-target-reward drops from hours to minutes. Overlay Rudin's two ground-truth marks: **flat terrain 4 min, uneven terrain 20 min**. Add a "CPU single-core" toggle that reproduces the Isaac Lab finding that a 5090 workstation nearly matches a 2× RTX-PRO-6000 server.

**M2 — Domain randomization: the robustness/performance trade.**
The click: DR does not make the policy *better*; it makes it *less wrong across a distribution*, at a cost.
Build: a friction coefficient axis μ ∈ [0.2, 1.5]. Two policies: one trained at μ = 0.8 (point mass), one trained on U(0.3, 1.2). Plot success rate vs. true μ. Point-trained policy: a tall narrow spike (higher peak). DR-trained: a lower, much wider plateau. Then drop a vertical "real robot" line at an unknown μ and let the user drag it — the point is that you don't know where the line is, which is why you buy the plateau. Second slider widens the DR range and shows the peak collapsing (over-randomization).

**M3 — Teacher–student privileged distillation.**
The click: the student is not learning the task; it is learning to *infer the privileged variable* from history.
Build: side-by-side. Teacher panel shows the terrain heightmap under the feet in colour. Student panel shows only a scrolling strip of the last 50 joint-position/velocity readings. A third panel shows the student's *reconstructed* terrain estimate converging over ~0.5 s of history. Then add an occlusion/noise slider — as proprioceptive history degrades, the reconstruction blurs and the action divergence from the teacher grows. That is exactly Isaac Lab's "information-capacity mismatch" made visible.

**M4 — RMA: online system identification in latent space.**
The click: the adaptation module is a learned observer, running at control rate.
Build: a payload slider on a quadruped's back. Show a 2-D projection of the latent "extrinsics" vector as a moving dot. Change the payload mid-gait: the dot jumps, then converges within a few hundred milliseconds, and the gait visibly recovers. Contrast with a "no-adaptation" toggle where the robot sags and stumbles.

**M5 — ASAP: the delta-action model (sim→real→sim→real).**
The click: instead of randomizing over your ignorance, *measure* the residual and put it in the simulator.
Build: two trajectory traces, sim (blue) and real (red), diverging over 2 s. Then a "learn Δa" button trains a residual on the divergence; re-run and the sim trace snaps onto the real trace. Then "fine-tune policy in corrected sim" and re-run on real: divergence collapses. Include a caution overlay showing the delta model going invalid when the policy leaves the data distribution.

**M6 — Reward shaping is the real work.**
The click: a locomotion reward is a dozen competing terms and the weights fight each other.
Build: 10–12 sliders (velocity tracking, torque penalty, action rate, foot air time, base height, orientation, joint limits, collision, slip, termination). A live rollout preview. Deliberately construct three failure attractors reachable by slider movement: (a) torque penalty too high → the robot freezes and accepts the velocity-tracking penalty; (b) foot-air-time reward too high → prancing in place; (c) action-rate penalty too low → high-frequency joint chatter that would destroy a real actuator. Add an "Eureka" button that runs a scripted LLM-proposes-reward-code → train → reflect-on-statistics → mutate loop, showing the *code diff* at each generation. The point of the Eureka panel is the reflection step, not the result.

**M7 — Curriculum: the difficulty frontier.**
The click: with thousands of parallel robots you can *measure* where the frontier is and stay on it.
Build: Rudin's terrain grid, rows = difficulty tiers. Dots (robots) promote on success and demote on failure. Show the population distribution sliding up the grid over training. Toggle "no curriculum" → everyone starts on hard terrain, nobody succeeds, reward flatlines.

**M8 — The RL-fine-tuning ladder for VLAs.**
The click: there are four distinct places you can insert RL into a generalist policy, and they have different costs.
Build: a stacked diagram of a frozen VLA with four insertion points, each toggleable, each showing trainable-parameter count and required real-robot hours:
  1. Residual head on top of frozen VLA (residual RL / HiL-ResRL) — tiny params, low hours.
  2. Human-in-the-loop online RL (HIL-SERL) — highest real-world success, requires an operator.
  3. RL policies as *data generators*, distilled back (RLDG, PLD) — no RL at deploy, needs task-specific RL setup.
  4. Policy gradients through the generative action head (DPPO / ConRFT / π_RL) — full fine-tune, needs the log-likelihood trick.
Include a small inset animating the π_RL idea: the denoising chain unrolled as a second MDP layer, with Flow-SDE injecting noise at each denoising step to enable exploration.

**M9 — The world-model disambiguator.**
The click: six different things share one word.
Build: an interactive version of the taxonomy table. One scene, six panels, each showing what its paradigm actually predicts: (1) Dreamer — a latent vector + reward scalar, decoded to a fuzzy reconstruction; (2) TD-MPC2 — a latent vector and *no image at all*, with MPPI candidate trajectories fanning out; (3) Cosmos/Genie — a photoreal video frame; (4) V-JEPA 2 — an embedding vector with an explicit "no decoder" stamp, and a goal-embedding distance meter; (5) Cosmos Policy / WAM — frames *and* an action chunk emitted together; (6) symbolic — a predicate list (`on(cup, table)` → `in(cup, gripper)`). Clicking a panel highlights which of {policy learning, planning, evaluation, data generation} it is actually used for.

**M10 — Compounding error and why horizons are short.**
The click: autoregressive rollouts drift, and that is the binding constraint on every generative world model.
Build: a rollout timeline with a per-step error bar. At step 1 the prediction is near-perfect; by step 200 objects have morphed or vanished. Overlay real published horizon limits as vertical markers: Genie 2 (10–20 s), Genie 3 (a few minutes; Project Genie hard-capped at 60 s), Interactive World Simulator (>10 min at 15 FPS on one 4090). Add a "Step Forcing on/off" toggle (RoboWorld) showing the train/test mismatch reduction.

**M11 — Action conditioning: plausible vs. causal.**
The click: the top open problem in world models, and it is invisible in a video.
Build: two side-by-side rollouts from the *same* initial frame under *two different actions*. A well-conditioned model produces visibly different futures. A weakly-conditioned model produces near-identical futures (it is predicting from task intent, not from the action). Add a numeric "action sensitivity" score = distance between the two predicted futures, and let the user see that a model can score high on visual realism and near-zero on action sensitivity. This is the single most important idea in Part B and almost nothing on the internet visualizes it.

**M12 — World model as evaluator.**
The click: the near-term killer app is not training, it is *ranking*.
Build: five policy checkpoints. Left column: real-world success rates (ground truth). Right column: world-model-estimated success rates. Draw the scatter and the correlation line, annotated with RoboWorld's r = 0.989. Then let the user inject world-model error and watch the ranking scramble — showing that *rank fidelity*, not pixel accuracy, is the metric that matters.

**M13 — Learning vs. MPC, on the same robot.**
The click: they fail differently, and the failure modes are the argument.
Build: one quadruped, two controllers. Perturbation buttons: push, unexpected step-down, low-friction patch, +5 kg payload, joint-torque-limit reduction. For each, show both controllers' response plus a "why" annotation. MPC: rejects modelled disturbances cleanly, violates nothing, but degrades when the *model* is wrong (low friction). RL: absorbs unmodelled disturbances it was randomized over, fails ungracefully outside them. Show compute-per-control-step for each (MPC: online optimization; RL: one forward pass).

**M14 — Real-to-sim: what 3DGS does and does not give you.**
The click: Gaussian splatting solves *appearance*, not *physics*.
Build: a three-layer stack on one scene. Layer 1: the 3DGS reconstruction (photoreal, static). Layer 2: the physics proxy (convex hulls / SDFs) shown as wireframe over it. Layer 3: the resulting simulation. Then push an object: if only Layer 1 exists, it doesn't move. This kills the common misconception that a splat is a simulator.

---

## Open questions / contested claims

1. **Do RL-in-world-model gains survive outside the proposing lab's task suite?** World-Gymnast, PlayWorld, WMPO and RehearseVLA all report wins, all in 2025–2026, all largely unreplicated. LIBERO saturation (92–98.5 across every architecture) means the standard benchmark cannot adjudicate.
2. **Is weak action conditioning fixable by scale, or is it structural?** The survey names it the #1 challenge (§8.1). If futures are predictable from task intent alone, the training objective never forces genuine causal action dependence. `[Open]`
3. **Newton's 252×/475× MJX speedups are vendor-reported.** No independent replication.
4. **Genesis's performance claims remain unresolved.** A 2025 community benchmark disputed the original figures; the team published a revised report; there are still no independent third-party evaluations of the 2026 commercial models. Treat all Genesis numbers as unverified.
5. **What is Boston Dynamics actually running in production?** The public record shows RL added to Spot's locomotion and LBMs for Atlas manipulation, but the composition of the shipping controller stack is not disclosed. Avoid strong claims here.
6. **Does domain randomization or system identification win?** ASAP-style dynamics alignment and DR are usually presented as complementary, but no controlled study isolates their contributions on the same platform that I could find. `[Open]`
7. **Is a "pure JEPA" interactive simulator possible?** No public system does interactive, controllable, inspectable environment simulation without a decoder. Whether this is a fundamental limitation or an engineering gap is the crux of the LeCun debate.
8. **Do LLM-generated rewards produce sim-to-real-safe policies?** Eureka's fitness is measured in simulation. Nobody has published a systematic study of whether LLM-written rewards induce more or less contact-solver exploitation than human-written ones. `[Open]`
9. **The Eureka "83% / 52%" figures** are widely quoted; I did not re-verify them against the paper text in this pass. Verify before publishing.
10. **What is the right benchmark for world models?** Survey §8.6 is an explicit admission that none exists. Candidate criteria proposed: task success, policy-ranking fidelity, action sensitivity, long-horizon consistency, executability. `[Open]`
11. **Does RL fine-tuning trade robustness for performance?** arXiv:2605.13105 (2026) finds RL-fine-tuned VLAs newly fragile to deployment-time visual perturbations. If this generalizes it is a significant caveat to the whole RL-post-training programme.
12. **Whether generative video simulators will ever handle contact-rich manipulation.** All positive evidence so far is on quasi-static tabletop tasks. No published result shows a video world model producing usable training signal for tight-tolerance insertion — which is precisely the task Newton's SDF/hydroelastic work targets with an explicit physics engine.
13. **Genie 3's parameter count (~11B)** comes from a secondary source (a 2026 Springer volume), not DeepMind. Treat as unverified.

---

## Source list

**Simulation infrastructure**
- Makoviychuk et al., *Isaac Gym: High Performance GPU-Based Physics Simulation for Robot Learning*, 2021. arXiv:2108.10470. https://arxiv.org/abs/2108.10470
- NVIDIA, *Isaac Lab: A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning*, 2025. arXiv:2511.04831. https://arxiv.org/abs/2511.04831
- Zakka et al., *MuJoCo Playground*, 2025. arXiv:2502.08844. https://playground.mujoco.org/
- NVIDIA, *Newton Physics Engine* (product page). https://developer.nvidia.com/newton-physics
- Reist, Zamora Mora, Chang, Chadha, Mohajerani, *Newton Adds Contact-Rich Manipulation and Locomotion Capabilities for Industrial Robotics*, NVIDIA Technical Blog, 2026-03-16. https://developer.nvidia.com/blog/newton-adds-contact-rich-manipulation-and-locomotion-capabilities-for-industrial-robotics
- Nuñez Cano et al. (NVIDIA), *The State of Simulation for Physical AI: An Overview*, 2026-07-21. https://huggingface.co/blog/nvidia/state-of-simulation-for-physical-ai
- Genesis. https://github.com/Genesis-Embodied-AI/genesis-world ; benchmark dispute: https://stoneztao.substack.com/p/the-new-hyped-genesis-simulator-is
- Freeman et al., *Brax*, 2021. arXiv:2106.13281 `[ID unverified]`

**Sim-to-real and locomotion**
- Aljalbout et al., *The Reality Gap in Robotics: Challenges, Solutions, and Best Practices*, Annual Review of Control, Robotics, and Autonomous Systems 2026. arXiv:2510.20808. https://arxiv.org/abs/2510.20808
- Rudin, Hoeller, Reist, Hutter, *Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning*, CoRL 2021, PMLR 164:91–100. arXiv:2109.11978. https://proceedings.mlr.press/v164/rudin22a.html
- Lee, Hwangbo, Wellhausen, Koltun, Hutter, *Learning quadrupedal locomotion over challenging terrain*, Science Robotics 5(47), 2020. arXiv:2010.11251. https://www.science.org/doi/10.1126/scirobotics.abc5986
- Kumar, Fu, Pathak, Malik, *RMA: Rapid Motor Adaptation for Legged Robots*, RSS 2021. arXiv:2107.04034. https://arxiv.org/abs/2107.04034
- Lin et al., *Sim-to-Real Reinforcement Learning for Vision-Based Dexterous Manipulation on Humanoids*, 2025. arXiv:2502.20396. https://toruowo.github.io/recipe/
- Tobin et al., *Domain Randomization*, 2017. arXiv:1703.06907 `[ID unverified]`
- Peng et al., *Sim-to-Real Transfer of Robotic Control with Dynamics Randomization*, 2018. arXiv:1710.06537 `[ID unverified]`
- OpenAI et al., *Solving Rubik's Cube with a Robot Hand* (ADR), 2019. arXiv:1910.07113 `[ID unverified]`
- Wu et al., *RL-GSBridge*, 2024/2025. arXiv:2409.20291
- *RoboGSim: A Real2Sim2Real Robotic Gaussian Splatting Simulator*, 2024. arXiv:2411.11839. https://arxiv.org/abs/2411.11839
- Zhang et al., *Real-to-Sim Robot Policy Evaluation with Gaussian Splatting Simulation of Soft-Body Interactions*, 2025. arXiv:2511.04665. https://real2sim-eval.github.io/

**Humanoid whole-body control**
- He et al., *OmniH2O*, CoRL 2024. arXiv:2406.08858. https://omni.human2humanoid.com/
- Ji et al., *ExBody2*, 2024. arXiv:2412.13196
- He et al., *ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid Whole-Body Skills*, RSS 2025. arXiv:2502.01143. https://agile.human2humanoid.com/
- Chen et al., *GMT: General Motion Tracking for Humanoid Whole-Body Control*, 2025. arXiv:2506.14770. https://gmt-humanoid.github.io/
- *KungfuBot*, 2025. arXiv:2506.12851
- *Robust and Generalized Humanoid Motion Tracking*, 2026. arXiv:2601.23080
- *Learning Whole-Body Humanoid Locomotion via Motion Generation*, 2026. arXiv:2604.17335
- Xue et al., *LeVERB*, 2025. arXiv:2506.13751
- Gu et al., *Humanoid Locomotion and Manipulation: Current Progress and Challenges*, 2025. arXiv:2501.02116
- Google DeepMind, *Gemini Robotics 2 brings whole body intelligence to robots*, 2026-07-30. https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/
- Boston Dynamics, *Starting on the Right Foot with Reinforcement Learning*, 2024-06-27; *Large Behavior Models and Atlas Find New Footing*, 2025-08-20.

**Reward design and curriculum**
- Ma et al., *Eureka: Human-Level Reward Design via Coding Large Language Models*, ICLR 2024. arXiv:2310.12931. https://eureka-research.github.io/
- *Reward Design Agent for Reinforcement Learning*, 2026. arXiv:2606.01672
- *Gain Tuning Is Not What You Need: Reward Gain Adaptation for Locomotion*, 2025. arXiv:2510.10759
- *Stage-Wise Reward Shaping for Acrobatic Robots*, 2024. arXiv:2409.15755
- *Not Only Rewards But Also Constraints: Applications on Legged Robot Locomotion*, 2024.

**Offline RL and RL fine-tuning**
- Kumar et al., *Conservative Q-Learning*, NeurIPS 2020. arXiv:2006.04779 `[ID unverified]`
- Kostrikov et al., *Offline RL with Implicit Q-Learning*, ICLR 2022. arXiv:2110.06169 `[ID unverified]`
- Chebotar et al., *Q-Transformer*, CoRL 2023. https://qtransformer.github.io/ ; arXiv:2309.10150 `[ID unverified]`
- Luo et al., *HIL-SERL: Precise and Dexterous Robotic Manipulation via Human-in-the-Loop Reinforcement Learning*, 2024. arXiv:2410.21845. https://hil-serl.github.io/
- Xu, Luo et al., *RLDG*, 2024. arXiv:2412.09858
- Chen et al., *ConRFT*, 2025. arXiv:2502.05450
- Ren et al., *Diffusion Policy Policy Optimization (DPPO)*, 2024. arXiv:2409.00588. https://diffusion-ppo.github.io/
- Chen et al., *π_RL: Online RL Fine-tuning for Flow-based VLA Models*, 2025/2026 (v3). arXiv:2510.25889
- Xiao et al., *Probe, Learn, Distill (PLD)*, ICLR 2026. arXiv:2511.00091. https://wenlixiao.com/self-improve-VLA-PLD
- *iRe-VLA*, 2025. arXiv:2501.16664 `[ID unverified]`
- Liu et al., *What Can RL Bring to VLA Generalization? An Empirical Study*, 2025/2026. arXiv:2505.19789
- *What to Ignore, What to React: Visually Robust RL Fine-Tuning of VLAs*, 2026. arXiv:2605.13105
- *HiL-ResRL*, 2026. arXiv:2606.22860
- *RL Token: Bootstrapping Online RL with VLA Models*, 2026. arXiv:2604.23073

**Model-based control**
- Zhang, Howell, Yi, Pan, Shi, Qu, Erez, Tassa, Manchester, *Whole-Body Model-Predictive Control of Legged Robots with MuJoCo*, ICRA 2026. arXiv:2503.04613. https://johnzhang3.github.io/mujoco_ilqr
- Drake. https://drake.mit.edu/ ; hydroelastic contact background: https://medium.com/toyotaresearch/rethinking-contact-simulation-for-robot-manipulation-434a56b5ec88

**World models — surveys and position**
- Hou, Li, Jia, An, Guo, Leng, Geng, Ze, Harada, Torr, Mees, Pollefeys, Liu, Wu, Abbeel, Malik, Du, Yang, *World Model for Robot Learning: A Comprehensive Survey*, 2026. arXiv:2605.00080. https://arxiv.org/abs/2605.00080 ; https://ntumars.github.io/wm-robot-survey/
- Karcini, Mehrban, Nguyen, Schwager, Ajoundani, Cadena, Peters, Hutter, Bou-Ammar, *Robots Need More Than VLAs & World Models*, 2026. arXiv:2606.06556. https://arxiv.org/html/2606.06556v1
- *Robot Learning: A Tutorial*, 2025. arXiv:2510.12403

**World models — latent dynamics**
- Hafner et al., *Mastering Diverse Domains through World Models* (DreamerV3), arXiv:2301.04104; Nature version: *Mastering diverse control tasks through world models*, 2025. https://www.nature.com/articles/s41586-025-08744-2
- Hansen, Su, Wang, *TD-MPC2*, ICLR 2024. arXiv:2310.16828. https://www.tdmpc2.com/
- Wu, Escontrela, Hafner, Goldberg, Abbeel, *DayDreamer*, CoRL 2022. arXiv:2206.14176
- *Robotic World Model: A Neural Network Simulator for Robust Policy Optimization in Robotics*, 2025. arXiv:2501.10100
- *Dream-MPC*, 2026. arXiv:2605.04568
- *Fast-WAM: Do World Action Models Need Test-Time Future Imagination?*, 2026. arXiv:2603.16666

**World models — generative video / neural simulators**
- NVIDIA, *Cosmos 3: Omnimodal World Models for Physical AI*, technical report, 2026-06-22. https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf
- NVIDIA, *NVIDIA Launches Cosmos 3*, press release, 2026-06-01. https://nvidianews.nvidia.com/news/nvidia-launches-cosmos-3-the-open-frontier-foundation-model-for-physical-ai
- NVIDIA/HF, *Welcome NVIDIA Cosmos 3*, 2026-06-01. https://huggingface.co/blog/nvidia/cosmos-3-for-physical-ai
- NVIDIA/HF, *Cosmos-H-Dreams*, 2026-07-27. https://huggingface.co/blog/nvidia/cosmos-h-dreams
- Parker-Holder & Fruchter, *Genie 3: A new frontier for world models*, DeepMind, 2025-08-05. https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/
- Bruce et al., *Genie: Generative Interactive Environments*, ICML 2024, PMLR 235:4603–4623.
- Wikipedia, *Genie (world model)* (Project Genie, Waymo World Model timeline). https://en.wikipedia.org/wiki/Genie_(world_model)
- Wang et al., *Interactive World Simulator for Robot Policy Training and Evaluation*, 2026. arXiv:2603.08546
- Jeon, Ye, Doo, Kim, Seo, Son, Lee, *RoboWorld*, 2026. arXiv:2607.01060
- Zhu et al., *WMPO*, ICLR 2026. arXiv:2511.09515
- Jiang et al., *WoVR: World Models as Reliable Simulators for Post-Training VLA*, 2026. arXiv:2602.13977
- Yang et al., *RISE: Self-Improving Robot Policy with Compositional World Model*, 2026. arXiv:2602.11075
- Yin et al., *PlayWorld: Learning Robot World Models from Autonomous Play*, 2026. arXiv:2603.09030
- Ye et al., *World Action Models are Zero-Shot Policies* (DreamZero), ICLR 2026 Workshop. arXiv:2602.15922
- Zhang et al., *World-in-World: World Models in a Closed-Loop World*, 2025. arXiv:2510.18135
- Wu et al., *GR-2*, 2024. arXiv:2410.06158. https://gr2-manipulation.github.io/
- Wu et al., *GR-1: Unleashing Large-Scale Video Generative Pre-training for Visual Robot Manipulation*, 2023. arXiv:2312.13139
- Du et al., *Learning Universal Policies via Text-Guided Video Generation* (UniPi), NeurIPS 2023. arXiv:2302.00111 `[ID unverified]`
- Yang et al., *Learning Interactive Real-World Simulators* (UniSim), ICLR 2024. arXiv:2310.06114
- 1X, *1X Launches World Model Lab*, 2026-06-10. https://www.1x.tech/discover/1x-world-model-lab ; *1X World Model Challenge*, arXiv:2510.07092
- Odyssey, *Introducing Odyssey-2*, 2025-10-27. https://odyssey.ml/introducing-odyssey-2 ; Starchild-1 / Agora-1 (2026-05).

**World models — non-generative**
- Assran et al., *V-JEPA 2: Self-Supervised Video Models Enable Understanding, Prediction and Planning*, 2025. arXiv:2506.09985. https://ai.meta.com/research/vjepa/
- *Value-guided action planning with JEPA world models*, 2026. arXiv:2601.00844
- TechCrunch, *Yann LeCun's AMI Labs raises $1.03B to build world models*, 2026-03-09. https://techcrunch.com/2026/03/09/yann-lecuns-ami-labs-raises-1-03-billion-to-build-world-models/

**Generative simulation**
- Wang et al., *RoboGen*, ICML 2024. arXiv:2311.01455. https://robogen-ai.github.io/
- Yang et al., *Holodeck*, CVPR 2024. arXiv:2312.09067
- Nasiriany et al., *RoboCasa*, RSS 2024. arXiv:2406.02523. https://robocasa.ai/ ; *RoboCasa365*, ICLR 2026. https://robocasa.ai/assets/robocasa365_iclr26.pdf
- *GRS: Generating Robotic Simulation Tasks from Real-World Images*, 2024. arXiv:2410.15536
