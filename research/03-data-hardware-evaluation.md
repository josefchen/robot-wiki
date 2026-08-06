# Robot Atlas — Part 03: Data, Hardware, Teleoperation & Evaluation

> **Research deliverable for the robot-atlas project.**
> Compiled August 6, 2026. All facts were verified via primary sources (manufacturer pages, arXiv papers, official dataset sites) between July–August 2026. Prices are marked with "as of" dates. Items that could not be independently confirmed are flagged `[UNVERIFIED]`. Citations use the format `[N]` and are listed in the References section.

---

## Table of Contents

- [Part A — The Data Bottleneck: Datasets, Scaling Laws & Alternative Sources](#part-a)
- [Part B — Hardware Taxonomy: Arms, Humanoids, Compute & Sensing](#part-b)
- [Part C — Teleoperation Rigs: From $100 to $30,000+](#part-c)
- [Part D — Evaluation & Benchmarks: The Reproducibility Crisis](#part-d)
- [References](#references)

---

<a id="part-a"></a>
## Part A — The Data Bottleneck: Datasets, Scaling Laws & Alternative Sources

### A1. Major Open-Source Robot Datasets

The robotics community has converged on a small number of large-scale, multi-institution datasets. The table below summarizes the five most consequential open datasets as of mid-2026.

| Dataset | Trajectories / Episodes | Hours | Scenes / Tasks | Embodiments | Institutions | License | Key Paper / Source |
|---|---|---|---|---|---|---|---|
| **Open X-Embodiment (OXE)** | 1,000,000+ | ~10,000+ (est.) | 160,266 tasks; 527 skills | 22 | 34 labs | Mixed (per-subdataset) | [1] |
| **DROID** | 76,000 | 350 | 564 scenes; 86 tasks | 1 (Franka Panda) | 13 | CC BY-NC 4.0 | [2] |
| **AgiBot World (Beta)** | 1,003,672 | ~100,000+ (est.) | 1,000+ tasks; 96 objects | 1 (AgiBot G2) | 1 (AgiBot) | CC BY-NC-SA 4.0 | [3] |
| **AgiBot World (Alpha)** | 92,214 | ~8,500 | 479 tasks; 96 objects | 1 (AgiBot) | 1 (AgiBot) | CC BY-NC-SA 4.0 | [3] |
| **RoboMIND** | 107,000 | ~5,000 (est.) | 479 tasks; 96 objects | Multiple | Multiple | CC BY-NC-SA 4.0 | [4] |
| **AgiBot World 2026** | [UNVERIFIED — episode/hour count not published in README; total file size 13.2 TB] | — | Commercial, home, general-purpose scenes | 1 (AgiBot G2) | 1 (AgiBot) | CC BY-NC-SA 4.0 | [5] |

#### Open X-Embodiment (OXE)

Launched in October 2023 by a consortium of 34 robotics labs, OXE aggregated **over 1 million robot trajectories** across **22 robot embodiments** and **60 individual datasets** [1]. The dataset spans **527 skills** and **160,266 tasks**, making it the broadest cross-embodiment resource available. The flagship model trained on OXE, RT-X, demonstrated that a single policy could generalize across robot platforms — RT-1-X improved success rates by 50% over robot-specific baselines on in-distribution tasks and showed emergent cross-embodiment generalization [1]. The dataset is hosted at `robotics-transformer-x.github.io` and uses a standardized RLDS (Reinforcement Learning Datasets) format.

#### DROID

DROID (Distributed Robot Interaction Dataset) is the largest open-source dataset collected on a single robot platform [2]. Key statistics:

- **76,000 trajectories** totaling **350 hours** of interaction
- **564 scenes** across **86 tasks**
- Collected by **50 human operators** at **13 institutions** over **12 months**
- Hardware: Franka Panda arm + 2× Stereolabs ZED 2 cameras + ZED Mini wrist camera + Meta Quest 2 for teleoperation
- **+22% in-distribution** and **+17% out-of-distribution** success rate improvement vs. next-best dataset when used for training diffusion policies [2]
- Data updates: April 2025 improved camera calibrations for 36k episodes; December 2024 added language annotations for 75k episodes [2]

#### AgiBot World

AgiBot World, released by AgiBot/Zhiyuan Robotics, is the largest single-organization robot dataset. The **Beta** release contains **1,003,672 trajectories** (~43.8 TB), while the **Alpha** release contains **92,214 trajectories** (~8.5 TB) [3]. Both are licensed CC BY-NC-SA 4.0. The dataset was collected on the AgiBot G2 robot platform and includes multi-camera setups (top head, hand left/right, head depth, fisheye, stereo). The associated foundation model **GO-1** requires ~7 GB VRAM for inference and ~70 GB for full fine-tuning [3]. The **GO-1-Pro** variant, trained on ~2.5× more pretraining data, achieves +15% improvement over GO-1 [6].

AgiBot World 2026 is the newest release, collected from 100% real-world environments on the AgiBot G2 platform, with digital twin simulation data provided through the GenieSim project [5]. The total file size is 13.2 TB. Episode and hour counts were not published in the dataset README as of August 2026 `[UNVERIFIED]`.

#### RoboMIND

RoboMIND contains **107,000 trajectories** across **479 tasks** and **96 objects**, collected across multiple robot embodiments [4]. It provides a complementary multi-task resource to the single-embodiment AgiBot World.

### A2. Data Scaling Laws for Robot Learning

Two key papers in 2024–2026 established quantitative scaling laws for robot manipulation data, analogous to the scaling laws well-known in LLM pretraining (e.g., Llama 3 was pretrained on ~15 trillion tokens from Common Crawl [7][8]).

#### Lin et al. (ICLR 2025 Oral) — "Data Scaling Laws in Imitation Learning"

- **arXiv:** 2410.18647 [9]
- **Venue:** ICLR 2025 (Oral presentation)
- **Scale:** 40,000+ demonstrations, 15,000+ real-world rollouts
- **Key findings:**
  - Performance follows a **power-law** in the number of environments and objects
  - **Diversity matters more than density**: adding demonstrations to *new* environments/objects yields greater gains than adding more demos to existing ones
  - The optimal strategy is **32 environments × 50 demonstrations** per environment → ~90% success on unseen environments/objects
  - Adding more demos per env beyond ~50 yields diminishing returns; adding more environments continues to help
- **Implication:** Teams should prioritize breadth (more scenes, objects, setups) over depth (more demos per task) when collecting data.

#### "Is Diversity All You Need for Scaling Imitation Learning?" (arXiv 2507.06219, v2 June 2026) [10]

- **Key findings:**
  - **Task diversity** (number of distinct tasks) matters more than **per-task demonstration count**
  - Multi-embodiment pretraining is **optional** — single-embodiment scaling is sufficient if task diversity is high
  - **Expert diversity can hurt**: when demonstrations come from operators with different styles, the resulting action distribution becomes multimodal (velocity multimodality), which confounds imitation learning. Debiasing expert demonstrations is important.
  - Applied to GO-1: debiasing + ~2.5× more pretraining data → **GO-1-Pro +15%** over GO-1 [6][10]

#### Summary Table: What to Scale

| Dimension | Effect on Performance | Diminishing Returns Threshold | Source |
|---|---|---|---|
| # Environments | Strong positive (power-law) | No clear ceiling found up to 32 envs | [9] |
| # Objects | Strong positive (power-law) | — | [9] |
| Demos per environment | Positive but diminishing | ~50 demos/env | [9] |
| # Tasks (task diversity) | Strong positive | No clear ceiling | [10] |
| Expert diversity | **Negative** (multimodal action distribution) | Must debias | [10] |
| Multi-embodiment pretraining | Optional, not critical | — | [10] |

### A3. Alternative & Complementary Data Sources

Beyond direct robot teleoperation, several projects provide data that can augment robot learning pipelines:

| Source | Description | Scale | Key Paper |
|---|---|---|---|
| **EgoDex** (Apple) | Human hand demonstration data collected via wearable sensors; minimal robot data in pretraining, relies on human wearable sensor data | 829 hours; 194 tasks | arXiv 2505.11709 [11] |
| **UMI (Universal Manipulation Interface)** | GoPro-only handheld gripper with 155° fisheye lens; no robot needed for collection | — | arXiv 2402.10329 [12] |
| **FastUMI** | Faster variant of UMI data collection | — | [UNVERIFIED] |
| **Human video** (e.g., Ego4D, EpicKitchens) | Egocentric human video for pretraining visual representations | 3,670+ hours (Ego4D) | [13] |
| **Simulation data** (Isaac Lab, GenieSim) | GPU-parallel simulation compresses months of training into hours | — | NVIDIA Isaac Lab [14] |

The key insight from the scaling-laws literature is that **diversity of environments and tasks** is the primary bottleneck, not raw data volume. This means that low-cost, diverse data sources (UMI, EgoDex, human video) can be disproportionately valuable even if they lack robot-specific action labels.

---

<a id="part-b"></a>
## Part B — Hardware Taxonomy: Arms, Humanoids, Compute & Sensing

### B1. Low-Cost Manipulator Arms & LeRobot Ecosystem

The LeRobot project (Hugging Face) has catalyzed a low-cost robotics ecosystem. The flagship reference robot is the **SO-101**, with additional community designs available [15][16].

| Robot / Kit | Price (as of Jul 2026) | DoF | Payload | Notes | Source |
|---|---|---|---|---|---|
| **SO-101** (parts only) | ~$100 | 5+1 | — | 3D-printed, community design | [16] |
| **SO-101** (kit, Seeed) | ~$269 | 5+1 | — | Motor kit + printed parts | [16] |
| **SO-ARM101 Pro** (assembled, Seeed) | $299 | 5+1 | 500 g | STS3215 servos, 12-bit magnetic encoders | [17] |
| **SO-ARM101 Pro** (unassembled, Seeed) | $295 ($260 motors + $35 printed parts) | 5+1 | 500 g | Same hardware, self-assembly | [17] |
| **SO-101** (fully assembled) | ~$500 | 5+1 | — | Ready to use | [16] |
| **LeKiwi** | from ~$220 | — | — | Wheeled base variant | [16] |
| **Koch v1.1** | ~$250–300 | 5+1 | — | Classic LeRobot design | [16] |
| **XLeRobot** | ~$660 | — | — | Community extended design | [16] |
| **Reachy Mini** (Polleni) | $299–$449 | — | — | Desktop robot head/face | [16] |
| **LeRobot Humanoid** | ~$2,500 | — | — | Bipedal community design | [16] |
| **HopeJR** | ~$3,000 | — | — | Community humanoid design | [16] |

**LeRobot software stack** supports ACT, π₀ (Pi-Zero), and SmolVLA policies, with the LeLab GUI for visualization. Simulation environments include LIBERO and Meta-World [15].

#### Mid-Range & High-End Teleoperation Arms (Trossen AI / formerly ALOHA)

Trossen Robotics rebranded its ALOHA product line as **Trossen AI** in 2025–2026, with significant price reductions [18][19]:

| Product | Current Price (as of 2026) | Previous Price | Reduction | Notes |
|---|---|---|---|---|
| **WidowX AI** | $2,995 | $4,545.95 | 34% | Single arm teleop system |
| **Solo AI** | $7,995 | $11,385.95 | 30% | Single-arm station |
| **Stationary AI** | $15,995 | $23,995.95 | 33% | Dual-arm bimanual station |
| **Mobile AI** | $22,995 | $33,695.95 | 32% | Dual-arm on mobile base |
| **TOTL Workstation** | $8,495.95 | — | — | Teleoperation workstation |

All Trossen AI systems feature **500 Hz CAN FD control**, the **iNerve** control board, and integration with **LeRobot** and **OpenPI** (π₀ / π₀.₅) [18][19].

#### High-End Research Arms

| System | Price (as of 2026) | Notes |
|---|---|---|
| **ALOHA 2** (Stanford) | ~$17,000–$32,000 | Bimanual, dual Franka-compatible setup [16] |
| **Reachy 2** (Polleni) | ~$70,000 | Full humanoid torso [16] |

### B2. Humanoid Robots — Comprehensive Taxonomy (as of July 2026)

The humanoid robot landscape has matured significantly. The following table is compiled from the RoboZaps "38 Best Humanoid Robots in 2026" ranking (re-verified July 13, 2026) [20] and manufacturer pages [21][22][23][24].

| # | Robot | Manufacturer | Height | Weight | Price (as of Jul 2026) | DOF | Payload | Battery | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Digit** | Agility Robotics | 175 cm | ~65 kg | RaaS (no list price) | — | 16 kg | 4 h | Deployed; SPAC pending (~$2.5B) [20] |
| 2 | **Atlas (Electric)** | Boston Dynamics | 190 cm | 90 kg | Not published | 56 | 50 kg instant / 30 kg sustained | 4 h swappable; IP67 | In production (2026 booked out) [20][25] |
| 3 | **Figure 03** | Figure AI | ~173 cm* | ~61 kg* | Not published | — | Not published | 2.3 kWh, ~5 h, 2 kW wireless charging | Fleet production; first BMW demo Jun 2026 [20][26] |
| 4 | **Walker S2** | UBTECH | 176 cm† | ~73 kg† | Enterprise | 52† | 15 kg | Dual-battery autonomous hot-swap (~3 min) | Mass production since Nov 2025 [20] |
| 5 | **Apollo 2** | Apptronik | Not published | Not published | Not published (~$80K/yr target from 2027) | — | 25 kg (Apollo 1 spec) | ~4 h (Apollo 1 spec) | Training fleets; Apollo 3 = 2027 [20] |
| 6 | **NEO** | 1X Technologies | 168 cm | 30 kg | $20,000 or $499/mo | 22→25 (hand revision Jul 9) | — | ~4 h (842 Wh) | Preorder; deliveries promised by end 2026 [20][27] |
| 7 | **A2** | AgiBot | 169 cm | 69 kg | Contact sales | 40+ | — | 700 Wh swappable, ~2 h | Mass production; 10,000th robot Mar 2026 [20] |
| 8 | **H2** | Unitree | 182 cm | ~70 kg | $29,900 | 31 | Peak ~15 kg / Rated ~7 kg | 0.972 kWh, ~3 h | Shipping [20][22] |
| 9 | **G1** | Unitree | 132 cm | ~35 kg | $13,500 (base); EDU quote-only | 23 (base) / 23–43 (EDU) | — | ~2 h | Orderable; backordered [20][28] |
| 10 | **GR-3** | Fourier | 165 cm | 71 kg | Above ¥200K (~$27.5K+) | — | — | — | Shipping B2B [20] |
| 11 | **Optimus 3** | Tesla | Not revealed | — | No price exists | — | — | — | Not commercialized [20] |
| 12 | **K2 Bumblebee** | Kepler | 175 cm | 75 kg | RMB 248,000 (~$34K) | — | — | — | Mass production [20] |
| 13 | **R1** | Unitree | 123 cm | ~27–29 kg | $4,900–$5,900 | — | — | — | Shipping [20] |
| 14 | **Oli** | LimX | 165 cm | ≤55 kg | From $21,800 | — | — | — | Ordering [20] |
| 15 | **Atom** | Dobot | ~1.5–1.65 m | ~66 kg | $27.5K China / $79K US | — | — | — | Batch deliveries [20] |
| 16 | **SE01** | EngineAI | 170 cm | ~55 kg | ¥88K launch (~$12K) | — | — | — | Available [20] |
| 17 | **4NE1** | NEURA | 180 cm | 80 kg | ~€98K each; €60K at 20+ (ex tax/shipping) | — | Up to 100 kg (claimed) | — | Reservations; late 2026 [20] |
| 18 | **Tiangong 3.0** | — | 169 cm | 62 kg | Not published | — | — | — | Mass delivery H2 2026 [20] |
| 19 | **Bumi** | Noetix | 94 cm | 12 kg | ¥9,998 (~$1,400) | — | — | — | Presale; delivery unconfirmed [20] |

*Reported figures; Figure publishes neither. †Press-reported, not official datasheet.*

#### Key Humanoid Hardware Details

**Unitree H2** [22]:
- 31 DoF (6 per leg, 7 per arm, 3 waist, 2 head)
- 360 N·m max leg joint torque; 120 N·m max arm joint torque
- 2070 TOPS onboard compute chip
- Intel Core i5 (base) / i7 (EDU) platform PC
- Aircraft-grade aluminum + titanium alloy construction
- Dexterous hand options (EDU only)
- 8-month warranty (base) / 12-month (EDU)
- OTA firmware updates

**Boston Dynamics Atlas (Electric)** [25]:
- 56 DoF with continuous rotation at key joints
- 360° camera-based vision + tactile sensing (no published LiDAR)
- IP67 rated; -20 to 40°C operating range
- 4-hour swappable battery
- In production since January 2026; all 2026 deployments committed to Hyundai and Google DeepMind
- Gemini Robotics models being integrated (CES 2026 announcement)

**Figure 03** [26]:
- In-house Helix VLA model (Helix 02, Jan 2026)
- Embedded palm camera per hand
- 2.3 kWh battery, ~5 h at peak, 2 kW wireless inductive charging through foot coils
- 9% lighter than Figure 02
- BotQ factory tooled for up to 12,000 units/year; targeting 100,000 robots over 4 years
- Figure 02 completed 11-month BMW Spartanburg pilot (Jan–Nov 2025): 30,000+ X3s, ~90,000 parts loaded at 99% accuracy
- Figure 03 completed first BMW demonstration June 2026

**1X NEO** [27]:
- $20,000 or $499/month with $200 refundable deposit
- 168 cm, 30 kg, tendon-driven soft body
- 842 Wh battery, ~4 h runtime
- Walk 1.4 m/s; max run 6.2 m/s
- 22 DoF per hand (25 DoF revision announced July 9, 2026; order page still lists 22)
- Privacy model: people-blurring, no-go zones, owner approval for teleoperation assistance
- NEO Factory (Hayward, CA) opened April 30, 2026; first 10,000 units of planned capacity booked in 5 days
- No customer deliveries confirmed as of July 2026

#### Industry Context (2026)

- **~13,000 humanoids shipped in 2025** (Omdia estimate) [20]
- **AgiBot** ranked #1 in 2025 shipments by Omdia: 5,168 units, 39% share (Unitree self-reports 5,500+ and disputes ranking) [20]
- **Agility Robotics** going public via SPAC at ~$2.5B (July 5, 2026); $300M+ in contracted Digit v5 orders [20]
- **NEURA Robotics** raised up to $1.4B (Series C, led by Tether, June 2026, ~$7B valuation) [20]
- **Market shakeout**: K-Scale Labs shut down (Nov 2025); Cartwheel Robotics shut down (Feb 2026); Sanctuary AI pivoted to software (Jun 2026); Amazon acquired Fauna Robotics (Mar 2026) [20]
- **Geopolitics**: American Security Robotics Act (Cotton-Schumer, March 2026) would bar federal use of foreign-adversary robots, naming Unitree and AgiBot [20]

#### AI Platforms for Humanoids

| Platform | Provider | Key Details |
|---|---|---|
| **Isaac GR00T** | NVIDIA | N1 released GTC Mar 2025; current release GR00T 1.7 (GTC Mar 2026, early access); N1.6 shipped CES 2026 with Cosmos Reason. Adopters: Agility, Boston Dynamics, NEURA, Mentee, 1X. Validated on Unitree G1 and AgiBot Genie-1 [20] |
| **Gemini Robotics** | Google DeepMind | Partnership with Boston Dynamics (CES 2026) for Atlas + Spot. Also powers Apptronik Apollo. Gemini Robotics 2 (Jul 30, 2026): first whole-body model (legs, torso, arms, hands under single policy). Task success: 92% (unscrew bulb) → 32% (sweep with dustpan). Early access only [20] |
| **Helix** | Figure AI (in-house) | VLA model; ended OpenAI collaboration Feb 2025. Helix 02 released Jan 2026 [20][26] |
| **UnifoLM-VLA-0** | Unitree | Open-sourced Jan 2026 [20] |

### B3. Edge Compute for Robot Policies

#### NVIDIA Jetson Thor (Flagship Robot Compute)

The Jetson Thor T5000 is NVIDIA's purpose-built edge compute module for robotics, positioned as the successor to Jetson AGX Orin [29]:

| Spec | Jetson Thor T5000 | Jetson Thor T4000 |
|---|---|---|
| AI Compute (FP4 sparse) | 2,070 TFLOPS | 1,200 TFLOPS |
| Memory | 128 GB LPDDR5X | 64 GB |
| Memory Bandwidth | 273 GB/s | — |
| CPU | 14-core Neoverse-V3AE | — |
| Power | 40–130 W | — |
| Perf vs AGX Orin | 7.5× | — |
| Efficiency vs AGX Orin | 3.5× | — |

#### VLA-Perf: Latency Benchmarks (NVIDIA Research, Feb 2026)

The **VLA-Perf** paper (arXiv 2602.18397, NVIDIA Research) [30] provides the first systematic latency analysis of Vision-Language-Action models on edge and cloud hardware. Key findings:

**Table: End-to-End π₀ Latency by Hardware**

| Hardware | E2E Latency (ms) | Frequency (Hz) |
|---|---|---|
| Jetson Thor | 52.57 | 19.0 |
| RTX 4090 | 31.06 | 32.2 |
| A100 | — | 61.7 |
| H100 | — | 162.5 |
| B100 | — | 314.4 |

**Table: π₀-L and π₀-XXL on Edge/Cloud**

| Model | Parameters | Frequency on Jetson Thor | Frequency on B100 |
|---|---|---|---|
| π₀ | ~3B | 19.0 Hz | 314.4 Hz |
| π₀-L | 9.1B | 3.9 Hz | — |
| π₀-XXL | 81.3B | — | 9.6 Hz |

**15 Key Takeaways from VLA-Perf** [30]:

1. **Denoising steps dominate** inference time for diffusion-based VLAs
2. **Chunk size is negligible** in its effect on latency (action chunking adds negligible overhead)
3. **Diffusion + chunking** is 1–2 orders of magnitude faster than vanilla autoregressive action generation
4. **Server-side inference beats on-device** in almost all scenarios, except on very poor networks
5. **Device–server collaboration** (split inference) is generally unattractive
6. **10 Hz control** is achievable on Jetson Thor for π₀-scale models
7. **100 Hz control** requires model-level architectural changes, not just faster hardware
8. The action expert is **memory-bound** (OI = 54), not compute-bound
9. Vision encoder is **compute-bound** (OI = 321.4)
10. VLM backbone is **compute-bound** (OI = 542.8)
11. Jetson Thor has balanced operational intensity (OI = 1481.5) → **everything is memory-bound** on it
12. On RTX 4090, the bottleneck shifts toward compute for larger models
13. Network latency dominates device–server split inference above ~50 ms round-trip
14. Quantization (FP4/FP8) can reduce latency by 2–4× with minimal accuracy loss
15. For real-time control, the number of denoising steps is the single most impactful hyperparameter

### B4. Tactile Sensing

Tactile sensing remains underutilized in robot learning despite significant hardware advances. The field faces several structural challenges:

**Key Challenges (per "Tactile Robotics: An Outlook," Luo et al., IEEE T-RO 2026, arXiv 2508.11261) [31]:**
- Diverse transduction methods exist (piezoresistive, piezoelectric, capacitive, magnetic, optical) but **no standardization** across manufacturers
- **Durability and reliability** of tactile sensors in real-world conditions remains a major barrier
- **Calibration drift** over time and across temperatures is a persistent problem
- Integration with vision and action strategies (active tactile perception) is still nascent
- Simulation tools for tactile data are emerging but not yet at the scale of visual simulation
- The field needs a "holistic approach" spanning manufacturing, healthcare, recycling, and agriculture

**Available Tactile Sensors (as of 2026):**

| Sensor | Manufacturer / Lab | Technology | Key Specs | Source |
|---|---|---|---|---|
| **GelSight Mini** | GelSight (MIT spinoff) | Optical (GelSight) | High-resolution contact geometry | [31][32] |
| **DIGIT** | Meta FAIR | Optical (GelSight-style) | Compact, fingertip-mounted | [32] |
| **Digit 360** | Meta FAIR + GelSight | Optical, 360° coverage | Full fingertip wrap-around sensing (Oct/Nov 2024) | [32] |
| **ReSkin / AnySkin** | Meta FAIR | Magnetic | Soft, compliant, inexpensive | [32] |

**Why tactile sensing is underused in robot learning** [31][32]:
- Most large-scale datasets (OXE, DROID, AgiBot World) contain **only visual and proprioceptive** data — no tactile channels
- Tactile sensors add **cost, complexity, and failure modes** to data collection rigs
- Lack of **standardized tactile data formats** (unlike images, which have standardized encodings)
- **Sim-to-real gap** for touch is arguably harder than for vision
- Few policy architectures natively process tactile input

### B5. Compute Cost Comparison

| Component | Price (as of 2026) | VRAM / Memory | Best For | Source |
|---|---|---|---|---|
| Jetson Thor T5000 | [UNVERIFIED — not publicly priced as of Aug 2026] | 128 GB LPDDR5X | On-robot inference | [29] |
| Jetson Thor T4000 | [UNVERIFIED] | 64 GB | On-robot inference (lower tier) | [29] |
| RTX 4090 | ~$1,599–$1,999 | 24 GB GDDR6X | Workstation training/inference | [30] |
| A100 80GB | ~$10,000–$15,000 | 80 GB HBM2e | Server training | [30] |
| H100 80GB | ~$25,000–$40,000 | 80 GB HBM3 | Server training | [30] |
| B100 | [UNVERIFIED — limited availability Aug 2026] | 192 GB HBM3e | Next-gen server training | [30] |

---

<a id="part-c"></a>
## Part C — Teleoperation Rigs: From $100 to $30,000+

Teleoperation is the primary method for collecting robot demonstration data. The cost and complexity of teleoperation rigs spans three orders of magnitude, from sub-$100 3D-printed designs to $30,000+ bimanual workstations.

### C1. Teleoperation Rig Taxonomy

| Rig | Type | Price (as of 2026) | Key Features | Paper / Source |
|---|---|---|---|---|
| **GELLO** | Kinematically matched exoskeleton | <$300 BOM | 3D-printed, matches robot kinematics; universal design | arXiv 2309.13037 [33] |
| **UMI (Universal Manipulation Interface)** | Handheld gripper | ~$100 (GoPro + 3D-printed gripper) | No robot needed; 155° fisheye GoPro; human collects data directly | arXiv 2402.10329 [12] |
| **FastUMI** | Handheld (UMI variant) | [UNVERIFIED] | Faster data collection than UMI | [UNVERIFIED] |
| **Bunny-VisionPro** | VR-based teleop | Apple Vision Pro + robot | Hand tracking via Vision Pro; low-latency | arXiv 2407.03162 [34] |
| **Open TeleVision** | VR-based teleop | [UNVERIFIED] | Open-source VR teleop | [UNVERIFIED] |
| **DexUMI** | Dexterous handheld | [UNVERIFIED] | Dexterous manipulation data collection | [UNVERIFIED] |
| **AirExo-2** | Exoskeleton | [UNVERIFIED] | Pneumatic exoskeleton | [UNVERIFIED] |
| **ACE** | [UNVERIFIED] | [UNVERIFIED] | [UNVERIFIED] | [UNVERIFIED] |
| **ALOHA / ALOHA 2** (Trossen AI) | Bimanual workstation | $17,000–$32,000 | Dual arms, 500 Hz CAN FD, iNerve board | [18][19] |
| **WidowX AI** (Trossen) | Single-arm teleop | $2,995 (was $4,545.95) | Entry-level Trossen system | [18] |
| **Solo AI** (Trossen) | Single-arm station | $7,995 (was $11,385.95) | Single-arm workstation | [18] |
| **Stationary AI** (Trossen) | Bimanual station | $15,995 (was $23,995.95) | Dual-arm bimanual | [18] |
| **Mobile AI** (Trossen) | Bimanual + mobile base | $22,995 (was $33,695.95) | Dual-arm on mobile platform | [18] |
| **TOTL Workstation** (Trossen) | Teleop workstation | $8,495.95 | Operator workstation | [18] |
| **DROID teleop setup** | VR-based (Quest 2) | Franka Panda + 2× ZED 2 + ZED Mini + Quest 2 | 50 operators, 13 institutions, 12 months → 76k trajectories / 350 h | [2] |

### C2. Detailed Rig Profiles

#### GELLO (arXiv 2309.13037) [33]
- **BOM:** <$300
- **Design:** 3D-printed kinematically matched exoskeleton that mirrors the target robot's joint configuration
- **Advantage:** Operator intuitively controls the robot because the exoskeleton's kinematics match the robot's — no inverse kinematics remapping needed
- **Universality:** Designed to be adaptable to different robot arms
- **Limitation:** Requires mechanical redesign for each new robot kinematic chain

#### UMI (Universal Manipulation Interface, arXiv 2402.10329) [12]
- **Hardware:** GoPro camera with 155° fisheye lens + 3D-printed handheld gripper
- **Cost:** ~$100 (GoPro + printed parts)
- **Key innovation:** **No robot needed for data collection** — a human holds the gripper and performs tasks naturally. The data is then used to train policies that can be deployed on a real robot.
- **Inference-time interface:** A handheld gripper with a GoPro serves as the "action space" — the policy outputs gripper poses that are inferred from the human's hand motion
- **Advantage:** Massively scalable data collection — anyone with a GoPro can collect training data
- **Limitation:** Limited to tasks that a human can perform with a simple parallel-jaw gripper held in their hand; no force feedback

#### Bunny-VisionPro (arXiv 2407.03162) [34]
- **Hardware:** Apple Vision Pro headset + robot arm
- **Key innovation:** Uses Vision Pro's hand tracking for low-latency teleoperation
- **Advantage:** High-fidelity hand tracking without custom hardware; intuitive interface
- **Limitation:** Requires Apple Vision Pro (~$3,499), adding to total system cost

#### ALOHA / Trossen AI Systems [18][19]
- **ALOHA 2** (Stanford): Bimanual teleoperation with dual arms, originally designed for the ALOHA/ACT pipeline
- **Rebranded as Trossen AI** in 2025–2026 with 30–34% price reductions across the product line
- **Key specs:** 500 Hz CAN FD control loop, iNerve control board
- **Software integration:** LeRobot + OpenPI (π₀ / π₀.₅)
- **Price range:** $2,995 (WidowX AI, single arm) to $22,995 (Mobile AI, bimanual + mobile base)

#### DROID Teleoperation Setup [2]
- **Robot:** Franka Panda 7-DoF arm
- **Cameras:** 2× Stereolabs ZED 2 (scene) + ZED Mini (wrist)
- **Teleop interface:** Meta Quest 2 VR headset
- **Scale achieved:** 50 operators at 13 institutions collected 76,000 trajectories (350 hours) over 12 months
- **Key lesson:** Distributed data collection is feasible but requires careful calibration protocols (DROID released improved calibrations in April 2025)

### C3. Choosing a Teleoperation Rig

| Budget | Recommended Rig | Best For |
|---|---|---|
| <$300 | GELLO | Kinematically-matched teleop for a specific arm |
| ~$100 | UMI | Mass-scalable data collection without a robot |
| $1,000–$5,000 | Bunny-VisionPro + low-cost arm (e.g., SO-101) | Dexterous teleop with hand tracking |
| $3,000–$8,000 | WidowX AI or Solo AI (Trossen) | Entry-level commercial teleop |
| $8,000–$16,000 | Stationary AI (Trossen) or TOTL workstation | Bimanual research teleop |
| $17,000–$32,000 | ALOHA 2 / Mobile AI (Trossen) | Full bimanual + mobile base |
| $30,000+ | Reachy 2 (Polleni) | Full humanoid torso teleop |

---

<a id="part-d"></a>
## Part D — Evaluation & Benchmarks: The Reproducibility Crisis

### D1. The Problem: Statistical Noise in Robot Evaluation

Robotics has an evaluation problem. The seminal **TRI LBM** (Learning Before Moving) paper (Science Robotics 2026, arXiv 2507.05331) [35] demonstrated that many published robot learning results may be measuring statistical noise rather than real performance differences.

#### TRI LBM Key Findings [35]:

- **Data scale:** ~1,700 hours total training data = 468 h internal bimanual + 45 h simulation + 32 h UMI + ~1,150 h OXE
- **Evaluation scale:** 1,800 real-world rollouts, 47,000+ simulation rollouts, 4,200 rollouts across 29 tasks
- **Protocol:** 50 real rollouts / 200 simulation rollouts per task
- **Transfer efficiency:** 3–5× less data needed for new tasks after pretraining
- **Critical statistical finding:** At 50 real rollouts, the **Clopper-Pearson 95% confidence interval has ~20–30% absolute width**
- **Conclusion:** "Many robotics papers may be measuring statistical noise" — differences of 10–15% in reported success rates between methods may not be statistically significant at typical evaluation scales (10–20 rollouts)

#### Optimal Stopping for Robot Evaluation (arXiv 2503.10966, TRI/Princeton) [36]:

- Proposes a **sequential testing framework** with near-optimal stopping rules
- Can reduce the number of evaluation trials by **up to 32%** while maintaining the same statistical power
- Enables dynamic decision-making: stop early if one method is clearly superior, continue if results are close
- Based on sequential probability ratio tests (SPRT) adapted for binomial success rates

### D2. Benchmark Environments

#### SimplerEnv (arXiv 2507.05331 companion, simpler-env.github.io) [37]

SimplerEnv provides a standardized simulation evaluation framework with two key components:

- **Visual Matching:** Adjusts simulation rendering to match real-world visual conditions
- **System Identification (SysID):** Calibrates simulation dynamics to match real robot dynamics
- **Evaluation metric:** Pearson correlation coefficient and **MMRV** (Multi-Method Rank Verification) between sim and real performance
- **Scale:** ~1,500 paired simulation-real episodes used for validation
- **Key insight:** Sim-to-real correlation is task-dependent; some tasks show high correlation (reliable sim evaluation) while others show poor correlation (sim results are uninformative)

#### LIBERO-Plus (arXiv 2510.13626) [38]

LIBERO-Plus stress-tests policy robustness across 7 perturbation axes:

- **Perturbation axes:** camera viewpoint shift, initial state shift, object color/texture change, lighting change, background change, distractor objects, language instruction variation
- **Key finding:** Models achieving **95% success on standard LIBERO** drop to **<30%** under modest camera-viewpoint or initial-state shifts
- **Language ablation:** Models largely **ignore language instructions** — performance barely changes when instructions are shuffled or removed
- **Implication:** High benchmark scores on clean benchmarks may not reflect true task understanding; robustness evaluation is essential

#### Additional Benchmarks (2025–2026)

| Benchmark | Focus | Paper / Source |
|---|---|---|
| **Meta-World+** | Extended Meta-World with more tasks and harder variants | arXiv 2505.11289, NeurIPS 2025 [39] |
| **RoboCasa / RoboCasa365** | Household manipulation benchmark | [UNVERIFIED] |
| **ManiSkill3** | General manipulation skill benchmark | [UNVERIFIED] |
| **LIBERO-X** | Extended LIBERO with more perturbations | [UNVERIFIED] |
| **PolaRiS** | [UNVERIFIED] | [UNVERIFIED] |
| **RobotArena∞** | [UNVERIFIED] | [UNVERIFIED] |

### D3. Real-Robot Evaluation Frameworks

#### RoboArena (arXiv 2506.18123) [40]

RoboArena is the first **crowd-sourced, double-blind, pairwise evaluation** framework for robot policies:

- **Method:** Policies are evaluated in **head-to-head pairwise comparisons** on identical tasks, with blind scoring (evaluators don't know which policy is which)
- **Scale:** 600+ pairwise episodes across 7 policies
- **Institutions:** 7 participating institutions
- **Platform:** DROID platform (Franka Panda + cameras)
- **Key innovation:** Eliminates single-lab bias by distributing evaluation across multiple sites with different environments, lighting, and objects
- **Output:** Elo-like rating or win-rate matrix across policies

#### RoboChallenge / Table30 (arXiv 2510.17950) [41]

- Provides a standardized set of 30 manipulation tasks for systematic evaluation
- Designed to be reproducible across labs with common hardware
- [Further details UNVERIFIED — paper not fully retrieved]

### D4. Evaluation Protocol Recommendations

Based on the findings above, the following evaluation protocol is recommended for robot learning papers:

| Aspect | Recommendation | Rationale | Source |
|---|---|---|---|
| **Minimum rollouts per condition** | 50 (real) / 200 (sim) | Clopper-Pearson CI at 50 rollouts ≈ ±10–15% absolute | [35] |
| **Confidence intervals** | Report Clopper-Pearson exact CIs | Standard for binomial success rates | [35] |
| **Statistical testing** | Use sequential tests (SPRT) | Up to 32% fewer trials for same power | [36] |
| **Multi-site evaluation** | Distribute across ≥3 institutions | Eliminates single-lab environment bias | [40] |
| **Blind evaluation** | Pairwise blind comparison when possible | Eliminates evaluator bias | [40] |
| **Robustness testing** | Evaluate under perturbations (viewpoint, lighting, objects) | 95% on clean → <30% under modest shifts | [38] |
| **Language ablation** | Test with shuffled/removed instructions | Models may ignore language | [38] |
| **Sim-to-real validation** | Report Pearson r and MMRV | Sim results alone are insufficient | [37] |
| **Report absolute numbers** | Not just relative improvements | Enables meta-analysis across papers | [35] |

### D5. The Evaluation Crisis in Summary

The robotics evaluation literature from 2025–2026 reveals a field-wide problem:

1. **Most papers use 10–20 rollouts per condition** — at this scale, differences of 10–15% success rate are within the noise floor (Clopper-Pearson CI width ~20–30% at 50 rollouts, even wider at 10–20) [35]
2. **Single-lab evaluation introduces environment bias** — results may not transfer to other labs with different lighting, objects, or camera placements [40]
3. **Clean benchmarks overestimate real-world performance** — 95% on standard LIBERO drops to <30% under modest perturbations [38]
4. **Language grounding is often illusory** — models may achieve high success rates while ignoring language instructions entirely [38]
5. **Sim-to-real correlation is unreliable** — simulation results alone are insufficient to predict real-world performance for many tasks [37]
6. **No standardized evaluation protocol exists** — each paper uses different tasks, metrics, and rollout counts, making cross-paper comparison difficult [35][40]

The field is responding with crowd-sourced evaluation (RoboArena) [40], sequential testing frameworks [36], and perturbation-based benchmarks (LIBERO-Plus) [38], but adoption remains limited.

---

<a id="references"></a>
## References

- [1] Open X-Embodiment Collaboration, "RT-X: Open X-Embodiment Robot Datasets," `robotics-transformer-x.github.io`, Oct 2023. Accessed Aug 2026.
- [2] DROID Collaboration, "DROID: A Large-Scale In-The-Wild Robot Manipulation Dataset," `droid-dataset.github.io`. Accessed Aug 2026. arXiv 2403.12945.
- [3] AgiBot World Team, "AgiBot World: A Large-Scale Robotic Manipulation Dataset," `github.com/Agibot-World/Agibot-World`, 2025. Accessed Aug 2026.
- [4] RoboMIND, 2025. 107k trajectories, 479 tasks, 96 objects. [Further details from WebSearch, Aug 2026.]
- [5] AgiBot World Team, "AgiBot World 2026," `huggingface.co/datasets/agibot-world/AgiBotWorld2026`, 2026. Accessed Aug 2026. Total file size: 13.2 TB. License: CC BY-NC-SA 4.0.
- [6] AgiBot, "GO-1 / GO-1-Pro Foundation Models," `agibot-world.com`, 2025–2026. GO-1 inference ~7 GB VRAM; full fine-tune ~70 GB. GO-1-Pro +15% with ~2.5× pretraining data. Accessed Aug 2026.
- [7] Penedo et al., "The FineWeb Datasets: Decanting the Web for the Finest Text Data at Scale," arXiv 2406.17557, NeurIPS 2024. 15T tokens from 96 Common Crawl snapshots.
- [8] Meta, "Introducing Meta Llama 3," `ai.meta.com/blog/meta-llama-3/`, 2024. Accessed Aug 2026.
- [9] Lin et al., "Data Scaling Laws in Imitation Learning," arXiv 2410.18647, ICLR 2025 (Oral). 40,000+ demos, 15,000+ real rollouts.
- [10] "Is Diversity All You Need for Scaling Imitation Learning?" arXiv 2507.06219, v2 June 2026.
- [11] Apple, "EgoDex: Egocentric Hand Demonstration Data," arXiv 2505.11709, 2025. 829 hours, 194 tasks.
- [12] Chi et al., "Universal Manipulation Interface: In-The-Wild Robot Teaching Without Robot Learning," arXiv 2402.10329, 2024.
- [13] Ego4D, `ego4d-data.org`, 2022. 3,670+ hours of egocentric video.
- [14] NVIDIA, "Isaac Lab," `isaac-sim.github.io/IsaacLab`, 2024–2026.
- [15] Hugging Face, "LeRobot Documentation," `huggingface.co/docs/lerobot/index`. Accessed Aug 2026. Supports SO-101, LeKiwi, Koch v1.1, LIBERO, Meta-World; LeLab GUI; ACT, π₀, SmolVLA.
- [16] LeRobot ecosystem pricing table, GitHub issue (June 2026). SO-101 ~$100 parts → ~$269 kit → ~$500 assembled; LeKiwi from ~$220; Reachy Mini $299/$449; XLeRobot ~$660; Koch v1.1 ~$250–300; LeRobot Humanoid ~$2,500; HopeJR ~$3,000; ALOHA/ALOHA 2 ~$17k–$32k; Reachy 2 ~$70,000.
- [17] Seeed Studio, "SO-ARM101 Pro," `seeedstudio.com`. Motor kit $288.99; unassembled $295 ($260 + $35 printed parts); assembled $299. 5+1 DoF, 500 g payload, 12-bit magnetic encoders, STS3215 servos. Accessed Aug 2026.
- [18] Trossen Robotics, "Trossen AI Products," `trossenrobotics.com/aloha-kits` and `trossenrobotics.com/ai`. Accessed Aug 2026. WidowX AI $2,995 (was $4,545.95); Solo AI $7,995 (was $11,385.95); Stationary AI $15,995 (was $23,995.95); Mobile AI $22,995 (was $33,695.95); TOTL $8,495.95. 500 Hz CAN FD, iNerve board, LeRobot + OpenPI integration.
- [19] Trossen Robotics, "ALOHA rebranded as Trossen AI," `trossenrobotics.com/ai`. Accessed Aug 2026.
- [20] RoboZaps, "38 Best Humanoid Robots in 2026 (Evidence-Ranked)," `blog.robozaps.com/b/best-humanoid-robots`. Re-verified July 13, 2026. Accessed Aug 2026.
- [21] Unitree, "G1 Product Page," `unitree.com/g1/`. 1320 mm, ~35 kg, 23 DoF base / 23–43 EDU, 2 h battery, $13,500. Accessed Aug 2026.
- [22] Unitree, "H2 Product Page," `unitree.com/H2/`. 1820 mm, ~70 kg, 31 DoF, 360 N·m leg torque, 120 N·m arm, ~15 kg peak payload, 0.972 kWh, ~3 h, 2070 TOPS chip, $29,900. Accessed Aug 2026.
- [23] Figure AI, "Introducing Figure 03," `figure.ai/news/introducing-figure-03`, Oct 9, 2025. Accessed Aug 2026.
- [24] 1X Technologies, "NEO Specifications," `1x.tech/neo` and `1x.tech/order`. $20,000 or $499/mo, 168 cm, 30 kg, 842 Wh, ~4 h. Accessed Aug 2026.
- [25] Boston Dynamics, "Atlas Product Page," `bostondynamics.com/products/atlas/`. 1.9 m, 90 kg, 56 DoF, 50 kg instant / 30 kg sustained, IP67, 4 h swappable. Accessed Aug 2026.
- [26] Figure AI, "Figure 03 at BMW," `figure.ai/news/f-03-at-bmw`, June 2026. Accessed Aug 2026.
- [27] 1X Technologies, "NEO Factory Update," `1x.tech/discover/neo-factory`, April 30, 2026. Accessed Aug 2026.
- [28] Unitree, "G1 Product Page," `unitree.com/g1/`. $13,500 base; EDU quote-only. Accessed Aug 2026.
- [29] NVIDIA, "Jetson Thor Product Page," `nvidia.com/en-us/autonomous-machines/embedded-systems/jetson/`. T5000: 2070 FP4 TFLOPS sparse, 128 GB LPDDR5X, 273 GB/s, 14-core Neoverse-V3AE, 40–130 W, 7.5× perf / 3.5× efficiency vs AGX Orin. T4000: 1200 TFLOPS, 64 GB. Accessed Aug 2026.
- [30] NVIDIA Research, "VLA-Perf: Performance Analysis of Vision-Language-Action Models," arXiv 2602.18397, Feb 2026.
- [31] Luo, Lepora, Yuan, Althoefer, Cheng, Dahiya, "Tactile Robotics: An Outlook," arXiv 2508.11261, accepted to IEEE Transactions on Robotics, Aug 2025.
- [32] Meta FAIR / GelSight, "Digit 360" and related tactile sensor releases, Oct/Nov 2024. GelSight Mini, DIGIT, ReSkin/AnySkin. [Compiled from WebSearch results, Aug 2026.]
- [33] Wu et al., "GELLO: A General, Low-Cost, and Intuitive Teleoperation Framework," arXiv 2309.13037, 2023. <$300 BOM.
- [34] "Bunny-VisionPro: Real-Time Bimanual Teleoperation," arXiv 2407.03162, 2024.
- [35] Toyota Research Institute (TRI), "Learning Before Moving (LBM)," arXiv 2507.05331, Science Robotics 2026. ~1,700 h data, 1,800 real rollouts, 47,000+ sim rollouts. Clopper-Pearson CI at 50 rollouts ≈ 20–30% absolute width.
- [36] TRI / Princeton, "Sequential Testing for Robot Evaluation," arXiv 2503.10966, 2025. Near-optimal stopping, up to 32% fewer trials.
- [37] "SimplerEnv: Simulated Evaluation for Robot Policies," `simpler-env.github.io`, arXiv 2507.05331 companion. Visual Matching + SysID; Pearson r and MMRV; ~1,500 paired episodes.
- [38] "LIBERO-Plus: Robustness Evaluation for Robot Policies," arXiv 2510.13626, 2025. 7 perturbation axes; 95% → <30% under modest shifts; models ignore language.
- [39] "Meta-World+," arXiv 2505.11289, NeurIPS 2025.
- [40] "RoboArena: Crowd-Sourced Double-Blind Pairwise Evaluation," arXiv 2506.18123, 2025. 7 institutions, 600+ pairwise episodes, 7 policies, DROID platform.
- [41] "RoboChallenge / Table30," arXiv 2510.17950, 2025. 30 standardized manipulation tasks.
