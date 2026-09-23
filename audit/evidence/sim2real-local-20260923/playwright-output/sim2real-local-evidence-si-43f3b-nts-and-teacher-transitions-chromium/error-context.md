# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sim2real-local-evidence.spec.ts >> sim2real raw mounted evidence covers both friction mounts and teacher transitions
- Location: tests/e2e/sim2real-local-evidence.spec.ts:26:1

# Error details

```
Error: expect(received).not.toEqual(expected) // deep equality

Expected: not null

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - link "Robot Wiki" [ref=e7] [cursor=pointer]:
          - /url: /
        - search "Site search" [ref=e8]:
          - generic [ref=e9]: Search
          - generic [ref=e10]:
            - searchbox "Search" [ref=e11]
            - button "Search the wiki" [ref=e12]
        - navigation "Robot Wiki taxonomy" [ref=e15]:
          - list [ref=e16]:
            - listitem [ref=e17]:
              - button "Manipulation & Learned Policies" [ref=e18]
            - listitem [ref=e22]:
              - button "RL, Sim-to-Real & Locomotion" [expanded] [ref=e23]
              - list [ref=e27]:
                - listitem [ref=e28]:
                  - link "Domain overview" [ref=e29] [cursor=pointer]:
                    - /url: /rl-sim2real/
                - listitem [ref=e30]:
                  - link "RL for Robotics" [ref=e31] [cursor=pointer]:
                    - /url: /rl-sim2real/rl-for-robotics/
                - listitem [ref=e32]:
                  - link "Why RL Won Locomotion but Not Manipulation" [ref=e33] [cursor=pointer]:
                    - /url: /rl-sim2real/why-rl-locomotion/
                - listitem [ref=e34]:
                  - link "Massively Parallel Sim RL" [ref=e35] [cursor=pointer]:
                    - /url: /rl-sim2real/parallel-sim-rl/
                - listitem [ref=e36]:
                  - link "Sim-to-Real Transfer" [ref=e37] [cursor=pointer]:
                    - /url: /rl-sim2real/sim2real-transfer/
                - listitem [ref=e38]:
                  - link "Legged Locomotion Lineage" [ref=e39] [cursor=pointer]:
                    - /url: /rl-sim2real/legged-locomotion/
                - listitem [ref=e40]:
                  - link "Humanoid Whole-Body Control" [ref=e41] [cursor=pointer]:
                    - /url: /rl-sim2real/humanoid-wbc/
                - listitem [ref=e42]:
                  - link "Reward Design and the MPC Debate" [ref=e43] [cursor=pointer]:
                    - /url: /rl-sim2real/reward-design-mpc/
            - listitem [ref=e44]:
              - button "World Models" [ref=e45]
            - listitem [ref=e49]:
              - button "Data, Hardware & Evaluation" [ref=e50]
            - listitem [ref=e54]:
              - button "Classical Foundations" [ref=e55]
            - listitem [ref=e59]:
              - button "Frontier & Open Problems" [ref=e60]
            - listitem [ref=e64]:
              - button "Adjacent Domains" [ref=e65]
          - list [ref=e69]:
            - listitem [ref=e70]:
              - link "A-Z Index" [ref=e71] [cursor=pointer]:
                - /url: /a-z/
            - listitem [ref=e72]:
              - link "Market Map" [ref=e73] [cursor=pointer]:
                - /url: /market-map/
            - listitem [ref=e74]:
              - link "Playground" [ref=e75] [cursor=pointer]:
                - /url: /playground/
            - listitem [ref=e76]:
              - link "Glossary" [ref=e77] [cursor=pointer]:
                - /url: /glossary/
            - listitem [ref=e78]:
              - link "Credits" [ref=e79] [cursor=pointer]:
                - /url: /credits/
    - generic [ref=e80]:
      - main [ref=e81]:
        - article [ref=e82]:
          - navigation "Breadcrumb" [ref=e83]:
            - list [ref=e84]:
              - listitem [ref=e85]:
                - link "Home" [ref=e86] [cursor=pointer]:
                  - /url: /
                - generic [ref=e87]: /
              - listitem [ref=e88]:
                - link "RL, Sim-to-Real & Locomotion" [ref=e89] [cursor=pointer]:
                  - /url: /rl-sim2real/
                - generic [ref=e90]: /
              - listitem [ref=e91]:
                - generic [ref=e92]: Sim-to-Real Transfer
          - generic [ref=e93]:
            - heading "Sim-to-Real Transfer" [level=1] [ref=e94]
            - paragraph [ref=e95]: Domain randomization, teacher-student distillation, system identification, and real-to-sim correction.
            - generic [ref=e96]:
              - generic [ref=e97]:
                - term [ref=e98]: Last reviewed
                - definition [ref=e99]:
                  - time [ref=e100]: 17 August 2026
              - generic [ref=e101]:
                - term [ref=e102]: Reading time
                - definition [ref=e103]: 14 min
              - generic [ref=e104]:
                - term [ref=e105]: Citations
                - definition [ref=e106]: "12"
          - generic [ref=e107]:
            - paragraph [ref=e108]:
              - text: The
              - link "previous module" [ref=e109] [cursor=pointer]:
                - /url: /rl-sim2real/parallel-sim-rl
              - text: "ended with a policy that walks after minutes of GPU training. That policy is useless as trained: it has only ever seen one simulator, with one set of contact parameters, one actuator model, one rendering stack. The real robot differs from all of them in ways nobody can fully enumerate. Closing that difference is sim-to-real transfer, and it is where most of the engineering lives. The RL algorithm is usually the least interesting part of a successful sim-to-real system."
            - paragraph [ref=e110]:
              - text: Four method families do the work.
              - link "Domain randomization" [ref=e112] [cursor=pointer]:
                - /url: /glossary/#domain-randomization
              - text: trains over a distribution of simulators so the real world reads as one more sample.
              - link "Teacher-student distillation" [ref=e114] [cursor=pointer]:
                - /url: /glossary/#teacher-student-distillation
              - text: trains on privileged simulator state, then compresses that knowledge into a policy that sees only what the robot sees.
              - link "System identification" [ref=e116] [cursor=pointer]:
                - /url: /glossary/#system-identification
              - text: measures the dynamics gap and corrects the model directly. Real-to-sim reconstruction rebuilds the deployment scene inside the simulator so the visual gap shrinks to rendering error. The 2026 reality-gap survey organizes the field into nearly these same buckets, adding sim-real co-training and state/action abstraction as cross-cutting levers
              - generic [ref=e117]:
                - generic [ref=e119]:
                  - link "Aljalbout 2025" [ref=e120] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2510.20808
                  - 'link "Jump to the full reference for The Reality Gap in Robotics: Challenges, Solutions, and Best Practices" [ref=e121] [cursor=pointer]':
                    - /url: "#ref-reality-gap-survey-2026"
                    - generic [ref=e122]: ↓
                - text: .
            - paragraph [ref=e123]: The figure below is a deterministic toy, not a learned policy or a measured robot benchmark. Drag the selected friction to compare the two authored curves. Widening the half-width lowers the plateau because that relationship is built into this model, not because the cited papers establish a universal tradeoff.
            - generic [ref=e124]:
              - generic [ref=e125]:
                - generic [ref=e126]:
                  - generic [ref=e127]:
                    - text: Real robot mu
                    - generic [ref=e128]: "1.50"
                  - slider "Real robot friction, currently 1.50" [active] [ref=e129]: "150"
                - generic [ref=e130]:
                  - generic [ref=e131]:
                    - text: DR half-width
                    - generic [ref=e132]: +/- 0.35
                  - slider "Randomization half-width, currently plus or minus 0.35" [ref=e133]: "35"
                - button "Reset" [ref=e134]
              - generic [ref=e135]:
                - generic [ref=e136]: "real mu: 1.50"
                - generic [ref=e137]: "point policy: 0%"
                - generic [ref=e138]: "DR policy: 0%"
                - generic [ref=e139]: "edge: DR +0 pts"
              - img "Task success against ground friction. Point policy 0% vs DR policy 0% at mu 1.50." [ref=e140]:
                - generic [ref=e141]: task success
                - generic [ref=e142]: 0%
                - generic [ref=e144]: 25%
                - generic [ref=e146]: 50%
                - generic [ref=e148]: 75%
                - generic [ref=e150]: 100%
                - generic [ref=e152]: "0.20"
                - generic [ref=e154]: "0.50"
                - generic [ref=e156]: "0.80"
                - generic [ref=e158]: "1.10"
                - generic [ref=e160]: "1.50"
                - generic [ref=e162]: ground friction coefficient mu
                - generic [ref=e163]: training distribution
                - generic [ref=e168]: point peak 97%
                - generic [ref=e169]: DR plateau 74%
                - generic [ref=e170]: real robot
              - generic [ref=e176]:
                - generic [ref=e177]: trained at mu = 0.80 only
                - generic [ref=e179]: trained over uniform mu in [0.45, 1.15]
              - paragraph [ref=e181]:
                - generic [ref=e182]: "real mu 1.50:"
                - generic [ref=e183]: point 0%
                - text: vs
                - generic [ref=e184]: DR 0%
              - paragraph [ref=e185]: In this authored toy, the DR curve is higher at the selected friction. This can happen inside or outside the shaded range. All values and the falling DR peak are local assumptions. Reset restores this panel’s initial friction and half-width; moving a control samples or redraws formulas, not a trained policy.
              - generic [ref=e186]:
                - paragraph [ref=e187]: Authored toy, not measured robot data. At selected friction 1.50, the point curve is 0% and the DR curve is 0%. The assumed DR half-width is 0.35 and its plateau is 74%. Its height follows 0.93 minus 0.55 times the half-width; the point Gaussian has center 0.80, peak 0.97 and width 0.09, and the DR tails have width 0.10. Dashed edges mark an assumed range, not a confidence interval. Reset restores this panel to friction 0.80 and half-width 0.35. Selecting friction samples the formulas; no training or adaptation runs.
                - group [ref=e188]:
                  - generic "Sampled task success against ground friction" [ref=e189] [cursor=pointer]
            - generic [ref=e190]:
              - generic [ref=e191]:
                - generic [ref=e192]: CPU API
                - generic [ref=e193]: DR parameter writes
                - generic [ref=e194]: "Isaac Lab v1: mass and friction; runtime changes supported"
              - generic [ref=e195]:
                - generic [ref=e196]: < 1 s
                - generic [ref=e197]: RMA reported adaptation
                - generic [ref=e198]: "A1: latent ~10 Hz; base policy 100 Hz"
              - generic [ref=e199]:
                - generic [ref=e200]:
                  - generic [ref=e201]: 86.25%
                  - generic [ref=e202]: SplatSim zero-shot (UR5)
                  - generic [ref=e203]: vs 97.5% real-data; 4 tasks, 40 trials/task
                - generic [ref=e205]:
                  - link "Qureshi 2024" [ref=e206] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2409.10161
                  - 'link "Jump to the full reference for SplatSim: Zero-Shot Sim2Real Transfer of RGB Manipulation Policies Using Gaussian Splatting" [ref=e207] [cursor=pointer]':
                    - /url: "#ref-splatsim-2024"
                    - generic [ref=e208]: ↓
              - generic [ref=e209]:
                - generic [ref=e210]: delta action
                - generic [ref=e211]: ASAP correction
                - generic [ref=e212]: learned residual, sim to real to sim
            - 'heading "Domain randomization: train on a distribution of simulators" [level=2] [ref=e213]':
              - 'link "Domain randomization: train on a distribution of simulators" [ref=e214] [cursor=pointer]':
                - /url: "#domain-randomization-train-on-a-distribution-of-simulators"
              - 'button "Copy link to this section, Domain randomization: train on a distribution of simulators" [ref=e216] [cursor=pointer]'
            - paragraph [ref=e219]:
              - text: These two papers address different parts of transfer. Tobin and colleagues randomized textures, lighting and camera pose for tabletop object localization. They summarize real-world localization accuracy as around 1.5 cm, evaluated on 480 webcam images of eight geometric objects in object-only, distractor and partial-occlusion conditions. The paper reports the best network after a small hyperparameter search; the approximate 1.5 cm summary is not a bound for every object or condition. Most experiments used ImageNet initialization, but an ablation found that random initialization could achieve nearly the same transfer performance with enough simulated training data. The detector was also used with a motion planner on a Fetch robot
              - generic [ref=e220]:
                - generic [ref=e222]:
                  - link "Tobin 2017" [ref=e223] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/1703.06907
                  - link "Jump to the full reference for Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World" [ref=e224] [cursor=pointer]:
                    - /url: "#ref-tobin-2017"
                    - generic [ref=e225]: ↓
                - text: .
              - text: Peng and colleagues randomized link mass, joint damping, puck mass/friction/damping, table height, controller gains, action timing and observation noise. A recurrent policy trained only in simulation transferred to a seven-DoF Fetch arm pushing a puck to a target. Real evaluation used motion capture for puck position, 200 control steps per episode, and success within 7 cm of the target at the end of the episode; target and initial puck positions were randomized within a 30 cm by 30 cm area. The authors report substantial simulated-versus-real joint-trajectory mismatch after limited calibration,
              - generic [ref=e226]:
                - text: not an absence of calibration
                - generic [ref=e227]:
                  - generic [ref=e229]:
                    - link "Peng 2018" [ref=e230] [cursor=pointer]:
                      - /url: https://arxiv.org/abs/1710.06537
                    - link "Jump to the full reference for Sim-to-Real Transfer of Robotic Control with Dynamics Randomization" [ref=e231] [cursor=pointer]:
                      - /url: "#ref-peng-2018"
                      - generic [ref=e232]: ↓
                  - text: .
              - text: With enough variability in the simulator, the real world may appear to the model as just another variation, as Tobin's abstract puts it.
            - paragraph [ref=e233]:
              - text: OpenAI's Rubik's-cube system added the
              - link "curriculum" [ref=e235] [cursor=pointer]:
                - /url: /glossary/#curriculum-learning
              - text: "version: automatic domain randomization widens the randomization range as the agent succeeds,"
              - generic [ref=e236]:
                - text: so the distribution grows with the policy's competence
                - generic [ref=e237]:
                  - generic [ref=e239]:
                    - link "OpenAI 2019" [ref=e240] [cursor=pointer]:
                      - /url: https://arxiv.org/abs/1910.07113
                    - link "Jump to the full reference for Solving Rubik's Cube with a Robot Hand" [ref=e241] [cursor=pointer]:
                      - /url: "#ref-openai-rubiks-cube-2019"
                      - generic [ref=e242]: ↓
                  - text: .
              - text: Isaac Lab ships ADR as a configurable curriculum with reference configs in its dexterous-manipulation examples
              - generic [ref=e243]:
                - generic [ref=e245]:
                  - link "NVIDIA 2025" [ref=e246] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2511.04831
                  - 'link "Jump to the full reference for Isaac Lab: A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning" [ref=e247] [cursor=pointer]':
                    - /url: "#ref-isaac-lab-2025"
                    - generic [ref=e248]: ↓
                - text: .
            - paragraph [ref=e249]:
              - text: "Two details rarely make it into the textbook version. First, the plumbing: in the 2025 Isaac Lab v1 paper, simulation state is GPU-resident but mass, friction, contact offsets, and joint armature are modified through PhysX CPU APIs. Most other physics parameters can be randomized at runtime, while mesh scale and collider type can change only before simulation starts. CPU parameter writes do not mean randomization is restricted to episode resetsSource:"
              - generic [ref=e250]:
                - generic [ref=e252]:
                  - link "NVIDIA 2025" [ref=e253] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2511.04831
                  - 'link "Jump to the full reference for Isaac Lab: A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning" [ref=e254] [cursor=pointer]':
                    - /url: "#ref-isaac-lab-2025"
                    - generic [ref=e255]: ↓
                - text: .
              - text: "Second, the objective: Peng and colleagues maximize expected return over a distribution of dynamics models"
              - generic [ref=e256]:
                - text: and evaluate randomization ablations on their Fetch pushing task
                - generic [ref=e257]:
                  - generic [ref=e259]:
                    - link "Peng 2018" [ref=e260] [cursor=pointer]:
                      - /url: https://arxiv.org/abs/1710.06537
                    - link "Jump to the full reference for Sim-to-Real Transfer of Robotic Control with Dynamics Randomization" [ref=e261] [cursor=pointer]:
                      - /url: "#ref-peng-2018"
                      - generic [ref=e262]: ↓
                  - text: .
              - text: The friction chart below instead imposes its peak-versus-width relation by construction; it is not a measured performance frontier.
            - paragraph [ref=e263]: The figure draws a point-trained-policy toy curve and a distribution-trained-policy toy curve. No policy is trained here. The shaded interval marks the assumed training range, not uncertainty or a confidence interval.
            - note "How to read this chart" [ref=e264]:
              - paragraph [ref=e265]: How to read this chart
              - paragraph [ref=e267]:
                - text: Both curves and every plotted success value are authored assumptions, not paper measurements. The point curve is a Gaussian centered at friction 0.80, with peak 0.97 and width 0.09. The DR curve has height 0.93 minus 0.55 times the selected half-width, stays flat inside that range, and has Gaussian tails of width 0.10. The ordinary panel starts at half-width 0.35; the prediction panel starts at 0.65. Reset restores each panel’s own initial friction and half-width. Changing friction selects a position on fixed formulas; changing half-width redraws the DR formula.
                - generic [ref=e268]:
                  - text: Tobin and Peng support the visual and dynamics randomization framing, not these constants or a universal curve shape
                  - generic [ref=e270]:
                    - link "Tobin 2017" [ref=e271] [cursor=pointer]:
                      - /url: https://arxiv.org/abs/1703.06907
                    - link "Jump to the full reference for Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World" [ref=e272] [cursor=pointer]:
                      - /url: "#ref-tobin-2017"
                      - generic [ref=e273]: ↓
                  - generic [ref=e274]:
                    - generic [ref=e276]:
                      - link "Peng 2018" [ref=e277] [cursor=pointer]:
                        - /url: https://arxiv.org/abs/1710.06537
                      - link "Jump to the full reference for Sim-to-Real Transfer of Robotic Control with Dynamics Randomization" [ref=e278] [cursor=pointer]:
                        - /url: "#ref-peng-2018"
                        - generic [ref=e279]: ↓
                    - text: .
            - region [ref=e280]:
              - paragraph [ref=e281]: Prediction
              - group "In this authored toy, what happens to the DR plateau when its half-width increases?" [ref=e282]:
                - generic [ref=e284]:
                  - generic [ref=e285] [cursor=pointer]:
                    - radio "The plateau widens and its peak falls because the formula makes it do so" [ref=e286]
                    - generic [ref=e287]: The plateau widens and its peak falls because the formula makes it do so
                  - generic [ref=e288] [cursor=pointer]:
                    - radio "The plateau widens and its peak rises as the half-width increases" [ref=e289]
                    - generic [ref=e290]: The plateau widens and its peak rises as the half-width increases
                  - generic [ref=e291] [cursor=pointer]:
                    - radio "The plateau widens but its peak stays unchanged as half-width increases" [ref=e292]
                    - generic [ref=e293]: The plateau widens but its peak stays unchanged as half-width increases
              - group [ref=e294]:
                - generic "Read the reasoning" [ref=e295] [cursor=pointer]
            - 'heading "Teacher-student distillation: privilege in, proprioception out" [level=2] [ref=e296]':
              - 'link "Teacher-student distillation: privilege in, proprioception out" [ref=e297] [cursor=pointer]':
                - /url: "#teacher-student-distillation-privilege-in-proprioception-out"
              - 'button "Copy link to this section, Teacher-student distillation: privilege in, proprioception out" [ref=e299] [cursor=pointer]'
            - paragraph [ref=e302]:
              - text: "Domain randomization still asks the policy to act on what the robot can sense. The teacher-student pattern separates those problems. Phase one trains a teacher with privileged, simulator-only observations: terrain geometry under the feet, friction coefficients, applied disturbances. Phase two trains a student that sees only deployable sensing, usually a short history of"
              - link "proprioception" [ref=e304] [cursor=pointer]:
                - /url: /glossary/#proprioception
              - text: ", to imitate the teacher's actions."
            - paragraph [ref=e305]:
              - text: Lee and colleagues trained a privileged RL teacher with simulator-only terrain and contact information, then distilled its actions and latent features into a temporal convolutional network student. The deployed student uses two seconds of proprioceptive history from joint encoders and an IMU, together with the command and current state; it does not consume an external terrain map. Training used rigid, procedurally generated terrain, while ANYmal-B and ANYmal-C deployments included mud, snow, rubble, and vegetation. Robots of the same generation used the same controller across those environments without environment-specific tuning
              - generic [ref=e306]:
                - generic [ref=e308]:
                  - link "Lee 2020" [ref=e309] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2010.11251
                  - link "Jump to the full reference for Learning Quadrupedal Locomotion over Challenging Terrain" [ref=e310] [cursor=pointer]:
                    - /url: "#ref-lee-2020"
                    - generic [ref=e311]: ↓
                - text: .
            - paragraph [ref=e312]:
              - text: "RMA uses a different two-stage construction: a base policy and an environment-factor encoder are trained jointly with RL, then an adaptation module is trained by supervised regression on simulator state-action histories to predict the latent extrinsics. At deployment the base policy combines the current state, previous action and estimated extrinsics to predict desired joint positions. The adaptation module uses 50 state-action steps (0.5 seconds of history); on the tested Unitree A1 setup it updates extrinsics asynchronously at about 10 Hz, while the base policy runs at 100 Hz using the latest estimate. These are inference processes, not online gradient updates. The paper reports adaptation in fractions of a second and deployment without real-world fine-tuning, but also reports failures after large perturbations or multiple leg obstructions. The latent is a behavior-relevant encoding, not a guarantee of recovering each physical parameter"
              - generic [ref=e313]:
                - generic [ref=e315]:
                  - link "Kumar 2021" [ref=e316] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2107.04034
                  - 'link "Jump to the full reference for RMA: Rapid Motor Adaptation for Legged Robots" [ref=e317] [cursor=pointer]':
                    - /url: "#ref-rma-2021"
                    - generic [ref=e318]: ↓
                - text: .
            - paragraph [ref=e319]:
              - text: "In its DextrAH-RGB example, the Isaac Lab v1 paper reports an RL teacher trained with privileged state on a KUKA arm and Allegro hand, then distilled into a network taking stereo RGB pairs as inputSource:"
              - generic [ref=e320]:
                - generic [ref=e322]:
                  - link "NVIDIA 2025" [ref=e323] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2511.04831
                  - 'link "Jump to the full reference for Isaac Lab: A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning" [ref=e324] [cursor=pointer]':
                    - /url: "#ref-isaac-lab-2025"
                    - generic [ref=e325]: ↓
                - text: .
            - paragraph [ref=e326]:
              - text: "The failure mode has a name. The Isaac Lab paper calls it an information gap due to input mismatch: the teacher observes privileged state information while the student sees only partial observations, so the student must reconstruct the unobserved states from images, a challenge that becomes particularly pronounced under high camera occlusion"
              - generic [ref=e327]:
                - generic [ref=e329]:
                  - link "NVIDIA 2025" [ref=e330] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2511.04831
                  - 'link "Jump to the full reference for Isaac Lab: A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning" [ref=e331] [cursor=pointer]':
                    - /url: "#ref-isaac-lab-2025"
                    - generic [ref=e332]: ↓
                - text: .
            - paragraph [ref=e333]: The panel below uses chosen terrain and noise, not a trained teacher or student. Its 24 terrain cells combine two sine waves with a step and a depression. Two seeded sequences (123456789 and 987654321) fix the noise and channel-dropout thresholds. A Gaussian blur of width three cells, a noise coefficient of 0.06, and a same-sign occlusion error of 0.12 define the reconstruction error; the degradation control scales that error from zero to one and starts at 0.15. The reconstruction is calculated directly from this terrain and error field, not inferred from the displayed input strip.
            - generic [ref=e334]:
              - generic [ref=e335]:
                - generic [ref=e336]:
                  - generic [ref=e337]:
                    - text: Proprioceptive degradation
                    - generic [ref=e338]: 15%
                  - slider "Proprioceptive degradation, currently 15 percent" [ref=e339]: "15"
                - button "Reset" [ref=e340]
              - generic [ref=e341]:
                - generic [ref=e342]: "reconstruction MAE: 0.01 m"
                - generic [ref=e343]: "action divergence: 0.02"
                - generic [ref=e344]:
                  - text: "occluded channels:"
                  - generic [ref=e345]: 3/24
              - 'img "Teacher-student distillation at 15 percent degradation. Top panel: the teacher''s privileged terrain heightfield. Middle panel: the student''s proprioceptive history, 3 of 24 channels occluded. Bottom panel: the student''s reconstructed terrain, mean absolute error 0.01 m. Teacher-student action divergence 0.02." [ref=e346]':
                - generic [ref=e347]: "teacher (privileged): terrain heightfield under the feet"
                - generic [ref=e373]: "student input: recent proprioceptive readings"
                - generic [ref=e399]: student reconstruction of the terrain
              - paragraph [ref=e425]:
                - generic [ref=e426]: "degradation 15%:"
                - generic [ref=e427]: MAE 0.01 m
                - text: divergence 0.02
              - generic [ref=e428]:
                - paragraph [ref=e429]: At 15 percent proprioceptive degradation the student reconstruction of the teacher terrain sits at 0.01 m MAE with action divergence 0.02, and 3 of 24 input channels are already dashed-occluded; the three stacked panels are the privileged heightfield, the proprioceptive history, and that reconstruction.
                - group [ref=e430]:
                  - generic "Current teacher-student gap" [ref=e431] [cursor=pointer]
              - paragraph [ref=e432]: Darker cells are higher terrain. This deterministic toy draws chosen terrain, normalized terrain readings with seeded noise, and a reconstruction computed from terrain plus authored errors. The input strip is not recorded robot sensing. At zero degradation the reconstruction is exact; increasing degradation raises the errors by construction. The action-divergence label denotes 2.2 times MAE, not measured actions from trained policies.
            - paragraph [ref=e433]: Push the degradation slider up. The input strip loses channels and gains noise, the constructed reconstruction changes, and both error readouts rise by design. The action-divergence value is 2.2 times the unrounded reconstruction MAE, displayed in normalized units; it is not a comparison of learned actions or a measured cost of distillation. At zero degradation the local reconstruction is exact. Reset restores 0.15. The cited input-mismatch discussion motivates the illustration, but does not establish these coefficients or a universal error floor independent of training.
            - 'heading "System identification: measure the gap instead" [level=2] [ref=e434]':
              - 'link "System identification: measure the gap instead" [ref=e435] [cursor=pointer]':
                - /url: "#system-identification-measure-the-gap-instead"
              - 'button "Copy link to this section, System identification: measure the gap instead" [ref=e437] [cursor=pointer]'
            - paragraph [ref=e440]:
              - text: "Randomization averages over model error. System identification removes the error by measurement. Hwangbo and colleagues learned an actuator network for ANYmal's series-elastic actuators: it predicts joint torque from joint-position errors and velocities at the current time and 0.01 and 0.02 seconds earlier. They fitted it to real-robot excitation data, then used it inside the simulator to train control policies. In their locomotion ablations, policies trained with ideal or analytical actuator models could not take a single step without falling"
              - generic [ref=e441]:
                - generic [ref=e443]:
                  - link "Hwangbo 2019" [ref=e444] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/1901.08652
                  - link "Jump to the full reference for Learning agile and dynamic motor skills for legged robots" [ref=e445] [cursor=pointer]:
                    - /url: "#ref-hwangbo-2019"
                    - generic [ref=e446]: ↓
                - text: .
            - paragraph [ref=e447]:
              - text: ASAP starts with phase-conditioned tracking policies trained in IsaacGym on
              - link "retargeted" [ref=e449] [cursor=pointer]:
                - /url: /glossary/#retargeting
              - text: "human motions. It runs the pretrained policies on a Unitree G1 and records trajectories using motion capture and onboard sensors. A second PPO policy takes the simulated state and a recorded action and outputs a delta action. Adding that delta before the simulator step lets its reward penalize disagreement with the recorded real trajectory; the delta is learned through RL, not supplied as a measured residual-action label. The delta action model is then frozen while the tracking policy is fine-tuned in the modified simulator. Only the fine-tuned tracking policy is deployed: the delta model stays in simulation. The hardware study learns corrections for four ankle DoFs, not the full 23-DoF simulation model"
              - generic [ref=e452]:
                - link "He 2025" [ref=e453] [cursor=pointer]:
                  - /url: https://arxiv.org/abs/2502.01143
                - 'link "Jump to the full reference for ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid Whole-Body Skills" [ref=e454] [cursor=pointer]':
                  - /url: "#ref-asap-2025"
                  - generic [ref=e455]: ↓
              - text: .
            - paragraph [ref=e456]:
              - text: "The evaluation separates IsaacGym-to-IsaacSim and IsaacGym-to-Genesis transfer from the G1 hardware study. Table III tests open-loop replay; Table IV evaluates closed-loop motion tracking. The simulation suite has 43 motion sequences grouped by difficulty, and reports mean tracking errors across motion sequences. SysID and delta-dynamics are explicit simulation baselines, but ASAP does not win every metric: in Table IV's easy IsaacSim group, its mean global joint-position error is 106 mm versus SysID's 105 mm. On hardware, Table V compares ASAP only with Vanilla on kicking and LeBron James's \"Silencer\": mean global joint-position error falls from 61.2 to 50.2 mm and from 159 to 112 mm, respectively. Basic domain randomization is used in pretraining; the separate random-action-noise fine-tuning ablation is an IsaacGym-to-Genesis test, not a hardware comparison against every baseline"
              - generic [ref=e457]:
                - generic [ref=e459]:
                  - link "He 2025" [ref=e460] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2502.01143
                  - 'link "Jump to the full reference for ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid Whole-Body Skills" [ref=e461] [cursor=pointer]':
                    - /url: "#ref-asap-2025"
                    - generic [ref=e462]: ↓
                - text: .
            - paragraph [ref=e463]:
              - text: Generalization is measured, not guaranteed. ASAP reports improved tracking on the held-out "Silencer" motion and better out-of-distribution replay with more training data; neither result establishes arbitrary unseen-skill coverage. Its stated hardware limits are motor overheating and damage, motion-capture dependence during data collection, and the data required to learn a full 23-DoF delta model. These are empirical limitations, not a mathematical rule that the correction is valid only near the pretrained policy's trajectories
              - generic [ref=e464]:
                - generic [ref=e466]:
                  - link "He 2025" [ref=e467] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2502.01143
                  - 'link "Jump to the full reference for ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid Whole-Body Skills" [ref=e468] [cursor=pointer]':
                    - /url: "#ref-asap-2025"
                    - generic [ref=e469]: ↓
                - text: .
            - 'heading "Real-to-sim: rebuild the scene, keep the physics" [level=2] [ref=e470]':
              - 'link "Real-to-sim: rebuild the scene, keep the physics" [ref=e471] [cursor=pointer]':
                - /url: "#real-to-sim-rebuild-the-scene-keep-the-physics"
              - 'button "Copy link to this section, Real-to-sim: rebuild the scene, keep the physics" [ref=e473] [cursor=pointer]'
            - paragraph [ref=e476]:
              - text: The newest family attacks the visual gap by reconstructing the actual deployment scene. SplatSim replaces mesh primitives in the rendering pipeline with Gaussian splats reconstructed from the deployment scene; PyBullet supplies the physics. Across four UR5 manipulation tasks, with 40 trials per task, the authors report 86.25% average zero-shot real-world success for diffusion policies trained on simulated demonstrations, versus 97.5% for policies trained on real-world demonstrations. This is the result with training augmentations, not rendering alone
              - generic [ref=e478]:
                - generic [ref=e480]:
                  - link "Qureshi 2024" [ref=e481] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2409.10161
                  - 'link "Jump to the full reference for SplatSim: Zero-Shot Sim2Real Transfer of RGB Manipulation Policies Using Gaussian Splatting" [ref=e482] [cursor=pointer]':
                    - /url: "#ref-splatsim-2024"
                    - generic [ref=e483]: ↓
                - text: .
            - paragraph [ref=e484]:
              - text: The setup uses a Robotiq 2F-85 gripper and two RealSense D455 cameras. Preparing the splats requires manual robot segmentation, CAD-derived link bounds and ICP alignment; robot kinematics and simulated object poses drive rendering. Figure 2 lists RGB observations plus end-effector position and orientation, while Section IV-A says the policy relies solely on RGB at test time. Those descriptions disagree; they do not establish an unqualified image-only input specification
              - generic [ref=e486]:
                - generic [ref=e488]:
                  - link "Qureshi 2024" [ref=e489] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2409.10161
                  - 'link "Jump to the full reference for SplatSim: Zero-Shot Sim2Real Transfer of RGB Manipulation Policies Using Gaussian Splatting" [ref=e490] [cursor=pointer]':
                    - /url: "#ref-splatsim-2024"
                    - generic [ref=e491]: ↓
                - text: .
              - text: In its August 2025 v2, RoboGSim combines a Gaussian Reconstructor, Digital Twins Builder, Scene Composer and Interactive Engine in a real2sim2real system. Multi-view images and supplied robot MDH parameters feed reconstruction; mesh assets and measured layout alignment connect the scene to Isaac Sim. The synthesizer composes novel views, objects, scenes and trajectories. In closed-loop evaluation, a policy acts on splat-rendered images; Isaac Sim handles inverse kinematics, collisions and other physical interactions, and the resulting state drives the next rendering
              - generic [ref=e492]:
                - generic [ref=e494]:
                  - link "Li 2024" [ref=e495] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2411.11839
                  - 'link "Jump to the full reference for RoboGSim: A Real2Sim2Real Robotic Gaussian Splatting Simulator" [ref=e496] [cursor=pointer]':
                    - /url: "#ref-robogsim-2024"
                    - generic [ref=e497]: ↓
                - text: .
            - paragraph [ref=e498]:
              - text: This evaluation is not interchangeable with real-robot testing. On the UR5 ring-toss task, each model had ten trials with up to three grasp attempts per trial. Table 2 reports 90% placement for the real-data-trained model on the real robot but 30% in RoboGSim. Simulated evaluation avoids executing those actions on hardware; it is not a demonstrated safety guarantee for a deployed robot. The paper examines novel-pose rendering and trajectory replay separately from closed-loop policy evaluation
              - generic [ref=e499]:
                - generic [ref=e501]:
                  - link "Li 2024" [ref=e502] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2411.11839
                  - 'link "Jump to the full reference for RoboGSim: A Real2Sim2Real Robotic Gaussian Splatting Simulator" [ref=e503] [cursor=pointer]':
                    - /url: "#ref-robogsim-2024"
                    - generic [ref=e504]: ↓
                - text: .
              - text: The Newton 1.0 release post describes a Warp-based tiled camera sensor whose ray-tracing backend supports both triangle meshes and Gaussian splats
              - generic [ref=e507]:
                - link "Reist 2026" [ref=e508] [cursor=pointer]:
                  - /url: https://developer.nvidia.com/blog/newton-adds-contact-rich-manipulation-and-locomotion-capabilities-for-industrial-robotics
                - link "Jump to the full reference for Newton Adds Contact-Rich Manipulation and Locomotion Capabilities for Industrial Robotics" [ref=e509] [cursor=pointer]:
                  - /url: "#ref-newton-manipulation-blog-2026"
                  - generic [ref=e510]: ↓
              - text: .
            - paragraph [ref=e511]: "Keep the division of labor straight: the splat supplies appearance, and a conventional physics engine still supplies dynamics. A 3DGS twin is a learned renderer bolted onto a simulator, not a learned simulator, and it reconstructs a static scene: articulated objects, deformables, and lighting changes each require extra machinery on top. Confusing the two is the most common misreading of the real-to-sim literature."
            - heading "The levers nobody demos" [level=2] [ref=e512]:
              - link "The levers nobody demos" [ref=e513] [cursor=pointer]:
                - /url: "#the-levers-nobody-demos"
              - button "Copy link to this section, The levers nobody demos" [ref=e515] [cursor=pointer]
            - paragraph [ref=e518]:
              - text: The survey adds two cross-cutting options that rarely get headline systems. Sim-real co-training mixes real data into an otherwise simulated training set, so the real samples anchor the representation while simulation supplies coverage. State and action abstraction chooses the interface between policy and robot (
              - link "end-effector" [ref=e520] [cursor=pointer]:
                - /url: /glossary/#end-effector
              - text: velocities or foot positions rather than raw torques) so that a conventional low-level controller absorbs much of the gap
              - generic [ref=e521]:
                - generic [ref=e523]:
                  - link "Aljalbout 2025" [ref=e524] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2510.20808
                  - 'link "Jump to the full reference for The Reality Gap in Robotics: Challenges, Solutions, and Best Practices" [ref=e525] [cursor=pointer]':
                    - /url: "#ref-reality-gap-survey-2026"
                    - generic [ref=e526]: ↓
                - text: .
              - text: "The survey's own emphasis is that the action-space choice plays a crucial role in reducing the sim-to-real gap across navigation, locomotion, and manipulation, which matches the quiet pattern in successful deployments: most of them randomize some things, identify others, and abstract away the rest."
            - heading "Where each family breaks" [level=2] [ref=e527]:
              - link "Where each family breaks" [ref=e528] [cursor=pointer]:
                - /url: "#where-each-family-breaks"
              - button "Copy link to this section, Where each family breaks" [ref=e530] [cursor=pointer]
            - paragraph [ref=e533]:
              - text: Each family's failure mode is worth holding onto. The friction chart's conservatism cost is an authored assumption, not an empirical result of the cited papers. The teacher-student panel likewise constructs its error rather than measuring a distillation limit. ASAP shows some held-out motion transfer, but broader coverage and affordable real-robot data collection remain open
              - generic [ref=e536]:
                - link "He 2025" [ref=e537] [cursor=pointer]:
                  - /url: https://arxiv.org/abs/2502.01143
                - 'link "Jump to the full reference for ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid Whole-Body Skills" [ref=e538] [cursor=pointer]':
                  - /url: "#ref-asap-2025"
                  - generic [ref=e539]: ↓
              - text: . Real-to-sim twins freeze the scene they captured.
            - region [ref=e540]:
              - paragraph [ref=e541]: Self-check
              - group "Which RMA component estimates behavior-relevant latent extrinsics from recent state-action history, while the deployed base policy uses the latest estimate?" [ref=e542]:
                - generic [ref=e544]:
                  - generic [ref=e545] [cursor=pointer]:
                    - radio "Domain randomization over a very wide friction range" [ref=e546]
                    - generic [ref=e547]: Domain randomization over a very wide friction range
                  - generic [ref=e548] [cursor=pointer]:
                    - radio "A separately trained adaptation module" [ref=e549]
                    - generic [ref=e550]: A separately trained adaptation module
                  - generic [ref=e551] [cursor=pointer]:
                    - radio "Give the deployed policy the friction coefficient as an input" [ref=e552]
                    - generic [ref=e553]: Give the deployed policy the friction coefficient as an input
              - group [ref=e554]:
                - generic "Read the reasoning" [ref=e555] [cursor=pointer]
          - separator
          - region [ref=e556]:
            - heading "See also" [level=2] [ref=e557]
            - list [ref=e558]:
              - listitem [ref=e559]:
                - link "Why RL Won Locomotion but Not Manipulation" [ref=e560] [cursor=pointer]:
                  - /url: /rl-sim2real/why-rl-locomotion/
                - paragraph [ref=e561]: "The MDP simulability gap: contact-rich manipulation resists the simulation that made walking routine."
              - listitem [ref=e562]:
                - link "Legged Locomotion Lineage" [ref=e563] [cursor=pointer]:
                  - /url: /rl-sim2real/legged-locomotion/
                - paragraph [ref=e564]: "From ANYmal to Unitree and the MIT humanoid line: how learned gaits became the default."
              - listitem [ref=e565]:
                - link "Generative Simulation" [ref=e566] [cursor=pointer]:
                  - /url: /world-models/generative-sim/
                - paragraph [ref=e567]: "Generated content inside real physics engines beats generated dynamics: RoboGen, Holodeck, RoboCasa."
          - region [ref=e568]:
            - heading "Linked from" [level=2] [ref=e569]
            - list [ref=e570]:
              - listitem [ref=e571]:
                - link "RL for Robotics" [ref=e572] [cursor=pointer]:
                  - /url: /rl-sim2real/rl-for-robotics/
                - paragraph [ref=e573]: Sample efficiency decides which reinforcement learning algorithms a robot can actually be trained with, from PPO in simulation to offline learning on a fixed dataset.
              - listitem [ref=e574]:
                - link "Why RL Won Locomotion but Not Manipulation" [ref=e575] [cursor=pointer]:
                  - /url: /rl-sim2real/why-rl-locomotion/
                - paragraph [ref=e576]: "The MDP simulability gap: contact-rich manipulation resists the simulation that made walking routine."
              - listitem [ref=e577]:
                - link "Massively Parallel Sim RL" [ref=e578] [cursor=pointer]:
                  - /url: /rl-sim2real/parallel-sim-rl/
                - paragraph [ref=e579]: "Isaac Lab, Newton, MJX, and Brax: GPU-parallel environments and the wall-clock economics of training."
              - listitem [ref=e580]:
                - link "Legged Locomotion Lineage" [ref=e581] [cursor=pointer]:
                  - /url: /rl-sim2real/legged-locomotion/
                - paragraph [ref=e582]: "From ANYmal to Unitree and the MIT humanoid line: how learned gaits became the default."
              - listitem [ref=e583]:
                - link "Humanoid Whole-Body Control" [ref=e584] [cursor=pointer]:
                  - /url: /rl-sim2real/humanoid-wbc/
                - paragraph [ref=e585]: Motion tracking from PHC to ASAP and GMT, and the three decompositions of 2026.
              - listitem [ref=e586]:
                - link "Generative Simulation" [ref=e587] [cursor=pointer]:
                  - /url: /world-models/generative-sim/
                - paragraph [ref=e588]: "Generated content inside real physics engines beats generated dynamics: RoboGen, Holodeck, RoboCasa."
              - listitem [ref=e589]:
                - link "The Evaluation Crisis" [ref=e590] [cursor=pointer]:
                  - /url: /data-hardware/evaluation-crisis/
                - paragraph [ref=e591]: "Why N-of-10 trials and unreported variance mislead: 95% per-step success is unusable at 30 steps."
              - listitem [ref=e592]:
                - link "Control" [ref=e593] [cursor=pointer]:
                  - /url: /classical/control/
                - paragraph [ref=e594]: "PID, LQR, MPC, and whole-body QP: the classical stack under every learned policy."
          - region [ref=e595]:
            - heading "References" [level=2] [ref=e596]
            - list [ref=e597]:
              - listitem [ref=e598]:
                - generic [ref=e599]: "1"
                - generic [ref=e600]:
                  - link "Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World" [ref=e602] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/1703.06907
                  - paragraph [ref=e603]: Josh Tobin, Rachel Fong, Alex Ray, Jonas Schneider, Wojciech Zaremba, Pieter Abbeel, IROS 2017.
                  - paragraph [ref=e604]: https://arxiv.org/abs/1703.06907
              - listitem [ref=e605]:
                - generic [ref=e606]: "2"
                - generic [ref=e607]:
                  - link "Sim-to-Real Transfer of Robotic Control with Dynamics Randomization" [ref=e609] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/1710.06537
                  - paragraph [ref=e610]: Xue Bin Peng, Marcin Andrychowicz, Wojciech Zaremba, Pieter Abbeel, ICRA 2018.
                  - paragraph [ref=e611]: https://arxiv.org/abs/1710.06537
              - listitem [ref=e612]:
                - generic [ref=e613]: "3"
                - generic [ref=e614]:
                  - link "Solving Rubik's Cube with a Robot Hand" [ref=e616] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/1910.07113
                  - paragraph [ref=e617]:
                    - text: OpenAI, Ilge Akkaya, Marcin Andrychowicz, Maciek Chociej, Mateusz Litwin, Bob McGrew, Arthur Petron, Alex Paino, and 11 more, 2019.
                    - button "Show all 19 authors" [ref=e618] [cursor=pointer]
                  - paragraph [ref=e619]: https://arxiv.org/abs/1910.07113
              - listitem [ref=e620]:
                - generic [ref=e621]: "4"
                - generic [ref=e622]:
                  - 'link "Isaac Lab: A GPU-Accelerated Simulation Framework for Multi-Modal Robot Learning" [ref=e624] [cursor=pointer]':
                    - /url: https://arxiv.org/abs/2511.04831
                  - paragraph [ref=e625]:
                    - text: NVIDIA, Mayank Mittal, Yunrong Guo, Pascal Roth, David Hoeller, James Tigue, Antoine Richard, Octi Zhang, and 98 more, 2025.
                    - button "Show all 106 authors" [ref=e626] [cursor=pointer]
                  - paragraph [ref=e627]: https://arxiv.org/abs/2511.04831
              - listitem [ref=e628]:
                - generic [ref=e629]: "5"
                - generic [ref=e630]:
                  - link "Learning Quadrupedal Locomotion over Challenging Terrain" [ref=e632] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/2010.11251
                  - paragraph [ref=e633]: Joonho Lee, Jemin Hwangbo, Lorenz Wellhausen, Vladlen Koltun, Marco Hutter, Science Robotics 5(47), 2020.
                  - paragraph [ref=e634]: https://arxiv.org/abs/2010.11251
              - listitem [ref=e635]:
                - generic [ref=e636]: "6"
                - generic [ref=e637]:
                  - 'link "RMA: Rapid Motor Adaptation for Legged Robots" [ref=e639] [cursor=pointer]':
                    - /url: https://arxiv.org/abs/2107.04034
                  - paragraph [ref=e640]: Ashish Kumar, Zipeng Fu, Deepak Pathak, Jitendra Malik, RSS 2021.
                  - paragraph [ref=e641]: https://arxiv.org/abs/2107.04034
              - listitem [ref=e642]:
                - generic [ref=e643]: "7"
                - generic [ref=e644]:
                  - link "Learning agile and dynamic motor skills for legged robots" [ref=e646] [cursor=pointer]:
                    - /url: https://arxiv.org/abs/1901.08652
                  - paragraph [ref=e647]: Jemin Hwangbo, Joonho Lee, Alexey Dosovitskiy, Dario Bellicoso, Vassilios Tsounis, Vladlen Koltun, Marco Hutter, Science Robotics 4(26), 2019.
                  - paragraph [ref=e648]: https://arxiv.org/abs/1901.08652
              - listitem [ref=e649]:
                - generic [ref=e650]: "8"
                - generic [ref=e651]:
                  - 'link "ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid Whole-Body Skills" [ref=e653] [cursor=pointer]':
                    - /url: https://arxiv.org/abs/2502.01143
                  - paragraph [ref=e654]:
                    - text: Tairan He, Jiawei Gao, Wenli Xiao, Yuanhang Zhang, Zi Wang, Jiashun Wang, Zhengyi Luo, Guanqi He, and 10 more, RSS 2025.
                    - button "Show all 18 authors" [ref=e655] [cursor=pointer]
                  - paragraph [ref=e656]: https://arxiv.org/abs/2502.01143
              - listitem [ref=e657]:
                - generic [ref=e658]: "9"
                - generic [ref=e659]:
                  - 'link "SplatSim: Zero-Shot Sim2Real Transfer of RGB Manipulation Policies Using Gaussian Splatting" [ref=e661] [cursor=pointer]':
                    - /url: https://arxiv.org/abs/2409.10161
                  - paragraph [ref=e662]: Mohammad Nomaan Qureshi, Sparsh Garg, Francisco Yandun, David Held, George Kantor, Abhisesh Silwal, 2024.
                  - paragraph [ref=e663]: https://arxiv.org/abs/2409.10161
              - listitem [ref=e664]:
                - generic [ref=e665]: "10"
                - generic [ref=e666]:
                  - 'link "RoboGSim: A Real2Sim2Real Robotic Gaussian Splatting Simulator" [ref=e668] [cursor=pointer]':
                    - /url: https://arxiv.org/abs/2411.11839
                  - paragraph [ref=e669]:
                    - text: Xinhai Li, Jialin Li, Ziheng Zhang, Rui Zhang, Fan Jia, Tiancai Wang, Haoqiang Fan, Kuo-Kun Tseng, and 1 more, 2024.
                    - button "Show all 9 authors" [ref=e670] [cursor=pointer]
                  - paragraph [ref=e671]: https://arxiv.org/abs/2411.11839
              - listitem [ref=e672]:
                - generic [ref=e673]: "11"
                - generic [ref=e674]:
                  - 'link "The Reality Gap in Robotics: Challenges, Solutions, and Best Practices" [ref=e676] [cursor=pointer]':
                    - /url: https://arxiv.org/abs/2510.20808
                  - paragraph [ref=e677]:
                    - text: Elie Aljalbout, Jiaxu Xing, Angel Romero, Iretiayo Akinola, Caelan Reed Garrett, Eric Heiden, Abhishek Gupta, Tucker Hermans, and 4 more, Annual Review of Control, Robotics, and Autonomous Systems 2026 (accepted), 2025.
                    - button "Show all 12 authors" [ref=e678] [cursor=pointer]
                  - paragraph [ref=e679]: https://arxiv.org/abs/2510.20808
              - listitem [ref=e680]:
                - generic [ref=e681]: "12"
                - generic [ref=e682]:
                  - link "Newton Adds Contact-Rich Manipulation and Locomotion Capabilities for Industrial Robotics" [ref=e684] [cursor=pointer]:
                    - /url: https://developer.nvidia.com/blog/newton-adds-contact-rich-manipulation-and-locomotion-capabilities-for-industrial-robotics
                  - paragraph [ref=e685]: Philipp Reist, Miguel Zamora Mora, JC Chang, Rishabh Chadha, Mohammad Mohajerani, 2026.
                  - paragraph [ref=e686]: https://developer.nvidia.com/blog/newton-adds-contact-rich-manipulation-and-locomotion-capabilities-for-industrial-robotics
      - contentinfo [ref=e687]:
        - generic [ref=e688]:
          - link "Robot Wiki" [ref=e690] [cursor=pointer]:
            - /url: /
          - paragraph [ref=e691]:
            - text: Written and maintained by
            - link "Josef Chen" [ref=e692] [cursor=pointer]:
              - /url: https://github.com/josefchen
            - text: .
            - link "Source on GitHub" [ref=e693] [cursor=pointer]:
              - /url: https://github.com/josefchen/robot-wiki
            - text: .
  - button "Open Next.js Dev Tools" [ref=e699] [cursor=pointer]
  - alert [ref=e703]
```

# Test source

```ts
  1   | import { expect, test, type Locator, type Page } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   | import { createHash } from 'node:crypto';
  4   | import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
  5   | import { frictionOracle, teacherOracle } from '../../audit/evidence/sim2real-local-20260923/proof-support';
  6   | import { setSlider } from './slider';
  7   | 
  8   | const directory = 'audit/evidence/sim2real-local-20260923';
  9   | const producing = process.env.SIM2REAL_WRITE_EVIDENCE === '1';
  10  | const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
  11  | 
  12  | async function capture(page: Page, panel: Locator, name: string) {
  13  |   await panel.scrollIntoViewIfNeeded();
  14  |   const html = await panel.evaluate(element => element.outerHTML);
  15  |   if (!producing) return { name, domSha256: sha256(html) };
  16  |   mkdirSync(`${directory}/captures`, { recursive: true });
  17  |   const png = `${directory}/captures/${name}.png`;
  18  |   const dom = `${directory}/captures/${name}.html`;
  19  |   expect(existsSync(png)).toBe(false);
  20  |   expect(existsSync(dom)).toBe(false);
  21  |   await panel.screenshot({ path: png });
  22  |   writeFileSync(dom, html, { flag: 'wx' });
  23  |   return { name, png, dom, pngSha256: sha256(readFileSync(png)), domSha256: sha256(html), url: page.url() };
  24  | }
  25  | 
  26  | test('sim2real raw mounted evidence covers both friction mounts and teacher transitions', async ({ page }) => {
  27  |   test.setTimeout(120_000);
  28  |   const startedAt = new Date().toISOString();
  29  |   const errors: string[] = [];
  30  |   const external: string[] = [];
  31  |   page.on('pageerror', error => errors.push(error.message));
  32  |   await page.route('**/*', async route => {
  33  |     const url = new URL(route.request().url());
  34  |     if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
  35  |       external.push(url.href);
  36  |       await route.abort();
  37  |     } else await route.continue();
  38  |   });
  39  |   await page.setViewportSize({ width: 1440, height: 1000 });
  40  |   await page.goto('/rl-sim2real/sim2real-transfer/');
  41  |   await page.evaluate(() => document.fonts.ready);
  42  |   const panels = page.getByTestId('real-mu-readout')
  43  |     .locator('xpath=ancestor::div[@data-brand-surface-id="surface:flat"][1]');
  44  |   await expect(panels).toHaveCount(2);
  45  |   const ordinary = panels.nth(0);
  46  |   const reveal = panels.nth(1);
  47  |   const observations: unknown[] = [];
  48  | 
  49  |   async function frictionState(panel: Locator, name: string, mu: number, range: number) {
  50  |     const expected = frictionOracle(mu, range);
  51  |     await expect(panel.getByTestId('real-mu-readout')).toHaveText(mu.toFixed(2));
  52  |     await expect(panel.getByTestId('point-readout')).toHaveText(expected.pointDisplay);
  53  |     await expect(panel.getByTestId('dr-readout')).toHaveText(expected.drDisplay);
  54  |     await expect(panel.getByRole('slider', { name: /randomization half-width/i })).toHaveValue(String(Math.round(range * 100)));
  55  |     const line = await panel.getByTestId('real-line').getAttribute('x1');
  56  |     const curve = await panel.getByTestId('dr-curve').getAttribute('points');
  57  |     observations.push({
  58  |       name, input: { mu, range }, expected, line, curve,
  59  |       point: await panel.getByTestId('point-readout').innerText(),
  60  |       dr: await panel.getByTestId('dr-readout').innerText(),
  61  |       artifact: await capture(page, panel, name),
  62  |     });
  63  |     return { line, curve };
  64  |   }
  65  | 
  66  |   const initial = await frictionState(ordinary, 'friction-default', 0.8, 0.35);
  67  |   await setSlider(ordinary.getByRole('slider', { name: /real robot friction/i }), 150);
  68  |   const far = await frictionState(ordinary, 'friction-far', 1.5, 0.35);
> 69  |   expect(far.line).not.toEqual(initial.line);
      |                        ^ Error: expect(received).not.toEqual(expected) // deep equality
  70  |   await setSlider(ordinary.getByRole('slider', { name: /real robot friction/i }), 80);
  71  |   await setSlider(ordinary.getByRole('slider', { name: /randomization half-width/i }), 65);
  72  |   const wide = await frictionState(ordinary, 'friction-wide', 0.8, 0.65);
  73  |   expect(wide.curve).not.toEqual(initial.curve);
  74  |   await ordinary.getByRole('button', { name: 'Reset', exact: true }).click();
  75  |   expect(await frictionState(ordinary, 'friction-reset', 0.8, 0.35)).toEqual(initial);
  76  | 
  77  |   await expect(reveal).not.toBeVisible();
  78  |   await page.locator('[data-predict]').getByRole('radio', {
  79  |     name: 'The plateau widens and its peak falls because the formula makes it do so',
  80  |   }).check();
  81  |   await expect(page.locator('[data-predict] [data-reveal]')).toHaveAttribute('open', '');
  82  |   const revealInitial = await frictionState(reveal, 'reveal-default', 0.8, 0.65);
  83  |   await setSlider(reveal.getByRole('slider', { name: /real robot friction/i }), 150);
  84  |   await setSlider(reveal.getByRole('slider', { name: /randomization half-width/i }), 35);
  85  |   const revealChanged = await frictionState(reveal, 'reveal-changed', 1.5, 0.35);
  86  |   expect(revealChanged.line).not.toEqual(revealInitial.line);
  87  |   expect(revealChanged.curve).not.toEqual(revealInitial.curve);
  88  |   await reveal.getByRole('button', { name: 'Reset', exact: true }).click();
  89  |   expect(await frictionState(reveal, 'reveal-reset', 0.8, 0.65)).toEqual(revealInitial);
  90  |   await expect(ordinary.getByRole('slider', { name: /randomization half-width/i })).toHaveValue('35');
  91  | 
  92  |   const teacher = page.getByTestId('teacher-panel')
  93  |     .locator('xpath=ancestor::div[@data-brand-surface-id="surface:flat"][1]');
  94  |   const degradationSlider = teacher.getByRole('slider', { name: /proprioceptive degradation/i });
  95  |   async function teacherState(name: string, degradation: number) {
  96  |     const expected = teacherOracle(degradation);
  97  |     await expect(degradationSlider).toHaveValue(String(degradation * 100));
  98  |     await expect(teacher.getByTestId('mae-readout')).toHaveText(expected.maeDisplay);
  99  |     await expect(teacher.getByTestId('divergence-readout')).toHaveText(expected.divergenceDisplay);
  100 |     await expect(teacher.getByTestId('occluded-readout')).toHaveText(expected.occludedDisplay);
  101 |     await expect(teacher.getByTestId('recon-panel').locator('rect')).toHaveCount(24);
  102 |     await expect(teacher.getByTestId('student-panel').locator('g')).toHaveCount(expected.occluded.filter(Boolean).length);
  103 |     const reconstruction = await teacher.getByTestId('recon-panel').innerHTML();
  104 |     const input = await teacher.getByTestId('student-panel').innerHTML();
  105 |     observations.push({ name, input: { degradation }, expected, reconstruction, inputMarkup: input, artifact: await capture(page, teacher, name) });
  106 |     return { reconstruction, input };
  107 |   }
  108 |   const teacherInitial = await teacherState('teacher-default', 0.15);
  109 |   await setSlider(degradationSlider, 100);
  110 |   const teacherHigh = await teacherState('teacher-high', 1);
  111 |   expect(teacherHigh.reconstruction).not.toEqual(teacherInitial.reconstruction);
  112 |   expect(teacherHigh.input).not.toEqual(teacherInitial.input);
  113 |   await setSlider(degradationSlider, 0);
  114 |   await teacherState('teacher-zero', 0);
  115 |   const teacherColors = await teacher.getByTestId('teacher-panel').locator('rect').evaluateAll(nodes => nodes.map(node => node.getAttribute('fill')));
  116 |   const reconColors = await teacher.getByTestId('recon-panel').locator('rect').evaluateAll(nodes => nodes.map(node => node.getAttribute('fill')));
  117 |   expect(reconColors).toEqual(teacherColors);
  118 |   await teacher.getByRole('button', { name: 'Reset', exact: true }).click();
  119 |   expect(await teacherState('teacher-reset', 0.15)).toEqual(teacherInitial);
  120 |   await expect(teacher).toContainText('Darker cells are higher terrain');
  121 |   const desktopAxe = await new AxeBuilder({ page }).include('#main-content').analyze();
  122 |   expect(desktopAxe.violations).toEqual([]);
  123 |   await page.setViewportSize({ width: 375, height: 812 });
  124 |   await expect(page.locator('div.prose[data-pagefind-body]')).toContainText('not inferred from the displayed input strip');
  125 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  126 |   const mobileArtifact = await capture(page, teacher, 'mobile-disclosure');
  127 |   const mobileAxe = await new AxeBuilder({ page }).include('#main-content').analyze();
  128 |   expect(mobileAxe.violations).toEqual([]);
  129 |   expect(errors).toEqual([]);
  130 |   expect(external).toEqual([]);
  131 |   if (producing) {
  132 |     const dependencies = [
  133 |       'content/rl-sim2real/sim2real-transfer.mdx', 'lib/sim2real.ts', 'lib/audit-local-basis.ts',
  134 |       'components/interactive/friction-transfer.tsx', 'components/interactive/teacher-student.tsx',
  135 |       'components/article/commit-to-reveal.tsx', 'tests/e2e/slider.ts',
  136 |       'tests/e2e/sim2real-local-evidence.spec.ts',
  137 |       'audit/evidence/sim2real-local-20260923/proof-support.ts',
  138 |     ].map(path => ({ path, sha256: sha256(readFileSync(path)) }));
  139 |     writeFileSync(`${directory}/browser-run.json`, JSON.stringify({
  140 |       kind: 'raw-mounted-browser-run', auditCertification: false, startedAt,
  141 |       completedAt: new Date().toISOString(), observations, mobileArtifact,
  142 |       pageErrors: errors, blockedExternalRequests: external,
  143 |       desktopAxeViolations: desktopAxe.violations, mobileAxeViolations: mobileAxe.violations,
  144 |       dependencies,
  145 |     }, null, 2) + '\n', { flag: 'wx' });
  146 |   }
  147 | });
  148 | 
```