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
