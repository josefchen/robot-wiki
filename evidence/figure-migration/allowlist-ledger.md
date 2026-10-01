# Allowlist ledger

Every entry of `contract/figure-system-allowlist.json` at the start of the figure migration (`e4784342`, 86 entries) and the commit that removed it. The list is read from `git show <commit>:contract/figure-system-allowlist.json` for each commit that changed the file; each commit's subject, listed at the end, says how its entries went. The file ends with `"entries": []`.

Entries are grouped by the pass that owned them at the start. Two entries were removed in a commit that changed only the allowlist (`40ab2965`) and came back one commit later (`a9989baf`) without the sub-scale text rule, which the framed figure no longer broke. `6bfb9955` removed them for good when it changed the EgoScale figure itself.

## home-hubs-and-discovery (2 removed, 0 added)
- removed in f196865a | /credits/ | image:covariate-shift | outside-frame
- removed in f196865a | /credits/ | image:temporal-ensembling | outside-frame

## manipulation (28 removed, 0 added)
- removed in f196865a | /manipulation/bc-foundations/ | image:covariate-shift | outside-frame
- removed in f196865a | /manipulation/action-chunking/ | image:temporal-ensembling | outside-frame
- removed in f196865a | /manipulation/action-chunking/ | temporal_ensembling.py | hard-coded-colour+outside-frame
- removed in e2690678 | /manipulation/bc-foundations/ | Rollout trace of a policy with per-step error 5.0 percent over 120 st… | outside-frame+reserved-colour+sub-scale-text
- removed in e2690678 | /manipulation/bc-foundations/ | Rollout trace of a policy with per-step error 5.0 percent over 240 st… | outside-frame+reserved-colour+sub-scale-text
- removed in e2690678 | /manipulation/action-chunking/ | svg after Action Chunking (ACT and ALOHA) | outside-frame
- removed in e2690678 | /manipulation/action-chunking/ | svg after Action Chunking (ACT and ALOHA) #2 | outside-frame
- removed in e2690678 | /manipulation/action-chunking/ | svg after Action Chunking (ACT and ALOHA) #3 | outside-frame
- removed in e2690678 | /manipulation/action-chunking/ | svg after Action Chunking (ACT and ALOHA) #4 | outside-frame
- removed in e2690678 | /manipulation/action-chunking/ | svg after Action Chunking (ACT and ALOHA) #5 | outside-frame
- removed in e2690678 | /manipulation/action-chunking/ | svg after Action Chunking (ACT and ALOHA) #6 | outside-frame
- removed in e2690678 | /manipulation/action-chunking/ | Line chart of task success rate against chunk size k. Success rises t… | outside-frame+reserved-colour+sub-scale-text
- removed in e2690678 | /manipulation/action-chunking/ | Toy normalized throughput scores against added inference delay, not m… | outside-frame+reserved-colour+sub-scale-text
- removed in e2690678 | /manipulation/action-chunking/ | Toy normalized throughput scores against added inference delay, not m… | outside-frame+reserved-colour+sub-scale-text
- removed in e2690678 | /manipulation/realtime-execution/ | Control-loop timeline at 3.0B parameters | outside-frame+reserved-colour+sub-scale-text
- removed in e2690678 | /manipulation/realtime-execution/ | Control-loop timeline at 1.1B parameters | outside-frame+reserved-colour+sub-scale-text
- removed in e2690678 | /manipulation/realtime-execution/ | Illustrative velocity trace for synchronous execution at 0 millisecon… | outside-frame+reserved-colour+sub-scale-text
- removed in 4f721669 | /manipulation/diffusion-policy/ | Receding horizon rolling plan over 32 control steps. 4 chunks, each p… | outside-frame+reserved-colour+sub-scale-text
- removed in 4f721669 | /manipulation/vla-models/ | Continuous action chunk: 7 dimensions over 16 control steps. The mark… | outside-frame+reserved-colour+sub-scale-text
- removed in 4f721669 | /manipulation/pi-line/ | 2D action-space view with the learned vector field at mid-transport. … | outside-frame+reserved-colour+sub-scale-text
- removed in 4f721669 | /manipulation/pi-line/ | Timeline of dated Physical Intelligence sources from Oct 2024 to Apr … | outside-frame+reserved-colour+sub-scale-text
- removed in 4f721669 | /manipulation/generalist-policies/ | Selected generalist robot policy records. Highlighted nodes have a re… | outside-frame+reserved-colour+sub-scale-text
- removed in 4f721669 | /manipulation/comparison-matrix/ | div after Comparison Matrix | outside-frame+reserved-colour+sub-scale-text
- removed in 08d25ab3 | /manipulation/hierarchical/ | Schematic timescale lanes for π0.5 by Physical Intelligence. Four dra… | outside-frame+reserved-colour+sub-scale-text
- removed in 08d25ab3 | /manipulation/rl-finetuning/ | Value-function trace over a 40 second espresso episode. Playhead at 0… | outside-frame+reserved-colour+sub-scale-text
- removed in 08d25ab3 | /manipulation/rl-finetuning/ | Successful trials out of 30 for five methods across four manipulation… | outside-frame+reserved-colour+sub-scale-text
- removed in 08d25ab3 | /manipulation/cross-embodiment/ | Action-space slot strip for 7-DoF arm under the Padded shared vector … | outside-frame+reserved-colour+sub-scale-text
- removed in 08d25ab3 | /manipulation/knowledge-insulation/ | Mixture-of-Transformers diagram. Forward pass at depth 8 of 8. Tokens… | outside-frame+reserved-colour+sub-scale-text

## data-hardware (9 removed, 0 added)
- removed in e2175cb7 | /data-hardware/evaluation-crisis/ | Line chart of episode success against episode length at 95.0 percent … | outside-frame+reserved-colour+sub-scale-text
- removed in e2175cb7 | /data-hardware/evaluation-crisis/ | Line chart of episode success against episode length at 95.0 percent … | outside-frame+reserved-colour+sub-scale-text
- removed in c03735a4 | /data-hardware/industrial-deployment/ | Time breakdown per elapsed hour: 94.8% productive cycles, 0.2% jam cl… | outside-frame+reserved-colour+sub-scale-text
- removed in 76c33ddc | /data-hardware/data-bottleneck/ | scene:farm-throughput | caption-words
- removed in 76c33ddc | /data-hardware/data-bottleneck/ | Demonstration hours against pretraining tokens, 15-rig hypothetical f… | outside-frame+reserved-colour+sub-scale-text
- removed in 76c33ddc | /data-hardware/data-bottleneck/ | Demonstration hours against pretraining tokens, 10-rig hypothetical f… | outside-frame+reserved-colour+sub-scale-text
- removed in 76c33ddc | /data-hardware/datasets/ | div after The comparison table | outside-frame+reserved-colour+sub-scale-text
- removed in 76c33ddc | /data-hardware/hardware-taxonomy/ | div after The buyer's guide | outside-frame+reserved-colour+sub-scale-text
- removed in 76c33ddc | /data-hardware/teleop-rigs/ | div after The comparison matrix | outside-frame+sub-scale-text

## frontier (10 removed, 2 added)
- removed in e2175cb7 | /frontier/reliability-gap/ | Line chart of episode success against episode length at 95.0 percent … | outside-frame+reserved-colour+sub-scale-text
- removed in 8d1a54bd | /frontier/reliability-gap/ | div after What is actually deployed | outside-frame+reserved-colour+sub-scale-text
- removed in 8d1a54bd | /frontier/bear-case/ | div after The Bear Case | outside-frame+reserved-colour+sub-scale-text
- removed in 8d1a54bd | /frontier/safety-and-assurance/ | Workcell with a robot at the left wall and an operator 1.60 m away, u… | outside-frame+reserved-colour+sub-scale-text
- removed in 40ab2965 | /frontier/generalization/ | EgoScale scaling law: validation loss and task completion against pre… | outside-frame+reserved-colour+sub-scale-text
- removed in 40ab2965 | /frontier/generalization/ | EgoScale scaling law: validation loss and task completion against pre… | outside-frame+reserved-colour+sub-scale-text
- added in a9989baf | /frontier/generalization/ | EgoScale scaling law: validation loss and task completion against pre… | outside-frame+reserved-colour
- added in a9989baf | /frontier/generalization/ | EgoScale scaling law: validation loss and task completion against pre… | outside-frame+reserved-colour
- removed in 6bfb9955 | /frontier/dexterity/ | div after Dexterity | outside-frame+reserved-colour+sub-scale-text
- removed in 6bfb9955 | /frontier/generalization/ | EgoScale scaling law: validation loss and task completion against pre… | outside-frame+reserved-colour
- removed in 6bfb9955 | /frontier/generalization/ | EgoScale scaling law: validation loss and task completion against pre… | outside-frame+reserved-colour
- removed in 6bfb9955 | /frontier/competing-theses/ | div after The six theses | outside-frame+reserved-colour+sub-scale-text

## classical (22 removed, 0 added)
- removed in ee6202d1 | /classical/kinematics/ | Planar three-link arm. Base angle 110 degrees, elbow -45 degrees, wri… | outside-frame+reserved-colour+sub-scale-text
- removed in ee6202d1 | /classical/kinematics/ | svg after Denavit-Hartenberg parameters | outside-frame
- removed in ee6202d1 | /classical/kinematics/ | svg after Denavit-Hartenberg parameters #2 | outside-frame
- removed in ee6202d1 | /classical/motion-planning/ | RRT exploration of a 2D planning scene with 5 obstacles between a sta… | outside-frame+reserved-colour+sub-scale-text
- removed in ee6202d1 | /classical/motion-planning/ | svg after Optimality: RRT* | outside-frame
- removed in ee6202d1 | /classical/control/ | Inverted pendulum with PID control. Pole angle +12.0 degrees from upr… | outside-frame+reserved-colour+sub-scale-text
- removed in ee6202d1 | /classical/control/ | Inverted pendulum with PID control. Pole angle +12.0 degrees from upr… | outside-frame+reserved-colour+sub-scale-text
- removed in ee6202d1 | /classical/control/ | Contact force over the approach. Peak 23.7 newtons, outcome task succ… | outside-frame+reserved-colour+sub-scale-text
- removed in f2f0a840 | /classical/grasp-planning/ | Square object held by 3 frictional point contacts; each contact shows… | outside-frame+reserved-colour+sub-scale-text
- removed in f2f0a840 | /classical/perception/ | Authored input magnitudes and root-sum-of-squares total against the m… | outside-frame+reserved-colour+sub-scale-text
- removed in f2f0a840 | /classical/perception/ | svg after 6-DoF pose estimation, and how to read a claim about it | outside-frame
- removed in f2f0a840 | /classical/perception/ | svg after 6-DoF pose estimation, and how to read a claim about it #2 | outside-frame
- removed in f2f0a840 | /classical/perception/ | svg after 6-DoF pose estimation, and how to read a claim about it #3 | outside-frame
- removed in f2f0a840 | /classical/perception/ | svg after 6-DoF pose estimation, and how to read a claim about it #4 | outside-frame
- removed in f2f0a840 | /classical/perception/ | svg after 6-DoF pose estimation, and how to read a claim about it #5 | outside-frame
- removed in f2f0a840 | /classical/perception/ | svg after 6-DoF pose estimation, and how to read a claim about it #6 | outside-frame
- removed in f2f0a840 | /classical/perception/ | svg after 6-DoF pose estimation, and how to read a claim about it #7 | outside-frame
- removed in f2f0a840 | /classical/perception/ | svg after 6-DoF pose estimation, and how to read a claim about it #8 | outside-frame
- removed in f2f0a840 | /classical/perception/ | svg after 6-DoF pose estimation, and how to read a claim about it #9 | outside-frame
- removed in f2f0a840 | /classical/perception/ | svg after 6-DoF pose estimation, and how to read a claim about it #10 | outside-frame
- removed in f2f0a840 | /classical/scene-representation/ | Plan view of the scene as an occupancy grid: free, occupied and unkno… | outside-frame+reserved-colour+sub-scale-text
- removed in b6aef30e | /classical/state-estimation/ | Cinematic clip: One Kalman filter, a whole run | outside-frame+sub-scale-text

## rl-sim2real (11 removed, 0 added)
- removed in 34d6c43c | /rl-sim2real/rl-for-robotics/ | Modelled wall-clock time for 158M environment steps under constant-ra… | outside-frame+reserved-colour+sub-scale-text
- removed in 34d6c43c | /rl-sim2real/why-rl-locomotion/ | Locomotion contact geometry. Quadruped stance: four near-point foot-g… | outside-frame+reserved-colour+sub-scale-text
- removed in 34d6c43c | /rl-sim2real/parallel-sim-rl/ | Wall-clock training time against parallel environments, 4,096 envs | outside-frame+reserved-colour+sub-scale-text
- removed in 34d6c43c | /rl-sim2real/sim2real-transfer/ | Task success against ground friction. Point policy 97% vs DR policy 7… | outside-frame+reserved-colour+sub-scale-text
- removed in 34d6c43c | /rl-sim2real/sim2real-transfer/ | Task success against ground friction. Point policy 97% vs DR policy 5… | outside-frame+reserved-colour+sub-scale-text
- removed in 34d6c43c | /rl-sim2real/sim2real-transfer/ | Teacher-student distillation at 15 percent degradation. Top panel: th… | hard-coded-colour+outside-frame+reserved-colour+sub-scale-text
- removed in 34d6c43c | /rl-sim2real/legged-locomotion/ | Footfall timing for the Walk gait, duty factor 0.75, phase 0% | outside-frame+reserved-colour+sub-scale-text
- removed in 3f0bfbc7 | /rl-sim2real/humanoid-wbc/ | Whole-body control stack for the Motion-tracking RL decomposition, re… | outside-frame+reserved-colour+sub-scale-text
- removed in 3f0bfbc7 | /rl-sim2real/reward-design-mpc/ | Rollout preview: balanced gait. This toy selects a balanced trot when… | outside-frame+reserved-colour+sub-scale-text
- removed in 3f0bfbc7 | /rl-sim2real/reward-design-mpc/ | div after Eureka: the reward as code under evolution | outside-frame+reserved-colour+sub-scale-text
- removed in 3f0bfbc7 | /rl-sim2real/reward-design-mpc/ | Base-height deviation after a lateral push. MPC: recovers. RL policy:… | outside-frame+reserved-colour+sub-scale-text

## world-models (5 removed, 0 added)
- removed in 13f3786b | /world-models/latent-dynamics/ | Imagined rollout in latent space over 15 steps, peeling away from the… | outside-frame+reserved-colour+sub-scale-text
- removed in 13f3786b | /world-models/generative-video/ | Shared initial frame: a block centered on a table with a gripper abov… | outside-frame+reserved-colour+sub-scale-text
- removed in 13f3786b | /world-models/generative-sim/ | Three-layer scene. Appearance layer on, physics proxy off, simulation… | outside-frame+reserved-colour+sub-scale-text
- removed in 8192e0a9 | /world-models/taxonomy/ | Latent-dynamics panel art: latent cells, reward scalar, fuzzy reconst… | outside-frame+reserved-colour+sub-scale-text
- removed in 8192e0a9 | /world-models/jepa/ | Latent space planning view. The current latent is at distance 0.813 f… | outside-frame+reserved-colour+sub-scale-text

## adjacent (1 removed, 0 added)
- removed in 42c62cea | /adjacent/drones/ | Sense-and-avoid timeline at the maximum speed of 19.21 m/s. Obstacle … | outside-frame+reserved-colour+sub-scale-text

## Commits that changed the allowlist
- f196865a: Draw the original schematics on the graphite stage and keep code listings out of figures
- e2175cb7: Frame the episode-success calculator shared by evaluation-crisis and reliability-gap
- ee6202d1: Move the classical kinematics, planning and control figures onto the figure frame
- e2690678: Move the manipulation chunking, behaviour-cloning and realtime figures onto the figure frame
- 34d6c43c: Move the rl-sim2real labs onto the figure frame and drop the charts that repeat their scenes
- 13f3786b: Merge the world-models scenes into their labs on the graphite stage
- c03735a4: Keep one data-hardware episode-success chart and frame the deployment economics calculator
- 8d1a54bd: Move the frontier deployment, watchlist and safety figures onto the figure frame
- 42c62cea: Move the adjacent drones latency timeline onto the figure frame
- f2f0a840: Move the classical grasp, perception and scene-representation labs onto the figure frame
- b6aef30e: Re-render the classical state-estimation Kalman clip from the token theme
- 3f0bfbc7: Move the rl-sim2real whole-body control and reward-design figures onto the figure frame
- 4f721669: Move the manipulation policy-family figures onto the figure frame and merge two repeated scenes
- 08d25ab3: Move the manipulation hierarchy, fine-tuning, embodiment and insulation figures onto the figure frame
- 76c33ddc: Keep one data-hardware scale chart and turn the dataset, hardware and teleop guides into prose tables
- 40ab2965: Drop the two EgoScale allowlist entries the framed figure no longer needs
- a9989baf: Keep the EgoScale allowlist entries without the sub-scale text rule
- 8192e0a9: Redraw the world-models taxonomy disambiguator and JEPA planning lab on the graphite figure frame
- 6bfb9955: Keep one frontier EgoScale chart and frame the dexterity and competing-theses tables
