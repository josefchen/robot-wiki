# World-models content-integrity audit

Date of audit: 2026-08-17. Scope: the five published `world-models` articles
(taxonomy, latent-dynamics, generative-video, jepa, generative-sim) against
their cited primary sources, fetched and read during this audit (arXiv abs
pages and HTML full texts, the Cosmos 3 technical report PDF, the Genie 1
paper PDF, the RoboCasa365 PDF, the DeepMind Genie 2/Genie 3 blogs including
the published comparison table image, the Google Project Genie announcement,
the NVIDIA GTC Taipei launch release, the 1X World Model Lab and Odyssey
blogs, TechCrunch's AMI Labs coverage, the Nature version of DreamerV3, and
the Ars Technica Project Genie hands-on). Claims VAL-AUDIT-003.

Method: every checkable claim (numbers, dates, names, benchmark results,
attributions, quoted or quoted-sounding phrases) was extracted per article
and checked against the source the article cites for it, by fetching that
source. Per the pre-loaded warning from audit-rl-sim2real, every named
characterization was treated as a hypothesis until found verbatim in the
primary source: `research/02-rl-sim2real-world-models.md` (the same file that
produced the two false attributions in the rl-sim2real audit) is also the
source research for this domain, and two of the corrections below (the
"15-50 steps" horizon range and the TD-MPC2 "104 tasks" agent framing) trace
to its phrasing. Interactive panels were checked for honest-unknown labeling
and for consistency with the corrected prose.

## Summary

- Claims checked: 89
- Verified: 79 (one of them needed a citation added for traceability)
- Corrected: 10
- Cut: 0 (unsupported clauses were trimmed inside corrections; no claim was
  cut wholesale)
- Unresolved: 0

Corrections:

1. `latent-dynamics.mdx` gave TD-MPC2's headline as "a single
   317M-parameter agent across 104 continuous-control tasks in 4 task
   domains" (prose) and "one agent, 104 tasks" (Stat). The abstract reports
   two different things: strong results "across 104 online RL tasks spanning
   4 diverse task domains ... with a single set of hyperparameters", and
   separately "a single 317M parameter agent to perform 80 tasks across
   multiple task domains, embodiments, and action spaces". The 104-task
   figure describes the benchmark; the 317M agent covers 80 tasks. Both
   spots rewritten to the abstract's wording. `taxonomy.mdx` already had the
   correct split ("317M ... one agent, 80 tasks") and was left unchanged.
2. `latent-dynamics.mdx` claimed "In practice this caps usable imagination
   at roughly 15 to 50 steps" cited to the world-model survey, with a
   matching Stat ("horizon 15-50, imagined steps, typical") and a
   `TYPICAL_HORIZON = [15, 50]` constant in `lib/latent-imagination.ts`
   (comment: "see research/02 Part B1"). The survey states no such range;
   the figure is a research-note coinage. Replaced with the primary papers'
   own horizons: DreamerV3 trains on 15-step imagined rollouts
   (arXiv:2301.04104; the Nature version states T = 16) and TD-MPC2 plans
   3 steps ahead (arXiv:2310.16828, Appendix Table 8). Stat now reads "15,
   imagined steps, DreamerV3"; the prose cites dreamerv3-2023 and
   tdmpc2-2023 instead of the survey; the constant is now [3, 15] with
   comments naming the two papers; the interactive's shaded band, aria
   label, and chart annotation were updated to "published 3-15".
3. `generative-video.mdx` described Cosmos 3 Nano as "16B (an 8B reasoner
   and an 8B generator)" in prose and "8B reasoner + 8B generator" in the
   Stat. The technical report describes Nano as a 16B model built on a dense
   8B transformer (Super: 64B on a dense 32B transformer), with reasoner and
   generator towers sharing joint attention; it does not describe an
   8B-plus-8B split. Both spots rewritten to the report's wording.
4. `generative-video.mdx` said Nano is "aimed at a workstation". Neither the
   technical report nor the launch release says this; the release describes
   Nano as delivering "high-quality video and action reasoning in fractions
   of a second". Cut.
5. `generative-video.mdx` opened the Cosmos section with "NVIDIA's 2025
   Cosmos stack was a family: Predict for world generation, Transfer for
   controlled generation, Reason for scene understanding, Policy for
   action", cited to the Cosmos 3 report. The report never enumerates a
   2025 family (its only product-name mention is a benchmark citation of
   Cosmos Reason), and no 2025 "Cosmos Policy" product exists (Cosmos Policy
   is a January 2026 paper post-training Cosmos-Predict2). Rewritten to the
   report's own framing: the current paradigm stitches together "a
   disjointed suite of models" (a VLM to plan, a VLA or WAM to act, a
   forward-dynamics world model to simulate), which the report calls
   fragmented and computationally wasteful, and Cosmos 3 unifies those
   capabilities in one omni-model.
6. `generative-video.mdx` said Cosmos 3 "launched at GTC Taipei in June
   2026". The NVIDIA launch release is dated May 31, 2026 with a GTC Taipei
   dateline. Corrected to "late May 2026".
7. `generative-video.mdx` attributed a rationale for Project Genie's
   60-second cap to the cited Ars Technica article: "because Genie 3 is
   autoregressive and dedicated compute makes longer sessions too expensive
   to scale". Neither the Ars article nor Google's announcement gives that
   rationale (Ars says only "Generating all this AI video is expensive, so
   it makes sense to start with the higher tier", its own inference about
   the subscription tier). The clause was cut; the cap itself is verified
   (see the press-source re-examination below).
8. `jepa.mdx` said "LeCun left Meta in November 2025". The cited TechCrunch
   article (2026-03-09) says only "after he left Meta"; the month appears in
   neither TechCrunch piece checked. Month dropped.
9. `jepa.mdx` called AMI Labs' raise "one of the largest seed rounds on
   record". The cited article makes no such claim (it says the round was
   larger than initially rumored and compares it to World Labs' $1B), and
   neither TechCrunch piece calls the round a "seed" at all. The superlative
   was cut; the verified core ($1.03B at a $3.5B pre-money valuation, March
   2026, to build world models — the last phrase is the article's headline)
   stands. The Stat box label "AMI seed" carried the same unsupported
   characterization and was relabeled "AMI raise".
10. `generative-sim.mdx` gave RoboCasa "over 3,200 object assets" in prose
    and "3,200+" in the Stat box. The paper says "over 2,500 objects across
    over 150 categories" (2,509 in its comparison table; "2,500+
    high-quality 3D objects" in the conclusion). Both spots corrected to
    "over 2,500" / "2,500+".
11. `generative-sim.mdx` said "Eureka's own accounting includes reward
    hacking and the need for human inspection of generated rewards". The
    Eureka paper never mentions reward hacking (full-text grep: zero hits);
    it says its rewards are "clean and interpretable, amenable to post-hoc
    human inspection and editing" and that the algorithm stays "compatible
    with human oversight to assure safety and alignment". Rewritten to the
    paper's wording.

Traceability fix: `taxonomy.mdx` named Cosmos Policy ("the same idea on top
of the Cosmos backbone") with no citation. The claim verifies against the
paper (arXiv:2601.16163: "adapting a large pretrained video model
(Cosmos-Predict2) into an effective robot policy through a single stage of
post-training ... with no architectural modifications"), so a registry entry
`cosmos-policy-2026` was added (11 authors verified against the abs page) and
the sentence now cites it.

Press-source re-examination (precondition: `project-genie-2026`, Ars
Technica, was accepted once as a press source): the entry stays. The
load-bearing facts it supports (Project Genie released January 2026, AI
Ultra subscribers, 60-second cap per world) are corroborated by Google's own
announcement (blog.google, 2026-01-29), whose published limitation list
includes "Limitations in generations to 60 seconds". Nothing load-bearing
rests on Ars alone; Ars remains the source for hands-on detail (720p at
~24 fps observed, world sketching via Nano Banana Pro, promptable events not
yet available, $250/month tier). One defect was found in how the article used
the source (correction 7). Outcome recorded in the mission library
(`library/content-quality.md`).

Unreleased/partially-disclosed systems check (feature requirement): the
articles' treatment passes. Genie 3's capabilities are tied to DeepMind's own
published limitation list, quoted as the lab's accounting; Project Genie's
cap is attributed to the deployment, not generalized; 1X's NEO zero-shot
generalization is framed as the company's own claim ("The company credits
the model with..."), not established fact; Odyssey-2, Starchild-1, and
Agora-1 capabilities are stated from the vendor pages with dates; Cosmos 3
claims are tied to the technical report and launch release. No lab claim is
stated as independently verified.

Hardware-context sweep: throughput figures carry hardware context. IWS
">10 min at 15 FPS" names "one RTX 4090" in the Stat; Fast-WAM's ">4x
faster" is a relative number from the paper; RoboWorld's r = 0.989 is a
correlation, not a throughput figure. No figure was cut.

## taxonomy.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| "Ask three labs what their world model is and you will get three different objects" (three-paradigm framing; six paradigms on three axes) | World-model survey, arXiv 2605.00080 HTML | verified | Article's own organizing cut, consistent with the survey's taxonomy sections; presented as the article's framing, not the survey's. |
| Survey quote: "a model does not qualify as a world model in our sense simply because it generates plausible future images or videos" | Survey, arXiv 2605.00080 | verified | Verbatim in the survey's definition section. |
| "The survey's named top open challenge, weak action conditioning ... many models are trained mostly on observation history and task intent" | Survey, Sec. 8.1 | verified | Sec. 8.1 is weak action conditioning; observation-history/task-intent training is its stated cause. |
| Stat: "paradigms 6, sharing one name" | Article's own count of its six sections | verified | Self-consistent; the disambiguation is the module's contribution. |
| Stat: "DreamerV3 tasks 150+, one fixed hyperparameter set" | DreamerV3, arXiv 2301.04104 abstract + Nature 640:647-653 (2025) | verified | "outperforms specialized methods across over 150 diverse tasks, with a single configuration". |
| Stat: "TD-MPC2 params 317M, one agent, 80 tasks" | TD-MPC2, arXiv 2310.16828 abstract | verified | "a single 317M parameter agent to perform 80 tasks across multiple task domains, embodiments, and action spaces". |
| Stat: "V-JEPA 2 video 1M+, hours of action-free pretraining" | V-JEPA 2, arXiv 2506.09985 | verified | "Leveraging 1M hours of internet-scale video and 1M images"; action-free pre-training stage. |
| Dreamer RSSM: deterministic recurrent state plus stochastic latent, decoder during training, actor and critic trained on imagined latent rollouts | Dreamer, arXiv 1912.01603 | verified | RSSM composition and latent-imagination training as described. |
| "DreamerV3's contribution was a set of normalization tricks (symlog transforms, two-hot reward encoding) that let one fixed hyperparameter set work across more than 150 tasks, and it was the first agent to collect diamonds in Minecraft from scratch" | DreamerV3 paper | verified | Symlog, two-hot reward encoding, free bits, percentile return normalization all in the paper; Minecraft first-diamonds claim is the paper's headline. |
| "DayDreamer took the same algorithm onto physical hardware: a quadruped learned to roll over, stand, and walk from scratch in about one hour" | DayDreamer, arXiv 2206.14176 abstract | verified | "roll off its back, stand up, and walk from scratch and without resets in only 1 hour"; 4 robots, same hyperparameters. |
| TD-MPC2 paragraph: no decoder, reward/value-only latent, MPPI at every control step, policy-prior warm start; "a single 317M-parameter agent across 80 tasks spanning multiple task domains, embodiments, and action spaces" | TD-MPC2 paper | verified | Matches the abstract and method sections; the 80-task figure is the correct one (contrast latent-dynamics correction 1). |
| "NVIDIA's Cosmos 3 folds understanding, generation, forward dynamics, inverse dynamics, and policy into one omni-model with separate autoregressive and diffusion subsequences sharing joint attention" | Cosmos 3 technical report | verified | MoT with AR and diffusion subsequences, separate parameters, dual-stream joint attention; three action modes (forward dynamics, inverse dynamics, policy) plus VLM and generation roles. |
| "Genie 3 generates navigable worlds in real time at 24 fps and 720p, consistent for a few minutes, and its own published limitation list (constrained agent action space, few-minute interaction duration)" | DeepMind Genie 3 blog + comparison-table image | verified | 720p/24 fps/few-minutes confirmed; the limitation list is the blog's own. |
| "What these models are actually used for today is data generation, policy evaluation, and RL post-training in narrow task families, not general replacement of physics engines" | Survey Sec. 8 + the paradigm papers | verified | Article's synthesis, framed as such; consistent with the survey's application sections. |
| "V-JEPA 2 pretrains action-free on over a million hours of internet video, then post-trains an action-conditioned predictor on less than 62 hours of unlabeled robot video from the Droid dataset, and plans zero-shot on Franka arms" | V-JEPA 2 paper | verified | 1M hours; <62 h Droid; zero-shot Franka planning by embedding-distance search. |
| "WorldVLA interleaves action and image tokens autoregressively and reports that the two objectives improve each other" | WorldVLA, arXiv 2506.21539 | verified | Autoregressive action world model; mutual-improvement claim is the paper's. |
| "Cosmos Policy is the same idea on top of the Cosmos backbone" | Cosmos Policy, arXiv 2601.16163 abstract | **verified; citation added** | Previously uncited. Paper: Cosmos-Predict2 post-trained into a robot policy in a single stage, no architectural modifications, actions and future state images encoded as latent frames. Registry entry `cosmos-policy-2026` added and cited. |
| "OccWorld ... predicts how a scene's occupancy grid evolves and produces competitive planning results without instance or map supervision" | OccWorld, arXiv 2311.16038 | verified | 3D occupancy world model for driving; planning without instance/map supervision. |
| "MuJoCo is an explicit, hand-specified state-transition model" (boundary verdict: a physics engine is a world model) | MuJoCo paper, DOI 10.1109/IROS.2012.6386109 | verified | DOI resolves to IEEE Xplore 6386109; the verdict is the article's own argument under the survey's functional cut. |
| "A 3DGS reconstruction of a real scene is a learned renderer" (boundary verdict: not a world model) | 3D Gaussian Splatting, arXiv 2308.04079 | verified | Novel-view synthesis; no action-conditioned dynamics, so it fails the functional cut as stated. |

## latent-dynamics.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| Stat: "DreamerV3 tasks 150+, one fixed hyperparameter set" | DreamerV3 abstract | verified | As in taxonomy. |
| Stat: "TD-MPC2 agent 317M, one agent, 104 tasks" | TD-MPC2 abstract | **corrected** | Conflated the 104-task benchmark with the agent's 80 tasks. Now "one agent, 80 tasks". |
| Stat: "DayDreamer 1 h, to walk from scratch" | DayDreamer abstract | verified | "in only 1 hour". |
| Stat: "horizon 15-50, imagined steps, typical" | Survey + DreamerV3 + TD-MPC2 | **corrected** | No source states a 15-50 typical range; figure traces to research/02 Part B1. Now "15, imagined steps, DreamerV3" (DreamerV3 imagination horizon H = 15; Nature version T = 16). |
| RSSM two-part state; encoder posterior; decoder during training; reward and continuation heads | Dreamer, arXiv 1912.01603 | verified | Architecture as described. |
| "The actor and the critic are trained purely on imagined latent rollouts ... No environment steps are consumed during this phase" | Dreamer paper | verified | Latent-imagination training as described. |
| "DreamerV3 was the first agent to collect diamonds in Minecraft from scratch, without human data or curricula" + intermediate-achievement chain | DreamerV3 paper | verified | Paper's headline result; the wood/tools/furnaces/iron/diamond chain is the paper's own description of the achievement tree. |
| "The paper was published in Nature in 2025" | Nature 640:647-653, DOI 10.1038/s41586-025-08744-2 | verified | "Mastering diverse control tasks through world models", published 2025-04-02. |
| Robustness techniques: symlog, two-hot reward encoding, free bits, percentile-based return normalization | DreamerV3 paper | verified | All four named in the paper. |
| DreamerV3 imagination horizon 15 steps | DreamerV3 paper | verified | H = 15 imagination rollouts (Nature version: prediction horizon T = 16); used in correction 2. |
| TD-MPC: task-oriented latent trained only for reward/value, per-step local trajectory optimization, learned terminal value | TD-MPC, arXiv 2203.04955 | verified | Method as described. |
| "TD-MPC2 scales the recipe: still no decoder anywhere ... MPPI, sampling candidate action sequences in latent space ... warm-starting the sampling from a learned policy prior" | TD-MPC2 paper | verified | Method as described. |
| "The reported result is a single 317M-parameter agent across 104 continuous-control tasks in 4 task domains" | TD-MPC2 abstract | **corrected** | The 104-task/4-domain figure describes the benchmark evaluation with a single hyperparameter set; the single 317M agent performs 80 tasks. Rewritten to the abstract's wording. |
| TD-MPC2 planning horizon 3 steps | TD-MPC2, Appendix Table 8 | verified | H = 3; used in correction 2. |
| DayDreamer: four robots, same hyperparameters | DayDreamer abstract | verified | "four robots ... same hyperparameters". |
| "In practice this caps usable imagination at roughly 15 to 50 steps" cited to the survey | Survey, DreamerV3, TD-MPC2 | **corrected** | Survey states no such range. Rewritten: "keeps usable imagination short: DreamerV3 trains its actor and critic on 15-step imagined rollouts, and TD-MPC2 plans only 3 steps ahead", cited to the two primary papers. |
| `lib/latent-imagination.ts` TYPICAL_HORIZON [15, 50] + "see research/02 Part B1" comment | Primary papers | **corrected** | Now [3, 15] with comments naming TD-MPC2 and DreamerV3; component band/aria-label/annotation updated to "published 3-15"; tests updated. |
| "The Robotic World Model work retargets latent imagination at robust robot control ... dual-autoregressive mechanism for long-horizon prediction under partial observability" | Robotic World Model, arXiv 2501.10100 | verified | Dual-autoregressive mechanism and partial-observability framing as stated. |
| "Dream-MPC ... replacing population-based MPPI with gradient-based trajectory optimization through the learned model, improving on both the policy and gradient-free MPC across 24 tasks" | Dream-MPC paper | verified | Gradient-based latent trajectory optimization; 24 tasks. |
| "Fast-WAM ... keeps world modeling as a training objective, drops future prediction at test time, and stays competitive while running over four times faster" | Fast-WAM paper | verified | Training-time-only world modeling; >4x speedup; 190 ms figure checked at the paper. |
| Honest-limits list (latent models can drift from what the observation would have pinned down; evaluation is indirect) | Survey Sec. 7.1.2 + primary papers | verified | Consistent with the survey's weak-proxy discussion; framed as the article's synthesis. |

## generative-video.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| Stat: "Cosmos 3 Nano 16B, 8B reasoner + 8B generator" | Cosmos 3 technical report | **corrected** | Report: Nano is a 16B model built on a dense 8B transformer; no 8B+8B split. Stat now "built on a dense 8B transformer". |
| Stat: "Genie 3, 24 fps, 720p, a few minutes" | DeepMind Genie 3 blog | verified | All three figures stated. |
| Stat: "IWS rollout >10 min, 15 FPS on one RTX 4090" | IWS paper, arXiv 2603.08546 | verified | >10-minute rollouts at 15 FPS on a single RTX 4090; hardware context present. |
| Stat: "RoboWorld r 0.989, Pearson vs real-robot eval" | RoboWorld paper | verified | r = 0.989, Spearman rho = 0.970 against real-robot evaluation. |
| "NVIDIA's 2025 Cosmos stack was a family: Predict ... Transfer ... Reason ... Policy ..." | Cosmos 3 technical report | **corrected** | Report never enumerates the 2025 family; "Cosmos Policy" as named is a Jan 2026 paper, not a 2025 stack member. Rewritten to the report's own "disjointed suite of models ... fragmented architecture" framing. |
| "Cosmos 3, launched at GTC Taipei in June 2026" | NVIDIA launch release | **corrected** | Release dated May 31, 2026, datelined GTC Taipei. Now "launched at GTC Taipei in late May 2026". |
| MoT architecture: per-modality encoders into a shared representation space; autoregressive subsequence for reasoning plus diffusion subsequence for generation; separate parameter sets interacting through joint attention | Cosmos 3 technical report | verified | All four architectural facts stated in the report. |
| "a single checkpoint act as a VLM, a video generator, a forward-dynamics model, an inverse-dynamics model, or a policy without architectural change" | Cosmos 3 technical report | verified | The report's three action modes plus understanding/generation roles; post-training "without architectural modifications". |
| Routing: action+image+text to video is forward dynamics; text+video to action is inverse dynamics; image+text to video+action is a policy | Cosmos 3 technical report | verified | Input-output configurations as described. |
| "Two sizes are public: Cosmos 3 Nano at 16B (an 8B reasoner and an 8B generator), aimed at a workstation, and Cosmos 3 Super at 64B for large-scale synthetic data generation" | Cosmos 3 report + launch release | **corrected** | Now "Two sizes are public at launch: Cosmos 3 Nano at 16B, built on a dense 8B transformer, and Cosmos 3 Super at 64B, built on a dense 32B transformer". "Aimed at a workstation" cut (unsupported; release says Nano runs "in fractions of a second"). Super/Nano available at launch, Edge coming soon, per the release. |
| "The original Genie learned latent actions from video-game footage and generated 2D worlds at about one frame per second" | Genie 1 paper, arXiv 2402.15391 | verified | Latent actions learned unsupervised from Internet videos (30k hours of 2D platformers); "Genie currently operates around 1FPS". |
| "Genie 2 (December 2024) moved to 3D at 360p with 10 to 20 second horizons" | Genie 2 blog (2024-12-04) + Genie 3 comparison table | verified | "Consistent worlds for up to a minute, with the majority of examples shown lasting 10-20s"; table: 360p, 10-20 s, not real time. |
| "Genie 3 (August 2025) ... navigable in real time at 24 fps and 720p, and stays consistent for a few minutes" + promptable world events + SIMA demo | Genie 3 blog | verified | All confirmed, including the SIMA agent pursuing a goal the model never sees. |
| Genie 3 limitation list (limited action space, other agents, no geographic accuracy, unreliable text, limited duration) | Genie 3 blog | verified | The blog's own published list, attributed to DeepMind. |
| "Project Genie, the consumer interface released in January 2026 for AI Ultra subscribers, caps sessions at 60 seconds per world because Genie 3 is autoregressive and dedicated compute makes longer sessions too expensive to scale" | Ars Technica (2026-01) + Google Project Genie blog (2026-01-29) | **corrected** | Cap, date, and gating verified from both sources (Google's own limitation list: "Limitations in generations to 60 seconds"). The because-clause appears in neither source and was cut. |
| GR-1: video generative pre-training then fine-tuning; CALVIN 88.9% to 94.9%, zero-shot unseen scenes 53.3% to 85.4% | GR-1 paper, arXiv 2312.13139 | verified | All four figures match. |
| GR-2: 38 million video clips, over 50 billion tokens, 97.7% average success across more than 100 tasks | GR-2 paper, arXiv 2410.06158 | verified | All three figures match. |
| IWS: interactive world simulator rollout length and frame rate | IWS paper | verified | As Stat row above. |
| RoboWorld: correlation with real-robot evaluation | RoboWorld paper | verified | As Stat row above. |
| "1X ... in June 2026 it launched a dedicated World Model Lab, led by Sam Sinha (previously a founding research scientist at Luma AI), to pre-train video foundation models on a mixture of web video, egocentric human data, simulation, teleoperated robot data, and on-policy NEO data" | 1X World Model Lab blog (2026-06-04) | verified | Date, person, and five-part data mixture as stated; NEO zero-shot generalization framed as the company's own claim. |
| "Odyssey-2 (October 2025) is a causal, autoregressive interactive video model ... a new frame every 50 ms (about 20 fps), and steerable with text as it plays" | Odyssey blog (2025-10-27) | verified | All four facts stated. |
| "Starchild-1 adding audio alongside video and Agora-1 letting four participants share one simulation" | Odyssey Starchild-1 page (2026-05-17) + Agora-1 page (2026-05-18) | verified | "Synchronized audio and video in real-time"; "up to four players ... same generated world". |

## jepa.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| V-JEPA: 2M videos, frozen backbone evaluations | V-JEPA paper, arXiv 2404.08471 | verified | 2M videos; frozen-backbone probing. |
| V-JEPA 2: "over a million hours" of video pretraining | V-JEPA 2 paper | verified | 1M hours of internet-scale video plus 1M images. |
| V-JEPA 2: 77.3 top-1 on Something-Something v2 | V-JEPA 2 paper | verified | "77.3 top-1 accuracy on Something-Something v2". |
| Stat: "AMI seed, $1.03B, March 2026 raise" | TechCrunch (2026-03-09) | **corrected** | Amount and date verified; the source never calls the round a "seed". Relabeled "AMI raise". |
| V-JEPA 2: post-trained on less than 62 hours of Droid robot video; zero-shot Franka planning | V-JEPA 2 paper | verified | <62 h Droid; zero-shot Franka arms. |
| V-JEPA 2 architecture: ~1B-parameter ViT-g encoder, mask-denoising objective, 3D-RoPE | V-JEPA 2 paper, Sec. 2 | verified | "scale the encoder architecture from 300 million to over 1 billion parameters, going from a ViT-L to a ViT-g"; "visual mask denoising objective"; "3D-RoPE ... helps stabilize training for the largest models". |
| V-JEPA 2: 39.7 recall-at-5 on Epic-Kitchens-100 action anticipation | V-JEPA 2 paper | verified | "39.7 recall-at-5 ... 44% relative improvement over the previous best model". |
| JEPA value/planning treatment (planning by embedding distance to a goal image) | V-JEPA 2 paper + jepa-value-planning source | verified | Planning mechanism as described. |
| "LeCun left Meta in November 2025 and co-founded AMI Labs" | TechCrunch (2026-03-09) + TechCrunch (2026-01-23) | **corrected** | Neither article gives the month; the March piece says "after he left Meta". Month dropped. LeCun is executive chairman, LeBrun is CEO, per the same coverage. |
| "which raised $1.03 billion at a $3.5 billion pre-money valuation in March 2026, one of the largest seed rounds on record" | TechCrunch (2026-03-09) | **corrected** | $1.03B / $3.5B pre-money / March 2026 all verified; "one of the largest seed rounds on record" appears nowhere in the source and was cut. |
| LeBrun quote: "'world models' will be the next buzzword. In six months, every company will call itself a world model to raise funding" | TechCrunch (2026-03-09) | verified | Verbatim (quote marks and tense as printed). |
| "Latent-space models like LeWorldModel exist precisely to cut the cost of full high-dimensional generation" | Survey, arXiv 2605.00080 | verified | Survey: "Latent-space models, such as LeWorldModel (Maes et al. 2026), reduce training and inference costs by focusing on predictive representations rather than full high-dimensional generation". |
| "Fast-WAM keeps world modeling as a training objective while dropping future prediction at inference entirely" | Fast-WAM paper | verified | As in latent-dynamics. |
| Disagreement representation (generative camp vs JEPA camp, named proponents both sides) | LeCun 2022 JEPA position + survey + generative papers | verified | P5-conformant: both camps named, neither flattened. |

## generative-sim.mdx

| Claim (quoted) | Source checked | Verdict | Note |
|---|---|---|---|
| Stat: "kitchen scenes 120, RoboCasa, RSS 2024" | RoboCasa, arXiv 2406.02523 | verified | "120 realistic scenes"; RSS 2024. |
| Stat: "3D objects 3,200+, 150+ categories" | RoboCasa paper | **corrected** | Same defect as the prose row below; paper says 2,500+ (2,509 in its table). Now "2,500+". |
| Stat: "tasks 100, systematic evaluation suite" | RoboCasa paper | verified | "100 diverse tasks" (25 atomic + 75 composite). |
| Stat: "RoboCasa365 2,500 kitchens, ICLR 2026" | RoboCasa365 PDF (robocasa.ai) | verified | "365 everyday tasks across 2,500 diverse kitchen environments". |
| RoboGen: propose-generate-learn cycle; skill dispatch to RL, motion planning, or trajectory optimization; minimal human supervision | RoboGen, arXiv 2311.01455 abstract | verified | All three elements in the abstract. |
| Holodeck: GPT-4 + Objaverse, spatial relational constraints with layout optimization, "office of a professor who is a fan of Star Wars", CVPR 2024 | Holodeck, arXiv 2312.09067 | verified | Example prompt verbatim; pipeline as described. |
| "It ships 120 kitchen scenes ... over 3,200 object assets across more than 150 categories, and 100 tasks, including composite tasks drafted with LLM guidance" | RoboCasa paper | **corrected** | 120 scenes, 150+ categories, 100 tasks, and LLM-guided composite tasks (25 atomic + 75 composite, GPT-4-guided) all verified; the object count is "over 2,500" (2,509 in the paper's table), not 3,200. Corrected. |
| "object meshes come partly from text-to-3D models, and environment textures come from text-to-image models" + scaling trend as synthetic demonstrations grow | RoboCasa paper | verified | "assets from text-to-3D models and environment textures from text-to-image models"; scaling trend reported. |
| "RoboCasa365 extends the same platform to 365 everyday tasks across 2,500 kitchen environments, with 600+ hours of human demonstrations and 1,600+ hours of synthetically generated demonstrations, and with explicit support for multi-task learning, foundation-model training, and lifelong-learning benchmarks" | RoboCasa365 PDF | verified | "over 600 hours of human demonstration data and over 1600 hours of synthetically generated demonstration data"; "multi-task learning, robot foundation model training, and lifelong learning". |
| "Isaac Lab Mimic generates an effectively unbounded number of synthetic demonstrations from as little as one human demonstration, with parallelized environment execution for throughput" | Isaac Lab paper, arXiv 2511.04831, Sec. 5.5 | verified | "an effectively unbounded number of synthetic demonstrations from as little as a single human demonstration"; "parallelized environment execution for data generation, substantially increasing throughput". |
| "GRS runs the loop in the opposite direction, generating solvable simulation tasks from single real-world RGB-D images" | GRS, arXiv 2410.15536 abstract | verified | RGB-D to digital twin; SAM2 + VLM pipeline; router and test suites as described. |
| "Eureka's own accounting includes reward hacking and the need for human inspection of generated rewards" | Eureka, arXiv 2310.12931 full text | **corrected** | "Reward hacking" appears nowhere in the paper (grep: 0 hits). Paper: rewards are "clean and interpretable, amenable to post-hoc human inspection and editing"; the algorithm is "compatible with human oversight to assure safety and alignment". Rewritten to that wording. (Eureka's 29 environments / 10 morphologies / 83%-of-tasks / 52% improvement figures verified at the abstract.) |
| "Holodeck rooms look like what GPT-4 thinks rooms look like; RoboCasa kitchens look like kitchen magazines" (generator-priors risk) | Article's own analysis over the two papers | verified | Framed as the article's judgment, no attribution overreach. |
| Push test: appearance is not physics (3DGS twin supplies appearance, engine supplies dynamics) | 3DGS paper + SplatSim-lineage architecture | verified | Division of labor as stated; consistent with the taxonomy boundary verdict. |
| Frontmatter citations resolve to the intended documents (all five articles, 33 registry ids) | Each fetched during this audit | verified | Titles, authors, years, venues match the live documents; `cosmos-policy-2026` added. |

## Re-verification of banked work (second worker, 2026-08-17)

The first worker's session ended before commit. A second worker re-audited
the banked changes against the primary sources before committing, per the
orchestrator's instruction to treat banked work as unverified. Every applied
correction and the added citation were re-fetched and re-checked:

1. TD-MPC2 task scope — arXiv 2310.16828 abs page: "104 online RL tasks
   spanning 4 diverse task domains ... single set of hyperparameters" vs
   "a single 317M parameter agent to perform 80 tasks". Correction stands.
2. Horizon rewrite — DreamerV3 arXiv v1 PDF hyperparameter table:
   "Imagination horizon H 15" (v2/Nature wording is "prediction horizon
   T = 16"); TD-MPC2 HTML Appendix H Table 8: "Horizon (H) 3". The survey
   (arXiv 2605.00080 full text) contains no "15-50" or typical-horizon
   range (grep: 0 hits). Correction stands.
3./4./5./6. Cosmos 3 — technical report PDF (pdftotext): "Nano is a
   16B-parameter model built upon a dense 8B-parameter transformer, and
   Super is a 64B-parameter model built upon a dense 32B-parameter
   transformer"; intro: "a disjointed suite of models: a VLM to locate
   dishware and generate an executable plan, a VLA or WAM to generate
   action sequences, and a Forward Dynamics Model or 'World Model' to
   simulate and evaluate future states. This fragmented architecture is
   suboptimal and computationally wasteful."; dual-stream joint attention
   and the three action modes confirmed in Sec. 2.3.2 / action section.
   NVIDIA newsroom release: dated May 31, 2026, datelined "NVIDIA GTC
   Taipei"; "Cosmos 3 Nano for high-quality video and action reasoning in
   fractions of a second"; "Cosmos 3 Super and Cosmos 3 Nano are available
   now, with Cosmos 3 Edge coming soon". Corrections stand.
7. Project Genie — Google's own announcement (blog.google, 2026-01-29,
   fetched this session) lists "Limitations in generations to 60 seconds"
   and states promptable events are not yet in the prototype; no
   compute-cost rationale appears there or in the Ars piece. The cut of
   the because-clause stands.
8./9. AMI Labs — TechCrunch (2026-03-09, re-fetched): "$1.03 billion at a
   $3.5 billion pre-money valuation", "after he left Meta" (no month), the
   LeBrun quote verbatim, and no "seed" label and no
   largest-seed-round superlative anywhere in the piece. Corrections stand.
10. RoboCasa — arXiv 2406.02523 HTML full text: "over 2,500 objects across
    over 150 categories" (intro), "2,509 high-quality assets spanning 153
    unique object categories" (Sec. III-C and Table I). Correction stands.
11. Eureka — arXiv 2310.12931 HTML full text: "reward hacking" occurs 0
    times; the paper says its rewards are "clean and interpretable,
    amenable to post-hoc human inspection and editing" and the algorithm
    stays "compatible with human oversight to assure safety and
    alignment". Correction stands.
- cosmos-policy-2026 registry addition — arXiv 2601.16163 abs page
  re-fetched: title and all 11 authors match the registry entry in order;
  the abstract supports "single stage of post-training ... no
  architectural modifications". Addition stands.

Spot-checks of rows the first worker marked verified (sampled toward
numbers and quoted-sounding phrases): DreamerV3 abstract (150+ tasks,
single configuration, first diamonds in Minecraft); Genie 3 blog
(24 fps / 720p / few minutes, the five-item limitation list, the SIMA
goal-blind demo); V-JEPA 2 abs (1M+ hours, 77.3 SSv2 top-1, 39.7
recall-at-5 EK-100, <62 h Droid, zero-shot Franka); DayDreamer abs
(1 hour, 4 robots, same hyperparameters); IWS abs (>10 min at 15 FPS on a
single RTX 4090); GR-1 abs (88.9→94.9 CALVIN, 53.3→85.4 zero-shot); GR-2
abs (38M clips, 50B tokens, 97.7% over 100+ tasks); Genie 1 full text
("Genie currently operates around 1FPS"; 30,000 hours of 2D platformers);
survey (the "does not qualify ... simply because it generates plausible
future images or videos" quote is verbatim; Sec. 8.1 weak action
conditioning cause "trained mainly from observation history and task
intent" is verbatim; the LeWorldModel cost sentence is verbatim). All
spot-checks passed; no correction was reverted and no new defect was
found in the banked edits.

## Notes for future audits

- `research/02-rl-sim2real-world-models.md` has now produced four confirmed
  false or unsourced figures across two audits: the two coined
  characterizations from the rl-sim2real audit, plus this audit's "15-50
  steps" imagination range (Part B1) and the TD-MPC2 "317M agent across 104
  tasks" conflation. The file is read-only working notes; the rule from the
  content-quality library stands and was load-bearing here: any phrase or
  figure attributed to a source must be found in that source, and
  research-note glosses are hypotheses, not citations.
- The TD-MPC2 abstract reports two different scopes that are easy to
  conflate: a 104-task, 4-domain benchmark evaluation with a single
  hyperparameter set, and a single 317M-parameter agent covering 80 tasks.
  Cite the 317M figure only with the 80-task scope.
- DreamerV3 exists in two versions with slightly different numbers: the
  arXiv paper (imagination horizon H = 15) and the Nature version
  (prediction horizon T = 16, published 2025-04-02, Nature 640:647-653).
  Either is citable; do not mix them in one sentence.
- The Cosmos 3 launch date is May 31, 2026 (GTC Taipei dateline, US
  release); some coverage rounds it to June 1. "Late May 2026" is the safe
  phrasing.
- NVIDIA naming collision to watch: "Cosmos Policy" (arXiv 2601.16163,
  January 2026) post-trains Cosmos-Predict2 into a robot policy; the Cosmos
  3 report (May 2026) shows a "Cosmos 3 Policy" specialization. Neither
  implies a 2025 "Cosmos Policy" stack member.
- Ars Technica's Project Genie piece is corroborated by Google's own
  announcement for the load-bearing facts; keep preferring the first-party
  blog.google announcement for any future Project Genie capability claims.
