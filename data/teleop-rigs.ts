/**
 * Teleop-rig comparison data: one row per reference rig family, for the
 * /data-hardware/teleop-rigs module.
 *
 * Sources: research/03-data-hardware-evaluation.md (Part C) plus live
 * verification of the underlying primary sources (2026-08-09). Rules:
 *   - Figures no source publishes are null and render as "not disclosed";
 *     nothing is guessed (the VR family's total system cost).
 *   - Costs are representative USD figures from cited first-party sources:
 *     GELLO's sub-$300 BOM (project site), UMI's $73 gripper + $298 GoPro
 *     (paper, Sec. III), ALOHA 2's $17,000-$32,000 range low end (LeRobot
 *     ecosystem pricing table). research/03's "~$100" UMI figure is wrong;
 *     the paper's own BOM totals $371.
 *   - Ratings are ordered low < medium < high; each note states what the
 *     rating means for that dimension and row.
 *
 * The array is Zod-validated at import time, so a malformed row fails the
 * build, the dev server, and the test suite immediately. The runtime import
 * keeps its explicit .ts extension so plain node can load this file too.
 */
import { z } from 'zod';
import { teleopRigSchema, type TeleopRig } from './schemas/teleop-rig.ts';

export type { RigRating, TeleopRig } from './schemas/teleop-rig.ts';

const ROWS: TeleopRig[] = [
  {
    id: 'aloha-workstation',
    name: 'ALOHA-class workstation',
    family: 'Bimanual leader-follower workstation',
    representatives: ['ALOHA 2 (Stanford)', 'Trossen AI Stationary and Mobile AI'],
    costUsd: 17000,
    costNote: 'ALOHA 2 runs $17,000-$32,000; Trossen AI bimanual rigs $15,995-$22,995',
    dataQuality: 'high',
    dataQualityNote:
      'Leader and follower arms share kinematics; demonstrations land directly in the robot joint space at 500 Hz',
    throughput: 'low',
    throughputNote:
      'One operator per fixed workstation; every additional collector costs another full rig',
    embodimentGap: 'low',
    embodimentGapNote:
      'The operator drives a kinematically identical arm, so recorded motion is the robot motion',
    details: {
      cost:
        'ALOHA 2 lists at $17,000-$32,000 depending on configuration in the LeRobot ecosystem pricing table. Trossen Robotics, which rebranded the ALOHA line as Trossen AI in 2025-2026, cut prices 30-34% across the board: the bimanual Stationary AI at $15,995 and Mobile AI at $22,995, with the single-arm WidowX AI entry point at $2,995.',
      dataQuality:
        'The leader arm is a twin of the follower arm, so demonstrations are recorded directly in the robot joint space with no retargeting step. The Trossen AI line runs a 500 Hz CAN FD control loop with the iNerve board and integrates LeRobot and OpenPI. ACT learned six difficult bimanual tasks to 80-90% success from only 10 minutes of demonstrations on the original low-cost ALOHA hardware.',
      throughput:
        'Scaling an ALOHA-class fleet means buying and staffing another workstation at $17,000-$32,000 each. Mobile ALOHA collected 50 demonstrations per task for its whole-body mobile skills. No fleet-scale collection numbers are published for the family; the throughput story here is per-rig quality, not volume.',
      embodimentGap:
        'Effectively zero by construction: the operator moves the same kinematic chain the policy will run on, so the only gap is between the operator skill and the task, not between two different bodies.',
    },
    links: [
      { label: 'ACT paper', url: 'https://arxiv.org/abs/2304.13705' },
      { label: 'Trossen AI', url: 'https://www.trossenrobotics.com/ai' },
    ],
    sources: [
      'act-aloha-2023',
      'mobile-aloha-2024',
      'trossen-ai-2026',
      'lerobot-pricing-2026',
    ],
  },
  {
    id: 'gello',
    name: 'GELLO',
    family: 'Kinematically matched exoskeleton',
    representatives: ['GELLO for Franka, UR5, and xArm'],
    costUsd: 300,
    costNote: 'Parts BOM under $300; excludes the target robot arm',
    dataQuality: 'high',
    dataQualityNote:
      'A scaled kinematic twin of the target arm; joint readings map one-to-one onto robot commands',
    throughput: 'medium',
    throughputNote:
      'Under $300 and about 30 minutes to assemble, but each target arm model needs its own build',
    embodimentGap: 'low',
    embodimentGapNote:
      'The replica shares the arm joint structure, so the operator feels the arm constraints directly',
    details: {
      cost:
        'GELLO is built from 3D-printed links and economical off-the-shelf motors, with a parts list under $300 according to the project site. That buys the controller only: the robot arm it drives is a separate cost, so a full GELLO station costs a GELLO plus whatever the target arm costs.',
      dataQuality:
        'The device is constructed with the same kinematic structure as the target arm, so joint readings map directly onto robot commands with no inverse-kinematics remapping. In the paper user study with 12 participants and 5 bimanual UR5 tasks, GELLO produced more reliable and more efficient demonstration collection than VR controllers or a 3D spacemouse.',
      throughput:
        'A GELLO assembles in about 30 minutes from printed and catalog parts, so duplicating a station is cheap. The constraint is universality: every new robot model needs its own kinematically matched design, and the published builds cover Franka, UR5, and xArm.',
      embodimentGap:
        'Because the replica is a scaled kinematic twin (the paper used a scaling factor alpha = 0.5), the operator feels the arm joint limits and structure through the linkage and controls directly in joint space. The paper frames this as reducing the embodiment gap between the user and the target arm.',
    },
    links: [
      { label: 'GELLO paper', url: 'https://arxiv.org/abs/2309.13037' },
      { label: 'Project site', url: 'https://wuphilipp.github.io/gello/' },
    ],
    sources: ['gello-2023'],
  },
  {
    id: 'umi',
    name: 'UMI',
    family: 'Handheld gripper, no robot at collection',
    representatives: ['UMI gripper with GoPro wrist camera'],
    costUsd: 371,
    costNote: '$73 printed gripper + $298 GoPro and accessories, per gripper',
    dataQuality: 'medium',
    dataQualityNote:
      '155-degree fisheye wrist camera with SLAM-recovered gripper pose; no force channel',
    throughput: 'high',
    throughputNote:
      'About 30 seconds per demonstration; over 3x faster than spacemouse teleoperation on the paper benchmark',
    embodimentGap: 'medium',
    embodimentGapNote:
      'A handheld gripper stands in for the robot gripper; latency matching and relative-trajectory actions close the gap at deployment',
    details: {
      cost:
        'The paper bills the 3D-printed gripper at $73 and the GoPro camera and accessories at $298, for a $371 collection rig per gripper. Deployment still needs a robot arm with a parallel-jaw gripper of more than 85 mm stroke, which the paper demonstrated on UR5 and Franka.',
      dataQuality:
        'A wrist-mounted GoPro with a 155-degree fisheye lens and side mirrors supplies the visual context, and SLAM recovers the gripper pose at high frequency. There is no force or tactile channel, and the recorded motion comes from a human hand holding a gripper, not from a robot. UMI answers the deployability problem with inference-time latency matching and a camera-relative trajectory action representation.',
      throughput:
        'The project site reports collection at about 30 seconds per demonstration, measured at 111 demonstrations per hour on the cup arrangement task against 35 per hour for spacemouse teleoperation and 231 per hour for the unassisted human hand, i.e. 48% of human hand speed. Because no robot is present, collection can start in any home or restaurant within 2 minutes.',
      embodimentGap:
        'The handheld gripper approximates a robot parallel jaw but is not one, and the human hand moves unlike any arm. UMI policies deploy zero-shot only because the interface aligns observation and action latency and represents actions relative to the camera frame; the same policy then runs on any arm with a compatible gripper.',
    },
    links: [
      { label: 'UMI paper', url: 'https://arxiv.org/abs/2402.10329' },
      { label: 'Project site', url: 'https://umi-gripper.github.io/' },
    ],
    sources: ['umi-2024'],
  },
  {
    id: 'vr-teleop',
    name: 'VR teleoperation',
    family: 'Headset plus retargeted human motion',
    representatives: ['DROID Quest 2 rig', 'Open-TeleVision', 'Bunny-VisionPro'],
    // No source publishes a total system cost for the family: the DROID
    // stack (Quest 2 + Franka + 3 ZED cameras) and the Bunny-VisionPro
    // stack (Vision Pro + dexterous hands) are both unpriced as systems.
    // Headset prices live in the module prose, not in this cell.
    costUsd: null,
    dataQuality: 'medium',
    dataQualityNote:
      'Immersive stereo view and mirrored motion; actions are retargeted from the operator, not recorded from robot joints',
    throughput: 'high',
    throughputNote:
      'DROID: 50 operators across 13 institutions collected 76,000 trajectories (350 hours) in 12 months',
    embodimentGap: 'high',
    embodimentGapNote:
      'Human hand and controller poses must be remapped through IK onto robot joints; calibration and avoidance layers exist because the mapping drifts',
    details: {
      cost:
        'No system cost is published. The family spans commodity headsets (DROID used Meta Quest 2 with Franka Panda rigs) up to an Apple Vision Pro, launched at $3,499, driving dexterous hands in Bunny-VisionPro, and the robot hardware dominates the total either way.',
      dataQuality:
        'The operator sees the robot world in stereo and their motion is mirrored onto the robot. Fidelity rides on the retargeting layer: DROID data trained diffusion policies that beat the next-best dataset by 22% in-distribution, while Open-TeleVision adds active stereoscopic rendering and Bunny-VisionPro adds low-cost haptic feedback plus collision and singularity avoidance.',
      throughput:
        'DROID is the fleet proof: 50 operators at 13 institutions collected 76,000 trajectories totaling 350 hours over 12 months on standardized rigs. Headsets are commodity hardware and the robot stays fixed, so adding operators does not require rebuilding the station.',
      embodimentGap:
        'Human hands and VR controllers share no kinematics with robot arms, so every action passes through a retargeting layer with IK and calibration. DROID maintains calibration protocols for exactly this reason, and Bunny-VisionPro builds collision and singularity avoidance into the mapping. The retargeting is where demonstration quality is kept or lost.',
    },
    links: [
      { label: 'DROID', url: 'https://droid-dataset.github.io/' },
      { label: 'Open-TeleVision', url: 'https://arxiv.org/abs/2407.01512' },
      { label: 'Bunny-VisionPro', url: 'https://arxiv.org/abs/2407.03162' },
    ],
    sources: ['droid-2024', 'open-television-2024', 'bunny-visionpro-2024'],
  },
];

/** Zod-validated rows; an invalid entry throws at import time. */
export const TELEOP_RIGS: TeleopRig[] = z.array(teleopRigSchema).parse(ROWS);
