import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { PlaygroundRenderProbe } from './playground-render-probe.ts';
export const CANONICAL_PLAYGROUND_URDF = 'public/models/so101/so101.urdf';
type Joint = {
  name: string;
  type: string;
  parent: string;
  child: string;
  position: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
  lower: number;
  upper: number;
};
export type CanonicalPlaygroundModel = {
  name: string;
  links: string[];
  joints: Joint[];
  root: string;
  visuals: number;
};
/** Parse the source robot description independently of URDFLoader and the
 * application's FK/readout functions. The oracle composes source transforms
 * directly, including the declared Z-up to Y-up scene basis. */
export function canonicalPlaygroundModel(root: string): CanonicalPlaygroundModel {
  const dom = new JSDOM(readFileSync(join(root, CANONICAL_PLAYGROUND_URDF), 'utf8'), {
    contentType: 'text/xml'
  });
  try {
    const robot = dom.window.document.documentElement;
    const tuple = (value: string | null, fallback: [number, number, number]): [number, number, number] => {
      if (value === null) return fallback;
      const values = value.trim().split(/\s+/).map(Number);
      if (values.length !== 3 || !values.every(Number.isFinite)) throw Error('invalid canonical URDF tuple');
      return values as [number, number, number];
    };
    const links = [...robot.children].filter(node => node.tagName === 'link').map(node => node.getAttribute('name')!);
    const joints = [...robot.children].filter(node => node.tagName === 'joint').map(node => ({
      name: node.getAttribute('name')!,
      type: node.getAttribute('type')!,
      parent: node.querySelector('parent')!.getAttribute('link')!,
      child: node.querySelector('child')!.getAttribute('link')!,
      position: tuple(node.querySelector('origin')?.getAttribute('xyz') ?? null, [0, 0, 0]),
      rpy: tuple(node.querySelector('origin')?.getAttribute('rpy') ?? null, [0, 0, 0]),
      axis: tuple(node.querySelector('axis')?.getAttribute('xyz') ?? null, [1, 0, 0]),
      lower: Number(node.querySelector('limit')?.getAttribute('lower') ?? 0),
      upper: Number(node.querySelector('limit')?.getAttribute('upper') ?? 0)
    }));
    const roots = links.filter(link => !joints.some(joint => joint.child === link));
    if (roots.length !== 1 || !joints.length) throw Error('canonical URDF is not a nonempty rooted tree');
    return {
      name: robot.getAttribute('name')!,
      links,
      joints,
      root: roots[0],
      visuals: robot.querySelectorAll('link > visual').length
    };
  } finally {
    dom.window.close();
  }
}
export function canonicalPlaygroundLandmarks(model: CanonicalPlaygroundModel, angles: Record<string, number>) {
  const matrixByLink = new Map<string, Matrix4>([[model.root, new Matrix4().makeRotationX(-Math.PI / 2)]]);
  const jointPositions: Record<string, [number, number, number]> = {};
  const remaining = [...model.joints];
  while (remaining.length) {
    const index = remaining.findIndex(joint => matrixByLink.has(joint.parent));
    if (index < 0) throw Error('canonical joint tree is disconnected or cyclic');
    const joint = remaining.splice(index, 1)[0];
    const origin = new Matrix4().compose(new Vector3(...joint.position), new Quaternion().setFromEuler(new Euler(...joint.rpy, 'ZYX')), new Vector3(1, 1, 1));
    const frame = matrixByLink.get(joint.parent)!.clone().multiply(origin);
    jointPositions[joint.name] = new Vector3().setFromMatrixPosition(frame).toArray() as [number, number, number];
    if (joint.type === 'revolute' || joint.type === 'continuous') frame.multiply(new Matrix4().makeRotationAxis(new Vector3(...joint.axis).normalize(), angles[joint.name] ?? 0));else if (joint.type !== 'fixed') throw Error('unhandled canonical joint ' + joint.type);
    matrixByLink.set(joint.child, frame);
  }
  const links = Object.fromEntries([...matrixByLink].map(([name, matrix]) => [name, new Vector3().setFromMatrixPosition(matrix).toArray() as [number, number, number]]));
  return {
    links,
    joints: jointPositions
  };
}
export function playgroundModelProblems(model: CanonicalPlaygroundModel, actual: PlaygroundRenderProbe | null, angles: Record<string, number>, hand: [number, number, number] | null): string[] {
  if (!actual) return ['no actual rendered model reading'];
  const failures: string[] = [];
  if (actual.kind !== 'so101' || actual.name !== model.name || !actual.contextActive) failures.push('canonical SO-101 model is not live in an active context');
  const wanted = model.joints.filter(joint => joint.type === 'revolute');
  const same = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
  if (!same(actual.joints.map(joint => joint.name), wanted.map(joint => joint.name))) failures.push('rendered movable-joint population differs from URDF');
  if (!same(actual.links.map(link => link.name), model.links)) failures.push('rendered link population differs from URDF');
  if (actual.meshes.length !== model.visuals || actual.meshes.some(mesh => mesh.vertices <= 0 || !mesh.colours.length)) failures.push('canonical mesh population is incomplete or blank');
  const expected = canonicalPlaygroundLandmarks(model, angles);
  const close = (a: readonly number[], b: readonly number[], tolerance: number) => a.length === b.length && a.every((value, index) => Number.isFinite(value) && Math.abs(value - b[index]) <= tolerance);
  for (const joint of actual.joints) {
    const source = wanted.find(row => row.name === joint.name);
    if (!source) continue;
    if (!close([joint.lower, joint.upper], [source.lower, source.upper], 1e-9)) failures.push(joint.name + ': limit differs from canonical URDF');
    if (!close([joint.angle], [angles[joint.name]], 1e-6)) failures.push(joint.name + ': actual rendered angle differs from visible control');
    if (!close(joint.position, expected.joints[joint.name], 2e-6)) failures.push(joint.name + ': rendered joint landmark differs from independent URDF transform');
  }
  for (const link of actual.links) if (expected.links[link.name] && !close(link.position, expected.links[link.name], 2e-6)) failures.push(link.name + ': rendered link landmark differs from independent URDF transform');
  const end = expected.links.gripper_frame_link;
  if (!end) throw Error('canonical hand landmark missing');
  // The displayed readout uses metres in the URDF base frame, rounded to .001.
  if (!hand || !close(hand, [end[0], -end[2], end[1]], 0.00051)) failures.push('hand text differs from independent canonical end-effector position');
  return failures;
}
