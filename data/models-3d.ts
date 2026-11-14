/**
 * Maker 3D models the site ships: one provenance record per model.
 *
 * Each record names the maker's repository, commit and URDF, the licence
 * shipped beside the files, and what the conversion changed. The source is
 * each maker's published meshes. tests/unit/models-3d.test.ts recounts every
 * number here from the files on disk.
 *
 * SO-101: scripts/convert-so101-meshes.ts cloned SO-ARM100 without pinning a
 * commit. At a758567c the maker's so101_new_calib.urdf equals the shipped
 * so101.urdf apart from .stl becoming .glb, and the 13 STL sizes give the
 * triangle counts the shipped GLBs hold.
 *
 * G1: scripts/convert-unitree-meshes.ts, from unitree_ros at 157ff950.
 */
import type { Model3d } from './schemas/model-3d.ts';

export type { Model3d } from './schemas/model-3d.ts';

export const MODELS_3D: Model3d[] = [
  {
    id: 'so-101',
    maker: 'The Robot Studio',
    product: 'SO-101',
    urdfFile: 'so101_new_calib.urdf',
    makerLabel: 'New Calibration (Default)',
    repository: 'https://github.com/TheRobotStudio/SO-ARM100',
    commit: 'a758567c3978dfeefe282ede0500085a48fe8f78',
    sourcePath: 'Simulation/SO101',
    licence: { name: 'Apache-2.0', file: 'public/models/so101/LICENSE' },
    dir: 'public/models/so101',
    urdf: 'so101.urdf',
    meshCount: 13,
    sourceTriangles: 322564,
    shippedTriangles: 322564,
    shippedBytes: 971900,
    encoding: 'Draco, 14-bit positions, 10-bit normals',
    positionBoundUm: 4.34,
    change: 'STL to Draco GLB; triangle counts unchanged.',
    checked: '2026-11-14',
  },
  {
    id: 'unitree-g1',
    maker: 'Unitree Robotics',
    product: 'Unitree G1',
    urdfFile: 'g1_23dof_rev_1_0.urdf',
    makerLabel:
      'g1_23dof_rev_1_0: mode_machine 4; 12 leg, 1 waist and 10 arm degrees of freedom; no hand joints',
    repository: 'https://github.com/unitreerobotics/unitree_ros',
    commit: '157ff950351e5f535e03c5d85a16b7d594b3dbcc',
    sourcePath: 'robots/g1_description',
    licence: { name: 'BSD-3-Clause', file: 'public/models/unitree/g1/LICENSE' },
    dir: 'public/models/unitree/g1',
    urdf: 'g1_23dof_rev_1_0.urdf',
    meshCount: 27,
    sourceTriangles: 503229,
    shippedTriangles: 503229,
    shippedBytes: 1834992,
    encoding: 'Draco, 14-bit positions, 10-bit normals',
    positionBoundUm: 10.86,
    change: 'STL to Draco GLB; triangle counts unchanged.',
    checked: '2026-11-14',
  },
];
