# Classical-foundations content-integrity audit

Date of audit: 2026-08-17. Scope: the five published `classical` articles
(kinematics, motion-planning, control, state-estimation, grasp-planning)
against their cited primary sources, fetched and read during this audit
(arXiv abs pages and HTML full texts; the open-access PDFs of Murray-Li-
Sastry 1994, LaValle's Planning Algorithms, Schulman et al. 2013 (TrajOpt),
Di Carlo et al. 2018, McGee-Schmidt 1985 (NASA TM-86847, via NTRS), and the
Åström-Murray Feedback Systems second edition; the publisher pages for
Markenscoff-Ni-Papadimitriou 1990 (SAGE IJRR), Mishra-Schwartz-Sharir 1987
(Springer Algorithmica), and Ratliff et al. 2009 (CMU RI); the Semantic
Scholar batch API for the pre-2005 IEEE papers that expose no abstracts; the
Boston Dynamics Spot RL blog; the NVIDIA Isaac-GR00T repo README with the
N1.7 release notes). Claims VAL-AUDIT-005.

Method: every checkable claim (numbers, dates, formulas, attributions,
quoted or quoted-sounding phrases) was extracted per article and checked
against the source the article cites for it. "Introduced by" claims were
verified to the original paper, not to later surveys. Every rendered formula
was checked symbolically (DH transform, Jacobian column, DLS step, RRT
extension, RRT* connection radius, PID/LQR/Riccati, MPC and whole-body QP
forms, Bayes/Kalman/EKF recursions, wrench construction, hull closure
condition, epsilon metric). Interactive-lab claims were checked against the
repo's own code (`lib/ik.ts`, `lib/grasp.ts`, `components/interactive/`).
Citation-registry bibliographic entries all carry prior verification
comments and the reachability audit (audit/citations.md) already landed, so
P1 spot-checks here focused on the entries the prose leans on hardest.

## Summary

- Claims checked: 79
- Verified: 73
- Corrected: 6
- Cut: 0 (one mis-cited source, bicchi-1995, was removed from the corrected
  sentence and the article's frontmatter; no claim was cut wholesale)
- Unresolved: 0

### 2026-09-06 reseal addendum

The registry published `perception` and `scene-representation` on
2026-08-22, after the sweep above, so this ledger stopped covering its
domain the day those articles shipped. Both were audited on 2026-09-06
under the same conventions, and `npm run check:audit-coverage` now
derives both sides of that comparison so the gap cannot reopen silently.

- Claims checked: 108 rows (perception 59, scene-representation 49)
- Verified: 99 (53 + 46)
- Corrected: 9 (6 + 3)
- Cut: 0
- Unresolved: 0

Arithmetic: 99 + 9 = 108 rows. Domain total after the addendum: 187 rows
over 7 of 7 published articles.

Corrections:

1. `grasp-planning.mdx` attributed the form-closure lower bound (at least
   four frictionless contacts in the plane, seven in space) to Mishra,
   Schwartz, and Sharir 1987, and credited Markenscoff, Ni, and
   Papadimitriou 1990 with "six contacts always suffice in the plane and
   twelve in space, whatever the object's shape". The MNP 1990 abstract
   states the lower bounds were "pointed out by Reuleaux (1875) and Somoff
   (1897), and more recently by Lakshminarayana (1978)", and MNP prove the
   sufficiency direction: four fingers for any planar object with piecewise
   smooth boundary (a circle excepted), twelve in space for objects without
   rotational symmetry, seven under very general conditions. The planar "six"
   is the Steinitz counting bound in MLS Table 5.3, not an MNP result, and
   "whatever the object's shape" is false in 3D (rotationally symmetric
   objects admit no form closure). Paragraph rewritten to MNP's own account;
   Mishra-Schwartz-Sharir re-scoped to what its abstract claims (tight
   finger-count bounds for the equilibrium cases of a frictionless "positive
   grip", linear-time synthesis for polyhedral objects); bicchi-1995 removed
   from the sentence and frontmatter; Stat note changed from "Mishra's lower
   bound, Markenscoff's upper" to "Somoff's lower bound, Markenscoff's
   upper". The frictional sentence now cites MNP too, which states 3
   planar / 4 spatial as necessary and sufficient.
2. `kinematics.mdx` described ACT's action space as "fourteen dimensions
   across two 7-DoF arms". The ACT paper (arXiv:2304.13705) describes "two
   ViperX 6-DoF robot arms" and an action space that is "the absolute joint
   positions for two robots, a 14-dimensional vector" (six joints plus a
   gripper per arm). Corrected to "fourteen dimensions across two 6-DoF arms
   and their grippers". The same wrong "7-DoF arms" phrasing survives in
   `content/manipulation/action-chunking.mdx` (out of this audit's scope;
   flagged in the handoff).
3. `control.mdx` wrote "most of them without the D" after the >95% PID
   quote. Åström-Murray say "many of these controllers are actually
   proportional-integral (PI) controllers because derivative action is often
   not included". "Most" sharpened the source's "many"; corrected.
4. `control.mdx` Stat note "top of the 500-1000 Hz band" had no source: Di
   Carlo et al. 2018 put the estimation, swing-planning, and leg-impedance
   loops at 1 kHz (and MPC at 20-30 Hz), but no 500 Hz lower bound appears
   anywhere in the cited sources. Note replaced with "Di Carlo's estimation
   and leg loops".
5. `control.mdx` called the MuJoCo-iLQR controller "a
   first-year-implementable iLQR controller" and "the strongest locomotion
   baseline a learning paper must beat". The paper (arXiv:2503.04613) claims
   neither; it frames itself as "a very simple approach" and "an
   easy-to-reproduce hardware baseline". Sentence rewritten to the paper's
   own framing.
6. `control.mdx` credited Khatib's 1987 operational-space formulation with
   writing the dynamics "at the end-effector and the center of mass". The
   1987 paper's operational point is the end-effector; center-of-mass task
   control belongs to the later whole-body literature (the very next
   sentence cites Sentis-Khatib 2005 for the hierarchy). "and the center of
   mass" removed.

## Per-claim ledger

Verdicts: V = verified against the cited source; C = corrected (see list
above). Internal = checked against repo code, which the article's own Stat
boxes and demo prose describe.

### kinematics.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| FK is the ordered product of per-joint transforms, cheap and unique | modern-robotics-2017 (Lynch-Park ch. 4 treatment) | V |
| Planar FK closed form (cumulative-angle sums) matches the demo | components/interactive/planar-fk-arm.tsx (internal) | V |
| DH 1955: exactly four scalars per joint, a/alpha for the link, d/theta for the joint; revolute joints vary theta only | denavit-hartenberg-1955 | V |
| Per-joint transform Rot_z Trans_z Trans_x Rot_x and the displayed A_i matrix | standard DH form, checked symbolically | V |
| DH frame assignment is discontinuous as axes approach parallel; PoE avoids it and is Modern Robotics' treatment | modern-robotics-2017 | V |
| Playground reads the SO-101 chain from URDF; 6 revolute joints | so-arm100-repo-2026 + playground code (internal) | V |
| Jacobian: dot{x} = J dot{q}; revolute column z_i x (p_ee - p_i) over z_i; prismatic contributes its axis | modern-robotics-2017; matches lib/ik.ts (internal) | V |
| Statics dual: tau = J^T F | modern-robotics-2017 | V |
| Whitney 1969 resolved motion rate control inverts the Jacobian; pseudoinverse J+ = J^T(JJ^T)^-1 for redundancy | whitney-1969 (title + canonical content) | V |
| Iterative IK: linearize, step J+ dx, repeat | standard; consistent with wampler-1986 context | V |
| Wampler DLS: dq = J^T(JJ^T + lambda^2 I)^-1 dx, governed by the single scalar lambda | wampler-1986 | V |
| Levenberg-Marquardt pattern: accept only on residual decrease, lambda down on success, up on failure | levenberg-1944, marquardt-1963 | V |
| Playground solver is DLS + LM acceptance + joint-limit clamps, +/-0.5 mm residual target | lib/ik.ts (internal) | V |
| ACT predicts joint-space targets, 14 dims across two arms | act-aloha-2023 | C ("7-DoF arms" -> "6-DoF arms and their grippers") |
| GR00T recent releases use a shared relative end-effector action space across human and robot embodiments | isaac-gr00t-repo-2026 (N1.7 release notes: "relative end-effector action space shared across robot and human embodiments") | V |

### motion-planning.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| Configuration-space reformulation due to Lozano-Perez 1983; robot shrunk to a point, obstacles grown | lozano-perez-1983; LaValle 2006 ch. 4 credits "the seminal work of Lozano-Perez" | V |
| C = C_obs u C_free definitions | lozano-perez-1983 / standard | V |
| Explicit C_free construction hopeless beyond a few dimensions | lavalle-2006 | V |
| PRM (Kavraki, Svestka, Latombe, Overmars): uniform milestones, local-planner edges, graph-search queries, multi-query | kavraki-1996; lavalle-2006 sec. 5.6 ("mainly introduced in [516] under the name probabilistic roadmaps") | V |
| RRT (LaValle 1998 Iowa State tech report): sample, nearest node, fixed-step extension, keep if collision-free; displayed extension rule | lavalle-1998; lavalle-2006 sec. 5.5 (original RRT introduced with a step-size parameter) | V |
| Voronoi bias: frontier nodes own large Voronoi regions, so uniform samples pull the tree outward; dense in the limit with probability one | lavalle-2006 sec. 5.5 | V |
| Kinodynamic version steers with controls (LaValle-Kuffner) | lavalle-kuffner-2001 (title "Randomized Kinodynamic Planning"); lavalle-2006: RRT "originally developed for motion planning under differential constraints" | V |
| PRM and RRT are probabilistically complete | lavalle-2006 (definition: probability of finding an existing solution converges to one) | V |
| Karaman-Frazzoli 2011: RRT and PRM converge a.s. to non-optimal costs; RRT* asymptotically optimal; r(n) = gamma (log n / n)^{1/d}; per-iteration cost within a constant factor of RRT | karaman-frazzoli-2011 (arXiv:1105.1186 abs) | V |
| Informed RRT*: after a first solution, sample only the prolate hyperspheroid of states that can still improve it | gammell-2014 (arXiv:1404.2334 abs) | V |
| OMPL ships tested PRM/RRT/RRT* and is the reference implementation | ompl-2012 | V |
| CHOMP: smoothness + obstacle functionals, f_smooth = half the integrated squared velocity; covariant functional gradient; standalone planner on a 6-DoF arm and a quadruped | ratliff-2009 (CMU RI page, abstract verbatim) | V |
| TrajOpt: sequential convex optimization, hinge loss on signed distance, continuous-time swept-volume collision checking; faster than OMPL planners and CHOMP, solved more problems, higher-quality paths | schulman-2013 (RSS p31 PDF, abstract and sec. IV-V verbatim) | V |
| Trajectory optimization finds local minima and needs an initial guess; standard pipeline pairs a sampling planner with refinement | consistent with ratliff-2009 / schulman-2013 framings | V |
| Demo scene: 2D, 100x64 world, 5 obstacles, one accepted extension per iteration from a fixed seed | components/interactive/rrt-explorer.tsx (internal) | V |

### control.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| More than 95% of all industrial control problems are solved by PID control | astrom-murray-2008 (FBS2e ch. 1, verbatim) | V |
| Qualifier on the D term | astrom-murray-2008 ("many ... are actually PI") | C ("most" -> "many") |
| P reacts to the present error, I accounts for the past, D is a linear extrapolation into the future | astrom-murray-2008 ch. 1 (verbatim structure) | V |
| Ziegler-Nichols 1942: oscillate under P alone, back off from critical gain and period by fixed fractions | ziegler-nichols-1942 | V |
| Pendulum plant theta-doubledot = (g/l) sin theta + (u + tau_bias)/(m l^2) | tedrake-underactuated; components/interactive/pendulum-controller.tsx (internal) | V |
| Linearized about upright, stable only when K_p > m g l (9.81 in slider units) | linearization checked symbolically; component threshold 9.81 (internal) | V |
| LQR: K = R^-1 B^T P with the displayed algebraic Riccati equation; Kalman's 1960 formulation | kalman-1960; astrom-murray-2008 | V |
| LQR on the linearized pendulum is a PD controller; swing-up needs energy shaping with LQR at the top | tedrake-underactuated | V |
| MPC receding-horizon form with constraints; stability theory (terminal costs/sets) consolidated by Mayne et al. 2000 | mayne-2000 (title: "Constrained model predictive control: Stability and optimality") | V |
| MPC grew out of refinery practice in the 1970s-80s | garcia-1989 | V |
| By 2003 a vendor survey counted thousands of installed applications, concentrated in refining and petrochemicals | qin-badgwell-2003 (survey reports "more than 4600 total MPC applications"; refining the largest single block) | V |
| Di Carlo 2018: single rigid body with contact forces as decision variables; horizons up to 0.5 s; QP solved in under 1 ms at 20-30 Hz; one gain set stand to gallop; estimation/swing/impedance at 1 kHz | di-carlo-2018 (MIT DSpace PDF, abstract + sec. V + Fig. 2 caption, verbatim) | V |
| Stat "whole-body layer 1 kHz" note | di-carlo-2018 | C ("500-1000 Hz band" unsourced -> Di Carlo's loops) |
| mujoco-ilqr-2026: plain iLQR + MuJoCo dynamics + finite-difference derivatives runs whole-body MPC in real time on quadrupeds and a full-size humanoid, few sim-to-real accommodations | mujoco-ilqr-2026 (arXiv:2503.04613 abs, verbatim) | V |
| Closing gloss on that baseline | mujoco-ilqr-2026 ("very simple approach", "easy-to-reproduce hardware baseline") | C ("first-year-implementable" -> paper's framing) |
| Khatib 1987 operational space: Lambda(x) x-doubledot + mu + p = F at the end-effector | khatib-1987 | C ("and the center of mass" dropped; CoM tasks belong to the later whole-body line) |
| Sentis-Khatib 2005: hierarchy of tasks, balance and contact constraints first | sentis-khatib-2005 (title + canonical content) | V |
| Whole-body QP form: decision vars q-doubledot/tau/f, dynamics equality, torque bounds, friction cones | standard modern WBC form, checked symbolically | V |
| Boston Dynamics integrated RL into Spot's existing MPC stack rather than replacing it | bd-spot-rl-2024 (blog: "we've integrated reinforcement learning into Spot's locomotion control system"; hybrid MPC + learned policy) | V |

### state-estimation.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| Bayes filter predict/update recursions as displayed | thrun-2005 (Probabilistic Robotics ch. 2, exact form) | V |
| Kalman filter linear-Gaussian models; predict/update equations and gain as displayed | kalman-1960-filter; thrun-2005 ch. 3 | V |
| Minimum-variance under Gaussian assumptions; best linear estimator under merely white noise via the projection derivation | kalman-1960-filter (standard property of the 1960 derivation) | V |
| Schmidt's Ames group developed the recursion into Apollo's navigation method; McGee-Schmidt 1985 is NASA's history of that adoption | mcgee-schmidt-1985 (NASA TM-86847; "Dr. Schmidt and his staff of researchers at Ames") | V |
| Relinearizing about the current estimate (not a precomputed nominal) was the modification that made the filter practical | mcgee-schmidt-1985 ("it soon became apparent that a relinearization about the current estimated state might offer substantial advantages") | V |
| EKF recursions through Jacobians G_t, H_t as displayed | thrun-2005 ch. 3 | V |
| EKF failure mode: covariance and true error part ways under strong nonlinearity | thrun-2005 / standard | V |
| Smith, Self, Cheeseman on covariance structure of spatial estimates | smith-1990 (title: "Estimating Uncertain Spatial Relationships in Robotics") | V |
| UKF: deterministically chosen sample points pushed through the true nonlinearity | julier-uhlmann-1997 | V |
| Kschischang, Frey, Loeliger 2001 unified inference on factor graphs under the sum-product algorithm | kschischang-2001 (title: "Factor Graphs and the Sum-Product Algorithm") | V |
| Dellaert-Kaess 2006: SLAM as sparse linear algebra, factored once in square-root form | dellaert-kaess-2006 (title: "Square Root SAM") | V |
| iSAM updates only the part of the factorization a new measurement touches | kaess-2008 (title: "iSAM: Incremental Smoothing and Mapping") | V |
| iSAM2 organizes the graph into the Bayes tree so updates stay local | kaess-2012 (title: "iSAM2: Incremental smoothing and mapping using the Bayes tree") | V |
| GTSAM is the reference implementation | gtsam-2026 | V |
| Forster et al. on-manifold preintegration collapses high-rate IMU data between keyframes into one factor | forster-2017 (title: "On-Manifold Preintegration for Real-Time Visual-Inertial Odometry") | V |
| Cadena survey: SLAM's 1990s EKF era displaced by factor-graph smoothing; relinearization impossible once the past is marginalized | cadena-2016 (survey's past/present structure; the marginalization point is the standard smoothing argument) | V |
| Tracker lab: ~1-in-5 dropped readings, seed-fixed world, sliders set believed noise, defaults matched to truth | components/interactive/kalman-tracker.tsx (internal) | V |

### grasp-planning.mdx

| Claim | Source checked | Verdict |
| --- | --- | --- |
| Coulomb friction cone norm(f^t) <= mu f^n; half-angle arctan mu; polyhedral approximation | murray-li-sastry-1994 ch. 5; prattichizzo-trinkle-2016 | V |
| Soft-finger contact adds a bounded torsional channel | murray-li-sastry-1994 | V |
| Cutkosky taxonomy: power grasps vs precision grasps | cutkosky-1989 (title + canonical content) | V |
| Wrench stack [f ; r x f]; planar 3-vector (f_x, f_y, tau) | murray-li-sastry-1994 | V |
| Grasp wrench space = convex hull of primitive cone-edge wrenches at unit normal force | murray-li-sastry-1994; bicchi-kumar-2000 | V |
| Force closure iff the origin lies strictly inside the hull | nguyen-1988; murray-li-sastry-1994 | V |
| Form-closure finger counts and their attribution | markenscoff-1990 (SAGE abstract, verbatim), mishra-1987 (Springer abstract, verbatim), murray-li-sastry-1994 Table 5.3 | C (lower bound re-attributed to Reuleaux/Somoff via MNP; sufficiency numbers corrected to MNP's actual results; MSS re-scoped to its real contribution; bicchi-1995 removed) |
| With friction, 3 planar and 4 spatial contacts are necessary and sufficient | markenscoff-1990 (abstract, verbatim); murray-li-sastry-1994 Table 5.3 | V |
| Nguyen's antipodal theorem: planar two-finger frictional grasp is force closure iff the connecting line lies strictly inside both friction cones | nguyen-1988; murray-li-sastry-1994 Thm 5.6 | V |
| Ferrari-Canny epsilon = radius of the largest origin-centered ball in the hull = distance to the nearest facet; worst-case disturbance per unit normal force | ferrari-canny-1992 (via roa-suarez-2015 review's definition and standard usage) | V |
| Roa-Suarez caveat: epsilon depends on the torque reference frame and the force/moment scaling | roa-suarez-2015 (PMC full text) | V |
| Lab defaults and walkthrough: tripod [0.125, 0.875, 0.625] at mu 0.7 is force closure; top+right pair fails (45 deg vs arctan 0.7 ~ 35 deg); bottom-antipodal pair recovers; epsilon falls with mu | lib/grasp.ts, components/interactive/grasp-wrench-lab.tsx, tests/e2e/grasp-planning.spec.ts (internal) | V |
| Dex-Net 2.0: 6.7M synthetic grasps scored with a robust epsilon metric, GQ-CNN from depth, 93% on 8 known adversarial objects, 99% precision on 40 novel household objects | dexnet-2-2017 (arXiv:1703.09312 abs, verbatim figures) | V |

### perception.mdx

Audited 2026-09-06 (brand-v2 editorial reseal, `brand-v2-article-truth-and-audit-reseal`).
Method: properties P1-P5, every cited source fetched live and read; verdicts follow
this ledger's conventions.

| Claim | Source checked | Verdict |
| --- | --- | --- |
| Three stages contribute a positioning error at the gripper (hand-eye, depth, pose); two of them are fixed offsets | lib/perception-error.ts `composeBudget`, `depthErrorMm` range-independent, `poseMm` direct (internal) | V |
| The three errors are independent and compose in quadrature rather than adding | lib/perception-error.ts (`e_total = sqrt(handEye^2 + depth^2 + pose^2)`) (internal) | V |
| The clearance band is a parallel-jaw gripper's lateral slack | lib/perception-error.ts `CLEARANCE_MM = 15` (90 mm opening around a 60 mm part) (internal) | V |
| "even a well-calibrated pipeline sits close to it" | lib/perception-error.ts `DEFAULT_PARAMS`: 4.36 + 10 + 3 mm composes to 11.32 mm against the 15 mm band (internal) | V |
| Assembly results in this literature are reported at 0.5 mm clearance | play2perfect-2026 (arXiv 2606.26428 abs, verbatim: "60% success on tight insertions with only 0.5 mm contact clearance") | V |
| That is "an order of magnitude below what a vision chain delivers alone" | play2perfect-2026 (0.5 mm) vs lib/perception-error.ts default composed total 11.32 mm, a factor of 23 (internal) | V |
| Half a degree of hand-eye is invisible at 15 cm and dominates at long standoff | lib/perception-error.ts: 1.31 mm at 0.15 m (1.7% of variance) vs 13.09 mm at the 1.5 m slider maximum (61% of variance) (internal) | V (at 0.5 deg on an opaque target the instrument's own verdict word at 1.5 m is "marginal", not "will jam"; the composed total does clear the clearance band) |
| Stat "Zhang calibration / 2000 / intrinsics from a planar target at unknown orientations" | zhang-2000-calibration (MSR-TR-98-71 full text, the TPAMI paper's text: "a planar pattern shown at a few (at least two) different orientations... The motion need not be known") | V |
| Stat "hand-eye (AX = XB) / 1989 / Tsai and Lenz pose the camera-to-robot transform" | tsai-lenz-1989 (IEEE Xplore abstract: "position and orientation of a camera relative to the last joint of a robot manipulator in an eye-on-hand configuration") | C ("Tsai and Lenz pose the camera-to-robot transform" -> "Tsai and Lenz solve the camera-to-gripper transform"; the paper solves camera-to-gripper, and the posing of the AX=XB form is not theirs alone) |
| Stat "visual servoing / 1992 / Espiau, Chaumette and Rives, closing on image features" | espiau-1992 (Crossref: IEEE T-RA 8(3):313-326, June 1992; HAL abstract) | V |
| Stat "promptable masks / 2023 / Segment Anything, trained on over a billion masks" | segment-anything-2023 (arXiv 2304.02643 abs: "over 1 billion masks on 11M... images") | V |
| Zhang: planar target at several arbitrary orientations, none of them measured | zhang-2000-calibration ("only requires the camera to observe a planar pattern shown at a few (at least two) different orientations... The motion need not be known") | V |
| Zhang: closed-form solution then nonlinear refinement recovers intrinsics, each view's pose and radial distortion | zhang-2000-calibration ("Radial lens distortion is modeled. The proposed procedure consists of a closed-form solution, followed by a nonlinear refinement based on the maximum likelihood criterion") | V |
| Zhang displaced the fixtures that came before it | zhang-2000-calibration ("Compared with classical techniques which use expensive equipment such as two or three orthogonal planes, the proposed technique is easy to use and flexible") | V |
| "Zhang's 2000 method" dates the technique to the cited publication | Crossref 10.1109/34.888718 (TPAMI 22(11):1330-1334, 2000) | V (the technique first appeared as MSR-TR-98-71 in 1998; the registry deliberately cites the 2000 journal version, and the article follows the registry) |
| Tsai and Lenz "posed it in 1989 in the form still used" (AX = XB) | tsai-lenz-1989 (IEEE abstract claims only a "novel technique... aimed at simplicity, efficiency, and accuracy"); Horaud-Dornaika, IJRR 14(3), 1995, lists the AX=XB form as shared by "(Shiu and Ahmad 1989), (Tsai and Lenz 1989), (Chou and Kamel 1991), (Chen 1991), (Wang 1992)"; Shiu-Ahmad, IEEE T-RA 5(1):16-29, Feb 1989, is titled "...Homogeneous Transform Equations of the Form AX = XB" and predates Tsai-Lenz (5(3):345-358, June 1989) in the same journal | C ("Tsai and Lenz posed it in 1989 in the form still used" -> "The 1989 papers on it share one form... Tsai and Lenz gave the efficient closed-form technique still used"; Shiu and Ahmad are not in the citation registry, so the priority claim was weakened rather than re-cited) |
| Hand-eye protocol: robot moves through known motions while the camera watches a static target | tsai-lenz-1989 (abstract: "The robot makes a series of automatically planned movements with a camera rigidly mounted at the gripper. At the end of each move, it takes a total of 90 ms to grab an image, extract image feature coordinates, and perform camera extrinsic calibration") | V |
| Solve rotation first, then translation, from the accumulated constraints | Horaud-Dornaika IJRR 1995 sec. 3, describing the Tsai-Lenz linear method (rotation from eq. 18, then translation from eq. 16); "the classical linear method developed by (Tsai and Lenz 1989)" | V (the Tsai-Lenz full text is paywalled; the mechanism was confirmed from the peer-reviewed IJRR account of that method, not from the cited document itself) |
| Hand-eye rotation costs $e_\theta(d) = d \tan \theta$; 1 deg is about 1.7 mm at 10 cm and 17 mm at 1 m | Checked symbolically (tan 1 deg = 0.017455; x100 mm = 1.75 mm, x1000 mm = 17.45 mm); matches lib/perception-error.ts `handEyeErrorMm` (internal) | V |
| Reference stereo camera publishes Z-accuracy of +/- 2% of range within 80% of its field of view at HD resolution | realsense-d400-datasheet-2026 (doc 337029-017, Table 4-15: Z-accuracy +/- 2% for D410/D415 and D43x at "<= 2 Meters and 80% ROI, HD Resolution", D455 at <= 4 m, D405 at <= 0.5 m; sec. 4.7 defines the 80% ROI) | C (the spec's range bound was missing: "of range within 80 percent" -> "of range out to 2 m, within 80 percent"; 2 m is the bound for the D410/D415/D43x line the repo's own `PUBLISHED_DEPTH_SPEC_PCT` comment cites) |
| Stereo depth error scales as the square of distance; the advice is to get as close as the minimum operating distance allows | realsense-tuning-2026 (verbatim: "The depth error scales as the square of the distance away. So where at all possible, try to get as close to the object as possible, but not so close that you are within the minimum operating distance, the MinZ") | V |
| A pattern projector is the standard mitigation, painting texture onto surfaces that have none | keselman-2017-realsense (arXiv 1705.05548 sec. 3.3.2: "an infrared texture projector"; sec. 1-2 on "solving depth on texture-less surfaces") | V |
| Industrial structured-light scanner publishes 0.200 mm calibration accuracy and 0.190 mm temporal noise, both 1 sigma, over 870 to 2150 mm, at 250 to 2750 ms | photoneo-phoxi-l-2026 (datasheet table, verbatim: "Calibration accuracy (1 sigma) 0.200 mm / Temporal noise (1 sigma) 0.190 mm / Scanning range 870 - 2150 mm / Scanning time 250 - 2750 ms") | V |
| The PhoXi L belongs to the structured-light family | photoneo-phoxi-l-2026 does not state the sensing principle on the cited product page; Photoneo's own wiki ("Photoneo 3D scanners work on the principle of structured light projection") and 3D Sensors User Manual ("Parallel Structured Light technology") confirm it | V (family label is correct but is not stated by the page the article cites) |
| Microsoft's time-of-flight documentation enumerates five invalidation causes: outside the active illumination mask, saturated IR signal, low IR signal, filter outlier, multi-path interference | azure-kinect-depth-docs-2026 (verbatim list under "Invalidation"; invalid pixels returned as depth 0) | V |
| Corners are the named common multi-path case (light bounces off one wall onto the other); object edges are the named mixed-signal case | azure-kinect-depth-docs-2026 (verbatim: "A common case... is in corners. Because of the scene geometry, the IR light from the camera reflected off one wall and onto the other"; "Another common case of multipath is pixels that contain the mixed signal from foreground and background (such as around object edges)") | V |
| Transparent objects "often appear as noisy or distorted approximations of the surfaces that lie behind them" | cleargrasp-2020 (arXiv 1910.02550 abs, verbatim) | V |
| ClearGrasp infers surface normals, transparent-surface masks and occlusion boundaries, then replaces the depth the sensor returned | cleargrasp-2020 (abs: "infer surface normals, masks of transparent surfaces, and occlusion boundaries"; sec. III-A: "use it to remove [transparent-surface depth]", "the global optimization algorithm fills in the removed depth using the predicted normals") | V |
| The stereo datasheet states that specular reflections may cause image saturation on the standard product line | realsense-d400-datasheet-2026 (Table 3-50, D400 vs D400f row "Specular reflections": D400 "May cause image saturation", D400f "Saturation mitigated") | V |
| Dark surfaces: low-IR-signal invalidation on time of flight; on stereo, image quality drives depth quality and low light produces poor images | azure-kinect-depth-docs-2026 ("Invalidation can also occur when the IR signal isn't strong enough to generate depth"); realsense-tuning-2026 ("the depth quality in the RealSense D4xx is directly related to the quality of the input images"; cameras "give poor quality grainy images under low light conditions") | V |
| Wire grids and fences are the canonical repetitive-structure case; matching becomes ambiguous between two equally good matches | realsense-tuning-2026 (verbatim: "If there are repetitive structures in the scene, like fences or wire-grids, this determination can become ambiguous... if the best match is of similar quality to the second best match") | V |
| A surface invalidated from one viewpoint may be visible from another, which is why multi-view capture is the answer | azure-kinect-depth-docs-2026 (verbatim: "surfaces invalidated from one perspective may be visible from another") | V (the doc demonstrates this for multi-path invalidation rather than for self-occlusion; the viewpoint-dependence claim itself is the doc's) |
| The 2 percent and the 0.200 mm "are measured against cooperative matte targets, which is the condition every depth spec is measured under" | realsense-d400-datasheet-2026 (Table 4-15 note 4, verbatim: "All other models are active and measured using a texture-less (white) target with default laser power (150mW) and auto exposure enabled"; D405 uses a textured target at ~250 Lux); photoneo-phoxi-l-2026 publishes no target condition | C (rewritten to what the sources state: "The 2 percent is measured against a texture-less white target with the laser projector at default power, and the 0.200 mm publishes no target condition at all", with both citations attached; "cooperative matte" and the "every depth spec" generalisation are not stated by any cited source) |
| No datasheet in this list publishes an accuracy figure for a transparent or a specular surface, so that figure is not disclosed | realsense-d400-datasheet-2026 (specular treated qualitatively in Table 3-50 only; no per-material accuracy), photoneo-phoxi-l-2026, azure-kinect-depth-docs-2026 (invalidation causes only) | V (P4: absent-but-unpublished rendered as "not disclosed", not guessed) |
| PointNet: shared per-point encoder and a symmetric pooling function, for ordering invariance | pointnet-2017 (arXiv 1612.00593 sec. 4.2: "the max pooling layer as a symmetric function to aggregate information"; per-point "shared" MLP in Fig. 2; abstract: "well respects the permutation invariance of points in the input") | V |
| PointNet++ added a hierarchy of local neighbourhoods so local geometry survives the pooling | pointnet-plus-plus-2017 (abs: "a hierarchical neural network that applies PointNet recursively on a nested partitioning of the input point set... learn local features with increasing contextual scales") | V |
| Grounding DINO fuses language into a closed-set detector at three points, so a category name or a referring expression is a valid query | grounding-dino-2024 (abs: "we conceptually divide a closed-set detector into three phases and propose a tight fusion solution, which includes a feature enhancer, a language-guided query selection, and a cross-modality decoder"; "human inputs such as category names or referring expressions") | V |
| Grounding DINO reports 52.5 AP on COCO with no COCO training data | grounding-dino-2024 (abs, verbatim: "achieves a 52.5 AP on the COCO detection zero-shot transfer benchmark, i.e., without any training data from COCO") | V |
| DINOv2 trains general visual features self-supervised at scale and they transfer without fine-tuning | dinov2-2023 (abs: "all-purpose visual features, i.e., features that work across image distributions and tasks without finetuning"; "existing pretraining methods, especially self-supervised methods, can produce such features") | V |
| Segment Anything is trained on over a billion masks so that a point, a box or a rough mask produces the corresponding mask, transferring zero-shot to unseen image distributions | segment-anything-2023 (abs: "over 1 billion masks on 11M... images"; "designed and trained to be promptable, so it can transfer zero-shot to new image distributions and tasks"; sec. 2: "a prompt can be a set of foreground/background points, a rough box or mask, free-form text") | V |
| SAM 2 carries the interface across video with a streaming memory, better video accuracy at three times fewer interactions, six times faster than SAM on images | sam2-2024 (abs, verbatim: "a simple transformer architecture with streaming memory"; "better accuracy, using 3x fewer interactions"; "more accurate and 6x faster than the Segment Anything Model (SAM)") | V |
| MOKA annotates an image with candidate marks and asks a VLM to pick grasp, function and target keypoints | moka-2024 (arXiv 2403.03174 sec. III-C and the prompt appendix: "grasp keypoint", "function keypoint", "target keypoint" selected from candidate marks P[i]/Q[i]; abs: "annotates marks on images") | V |
| ReKep has a model write constraint functions over semantic keypoints | rekep-2024 (abs: "expressed as Python functions mapping a set of 3D keypoints in the environment to a numerical cost"; "leverages large vision models and vision-language models to produce ReKep from free-form language instructions") | V |
| RoboPoint is fine-tuned to predict spatial affordance points directly | robopoint-2024 (abs: "instruction-tunes VLMs to robotic domains... we train RoboPoint, a VLM that predicts image keypoint affordances given language instructions") | V |
| Dense Object Nets: self-supervised per-pixel descriptor, consistent across viewpoints and deformations, trained in about twenty minutes per object class | dense-object-nets-2018 (abs: "trained quickly (approximately 20 minutes)"; sec. 5: "the entire training for a new object can take 20 minutes") | C ("per object class" -> "per object"; the 20-minute figure is per object, and class-general descriptors are a separate contribution of the paper) |
| Dex-Net 2.0 trains a grasp-quality network on 6.7 million synthetic depth images and point-grasp pairs and plans directly on the depth image | dexnet-2-2017 (arXiv 1703.09312 abs: "a synthetic dataset of 6.7 million point clouds, grasps, and analytic grasp metrics"; the GQ-CNN "predicts the probability of success of grasps from depth images") | C ("6.7 million synthetic depth images and point-grasp pairs and plans directly on the depth image" -> "6.7 million synthetic point clouds, grasps and analytic grasp metrics, and predicts grasp success directly from the depth image") |
| PoseCNN localises each object's centre, predicts its distance, regresses a quaternion, with a loss for symmetric objects | posecnn-2018 (abs, verbatim: "estimates the 3D translation of an object by localizing its center in the image and predicting its distance from the camera. The 3D rotation... by regressing to a quaternion representation... a novel loss function that enables PoseCNN to handle symmetric objects") | V |
| YCB-Video: 21 objects, 92 videos, 133,827 frames | posecnn-2018 (abs, verbatim: "accurate 6D poses of 21 objects from the YCB dataset observed in 92 videos with 133,827 frames") | V |
| MegaPose estimates novel-object pose by render-and-compare against a CAD model supplied at test time | megapose-2022 (abs: "At inference time, the method only assumes knowledge of (i) a region of interest... and (ii) a CAD model of the observed object... a 6D pose refiner based on a render&compare strategy") | V |
| FoundationPose unifies model-based and model-free operation: CAD model or a handful of reference images, comparable to instance-level methods despite assuming less | foundationpose-2024 (abs: "supporting both model-based and model-free setups... as long as its CAD model is given, or a small number of reference images are captured... achieves comparable results to instance-level methods despite the reduced assumptions") | V |
| ADD comes from the LINEMOD work: average the distance between corresponding model points under the estimated and true pose, correct below a fraction of the object's diameter | hinterstoisser-2012 (ACCV 2012 PDF, eq. 1 `m = avg_x norm((Rx+T) - (R~x+T~))`; "we say that the model was correctly detected and the pose correctly estimated if k_m d >= m where k_m is a chosen coefficient and d is the diameter of M"; Table 1 uses k_m = 0.1) | V |
| The symmetry-aware variant matches each point to its nearest neighbour instead of its counterpart, so a bowl is not scored wrong for an indistinguishable rotation | hinterstoisser-2012 (eq. 2 `m = avg_{x1} min_{x2} norm((Rx1+T) - (R~x2+T~))`, introduced for the ambiguous objects the paper names: "cup", "bowl", "box", "glue") | V |
| BOP: accuracy on 6-DoF localisation of seen objects improved by more than 50% since 2017, from 56.9 to 85.6 AR_C | bop-challenge-2023 (arXiv 2403.09799 abs, verbatim: "Since 2017, the accuracy of 6D localization of seen objects has improved by more than 50% (from 56.9 to 85.6 AR_C)") | V |
| The best 2023 unseen-object method, GenFlow, reached the accuracy of the best 2020 seen-object method, CosyPose, though noticeably slower | bop-challenge-2023 (abs, verbatim: "The best 2023 method for 6D localization of unseen objects (GenFlow) notably reached the accuracy of the best 2020 method for seen objects (CosyPose), although being noticeably slower") | V |
| Espiau, Chaumette and Rives formulated visual servoing as a task function with an interaction matrix relating feature velocity to camera velocity | espiau-1992 (HAL abstract: "The Interaction Screw is thus defined in a general way, and the application to images follows. Starting from the concept of task function, the general framework of the control is then described"); chaumette-hutchinson-2006 eq. 1 `s-dot = L_s v_c` | V |
| A calibration error bends the path the camera takes while the final image error still converges | chaumette-hutchinson-2006 (verbatim: "this allows IBVS to be remarkably robust to errors in calibration and image noise. However... the camera motion may follow unpredictable, often suboptimal [trajectories]") | V |
| The two-part tutorial separates basic image-based and position-based schemes from advanced stability treatment and known failure modes | chaumette-hutchinson-2006 (Part I: "the two archetypal visual servo control schemes: image-based and position-based visual servo control... motivating the second article"); chaumette-hutchinson-2007 (Part II: local minima, stability under calibration error, switching and planning schemes) | V |
| Target features must stay in view for the whole motion | chaumette-hutchinson-2007 (Part II, sec. on performance optimization and planning: keeping features "in the field of view as far as possible", "ensure the visibility of the target observed") | V |
| Six subsystems, matching the six named stages | Article-internal: the six section stages are camera calibration, hand-eye calibration, depth, detection, segmentation, pose estimation; the closing paragraph's "six subsystems" and "which of these six stages" agree | V |

### scene-representation.mdx

Audited 2026-09-06 (brand-v2 editorial reseal, `brand-v2-article-truth-and-audit-reseal`).
Method: properties P1-P5, every cited source fetched live and read; verdicts follow
this ledger's conventions.

| Claim | Source checked | Verdict |
| --- | --- | --- |
| Bibliographic fidelity of all 23 cited registry entries: title, author list, year, venue | Crossref for the 11 DOI-backed entries (Moravec-Elfes, Curless-Levoy, KinectFusion, ORB-SLAM, ORB-SLAM3, DSO, Lowry, Sq-Root SAM, iSAM2, layered costmaps, Nav2); live arXiv abs pages for the 12 arXiv entries (1612.00593, 2003.08934, 2201.05989, 2308.04079, 2312.14132, 2406.09756, 1606.05830, 2110.14217, 2103.12352, 2112.12130, 2409.10161, 2411.11839, 2311.16038) | V |
| Point cloud is one 3D sample per returned ray, unordered, with no connectivity; a network reading one must be invariant to the ordering of its own input | pointnet-2017 (arXiv:1612.00593 abs: "directly consumes point clouds and well respects the permutation invariance of points in the input") | V |
| A region with no points might be empty or unobserved and the store cannot tell you which | pointnet-2017 ("irregular format"); lib/scene-representation.ts point-cloud entry (internal) | V |
| Moravec and Elfes accumulated wide-angle sonar returns into a map of empty and occupied volumes; each reading constrains both the volume the beam passed through and the volume that reflected it | moravec-elfes-1985 (CMU RI PDF, abstract: "empty and occupied volumes in a cone", "somewhere occupied and everywhere empty areas are represented") | V |
| A cell nobody has looked at is unknown, not free: the third state | moravec-elfes-1985 (abstract "probably occupied, probably unoccupied, and unknown areas"; sec. 4 "exactly zero represents unknown occupancy"; "A cell is considered UNKNOWN if no information concerning it is [available]") | V |
| Curless and Levoy fuse range images into a cumulative weighted signed distance function, surface recovered as the zero crossing | curless-levoy-1996 (SIGGRAPH PDF abstract; sec. 3 "extract an isosurface corresponding to D(x) = 0") | V |
| The signed distance is "negative behind the surface and positive in front of it", attributed to Curless-Levoy | curless-levoy-1996 sec. 4 and Fig. 6b: the empty region in front of the surface carries D(x) = Dmin (negative), the unseen region behind carries D(x) = Dmax (positive), with "Dmin and Dmax must be negative and positive, respectively"; the article's polarity is the KinectFusion convention, not Curless-Levoy's | C (sign clause removed from the Curless-Levoy sentence and restated on kinectfusion-2011, which does say "positive and increasing values moving from the visible surface into free space, and negative and decreasing values on the non-visible side") |
| KinectFusion made TSDF fusion real-time on a commodity depth camera | kinectfusion-2011 (ISMAR PDF abstract: "using only a moving low-cost depth camera and commodity graphics hardware"; sec. 3.3) | V |
| The truncated variant is the one robotics uses | curless-levoy-1996 ("we truncate the distance ramps and weights to the vicinity of the range points"); kinectfusion-2011 sec. 3.3 (TSDF) | V |
| Stored distance is the collision margin, field gradient is the surface normal, so a collision query is a lookup rather than a search | unit-gradient property of a signed distance function, checked symbolically; lib/scene-representation.ts tsdf capability notes (internal); consistent with schulman-2013's hinge loss on signed distance | V |
| A mesh costs a hole wherever nothing was observed, and filling it invents geometry | curless-levoy-1996 sec. 4 ("Unseen portions of the surface will appear as holes in the reconstruction"; hole fillers "offer a plausible way to plug these holes") | V |
| NeRF stores a scene as a network mapping position and viewing direction to density and view-dependent colour, rendered by classical volume rendering along camera rays; differentiability means posed photographs alone suffice | nerf-2020 (arXiv:2003.08934 abs, verbatim: "a single continuous 5D coordinate... volume density and view-dependent emitted radiance", "classic volume rendering techniques", "the only input required... is a set of images with known camera poses") | V |
| Instant NGP's multiresolution hash encoding collapsed training from hours to seconds | instant-ngp-2022 (abs "in a matter of seconds"; sec. 5.4 "NeRF, mip-NeRF, and NSVF, which all require on the order of hours to train... competitive with NeRF and NSVF after just 15 s of training") | V |
| Rendering in tens of milliseconds at 1920 by 1080 | instant-ngp-2022 (abs, verbatim: "rendering in tens of milliseconds at a resolution of 1920x1080") | V |
| 3D Gaussian splatting stores the scene as anisotropic Gaussians and projects them to the image plane, reaching radiance-field quality at real-time frame rates | 3dgs-2023 (abs "state-of-the-art visual quality... real-time (>= 30 fps) novel-view synthesis at 1080p"; sec. 3 "3D position, opacity alpha, anisotropic covariance, and spherical harmonic coefficients"; sec. 4 "projected to 2D splats allowing fast alpha-blending") | V |
| A Gaussian's opacity is a rendering weight rather than an occupancy probability, and there is no surface anywhere in the store | 3dgs-2023 (opacity alpha enters only through sorted alpha-blending in the tile rasteriser; no occupancy or surface term in the representation) | V |
| DUSt3R regresses pointmaps from image pairs with no camera intrinsics and no poses supplied, treating dense reconstruction as feed-forward prediction | dust3r-2024 (arXiv:2312.14132 abs, verbatim: "operating without prior information about camera calibration nor viewpoint poses", "cast the pairwise reconstruction problem as a regression of pointmaps") | V |
| MASt3R extends the same network with a dense local-feature head so matching is grounded in the same 3D prediction | mast3r-2024 (arXiv:2406.09756 abs: "augment the DUSt3R network with a new head that outputs dense local features, trained with an additional matching loss") | V |
| This wiki's world-models taxonomy already calls a splat reconstruction a learned renderer whose appearance is learned and physics is not | content/world-models/taxonomy.mdx (internal, "A 3DGS reconstruction of a real scene is a learned renderer... Appearance is learned, physics is not") | V |
| SplatSim substitutes a splat reconstruction for the simulator's mesh renderer and reports zero-shot transfer of RGB manipulation policies | splatsim-2024 (arXiv:2409.10161 abs: "replacing traditional mesh representations with Gaussian Splats in simulators", "deploying them in the real world in a zero-shot manner") | V |
| RoboGSim packages the same reconstruct-compose-evaluate loop | robogsim-2024 (arXiv:2411.11839 abs: "Gaussian Reconstructor, Digital Twins Builder, Scene Composer, and Interactive Engine"; "an online, reproducible, and safe evaluation for different manipulation policies") | V |
| Dex-NeRF exploits the view-independent learned density to render transparency-aware depth and feeds that depth to a grasp planner | dex-nerf-2021 (arXiv:2110.14217 abs, verbatim: "We leverage NeRF's view-independent learned density... perform a transparency-aware depth-rendering that we feed into the Dex-Net grasp planner") | V |
| Objects a depth camera cannot see at all | dex-nerf-2021 sec. 6 ("the RealSense depth camera is unable to recover depth"; "The PhoXi camera is unable to recover any meaningful geometry"; "unable to compute the depth of most transparent objects") | V |
| OccWorld predicts how a 3D occupancy grid evolves rather than how pixels do, with competitive planning results and no instance or map supervision | occworld-2023 (arXiv:2311.16038 abs, verbatim: "learning a world model... in the 3D Occupancy space"; "produces competitive planning results without using instance and map supervision") | V |
| Cadena and colleagues give the decomposition: a front end that turns raw sensor data into constraints, a back end that optimises over them | cadena-2016 (sec. II "Anatomy of a Modern SLAM System": "The front-end abstracts sensor data into models that are amenable for estimation, while the back-end performs inference on the abstracted data produced by the front-end") | V |
| ORB-SLAM reuses one set of ORB features across tracking, mapping, relocalisation and loop closing | orb-slam-2015 (arXiv:1502.00956 abs, verbatim: "uses the same features for all SLAM tasks: tracking, mapping, relocalization, and loop closing") | V |
| ORB-SLAM3 adds visual-inertial operation and multiple maps, so a session that loses tracking starts a new map and merges it back when the place is recognised again | orb-slam3-2021 (arXiv:2007.11898 abs, verbatim: "when it gets lost, it starts a new map that will be seamlessly merged with previous maps when revisiting mapped areas") | V |
| A direct front end skips the detector and optimises photometric error over sampled pixels jointly with the geometry, which is DSO's formulation | dso-2018 (arXiv:1607.02565 abs, verbatim: "a fully direct probabilistic model (minimizing a photometric error) with consistent, joint optimization of all model parameters, including geometry... sampling pixels evenly throughout the images") | V |
| Direct methods use weakly textured regions a detector would ignore | dso-2018 (abs "edges or smooth intensity variations on mostly white walls"; sec. 4.3 "the ability to use data from edges and weakly textured surfaces") | V |
| Direct methods "need a photometric calibration to do it" | dso-2018 sec. 4.2: photometric calibration is verified to "in fact increase accuracy and robustness", and removing vignette and response calibration "does slightly decrease the overall accuracy and robustness"; DSO runs without one by setting t_i = 1 and lambda_a = lambda_b = 0, so the calibration is not a precondition | C ("need a photometric calibration to do it" -> "gain accuracy and robustness from a calibration of the camera's exposure, vignetting and response") |
| Odometry error grows without bound; loop closure redistributes accumulated drift across the whole trajectory | cadena-2016 (sec. I "if we sacrifice loop closures, SLAM reduces to odometry"; "The pose estimate obtained from wheel odometry quickly drifts"; Fig. 1 caption on recovering topology through loop closures) | V |
| Place recognition decides from sensor data alone whether this is somewhere the robot has been; the same place changes with viewpoint, illumination and season, and different places can look alike | lowry-2016-place-recognition (QUT eprint of IEEE T-RO 32(1):1-19, sec. I: "whether or not the current visual information is from a place already included in the map", "multiple places in an environment may look very similar, a problem known as perceptual aliasing", "may not always be revisited from the same viewpoint"; secs. IV-V on illumination and seasonal change) | V |
| A false match is worse than a missed one, because a wrong constraint corrupts the map it was supposed to correct | cadena-2016 sec. II-C ("erroneous measurement-state matches (outliers, or false positives), which in turn result in wrong estimates from the back-end", against false negatives costing only "estimation accuracy"; "the inclusion of a single outlier degrades the quality of the estimate, which in turn degrades the capability of discerning outliers later on") | V |
| Square Root SAM posed the whole trajectory and map as one sparse least-squares problem | dellaert-kaess-2006 (sec. 3 "SAM as a Least Squares Problem": MAP estimate "for the entire trajectory X and the map L", reduced to a "non-linear least-squares problem"; abs "yield the entire robot trajectory") | V |
| iSAM2's Bayes tree made the solution incremental, so a new measurement updates only the affected part of the factorisation | kaess-2012 (abs "a completely novel algorithm for sparse nonlinear incremental optimization, named iSAM2"; sec. 4 "often only affect small parts of the tree, and only those parts are re-calculated") | V |
| A sparse landmark map localises well and cannot be used for collision checking, while a dense volumetric map does the reverse at much greater cost | cadena-2016 sec. III-A/III-B ("dense representations attempt to provide high-resolution models of the 3D geometry; these models are more suitable for obstacle avoidance", against landmark-based sparse maps built from "discriminative features") | V |
| Lidar is weak in geometrically featureless corridors while cameras are information-dense | cadena-2016 sec. I ("two rooms may look identical for a 2D laser scanner (perceptual aliasing), while a camera may discern them from appearance cues") and sec. II-D (bag-of-words methods "not capable of handling severe illumination variations") | V |
| iMAP made a single multilayer perceptron the entire scene representation of a real-time SLAM system, trained online from a live RGB-D stream | imap-2021 (arXiv:2103.12352 abs, verbatim: "a multilayer perceptron (MLP) can serve as the only scene representation in a real-time SLAM system for a handheld RGB-D camera... trained in live operation without prior data") | V |
| NICE-SLAM replaced the monolithic network with hierarchical feature grids and "a pretrained decoder", scaling past one room | nice-slam-2022 (arXiv:2112.12130 abs "hierarchical scene representation... pre-trained geometric priors"; sec. 3.1 "combines multi-level grid features with pre-trained decoders", four decoders: coarse, mid, fine and colour; Fig. 1 "Multi-room Apartment 3D Reconstruction") | C ("a pretrained decoder" -> "pretrained decoders") |
| The costmap is occupancy from the map and the live sensors, inflated by the robot's footprint | nav2-2020 (sec. III-C: Static Layer "initializes occupancy information"; Inflation Layer "Inflates lethal obstacles in costmap with exponential decay by convolving the collision footprint of the robot") | V |
| Lu, Hershberger and Smart introduced the layered form: each concern a separate semantic layer writing into the composed grid rather than several subsystems overwriting one grid in place | layered-costmaps-2014 (IROS 2014 PDF abstract, verbatim: "separating the processing of costmap data into semantically-separated layers. Each layer tracks one type of obstacle or constraint, and then modifies a master costmap which is used for the path planning", against "a single costmap, in which the majority of information is stored in a single grid") | V |
| The layered form is now standard | nav2-2020 (sec. III-C "a layered costmap approach is used", citing Lu et al. 2014 as [9]) | V |
| A global planner searches the whole known map for a route; a local controller tracks it and reacts to live sensor data at control rate | nav2-2020 (sec. III-D, verbatim: "The task of the global planner is to compute the shortest route to a goal and the controller uses local information to compute the best local path and control signals") | V |
| The ROS 2 navigation stack is the reference implementation of the split | nav2-2020 (abs: Navigation2 "builds on the successful legacy of ROS Navigation", "one of the most popular navigation solutions"; planner and controller are separate task-specific servers) | V |
| Demo: the region behind the occluder is reached by no sensor ray; the occupancy grid holds it as an explicit unknown while the splat fills it at the same confidence as measured surface | components/interactive/scene-representation-ladder.tsx and lib/scene-representation.ts (internal: occupancy-grid `unobserved` = "An explicit unknown label, held apart from free and from occupied"; gaussian-splat `unobserved` = "rendered with the same confidence as measured geometry. The store has no unknown state to report") | V |
| Demo: moving the resolution slider changes storage cost but not what a representation can answer | lib/scene-representation.ts (internal: `capabilities` are per-representation constants, and `footprint(id, cellCm)` is the only function of the slider value) | V |
| No representation on the ladder answers free space, contact normal and novel view all well | lib/scene-representation.ts (internal capability table: point cloud no/partial/no, occupancy grid yes/no/no, TSDF yes/yes/partial, mesh partial/yes/partial, splat no/no/yes) | V |
| Registry-backed absence semantics: no `not disclosed` or `n/a` field is rendered anywhere in this article, and no rounded or inferred stand-in appears in place of one | content/classical/scene-representation.mdx (internal: the article carries no Stat notes, tables or data fields with absent values; every number in prose is a cited source figure) | V |
| Represented disagreement: the article's verdict that a radiance field is geometry for rendering is set against the named counter-position that a radiance field can supply geometry, with its own citation | dex-nerf-2021 (Ichnowski, Avigal, Kerr, Goldberg) carried in-text as "the honest bridge... the exception that proves the shape of the rule", plus splatsim-2024 and robogsim-2024 for the appropriate-use side | V |

## Rendering and gates

KaTeX: no math was edited; the existing e2e KaTeX checks (no raw
delimiters, rendered .katex nodes) cover these articles and were re-run for
grasp-planning after the prose edits. The currency-escaping class of bug
(unescaped `$` before a digit) is checked by the validate:content gate,
which passes.

Gates run after the corrections: `npm run typecheck`, `npm run lint`,
`npm run test` (unit), `npm run validate:content`, `npm run build`, and the
Playwright e2e spec for the edited article (tests/e2e/grasp-planning.spec.ts,
updated to drop the removed bicchi-1995 chip). All green at the time. The
command-level output was not preserved in this ledger, and the sessions
that ran them exited without submitting a handoff, so no such artifact
exists for a reader to consult (a 2026-08-18 review caught this ledger
pointing at one). The full gate set was re-run against the corrected tree
during the 2026-08-18 reconciliation sweep and the results are recorded in
the table below, in this file, rather than anywhere ephemeral.

## Verification gates (re-run 2026-08-18, reconciliation sweep)

| Gate | Command | Result |
| --- | --- | --- |
| Unit/component | `npm run test` | pass — 168 files, 1701 passed, 1 skipped (the pre-existing VAL-WIKI-012 vacuous-pass skip) |
| Types | `npm run typecheck` | pass (next-env.d.ts regenerated after the e2e run) |
| Lint | `npm run lint` | pass, no findings |
| Content | `npm run validate:content` | OK — 42 modules, 307 citations, 68 terms, 7 images, 111 companies; no-slop OK |
| Build | `npm run build` | pass — static export, 135 structured documents |
| Full e2e | `npm run test:e2e` (port 3200 killed first) | 572 passed / 0 failed / 1 skipped |


## Re-verification addendum (second session, 2026-08-17)

The session that produced the ledger above ended before recording its
handoff. A second session re-verified the banked work before vouching for
it, following the audit procedure for interrupted sessions: every
correction was re-fetched from the primary source, and a risk-weighted
sample of the verified rows (numbers, attributions, quoted phrases) was
re-checked independently.

Corrections re-fetched (all six stand):

- C1 grasp-planning form-closure rewrite: MNP 1990 SAGE abstract re-fetched
  verbatim (lower bound "pointed out by Reuleaux (1875) and Somoff
  (1897)"; sufficiency: four fingers planar with the circle exception,
  twelve spatial iff no rotational symmetry, seven under very general
  conditions; three planar / four spatial frictional contacts necessary
  and sufficient). MSS 1987 Springer abstract re-fetched (frictionless
  positive grips, tight bounds on the number of fingers, linear-time
  synthesis for polyhedral objects).
- C2 ACT: arXiv:2304.13705 HTML re-fetched ("two ViperX 6-DoF robot
  arms"; action space "the absolute joint positions for two robots, a
  14-dimensional vector").
- C3 Åström-Murray: FBS2e ch. 1 PDF re-fetched, verbatim: "More than 95%
  of all industrial control problems are solved by PID control, although
  many of these controllers are actually proportional-integral (PI)
  controllers".
- C4 Di Carlo 2018: MIT DSpace bitstream re-fetched (abstract: horizons
  "up to 0.5 seconds", QP "solved to optimality in under 1 ms at a rate
  of 20-30 Hz"; sec. V: "State estimation, swing leg planning, and leg
  impedance control happen at 1 kHz").
- C5 mujoco-iLQR: arXiv:2503.04613 re-fetched ("a very simple approach",
  "an easy-to-reproduce hardware baseline").
- C6 Khatib 1987: the PDF is a textless scan; page 1 OCR'd. The abstract
  frames the framework "with respect to the dynamic behavior of their
  end-effectors"; no center-of-mass claim appears.

Verified-row sample re-fetched (12 rows, weighted toward numbers,
attributions, and quoted phrases):

- karaman-frazzoli-2011 (arXiv:1105.1186 abs + HTML full text): RRT/PRM
  converge almost surely to non-optimal costs; RRT*/PRM* asymptotically
  optimal; per-iteration cost within a constant factor of RRT; the
  connection radius r(n) = gamma (log n / n)^{1/d} appears in the paper's
  own algorithm statements.
- gammell-2014 (arXiv:1404.2334 abs): informed sampling over the prolate
  hyperspheroid of states that can improve the current solution.
- dexnet-2-2017 (arXiv:1703.09312 abs): 6.7M synthetic grasps, GQ-CNN,
  93% on eight known adversarial objects, 99% precision on forty novel
  household objects, verbatim.
- qin-badgwell-2003 (publisher metadata + the paper's PDF): "More than
  4600 total MPC applications are reported in Tables 6 and 7"; "The
  largest single block of applications is in refining, which amounts to
  67% of all classified applications".
- mcgee-schmidt-1985 (NTRS record + PDF): the relinearization passage is
  verbatim ("it soon became apparent that a relinearization about the
  current estimated state might offer substantial advantages").
- isaac-gr00t-repo-2026 (repo README, N1.7 release notes): "relative
  end-effector action space shared across robot and human embodiments",
  verbatim.
- bd-spot-rl-2024 (Boston Dynamics blog): "we've integrated reinforcement
  learning into Spot's locomotion control system"; the hybrid MPC +
  learned-policy description matches.
- ratliff-2009 (CMU RI page): covariant gradient techniques; a standalone
  motion planner demonstrated on a 6-DOF arm and a walking quadruped.
- schulman-2013 (RSS proceedings p31 PDF): sequential convex optimization,
  hinge loss, continuous-time collision checking, and the comparative
  claims against OMPL and CHOMP, verbatim from the abstract.
- lavalle-1998 (Iowa State tech report; text layer garbled by a custom
  font encoding, so pages 2-3 were OCR'd): EXTEND is NEAREST_NEIGHBOR +
  SELECT_INPUT + NEW_STATE with a fixed step; "vertices with large Voronoi
  regions are more likely to be selected for expansion".
- nguyen-1988 (SAGE IJRR record, vol. 7(3):3-16, June 1988): bibliographic
  record exact; the abstract confirms the force-closure construction
  program and the equilibrium/force-closure equivalence the article's
  strictness discussion leans on.
- ferrari-canny-1992: IEEE Xplore bot-walls direct fetches (documented in
  the registry comment; CrossRef metadata verified 2026-08-11). The
  epsilon definition rendered in the article (largest origin-centered
  ball in the hull, equal to the minimum origin-to-facet distance) is the
  paper's definition as restated in roa-suarez-2015, which was read in
  full text.

Formula pass: every rendered formula in all five articles was re-checked
symbolically in the second session (DH transform expansion, Jacobian
column, DLS/LM step, C-space definitions, RRT extension, RRT* radius,
PID, pendulum dynamics and the K_p > m g l threshold, Riccati/LQR, MPC
form, Khatib's Lambda x-ddot + mu + p = F, whole-body QP, Bayes/Kalman/
EKF recursions, factor-graph least squares, Coulomb cone and half-angle,
wrench construction, hull closure condition, epsilon metric). All
correct. One notation observation: state-estimation.mdx uses Q_t for
process noise and R_t for measurement noise, the reverse of Thrun ch.
3's convention; the article is internally consistent, so this is noted
rather than corrected.

Adjacent surfaces checked: the glossary's form-closure and force-closure
entries (data/glossary.ts) restate the same finger counts and the Bicchi
equivalence; both are consistent with the corrected article, and the
glossary cites bicchi-1995 for its actual contribution (the form/force-
closure framework), which is unaffected by correction 1. lib/ik.ts
confirms the playground's 0.5 mm residual target (DEFAULT_TOLERANCE =
5e-4). No dangling bicchi-1995 references remain in content or tests.

Registry comment fixes applied by the second session (data/citations.ts,
comments only; no entry metadata changed):

- markenscoff-1990: the comment claimed "at most 6 contacts suffice in
  the plane and 12 in space", the exact claim correction 1 disproved (the
  planar 6 is the Steinitz counting bound in MLS Table 5.3, not an MNP
  result, and the unconditional 3D claim ignores MNP's rotational-
  symmetry condition). Comment replaced with MNP's actual results as
  stated in the verified abstract.
- mishra-1987: the comment framed the paper as "the classical lower-bound
  argument" for the 4-planar / 7-spatial counts; per MNP's own account
  that lower bound traces to Reuleaux (1875) and Somoff (1897). Comment
  re-scoped to the Springer abstract's claims (tight finger-count bounds
  for the equilibrium cases of frictionless positive grips, linear-time
  synthesis for polyhedral objects).
- qin-badgwell-2003: comment sharpened from "thousands of installed
  applications, the majority in refining and petrochemicals" to the
  paper's verbatim figure (>4,600 total applications; refining the
  largest single block at 67% of classified applications).
