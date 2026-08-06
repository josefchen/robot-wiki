# The Frontier, the Unsolved Problems, and Where This Is Going
_Research snapshot: 2026-08-06_

## Executive summary

- The dominant paradigm in 2026 is the vision-language-action (VLA) foundation model: a pretrained vision-language backbone with a diffusion or flow-matching action expert, trained on heterogeneous multi-robot data and post-trained for downstream tasks. Physical Intelligence's π0 → π0.5 → π*0.6 → π0.7 progression is the clearest published arc; Google DeepMind's Gemini Robotics 2 and NVIDIA's GR00T N2 are the other major industrial efforts.

- π0.7 (April 2026) demonstrates the first published evidence of **compositional generalization** — recombining skills to solve tasks not in training data (e.g., operating an unseen air fryer with language coaching) — and **cross-embodiment transfer** (folding laundry on a bimanual UR5e with zero training data for that robot). This is a real advance but still requires coaching and does not always complete the task.

- The reliability gap remains the field's central practical problem. π*0.6 with Recap (RL from experience) more than doubles throughput on espresso, laundry, and box-assembly tasks and reaches >90% success, but this is per-task specialist performance after hours of on-robot RL. The generalist π0.7 model matches specialist throughput only on tasks where it has distilled specialist experience.

- **No shared real-robot benchmark exists with cross-lab agreement.** RoboArena (distributed pairwise A/B evaluation across 7 universities), RoboChallenge (hosted fleet of 10 robots with controlled visual reproduction), and ManipulationNet (standardized hardware kits) are all 2025–2026 attempts to solve this. The evaluation crisis is real: RoboChallenge documents that the same model on the same task can score 0% or 100% depending on who sets up the scene.

- **Data is the bottleneck.** Total global robot manipulation data is estimated at ~300,000 hours (Bessemer, April 2026). NVIDIA's EgoScale (Feb 2026) shows a log-linear scaling law (R²=0.9983) between egocentric human video pretraining (20,854 hours) and downstream robot performance — the first strong evidence that robotics foundation models follow data-driven improvement curves analogous to LLMs.

- **Tactile sensing is the most under-addressed modality.** Rodney Brooks argues forcefully (Sept 2025) that vision-only training cannot produce human-level dexterity, citing Johansson's anesthetized-finger experiments. Figure 03 (Jan 2026) and Gemini Robotics 2 (July 2026) both integrate fingertip tactile sensors, but no large-scale tactile dataset or foundation model exists.

- **Scaling-law uncertainty is unresolved.** The "just scale data" camp (EgoScale's log-linear law, π0.7's compositional generalization from diverse data) vs. the "we need better structure/priors" camp (Ken Goldberg's "100,000-year data gap" argument for GOFE, Brooks's argument for tactile sensing and engineered priors) remains a live disagreement with named proponents on both sides.

- **Humanoid deployment is narrow and early.** As of July 2026, Tesla has not started Optimus production at Fremont and has never published a production count. Figure's 1,250+ hours at BMW Spartanburg and Agility's 65,000+ hours across 9 facilities are the strongest verified deployment records. Unitree ships the most units (~5,500 in 2025) at ~$16,000 each but saw Q1 2026 profit fall 52% YoY.

- **On-robot inference is a binding constraint.** VLA-Perf (NVIDIA, Feb 2026) shows π0 (2.7B) runs at 19 Hz on Jetson Thor, 32 Hz on RTX 4090, and 314 Hz on B100. Scaling to 16.7B parameters drops Jetson Thor to 2.1 Hz. Action chunking, asynchronous inference, and dual-system designs are the workarounds; distillation (as in RL-100's consistency distillation) is the path to high-frequency control.

- **RL on real robots works but is expensive.** π*0.6's Recap and RL-100 (Science Robotics, July 2026) both demonstrate that real-world RL on top of imitation pretraining substantially improves success rate and throughput. RL-100 reports 100% success across 1,000 episodes on 8 tasks. But both require per-task training and on-robot data collection.

- **Long-horizon tasks require memory.** Physical Intelligence's MEM (March 2026) gives VLAs both short-term (video-encoded) and long-term (text-based) memory, enabling 15-minute tasks like cleaning a kitchen or cooking grilled cheese. Without memory, models repeat failed strategies; with memory, they adapt after 1–2 attempts.

- **Sim-to-real for contact remains unsolved.** Newton (NVIDIA/DeepMind/Disney, open-sourced 2025, contact-rich capabilities added April 2026) and MuJoCo Warp provide GPU-accelerated differentiable physics, but contact dynamics, deformables, and liquids still do not transfer reliably. 3D Gaussian splatting (3DGS) real-to-sim is emerging as a scalable evaluation shortcut but does not solve the physics gap.

- **The bear case is serious.** Rodney Brooks calls dexterity-from-vision "pure fantasy thinking" and predicts practical humanoid robots are decades away. Morgan Stanley (July 2026) warns of a "PR problem" and says investors are "increasingly looking for tangible evidence of real-world ROI." Unitree's profit halving despite volume leadership underscores unit economics risk. A humanoid robot collapsed on stage at Computex 2026.

- **The competing theses are not settled.** End-to-end VLA scaling, hierarchical VLM-planner + skill library, world-model-based training, RL-finetuning on imitation pretraining, teleop-in-the-loop as a bridge, and humanoid-general vs. task-specific form factor all have serious proponents and falsifiable predictions.

---

## Part A: Unsolved problems

### 1. Dexterity

**Precise statement:** A robot should be able to perform contact-rich manipulation — in-hand reorientation, deformable manipulation (cloth, food, liquids), tool use, bimanual coordination — at human-level speed, reliability, and generality, from visual and tactile input, without per-task engineering.

**Why it is hard (the technical obstruction):** The core obstruction is that dexterous manipulation requires **closed-loop tactile feedback** that current robot hands and training pipelines do not provide. Rodney Brooks (Sept 2025) argues this directly: human hands have ~17,000 low-threshold mechanoreceptors in glabrous skin, ~1,000 at each fingertip, firing at rates that enable sub-millisecond force adjustment. He cites Johansson's experiments showing that a person whose fingertips are anesthetized takes dramatically longer to light a match (from 7 seconds to minutes of fumbling), despite retaining full visual and proprioceptive feedback. Brooks's argument: "Vision alone is not enough. The physical world is not fully observable through vision." Current humanoid training pipelines (Tesla's vision-only approach, Figure's "project go big" learning from first-person human video) explicitly do not use force or haptic feedback during training. Benjie Holson catalogs the limitations: no force feedback at wrists, limited finger control (open/close only), no sense of touch, ~1–3 cm precision. The second obstruction is **contact dynamics are discontinuous**: small changes in pose or force produce qualitatively different outcomes (stick vs. slip), making the mapping from observations to actions non-smooth and hard to learn from demonstrations alone.

**What has been tried:**
- Diffusion-based action policies (Diffusion Policy, π0 flow matching) for multimodal action distributions.
- Bimanual teleoperation systems (ALOHA, Mobile ALOHA) for fine-grained demonstration collection.
- RL on real robots (π*0.6 Recap, RL-100) to improve reliability beyond imitation learning.
- Tactile sensors integrated into hands (Figure 03 fingertip sensors at 3g sensitivity, Sanctuary Phoenix micro-barometers at 5mN).
- Tactile foundation models (TouchWorld, Sparsh-X with ~1M contact-rich interactions, N0-Foundation).
- Cross-embodiment transfer (π0.7 folding laundry on UR5e with no training data for that robot).

**Best current result:** π0.7 (April 2026) performs specialist-level dexterity out-of-the-box: peeling vegetables, folding diverse laundry, making espresso, assembling boxes — all with a single generalist model, matching the throughput of RL-trained specialists. On the Robot Olympics benchmark (Dec 2025), fine-tuned π0.6 achieved gold on 3/5 categories (door traversal, key use, greasy pan cleaning) with 52% average success rate and 72% task progress, using <9 hours of data per task. RL-100 (Science Robotics, July 2026) reports 100% success (1000/1000 episodes) across 8 tasks including cloth folding, unscrewing, and multi-stage juicing, with a robot serving customers for 7 hours without failure. Figure's Helix 02 (Jan 2026) demonstrates unscrewing bottle caps, extracting individual pills, and dispensing precise syringe volumes using tactile feedback and palm cameras.

**What "solved" would look like:** A single policy that can handle any household manipulation task (folding, cooking, cleaning, tool use, deformables) at >95% success rate in unseen homes, with no per-task data collection, at human-comparable speed, using both vision and touch. No current system meets this bar.

**Primary sources:**
- π0.7: https://www.pi.website/blog/pi07
- π*0.6 (Recap): https://www.pi.website/blog/pistar06
- Robot Olympics: https://www.pi.website/blog/olympics
- Rodney Brooks, "Why Today's Humanoids Won't Learn Dexterity": https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/
- Benjie Holson, "Humanoid Olympic Games": https://generalrobots.substack.com/p/benjies-humanoid-olympic-games
- RL-100: https://arxiv.org/abs/2510.14830 ; Science Robotics: https://www.science.org/doi/10.1126/scirobotics.aed6267
- Figure Helix 02: https://www.figure.ai/news/helix-02
- TouchWorld: https://arxiv.org/abs/2607.07287
- Sparsh-X: https://arxiv.org/html/2506.14754v1

**Confidence:** medium — the trajectory is real (π0.7 and RL-100 are genuine advances) but the tactile-sensing gap identified by Brooks remains largely unaddressed at scale.

---

### 2. Generalization

**Precise statement:** A policy trained on a set of scenes, objects, and tasks should work in unseen homes, with unseen objects, under unseen lighting and clutter conditions, without per-site data collection or fine-tuning.

**Why it is hard (the technical obstruction):** The training distribution of robot data is narrow relative to the test distribution. Robot demonstrations are collected in a small number of labs with specific robots, cameras, and lighting. Real homes have different geometries, object instances, backgrounds, and clutter levels. The gap between "works on the training scenes" and "works in an unseen home" is a distribution-shift problem, compounded by the fact that physical interaction is more sensitive to small perceptual errors than text generation (a 1cm grasp error drops the object). π0.5's web-scale vision-language pretraining helps with semantic generalization (understanding what "the spatula" is) but does not help with motor generalization (how to grasp a spatula with a different gripper in a different kitchen).

**What has been tried:**
- Web-scale vision-language pretraining (π0, RT-2, Gemini Robotics) for semantic generalization.
- Diverse multi-robot data co-training (Open X-Embodiment, DROID dataset).
- Human video pretraining (EgoScale: 20,854 hours of egocentric human video → log-linear scaling law).
- Diverse conditioning / prompt engineering (π0.7's multimodal prompts with language, metadata, visual subgoals, control modality labels).
- Cross-embodiment transfer (π0.7 on UR5e, Gemini Robotics On-Device 2 adapting to new embodiments with <200 examples).

**Best current result:** π0.5 (April 2025) demonstrated open-world generalization: cleaning an entirely new kitchen or bedroom it had never seen. π0.7 (April 2026) goes further: compositional generalization (using an unseen air fryer with language coaching) and cross-embodiment transfer (folding laundry on a UR5e with no training data, matching the zero-shot success rate of expert teleoperators with 375 hours of experience). EgoScale (Feb 2026) shows a 54% improvement in average success rate from human video pretraining on a 22-DoF dexterous hand, with a log-linear scaling law (R²=0.9983) between pretraining data size and downstream performance. Gemini Robotics 2 (July 2026) adapts to new bi-arm embodiments with <200 examples in a few hours.

**What π0.5-style results actually demonstrate and what they don't:** They demonstrate that a single policy can perform a task (e.g., kitchen cleanup) in a new environment without per-site data, which is a genuine advance over task-specific policies. They do NOT demonstrate that the policy works reliably (>95%) across the full distribution of homes, nor that it handles objects and configurations outside its training distribution without coaching. π0.7's air fryer attempt "makes a reasonable attempt, performing part of the task after a few false starts, but not finishing it fully" without coaching — compositional generalization is emergent but not reliable.

**What "solved" would look like:** A single policy achieving >90% success on N unseen homes with no per-site data, across a broad distribution of tasks, objects, and configurations. No current system has been evaluated this way in published, reproducible form.

**Primary sources:**
- π0.5: https://www.pi.website/blog/pi05 ; arXiv: https://arxiv.org/abs/2504.16054
- π0.7: https://www.pi.website/blog/pi07
- EgoScale: https://research.nvidia.com/labs/gear/egoscale/ ; arXiv: https://arxiv.org/abs/2602.16710
- Gemini Robotics 2: https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/
- "Robots Need More Than VLAs & World Models" (position paper): https://arxiv.org/html/2606.06556v1

**Confidence:** medium — the scaling-law evidence is strong but the gap between lab demos and reliable in-home deployment is documented by the field's own practitioners (Bessemer: "the gap between lab performance and field deployment remains wide").

---

### 3. Long-horizon tasks and error recovery

**Precise statement:** A robot should be able to execute multi-step tasks lasting 10+ minutes (e.g., clean a kitchen, cook a meal) without reset, detect its own failures, retry with a different strategy, and maintain coherent task state across steps.

**Why it is hard (the technical obstruction):** Per-step errors compound. If each step has 95% success, a 30-step task succeeds 21% of the time. Open-loop action chunking (executing a fixed sequence of predicted actions without re-observing) makes this worse because the policy cannot react to its own mistakes. Without memory, a model that fails at a step retries the same strategy — Physical Intelligence's MEM paper shows this directly: "without memory, the robot tends to fail in the same way repeatedly. Since it doesn't remember the previous attempt, it simply retries the same behavior." The model also needs to track task state (which steps are done, where objects are when occluded) over long time horizons, which requires memory beyond the current observation. Causal confusion (Ross et al., 2019) can make memory systems worse by amplifying spurious correlations.

**What has been tried:**
- Hierarchical systems: high-level language policy generates subtasks, low-level policy executes them (π0.5, π0.7, Gemini Robotics ER 2, Figure Helix S1/S2).
- Multi-scale memory: MEM (March 2026) with short-term video-encoded observations and long-term text-based memory.
- In-context adaptation: MEM shows that with memory, a model tries a different strategy after 1–2 failed attempts (e.g., picking up a chopstick, opening a fridge in the wrong direction).
- RL from experience: π*0.6 Recap enables learning from autonomous episodes, addressing compounding errors.
- Autonomous evaluation: AutoEval (Zhou et al., 2025) for measuring real-world policy performance without human supervision.

**Best current result:** π0.6 with MEM (March 2026) solves tasks up to 15 minutes long (cleaning an entire kitchen, cooking grilled cheese from scratch, retrieving ingredients for a recipe), with significant improvements over no-memory baselines. Figure Helix 02 (Jan 2026) performs a 4-minute continuous dishwasher-unloading task with 61 loco-manipulation actions, "ordered correctly, with implicit error recovery." π*0.6 with Recap runs for an entire day making espresso (5:30am–11:30pm), folds 50 novel laundry items in a new home for hours, and assembles 59 boxes used in a real factory.

**What "solved" would look like:** A robot that can execute a full day's chores (clean kitchen, cook dinner, do laundry) autonomously with >95% task completion, detecting and recovering from its own failures, without human intervention or reset. Current systems handle 15 minutes; the target is hours.

**Primary sources:**
- MEM: https://www.pi.website/research/memory
- π*0.6: https://www.pi.website/blog/pistar06
- Figure Helix 02: https://www.figure.ai/news/helix-02
- Causal confusion: https://arxiv.org/abs/1905.11979

**Confidence:** medium — 15-minute tasks are demonstrated; multi-hour autonomy is not.

---

### 4. Data

**Precise statement:** Robot learning requires physical interaction data (observations paired with actions), which is expensive to collect, embodiment-specific, and orders of magnitude scarcer than internet text or video. The question is how to close this gap.

**Why it is hard (the technical obstruction):** Unlike text (300 trillion tokens available on the web) or images (billions available), robot data must be physically generated — every trajectory requires a robot, a scene, and a human operator. Total global robot manipulation data is estimated at ~300,000 hours (Bessemer, April 2026), compared to ~1 billion hours of internet video. Robot data is also embodiment-specific: actions collected on a Franka arm are not directly usable by a UR5e. And every failure may damage hardware. Ken Goldberg (Aug 2025) frames this as the "100,000-year data gap": if you tried to match the evolutionary learning that produced human dexterity through robot data collection at current rates, it would take ~100,000 years.

**What has been tried — the competing bets:**
1. **Teleop farms:** Large-scale teleoperation data collection (Physical Intelligence, Figure, 1X). High quality but expensive and slow. Bessemer estimates >$3B in aggregate robotic data costs over the next two years.
2. **Human video:** EgoScale (NVIDIA, Feb 2026) pretrains on 20,854 hours of egocentric human video with retargeted hand actions, showing a log-linear scaling law. Figure's "project go big" and Tesla's camera-rig approach train from first-person human video. Cheap and scalable but lacks embodiment-specific action labels and force signals.
3. **Simulation:** Newton, MuJoCo Warp, Isaac Lab 3.0 provide GPU-accelerated physics. Sim-to-real works for locomotion but contact-rich manipulation remains an open problem. NVIDIA's Cosmos 3 world model required 10,000 H100 GPUs over 3 months.
4. **Cross-embodiment:** Open X-Embodiment pooled 1M+ trajectories from 22 robots. π0.7 demonstrates cross-embodiment transfer. Gemini Robotics On-Device 2 adapts to new embodiments with <200 examples.
5. **Autonomous data collection:** π*0.6 Recap learns from the robot's own experience. ENPIRE (NVIDIA/CMU/UC Berkeley, June 2026) uses coding agents to autonomously improve policies on a fleet of 8 robots, achieving 99% success on pin insertion.

**Best current result:** EgoScale's log-linear scaling law (R²=0.9983) between human pretraining data and downstream robot performance is the strongest evidence that data scaling works for robotics. π0.7's compositional generalization from diverse data (robot, human, autonomous) with multimodal prompt conditioning is the strongest system-level result.

**What "solved" would look like:** A data pipeline where the cost of adding a new task or environment drops to near-zero (through human video, simulation, or autonomous collection), and where performance scales predictably with data — the "internet for robotics" that the Karcini et al. position paper argues is the missing layer.

**Primary sources:**
- EgoScale: https://arxiv.org/abs/2602.16710
- Ken Goldberg, "100,000-year data gap": https://www.science.org/doi/10.1126/scirobotics.aea7390
- "Robots Need More Than VLAs & World Models": https://arxiv.org/html/2606.06556v1
- Bessemer Predicts: https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai
- ENPIRE: https://arxiv.org/abs/2606.19980
- Data scaling laws in imitation learning: https://arxiv.org/abs/2410.18647

**Confidence:** high — data is the bottleneck; the competing bets are well-characterized; the scaling law evidence is emerging.

---

### 5. Evaluation

**Precise statement:** There is no widely adopted, reproducible, cross-lab benchmark for real-robot manipulation. Real-robot numbers are non-reproducible (the same model on the same task can score 0% or 100% depending on who sets up the scene), simulator-based benchmarks do not reflect real-world performance, and progress is therefore hard to measure.

**Why it is hard (the technical obstruction):** Real-world evaluation is subject to (1) tester variation — RoboChallenge documents that "experienced testers," "ignorant testers," and "adaptive testers" produce significantly different success rates for the same model, with adaptive testers exploiting "sweet spots" where the model succeeds; (2) environmental drift — lighting, camera extrinsics, and background change over time; (3) hardware variation — manufacturing differences between robots affect policy behavior; (4) cost — each evaluation episode requires a human to reset the scene, making large-scale evaluation expensive. Simulator-based benchmarks avoid these issues but introduce a sim-to-real gap: they may not reflect real-world performance, especially for contact-rich tasks.

**What has been tried:**
- **RoboArena** (Atreya et al., June 2025): Distributed pairwise A/B evaluation across 7 universities using DROID robots. Evaluators freely choose tasks and environments but perform double-blind comparisons. 612 pairwise comparisons across 7 generalist policies. Uses Bradley-Terry model with task effects to compute global rankings. More accurate than centralized evaluation at the same number of episodes.
- **RoboChallenge** (Dexmal/Hugging Face, Oct 2025): Hosted fleet of 10 robots (UR5, Franka, ALOHA, ARX-5) with controlled visual reproduction (reference image overlay for scene setup). Table30 benchmark with 30 tasks. Documents the "sweet spot effect" and tester variation explicitly.
- **ManipulationNet** (Chen et al., March 2026): Global infrastructure with standardized hardware kits for reproducible task setups. Two tracks: Physical Skills (low-level) and Embodied Reasoning (high-level). 22 co-authors across major labs.
- **AutoEval** (Zhou et al., 2025): Autonomous evaluation without human supervision.
- **REALM** (Dec 2025): Real-to-sim validated benchmark for generalization.
- **RobotArena ∞** (Oct 2025): Scalable benchmarking via real-to-sim.

**Best current result:** RoboArena's distributed pairwise approach is the most methodologically rigorous: it shows that crowd-sourced A/B comparisons across diverse tasks produce more accurate rankings than centralized evaluation, while being more scalable and resilient. RoboChallenge's controlled visual reproduction is the most practical: it reduces tester variation by overlaying reference images on the live camera feed. No benchmark has achieved cross-lab agreement on absolute success rates.

**What "solved" would look like:** An open, reproducible real-robot benchmark where any lab can evaluate any policy and get comparable numbers, with standardized task definitions, automated reset, and published evaluation protocols. ManipulationNet's vision of standardized hardware kits is the closest proposal but is not yet operational at scale.

**Primary sources:**
- RoboArena: https://arxiv.org/abs/2506.18123
- RoboChallenge: https://arxiv.org/abs/2510.17950
- ManipulationNet: https://arxiv.org/abs/2603.04363
- AutoEval: https://arxiv.org/abs/2503.24278
- REALM: https://arxiv.org/abs/2512.19562

**Confidence:** high — the evaluation crisis is well-documented by the field's own practitioners; the proposed solutions are promising but not yet converged.

---

### 6. Sim-to-real for contact

**Precise statement:** Policies trained in simulation should transfer to real robots for contact-rich tasks (grasping, insertion, deformable manipulation, tool use) without per-task real-world fine-tuning.

**Why it is hard (the technical obstruction):** Contact dynamics are discontinuous and highly sensitive to material properties (friction, stiffness, mass distribution) that are hard to estimate from CAD models. Penalty-based simulators (MuJoCo) soften contact, introducing gradients but reducing physical accuracy. Differentiable simulators struggle with the non-smoothness of hard contacts: "Contact forces introduce discontinuities into robot dynamics that severely limit the use of simulators for gradient-based optimization" (ICLR 2026, "Differentiable Simulation of Hard Contacts with Soft Gradients"). Deformable objects (cloth, food, liquids) have effectively infinite-dimensional state spaces that no current simulator captures faithfully. The sim-to-real gap for locomotion is small because locomotion is mostly about rigid-body dynamics and ground reaction forces; for contact-rich manipulation, the gap is large because success depends on sub-millimeter force and position control at the contact interface.

**What has been tried:**
- **Newton** (NVIDIA/DeepMind/Disney, open-sourced 2025): GPU-accelerated, differentiable physics engine with multiple solvers (MuJoCo Warp, Featherstone, XPBD, VBD for soft bodies, MPM for continuum materials). Contact-rich manipulation and locomotion capabilities added April 2026.
- **MuJoCo Warp:** GPU-accelerated MuJoCo for batched simulation, enabling thousands of parallel environments.
- **Differentiable simulation of hard contacts:** "Soft gradients" methods (ICLR 2026) that smooth contact discontinuities for gradient-based optimization.
- **3D Gaussian splatting (3DGS) real-to-sim:** Reconstruct real scenes as 3DGS models for photorealistic simulation. SplatSim, PolaRiS, and RL-GSBridge enable zero-shot sim-to-real transfer of RGB policies and scalable real-to-sim evaluation.
- **Domain randomization:** Varying physical parameters in simulation to improve transfer robustness.
- **Real-to-sim-to-real:** Using 3DGS reconstructions of real scenes as simulation environments for policy training and evaluation.

**Best current result:** Newton with MuJoCo Warp enables GPU-accelerated contact-rich simulation at scale, but no published result demonstrates reliable sim-to-real transfer for contact-rich manipulation without real-world fine-tuning. 3DGS-based real-to-sim (SplatSim, PolaRiS) enables zero-shot transfer of RGB manipulation policies, but these are primarily pick-and-place tasks, not contact-rich. The "Differentiable Simulation of Hard Contacts" paper (ICLR 2026) shows improved gradient quality for hard contacts but does not demonstrate full sim-to-real transfer.

**What "solved" would look like:** A policy trained entirely in simulation (with no real-robot data) that achieves >90% success on a contact-rich real-world task (e.g., insertion, cloth folding, tool use). No current system meets this bar.

**Primary sources:**
- Newton: https://developer.nvidia.com/blog/newton-adds-contact-rich-manipulation-and-locomotion-capabilities/
- State of simulation: https://huggingface.co/blog/nvidia/state-of-simulation-for-physical-ai
- Differentiable hard contacts: https://arxiv.org/abs/2506.14186
- 3DGS real-to-sim: https://arxiv.org/abs/2511.04665
- PolaRiS: https://arxiv.org/abs/2512.16881

**Confidence:** high — the gap is well-understood; the tools are improving but the fundamental physics fidelity problem for contact and deformables is not solved.

---

### 7. Safety, reliability, and the reliability gap

**Precise statement:** 80% task success is a demo; 99.9% is a product. The reliability gap — the distance between demonstrated success rates in controlled settings and the success rates required for deployment — is the field's central practical challenge for commercialization.

**Why it is hard (the technical obstruction):** The last 20% of reliability requires fundamentally different approaches than the first 80%. Bessemer (April 2026) quotes Lisa Yan (Argus Systems, ex-Waymo): "Closing the gap between 99% and 99.9% reliability is a steep hill climb that takes longer than most people realize." The obstruction is that compounding errors in sequential decision-making mean reliability requirements scale exponentially with task length: a 95% per-step success rate yields 21% end-to-end success on a 30-step task. Improving per-step reliability from 95% to 99% yields 74% end-to-end — still not enough. The remaining failures are also the hardest: they occur in long-tail scenarios (unusual object configurations, lighting, dynamics) that are underrepresented in training data. Formal safety methods (barrier functions, reachability analysis) do not scale to high-dimensional manipulation with learned policies.

**What has been tried:**
- **RL from experience:** π*0.6 Recap decreases failure rates by 2x or more on hard tasks. RL-100 achieves 100% success on 1,000 episodes with consistency distillation for high-frequency control.
- **Runtime monitors:** Gemini Robotics ER 2 introduces ASIMOV-Agentic, a benchmark for agentic safety orchestration: the embodied reasoning agent can refuse unsafe tool calls from the VLA, predict whether a task is possible, and proactively request human intervention when uncertain.
- **Human-in-the-loop:** π0.7's language coaching (step-by-step verbal instructions for new tasks), Hi Robot (interactive human feedback). Nucleus deploys humanoids with "supervised operations instead of full autonomy" as a bridge.
- **Safety-constrained learning:** Gemini Robotics 2 is described as DeepMind's "safest robotics model to date in safety constraint following and human proximity benchmarks," with the ability to detect nearby humans and trigger safe stops.
- **Formal methods:** [UNVERIFIED] No major industrial VLA system publishes formal safety guarantees. The field relies on empirical testing and runtime monitors.

**Best current result:** π*0.6 with Recap achieves >90% success rate on espresso, laundry, and box-assembly tasks after on-robot RL, with 2x throughput improvement. RL-100 achieves 100% success across 1,000 episodes on 8 tasks, including 250/250 consecutive trials on one task, with a juicing robot serving customers for 7 hours without failure. Gemini Robotics ER 2 demonstrates safety constraint following and human proximity detection. Figure's Helix 02 ran an 8-hour autonomous factory shift (May 2026 livestream).

**What "solved" would look like:** A deployed robot system with documented MTBF (mean time between failures) of >1,000 hours on real tasks, with formal safety guarantees for human-robot interaction, and a clear protocol for handling the remaining failure modes. No current system publishes this.

**Primary sources:**
- π*0.6: https://www.pi.website/blog/pistar06
- RL-100: https://arxiv.org/abs/2510.14830
- Gemini Robotics 2 safety: https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/
- ASIMOV-Agentic: https://huggingface.co/datasets/google/asimov_agentic
- Bessemer reliability gap: https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai
- Figure 8-hour shift: https://www.techtimes.com/articles/316632/20260514/figure-ais-helix-02-robots

**Confidence:** high — the reliability gap is well-documented and is the primary commercialization obstacle.

---

### 8. Latency, compute, and on-robot inference

**Precise statement:** VLA models must generate actions at 10–100 Hz to react to real-time changes in the physical world, but large models (2.7B+ parameters) are too slow for on-device deployment without significant optimization.

**Why it is hard (the technical obstruction):** Unlike text models that batch requests across thousands of users on shared infrastructure, robotics models must generate an environment state every few milliseconds per robot, meaning each deployment effectively requires a dedicated GPU pipeline (Bessemer, April 2026). VLA-Perf (NVIDIA, Feb 2026) shows that π0 (2.7B) runs at 19 Hz on Jetson Thor (the current edge platform), which is below the frame rate of most cameras (24–60 Hz). Scaling to 16.7B parameters drops Jetson Thor to 2.1 Hz. The VLM backbone is compute-bound; the action expert is memory-bound. Long-context VLAs (thousands of past frames) are infeasible on edge hardware: 1K past timesteps runs at 1.3 Hz on Jetson Thor.

**What has been tried:**
- **Action chunking:** Predict a sequence of actions in one inference call, reducing inference frequency. π0's real-time chunking system (June 2025) maintains precision and speed despite high latency.
- **Asynchronous inference:** Overlap inference and execution — begin inference while the robot is still executing previous actions. Improves GPU utilization.
- **Dual-system designs:** Run a lightweight action expert at high frequency (System 1) while invoking the expensive VLM backbone at lower frequency (System 2). Figure Helix uses S0/S1/S2 hierarchy (1 kHz / 200 Hz / slow reasoning).
- **Distillation:** RL-100 uses consistency distillation to compress multi-step diffusion into a one-step controller for high-frequency control.
- **Quantization:** BitVLA (1-bit VLAs), INT8 quantization for OpenVLA.
- **Smaller models:** SmolVLA, TinyVLA, Evo-1 for affordable and efficient robotics.
- **On-device adaptation:** Gemini Robotics On-Device 2 runs locally and adapts to new embodiments with <200 examples in a few hours.

**Best current result:** π0 (2.7B) at 19 Hz on Jetson Thor with action chunking. Figure Helix 02's S0 runs at 1 kHz for whole-body control, S1 at 200 Hz for visuomotor policy, S2 for slow reasoning — a hierarchical solution that decouples frequency from model size. RL-100's consistency distillation enables high-frequency control from a diffusion policy. Gemini Robotics On-Device 2 achieves fast adaptation on-device.

**What "solved" would look like:** A 10B+ parameter VLA running at >30 Hz on a 40–130W edge device (Jetson Thor class), with long-context memory, without requiring cloud connectivity. Current hardware (Jetson Thor: 128GB RAM, 800 TOPS INT8, 270 GB/s memory BW) can support ~3B models at acceptable latency but struggles with larger models.

**Primary sources:**
- VLA-Perf: https://arxiv.org/abs/2602.18397
- Real-time action chunking: https://www.pi.website/research/real_time_chunking
- RL-100 distillation: https://arxiv.org/abs/2510.14830
- Figure Helix 02: https://www.figure.ai/news/helix-02
- Gemini Robotics On-Device 2: https://deepmind.google/models/gemini-robotics/on-device/
- Jetson Thor specs: https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/

**Confidence:** high — the latency numbers are from systematic profiling; the constraint is well-characterized.

---

### 9. Memory, state, and partial observability

**Precise statement:** Most robot policies are near-Markovian — they condition only on the current observation. But many tasks require remembering past actions, tracking occluded objects, knowing which steps are done, and adapting strategies based on what failed.

**Why it is hard (the technical obstruction):** Keeping a full history of observations in context over minutes or hours is infeasible (memory and compute constraints). But throwing it away leads to nonsensical behavior over long tasks. Poorly designed memory systems can harm performance through "causal confusion" (Ross et al., 2019), where memory exacerbates spurious correlations. The challenge is designing memory that is both efficient (low token count for real-time control) and effective (captures task-relevant information at the right temporal scale).

**What has been tried:**
- **MEM (Multi-scale Embodied Memory)** (Physical Intelligence, March 2026): Short-term memory as video-encoded observations (efficient ViT with interleaved spatial and temporal attention, dropping history tokens in upper layers); long-term memory as text-based "notes" about task progress (e.g., "I placed the lid on the countertop. I am currently holding the pot."). The model actively chooses what to remember via a reasoning mechanism.
- **Long-context VLAs:** Process thousands of past frames. VLA-Perf shows 1K timesteps runs at 11.7 Hz on B100 but only 1.3 Hz on Jetson Thor — infeasible on edge.
- **Hierarchical state tracking:** π0.7's high-level policy generates subtasks at low frequency, implicitly tracking task progress.

**Best current result:** π0.6 with MEM solves tasks up to 15 minutes long (kitchen cleaning, grilled cheese cooking, ingredient retrieval), with significant improvements over no-memory, video-only-memory, and text-only-memory baselines. MEM enables in-context adaptation: the model tries a different strategy after 1–2 failed attempts (picking up a chopstick, opening a fridge in the wrong direction). Figure Helix 02 maintains task state across 61 loco-manipulation actions in a 4-minute task.

**What "solved" would look like:** A memory system that scales to hours or days of task execution (the "schedule of chores" scenario: "I get home at 6pm, please have dinner ready, and clean the house on Wednesdays"), with multiple time scales and levels of abstraction, without unbounded context growth.

**Primary sources:**
- MEM: https://www.pi.website/research/memory
- Causal confusion: https://arxiv.org/abs/1905.11979
- VLA-Perf long-context analysis: https://arxiv.org/abs/2602.18397

**Confidence:** medium — 15-minute tasks are demonstrated; multi-hour memory is not.

---

### 10. Hardware reliability and cost

**Precise statement:** Robot hardware — especially dexterous hands — is not reliable or cheap enough for mass deployment. Hands break, actuators wear out, and the cost curve has not reached the point where deployment at scale is economically viable.

**Why it is hard (the technical obstruction):** Articulated fingers with joints are mechanically complex and subject to wear, impact, and fatigue. No human-like robot hand has demonstrated industrial-grade durability: "No human-like robot hands have demonstrated much in the way of dexterity, in any general sense. And none have inspired designs that have made it into deployment in real world applications" (Brooks, Sept 2025). Tendon-driven systems (Tesla Optimus Gen 3, Shadow Hand) introduce compliance and wear issues. Hydraulic systems (Sanctuary Phoenix) require fluid maintenance and add weight. Tactile sensors embedded in fingertips are subject to repeated impacts and degradation. The cost of dexterous hands remains high: Shadow Dexterous Hand exceeds $100,000 per unit; costs are "expected to drop below $5,000/hand before mass adoption" (Wikipedia, citing industry sources, April 2026) but are not there yet.

**What has been tried:**
- **Tesla Optimus Gen 3:** 22 DoF per hand, tendon-driven with 25 motors in the forearm, 0.08mm positional accuracy, designed for automotive supply chain manufacturing. Tendon routing can introduce compliance and wear issues.
- **Figure 02:** 16 DoF per hand, integrated electric actuators per finger, fingertip tactile sensors at 3g sensitivity, palm cameras. Payload 25kg per hand.
- **Sanctuary Phoenix:** 20–21 DoF, hydraulic actuation, micro-barometer tactile arrays at 5mN sensitivity. High force density but requires fluid maintenance.
- **Unitree H2:** 10–12 DoF, electric, very low cost, shipping in volume (~5,500 units in 2025). Lower dexterity and tactile feedback.
- **RUKA:** Tendon-driven hand designed for compactness, affordability, and dexterous manipulation via learning.
- **Honda Avatar:** 16 cable-driven joints, automotive-grade durability, 450,000-cycle endurance.

**Best current result:** Figure 02's hands (16 DoF, 3g tactile sensitivity, palm cameras) enable Helix 02's dexterous tasks (unscrewing caps, extracting pills, dispensing syringes). Tesla Optimus Gen 3's 22-DoF hands approach human-level DoF (27) with 0.08mm precision. Unitree H2 ships at ~$16,000 for the full robot, but with limited hand dexterity. Honda Avatar demonstrates 450,000-cycle durability.

**What "solved" would look like:** A dexterous hand with 20+ DoF, sub-5mN tactile sensitivity, >10,000-hour MTBF, and <$5,000 cost, mass-producible at 100,000+ units/year. No current hand meets all these criteria simultaneously.

**Primary sources:**
- Humanoid hand comparison: https://en.wikipedia.org/wiki/Humanoid_hand
- Brooks on hand durability: https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/
- Dexterous hands primer: https://corematter.substack.com/p/dexterous-hands-primer-actuation
- Figure Helix 02: https://www.figure.ai/news/helix-02
- RUKA: https://ruka-hand.github.io/

**Confidence:** medium — the hardware is improving but no hand meets the combined dexterity/durability/cost bar for mass deployment.

---

### 11. Scaling-law uncertainty

**Precise statement:** Does robotics have a "bitter lesson" — will progress come primarily from scaling up data and compute with general methods, or does it require better structure, priors, and engineered components?

**Why it is hard (the technical obstruction):** The question is unresolved because the evidence supports both camps, and the two camps disagree on what counts as evidence. The "just scale data" camp points to EgoScale's log-linear scaling law, π0.7's compositional generalization from diverse data, and the LLM analogy. The "we need better structure/priors" camp argues that robotics lacks an internet-scale data source, that physical interaction is fundamentally different from text generation, and that tactile sensing and engineered priors are necessary. The disagreement is not just empirical but methodological: the scaling camp trusts that emergent capabilities will appear with more data; the structure camp trusts that specific architectural and sensory components are needed first.

**The "just scale data" camp:**
- **EgoScale (NVIDIA, Feb 2026):** Log-linear scaling law (R²=0.9983) between egocentric human video pretraining and downstream robot performance. 54% improvement from pretraining on a 22-DoF hand.
- **π0.7 (Physical Intelligence, April 2026):** Compositional generalization from diverse data (robot, human, autonomous) with multimodal prompt conditioning. "The key to generalization for foundation models is to use broad and diverse data."
- **Rich Sutton's "Bitter Lesson" (2019):** "The human-knowledge approach tends to complicate methods in ways that make them less suited to taking advantage of general methods leveraging computation." Applied to robotics by the scaling camp.
- **Bessemer (April 2026):** "Scaling laws are emerging. Data is expensive, capital is the moat."

**The "we need better structure/priors" camp:**
- **Ken Goldberg (Aug 2025):** "Good old-fashioned engineering (GOFE) can close the 100,000-year data gap." Argues that model-based methods and engineering priors can bootstrap learning-based systems, reducing the data requirement.
- **Rodney Brooks (Sept 2025):** Argues that end-to-end learning from vision alone cannot produce dexterity because it lacks tactile feedback. "End to end learning depends on the chosen ends" — the success of end-to-end learning in speech and vision relied on domain-specific preprocessing (MFCCs, CNNs) that simulated human physiology. Robotics needs analogous priors for touch and force.
- **Karcini et al. (June 2026):** "Robots Need More Than VLAs & World Models." Argues that the central bottleneck is not policy learning but the absence of mechanisms that convert unstructured physical data into grounded robot supervision. Identifies four missing pillars: data interfaces for autolabeling, embodiment interfaces for retargeting, world-model interfaces for physics reasoning, and reward interfaces for inferring task progress.
- **Ian Glow (Zeromatter, via Bessemer):** "Teleop alone will not be a successful data strategy. You should pull data from the internet or from simulators with reinforcement learning — you'll never get the scale or diversity you need from teleop alone."

**What would resolve it:** A clear demonstration that a 10x or 100x increase in robot data (without architectural changes) produces a proportional increase in real-world task success rate across unseen environments — or a clear demonstration that it does not. EgoScale's scaling law is the closest evidence but measures validation loss, not real-world success rate, and the correlation between the two is strong but not perfect.

**Primary sources:**
- EgoScale: https://arxiv.org/abs/2602.16710
- Ken Goldberg: https://www.science.org/doi/10.1126/scirobotics.aea7390
- Rodney Brooks: https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/
- "Robots Need More Than VLAs & World Models": https://arxiv.org/html/2606.06556v1
- Bessemer: https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai
- Sutton's Bitter Lesson: http://www.incompleteideas.net/IncIdeas/BitterLesson.html
- Brooks's "A Better Lesson": https://rodneybrooks.com/a-better-lesson/

**Confidence:** low — this is a genuine open question; the evidence supports both camps; the resolution will come from empirical results, not argument.

---

## Part B: Where this is heading

### Competing theses

| Thesis | Core claim | Named proponents | Strongest evidence for | Strongest evidence against | What would falsify it |
|---|---|---|---|---|---|
| **End-to-end VLA scaling** | More data + bigger models → generalist robot intelligence, analogously to LLMs | Physical Intelligence (π0–π0.7), Bessemer, EgoScale team | EgoScale log-linear scaling law; π0.7 compositional generalization; π0.5 open-world generalization | Brooks's tactile argument; Goldberg's data gap; Karcini et al.'s "missing pillars"; reliability gap (80% → 99.9% is not linear) | A plateau in real-world success rate despite 10x data increase, without architectural change |
| **Hierarchical VLM-planner + skill library** | A VLM reasons about goals and decomposes into subtasks; a library of learned skills executes them | Google DeepMind (Gemini Robotics ER 2 + VLA), Figure (Helix S2/S1/S0), NVIDIA (GR00T N2 dual-system) | Gemini Robotics ER 2 multi-step planning; Figure Helix 02 61-action sequencing; π0.7 language coaching → high-level policy | π0.7's compositional generalization suggests skills can emerge from a single model without explicit library; hierarchical handoffs can be brittle | A single end-to-end model outperforming the best hierarchical system on long-horizon tasks |
| **World-model-based training** | Train a world model on video to predict physics; use it for planning, data augmentation, or policy training | NVIDIA (Cosmos 3), Meta (V-JEPA 2), DreamZero, UVA | V-JEPA 2: 80% zero-shot pick-and-place with 62 hours of robot data; π0.7's world model generates visual subgoals | Cosmos required 10,000 H100s for 3 months; world models are expensive and their physics predictions are not yet accurate enough for contact-rich tasks; "Robots Need More Than VLAs & World Models" argues world models alone are insufficient | World models failing to improve real-world contact-rich task performance beyond what VLA scaling alone achieves |
| **RL-finetuning on imitation pretraining** | Pretrain on demonstrations, then improve with real-world RL | Physical Intelligence (π*0.6 Recap), RL-100, ENPIRE | π*0.6: >2x throughput, >90% success; RL-100: 100% on 1,000 episodes; ENPIRE: 99% on pin insertion | Per-task training required; on-robot data collection is expensive; does not directly address generalization | RL-finetuned specialists failing to generalize to unseen tasks/environments without additional training |
| **Teleop-in-the-loop as a bridge** | Deploy teleoperated robots for real work; use the data to train autonomous policies; transition to autonomy gradually | Nucleus (supervised operations), Physical Intelligence (Recap coaching), Bessemer (data flywheel) | π*0.6 Recap coaching with corrections; Figure BMW pilot (1,250+ hours); Agility (65,000+ hours); Bessemer: "data flywheel" | Teleop is expensive and slow; "teleop alone will not be a successful data strategy" (Ian Glow); unit economics may not work if teleop is the primary mode | Autonomous policies reaching >99% success without any teleop data, making teleop obsolete |
| **Humanoid-general form factor** | A humanoid robot can do any human task in the built-for-human environment | Figure, Tesla, 1X, Apptronik, Unitree | Figure Helix 02 whole-body loco-manipulation; Gemini Robotics 2 whole-body control; BMW pilot | Brooks: "believing this will happen within decades is pure fantasy thinking"; task-specific robots are cheaper and more reliable for known tasks; humanoid hardware is not durable enough | Task-specific robots consistently outperforming humanoids on cost and reliability in the same applications |
| **Task-specific form factor** | Purpose-built robots for specific tasks (warehouse, factory, surgery) are more practical than general-purpose humanoids | Rodney Brooks (Robust.AI), Bessemer (near-term value accrues to full-stack vertical players), Agility (Digit for logistics) | Figure BMW: 99% placement accuracy, 84-second cycle time; Agility: 65,000+ hours across 9 facilities; warehouse robots (Amazon, Symbotic) | The entire humanoid industry's valuation depends on the general-purpose thesis; π0.7 and Gemini Robotics 2 show increasing generality | A humanoid robot achieving lower cost-per-task than a purpose-built system across a broad range of tasks |

### Timeline view (2026 → 2030)

**2026–2027 (evidence-based projection):**
- **Narrow industrial deployments expand.** Figure and Agility continue warehouse/logistics deployments with documented KPIs. Purpose-built systems (Amazon Proteus, Symbotic, surgical robots) generate real revenue. This is already happening and is the highest-confidence projection.
- **VLA models improve on controlled tasks.** π0.7-class models with RL post-training (Recap-style) achieve >95% success on specific tasks (espresso, laundry, box assembly) with per-task training. RL-100-class methods achieve near-100% on narrower task sets. High confidence based on current trajectory.
- **Evaluation infrastructure matures.** RoboArena, RoboChallenge, and ManipulationNet converge toward shared protocols. Cross-lab comparisons become possible for the first time. Medium confidence — the tools exist but adoption is not yet universal.
- **Humanoid production remains limited.** Tesla's Fremont line starts slowly (Musk called the year's production rate "impossible to predict"). Figure and Agility scale to hundreds, not thousands, of units. Unitree continues volume leadership at low cost. High confidence based on historical manufacturing ramp curves.

**2027–2029 (speculation, clearly marked):**
- **Speculation:** The first "ChatGPT moment" for robotics — a robot performing a complex task in an unfamiliar environment without a human in the loop, captured on video, undeniable. Bessemer predicts this is "not years away" but "not here yet." This would require solving generalization, reliability, and possibly memory simultaneously.
- **Speculation:** RL-finetuning becomes standard practice. If Recap and RL-100 generalize beyond the labs that produced them, most serious robot learning pipelines will include an RL stage on top of imitation pretraining. This would narrow the reliability gap for specific tasks.
- **Speculation:** Tactile sensing becomes integrated into VLA training. If Brooks is right that vision alone is insufficient, the first systems to demonstrate human-level dexterity will use tactile feedback. Figure 03 and Gemini Robotics 2 have the hardware; the training pipeline is the gap.
- **Speculation:** World models begin to contribute. If V-JEPA 2 and Cosmos 3-class models improve to the point where their physics predictions are useful for contact-rich manipulation planning, they could augment VLA training with imagined experience. This is a 2028+ bet.

**2029–2030 (speculation):**
- **Speculation:** The humanoid-general vs. task-specific question begins to resolve. If humanoids achieve cost-per-task parity with purpose-built systems in several verticals, the general-purpose thesis strengthens. If task-specific systems maintain a clear cost/reliability advantage, the humanoid thesis weakens.
- **Speculation:** The scaling-law question is answered empirically. By 2030, the field will have 10–100x more robot data than in 2026. If performance scales proportionally, the bitter lesson holds for robotics. If it plateaus, the structure/priors camp is vindicated.
- **Speculation:** The first verified 10,000-unit humanoid deployment. If Figure, Agility, or a Chinese manufacturer deploys 10,000+ humanoids with documented task performance, this would be a major milestone. This is plausible but not certain by 2030.

### The bear case

**Rodney Brooks (Sept 2025, most prominent skeptic):**
- Calls dexterity-from-vision "pure fantasy thinking" and predicts practical humanoid robots are "decades" away.
- Argues that end-to-end learning from vision cannot produce dexterity without tactile feedback, citing Johansson's anesthetized-finger experiments.
- Predicts "we will have plenty of humanoid robots fifteen years from now, but they will look like neither today's humanoid robots nor humans."
- His 2026 predictions scorecard (Jan 2026) continues to temper humanoid timelines.

**Morgan Stanley (July 2026):**
- "Even before any meaningful deployment, humanoids are often framed publicly — by both investors and companies — as direct substitutes for workers rather than tools for hazardous, repetitive or labor-constrained tasks. The industry's social license to deploy may matter just as much as technical performance."
- "Investors have become harder to impress with polished videos and one-off demonstrations alone and are increasingly looking for tangible evidence of real-world return on investment."
- The U.S. ban on Chinese humanoid imports (July 2026) raises R&D costs by cutting off inexpensive research platforms.

**Unit economics:**
- Unitree, the volume leader (~5,500 units shipped in 2025 at ~$16,000 each), saw Q1 2026 net profit fall 52% YoY. Volume is not the same as profit.
- Figure holds a $39B private valuation (Sept 2025) — higher than Goldman Sachs' projection for the entire humanoid market nine years out ($38B by 2035).
- Bessemer estimates >$3B in aggregate robotic data costs over the next two years. Data is expensive and the moat is capital.
- A humanoid robot collapsed on stage at Computex 2026 during Qualcomm's live demo, "exposing a growing gap between bold AI specs and real-world stage reliability."

**Capital-cycle risk:**
- Robotics startups raised >$23B in the first half of 2026, nearly matching all of 2025. If results do not materialize, a capital pullback could slow progress across the field.
- Bessemer argues there is "no robotics bubble" and that the sector is "structurally underinvested" — but also acknowledges that "not every company being funded will succeed" and "some valuations are stretched."
- The disagreement between Bessemer ("not enough capital") and skeptics ("too much capital chasing demos") is itself a signal: the market has not yet converged on how to value robotics companies.

**Why this could be another robotics winter:**
- The demo-to-deployment gap is the core risk. If the 80% → 99.9% reliability gap takes longer than investors expect (as Lisa Yan argues from Waymo experience), capital could withdraw before the gap closes.
- The data bottleneck may not be solvable with capital alone. If the "just scale data" thesis plateaus, the field needs new scientific advances (tactile sensing, differentiable simulation for contact, world models) that are not predictable on a timeline.
- The humanoid form factor may be wrong. If task-specific robots dominate commercially, the humanoid investment thesis collapses, taking most of the capital with it.

### Milestones to watch

| Milestone | Why it matters | Current status | How we'd know |
|---|---|---|---|
| Single policy >90% on N unseen homes, no per-site data | Tests true generalization | π0.5 demonstrated in "a few" new kitchens; no published systematic evaluation across many homes | Published, reproducible evaluation across >10 homes with standardized task definitions |
| Verified 10,000-unit humanoid deployment | Tests commercial viability at scale | No manufacturer has deployed >1,000 units with documented task performance | Company filings or independent reporting confirming 10,000+ units in productive work |
| Open reproducible real-robot benchmark with cross-lab agreement | Solves the evaluation crisis | RoboArena, RoboChallenge, ManipulationNet are all in early stages | Multiple labs publishing comparable numbers on the same benchmark |
| Per-task RL achieving >99% on a broad task set | Tests the reliability gap | RL-100: 100% on 8 tasks; π*0.6: >90% on 3 tasks | Published results showing >99% across >20 diverse tasks |
| Tactile foundation model integrated into VLA training | Tests Brooks's tactile argument | Sparsh-X (~1M interactions), TouchWorld, N0-Foundation exist but are not integrated into major VLA pipelines | A VLA trained with tactile input outperforming vision-only on contact-rich tasks |
| Sim-to-real for contact-rich manipulation without real data | Tests simulation fidelity | No current system achieves this | A policy trained entirely in simulation achieving >90% on a real contact-rich task |
| Humanoid cost-per-task parity with task-specific robot | Tests the form-factor question | No data available; task-specific robots are cheaper for known tasks | Published cost analysis showing humanoid TCO ≤ task-specific robot TCO for a specific application |
| 100x robot data increase with proportional performance gain | Tests the scaling-law question | EgoScale shows log-linear scaling on validation loss; no real-world success rate scaling law published | Systematic evaluation showing 10–100x data → proportional real-world success rate improvement |

---

## Part C: Adjacent frontiers

### Tactile/force learning

Tactile sensing is the most under-addressed modality in robot learning. Rodney Brooks's argument (Sept 2025) that vision-only training cannot produce human-level dexterity is grounded in neuroscience: human hands have ~17,000 mechanoreceptors, with ~1,000 at each fingertip, firing at rates enabling sub-millisecond force adjustment. Johansson's anesthetized-finger experiments show that without touch, a task that takes 7 seconds becomes minutes of fumbling. Current humanoid training pipelines (Tesla's vision-only approach, Figure's human-video training) explicitly do not use force feedback. Figure 03 (Jan 2026) and Gemini Robotics 2 (July 2026) integrate fingertip tactile sensors (3g and 5mN sensitivity respectively), but no large-scale tactile dataset or foundation model exists at the scale of ImageNet or LibriSpeech.

Several efforts are emerging. Sparsh-X (2025) trains multisensory touch representations across image, audio, motion, and pressure modalities on ~1M contact-rich interactions. TouchWorld (July 2026) is a predictive and reactive tactile foundation model for contact-rich manipulation. DreamTacVLA (Dec 2025) integrates tactile sensing into VLA models for contact-rich manipulation. The RSS 2026 workshop "Tactile Sensing for Robotic Foundation Models" asks what role tactile sensing should play in the foundation model era. DAIMON Robotics (May 2026) is building a tactile dataset for dexterous manipulation. The field is early: tactile sensors are not standardized, datasets are small, and no VLA pipeline integrates tactile input at scale. The gap between having tactile hardware (Figure 03, Sanctuary Phoenix) and using it effectively in learned policies is the open problem.

### Differentiable simulation

Differentiable simulation enables gradient-based optimization of robot dynamics by making the physics engine itself differentiable. The core challenge is that contact dynamics are discontinuous: "Contact forces introduce discontinuities into robot dynamics that severely limit the use of simulators for gradient-based optimization" (ICLR 2026). Newton (NVIDIA/DeepMind/Disney, open-sourced 2025, Linux Foundation) is the leading effort: a GPU-accelerated, differentiable physics engine with multiple solvers (MuJoCo Warp for articulated rigid bodies, XPBD for maximal coordinates, VBD for soft bodies, MPM for continuum materials). MuJoCo Warp brings MuJoCo-style contact-rich simulation to GPU for batched RL training. The "Differentiable Simulation of Hard Contacts with Soft Gradients" paper (ICLR 2026) addresses the discontinuity problem by smoothing contact for gradient computation while preserving physical accuracy. Few-Shot Neural Differentiable Simulator (March 2026) tackles real-to-sim rigid-contact gaps. The state of the art: differentiable simulation works for rigid-body dynamics and locomotion, but contact-rich manipulation and deformables remain open. The field needs better contact models, more accurate material parameters, and larger-scale evaluation.

### Neural rendering for robotics (3DGS real-to-sim)

3D Gaussian splatting (3DGS) has emerged as a powerful tool for real-to-sim reconstruction: building photorealistic simulation environments from real-world scans. SplatSim demonstrates zero-shot sim-to-real transfer of RGB manipulation policies using Gaussian splatting. PolaRiS (Dec 2025) is a scalable real-to-sim framework using Gaussian splatting and 3D object reconstruction. RL-GSBridge uses 3DGS for real-to-sim-to-real manipulation learning. Real-to-Sim Robot Policy Evaluation with Gaussian Splatting (Nov 2025) enables evaluation of manipulation policies on deformable objects in reconstructed environments. The promise: scalable, photorealistic evaluation without the cost and reproducibility problems of real-robot testing. The limitation: 3DGS provides visual fidelity but not physics fidelity — the reconstructed scenes look right but do not necessarily behave right. Contact dynamics, deformable physics, and liquid behavior are not captured by 3DGS reconstructions. The method is most useful as a scalable evaluation shortcut and for visual policy training, not as a replacement for physics-based simulation.

### Foundation models for locomotion

Locomotion has historically been treated separately from manipulation, with model-based control (MPC, trajectory optimization) and RL in simulation as the dominant approaches. The 2026 trend is toward unified whole-body control. Figure Helix 02 (Jan 2026) introduces System 0: a 10M-parameter whole-body controller trained on 1,000+ hours of retargeted human motion data and sim-to-real RL across 200,000+ parallel environments, replacing 109,504 lines of hand-engineered C++ with a single neural prior. Gemini Robotics 2 (July 2026) controls full humanoids "from feet to fingertips" with a single VLA. WholeBodyVLA (ICLR 2026) proposes unified latent VLA for whole-body loco-manipulation. LeVERB proposes hierarchical VLA for humanoid whole-body control with latent action vocabulary. The AME-2 system (ETH Zurich, 2026) targets agile and generalized legged locomotion via attention-based neural map encoding. The trend is clear: locomotion and manipulation are converging into whole-body control, driven by the availability of human motion data, GPU-accelerated simulation, and RL methods that work for locomotion (where sim-to-real is reliable).

### Multi-robot/fleet learning

Multi-robot learning aims to accelerate policy improvement by running experiments in parallel across a fleet. ENPIRE (NVIDIA/CMU/UC Berkeley, June 2026) is the clearest demonstration: a fleet of 8 bimanual YAM robots, each with its own coding agent, autonomously improves policies through a closed loop of reset, execute, verify, refine. Scaling from 1 to 8 agents reduces time to near-perfect success on pin insertion from >1.5 hours to ~40 minutes. The paper introduces Mean Robot Utilization (MRU) and Mean Token Utilization (MTU) metrics for measuring fleet efficiency. Key finding: token cost grows super-linearly with fleet size — larger fleets reach success sooner but require disproportionately more tokens. Gemini Robotics 2 (July 2026) introduces multi-robot collaboration: different types of robots communicating to solve workflows a single robot could not do alone. The frontier is in coordinating heterogeneous fleets, sharing learned experience across robots, and managing the trade-off between parallelism and token/compute efficiency.

### Robot-to-robot transfer

Cross-embodiment transfer — a policy trained on one robot performing tasks on a different robot — is a key generalization axis. π0.7 (April 2026) demonstrates the most striking result: folding laundry on a bimanual UR5e with no training data for that robot, matching the zero-shot success rate of expert teleoperators with 375 hours of experience. Gemini Robotics On-Device 2 (July 2026) adapts to new bi-arm embodiments with <200 examples in a few hours, even with drastically different shapes, sensors, and DoFs (Dexmate, SO101, Trossen). Open X-Embodiment pooled 1M+ trajectories from 22 robots. The mechanism is diverse conditioning: π0.7 uses multimodal prompts (language, metadata, control modality labels, visual subgoals) to unify data from different robots under a single prompting framework. The limitation: transfer works best when the source and target robots are similar enough that the task structure (grasp, move, place) is shared. Transfer across fundamentally different morphologies (e.g., gripper to dexterous hand) remains limited.

### Self-improvement / autonomous data collection

The vision: robots improve their own policies through autonomous experience, without human intervention. π*0.6 Recap (Nov 2025) implements this with RL: the robot practices a task, evaluates its own performance via a learned value function, and improves through advantage-conditioned policy training. ENPIRE (June 2026) takes this further: coding agents autonomously construct environment interfaces (reset, verification, safety), then improve policies through real-world RL, behavior cloning, or heuristic learning. ENPIRE achieves 99% success on pin insertion and 100% on Push-T, with the coding agent choosing its own training methods. The RL-100 framework (Science Robotics, July 2026) achieves 100% success across 1,000 episodes by unifying imitation and RL under a single clipped PPO objective. The limitation: all current self-improvement systems require per-task setup (reward function, reset mechanism, safety constraints). The open problem is autonomous task acquisition — a robot that can define its own tasks, construct its own reward functions, and improve without any human setup.

### Safety-constrained learning

Safety in robot learning has two layers: (1) physical safety — the robot does not harm humans or damage property; (2) policy safety — the robot does not execute actions likely to fail. Gemini Robotics 2 (July 2026) introduces ASIMOV-Agentic, a benchmark for agentic safety orchestration: the embodied reasoning agent can refuse unsafe tool calls from the VLA, predict whether a task is possible, and request human intervention when uncertain. Gemini Robotics ER 2 is described as DeepMind's "safest robotics model to date in safety constraint following and human proximity benchmarks," detecting nearby humans and triggering safe stops. Brooks (Sept 2025) raises a distinct physical safety concern for bipedal robots: when a walking robot falls, its legs have significant kinetic energy and can strike anything nearby. "If there is anything in the way it gets a really solid whack of metal against it. And if that anything happens to be a living creature it will often be injured, perhaps severely." The field lacks formal safety guarantees for learned policies in high-dimensional manipulation. Runtime monitors (ASIMOV-Agentic), human-in-the-loop systems (Nucleus's supervised operations, π0.7's language coaching), and conservative design (force/torque limits, safe operational envelopes) are the practical approaches. Formal methods (barrier functions, reachability analysis) do not yet scale to VLA-class policies.

### Human-robot interaction and language grounding

Language grounding — connecting natural language commands to physical actions — is a core capability of VLA models. π0.7 (April 2026) demonstrates interactive language directing: the robot follows varied language commands ("pick up the oven mitt," "fold the towel," "close the fridge") and can be interactively "taught" new behaviors through step-by-step language coaching. The Hi Robot system (Feb 2025) enables robots to "listen and think harder," incorporating human-in-the-loop feedback for complex tasks. Gemini Robotics ER 2 (July 2026) serves as the robot's "high-level brain," processing user instructions, communicating with humans, reasoning about steps, and tracking progress. The frontier is in going beyond simple instruction following to interactive collaboration: the robot asks clarifying questions, the human provides real-time corrections, and the system adapts its understanding of the task over time. π0.7's language coaching → high-level policy fine-tuning (where the robot "learns" the task from coaching and then performs it autonomously) is a step toward this. The open problem is grounding language in physical affordances that the robot has never encountered — understanding "use the spatula to flip the pancake" when the robot has never seen a spatula or a pancake, by composing semantic knowledge from the VLM with motor skills from the action expert.

---

## What an interactive explainer should show

1. **The reliability gap compounding calculator.** An interactive showing per-step success compounding over an N-step task, with a slider for per-step reliability. At 95% per-step, a 30-step task succeeds 21% of the time. At 99%, 74%. At 99.9%, 97%. This makes visceral why 95% per-step is unusable at 30 steps and why the 80% → 99.9% gap is the field's central practical problem. Let the user adjust N and per-step rate, and show the end-to-end success curve.

2. **The data scaling law visualization.** Plot EgoScale's log-linear scaling law (R²=0.9983) showing validation loss vs. human pretraining data size (1k–20k hours), with the downstream robot performance overlay. Let the user extrapolate to 100k or 1M hours and see the predicted improvement — and then show the uncertainty band, since the law is measured on validation loss, not real-world success rate.

3. **The tactile feedback demonstration.** Side-by-side videos of Johansson's anesthetized-finger experiment (the match-lighting task with and without touch) alongside a robot attempting the same task with and without tactile sensing. This makes Brooks's argument concrete: touch is not optional for dexterity.

4. **The VLA inference latency explorer.** An interactive table showing inference frequency (Hz) for different model sizes (2.7B, 9.1B, 16.7B, 81.3B) across hardware (Jetson Thor, RTX 4090, A100, H100, B100), with context length (1, 10, 100, 1000 timesteps) as a third axis. Color-code by whether the frequency meets the 10 Hz "acceptable" or 100 Hz "high-performance" thresholds. This makes the on-robot inference constraint tangible.

5. **The evaluation crisis simulator.** Let the user play the role of "adaptive tester," "ignorant tester," and "controlled tester" in a simulated RoboChallenge setup. Show how the same model can score 0% or 100% depending on object placement (the "sweet spot effect"). This makes the evaluation crisis visceral and explains why cross-lab benchmarking is the field's biggest meta-problem.

6. **The competing theses explorer.** An interactive version of the competing theses table, where clicking each thesis shows the strongest evidence for and against, the named proponents, and the falsification criteria. Let the user track which thesis the evidence is favoring over time.

7. **The deployment reality dashboard.** A real-time dashboard showing verified humanoid deployment data: operating hours (Agility: 65,000+, Figure: 1,250+), units shipped (Unitree: ~5,500), production status (Tesla: not started), and valuation vs. market projection (Figure: $39B vs. Goldman's $38B by 2035). This cuts through the hype by showing what is actually deployed vs. what is claimed.

8. **The memory architecture explorer.** An interactive showing how MEM's short-term (video-encoded) and long-term (text-based) memory work over a 15-minute kitchen-cleaning task. Show what the robot "remembers" at each step, and what happens with and without memory (the chopstick example: without memory, the robot repeats the same failed strategy; with memory, it adapts after 1–2 attempts).

9. **The sim-to-real gap explorer.** An interactive showing a contact-rich task (e.g., insertion) in simulation vs. reality, with sliders for friction, stiffness, and mass parameters. Show how small changes in these parameters produce qualitatively different outcomes (stick vs. slip), making the sim-to-real gap for contact visceral.

10. **The humanoid hand comparison.** An interactive comparison of current dexterous hands (Tesla Optimus Gen 3, Figure 02, Sanctuary Phoenix, Shadow, Unitree H2) across DoF, actuation type, tactile sensitivity, payload, precision, and cost. Show the trade-offs: Tesla has the most DoF (22) but tendon wear issues; Sanctuary has the best tactile (5mN) but hydraulic maintenance; Unitree is cheapest but least dexterous.

---

## Open questions / where sources disagree

1. **Can vision alone produce dexterity, or is tactile sensing necessary?** Brooks says no (citing Johansson); Figure and Tesla are betting on vision-only training; π0.7 and Gemini Robotics 2 use tactile sensors in hardware but not at scale in training. This is unresolved.

2. **Does the scaling law hold for real-world success rate, or only for validation loss?** EgoScale shows log-linear scaling on validation loss with strong correlation to downstream performance. But the correlation is not perfect, and no one has published a scaling law for real-world success rate across unseen environments. The scaling camp assumes it will hold; the structure camp suspects it will plateau.

3. **Is the humanoid form factor correct?** Brooks says no (task-specific robots are better); Figure, Tesla, and the investment community say yes (the built world is designed for human bodies). The answer depends on whether a humanoid can achieve cost-per-task parity with purpose-built robots, which no one has demonstrated.

4. **How long is the 80% → 99.9% reliability gap?** Bessemer says "not years" for the ChatGPT moment but acknowledges the reliability gap is a "steep hill climb." Lisa Yan (ex-Waymo) says it "takes longer than most people realize." Brooks says "decades." The disagreement is about the slope of the improvement curve, not the existence of the gap.

5. **Is there a robotics bubble?** Bessemer says no ("not enough capital"); skeptics say yes ("too much capital chasing demos"). The disagreement is about whether current valuations are justified by the addressable market or inflated by hype. Unitree's profit halving despite volume leadership is a cautionary data point.

6. **Will world models replace VLA scaling, or augment it?** NVIDIA (Cosmos) and Meta (V-JEPA) are betting on world models as a complementary or alternative path. Physical Intelligence uses a lightweight world model for visual subgoal generation in π0.7. The question is whether world models will become the primary training paradigm or remain a supplementary tool.

7. **Does RL on real robots generalize beyond the tasks it was trained on?** π*0.6 Recap and RL-100 demonstrate large improvements on specific tasks. But both require per-task training. The open question is whether RL-finetuned skills transfer to unseen tasks or whether each new task requires its own RL stage.

8. **Can coding agents autonomously improve robot policies?** ENPIRE shows they can (99% on pin insertion, 100% on Push-T). But the system requires human-constructed environment interfaces (safety, reset, verification) as a one-time setup. The open question is whether the setup cost can be reduced to near-zero, enabling fully autonomous policy improvement.

---

## Source list

### Primary research papers and blog posts
1. π0.7: https://www.pi.website/blog/pi07 (April 2026)
2. π*0.6 (Recap): https://www.pi.website/blog/pistar06 (Nov 2025)
3. π0.5: https://www.pi.website/blog/pi05 (April 2025) ; arXiv: https://arxiv.org/abs/2504.16054
4. MEM (Multi-scale Embodied Memory): https://www.pi.website/research/memory (March 2026)
5. Robot Olympics: https://www.pi.website/blog/olympics (Dec 2025)
6. Real-time action chunking: https://www.pi.website/research/real_time_chunking (June 2025)
7. Human-to-robot transfer: https://www.pi.website/research/human_to_robot (Dec 2025)
8. Rodney Brooks, "Why Today's Humanoids Won't Learn Dexterity": https://rodneybrooks.com/why-todays-humanoids-wont-learn-dexterity/ (Sept 2025)
9. Rodney Brooks, Predictions Scorecard 2026: https://rodneybrooks.com/predictions-scorecard-2026-january-01/
10. Benjie Holson, "Humanoid Olympic Games": https://generalrobots.substack.com/p/benjies-humanoid-olympic-games
11. Ken Goldberg, "100,000-year data gap": https://www.science.org/doi/10.1126/scirobotics.aea7390 (Aug 2025)
12. EgoScale: https://arxiv.org/abs/2602.16710 ; https://research.nvidia.com/labs/gear/egoscale/ (Feb 2026)
13. Gemini Robotics 2: https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/ (July 2026)
14. Gemini Robotics ER 2: https://deepmind.google/models/gemini-robotics/embodied-reasoning/
15. Gemini Robotics ER 1.6: https://deepmind.google/blog/gemini-robotics-er-1-6/ (April 2026)
16. Figure Helix 02: https://www.figure.ai/news/helix-02 (Jan 2026)
17. Figure Helix (original): https://www.figure.ai/news/helix (Feb 2025)
18. Figure 03: https://www.figure.ai/news/introducing-figure-03
19. RL-100: https://arxiv.org/abs/2510.14830 ; Science Robotics: https://www.science.org/doi/10.1126/scirobotics.aed6267
20. ENPIRE: https://arxiv.org/abs/2606.19980 (June 2026)
21. "Robots Need More Than VLAs & World Models": https://arxiv.org/html/2606.06556v1 (June 2026)
22. VLA-Perf: https://arxiv.org/abs/2602.18397 (Feb 2026)
23. RoboArena: https://arxiv.org/abs/2506.18123 (June 2025)
24. RoboChallenge: https://arxiv.org/abs/2510.17950 (Oct 2025)
25. ManipulationNet: https://arxiv.org/abs/2603.04363 (March 2026)
26. Newton physics engine: https://developer.nvidia.com/blog/newton-adds-contact-rich-manipulation-and-locomotion-capabilities/ (April 2026)
27. State of simulation for physical AI: https://huggingface.co/blog/nvidia/state-of-simulation-for-physical-ai (July 2026)
28. Differentiable simulation of hard contacts: https://arxiv.org/abs/2506.14186 (ICLR 2026)
29. 3DGS real-to-sim: https://arxiv.org/abs/2511.04665
30. PolaRiS: https://arxiv.org/abs/2512.16881
31. TouchWorld: https://arxiv.org/abs/2607.07287 (July 2026)
32. Sparsh-X: https://arxiv.org/html/2506.14754v1
33. DreamTacVLA: https://arxiv.org/html/2512.23864v3
34. Data scaling laws in imitation learning: https://arxiv.org/abs/2410.18647 (ICLR 2025)
35. WholeBodyVLA: https://github.com/OpenDriveLab/WholebodyVLA (ICLR 2026)
36. LeVERB: https://arxiv.org/abs/2506.13751
37. RUKA hand: https://ruka-hand.github.io/
38. Humanoid hand comparison: https://en.wikipedia.org/wiki/Humanoid_hand (April 2026)
39. Sutton's "Bitter Lesson": http://www.incompleteideas.net/IncIdeas/BitterLesson.html
40. Brooks's "A Better Lesson": https://rodneybrooks.com/a-better-lesson/
41. Causal confusion in imitation learning: https://arxiv.org/abs/1905.11979
42. AutoEval: https://arxiv.org/abs/2503.24278
43. REALM benchmark: https://arxiv.org/abs/2512.19562
44. ASIMOV-Agentic: https://huggingface.co/datasets/google/asimov_agentic
45. Gemini Robotics 2 Safety Technical Report: https://storage.googleapis.com/deepmind-media/gemini-robotics/Gemini-Robotics-2-Safety.pdf

### Industry analysis and reporting
46. Bessemer Predicts: Robotics and physical AI: https://www.bvp.com/atlas/bessemer-predicts-robotics-and-physical-ai (April 2026)
47. Humanoid robots in 2026: what is actually deployed: https://www.technology.org/2026/07/18/humanoid-robots-in-2026-what-is-actually-deployed/ (July 2026)
48. Morgan Stanley on humanoid PR problem: https://www.cnbc.com/2026/07/29/morgan-stanley-humanoid-robots-pr-problem.html (July 2026)
49. Tesla Q4 2025 earnings call (Optimus): https://ir.tesla.com/
50. Figure AI 8-hour autonomous shift: https://www.techtimes.com/articles/316632/20260514/figure-ais-helix-02-robots
51. Computex 2026 humanoid collapse: https://tech.yahoo.com/science/articles/humanoid-robot-dies-stage-computex-17...
52. Unitree profit decline: https://www.techtimes.com/articles/320197/20260711/robot-boom-meets-earnings-reality-unitree-profits-halved-optimus-not-sale.htm
53. U.S. ban on Chinese humanoid imports: https://www.courant.com/2026/07/29/eeuu-prohbe-robots-humanoides-de-fabricaci...
54. Skild AI Brain 1.0: https://robotd.net/article/skild-ai-foundation-model-2026/ (June 2026)
55. NVIDIA GR00T N2 / Cosmos 3: https://nvidianews.nvidia.com/news/nvidia-and-global-robotics-leaders-take-ph...
56. Jetson Thor specs: https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor/
57. Dexterous hands primer: https://corematter.substack.com/p/dexterous-hands-primer-actuation
58. RSS 2026 Tactile Sensing workshop: https://tac-for-fm.github.io/rss2026/
59. N0-Foundation tactile intelligence: https://research.neoteai.com/assets/n0-foundation-report.pdf
60. FreeTacMan: https://github.com/OpenDriveLab/FreeTacMan (ICRA 2026)
