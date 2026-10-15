/**
 * Image registry: the single source of truth for every content image.
 *
 * MDX content references these via <Image id="..."/> (the
 * ImageRef resolver); scripts/validate-content.ts fails the build if a page
 * references an id that is not registered here, if a registered image is
 * referenced nowhere, or if an entry's licence is missing or outside the
 * permitted set. The /credits page
 * is generated from this registry, so it cannot drift from what renders.
 *
 * Licensing policy lives in library/imagery.md and is a hard gate. Every
 * entry below records the verbatim licence sentence read on the asset's own
 * page (the anti-fabrication rule) in a comment next to the entry. Never
 * invent a Commons licence. Official market-map marks with no reuse grant
 * use licence `unlicensed` or `unknown` and still name creator plus source.
 *
 * Market-map logos live in data/logo-images.ts (files under
 * public/images/logos/) and are concatenated here. Article photographs
 * stay in this file under public/images/. The market-map client reads
 * logos through data/logos.ts so it does not pull this registry.
 *
 * Type-only relative import so this file loads under plain node, Vitest,
 * and Next.js alike.
 */
import { LOGO_IMAGES } from './logo-images.ts';
import {
  CREDIT_NOUNS,
  LEGAL_BASIS_BY_LICENCE,
  LICENCE_LABELS,
  attributionSentence,
  isCompanyMarkFile,
  type FigureKind,
  type LegalBasis,
  type PreservationPolicy,
  type SiteImage,
} from './schemas/image.ts';

export type { SiteImage } from './schemas/image.ts';

const ARTICLE_IMAGES: SiteImage[] = [
  {
    id: 'atlas-darpa-frontview-2013',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: DARPA / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/atlas-darpa-frontview-2013.jpg',
    alt: 'The 2013 DARPA Atlas humanoid robot stands facing forward with its exposed metal frame, hydraulic lines, and stereo camera head visible.',
    caption:
      'The original Atlas humanoid, built for the 2013 DARPA Robotics Challenge: hydraulically actuated, tethered, with its frame and sensor head exposed. The electric Atlas discussed above is its clean-sheet successor.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Atlas_frontview_2013.jpg',
    creator: 'DARPA',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-USGov',
    retrieved: '2026-08-10',
    width: 1280,
    height: 1762,
    // Licence sentence read on the file page: "This image or file is a work
    // of a Defense Advanced Research Projects Agency (DARPA), an agency of
    // the United States Department of Defense, employee, taken or made as
    // part of that person's official duties. As a work of the U.S. federal
    // government, the image is in the public domain."
  },
  {
    id: 'puma-560-nasa-ames',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: NASA / Dominic Hart / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/puma-560-nasa-ames.jpg',
    alt: 'A stroboscopic NASA photograph shows a PUMA 560 robot arm in several successive positions as it moves small parts between fixtures on a table.',
    caption:
      'A PUMA 560 at NASA Ames, photographed in a stroboscopic exposure as it cycles through its workspace. The six-revolute PUMA layout is the canonical teaching example for the Denavit-Hartenberg convention.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Puma_Robotic_Arm_-_GPN-2000-001817.jpg',
    creator: 'NASA / Dominic Hart',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-USGov-NASA',
    retrieved: '2026-08-10',
    width: 1280,
    height: 1627,
    // Licence sentence read on the file page: "This file is in the public
    // domain in the United States because it was solely created by NASA."
  },
  {
    id: 'anymal-anybotics-2022',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: ANYbotics / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/anymal-anybotics-2022.jpg',
    alt: 'A red and grey ANYmal quadruped robot stands on a metal grate walkway inside an industrial facility, surrounded by pipes and machinery.',
    caption:
      'ANYmal, the ANYbotics quadruped behind the ETH Zurich locomotion lineage, on an industrial inspection floor. The actuator-network and terrain-curriculum results above all ran on this platform.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:ANYbotics_robot_dog_ANYmal.jpg',
    creator: 'ANYbotics',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-08-10',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 4.0 International
    // license." (author ANYbotics, own work).
  },
  {
    id: 'franka-emika-panda-cebit-2017',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Ims / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/franka-emika-panda-cebit-2017.jpg',
    alt: 'A white seven-axis Franka Emika Panda robot arm mounted on a demonstration table at CeBIT 2017, guided by hand above trays of small parts.',
    caption:
      'The Franka Emika Panda, the seven-DoF research arm, demonstrated at CeBIT 2017 with a human guiding it by hand.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Franka_Emika2.jpg',
    creator: 'Ims',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-08-10',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 4.0 International
    // license." (author Ims, own work, CeBIT 2017 Hannover).
  },
  {
    id: 'covariate-shift',
    figureKind: 'original-schematic',
    legalBasis: 'owned',
    attributionText:
      'Diagram: Robot Wiki contributors / Robot Wiki (original diagram). Licence: CC BY 4.0.',
    preservationPolicy: 'first-party-restyled-semantics-preserved',
    file: '/images/covariate-shift.svg',
    alt: 'Diagram of covariate shift: demonstration trajectories form a narrow corridor around the expert path, while the policy rollout starts inside the corridor and drifts outside it.',
    caption:
      'Demonstrations cover a narrow corridor of states around the expert path. The policy\'s first mistake takes it outside that corridor, where its next mistake is more likely. Deviation feeds itself.',
    sourceName: 'Robot Wiki (original diagram)',
    creator: 'Robot Wiki contributors',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-08-08',
    width: 640,
    height: 250,
    // Original SVG drawn for this site. Convention (library/imagery.md):
    // site-created diagrams carry no sourceUrl, because there is no
    // external original to link to; the credit names Robot Wiki as the
    // creator in text. The licence basis is the site's content licence
    // (CC BY 4.0, mission.md).
  },
  {
    id: 'temporal-ensembling',
    figureKind: 'original-schematic',
    legalBasis: 'owned',
    attributionText:
      'Diagram: Robot Wiki contributors / Robot Wiki (original diagram). Licence: CC BY 4.0.',
    preservationPolicy: 'first-party-restyled-semantics-preserved',
    file: '/images/temporal-ensembling.svg',
    alt: 'Diagram of temporal ensembling: three overlapping action chunks each contain a prediction for the same action a_t, and oldest-to-newest unnormalized weights are 1.00, 0.61, and 0.37 for illustrative m=0.5; the reference code uses m=0.01.',
    caption:
      'Three chunks issued at t-2, t-1, and t predict the current action. Oldest-to-newest raw weights are 1.00, 0.61, and 0.37 for illustrative m=0.5; divide by their sum before averaging. This emphasizes the reference convention: oldest gets the largest weight. The pinned ACT code uses m=0.01, not 0.5.',
    sourceName: 'Robot Wiki (original diagram)',
    creator: 'Robot Wiki contributors',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-08-07',
    width: 640,
    height: 250,
    // Original SVG drawn for this site; same no-sourceUrl convention as
    // covariate-shift above.
  },
  // BEGIN manipulation images (image brief, 2026-10-11)
  {
    id: 'aloha-2-workcell-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Tony Z. Zhao et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/aloha-2-workcell-2024.jpg',
    alt: 'A rendered ALOHA 2 workcell: two pairs of black robot arms facing each other across a table inside an aluminium frame with overhead cameras, with letters A, B and C marking measured segments.',
    caption:
      'ACT was introduced with ALOHA, a low-cost bimanual rig on which a person demonstrates by moving leader arms. A render of the ALOHA 2 workcell, with its frame segments labelled A, B and C.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2410.13126',
    creator: 'Tony Z. Zhao et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1390,
    height: 1248,
    // Licence read on the abstract page arxiv.org/abs/2410.13126 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "ALOHA Unleashed: A Simple Recipe for
    // Robot Dexterity", figure "ALOHA 2 workcell diagram (appendix)", file
    // figures/WorkcellVariance.png in the arXiv source (1390 x 1248 px);
    // saved at 1390 x 1248 px, JPEG quality 82, metadata stripped. No other
    // change.
  },
  {
    id: 'aloha-unleashed-tasks-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Tony Z. Zhao et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/aloha-unleashed-tasks-2024.jpg',
    alt: 'Five photographs of ALOHA 2 bimanual robot arms at work, labelled Robot Finger Replace, Shirt Hanging, Gear Insertion, Shoelace Tying and Kitchen Stacking.',
    caption:
      'Chunked policies now do dexterous bimanual work such as tying shoelaces and hanging shirts. ALOHA Unleashed collected over 26,000 demonstrations for these five tasks on ALOHA 2 and ran each predicted chunk open loop.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2410.13126',
    creator: 'Tony Z. Zhao et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 724,
    // Licence read on the abstract page arxiv.org/abs/2410.13126 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "ALOHA Unleashed: A Simple Recipe for
    // Robot Dexterity", figure "MainFigure (task overview)", rasterised from
    // figures/MainFigure.pdf in the arXiv source; trimmed of its white margin
    // to 3611 x 1634 px; resized to 1600 x 724 px, JPEG quality 82, metadata
    // stripped. No other change.
  },
  {
    id: 'action-space-study-platforms-2026',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Yuchun Feng et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/action-space-study-platforms-2026.jpg',
    alt: 'Photographs of two robot platforms, labelled AgileX PiPER Single/Dual Arm Platform and AIRBOT Platform, with arrows marking the head and wrist camera views.',
    caption:
      'The two arm platforms of an action-space study with more than 13,000 real rollouts and 500+ models. Predicting delta actions consistently helped; joint space favoured control stability and task space favoured generalisation.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2602.23408',
    creator: 'Yuchun Feng et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 855,
    // Licence read on the abstract page arxiv.org/abs/2602.23408 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Demystifying Action Space Design for
    // Robotic Manipulation Policies", figure "Overview of hardware setup for
    // real world experiments", file figure/hardware.png in the arXiv source;
    // trimmed of its white margin to 2581 x 1379 px; resized to 1600 x 855
    // px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'adaptive-compliance-tasks-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Yifan Hou et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/adaptive-compliance-tasks-2024.jpg',
    alt: 'Two photographs, each beside a line drawing: a robot arm pushes a blue box up against a block, with arrows marking a high stiffness K1 and a low stiffness K2, and two arms hold and wipe a white vase, with arrows marking compliance directions.',
    caption:
      "An impedance action sets the robot's stiffness in each direction as well as its goal. Adaptive Compliance Policy flips an item, soft (K2) along the push and stiff (K1) elsewhere, and wipes a vase with both arms compliant.",
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2410.09309',
    creator: 'Yifan Hou et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 431,
    // Licence read on the abstract page arxiv.org/abs/2410.09309 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Adaptive Compliance Policy: Learning
    // Approximate Compliance for Diffusion Guided Control", figure
    // "Compliance Requirements (teaser)", rasterised from
    // figures/complance-teaser-v5.pdf in the arXiv source; trimmed of its
    // white margin to 3615 x 973 px; resized to 1600 x 431 px, JPEG quality
    // 82, metadata stripped. No other change.
  },
  {
    id: 'droid-robot-platform-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Alexander Khazatsky et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/droid-robot-platform-2024.jpg',
    alt: 'A labelled photograph of the DROID data collection rig: a Franka Panda arm on a height-adjustable desk with two side-mounted Zed 2 cameras, a wrist camera and an Oculus Quest 2 headset with controllers.',
    caption:
      'Behavior cloning starts from demonstrations recorded on rigs like this one, where a person teleoperates the arm through a VR headset. DROID used this Franka Panda setup at every institution.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2403.12945',
    creator: 'Alexander Khazatsky et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1525,
    height: 1154,
    // Licence read on the abstract page arxiv.org/abs/2403.12945 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "DROID: A Large-Scale In-The-Wild Robot
    // Manipulation Dataset", figure "DROID robot platform", rasterised from
    // figures/droid_setup.pdf in the arXiv source; trimmed of its white
    // margin to 1525 x 1154 px; saved at 1525 x 1154 px, JPEG quality 82,
    // metadata stripped. No other change.
  },
  {
    id: 'navlab-1-5-cmu-2017',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Firefly4342 / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/navlab-1-5-cmu-2017.jpg',
    alt: 'Five Carnegie Mellon Navlab autonomous research vehicles parked in a row, from the first Navlab van in the back to the Navlab 5 minivan in front.',
    caption:
      'Behavior cloning began on the road: ALVINN learned to steer the Navlab van by watching a human driver. Navlab 1 (back) through Navlab 5 (front), built at Carnegie Mellon University from 1984 to 1995.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Navlab-1-5-autonomous-vehicles.jpg',
    creator: 'Firefly4342',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1500,
    height: 1000,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file is
    // licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author Firefly4342, own work, 2 March 2017).
    // The original 1500 x 1000 JPEG, shipped as served.
  },
  {
    id: 'octo-evaluation-setups-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Octo Model Team / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/octo-evaluation-setups-2024.jpg',
    alt: 'Nine photographs of robot setups: WidowX BridgeV2, UR5 Tabletop and RT-1 Robot grouped under 0-Shot Evaluation, and Berkeley Insert, Stanford Coffee, CMU Baking, Berkeley Pick-up, Berkeley Coke and Berkeley Bimanual grouped under Finetuning Evaluation.',
    caption:
      'Octo, an open-weights policy, was evaluated out of the box on three robot setups and fine-tuned on six more, some with new observations, action spaces or embodiments.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2405.12213',
    creator: 'Octo Model Team',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 438,
    // Licence read on the abstract page arxiv.org/abs/2405.12213 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Octo: An Open-Source Generalist Robot
    // Policy", figure "Evaluation setups", rasterised from
    // figures/eval_setups.pdf in the arXiv source; trimmed of its white
    // margin to 2079 x 569 px; resized to 1600 x 438 px, JPEG quality 82,
    // metadata stripped. No other change.
  },
  {
    id: 'roboarena-evaluation-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Pranav Atreya et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/roboarena-evaluation-2025.jpg',
    alt: 'A diagram of RoboArena: a pool of generalist policies feeds a ring of photographed robot workstations, each running pairwise comparisons on its own task, which aggregate into a ranked score table.',
    caption:
      'RoboArena ranks policies from double-blind pairwise trials that many evaluators run on their own scenes and tasks. More than 600 real-robot episodes on the DROID platform ranked seven generalist policies.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2506.18123',
    creator: 'Pranav Atreya et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 761,
    // Licence read on the abstract page arxiv.org/abs/2506.18123 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "RoboArena: Distributed Real-World
    // Evaluation of Generalist Robot Policies", figure "RoboArena overview",
    // rasterised from figures/roboarena_teaser.pdf in the arXiv source;
    // trimmed of its white margin to 3586 x 1705 px; resized to 1600 x 761
    // px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'gemini-robotics-apollo-franka-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Gemini Robotics Team / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/gemini-robotics-apollo-franka-2025.jpg',
    alt: 'Two rows of frames: an Apptronik Apollo humanoid robot packs a lunch bag, and a bi-arm industrial Franka setup fits a rubber band around a pulley system.',
    caption:
      'One Gemini Robotics model was fine-tuned to drive very different bodies, from the Apollo humanoid packing a lunch bag (top) to a bi-arm Franka fitting a rubber band around pulleys (bottom).',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2503.20020',
    creator: 'Gemini Robotics Team',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1201,
    height: 544,
    // Licence read on the abstract page arxiv.org/abs/2503.20020 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Gemini Robotics: Bringing AI into the
    // Physical World", figure "post-training embodiment", file
    // src/assets/actions/post-training-embodiment.jpeg in the arXiv source
    // (1201 x 544 px); saved at 1201 x 544 px, JPEG quality 82, metadata
    // stripped. No other change.
  },
  {
    id: 'open-x-embodiment-overview-2023',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Open X-Embodiment Collaboration / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/open-x-embodiment-overview-2023.jpg',
    alt: 'An infographic framed by robot dataset thumbnails reading 1M episodes from 311 scenes, 34 research labs across 21 institutions, 22 embodiments, 527 skills and 60 datasets.',
    caption:
      'Open X-Embodiment pooled robot data into one training set: 1M episodes from 60 datasets, 22 embodiments and 527 skills, contributed by 34 labs at 21 institutions.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2310.08864',
    creator: 'Open X-Embodiment Collaboration',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 490,
    // Licence read on the abstract page arxiv.org/abs/2310.08864 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Open X-Embodiment: Robotic Learning
    // Datasets and RT-X Models", figure "dataset overview", file
    // figures/data_vis_v3.jpg in the arXiv source (5604 x 1715 px); resized
    // to 1600 x 490 px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'egoscale-human-to-robot-2026',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Ruijie Zheng et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/egoscale-human-to-robot-2026.jpg',
    alt: 'A three-stage diagram with photographs: egocentric human videos of hands doing chores, paired human and robot play data, and a humanoid robot hand performing dexterous tasks after post-training.',
    caption:
      'EgoScale pretrains on human video, mid-trains on aligned human and robot play, then post-trains on robot tasks. The pretraining stage uses 20,854 hours of egocentric video with wrist motion and retargeted hand actions.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2602.16710',
    creator: 'Ruijie Zheng et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 750,
    // Licence read on the abstract page arxiv.org/abs/2602.16710 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "EgoScale: Scaling Dexterous
    // Manipulation with Diverse Egocentric Human Data", figure "two-stage
    // human-to-robot framework", rasterised from
    // assets/sources/figures/pull_figure.pdf in the arXiv source; trimmed of
    // its white margin to 3527 x 1653 px; resized to 1600 x 750 px, JPEG
    // quality 82, metadata stripped. No other change.
  },
  {
    id: 'phantom-human-video-robot-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Marion Lepert et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/phantom-human-video-robot-2025.jpg',
    alt: 'A pipeline of photographs: a human hand demonstrates a task, the hand is inpainted out of the video, a rendered robot gripper is overlaid in its place, and a real robot then performs the task.',
    caption:
      'Phantom trains a robot policy without robot data by erasing the human hand from demonstration videos and rendering a robot arm in its pose. The policy then deploys zero-shot on a real robot, with success up to 92%.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2503.00779',
    creator: 'Marion Lepert et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 725,
    // Licence read on the abstract page arxiv.org/abs/2503.00779 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Phantom: Training Robots Without Robots
    // Using Only Human Videos", figure "Overview of Phantom", file
    // figs/main.png in the arXiv source (2314 x 1048 px); resized to 1600 x
    // 725 px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'aloha-unleashed-shirt-rollout-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Tony Z. Zhao et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/aloha-unleashed-shirt-rollout-2024.jpg',
    alt: 'Six labelled frames of two robot arms hanging a red shirt: initial state, orient shirt, pick hanger, insert right collar, insert left collar and hang on rack.',
    caption:
      'A diffusion policy hangs a shirt on its own, a long-horizon task with a deformable object and several bimanual stages. Six frames of an autonomous ALOHA Unleashed rollout, from the initial state to the shirt on the rack.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2410.13126',
    creator: 'Tony Z. Zhao et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 816,
    // Licence read on the abstract page arxiv.org/abs/2410.13126 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "ALOHA Unleashed: A Simple Recipe for
    // Robot Dexterity", figure "Shirt Episode", rasterised from
    // figures/ShirtEpisode.pdf in the arXiv source; trimmed of its white
    // margin to 3617 x 1845 px; resized to 1600 x 816 px, JPEG quality 82,
    // metadata stripped. No other change.
  },
  {
    id: 'dp3-real-robot-setup-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Yanjie Ze et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/dp3-real-robot-setup-2024.jpg',
    alt: 'Two photographs: everyday objects on a wooden table with the letters DP3 spelled out, and a Franka arm with an Allegro hand and a RealSense L515 camera above a table.',
    caption:
      '3D Diffusion Policy swaps images for sparse point clouds from a single depth camera. Left, the everyday objects in its real tasks; right, a Franka arm with an Allegro hand under a RealSense L515.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2403.03954',
    creator: 'Yanjie Ze et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 484,
    // Licence read on the abstract page arxiv.org/abs/2403.03954 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "3D Diffusion Policy: Generalizable
    // Visuomotor Policy Learning via Simple 3D Representations", figure
    // "real-world setup", rasterised from figures/setup_figure.pdf in the
    // arXiv source; trimmed of its white margin to 3623 x 1095 px; resized to
    // 1600 x 484 px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'robocat-embodiments-2023',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Konstantinos Bousmalis et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/robocat-embodiments-2023.jpg',
    alt: 'Photographs of the robot arms RoboCat controls, each labelled with its action dimensions: Sawyer and Panda arms with parallel grippers seen in training, and a KUKA arm with a three-finger hand held out for fine-tuning.',
    caption:
      'An adaptation budget is part of a foundation claim: RoboCat learned Sawyer and Panda arms in training and met the KUKA arm with a three-finger hand only at fine-tuning, from 100 to 1,000 examples.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2306.11706',
    creator: 'Konstantinos Bousmalis et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 564,
    // Licence read on the abstract page arxiv.org/abs/2306.11706 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "RoboCat: A Self-Improving Generalist
    // Agent for Robotic Manipulation", figure "embodiments and control
    // modes", rasterised from images/embodiments.pdf in the arXiv source;
    // trimmed of its white margin to 3622 x 1276 px; resized to 1600 x 564
    // px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'gr00t-n1-gr1-tasks-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: NVIDIA et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/gr00t-n1-gr1-tasks-2025.jpg',
    alt: 'Rows of frames from a Fourier GR-1 humanoid robot at a wooden table handing objects between its hands, placing a peach in a bin and moving items onto plates and into baskets.',
    caption:
      'GR00T N1 runs a vision-language model at 10 Hz over a 120 Hz action module on the GR-1 humanoid. Frames from real rollouts: pretraining evaluations (top) and post-trained pick-and-place and articulated-object tasks (bottom).',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2503.14734',
    creator: 'NVIDIA et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 823,
    // Licence read on the abstract page arxiv.org/abs/2503.14734 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "GR00T N1: An Open Foundation Model for
    // Generalist Humanoid Robots", figure "Real-World Tasks", rasterised from
    // assets/real_gr1_task_figure.pdf in the arXiv source; trimmed of its
    // white margin to 3447 x 3205 px; cropped to the 3447 x 1772 px region at
    // (0, 0); resized to 1600 x 823 px, JPEG quality 82, metadata stripped.
    // No other change.
  },
  {
    id: 'cosmos-policy-aloha-2026',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Moo Jin Kim et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/cosmos-policy-aloha-2026.jpg',
    alt: 'Two rows of ALOHA robot frames with arrows between them: putting an object on a plate, folding a shirt, putting candies in a bowl and putting candy in a zip bag.',
    caption:
      'Cosmos Policy fine-tunes a pretrained video model into a robot policy, so a predictive model becomes the controller. Rollouts on four ALOHA tasks, from folding a shirt to putting candy in a zip bag.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2601.16163',
    creator: 'Moo Jin Kim et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 458,
    // Licence read on the abstract page arxiv.org/abs/2601.16163 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Cosmos Policy: Fine-Tuning Video Models
    // for Visuomotor Control and Planning", figure "Cosmos Policy in the
    // ALOHA robot tasks", file fig/cosmos_policy_aloha_rollouts.001.jpeg in
    // the arXiv source (4400 x 1260 px); resized to 1600 x 458 px, JPEG
    // quality 82, metadata stripped. No other change.
  },
  {
    id: 'gemini-robotics-aloha-dexterous-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Gemini Robotics Team / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/gemini-robotics-aloha-dexterous-2025.jpg',
    alt: 'Four rows of overhead frames of two robot grippers opening an eyeglasses case, pouring pulses, unfastening a file folder and wrapping a headphone wire on a cluttered table.',
    caption:
      'A vision-language-action model performs dexterous bimanual work in clutter. Gemini Robotics on ALOHA, top to bottom: open the eyeglasses case, pour pulses, unfasten a file folder and wrap a headphone wire.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2503.20020',
    creator: 'Gemini Robotics Team',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1347,
    height: 1055,
    // Licence read on the abstract page arxiv.org/abs/2503.20020 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Gemini Robotics: Bringing AI into the
    // Physical World", figure "dexterous manipulation rollouts", file
    // src/assets/actions/Actions-1-rollout.jpeg in the arXiv source (1347 x
    // 1055 px); saved at 1347 x 1055 px, JPEG quality 82, metadata stripped.
    // No other change.
  },
  {
    id: 'rt-h-language-corrections-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Suneel Belkhale et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/rt-h-language-corrections-2024.jpg',
    alt: 'Two rows of frames of a robot arm pouring from a paper cup into a bowl and wiping a table with a sponge, each labelled with language motions such as rotate arm left and move arm forward and left.',
    caption:
      'RT-H first predicts a language motion such as "rotate arm left", then the action, so a person can correct the motion in words. Frames from two unseen tasks, with and without such corrections.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2403.01823',
    creator: 'Suneel Belkhale et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 764,
    // Licence read on the abstract page arxiv.org/abs/2403.01823 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "RT-H: Action Hierarchies Using
    // Language", figure "generalization to unseen tasks", file
    // figures/new_tasks_v2.png in the arXiv source (1616 x 1528 px); cropped
    // to the 1616 x 772 px region at (0, 0); resized to 1600 x 764 px, JPEG
    // quality 82, metadata stripped. No other change.
  },
  {
    id: 'hamster-2d-paths-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Yi Li et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/hamster-2d-paths-2025.jpg',
    alt: 'Two pairs of photographs of real robot tabletop scenes, each with a coloured path drawn from the gripper towards its target: screwing a light bulb into a lamp, and pushing coloured buttons in order.',
    caption:
      "HAMSTER's high level draws a coarse 2D path for the gripper, and a low-level policy turns the path into motion. Paths predicted on real scenes run from blue to red; blue and red circles mark grasp and release.",
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2502.05485',
    creator: 'Yi Li et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 566,
    // Licence read on the abstract page arxiv.org/abs/2502.05485 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "HAMSTER: Hierarchical Action Models For
    // Open-World Robot Manipulation", figure "VLM generalization (panel c)",
    // rasterised from figs/fig5.pdf in the arXiv source; trimmed of its white
    // margin to 3579 x 678 px; cropped to the 1915 x 678 px region at (1664,
    // 0); resized to 1600 x 566 px, JPEG quality 82, metadata stripped. No
    // other change.
  },
  {
    id: 'pi0-fast-table-bussing-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Karl Pertsch et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/pi0-fast-table-bussing-2025.jpg',
    alt: 'A strip of frames from a robot camera showing a mobile robot clearing dishes, cups and trash from a table into a bin.',
    caption:
      'Table bussing is the task behind KI\'s training-cost result: a many-embodiment π0 generalist needed 7.5 times the training steps of π0.5 with KI to reach similar performance. Frames of the task from the FAST paper.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2501.09747',
    creator: 'Karl Pertsch et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1300,
    height: 487,
    // Licence read on the abstract page arxiv.org/abs/2501.09747 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "FAST: Efficient Action Tokenization for
    // Vision-Language-Action Models", figure "Table Bussing", file
    // figures/task_bus.jpeg in the arXiv source (1300 x 487 px); saved at
    // 1300 x 487 px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'pi06-box-building-2025',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Kevin Black et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/pi06-box-building-2025.jpg',
    alt: 'An overhead view of two robot arms folding a flat cardboard sheet into a box on a table.',
    caption:
      'π0.6, whose card lists a Gemma3 4B backbone with an insulated expert of about 860M parameters, building a box. Physical Intelligence used this task to test training-time real-time chunking.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2512.05964',
    creator: 'Kevin Black et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1390,
    height: 884,
    // Licence read on the abstract page arxiv.org/abs/2512.05964 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Training-Time Action Conditioning for
    // Efficient Real-Time Chunking", figure "Box building task", file box.png
    // in the arXiv source (1390 x 884 px); saved at 1390 x 884 px, JPEG
    // quality 82, metadata stripped. No other change.
  },
  {
    id: 'pi06-espresso-2025',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Kevin Black et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/pi06-espresso-2025.jpg',
    alt: 'A close view of robot grippers at an espresso station, one holding a portafilter filled with ground coffee next to a tamping stand.',
    caption:
      'A π0.6 policy making espresso on Physical Intelligence\'s bimanual rig. The pi line runs one vision-language backbone with a flow-matching action expert across tasks like this one.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2512.05964',
    creator: 'Kevin Black et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1390,
    height: 884,
    // Licence read on the abstract page arxiv.org/abs/2512.05964 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Training-Time Action Conditioning for
    // Efficient Real-Time Chunking", figure "Espresso making task", file
    // coffee.png in the arXiv source (1390 x 884 px); saved at 1390 x 884 px,
    // JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'pi0-fast-laundry-folding-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Karl Pertsch et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/pi0-fast-laundry-folding-2025.jpg',
    alt: 'A strip of frames showing two robot arms taking a shirt from a basket, spreading it on a table and folding it.',
    caption:
      'Laundry folding is the kind of high-frequency task FAST was built for: with naive per-step tokens, policies made no progress on T-shirt folding at 50 Hz. Frames of the task from the FAST paper.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2501.09747',
    creator: 'Karl Pertsch et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1300,
    height: 487,
    // Licence read on the abstract page arxiv.org/abs/2501.09747 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "FAST: Efficient Action Tokenization for
    // Vision-Language-Action Models", figure "Laundry Folding", file
    // figures/task_laundry.jpeg in the arXiv source (1300 x 487 px); saved at
    // 1300 x 487 px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'rtc-candle-lighting-2025',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Kevin Black et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/rtc-candle-lighting-2025.jpg',
    alt: 'A robot gripper holds a freshly struck match above a pie with a candle in it, while a second gripper holds the open matchbox.',
    caption:
      'Real-time chunking lets a robot strike a match and light a candle despite inference delays above 300 ms, more than 30% of the model\'s prediction horizon. A frame from the RTC paper\'s candle task.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2506.07339',
    creator: 'Kevin Black et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1600,
    // Licence read on the abstract page arxiv.org/abs/2506.07339 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Real-Time Execution of Action Chunking
    // Flow Policies", figure "candle task frames", file candle_frame2.jpg in
    // the arXiv source (2160 x 2160 px); resized to 1600 x 1600 px, JPEG
    // quality 82, metadata stripped. No other change.
  },
  {
    id: 'jetson-agx-orin-auledas-2024',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Auledas / Wikimedia Commons. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/jetson-agx-orin-auledas-2024.jpg',
    alt: 'An NVIDIA Jetson AGX Orin developer kit, a compact black and silver module with a heat sink, beside its retail box on a white background.',
    caption:
      'On-robot compute such as the NVIDIA Jetson AGX Orin developer kit sets the hardware wall: a policy that fits a desktop GPU\'s budget can miss the control tick here.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:NVidia_Jetson_Orin_AGX.png',
    creator: 'Auledas',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1452,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file is
    // licensed under the Creative Commons Attribution 4.0 International
    // license." (author Auledas, own work, 28 January 2024). Commons serves
    // the 4642 x 3510 original as a PNG; its 1920 px rendition was saved as
    // JPEG at quality 82 with the background flattened to white.
  },
  {
    id: 'hil-serl-tasks-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Jianlan Luo et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/hil-serl-tasks-2024.jpg',
    alt: 'Four photographs of robot arms whipping a block out of a Jenga tower, flipping an object in a pan, assembling a timing belt and fitting a car dashboard.',
    caption:
      'Reinforcement learning on the real robot reaches precise, dynamic skills that demonstrations alone struggle with. Four of the HIL-SERL tasks: Jenga whipping, object flipping in a pan, timing-belt assembly and dashboard assembly.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2410.21845',
    creator: 'Jianlan Luo et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1101,
    // Licence read on the abstract page arxiv.org/abs/2410.21845 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Precise and Dexterous Robotic
    // Manipulation via Human-in-the-Loop Reinforcement Learning", figure
    // "Overview of experimental tasks", rasterised from figs/fig1.pdf in the
    // arXiv source; trimmed of its white margin to 3616 x 3703 px; cropped to
    // the 3616 x 2488 px region at (0, 0); resized to 1600 x 1101 px, JPEG
    // quality 82, metadata stripped. No other change.
  },
  {
    id: 'pld-gpu-insertion-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Wenli Xiao et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/pld-gpu-insertion-2025.jpg',
    alt: 'Photographs of a Franka arm picking up a blue cube and plugging in a yellow peg, and of bimanual arms inserting a GPU card into a motherboard slot in four stages.',
    caption:
      'PLD trains a residual RL policy on top of a frozen VLA and distills the improved behavior back into it. On bimanual YAM arms the result ran GPU insertion and unplugging for a continuous hour without human resets.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2511.00091',
    creator: 'Wenli Xiao et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 686,
    // Licence read on the abstract page arxiv.org/abs/2511.00091 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Self-Improving Vision-Language-Action
    // Models with Data Generation via Residual RL", figure "real-world
    // manipulation tasks", rasterised from asset/figure/real-world-arms.pdf
    // in the arXiv source; trimmed of its white margin to 3624 x 1554 px;
    // resized to 1600 x 686 px, JPEG quality 82, metadata stripped. No other
    // change.
  },
  {
    id: 'conrft-real-world-tasks-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Yuhui Chen et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/conrft-real-world-tasks-2025.jpg',
    alt: 'Eight labelled photographs of a Franka arm picking a banana, a spoon and bread, opening a drawer and a toaster, putting bread in a toaster, inserting a chair wheel and hanging a Chinese knot.',
    caption:
      'ConRFT fine-tunes a VLA with real-world reinforcement learning across eight contact-rich tasks, from picking a banana to inserting a chair wheel and hanging a Chinese knot.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2502.05450',
    creator: 'Yuhui Chen et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 712,
    // Licence read on the abstract page arxiv.org/abs/2502.05450 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "ConRFT: A Reinforced Fine-tuning Method
    // for VLA Models via Consistency Policy", figure "Overview of all
    // real-world experimental tasks", file tasks.jpg in the arXiv source
    // (3637 x 1619 px); resized to 1600 x 712 px, JPEG quality 82, metadata
    // stripped. No other change.
  },
  {
    id: 'puma-500-deutsches-museum',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Theoprakt / Wikimedia Commons. Licence: CC BY-SA 3.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/puma-500-deutsches-museum.jpg',
    alt: 'A black Unimate PUMA 500 industrial robot arm from 1983 on a museum plinth, beside its Unimation control cabinet and a computer terminal.',
    caption:
      'Every learned policy still runs through coordinate frames like those of this Unimate PUMA 500 (1983), an industrial arm whose kinematics became the textbook example. Exhibit at the Deutsches Museum, Munich.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Unimate_500_PUMA_Deutsches_Museum.jpg',
    creator: 'Theoprakt',
    licence: 'cc-by-sa-3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    retrieved: '2026-10-11',
    width: 1527,
    height: 1770,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file is
    // licensed under the Creative Commons Attribution-Share Alike 3.0
    // Unported license." (author Theoprakt, own work, Deutsches Museum,
    // Munich, 20 July 2013). The original 1527 x 1770 JPEG, shipped as
    // served; the figure anchors its 3:2 crop at the top.
  },
  {
    id: 'droid-in-the-wild-scenes-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Alexander Khazatsky et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/droid-in-the-wild-scenes-2024.jpg',
    alt: 'A grid of robot camera frames grouped by scene type, showing the same Franka arm working in kitchens, bedrooms, bathrooms, offices, laundry rooms and other real buildings.',
    caption:
      'Every stage of the curriculum meets real robot data like DROID\'s: 76k trajectories from 13 institutions, recorded with one Franka setup in kitchens, bedrooms, offices and other real buildings. Example frames grouped into the dataset\'s 9 scene types.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2403.12945',
    creator: 'Alexander Khazatsky et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1546,
    // Licence read on the abstract page arxiv.org/abs/2403.12945 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "DROID: A Large-Scale In-The-Wild Robot
    // Manipulation Dataset", figure "qualitative examples of scenes",
    // rasterised from figures/droid_qualitative_examples.pdf in the arXiv
    // source; trimmed of its white margin to 3389 x 3274 px; resized to 1600
    // x 1546 px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'robocasa-kitchens-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Soroush Nasiriany et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/robocasa-kitchens-2024.jpg',
    alt: 'A grid of rendered simulated kitchens in different layouts and styles, each with a robot standing among cabinets, counters and appliances.',
    caption:
      'Simulation lets a team test policies across many environments before touching hardware. Rendered RoboCasa kitchens, each holding a simulated robot among varied layouts and styles.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2406.02523',
    creator: 'Soroush Nasiriany et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 681,
    // Licence read on the abstract page arxiv.org/abs/2406.02523 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "RoboCasa: Large-Scale Simulation of
    // Everyday Tasks for Generalist Robots", figure "robots in kitchens",
    // rasterised from images/pull/robots_in_kitchen.pdf in the arXiv source;
    // trimmed of its white margin to 3624 x 1543 px; resized to 1600 x 681
    // px, JPEG quality 82, metadata stripped. No other change.
  },
  // END manipulation images (image brief, 2026-10-11)
  // BEGIN world-models images (image brief, 2026-10-11)
  {
    id: 'dreamerv3-open-loop-quadruped-2023',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Danijar Hafner et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/dreamerv3-open-loop-quadruped-2023.jpg',
    alt: 'Two rows of frames of a simulated four-legged robot, labelled True and Model: two context frames, then open-loop predictions from step 10 to step 50 in which the model row closely tracks the true row.',
    caption:
      'A world model predicts how an environment evolves under actions. From 5 context frames and the actions alone, DreamerV3 predicts 45 frames of a simulated quadruped; the model row tracks the true row.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2301.04104',
    creator: 'Danijar Hafner et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 386,
    // Licence read on the abstract page arxiv.org/abs/2301.04104 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Mastering Diverse Domains through World
    // Models", figure "Multi-step video predictions (quadruped row)",
    // rasterised from figures/openl/quad.pdf in the arXiv source; trimmed of
    // its white margin to 3615 x 873 px; resized to 1600 x 386 px, JPEG
    // quality 82, metadata stripped. No other change.
  },
  {
    id: 'gaussian-splatting-garden-2023',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Bernhard Kerbl et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/gaussian-splatting-garden-2023.jpg',
    alt: 'A photorealistic rendered view of a garden: a round wooden table with a vase on it, a paved patio, shrubs and a brick wall.',
    caption:
      'A 3D Gaussian Splatting reconstruction is a learned renderer: it predicts a real scene from a new camera pose by rasterising the fitted Gaussians. A garden scene rendered by the original method.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2308.04079',
    creator: 'Bernhard Kerbl et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1297,
    height: 840,
    // Licence read on the abstract page arxiv.org/abs/2308.04079 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "3D Gaussian Splatting for Real-Time
    // Radiance Field Rendering", figure "Garden scene, full method
    // (gradient-limit ablation, right panel)", file
    // figures/ablations/images/30k/garden/full.png in the arXiv source (1297
    // x 840 px); saved at 1297 x 840 px, JPEG quality 82, metadata stripped.
    // No other change.
  },
  {
    id: 'tdmpc2-task-grid-2023',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Nicklas Hansen et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/tdmpc2-task-grid-2023.jpg',
    alt: 'A grid of rendered simulation tasks: red robot arms reaching, pushing and opening objects on tables, articulated stick figures on checkered floors, and robotic hands manipulating objects.',
    caption:
      'Latent dynamics models learn a compact state and plan or train inside it. TD-MPC2 plans through such a model with no image decoder; these are initial states from its 104 continuous-control tasks.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2310.16828',
    creator: 'Nicklas Hansen et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1066,
    // Licence read on the abstract page arxiv.org/abs/2310.16828 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "TD-MPC2: Scalable, Robust World Models
    // for Continuous Control", figure "Task visualizations (top rows)", file
    // visualizations/grid.png in the arXiv source (2066 x 3356 px); cropped
    // to the 2066 x 1376 px region at (0, 0); resized to 1600 x 1066 px, JPEG
    // quality 82, metadata stripped. No other change.
  },
  {
    id: 'daydreamer-ur5-pick-place-2022',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Philipp Wu et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/daydreamer-ur5-pick-place-2022.jpg',
    alt: 'A UR5 robot arm with a black gripper above two bins on a table, with three coloured balls in the bins and a colourful picture behind them.',
    caption:
      'DayDreamer\'s UR5 learned multi-object visual pick and place from third-person camera images and sparse rewards within a few hours of autonomous operation, training a Dreamer world model on the real robot without a simulator.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2206.14176',
    creator: 'Philipp Wu et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1440,
    height: 1440,
    // Licence read on the abstract page arxiv.org/abs/2206.14176 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "DayDreamer: World Models for Physical
    // Robot Learning", figure "UR5 Multi Object Visual Pick and Place (first
    // frame)", file figures/ur5/ur5frame1.jpg in the arXiv source (1440 x
    // 1440 px); saved at 1440 x 1440 px, JPEG quality 82, metadata stripped.
    // No other change.
  },
  {
    id: 'daydreamer-a1-rollover-2022',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Philipp Wu et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/daydreamer-a1-rollover-2022.jpg',
    alt: 'A black and yellow Unitree A1 quadruped robot lying on its side on a grey floor, legs bent, with a cable trailing behind it.',
    caption:
      'With a Dreamer-style world model, a Unitree A1 that started on its back learned to roll over, stand up and walk in about one hour of real-world training. A frame from the DayDreamer experiment.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2206.14176',
    creator: 'Philipp Wu et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1515,
    height: 1515,
    // Licence read on the abstract page arxiv.org/abs/2206.14176 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "DayDreamer: World Models for Physical
    // Robot Learning", figure "A1 Quadruped Walking (second frame)", file
    // figures/a1/a1frame2.jpg in the arXiv source (1515 x 1515 px); saved at
    // 1515 x 1515 px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'roboworld-synthetic-scenes-2026',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Byeongguk Jeon et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/roboworld-synthetic-scenes-2026.jpg',
    alt: 'Two real tabletop robot images with instructions, wipe the table and remove the bowl from the plate, each turned into a row of generated frames set in a spacecraft interior and a disaster site, with a generalist robot policy acting in the loop.',
    caption:
      'A neural simulator can stage scenes no lab has. RoboWorld turns real robot images into spacecraft interiors and disaster sites and runs closed-loop policy evaluation inside the generated rollouts.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2607.01060',
    creator: 'Byeongguk Jeon et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 393,
    // Licence read on the abstract page arxiv.org/abs/2607.01060 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "RoboWorld: Fast and Reliable Neural
    // Simulators for Generalist Robot Policy Evaluation", figure "Qualitative
    // examples in synthetic extreme environments", rasterised from
    // figures/synthetic_rollout.pdf in the arXiv source; trimmed of its white
    // margin to 3624 x 891 px; resized to 1600 x 393 px, JPEG quality 82,
    // metadata stripped. No other change.
  },
  {
    id: 'gr1-video-prediction-2023',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Hongtao Wu et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/gr1-video-prediction-2023.jpg',
    alt: 'Three pairs of frame strips for the instructions grasp the blue block and rotate it right, put the broccoli onto the plate, and open the drawer; green-framed ground-truth frames sit above blue-framed predicted frames.',
    caption:
      'A video world model predicts future frames of a robot task from the current view and a language instruction. GR-1\'s predicted frames (blue) beneath the ground truth (green) for three instructions.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2312.13139',
    creator: 'Hongtao Wu et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1032,
    // Licence read on the abstract page arxiv.org/abs/2312.13139 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Unleashing Large-Scale Video Generative
    // Pre-training for Visual Robot Manipulation", figure "Video Prediction
    // Results", rasterised from images/fwd_pred.pdf in the arXiv source;
    // trimmed of its white margin to 3428 x 2211 px; resized to 1600 x 1032
    // px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'gr2-multitask-settings-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Chi-Lam Cheang et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/gr2-multitask-settings-2024.jpg',
    alt: 'Four groups of tabletop photographs of a robot arm among household objects, labelled Basic Settings, Unseen Backgrounds, Unseen Environments and Unseen Manipulation.',
    caption:
      'GR-2 pre-trains on web-scale video, then fine-tunes on robot data to generate video and predict actions, with 97.7% average success across more than 100 tasks. Its test settings run from basic scenes to unseen backgrounds and environments.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2410.06158',
    creator: 'Chi-Lam Cheang et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 549,
    // Licence read on the abstract page arxiv.org/abs/2410.06158 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "GR-2: A Generative
    // Video-Language-Action Model with Web-Scale Knowledge for Robot
    // Manipulation", figure "Multi-Task Learning settings", rasterised from
    // figure/multi_task_setting.pdf in the arXiv source; trimmed of its white
    // margin to 3520 x 1208 px; resized to 1600 x 549 px, JPEG quality 82,
    // metadata stripped. No other change.
  },
  {
    id: 'roboworld-contact-failures-2026',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Byeongguk Jeon et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/roboworld-contact-failures-2026.jpg',
    alt: 'Three blocks of generated video frames of a robot gripper and objects, each with its instruction and a short evaluator note; after contact, the manipulated object breaks apart or turns into a yellow smear.',
    caption:
      'Video world models still fail at contact: after the robot touches it, the manipulated object disintegrates or morphs into artifacts. RoboWorld\'s VLM evaluator catches such rollouts and gives them a dedicated score.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2607.01060',
    creator: 'Byeongguk Jeon et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1459,
    height: 1600,
    // Licence read on the abstract page arxiv.org/abs/2607.01060 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "RoboWorld: Fast and Reliable Neural
    // Simulators for Generalist Robot Policy Evaluation", figure "World-model
    // failures detected by the VLM evaluator (appendix)", rasterised from
    // appendix_figure/figure_wm_failures.pdf in the arXiv source; trimmed of
    // its white margin to 3624 x 3973 px; resized to 1459 x 1600 px, JPEG
    // quality 82, metadata stripped. No other change.
  },
  {
    id: 'vjepa2-pick-place-goals-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Mido Assran et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/vjepa2-pick-place-goals-2025.jpg',
    alt: 'A grid of five rows of camera frames of a white Franka robot arm on a cluttered lab bench, in columns labelled Start Frame, Subgoal 1, Subgoal 2 and Goal Frame, as the arm picks up a cup and places it.',
    caption:
      'V-JEPA 2-AC plans in embedding space: on Franka arms in labs absent from its training data, it reaches image goals by comparing predicted representations. Pick and place adds two subgoal images between the start and goal frames.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2506.09985',
    creator: 'Mido Assran et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1261,
    height: 1600,
    // Licence read on the abstract page arxiv.org/abs/2506.09985 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "V-JEPA 2: Self-Supervised Video Models
    // Enable Understanding, Prediction and Planning", figure "Pick and Place
    // Cup (first lab)", file assets/mido/pnpcup.jpg in the arXiv source;
    // trimmed of its white margin to 3482 x 1989 px; cropped to the 1567 x
    // 1989 px region at (0, 0); resized to 1261 x 1600 px, JPEG quality 82,
    // metadata stripped. No other change.
  },
  {
    id: 'vjepa2-overview-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Mido Assran et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/vjepa2-overview-2025.jpg',
    alt: 'A flow diagram: internet video and images feed video pretraining of V-JEPA 2, which branches to language alignment, attentive probe training and, with robot data of states and actions, action-conditioned post-training for planning and robot manipulation.',
    caption:
      'V-JEPA 2 learns from video first and actions second: masked representation prediction on over 1 million hours of internet video and images, then an action-conditioned predictor trained on under 62 hours of robot video.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2506.09985',
    creator: 'Mido Assran et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 749,
    // Licence read on the abstract page arxiv.org/abs/2506.09985 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "V-JEPA 2: Self-Supervised Video Models
    // Enable Understanding, Prediction and Planning", figure "V-JEPA 2
    // Overview", rasterised from assets/mido/flowchart.pdf in the arXiv
    // source; trimmed of its white margin to 3604 x 1686 px; resized to 1600
    // x 749 px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'simpler-real-vs-sim-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Xuanlin Li et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/simpler-real-vs-sim-2024.jpg',
    alt: 'Two panels: real robot evaluation, labelled expensive, slow and difficult to reproduce, with photographs of a robot arm at a table; and simulated evaluation, labelled cheap, scalable and fully reproducible, with matching simulated views.',
    caption:
      'A cheaper evaluator is useful only if it agrees with reality. SIMPLER builds simulated scenes matched to real ones and checks whether simulated policy performance correlates with real performance; a learned simulator should meet the same test.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2405.05941',
    creator: 'Xuanlin Li et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1063,
    // Licence read on the abstract page arxiv.org/abs/2405.05941 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Evaluating Real-World Robot
    // Manipulation Policies in Simulation", figure "Teaser: real versus
    // simulated evaluation", rasterised from figures/teaser_v13.pdf in the
    // arXiv source; trimmed of its white margin to 3608 x 2397 px; resized to
    // 1600 x 1063 px, JPEG quality 82, metadata stripped. No other change.
  },
  {
    id: 'roboworld-bair-forcing-2026',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Byeongguk Jeon et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/roboworld-bair-forcing-2026.jpg',
    alt: 'A grid of video frames of a robot arm pushing objects at steps 0, 8, 14, 21 and 29, with rows for ground truth and five rollout methods; red boxes mark misaligned and blurred frames, and the last row is marked aligned.',
    caption:
      'Autoregressive rollouts can drift in ways one frame hides. On BAIR robot pushing, the RoboWorld authors mark other forcing schemes misaligned or blurred within 29 steps, while their step forcing stays aligned with the ground truth.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2607.01060',
    creator: 'Byeongguk Jeon et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1546,
    height: 1600,
    // Licence read on the abstract page arxiv.org/abs/2607.01060 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "RoboWorld: Fast and Reliable Neural
    // Simulators for Generalist Robot Policy Evaluation", figure "Qualitative
    // results on BAIR Robot Pushing", rasterised from
    // figures/bair_example.pdf in the arXiv source; trimmed of its white
    // margin to 3580 x 3706 px; resized to 1546 x 1600 px, JPEG quality 82,
    // metadata stripped. No other change.
  },
  {
    id: 'robocasa-object-library-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Soroush Nasiriany et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/robocasa-object-library-2024.jpg',
    alt: 'A rendered kitchen table crowded with hundreds of 3D objects: fruit, vegetables, meat, bottles, cans, cups, cookware and packaged food.',
    caption:
      'Generative simulation authors content and leaves dynamics to the physics engine. RoboCasa\'s library holds 2,509 objects in 153 categories, drawn from Objaverse and the text-to-3D service Luma.ai; a small subset is shown here.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2406.02523',
    creator: 'Soroush Nasiriany et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 900,
    // Licence read on the abstract page arxiv.org/abs/2406.02523 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "RoboCasa: Large-Scale Simulation of
    // Everyday Tasks for Generalist Robots", figure "Diverse High-Quality 3D
    // Objects", file images/objects/Capture25_comp.png in the arXiv source
    // (1920 x 1080 px); resized to 1600 x 900 px, JPEG quality 82, metadata
    // stripped. No other change.
  },
  {
    id: 'isaac-lab-assembly-sim-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: NVIDIA et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/isaac-lab-assembly-sim-2025.jpg',
    alt: 'Rows of identical simulated white robot arms on grey tables, each with a small green part to assemble, with two insets enlarging a gear and a peg.',
    caption:
      'A physics simulator integrates explicit geometry, dynamics and contact rules, and steps many copies at once. Assembly environments in Isaac Lab, each an arm with a part to insert, run in parallel on the GPU.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2511.04831',
    creator: 'NVIDIA et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1198,
    // Licence read on the abstract page arxiv.org/abs/2511.04831 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Isaac Lab: A GPU-Accelerated Simulation
    // Framework for Multi-Modal Robot Learning", figure "Assembly
    // Environments in Isaac Lab (simulation panel)", file
    // assets/contact_rich/automate_isaaclab_envs.png in the arXiv source
    // (1694 x 1268 px); resized to 1600 x 1198 px, JPEG quality 82, metadata
    // stripped. No other change.
  },
  {
    id: 'isaac-lab-assembly-real-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: NVIDIA et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/isaac-lab-assembly-real-2025.jpg',
    alt: 'A white robot arm with a gripper above a plate of parts, labelled Robot Setup, beside a grid of close-up photographs of green parts inserted into black fixtures, labelled Successful Assemblies.',
    caption:
      'Either kind of simulator earns trust only against the same real tasks. The Isaac Lab assembly tasks on a real arm, with its successful assemblies.',
    sourceName: 'arXiv',
    sourceUrl:
      'https://arxiv.org/abs/2511.04831',
    creator: 'NVIDIA et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1190,
    // Licence read on the abstract page arxiv.org/abs/2511.04831 on
    // 2026-10-11: its licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. "Isaac Lab: A GPU-Accelerated Simulation
    // Framework for Multi-Modal Robot Learning", figure "Assembly
    // Environments in Isaac Lab (real-world panel)", file
    // assets/contact_rich/automate_real_world.png in the arXiv source (1726 x
    // 1284 px); resized to 1600 x 1190 px, JPEG quality 82, metadata
    // stripped. No other change.
  },
  // END world-models images (image brief, 2026-10-11)
  // BEGIN classical images (image brief, 2026-10-11)
  {
    id: 'ur16e-cobot-arm-2020',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Auledas / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/ur16e-cobot-arm-2020.jpg',
    alt: 'A grey and light blue Universal Robots UR16e arm with six revolute joints, folded over a perforated steel table beside its controller box and a touchscreen teach pendant.',
    caption:
      'A Universal Robots UR16e, a six-joint serial arm. Forward kinematics composes one transform per joint, so its six joint angles fix the pose of the tool flange.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:UR16e_robot_arm.png',
    creator: 'Auledas',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1554,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author Auledas, own work, 2020-02-17).
    // Commons 1920 px PNG rendition flattened onto white and saved as JPEG.
  },
  {
    id: 'pr2-willow-garage-2010',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Steve Jurvetson / Wikimedia Commons. Licence: CC BY 2.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/pr2-willow-garage-2010.jpg',
    alt: 'A white two-armed PR2 robot stands at a round red table in an office, reaching toward small objects, with a whiteboard and computer monitors behind it.',
    caption:
      'A Willow Garage PR2 in 2010. The TrajOpt benchmark below planned 198 arm problems and 96 full-body problems for this robot in simulated MoveIt scenes.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Wandering_in_Willow_Garage_(5147429282).jpg',
    creator: 'Steve Jurvetson',
    licence: 'cc-by-2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1645,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution 2.0 Generic license." Flickr review:
    // "confirmed to be licensed under the terms of the cc-by-2.0".
  },
  {
    id: 'atlas-vrc-simulation-2013',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: U.S. Department of Defense / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/atlas-vrc-simulation-2013.jpg',
    alt: 'A simulated black Atlas humanoid robot stands at a table in a grey virtual warehouse, holding a red hose toward a green valve wheel on a wall.',
    caption:
      'A 2013 Defense Department rendering of a simulated Atlas connecting a hose, a DARPA Robotics Challenge task. TrajOpt planned statically stable walking for this 34-DoF humanoid.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Atlas_connecting_a_hose.jpg',
    creator: 'U.S. Department of Defense',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-USGov-Military',
    retrieved: '2026-10-11',
    width: 1490,
    height: 889,
    // Licence sentence read on the file page: "This file is a work of a
    // U.S. military or Department of Defense employee, taken or made as
    // part of that person's official duties. As a work of the U.S. federal
    // government, the file is in the public domain in the United States."
  },
  {
    id: 'centrifugal-governor-queen-street-mill',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Clem Rutter / Wikimedia Commons. Licence: CC BY 3.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/centrifugal-governor-queen-street-mill.jpg',
    alt: 'A cast-iron centrifugal governor: two heavy balls hang from arms on a vertical spindle topped by a coiled spring, linked by levers toward the engine valve gear.',
    caption:
      'The centrifugal governor of the mill engine at Queen Street Mill, Burnley. As the engine speeds up the balls swing outward and the linkage closes the steam valve, a mechanical feedback loop.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Queen_Street_Mill_-_Tandem_Compound_Governor_5463.JPG',
    creator: 'Clem Rutter',
    licence: 'cc-by-3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1440,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution 3.0 Unported license." (dual-licensed
    // with GFDL 1.2; this site relies on the CC BY 3.0 grant).
  },
  {
    id: 'atlas-darpa-testing-2013',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText: 'Photo: DARPA / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/atlas-darpa-testing-2013.jpg',
    alt: 'The hydraulic Atlas humanoid robot stands in a lab during testing, with its exposed metal frame, hoses and sensor head visible and its forearms ending without hands.',
    caption:
      'The hydraulic Atlas during 2013 testing, before its hands were fitted. Kuindersma and colleagues built its controller from optimizations running from footstep placement down to whole-body control.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Atlas_during_testing.jpg',
    creator: 'DARPA',
    licence: 'public-domain',
    licenceUrl:
      'https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-DARPA',
    retrieved: '2026-10-11',
    width: 1280,
    height: 1920,
    // Licence sentence read on the file page: "This image or file is a work
    // of a Defense Advanced Research Projects Agency (DARPA), an agency of
    // the United States Department of Defense, employee, taken or made as
    // part of that person's official duties. As a work of the U.S. federal
    // government, the image is in the public domain."
  },
  {
    id: 'baxter-rethink-innorobo-2015',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Scailyna / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/baxter-rethink-innorobo-2015.jpg',
    alt: 'A Rethink Robotics Baxter, a two-armed red and black robot with a screen showing cartoon eyes, stands at a trade-show booth.',
    caption:
      "Rethink Robotics' Baxter at Innorobo 2015. Its joints drive through series elastic actuators, so a measured spring deflection gives the arm the force channel a stiff geared arm lacks.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Innorobo_2015_-_Rethink_Robotics_-_Baxter_Intera.jpg',
    creator: 'Scailyna',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1440,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author Scailyna, own work).
  },
  {
    id: 'apollo-imu-draper-2019',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: ArnoldReinhold / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/apollo-imu-draper-2019.jpg',
    alt: 'An Apollo inertial measurement unit on display with its round outer case open, showing the gimballed stable platform with its gyroscopes and accelerometers inside.',
    caption:
      "An Apollo inertial measurement unit at Draper's 2019 Hack the Moon exhibit. Its gyroscopes and accelerometers integrate motion and drift over time, so an estimator must correct them with outside measurements.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Apollo_IMU_at_Draper_Hack_the_Moon_exhibit.agr.jpg',
    creator: 'ArnoldReinhold',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1440,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author ArnoldReinhold, own work).
  },
  {
    id: 'apollo-guidance-computer-dsky',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText: 'Photo: NASA / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/apollo-guidance-computer-dsky.jpg',
    alt: 'The Apollo Guidance Computer, a flat gold-coloured metal case, beside its display and keyboard unit with a numeric keypad and status lights, on a blue background.',
    caption:
      "The Apollo Guidance Computer and its display and keyboard. Apollo used Potter's square-root form of the Kalman filter, with ground radar as primary navigation and the onboard system as backup.",
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Agc_view.jpg',
    creator: 'NASA',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-NASA',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1314,
    // Licence sentence read on the file page: "This file is in the public
    // domain in the United States because it was solely created by NASA.
    // NASA copyright policy states that "NASA material is not protected by
    // copyright unless noted"."
  },
  {
    id: 'care-o-bot-grasping-2010',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Jiuguang Wang / Wikimedia Commons. Licence: CC BY-SA 2.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/care-o-bot-grasping-2010.jpg',
    alt: 'A Care-O-bot service robot with a white and dark grey body extends an orange jointed arm and a multi-fingered hand to grasp a white cylinder on a folding table.',
    caption:
      'A Care-O-bot service robot grasping a cylinder in 2010. A grasp planner chooses where its fingertips touch so the hold resists pushes and pulls from every direction.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Care-O-Bot_grasping_an_object_on_the_table_(5117071459).jpg',
    creator: 'Jiuguang Wang',
    licence: 'cc-by-sa-2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 2.0 Generic license."
    // Flickr review: "confirmed that it was available on Flickr under the
    // stated license on that date".
  },
  {
    id: 'schunk-svh-five-finger-hand',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: NearEMPTiness / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/schunk-svh-five-finger-hand.jpg',
    alt: 'A black five-fingered Schunk SVH robot hand silhouetted against a window, fingers spread, with the joints and links of each finger visible.',
    caption:
      'The Schunk SVH, a servo-electric five-finger hand. Every fingertip or phalanx that touches an object is one contact, and the contact model fixes which forces it can transmit.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Servo-electric_5-Finger_gripping_hand_-_Schunk_SVH.JPG',
    creator: 'NearEMPTiness',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1531,
    height: 1223,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author NearEMPTiness, own work).
  },
  {
    id: 'realsense-d435-depth-camera',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Marc Auledas / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/realsense-d435-depth-camera.jpg',
    alt: 'An Intel RealSense D435 depth camera, a slim grey bar with two infrared lenses, a projector window and a colour camera, mounted on a small tripod.',
    caption:
      'An Intel RealSense D435, an active stereo camera common on manipulation rigs. Its projector adds texture so matching works on blank surfaces, and its depth error grows with the square of distance.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Intel_Realsense_depth_camera_D435.jpg',
    creator: 'Marc Auledas',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1280,
    height: 1705,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author Marc Auledas, own work).
  },
  {
    id: 'kinect-xbox-one-sensor',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: Evan-Amos / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/kinect-xbox-one-sensor.jpg',
    alt: 'A black Kinect for Xbox One sensor bar, angled on a white background, with its camera window at one end and a ventilation grille along its top.',
    caption:
      'The Kinect for Xbox One measured depth by time of flight, the principle its successor Azure Kinect kept. Multi-path light and weak infrared returns invalidate pixels on both.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Xbox-One-Kinect.jpg',
    creator: 'Evan-Amos',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-self',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1175,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, release this work into the public domain."
  },
  {
    id: 'leica-laser-tracker-ats600',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: FanchonH / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/leica-laser-tracker-ats600.jpg',
    alt: 'A white and black Leica laser tracker on a tripod aims a red laser line at the inside of a large rust-coloured steel ring in a factory hall.',
    caption:
      'A Leica ATS600 laser tracker measuring a large steel part. Kinematic calibration relies on external instruments like this for its measurement step, recording where the tool really is.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Leica_Absolute_Tracker_ATS600_.jpg',
    creator: 'FanchonH',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author FanchonH, own work). The Commons
    // 1920 px rendition is CMYK; it was converted to sRGB for browsers.
  },
  {
    id: 'baxter-gripper-wrist-camera',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Gustavo A. Casañ / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/baxter-gripper-wrist-camera.jpg',
    alt: "Close view of a red Baxter robot arm's wrist, with a small camera lens above a two-finger parallel gripper, in an office with computers behind it.",
    caption:
      "Baxter's wrist carries a camera beside its gripper. Hand-eye calibration solves AX = XB for the fixed transform between that camera and the gripper.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Baxter_robot%27s_gripper.JPG',
    creator: 'Gustavo A. Casañ',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author Gustavo A. Casañ, own work).
  },
  {
    id: 'pr2-maker-faire-2011',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Timothy Vollmer / Wikimedia Commons. Licence: CC BY 2.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/pr2-maker-faire-2011.jpg',
    alt: 'A white two-armed PR2 robot with raised grippers stands at a Maker Faire booth under banners for PR2, TurtleBot and ROS.',
    caption:
      'A Willow Garage PR2 under the ROS banner at Maker Faire 2011. Willow Garage developed ROS alongside this robot, and ROS 2 is its rebuild for production use.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:PR2_at_Maker_Faire.jpg',
    creator: 'Timothy Vollmer',
    licence: 'cc-by-2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1275,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution 2.0 Generic license." Flickr review:
    // "confirmed to be licensed under the terms of the cc-by-2.0".
  },
  {
    id: 'clearpath-jackal-ugv-2020',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: U.S. Army / Luke J. Allen / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/clearpath-jackal-ugv-2020.jpg',
    alt: 'A small black and yellow four-wheeled Clearpath Jackal ground robot with a cylindrical lidar and cameras on its top deck, parked on gravel.',
    caption:
      'A Clearpath Jackal at the University of Texas robotics center in 2020. Wheeled research bases like it run Nav2, whose planner, controller and recovery servers are ordinary ROS 2 nodes.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Clearpath_Jackal_UGV.jpg',
    creator: 'U.S. Army / Luke J. Allen',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-USA',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "This file is a work of a
    // U.S. Army soldier or employee, taken or made as part of that
    // person's official duties. As a work of the U.S. federal government,
    // it is in the public domain in the United States."
  },
  {
    id: 'ouster-lidar-point-cloud-sf',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Daniel L. Lu / Wikimedia Commons. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/ouster-lidar-point-cloud-sf.jpg',
    alt: 'An oblique overhead view of a city intersection drawn entirely in coloured lidar points, with building facades, parked cars and road markings in purple, pink and orange on black.',
    caption:
      'About 23 million lidar points of a San Francisco intersection, captured in 18 seconds by an Ouster OS1 on a moving car and registered by SLAM. A point cloud is the first rung of the ladder below.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Ouster_OS1-64_lidar_point_cloud_of_intersection_of_Folsom_and_Dore_St,_San_Francisco.png',
    creator: 'Daniel L. Lu',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1080,
    // Licence sentence read on the file page: "the copyright holder of this
    // work, hereby publishes it under the following license: This file is
    // licensed under the Creative Commons Attribution 4.0 International
    // license." (author Daniel L. Lu, own work). Commons 1920 px PNG
    // rendition saved as JPEG.
  },
  {
    id: 'kinect-xbox-360-sensor',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Antonio Roberts / Wikimedia Commons. Licence: CC BY-SA 2.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/kinect-xbox-360-sensor.jpg',
    alt: 'A black Kinect for Xbox 360 sensor bar on its pivoting stand, lying on a green cutting mat with its cables coiled beside it.',
    caption:
      "A first-generation Kinect for Xbox 360. KinectFusion fused this sensor's 640×480 depth frames at 30 Hz into a truncated signed-distance volume on one GPU.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Kinect_sensor_for_Xbox_360_(2015-12-28_16.26.04_by_Antonio_Roberts).jpg',
    creator: 'Antonio Roberts',
    licence: 'cc-by-sa-2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 2.0 Generic license."
    // Flickr review: "confirmed to be licensed under the terms of the
    // cc-by-sa-2.0".
  },
  {
    id: 'velodyne-hdl64-lidar-2009',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Steve Jurvetson / Wikimedia Commons. Licence: CC BY 2.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/velodyne-hdl64-lidar-2009.jpg',
    alt: 'A Velodyne HDL-64E lidar spinning on a car roof, its cylindrical housing blurred by rotation, above a yellow laser warning label.',
    caption:
      "A Velodyne HDL-64E on Junior 2, Stanford's autonomous Volkswagen, in 2009. Its 64 spinning beams return over a million points a second, the raw input of a lidar SLAM front end.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Velodyne_High-Def_LIDAR.jpg',
    creator: 'Steve Jurvetson',
    licence: 'cc-by-2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1390,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution 2.0 Generic license."
  },
  // END classical images (image brief, 2026-10-11)
  // BEGIN rl-sim2real images (image brief, 2026-10-11)
  {
    id: 'atlas-electric-hyundai-goyang-2026',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Damian B Oh / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/atlas-electric-hyundai-goyang-2026.jpg',
    alt: 'The electric Atlas humanoid by Boston Dynamics, grey and white with a round head and slim jointed limbs, stands on display in a showroom.',
    caption:
      'The electric Atlas on display at Hyundai Motorstudio Goyang in July 2026. ZEST trains motion-imitation policies on motion capture, video and animation and deploys them on this robot zero-shot.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Boston_Dynamics_Atlas_(2).jpg',
    creator: 'Damian B Oh',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1500,
    height: 2000,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 4.0 International
    // license." (author Damian B Oh, own work). Original 3000 x 4000;
    // shipped as the Commons 1920 px thumbnail resized to 2000 px tall at
    // JPEG quality 82, which the seal records.
  },
  {
    id: 'motion-capture-session-hyderabad-2026',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Applearts123 / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/motion-capture-session-hyderabad-2026.jpg',
    alt: 'Performers in black motion capture suits dotted with reflective markers stand in a studio capture volume ringed by cameras, seen mostly from behind.',
    caption:
      'Optical motion capture records body movement from reflective suit markers seen by a ring of cameras. AMASS pooled 15 such datasets, over 40 hours and 11,000 motions, into one body model that humanoid tracking policies learn to imitate.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Performers_during_optical_performance_capture_session_at_Apple_Arts_Studios_Hyderabad_India_2026.png',
    creator: 'Applearts123',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1031,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 4.0 International
    // license." (author Applearts123, own work, Apple Arts Studios,
    // Hyderabad, 2026). Original 3700 x 1987 PNG; shipped as the Commons
    // 1920 px thumbnail converted to JPEG at quality 82.
  },
  {
    id: 'unitree-robots-japan-mobility-show-2025',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: RuinDig/Yuki Uchida / Wikimedia Commons. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/unitree-robots-japan-mobility-show-2025.jpg',
    alt: 'Unitree robots on a dark exhibition stand: a silver humanoid hangs from a lifting hoist in front, a G1 humanoid with a glowing blue face ring stands behind it, and a quadruped sits on the right.',
    caption:
      'Unitree robots at Japan Mobility Show 2025, with a G1 behind the hoisted humanoid. GR00T N1.7 drives the G1 through GEAR-SONIC, which decodes its latent action tokens into leg, arm and hand commands at 50 Hz.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Japan-Mobility-Show-2025-RuinDig_0538.jpg',
    creator: 'RuinDig/Yuki Uchida',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1440,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution 4.0 International license." (author
    // RuinDig/Yuki Uchida, own work). Original 3648 x 2736; shipped as the
    // Commons 1920 px thumbnail, bytes as served.
  },
  {
    id: 'spot-boston-dynamics-2023',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Jonte / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/spot-boston-dynamics-2023.jpg',
    alt: 'A yellow and black Boston Dynamics Spot quadruped walks along a gravel path through a forest.',
    caption:
      'Spot, the Boston Dynamics quadruped, outdoors in 2023. Boston Dynamics ships its learned locomotion policy to Spot by software update and reports fewer falls on slick and irregular ground.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Spot_by_Boston_Dynamics.jpg',
    creator: 'Jonte',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1067,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 4.0 International
    // license." (author Jonte, own work). Original 6000 x 4000; shipped as
    // the Commons 1920 px thumbnail resized to 1600 px at JPEG quality 80.
  },
  {
    id: 'horse-in-motion-muybridge-1878',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: Eadweard Muybridge / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/horse-in-motion-muybridge-1878.jpg',
    alt: 'A card of twelve sequential silhouette photographs of a horse and rider at a gallop, taken by Eadweard Muybridge in 1878, with printed text beneath the frames.',
    caption:
      "Eadweard Muybridge's 1878 sequence of a galloping horse caught all four hooves off the ground. A gait is such a footfall timing pattern; Walk These Ways commands it to a robot as phase offsets between foot pairs.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:The_Horse_in_Motion_high_res.jpg',
    creator: 'Eadweard Muybridge',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-old-100-expired',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1184,
    // Licence sentences read on the file page: "This work is in the public
    // domain in its country of origin and other countries and areas where
    // the copyright term is the author's life plus 100 years or fewer." and
    // "This work is in the public domain in the United States because it
    // was published (or registered with the U.S. Copyright Office) before
    // January 1, 1931." (Library of Congress scan). Shipped as the Commons
    // 1920 px thumbnail, bytes as served.
  },
  {
    id: 'cassie-oregon-state-2017',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Oregon State University / Wikimedia Commons. Licence: CC BY-SA 2.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/cassie-oregon-state-2017.jpg',
    alt: 'Cassie, a bipedal robot with backward-bending legs and no upper body, walks along a forest path while a researcher follows with a handheld controller.',
    caption:
      'Cassie, the bipedal robot built at Oregon State University, walking in a research forest in 2017. Learned controllers later ran Cassie through a 400-meter dash and composed periodic rewards into standing, walking, hopping, running and skipping.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Cassie_the_robot_01.jpg',
    creator: 'Oregon State University',
    licence: 'cc-by-sa-2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 2.0 Generic license."
    // (Oregon State University on Flickr). Original 5472 x 3648; shipped as
    // the Commons 1920 px thumbnail, bytes as served.
  },
  {
    id: 'anymal-x-offshore-stairs-2022',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Cvoellmy / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/anymal-x-offshore-stairs-2022.jpg',
    alt: 'An ANYmal X quadruped robot climbs down a steel staircase on an offshore platform, surrounded by railings and industrial piping.',
    caption:
      'ANYmal X descending stairs on an offshore rig during an inspection round in 2022. The ANYmal line is where simulation-trained locomotion policies first transferred to hardware, in 2019.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:AnymalX-robot-inspection-offshore.jpg',
    creator: 'Cvoellmy',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1047,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 4.0 International
    // license." (author Cvoellmy, own work). Original 5576 x 3040; shipped
    // as the Commons 1920 px thumbnail, bytes as served.
  },
  {
    id: 'shadow-hand-lightbulb-2007',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Richard Greenhill and Hugo Elias, Shadow Robot Company / Wikimedia Commons. Licence: CC BY-SA 3.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/shadow-hand-lightbulb-2007.jpg',
    alt: 'The Shadow Dexterous Hand, a humanlike robot hand with visible joints and tendons, holds a light bulb between its fingertips.',
    caption:
      "The Shadow Dexterous Hand holding a light bulb in 2007. Each fingertip is a contact whose geometry and friction a simulator must get right; a modified Shadow hand ran the Rubik's cube policy trained with automatic domain randomization.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Shadow_Hand_Bulb_large.jpg',
    creator: 'Richard Greenhill and Hugo Elias, Shadow Robot Company',
    licence: 'cc-by-sa-3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    retrieved: '2026-10-11',
    width: 1333,
    height: 2000,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 3.0 Unported license."
    // (dual-licensed with the GFDL; reused under CC BY-SA 3.0). Original
    // 2560 x 3840; shipped as the Commons 1920 px thumbnail resized to
    // 2000 px tall at JPEG quality 82.
  },
  {
    id: 'isaac-gym-shadow-hand-envs-2021',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Viktor Makoviychuk et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/isaac-gym-shadow-hand-envs-2021.jpg',
    alt: 'A rendered Shadow Hand holding a cube in the foreground, with rows of identical hand and object environments receding behind it across a grey checkered floor.',
    caption:
      "Isaac Gym's Shadow Hand task, rendered with many copies of the same hand and cube stepped together on one GPU. Its authors report 2 to 3 orders of magnitude improvement over a CPU simulator feeding a GPU network.",
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2108.10470',
    creator: 'Viktor Makoviychuk et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 900,
    // Licence read on the abstract page arxiv.org/abs/2108.10470: the
    // licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. File figure/envs_new/ShadowHand.png
    // from the arXiv source (3840 x 2160), published in the paper's
    // in-hand manipulation figure; resized to 1600 px, JPEG quality 82.
  },
  {
    id: 'mujoco-playground-environments-2025',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Kevin Zakka et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/mujoco-playground-environments-2025.jpg',
    alt: 'Rendered robots from MuJoCo Playground arranged together: a Berkeley Humanoid, Unitree Go1 and G1, a LEAP hand and a Franka arm.',
    caption:
      'MuJoCo Playground environments that transferred to real hardware: the Berkeley Humanoid, Unitree Go1 and G1, the LEAP hand and a Franka arm. The framework runs MuJoCo on the GPU through MJX, with sim-to-real transfer as an express goal.',
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2502.08844',
    creator: 'Kevin Zakka et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1092,
    // Licence read on the abstract page arxiv.org/abs/2502.08844: the
    // licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. The paper's teaser figure
    // (figures/teaser_figure.pdf) rasterised at 300 dpi, resized to
    // 1600 px, JPEG quality 82.
  },
  {
    id: 'mini-cheetah-spin-rapid-locomotion-2022',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Gabriel B. Margolis et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/mini-cheetah-spin-rapid-locomotion-2022.jpg',
    alt: 'The MIT Mini Cheetah, a small silver quadruped on a safety tether, spins in place on foam floor mats, its legs blurred by motion.',
    caption:
      'The MIT Mini Cheetah spinning at 5.7 rad/s under a policy trained in simulation, 90% of the 6.28 rad/s yaw rate a model-based controller reached on the robot. The same network sprints at 3.9 m/s.',
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2205.02824',
    creator: 'Gabriel B. Margolis et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1445,
    // Licence read on the abstract page arxiv.org/abs/2205.02824: the
    // licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. Video still stills/spin1-min.png from
    // the arXiv source (1836 x 1658); resized to 1600 px, JPEG quality 82.
  },
  {
    id: 'isaac-gym-anymal-terrain-2021',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Viktor Makoviychuk et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/isaac-gym-anymal-terrain-2021.jpg',
    alt: 'A rendered grid of terrain tiles with stairs, slopes and rough ground, covered with many ANYmal quadrupeds training at once against a black background.',
    caption:
      'ANYmal robots training in parallel on Isaac Gym stairs and slopes, laid out as tiles of rising difficulty. The curriculum promotes robots that cross a tile and demotes those that cover under half the commanded distance.',
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2108.10470',
    creator: 'Viktor Makoviychuk et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 945,
    // Licence read on the abstract page arxiv.org/abs/2108.10470 (see
    // isaac-gym-shadow-hand-envs-2021). File
    // figure/envs/anymal_rough_terrain_2.png from the arXiv source
    // (3192 x 1885), the simulation panel of the paper's ANYmal rough
    // terrain figure; resized to 1600 px, JPEG quality 82.
  },
  {
    id: 'daydreamer-a1-push-recovery-2022',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Philipp Wu et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/daydreamer-a1-push-recovery-2022.jpg',
    alt: 'Overlaid frames show a Unitree A1 quadruped on a lab floor being pushed with a long tube and keeping or regaining its footing.',
    caption:
      "DayDreamer's Unitree A1 learned to roll over, stand and walk in one hour on the real robot with no simulator. Within ten more minutes of pushes it learned to withstand them or roll back onto its feet.",
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2206.14176',
    creator: 'Philipp Wu et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1575,
    height: 886,
    // Licence read on the abstract page arxiv.org/abs/2206.14176: the
    // licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. File figures/pushing/pushing.jpg from
    // the arXiv source, the paper's push-recovery figure; re-encoded at
    // JPEG quality 82, size unchanged.
  },
  {
    id: 'isaac-gym-allegro-envs-2021',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Viktor Makoviychuk et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/isaac-gym-allegro-envs-2021.jpg',
    alt: 'Rendered Allegro robot hands, each turning a cube, repeated across a large grid of parallel simulation environments on a grey checkered floor.',
    caption:
      "Isaac Gym's Allegro hand task, one hand and cube per environment, all stepped together on a GPU. When steps cost this little, training stability becomes the scarce resource, which is why GPU-simulation work defaulted to PPO.",
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2108.10470',
    creator: 'Viktor Makoviychuk et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 900,
    // Licence read on the abstract page arxiv.org/abs/2108.10470 (see
    // isaac-gym-shadow-hand-envs-2021). File figure/envs_new/Allegro.png
    // from the arXiv source (3840 x 2160), published in the paper's
    // in-hand manipulation figure; resized to 1600 px, JPEG quality 82.
  },
  {
    id: 'isaac-gym-trifinger-env-2021',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Viktor Makoviychuk et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/isaac-gym-trifinger-env-2021.jpg',
    alt: 'A rendered TriFinger robot: three robotic fingers mounted above a round, walled arena push a cube toward a target pose.',
    caption:
      'TriFinger, three robot fingers over a round arena, rendered in Isaac Gym. The real benchmark pairs reproducible hardware with simulation for debugging, so offline-RL policies trained on its fixed datasets meet the same robot every time.',
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2108.10470',
    creator: 'Viktor Makoviychuk et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 900,
    // Licence read on the abstract page arxiv.org/abs/2108.10470 (see
    // isaac-gym-shadow-hand-envs-2021). File figure/envs_new/Trifinger.png
    // from the arXiv source (1920 x 1080), published in the paper's
    // in-hand manipulation figure; resized to 1600 px, JPEG quality 82.
  },
  {
    id: 'simpler-visual-matching-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Xuanlin Li et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/simpler-visual-matching-2024.jpg',
    alt: 'Three robot scenes in four columns labelled Real, Raw Sim, Sim plus Green Screen, and Sim plus Green Screen plus Texture Matching; the simulated views grow closer to the real camera images from left to right.',
    caption:
      'SIMPLER matches its simulated scenes to real camera views, from raw simulation to a green-screened real background with matched textures. The authors checked simulated rankings against paired real evaluations before trusting them.',
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2405.05941',
    creator: 'Xuanlin Li et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1118,
    // Licence read on the abstract page arxiv.org/abs/2405.05941: the
    // licence link ("view license") points to
    // http://creativecommons.org/licenses/by/4.0/, Creative Commons
    // Attribution 4.0 International. The paper's visual-matching figure
    // (figures/visual_matching.pdf) rasterised at 600 dpi, resized to
    // 1600 px, JPEG quality 82.
  },
  {
    id: 'isaac-gym-anymal-real-stairs-2021',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Viktor Makoviychuk et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/isaac-gym-anymal-real-stairs-2021.jpg',
    alt: 'A red and black ANYmal quadruped climbs a short flight of carpeted steps inside an office building, with wooden blocks on the floor nearby.',
    caption:
      'A real ANYmal climbing indoor steps with a rough-terrain policy trained in Isaac Gym. The Isaac Gym paper shows the same policy on simulated terrain beside this hardware test.',
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2108.10470',
    creator: 'Viktor Makoviychuk et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 1015,
    // Licence read on the abstract page arxiv.org/abs/2108.10470 (see
    // isaac-gym-shadow-hand-envs-2021). File figure/envs/anymal_sim2real.png
    // from the arXiv source (2465 x 1564), the real-robot panel of the
    // paper's ANYmal rough terrain figure; resized to 1600 px, JPEG
    // quality 82.
  },
  {
    id: 'mujoco-playground-franka-block-2025',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Kevin Zakka et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/mujoco-playground-franka-block-2025.jpg',
    alt: 'A real Franka Emika Panda arm with a Robotiq gripper pushes a foam yoga block across a table toward a marked goal region.',
    caption:
      "A Franka Panda pushes a yoga block to a goal with a MuJoCo Playground policy trained under domain randomization and transferred zero-shot. Early policies moved fast enough to trip the arm's force limit, so the authors added torque penalties.",
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2502.08844',
    creator: 'Kevin Zakka et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 897,
    // Licence read on the abstract page arxiv.org/abs/2502.08844 (see
    // mujoco-playground-environments-2025). File
    // figures/RealWorldNonprehensileReorientationPolicyReal.png from the
    // arXiv source (3566 x 2000), the paper's real Franka setup figure;
    // resized to 1600 px, JPEG quality 82.
  },
  // END rl-sim2real images (image brief, 2026-10-11)
  // BEGIN frontier images (image brief, 2026-10-11)
  {
    id: 'amazon-swindon-slam-line-2025',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText: 'Photo: Auledas / Wikimedia Commons. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/amazon-swindon-slam-line-2025.jpg',
    alt: "A scan, label, apply and manifest machine straddling a parcel conveyor inside Amazon's Swindon fulfilment centre, with label printers mounted above the belt inside a yellow guard frame.",
    caption:
      "A parcel labelling line at Amazon's Swindon fulfilment centre in 2025. Fixed automation repeats one narrow task and has to finish it nearly every time, the product end of the gap.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:BRS2_Amazon_fulfilment_centre_in_Swindon_2025_10.jpg',
    creator: 'Auledas',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1440,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution 4.0 International
    // license." (author Auledas, own work, 2025-03-26). Re-read on
    // 2026-10-15: same licence, and the file is byte for byte the current
    // 1920 px Commons thumbnail.
  },
  {
    id: 'tesla-optimus-stockholm-2024',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: Ulf Klingström / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/tesla-optimus-stockholm-2024.jpg',
    alt: 'Two silver and black Tesla Optimus humanoid robots standing on round black pedestals in a white-walled showroom.',
    caption:
      "Two Tesla Optimus humanoids on display in Stockholm in 2024. Tesla's 2026 updates list both of its Optimus production lines as still under construction.",
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:StockholmOptimus01.jpg',
    creator: 'Ulf Klingström',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-self',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, release this work into the public domain." (PD-self,
    // uploader Ulkl, source Ulf Klingström, 2024-05-13, Stockholm).
    // Re-read on 2026-10-15: same grant, and the file is byte for byte the
    // current 1920 px Commons thumbnail.
  },
  {
    id: 'asimo-miraikan-2016',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Sylvain Kalache / Wikimedia Commons. Licence: CC BY 2.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/asimo-miraikan-2016.jpg',
    alt: "Honda's white ASIMO humanoid robot standing on a polished floor beneath the large suspended globe display at Miraikan, Tokyo.",
    caption:
      "Honda's ASIMO performing at Miraikan, Tokyo, in 2016. The bear case holds that capital arrives on demonstrations like this one and deployment evidence arrives late.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:ASIMO_in_Miraikan_(29459011826).jpg',
    creator: 'Sylvain Kalache',
    licence: 'cc-by-2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1275,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution 2.0 Generic license." Flickr review:
    // "reviewed on 15 January 2026 by FlickreviewR 2 and was confirmed to
    // be licensed under the terms of the cc-by-2.0". Re-read on
    // 2026-10-15: same licence and review, and the file is byte for byte
    // the current 1920 px Commons thumbnail.
  },
  {
    id: 'roomba-870-2014',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Kārlis Dambrāns / Wikimedia Commons. Licence: CC BY 2.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/roomba-870-2014.jpg',
    alt: 'A round grey and black iRobot Roomba 870 robot vacuum cleaner on a light wooden floor.',
    caption:
      'An iRobot Roomba 870 in 2014. Rodney Brooks co-founded iRobot, which makes the Roomba, so his forecasts come from someone who has shipped robots.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:IRobot_Roomba_870_(15860914940).jpg',
    creator: 'Kārlis Dambrāns',
    licence: 'cc-by-2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1282,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution 2.0 Generic license." Flickr review:
    // "reviewed on 24 June 2015 by FlickreviewR and was confirmed to be
    // licensed under the terms of the cc-by-2.0". Re-read on 2026-10-15:
    // same licence and review, and the file is byte for byte the current
    // 1920 px Commons thumbnail.
  },
  {
    id: 'unitree-g1-stage-japan-mobility-2025',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: RuinDig/Yuki Uchida / Wikimedia Commons. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/unitree-g1-stage-japan-mobility-2025.jpg',
    alt: 'On a dark, spotlit stage, a Unitree G1 humanoid, a black four-legged FOX robot and a small Unitree Go2 robot dog stand in a row on a white floor.',
    caption:
      'A Unitree G1 humanoid on stage at the Japan Mobility Show 2025. Unitree is one of five backers of the humanoid thesis, one of six rival bets on how robot intelligence gets built.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Japan-Mobility-Show-2025-RuinDig_0563.jpg',
    creator: 'RuinDig/Yuki Uchida',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1080,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution 4.0 International
    // license." (own work, 2025-10-31, Tokyo Big Sight; the description
    // names the G1, VISIONOID's FOX and a Unitree Go2, left to right).
    // Re-read on 2026-10-15: same licence, and the file is byte for byte
    // the current 1920 px Commons thumbnail.
  },
  {
    id: 'amazon-drive-unit-2023',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText: 'Photo: Geni / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/amazon-drive-unit-2023.jpg',
    alt: 'An orange Amazon warehouse drive unit, a low square wheeled robot with a black circular lifting plate on top, standing on display.',
    caption:
      'An Amazon warehouse drive unit, photographed in 2023. Amazon has deployed its millionth robot, and the task-specific side bets that purpose-built machines like this one win on cost per task.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Amazon_warehouse_robot_2020.JPG',
    creator: 'Geni',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1417,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author Geni; the page dates it July 2023).
    // Re-read on 2026-10-15: same licence, and the file is byte for byte
    // the current 1920 px Commons thumbnail.
  },
  {
    id: 'uskin-tactile-allegro-hand-2021',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: XELA Robotics / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/uskin-tactile-allegro-hand-2021.jpg',
    alt: 'A four-fingered Allegro robot hand on a white background, every finger segment and fingertip covered in soft black tactile sensor pads.',
    caption:
      "XELA Robotics' uSkin tactile sensors on every finger segment of an Allegro hand, 2021. They measure the contact that cameras lose once the fingers close.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:USkin_Sensor_Integration.png',
    creator: 'XELA Robotics',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1778,
    height: 2000,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author XELA Robotics, own work,
    // 2021-06-24). Commons PNG flattened onto white, resized to 2000 px
    // tall and saved as JPEG quality 82. Re-read on 2026-10-15: same
    // licence.
  },
  {
    id: 't-rex-bimanual-tactile-setup-2026',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Dantong Niu et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/t-rex-bimanual-tactile-setup-2026.jpg',
    alt: 'A white bimanual robot with two dexterous hands at a wooden table, shown from the front and the side, with callouts for its head camera and wrist cameras and, at left, the Manus gloves, Vive trackers and laptop controller used to teleoperate it.',
    caption:
      'The T-Rex rig: a bimanual robot with two 22-DoF Sharpa Wave hands, a head camera and two wrist cameras, and the gloves and trackers that teleoperate it.',
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2606.17055',
    creator: 'Dantong Niu et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 601,
    // Licence read on the abstract page arxiv.org/abs/2606.17055: the
    // licence link points to http://creativecommons.org/licenses/by/4.0/,
    // Creative Commons Attribution 4.0 International. File
    // figures/setup_v3_0528.pdf from the arXiv source (the robot-system
    // setup figure), rasterised at 300 dpi, white margins trimmed, resized
    // to 1600 px, JPEG quality 82. Re-read on 2026-10-15: same licence
    // link; the paper's setup section names "a fixed-base bimanual Dexmate
    // Vega-1 robot with two 22-DoF Sharpa Wave dexterous hands".
  },
  {
    id: 'fingr-cube-layer-turn-2026',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Yutong Liang et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/fingr-cube-layer-turn-2026.jpg',
    alt: "Six photographs of one robotic hand and a 2×2×2 cube, labelled Pick up, then Start, Turn, Complete and Reset for one 90-degree layer turn, then Solved.",
    caption:
      'FINGR picks up a 2×2×2 cube, turns one layer at a time inside a single real hand and resets its fingers between turns until the cube is solved.',
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2609.33973',
    creator: 'Yutong Liang et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 500,
    // Licence read on the abstract page arxiv.org/abs/2609.33973: the
    // licence link points to http://creativecommons.org/licenses/by/4.0/,
    // Creative Commons Attribution 4.0 International. File
    // figures/teaser.pdf from the arXiv source (the paper's first figure),
    // rasterised at 300 dpi, white margins trimmed, resized to 1600 px,
    // JPEG quality 82. Re-read on 2026-10-15: same licence link.
  },
  {
    id: 'droid-cook-lentils-rollouts-2024',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Alexander Khazatsky et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/droid-cook-lentils-rollouts-2024.jpg',
    alt: 'A grid of robot camera frames in a home kitchen: rows labelled DROID (ours), OXE and No Co-Train, columns labelled Remove Lid, Pick up Lentils, Pour Lentils and Turn on Stove, each frame outlined green for success or red for failure.',
    caption:
      "One cooking task in a home kitchen with unseen distractors, under three training mixes. Only the policy co-trained on DROID's in-the-wild data finishes all four steps.",
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2403.12945',
    creator: 'Alexander Khazatsky et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 700,
    // Licence read on the abstract page arxiv.org/abs/2403.12945: the
    // licence link points to http://creativecommons.org/licenses/by/4.0/,
    // Creative Commons Attribution 4.0 International. File
    // figures/droid_qualitative_rollout.pdf from the arXiv source (the
    // paper's "Cook Lentils" rollout figure), rasterised, white margins
    // trimmed, resized to 1600 px, JPEG quality 82. Re-read on 2026-10-15:
    // same licence link; the paper's Fig. 7 caption places the task "in
    // the kitchen of one of the authors" with "unseen distractor objects".
  },
  {
    id: 'egoscale-robot-platforms-2026',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Ruijie Zheng et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/egoscale-robot-platforms-2026.jpg',
    alt: 'Two humanoid robots side by side: a Galaxea R1 Pro labelled 22-dof Sharpa Hand and a Unitree G1 labelled 7-dof Tri-finger Hand, with lines to the OAK-D-Wide head camera and OAK-1-Wide wrist cameras each carries.',
    caption:
      "EgoScale's two robots: a Galaxea R1 Pro with 22-DoF Sharpa hands and a Unitree G1 with 7-DoF tri-finger hands. On the G1, human-video pretraining added over 30 points of absolute success on both evaluated tasks.",
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2602.16710',
    creator: 'Ruijie Zheng et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 860,
    // Licence read on the abstract page arxiv.org/abs/2602.16710: the
    // licence link points to http://creativecommons.org/licenses/by/4.0/,
    // Creative Commons Attribution 4.0 International. File
    // assets/sources/figures/robot_system.pdf from the arXiv source (the
    // robot-system figure), rasterised at 300 dpi, white margins trimmed,
    // resized to 1600 px, JPEG quality 82. Re-read on 2026-10-15: same
    // licence link; the paper states "On the Unitree G1 robot with a
    // tri-finger hand, human-pretrained policies also achieve over 30%
    // absolute improvement in success rate across both evaluated tasks".
  },
  {
    id: 'robotic-welding-cell-guarding-2014',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: WireCrafters / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/robotic-welding-cell-guarding-2014.jpg',
    alt: 'A robotic welding cell on a factory floor, seen from above, enclosed by red weld curtains and yellow and black guard posts.',
    caption:
      'A robotic weld cell behind machine guarding and weld curtains. Fencing people out is the oldest safeguard; robots that work without a fence use one of four collaborative modes.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Robotic_Welding_Cell.jpg',
    creator: 'WireCrafters',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1251,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (author WireCrafters, own work, 2014-03-06).
    // Re-read on 2026-10-15: same licence, and the file is byte for byte
    // the current 1920 px Commons thumbnail.
  },
  {
    id: 'emergency-stop-siemens-2006',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Stahlkocher / Wikimedia Commons. Licence: CC BY-SA 3.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/emergency-stop-siemens-2006.jpg',
    alt: 'A red mushroom-head Siemens emergency-stop button on a round yellow collar, set into a dark machine-control panel beside a keypad.',
    caption:
      'A Siemens emergency-stop actuator on a machine control panel. It acts only after a person has seen the hazard and pressed it.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Not-Aus_Bet%C3%A4tiger.jpg',
    creator: 'Stahlkocher',
    licence: 'cc-by-sa-3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1438,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 3.0 Unported license."
    // The page grants it through the GFDL template's licence migration
    // (GFDL 1.2 or later, relicensed); the site relies on CC BY-SA 3.0.
    // Re-read on 2026-10-15: same licence, and the file is byte for byte
    // the current 1920 px Commons thumbnail.
  },
  {
    id: 'wcbf-hyper-redundant-robot-2026',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Zijian Cai et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/wcbf-hyper-redundant-robot-2026.jpg',
    alt: 'Photograph of a slender robot of white frames linked by pairs of flexible racks, curving across a black background, with labels for Fixed Base, PLA Racks, Embedded Motor and Lighthouse Deck.',
    caption:
      "Cai and colleagues' hyper-redundant robot: five segments that extend and bend as their motors drive paired flexible racks. Weighted barrier functions kept it clear of obstacles while correcting its tracking.",
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2609.24062',
    creator: 'Zijian Cai et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 839,
    // Licence read on the abstract page arxiv.org/abs/2609.24062: the
    // licence link points to http://creativecommons.org/licenses/by/4.0/,
    // Creative Commons Attribution 4.0 International. File
    // Figures/robot_system_2_V2.pdf from the arXiv source (panel (a) of
    // the robot-system figure), rasterised, white margins trimmed, resized
    // to 1600 px, JPEG quality 82. Re-read on 2026-10-15: same licence
    // link; the paper describes "a rack-based 5-segment hyper-redundant
    // robot" whose racks extend a segment together and bend it
    // differentially.
  },
  {
    id: 'knowno-ask-for-help-2023',
    figureKind: 'paper-figure',
    legalBasis: 'cc-by',
    attributionText:
      'Paper figure: Allen Z. Ren et al. / arXiv. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/knowno-ask-for-help-2023.jpg',
    alt: 'Three-column diagram: a person asks a robot arm to put the bowl in the microwave; the planner scores four next steps, conformal prediction keeps two above its threshold, and the robot asks which one, plastic or metal; photos at right show the test environments.',
    caption:
      'Told to put the bowl in the microwave with a plastic and a metal bowl in view, KnowNo keeps two plans above its conformal threshold and asks which bowl is meant.',
    sourceName: 'arXiv',
    sourceUrl: 'https://arxiv.org/abs/2307.01928',
    creator: 'Allen Z. Ren et al.',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1600,
    height: 866,
    // Licence read on the abstract page arxiv.org/abs/2307.01928: the
    // licence link points to http://creativecommons.org/licenses/by/4.0/,
    // Creative Commons Attribution 4.0 International. File
    // figures/robot-help-teaser.pdf from the arXiv source (the paper's
    // first figure), rasterised at 300 dpi, white margins trimmed, resized
    // to 1600 px, JPEG quality 82. Re-read on 2026-10-15: same licence
    // link.
  },
  // END frontier images (image brief, 2026-10-11)
  // BEGIN adjacent images (image brief, 2026-10-11)
  {
    id: 'waymo-jaguar-ipace-san-francisco-2023',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText: 'Photo: Dllu / Wikimedia Commons. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/waymo-jaguar-ipace-san-francisco-2023.jpg',
    alt: 'A white Waymo Jaguar I-Pace with a roof-mounted sensor dome and sensor pods on its fenders driving through a San Francisco intersection, the downtown skyline behind it and nobody in the driver’s seat.',
    caption:
      "A Waymo Jaguar I-Pace driving itself through San Francisco in 2023. Waymo's 2025 study of 56.7 million rider-only miles found statistically significant crash reductions against human benchmarks in every outcome it could test.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Waymo_Jaguar_I-Pace_in_San_Francisco_2023_dllu.jpg',
    creator: 'Dllu',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1440,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution 4.0 International
    // license." (own work, 2023-11-21).
  },
  {
    id: 'waymo-roof-sensor-suite-2025',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText: 'Photo: 9yz / Wikimedia Commons. Licence: CC BY 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/waymo-roof-sensor-suite-2025.jpg',
    alt: 'Close-up of the roof of a white Waymo Jaguar I-Pace: a domed lidar housing on a raised black mount, ringed by smaller camera and radar windows.',
    caption:
      "The roof sensor package of a Waymo I-Pace in San Francisco, 2025. Waymo fuses lidar, camera and radar, paying for active range sensing that works in the dark and measures geometry directly.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Waymo_Jaguar_I-Pace_-_Roof_Sensor_Closeup.jpg',
    creator: '9yz',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1281,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution 4.0 International
    // license." (own work, 2025-05-31).
  },
  {
    id: 'cmu-boss-urban-challenge-winner',
    figureKind: 'photograph',
    legalBasis: 'cc-by',
    attributionText:
      'Photo: Steve Jurvetson / Wikimedia Commons. Licence: CC BY 2.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/cmu-boss-urban-challenge-winner.jpg',
    alt: "Front view of Carnegie Mellon's Boss, a black Chevrolet Tahoe numbered 19, with a rack of lidar and camera sensors on its roof and more sensors on its bumper, on display in a darkened hall.",
    caption:
      "Carnegie Mellon's Boss, winner of the 2007 DARPA Urban Challenge, on display in 2008. Route planning, behaviour decisions and local motion planning, the classical toolbox of its era, remain live production components.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:CMU_carbot_(2328347458).jpg',
    creator: 'Steve Jurvetson',
    licence: 'cc-by-2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1344,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution 2.0 Generic license." Flickr review:
    // "reviewed on 13 December 2020 by FlickreviewR 2 and was confirmed to
    // be licensed under the terms of the cc-by-2.0". The Flickr description
    // names it "The winner of the first DARPA urban challenge".
  },
  {
    id: 'racing-quadrotor-minion-220-2016',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Commanderbryce / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/racing-quadrotor-minion-220-2016.jpg',
    alt: 'A small racing quadrotor on a wooden table: a bare carbon frame with four orange propellers, a green flight-controller board, a battery strapped on top and a forward-facing camera.',
    caption:
      'A Minion 220 racing quadrotor with its forward camera, 2016. Machines of this class exceed 100 km/h, and in 2023 a reinforcement-learning system beat three human world champions at racing them.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Racing_Drone.jpg',
    creator: 'Commanderbryce',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1272,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (own work, 2016-03-14).
  },
  {
    id: 'dji-mavic-pro-in-flight',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText: 'Photo: Sinky / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/dji-mavic-pro-in-flight.jpg',
    alt: 'A grey DJI Mavic Pro quadcopter hovering against a cloudy sky, propellers blurred, its camera hanging below the front of the body.',
    caption:
      'A DJI Mavic Pro in flight, 2017. On an autonomous drone, visual-inertial odometry fuses camera features with inertial measurements into the pose and velocity the controller needs, with no GPS or motion capture.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:DJI_Mavic_Pro.jpg',
    creator: 'Sinky',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (own work, 2017-03-04).
  },
  {
    id: 'perseverance-selfie-rochette-2021',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText: 'Photo: NASA / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/perseverance-selfie-rochette-2021.jpg',
    alt: "NASA's Perseverance rover on reddish Martian ground, its mast camera head raised, beside a flat rock with two small drill holes, under a hazy orange sky.",
    caption:
      'Perseverance beside the rock Rochette on sol 198, September 2021, with two drill holes where its arm took cores. In its first Mars year, its AutoNav system evaluated 88 percent of the 17.7 km the rover drove.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:PIA24836_Perseverance%27s_Selfie_at_Rochette.jpg',
    creator: 'NASA',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-NASA',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1080,
    // Licence sentence read on the file page: "This file is in the public
    // domain in the United States because it was solely created by NASA."
    // (PIA24836; artist NASA; taken 2021-09-10, sol 198.)
  },
  {
    id: 'ingenuity-mastcam-z-closeup-2021',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: NASA/JPL-Caltech/ASU/MSSS / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/ingenuity-mastcam-z-closeup-2021.jpg',
    alt: 'The Ingenuity helicopter standing on four thin legs on rust-coloured Martian soil, its two stacked rotors and the solar panel on top casting a long shadow.',
    caption:
      'Ingenuity on Mars, photographed by Perseverance on 5 April 2021, two weeks before its first flight. Qualified for five flights in thirty days, it flew 72 times over almost three years.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Mastcam-Z_Gives_Ingenuity_a_Close-up.jpg',
    creator: 'NASA/JPL-Caltech/ASU/MSSS',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-NASA',
    retrieved: '2026-10-11',
    width: 1604,
    height: 1196,
    // Licence sentence read on the file page: "This file is in the public
    // domain in the United States because it was solely created by NASA."
    // The original is 1604 px wide and ships as served.
  },
  {
    id: 'moxie-installation-perseverance-2020',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText: 'Photo: NASA / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/moxie-installation-perseverance-2020.jpg',
    alt: 'Technicians in white cleanroom suits lower a gold-coloured box, the MOXIE oxygen experiment, into the open chassis of the Perseverance rover in a clean room.',
    caption:
      "Mars 2020 team members install MOXIE in Perseverance's chassis. On Mars it made 122 grams of oxygen from atmospheric carbon dioxide across sixteen runs, about twice NASA's original production goals.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:PIA23154_MOXIE_experience_is_installed_into_the_chassis_of_the_Mars_rover_Perseverance.jpg',
    creator: 'NASA',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-NASA',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "This file is in the public
    // domain in the United States because it was solely created by NASA."
    // (PIA23154, 2020.)
  },
  {
    id: 'dextre-canadarm2-iss-2017',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText: 'Photo: NASA / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/dextre-canadarm2-iss-2017.jpg',
    alt: 'The two-armed Dextre robot hanging from the end of the long white Canadarm2 outside the International Space Station, with solar arrays and the black of space behind.',
    caption:
      "Dextre on the end of Canadarm2 in January 2017, during weeks spent swapping the station's batteries. Ground crews plan and fly every such task by teleoperation.",
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:ISS-50_Canadarm2_with_Dextre_robot_(1).jpg',
    creator: 'NASA',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-NASA',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1278,
    // Licence sentence read on the file page: "This file is in the public
    // domain in the United States because it was solely created by NASA."
    // (ISS-50 crew photograph, 2017-01-08.)
  },
  {
    id: 'da-vinci-xi-patient-cart-2018',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Alvarogarciamd / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/da-vinci-xi-patient-cart-2018.jpg',
    alt: 'A white da Vinci Xi patient-side cart in a hospital room, four jointed instrument arms hanging from an overhead boom on a wheeled base.',
    caption:
      'A da Vinci Xi patient-side cart with its four instrument arms, 2018. Every motion its arms make is a surgeon’s command.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:New_Da_Vinci_Xi.jpg',
    creator: 'Alvarogarciamd',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1440,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (own work, 2018-09-29).
  },
  {
    id: 'da-vinci-xi-surgeon-console-vesoul-2023',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: A.BourgeoisP / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/da-vinci-xi-surgeon-console-vesoul-2023.jpg',
    alt: 'The front of a da Vinci Xi surgeon console: two eyepieces of the stereo viewer above a pair of hand controllers, with an armrest and touch panel below.',
    caption:
      'The stereo viewer and hand controllers of a da Vinci Xi surgeon console. Motion scaling and tremor filtering sit between these grips and the instruments, and the surgeon remains planner and controller: Level 0 autonomy.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:2023-09_-_Robot_chirurgien_Da_Vinci_Xi_-_Centre_hospitalier_de_Vesoul_-_09.jpg',
    creator: 'A.BourgeoisP',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-10-11',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "I, the copyright holder of
    // this work, hereby publish it under the following license: This file
    // is licensed under the Creative Commons Attribution-Share Alike 4.0
    // International license." (own work, 2023-09-23, public open day at
    // the Vesoul hospital).
  },
  // END adjacent images (image brief, 2026-10-11)
];

export const IMAGES: SiteImage[] = [...ARTICLE_IMAGES, ...LOGO_IMAGES];

const byId = new Map(IMAGES.map((image) => [image.id, image]));

/** Look up a registry entry; undefined for an unregistered id. */
export function getImage(id: string): SiteImage | undefined {
  return byId.get(id);
}

/** The display label a credit line and /credits show for a licence. */
export function licenceLabel(image: SiteImage): string {
  return LICENCE_LABELS[image.licence];
}

/**
 * What the entry is. Declared on every editorial image; derived for the
 * market-map marks, whose hundred-odd rows are owned by `VAL-B2-MAP-010`
 * and are all the same kind by construction (they live under
 * `public/images/logos/` because they are company marks).
 */
export function figureKind(image: SiteImage): FigureKind {
  if (image.figureKind) return image.figureKind;
  if (isCompanyMarkFile(image.file)) return 'official-mark';
  throw new Error(
    `${image.id} declares no figureKind and is not a market-map mark`,
  );
}

/**
 * The §1.13 legal basis, declared or derived from the recorded licence.
 *
 * A company mark is not covered by the licence its file happens to carry.
 * §1.13 says "Company marks use `official-identification-use`" without
 * qualification, and `VAL-B2-IMG-008` calls it "the distinct
 * official-identification-use path in VAL-B2-MAP-010" that marks use ONLY.
 * Falling back to the licence map published a mark carrying `apache-2.0`
 * as resting on `cc-by`, which is a claim about somebody else's trademark
 * that the contract does not let this repository make.
 */
export function legalBasis(image: SiteImage): LegalBasis {
  if (isCompanyMarkFile(image.file)) return 'official-identification-use';
  return image.legalBasis ?? LEGAL_BASIS_BY_LICENCE[image.licence];
}

/**
 * The byte/style preservation policy. A mark carries the same promise as an
 * external photograph: the shipped bytes are the retrieved bytes, and only
 * the contain-fit placement `VAL-B2-MAP-010` registers may differ.
 */
export function preservationPolicy(image: SiteImage): PreservationPolicy {
  return image.preservationPolicy ?? 'external-bytes-preserved';
}

/** The noun the visible credit opens with, from what the figure is. */
export function creditNoun(image: SiteImage): string {
  return CREDIT_NOUNS[figureKind(image)];
}

/**
 * The attribution sentence this entry requires, in the wording the credit
 * renders. Editorial entries also record it verbatim; the schema refuses a
 * record that disagrees with this derivation, so the two cannot drift.
 */
export function attributionText(image: SiteImage): string {
  return image.attributionText ?? attributionSentence(image);
}
