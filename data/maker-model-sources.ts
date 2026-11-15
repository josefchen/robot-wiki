/**
 * Robot makers' own 3D model files: one row per maker, licence and
 * repository, for the Robots in 3D page.
 *
 * Every row was opened on MAKER_MODEL_SOURCES_AS_OF: the repository at the
 * pinned commit (file tree and committer date) and the licence text at that
 * commit, read raw. none-found rows cite the maker's own GitHub account or
 * site as read that day; they record that nothing was found, not that
 * nothing exists. A third party's repackaging never counts as the maker's
 * file. Counts and groupings are computed in lib/maker-model-sources.ts.
 *
 * Type-only import with an explicit .ts extension, as in data/models-3d.ts,
 * so plain node can load this file; the schema parses it in the unit suite.
 */
import type { MakerModelSource } from './schemas/maker-model-source.ts';

export type {
  MakerModelSource,
  MakerModelStatus,
  ModelFormat,
} from './schemas/maker-model-source.ts';

export const MAKER_MODEL_SOURCES_AS_OF = '2026-11-15';

const CHECKED = MAKER_MODEL_SOURCES_AS_OF;

export const MAKER_MODEL_SOURCES: MakerModelSource[] = [
  {
    id: 'unitree-ros',
    maker: 'Unitree Robotics',
    robots: [
      'A1', 'A2', 'Aliengo', 'AS2', 'B1', 'B2', 'B2W', 'G1', 'G1-D', 'Go1',
      'Go2', 'Go2W', 'H1', 'H1-2', 'H2', 'H2 Plus', 'H2X', 'Laikago', 'R1',
      'R1 Air', 'Z1', 'Dexterous hands',
    ],
    status: 'official',
    repository: 'https://github.com/unitreerobotics/unitree_ros',
    commit: {
      hash: '157ff950351e5f535e03c5d85a16b7d594b3dbcc',
      date: '2026-11-13',
    },
    formats: ['URDF', 'MJCF'],
    licence: {
      name: 'BSD-3-Clause',
      url: 'https://github.com/unitreerobotics/unitree_ros/blob/157ff950351e5f535e03c5d85a16b7d594b3dbcc/LICENSE',
    },
    hostedModelId: 'unitree-g1',
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/unitreerobotics/unitree_ros/tree/157ff950351e5f535e03c5d85a16b7d594b3dbcc/robots',
        title: 'unitree_ros at 157ff950, robots/',
        kind: 'primary',
      },
      {
        url: 'https://github.com/unitreerobotics/unitree_ros/blob/157ff950351e5f535e03c5d85a16b7d594b3dbcc/robots/g1_description/meshes/head_link.STL',
        title: 'unitree_ros at 157ff950, G1 head_link.STL (932,784 bytes)',
        kind: 'primary',
      },
    ],
    note: 'Its G1 meshes are the fuller set: head_link.STL is 932,784 bytes here and 337,584 bytes in unitree_mujoco.',
  },
  {
    id: 'unitree-mujoco',
    maker: 'Unitree Robotics',
    robots: [
      'A2', 'AS2', 'B2', 'B2W', 'G1', 'Go2', 'Go2W', 'H1', 'H1-2', 'H2', 'R1',
    ],
    status: 'official',
    repository: 'https://github.com/unitreerobotics/unitree_mujoco',
    commit: {
      hash: '1eb6642e3f3fdfb7fb13a9794fd6a2dd93ea0e7d',
      date: '2026-09-07',
    },
    formats: ['MJCF'],
    licence: {
      name: 'BSD-3-Clause',
      url: 'https://github.com/unitreerobotics/unitree_mujoco/blob/1eb6642e3f3fdfb7fb13a9794fd6a2dd93ea0e7d/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/unitreerobotics/unitree_mujoco/tree/1eb6642e3f3fdfb7fb13a9794fd6a2dd93ea0e7d/unitree_robots',
        title: 'unitree_mujoco at 1eb6642e, unitree_robots/',
        kind: 'primary',
      },
      {
        url: 'https://github.com/unitreerobotics/unitree_mujoco/blob/1eb6642e3f3fdfb7fb13a9794fd6a2dd93ea0e7d/unitree_robots/g1/meshes/head_link.STL',
        title: 'unitree_mujoco at 1eb6642e, G1 head_link.STL (337,584 bytes)',
        kind: 'primary',
      },
    ],
    note: 'Its G1 meshes differ from unitree_ros: the same head_link.STL is 337,584 bytes here against 932,784 there.',
  },
  {
    id: 'robot-studio-so-arm100',
    maker: 'The Robot Studio',
    robots: ['SO-100', 'SO-101'],
    status: 'official',
    repository: 'https://github.com/TheRobotStudio/SO-ARM100',
    commit: {
      hash: 'a758567c3978dfeefe282ede0500085a48fe8f78',
      date: '2026-10-06',
    },
    formats: ['URDF', 'MJCF'],
    licence: {
      name: 'Apache-2.0',
      url: 'https://github.com/TheRobotStudio/SO-ARM100/blob/a758567c3978dfeefe282ede0500085a48fe8f78/LICENSE',
    },
    hostedModelId: 'so-101',
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/TheRobotStudio/SO-ARM100/tree/a758567c3978dfeefe282ede0500085a48fe8f78/Simulation',
        title: 'SO-ARM100 at a758567c, Simulation/',
        kind: 'primary',
      },
    ],
    note: 'SO-101 ships URDF and MJCF; SO-100 ships URDF only.',
  },
  {
    id: 'ubtech-walker-s2',
    maker: 'UBTech',
    robots: ['Walker S2'],
    status: 'official',
    repository: 'https://github.com/UBTECH-Robot/WalkerS2-Model',
    commit: {
      hash: 'ca2ab983363d52a5e22ddf3a4d979ceaa675c374',
      date: '2026-05-26',
    },
    formats: ['URDF', 'USD'],
    licence: {
      name: 'OpenAtom Open Hardware License 0.4.3',
      url: 'https://github.com/UBTECH-Robot/WalkerS2-Model/blob/ca2ab983363d52a5e22ddf3a4d979ceaa675c374/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/UBTECH-Robot/WalkerS2-Model/tree/ca2ab983363d52a5e22ddf3a4d979ceaa675c374',
        title: 'WalkerS2-Model at ca2ab983: 3 URDF, 167 STL, 10 USD files',
        kind: 'primary',
      },
    ],
    note: 'Clause 3.1 allows redistribution with the licence attached, notices kept and modifications marked.',
  },
  {
    id: 'fourier-grx',
    maker: 'Fourier',
    robots: ['GR-1', 'GR-2', 'GR-3', 'Fourier 6-DoF hand'],
    status: 'official',
    repository: 'https://github.com/FFTAI/Wiki-GRx-Models',
    commit: {
      hash: '7d96c758f048fe1bf92b3258864d94771ae0c093',
      date: '2025-11-13',
    },
    formats: ['URDF', 'MJCF'],
    licence: {
      name: 'GPL-3.0',
      url: 'https://github.com/FFTAI/Wiki-GRx-Models/blob/7d96c758f048fe1bf92b3258864d94771ae0c093/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/FFTAI/Wiki-GRx-Models/tree/7d96c758f048fe1bf92b3258864d94771ae0c093/GRX',
        title: 'Wiki-GRx-Models master at 7d96c758, GRX/',
        kind: 'primary',
      },
    ],
    note: 'GPL-3.0 on master; MJCF exists for GR-2 and GR-3 only.',
  },
  {
    id: 'fourier-n1',
    maker: 'Fourier',
    robots: ['N1'],
    status: 'official',
    repository: 'https://github.com/FFTAI/Wiki-GRx-Models',
    commit: {
      hash: 'f8e683f00d1d99deb882deb9dfce6030095b466a',
      date: '2025-05-10',
    },
    formats: ['URDF'],
    licence: {
      name: 'Apache-2.0',
      url: 'https://github.com/FFTAI/Wiki-GRx-Models/blob/f8e683f00d1d99deb882deb9dfce6030095b466a/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/FFTAI/Wiki-GRx-Models/tree/f8e683f00d1d99deb882deb9dfce6030095b466a/N1',
        title: 'Wiki-GRx-Models FourierN1 branch at f8e683f0, N1/',
        kind: 'primary',
      },
    ],
    note: 'Apache-2.0 holds on the FourierN1 branch only; the same repository is GPL-3.0 on master.',
  },
  {
    id: 'agibot-x2',
    maker: 'AgiBot',
    robots: ['X2-Ultra', 'X2-EDU'],
    status: 'official',
    repository: 'https://github.com/AgibotTech/agibot_x2_urdf',
    commit: {
      hash: '575cc6b988f976c23550e0db85aa1e5475d3652d',
      date: '2026-09-21',
    },
    formats: ['URDF', 'MJCF'],
    licence: {
      name: 'MulanPSL-2.0',
      url: 'https://github.com/AgibotTech/agibot_x2_urdf/blob/575cc6b988f976c23550e0db85aa1e5475d3652d/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/AgibotTech/agibot_x2_urdf/tree/575cc6b988f976c23550e0db85aa1e5475d3652d',
        title: 'agibot_x2_urdf at 575cc6b9',
        kind: 'primary',
      },
    ],
    note: 'Two releases sit side by side, X2_URDF-v1.3.0 and X2_URDF-v1.4.0.',
  },
  {
    id: 'agibot-a3',
    maker: 'AgiBot',
    robots: ['A3', 'A3 Ultra'],
    status: 'official',
    repository: 'https://github.com/AgibotTech/A3-A3U-robot-model',
    commit: {
      hash: '589f508ff357447c610a3f3004419035ddc8f153',
      date: '2026-08-06',
    },
    formats: ['URDF', 'MJCF'],
    licence: {
      name: 'MulanPSL-2.0',
      url: 'https://github.com/AgibotTech/A3-A3U-robot-model/blob/589f508ff357447c610a3f3004419035ddc8f153/LICENSE.txt',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/AgibotTech/A3-A3U-robot-model/commit/589f508ff357447c610a3f3004419035ddc8f153',
        title: 'A3-A3U-robot-model commit 589f508f, "feat: add license.txt and fix wrong values in urdf"',
        kind: 'primary',
      },
    ],
    note: 'This commit added the licence file, so earlier commits carry none.',
  },
  {
    id: 'agibot-x1-infer',
    maker: 'AgiBot',
    robots: ['X1'],
    status: 'official',
    repository: 'https://github.com/AgibotTech/agibot_x1_infer',
    commit: {
      hash: '9e0b818804d644fb9c9663e932dd33b03b24dfa4',
      date: '2025-04-03',
    },
    formats: ['MJCF'],
    licence: {
      name: 'MulanPSL-2.0',
      url: 'https://github.com/AgibotTech/agibot_x1_infer/blob/9e0b818804d644fb9c9663e932dd33b03b24dfa4/LICENSE.txt',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/AgibotTech/agibot_x1_infer/tree/9e0b818804d644fb9c9663e932dd33b03b24dfa4/src/module/sim_module/model',
        title: 'agibot_x1_infer at 9e0b8188, sim_module/model',
        kind: 'primary',
      },
    ],
    note: 'The licensed home of the X1 model: 65 STL meshes and MJCF, where agibot_x1_train has none.',
  },
  {
    id: 'agibot-genie-g2',
    maker: 'AgiBot',
    robots: ['Genie G2'],
    status: 'official',
    repository: 'https://github.com/AgibotTech/genie_sim_robot_model',
    commit: {
      hash: 'fb6de335f6a293605204a17608cf0b22b1fef6de',
      date: '2026-11-13',
    },
    formats: ['URDF'],
    licence: {
      name: 'Apache-2.0',
      url: 'https://github.com/AgibotTech/genie_sim_robot_model/blob/fb6de335f6a293605204a17608cf0b22b1fef6de/robots/genie/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/AgibotTech/genie_sim_robot_model/tree/fb6de335f6a293605204a17608cf0b22b1fef6de/robots/genie',
        title: 'genie_sim_robot_model at fb6de335, robots/genie',
        kind: 'primary',
      },
    ],
    note: 'The repository also bundles AgileX, ARX, Franka and UR models; this row covers robots/genie only.',
  },
  {
    id: 'booster-assets',
    maker: 'Booster Robotics',
    robots: ['K1', 'T1', 'T2'],
    status: 'official',
    repository: 'https://github.com/BoosterRobotics/booster_assets',
    commit: {
      hash: '12a97516f57469078707afb587a5f84c1cb110d1',
      date: '2026-09-26',
    },
    formats: ['URDF', 'MJCF'],
    licence: {
      name: 'BSD-3-Clause',
      url: 'https://github.com/BoosterRobotics/booster_assets/blob/12a97516f57469078707afb587a5f84c1cb110d1/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/BoosterRobotics/booster_assets/tree/12a97516f57469078707afb587a5f84c1cb110d1/robots',
        title: 'booster_assets at 12a97516, robots/',
        kind: 'primary',
      },
    ],
    note: 'Each robot comes in several joint counts, such as T1_23dof and T1_29dof.',
  },
  {
    id: 'limx-humanoid',
    maker: 'LimX Dynamics',
    robots: ['Oli (HU_D04)', 'HU_D03'],
    status: 'official',
    repository: 'https://github.com/limxdynamics/humanoid-description',
    commit: {
      hash: '4c0a3c71200b810a52831c7c2b2de0ed6ce819a4',
      date: '2026-11-05',
    },
    formats: ['URDF', 'MJCF', 'USD'],
    licence: {
      name: 'Apache-2.0',
      url: 'https://github.com/limxdynamics/humanoid-description/blob/4c0a3c71200b810a52831c7c2b2de0ed6ce819a4/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/limxdynamics/humanoid-description/blob/4c0a3c71200b810a52831c7c2b2de0ed6ce819a4/README.md',
        title: 'humanoid-description README at 4c0a3c71',
        kind: 'primary',
      },
    ],
    note: 'The README gives MJCF for the base HU_D04 only and marks HU_D03 discontinued.',
  },
  {
    id: 'franka-description',
    maker: 'Franka Robotics',
    robots: ['FR3', 'FR3 v2', 'FR3 v2.1', 'FER (Panda)', 'FP3'],
    status: 'official',
    repository: 'https://github.com/frankarobotics/franka_description',
    commit: {
      hash: '7aeeddc449edf8d62b594f9e36a81da53e7796f9',
      date: '2026-08-17',
    },
    formats: ['URDF'],
    licence: {
      name: 'Apache-2.0',
      url: 'https://github.com/frankarobotics/franka_description/blob/7aeeddc449edf8d62b594f9e36a81da53e7796f9/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/frankarobotics/franka_description/tree/7aeeddc449edf8d62b594f9e36a81da53e7796f9/meshes/robots',
        title: 'franka_description at 7aeeddc4, meshes/robots',
        kind: 'primary',
      },
    ],
    note: 'Descriptions are xacro; the URDF is generated from them.',
  },
  {
    id: 'ur-bsd',
    maker: 'Universal Robots',
    robots: ['UR3', 'UR5', 'UR10', 'UR3e', 'UR5e', 'UR10e', 'UR16e'],
    status: 'official',
    repository: 'https://github.com/UniversalRobots/Universal_Robots_ROS2_Description',
    commit: {
      hash: '0eb1a861f7772fceb38510d90fa2f98ec668070c',
      date: '2026-11-03',
    },
    formats: ['URDF'],
    licence: {
      name: 'BSD-3-Clause',
      url: 'https://github.com/UniversalRobots/Universal_Robots_ROS2_Description/blob/0eb1a861f7772fceb38510d90fa2f98ec668070c/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/UniversalRobots/Universal_Robots_ROS2_Description/blob/0eb1a861f7772fceb38510d90fa2f98ec668070c/README.md#license',
        title: 'Universal_Robots_ROS2_Description README at 0eb1a861, License',
        kind: 'primary',
      },
    ],
    note: 'The README puts everything outside the newer models\' mesh folders under BSD-3-Clause.',
  },
  {
    id: 'leap-hand-sim',
    maker: 'LEAP Hand team',
    robots: ['LEAP Hand'],
    status: 'official',
    repository: 'https://github.com/leap-hand/LEAP_Hand_Sim',
    commit: {
      hash: '150bc3d4b61fd6619193ba5a8ef209f3609ced89',
      date: '2024-05-18',
    },
    formats: ['URDF'],
    licence: {
      name: 'MIT',
      url: 'https://github.com/leap-hand/LEAP_Hand_Sim/blob/150bc3d4b61fd6619193ba5a8ef209f3609ced89/LICENSE.txt',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/leap-hand/LEAP_Hand_Sim/tree/150bc3d4b61fd6619193ba5a8ef209f3609ced89/assets/leap_hand',
        title: 'LEAP_Hand_Sim at 150bc3d4, assets/leap_hand',
        kind: 'primary',
      },
    ],
    note: 'The simulation files are MIT; the website CAD carries different licences.',
  },
  {
    id: 'leap-hand-v1-cad',
    maker: 'LEAP Hand team',
    robots: ['LEAP Hand v1'],
    status: 'official',
    repository: 'https://v1.leaphand.com/leap_cad',
    commit: null,
    formats: ['STEP'],
    licence: {
      name: 'CC-BY-SA-4.0',
      url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://v1.leaphand.com/leap_cad',
        title: 'LEAP Hand v1 CAD page',
        kind: 'primary',
      },
    ],
    note: 'A download page, not a repository, so no commit is pinned.',
  },
  {
    id: 'shadow-sr-common',
    maker: 'Shadow Robot',
    robots: ['Shadow Dexterous Hand'],
    status: 'official',
    repository: 'https://github.com/shadow-robot/sr_common',
    commit: {
      hash: '172c3d9c3715ee75eb10dfe4ee57e26a342b4529',
      date: '2025-01-09',
    },
    formats: ['URDF', 'MJCF'],
    licence: {
      name: 'BSD-3-Clause',
      url: 'https://github.com/shadow-robot/sr_common/blob/172c3d9c3715ee75eb10dfe4ee57e26a342b4529/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/shadow-robot/sr_common/tree/172c3d9c3715ee75eb10dfe4ee57e26a342b4529/sr_description',
        title: 'sr_common at 172c3d9c, sr_description',
        kind: 'primary',
      },
    ],
    note: 'BSD-3-Clause, not GPL; sr_description/blender has a licence file of its own.',
  },
  {
    id: 'iit-icub',
    maker: 'IIT',
    robots: ['iCub'],
    status: 'official',
    repository: 'https://github.com/robotology/icub-models',
    commit: {
      hash: 'dca8c618c264be70ce285bad38040411725e3551',
      date: '2026-02-26',
    },
    formats: ['URDF'],
    licence: {
      name: 'CC-BY-SA-4.0',
      url: 'https://github.com/robotology/icub-models/blob/dca8c618c264be70ce285bad38040411725e3551/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/robotology/icub-models/tree/dca8c618c264be70ce285bad38040411725e3551/iCub/robots',
        title: 'icub-models at dca8c618, iCub/robots',
        kind: 'primary',
      },
    ],
    note: 'ShareAlike: an adapted copy must carry the same licence.',
  },
  {
    id: 'hello-robot-stretch',
    maker: 'Hello Robot',
    robots: ['Stretch RE1V0', 'Stretch RE2V0', 'Stretch SE3'],
    status: 'official',
    repository: 'https://github.com/hello-robot/stretch_urdf',
    commit: {
      hash: 'c8c6e27e1f87db126118049f22611399253cbe2b',
      date: '2026-06-05',
    },
    formats: ['URDF'],
    licence: {
      name: 'BSD-3-Clause-Clear',
      url: 'https://github.com/hello-robot/stretch_urdf/blob/c8c6e27e1f87db126118049f22611399253cbe2b/LICENSE.md',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/hello-robot/stretch_urdf/tree/c8c6e27e1f87db126118049f22611399253cbe2b/stretch_urdf',
        title: 'stretch_urdf at c8c6e27e',
        kind: 'primary',
      },
    ],
    note: 'The Clear BSD License grants no patent rights.',
  },
  {
    id: 'anybotics-anymal-d',
    maker: 'ANYbotics',
    robots: ['ANYmal D'],
    status: 'official',
    repository: 'https://github.com/ANYbotics/anymal_d_simple_description',
    commit: {
      hash: 'd5bf4dc3a81af81a16b9598fc15c98e339f45a33',
      date: '2025-02-15',
    },
    formats: ['URDF'],
    licence: {
      name: 'BSD-3-Clause',
      url: 'https://github.com/ANYbotics/anymal_d_simple_description/blob/d5bf4dc3a81af81a16b9598fc15c98e339f45a33/LICENSE',
    },
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/ANYbotics/anymal_d_simple_description/tree/d5bf4dc3a81af81a16b9598fc15c98e339f45a33',
        title: 'anymal_d_simple_description at d5bf4dc3: 1 URDF, 18 DAE',
        kind: 'primary',
      },
    ],
    note: 'ANYbotics publishes it as a simple description, one URDF with 18 DAE meshes.',
  },
  {
    id: 'bd-spot-sdk',
    maker: 'Boston Dynamics',
    robots: ['Spot', 'Spot with arm'],
    status: 'restricted',
    repository: 'https://github.com/boston-dynamics/spot-sdk',
    commit: {
      hash: '04537ddafe0641d1751af3eb9e76cb785fc18594',
      date: '2026-09-10',
    },
    formats: ['URDF'],
    licence: {
      name: 'Boston Dynamics SDK License (20191101-BDSDK-SL)',
      url: 'https://github.com/boston-dynamics/spot-sdk/blob/04537ddafe0641d1751af3eb9e76cb785fc18594/LICENSE',
    },
    clause:
      '(c) The SDK Software is licensed solely and exclusively for use with products offered for sale by Boston Dynamics, Inc. (“BD Products”).  Use of the SDK Software with simulators and emulators is not prohibited so long as it is a software based simulation / emulation. Use with any other hardware is strictly prohibited.',
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/boston-dynamics/spot-sdk/tree/04537ddafe0641d1751af3eb9e76cb785fc18594/files',
        title: 'spot-sdk at 04537dda, files/spot_base_urdf.zip and spot_with_arm_urdf.zip',
        kind: 'primary',
      },
    ],
    note: 'Boston Dynamics does publish Spot, as two zipped URDFs under files/.',
  },
  {
    id: 'ur-graphical-documentation',
    maker: 'Universal Robots',
    robots: [
      'UR8 Long', 'UR15', 'UR18', 'UR20', 'UR30', 'UR10g-1750', 'UR17g-1300',
      'UR18g-950',
    ],
    status: 'restricted',
    repository: 'https://github.com/UniversalRobots/Universal_Robots_ROS2_Description',
    commit: {
      hash: '0eb1a861f7772fceb38510d90fa2f98ec668070c',
      date: '2026-11-03',
    },
    formats: ['URDF'],
    licence: {
      name: 'Universal Robots Terms and Conditions for Use of Graphical Documentation 1.01',
      url: 'https://github.com/UniversalRobots/Universal_Robots_ROS2_Description/blob/0eb1a861f7772fceb38510d90fa2f98ec668070c/meshes/ur20/LICENSE.txt',
    },
    clause:
      'However, you may only make the Graphical Documentation or any whole or partial copies thereof available to the public via download if it is part of a downloadable software package that includes a copy of the T&Cs.',
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/UniversalRobots/Universal_Robots_ROS2_Description/blob/0eb1a861f7772fceb38510d90fa2f98ec668070c/README.md#license',
        title: 'Universal_Robots_ROS2_Description README at 0eb1a861, License',
        kind: 'primary',
      },
    ],
    note: 'Under clause 2.2 Universal Robots owns any derivative work, and each mesh folder carries the terms.',
  },
  {
    id: 'leap-hand-v2-cad',
    maker: 'LEAP Hand team',
    robots: ['LEAP Hand V2 Adv'],
    status: 'restricted',
    repository: 'https://v2-adv.leaphand.com/leap_cad',
    commit: null,
    formats: ['STEP'],
    licence: {
      name: 'CC BY-NC-SA (version not stated)',
      url: 'https://v2-adv.leaphand.com/leap_cad',
    },
    clause:
      'By downloading these files, you agree to our CC BY-NC-SA Attribution-NonCommercial-ShareAlike license which allows you to use and build upon our work non-commercially.',
    checked: CHECKED,
    sources: [
      {
        url: 'https://v2-adv.leaphand.com/leap_cad',
        title: 'LEAP Hand V2 Adv CAD page',
        kind: 'primary',
      },
    ],
    note: 'Non-commercial use only, and the page names no licence version.',
  },
  {
    id: 'nvidia-isaac-sim-assets',
    maker: 'NVIDIA',
    robots: ['Robot assets bundled with Isaac Sim'],
    status: 'restricted',
    repository: 'https://docs.isaacsim.omniverse.nvidia.com/6.1.0/common/license-faq.html',
    commit: null,
    formats: ['USD'],
    licence: {
      name: 'NVIDIA Isaac Sim Additional Software and Materials License',
      url: 'https://docs.isaacsim.omniverse.nvidia.com/6.1.0/common/license-isaac-sim-additional.html',
    },
    clause:
      '2.2 Sell, rent, sublicense, transfer, distribute or otherwise make available to others (except authorized users as stated in Section 3 (“Authorized Users”)) any portion of the Software, except as expressly granted in Section 1 (“License Grant”);',
    checked: CHECKED,
    sources: [
      {
        url: 'https://docs.isaacsim.omniverse.nvidia.com/6.1.0/common/license-faq.html',
        title: 'Isaac Sim 6.1.0 License FAQ: NVIDIA-provided assets fall under the Additional Software and Materials License',
        kind: 'primary',
      },
      {
        url: 'https://docs.isaacsim.omniverse.nvidia.com/6.1.0/common/license-isaac-sim-additional.html',
        title: 'NVIDIA Isaac Sim Additional Software and Materials License, sections 2.2 and 2.4',
        kind: 'primary',
      },
    ],
    note: 'Section 2.4 also forbids modifying the assets or creating derivative works of them.',
  },
  {
    id: 'agibot-x1-train',
    maker: 'AgiBot',
    robots: ['X1'],
    status: 'no-licence',
    repository: 'https://github.com/AgibotTech/agibot_x1_train',
    commit: {
      hash: 'e6651b9ab843fd1b1be70c087bfb7e8b28e44ccd',
      date: '2024-10-23',
    },
    formats: ['URDF', 'MJCF'],
    licence: null,
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/AgibotTech/agibot_x1_train/tree/e6651b9ab843fd1b1be70c087bfb7e8b28e44ccd/resources/robots/x1',
        title: 'agibot_x1_train at e6651b9a, resources/robots/x1; no licence file in the tree',
        kind: 'primary',
      },
    ],
    note: 'No licence file at this commit; agibot_x1_infer carries the X1 model under Mulan PSL v2.',
  },
  {
    id: 'agibot-omnihand',
    maker: 'AgiBot',
    robots: ['OmniHand 2025', 'OmniHand 3'],
    status: 'no-licence',
    repository: 'https://github.com/AgibotTech/agilink_omnihand_description',
    commit: {
      hash: 'ddd053c4b09bd7eddc0ab28305d9107b49157808',
      date: '2026-11-12',
    },
    formats: ['URDF', 'MJCF'],
    licence: null,
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/AgibotTech/agilink_omnihand_description/tree/ddd053c4b09bd7eddc0ab28305d9107b49157808',
        title: 'agilink_omnihand_description at ddd053c4; no licence file in the tree',
        kind: 'primary',
      },
    ],
    note: 'No licence file at this commit, so the files can be linked but not rehosted.',
  },
  {
    id: 'engineai-description',
    maker: 'EngineAI',
    robots: ['PM01', 'T800', 'T800 Pro'],
    status: 'no-licence',
    repository: 'https://github.com/engineai-robotics/engineai_robotics_description',
    commit: {
      hash: '1d2d7601f520f716863c32a83abe9c77b26ee06c',
      date: '2026-08-14',
    },
    formats: ['URDF', 'USD'],
    licence: null,
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/engineai-robotics/engineai_robotics_description/tree/1d2d7601f520f716863c32a83abe9c77b26ee06c',
        title: 'engineai_robotics_description at 1d2d7601; no licence file in the tree',
        kind: 'primary',
      },
    ],
    note: 'No licence file at this commit, and no SE01 model in the repository.',
  },
  {
    id: 'tesla-optimus',
    maker: 'Tesla',
    robots: ['Optimus'],
    status: 'none-found',
    repository: null,
    commit: null,
    formats: [],
    licence: null,
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/orgs/teslamotors/repositories',
        title: 'teslamotors on GitHub: 67 public repositories',
        kind: 'primary',
      },
    ],
    note: 'None found on 15 Nov 2026 among Tesla\'s 67 public GitHub repositories.',
  },
  {
    id: 'figure',
    maker: 'Figure AI',
    robots: ['Figure 02', 'Figure 03'],
    status: 'none-found',
    repository: null,
    commit: null,
    formats: [],
    licence: null,
    checked: CHECKED,
    sources: [
      {
        url: 'https://www.figure.ai/sitemap.xml',
        title: 'figure.ai sitemap: no developer or download page',
        kind: 'primary',
      },
    ],
    note: 'None found on 15 Nov 2026; Figure\'s site lists no developer or download page, and no Figure GitHub organisation was found.',
  },
  {
    id: '1x-neo',
    maker: '1X',
    robots: ['NEO'],
    status: 'none-found',
    repository: null,
    commit: null,
    formats: [],
    licence: null,
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/orgs/1x-technologies/repositories',
        title: '1x-technologies on GitHub: 1 public repository, 1xgpt',
        kind: 'primary',
      },
    ],
    note: 'None found on 15 Nov 2026; 1X\'s only public repository is the 1xgpt world-model challenge.',
  },
  {
    id: 'agility-digit',
    maker: 'Agility Robotics',
    robots: ['Digit'],
    status: 'none-found',
    repository: null,
    commit: null,
    formats: [],
    licence: null,
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/orgs/agilityrobotics/repositories',
        title: 'agilityrobotics on GitHub: 9 public repositories',
        kind: 'primary',
      },
    ],
    note: 'None found on 15 Nov 2026; of Agility\'s nine public repositories, only cassie-doc concerns a robot, and not Digit.',
  },
  {
    id: 'bd-atlas',
    maker: 'Boston Dynamics',
    robots: ['Atlas (electric)'],
    status: 'none-found',
    repository: null,
    commit: null,
    formats: [],
    licence: null,
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/orgs/boston-dynamics/repositories',
        title: 'boston-dynamics on GitHub: 5 public repositories',
        kind: 'primary',
      },
    ],
    note: 'None found on 15 Nov 2026 in Boston Dynamics\' five public repositories, whose robot files are Spot\'s.',
  },
  {
    id: 'apptronik-apollo',
    maker: 'Apptronik',
    robots: ['Apollo'],
    status: 'none-found',
    repository: null,
    commit: null,
    formats: [],
    licence: null,
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/apptronik',
        title: 'apptronik on GitHub: no public repositories',
        kind: 'primary',
      },
    ],
    note: 'None found on 15 Nov 2026; Apptronik\'s GitHub account has no public repositories.',
  },
  {
    id: 'agibot-a2',
    maker: 'AgiBot',
    robots: ['A2'],
    status: 'none-found',
    repository: null,
    commit: null,
    formats: [],
    licence: null,
    checked: CHECKED,
    sources: [
      {
        url: 'https://github.com/AgibotTech?tab=repositories',
        title: 'AgibotTech on GitHub: X1, X2, A3, Genie G2 and OmniHand files, no A2',
        kind: 'primary',
      },
    ],
    note: 'None found on 15 Nov 2026 in AgiBot\'s GitHub account; its Chinese developer portals were not searched.',
  },
];
